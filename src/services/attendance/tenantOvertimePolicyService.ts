// src/services/attendance/tenantOvertimePolicyService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Multi-Tenant Overtime & Shift Break Policy Store
// Strictly isolated per organization_id. Replaces hardcoded thresholds with
// dynamic org-level configuration that takes immediate effect across
// Attendance Engine, Employee Attendance, Dashboard, Overtime Engine, & Reports.
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from './biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface TenantOvertimePolicyConfig {
  organizationId: string;
  policyName: string;

  // Core OT Thresholds & Caps
  dailyWorkThresholdMinutes: number; // e.g. 480 (8h)
  minOtThresholdMinutes: number;     // e.g. 30 (extra < 30m = 0m OT)
  maxOtMinutesPerDay: number;        // e.g. 480 (8h cap per shift)
  gracePeriodMinutes: number;        // e.g. 15m late/early grace
  monthlyStatutoryOtCapHours: number; // e.g. 20h statutory cap

  // Shift Break & Half-Day Rules
  dayShiftBreakMinutes: number;             // e.g. 30m strict lunch for Electra EV day/gen
  nightShiftBreakMinutes: number;           // e.g. 0m for Electra EV SHIFT-3 night shift
  dayShiftHalfDayThresholdMinutes: number;  // e.g. 240m (4h)
  nightShiftHalfDayThresholdMinutes: number;// e.g. 210m (3h 30m) for 7h night shift

  // OT Component Toggles
  preShiftOtEnabled: boolean;
  postShiftOtEnabled: boolean;

  // Multipliers & Night Window
  regularMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  nightMultiplier: number;
  nightWindowStart: string;
  nightWindowEnd: string;

  updatedAt: string;
}

const STORAGE_PREFIX = 'joy_tenant_ot_policy_v1_';

export function isElectraOrgId(orgId?: string): boolean {
  if (!orgId) return false;
  return (
    orgId === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' ||
    orgId === 'c0bbfb28-1500-4ebb-aba8-453b3681f342' ||
    orgId === 'org-electra-01'
  );
}

export function getDefaultTenantOvertimePolicy(orgId: string): TenantOvertimePolicyConfig {
  const isElectra = isElectraOrgId(orgId);
  return {
    organizationId: orgId,
    policyName: isElectra
      ? 'Electra EV Manufacturing Shift & OT Policy'
      : 'Standard Enterprise Overtime Policy',
    dailyWorkThresholdMinutes: 480,
    minOtThresholdMinutes: 30,
    maxOtMinutesPerDay: 480,
    gracePeriodMinutes: 15,
    monthlyStatutoryOtCapHours: 20,
    dayShiftBreakMinutes: isElectra ? 30 : 0,
    nightShiftBreakMinutes: 0,
    dayShiftHalfDayThresholdMinutes: 240,
    nightShiftHalfDayThresholdMinutes: isElectra ? 210 : 240,
    preShiftOtEnabled: true,
    postShiftOtEnabled: true,
    regularMultiplier: 1.5,
    weekendMultiplier: 2.0,
    holidayMultiplier: 2.0,
    nightMultiplier: 1.25,
    nightWindowStart: isElectra ? '23:00' : '22:00',
    nightWindowEnd: '06:00',
    updatedAt: new Date().toISOString(),
  };
}

class TenantOvertimePolicyService {
  private cache = new Map<string, TenantOvertimePolicyConfig>();

