// src/services/tenant/featureEntitlementService.ts
// ============================================================================
// Joy PeopleHR — Tenant Feature Entitlement, Subscription & Plan Guard Service
// Authoritative Engine for Dynamic Multi-Tenant Module & Feature Visibility
// ============================================================================

import { getActiveOrgId } from '../attendance/biometricCommandService';
import { saasCatalogueService } from '../platform/saasCatalogueService';
import { platformTenantService } from '../platform/platformTenantService';
import { saasPricingEngine } from '../platform/saasPricingEngine';

export type TenantFeatureKey =
  | 'core_hr'
  | 'ess'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'documents'
  | 'shifts'
  | 'gps'
  | 'onboarding'
  | 'offboarding'
  | 'assets'
  | 'recruitment'
  | 'performance'
  | 'lms'
  | 'analytics'
  | 'travel_expense'
  | 'ai_assistant'
  | 'biometric'
  | 'vendor_management'
  | 'client_billing'
  | 'helpdesk';

export type PlanTier = 'Starter' | 'Professional' | 'Business' | 'Enterprise' | 'Custom' | 'Custom_Modular';

/**
 * Standard Commercial Plan Feature Entitlement Baseline
 * Maps each subscription tier to its out-of-the-box included modules.
 */
export const PLAN_FEATURE_MATRIX: Record<PlanTier, Record<TenantFeatureKey, boolean>> = {
  Starter: {
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    documents: true,
    helpdesk: true,
    shifts: false,
    gps: false,
    onboarding: false,
    offboarding: false,
    assets: false,
    recruitment: false,
    performance: false,
    lms: true,
    analytics: false,
    travel_expense: false,
    ai_assistant: false,
    biometric: false,
    vendor_management: false,
    client_billing: false,
  },
  Professional: {
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    documents: true,
    helpdesk: true,
    shifts: true,
    gps: true,
    onboarding: true,
    offboarding: true,
    assets: true,
    recruitment: false,
    performance: false,
    lms: true,
    analytics: false,
    travel_expense: false,
    ai_assistant: false,
    biometric: false,
    vendor_management: false,
    client_billing: false,
  },
  Business: {
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    documents: true,
    helpdesk: true,
    shifts: true,
    gps: true,
    onboarding: true,
    offboarding: true,
    assets: true,
    recruitment: true,
    performance: false,
    lms: true,
    analytics: true,
    travel_expense: true,
    ai_assistant: false,
    biometric: false,
    vendor_management: false,
    client_billing: false,
  },
  Enterprise: {
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    documents: true,
    helpdesk: true,
    shifts: true,
    gps: true,
    onboarding: true,
    offboarding: true,
    assets: true,
    recruitment: true,
    performance: true,
    lms: true,
    analytics: true,
    travel_expense: true,
    ai_assistant: true,
    biometric: true,
    vendor_management: true,
    client_billing: true,
  },
  Custom: {
    core_hr: true,
    ess: true,
    attendance: true,
    leave: true,
    payroll: true,
    documents: true,
    helpdesk: true,
    shifts: true,
    gps: true,
    onboarding: true,
    offboarding: true,
    assets: true,
    recruitment: true,
    performance: true,
    lms: true,
    analytics: true,
    travel_expense: true,
    ai_assistant: false,
    biometric: true,
    vendor_management: false,
    client_billing: false,
  },
  Custom_Modular: {
    core_hr: true,
    ess: true,
    attendance: false,
    leave: false,
    payroll: false,
    documents: false,
    helpdesk: false,
    shifts: false,
    gps: false,
    onboarding: false,
    offboarding: false,
    assets: false,
    recruitment: false,
    performance: false,
    lms: true,
    analytics: false,
    travel_expense: false,
    ai_assistant: false,
    biometric: false,
    vendor_management: false,
    client_billing: false,
  },
};

/**
 * Minimum Subscription Plan required to unlock each feature natively.
 */
export const FEATURE_MIN_PLAN: Record<TenantFeatureKey, PlanTier> = {
  core_hr: 'Starter',
  ess: 'Starter',
  attendance: 'Starter',
  leave: 'Starter',
  payroll: 'Starter',
  documents: 'Starter',
  helpdesk: 'Starter',
  shifts: 'Professional',
  gps: 'Professional',
  onboarding: 'Professional',
  offboarding: 'Professional',
  assets: 'Professional',
  recruitment: 'Business',
  lms: 'Business',
  analytics: 'Business',
  travel_expense: 'Business',
  performance: 'Enterprise',
  vendor_management: 'Enterprise',
  client_billing: 'Enterprise',
  biometric: 'Enterprise',
  ai_assistant: 'Enterprise',
};

