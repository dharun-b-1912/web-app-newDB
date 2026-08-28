// src/types/productCapabilities.ts
// ============================================================
// Joy PeopleHR — Product Capabilities & Feature Flags Type Definitions
// ============================================================

export type LifecycleStage =
  | 'Planned'
  | 'Development'
  | 'Internal Testing'
  | 'Beta'
  | 'Early Access'
  | 'General Availability'
  | 'Deprecated'
  | 'Archived';

export type FeatureType =
  | 'Boolean'
  | 'Quota'
  | 'Workflow'
  | 'Integration'
  | 'AI Capability';

export type CapabilityCategory =
  | 'Core HR'
  | 'Employee Self-Service'
  | 'Attendance'
  | 'Leave'
  | 'Payroll'
  | 'India Compliance'
  | 'Recruitment'
  | 'Onboarding'
  | 'Performance'
  | 'Learning'
  | 'Expenses'
  | 'Engagement'
  | 'Asset Management'
  | 'Document Management'
  | 'Workflows'
  | 'HR Helpdesk'
  | 'Analytics'
  | 'AI Capabilities'
  | 'Communication'
  | 'Biometrics'
  | 'Integrations'
  | 'Mobile'
  | 'Security';

export type CapabilityStatus = 'Active' | 'Disabled' | 'Kill-Switched' | 'Draft';
export type EnvironmentScope = 'Production' | 'Staging' | 'Development' | 'All';

export interface CapabilityHistoryItem {
  id: string;
  timestamp: string;
  actor: string;
  change_summary: string;
  before_value?: string;
  after_value?: string;
  reason?: string;
}

export interface ReadinessChecklist {
  backend: boolean;
  frontend: boolean;
  permissions: boolean;
  tests: boolean;
  monitoring: boolean;
  documentation: boolean;
}

export interface ProductCapability {
  id: string;
  name: string;
  code: string; // e.g. 'attendance.gps'
  product: string; // e.g. 'HRMS'
  module: string; // e.g. 'Attendance'
  category: CapabilityCategory;
  description: string;
  type: FeatureType;
  lifecycle: LifecycleStage;
  environment: EnvironmentScope;
  status: CapabilityStatus;
  default_enabled: boolean;
  allowed_plans: ('Starter' | 'Professional' | 'Business' | 'Enterprise')[];
  rollout_percentage: number; // 0 - 100
  eligible_tenants_count: number;
  enabled_tenants_count: number;
  active_users_count: number;
  error_rate_pct: number;
  latency_ms: number;
  availability_pct: number;
  owners: {
    product: string;
    engineering: string;
    support: string;
  };
  dependencies: {
    requires: string[];
    conflicts: string[];
    recommended: string[];
  };
  readiness_checklist: ReadinessChecklist;
  readiness_score: number; // 0 - 100%
  rollback_policy: {
    auto_rollback_enabled: boolean;
    max_error_rate_pct: number;
  };
  overrides_count: number;
  replacement_feature_code?: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
  history: CapabilityHistoryItem[];
}

export interface TenantCapabilityOverride {
  id: string;
  tenant_id: string;
  tenant_name: string;
  capability_id: string;
  capability_name: string;
  capability_code: string;
  override_state: 'Enabled' | 'Disabled';
  reason: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface AccessExplanationStep {
  step: string;
  passed: boolean;
  detail: string;
}

export interface AccessExplanationResult {
  feature_code: string;
  feature_name: string;
  tenant_id: string;
  tenant_name: string;
  is_enabled: boolean;
  plan_name: string;
  reason_summary: string;
  checks: AccessExplanationStep[];
}
