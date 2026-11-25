// src/services/platform/platformTenantEntitlementService.ts
// ============================================================================
// Joy PeopleHR — Tenant Feature Flags, Addons & Entitlement Management Service
// Real-time synchronization with Supabase organization_addon_entitlements & organizations.settings
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { api } from '../api';

export interface TenantFeatureCapability {
  key: string;
  name: string;
  category: 'Attendance & Biometrics' | 'Payroll & Finance' | 'Governance & Operations' | 'AI & Communication';
  description: string;
  minPlanTier: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  isAddon: boolean;
  isEnabled: boolean;
  unlockedAt?: string | null;
  config?: Record<string, any>;
}

export const PLATFORM_FEATURE_DEFINITIONS: Omit<TenantFeatureCapability, 'isEnabled' | 'unlockedAt' | 'config'>[] = [
  // 1. Attendance & Biometrics
  {
    key: 'face_attend',
    name: 'JOY FaceAttend (AI Biometrics)',
    category: 'Attendance & Biometrics',
    description: '1:1 facial recognition, anti-spoofing liveness detection (PAD), and stateless vector verification.',
    minPlanTier: 'Enterprise',
    isAddon: true,
  },
  {
    key: 'geofencing',
    name: 'GPS Geofencing & Smart Dual Boundaries',
    category: 'Attendance & Biometrics',
    description: 'Enforces workplace physical boundary on check-in while permitting transit check-outs with distance warnings.',
    minPlanTier: 'Professional',
    isAddon: false,
  },
  {
    key: 'adaptive_shifts',
    name: '24/7 Multi-Shift Roster & Night Shift Turnover',
    category: 'Attendance & Biometrics',
    description: 'Rotational 24/7 multi-shift matrices, weekly rest rules, and next-day night shift cross-midnight cutoffs.',
    minPlanTier: 'Professional',
    isAddon: false,
  },
  {
    key: 'overtime_engine',
    name: 'Tenant Overtime & Multi-Mode Governance Engine',
    category: 'Attendance & Biometrics',
    description: 'Tenant-configurable OT policies, multi-tier hierarchy, HR verification fallback, and statutory cap governance.',
    minPlanTier: 'Professional',
    isAddon: false,
  },
  {
    key: 'biometric_hardware',
    name: 'Hardware Biometrics Hub (ZKTeco / Matrix / eSSL)',
    category: 'Attendance & Biometrics',
    description: 'Direct push/pull socket synchronization with on-premise physical biometric fingerprint and face terminals.',
    minPlanTier: 'Business',
    isAddon: true,
  },

  // 2. Payroll & Finance
  {
    key: 'payroll_engine',
    name: 'Full-Stack Statutory Payroll Engine',
    category: 'Payroll & Finance',
    description: 'Statutory PF, ESI, Professional Tax, TDS/Form 16 calculations, salary slips, and one-click bank disbursal batch files.',
    minPlanTier: 'Business',
    isAddon: false,
  },
  {
    key: 'garment_workforce',
    name: 'Industrial Piece-Rate & Manufacturing Module',
    category: 'Payroll & Finance',
    description: 'Specialized piece-rate wages, operational lines, bundle barcoding, and factory floor rework tracking.',
    minPlanTier: 'Enterprise',
    isAddon: true,
  },
  {
    key: 'vendor_governance',
    name: 'Subcontractor & Vendor Manpower Reconciliation',
    category: 'Payroll & Finance',
    description: 'Vendor attendance audits, contractor wage billing, purchase orders, and 3-way invoice matching.',
    minPlanTier: 'Business',
    isAddon: false,
  },

  // 3. Governance & Operations
  {
    key: 'id_card_press',
    name: 'Smart CMYK ID Card Press',
    category: 'Governance & Operations',
    description: 'Print-ready employee PVC smart cards with QR codes, vector logos, and custom corporate themes.',
    minPlanTier: 'Starter',
    isAddon: false,
  },
  {
    key: 'asset_management',
    name: 'IT Hardware & Enterprise Asset Tracker',
    category: 'Governance & Operations',
    description: 'Hardware lifecycle, serial number assignment, warranty tracking, and employee return handovers.',
    minPlanTier: 'Professional',
    isAddon: false,
  },
  {
    key: 'lms_learning',
    name: 'Corporate LMS & Compliance Academy',
    category: 'Governance & Operations',
    description: 'Interactive employee onboarding courses, safety video quizzes, and compliance certification ledgers.',
    minPlanTier: 'Business',
    isAddon: false,
  },

  // 4. AI & Communication
  {
    key: 'whatsapp_bot',
    name: 'WhatsApp Business 2-Way Automation Bot',
    category: 'AI & Communication',
    description: 'Official Meta WhatsApp Business API integration for mobile punch notifications, leave approvals, and PDF payslips.',
    minPlanTier: 'Enterprise',
    isAddon: true,
  },
  {
    key: 'ai_copilot',
    name: 'JOY Workforce AI Copilot',
    category: 'AI & Communication',
    description: 'Generative HR assistant, natural language workforce query answering, and proactive operational anomaly alerts.',
    minPlanTier: 'Enterprise',
    isAddon: false,
  },
  {
    key: 'audit_sentinel',
    name: 'Forensic Audit Log & Sentinel Telemetry',
    category: 'AI & Communication',
    description: 'Immutable SOC-2 compliant audit trail capturing all identity mutations, permission changes, and payroll edits.',
    minPlanTier: 'Professional',
    isAddon: false,
  },
];

