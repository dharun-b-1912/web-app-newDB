// src/services/platform/platformTenantService.ts
// ============================================================
// Joy PeopleHR — Platform Organizations & Tenant Directory Service
// ============================================================

import { platformAuditService } from './platformAuditService';
import { HealthGrade } from './platformCustomerHealthService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export type OrgLifecycleState =
  | 'Onboarding'
  | 'Trial'
  | 'Active'
  | 'Growing'
  | 'Renewal'
  | 'At Risk'
  | 'Suspended'
  | 'Churned';

export type OrgBillingStatus = 'Paid' | 'Past Due' | 'Payment Failed' | 'Pending' | 'Canceled';
export type OrgStatus = 'Active' | 'Trial' | 'Suspended' | 'Payment Pending';
export type PlanTier = 'Starter' | 'Professional' | 'Business' | 'Enterprise';

export interface OrgInternalNote {
  id: string;
  author: string;
  created_at: string;
  text: string;
}

export interface OrgActivityItem {
  id: string;
  event: string;
  actor: string;
  timestamp: string;
  category: 'Authentication' | 'HR' | 'Payroll' | 'Billing' | 'API' | 'Integrations' | 'Support' | 'Security' | 'Administration';
  source: string;
}

export interface OrgIntegrationItem {
  id: string;
  name: string;
  category: 'Communication' | 'Hardware' | 'Auth' | 'Messaging' | 'Cloud';
  status: 'Connected' | 'Degraded' | 'Disconnected';
  connected_date: string;
  last_event: string;
  failure_rate_pct: number;
  metric_summary: string;
}

export interface OrganizationRecord {
  id: string; // e.g. 'org-joy-corp'
  tenant_id: string;
  legal_name: string;
  display_name: string;
  domain: string;
  industry: string;
  country: string;
  state: string;
  city: string;
  timezone: string;
  currency: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  logo_url?: string;

  // Primary Admin & Account Owner
  primary_admin_id: string;
  primary_admin_name: string;
  primary_admin_email: string;
  primary_admin_phone: string;
  account_owner_name: string;
  account_owner_team: 'Customer Success' | 'Sales' | 'Finance' | 'Support' | 'Platform Admin';

  // Lifecycle & Status
  status: OrgStatus;
  lifecycle_state: OrgLifecycleState;
  billing_status: OrgBillingStatus;
  is_watchlisted: boolean;
  tags: string[];

  // Plan & Commercials
  plan: PlanTier;
  mrr: number;
  mrr_formatted: string;
  billing_cycle: 'Monthly' | 'Quarterly' | 'Annual';
  created_at: string;
  updated_at?: string;
  renewal_date: string;
  auto_renew: boolean;

  // Headcount & Usage Telemetry
  active_employees: number;
  total_employees: number;
  seat_limit: number;
  seat_utilization_pct: number;
  storage_used_gb: number;
  storage_quota_gb: number;
  api_calls_this_month: number;
  feature_adoption_pct: number;
  attendance_usage_pct: number;
  payroll_usage_pct: number;

  // Health Metrics
  health_score: number;
  health_grade: HealthGrade;
  health_trend: number;
  engagement_score: number;
  usage_score: number;
  billing_score: number;
  support_score: number;
  primary_risk: string;

  // Activity
  last_activity_event: string;
  last_activity_time: string;
  last_activity_timestamp: string;

  // People Breakdowns
  people_summary: {
    total_employees: number;
    active_employees: number;
    inactive_employees: number;
    pending_invitations: number;
    admins_count: number;
    managers_count: number;
  };

  // Support Summary
  support_summary: {
    open_tickets: number;
    pending_tickets: number;
    critical_tickets: number;
    sla_breaches: number;
    csat_score: number;
  };

  // Security Summary
  security_summary: {
    active_sessions_count: number;
    admin_users_count: number;
    mfa_adoption_pct: number;
    recent_suspicious_events: number;
    api_key_status: 'Active' | 'Expiring' | 'Revoked';
  };

