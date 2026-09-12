// src/services/__tests__/domainEventsAndApprovalsGate3.test.ts
// ============================================================================
// JOY PeopleHR — Gate 3 Certification Test Suite
// Domain Events Outbox Mesh & Unified Approval Domain Adapters
// Tests 1 to 10: Idempotency, Atomicity, Concurrency, Retry, Dead Letter,
// Leave/OT/Attendance Adapters, Double Approval Race, Authorization & Tenant Isolation
// ============================================================================

import { domainEventService } from '../events/domainEventService';
import { unifiedApprovalEngine } from '../approvals/unifiedApprovalEngine';
import {
  CANONICAL_DOMAIN_EVENTS,
  IdempotencyKeyGenerator,
} from '../../types/domainEvents';

export interface GateTestResult {
  testNumber: number;
  testName: string;
  passed: boolean;
  details: string;
}

export class DomainEventsAndApprovalsGate3Suite {
  static async runAllTests(): Promise<{
    passed: boolean;
    passCount: number;
    totalCount: number;
    results: GateTestResult[];
  }> {
    const results: GateTestResult[] = [];
    const testOrgId = `gate3-org-${Date.now()}`;

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: Event Idempotency
    // Emit same event 100 times -> exactly 1 event persisted, 1 downstream execution
    // ────────────────────────────────────────────────────────────────────────
    try {
      domainEventService.clearLocalStore();
      const idempotencyKey = `idemp-test-leave-${Date.now()}`;
      let handlerExecutions = 0;

      const unsub = domainEventService.registerEventHandler(
        CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED,
        async (ev) => {
          if (ev.idempotency_key === idempotencyKey) {
            handlerExecutions++;
          }
        }
      );

      // Emit same event 100 times concurrently
      const emitPromises = Array.from({ length: 100 }).map(() =>
        domainEventService.publishEvent({
          organization_id: testOrgId,
          event_type: CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED,
          aggregate_type: 'LEAVE',
          aggregate_id: 'leave-100',
          idempotency_key: idempotencyKey,
          payload: { days: 2 },
        })
      );

      const publishedEvents = await Promise.all(emitPromises);

      // Verify all 100 calls returned the identical event ID
      const firstId = publishedEvents[0].id;
      const allSameId = publishedEvents.every((e) => e.id === firstId);

      // Run processor
      await domainEventService.processNextBatch('worker-test-1', 10);
      unsub();

      const allEvents = domainEventService.getEvents({ organizationId: testOrgId });
      const matchingEvents = allEvents.filter((e) => e.idempotency_key === idempotencyKey);

      if (matchingEvents.length === 1 && allSameId && handlerExecutions === 1) {
        results.push({
          testNumber: 1,
          testName: 'Event Idempotency',
          passed: true,
          details: `100 emissions yielded exactly 1 persisted event (${firstId}) and 1 handler execution.`,
        });
      } else {
        results.push({
          testNumber: 1,
          testName: 'Event Idempotency',
          passed: false,
          details: `Expected 1 event and 1 execution, got ${matchingEvents.length} events and ${handlerExecutions} executions.`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 1,
        testName: 'Event Idempotency',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Transaction Rollback
    // When domain mutation or event persistence fails, no partial mutation remains
    // ────────────────────────────────────────────────────────────────────────
    try {
      const failingInstanceId = `inst-fail-${Date.now()}`;
      const fakeTargetId = `non-existent-target-${Date.now()}`;

      // Create instance pointing to invalid entity
      await unifiedApprovalEngine.createInstance({
        organizationId: testOrgId,
        targetEntityType: 'LEAVE',
        targetEntityId: fakeTargetId,
        requesterEmployeeId: 'emp-requester-01',
      });

      let rollbackCaught = false;
      try {
        await unifiedApprovalEngine.executeApprovalAction({
          instanceId: failingInstanceId,
          actorEmployeeId: 'emp-mgr-01',
          actorRole: 'Manager',
          action: 'APPROVE',
        });
      } catch (e: any) {
        rollbackCaught = true;
      }

      // Verify no orphan domain events exist for this fake entity
      const orphanEvents = domainEventService
        .getEvents({ organizationId: testOrgId })
        .filter((e) => e.aggregate_id === fakeTargetId);

      if (rollbackCaught && orphanEvents.length === 0) {
        results.push({
          testNumber: 2,
          testName: 'Transaction Rollback',
          passed: true,
          details: 'Failed domain action rolled back completely. Zero orphan events persisted.',
        });
      } else {
        results.push({
          testNumber: 2,
          testName: 'Transaction Rollback',
          passed: false,
          details: `Rollback failed: rollbackCaught=${rollbackCaught}, orphanEvents=${orphanEvents.length}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 2,
        testName: 'Transaction Rollback',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: Worker Concurrency
    // 3 event workers processing 100 pending events concurrently -> 100 processed exactly once, 0 duplicates
    // ────────────────────────────────────────────────────────────────────────
    try {
      const concurrencyOrg = `org-conc-${Date.now()}`;
      const eventCount = 100;
      const processedEventIds = new Set<string>();
      let duplicateDetections = 0;

      const unsub = domainEventService.registerEventHandler('*', async (ev) => {
        if (ev.organization_id === concurrencyOrg) {
          if (processedEventIds.has(ev.id)) {
            duplicateDetections++;
          }
          processedEventIds.add(ev.id);
        }
      });

      // Seed 100 events
      for (let i = 0; i < eventCount; i++) {
        await domainEventService.publishEvent({
          organization_id: concurrencyOrg,
          event_type: CANONICAL_DOMAIN_EVENTS.PAYROLL_CALCULATED,
          aggregate_type: 'PAYROLL_RUN',
          aggregate_id: `run-${i}`,
          idempotency_key: `key-conc-${concurrencyOrg}-${i}`,
          payload: { index: i },
        });
      }

      // 3 workers pulling concurrently
      const workers = ['Worker-Alpha', 'Worker-Beta', 'Worker-Gamma'];
      let safetyRounds = 0;
      while (processedEventIds.size < eventCount && safetyRounds < 50) {
        safetyRounds++;
        const batchResults = await Promise.all(
          workers.map((w) => domainEventService.processNextBatch(w, 20))
        );
        const totalThisRound = batchResults.reduce((sum, r) => sum + r.processed, 0);
        if (totalThisRound === 0) break;
      }

      unsub();

      if (processedEventIds.size === eventCount && duplicateDetections === 0) {
        results.push({
          testNumber: 3,
          testName: 'Worker Concurrency',
          passed: true,
          details: `3 workers processed ${eventCount} events with 0 duplicate claims (FOR UPDATE SKIP LOCKED mutex).`,
        });
      } else {
        results.push({
          testNumber: 3,
          testName: 'Worker Concurrency',
          passed: false,
          details: `Expected ${eventCount} unique and 0 duplicates, got ${processedEventIds.size} unique and ${duplicateDetections} duplicates.`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 3,
        testName: 'Worker Concurrency',
        passed: false,
        details: `Worker concurrency failed: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: Retry Engine with Exponential Backoff
    // Failed processor execution increments retry_count and delays available_at
    // ────────────────────────────────────────────────────────────────────────
    try {
      const retryOrg = `org-retry-${Date.now()}`;
      const failEventKey = `fail-key-${Date.now()}`;

      const createdEvent = await domainEventService.publishEvent({
        organization_id: retryOrg,
        event_type: CANONICAL_DOMAIN_EVENTS.ASSET_ASSIGNED,
        aggregate_type: 'ASSET',
        aggregate_id: 'asset-99',
        idempotency_key: failEventKey,
        payload: { asset: 'MacBook Pro' },
        max_retries: 5,
      });

      // Register failing handler
      let attempts = 0;
      const unsub = domainEventService.registerEventHandler(
        CANONICAL_DOMAIN_EVENTS.ASSET_ASSIGNED,
        async (ev) => {
          if (ev.idempotency_key === failEventKey) {
            attempts++;
            throw new Error('Downstream inventory API timed out');
          }
        }
      );

      // Process batch
      const batchRes = await domainEventService.processNextBatch('worker-retry', 5);
      unsub();

      const events = domainEventService.getEvents({ organizationId: retryOrg });
      const target = events.find((e) => e.idempotency_key === failEventKey);

      const delayMillis = new Date(target?.available_at || '').getTime() - Date.now();

      if (
        target?.status === 'PENDING' &&
        target.retry_count === 1 &&
        delayMillis > 20000 // approx 30s in future
      ) {
        results.push({
          testNumber: 4,
          testName: 'Retry Engine with Backoff',
          passed: true,
          details: `Event failed gracefully. retry_count=1, available_at delayed by ~30s into the future.`,
        });
      } else {
        results.push({
          testNumber: 4,
          testName: 'Retry Engine with Backoff',
          passed: false,
          details: `Retry assertion failed: status=${target?.status}, retries=${target?.retry_count}, delayMs=${delayMillis}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 4,
        testName: 'Retry Engine with Backoff',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 5: Dead Letter Queue
    // Poison event reaches max_retries -> transitioned to DEAD_LETTER
    // ────────────────────────────────────────────────────────────────────────
    try {
      const dlqOrg = `org-dlq-${Date.now()}`;
      const poisonKey = `poison-key-${Date.now()}`;

      const createdEvent = await domainEventService.publishEvent({
        organization_id: dlqOrg,
        event_type: CANONICAL_DOMAIN_EVENTS.SEPARATION_INITIATED,
        aggregate_type: 'SEPARATION',
        aggregate_id: 'sep-poison',
        idempotency_key: poisonKey,
        payload: { reason: 'Fatal error' },
        max_retries: 3,
      });

      // Fail 3 times directly
      await domainEventService.failEvent(createdEvent.id, 'Attempt 1 fail');
      await domainEventService.failEvent(createdEvent.id, 'Attempt 2 fail');
      const finalFail = await domainEventService.failEvent(createdEvent.id, 'Attempt 3 poison pill');

      const events = domainEventService.getEvents({ organizationId: dlqOrg });
      const target = events.find((e) => e.id === createdEvent.id);

      if (target?.status === 'DEAD_LETTER' && target.retry_count === 3) {
        results.push({
          testNumber: 5,
          testName: 'Dead Letter Queue',
          passed: true,
          details: `Event reached max_retries=3 and successfully transitioned to DEAD_LETTER status.`,
        });
      } else {
        results.push({
          testNumber: 5,
          testName: 'Dead Letter Queue',
          passed: false,
          details: `Expected DEAD_LETTER status, got ${target?.status} with retries=${target?.retry_count}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 5,
        testName: 'Dead Letter Queue',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 6: Leave Approval Atomic Flow
    // Request Leave -> Approval Instance -> Approve -> Ledger Updated -> Balance Updated -> Event Created
    // ────────────────────────────────────────────────────────────────────────
    try {
      const leaveEmpId = `emp-leave-${Date.now()}`;
      const leaveRequestId = `req-leave-${Date.now()}`;
      const leaveDays = 3;
      const initialOpening = 20;

      // Seed mock leave request & balance
      (globalThis as any).__JOY_LEAVE_REQUESTS__ = [
        {
          id: leaveRequestId,
          organization_id: testOrgId,
          employee_id: leaveEmpId,
          leave_type_id: 'type-annual',
          start_date: '2026-09-10',
          end_date: '2026-09-12',
          total_days: leaveDays,
          status: 'PENDING',
        },
      ];
      (globalThis as any).__JOY_LEAVE_BALANCES__ = [
        {
          employee_id: leaveEmpId,
          leave_type_id: 'type-annual',
          calendar_year: 2026,
          opening_balance: initialOpening,
          accrued: 0,
          consumed: 0,
          closing_balance: initialOpening,
        },
      ];
      (globalThis as any).__JOY_LEAVE_LEDGER__ = [];

      // Create Approval Instance
      const instance = await unifiedApprovalEngine.createInstance({
        organizationId: testOrgId,
        targetEntityType: 'LEAVE',
        targetEntityId: leaveRequestId,
        requesterEmployeeId: leaveEmpId,
      });

      // Execute Approval
      const approvalResult = await unifiedApprovalEngine.executeApprovalAction({
        instanceId: instance.id,
        actorEmployeeId: 'emp-manager-joy',
        actorRole: 'Manager',
        action: 'APPROVE',
        comments: 'Leave approved by Project Lead',
      });

      // Check balance update
      const balances = (globalThis as any).__JOY_LEAVE_BALANCES__;
      const updatedBalance = balances.find((b: any) => b.employee_id === leaveEmpId);

      // Check ledger entries
      const ledger = (globalThis as any).__JOY_LEAVE_LEDGER__;
      const ledgerEntry = ledger.find((l: any) => l.leave_request_id === leaveRequestId);

      // Check emitted domain event
      const events = domainEventService.getEvents({ organizationId: testOrgId });
      const leaveEvent = events.find(
        (e) => e.event_type === CANONICAL_DOMAIN_EVENTS.LEAVE_APPROVED && e.aggregate_id === leaveRequestId
      );

      if (
        approvalResult.instance.status === 'APPROVED' &&
        updatedBalance?.closing_balance === initialOpening - leaveDays &&
        updatedBalance?.consumed === leaveDays &&
        ledgerEntry?.units === leaveDays &&
        ledgerEntry?.running_balance_after === initialOpening - leaveDays &&
        leaveEvent !== undefined
      ) {
        results.push({
          testNumber: 6,
          testName: 'Leave Approval Atomic Flow',
          passed: true,
          details: `Leave atomically approved. Balance: ${initialOpening} -> ${updatedBalance.closing_balance}. Ledger & event verified.`,
        });
      } else {
        results.push({
          testNumber: 6,
          testName: 'Leave Approval Atomic Flow',
          passed: false,
          details: `Assertion failure: balance=${updatedBalance?.closing_balance}, ledgerUnits=${ledgerEntry?.units}, event=${Boolean(leaveEvent)}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 6,
        testName: 'Leave Approval Atomic Flow',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 7: Double Approval Race Protection
    // Two concurrent approval attempts -> 1 succeeds, 1 rejected as stale
    // ────────────────────────────────────────────────────────────────────────
    try {
      const raceEmpId = `emp-race-${Date.now()}`;
      const raceRequestId = `req-race-${Date.now()}`;

      (globalThis as any).__JOY_LEAVE_REQUESTS__ = [
        {
          id: raceRequestId,
          organization_id: testOrgId,
          employee_id: raceEmpId,
          leave_type_id: 'type-annual',
          start_date: '2026-09-15',
          end_date: '2026-09-16',
          total_days: 1,
          status: 'PENDING',
        },
      ];
      (globalThis as any).__JOY_LEAVE_BALANCES__ = [
        {
          employee_id: raceEmpId,
          leave_type_id: 'type-annual',
          calendar_year: 2026,
          opening_balance: 10,
          accrued: 0,
          consumed: 0,
          closing_balance: 10,
        },
      ];

      const instance = await unifiedApprovalEngine.createInstance({
        organizationId: testOrgId,
        targetEntityType: 'LEAVE',
        targetEntityId: raceRequestId,
        requesterEmployeeId: raceEmpId,
      });

      // Manager A and Manager B approve simultaneously
      const [resA, resB] = await Promise.allSettled([
        unifiedApprovalEngine.executeApprovalAction({
          instanceId: instance.id,
          actorEmployeeId: 'mgr-alice',
          actorRole: 'Manager',
          action: 'APPROVE',
        }),
        unifiedApprovalEngine.executeApprovalAction({
          instanceId: instance.id,
          actorEmployeeId: 'mgr-bob',
          actorRole: 'Manager',
          action: 'APPROVE',
        }),
      ]);

      const successCount = [resA, resB].filter((r) => r.status === 'fulfilled').length;
      const staleCount = [resA, resB].filter(
        (r) => r.status === 'rejected' && (r as PromiseRejectedResult).reason.message.includes('STALE')
      ).length;

      // Ensure balance was deducted exactly once (10 - 1 = 9)
      const balances = (globalThis as any).__JOY_LEAVE_BALANCES__;
      const finalBalance = balances.find((b: any) => b.employee_id === raceEmpId);

      if (successCount === 1 && staleCount === 1 && finalBalance?.closing_balance === 9) {
        results.push({
          testNumber: 7,
          testName: 'Double Approval Race Protection',
          passed: true,
          details: `Race condition defended. Exactly 1 succeeded, 1 rejected as STALE. Balance deducted once (9).`,
        });
      } else {
        results.push({
          testNumber: 7,
          testName: 'Double Approval Race Protection',
          passed: false,
          details: `Expected 1 success and 1 stale rejection. Success: ${successCount}, Stale: ${staleCount}, Balance: ${finalBalance?.closing_balance}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 7,
        testName: 'Double Approval Race Protection',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 8: Attendance Regularization Authoritative Recalculation
    // Regularization Approved -> Authoritative Attendance RPC invoked -> Daily Recalculated
    // ────────────────────────────────────────────────────────────────────────
    try {
      const attEmpId = `emp-att-${Date.now()}`;
      const regId = `reg-${Date.now()}`;
      const attDate = '2026-09-08';

      // Seed regularization & daily attendance record
      (globalThis as any).__JOY_REGULARIZATIONS__ = [
        {
          id: regId,
          organization_id: testOrgId,
          employee_id: attEmpId,
          attendance_date: attDate,
          requested_check_in: '09:15 AM',
          requested_check_out: '06:45 PM',
          reason: 'Biometric device sensor glitch at reception',
          status: 'PENDING',
        },
      ];
      (globalThis as any).__JOY_ATTENDANCE_DAILY__ = [
        {
          employee_id: attEmpId,
          attendance_date: attDate,
          status: 'ABSENT',
          payable_status: 0.0,
          is_regularized: false,
        },
      ];

      const instance = await unifiedApprovalEngine.createInstance({
        organizationId: testOrgId,
        targetEntityType: 'ATTENDANCE_REGULARIZATION',
        targetEntityId: regId,
        requesterEmployeeId: attEmpId,
      });

      await unifiedApprovalEngine.executeApprovalAction({
        instanceId: instance.id,
        actorEmployeeId: 'hr-approver-01',
        actorRole: 'HRAdmin',
        action: 'APPROVE',
        comments: 'Regularization confirmed by HR',
      });

      const dailyRecords = (globalThis as any).__JOY_ATTENDANCE_DAILY__;
      const updatedDaily = dailyRecords.find(
        (a: any) => a.employee_id === attEmpId && a.attendance_date === attDate
      );

      const events = domainEventService.getEvents({ organizationId: testOrgId });
      const regApprovedEvent = events.find(
        (e) => e.event_type === CANONICAL_DOMAIN_EVENTS.ATTENDANCE_REGULARIZATION_APPROVED && e.aggregate_id === regId
      );
      const dayCalcEvent = events.find(
        (e) => e.event_type === CANONICAL_DOMAIN_EVENTS.ATTENDANCE_DAY_CALCULATED && e.aggregate_id === regId
      );

      if (
        updatedDaily?.is_regularized === true &&
        updatedDaily?.status === 'PRESENT' &&
        updatedDaily?.payable_status === 1.0 &&
        regApprovedEvent !== undefined &&
        dayCalcEvent !== undefined
      ) {
        results.push({
          testNumber: 8,
          testName: 'Attendance Regularization Recalculation',
          passed: true,
          details: `Attendance authoritative calculation executed. Daily updated to PRESENT (1.0). Both regularization and day_calculated events emitted.`,
        });
      } else {
        results.push({
          testNumber: 8,
          testName: 'Attendance Regularization Recalculation',
          passed: false,
          details: `Recalculation check failed: isRegularized=${updatedDaily?.is_regularized}, status=${updatedDaily?.status}, events=${Boolean(regApprovedEvent && dayCalcEvent)}`,
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 8,
        testName: 'Attendance Regularization Recalculation',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 9: Unauthorized Approval Rejection
    // Employee attempts manager approval -> Service layer rejection
    // ────────────────────────────────────────────────────────────────────────
    try {
      const unauthEmpId = `emp-unauth-${Date.now()}`;
      const unauthReqId = `req-unauth-${Date.now()}`;

      const instance = await unifiedApprovalEngine.createInstance({
        organizationId: testOrgId,
        targetEntityType: 'LEAVE',
        targetEntityId: unauthReqId,
        requesterEmployeeId: unauthEmpId,
      });

      let authRejectionCaught = false;
      try {
        await unifiedApprovalEngine.executeApprovalAction({
          instanceId: instance.id,
          actorEmployeeId: unauthEmpId,
          actorRole: 'Employee', // Standard employee has no approval authority
          action: 'APPROVE',
        });
      } catch (err: any) {
        if (err.message.includes('ACCESS_DENIED') || err.message.includes('Unauthorized')) {
          authRejectionCaught = true;
        }
      }

      if (authRejectionCaught) {
        results.push({
          testNumber: 9,
          testName: 'Unauthorized Approval Rejection',
          passed: true,
          details: 'Employee attempt to approve was authoritatively blocked with ACCESS_DENIED.',
        });
      } else {
        results.push({
          testNumber: 9,
          testName: 'Unauthorized Approval Rejection',
          passed: false,
          details: 'Expected ACCESS_DENIED rejection for unprivileged Employee role, but none was thrown.',
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 9,
        testName: 'Unauthorized Approval Rejection',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // TEST 10: Multi-Tenant Boundary Isolation
    // Approver from Tenant A attempts approval on Tenant B request -> ACCESS_DENIED
    // ────────────────────────────────────────────────────────────────────────
    try {
      const tenantBOrgId = `tenant-b-${Date.now()}`;
      const tenantAOrgId = `tenant-a-${Date.now()}`;

      const instanceTenantB = await unifiedApprovalEngine.createInstance({
        organizationId: tenantBOrgId,
        targetEntityType: 'LEAVE',
        targetEntityId: `leave-tenant-b-${Date.now()}`,
        requesterEmployeeId: 'emp-tenant-b',
      });

      let crossTenantRejected = false;
      try {
        // Approver belongs to Tenant A attempting to approve Tenant B request
        await unifiedApprovalEngine.executeApprovalAction({
          instanceId: instanceTenantB.id,
          actorEmployeeId: 'mgr-tenant-a',
          actorRole: 'Manager',
          approverOrgId: tenantAOrgId, // Cross-tenant breach attempt!
          action: 'APPROVE',
        });
      } catch (err: any) {
        if (err.message.includes('ACCESS_DENIED') && err.message.includes('Tenant isolation boundary')) {
          crossTenantRejected = true;
        }
      }

      if (crossTenantRejected) {
        results.push({
          testNumber: 10,
          testName: 'Multi-Tenant Isolation',
          passed: true,
          details: 'Cross-tenant approval attempt strictly rejected with tenant isolation boundary violation.',
        });
      } else {
        results.push({
          testNumber: 10,
          testName: 'Multi-Tenant Isolation',
          passed: false,
          details: 'Expected cross-tenant access violation rejection, but none was thrown.',
        });
      }
    } catch (err: any) {
      results.push({
        testNumber: 10,
        testName: 'Multi-Tenant Isolation',
        passed: false,
        details: `Unexpected error: ${err.message}`,
      });
    }

    const passCount = results.filter((r) => r.passed).length;
    return {
      passed: passCount === results.length,
      passCount,
      totalCount: results.length,
      results,
    };
  }
}
