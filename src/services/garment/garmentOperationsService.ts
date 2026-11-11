// ============================================================================
// JOY PeopleHR — Garment Floor Attendance, Production, QC, Corrections & Advances
// ============================================================================

import { supabase } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import {
  GarmentAdvanceLedgerEntry,
  GarmentCorrectionRequest,
  GarmentFloorAttendance,
  GarmentIncentiveAward,
  GarmentProductionAllocation,
  GarmentProductionEntry,
} from '../../types/garment';
import { garmentMasterService, recordGarmentAudit } from './garmentMasterService';
import {
  computeEntryPieceEarnings,
  distributeProductionEntryToAllocations,
  resolveApplicableRateCard,
  resolveWageAssignmentForDate,
} from './garmentWageCalculator';

function orgIdOrThrow(orgId?: string): string {
  const id = orgId || getActiveOrgId();
  if (!id) throw new Error('Active organization ID is required');
  return id;
}

export const garmentOperationsService = {
  // ── 1. Floor Attendance ────────────────────────────────────────────────────
  async listFloorAttendance(params: {
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    unitId?: string;
    employeeId?: string;
  }): Promise<GarmentFloorAttendance[]> {
    const orgId = orgIdOrThrow(params.organizationId);
    let q = supabase
      .from('garment_floor_attendance')
      .select('*')
      .eq('organization_id', orgId)
      .order('work_date', { ascending: false });

    if (params.startDate) q = q.gte('work_date', params.startDate);
    if (params.endDate) q = q.lte('work_date', params.endDate);
    if (params.unitId) q = q.eq('production_unit_id', params.unitId);
    if (params.employeeId) q = q.eq('employee_id', params.employeeId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentFloorAttendance[];
  },

  async saveFloorAttendanceBatch(
    rows: Partial<GarmentFloorAttendance>[],
    organizationId?: string
  ): Promise<GarmentFloorAttendance[]> {
    const orgId = orgIdOrThrow(organizationId);
    if (rows.length === 0) return [];

    const payload = rows.map((r) => {
      const status = r.status || 'PRESENT';
      const defaultFactor =
        status === 'PRESENT' || status === 'LEAVE' || status === 'WEEK_OFF' || status === 'HOLIDAY'
          ? status === 'PRESENT' ? 1 : 0
          : status === 'HALF_DAY' ? 0.5 : 0;

      return {
        organization_id: orgId,
        work_date: r.work_date,
        shift_id: r.shift_id || null,
        production_unit_id: r.production_unit_id || null,
        team_id: r.team_id || null,
        employee_id: r.employee_id,
        supervisor_employee_id: r.supervisor_employee_id || null,
        status,
        payable_day_factor: r.payable_day_factor ?? defaultFactor,
        worked_hours: r.worked_hours ?? (status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0),
        overtime_hours: r.overtime_hours ?? 0,
        late_minutes: r.late_minutes ?? 0,
        early_exit_minutes: r.early_exit_minutes ?? 0,
        source: r.source || 'HR_WEB',
        sync_to_core_attendance: r.sync_to_core_attendance ?? true,
        approval_status: r.approval_status || 'SUBMITTED',
        client_idempotency_key: r.client_idempotency_key || null,
        remarks: r.remarks || null,
      };
    });

    const { data, error } = await supabase
      .from('garment_floor_attendance')
      .upsert(payload, { onConflict: 'organization_id,employee_id,work_date' })
      .select();

    if (error) throw new Error(error.message);

    // Optional best-effort sync to core attendance_daily without overwriting existing biometric checkins
    const syncRows = payload.filter((p) => p.sync_to_core_attendance && p.employee_id && p.work_date);
    if (syncRows.length > 0) {
      try {
        const coreStatusMap: Record<string, string> = {
          PRESENT: 'Present',
          HALF_DAY: 'Half Day',
          ABSENT: 'Absent',
          LEAVE: 'Leave',
          WEEK_OFF: 'Week Off',
          HOLIDAY: 'Holiday',
        };
        await supabase.from('attendance_daily').upsert(
          syncRows.map((p) => ({
            organization_id: orgId,
            employee_id: p.employee_id,
            shift_id: p.shift_id,
            attendance_date: p.work_date,
            total_work_minutes: Math.round(Number(p.worked_hours || 0) * 60),
            overtime_minutes: Math.round(Number(p.overtime_hours || 0) * 60),
            status: coreStatusMap[p.status] || 'Present',
            payable_status: p.payable_day_factor >= 1 ? 'Paid' : p.payable_day_factor >= 0.5 ? 'Half Day' : 'Unpaid',
          })),
          { onConflict: 'organization_id,employee_id,attendance_date', ignoreDuplicates: true }
        );
      } catch {
        // Non-blocking sync to core attendance_daily
      }
    }

    return (data || []) as GarmentFloorAttendance[];
  },

  // ── 2. Production & Quality Control Entries ────────────────────────────────
  async listProductionEntries(params: {
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    unitId?: string;
    employeeId?: string;
  }): Promise<GarmentProductionEntry[]> {
    const orgId = orgIdOrThrow(params.organizationId);
    let q = supabase
      .from('garment_production_entries')
      .select('*')
      .eq('organization_id', orgId)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.startDate) q = q.gte('work_date', params.startDate);
    if (params.endDate) q = q.lte('work_date', params.endDate);
    if (params.unitId) q = q.eq('production_unit_id', params.unitId);
    if (params.employeeId) q = q.eq('employee_id', params.employeeId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentProductionEntry[];
  },

  async listProductionAllocations(params: {
    organizationId?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }): Promise<GarmentProductionAllocation[]> {
    const orgId = orgIdOrThrow(params.organizationId);
    let q = supabase
      .from('garment_production_allocations')
      .select('*')
      .eq('organization_id', orgId)
      .order('work_date', { ascending: false });

    if (params.startDate) q = q.gte('work_date', params.startDate);
    if (params.endDate) q = q.lte('work_date', params.endDate);
    if (params.employeeId) q = q.eq('employee_id', params.employeeId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentProductionAllocation[];
  },

  /**
   * Saves a production/QC entry, automatically resolves rate cards, computes payable piece amount,
   * and materializes Individual or Shared-Line allocations.
   */
  async saveProductionEntry(
    entry: Partial<GarmentProductionEntry> & {
      participant_employee_ids?: string[];
    }
  ): Promise<{ entry: GarmentProductionEntry; allocations: GarmentProductionAllocation[] }> {
    const orgId = orgIdOrThrow(entry.organization_id);
    if (!entry.work_date || !entry.operation_id) {
      throw new Error('work_date and operation_id are required');
    }

    const [settings, rateCards, units, workers, wageAssignments, floorAttendances] = await Promise.all([
      garmentMasterService.getSettings(orgId),
      garmentMasterService.listRateCards(orgId),
      garmentMasterService.listUnits(orgId),
      garmentMasterService.listWorkerProfiles(orgId),
      garmentMasterService.listWageAssignments(orgId, entry.employee_id || undefined),
      this.listFloorAttendance({
        organizationId: orgId,
        startDate: entry.work_date,
        endDate: entry.work_date,
        unitId: entry.production_unit_id || undefined,
      }),
    ]);

    const unit = units.find((u) => u.id === entry.production_unit_id);
    const worker = workers.find((w) => w.employee_id === entry.employee_id);
    const empAssign = entry.employee_id
      ? resolveWageAssignmentForDate(
          wageAssignments.filter((a) => a.employee_id === entry.employee_id),
          entry.work_date
        )
      : null;

    const rateInfo = resolveApplicableRateCard(rateCards, {
      organization_id: orgId,
      work_date: entry.work_date,
      operation_id: entry.operation_id,
      order_id: entry.order_id,
      style_id: entry.style_id,
      production_unit_id: entry.production_unit_id,
      work_location_id: unit?.work_location_id || null,
      skill_grade: worker?.skill_grade || null,
      fallback_piece_rate: empAssign?.default_piece_rate || 0,
    });

    const unitRate =
      settings.supervisor_can_override_rate && entry.applied_unit_rate && entry.applied_unit_rate > 0
        ? Number(entry.applied_unit_rate)
        : rateInfo.unitRate;

    const produced = Number(entry.produced_qty || 0);
    const accepted = Number(entry.accepted_qty || 0);
    const rejected = Number(entry.rejected_qty || 0);
    const rework = Number(entry.rework_qty || 0);
    const reworkAccepted = Number(entry.rework_accepted_qty || 0);
    const pendingQc = Math.max(0, produced - (accepted + rejected + rework));
    const qcStatus = entry.qc_status || (accepted > 0 || rejected > 0 || rework > 0 ? 'QC_VERIFIED' : 'PENDING');

    if (accepted + rejected + rework > produced) {
      throw new Error('Accepted + Rejected + Rework quantities cannot exceed Produced quantity');
    }
    if (reworkAccepted > rework) {
      throw new Error('Rework Accepted quantity cannot exceed Rework quantity');
    }

    const { payableUnits, pieceAmount } = computeEntryPieceEarnings({
      accepted_qty: accepted,
      rejected_qty: rejected,
      rework_qty: rework,
      rework_accepted_qty: reworkAccepted,
      qc_status: qcStatus,
      unitRate,
      reworkCardRate: rateInfo.reworkRate,
      rejectedCardRate: rateInfo.rejectedRate,
      settings,
    });

    const allocationMode = entry.allocation_mode || 'INDIVIDUAL';
    const splitMethod =
      entry.shared_split_method ||
      unit?.shared_split_method_override ||
      settings.default_shared_split_method ||
      'EQUAL';

    const dbPayload = {
      ...(entry.id ? { id: entry.id } : {}),
      organization_id: orgId,
      work_date: entry.work_date,
      shift_id: entry.shift_id || null,
      production_unit_id: entry.production_unit_id || null,
      team_id: entry.team_id || null,
      order_id: entry.order_id || null,
      style_id: entry.style_id || null,
      operation_id: entry.operation_id,
      allocation_mode: allocationMode,
      shared_split_method: allocationMode === 'SHARED_LINE' ? splitMethod : null,
      employee_id: allocationMode === 'INDIVIDUAL' ? entry.employee_id || null : entry.employee_id || null,
      supervisor_employee_id: entry.supervisor_employee_id || unit?.supervisor_employee_id || null,
      qc_inspector_employee_id: entry.qc_inspector_employee_id || unit?.qc_inspector_employee_id || null,
      produced_qty: produced,
      accepted_qty: accepted,
      rejected_qty: rejected,
      rework_qty: rework,
      rework_accepted_qty: reworkAccepted,
      pending_qc_qty: pendingQc,
      rejection_reason_code: entry.rejection_reason_code || null,
      rejection_reason_notes: entry.rejection_reason_notes || null,
      applied_rate_card_id: rateInfo.card?.id || null,
      applied_unit_rate: unitRate,
      applied_rework_rate: rateInfo.reworkRate,
      payable_units: payableUnits,
      computed_piece_amount: pieceAmount,
      qc_status: qcStatus,
      approval_status: entry.approval_status || 'SUBMITTED',
      client_idempotency_key: entry.client_idempotency_key || null,
      notes: entry.notes || null,
    };

    const { data: savedEntry, error: saveErr } = await supabase
      .from('garment_production_entries')
      .upsert(dbPayload)
      .select()
      .single();

    if (saveErr) throw new Error(saveErr.message);

    // Build participants list for allocation
    let participantIds: string[] = [];
    if (allocationMode === 'INDIVIDUAL') {
      if (savedEntry.employee_id) participantIds = [savedEntry.employee_id];
    } else if (entry.participant_employee_ids && entry.participant_employee_ids.length > 0) {
      participantIds = entry.participant_employee_ids;
    } else {
      // Auto-discover present workers in unit/team for that day
      const presentIds = floorAttendances
        .filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY')
        .map((a) => a.employee_id);
      if (presentIds.length > 0) {
        participantIds = presentIds;
      } else if (entry.production_unit_id) {
        participantIds = workers
          .filter((w) => w.is_active && w.primary_unit_id === entry.production_unit_id)
          .map((w) => w.employee_id);
      }
    }

    const participants = participantIds.map((empId) => {
      const att = floorAttendances.find((a) => a.employee_id === empId);
      const wp = workers.find((w) => w.employee_id === empId);
      return {
        employee_id: empId,
        worked_hours: Number(att?.worked_hours ?? 8),
        skill_weightage: Number(wp?.skill_weightage ?? 1),
      };
    });

    const allocationsPayload = distributeProductionEntryToAllocations({
      entry: savedEntry as GarmentProductionEntry,
      participants,
      splitMethod,
    });

    // Replace unlocked allocations for this entry cleanly
    await supabase
      .from('garment_production_allocations')
      .delete()
      .eq('production_entry_id', savedEntry.id)
      .eq('is_locked', false);

    let savedAllocations: GarmentProductionAllocation[] = [];
    if (allocationsPayload.length > 0) {
      const { data: allocData, error: allocErr } = await supabase
        .from('garment_production_allocations')
        .upsert(allocationsPayload, { onConflict: 'production_entry_id,employee_id' })
        .select();
      if (allocErr) throw new Error(allocErr.message);
      savedAllocations = (allocData || []) as GarmentProductionAllocation[];
    }

    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_production_entry',
      entity_id: savedEntry.id,
      action: entry.id ? 'UPDATE_PRODUCTION_QC' : 'CREATE_PRODUCTION_QC',
      new_values: savedEntry,
    });

    return {
      entry: savedEntry as GarmentProductionEntry,
      allocations: savedAllocations,
    };
  },

  async updateProductionEntryStatus(params: {
    entryId: string;
    organizationId?: string;
    qcStatus?: 'PENDING' | 'QC_VERIFIED' | 'REJECTED_ENTRY';
    approvalStatus?: GarmentProductionEntry['approval_status'];
    reworkAcceptedQty?: number;
  }): Promise<GarmentProductionEntry> {
    const orgId = orgIdOrThrow(params.organizationId);
    const { data: existing, error: fetchErr } = await supabase
      .from('garment_production_entries')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', params.entryId)
      .single();

    if (fetchErr || !existing) throw new Error(fetchErr?.message || 'Production entry not found');
    if (existing.approval_status === 'LOCKED') {
      throw new Error('Entry is locked inside an approved payroll cycle. Raise a Correction Request or reopen payroll.');
    }

    const updated = {
      ...existing,
      qc_status: params.qcStatus ?? existing.qc_status,
      approval_status: params.approvalStatus ?? existing.approval_status,
      rework_accepted_qty: params.reworkAcceptedQty ?? existing.rework_accepted_qty,
    };

    const saved = await this.saveProductionEntry(updated);
    return saved.entry;
  },

  // ── 3. Incentives & Advances Ledger ────────────────────────────────────────
  async listIncentiveAwards(organizationId?: string, startDate?: string, endDate?: string): Promise<GarmentIncentiveAward[]> {
    const orgId = orgIdOrThrow(organizationId);
    let q = supabase
      .from('garment_incentive_awards')
      .select('*')
      .eq('organization_id', orgId)
      .order('award_date', { ascending: false });
    if (startDate) q = q.gte('award_date', startDate);
    if (endDate) q = q.lte('award_date', endDate);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentIncentiveAward[];
  },

  async saveIncentiveAward(award: Partial<GarmentIncentiveAward>): Promise<GarmentIncentiveAward> {
    const orgId = orgIdOrThrow(award.organization_id);
    const { data, error } = await supabase
      .from('garment_incentive_awards')
      .upsert({ ...award, organization_id: orgId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as GarmentIncentiveAward;
  },

  async listAdvancesLedger(organizationId?: string, employeeId?: string): Promise<GarmentAdvanceLedgerEntry[]> {
    const orgId = orgIdOrThrow(organizationId);
    let q = supabase
      .from('garment_advances_ledger')
      .select('*')
      .eq('organization_id', orgId)
      .order('entry_date', { ascending: false });
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentAdvanceLedgerEntry[];
  },

  async saveAdvanceLedgerEntry(entry: Partial<GarmentAdvanceLedgerEntry>): Promise<GarmentAdvanceLedgerEntry> {
    const orgId = orgIdOrThrow(entry.organization_id);
    const amount = Number(entry.amount || 0);
    const recovered = Number(entry.recovered_amount || 0);
    const payload = {
      ...entry,
      organization_id: orgId,
      balance_remaining: entry.balance_remaining ?? Math.max(0, amount - recovered),
    };
    const { data, error } = await supabase
      .from('garment_advances_ledger')
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_advances_ledger',
      entity_id: data.id,
      action: entry.id ? 'UPDATE_ADVANCE_LEDGER' : 'CREATE_ADVANCE_LEDGER',
      new_values: data,
    });
    return data as GarmentAdvanceLedgerEntry;
  },

  // ── 4. Correction Requests & Worker Disputes ───────────────────────────────
  async listCorrectionRequests(organizationId?: string, employeeId?: string): Promise<GarmentCorrectionRequest[]> {
    const orgId = orgIdOrThrow(organizationId);
    let q = supabase
      .from('garment_correction_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (employeeId) q = q.eq('employee_id', employeeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as GarmentCorrectionRequest[];
  },

  async createCorrectionRequest(req: Partial<GarmentCorrectionRequest>): Promise<GarmentCorrectionRequest> {
    const orgId = orgIdOrThrow(req.organization_id);
    const { data, error } = await supabase
      .from('garment_correction_requests')
      .insert({ ...req, organization_id: orgId, status: 'PENDING' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_correction_request',
      entity_id: data.id,
      action: 'CREATE_CORRECTION_REQUEST',
      new_values: data,
    });
    return data as GarmentCorrectionRequest;
  },

  async reviewCorrectionRequest(params: {
    requestId: string;
    organizationId?: string;
    decision: 'APPROVED' | 'REJECTED';
    reviewerNotes?: string;
  }): Promise<GarmentCorrectionRequest> {
    const orgId = orgIdOrThrow(params.organizationId);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('garment_correction_requests')
      .update({
        status: params.decision,
        reviewed_by: userData?.user?.id || null,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: params.reviewerNotes || null,
      })
      .eq('organization_id', orgId)
      .eq('id', params.requestId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await recordGarmentAudit({
      organization_id: orgId,
      entity_type: 'garment_correction_request',
      entity_id: params.requestId,
      action: `REVIEW_CORRECTION_${params.decision}`,
      new_values: data,
      reason: params.reviewerNotes,
    });
    return data as GarmentCorrectionRequest;
  },
};

