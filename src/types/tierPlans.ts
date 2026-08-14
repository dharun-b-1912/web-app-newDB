// src/types/tierPlans.ts
// ============================================================
// WorkForceOS — SaaS Plans & Tier Entitlements Type Definitions
// ============================================================

export type PlanStatus = 'Active' | 'Draft' | 'Archived';
export type FeatureType = 'Boolean' | 'Quota';
export type FeatureCategory =
  | 'Core HR'
  | 'Employee Self-Service'
  | 'Attendance'
  | 'Leave'
  | 'Payroll'
  | 'WhatsApp & Messaging'
  | 'Biometrics & Hardware'
  | 'Recruitment'
  | 'Performance'
  | 'AI & Copilot'
  | 'Integrations & Security'
  | 'Support & SLAs';

export type SubscriptionStatus = 'Active' | 'Trial' | 'Past Due' | 'Suspended' | 'Cancelled' | 'Expired';
export type BillingCycle = 'Monthly' | 'Annual';

export interface PlanHistoryItem {
  id: string;
  timestamp: string;
  actor: string;
  change_summary: string;
  before_value?: string;
  after_value?: string;
}

export interface TierPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  status: PlanStatus;
  currency: 'INR' | 'USD';
  monthly_price: number;
  annual_price: number;
  min_seats: number;
  included_seats: number;
  max_seats: number; // 0 or -1 indicates Unlimited
  allow_overage: boolean;
  price_per_additional_seat: number;
  target_company_size?: string;
  value_proposition?: string;
  features: string[]; // List of feature codes
  quotas: {
    max_employees: number;
    max_locations: number;
    max_biometric_devices: number;
    max_api_requests_per_month: number;
    max_storage_gb: number;
    max_whatsapp_messages_per_month: number;
    support_sla_hours?: number;
    data_retention_years?: number;
    max_admin_seats?: number;
  };
  tenant_count: number;
  created_at: string;
  updated_at: string;
  internal_notes?: string;
  history: PlanHistoryItem[];
}

export type FeatureLifecycle = 'Draft' | 'Active' | 'Beta' | 'Deprecated' | 'Archived';
export type FeatureClassification = 'Standard' | 'High Value' | 'Strategic';
export type FeatureAccessModel = 'Boolean Access' | 'Quantity Based' | 'Usage Based' | 'Tiered' | 'Add-on';
export type FeatureOveragePolicy = 'Block' | 'Warn' | 'Allow' | 'Allow & Bill';

export interface PlanFeatureItem {
  id: string;
  name: string;
  code: string;
  category: FeatureCategory;
  module?: string;
  description: string;
  short_description?: string;
  detailed_description?: string;
  type: FeatureType;
  value_classification?: FeatureClassification;
  access_model?: FeatureAccessModel;
  default_quota_unit?: string;
  min_tier_name?: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  is_high_value?: boolean;
  status: 'Active' | 'Draft' | 'Beta' | 'Deprecated' | 'Archived';
  lifecycle_status?: FeatureLifecycle;
  is_metered?: boolean;
  usage_resource_code?: string;
  default_unit?: string;
  default_period?: string;
  default_limit?: number;
  default_overage_policy?: FeatureOveragePolicy;
  default_overage_price?: number;
  dependencies?: string[]; // Array of feature codes that this feature requires
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface TenantSubscriptionItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount_formatted: string;
  status: SubscriptionStatus;
  current_seats: number;
  seat_limit: number;
  usage_pct: number;
  auto_renew: boolean;
  start_date: string;
  renewal_date: string;
}
