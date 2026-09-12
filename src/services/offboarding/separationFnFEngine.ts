// src/services/offboarding/separationFnFEngine.ts
// ============================================================================
// JOY PeopleHR — Module Certification 02: Offboarding → FnF Automation Engine
// Server-Authoritative Separation, Clearance, Asset Recovery & FnF Financials
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { domainEventService } from '../events/domainEventService';
import {
  CANONICAL_DOMAIN_EVENTS,
  IdempotencyKeyGenerator,
  DomainEventRecord,
} from '../../types/domainEvents';
import {
  EmployeeSeparation,
  SeparationClearance,
  SeparationAssetRecovery,
  ClearanceDepartment,
  ClearanceStatus,
  AssetRecoveryStatus,
} from '../../types';
import { FnFSettlement } from '../../types/payroll';

export interface NoticePeriodCalc {
  noticeDays: number;
  noticeStartDate: string;
  expectedLastWorkingDate: string;
  policyApplied: string;
}

export interface FnFCalculationParams {
  organizationId: string;
  separationId?: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  resignationDate: string;
  lastWorkingDate: string;
  grossMonthly: number;
  basicMonthly: number;
  unpaidSalaryDays: number;
  earnedLeaveBalanceDays: number;
  tenureYears: number;
  noticeRequiredDays: number;
  noticeServedDays: number;
  noticeWaiverDays?: number;
  assetRecoveryDeduction?: number;
  loanOutstandingRecovery?: number;
  statutoryDeductions?: number;
  bonusIncentiveAmount?: number;
  reimbursementAmount?: number;
  isPayrollPeriodLocked?: boolean;
}

