// src/types/tenantOvertime.ts
// ============================================================================
// JOY PeopleHR — SaaS-Wide Tenant-Configurable Overtime Management Engine Types
// Strict Tenant Isolation • Multi-Mode • Policy Hierarchy • Conflict Aware
// ============================================================================

export type TenantOtMode =
  | 'POLICY_BASED'   // Mode A: Policy configured; automatic calculation using approved rules
  | 'HR_VERIFIED'    // Mode B: Tracking enabled, fallback potential OT flagged POLICY_NOT_CONFIGURED & PENDING_HR_REVIEW
  | 'TRACKING_ONLY'  // Mode C: Hours tracked; no payroll monetary amount
  | 'DISABLED';      // Mode D: No payable OT generated; normal attendance preserved

export type OtApprovalWorkflow =
  | 'HR_ONLY'
  | 'MANAGER_THEN_HR'
  | 'DEPT_HEAD_THEN_HR'
  | 'SINGLE_APPROVER';

export type OtPolicyScopeLevel =
  | 'ORG_DEFAULT'
  | 'DEPARTMENT'
  | 'EMPLOYEE_GROUP'
  | 'SHIFT'
  | 'EMPLOYEE_EXCEPTION';

export type OtRecordStatus =
  | 'PENDING_HR_REVIEW'
  | 'PENDING_MANAGER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYROLL_PROCESSED'
  | 'POLICY_NOT_CONFIGURED'
  | 'CONFLICT';

export type OtRoundingRule =
  | 'EXACT'
  | 'NEAREST_15_MIN'
  | 'NEAREST_30_MIN'
  | 'ROUND_DOWN'
  | 'ROUND_UP';

export type OtSpecialDayRule =
  | 'OT_ONLY'
  | 'COMP_OFF_ONLY'
  | 'OT_AND_COMP_OFF'
  | 'REGULAR_PAY';

export interface OrganizationOtSettings {
  organizationId: string;
  otEnabled: boolean;
  otMode: TenantOtMode;
  approvalWorkflow: OtApprovalWorkflow;
  allowSelfApproval: boolean;
  allowEmployeeExceptions: boolean;
  payrollIntegrationEnabled: boolean;
  defaultDailyThresholdMinutes: number; // e.g. 480 (8h)
  defaultWeeklyThresholdMinutes: number; // e.g. 2400 (40h)
  updatedBy?: string;
  updatedAt: string;
}

export interface TenantOtPolicyRule {
  id: string;
  organizationId: string;
  policyName: string;
  policyVersion: number;
  scopeLevel: OtPolicyScopeLevel;
  scopeTargetId?: string; // departmentId, groupId, shiftId, or employeeId
  scopeTargetName?: string;
  isActive: boolean;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null;

  // Thresholds & Maximums
  dailyOtThresholdMinutes: number;
  weeklyOtThresholdMinutes: number;
  minOtThresholdMinutes: number; // e.g. 30 (minimum extra time to qualify)
  maxOtMinutesPerDay: number; // cap per day
  maxOtMinutesPerWeek: number; // cap per week
  monthlyStatutoryOtCapHours: number;

  // Break Deductions
  dayShiftBreakMinutes: number;
  nightShiftBreakMinutes: number;
  breakDeductionAfterMinutes: number;
  roundingRule: OtRoundingRule;

  // Pre/Post & Special Days
  preShiftOtEnabled: boolean;
  postShiftOtEnabled: boolean;
  holidayOtRule: OtSpecialDayRule;
  weeklyOffOtRule: OtSpecialDayRule;

  // Multipliers & Night Window
  regularMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  nightMultiplier: number;
  nightWindowStart: string; // HH:mm
  nightWindowEnd: string; // HH:mm

  // Eligibility Filters (JSON arrays; empty means applies to all within scope)
  applicableDepartments: string[];
  applicableDesignations: string[];
  applicableEmployeeGroups: string[];
  applicableShifts: string[];
  payrollIntegrationEnabled: boolean;

  createdBy?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface TenantOtCalculationEvidence {
  organizationId: string;
  employeeId: string;
  attendanceDate: string;
  shiftId?: string;
  shiftName?: string;
  scheduledStartMinutes: number;
  scheduledEndMinutes: number;
  scheduledDurationMinutes: number;
  actualCheckInMinutes: number | null;
  actualCheckOutMinutes: number | null;
  grossMinutes: number;
  breakMinutesDeducted: number;
  netWorkMinutes: number;
  isOvernightShift: boolean;
  isWeeklyOff: boolean;
  isHoliday: boolean;
  preShiftMinutes: number;
  postShiftMinutes: number;
  unroundedOtMinutes: number;
  roundedOtMinutes: number;
  cappedOtMinutes: number;
  appliedScopeLevel?: OtPolicyScopeLevel;
  appliedPolicyId?: string;
  appliedPolicyName?: string;
  appliedPolicyVersion?: number;
  conflictingPolicyIds?: string[];
  notes: string[];
}

export interface TenantOtCalculationResult {
  organizationId: string;
  employeeId: string;
  attendanceDate: string;
  mode: TenantOtMode;
  status: OtRecordStatus;
  calculatedMinutes: number;
  approvedMinutes: number;
  policyId?: string;
  policyName?: string;
  scopeLevel?: OtPolicyScopeLevel;
  evidence: TenantOtCalculationEvidence;
  hasConflict: boolean;
  isPolicyMissing: boolean;
  isEligibleForPayroll: boolean;
  reason?: string;
}

export interface TenantOtApprovalAction {
  recordId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'APPROVE' | 'REJECT' | 'ADJUST';
  adjustedMinutes?: number;
  adjustmentReason?: string;
  comment?: string;
  timestamp: string;
}

export interface TenantOtReportFilter {
  organizationId: string;
  startDate: string;
  endDate: string;
  department?: string;
  shift?: string;
  status?: OtRecordStatus | 'ALL';
  employeeQuery?: string;
}

export interface TenantOtReportSummary {
  organizationId: string;
  startDate: string;
  endDate: string;
  totalCalculatedHours: number;
  totalApprovedHours: number;
  totalPendingHours: number;
  totalRejectedHours: number;
  totalPayrollProcessedHours: number;
  recordsCount: number;
  pendingReviewCount: number;
  policyMissingCount: number;
  policyConflictCount: number;
  shiftMissingCount: number;
  approvedCount: number;
}
