export interface PlatformDashboardMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  arr: number;
  outstandingPayments: number;
  churnRate: number;
  netRetentionRate: number;
  customerHealthScore: number;
}

export interface SystemHealthStatus {
  api: 'Operational' | 'Degraded' | 'Outage';
  database: 'Operational' | 'Degraded' | 'Outage';
  authentication: 'Operational' | 'Degraded' | 'Outage';
  storage: 'Operational' | 'Degraded' | 'Outage';
  realtime: 'Operational' | 'Degraded' | 'Outage';
  email: 'Operational' | 'Degraded' | 'Outage';
  whatsapp: 'Operational' | 'Degraded' | 'Outage';
  payments: 'Operational' | 'Degraded' | 'Outage';
  overallUptimePercent: number;
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

export interface TenantOrganization {
  id: string;
  legal_name: string;
  trade_name: string;
  owner_name: string;
  owner_email: string;
  industry: string;
  country: string;
  city: string;
  employee_count: number;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  status: TenantStatus;
  created_at: string;
  renewal_date: string;
  mrr: number;
  gstin?: string;
  health: 'Healthy' | 'At Risk' | 'Critical';
  last_activity: string;
}

export interface TenantProvisioningRun {
  id: string;
  tenant_id: string;
  tenant_name: string;
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
  status: 'READY' | 'PROVISIONING' | 'FAILED';
  started_at: string;
  completed_at?: string;
  error_message?: string;
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
  status: 'Active' | 'Trial' | 'Past Due' | 'Cancelled';
  start_date: string;
  renewal_date: string;
  auto_renew: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  max_employees: number;
  max_admins: number;
  storage_gb: number;
  api_requests_per_month: number;
  price_monthly: number;
  price_annual: number;
  features: string[];
}

export interface FeatureFlagItem {
  key: string;
  name: string;
  description: string;
  status: 'Active' | 'Beta' | 'Disabled';
  environment: 'Production' | 'Staging' | 'All';
  default_enabled: boolean;
  allowed_plans: string[];
  tenant_overrides_count: number;
  updated_at: string;
}

export interface PlatformBillingInvoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  gst_amount: number;
  total: number;
  billing_date: string;
  due_date: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Refunded';
  payment_method: string;
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
}

export interface SecuritySessionItem {
  id: string;
  user_name: string;
  user_email: string;
  role_name: string;
  tenant_name: string;
  ip_address: string;
  device: string;
  login_time: string;
  status: 'Active' | 'Idle' | 'Revoked';
}

export interface SupportAccessRequest {
  id: string;
  tenant_id: string;
  tenant_name: string;
  requested_by: string;
  reason: string;
  duration_minutes: number;
  status: 'Pending' | 'Approved' | 'Active' | 'Expired';
  expires_at?: string;
}

export interface PlatformAnnouncementItem {
  id: string;
  title: string;
  type: 'Product Launch' | 'Maintenance' | 'Security Alert' | 'Billing Notice';
  target_plans: string[];
  target_audience: string;
  publish_date: string;
  status: 'Published' | 'Draft' | 'Scheduled';
}
