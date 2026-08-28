// src/services/billing/entitlementEngine.ts
// ============================================================
// Joy PeopleHR — Centralized Dynamic Entitlement Resolution Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export interface EntitlementCheckResult {
  enabled: boolean;
  limitValue: number | null;
  usageValue: number;
  remaining: number | null;
  source: string;
  expiresAt: string | null;
  featureName: string;
  isOverLimit: boolean;
}

export const entitlementEngine = {
  /**
   * Centralized entitlement check method.
   * Resolves: Organization -> Subscription -> Plan Features / Org Entitlements -> Access Result
   */
  async checkEntitlement(organizationId: string, featureCode: string): Promise<EntitlementCheckResult> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('organization_entitlements')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('feature_code', featureCode)
          .maybeSingle();

        if (data && !error) {
          const limit = data.limit_value !== null ? Number(data.limit_value) : null;
          const usage = Number(data.usage_value || 0);
          const remaining = limit !== null ? Math.max(0, limit - usage) : null;
          const isOverLimit = limit !== null ? usage >= limit : false;

          return {
            enabled: Boolean(data.enabled),
            limitValue: limit,
            usageValue: usage,
            remaining,
            source: data.source || 'Database Entitlement',
            expiresAt: data.effective_until,
            featureName: data.feature_name || featureCode,
            isOverLimit,
          };
        }
      } catch (err) {
        console.warn('[EntitlementEngine] Database entitlement lookup error:', err);
      }
    }

    // Default fallback if not found or offline:
    // Core features enabled by default; advanced features gated
    const isCore = featureCode.startsWith('core.') || featureCode === 'attendance.basic';
    return {
      enabled: isCore,
      limitValue: isCore ? 100 : null,
      usageValue: 0,
      remaining: isCore ? 100 : null,
      source: 'Default Base Policy',
      expiresAt: null,
      featureName: featureCode,
      isOverLimit: false,
    };
  },

  /**
   * Fetch all active entitlements for a given organization.
   */
  async getOrganizationEntitlements(organizationId: string) {
    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('organization_entitlements')
          .select('*')
          .eq('organization_id', organizationId);
        if (data) return data;
      } catch (err) {
        console.warn('[EntitlementEngine] Fetching all entitlements error:', err);
      }
    }
    return [];
  },
};