  // Collections
  integrations: OrgIntegrationItem[];
  internal_notes: OrgInternalNote[];
  activity_log: OrgActivityItem[];
}

export interface OrgQueryParams {
  search?: string;
  status?: string;
  lifecycle?: string;
  health?: string;
  plan?: string;
  billing_status?: string;
  owner?: string;
  industry?: string;
  tag?: string;
  watchlisted_only?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'name' | 'health' | 'employees' | 'mrr' | 'created_at' | 'last_activity' | 'renewal_date' | 'risk_priority';
  sort_dir?: 'asc' | 'desc';
}

export interface PaginatedOrganizations {
  items: OrganizationRecord[];
  total: number;
  filtered_total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Canonical Primary Test Organization: Joy Corporate Solutions Pvt Ltd
const defaultJoyCorp: OrganizationRecord = {
  id: 'org-joy-corp',
  tenant_id: 'org-joy-corp',
  legal_name: 'Joy Corporate Solutions Pvt Ltd',
  display_name: 'Joy Corporate Solutions',
  domain: 'joycorporate.com',
  industry: 'Enterprise Cloud & HR Operations',
  country: 'India',
  state: 'Tamil Nadu',
  city: 'Chennai',
  timezone: 'Asia/Kolkata (IST)',
  currency: 'INR (₹)',
  gstin: undefined,
  pan: undefined,
  cin: undefined,
  primary_admin_id: 'user-dharun-01',
  primary_admin_name: 'Dharun B',
  primary_admin_email: 'dharun@joycorporate.com',
  primary_admin_phone: '+91 98765 43210',
  account_owner_name: 'Arun Kumar (Super Admin)',
  account_owner_team: 'Customer Success',
  status: 'Active',
  lifecycle_state: 'Active',
  billing_status: 'Paid',
  is_watchlisted: false,
  tags: ['Primary Test Tenant', 'Enterprise', 'India', 'Paid Customer'],
  plan: 'Professional',
  mrr: 45000,
  mrr_formatted: '₹45,000',
  billing_cycle: 'Monthly',
  created_at: new Date().toISOString().split('T')[0],
  renewal_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
  auto_renew: true,
  active_employees: 42,
  total_employees: 45,
  seat_limit: 100,
  seat_utilization_pct: 42,
  storage_used_gb: 4.2,
  storage_quota_gb: 50,
  api_calls_this_month: 18450,
  feature_adoption_pct: 78,
  attendance_usage_pct: 88,
  payroll_usage_pct: 92,
  health_score: 94,
  health_grade: 'Healthy',
  health_trend: +3,
  engagement_score: 24,
  usage_score: 23,
  billing_score: 25,
  support_score: 22,
  primary_risk: 'None (Healthy Commercial Lifecycle)',
  last_activity_event: 'Processed Monthly Payroll Run & Shift Roster',
  last_activity_time: '10 minutes ago',
  last_activity_timestamp: new Date().toLocaleString(),
  people_summary: {
    total_employees: 45,
    active_employees: 42,
    inactive_employees: 3,
    pending_invitations: 0,
    admins_count: 2,
    managers_count: 5,
  },
  support_summary: {
    open_tickets: 0,
    pending_tickets: 0,
    critical_tickets: 0,
    sla_breaches: 0,
    csat_score: 4.9,
  },
  security_summary: {
    active_sessions_count: 14,
    admin_users_count: 2,
    mfa_adoption_pct: 100,
    recent_suspicious_events: 0,
    api_key_status: 'Active',
  },
  integrations: [
    {
      id: 'int-1',
      name: 'Razorpay Payment Gateway (Test)',
      category: 'Cloud',
      status: 'Connected',
      connected_date: '2026-08-01',
      last_event: 'Auto-debit verified',
      failure_rate_pct: 0,
      metric_summary: '100% success rate on test invoices',
    },
    {
      id: 'int-2',
      name: 'WhatsApp Business API Mesh',
      category: 'Messaging',
      status: 'Connected',
      connected_date: '2026-08-05',
      last_event: 'Shift roster dispatched',
      failure_rate_pct: 0.1,
      metric_summary: '1,280 messages delivered',
    },
  ],
  internal_notes: [
    {
      id: 'note-1',
      author: 'Arun Kumar (Super Admin)',
      created_at: new Date().toISOString().split('T')[0],
      text: 'Joy Corporate Solutions Pvt Ltd established as primary verified customer on Professional Plan.',
    },
  ],
  activity_log: [
    {
      id: 'act-1',
      event: 'Invoice INV-2026-000001 (₹53,100) successfully settled via Sandbox Gateway',
      actor: 'Razorpay Sandbox Webhook',
      timestamp: new Date().toLocaleString(),
      category: 'Billing',
      source: 'Payment Adapter',
    },
  ],
};

let organizationDb: OrganizationRecord[] = [defaultJoyCorp];

export const platformTenantService = {
  getOrganizations(params: OrgQueryParams = {}): PaginatedOrganizations {
    let list = [...organizationDb];

    // Filter by Search Query
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.legal_name.toLowerCase().includes(q) ||
          o.display_name.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.domain.toLowerCase().includes(q) ||
          o.primary_admin_email.toLowerCase().includes(q)
      );
    }

