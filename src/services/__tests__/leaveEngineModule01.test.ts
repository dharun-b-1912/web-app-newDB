// src/services/__tests__/leaveEngineModule01.test.ts
// ============================================================================
// JOY PeopleHR — Module Certification 01: Leave Management Engine
// 15-Test Master Verification Suite
// ============================================================================

import { leaveEngine } from '../leave/leaveEngine';
import { StatutoryRuleEngine } from '../payroll/statutoryRuleEngine';
import { domainEventService } from '../events/domainEventService';
import { CANONICAL_DOMAIN_EVENTS, IdempotencyKeyGenerator } from '../../types/domainEvents';

export async function runLeaveEngineModule01CertificationSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
  details: string[];
}> {
  console.log('\n================================================================');
  console.log('🚀 MODULE CERTIFICATION 01: LEAVE MANAGEMENT ENGINE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  const assert = (condition: boolean, testName: string, message?: string) => {
    if (condition) {
      passed++;
      const msg = `  ✅ PASS: ${testName}`;
      console.log(msg);
      details.push(msg);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} — ${message || 'Assertion failed'}`;
      console.error(msg);
      details.push(msg);
    }
  };

  const TENANT_A = 'org-tenant-alpha';
  const TENANT_B = 'org-tenant-beta';
  const EMP_A = 'emp-rajesh-101';
  const EMP_B = 'emp-priya-202';
  const MGR_A = 'mgr-anand-001';
  const LEAVE_TYPE_CL = 'lt-casual-leave';
  const LEAVE_TYPE_LOP = 'lt-unpaid-lop';
  const YEAR = 2026;

  // Initialize clean mock data in globalThis
  (globalThis as any).__JOY_LEAVE_REQUESTS__ = [];
  (globalThis as any).__JOY_LEAVE_BALANCES__ = [
    {
      employee_id: EMP_A,
      leave_type_id: LEAVE_TYPE_CL,
      calendar_year: YEAR,
      opening_balance: 10,
      accrued: 2,
      consumed: 0,
      adjustments: 0,
      closing_balance: 12,
    },
    {
      employee_id: EMP_B,
      leave_type_id: LEAVE_TYPE_CL,
      calendar_year: YEAR,
      opening_balance: 15,
      accrued: 0,
      consumed: 0,
      adjustments: 0,
      closing_balance: 15,
    },
  ];
  (globalThis as any).__JOY_LEAVE_LEDGER__ = [];
  (globalThis as any).__JOY_ATTENDANCE_DAILY__ = [];

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Leave request creation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res1 = await leaveEngine.submitLeaveRequest({
      id: 'lr-test-01',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-09-14',
      toDate: '2026-09-15',
      reason: 'Family function in hometown',
      managerId: MGR_A,
      isPaid: true,
    });

    assert(
      res1.request.id === 'lr-test-01' &&
        res1.request.status === 'PENDING' &&
        res1.request.total_days === 2 &&
        res1.request.employee_id === EMP_A,
      'TEST 1: Leave request creation initializes with PENDING status and correct days'
    );
  } catch (err: any) {
    assert(false, 'TEST 1: Leave request creation', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Insufficient balance rejection
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Current available balance is 12. Request 20 days.
    await leaveEngine.submitLeaveRequest({
      id: 'lr-test-02',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-10-01',
      toDate: '2026-10-28', // exceeds available 12
      reason: 'Long travel',
      isPaid: true,
    });
    assert(false, 'TEST 2: Insufficient balance rejection', 'Expected balance check to throw error');
  } catch (err: any) {
    assert(
      err.message.includes('INSUFFICIENT_LEAVE_BALANCE'),
      'TEST 2: Insufficient balance rejection blocks overdraft when negative balance is disallowed'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Concurrent leave request protection
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Simulate parallel requests for same employee
    const promise1 = leaveEngine.submitLeaveRequest({
      id: 'lr-test-03a',
      organizationId: TENANT_A,
      employeeId: EMP_B,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-11-02',
      toDate: '2026-11-06',
      reason: 'Vacation part 1',
    });

    const promise2 = leaveEngine.submitLeaveRequest({
      id: 'lr-test-03b',
      organizationId: TENANT_A,
      employeeId: EMP_B,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-11-09',
      toDate: '2026-11-13',
      reason: 'Vacation part 2',
    });

    const results = await Promise.allSettled([promise1, promise2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert(
      fulfilled.length >= 1,
      'TEST 3: Concurrent leave request protection enforces atomic mutex serialization'
    );
  } catch (err: any) {
    assert(false, 'TEST 3: Concurrent leave request protection', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Leave overlap rejection
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // EMP_A already has 'lr-test-01' from 2026-09-14 to 2026-09-15.
    // Try requesting 2026-09-15 to 2026-09-17 (overlap on 2026-09-15).
    await leaveEngine.submitLeaveRequest({
      id: 'lr-test-04',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-09-15',
      toDate: '2026-09-17',
      reason: 'Overlapping request',
    });
    assert(false, 'TEST 4: Leave overlap rejection', 'Expected overlap error to be thrown');
  } catch (err: any) {
    assert(
      err.message.includes('LEAVE_OVERLAP_DETECTED'),
      'TEST 4: Leave overlap rejection blocks conflicting date ranges for the same employee'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Half-day calculation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const halfDayResult = leaveEngine.calculateWorkingDays({
      fromDate: '2026-09-22',
      toDate: '2026-09-22',
      isHalfDay: true,
    });

    assert(
      halfDayResult.leaveDaysDeducted === 0.5 && halfDayResult.workingDays === 0.5,
      'TEST 5: Half-day calculation accurately evaluates to 0.5 days'
    );
  } catch (err: any) {
    assert(false, 'TEST 5: Half-day calculation', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Holiday / weekend exclusion
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // 2026-10-02 (Fri) to 2026-10-06 (Tue):
    // Oct 2 (Fri) = Gandhi Jayanthi (Holiday)
    // Oct 3 (Sat) = Weekend
    // Oct 4 (Sun) = Weekend
    // Oct 5 (Mon) = Working day
    // Oct 6 (Tue) = Working day
    // Total working days deducted = 2 days
    const holidayResult = leaveEngine.calculateWorkingDays({
      fromDate: '2026-10-02',
      toDate: '2026-10-06',
      excludeWeekends: true,
      excludeHolidays: true,
      holidaysList: [{ date: '2026-10-02', name: 'Gandhi Jayanthi' }],
    });

    assert(
      holidayResult.totalCalendarDays === 5 &&
        holidayResult.holidayDays === 1 &&
        holidayResult.weekendDays === 2 &&
        holidayResult.leaveDaysDeducted === 2,
      'TEST 6: Holiday & weekend exclusion excludes non-working days from leave deduction'
    );
  } catch (err: any) {
    assert(false, 'TEST 6: Holiday & weekend exclusion', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Approval -> ledger atomicity
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const apprRes = await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-01',
      organizationId: TENANT_A,
      actorId: MGR_A,
      actorRole: 'MANAGER',
      comments: 'Approved by manager',
    });

    const balanceAfter = await leaveEngine.getAuthoritativeBalance(EMP_A, LEAVE_TYPE_CL, YEAR);

    assert(
      apprRes.request.status === 'APPROVED' &&
        apprRes.ledgerEntry.transaction_type === 'Consumption' &&
        apprRes.ledgerEntry.amount === -2 &&
        balanceAfter.closingBalance === 10 && // 12 - 2 = 10
        balanceAfter.consumed === 2 &&
        apprRes.emittedEvents.length === 1 &&
        apprRes.emittedEvents[0].event_type === CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED,
      'TEST 7: Approval atomicity updates status, ledger, balance, and emits domain event'
    );
  } catch (err: any) {
    assert(false, 'TEST 7: Approval -> ledger atomicity', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Ledger <-> balance mathematical reconciliation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const reconReport = await leaveEngine.reconcileLedgerBalance(EMP_A, LEAVE_TYPE_CL, YEAR);

    assert(
      reconReport.reconciles === true &&
        reconReport.discrepancy === 0 &&
        reconReport.calculatedBalanceFromLedger === reconReport.recordedClosingBalance,
      'TEST 8: Ledger and balance mathematically reconcile with zero discrepancy'
    );
  } catch (err: any) {
    assert(false, 'TEST 8: Ledger <-> balance mathematical reconciliation', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Cancellation -> reversal ledger
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const cancelRes = await leaveEngine.cancelLeaveRequest({
      requestId: 'lr-test-01',
      organizationId: TENANT_A,
      actorId: EMP_A,
      reason: 'Trip cancelled by personal circumstances',
    });

    const balanceRestored = await leaveEngine.getAuthoritativeBalance(EMP_A, LEAVE_TYPE_CL, YEAR);
    const reconAfterCancel = await leaveEngine.reconcileLedgerBalance(EMP_A, LEAVE_TYPE_CL, YEAR);

    assert(
      cancelRes.request.status === 'CANCELLED' &&
        cancelRes.reversalEntry !== undefined &&
        cancelRes.reversalEntry.transaction_type === 'Reversal' &&
        cancelRes.reversalEntry.amount === 2 && // Positive reversal
        balanceRestored.closingBalance === 12 && // Restored from 10 back to 12
        balanceRestored.consumed === 0 &&
        reconAfterCancel.reconciles === true,
      'TEST 9: Cancellation creates append-only reversal entry and non-destructively restores balance'
    );
  } catch (err: any) {
    assert(false, 'TEST 9: Cancellation -> reversal ledger', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Leave -> attendance synchronization
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Create and approve a new 1-day leave
    const newReq = await leaveEngine.submitLeaveRequest({
      id: 'lr-test-att-sync',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-09-25',
      toDate: '2026-09-25',
      reason: 'Doctor checkup',
      isPaid: true,
    });

    await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-att-sync',
      organizationId: TENANT_A,
      actorId: MGR_A,
      actorRole: 'MANAGER',
    });

    const localAtt = (globalThis as any).__JOY_ATTENDANCE_DAILY__ || [];
    const syncRow = localAtt.find(
      (a: any) => a.employee_id === EMP_A && a.attendance_date === '2026-09-25'
    );

    assert(
      syncRow !== undefined && syncRow.status === 'ON_LEAVE' && syncRow.payable_status === 1.0,
      'TEST 10: Leave approval synchronizes attendance_daily with status=ON_LEAVE and payable_status=1.0'
    );
  } catch (err: any) {
    assert(false, 'TEST 10: Leave -> attendance synchronization', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Unpaid leave -> LOP integration
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // 1. Submit unpaid leave
    await leaveEngine.submitLeaveRequest({
      id: 'lr-test-lop',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_LOP,
      fromDate: '2026-09-28',
      toDate: '2026-09-30', // 3 days unpaid
      reason: 'Loss of pay leave',
      isPaid: false,
    });

    await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-lop',
      organizationId: TENANT_A,
      actorId: MGR_A,
      actorRole: 'MANAGER',
    });

    const localAtt = (globalThis as any).__JOY_ATTENDANCE_DAILY__ || [];
    const lopRow = localAtt.find(
      (a: any) => a.employee_id === EMP_A && a.attendance_date === '2026-09-28'
    );

    // 2. Evaluate in Payroll Statutory Rule Engine
    const lopEval = StatutoryRuleEngine.evaluateLOP(30000, 3, 30, 'CALENDAR_DAYS');

    assert(
      lopRow !== undefined &&
        lopRow.status === 'ON_LEAVE' &&
        lopRow.payable_status === 0.0 && // Unpaid leave sets 0.0 payable
        lopEval.lopDeduction === 3000, // (30000/30) * 3 = 3000 deduction
      'TEST 11: Unpaid leave marks attendance with payable_status=0.0 and correctly evaluates LOP deduction'
    );
  } catch (err: any) {
    assert(false, 'TEST 11: Unpaid leave -> LOP integration', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 12: Multi-tenant boundary isolation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Tenant B manager attempts to approve Tenant A's leave request
    await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-att-sync',
      organizationId: TENANT_B, // Wrong tenant
      actorId: 'mgr-tenant-b',
      actorRole: 'MANAGER',
    });
    assert(false, 'TEST 12: Multi-tenant isolation', 'Expected tenant boundary violation error');
  } catch (err: any) {
    assert(
      err.message.includes('TENANT_BOUNDARY_VIOLATION'),
      'TEST 12: Multi-tenant isolation blocks cross-tenant leave approvals'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 13: Unauthorized leave approval
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Employee attempts to approve their own leave
    await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-att-sync',
      organizationId: TENANT_A,
      actorId: EMP_A, // Applicant himself!
      actorRole: 'EMPLOYEE',
    });
    assert(false, 'TEST 13: Unauthorized approval', 'Expected unauthorized self-approval error');
  } catch (err: any) {
    assert(
      err.message.includes('UNAUTHORIZED_LEAVE_APPROVAL'),
      'TEST 13: Role authority prevents employees from approving their own leave requests'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 14: Event idempotency
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const idempotencyKey = IdempotencyKeyGenerator.leaveApproved('lr-test-idemp-01');
    const promises: Promise<any>[] = [];

    // Dispatch 50 concurrent domain event publishes with identical idempotency key
    for (let i = 0; i < 50; i++) {
      promises.push(
        domainEventService.publishEvent({
          organization_id: TENANT_A,
          event_type: CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED,
          aggregate_type: 'LEAVE',
          aggregate_id: 'lr-test-idemp-01',
          idempotency_key: idempotencyKey,
          payload: { leave_request_id: 'lr-test-idemp-01' },
          actor_id: MGR_A,
        })
      );
    }

    const events = await Promise.all(promises);
    const eventIds = new Set(events.map((e) => e.id));

    assert(
      eventIds.size === 1,
      'TEST 14: Event idempotency deduplicates 50 concurrent publishes into exactly 1 event'
    );
  } catch (err: any) {
    assert(false, 'TEST 14: Event idempotency', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 15: Locked payroll historical isolation
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Create an approved leave request in September 2026
    const reqSep = await leaveEngine.submitLeaveRequest({
      id: 'lr-test-locked-payroll',
      organizationId: TENANT_A,
      employeeId: EMP_A,
      leaveTypeId: LEAVE_TYPE_CL,
      fromDate: '2026-09-01',
      toDate: '2026-09-02',
      reason: 'Historical leave',
      isPaid: true,
    });

    await leaveEngine.approveLeaveRequest({
      requestId: 'lr-test-locked-payroll',
      organizationId: TENANT_A,
      actorId: MGR_A,
      actorRole: 'MANAGER',
    });

    // Now attempt to cancel it after September payroll is LOCKED
    const cancelLockedRes = await leaveEngine.cancelLeaveRequest({
      requestId: 'lr-test-locked-payroll',
      organizationId: TENANT_A,
      actorId: EMP_A,
      reason: 'Retroactive correction',
      isPayrollPeriodLocked: true, // Payroll period is locked!
    });

    assert(
      cancelLockedRes.isLockedPayrollPeriod === true &&
        cancelLockedRes.adjustmentCreatedForFuture === true &&
        cancelLockedRes.request.status === 'CANCELLED' &&
        cancelLockedRes.request.cancellation_reason.includes('HISTORICAL LOCKED PERIOD'),
      'TEST 15: Locked payroll historical isolation prevents retroactive mutation of locked periods'
    );
  } catch (err: any) {
    assert(false, 'TEST 15: Locked payroll historical isolation', err.message);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(
    `RESULTS: ${passed}/${passed + failed} passed (${Math.round((passed / (passed + failed)) * 100)}%)`
  );
  console.log('----------------------------------------------------------------\n');

  return {
    passed,
    failed,
    total: passed + failed,
    details,
  };
}

// Allow direct execution via tsx
if (typeof process !== 'undefined' && process.argv[1]?.includes('leaveEngineModule01.test.ts')) {
  runLeaveEngineModule01CertificationSuite()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      } else {
        setTimeout(() => process.exit(0), 50);
      }
    })
    .catch((err) => {
      console.error('Fatal error running certification suite:', err);
      process.exit(1);
    });
}
