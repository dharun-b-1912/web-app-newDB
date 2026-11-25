// src/services/__tests__/saasTenantOvertimeEngine.test.ts
// ============================================================================
// JOY PeopleHR — SaaS Multi-Tenant Overtime Engine Verification Suite
// Acceptance Criterion: Supports multiple tenants simultaneously without leakage,
// verifies policy hierarchy, conflict detection, Mode B fallback, Mode C/D, and audit trail.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  tenantOvertimeEngineService,
  EmployeeEvaluationContext,
  AttendanceEvaluationInput,
} from '../attendance/tenantOvertimeEngineService';

describe('SaaS-Wide Tenant-Configurable Overtime Management Engine', () => {
  const ORG_A = 'org-tenant-alpha-manufacturing';
  const ORG_B = 'org-tenant-beta-logistics';
  const ORG_C = 'org-tenant-gamma-tracking';
  const ORG_D = 'org-tenant-delta-disabled';

  beforeEach(() => {
    // Clear localStorage prefix items to ensure clean sandbox per run
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // ==========================================================================
  // Test 1: Multi-Tenant Simultaneous Isolation (Org A vs Org B)
  // ==========================================================================
  it('correctly supports Org A (Policy-Based) and Org B (No-Policy Fallback) simultaneously without cross-tenant leakage', async () => {
    // 1. Configure Org A for Mode A (Policy-Based) with a specific shift policy
    await tenantOvertimeEngineService.saveOrgSettings(ORG_A, {
      otEnabled: true,
      otMode: 'POLICY_BASED',
      approvalWorkflow: 'HR_ONLY',
      allowSelfApproval: false,
      payrollIntegrationEnabled: true,
    });

    await tenantOvertimeEngineService.savePolicyRule(ORG_A, {
      policyName: 'Org A Manufacturing Plant Policy',
      policyVersion: 1,
      scopeLevel: 'ORG_DEFAULT',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480, // 8h
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 30,
      maxOtMinutesPerDay: 300,
      maxOtMinutesPerWeek: 1200,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 30,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'NEAREST_15_MIN',
      preShiftOtEnabled: true,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: [],
      payrollIntegrationEnabled: true,
    });

    // 2. Configure Org B for Mode B (HR_VERIFIED) with NO policies configured
    await tenantOvertimeEngineService.saveOrgSettings(ORG_B, {
      otEnabled: true,
      otMode: 'HR_VERIFIED',
      approvalWorkflow: 'HR_ONLY',
      allowSelfApproval: false,
      payrollIntegrationEnabled: true,
    });

    // 3. Employee in Org A worked 10 hours (08:30 to 18:30, expected 08:30 to 17:00 = 8.5h shift with 30m break = 8h net shift)
    // Clocked 10h (600m), minus 30m break = 570m net work. Shift base = 480m. OT = 90m (1h 30m).
    const empContextA: EmployeeEvaluationContext = {
      organizationId: ORG_A,
      employeeId: 'EMP-ALPHA-001',
      departmentName: 'Assembly',
      shiftName: 'Morning Shift',
    };
    const attInputA: AttendanceEvaluationInput = {
      attendanceDate: '2026-11-25',
      checkInMinutes: 510, // 08:30
      checkOutMinutes: 1110, // 18:30 (10 hours gross)
      expectedInMinutes: 510,
      expectedOutMinutes: 1020, // 17:00 (8.5h shift)
    };

    const resultA = tenantOvertimeEngineService.calculateOvertime(empContextA, attInputA);
    expect(resultA.mode).toBe('POLICY_BASED');
    expect(resultA.isPolicyMissing).toBe(false);
    expect(resultA.hasConflict).toBe(false);
    expect(resultA.calculatedMinutes).toBe(90); // 1h 30m calculated OT
    expect(resultA.isEligibleForPayroll).toBe(true);

    // 4. Employee in Org B worked the exact same hours (10 hours), but Org B has no policy configured
    const empContextB: EmployeeEvaluationContext = {
      organizationId: ORG_B,
      employeeId: 'EMP-BETA-001',
      departmentName: 'Logistics',
      shiftName: 'General Shift',
    };
    const attInputB: AttendanceEvaluationInput = {
      attendanceDate: '2026-11-25',
      checkInMinutes: 510,
      checkOutMinutes: 1110,
      expectedInMinutes: 510,
      expectedOutMinutes: 1020,
    };

    const resultB = tenantOvertimeEngineService.calculateOvertime(empContextB, attInputB);
    expect(resultB.mode).toBe('HR_VERIFIED');
    expect(resultB.isPolicyMissing).toBe(true);
    expect(resultB.status).toBe('PENDING_HR_REVIEW');
    expect(resultB.reason).toBe('POLICY_NOT_CONFIGURED');
    expect(resultB.approvedMinutes).toBe(0); // Zero rate guessing; cannot auto-approve
    expect(resultB.isEligibleForPayroll).toBe(false); // Held until HR explicitly verifies

    // 5. Verify absolute isolation: Policy in Org A never leaked to Org B
    const policiesB = tenantOvertimeEngineService.getPolicies(ORG_B);
    expect(policiesB.length).toBe(0);
  });

  // ==========================================================================
  // Test 2: Mode C (Tracking Only) & Mode D (Disabled)
  // ==========================================================================
  it('correctly enforces Mode C (Tracking Only) and Mode D (OT Disabled)', async () => {
    // Org C: Mode C Tracking Only
    await tenantOvertimeEngineService.saveOrgSettings(ORG_C, {
      otEnabled: true,
      otMode: 'TRACKING_ONLY',
    });
    await tenantOvertimeEngineService.savePolicyRule(ORG_C, {
      policyName: 'Org C Tracking Policy',
      policyVersion: 1,
      scopeLevel: 'ORG_DEFAULT',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 30,
      maxOtMinutesPerDay: 240,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.0,
      weekendMultiplier: 1.0,
      holidayMultiplier: 1.0,
      nightMultiplier: 1.0,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: [],
      payrollIntegrationEnabled: false,
    });

    const resC = tenantOvertimeEngineService.calculateOvertime(
      { organizationId: ORG_C, employeeId: 'EMP-C-01' },
      {
        attendanceDate: '2026-11-25',
        checkInMinutes: 540,
        checkOutMinutes: 1140, // 10h worked (shift was 8h)
        expectedInMinutes: 540,
        expectedOutMinutes: 1020,
      }
    );
    expect(resC.mode).toBe('TRACKING_ONLY');
    expect(resC.calculatedMinutes).toBe(120); // 2 hours tracked
    expect(resC.isEligibleForPayroll).toBe(false); // Never generates payroll payout in Mode C!

    // Org D: Mode D Disabled
    await tenantOvertimeEngineService.saveOrgSettings(ORG_D, {
      otEnabled: false,
      otMode: 'DISABLED',
    });

    const resD = tenantOvertimeEngineService.calculateOvertime(
      { organizationId: ORG_D, employeeId: 'EMP-D-01' },
      {
        attendanceDate: '2026-11-25',
        checkInMinutes: 540,
        checkOutMinutes: 1140,
        expectedInMinutes: 540,
        expectedOutMinutes: 1020,
      }
    );
    expect(resD.mode).toBe('DISABLED');
    expect(resD.calculatedMinutes).toBe(0); // Zero OT generated
    expect(resD.evidence.netWorkMinutes).toBe(600); // Standard attendance working duration preserved!
  });

  // ==========================================================================
  // Test 3: Deterministic Policy Hierarchy Precedence
  // ==========================================================================
  it('correctly resolves policy hierarchy: Employee Exception > Shift > Group > Department > Org Default', async () => {
    const ORG_HIERARCHY = 'org-tenant-hierarchy-test';
    await tenantOvertimeEngineService.saveOrgSettings(ORG_HIERARCHY, {
      otEnabled: true,
      otMode: 'POLICY_BASED',
      allowEmployeeExceptions: true,
    });

    // 1. Org Default Policy (Level 1): min threshold = 60m
    await tenantOvertimeEngineService.savePolicyRule(ORG_HIERARCHY, {
      policyName: 'Org Default 60m',
      policyVersion: 1,
      scopeLevel: 'ORG_DEFAULT',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 60,
      maxOtMinutesPerDay: 240,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: [],
      payrollIntegrationEnabled: true,
    });

    // 2. Department Policy (Level 2): min threshold = 45m
    await tenantOvertimeEngineService.savePolicyRule(ORG_HIERARCHY, {
      policyName: 'Department Assembly 45m',
      policyVersion: 1,
      scopeLevel: 'DEPARTMENT',
      scopeTargetId: 'DEPT-ASSEMBLY',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 45,
      maxOtMinutesPerDay: 240,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: ['DEPT-ASSEMBLY'],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: [],
      payrollIntegrationEnabled: true,
    });

    // 3. Shift Policy (Level 4): min threshold = 15m
    await tenantOvertimeEngineService.savePolicyRule(ORG_HIERARCHY, {
      policyName: 'Night Shift 15m',
      policyVersion: 1,
      scopeLevel: 'SHIFT',
      scopeTargetId: 'SHIFT-NIGHT',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 15,
      maxOtMinutesPerDay: 240,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: ['SHIFT-NIGHT'],
      payrollIntegrationEnabled: true,
    });

    // Case A: Employee with only Department match -> Department Policy wins over Org Default
    const resDept = tenantOvertimeEngineService.resolvePolicy(
      { organizationId: ORG_HIERARCHY, employeeId: 'EMP-01', departmentId: 'DEPT-ASSEMBLY' },
      '2026-11-25'
    );
    expect(resDept.scopeLevel).toBe('DEPARTMENT');
    expect(resDept.matchedPolicy?.policyName).toBe('Department Assembly 45m');

    // Case B: Employee with both Department AND Shift match -> Shift Policy (Level 4) wins over Department (Level 2)
    const resShift = tenantOvertimeEngineService.resolvePolicy(
      { organizationId: ORG_HIERARCHY, employeeId: 'EMP-02', departmentId: 'DEPT-ASSEMBLY', shiftId: 'SHIFT-NIGHT' },
      '2026-11-25'
    );
    expect(resShift.scopeLevel).toBe('SHIFT');
    expect(resShift.matchedPolicy?.policyName).toBe('Night Shift 15m');
  });

  // ==========================================================================
  // Test 4: Deterministic Policy Conflict Detection
  // ==========================================================================
  it('flags CONFLICT and stops arbitrary calculation when two policies match at the same hierarchy level', async () => {
    const ORG_CONFLICT = 'org-tenant-conflict-test';
    await tenantOvertimeEngineService.saveOrgSettings(ORG_CONFLICT, {
      otEnabled: true,
      otMode: 'POLICY_BASED',
    });

    // Policy 1 for Shift Alpha
    await tenantOvertimeEngineService.savePolicyRule(ORG_CONFLICT, {
      policyName: 'Alpha Shift Rule A',
      policyVersion: 1,
      scopeLevel: 'SHIFT',
      scopeTargetId: 'SHIFT-ALPHA',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 30,
      maxOtMinutesPerDay: 240,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 1.5,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: ['SHIFT-ALPHA'],
      payrollIntegrationEnabled: true,
    });

    // Policy 2 also for Shift Alpha (Conflicting!)
    await tenantOvertimeEngineService.savePolicyRule(ORG_CONFLICT, {
      policyName: 'Alpha Shift Rule B (Conflicting)',
      policyVersion: 1,
      scopeLevel: 'SHIFT',
      scopeTargetId: 'SHIFT-ALPHA',
      isActive: true,
      effectiveFrom: '2026-01-01',
      dailyOtThresholdMinutes: 480,
      weeklyOtThresholdMinutes: 2400,
      minOtThresholdMinutes: 15,
      maxOtMinutesPerDay: 300,
      maxOtMinutesPerWeek: 960,
      monthlyStatutoryOtCapHours: 50,
      dayShiftBreakMinutes: 0,
      nightShiftBreakMinutes: 0,
      breakDeductionAfterMinutes: 240,
      roundingRule: 'EXACT',
      preShiftOtEnabled: false,
      postShiftOtEnabled: true,
      holidayOtRule: 'OT_ONLY',
      weeklyOffOtRule: 'OT_ONLY',
      regularMultiplier: 2.0,
      weekendMultiplier: 2.0,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.25,
      nightWindowStart: '22:00',
      nightWindowEnd: '06:00',
      applicableDepartments: [],
      applicableDesignations: [],
      applicableEmployeeGroups: [],
      applicableShifts: ['SHIFT-ALPHA'],
      payrollIntegrationEnabled: true,
    });

    const res = tenantOvertimeEngineService.calculateOvertime(
      { organizationId: ORG_CONFLICT, employeeId: 'EMP-CONF-01', shiftId: 'SHIFT-ALPHA' },
      {
        attendanceDate: '2026-11-25',
        checkInMinutes: 540,
        checkOutMinutes: 1140,
        expectedInMinutes: 540,
        expectedOutMinutes: 1020,
      }
    );

    expect(res.hasConflict).toBe(true);
    expect(res.status).toBe('CONFLICT');
    expect(res.calculatedMinutes).toBe(0);
    expect(res.isEligibleForPayroll).toBe(false);
  });

  // ==========================================================================
  // Test 5: HR Approval Workflow & Mandatory Adjustment Reasons
  // ==========================================================================
  it('enforces mandatory adjustment reasons and blocks self-approval when prohibited', async () => {
    const ORG_APPROVAL = 'org-tenant-approval-test';
    await tenantOvertimeEngineService.saveOrgSettings(ORG_APPROVAL, {
      otEnabled: true,
      otMode: 'HR_VERIFIED',
      allowSelfApproval: false,
    });

    // Record an OT item
    const calc = tenantOvertimeEngineService.calculateOvertime(
      { organizationId: ORG_APPROVAL, employeeId: 'EMP-USER-99' },
      {
        attendanceDate: '2026-11-25',
        checkInMinutes: 540,
        checkOutMinutes: 1140, // 2h potential OT
        expectedInMinutes: 540,
        expectedOutMinutes: 1020,
      }
    );
    const rec = tenantOvertimeEngineService.recordDailyOvertime(ORG_APPROVAL, calc);

    // 1. Attempt self-approval by EMP-USER-99 (must fail!)
    const selfApproveRes = await tenantOvertimeEngineService.processApprovalAction(ORG_APPROVAL, {
      recordId: rec.id,
      actorId: 'EMP-USER-99', // Same as employeeId
      actorName: 'User Ninety Nine',
      actorRole: 'Manager',
      action: 'APPROVE',
      timestamp: new Date().toISOString(),
    });
    expect(selfApproveRes.success).toBe(false);
    expect(selfApproveRes.message).toContain('Self-approval of overtime is prohibited');

    // 2. Attempt adjust without reason (must fail!)
    const adjustNoReasonRes = await tenantOvertimeEngineService.processApprovalAction(ORG_APPROVAL, {
      recordId: rec.id,
      actorId: 'EMP-HR-01',
      actorName: 'HR Manager',
      actorRole: 'HR Head',
      action: 'ADJUST',
      adjustedMinutes: 60,
      adjustmentReason: '', // Empty reason
      timestamp: new Date().toISOString(),
    });
    expect(adjustNoReasonRes.success).toBe(false);
    expect(adjustNoReasonRes.message).toContain('Mandatory adjustment reason is required');

    // 3. Valid adjustment with mandatory reason
    const validAdjustRes = await tenantOvertimeEngineService.processApprovalAction(ORG_APPROVAL, {
      recordId: rec.id,
      actorId: 'EMP-HR-01',
      actorName: 'HR Manager',
      actorRole: 'HR Head',
      action: 'ADJUST',
      adjustedMinutes: 75,
      adjustmentReason: 'Authorized emergency breakdown overtime adjustment',
      timestamp: new Date().toISOString(),
    });
    expect(validAdjustRes.success).toBe(true);
    expect(validAdjustRes.record.status).toBe('APPROVED');
    expect(validAdjustRes.record.approvedMinutes).toBe(75);
    expect(validAdjustRes.record.approvalHistory.length).toBe(1);
  });

  // ==========================================================================
  // Test 6: Platform Super Admin Health View
  // ==========================================================================
  it('provides platform admin health telemetry without exposing employee attendance records', async () => {
    const healthA = tenantOvertimeEngineService.getPlatformAdminOrgHealth(ORG_A);
    expect(healthA.organizationId).toBe(ORG_A);
    expect(healthA.otEnabled).toBe(true);
    expect(healthA.otMode).toBe('POLICY_BASED');
    expect(healthA.policyConfigured).toBe(true);
    expect(healthA.moduleHealth).toBe('HEALTHY');

    const healthD = tenantOvertimeEngineService.getPlatformAdminOrgHealth(ORG_D);
    expect(healthD.organizationId).toBe(ORG_D);
    expect(healthD.otEnabled).toBe(false);
    expect(healthD.moduleHealth).toBe('DISABLED');
  });
});