    // Filter by Status / Lifecycle
    if (params.status && params.status !== 'all') {
      list = list.filter((o) => o.status.toLowerCase() === params.status?.toLowerCase());
    }
    if (params.lifecycle && params.lifecycle !== 'all') {
      list = list.filter((o) => o.lifecycle_state.toLowerCase() === params.lifecycle?.toLowerCase());
    }
    if (params.plan && params.plan !== 'all') {
      list = list.filter((o) => o.plan.toLowerCase() === params.plan?.toLowerCase());
    }
    if (params.billing_status && params.billing_status !== 'all') {
      list = list.filter((o) => o.billing_status.toLowerCase() === params.billing_status?.toLowerCase());
    }

    const total = organizationDb.length;
    const filtered_total = list.length;
    const page = params.page || 1;
    const page_size = params.page_size || 10;
    const total_pages = Math.ceil(filtered_total / page_size) || 1;

    const startIndex = (page - 1) * page_size;
    const items = list.slice(startIndex, startIndex + page_size);

    return {
      items,
      total,
      filtered_total,
      page,
      page_size,
      total_pages,
    };
  },

  getOrganizationById(id: string): OrganizationRecord | undefined {
    return organizationDb.find((o) => o.id === id || o.tenant_id === id);
  },

  getMetrics() {
    return {
      total: organizationDb.length,
      active: organizationDb.filter((o) => o.status === 'Active').length,
      trial: organizationDb.filter((o) => o.status === 'Trial').length,
      at_risk: organizationDb.filter((o) => o.health_grade === 'At Risk' || o.health_grade === 'Critical').length,
      suspended: organizationDb.filter((o) => o.status === 'Suspended').length,
      onboarding: organizationDb.filter((o) => o.lifecycle_state === 'Onboarding').length,
    };
  },

  getPortfolioCounts() {
    return this.getMetrics();
  },

  async syncOrganizations() {
    return this.fetchLiveFromSupabase();
  },

  /**
   * Fetch live organizations directly from Supabase PostgreSQL tables.
   */
  async fetchLiveFromSupabase(): Promise<OrganizationRecord[]> {
    if (!isSupabaseEnabled) return organizationDb;

    try {
      const { data: orgRows, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (orgRows && orgRows.length > 0) {
        const liveList: OrganizationRecord[] = orgRows.map((row: any) => {
          const existing = organizationDb.find((o) => o.id === row.id || o.tenant_id === row.id);
          return {
            id: row.id,
            tenant_id: row.tenant_id || row.id,
            legal_name: row.legal_name || row.name || 'Organization',
            display_name: row.display_name || row.name || 'Organization',
            domain: row.domain || 'example.com',
            industry: row.industry || 'Enterprise Services',
            country: row.country || 'India',
            state: row.state || 'Tamil Nadu',
            city: row.city || 'Chennai',
            timezone: row.timezone || 'Asia/Kolkata (IST)',
            currency: row.currency || 'INR (₹)',
            gstin: row.gstin || undefined,
            pan: row.pan || undefined,
            cin: row.cin || undefined,
            primary_admin_id: row.primary_admin_id || 'user-admin',
            primary_admin_name: row.primary_admin_name || 'Primary Admin',
            primary_admin_email: row.primary_admin_email || 'admin@' + (row.domain || 'example.com'),
            primary_admin_phone: row.primary_admin_phone || '+91 98765 43210',
            account_owner_name: row.account_owner_name || 'Arun Kumar (Super Admin)',
            account_owner_team: 'Customer Success',
            status: (row.status as any) || 'Active',
            lifecycle_state: (row.lifecycle_state as any) || 'Active',
            billing_status: (row.billing_status as any) || 'Paid',
            is_watchlisted: false,
            tags: row.tags || ['Verified SaaS Customer'],
            plan: (row.plan as any) || 'Professional',
            mrr: Number(row.mrr) || 45000,
            mrr_formatted: `₹${(Number(row.mrr) || 45000).toLocaleString('en-IN')}`,
            billing_cycle: row.billing_cycle || 'Monthly',
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || undefined,
            renewal_date: row.renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            auto_renew: row.auto_renew !== undefined ? row.auto_renew : true,
            active_employees: Number(row.active_employees) || 42,
            total_employees: Number(row.total_employees) || 45,
            seat_limit: Number(row.seat_limit) || 100,
            seat_utilization_pct: Number(row.seat_utilization_pct) || 42,
            storage_used_gb: Number(row.storage_used_gb) || 4.2,
            storage_quota_gb: Number(row.storage_quota_gb) || 50,
            api_calls_this_month: Number(row.api_calls_this_month) || 18450,
            feature_adoption_pct: 78,
            attendance_usage_pct: 88,
            payroll_usage_pct: 92,
            health_score: Number(row.health_score) || 94,
            health_grade: (row.health_grade as any) || 'Healthy',
            health_trend: +3,
            engagement_score: 24,
            usage_score: 23,
            billing_score: 25,
            support_score: 22,
            primary_risk: 'None (Healthy Commercial Lifecycle)',
            last_activity_event: 'Live Organization Telemetry Synchronized',
            last_activity_time: 'Just now',
            last_activity_timestamp: new Date().toLocaleString(),
            people_summary: existing?.people_summary || {
              total_employees: 45,
              active_employees: 42,
              inactive_employees: 3,
              pending_invitations: 0,
              admins_count: 2,
              managers_count: 5,
            },
            support_summary: existing?.support_summary || {
              open_tickets: 0,
              pending_tickets: 0,
              critical_tickets: 0,
              sla_breaches: 0,
              csat_score: 4.9,
            },
            security_summary: existing?.security_summary || {
              active_sessions_count: 14,
              admin_users_count: 2,
              mfa_adoption_pct: 100,
              recent_suspicious_events: 0,
              api_key_status: 'Active',
            },
            integrations: existing?.integrations || defaultJoyCorp.integrations,
            internal_notes: existing?.internal_notes || defaultJoyCorp.internal_notes,
            activity_log: existing?.activity_log || defaultJoyCorp.activity_log,
          };
        });

        organizationDb = liveList;
      }
    } catch (err) {
      console.warn('[PlatformTenantService] Realtime Supabase fetch fallback:', err);
    }

    return organizationDb;
  },

  async updateOrganization(
    id: string,
    updates: Partial<OrganizationRecord>,
    customReason?: string
  ): Promise<OrganizationRecord> {
    const idx = organizationDb.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Organization not found');

    const previous = { ...organizationDb[idx] };
    organizationDb[idx] = {
      ...organizationDb[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update in Supabase tables
    if (isSupabaseEnabled) {
      try {
        await supabase.from('organizations').update(updates).eq('id', id);
        await supabase
          .from('customer_profiles')
          .update({
            legal_name: updates.legal_name || previous.legal_name,
            display_name: updates.display_name || previous.display_name,
            industry: updates.industry || previous.industry,
          })
          .eq('organization_id', id);
      } catch (err) {
        console.warn('[PlatformTenantService] Supabase update fallback:', err);
      }
    }

    // Append to organization activity log
    organizationDb[idx].activity_log.unshift({
      id: `act-${Date.now()}`,
      event: customReason || `Platform Admin updated company profile details`,
      actor: 'Thirumalai R K (Platform Admin)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Administration',
      source: 'Platform Operations',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: id,
      organization_name: organizationDb[idx].legal_name,
      action: 'ORGANIZATION_UPDATED',
      resource_type: 'Organization',
      resource_id: id,
      severity: 'Normal',
      reason: customReason || `Updated company metadata for ${organizationDb[idx].legal_name}`,
    });

    return organizationDb[idx];
  },

  async suspendOrganization(id: string, reason?: string, notifyAdmin?: boolean): Promise<OrganizationRecord> {
    const org = this.getOrganizationById(id);
    if (!org) throw new Error('Organization not found');

    const suspensionReason = reason || 'Administrative suspension';
    org.status = 'Suspended';
    org.lifecycle_state = 'Suspended';

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('organizations')
          .update({ status: 'Suspended', lifecycle_state: 'Suspended' })
          .eq('id', id);
      } catch (err) {
        console.warn('[PlatformTenantService] Supabase suspend fallback:', err);
      }
    }

    org.activity_log.unshift({
      id: `act-${Date.now()}`,
      event: `Platform Admin suspended customer access: ${suspensionReason}`,
      actor: 'Thirumalai R K (Platform Admin)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Security',
      source: 'Lifecycle Controller',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: id,
      organization_name: org.legal_name,
      action: 'ORGANIZATION_SUSPENDED',
      resource_type: 'Organization',
      resource_id: id,
      severity: 'High',
      reason: suspensionReason,
    });

    return org;
  },

  async reactivateOrganization(id: string, reason?: string): Promise<OrganizationRecord> {
    const org = this.getOrganizationById(id);
    if (!org) throw new Error('Organization not found');

    const reactivateNote = reason || 'Account reactivated by Platform Admin';
    org.status = 'Active';
    org.lifecycle_state = 'Active';

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('organizations')
          .update({ status: 'Active', lifecycle_state: 'Active' })
          .eq('id', id);
      } catch (err) {
        console.warn('[PlatformTenantService] Supabase reactivate fallback:', err);
      }
    }

    org.activity_log.unshift({
      id: `act-${Date.now()}`,
      event: `Platform Admin reactivated customer account: ${reactivateNote}`,
      actor: 'Thirumalai R K (Platform Admin)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'Administration',
      source: 'Lifecycle Controller',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: id,
      organization_name: org.legal_name,
      action: 'ORGANIZATION_REACTIVATED',
      resource_type: 'Organization',
      resource_id: id,
      severity: 'High',
      reason: reactivateNote,
    });

    return org;
  },

  async addInternalNote(id: string, text: string, author?: string): Promise<OrgInternalNote> {
    const org = this.getOrganizationById(id);
    const newNote: OrgInternalNote = {
      id: `note-${Date.now()}`,
      author: author || 'WorkForce Super Admin',
      created_at: new Date().toISOString().split('T')[0],
      text,
    };
    if (org) {
      org.internal_notes.unshift(newNote);
    }
    return newNote;
  },

  async provisionOrganization(payload: any): Promise<OrganizationRecord> {
    const orgId = `org-${payload.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}-${Date.now().toString().slice(-4)}`;
    const planPrices: Record<string, number> = {
      Starter: 18000,
      Professional: 45000,
      Business: 85000,
      Enterprise: 180000,
    };
    const chosenPlan = payload.plan || 'Starter';
    const mrrAmount = planPrices[chosenPlan] || 18000;

    const newOrg: OrganizationRecord = {
      id: orgId,
      tenant_id: orgId,
      legal_name: payload.company_name,
      display_name: payload.display_name || payload.company_name,
      domain: payload.domain || `${orgId}.workforceos.com`,
      industry: payload.industry || 'Information Technology',
      country: payload.country || 'India',
      state: payload.state || 'Tamil Nadu',
      city: payload.city || 'Chennai',
      timezone: payload.timezone || 'Asia/Kolkata (IST)',
      currency: payload.currency || 'INR (₹)',
      gstin: payload.gstin || undefined,
      pan: payload.pan || undefined,
      cin: payload.cin || undefined,
      primary_admin_id: `user-${Date.now()}`,
      primary_admin_name: payload.admin_name,
      primary_admin_email: payload.admin_email,
      primary_admin_phone: payload.admin_phone || '+91 90000 00000',
      account_owner_name: 'WorkForce Super Admin',
      account_owner_team: 'Platform Admin',
      status: payload.is_trial ? 'Trial' : 'Active',
      lifecycle_state: payload.is_trial ? 'Trial' : 'Onboarding',
      billing_status: payload.is_trial ? 'Pending' : 'Paid',
      is_watchlisted: false,
      tags: [chosenPlan, 'New Customer'],
      plan: chosenPlan as PlanTier,
      mrr: mrrAmount,
      mrr_formatted: `₹${mrrAmount.toLocaleString('en-IN')}`,
      billing_cycle: payload.billing_cycle || 'Monthly',
      created_at: new Date().toISOString().split('T')[0],
      renewal_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      auto_renew: true,
      active_employees: 1,
      total_employees: 1,
      seat_limit: Number(payload.seat_limit) || 50,
      seat_utilization_pct: 2,
      storage_used_gb: 0.1,
      storage_quota_gb: chosenPlan === 'Enterprise' ? 500 : 100,
      api_calls_this_month: 0,
      feature_adoption_pct: 10,
      attendance_usage_pct: 0,
      payroll_usage_pct: 0,
      health_score: 90,
      health_grade: 'Healthy',
      health_trend: 0,
      engagement_score: 22,
      usage_score: 22,
      billing_score: 25,
      support_score: 21,
      primary_risk: 'None (Newly Provisioned Tenant)',
      last_activity_event: 'Organization provisioned',
      last_activity_time: 'Just now',
      last_activity_timestamp: new Date().toLocaleString(),
      people_summary: {
        total_employees: 1,
        active_employees: 1,
        inactive_employees: 0,
        pending_invitations: 0,
        admins_count: 1,
        managers_count: 0,
      },
      support_summary: {
        open_tickets: 0,
        pending_tickets: 0,
        critical_tickets: 0,
        sla_breaches: 0,
        csat_score: 5.0,
      },
      security_summary: {
        active_sessions_count: 1,
        admin_users_count: 1,
        mfa_adoption_pct: 0,
        recent_suspicious_events: 0,
        api_key_status: 'Active',
      },
      integrations: [],
      internal_notes: [
        { id: `note-${Date.now()}`, author: 'WorkForce Super Admin', created_at: new Date().toISOString().split('T')[0], text: 'Organization successfully provisioned.' },
      ],
      activity_log: [
        { id: `act-${Date.now()}`, event: 'Tenant provisioned and initial admin assigned', actor: 'Super Admin', timestamp: new Date().toLocaleString(), category: 'Administration', source: 'Provisioning Engine' },
      ],
    };

    organizationDb.unshift(newOrg);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('organizations').insert([newOrg]);
      } catch (err) {
        console.warn('[PlatformTenantService] Supabase insert fallback:', err);
      }
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: newOrg.id,
      organization_name: newOrg.legal_name,
      action: 'ORGANIZATION_CREATED',
      resource_type: 'Organization',
      resource_id: newOrg.id,
      severity: 'High',
      reason: `Provisioned new customer organization with ${newOrg.plan} plan (${newOrg.seat_limit} seats).`,
    });

    return newOrg;
  },

  async getTenants(): Promise<OrganizationRecord[]> {
    return organizationDb;
  },

  async createTenant(payload: any): Promise<OrganizationRecord> {
    return this.provisionOrganization(payload);
  },

  async updateTenantStatus(id: string, status: any): Promise<OrganizationRecord> {
    return this.updateOrganization(id, { status });
  },
};
