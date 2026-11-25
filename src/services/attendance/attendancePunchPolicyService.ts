// src/services/attendance/attendancePunchPolicyService.ts
// ============================================================================
// Joy PeopleHR — Organization Punch Policy & Attendance Mode Service
// Allows runtime toggling of Mobile Check-In / Check-Out & Biometric-Only mode
// without code changes. Syncs directly with Supabase public.organizations table.
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';

export type AttendanceMode = 'BIOMETRIC_ONLY' | 'MOBILE_ONLY' | 'HYBRID';

export interface OrgPunchPolicy {
  id: string;
  legal_name: string;
  slug: string;
  attendance_mode: AttendanceMode;
  mobile_punch_enabled: boolean;
  allow_mobile_checkin: boolean;
  allow_mobile_checkout: boolean;
  updated_at?: string;
  employee_count?: number;
}

const DEFAULT_POLICIES: OrgPunchPolicy[] = [
  {
    id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
    legal_name: 'Electra EV',
    slug: 'electra-ev',
    attendance_mode: 'BIOMETRIC_ONLY',
    mobile_punch_enabled: false,
    allow_mobile_checkin: false,
    allow_mobile_checkout: false,
  },
  {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    legal_name: 'Joy Corporate Solutions Private Limited',
    slug: 'joy-corp',
    attendance_mode: 'HYBRID',
    mobile_punch_enabled: true,
    allow_mobile_checkin: true,
    allow_mobile_checkout: true,
  },
];

const LOCAL_STORAGE_KEY = 'joy_org_punch_policies_cache';

class AttendancePunchPolicyService {
  private cache: Map<string, OrgPunchPolicy> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OrgPunchPolicy[];
        parsed.forEach(p => this.cache.set(p.id, p));
      }
    } catch (e) {
      console.warn('[PunchPolicy] Could not read cache from localStorage', e);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.cache.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[PunchPolicy] Could not write cache to localStorage', e);
    }
  }

  /**
   * Fetch all organizations and their attendance mode & mobile punch policies.
   */
  async fetchAllPolicies(): Promise<OrgPunchPolicy[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, legal_name, slug, attendance_mode, mobile_punch_enabled, allow_mobile_checkin, allow_mobile_checkout, updated_at')
          .order('legal_name', { ascending: true });

        if (!error && data && data.length > 0) {
          const policies: OrgPunchPolicy[] = data.map((row: any) => ({
            id: row.id,
            legal_name: row.legal_name || 'Organization',
            slug: row.slug || '',
            attendance_mode: (row.attendance_mode as AttendanceMode) || (row.mobile_punch_enabled ? 'HYBRID' : 'BIOMETRIC_ONLY'),
            mobile_punch_enabled: row.mobile_punch_enabled ?? true,
            allow_mobile_checkin: row.allow_mobile_checkin ?? true,
            allow_mobile_checkout: row.allow_mobile_checkout ?? true,
            updated_at: row.updated_at,
          }));

          policies.forEach(p => this.cache.set(p.id, p));
          this.saveToLocalStorage();
          return policies;
        }
      } catch (err) {
        console.warn('[PunchPolicy] Supabase query failed, falling back to cached/default policies:', err);
      }
    }

    if (this.cache.size > 0) {
      return Array.from(this.cache.values());
    }

    DEFAULT_POLICIES.forEach(p => this.cache.set(p.id, p));
    this.saveToLocalStorage();
    return DEFAULT_POLICIES;
  }

  /**
   * Update punch policy for a specific organization.
   */
  async updatePolicy(
    orgId: string,
    updates: Partial<Pick<OrgPunchPolicy, 'attendance_mode' | 'mobile_punch_enabled' | 'allow_mobile_checkin' | 'allow_mobile_checkout'>>
  ): Promise<OrgPunchPolicy> {
    const existing = this.cache.get(orgId) || DEFAULT_POLICIES.find(p => p.id === orgId) || {
      id: orgId,
      legal_name: 'Organization',
      slug: '',
      attendance_mode: 'HYBRID',
      mobile_punch_enabled: true,
      allow_mobile_checkin: true,
      allow_mobile_checkout: true,
    };

    // If attendance_mode is set to BIOMETRIC_ONLY, auto-enforce mobile toggles to false
    let finalMobileEnabled = updates.mobile_punch_enabled ?? existing.mobile_punch_enabled;
    let finalAllowCheckin = updates.allow_mobile_checkin ?? existing.allow_mobile_checkin;
    let finalAllowCheckout = updates.allow_mobile_checkout ?? existing.allow_mobile_checkout;
    const finalMode = updates.attendance_mode ?? existing.attendance_mode;

    if (finalMode === 'BIOMETRIC_ONLY') {
      finalMobileEnabled = false;
      finalAllowCheckin = false;
      finalAllowCheckout = false;
    } else if (finalMode === 'MOBILE_ONLY' || finalMode === 'HYBRID') {
      if (updates.mobile_punch_enabled === undefined && !finalMobileEnabled) {
        finalMobileEnabled = true;
      }
      if (updates.allow_mobile_checkin === undefined && !finalAllowCheckin) {
        finalAllowCheckin = true;
      }
      if (updates.allow_mobile_checkout === undefined && !finalAllowCheckout) {
        finalAllowCheckout = true;
      }
    }

    const payload = {
      attendance_mode: finalMode,
      mobile_punch_enabled: finalMobileEnabled,
      allow_mobile_checkin: finalAllowCheckin,
      allow_mobile_checkout: finalAllowCheckout,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      const { error } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', orgId);

      if (error) {
        console.error('[PunchPolicy] Failed to update policy in Supabase:', error);
        throw new Error(error.message || 'Failed to update organization punch policy in database.');
      }
    }

    const updated: OrgPunchPolicy = {
      ...existing,
      ...payload,
    };

    this.cache.set(orgId, updated);
    this.saveToLocalStorage();

    // Broadcast update across the app
    hrEventBus.emit('ATTENDANCE_POLICY_UPDATED', { orgId, policy: updated });

    return updated;
  }

  /**
   * Quick synchronous getter from cache
   */
  getPolicySync(orgId: string): OrgPunchPolicy | undefined {
    return this.cache.get(orgId);
  }
}

export const attendancePunchPolicyService = new AttendancePunchPolicyService();

