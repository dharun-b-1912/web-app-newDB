import {
  PlatformDashboardMetrics,
  SystemHealthStatus,
  TenantOrganization,
  TenantProvisioningRun,
  SubscriptionItem,
  SubscriptionPlan,
  FeatureFlagItem,
  PlatformBillingInvoice,
  UsageMeteringItem,
  SecuritySessionItem,
  SupportAccessRequest,
  PlatformAnnouncementItem,
} from '../types/platformAdmin';

const initialMetrics: PlatformDashboardMetrics = {
  totalOrganizations: 428,
  activeOrganizations: 385,
  trialOrganizations: 37,
  suspendedOrganizations: 6,
  totalUsers: 42840,
  activeUsers: 38620,
  mrr: 1840000, // ₹18.4L
  arr: 22080000, // ₹2.21Cr
  outstandingPayments: 145000,
  churnRate: 2.4,
  netRetentionRate: 114.5,
  customerHealthScore: 94.2,
};

const initialSystemHealth: SystemHealthStatus = {
  api: 'Operational',
  database: 'Operational',
  authentication: 'Operational',
  storage: 'Operational',
  realtime: 'Operational',
  email: 'Operational',
  whatsapp: 'Operational',
  payments: 'Operational',
  overallUptimePercent: 99.98,
};

const initialTenants: TenantOrganization[] = [
  { id: 'org-acme-01', legal_name: 'Acme Technologies Pvt Ltd', trade_name: 'AcmeTech', owner_name: 'Dharun Joy', owner_email: 'admin@acme.com', industry: 'Software & IT', country: 'India', city: 'Coimbatore', employee_count: 428, plan: 'Enterprise', status: 'Active', created_at: '2024-01-15', renewal_date: '2027-01-15', mrr: 145000, gstin: '33AAACA1234F1Z8', health: 'Healthy', last_activity: '2026-08-12 10:45 AM' },
  { id: 'org-tech-02', legal_name: 'TechCorp Solutions Pvt Ltd', trade_name: 'TechCorp India', owner_name: 'Suresh Raina', owner_email: 'suresh@techcorp.in', industry: 'Hardware Manufacturing', country: 'India', city: 'Bengaluru', employee_count: 285, plan: 'Business', status: 'Active', created_at: '2024-03-01', renewal_date: '2026-11-01', mrr: 85000, gstin: '29AAACT9988K1Z2', health: 'Healthy', last_activity: '2026-08-12 09:30 AM' },
  { id: 'org-cyber-03', legal_name: 'CyberSoft Global Tech Ltd', trade_name: 'CyberSoft', owner_name: 'Anish Kapadia', owner_email: 'anish@cybersoft.com', industry: 'Cybersecurity', country: 'India', city: 'Hyderabad', employee_count: 120, plan: 'Professional', status: 'Trial', created_at: '2026-08-01', renewal_date: '2026-08-25', mrr: 45000, gstin: '36AAACC7766L1Z4', health: 'Healthy', last_activity: '2026-08-12 08:15 AM' },
  { id: 'org-zenith-04', legal_name: 'Zenith Logistics & Supply Chain', trade_name: 'Zenith Logistics', owner_name: 'Meera Nair', owner_email: 'meera@zenithlog.com', industry: 'Logistics & Supply Chain', country: 'India', city: 'Chennai', employee_count: 650, plan: 'Enterprise', status: 'Payment Pending', created_at: '2024-06-10', renewal_date: '2026-08-10', mrr: 210000, gstin: '33AAACZ5544M1Z6', health: 'At Risk', last_activity: '2026-08-10 03:20 PM' },
  { id: 'org-innovate-05', legal_name: 'Innovate Labs Pvt Ltd', trade_name: 'Innovate AI', owner_name: 'Vikram Sethi', owner_email: 'vikram@innovatelabs.ai', industry: 'Artificial Intelligence', country: 'India', city: 'Pune', employee_count: 45, plan: 'Starter', status: 'Active', created_at: '2025-02-15', renewal_date: '2027-02-15', mrr: 18000, gstin: '27AAACI3322N1Z8', health: 'Healthy', last_activity: '2026-08-11 05:40 PM' },
  { id: 'org-apex-06', legal_name: 'Apex Financial Services Ltd', trade_name: 'Apex Capital', owner_name: 'Pooja Agarwal', owner_email: 'pooja@apexcap.in', industry: 'Banking & Financial', country: 'India', city: 'Mumbai', employee_count: 920, plan: 'Enterprise', status: 'Active', created_at: '2023-11-01', renewal_date: '2026-11-01', mrr: 320000, gstin: '27AAACA1100P1Z0', health: 'Healthy', last_activity: '2026-08-12 11:00 AM' },
];

