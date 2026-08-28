// ============================================================
// Joy PeopleHR — Platform Control Plane 2.0 TypeScript Domain Models
// ============================================================

export type EnvironmentType = 'Production' | 'Staging' | 'Development' | 'All';

export interface PlatformDashboardMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  atRiskOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  arr: number;
  mrrGrowthPct: number;
  netRevenue: number;
  outstandingPayments: number;
  churnRate: number;
  netRetentionRate: number;
  customerHealthScore: number;
  platformUptimePct: number;
  activeIncidentsCount: number;
  failedJobsCount: number;
}

export type SubsystemHealthState = 'Operational' | 'Degraded' | 'Outage' | 'Maintenance';

export interface SubsystemTelemetry {
  key: string;
  name: string;
  category: 'Infrastructure' | 'Core' | 'Communication' | 'Integration';
  status: SubsystemHealthState;
  uptimePct: number;
  latencyMs: number;
  errorRatePct: number;
  lastChecked: string;
  description: string;
  incidentId?: string;
}

export interface SystemHealthStatus {
  api: SubsystemHealthState;
  database: SubsystemHealthState;
  authentication: SubsystemHealthState;
  storage: SubsystemHealthState;
  realtime: SubsystemHealthState;
  email: SubsystemHealthState;
  whatsapp: SubsystemHealthState;
  payments: SubsystemHealthState;
  backgroundJobs: SubsystemHealthState;
  webhooks: SubsystemHealthState;
  search: SubsystemHealthState;
  analytics: SubsystemHealthState;
  overallUptimePercent: number;
  subsystems: SubsystemTelemetry[];
}

export type TenantStatus =
  | 'Trial'
  | 'Active'
  | 'Grace Period'
  | 'Payment Pending'
  | 'Suspended'
  | 'Locked'
  | 'Archived'
  | 'Cancelled';

export type TenantHealthGrade = 'Healthy' | 'At Risk' | 'Critical';

export interface TenantHealthSignal {
  category: 'Activity' | 'Utilization' | 'Billing' | 'Integrations';
  status: 'Good' | 'Warning' | 'Critical';
  detail: string;
  scoreImpact: number;
}

export interface TenantOrganization {
  id: string;
  legal_name: string;
  trade_name: string;
  domain?: string;
  owner_name: string;
  owner_email: string;
  industry: string;
  country: string;
  city: string;
  employee_count: number;
  active_users_count: number;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  status: TenantStatus;
  health: TenantHealthGrade;
  health_score: number;
  health_signals: TenantHealthSignal[];
  created_at: string;
  renewal_date: string;
  mrr: number;
  gstin?: string;
  storage_used_gb: number;
  storage_quota_gb: number;
  last_activity: string;
  primary_admin_id?: string;
  is_demo?: boolean;
}

export type ProvisioningStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ProvisioningStepDetail {
  id: string;
  label: string;
  description: string;
  status: ProvisioningStepStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
}

export interface TenantProvisioningRun {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan: string;
  admin_email: string;
  current_step_index: number;
  total_steps: number;
  steps: {
    database: boolean;
    authentication: boolean;
    storage: boolean;
    roles: boolean;
    permissions: boolean;
    default_config: boolean;
    email: boolean;
    subscription: boolean;
  };
  step_details: ProvisioningStepDetail[];
  status: 'READY' | 'PROVISIONING' | 'FAILED' | 'RETRYING';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  execution_logs: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier_code: string;
  max_employees: number;
  max_admins: number;
  storage_gb: number;
  api_requests_per_month: number;
  whatsapp_limit: number;
  price_monthly: number;
  price_annual: number;
  features: string[];
  is_active: boolean;
}

export interface SubscriptionItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan: string;
  billing_cycle: 'Monthly' | 'Annual';
  seats: number;
  used_seats: number;
  price_per_seat: number;
  total_amount: number;
  currency: string;
  status: 'Active' | 'Trial' | 'Grace Period' | 'Past Due' | 'Cancelled';
  start_date: string;
  renewal_date: string;
  auto_renew: boolean;
  trial_ends_at?: string;
}

export interface PlatformBillingInvoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  subtotal: number;
  gst_amount: number;
  total: number;
  amount: number;
  currency: string;
  billing_date: string;
  due_date: string;
  paid_at?: string;
  status: 'Draft' | 'Issued' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Refunded';
  payment_method: string;
  payment_gateway_ref?: string;
  reconciliation_status: 'Matched' | 'Unmatched' | 'Needs Review' | 'Resolved';
}

