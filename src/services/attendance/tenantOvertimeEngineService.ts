// src/services/attendance/tenantOvertimeEngineService.ts
// ============================================================================
// JOY PeopleHR — SaaS-Wide Tenant-Configurable Overtime Management Engine
// Pure Multi-Tenant Architecture • Zero Hardcoding • Deterministic Policy Hierarchy
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';
import {
  TenantOtMode,
  OtApprovalWorkflow,
  OtPolicyScopeLevel,
  OtRecordStatus,
  OtRoundingRule,
  OrganizationOtSettings,
  TenantOtPolicyRule,
  TenantOtCalculationEvidence,
  TenantOtCalculationResult,
  TenantOtApprovalAction,
  TenantOtReportFilter,
  TenantOtReportSummary,
} from '../../types/tenantOvertime';

const STORAGE_PREFIX_SETTINGS = 'joy_saas_ot_settings_v1_';
const STORAGE_PREFIX_POLICIES = 'joy_saas_ot_policies_v1_';
const STORAGE_PREFIX_RECORDS = 'joy_saas_ot_records_v1_';

export interface EmployeeEvaluationContext {
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  employeeGroupId?: string;
  shiftId?: string;
  shiftName?: string;
}

export interface AttendanceEvaluationInput {
  attendanceDate: string; // YYYY-MM-DD
  checkInMinutes: number | null;
  checkOutMinutes: number | null;
  expectedInMinutes: number; // e.g. 510 (08:30)
  expectedOutMinutes: number; // e.g. 1020 (17:00)
  breakMinutes?: number;
  isHoliday?: boolean;
  isWeeklyOff?: boolean;
  isRegularized?: boolean;
}

export class TenantOvertimeEngineService {
  private settingsCache = new Map<string, OrganizationOtSettings>();
  private policiesCache = new Map<string, TenantOtPolicyRule[]>();
  private recordsCache = new Map<string, Map<string, any>>(); // orgId -> (recordKey -> record)

  // ==========================================================================
  // 1. ORGANIZATION-LEVEL MASTER SETTINGS
  // ==========================================================================

  public getDefaultOrgSettings(orgId: string): OrganizationOtSettings {
    return {
      organizationId: orgId,
      otEnabled: true,
      otMode: 'POLICY_BASED',
      approvalWorkflow: 'HR_ONLY',
      allowSelfApproval: false,
      allowEmployeeExceptions: false,
      payrollIntegrationEnabled: true,
      defaultDailyThresholdMinutes: 480, // 8h
      defaultWeeklyThresholdMinutes: 2400, // 40h
      updatedAt: new Date().toISOString(),
    };
  }