/**
 * Human-readable display titles for all commercial modules and capabilities.
 */
export const FEATURE_DISPLAY_NAMES: Record<TenantFeatureKey, string> = {
  core_hr: 'Core HR & Employee Directory',
  ess: 'Employee Self-Service (ESS)',
  attendance: 'Attendance Management',
  leave: 'Leave & Absence Management',
  payroll: 'Payroll & Compensation',
  documents: 'Document Vault & E-Sign',
  helpdesk: 'HR Helpdesk & Communication',
  shifts: 'Shift Scheduling & Roster Matrix',
  gps: 'GPS & Mobile Clocking Channels',
  onboarding: 'Onboarding & Candidate Conversion',
  offboarding: 'Offboarding & Exit Clearance',
  assets: 'Asset Allocation & Custodial Control',
  recruitment: 'Recruitment & ATS Suite',
  performance: 'Performance & 360° Appraisal Engine',
  lms: 'Learning & Development (LMS)',
  analytics: 'Advanced BI Analytics & Reports',
  travel_expense: 'Travel & Expense Reimbursements',
  ai_assistant: 'AI Assistant & Copilot',
  biometric: 'Biometric Push Hardware Gateway',
  vendor_management: 'Vendor Workforce & Procurement Governance',
  client_billing: 'Client Wage Billing & Margin Invoicing',
};

/**
 * Normalizes case-insensitive plan names (e.g. 'STARTER' -> 'Starter')
 */
export function normalizePlanName(rawPlan?: string | null): PlanTier | null {
  if (!rawPlan) return null;
  const p = rawPlan.trim().toLowerCase();
  if (p === 'starter') return 'Starter';
  if (p === 'professional' || p === 'pro' || p === 'premium') return 'Professional';
  if (p === 'business') return 'Business';
  if (p === 'enterprise') return 'Enterprise';
  if (p === 'custom' || p.includes('custom')) return 'Custom';
  if (p === 'custom_modular' || p === 'modular' || p.includes('modular')) return 'Custom_Modular';
  return null;
}

/**
 * Checks whether an add-on array includes an entitlement for a feature
 */
function isFeatureInAddons(featureKey: TenantFeatureKey, addons: string[]): boolean {
  if (!addons || !Array.isArray(addons)) return false;
  const lowerAddons = addons.map((a) => a.toLowerCase().replace(/[-_]/g, ''));

  const patternsMap: Partial<Record<TenantFeatureKey, string[]>> = {
    recruitment: ['recruitment', 'recruitmentsuite', 'ats', 'talentacquisition'],
    performance: ['performance', 'performancesuite', 'okr', 'appraisals'],
    lms: ['lms', 'lmssuite', 'learning', 'training'],
    travel_expense: ['travelexpense', 'travelexpensedesk', 'expense', 'expenses', 'reimbursements'],
    analytics: ['analytics', 'bi', 'bianalytics', 'reports', 'executivereports'],
    biometric: ['biometric', 'biometricpushgateway', 'biometricadapter', 'hardwarepush'],
    vendor_management: ['vendor', 'vendors', 'vendorworkforce', 'vendorworkforcemgmt', 'procurement'],
    client_billing: ['clientbilling', 'wagebilling', 'vendorwages', 'billinginvoicing'],
    gps: ['gps', 'geofence', 'geofencing', 'fieldforce', 'livefieldforcegps'],
    ai_assistant: ['aiassistant', 'copilot', 'aicopilot'],
  };

  const patterns = patternsMap[featureKey];
  if (!patterns) return false;

  return patterns.some((pat) => lowerAddons.some((addon) => addon.includes(pat)));
}

function getStorageKey(orgId: string): string {
  return `workforce_feature_entitlements_${orgId}`;
}