const initialProvisioning: TenantProvisioningRun[] = [
  { id: 'prov-101', tenant_id: 'org-cybersoft-new', tenant_name: 'CyberSoft Global Tech Ltd', steps: { database: true, authentication: true, storage: true, roles: true, permissions: true, default_config: true, email: true, subscription: true }, status: 'READY', started_at: '2026-08-01 09:00 AM', completed_at: '2026-08-01 09:02 AM' },
  { id: 'prov-102', tenant_id: 'org-nextgen-draft', tenant_name: 'NextGen Retail India', steps: { database: true, authentication: true, storage: true, roles: true, permissions: false, default_config: false, email: false, subscription: false }, status: 'FAILED', started_at: '2026-08-11 02:30 PM', error_message: 'Role permissions initialization timeout' },
];

const initialSubscriptions: SubscriptionItem[] = [
  { id: 'sub-01', tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', plan: 'Enterprise', billing_cycle: 'Annual', seats: 500, used_seats: 428, price_per_seat: 290, total_amount: 145000, status: 'Active', start_date: '2026-01-15', renewal_date: '2027-01-15', auto_renew: true },
  { id: 'sub-02', tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions Pvt Ltd', plan: 'Business', billing_cycle: 'Monthly', seats: 300, used_seats: 285, price_per_seat: 283, total_amount: 85000, status: 'Active', start_date: '2026-07-01', renewal_date: '2026-08-01', auto_renew: true },
];

const initialPlans: SubscriptionPlan[] = [
  { id: 'plan-starter', name: 'Starter', max_employees: 50, max_admins: 3, storage_gb: 20, api_requests_per_month: 100000, price_monthly: 18000, price_annual: 180000, features: ['Core HR & Directory', 'Employee Self-Service', 'Basic Attendance', 'Leave Management', 'Standard Payroll', 'Email Support'] },
  { id: 'plan-pro', name: 'Professional', max_employees: 200, max_admins: 8, storage_gb: 50, api_requests_per_month: 500000, price_monthly: 45000, price_annual: 450000, features: ['Core HR & Directory', 'ESS & TL Portal', 'GPS & Geofence Clocking', 'Leave & Accruals', 'Automated Payroll & Tax', 'Performance & OKRs', 'HR Helpdesk'] },
  { id: 'plan-biz', name: 'Business', max_employees: 500, max_admins: 15, storage_gb: 100, api_requests_per_month: 1500000, price_monthly: 85000, price_annual: 850000, features: ['Full Suite HRMS', 'Recruitment ATS', 'LMS & SCORM Player', 'Travel & Expense', 'POSH & Grievance Desk', 'WhatsApp Integration', 'Advanced BI Analytics'] },
  { id: 'plan-ent', name: 'Enterprise', max_employees: 5000, max_admins: 50, storage_gb: 500, api_requests_per_month: 10000000, price_monthly: 180000, price_annual: 1800000, features: ['Unlimited HR Capabilities', 'Custom Workflow Engine', 'Dedicated SaaS Account Manager', 'Custom API & Webhooks', 'Biometric Hardware Adapter', '7-Year Audit Archival', '99.9% SLA Guarantee'] },
];

const initialFlags: FeatureFlagItem[] = [
  { key: 'feature.ai.hr_assistant', name: 'AI Copilot Assistant', description: 'Enable conversational HR AI search & policy resolution', status: 'Active', environment: 'Production', default_enabled: true, allowed_plans: ['Business', 'Enterprise'], tenant_overrides_count: 12, updated_at: '2026-08-10' },
  { key: 'feature.whatsapp.notifications', name: 'WhatsApp Business API Gateway', description: 'Send instant WhatsApp alerts for payslips & leave approvals', status: 'Active', environment: 'Production', default_enabled: true, allowed_plans: ['Professional', 'Business', 'Enterprise'], tenant_overrides_count: 4, updated_at: '2026-08-08' },
  { key: 'feature.biometric.adapter', name: 'ZK Teco Hardware Adapter', description: 'Direct IP biometric push attendance sync', status: 'Active', environment: 'Production', default_enabled: true, allowed_plans: ['Business', 'Enterprise'], tenant_overrides_count: 8, updated_at: '2026-08-05' },
  { key: 'feature.advanced.analytics', name: 'Custom Report Builder', description: 'Drag-and-drop BI pivot report generator', status: 'Beta', environment: 'All', default_enabled: false, allowed_plans: ['Enterprise'], tenant_overrides_count: 15, updated_at: '2026-08-11' },
];

const initialInvoices: PlatformBillingInvoice[] = [
  { id: 'inv-8819', invoice_number: 'INV-2026-0801', tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', amount: 145000, gst_amount: 26100, total: 171100, billing_date: '2026-08-01', due_date: '2026-08-15', status: 'Paid', payment_method: 'Razorpay Corporate NetBanking' },
  { id: 'inv-8820', invoice_number: 'INV-2026-0802', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics & Supply Chain', amount: 210000, gst_amount: 37800, total: 247800, billing_date: '2026-08-01', due_date: '2026-08-10', status: 'Overdue', payment_method: 'Bank Wire Transfer' },
];

const initialUsage: UsageMeteringItem[] = [
  { tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', employees_used: 428, employees_limit: 500, storage_gb_used: 74, storage_gb_limit: 100, api_calls_used: 840000, api_calls_limit: 1500000, whatsapp_sent: 8420, whatsapp_limit: 10000 },
  { tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions Pvt Ltd', employees_used: 285, employees_limit: 300, storage_gb_used: 42, storage_gb_limit: 50, api_calls_used: 410000, api_calls_limit: 500000, whatsapp_sent: 4100, whatsapp_limit: 5000 },
];

const initialSessions: SecuritySessionItem[] = [
  { id: 'sess-01', user_name: 'Anand Viswanathan', user_email: 'superadmin@workforceos.com', role_name: 'Super Admin', tenant_name: 'Platform Control Plane', ip_address: '106.51.72.18', device: 'Chrome 127 on macOS', login_time: '2026-08-12 10:15 AM', status: 'Active' },
  { id: 'sess-02', user_name: 'Dharun Joy', user_email: 'admin@acme.com', role_name: 'Company Admin', tenant_name: 'Acme Technologies', ip_address: '182.74.88.12', device: 'Firefox 128 on Windows', login_time: '2026-08-12 09:40 AM', status: 'Active' },
];

const initialSupportRequests: SupportAccessRequest[] = [
  { id: 'sup-req-101', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics', requested_by: 'Support Engineer Arun', reason: 'Investigating payroll LOP calculations discrepancy', duration_minutes: 60, status: 'Active', expires_at: '2026-08-12 12:30 PM' },
];

const initialAnnouncements: PlatformAnnouncementItem[] = [
  { id: 'ann-101', title: 'WorkForceOS v5.0 Infrastructure Upgrade Notice', type: 'Maintenance', target_plans: ['All'], target_audience: 'All Customer Admins', publish_date: '2026-08-10', status: 'Published' },
  { id: 'ann-102', title: 'New AI Copilot Policy Resolver Feature Released', type: 'Product Launch', target_plans: ['Business', 'Enterprise'], target_audience: 'HR Heads & Admins', publish_date: '2026-08-08', status: 'Published' },
];

export const platformAdminApi = {
  getDashboardMetrics(): PlatformDashboardMetrics {
    return initialMetrics;
  },

  getSystemHealth(): SystemHealthStatus {
    return initialSystemHealth;
  },

  getTenants(): TenantOrganization[] {
    return initialTenants;
  },

  createTenant(tenant: Partial<TenantOrganization>): TenantOrganization {
    const newTenant: TenantOrganization = {
      id: `org-${Date.now().toString(36)}`,
      legal_name: tenant.legal_name || 'New Organization Pvt Ltd',
      trade_name: tenant.trade_name || tenant.legal_name || 'New Organization',
      owner_name: tenant.owner_name || 'Account Admin',
      owner_email: tenant.owner_email || 'admin@neworg.com',
      industry: tenant.industry || 'Information Technology',
      country: tenant.country || 'India',
      city: tenant.city || 'Coimbatore',
      employee_count: tenant.employee_count || 1,
      plan: tenant.plan || 'Starter',
      status: 'Active',
      created_at: new Date().toISOString().split('T')[0],
      renewal_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      mrr: tenant.plan === 'Enterprise' ? 180000 : tenant.plan === 'Business' ? 85000 : 45000,
      health: 'Healthy',
      last_activity: 'Just now',
    };
    initialTenants.unshift(newTenant);
    return newTenant;
  },

  updateTenantStatus(id: string, status: TenantOrganization['status']): void {
    const target = initialTenants.find(t => t.id === id);
    if (target) {
      target.status = status;
    }
  },

  getProvisioningRuns(): TenantProvisioningRun[] {
    return initialProvisioning;
  },

  getSubscriptions(): SubscriptionItem[] {
    return initialSubscriptions;
  },

  getPlans(): SubscriptionPlan[] {
    return initialPlans;
  },

  getFeatureFlags(): FeatureFlagItem[] {
    return initialFlags;
  },

  toggleFeatureFlag(key: string): void {
    const flag = initialFlags.find(f => f.key === key);
    if (flag) {
      flag.status = flag.status === 'Active' ? 'Disabled' : 'Active';
    }
  },

  getInvoices(): PlatformBillingInvoice[] {
    return initialInvoices;
  },

  getUsage(): UsageMeteringItem[] {
    return initialUsage;
  },

  getSessions(): SecuritySessionItem[] {
    return initialSessions;
  },

  revokeSession(id: string): void {
    const session = initialSessions.find(s => s.id === id);
    if (session) {
      session.status = 'Revoked';
    }
  },

  getSupportRequests(): SupportAccessRequest[] {
    return initialSupportRequests;
  },

  getAnnouncements(): PlatformAnnouncementItem[] {
    return initialAnnouncements;
  },
};