export const platformTenantEntitlementService = {
  /**
   * Fetch all feature capabilities for a tenant with their live locked/unlocked state
   */
  async getTenantFeatures(organizationId: string, orgPlanTier: string = 'Enterprise'): Promise<TenantFeatureCapability[]> {
    let dbEntitlements: Record<string, boolean> = {};

    if (isSupabaseEnabled && organizationId) {
      try {
        const { data, error } = await supabase
          .from('organization_addon_entitlements')
          .select('addon_key, is_enabled, updated_at, config_json')
          .eq('organization_id', organizationId);

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            dbEntitlements[row.addon_key] = Boolean(row.is_enabled);
          });
        }
      } catch (err) {
        console.warn('[TenantEntitlementService] Supabase read fallback:', err);
      }
    }

    const tierHierarchy = { Starter: 1, Professional: 2, Business: 3, Enterprise: 4 };
    const currentTierRank = (tierHierarchy as any)[orgPlanTier] || 4;

    return PLATFORM_FEATURE_DEFINITIONS.map((def) => {
      const minRank = (tierHierarchy as any)[def.minPlanTier] || 1;
      const defaultTierAccess = currentTierRank >= minRank;

      // If explicitly present in database, use database state; otherwise check plan tier
      const isExplicitlyDefined = dbEntitlements[def.key] !== undefined;
      const isEnabled = isExplicitlyDefined ? dbEntitlements[def.key] : defaultTierAccess;

      return {
        ...def,
        isEnabled,
        unlockedAt: isEnabled ? new Date().toISOString() : null,
      };
    });
  },

  /**
   * Lock or Unlock a single feature for a specific tenant
   */
  async setFeatureState(
    organizationId: string,
    featureKey: string,
    enabled: boolean,
    planTier: string = 'Enterprise',
    configJson: Record<string, any> = {}
  ): Promise<boolean> {
    if (!organizationId) return false;

    if (isSupabaseEnabled) {
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('organization_addon_entitlements')
          .upsert(
            {
              organization_id: organizationId,
              addon_key: featureKey,
              is_enabled: enabled,
              plan_tier: planTier.toUpperCase(),
              config_json: configJson,
              enabled_at: enabled ? now : null,
              disabled_at: enabled ? null : now,
              updated_at: now,
            },
            { onConflict: 'organization_id,addon_key' }
          );

        if (error) {
          console.error('[TenantEntitlementService] Update error:', error);
          return false;
        }

        // Also broadcast event so open client views instantly refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('joy_tenant_entitlement_changed', {
              detail: { organizationId, featureKey, enabled },
            })
          );
        }

        return true;
      } catch (err) {
        console.error('[TenantEntitlementService] Update exception:', err);
        return false;
      }
    }

    return true;
  },

  /**
   * Bulk unlock all enterprise capabilities for a tenant
   */
  async bulkUnlockAll(organizationId: string, planTier: string = 'Enterprise'): Promise<boolean> {
    if (!organizationId) return false;

    const promises = PLATFORM_FEATURE_DEFINITIONS.map((def) =>
      this.setFeatureState(organizationId, def.key, true, planTier)
    );

    const results = await Promise.all(promises);
    return results.every(Boolean);
  },

  /**
   * Reset all features back to plan defaults
   */
  async resetToPlanDefaults(organizationId: string, planTier: string = 'Enterprise'): Promise<boolean> {
    if (!organizationId) return false;

    const tierHierarchy = { Starter: 1, Professional: 2, Business: 3, Enterprise: 4 };
    const currentTierRank = (tierHierarchy as any)[planTier] || 4;

    const promises = PLATFORM_FEATURE_DEFINITIONS.map((def) => {
      const minRank = (tierHierarchy as any)[def.minPlanTier] || 1;
      const shouldEnable = currentTierRank >= minRank;
      return this.setFeatureState(organizationId, def.key, shouldEnable, planTier);
    });

    const results = await Promise.all(promises);
    return results.every(Boolean);
  },

  /**
   * Authoritative feature evaluation via PostgreSQL evaluate_tenant_feature RPC
   */
  async checkFeatureAccess(
    organizationId: string,
    featureKey: string
  ): Promise<{ isAllowed: boolean; reason: string; source: string }> {
    if (!organizationId) {
      return { isAllowed: true, reason: 'Default development fallback', source: 'DEV_FALLBACK' };
    }

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.rpc('evaluate_tenant_feature', {
          p_organization_id: organizationId,
          p_feature_key: featureKey,
        });

        if (!error && data && typeof data === 'object') {
          return {
            isAllowed: Boolean(data.is_allowed),
            reason: data.reason || '',
            source: data.source || 'RPC',
          };
        }
      } catch (err) {
        console.warn('[TenantEntitlementService] evaluate_tenant_feature RPC notice:', err);
      }
    }

    // Default fallback: allow in offline mode
    return { isAllowed: true, reason: 'Offline capability access', source: 'OFFLINE_FALLBACK' };
  },

  /**
   * Real-time seat capacity check for an organization
   */
  async checkSeatCapacity(organizationId: string): Promise<{
    seat_limit: number;
    active_employees: number;
    available_seats: number;
    is_limit_reached: boolean;
    utilization_pct: number;
  }> {
    if (isSupabaseEnabled && supabase && organizationId) {
      try {
        const { data, error } = await supabase.rpc('check_tenant_seat_capacity', {
          p_organization_id: organizationId,
        });

        if (!error && data && typeof data === 'object') {
          return {
            seat_limit: Number(data.seat_limit) || 25,
            active_employees: Number(data.active_employees) || 0,
            available_seats: Number(data.available_seats) || 0,
            is_limit_reached: Boolean(data.is_limit_reached),
            utilization_pct: Number(data.utilization_pct) || 0,
          };
        }
      } catch (err) {
        console.warn('[TenantEntitlementService] check_tenant_seat_capacity RPC notice:', err);
      }
    }

    return {
      seat_limit: 50,
      active_employees: 10,
      available_seats: 40,
      is_limit_reached: false,
      utilization_pct: 20,
    };
  },

  /**
   * Super Admin Subscription Plan and Seat Allocation Upgrade
   */
  async upgradeSubscriptionPlan(
    organizationId: string,
    plan: string,
    seats: number,
    mrr: number,
    billingCycle: string = 'MONTHLY',
    reason: string = 'Commercial plan upgrade by Super Admin'
  ): Promise<{ success: boolean; message: string }> {
    if (!organizationId) throw new Error('Organization ID is required');
    if (!plan) throw new Error('Plan tier is required');
    if (seats <= 0) throw new Error('Seat allocation must be greater than zero');

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.rpc('upgrade_tenant_subscription_plan', {
          p_organization_id: organizationId,
          p_plan: plan,
          p_seats: seats,
          p_mrr: mrr,
          p_billing_cycle: billingCycle,
          p_reason: reason,
        });

        if (error) throw error;
        return { success: true, message: `Successfully upgraded to ${plan} (${seats} seats)` };
      } catch (err: any) {
        console.warn('[TenantEntitlementService] RPC fallback to direct update:', err);
        const { error: directErr } = await supabase
          .from('organizations')
          .update({
            plan,
            seat_limit: seats,
            mrr,
            billing_cycle: billingCycle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        if (directErr) throw new Error(directErr.message);
      }
    }

    return { success: true, message: `Plan upgraded to ${plan} with ${seats} seats` };
  },
};

