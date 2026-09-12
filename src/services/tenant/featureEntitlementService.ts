// src/services/tenant/featureEntitlementService.ts
// ============================================================
// Joy PeopleHR — Tenant Feature Entitlement & Plan Guard Service
// Dynamically resolves module entitlements across UI, routes, and APIs
// ============================================================

import { getActiveOrgId } from '../attendance/biometricCommandService';

export type TenantFeatureKey =
  | 'recruitment'
  | 'performance'
  | 'lms'
  | 'analytics'
  | 'travel_expense'
  | 'ai_assistant'
  | 'biometric'
  | 'vendor_management';

const DEFAULT_FEATURE_ENTITLEMENTS: Record<TenantFeatureKey, boolean> = {
  recruitment: true,
  performance: true,
  lms: true,
  analytics: true,
  travel_expense: true,
  ai_assistant: true,
  biometric: true,
  vendor_management: true,
};

function getStorageKey(orgId: string): string {
  return `workforce_feature_entitlements_${orgId}`;
}

export const featureEntitlementService = {
  /**
   * Evaluates if a given feature is entitled and enabled for the active tenant.
   */
  canUseFeature(featureKey: TenantFeatureKey, explicitOrgId?: string): boolean {
    const orgId = explicitOrgId || getActiveOrgId();
    
    // 1. Check local tenant overrides
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(getStorageKey(orgId));
        if (raw) {
          const overrides = JSON.parse(raw);
          if (typeof overrides[featureKey] === 'boolean') {
            return overrides[featureKey];
          }
        }
      }
    } catch {
      // Fallback to default plan entitlement
    }

    // 2. Return plan default
    return DEFAULT_FEATURE_ENTITLEMENTS[featureKey] ?? true;
  },

  /**
   * Retrieves all feature entitlement flags for the tenant.
   */
  getTenantFeatures(explicitOrgId?: string): Record<TenantFeatureKey, boolean> {
    const orgId = explicitOrgId || getActiveOrgId();
    let overrides: Partial<Record<TenantFeatureKey, boolean>> = {};

    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(getStorageKey(orgId));
        if (raw) {
          overrides = JSON.parse(raw);
        }
      }
    } catch { }

    return {
      ...DEFAULT_FEATURE_ENTITLEMENTS,
      ...overrides,
    };
  },

  /**
   * Persists a tenant-level feature toggle override (e.g. from Admin Workspace).
   */
  setFeatureOverride(featureKey: TenantFeatureKey, enabled: boolean, explicitOrgId?: string): void {
    const orgId = explicitOrgId || getActiveOrgId();
    const current = this.getTenantFeatures(orgId);
    current[featureKey] = enabled;

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey(orgId), JSON.stringify(current));
        window.dispatchEvent(new CustomEvent('tenant:features_updated', { detail: { orgId, featureKey, enabled } }));
      }
    } catch { }
  }
};

export const canUseFeature = (featureKey: TenantFeatureKey, orgId?: string): boolean => {
  return featureEntitlementService.canUseFeature(featureKey, orgId);
};
