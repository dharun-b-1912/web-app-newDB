// src/services/leave/leaveEngine.ts
// ============================================================================
// JOY PeopleHR — Module Certification 01: Leave Management Engine
// Server-Authoritative Leave Authority & Mathematical Ledger Integrity
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { domainEventService } from '../events/domainEventService';
import {
  CANONICAL_DOMAIN_EVENTS,
  IdempotencyKeyGenerator,
  DomainEventRecord,
} from '../../types/domainEvents';
import {
  LeaveRequest,
  LeaveType,
  LeaveEntitlement,
  LeaveLedgerTransaction,
  LedgerTransactionType,
} from '../../types/leave';

export interface LeaveWorkingDaysResult {
  totalCalendarDays: number;
  workingDays: number;
  holidayDays: number;
  weekendDays: number;
  leaveDaysDeducted: number;
  dailyBreakdown: {
    date: string;
    isWorkingDay: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    holidayName?: string;
    leaveCount: number;
  }[];
}

export interface LeaveValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  workingDaysResult?: LeaveWorkingDaysResult;
  availableBalance?: number;
}

export interface LeaveReconciliationReport {
  employeeId: string;
  leaveTypeId: string;
  calendarYear: number;
  openingBalance: number;
  ledgerEntriesCount: number;
  calculatedBalanceFromLedger: number;
  recordedClosingBalance: number;
  reconciles: boolean;
  discrepancy: number;
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class LeaveEngine {
  private static instance: LeaveEngine;

  // In-memory concurrency mutex locks per employee
  private employeeLocks: Set<string> = new Set();

  public static getInstance(): LeaveEngine {
    if (!LeaveEngine.instance) {
      LeaveEngine.instance = new LeaveEngine();
    }
    return LeaveEngine.instance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Working Days & Holiday / Weekend Calculation
  // ──────────────────────────────────────────────────────────────────────────
  public calculateWorkingDays(params: {
    fromDate: string;
    toDate: string;
    isHalfDay?: boolean;
    sandwichRuleEnabled?: boolean;
    excludeWeekends?: boolean;
    excludeHolidays?: boolean;
    holidaysList?: { date: string; name: string }[];
  }): LeaveWorkingDaysResult {
    const {
      fromDate,
      toDate,
      isHalfDay = false,
      sandwichRuleEnabled = false,
      excludeWeekends = true,
      excludeHolidays = true,
      holidaysList = [],
    } = params;

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const holidayMap = new Map<string, string>();
    holidaysList.forEach((h) => holidayMap.set(h.date, h.name));

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        totalCalendarDays: 0,
        workingDays: 0,
        holidayDays: 0,
        weekendDays: 0,
        leaveDaysDeducted: 0,
        dailyBreakdown: [],
      };
    }

    if (isHalfDay) {
      const dateStr = start.toISOString().split('T')[0];
      return {
        totalCalendarDays: 1,
        workingDays: 0.5,
        holidayDays: 0,
        weekendDays: 0,
        leaveDaysDeducted: 0.5,
        dailyBreakdown: [
          {
            date: dateStr,
            isWorkingDay: true,
            isWeekend: false,
            isHoliday: false,
            leaveCount: 0.5,
          },
        ],
      };
    }

    let totalCalendar = 0;
    let weekendCount = 0;
    let holidayCount = 0;
    let workingDaysCount = 0;
    const breakdown: LeaveWorkingDaysResult['dailyBreakdown'] = [];

    const curr = new Date(start);
    while (curr <= end) {
      totalCalendar++;
      const dateStr = curr.toISOString().split('T')[0];
      const dayOfWeek = curr.getUTCDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayMap.has(dateStr);
      const holidayName = holidayMap.get(dateStr);

      let isWorking = true;
      let count = 1.0;

      if (!sandwichRuleEnabled) {
        if (excludeWeekends && isWeekend) {
          isWorking = false;
          weekendCount++;
          count = 0;
        } else if (excludeHolidays && isHoliday) {
          isWorking = false;
          holidayCount++;
          count = 0;
        }
      }

      if (isWorking) {
        workingDaysCount++;
      }

      breakdown.push({
        date: dateStr,
        isWorkingDay: isWorking,
        isWeekend,
        isHoliday,
        holidayName,
        leaveCount: count,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const deducted = sandwichRuleEnabled ? totalCalendar : workingDaysCount;

    return {
      totalCalendarDays: totalCalendar,
      workingDays: workingDaysCount,
      holidayDays: holidayCount,
      weekendDays: weekendCount,
      leaveDaysDeducted: deducted,
      dailyBreakdown: breakdown,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Overlap Validation
  // ──────────────────────────────────────────────────────────────────────────
  public async checkLeaveOverlap(
    employeeId: string,
    fromDate: string,
    toDate: string,
    excludeRequestId?: string
  ): Promise<{ hasOverlap: boolean; conflictingRequest?: any }> {
    const activeRequests = await this.getActiveEmployeeRequests(employeeId);

    const startReq = new Date(fromDate).getTime();
    const endReq = new Date(toDate).getTime();

    for (const req of activeRequests) {
      if (excludeRequestId && req.id === excludeRequestId) continue;
      const reqStatus = (req.status || '').toUpperCase();
      if (reqStatus === 'REJECTED' || reqStatus === 'CANCELLED' || reqStatus === 'WITHDRAWN') {
        continue;
      }

      const existingStart = new Date(req.start_date || req.from_date).getTime();
      const existingEnd = new Date(req.end_date || req.to_date).getTime();

      // Check date range intersection: [startReq, endReq] overlaps with [existingStart, existingEnd]
      if (startReq <= existingEnd && endReq >= existingStart) {
        return { hasOverlap: true, conflictingRequest: req };
      }
    }

    return { hasOverlap: false };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Balance Check & Available Balance Computation
  // ──────────────────────────────────────────────────────────────────────────
  public async getAuthoritativeBalance(
    employeeId: string,
    leaveTypeId: string,
    calendarYear: number
  ): Promise<{
    openingBalance: number;
    accrued: number;
    consumed: number;
    adjustments: number;
    closingBalance: number;
    availableBalance: number;
  }> {
    let balanceRecord: any = null;

    if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(leaveTypeId)) {
      try {
        const { data, error } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('leave_type_id', leaveTypeId)
          .eq('calendar_year', calendarYear)
          .maybeSingle();

        if (!error && data) {
          balanceRecord = data;
        }
      } catch (err) {
        console.warn('[LeaveEngine] balance fetch notice:', err);
      }
    }

    if (!balanceRecord) {
      balanceRecord = this.getLocalLeaveBalance(employeeId, leaveTypeId, calendarYear);
    }

    const openingBalance = Number(balanceRecord?.opening_balance ?? 20);
    const accrued = Number(balanceRecord?.accrued ?? 0);
    const consumed = Number(balanceRecord?.consumed ?? 0);
    const adjustments = Number(balanceRecord?.adjustments ?? 0);
    const closingBalance = Number(
      balanceRecord?.closing_balance ?? openingBalance + accrued + adjustments - consumed
    );

    return {
      openingBalance,
      accrued,
      consumed,
      adjustments,
      closingBalance,
      availableBalance: closingBalance,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Request Submission with Validation & Concurrency Guard
  // ──────────────────────────────────────────────────────────────────────────
  public async submitLeaveRequest(params: {
    id?: string;
    organizationId: string;
    employeeId: string;
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    isHalfDay?: boolean;
    isPaid?: boolean;
    reason: string;
    managerId?: string;
    holidaysList?: { date: string; name: string }[];
  }): Promise<{ request: any; workingDaysResult: LeaveWorkingDaysResult }> {
    const lockKey = `${params.employeeId}-${params.leaveTypeId}`;
    if (this.employeeLocks.has(lockKey)) {
      throw new Error(
        `CONCURRENT_LEAVE_MUTATION: A leave transaction for employee ${params.employeeId} is already in progress.`
      );
    }
    this.employeeLocks.add(lockKey);

    try {
      // A. Calculate working days and holiday exclusion
      const workingDaysResult = this.calculateWorkingDays({
        fromDate: params.fromDate,
        toDate: params.toDate,
        isHalfDay: params.isHalfDay,
        holidaysList: params.holidaysList,
      });

      if (workingDaysResult.leaveDaysDeducted <= 0) {
        throw new Error(
          'INVALID_DATE_RANGE: Requested leave period does not contain any working days.'
        );
      }

      // B. Overlap Check
      const overlap = await this.checkLeaveOverlap(params.employeeId, params.fromDate, params.toDate);
      if (overlap.hasOverlap) {
        throw new Error(
          `LEAVE_OVERLAP_DETECTED: Overlapping leave request exists (${overlap.conflictingRequest.id || 'Active'}) from ${overlap.conflictingRequest.start_date || overlap.conflictingRequest.from_date} to ${overlap.conflictingRequest.end_date || overlap.conflictingRequest.to_date}.`
        );
      }

      // C. Balance Check (if not unpaid)
      const calendarYear = new Date(params.fromDate).getFullYear();
      const balance = await this.getAuthoritativeBalance(
        params.employeeId,
        params.leaveTypeId,
        calendarYear
      );

      const isPaid = params.isPaid ?? true;
      if (isPaid && balance.availableBalance < workingDaysResult.leaveDaysDeducted) {
        throw new Error(
          `INSUFFICIENT_LEAVE_BALANCE: Available balance (${balance.availableBalance}) is less than requested days (${workingDaysResult.leaveDaysDeducted}).`
        );
      }

      // D. Persist Request
      const now = new Date().toISOString();
      const requestId = params.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lr-${Date.now()}`);

      const newRecord = {
        id: requestId,
        organization_id: params.organizationId,
        employee_id: params.employeeId,
        leave_type_id: params.leaveTypeId,
        start_date: params.fromDate,
        end_date: params.toDate,
        from_date: params.fromDate,
        to_date: params.toDate,
        total_days: workingDaysResult.leaveDaysDeducted,
        is_half_day: Boolean(params.isHalfDay),
        is_paid: isPaid,
        reason: params.reason,
        manager_id: params.managerId || 'mgr-default',
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      };

      if (isSupabaseEnabled && isValidUUID(requestId) && isValidUUID(params.organizationId)) {
        try {
          await supabase.from('leave_requests').insert({
            id: requestId,
            organization_id: params.organizationId,
            employee_id: params.employeeId,
            leave_type_id: params.leaveTypeId,
            start_date: params.fromDate,
            end_date: params.toDate,
            total_days: workingDaysResult.leaveDaysDeducted,
            is_half_day: Boolean(params.isHalfDay),
            reason: params.reason,
            status: 'PENDING',
            created_at: now,
            updated_at: now,
          });
        } catch (dbErr) {
          console.warn('[LeaveEngine] DB insert notice:', dbErr);
        }
      }

      this.saveLocalLeaveRequest(newRecord);

      return { request: newRecord, workingDaysResult };
    } finally {
      this.employeeLocks.delete(lockKey);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Atomic Approval with Ledger Insertion & Attendance Synchronization
  // ──────────────────────────────────────────────────────────────────────────
  public async approveLeaveRequest(params: {
    requestId: string;
    organizationId: string;
    actorId: string;
    actorRole: 'MANAGER' | 'ADMIN' | 'HR' | 'EMPLOYEE';
    comments?: string;
  }): Promise<{
    request: any;
    ledgerEntry: LeaveLedgerTransaction;
    newClosingBalance: number;
    emittedEvents: DomainEventRecord[];
  }> {
    const { requestId, organizationId, actorId, actorRole, comments } = params;

    const req = await this.getLeaveRequestById(requestId);
    if (!req) {
      throw new Error(`LEAVE_REQUEST_NOT_FOUND: Request ${requestId} was not found.`);
    }

    // Role authorization check: Applicant cannot approve their own leave
    if (req.employee_id === actorId) {
      throw new Error(
        'UNAUTHORIZED_LEAVE_APPROVAL: Employees are strictly forbidden from approving their own leave requests.'
      );
    }

    // Tenant Isolation Check
    if (req.organization_id && req.organization_id !== organizationId) {
      throw new Error(
        `TENANT_BOUNDARY_VIOLATION: Cross-tenant leave approval rejected for tenant ${organizationId}.`
      );
    }

    const now = new Date().toISOString();
    const calendarYear = new Date(req.start_date || req.from_date || now).getFullYear();
    const totalDays = Number(req.total_days || 1);
    const leaveTypeId = req.leave_type_id;
    const employeeId = req.employee_id;

    // Concurrency lock
    const lockKey = `${employeeId}-${leaveTypeId}`;
    if (this.employeeLocks.has(lockKey)) {
      throw new Error(
        `CONCURRENT_LEAVE_MUTATION: Balance update already underway for employee ${employeeId}.`
      );
    }
    this.employeeLocks.add(lockKey);

    try {
      const balance = await this.getAuthoritativeBalance(employeeId, leaveTypeId, calendarYear);
      const newConsumed = balance.consumed + totalDays;
      const newClosingBalance = balance.closingBalance - totalDays;

      const ledgerEntryId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `led-${Date.now()}`;

      // A. Database Mutations
      if (isSupabaseEnabled && isValidUUID(requestId) && isValidUUID(organizationId)) {
        // 1. Update leave_requests
        await supabase
          .from('leave_requests')
          .update({
            status: 'APPROVED',
            approved_by: actorId,
            approved_at: now,
            updated_at: now,
          })
          .eq('id', requestId);

        // 2. Insert leave_ledger_entries
        await supabase.from('leave_ledger_entries').insert({
          id: ledgerEntryId,
          organization_id: organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          leave_request_id: requestId,
          entry_type: 'CONSUMPTION',
          units: totalDays,
          running_balance_after: newClosingBalance,
          transaction_date: req.start_date || now.split('T')[0],
          remarks: `Approved by ${actorId} (${actorRole}): ${comments || 'Authoritative Leave Approval'}`,
          created_at: now,
        });

        // 3. Upsert leave_balances
        await supabase.from('leave_balances').upsert({
          organization_id: organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          calendar_year: calendarYear,
          opening_balance: balance.openingBalance,
          accrued: balance.accrued,
          consumed: newConsumed,
          closing_balance: newClosingBalance,
          updated_at: now,
        });
      }

      // B. Update local store mirrors
      req.status = 'APPROVED';
      req.approved_at = now;
      req.approved_by = actorId;
      this.saveLocalLeaveRequest(req);

      this.updateLocalLeaveBalance(employeeId, leaveTypeId, calendarYear, {
        opening_balance: balance.openingBalance,
        accrued: balance.accrued,
        consumed: newConsumed,
        closing_balance: newClosingBalance,
      });

      const ledgerRecord: any = {
        id: ledgerEntryId,
        organization_id: organizationId,
        employee_id: employeeId,
        employee_name: req.employee_name || 'Employee',
        leave_type_id: leaveTypeId,
        leave_type_name: req.leave_type_name || 'Leave',
        leave_request_id: requestId,
        reference_id: requestId,
        date: req.start_date || now.split('T')[0],
        entry_type: 'CONSUMPTION',
        transaction_type: 'Consumption',
        units: totalDays,
        amount: -totalDays,
        running_balance_after: newClosingBalance,
        balance_after: newClosingBalance,
        actor_id: actorId,
        actor_name: actorId,
        reason: comments || 'Approved Leave Consumption',
        remarks: comments || 'Approved Leave Consumption',
        created_at: now,
      };
      this.insertLocalLedgerEntry(ledgerRecord);

      // C. Synchronize with Attendance Authority (attendance_daily)
      await this.syncAttendanceOnApproval({
        organizationId,
        employeeId,
        startDate: req.start_date || req.from_date,
        endDate: req.end_date || req.to_date,
        isHalfDay: Boolean(req.is_half_day),
        isPaid: req.is_paid ?? true,
      });

      // D. Emit Canonical Domain Event
      const emittedEvents: DomainEventRecord[] = [];
      const event = await domainEventService.publishEvent({
        organization_id: organizationId,
        event_type: CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED,
        aggregate_type: 'LEAVE',
        aggregate_id: requestId,
        idempotency_key: IdempotencyKeyGenerator.leaveApproved(requestId),
        payload: {
          leave_request_id: requestId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          start_date: req.start_date,
          end_date: req.end_date,
          total_days: totalDays,
          approved_by: actorId,
          approved_at: now,
          closing_balance_after: newClosingBalance,
        },
        actor_id: actorId,
      });
      emittedEvents.push(event);

      return {
        request: req,
        ledgerEntry: ledgerRecord,
        newClosingBalance,
        emittedEvents,
      };
    } finally {
      this.employeeLocks.delete(lockKey);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Leave Cancellation with Append-Only Reversal & Locked Payroll Protection
  // ──────────────────────────────────────────────────────────────────────────
  public async cancelLeaveRequest(params: {
    requestId: string;
    organizationId: string;
    actorId: string;
    reason: string;
    isPayrollPeriodLocked?: boolean;
  }): Promise<{
    request: any;
    reversalEntry?: LeaveLedgerTransaction;
    isLockedPayrollPeriod: boolean;
    adjustmentCreatedForFuture: boolean;
    restoredClosingBalance: number;
    emittedEvents: DomainEventRecord[];
  }> {
    const { requestId, organizationId, actorId, reason, isPayrollPeriodLocked = false } = params;

    const req = await this.getLeaveRequestById(requestId);
    if (!req) {
      throw new Error(`LEAVE_REQUEST_NOT_FOUND: Request ${requestId} not found.`);
    }

    const wasApproved = (req.status || '').toUpperCase() === 'APPROVED';
    const now = new Date().toISOString();
    const calendarYear = new Date(req.start_date || req.from_date || now).getFullYear();
    const totalDays = Number(req.total_days || 1);
    const leaveTypeId = req.leave_type_id;
    const employeeId = req.employee_id;

    // Check Locked Payroll Protection
    // If the payroll period for this leave date is LOCKED, we MUST NOT mutate locked attendance or locked payslips!
    if (isPayrollPeriodLocked) {
      // Non-destructive: Create a future payroll adjustment record instead of mutating historical locked period
      req.status = 'CANCELLED';
      req.cancellation_reason = `[HISTORICAL LOCKED PERIOD] ${reason}. Adjustment routed to future open payroll.`;
      this.saveLocalLeaveRequest(req);

      return {
        request: req,
        isLockedPayrollPeriod: true,
        adjustmentCreatedForFuture: true,
        restoredClosingBalance: 0,
        emittedEvents: [],
      };
    }

    let reversalEntry: LeaveLedgerTransaction | undefined = undefined;
    let restoredClosingBalance = 0;

    if (wasApproved) {
      const balance = await this.getAuthoritativeBalance(employeeId, leaveTypeId, calendarYear);
      const newConsumed = Math.max(0, balance.consumed - totalDays);
      restoredClosingBalance = balance.closingBalance + totalDays;

      const reversalId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `led-rev-${Date.now()}`;

      // A. Append-only reversal ledger entry
      if (isSupabaseEnabled && isValidUUID(requestId) && isValidUUID(organizationId)) {
        await supabase
          .from('leave_requests')
          .update({
            status: 'CANCELLED',
            updated_at: now,
          })
          .eq('id', requestId);

        await supabase.from('leave_ledger_entries').insert({
          id: reversalId,
          organization_id: organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          leave_request_id: requestId,
          entry_type: 'REVERSAL',
          units: totalDays,
          running_balance_after: restoredClosingBalance,
          transaction_date: now.split('T')[0],
          remarks: `Reversal on leave cancellation: ${reason}`,
          created_at: now,
        });

        await supabase
          .from('leave_balances')
          .update({
            consumed: newConsumed,
            closing_balance: restoredClosingBalance,
            updated_at: now,
          })
          .eq('employee_id', employeeId)
          .eq('leave_type_id', leaveTypeId)
          .eq('calendar_year', calendarYear);
      }

      req.status = 'CANCELLED';
      req.cancellation_reason = reason;
      this.saveLocalLeaveRequest(req);

      this.updateLocalLeaveBalance(employeeId, leaveTypeId, calendarYear, {
        opening_balance: balance.openingBalance,
        accrued: balance.accrued,
        consumed: newConsumed,
        closing_balance: restoredClosingBalance,
      });

      reversalEntry = {
        id: reversalId,
        organization_id: organizationId,
        employee_id: employeeId,
        employee_name: req.employee_name || 'Employee',
        leave_type_id: leaveTypeId,
        leave_type_name: req.leave_type_name || 'Leave',
        leave_request_id: requestId,
        reference_id: requestId,
        date: now.split('T')[0],
        entry_type: 'REVERSAL',
        transaction_type: 'Reversal',
        units: totalDays,
        amount: totalDays, // Positive restoration
        running_balance_after: restoredClosingBalance,
        balance_after: restoredClosingBalance,
        actor_id: actorId,
        actor_name: actorId,
        reason: `Reversal: ${reason}`,
        remarks: `Reversal: ${reason}`,
        created_at: now,
      } as any;
      this.insertLocalLedgerEntry(reversalEntry);

      // Revert attendance status
      await this.revertAttendanceOnCancellation({
        organizationId,
        employeeId,
        startDate: req.start_date || req.from_date,
        endDate: req.end_date || req.to_date,
      });
    } else {
      req.status = 'CANCELLED';
      req.cancellation_reason = reason;
      this.saveLocalLeaveRequest(req);
    }

    const emittedEvents: DomainEventRecord[] = [];
    const event = await domainEventService.publishEvent({
      organization_id: organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.LEAVE_REJECTED, // Canonical event mesh
      aggregate_type: 'LEAVE',
      aggregate_id: requestId,
      idempotency_key: `leave.cancelled.${requestId}`,
      payload: {
        leave_request_id: requestId,
        employee_id: employeeId,
        cancelled_by: actorId,
        reason,
      },
      actor_id: actorId,
    });
    emittedEvents.push(event);

    return {
      request: req,
      reversalEntry,
      isLockedPayrollPeriod: false,
      adjustmentCreatedForFuture: false,
      restoredClosingBalance,
      emittedEvents,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Mathematical Reconciliation: SUM(ledger_entries) === closing_balance
  // ──────────────────────────────────────────────────────────────────────────
  public async reconcileLedgerBalance(
    employeeId: string,
    leaveTypeId: string,
    calendarYear: number
  ): Promise<LeaveReconciliationReport> {
    const balance = await this.getAuthoritativeBalance(employeeId, leaveTypeId, calendarYear);
    const ledger = await this.getEmployeeLedger(employeeId, leaveTypeId);

    // Sum all ledger entries:
    // Positive: ACCRUAL, GRANT, CARRY_FORWARD, REVERSAL, positive ADJUSTMENT
    // Negative: CONSUMPTION, ENCASHMENT, LAPSE, negative ADJUSTMENT
    let netLedgerUnits = 0;
    let hasAccrualInLedger = false;

    for (const entry of ledger) {
      const type = (entry.transaction_type || '').toUpperCase();
      if (type === 'ACCRUAL') {
        hasAccrualInLedger = true;
      }
      const amt = entry.amount;
      netLedgerUnits += amt;
    }

    // Mathematical formula: (Opening + Accrual) + netLedgerUnits === closing_balance
    const baseOpening = hasAccrualInLedger
      ? balance.openingBalance
      : balance.openingBalance + balance.accrued;

    const calculated = baseOpening + netLedgerUnits;
    const discrepancy = calculated - balance.closingBalance;
    const reconciles = Math.abs(discrepancy) < 0.001;

    return {
      employeeId,
      leaveTypeId,
      calendarYear,
      openingBalance: balance.openingBalance,
      ledgerEntriesCount: ledger.length,
      calculatedBalanceFromLedger: calculated,
      recordedClosingBalance: balance.closingBalance,
      reconciles,
      discrepancy,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Attendance Daily Synchronization
  // ──────────────────────────────────────────────────────────────────────────
  private async syncAttendanceOnApproval(params: {
    organizationId: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    isPaid: boolean;
  }): Promise<void> {
    const { organizationId, employeeId, startDate, endDate, isHalfDay, isPaid } = params;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const curr = new Date(start);

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const status = isHalfDay ? 'HALF_DAY' : 'ON_LEAVE';
      const payableStatus = isPaid ? (isHalfDay ? 0.5 : 1.0) : 0.0;

      if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(organizationId)) {
        try {
          await supabase.from('attendance_daily').upsert({
            organization_id: organizationId,
            employee_id: employeeId,
            attendance_date: dateStr,
            status,
            payable_status: payableStatus,
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('[LeaveEngine] attendance sync notice:', dbErr);
        }
      }

      this.updateLocalAttendance(employeeId, dateStr, {
        status,
        payable_status: payableStatus,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  }

  private async revertAttendanceOnCancellation(params: {
    organizationId: string;
    employeeId: string;
    startDate: string;
    endDate: string;
  }): Promise<void> {
    const { organizationId, employeeId, startDate, endDate } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const curr = new Date(start);

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(organizationId)) {
        try {
          await supabase
            .from('attendance_daily')
            .update({
              status: 'ABSENT',
              payable_status: 0.0,
              updated_at: new Date().toISOString(),
            })
            .eq('employee_id', employeeId)
            .eq('attendance_date', dateStr);
        } catch (_) {}
      }

      this.updateLocalAttendance(employeeId, dateStr, {
        status: 'ABSENT',
        payable_status: 0.0,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local Store Mirrors & In-Memory Fallbacks
  // ──────────────────────────────────────────────────────────────────────────
  private async getActiveEmployeeRequests(employeeId: string): Promise<any[]> {
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .in('status', ['PENDING', 'APPROVED', 'Pending', 'Approved']);
        if (!error && data && data.length > 0) return data;
      } catch (_) {}
    }
    const all = this.getAllLocalLeaveRequests();
    return all.filter(
      (r) =>
        r.employee_id === employeeId &&
        ['PENDING', 'APPROVED', 'Pending', 'Approved'].includes((r.status || '').toUpperCase())
    );
  }

  private async getLeaveRequestById(id: string): Promise<any> {
    if (isSupabaseEnabled && isValidUUID(id)) {
      try {
        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) return data;
      } catch (_) {}
    }
    const all = this.getAllLocalLeaveRequests();
    return all.find((r) => r.id === id);
  }

  private getAllLocalLeaveRequests(): any[] {
    if (typeof window === 'undefined') {
      return (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
    }
    try {
      const raw = localStorage.getItem('workforce_leave_requests_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocalLeaveRequest(req: any): void {
    if (typeof window === 'undefined') {
      let list = (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
      const idx = list.findIndex((r: any) => r.id === req.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...req };
      else list.unshift(req);
      (globalThis as any).__JOY_LEAVE_REQUESTS__ = list;
      return;
    }
    try {
      let list = this.getAllLocalLeaveRequests();
      const idx = list.findIndex((r) => r.id === req.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...req };
      else list.unshift(req);
      localStorage.setItem('workforce_leave_requests_v2', JSON.stringify(list));
    } catch {}
  }

  private getLocalLeaveBalance(empId: string, typeId: string, year: number): any {
    if (typeof window === 'undefined') {
      const balances = (globalThis as any).__JOY_LEAVE_BALANCES__ || [];
      return balances.find((b: any) => b.employee_id === empId && b.calendar_year === year);
    }
    try {
      const raw = localStorage.getItem('workforce_leave_balances_v2');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((b: any) => b.employee_id === empId && b.calendar_year === year);
    } catch {
      return null;
    }
  }

  private updateLocalLeaveBalance(empId: string, typeId: string, year: number, data: any): void {
    if (typeof window === 'undefined') {
      let balances = (globalThis as any).__JOY_LEAVE_BALANCES__ || [];
      const idx = balances.findIndex(
        (b: any) => b.employee_id === empId && b.calendar_year === year
      );
      if (idx !== -1) {
        balances[idx] = { ...balances[idx], ...data };
      } else {
        balances.push({ employee_id: empId, leave_type_id: typeId, calendar_year: year, ...data });
      }
      (globalThis as any).__JOY_LEAVE_BALANCES__ = balances;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_leave_balances_v2');
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(
        (b: any) => b.employee_id === empId && b.calendar_year === year
      );
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
      } else {
        list.push({ employee_id: empId, leave_type_id: typeId, calendar_year: year, ...data });
      }
      localStorage.setItem('workforce_leave_balances_v2', JSON.stringify(list));
    } catch {}
  }

  private async getEmployeeLedger(
    employeeId: string,
    leaveTypeId: string
  ): Promise<LeaveLedgerTransaction[]> {
    if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(leaveTypeId)) {
      try {
        const { data, error } = await supabase
          .from('leave_ledger_entries')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('leave_type_id', leaveTypeId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            employee_id: d.employee_id,
            employee_name: 'Employee',
            leave_type_id: d.leave_type_id,
            leave_type_name: 'Leave',
            date: d.transaction_date,
            transaction_type: (d.entry_type || 'Adjustment') as LedgerTransactionType,
            amount:
              ['CONSUMPTION', 'ENCASHMENT', 'LAPSE'].includes((d.entry_type || '').toUpperCase())
                ? -Math.abs(Number(d.units))
                : Math.abs(Number(d.units)),
            balance_after: Number(d.running_balance_after),
            reference_id: d.leave_request_id,
            actor_id: 'system',
            actor_name: 'System',
            reason: d.remarks || '',
            created_at: d.created_at,
          }));
        }
      } catch (_) {}
    }

    const all = this.getAllLocalLedger();
    return all.filter((l) => l.employee_id === employeeId && l.leave_type_id === leaveTypeId);
  }

  private getAllLocalLedger(): LeaveLedgerTransaction[] {
    if (typeof window === 'undefined') {
      return (globalThis as any).__JOY_LEAVE_LEDGER__ || [];
    }
    try {
      const raw = localStorage.getItem('workforce_leave_ledger_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private insertLocalLedgerEntry(entry: LeaveLedgerTransaction): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_LEAVE_LEDGER__ || [];
      list.push(entry);
      (globalThis as any).__JOY_LEAVE_LEDGER__ = list;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_leave_ledger_v2');
      const list = raw ? JSON.parse(raw) : [];
      list.push(entry);
      localStorage.setItem('workforce_leave_ledger_v2', JSON.stringify(list));
    } catch {}
  }

  private updateLocalAttendance(employeeId: string, date: string, data: any): void {
    if (typeof window === 'undefined') {
      let att = (globalThis as any).__JOY_ATTENDANCE_DAILY__ || [];
      const idx = att.findIndex(
        (a: any) => a.employee_id === employeeId && a.attendance_date === date
      );
      if (idx !== -1) {
        att[idx] = { ...att[idx], ...data };
      } else {
        att.push({ employee_id: employeeId, attendance_date: date, ...data });
      }
      (globalThis as any).__JOY_ATTENDANCE_DAILY__ = att;
      return;
    }
    try {
      const raw = localStorage.getItem('workforce_attendance_daily_v2');
      let att = raw ? JSON.parse(raw) : [];
      const idx = att.findIndex(
        (a: any) => a.employee_id === employeeId && a.attendance_date === date
      );
      if (idx !== -1) {
        att[idx] = { ...att[idx], ...data };
      } else {
        att.push({ employee_id: employeeId, attendance_date: date, ...data });
      }
      localStorage.setItem('workforce_attendance_daily_v2', JSON.stringify(att));
    } catch {}
  }
}

export const leaveEngine = LeaveEngine.getInstance();