export const featureEntitlementService = {
  /**
   * Resolves the authoritative subscription plan for a tenant organization.
   */
  getTenantPlan(explicitOrgId?: string): PlanTier {
    const targetOrgId = explicitOrgId || getActiveOrgId();

    // 1. Explicit local tenant plan override
    try {
      if (typeof window !== 'undefined') {
        const storedPlan = localStorage.getItem(`workforce_tenant_plan_${targetOrgId}`);
        const normalized = normalizePlanName(storedPlan);
        if (normalized) return normalized;
      }
    } catch {}

    // 2. Active organization cached context
    try {
      if (typeof window !== 'undefined') {
        const rawOrg = localStorage.getItem('workforce_active_org');
        if (rawOrg) {
          const parsed = JSON.parse(rawOrg);
          if (parsed && (parsed.id === targetOrgId || !targetOrgId)) {
            const p = normalizePlanName(parsed.plan);
            if (p) return p;
          }
        }
      }
    } catch {}

    // 3. Customer commercial overrides in SaaS catalogue
    try {
      const overrides = saasCatalogueService.getCustomerOverrides();
      const match = overrides.find((o) => o.tenantId === targetOrgId);
      if (match?.basePlan) {
        const p = normalizePlanName(match.basePlan);
        if (p) return p;
      }
    } catch {}

    // 4. Platform Tenant Directory record
    try {
      const orgRecord = platformTenantService.getOrganizationById(targetOrgId);
      if (orgRecord?.plan) {
        const p = normalizePlanName(orgRecord.plan);
        if (p) return p;
      }
    } catch {}

    // 5. Default: Joy Corporate Solutions is Enterprise; other tenants default to Starter
    if (
      targetOrgId === '0c621892-e938-4707-9957-13534ea32c19' ||
      targetOrgId === 'org-joy-01' ||
      targetOrgId.toLowerCase().includes('joy')
    ) {
      return 'Enterprise';
    }

    return 'Starter';
  },

  /**
   * Helper returning current tenant's active plan.
   */
  getCurrentTenantPlan(): PlanTier {
    return this.getTenantPlan();
  },

  /**
   * Evaluates if a given feature is entitled and enabled for the active tenant.
   * Considers: Plan Baseline -> Addon Subscriptions -> Customer Overrides -> Local Admin Toggles.
   */
  canUseFeature(featureKey: TenantFeatureKey, explicitOrgId?: string): boolean {
    if (featureKey === 'lms') return true;
    const orgId = explicitOrgId || getActiveOrgId();

    // 1. Direct tenant feature toggle overrides (highest precedence)
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
    } catch {}

    // 2. Customer commercial overrides in saasCatalogueService
    try {
      const overrides = saasCatalogueService.getCustomerOverrides();
      const match = overrides.find((o) => o.tenantId === orgId);
      if (match) {
        if (match.featureOverrides && typeof match.featureOverrides[featureKey] === 'boolean') {
          return match.featureOverrides[featureKey];
        }
        if (match.includedAddons && isFeatureInAddons(featureKey, match.includedAddons)) {
          return true;
        }
      }
    } catch {}

    // 3. Stored tenant add-on subscriptions
    try {
      if (typeof window !== 'undefined') {
        const rawAddons = localStorage.getItem(`workforce_tenant_addons_${orgId}`);
        if (rawAddons) {
          const addons = JSON.parse(rawAddons);
          if (Array.isArray(addons) && isFeatureInAddons(featureKey, addons)) {
            return true;
          }
        }
      }
    } catch {}

    // 4. Dynamic Commercial Plan Modules (from saasPricingEngine)
    try {
      const commercialPlans = saasPricingEngine.getPlans();
      const rawPlan = this.getTenantPlan(orgId);
      const match = commercialPlans.find(
        (p) =>
          p.code.toLowerCase() === rawPlan.toLowerCase() ||
          p.name.toLowerCase() === rawPlan.toLowerCase() ||
          p.displayName.toLowerCase() === rawPlan.toLowerCase()
      );
      if (match?.includedModules && match.includedModules.length > 0) {
        const modKey = featureKey === 'travel_expense' ? 'expense' : featureKey;
        if (
          match.includedModules.includes(modKey) ||
          match.includedModules.includes(featureKey) ||
          (match.includedFeatures && match.includedFeatures.some((fk) => fk.startsWith(`${modKey}.`)))
        ) {
          return true;
        }
      }
    } catch {}

    // 5. Baseline Plan Entitlement Fallback
    const plan = this.getTenantPlan(orgId);
    return PLAN_FEATURE_MATRIX[plan]?.[featureKey] ?? false;
  },

  /**
   * Resolves a nav item, route, or module identifier to its canonical TenantFeatureKey.
   */
  resolveFeatureKey(navIdOrRoute: string): TenantFeatureKey | null {
    if (!navIdOrRoute) return null;
    const r = navIdOrRoute.toLowerCase().trim().replace(/^\//, '');

    // Recruitment & ATS
    if (r === 'recruitment' || r.startsWith('recruitment-') || r === 'career-dev' || r.includes('applicant')) {
      return 'recruitment';
    }

    // Performance & Appraisals
    if (
      r === 'performance' ||
      r.startsWith('performance-') ||
      r === 'ess-performance' ||
      r === 'tl-performance'
    ) {
      return 'performance';
    }

    // Learning & LMS
    if (r === 'lms' || r.startsWith('lms-') || r === 'ess-learning' || r === 'tl-training') {
      return 'lms';
    }

    // Travel & Expense
    if (
      r === 'other-travel' ||
      r === 'travel' ||
      r.startsWith('travel-') ||
      r === 'travel_expense' ||
      r === 'expense-desk' ||
      r === 'payroll-claims'
    ) {
      return 'travel_expense';
    }

    // Vendor Management & Workforce Ops
    if (r === 'vendor' || r === 'vendors' || r.startsWith('vendor-') || r.startsWith('vendor/')) {
      return 'vendor_management';
    }

    // Client Wage Billing & Invoicing
    if (
      r === 'client-billing' ||
      r === 'vendor-wages' ||
      r === 'client-contracts' ||
      r === 'client-invoicing' ||
      r === 'billing-runs'
    ) {
      return 'client_billing';
    }

    // Biometrics & Hardware Gateway
    if (
      r === 'biometric' ||
      r === 'biometric-devices' ||
      r === 'attendance-rules' ||
      r === 'face-attendance'
    ) {
      return 'biometric';
    }

    // GPS & Geofencing
    if (r === 'gps' || r === 'geofences' || r === 'geofence-boundaries') {
      return 'gps';
    }

    // Shifts & Roster Scheduling
    if (
      r === 'shifts' ||
      r === 'adaptive-shifts' ||
      r === 'shifts/adaptive' ||
      r === 'roster' ||
      r === 'shift-calendar' ||
      r === 'policies' ||
      r === 'permission-governance' ||
      r === 'overtime' ||
      r === 'overtime-requests' ||
      r === 'wfh' ||
      r === 'breaks-workhours'
    ) {
      return 'shifts';
    }

    // Onboarding Lifecycle
    if (r === 'onboarding' || r === 'onboarding-wizard') {
      return 'onboarding';
    }

    // Offboarding Lifecycle
    if (r === 'offboarding' || r === 'exit-management') {
      return 'offboarding';
    }

    // Assets Inventory
    if (r === 'assets') {
      return 'assets';
    }

    // Analytics & BI
    if (r === 'analytics' || r.startsWith('analytics-') || r === 'insights') {
      return 'analytics';
    }

    // Core HR
    if (r === 'people' || r === 'organization' || r === 'employees' || r === 'directory') {
      return 'core_hr';
    }

    // Basic Attendance & Leave
    if (r === 'attendance' || r === 'attendance-dashboard' || r === 'history' || r === 'late-early' || r === 'regularization' || r === 'exceptions') {
      return 'attendance';
    }
    if (r === 'leave' || r.startsWith('leave-')) {
      return 'leave';
    }

    // Payroll
    if (r.startsWith('payroll')) {
      return 'payroll';
    }

    // Helpdesk
    if (r === 'helpdesk' || r === 'other-communication' || r === 'knowledge') {
      return 'helpdesk';
    }

    return null;
  },

  /**
   * Checks if a module or route is entitled for the tenant based on their plan and add-ons.
   */
  isModuleEntitledForCurrentTenant(moduleKeyOrRoute: string, explicitOrgId?: string): boolean {
    const feat = this.resolveFeatureKey(moduleKeyOrRoute);
    if (!feat) {
      // Default to allowed if not a restricted commercial module (e.g. standard dashboard/settings)
      return true;
    }
    return this.canUseFeature(feat, explicitOrgId);
  },

  /**
   * Checks if a full navigation group (e.g. 'RECRUITMENT & ATS') is entitled for the active tenant.
   */
  isNavGroupEntitled(groupName: string, explicitOrgId?: string): boolean {
    const gUpper = groupName.toUpperCase().trim();

    if (gUpper.includes('RECRUITMENT') || gUpper.includes('ATS')) {
      return this.canUseFeature('recruitment', explicitOrgId);
    }
    if (gUpper.includes('PERFORMANCE')) {
      return this.canUseFeature('performance', explicitOrgId);
    }
    if (gUpper.includes('LEARNING') || gUpper.includes('LMS')) {
      return this.canUseFeature('lms', explicitOrgId);
    }
    if (gUpper.includes('TRAVEL') || gUpper.includes('EXPENSE')) {
      return this.canUseFeature('travel_expense', explicitOrgId);
    }
    if (gUpper.includes('ANALYTICS') || gUpper.includes('REPORTS') || gUpper.includes('INSIGHTS')) {
      return this.canUseFeature('analytics', explicitOrgId);
    }
    if (gUpper.includes('VENDOR') || gUpper.includes('PROCUREMENT')) {
      return this.canUseFeature('vendor_management', explicitOrgId);
    }
    if (gUpper.includes('ATTENDANCE') && !gUpper.includes('VENDOR')) {
      return this.canUseFeature('attendance', explicitOrgId);
    }
    if (gUpper.includes('PAYROLL')) {
      return this.canUseFeature('payroll', explicitOrgId);
    }
    if (gUpper.includes('LEAVE')) {
      return this.canUseFeature('leave', explicitOrgId);
    }
    if (gUpper.includes('SHIFT')) {
      return this.canUseFeature('shifts', explicitOrgId);
    }
    if (gUpper.includes('BIOMETRIC')) {
      return this.canUseFeature('biometric', explicitOrgId);
    }

    return true;
  },

  /**
   * Returns the minimum required plan tier for a given module/route.
   */
  getRequiredPlanForModule(moduleKeyOrRoute: string): PlanTier {
    const feat = this.resolveFeatureKey(moduleKeyOrRoute);
    if (!feat) return 'Starter';
    return FEATURE_MIN_PLAN[feat] || 'Starter';
  },

  /**
   * Returns the friendly display name for a module/route.
   */
  getModuleDisplayName(moduleKeyOrRoute: string): string {
    const feat = this.resolveFeatureKey(moduleKeyOrRoute);
    if (!feat) return moduleKeyOrRoute;
    return FEATURE_DISPLAY_NAMES[feat] || moduleKeyOrRoute;
  },

  /**
   * Retrieves all feature entitlement flags for the tenant.
   */
  getTenantFeatures(explicitOrgId?: string): Record<TenantFeatureKey, boolean> {
    const orgId = explicitOrgId || getActiveOrgId();
    const plan = this.getTenantPlan(orgId);
    const baseline = { ...PLAN_FEATURE_MATRIX[plan] };

    // Overlay customer overrides & local overrides
    const allKeys: TenantFeatureKey[] = Object.keys(FEATURE_MIN_PLAN) as TenantFeatureKey[];
    for (const k of allKeys) {
      baseline[k] = this.canUseFeature(k, orgId);
    }

    return baseline;
  },

  /**
   * Persists a tenant-level plan upgrade (e.g. 'Starter' -> 'Business').
   */
  setTenantPlan(plan: PlanTier, explicitOrgId?: string): void {
    const orgId = explicitOrgId || getActiveOrgId();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`workforce_tenant_plan_${orgId}`, plan);
        window.dispatchEvent(new CustomEvent('tenant:plan_updated', { detail: { orgId, plan } }));
      }
    } catch {}
  },

  /**
   * Persists an add-on entitlement for a tenant.
   */
  setTenantAddon(addonKey: string, enabled: boolean, explicitOrgId?: string): void {
    const orgId = explicitOrgId || getActiveOrgId();
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(`workforce_tenant_addons_${orgId}`);
        let addons: string[] = raw ? JSON.parse(raw) : [];
        if (enabled) {
          if (!addons.includes(addonKey)) addons.push(addonKey);
        } else {
          addons = addons.filter((a) => a !== addonKey);
        }
        localStorage.setItem(`workforce_tenant_addons_${orgId}`, JSON.stringify(addons));
        window.dispatchEvent(
          new CustomEvent('tenant:addons_updated', { detail: { orgId, addonKey, enabled, addons } })
        );
      }
    } catch {}
  },

  /**
   * Persists a tenant-level feature toggle override.
   */
  setFeatureOverride(featureKey: TenantFeatureKey, enabled: boolean, explicitOrgId?: string): void {
    const orgId = explicitOrgId || getActiveOrgId();
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(getStorageKey(orgId));
        const current = raw ? JSON.parse(raw) : {};
        current[featureKey] = enabled;
        localStorage.setItem(getStorageKey(orgId), JSON.stringify(current));
        window.dispatchEvent(
          new CustomEvent('tenant:features_updated', { detail: { orgId, featureKey, enabled } })
        );
      }
    } catch {}
  },
};

export const canUseFeature = (featureKey: TenantFeatureKey, orgId?: string): boolean => {
  return featureEntitlementService.canUseFeature(featureKey, orgId);
};