  public getOrgSettings(orgId: string): OrganizationOtSettings {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    if (this.settingsCache.has(orgId)) {
      return this.settingsCache.get(orgId)!;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_PREFIX_SETTINGS}${orgId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged: OrganizationOtSettings = {
            ...this.getDefaultOrgSettings(orgId),
            ...parsed,
            organizationId: orgId,
          };
          this.settingsCache.set(orgId, merged);
          return merged;
        }
      }
    } catch (_) {}

    const def = this.getDefaultOrgSettings(orgId);
    this.settingsCache.set(orgId, def);
    return def;
  }

  public async saveOrgSettings(
    orgId: string,
    patch: Partial<OrganizationOtSettings>,
    actorId?: string
  ): Promise<OrganizationOtSettings> {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    const current = this.getOrgSettings(orgId);
    const updated: OrganizationOtSettings = {
      ...current,
      ...patch,
      organizationId: orgId,
      updatedBy: actorId || current.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    this.settingsCache.set(orgId, updated);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX_SETTINGS}${orgId}`, JSON.stringify(updated));
      }
    } catch (_) {}

    if (isSupabaseEnabled && orgId.length === 36) {
      try {
        await supabase.from('organization_ot_settings').upsert({
          organization_id: orgId,
          ot_enabled: updated.otEnabled,
          ot_mode: updated.otMode,
          approval_workflow: updated.approvalWorkflow,
          allow_self_approval: updated.allowSelfApproval,
          allow_employee_exceptions: updated.allowEmployeeExceptions,
          payroll_integration_enabled: updated.payrollIntegrationEnabled,
          default_daily_threshold_minutes: updated.defaultDailyThresholdMinutes,
          default_weekly_threshold_minutes: updated.defaultWeeklyThresholdMinutes,
          updated_by: updated.updatedBy || null,
          updated_at: updated.updatedAt,
        });
      } catch (err) {
        console.warn('[TenantOtEngine] Supabase settings upsert error:', err);
      }
    }

    hrEventBus.emit('attendance.policy_updated', { organizationId: orgId, settings: updated });
    return updated;
  }

  // ==========================================================================
  // 2. TENANT POLICY RULES (CRUD & HIERARCHY)
  // ==========================================================================

  public getPolicies(orgId: string): TenantOtPolicyRule[] {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    if (this.policiesCache.has(orgId)) {
      return this.policiesCache.get(orgId)!;
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_PREFIX_POLICIES}${orgId}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            this.policiesCache.set(orgId, list);
            return list;
          }
        }
      }
    } catch (_) {}

    // Initial empty list for clean tenant isolation
    const initialList: TenantOtPolicyRule[] = [];
    this.policiesCache.set(orgId, initialList);
    return initialList;
  }

  public async savePolicyRule(
    orgId: string,
    policy: Omit<TenantOtPolicyRule, 'id' | 'organizationId' | 'updatedAt'> & { id?: string },
    actorId?: string
  ): Promise<TenantOtPolicyRule> {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    const existingPolicies = this.getPolicies(orgId);
    const policyId = policy.id || `pol_rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullPolicy: TenantOtPolicyRule = {
      ...policy,
      id: policyId,
      organizationId: orgId,
      policyVersion: (policy.policyVersion || 0) + 1,
      updatedBy: actorId,
      updatedAt: new Date().toISOString(),
    };

    const nextList = existingPolicies.filter((p) => p.id !== policyId).concat(fullPolicy);
    this.policiesCache.set(orgId, nextList);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX_POLICIES}${orgId}`, JSON.stringify(nextList));
      }
    } catch (_) {}

    if (isSupabaseEnabled && orgId.length === 36) {
      try {
        await supabase.from('ot_policy_rules').upsert({
          id: fullPolicy.id.includes('-') && fullPolicy.id.length === 36 ? fullPolicy.id : undefined,
          organization_id: orgId,
          policy_name: fullPolicy.policyName,
          policy_version: fullPolicy.policyVersion,
          scope_level: fullPolicy.scopeLevel,
          scope_target_id: fullPolicy.scopeTargetId || null,
          scope_target_name: fullPolicy.scopeTargetName || null,
          is_active: fullPolicy.isActive,
          effective_from: fullPolicy.effectiveFrom,
          effective_to: fullPolicy.effectiveTo || null,
          daily_ot_threshold_minutes: fullPolicy.dailyOtThresholdMinutes,
          weekly_ot_threshold_minutes: fullPolicy.weeklyOtThresholdMinutes,
          min_ot_threshold_minutes: fullPolicy.minOtThresholdMinutes,
          max_ot_minutes_per_day: fullPolicy.maxOtMinutesPerDay,
          max_ot_minutes_per_week: fullPolicy.maxOtMinutesPerWeek,
          monthly_statutory_ot_cap_hours: fullPolicy.monthlyStatutoryOtCapHours,
          day_shift_break_minutes: fullPolicy.dayShiftBreakMinutes,
          night_shift_break_minutes: fullPolicy.nightShiftBreakMinutes,
          break_deduction_after_minutes: fullPolicy.breakDeductionAfterMinutes,
          rounding_rule: fullPolicy.roundingRule,
          pre_shift_ot_enabled: fullPolicy.preShiftOtEnabled,
          post_shift_ot_enabled: fullPolicy.postShiftOtEnabled,
          holiday_ot_rule: fullPolicy.holidayOtRule,
          weekly_off_ot_rule: fullPolicy.weeklyOffOtRule,
          regular_multiplier: fullPolicy.regularMultiplier,
          weekend_multiplier: fullPolicy.weekendMultiplier,
          holiday_multiplier: fullPolicy.holidayMultiplier,
          night_multiplier: fullPolicy.nightMultiplier,
          night_window_start: fullPolicy.nightWindowStart,
          night_window_end: fullPolicy.nightWindowEnd,
          applicable_departments: fullPolicy.applicableDepartments || [],
          applicable_designations: fullPolicy.applicableDesignations || [],
          applicable_employee_groups: fullPolicy.applicableEmployeeGroups || [],
          applicable_shifts: fullPolicy.applicableShifts || [],
          payroll_integration_enabled: fullPolicy.payrollIntegrationEnabled,
          updated_at: fullPolicy.updatedAt,
        });
      } catch (err) {
        console.warn('[TenantOtEngine] Supabase policy upsert error:', err);
      }
    }

    return fullPolicy;
  }

  public async deletePolicyRule(orgId: string, policyId: string): Promise<boolean> {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    const existing = this.getPolicies(orgId);
    const filtered = existing.filter((p) => p.id !== policyId);
    this.policiesCache.set(orgId, filtered);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX_POLICIES}${orgId}`, JSON.stringify(filtered));
      }
    } catch (_) {}

    if (isSupabaseEnabled && orgId.length === 36 && policyId.length === 36) {
      try {
        await supabase
          .from('ot_policy_rules')
          .delete()
          .eq('organization_id', orgId)
          .eq('id', policyId);
      } catch (_) {}
    }

    return true;
  }

  // ==========================================================================
  // 3. DETERMINISTIC POLICY RESOLUTION WITH CONFLICT DETECTION
  // ==========================================================================

  /**
   * Resolves the single applicable policy based on strict precedence:
   * 1. Employee Exception (Level 5) - only if allowed in org settings
   * 2. Shift Policy (Level 4)
   * 3. Employee Group Policy (Level 3)
   * 4. Department Policy (Level 2)
   * 5. Org Default Policy (Level 1)
   *
   * If two policies match at the same highest level, a CONFLICT is detected and returned.
   */
  public resolvePolicy(
    context: EmployeeEvaluationContext,
    attendanceDate: string
  ): {
    matchedPolicy: TenantOtPolicyRule | null;
    scopeLevel: OtPolicyScopeLevel | null;
    hasConflict: boolean;
    conflictingPolicies: TenantOtPolicyRule[];
    isPolicyMissing: boolean;
  } {
    const orgSettings = this.getOrgSettings(context.organizationId);
    const allPolicies = this.getPolicies(context.organizationId);

    // Filter active policies aware of effective dates
    const activePolicies = allPolicies.filter((p) => {
      if (!p.isActive) return false;
      if (p.effectiveFrom && p.effectiveFrom > attendanceDate) return false;
      if (p.effectiveTo && p.effectiveTo < attendanceDate) return false;
      return true;
    });

    const scopeRank: Record<OtPolicyScopeLevel, number> = {
      EMPLOYEE_EXCEPTION: 5,
      SHIFT: 4,
      EMPLOYEE_GROUP: 3,
      DEPARTMENT: 2,
      ORG_DEFAULT: 1,
    };

    // Filter policies that match employee context
    const matching = activePolicies.filter((p) => {
      // Employee Exception check
      if (p.scopeLevel === 'EMPLOYEE_EXCEPTION') {
        if (!orgSettings.allowEmployeeExceptions) return false;
        return p.scopeTargetId === context.employeeId;
      }

      // Shift check
      if (p.scopeLevel === 'SHIFT') {
        if (p.scopeTargetId && context.shiftId && p.scopeTargetId === context.shiftId) return true;
        if (p.applicableShifts && p.applicableShifts.length > 0 && context.shiftId) {
          return p.applicableShifts.includes(context.shiftId) || (context.shiftName ? p.applicableShifts.includes(context.shiftName) : false);
        }
        return false;
      }

      // Employee Group check
      if (p.scopeLevel === 'EMPLOYEE_GROUP') {
        if (p.scopeTargetId && context.employeeGroupId && p.scopeTargetId === context.employeeGroupId) return true;
        if (p.applicableEmployeeGroups && p.applicableEmployeeGroups.length > 0 && context.employeeGroupId) {
          return p.applicableEmployeeGroups.includes(context.employeeGroupId);
        }
        return false;
      }

      // Department check
      if (p.scopeLevel === 'DEPARTMENT') {
        if (p.scopeTargetId && context.departmentId && p.scopeTargetId === context.departmentId) return true;
        if (p.applicableDepartments && p.applicableDepartments.length > 0) {
          const matchId = context.departmentId ? p.applicableDepartments.includes(context.departmentId) : false;
          const matchName = context.departmentName ? p.applicableDepartments.includes(context.departmentName) : false;
          return matchId || matchName;
        }
        return false;
      }

      // Org Default check
      if (p.scopeLevel === 'ORG_DEFAULT') {
        // Also check if any secondary filters restrict this default
        if (p.applicableDepartments?.length && context.departmentId && !p.applicableDepartments.includes(context.departmentId)) return false;
        if (p.applicableDesignations?.length && context.designationId && !p.applicableDesignations.includes(context.designationId)) return false;
        if (p.applicableShifts?.length && context.shiftId && !p.applicableShifts.includes(context.shiftId)) return false;
        return true;
      }

      return false;
    });

    if (matching.length === 0) {
      return {
        matchedPolicy: null,
        scopeLevel: null,
        hasConflict: false,
        conflictingPolicies: [],
        isPolicyMissing: true,
      };
    }

    // Find highest rank present
    let highestRank = 0;
    matching.forEach((m) => {
      const r = scopeRank[m.scopeLevel] || 0;
      if (r > highestRank) highestRank = r;
    });

    const highestCandidates = matching.filter((m) => scopeRank[m.scopeLevel] === highestRank);

    if (highestCandidates.length > 1) {
      // Conflict! Do not arbitrarily pick.
      return {
        matchedPolicy: null,
        scopeLevel: highestCandidates[0].scopeLevel,
        hasConflict: true,
        conflictingPolicies: highestCandidates,
        isPolicyMissing: false,
      };
    }

    return {
      matchedPolicy: highestCandidates[0],
      scopeLevel: highestCandidates[0].scopeLevel,
      hasConflict: false,
      conflictingPolicies: [],
      isPolicyMissing: false,
    };
  }

  // ==========================================================================
  // 4. CORE CALCULATION ENGINE (MODES A, B, C, D)
  // ==========================================================================

  public calculateOvertime(
    context: EmployeeEvaluationContext,
    input: AttendanceEvaluationInput
  ): TenantOtCalculationResult {
    const orgSettings = this.getOrgSettings(context.organizationId);
    const { attendanceDate, checkInMinutes, checkOutMinutes, expectedInMinutes, expectedOutMinutes } = input;

    // Normalizing scheduled shift duration (handles cross-midnight)
    const isOvernightShift = expectedOutMinutes < expectedInMinutes;
    const scheduledShiftDuration = isOvernightShift
      ? 1440 - expectedInMinutes + expectedOutMinutes
      : expectedOutMinutes - expectedInMinutes;

    // Actual duration worked
    let grossMinutes = 0;
    if (checkInMinutes !== null && checkOutMinutes !== null) {
      if (checkOutMinutes >= checkInMinutes) {
        grossMinutes = checkOutMinutes - checkInMinutes;
      } else {
        grossMinutes = 1440 - checkInMinutes + checkOutMinutes;
      }
    }

    // Early arrival (pre-shift)
    let preShiftMinutes = 0;
    if (checkInMinutes !== null) {
      if (checkInMinutes < expectedInMinutes) {
        let diff = expectedInMinutes - checkInMinutes;
        if (isOvernightShift && diff < -720) diff += 1440;
        if (diff > 720) diff -= 1440;
        if (diff > 0) preShiftMinutes = diff;
      }
    }

    // Post-shift worked
    let postShiftMinutes = 0;
    if (checkInMinutes !== null && checkOutMinutes !== null) {
      let normOut = checkOutMinutes;
      if (checkOutMinutes < checkInMinutes) normOut += 1440;
      let normExpOut = expectedOutMinutes;
      if (isOvernightShift && expectedOutMinutes < expectedInMinutes) normExpOut += 1440;

      if (normOut > normExpOut) {
        postShiftMinutes = normOut - normExpOut;
      }
    }

    // Evidence container initialized
    const notes: string[] = [];
    const evidence: TenantOtCalculationEvidence = {
      organizationId: context.organizationId,
      employeeId: context.employeeId,
      attendanceDate,
      shiftId: context.shiftId,
      shiftName: context.shiftName,
      scheduledStartMinutes: expectedInMinutes,
      scheduledEndMinutes: expectedOutMinutes,
      scheduledDurationMinutes: scheduledShiftDuration,
      actualCheckInMinutes: checkInMinutes,
      actualCheckOutMinutes: checkOutMinutes,
      grossMinutes,
      breakMinutesDeducted: 0,
      netWorkMinutes: grossMinutes,
      isOvernightShift,
      isWeeklyOff: !!input.isWeeklyOff,
      isHoliday: !!input.isHoliday,
      preShiftMinutes,
      postShiftMinutes,
      unroundedOtMinutes: 0,
      roundedOtMinutes: 0,
      cappedOtMinutes: 0,
      notes,
    };

    // ────────────────────────────────────────────────────────────────────────
    // MODE D: OT DISABLED
    // ────────────────────────────────────────────────────────────────────────
    if (!orgSettings.otEnabled || orgSettings.otMode === 'DISABLED') {
      notes.push('Overtime module is disabled for this organization. Standard attendance preserved.');
      return {
        organizationId: context.organizationId,
        employeeId: context.employeeId,
        attendanceDate,
        mode: 'DISABLED',
        status: 'APPROVED',
        calculatedMinutes: 0,
        approvedMinutes: 0,
        evidence,
        hasConflict: false,
        isPolicyMissing: false,
        isEligibleForPayroll: false,
        reason: 'OT_DISABLED_BY_TENANT_POLICY',
      };
    }

    // Policy Resolution
    const resolution = this.resolvePolicy(context, attendanceDate);

    // ────────────────────────────────────────────────────────────────────────
    // CONFLICT RESOLUTION
    // ────────────────────────────────────────────────────────────────────────
    if (resolution.hasConflict) {
      notes.push(
        `POLICY CONFLICT: Multiple conflicting policies found at ${resolution.scopeLevel} scope (${resolution.conflictingPolicies.map((p) => p.policyName).join(', ')}). Requires HR resolution.`
      );
      evidence.conflictingPolicyIds = resolution.conflictingPolicies.map((p) => p.id);
      return {
        organizationId: context.organizationId,
        employeeId: context.employeeId,
        attendanceDate,
        mode: orgSettings.otMode,
        status: 'CONFLICT',
        calculatedMinutes: 0,
        approvedMinutes: 0,
        scopeLevel: resolution.scopeLevel || undefined,
        evidence,
        hasConflict: true,
        isPolicyMissing: false,
        isEligibleForPayroll: false,
        reason: 'MULTIPLE_CONFLICTING_POLICIES',
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // MODE B / NO-POLICY FALLBACK: HR_VERIFIED
    // ────────────────────────────────────────────────────────────────────────
    if (orgSettings.otMode === 'HR_VERIFIED' || resolution.isPolicyMissing) {
      // Calculate daily potential OT based on verified attendance and scheduled shift duration
      const breakDed = input.breakMinutes ?? 0;
      evidence.breakMinutesDeducted = breakDed;
      const netMinutes = Math.max(0, grossMinutes - breakDed);
      evidence.netWorkMinutes = netMinutes;

      const baseThreshold = orgSettings.defaultDailyThresholdMinutes || scheduledShiftDuration || 480;
      let potentialOt = 0;
      if (checkOutMinutes !== null && netMinutes > baseThreshold) {
        potentialOt = netMinutes - baseThreshold;
      }

      evidence.unroundedOtMinutes = potentialOt;
      evidence.roundedOtMinutes = potentialOt;
      evidence.cappedOtMinutes = potentialOt;

      notes.push(
        resolution.isPolicyMissing
          ? 'POLICY NOT CONFIGURED: Potential OT calculated from shift duration. Queued for HR verification; no payroll rate guessed.'
          : 'HR-VERIFIED MODE: Potential OT calculated; pending explicit HR verification & approval.'
      );

      return {
        organizationId: context.organizationId,
        employeeId: context.employeeId,
        attendanceDate,
        mode: 'HR_VERIFIED',
        status: 'PENDING_HR_REVIEW',
        calculatedMinutes: potentialOt,
        approvedMinutes: 0, // Must not guess or approve automatically
        evidence,
        hasConflict: false,
        isPolicyMissing: resolution.isPolicyMissing,
        isEligibleForPayroll: false, // Not eligible until HR approves!
        reason: resolution.isPolicyMissing ? 'POLICY_NOT_CONFIGURED' : 'PENDING_HR_VERIFICATION',
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // MODE A: POLICY-BASED OT (Valid Policy Found)
    // ────────────────────────────────────────────────────────────────────────
    const policy = resolution.matchedPolicy!;
    evidence.appliedPolicyId = policy.id;
    evidence.appliedPolicyName = policy.policyName;
    evidence.appliedPolicyVersion = policy.policyVersion;
    evidence.appliedScopeLevel = policy.scopeLevel;

    // Break deduction
    const configuredBreak = isOvernightShift
      ? policy.nightShiftBreakMinutes
      : policy.dayShiftBreakMinutes;
    const effectiveBreak = grossMinutes >= policy.breakDeductionAfterMinutes ? configuredBreak : 0;
    evidence.breakMinutesDeducted = effectiveBreak;
    const netMinutes = Math.max(0, grossMinutes - effectiveBreak);
    evidence.netWorkMinutes = netMinutes;

    // Base threshold for OT
    const baseThreshold = scheduledShiftDuration > 0
      ? Math.max(0, scheduledShiftDuration - effectiveBreak)
      : policy.dailyOtThresholdMinutes;

    let unroundedOt = 0;

    // Special Days Evaluation (Holidays / Weekly-Offs)
    if (input.isHoliday) {
      if (policy.holidayOtRule === 'OT_ONLY' || policy.holidayOtRule === 'OT_AND_COMP_OFF') {
        unroundedOt = netMinutes;
      }
    } else if (input.isWeeklyOff) {
      if (policy.weeklyOffOtRule === 'OT_ONLY' || policy.weeklyOffOtRule === 'OT_AND_COMP_OFF') {
        unroundedOt = netMinutes;
      }
    } else {
      // Regular Workday
      if (checkOutMinutes !== null) {
        if (policy.postShiftOtEnabled && netMinutes >= baseThreshold + policy.minOtThresholdMinutes) {
          unroundedOt = netMinutes - baseThreshold;
        }
        if (policy.preShiftOtEnabled && preShiftMinutes >= policy.minOtThresholdMinutes) {
          unroundedOt = Math.max(unroundedOt, unroundedOt + preShiftMinutes);
        }
      } else if (checkInMinutes !== null && policy.preShiftOtEnabled) {
        if (preShiftMinutes >= policy.minOtThresholdMinutes) {
          unroundedOt = preShiftMinutes;
        }
      }
    }

    evidence.unroundedOtMinutes = unroundedOt;

    // Rounding rules
    let roundedOt = unroundedOt;
    if (policy.roundingRule === 'NEAREST_15_MIN') {
      roundedOt = Math.round(unroundedOt / 15) * 15;
    } else if (policy.roundingRule === 'NEAREST_30_MIN') {
      roundedOt = Math.round(unroundedOt / 30) * 30;
    } else if (policy.roundingRule === 'ROUND_DOWN') {
      roundedOt = Math.floor(unroundedOt / 30) * 30;
    } else if (policy.roundingRule === 'ROUND_UP') {
      roundedOt = Math.ceil(unroundedOt / 15) * 15;
    }

    evidence.roundedOtMinutes = roundedOt;

    // Capping daily OT
    let cappedOt = Math.min(roundedOt, policy.maxOtMinutesPerDay);
    evidence.cappedOtMinutes = cappedOt;

    // ────────────────────────────────────────────────────────────────────────
    // MODE C: TRACKING ONLY
    // ────────────────────────────────────────────────────────────────────────
    if (orgSettings.otMode === 'TRACKING_ONLY') {
      notes.push('TRACKING ONLY MODE: Hours recorded for operational intelligence. No payroll payout generated.');
      return {
        organizationId: context.organizationId,
        employeeId: context.employeeId,
        attendanceDate,
        mode: 'TRACKING_ONLY',
        status: 'APPROVED',
        calculatedMinutes: cappedOt,
        approvedMinutes: cappedOt,
        policyId: policy.id,
        policyName: policy.policyName,
        scopeLevel: policy.scopeLevel,
        evidence,
        hasConflict: false,
        isPolicyMissing: false,
        isEligibleForPayroll: false, // Never eligible for payroll in Mode C
        reason: 'TRACKING_ONLY_MODE',
      };
    }

    // Default Mode A Workflow status
    const initialStatus: OtRecordStatus =
      orgSettings.approvalWorkflow === 'SINGLE_APPROVER' || orgSettings.approvalWorkflow === 'HR_ONLY'
        ? 'PENDING_HR_REVIEW'
        : 'PENDING_MANAGER_REVIEW';

    return {
      organizationId: context.organizationId,
      employeeId: context.employeeId,
      attendanceDate,
      mode: 'POLICY_BASED',
      status: initialStatus,
      calculatedMinutes: cappedOt,
      approvedMinutes: 0, // Requires explicit approval step before payout
      policyId: policy.id,
      policyName: policy.policyName,
      scopeLevel: policy.scopeLevel,
      evidence,
      hasConflict: false,
      isPolicyMissing: false,
      isEligibleForPayroll: orgSettings.payrollIntegrationEnabled && policy.payrollIntegrationEnabled,
      reason: 'POLICY_CALCULATED_PENDING_APPROVAL',
    };
  }

  // ==========================================================================
  // 5. HR APPROVAL WORKFLOW & ADJUSTMENTS (WITH AUDIT TRAIL)
  // ==========================================================================

  public async processApprovalAction(
    orgId: string,
    action: TenantOtApprovalAction
  ): Promise<{ success: boolean; message: string; record?: any }> {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    const settings = this.getOrgSettings(orgId);

    // Self-approval security check
    const records = this.getRecordsMap(orgId);
    const existing = records.get(action.recordId);
    if (!existing) {
      return { success: false, message: `Overtime record ${action.recordId} not found.` };
    }

    if (!settings.allowSelfApproval && existing.employeeId === action.actorId) {
      return {
        success: false,
        message: 'Tenant security violation: Self-approval of overtime is prohibited by organization policy.',
      };
    }

    // Mandatory adjustment reason check
    if (action.action === 'ADJUST' && (!action.adjustmentReason || !action.adjustmentReason.trim())) {
      return {
        success: false,
        message: 'Mandatory adjustment reason is required when altering overtime hours.',
      };
    }

    let nextStatus: OtRecordStatus = existing.status;
    let nextApprovedMinutes = existing.approvedMinutes || 0;

    if (action.action === 'APPROVE') {
      nextStatus = 'APPROVED';
      nextApprovedMinutes = existing.calculatedMinutes;
    } else if (action.action === 'REJECT') {
      nextStatus = 'REJECTED';
      nextApprovedMinutes = 0;
    } else if (action.action === 'ADJUST') {
      nextStatus = 'APPROVED';
      nextApprovedMinutes = action.adjustedMinutes ?? existing.calculatedMinutes;
    }

    const history = existing.approvalHistory || [];
    history.push({
      ...action,
      previousStatus: existing.status,
      newStatus: nextStatus,
      timestamp: new Date().toISOString(),
    });

    const updatedRecord = {
      ...existing,
      status: nextStatus,
      approvedMinutes: nextApprovedMinutes,
      adjustmentReason: action.adjustmentReason || existing.adjustmentReason,
      approvalHistory: history,
      updatedAt: new Date().toISOString(),
    };

    records.set(action.recordId, updatedRecord);
    this.persistRecords(orgId);

    // Sync to Supabase
    if (isSupabaseEnabled && orgId.length === 36 && action.recordId.length === 36) {
      try {
        await supabase
          .from('overtime_records')
          .update({
            status: nextStatus === 'APPROVED' ? 'APPROVED' : nextStatus === 'REJECTED' ? 'REJECTED' : 'PENDING',
            approved_hours: Math.round((nextApprovedMinutes / 60) * 100) / 100,
            approved_by: action.actorId.length === 36 ? action.actorId : null,
            approved_at: new Date().toISOString(),
            payroll_eligible: nextStatus === 'APPROVED' && settings.payrollIntegrationEnabled,
            ot_status: nextStatus,
            approved_minutes: nextApprovedMinutes,
            adjustment_reason: action.adjustmentReason || null,
            approval_history: history,
          })
          .eq('organization_id', orgId)
          .eq('id', action.recordId);
      } catch (err) {
        console.warn('[TenantOtEngine] Supabase approval update notice:', err);
      }
    }

    hrEventBus.emit('attendance.overtime_approved', {
      organizationId: orgId,
      recordId: action.recordId,
      approvedMinutes: nextApprovedMinutes,
      status: nextStatus,
    });

    return {
      success: true,
      message: `Overtime record ${action.recordId} successfully ${nextStatus.toLowerCase()}.`,
      record: updatedRecord,
    };
  }

  // ==========================================================================
  // 6. MULTI-TENANT OT RECORD STORAGE & QUERIES
  // ==========================================================================

  private getRecordsMap(orgId: string): Map<string, any> {
    if (this.recordsCache.has(orgId)) {
      return this.recordsCache.get(orgId)!;
    }

    const map = new Map<string, any>();
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_PREFIX_RECORDS}${orgId}`);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach((r) => map.set(r.id, r));
          }
        }
      }
    } catch (_) {}

    this.recordsCache.set(orgId, map);
    return map;
  }

  private persistRecords(orgId: string): void {
    const map = this.recordsCache.get(orgId);
    if (!map) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `${STORAGE_PREFIX_RECORDS}${orgId}`,
          JSON.stringify(Array.from(map.values()))
        );
      }
    } catch (_) {}
  }

  public recordDailyOvertime(orgId: string, result: TenantOtCalculationResult): any {
    if (!orgId) throw new Error('[TenantOtEngine] organizationId is required');
    const records = this.getRecordsMap(orgId);
    const recordId = `ot_rec_${result.employeeId}_${result.attendanceDate}`;

    const record = {
      id: recordId,
      organizationId: orgId,
      employeeId: result.employeeId,
      attendanceDate: result.attendanceDate,
      mode: result.mode,
      status: result.status,
      calculatedMinutes: result.calculatedMinutes,
      approvedMinutes: result.approvedMinutes,
      policyId: result.policyId,
      policyName: result.policyName,
      scopeLevel: result.scopeLevel,
      evidence: result.evidence,
      hasConflict: result.hasConflict,
      isPolicyMissing: result.isPolicyMissing,
      isEligibleForPayroll: result.isEligibleForPayroll,
      reason: result.reason,
      approvalHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    records.set(recordId, record);
    this.persistRecords(orgId);
    return record;
  }

  public getOvertimeRecords(
    filter: TenantOtReportFilter
  ): { records: any[]; summary: TenantOtReportSummary } {
    const recordsMap = this.getRecordsMap(filter.organizationId);
    const list = Array.from(recordsMap.values());

    const filtered = list.filter((r) => {
      if (r.attendanceDate < filter.startDate || r.attendanceDate > filter.endDate) return false;
      if (filter.status && filter.status !== 'ALL' && r.status !== filter.status) return false;
      if (filter.department && filter.department !== 'ALL' && r.evidence?.departmentName !== filter.department) return false;
      if (filter.shift && filter.shift !== 'ALL' && r.evidence?.shiftName !== filter.shift) return false;
      if (filter.employeeQuery) {
        const q = filter.employeeQuery.toLowerCase();
        const empId = (r.employeeId || '').toLowerCase();
        const empName = (r.evidence?.employeeName || '').toLowerCase();
        if (!empId.includes(q) && !empName.includes(q)) return false;
      }
      return true;
    });

    let totalCalculatedHours = 0;
    let totalApprovedHours = 0;
    let totalPendingHours = 0;
    let totalRejectedHours = 0;
    let totalPayrollProcessedHours = 0;
    let pendingReviewCount = 0;
    let policyMissingCount = 0;
    let policyConflictCount = 0;
    let shiftMissingCount = 0;
    let approvedCount = 0;

    filtered.forEach((r) => {
      const calcH = (r.calculatedMinutes || 0) / 60;
      const apprH = (r.approvedMinutes || 0) / 60;
      totalCalculatedHours += calcH;

      if (r.status === 'APPROVED') {
        totalApprovedHours += apprH;
        approvedCount++;
      } else if (r.status === 'PENDING_HR_REVIEW' || r.status === 'PENDING_MANAGER_REVIEW') {
        totalPendingHours += calcH;
        pendingReviewCount++;
      } else if (r.status === 'REJECTED') {
        totalRejectedHours += calcH;
      } else if (r.status === 'PAYROLL_PROCESSED') {
        totalPayrollProcessedHours += apprH;
      }

      if (r.isPolicyMissing) policyMissingCount++;
      if (r.hasConflict) policyConflictCount++;
      if (!r.evidence?.shiftId && !r.evidence?.shiftName) shiftMissingCount++;
    });

    const summary: TenantOtReportSummary = {
      organizationId: filter.organizationId,
      startDate: filter.startDate,
      endDate: filter.endDate,
      totalCalculatedHours: Math.round(totalCalculatedHours * 100) / 100,
      totalApprovedHours: Math.round(totalApprovedHours * 100) / 100,
      totalPendingHours: Math.round(totalPendingHours * 100) / 100,
      totalRejectedHours: Math.round(totalRejectedHours * 100) / 100,
      totalPayrollProcessedHours: Math.round(totalPayrollProcessedHours * 100) / 100,
      recordsCount: filtered.length,
      pendingReviewCount,
      policyMissingCount,
      policyConflictCount,
      shiftMissingCount,
      approvedCount,
    };

    return { records: filtered, summary };
  }

  // ==========================================================================
  // 7. PLATFORM SUPER ADMIN SAAS GOVERNANCE
  // ==========================================================================

  public getPlatformAdminOrgHealth(orgId: string): {
    organizationId: string;
    otEnabled: boolean;
    otMode: TenantOtMode;
    policyConfigured: boolean;
    policiesCount: number;
    activePoliciesCount: number;
    pendingReviewCount: number;
    conflictCount: number;
    moduleHealth: 'HEALTHY' | 'ACTION_REQUIRED' | 'DISABLED';
  } {
    const settings = this.getOrgSettings(orgId);
    const policies = this.getPolicies(orgId);
    const active = policies.filter((p) => p.isActive);
    const records = Array.from(this.getRecordsMap(orgId).values());

    const pendingReviewCount = records.filter(
      (r) => r.status === 'PENDING_HR_REVIEW' || r.status === 'PENDING_MANAGER_REVIEW'
    ).length;
    const conflictCount = records.filter((r) => r.status === 'CONFLICT').length;

    let moduleHealth: 'HEALTHY' | 'ACTION_REQUIRED' | 'DISABLED' = 'HEALTHY';
    if (!settings.otEnabled || settings.otMode === 'DISABLED') {
      moduleHealth = 'DISABLED';
    } else if (conflictCount > 0 || (settings.otMode === 'POLICY_BASED' && active.length === 0)) {
      moduleHealth = 'ACTION_REQUIRED';
    }

    return {
      organizationId: orgId,
      otEnabled: settings.otEnabled,
      otMode: settings.otMode,
      policyConfigured: active.length > 0,
      policiesCount: policies.length,
      activePoliciesCount: active.length,
      pendingReviewCount,
      conflictCount,
      moduleHealth,
    };
  }
}

export const tenantOvertimeEngineService = new TenantOvertimeEngineService();
