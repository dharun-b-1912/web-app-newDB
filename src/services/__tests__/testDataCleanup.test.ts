// src/services/__tests__/testDataCleanup.test.ts
// ============================================================================
// JOY PeopleHR — Test Data Cleanup & Baseline Verification Test Suite
// ============================================================================

import { describe, it, expect } from 'vitest';
import { testDataCleanupService } from '../attendance/testDataCleanupService';
import { attendanceClassificationEngine } from '../attendance/attendanceClassificationEngine';

describe('Test Data Cleanup & Clean Baseline Verification Suite', () => {
  it('Gate 1: Dry run previews identified test records without deleting master data', () => {
    const dryRun = testDataCleanupService.dryRun({
      targetDates: ['2026-09-11'],
      employeeCodes: ['JCS-017', '017'],
    });

    expect(dryRun.organizationId).toBeDefined();
    expect(dryRun.recordsToClean.dailyAttendanceCount).toBeGreaterThanOrEqual(1);
    expect(dryRun.preservedMasterData.employeesPreservedCount).toBe(486);
    expect(dryRun.preservedMasterData.devicesPreservedCount).toBe(1);
    expect(dryRun.preservedMasterData.biometricMappingsPreservedCount).toBe(2);
  });

  it('Gate 2: Executes authoritative cleanup of Dharun B test records on 2026-09-11', () => {
    const res = testDataCleanupService.executeCleanup({
      targetDates: ['2026-09-11'],
      employeeCodes: ['JCS-017', '017'],
    });

    expect(res.success).toBe(true);
    expect(res.deletedDailyRecords).toBeGreaterThanOrEqual(1);
    expect(res.message).toContain('Clean baseline established');
  });

  it('Gate 3: Baseline date 2026-09-12 starts pristine with zero historical punches', () => {
    const rawPunches = attendanceClassificationEngine.getRawPunchesForEmployeeOnDate('JCS-017', '2026-09-12');
    expect(rawPunches.length).toBe(0);

    const existingDaily = attendanceClassificationEngine.getExistingDailyRecord('JCS-017', '2026-09-12');
    expect(existingDaily).toBeNull();
  });
});
