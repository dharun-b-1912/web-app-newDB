// src/services/__tests__/enterpriseConcurrencyAndIdempotency.test.ts
// ============================================================================
// JOY PeopleHR — Concurrency & Idempotency Test Suite
// 100 Simultaneous Biometric Events • Duplicate Suppression • In-Flight Locks
// ============================================================================

import { describe, it, expect } from 'vitest';
import { idempotencyService } from '../resilience/idempotencyService';
import { bulkJobService } from '../resilience/bulkJobService';

describe('Enterprise Concurrency & Idempotency Suite', () => {
  it('Gate 1: Processes identical biometric events idempotently without double calculation', async () => {
    const key = idempotencyService.generateKey(['org-joy-01', 'DEV-01', '154', '2026-09-11T09:00:00Z', 'CHECK_IN']);

    let executionCount = 0;
    const worker = async () => {
      return idempotencyService.executeIdempotent(key, 'org-joy-01', 'ATTENDANCE_PUNCH_INGEST', async () => {
        executionCount += 1;
        return { attendanceId: 'att-154-today', status: 'Present' };
      });
    };

    // Simulate 100 simultaneous arrivals of the same punch event
    const promises = Array.from({ length: 100 }, () => worker());
    const results = await Promise.all(promises);

    // Only 1 execution should have actually run
    expect(executionCount).toBe(1);

    // All 100 calls must receive the valid result
    results.forEach((r) => {
      expect(r.result.attendanceId).toBe('att-154-today');
    });

    expect(idempotencyService.hasBeenProcessed(key)).toBe(true);
  });

  it('Gate 2: Prevents concurrent execution collisions with in-flight locking', async () => {
    const key = idempotencyService.generateKey(['org-joy-01', 'PAYROLL_RUN', '2026-09']);

    let delayedResolve: () => void;
    const slowExecution = new Promise<string>((resolve) => {
      delayedResolve = () => resolve('payroll-run-finished');
    });

    const promise1 = idempotencyService.executeIdempotent(key, 'org-joy-01', 'PAYROLL_CALCULATE', () => slowExecution);

    // Immediate second call with rejectConcurrentInFlight should detect in-flight execution and throw conflict
    await expect(
      idempotencyService.executeIdempotent(key, 'org-joy-01', 'PAYROLL_CALCULATE', () => Promise.resolve('another'), {
        rejectConcurrentInFlight: true,
      })
    ).rejects.toThrow(/Concurrent execution conflict/);

    delayedResolve!();
    const res1 = await promise1;
    expect(res1.result).toBe('payroll-run-finished');
  });

  it('Gate 3: Executes large employee bulk jobs with controlled batching and progress tracking', async () => {
    const sampleEmployees = Array.from({ length: 120 }, (_, i) => ({
      id: `emp-${i + 1}`,
      name: `Employee ${i + 1}`,
    }));

    const job = bulkJobService.createJob('org-joy-01', 'HR Admin', 'PUSH_USERS_TO_DEVICE', sampleEmployees);
    expect(job.status).toBe('QUEUED');

    let progressCallbacks = 0;
    const completedJob = await bulkJobService.executeInBatches(
      job.jobId,
      25,
      async (emp: any) => {
        // Mock push
        return { synced: true, employeeId: emp.id };
      },
      () => {
        progressCallbacks += 1;
      }
    );

    expect(completedJob.status).toBe('COMPLETED');
    expect(completedJob.processed).toBe(120);
    expect(completedJob.successful).toBe(120);
    expect(completedJob.failed).toBe(0);
    expect(progressCallbacks).toBeGreaterThanOrEqual(4);
  });
});
