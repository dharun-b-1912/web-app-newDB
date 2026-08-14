// src/services/platform/platformTenantService.ts
// ============================================================
// WorkForceOS — Platform Tenant Management Service
// ============================================================

import { TenantOrganization, TenantStatus, TenantHealthGrade, TenantHealthSignal } from '../../types/platformAdmin';
import { db, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

const LOCAL_TENANTS_KEY = 'workforce_platform_tenants';

const initialTenants: TenantOrganization[] = [
  {
    id: 'org-acme-01',
    legal_name: 'Acme Technologies Pvt Ltd',
    trade_name: 'AcmeTech India',
    domain: 'acme.com',
    owner_name: 'Dharun Joy',
    owner_email: 'admin@acme.com',
    industry: 'Software & IT Services',
    country: 'India',
    city: 'Coimbatore',
    employee_count: 428,
    active_users_count: 416,
    plan: 'Enterprise',
    status: 'Active',
    health: 'Healthy',
    health_score: 96,
    health_signals: [
      { category: 'Activity', status: 'Good', detail: '97% daily active user engagement', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: '85.6% seat quota allocated', scoreImpact: 0 },
      { category: 'Billing', status: 'Good', detail: 'Annual upfront payment cleared', scoreImpact: 0 },
      { category: 'Integrations', status: 'Good', detail: 'Biometric push sync healthy (14ms latency)', scoreImpact: 0 },
    ],
    created_at: '2024-01-15',
    renewal_date: '2027-01-15',
    mrr: 145000,
    gstin: '33AAACA1234F1Z8',
    storage_used_gb: 74,
    storage_quota_gb: 500,
    last_activity: 'Just now',
    primary_admin_id: 'user-cadmin',
  },
  {
    id: 'org-tech-02',
    legal_name: 'TechCorp Solutions Pvt Ltd',
    trade_name: 'TechCorp India',
    domain: 'techcorp.in',
    owner_name: 'Suresh Raina',
    owner_email: 'suresh@techcorp.in',
    industry: 'Hardware Manufacturing',
    country: 'India',
    city: 'Bengaluru',
    employee_count: 285,
    active_users_count: 260,
    plan: 'Business',
    status: 'Active',
    health: 'Healthy',
    health_score: 88,
    health_signals: [
      { category: 'Activity', status: 'Good', detail: 'Admin logged in today at 09:30 AM', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: '95% seats utilized (expansion candidate)', scoreImpact: +5 },
      { category: 'Billing', status: 'Good', detail: 'Auto-debit active on Razorpay', scoreImpact: 0 },
      { category: 'Integrations', status: 'Good', detail: 'WhatsApp notifications delivery 99.4%', scoreImpact: 0 },
    ],
    created_at: '2024-03-01',
    renewal_date: '2026-11-01',
    mrr: 85000,
    gstin: '29AAACT9988K1Z2',
    storage_used_gb: 42,
    storage_quota_gb: 100,
    last_activity: '2026-08-14 09:30 AM',
  },
  {
    id: 'org-cyber-03',
    legal_name: 'CyberSoft Global Tech Ltd',
    trade_name: 'CyberSoft',
    domain: 'cybersoft.com',
    owner_name: 'Anish Kapadia',
    owner_email: 'anish@cybersoft.com',
    industry: 'Cybersecurity',
    country: 'India',
    city: 'Hyderabad',
    employee_count: 120,
    active_users_count: 85,
    plan: 'Professional',
    status: 'Trial',
    health: 'Healthy',
    health_score: 82,
    health_signals: [
      { category: 'Activity', status: 'Good', detail: '14 days left in 30-day enterprise trial', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: 'Onboarding completed for 120 employees', scoreImpact: 0 },
      { category: 'Billing', status: 'Warning', detail: 'No payment method attached yet', scoreImpact: -10 },
      { category: 'Integrations', status: 'Good', detail: 'Slack & Email alerts active', scoreImpact: 0 },
    ],
    created_at: '2026-08-01',
    renewal_date: '2026-08-25',
    mrr: 45000,
    gstin: '36AAACC7766L1Z4',
    storage_used_gb: 18,
    storage_quota_gb: 50,
    last_activity: '2026-08-14 08:15 AM',
  },
  {
    id: 'org-zenith-04',
    legal_name: 'Zenith Logistics & Supply Chain',
    trade_name: 'Zenith Logistics',
    domain: 'zenithlog.com',
    owner_name: 'Meera Nair',
    owner_email: 'meera@zenithlog.com',
    industry: 'Logistics & Supply Chain',
    country: 'India',
    city: 'Chennai',
    employee_count: 650,
    active_users_count: 410,
    plan: 'Enterprise',
    status: 'Payment Pending',
    health: 'At Risk',
    health_score: 54,
    health_signals: [
      { category: 'Activity', status: 'Warning', detail: 'No admin login for 4 days', scoreImpact: -15 },
      { category: 'Utilization', status: 'Good', detail: '650 / 800 seats active', scoreImpact: 0 },
      { category: 'Billing', status: 'Critical', detail: 'August renewal invoice overdue by 4 days (₹2.47L)', scoreImpact: -25 },
      { category: 'Integrations', status: 'Warning', detail: 'ZK Teco Biometric IP ping timeout on 2 devices', scoreImpact: -6 },
    ],
    created_at: '2024-06-10',
    renewal_date: '2026-08-10',
    mrr: 210000,
    gstin: '33AAACZ5544M1Z6',
    storage_used_gb: 145,
    storage_quota_gb: 500,
    last_activity: '2026-08-10 03:20 PM',
  },
  {
    id: 'org-innovate-05',
    legal_name: 'Innovate Labs Pvt Ltd',
    trade_name: 'Innovate AI',
    domain: 'innovatelabs.ai',
    owner_name: 'Vikram Sethi',
    owner_email: 'vikram@innovatelabs.ai',
    industry: 'Artificial Intelligence',
    country: 'India',
    city: 'Pune',
    employee_count: 45,
    active_users_count: 45,
    plan: 'Starter',
    status: 'Active',
    health: 'Healthy',
    health_score: 92,
    health_signals: [
      { category: 'Activity', status: 'Good', detail: '100% daily check-in rate via GPS geofence', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: '45 / 50 seats used (90% capacity)', scoreImpact: 0 },
      { category: 'Billing', status: 'Good', detail: 'Paid via Corporate UPI', scoreImpact: 0 },
      { category: 'Integrations', status: 'Good', detail: 'AI Copilot feature override active', scoreImpact: 0 },
    ],
    created_at: '2025-02-15',
    renewal_date: '2027-02-15',
    mrr: 18000,
    gstin: '27AAACI3322N1Z8',
    storage_used_gb: 8,
    storage_quota_gb: 20,
    last_activity: '2026-08-13 05:40 PM',
  },
  {
    id: 'org-apex-06',
    legal_name: 'Apex Financial Services Ltd',
    trade_name: 'Apex Capital',
    domain: 'apexcap.in',
    owner_name: 'Pooja Agarwal',
    owner_email: 'pooja@apexcap.in',
    industry: 'Banking & Financial Services',
    country: 'India',
    city: 'Mumbai',
    employee_count: 920,
    active_users_count: 890,
    plan: 'Enterprise',
    status: 'Active',
    health: 'Healthy',
    health_score: 98,
    health_signals: [
      { category: 'Activity', status: 'Good', detail: 'SOC2 mandatory audit log archival active', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: '920 / 1000 enterprise licenses utilized', scoreImpact: 0 },
      { category: 'Billing', status: 'Good', detail: 'Bank wire verified for 3-year term', scoreImpact: 0 },
      { category: 'Integrations', status: 'Good', detail: 'Direct SAP Payroll GL export integrated', scoreImpact: 0 },
    ],
    created_at: '2023-11-01',
    renewal_date: '2026-11-01',
    mrr: 320000,
    gstin: '27AAACA1100P1Z0',
    storage_used_gb: 310,
    storage_quota_gb: 500,
    last_activity: '2026-08-14 11:00 AM',
  },
];

function getLocalTenants(): TenantOrganization[] {
  try {
    const raw = localStorage.getItem(LOCAL_TENANTS_KEY);
    return raw ? JSON.parse(raw) : initialTenants;
  } catch {
    return initialTenants;
  }
}

function saveLocalTenants(tenants: TenantOrganization[]): void {
  try {
    localStorage.setItem(LOCAL_TENANTS_KEY, JSON.stringify(tenants));
  } catch (err) {
    console.error('Failed to save tenants locally', err);
  }
}

export function calculateHealthScore(status: TenantStatus, signals: TenantHealthSignal[]): { grade: TenantHealthGrade; score: number } {
  let score = 100;
  signals.forEach(s => {
    score += s.scoreImpact;
  });

  if (status === 'Suspended' || status === 'Locked') score = 20;
  if (status === 'Payment Pending') score = Math.min(score, 55);

  score = Math.max(0, Math.min(100, score));
  const grade: TenantHealthGrade = score >= 75 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical';
  return { grade, score };
}

export const platformTenantService = {
  async getTenants(): Promise<TenantOrganization[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await db('organizations').select('*').order('created_at', { ascending: false });
        if (data && !error && data.length > 0) {
          // Merge Supabase records with rich metadata
          const localList = getLocalTenants();
          return data.map((org: any) => {
            const match = localList.find(t => t.id === org.id);
            return {
              id: org.id,
              legal_name: org.name || org.legal_name || 'Organization',
              trade_name: org.trade_name || org.name || 'Organization',
              domain: match?.domain || `${org.id}.workforceos.com`,
              owner_name: org.owner_name || match?.owner_name || 'Admin',
              owner_email: org.owner_email || match?.owner_email || 'admin@acme.com',
              industry: org.industry || 'Technology Services',
              country: org.country || 'India',
              city: org.city || 'Coimbatore',
              employee_count: match?.employee_count || 10,
              active_users_count: match?.active_users_count || 8,
              plan: (org.plan as any) || match?.plan || 'Starter',
              status: (org.status as any) || match?.status || 'Active',
              health: (org.health as any) || match?.health || 'Healthy',
              health_score: match?.health_score || 90,
              health_signals: match?.health_signals || [],
              created_at: org.created_at ? org.created_at.split('T')[0] : '2026-08-14',
              renewal_date: match?.renewal_date || '2027-08-14',
              mrr: Number(org.mrr) || match?.mrr || 45000,
              gstin: org.gstin || match?.gstin,
              storage_used_gb: match?.storage_used_gb || 5,
              storage_quota_gb: match?.storage_quota_gb || 50,
              last_activity: match?.last_activity || 'Just now',
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getTenants fallback to local store', err);
      }
    }
    return getLocalTenants();
  },

  async getTenantById(id: string): Promise<TenantOrganization | null> {
    const list = await this.getTenants();
    return list.find(t => t.id === id) || null;
  },

  async createTenant(input: Partial<TenantOrganization>): Promise<TenantOrganization> {
    const newId = input.id || `org-${Date.now().toString(36)}`;
    const plan = input.plan || 'Starter';
    const mrr = plan === 'Enterprise' ? 180000 : plan === 'Business' ? 85000 : plan === 'Professional' ? 45000 : 18000;
    const storage_quota_gb = plan === 'Enterprise' ? 500 : plan === 'Business' ? 100 : plan === 'Professional' ? 50 : 20;

    const defaultSignals: TenantHealthSignal[] = [
      { category: 'Activity', status: 'Good', detail: 'Organization initialized successfully', scoreImpact: 0 },
      { category: 'Utilization', status: 'Good', detail: `0 / ${input.employee_count || 50} seats used`, scoreImpact: 0 },
      { category: 'Billing', status: 'Good', detail: 'Subscription provisioned', scoreImpact: 0 },
      { category: 'Integrations', status: 'Good', detail: 'Core modules ready', scoreImpact: 0 },
    ];

    const newTenant: TenantOrganization = {
      id: newId,
      legal_name: input.legal_name || 'New Organization Pvt Ltd',
      trade_name: input.trade_name || input.legal_name || 'New Organization',
      domain: input.domain || `${newId}.workforceos.com`,
      owner_name: input.owner_name || 'Account Admin',
      owner_email: input.owner_email || 'admin@neworg.com',
      industry: input.industry || 'Information Technology',
      country: input.country || 'India',
      city: input.city || 'Coimbatore',
      employee_count: input.employee_count || 50,
      active_users_count: 1,
      plan: plan,
      status: input.status || 'Active',
      health: 'Healthy',
      health_score: 100,
      health_signals: defaultSignals,
      created_at: new Date().toISOString().split('T')[0],
      renewal_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      mrr: mrr,
      gstin: input.gstin || '33AAACN0000A1Z5',
      storage_used_gb: 1,
      storage_quota_gb: storage_quota_gb,
      last_activity: 'Just now',
    };

    // Save to local store
    const list = getLocalTenants();
    saveLocalTenants([newTenant, ...list]);

    // Save to Supabase if connected
    if (isSupabaseEnabled) {
      try {
        await db('organizations').insert({
          id: newTenant.id,
          name: newTenant.legal_name,
          industry: newTenant.industry,
          default_currency: 'INR',
          timezone: 'Asia/Kolkata',
          status: newTenant.status,
          plan: newTenant.plan,
          owner_name: newTenant.owner_name,
          owner_email: newTenant.owner_email,
          mrr: newTenant.mrr,
          gstin: newTenant.gstin,
          health: newTenant.health,
        });
      } catch (err) {
        console.error('Failed to insert new tenant to Supabase', err);
      }
    }

    // Record Audit Event
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: newTenant.id,
      organization_name: newTenant.legal_name,
      action: 'TENANT_CREATED',
      resource_type: 'Tenant',
      resource_id: newTenant.id,
      severity: 'Normal',
      reason: `Provisioned organization on ${newTenant.plan} plan`,
    });

    return newTenant;
  },

  async updateTenantStatus(id: string, status: TenantStatus, reason?: string): Promise<TenantOrganization> {
    const list = getLocalTenants();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tenant not found');

    const previousStatus = list[index].status;
    list[index].status = status;
    const { grade, score } = calculateHealthScore(status, list[index].health_signals || []);
    list[index].health = grade;
    list[index].health_score = score;
    list[index].last_activity = 'Just now';

    saveLocalTenants(list);

    if (isSupabaseEnabled) {
      try {
        await db('organizations').update({ status, health: grade, updated_at: new Date().toISOString() }).eq('id', id);
      } catch (err) {
        console.error('Failed to update tenant status in Supabase', err);
      }
    }

    // Log Audit Event
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: id,
      organization_name: list[index].legal_name,
      action: `TENANT_STATUS_CHANGED`,
      resource_type: 'Tenant',
      resource_id: id,
      severity: status === 'Suspended' || status === 'Cancelled' ? 'High' : 'Normal',
      reason: reason || `Status updated from ${previousStatus} to ${status}`,
    });

    return list[index];
  },

  async changeTenantPlan(id: string, newPlan: TenantOrganization['plan'], reason?: string): Promise<TenantOrganization> {
    const list = getLocalTenants();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tenant not found');

    const oldPlan = list[index].plan;
    list[index].plan = newPlan;
    list[index].mrr = newPlan === 'Enterprise' ? 180000 : newPlan === 'Business' ? 85000 : newPlan === 'Professional' ? 45000 : 18000;
    list[index].storage_quota_gb = newPlan === 'Enterprise' ? 500 : newPlan === 'Business' ? 100 : newPlan === 'Professional' ? 50 : 20;

    saveLocalTenants(list);

    if (isSupabaseEnabled) {
      try {
        await db('organizations').update({ plan: newPlan, mrr: list[index].mrr, updated_at: new Date().toISOString() }).eq('id', id);
      } catch (err) {
        console.error('Failed to update tenant plan in Supabase', err);
      }
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: id,
      organization_name: list[index].legal_name,
      action: 'TENANT_PLAN_MODIFIED',
      resource_type: 'Tenant',
      resource_id: id,
      severity: 'Normal',
      reason: reason || `Upgraded/changed plan from ${oldPlan} to ${newPlan}`,
    });

    return list[index];
  },
};