  getPolicySync(orgId?: string): TenantOvertimePolicyConfig {
    const targetOrg = orgId || getActiveOrgId();
    if (this.cache.has(targetOrg)) {
      return this.cache.get(targetOrg)!;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${targetOrg}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<TenantOvertimePolicyConfig>;
          const merged: TenantOvertimePolicyConfig = {
            ...getDefaultTenantOvertimePolicy(targetOrg),
            ...parsed,
            organizationId: targetOrg,
          };
          this.cache.set(targetOrg, merged);
          return merged;
        }
      }
    } catch (_) {}

    const def = getDefaultTenantOvertimePolicy(targetOrg);
    this.cache.set(targetOrg, def);
    return def;
  }

  async loadPolicyAsync(orgId?: string): Promise<TenantOvertimePolicyConfig> {
    const targetOrg = orgId || getActiveOrgId();
    if (isSupabaseEnabled && targetOrg && targetOrg !== 'platform-root' && targetOrg.length === 36) {
      try {
        const { data, error } = await supabase
          .from('attendance_policies')
          .select('*')
          .eq('organization_id', targetOrg)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const rules = (data as any).rules || (data as any).metadata || {};
          const merged: TenantOvertimePolicyConfig = {
            ...getDefaultTenantOvertimePolicy(targetOrg),
            ...(typeof rules === 'object' ? rules : {}),
            organizationId: targetOrg,
            dailyWorkThresholdMinutes: data.required_hours_per_day
              ? Math.round(Number(data.required_hours_per_day) * 60)
              : (rules.dailyWorkThresholdMinutes ?? 480),
            gracePeriodMinutes: data.late_grace_minutes ?? rules.gracePeriodMinutes ?? 15,
            minOtThresholdMinutes: data.overtime_min_minutes ?? rules.minOtThresholdMinutes ?? 30,
          };
          this.cache.set(targetOrg, merged);
          try {
            localStorage.setItem(`${STORAGE_PREFIX}${targetOrg}`, JSON.stringify(merged));
          } catch (_) {}
          return merged;
        }
      } catch (_) {}
    }
    return this.getPolicySync(targetOrg);
  }

  async savePolicyAsync(
    orgId: string,
    patch: Partial<TenantOvertimePolicyConfig>
  ): Promise<TenantOvertimePolicyConfig> {
    const targetOrg = orgId || getActiveOrgId();
    const current = this.getPolicySync(targetOrg);
    const updated: TenantOvertimePolicyConfig = {
      ...current,
      ...patch,
      organizationId: targetOrg,
      updatedAt: new Date().toISOString(),
    };

    this.cache.set(targetOrg, updated);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX}${targetOrg}`, JSON.stringify(updated));
      }
    } catch (_) {}

    // Persist to Supabase attendance_policies scoped to targetOrg (best-effort)
    if (isSupabaseEnabled && targetOrg && targetOrg.length === 36) {
      try {
        const { data: existing } = await supabase
          .from('attendance_policies')
          .select('id')
          .eq('organization_id', targetOrg)
          .limit(1)
          .maybeSingle();

        const dbPayload: any = {
          organization_id: targetOrg,
          name: updated.policyName,
          required_hours_per_day: Math.round((updated.dailyWorkThresholdMinutes / 60) * 100) / 100,
          late_grace_minutes: updated.gracePeriodMinutes,
          early_checkout_grace_minutes: updated.gracePeriodMinutes,
          half_day_hours_threshold: Math.round((updated.dayShiftHalfDayThresholdMinutes / 60) * 100) / 100,
          overtime_min_minutes: updated.minOtThresholdMinutes,
          updated_at: updated.updatedAt,
        };

        if (existing?.id) {
          await supabase.from('attendance_policies').update(dbPayload).eq('id', existing.id);
        } else {
          await supabase.from('attendance_policies').insert(dbPayload);
        }
      } catch (_) {}
    }

    // Broadcast live policy update across Attendance & Overtime modules
    hrEventBus.emit('attendance.policy_updated', { organizationId: targetOrg, policy: updated });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('work-overtime:updated', { detail: { organizationId: targetOrg } }));
    }

    return updated;
  }

  async resetToOrgDefaults(orgId?: string): Promise<TenantOvertimePolicyConfig> {
    const targetOrg = orgId || getActiveOrgId();
    const def = getDefaultTenantOvertimePolicy(targetOrg);
    return this.savePolicyAsync(targetOrg, def);
  }
}

export const tenantOvertimePolicyService = new TenantOvertimePolicyService();