export interface UsageMeteringItem {
  tenant_id: string;
  tenant_name: string;
  employees_used: number;
  employees_limit: number;
  storage_gb_used: number;
  storage_gb_limit: number;
  api_calls_used: number;
  api_calls_limit: number;
  whatsapp_sent: number;
  whatsapp_limit: number;
  status: 'Healthy' | 'Warning' | 'Near Limit' | 'Exceeded';
}

export interface FeatureFlagItem {
  key: string;
  name: string;
  description: string;
  category: 'Core' | 'AI' | 'Integrations' | 'Security' | 'Beta';
  status: 'Active' | 'Beta' | 'Disabled' | 'Deprecated';
  environment: EnvironmentType;
  default_enabled: boolean;
  allowed_plans: string[];
  rollout_percentage: number;
  tenant_overrides_count: number;
  tenant_overrides?: { tenant_id: string; tenant_name: string; is_enabled: boolean }[];
  updated_at: string;
  updated_by?: string;
}

export interface SecuritySessionItem {
  id: string;
  user_name: string;
  user_email: string;
  role_name: string;
  tenant_name: string;
  tenant_id: string;
  ip_address: string;
  location?: string;
  device: string;
  login_time: string;
  last_activity?: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Idle' | 'Revoked';
}

export interface SupportAccessRequest {
  id: string;
  tenant_id: string;
  tenant_name: string;
  requested_by: string;
  reason: string;
  duration_minutes: number;
  status: 'Pending' | 'Approved' | 'Active' | 'Expired' | 'Revoked';
  started_at?: string;
  expires_at?: string;
}

export interface PlatformAnnouncementItem {
  id: string;
  title: string;
  content?: string;
  type: 'Product Launch' | 'Maintenance' | 'Security Alert' | 'Billing Notice';
  target_plans: string[];
  target_audience: string;
  publish_date: string;
  status: 'Published' | 'Draft' | 'Scheduled';
}

export type IncidentSeverity = 'SEV-1 Critical' | 'SEV-2 Major' | 'SEV-3 Moderate' | 'SEV-4 Minor';
export type IncidentStatus = 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved' | 'Closed';

export interface PlatformIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affected_services: string[];
  affected_tenants_count: number;
  started_at: string;
  detected_at?: string;
  resolved_at?: string;
  root_cause?: string;
  lead_engineer: string;
  postmortem_url?: string;
}

export type JobType =
  | 'TENANT_PROVISIONING'
  | 'INVOICE_GENERATION'
  | 'SUBSCRIPTION_RENEWAL'
  | 'USAGE_AGGREGATION'
  | 'LEAVE_ACCRUAL'
  | 'TRIAL_EXPIRY'
  | 'WHATSAPP_BROADCAST'
  | 'DATA_CLEANUP'
  | 'WEBHOOK_DELIVERY';

export interface PlatformBackgroundJob {
  id: string;
  type: JobType;
  name: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Retrying' | 'Cancelled';
  progress_percent: number;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  started_at?: string;
  completed_at?: string;
  duration_sec?: number;
  error_message?: string;
}

export interface WebhookEndpoint {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  url: string;
  description: string;
  events: string[];
  status: 'Active' | 'Disabled' | 'Failing';
  success_rate_pct: number;
  last_delivery_at?: string;
}

export interface WebhookDeliveryItem {
  id: string;
  endpoint_id: string;
  event_type: string;
  http_status: number;
  latency_ms: number;
  status: 'Delivered' | 'Failed' | 'Retrying';
  attempt_count: number;
  delivered_at: string;
  error_message?: string;
}

export interface PlatformApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  created_by: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  status: 'Active' | 'Revoked' | 'Expired';
}

export interface PlatformAuditEvent {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  organization_id?: string;
  organization_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  severity: 'Low' | 'Normal' | 'High' | 'Critical';
  reason?: string;
  ip_address?: string;
  created_at: string;
  time_ago?: string;
}

export interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  admin_name: string;
  target_tenant_id: string;
  target_tenant_name: string;
  reason: string;
  duration_minutes: number;
  status: 'Active' | 'Expired' | 'Revoked';
  started_at: string;
  expires_at: string;
}

export interface TenantActionAlert {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Billing' | 'Usage' | 'Security' | 'Health' | 'Lifecycle';
  tenant_id: string;
  tenant_name: string;
  title: string;
  description: string;
  recommended_action: string;
  action_tab: string;
  created_at: string;
}

export interface PlatformSetting {
  key: string;
  category: 'General' | 'Security' | 'Billing' | 'Email' | 'WhatsApp' | 'Maintenance';
  label: string;
  value: any;
  description: string;
  is_secret?: boolean;
}

