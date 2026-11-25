import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  tenantOvertimePolicyService,
  getDefaultTenantOvertimePolicy,
} from '../attendance/tenantOvertimePolicyService';
import {
  getShiftScheduledBreakMinutes,
  processAttendanceStatus,
  DEFAULT_ATTENDANCE_POLICY,
} from '../../lib/attendance/attendanceEngine';

const ELECTRA_ORG_ID = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const JOY_CORP_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

const memoryStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { memoryStorage.set(key, String(value)); },
  removeItem: (key: string) => { memoryStorage.delete(key); },
  clear: () => { memoryStorage.clear(); },
};

describe('Multi-Tenant Overtime & Shift Break Policy Isolation', () => {
  beforeEach(async () => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    memoryStorage.clear();
    await tenantOvertimePolicyService.resetToOrgDefaults(ELECTRA_ORG_ID);
    await tenantOvertimePolicyService.resetToOrgDefaults(JOY_CORP_ORG_ID);
  });

  it('provides distinct organization-specific defaults for Electra EV vs Joy Corporate Solutions', () => {
    const electra = getDefaultTenantOvertimePolicy(ELECTRA_ORG_ID);
    const joyCorp = getDefaultTenantOvertimePolicy(JOY_CORP_ORG_ID);

    expect(electra.organizationId).toBe(ELECTRA_ORG_ID);
    expect(joyCorp.organizationId).toBe(JOY_CORP_ORG_ID);
    expect(electra.dayShiftBreakMinutes).toBe(30);
    expect(electra.nightShiftBreakMinutes).toBe(0);
    expect(electra.nightShiftHalfDayThresholdMinutes).toBe(210);
    expect(electra.minOtThresholdMinutes).toBe(30);
    expect(electra.maxOtMinutesPerDay).toBe(480);
  });

  it('isolates custom overtime & break rules per organizationId without cross-tenant leakage', async () => {
    await tenantOvertimePolicyService.savePolicyAsync(ELECTRA_ORG_ID, {
      minOtThresholdMinutes: 45,
      dayShiftBreakMinutes: 45,
      nightShiftBreakMinutes: 15,
      preShiftOtEnabled: false,
    });

    await tenantOvertimePolicyService.savePolicyAsync(JOY_CORP_ORG_ID, {
      minOtThresholdMinutes: 15,
      dayShiftBreakMinutes: 60,
      nightShiftBreakMinutes: 30,
      preShiftOtEnabled: true,
    });

    const electraPolicy = tenantOvertimePolicyService.getPolicySync(ELECTRA_ORG_ID);
    const joyPolicy = tenantOvertimePolicyService.getPolicySync(JOY_CORP_ORG_ID);

    expect(electraPolicy.minOtThresholdMinutes).toBe(45);
    expect(electraPolicy.dayShiftBreakMinutes).toBe(45);
    expect(electraPolicy.nightShiftBreakMinutes).toBe(15);
    expect(electraPolicy.preShiftOtEnabled).toBe(false);

    expect(joyPolicy.minOtThresholdMinutes).toBe(15);
    expect(joyPolicy.dayShiftBreakMinutes).toBe(60);
    expect(joyPolicy.nightShiftBreakMinutes).toBe(30);
    expect(joyPolicy.preShiftOtEnabled).toBe(true);
  });

  it('immediately applies tenant break & OT threshold changes in AttendanceEngine', async () => {
    // Default Electra night break is 0m, day break is 30m
    expect(getShiftScheduledBreakMinutes('SHIFT-3', true, ELECTRA_ORG_ID)).toBe(0);
    expect(getShiftScheduledBreakMinutes('SHIFT-1', false, ELECTRA_ORG_ID)).toBe(30);

    // Customize Electra EV: set night break to 20m, day break to 40m, min OT to 60m
    await tenantOvertimePolicyService.savePolicyAsync(ELECTRA_ORG_ID, {
      dayShiftBreakMinutes: 40,
      nightShiftBreakMinutes: 20,
      minOtThresholdMinutes: 60,
    });

    expect(getShiftScheduledBreakMinutes('SHIFT-3', true, ELECTRA_ORG_ID)).toBe(20);
    expect(getShiftScheduledBreakMinutes('SHIFT-1', false, ELECTRA_ORG_ID)).toBe(40);

    // 45m extra work should yield 0 OT when minOtThresholdMinutes = 60
    const breakMins = getShiftScheduledBreakMinutes('GEN-01', false, ELECTRA_ORG_ID);
    const resBelowMin = processAttendanceStatus(
      510, // 08:30
      1075, // 17:55 (565m gross - 40m break = 525m net; 45m extra work)
      510,
      1020, // 17:00
      { ...DEFAULT_ATTENDANCE_POLICY, overtime_min_minutes: 60 },
      false,
      false,
      false,
      '2026-11-25',
      undefined,
      breakMins,
      ELECTRA_ORG_ID
    );
    expect(resBelowMin.overtimeMinutes).toBe(0);

    // Resetting restores defaults
    const reset = await tenantOvertimePolicyService.resetToOrgDefaults(ELECTRA_ORG_ID);
    expect(reset.minOtThresholdMinutes).toBe(30);
    expect(reset.dayShiftBreakMinutes).toBe(30);
    expect(reset.nightShiftBreakMinutes).toBe(0);
  });
});