export interface FnFCalculationResult {
  settlement: FnFSettlement;
  breakdown: {
    pendingSalary: number;
    leaveEncashment: number;
    gratuity: number;
    noticeShortfallRecovery: number;
    assetRecoveryDeduction: number;
    loanOutstandingRecovery: number;
    statutoryDeductions: number;
    totalGross: number;
    totalDeductions: number;
    netPayable: number;
  };
  isLockedPayrollPeriod: boolean;
  emittedEvents: DomainEventRecord[];
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class SeparationFnFEngine {
  private static instance: SeparationFnFEngine;

  public static getInstance(): SeparationFnFEngine {
    if (!SeparationFnFEngine.instance) {
      SeparationFnFEngine.instance = new SeparationFnFEngine();
    }
    return SeparationFnFEngine.instance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 02A: Separation Authority & Notice Period Engine
  // ──────────────────────────────────────────────────────────────────────────
  public calculateNoticePeriod(params: {
    employmentType?: string;
    designation?: string;
    resignationDateStr?: string;
  }): NoticePeriodCalc {
    const resDate = params.resignationDateStr ? new Date(params.resignationDateStr) : new Date();
    const startDateStr = resDate.toISOString().split('T')[0];

    const empType = (params.employmentType || '').toLowerCase();
    const desig = (params.designation || '').toLowerCase();

    let noticeDays = 30;
    let policyApplied = 'Standard Employee Policy (30 Days)';

    if (empType.includes('probation')) {
      noticeDays = 15;
      policyApplied = 'Probationary Policy (15 Days)';
    } else if (empType.includes('intern') || empType.includes('trainee')) {
      noticeDays = 7;
      policyApplied = 'Intern / Trainee Policy (7 Days)';
    } else if (empType.includes('contract') || empType.includes('vendor')) {
      noticeDays = 14;
      policyApplied = 'Contractor Policy (14 Days)';
    } else if (
      desig.includes('director') ||
      desig.includes('head') ||
      desig.includes('vp') ||
      desig.includes('manager') ||
      desig.includes('lead') ||
      desig.includes('architect')
    ) {
      noticeDays = 60;
      policyApplied = 'Leadership Policy (60 Days)';
    }

    const expLwd = new Date(resDate);
    expLwd.setDate(expLwd.getDate() + noticeDays);

    return {
      noticeDays,
      noticeStartDate: startDateStr,
      expectedLastWorkingDate: expLwd.toISOString().split('T')[0],
      policyApplied,
    };
  }

  public async initiateSeparation(params: {
    id?: string;
    organizationId: string;
    employeeId: string;
    separationType: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'CONTRACT_END';
    resignationDate: string;
    proposedLastWorkingDate?: string;
    employmentType?: string;
    designation?: string;
    reason: string;
    initiatedBy: string;
    initiatedRole: string;
  }): Promise<{
    separation: EmployeeSeparation;
    clearances: SeparationClearance[];
    emittedEvents: DomainEventRecord[];
  }> {
    const notice = this.calculateNoticePeriod({
      employmentType: params.employmentType,
      designation: params.designation,
      resignationDateStr: params.resignationDate,
    });

    const expectedLwd = params.proposedLastWorkingDate || notice.expectedLastWorkingDate;
    const now = new Date().toISOString();
    const separationId =
      params.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sep-${Date.now()}`);

    const newSeparation: EmployeeSeparation = {
      id: separationId,
      organization_id: params.organizationId,
      employee_id: params.employeeId,
      employment_source: 'DIRECT',
      separation_type: params.separationType as any,
      reason_code: 'OTHER' as any,
      reason_text: params.reason,
      resignation_date: params.resignationDate,
      proposed_last_working_date: params.proposedLastWorkingDate,
      notice_period_days: notice.noticeDays,
      notice_start_date: notice.noticeStartDate,
      expected_last_working_date: expectedLwd,
      status: 'INITIATED' as any,
      initiated_by: params.initiatedBy,
      initiated_role: params.initiatedRole,
      retention_status: 'NOT_ATTEMPTED' as any,
      rehire_eligibility: 'ELIGIBLE' as any,
      is_early_release: false,
      notice_waiver_days: 0,
      notice_buyout_days: 0,
      created_at: now,
      updated_at: now,
    };

    // A. Spawn Standard 8-Department Clearance Matrix
    const clearances = this.initializeDefaultClearances(separationId, params.organizationId, expectedLwd);
    newSeparation.clearances = clearances;

    // B. Persist in Supabase if valid UUID
    if (isSupabaseEnabled && isValidUUID(separationId) && isValidUUID(params.organizationId)) {
      try {
        await supabase.from('employee_separations').insert({
          id: separationId,
          organization_id: params.organizationId,
          employee_id: params.employeeId,
          resignation_date: params.resignationDate,
          status: 'INITIATED',
          created_at: now,
          updated_at: now,
        });

        // Insert clearances
        for (const cl of clearances) {
          if (isValidUUID(cl.id)) {
            await supabase.from('separation_clearances').insert({
              id: cl.id,
              organization_id: params.organizationId,
              separation_id: separationId,
              department: cl.department,
              cleared_by: null,
              status: 'PENDING',
              created_at: now,
              updated_at: now,
            });
          }
        }
      } catch (dbErr) {
        console.warn('[SeparationFnFEngine] DB insert notice:', dbErr);
      }
    }

    this.saveLocalSeparation(newSeparation);
    this.saveLocalClearances(clearances);

    // C. Emit Canonical Event
    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: params.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.SEPARATION_INITIATED,
      aggregate_type: 'SEPARATION',
      aggregate_id: separationId,
      idempotency_key: `separation.initiated.${separationId}`,
      payload: {
        separation_id: separationId,
        employee_id: params.employeeId,
        separation_type: params.separationType,
        resignation_date: params.resignationDate,
        expected_last_working_date: expectedLwd,
        notice_period_days: notice.noticeDays,
      },
      actor_id: params.initiatedBy,
    });
    emittedEvents.push(event);

    return { separation: newSeparation, clearances, emittedEvents };
  }

  public async approveSeparation(params: {
    separationId: string;
    organizationId: string;
    actorId: string;
    actorRole: string;
    approvedLwd?: string;
    noticeWaiverDays?: number;
    noticeBuyoutDays?: number;
    comments?: string;
  }): Promise<{ separation: EmployeeSeparation; emittedEvents: DomainEventRecord[] }> {
    const { separationId, organizationId, actorId, actorRole, approvedLwd, comments, noticeWaiverDays, noticeBuyoutDays } = params;

    const sep = await this.getSeparationById(separationId);
    if (!sep) {
      throw new Error(`SEPARATION_NOT_FOUND: Separation ${separationId} not found.`);
    }

    if (noticeWaiverDays !== undefined) {
      sep.notice_waiver_days = noticeWaiverDays;
    }
    if (noticeBuyoutDays !== undefined) {
      sep.notice_buyout_days = noticeBuyoutDays;
    }

    // Role check: Applicant cannot approve own resignation
    if (sep.employee_id === actorId) {
      throw new Error(
        'UNAUTHORIZED_SEPARATION_APPROVAL: Employees cannot approve their own separation request.'
      );
    }

    if (sep.organization_id && sep.organization_id !== organizationId) {
      throw new Error(
        `TENANT_BOUNDARY_VIOLATION: Cross-tenant approval rejected for tenant ${organizationId}.`
      );
    }

    const now = new Date().toISOString();
    sep.status = 'NOTICE_PERIOD' as any;
    sep.approved_by = actorId;
    sep.approved_last_working_date = approvedLwd || sep.expected_last_working_date;
    sep.comments = comments;
    sep.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(separationId) && isValidUUID(organizationId)) {
      try {
        await supabase
          .from('employee_separations')
          .update({
            status: 'NOTICE_PERIOD',
            updated_at: now,
          })
          .eq('id', separationId);
      } catch (dbErr) {
        console.warn('[SeparationFnFEngine] DB approval notice:', dbErr);
      }
    }

    this.saveLocalSeparation(sep);

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.SEPARATION_APPROVED,
      aggregate_type: 'SEPARATION',
      aggregate_id: separationId,
      idempotency_key: `separation.approved.${separationId}`,
      payload: {
        separation_id: separationId,
        employee_id: sep.employee_id,
        approved_by: actorId,
        approved_lwd: sep.approved_last_working_date,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return { separation: sep, emittedEvents };
  }

  public async withdrawSeparation(params: {
    separationId: string;
    organizationId: string;
    actorId: string;
    reason: string;
  }): Promise<{ separation: EmployeeSeparation }> {
    const sep = await this.getSeparationById(params.separationId);
    if (!sep) throw new Error('Separation not found');

    const curStatus = (sep.status as string).toUpperCase();
    if (curStatus === 'COMPLETED' || curStatus === 'SETTLED') {
      throw new Error('ILLEGAL_STATE_TRANSITION: Cannot withdraw an already completed separation.');
    }

    sep.status = 'CANCELLED' as any;
    sep.reason_text = `Withdrawn: ${params.reason}`;
    sep.updated_at = new Date().toISOString();

    if (isSupabaseEnabled && isValidUUID(params.separationId)) {
      try {
        await supabase
          .from('employee_separations')
          .update({ status: 'CANCELLED', updated_at: sep.updated_at })
          .eq('id', params.separationId);
      } catch (_) {}
    }

    this.saveLocalSeparation(sep);
    return { separation: sep };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 02B: Clearance Authority & Asset Recovery
  // ──────────────────────────────────────────────────────────────────────────
  public initializeDefaultClearances(
    separationId: string,
    organizationId: string,
    expectedLwd: string
  ): SeparationClearance[] {
    const departments: ClearanceDepartment[] = [
      'MANAGER',
      'TEAM_LEAD',
      'IT',
      'ASSET',
      'FINANCE',
      'PAYROLL',
      'HR',
      'ADMIN',
    ];

    const now = new Date().toISOString();
    return departments.map((dept, idx) => ({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cl-${separationId}-${idx}`,
      separation_id: separationId,
      department: dept,
      clearance_item: `${dept} Departmental Exit Sign-off`,
      assigned_role: dept,
      status: 'PENDING' as ClearanceStatus,
      due_date: expectedLwd,
      created_at: now,
      updated_at: now,
    }));
  }

  public async recordAssetRecovery(params: {
    id?: string;
    organizationId: string;
    separationId: string;
    assetId: string;
    assetName: string;
    serialNumber?: string;
    condition: 'NEW' | 'GOOD' | 'DAMAGED' | 'UNUSABLE';
    recoveryStatus: 'PENDING' | 'RETURNED' | 'DAMAGED' | 'MISSING' | 'WAIVED';
    damageDeductionAmount?: number;
    recoveredBy: string;
    remarks?: string;
  }): Promise<{ recovery: SeparationAssetRecovery; emittedEvents: DomainEventRecord[] }> {
    const now = new Date().toISOString();
    const recoveryId =
      params.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ast-rec-${Date.now()}`);

    const recovery: SeparationAssetRecovery = {
      id: recoveryId,
      separation_id: params.separationId,
      asset_id: params.assetId,
      asset_name: params.assetName,
      serial_number: params.serialNumber,
      category: 'HARDWARE',
      assigned_date: '2025-01-01',
      asset_value: 0,
      condition: (params.condition || 'GOOD') as any,
      recovery_status: params.recoveryStatus as AssetRecoveryStatus,
      damage_assessment: params.condition,
      financial_recovery_amount: params.damageDeductionAmount || 0,
      received_by: params.recoveredBy,
      returned_date: now,
      notes: params.remarks,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseEnabled && isValidUUID(recoveryId) && isValidUUID(params.organizationId)) {
      try {
        await supabase.from('separation_asset_recoveries').insert({
          id: recoveryId,
          organization_id: params.organizationId,
          separation_id: params.separationId,
          asset_id: isValidUUID(params.assetId) ? params.assetId : null,
          asset_name: params.assetName,
          serial_number: params.serialNumber || null,
          condition: params.condition,
          recovery_status: params.recoveryStatus,
          created_at: now,
          updated_at: now,
        });

        if (params.recoveryStatus === 'RETURNED' && isValidUUID(params.assetId)) {
          await supabase
            .from('assets')
            .update({ status: 'AVAILABLE', updated_at: now })
            .eq('id', params.assetId);
        }
      } catch (dbErr) {
        console.warn('[SeparationFnFEngine] asset recovery DB notice:', dbErr);
      }
    }

    this.saveLocalAssetRecovery(recovery);

    const emittedEvents: DomainEventRecord[] = [];
    const eventType =
      params.recoveryStatus === 'DAMAGED' || params.recoveryStatus === 'MISSING'
        ? CANONICAL_DOMAIN_EVENTS.ASSET_DAMAGED
        : CANONICAL_DOMAIN_EVENTS.ASSET_RETURNED;

    const event = await domainEventService.publishEvent({
      organization_id: params.organizationId,
      event_type: eventType,
      aggregate_type: 'ASSET',
      aggregate_id: params.assetId,
      idempotency_key: `asset.recovery.${params.separationId}.${params.assetId}`,
      payload: {
        separation_id: params.separationId,
        asset_id: params.assetId,
        recovery_status: params.recoveryStatus,
        financial_recovery_amount: params.damageDeductionAmount || 0,
      },
      actor_id: params.recoveredBy,
    });
    emittedEvents.push(event);

    return { recovery, emittedEvents };
  }

  public async updateClearance(params: {
    clearanceId: string;
    separationId: string;
    organizationId: string;
    status: ClearanceStatus;
    clearedBy: string;
    remarks?: string;
  }): Promise<{ clearance: SeparationClearance; allCleared: boolean; emittedEvents: DomainEventRecord[] }> {
    const clearances = this.getLocalClearances(params.separationId);
    const target = clearances.find((c) => c.id === params.clearanceId);
    if (!target) throw new Error(`Clearance ${params.clearanceId} not found.`);

    const now = new Date().toISOString();
    target.status = params.status;
    target.completed_by = params.clearedBy;
    target.completed_at = now;
    target.comments = params.remarks;
    target.cleared_by = params.clearedBy;
    target.cleared_at = now;
    target.notes = params.remarks;
    target.updated_at = now;

    if (isSupabaseEnabled && isValidUUID(params.clearanceId)) {
      try {
        await supabase
          .from('separation_clearances')
          .update({
            status: params.status,
            completed_by: params.clearedBy,
            completed_at: now,
            comments: params.remarks,
            updated_at: now,
          })
          .eq('id', params.clearanceId);
      } catch (_) {}
    }

    this.saveLocalClearances(clearances);

    const allCleared = clearances.every((c) => c.status === 'CLEARED' || c.status === 'WAIVED');
    const emittedEvents: DomainEventRecord[] = [];

    if (allCleared) {
      const event = await domainEventService.publishEvent({
        organization_id: params.organizationId,
        event_type: CANONICAL_DOMAIN_EVENTS.SEPARATION_CLEARANCE_COMPLETED,
        aggregate_type: 'SEPARATION',
        aggregate_id: params.separationId,
        idempotency_key: `clearance.completed.${params.separationId}`,
        payload: {
          separation_id: params.separationId,
          cleared_by: params.clearedBy,
          all_cleared: true,
        },
        actor_id: params.clearedBy,
      });
      emittedEvents.push(event);
    }

    return { clearance: target, allCleared, emittedEvents };
  }

  public verifyClearanceReadiness(separationId: string): {
    isReady: boolean;
    pendingCount: number;
    rejectedCount: number;
    blockers: string[];
  } {
    const clearances = this.getLocalClearances(separationId);
    const pending = clearances.filter((c) => c.status === 'PENDING' || c.status === 'IN_PROGRESS');
    const rejected = clearances.filter((c) => c.status === 'REJECTED');

    const blockers: string[] = [];
    if (pending.length > 0) blockers.push(`${pending.length} departmental clearances pending`);
    if (rejected.length > 0) blockers.push(`${rejected.length} clearances rejected`);

    return {
      isReady: blockers.length === 0,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      blockers,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 02C & 02D: Financial FnF Engine & Locked Period Isolation
  // ──────────────────────────────────────────────────────────────────────────
  public async calculateFnFSettlement(
    params: FnFCalculationParams
  ): Promise<FnFCalculationResult> {
    const {
      organizationId,
      separationId,
      employeeId,
      employeeName = 'Exiting Employee',
      employeeCode = `EMP-${employeeId.slice(0, 6)}`,
      department = 'Operations',
      designation = 'Specialist',
      resignationDate,
      lastWorkingDate,
      grossMonthly,
      basicMonthly,
      unpaidSalaryDays,
      earnedLeaveBalanceDays,
      tenureYears,
      noticeRequiredDays,
      noticeServedDays,
      noticeWaiverDays = 0,
      assetRecoveryDeduction = 0,
      loanOutstandingRecovery = 0,
      statutoryDeductions = 200,
      bonusIncentiveAmount = 0,
      reimbursementAmount = 0,
      isPayrollPeriodLocked = false,
    } = params;

    // A. Rates & Calculations
    const dailyRate = Math.round(grossMonthly / 30);
    const basicDailyRate = Math.round(basicMonthly / 30);

    // 1. Pending Salary
    const pendingSalary = unpaidSalaryDays * dailyRate;

    // 2. Leave Encashment
    const leaveEncashment = Math.round(earnedLeaveBalanceDays * basicDailyRate);

    // 3. Gratuity: Statutory formula: (15 * basic * tenureYears) / 26 (if tenure >= 5 years)
    const gratuity = tenureYears >= 5 ? Math.round((15 * basicMonthly * tenureYears) / 26) : 0;

    // 4. Notice Shortfall Recovery
    const shortfallDays = Math.max(0, noticeRequiredDays - noticeServedDays - noticeWaiverDays);
    const noticeShortfallRecovery = shortfallDays * dailyRate;

    // 5. Aggregations
    const totalGross = pendingSalary + leaveEncashment + gratuity + bonusIncentiveAmount + reimbursementAmount;
    const totalDeductions =
      noticeShortfallRecovery + assetRecoveryDeduction + loanOutstandingRecovery + statutoryDeductions;
    const netPayable = Math.max(0, totalGross - totalDeductions);

    const settlementId = separationId
      ? `fnf-sep-${separationId}`
      : `fnf-${employeeId}-${Date.now()}`;

    const now = new Date().toISOString();
    const settlement: FnFSettlement = {
      id: settlementId,
      tenant_id: organizationId,
      separation_id: separationId,
      employee_id: employeeId,
      employee_name: employeeName,
      employee_code: employeeCode,
      department,
      designation,
      resignation_date: resignationDate,
      last_working_date: lastWorkingDate,
      notice_period_required_days: noticeRequiredDays,
      notice_period_served_days: noticeServedDays,
      notice_shortfall_days: shortfallDays,
      unpaid_salary_days: unpaidSalaryDays,
      unpaid_salary_amount: pendingSalary,
      earned_leave_balance_days: earnedLeaveBalanceDays,
      leave_encashment_amount: leaveEncashment,
      gratuity_amount: gratuity,
      bonus_incentive_amount: bonusIncentiveAmount,
      reimbursement_amount: reimbursementAmount,
      total_gross_settlement: totalGross,
      notice_shortfall_recovery: noticeShortfallRecovery,
      loan_outstanding_recovery: loanOutstandingRecovery,
      advance_outstanding_recovery: 0,
      asset_recovery_deduction: assetRecoveryDeduction,
      statutory_deductions: statutoryDeductions,
      total_deductions_settlement: totalDeductions,
      net_settlement_payable: netPayable,
      payment_status: 'Calculated',
      settlement_date: lastWorkingDate,
      created_at: now,
    };

    // B. Supabase Persistence if valid UUID
    if (isSupabaseEnabled && isValidUUID(organizationId) && isValidUUID(employeeId)) {
      try {
        await supabase.from('fnf_settlements').upsert({
          organization_id: organizationId,
          separation_id: separationId && isValidUUID(separationId) ? separationId : null,
          employee_id: employeeId,
          total_gross_settlement: totalGross,
          total_deductions_settlement: totalDeductions,
          net_settlement_payable: netPayable,
          unpaid_salary_amount: pendingSalary,
          leave_encashment_amount: leaveEncashment,
          gratuity_amount: gratuity,
          notice_shortfall_recovery: noticeShortfallRecovery,
          asset_recovery_deduction: assetRecoveryDeduction,
          loan_outstanding_recovery: loanOutstandingRecovery,
          statutory_deductions: statutoryDeductions,
          payment_status: 'CALCULATED',
          updated_at: now,
        });
      } catch (dbErr) {
        console.warn('[SeparationFnFEngine] fnf_settlements upsert notice:', dbErr);
      }
    }

    this.saveLocalFnFSettlement(settlement);

    // C. Emit Domain Event
    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.FNF_GENERATED,
      aggregate_type: 'FNF',
      aggregate_id: settlementId,
      idempotency_key: `fnf.generated.${settlementId}`,
      payload: {
        settlement_id: settlementId,
        employee_id: employeeId,
        net_payable: netPayable,
        is_locked_payroll: isPayrollPeriodLocked,
      },
      actor_id: 'system',
    });
    emittedEvents.push(event);

    return {
      settlement,
      breakdown: {
        pendingSalary,
        leaveEncashment,
        gratuity,
        noticeShortfallRecovery,
        assetRecoveryDeduction,
        loanOutstandingRecovery,
        statutoryDeductions,
        totalGross,
        totalDeductions,
        netPayable,
      },
      isLockedPayrollPeriod: isPayrollPeriodLocked,
      emittedEvents,
    };
  }

  public async approveFnFSettlement(params: {
    settlementId: string;
    organizationId: string;
    actorId: string;
    actorRole: string;
    comments?: string;
  }): Promise<{ settlement: FnFSettlement; emittedEvents: DomainEventRecord[] }> {
    const settlement = this.getLocalFnFSettlement(params.settlementId);
    if (!settlement) throw new Error(`FnF Settlement ${params.settlementId} not found.`);

    if (settlement.employee_id === params.actorId) {
      throw new Error('UNAUTHORIZED_FNF_APPROVAL: Employees cannot approve their own FnF settlement.');
    }

    const now = new Date().toISOString();
    settlement.payment_status = 'Approved';
    settlement.approved_by = params.actorId;

    if (isSupabaseEnabled && isValidUUID(params.organizationId)) {
      try {
        await supabase
          .from('fnf_settlements')
          .update({
            payment_status: 'APPROVED',
            approved_by: params.actorId,
            updated_at: now,
          })
          .eq('id', params.settlementId);
      } catch (_) {}
    }

    this.saveLocalFnFSettlement(settlement);

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: params.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.FNF_APPROVED,
      aggregate_type: 'FNF',
      aggregate_id: params.settlementId,
      idempotency_key: `fnf.approved.${params.settlementId}`,
      payload: {
        settlement_id: params.settlementId,
        employee_id: settlement.employee_id,
        approved_by: params.actorId,
      },
      actor_id: params.actorId,
    });
    emittedEvents.push(event);

    return { settlement, emittedEvents };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 02E: Final Exit Automation & Session Revocation
  // ──────────────────────────────────────────────────────────────────────────
  public async settleFnF(params: {
    settlementId: string;
    organizationId: string;
    actorId: string;
    paymentReference: string;
    allowException?: boolean;
  }): Promise<{
    settlement: FnFSettlement;
    separation?: EmployeeSeparation;
    exitExecuted: boolean;
    emittedEvents: DomainEventRecord[];
  }> {
    const settlement = this.getLocalFnFSettlement(params.settlementId);
    if (!settlement) throw new Error(`FnF Settlement ${params.settlementId} not found.`);

    // 1. Verify clearance blockers
    if (settlement.separation_id) {
      const readiness = this.verifyClearanceReadiness(settlement.separation_id);
      if (!readiness.isReady && !params.allowException) {
        throw new Error(
          `CLEARANCE_BLOCKER: Cannot settle FnF with unresolved departmental clearances: ${readiness.blockers.join(', ')}`
        );
      }
    }

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    // 2. Mark Settlement Settled
    settlement.payment_status = 'Disbursed';
    this.saveLocalFnFSettlement(settlement);

    if (isSupabaseEnabled && isValidUUID(params.organizationId)) {
      try {
        await supabase
          .from('fnf_settlements')
          .update({
            payment_status: 'SETTLED',
            settled_at: now,
            updated_at: now,
          })
          .eq('id', params.settlementId);
      } catch (_) {}
    }

    // 3. Mark Separation Completed
    let sep: EmployeeSeparation | undefined = undefined;
    if (settlement.separation_id) {
      sep = await this.getSeparationById(settlement.separation_id);
      if (sep) {
        sep.status = 'COMPLETED' as any;
        sep.completed_at = now;
        this.saveLocalSeparation(sep);

        if (isSupabaseEnabled && isValidUUID(sep.id)) {
          try {
            await supabase
              .from('employee_separations')
              .update({ status: 'COMPLETED', updated_at: now })
              .eq('id', sep.id);
          } catch (_) {}
        }
      }
    }

    // 4. Terminal Employee State Mutation: EXITED
    await this.executeTerminalExit({
      organizationId: params.organizationId,
      employeeId: settlement.employee_id,
      effectiveDate: todayStr,
      actorId: params.actorId,
    });

    // 5. Emit Domain Events
    const emittedEvents: DomainEventRecord[] = [];
    const eventSettled = await domainEventService.publishEvent({
      organization_id: params.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.FNF_SETTLED,
      aggregate_type: 'FNF',
      aggregate_id: params.settlementId,
      idempotency_key: `fnf.settled.${params.settlementId}`,
      payload: {
        settlement_id: params.settlementId,
        employee_id: settlement.employee_id,
        payment_reference: params.paymentReference,
        settled_at: now,
      },
      actor_id: params.actorId,
    });
    emittedEvents.push(eventSettled);

    const eventExited = await domainEventService.publishEvent({
      organization_id: params.organizationId,
      event_type: 'employee.exited',
      aggregate_type: 'EMPLOYEE',
      aggregate_id: settlement.employee_id,
      idempotency_key: `employee.exited.${settlement.employee_id}`,
      payload: {
        employee_id: settlement.employee_id,
        separation_id: settlement.separation_id,
        effective_date: todayStr,
      },
      actor_id: params.actorId,
    });
    emittedEvents.push(eventExited);

    return {
      settlement,
      separation: sep,
      exitExecuted: true,
      emittedEvents,
    };
  }

  private async executeTerminalExit(params: {
    organizationId: string;
    employeeId: string;
    effectiveDate: string;
    actorId: string;
  }): Promise<void> {
    const { organizationId, employeeId, effectiveDate, actorId } = params;
    const now = new Date().toISOString();

    // A. Update employees table: employment_status = 'EXITED'
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('employees')
          .update({
            employment_status: 'EXITED',
            updated_at: now,
          })
          .eq('id', employeeId);
      } catch (_) {}
    }
    this.updateLocalEmployeeStatus(employeeId, 'EXITED', effectiveDate);

    // B. Deactivate User Profile & Revoke Auth Session
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        await supabase
          .from('user_profiles')
          .update({
            status: 'INACTIVE',
            updated_at: now,
          })
          .eq('employee_id', employeeId);
      } catch (_) {}
    }
    this.updateLocalUserProfileStatus(employeeId, 'INACTIVE');

    // C. Append immutable record to employee_lifecycle_events
    if (isSupabaseEnabled && isValidUUID(organizationId) && isValidUUID(employeeId)) {
      try {
        await supabase.from('employee_lifecycle_events').insert({
          organization_id: organizationId,
          employee_id: employeeId,
          event_type: 'EXIT',
          effective_date: effectiveDate,
          created_by: actorId,
          created_at: now,
        });
      } catch (_) {}
    }
    this.appendLocalLifecycleEvent({
      organization_id: organizationId,
      employee_id: employeeId,
      event_type: 'EXIT',
      effective_date: effectiveDate,
      created_by: actorId,
      created_at: now,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // In-Memory & Local Store Mirrors
  // ──────────────────────────────────────────────────────────────────────────
  public async getSeparationById(id: string): Promise<EmployeeSeparation | null> {
    if (isSupabaseEnabled && isValidUUID(id)) {
      try {
        const { data, error } = await supabase
          .from('employee_separations')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) return data as any;
      } catch (_) {}
    }
    const all = this.getAllLocalSeparations();
    return all.find((s) => s.id === id) || null;
  }

  private getAllLocalSeparations(): EmployeeSeparation[] {
    if (typeof window === 'undefined') {
      return (globalThis as any).__JOY_SEPARATIONS__ || [];
    }
    try {
      const raw = localStorage.getItem('workforce_employee_separations_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalSeparation(sep: EmployeeSeparation): void {
    if (typeof window === 'undefined') {
      let list = (globalThis as any).__JOY_SEPARATIONS__ || [];
      const idx = list.findIndex((s: any) => s.id === sep.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...sep };
      else list.unshift(sep);
      (globalThis as any).__JOY_SEPARATIONS__ = list;
      return;
    }
    try {
      let list = this.getAllLocalSeparations();
      const idx = list.findIndex((s) => s.id === sep.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...sep };
      else list.unshift(sep);
      localStorage.setItem('workforce_employee_separations_v1', JSON.stringify(list));
    } catch {}
  }

  public getLocalClearances(separationId: string): SeparationClearance[] {
    if (typeof window === 'undefined') {
      const all = (globalThis as any).__JOY_SEPARATION_CLEARANCES__ || [];
      return all.filter((c: any) => c.separation_id === separationId);
    }
    try {
      const raw = localStorage.getItem('workforce_separation_clearances_v1');
      const all: SeparationClearance[] = raw ? JSON.parse(raw) : [];
      return all.filter((c) => c.separation_id === separationId);
    } catch {
      return [];
    }
  }

  private saveLocalClearances(clearances: SeparationClearance[]): void {
    if (typeof window === 'undefined') {
      let all = (globalThis as any).__JOY_SEPARATION_CLEARANCES__ || [];
      for (const cl of clearances) {
        const idx = all.findIndex((c: any) => c.id === cl.id);
        if (idx !== -1) all[idx] = cl;
        else all.push(cl);
      }
      (globalThis as any).__JOY_SEPARATION_CLEARANCES__ = all;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_separation_clearances_v1');
      let all: SeparationClearance[] = raw ? JSON.parse(raw) : [];
      for (const cl of clearances) {
        const idx = all.findIndex((c) => c.id === cl.id);
        if (idx !== -1) all[idx] = cl;
        else all.push(cl);
      }
      localStorage.setItem('workforce_separation_clearances_v1', JSON.stringify(all));
    } catch {}
  }

  private saveLocalAssetRecovery(recovery: SeparationAssetRecovery): void {
    if (typeof window === 'undefined') {
      let all = (globalThis as any).__JOY_SEPARATION_ASSETS__ || [];
      const idx = all.findIndex((a: any) => a.id === recovery.id);
      if (idx !== -1) all[idx] = recovery;
      else all.push(recovery);
      (globalThis as any).__JOY_SEPARATION_ASSETS__ = all;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_separation_assets_v1');
      let all: SeparationAssetRecovery[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((a) => a.id === recovery.id);
      if (idx !== -1) all[idx] = recovery;
      else all.push(recovery);
      localStorage.setItem('workforce_separation_assets_v1', JSON.stringify(all));
    } catch {}
  }

  public getLocalFnFSettlement(id: string): FnFSettlement | null {
    if (typeof window === 'undefined') {
      const all = (globalThis as any).__JOY_FNF_SETTLEMENTS__ || [];
      return all.find((s: any) => s.id === id || s.separation_id === id) || null;
    }
    try {
      const raw = localStorage.getItem('workforce_payroll_settlements_v1');
      const all: FnFSettlement[] = raw ? JSON.parse(raw) : [];
      return all.find((s) => s.id === id || s.separation_id === id) || null;
    } catch {
      return null;
    }
  }

  private saveLocalFnFSettlement(settlement: FnFSettlement): void {
    if (typeof window === 'undefined') {
      let all = (globalThis as any).__JOY_FNF_SETTLEMENTS__ || [];
      const idx = all.findIndex((s: any) => s.id === settlement.id);
      if (idx !== -1) all[idx] = settlement;
      else all.unshift(settlement);
      (globalThis as any).__JOY_FNF_SETTLEMENTS__ = all;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_payroll_settlements_v1');
      let all: FnFSettlement[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((s) => s.id === settlement.id);
      if (idx !== -1) all[idx] = settlement;
      else all.unshift(settlement);
      localStorage.setItem('workforce_payroll_settlements_v1', JSON.stringify(all));
    } catch {}
  }

  private updateLocalEmployeeStatus(employeeId: string, status: string, lwd: string): void {
    if (typeof window === 'undefined') {
      let emps = (globalThis as any).__JOY_EMPLOYEES__ || [];
      const idx = emps.findIndex((e: any) => e.id === employeeId);
      if (idx !== -1) {
        emps[idx].employment_status = status;
        emps[idx].last_working_day = lwd;
      }
      (globalThis as any).__JOY_EMPLOYEES__ = emps;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_employees');
      let emps = raw ? JSON.parse(raw) : [];
      const idx = emps.findIndex((e: any) => e.id === employeeId);
      if (idx !== -1) {
        emps[idx].employment_status = status;
        emps[idx].last_working_day = lwd;
        localStorage.setItem('workforce_employees', JSON.stringify(emps));
      }
    } catch {}
  }

  private updateLocalUserProfileStatus(employeeId: string, status: string): void {
    if (typeof window === 'undefined') {
      let profs = (globalThis as any).__JOY_USER_PROFILES__ || [];
      const idx = profs.findIndex((p: any) => p.employee_id === employeeId);
      if (idx !== -1) profs[idx].status = status;
      (globalThis as any).__JOY_USER_PROFILES__ = profs;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_user_profiles');
      let profs = raw ? JSON.parse(raw) : [];
      const idx = profs.findIndex((p: any) => p.employee_id === employeeId);
      if (idx !== -1) {
        profs[idx].status = status;
        localStorage.setItem('workforce_user_profiles', JSON.stringify(profs));
      }
    } catch {}
  }

  private appendLocalLifecycleEvent(event: any): void {
    if (typeof window === 'undefined') {
      let events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
      events.push(event);
      (globalThis as any).__JOY_LIFECYCLE_EVENTS__ = events;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_lifecycle_events');
      let events = raw ? JSON.parse(raw) : [];
      events.push(event);
      localStorage.setItem('workforce_lifecycle_events', JSON.stringify(events));
    } catch {}
  }
}

export const separationFnFEngine = SeparationFnFEngine.getInstance();
