// ============================================================================
// JOY PeopleHR — Garment Multi-Cycle Payroll Engine & Approval Workflow Service
// Supports Daily, Weekly, Fortnightly, Monthly & Custom Cycles, Locking,
// Reopening, Audit Trail, Payslip Publishing & CSV Reporting Exports
// ============================================================================

import { supabase } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import {
  ApprovalChainStep,
  GarmentPayrollCycle,
  GarmentPayrollLine,
  PaymentFrequency,
  PayrollCycleStatus,
  WageMethod,
} from '../../types/garment';
import { garmentMasterService, recordGarmentAudit } from './garmentMasterService';
import { garmentOperationsService } from './garmentOperationsService';
import { calculateWorkerPayrollLine, round2 } from './garmentWageCalculator';

function orgIdOrThrow(orgId?: string): string {
  const id = orgId || getActiveOrgId();
  if (!id) throw new Error('Active organization ID is required');
  return id;
}

export const garmentPayrollService = {
  async listCycles(organizationId?: string): Promise<GarmentPayrollCycle[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_payroll_cycles')
      .select('*')
      .eq('organization_id', orgId)
      .order('period_end', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentPayrollCycle[];
  },

  async listCycleLines(cycleId: string, organizationId?: string): Promise<GarmentPayrollLine[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_payroll_lines')
      .select('*')
      .eq('organization_id', orgId)
      .eq('payroll_cycle_id', cycleId)
      .order('gross_earnings', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentPayrollLine[];
  },

  async listEmployeePayrollLines(employeeId: string, organizationId?: string): Promise<GarmentPayrollLine[]> {
    const orgId = orgIdOrThrow(organizationId);
    const { data, error } = await supabase
      .from('garment_payroll_lines')
      .select('*')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as GarmentPayrollLine[];
  },

  async createCycle(params: {
    organizationId?: string;
    cycleCode?: string;
    cycleName: string;
    paymentFrequency: PaymentFrequency;
    periodStart: string;
    periodEnd: string;
    productionUnitId?: string | null;
    wageMethodFilter?: WageMethod | null;
  }): Promise<GarmentPayrollCycle> {
    const orgId = orgIdOrThrow(params.organizationId);
    const code =
      params.cycleCode ||
      `GARM-${params.paymentFrequency.slice(0, 3)}-${params.periodStart.replace(/-/g, '')}-${params.periodEnd.replace(/-/g, '').slice(4)}`;

    const { data, error } = await supabase
      .from('garment_payroll_cycles')
      .insert({
        organization_id: orgId,
        cycle_code: code,
        cycle_name: params.cycleName,
        payment_frequency: params.paymentFrequency,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        production_unit_id: params.productionUnitId || null,
        wage_method_filter: params.wageMethodFilter || null,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_payroll_cycle',
      entity_id: data.id,
      action: 'CREATE_PAYROLL_CYCLE',
      new_values: data,
    });
    return data as GarmentPayrollCycle;
  },

  /**
   * Idempotently calculates/recalculates all eligible garment workers in a cycle.
   * Prevents recalculation if cycle is LOCKED or PAID.
   */
  async calculateCycle(cycleId: string, organizationId?: string): Promise<{
    cycle: GarmentPayrollCycle;
    lines: GarmentPayrollLine[];
  }> {
    const orgId = orgIdOrThrow(organizationId);
    const { data: cycleRow, error: cycleErr } = await supabase
      .from('garment_payroll_cycles')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', cycleId)
      .single();

    if (cycleErr || !cycleRow) throw new Error(cycleErr?.message || 'Payroll cycle not found');
    const cycle = cycleRow as GarmentPayrollCycle;

    if (['LOCKED', 'PAID'].includes(cycle.status)) {
      throw new Error(`Cycle ${cycle.cycle_code} is ${cycle.status} and cannot be recalculated without reopening.`);
    }

    const [settings, workerProfiles, wageAssignments, attendances, allocations, awards, ledgerEntries] =
      await Promise.all([
        garmentMasterService.getSettings(orgId),
        garmentMasterService.listWorkerProfiles(orgId),
        garmentMasterService.listWageAssignments(orgId),
        garmentOperationsService.listFloorAttendance({
          organizationId: orgId,
          startDate: cycle.period_start,
          endDate: cycle.period_end,
          unitId: cycle.production_unit_id || undefined,
        }),
        garmentOperationsService.listProductionAllocations({
          organizationId: orgId,
          startDate: cycle.period_start,
          endDate: cycle.period_end,
        }),
        garmentOperationsService.listIncentiveAwards(orgId, cycle.period_start, cycle.period_end),
        garmentOperationsService.listAdvancesLedger(orgId),
      ]);

    // Determine eligible worker employee IDs
    const eligibleSet = new Set<string>();
    for (const wp of workerProfiles) {
      if (!wp.is_active) continue;
      if (cycle.production_unit_id && wp.primary_unit_id && wp.primary_unit_id !== cycle.production_unit_id) {
        continue;
      }
      if (cycle.wage_method_filter && wp.default_wage_method !== cycle.wage_method_filter) {
        continue;
      }
      eligibleSet.add(wp.employee_id);
    }
    for (const a of attendances) eligibleSet.add(a.employee_id);
    for (const al of allocations) eligibleSet.add(al.employee_id);

    const calculatedLines: any[] = [];
    for (const empId of eligibleSet) {
      const wp = workerProfiles.find((w) => w.employee_id === empId) || null;
      const empAssigns = wageAssignments.filter((w) => w.employee_id === empId);
      const empAtt = attendances.filter((a) => a.employee_id === empId);
      const empAllocs = allocations.filter(
        (al) =>
          al.employee_id === empId &&
          (!al.payroll_cycle_id || al.payroll_cycle_id === cycle.id)
      );
      const empAwards = awards.filter((aw) => aw.employee_id === empId);
      const empLedger = ledgerEntries.filter(
        (le) => le.employee_id === empId && le.entry_date <= cycle.period_end && le.status === 'APPROVED'
      );

      // Skip zero-activity inactive workers with no assignments/attendance/pieces
      if (empAssigns.length === 0 && empAtt.length === 0 && empAllocs.length === 0) continue;

      const calc = calculateWorkerPayrollLine({
        employee_id: empId,
        worker_profile: wp,
        wage_assignments: empAssigns,
        attendances: empAtt,
        allocations: empAllocs,
        incentive_awards: empAwards,
        ledger_entries: empLedger,
        settings,
        period_start: cycle.period_start,
        period_end: cycle.period_end,
      });

      calculatedLines.push({
        organization_id: orgId,
        payroll_cycle_id: cycle.id,
        ...calc,
      });
    }

    // Replace unlocked lines for this cycle cleanly
    await supabase
      .from('garment_payroll_lines')
      .delete()
      .eq('organization_id', orgId)
      .eq('payroll_cycle_id', cycle.id);

    let savedLines: GarmentPayrollLine[] = [];
    if (calculatedLines.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('garment_payroll_lines')
        .upsert(calculatedLines, { onConflict: 'payroll_cycle_id,employee_id' })
        .select();
      if (insErr) throw new Error(insErr.message);
      savedLines = (inserted || []) as GarmentPayrollLine[];
    }

    const totalGross = round2(savedLines.reduce((s, l) => s + Number(l.gross_earnings || 0), 0));
    const totalDeductions = round2(savedLines.reduce((s, l) => s + Number(l.total_deductions || 0), 0));
    const totalNet = round2(savedLines.reduce((s, l) => s + Number(l.net_payable || 0), 0));
    const calcHash = `${cycle.cycle_code}:${savedLines.length}:${totalGross}:${totalNet}`;

    const { data: updatedCycle, error: updErr } = await supabase
      .from('garment_payroll_cycles')
      .update({
        status: 'CALCULATED',
        total_workers: savedLines.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net_pay: totalNet,
        calculation_hash: calcHash,
        calculated_at: new Date().toISOString(),
      })
      .eq('id', cycle.id)
      .select()
      .single();

    if (updErr) throw new Error(updErr.message);

    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_payroll_cycle',
      entity_id: cycle.id,
      action: 'CALCULATE_PAYROLL_CYCLE',
      new_values: { total_workers: savedLines.length, totalGross, totalNet, calcHash },
    });

    return {
      cycle: updatedCycle as GarmentPayrollCycle,
      lines: savedLines,
    };
  },

  /**
   * Transitions a payroll cycle along the configurable approval chain:
   * Supervisor -> Manager -> HR/Payroll -> Authorised -> Paid -> Locked (and controlled Reopen).
   */
  async transitionCycleStatus(params: {
    cycleId: string;
    organizationId?: string;
    nextStatus: PayrollCycleStatus;
    actorName: string;
    notes?: string;
    publishPayslips?: boolean;
  }): Promise<GarmentPayrollCycle> {
    const orgId = orgIdOrThrow(params.organizationId);
    const { data: existing, error: fetchErr } = await supabase
      .from('garment_payroll_cycles')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', params.cycleId)
      .single();

    if (fetchErr || !existing) throw new Error(fetchErr?.message || 'Payroll cycle not found');
    const cycle = existing as GarmentPayrollCycle;

    if (cycle.status === 'LOCKED' && params.nextStatus !== 'REOPENED') {
      throw new Error('Cycle is locked. Only controlled Reopen by authorized HR/Payroll is permitted.');
    }

    const stageMap: Partial<Record<PayrollCycleStatus, ApprovalChainStep['stage']>> = {
      SUPERVISOR_APPROVED: 'SUPERVISOR',
      MANAGER_APPROVED: 'MANAGER',
      HR_APPROVED: 'HR',
      AUTHORIZED: 'AUTHORIZED',
      PAID: 'PAID',
      LOCKED: 'LOCKED',
      REOPENED: 'REOPENED',
    };

    const { data: userData } = await supabase.auth.getUser();
    const chain = Array.isArray(cycle.approved_chain_json) ? [...cycle.approved_chain_json] : [];
    chain.push({
      stage: stageMap[params.nextStatus] || 'HR',
      actor_id: userData?.user?.id,
      actor_name: params.actorName || 'Authorized Approver',
      action:
        params.nextStatus === 'LOCKED'
          ? 'LOCKED'
          : params.nextStatus === 'REOPENED'
            ? 'REOPENED'
            : params.nextStatus === 'PAID'
              ? 'PAID'
              : 'APPROVED',
      notes: params.notes,
      at: new Date().toISOString(),
    });

    const isLocking = params.nextStatus === 'LOCKED' || params.nextStatus === 'PAID';
    const updatePayload: Record<string, any> = {
      status: params.nextStatus,
      approved_chain_json: chain,
      ...(params.nextStatus === 'LOCKED'
        ? { locked_at: new Date().toISOString(), locked_by: userData?.user?.id || null }
        : {}),
      ...(params.nextStatus === 'REOPENED'
        ? { locked_at: null, locked_by: null, reopen_reason: params.notes || 'Controlled reopen' }
        : {}),
    };

    const { data: updated, error: updErr } = await supabase
      .from('garment_payroll_cycles')
      .update(updatePayload)
      .eq('id', cycle.id)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);

    // Lock underlying allocations & publish payslips when finalized
    if (isLocking || params.publishPayslips) {
      await supabase
        .from('garment_production_allocations')
        .update({
          is_locked: isLocking,
          payroll_cycle_id: cycle.id,
        })
        .eq('organization_id', orgId)
        .gte('work_date', cycle.period_start)
        .lte('work_date', cycle.period_end);

      await supabase
        .from('garment_payroll_lines')
        .update({
          ...(params.publishPayslips || params.nextStatus === 'HR_APPROVED' || params.nextStatus === 'AUTHORIZED' || isLocking
            ? { worker_payslip_published: true, payslip_published_at: new Date().toISOString() }
            : {}),
          ...(params.nextStatus === 'PAID'
            ? { disbursement_status: 'PAID', paid_at: new Date().toISOString() }
            : {}),
        })
        .eq('payroll_cycle_id', cycle.id);
    }

    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_payroll_cycle',
      entity_id: cycle.id,
      action: `CYCLE_TRANSITION_${params.nextStatus}`,
      old_values: { status: cycle.status },
      new_values: { status: params.nextStatus },
      reason: params.notes,
    });

    return updated as GarmentPayrollCycle;
  },

  exportPayrollCsv(cycle: GarmentPayrollCycle, lines: GarmentPayrollLine[], empNameMap: Record<string, string>): string {
    const headers = [
      'Cycle Code',
      'Period Start',
      'Period End',
      'Employee',
      'Category',
      'Wage Method',
      'Payable Days',
      'Worked Hours',
      'OT Hours',
      'Produced Qty',
      'Accepted Qty',
      'Rejected Qty',
      'Rework Qty',
      'Daily Earnings',
      'Hourly Earnings',
      'Piece-Rate Earnings',
      'Overtime Earnings',
      'Incentives',
      'Min Wage Topup',
      'Gross Earnings',
      'Total Deductions',
      'Net Payable',
    ];

    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = lines.map((l) =>
      [
        cycle.cycle_code,
        cycle.period_start,
        cycle.period_end,
        empNameMap[l.employee_id] || l.employee_id,
        l.worker_category,
        l.wage_method_snapshot,
        l.payable_days,
        l.worked_hours,
        l.overtime_hours,
        l.produced_qty,
        l.accepted_qty,
        l.rejected_qty,
        l.rework_qty,
        l.daily_wage_earnings,
        l.hourly_wage_earnings,
        l.piece_rate_earnings,
        l.overtime_earnings,
        l.incentive_earnings,
        l.minimum_wage_topup,
        l.gross_earnings,
        l.total_deductions,
        l.net_payable,
      ]
        .map(escape)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },
};

