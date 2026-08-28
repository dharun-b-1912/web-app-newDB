// src/services/platform/platformTierPlansService.ts
// ============================================================
// Joy PeopleHR — SaaS Plans, Features & Entitlements Engine
// ============================================================

import {
  TierPlan,
  PlanFeatureItem,
  TenantSubscriptionItem,
  PlanStatus,
  FeatureCategory,
} from '../../types/tierPlans';
import { platformAuditService } from './platformAuditService';
import { platformSubscriptionService } from './platformSubscriptionService';
import { platformTenantService } from './platformTenantService';

let initialFeatures: PlanFeatureItem[] = [
  // Core HR
  { id: 'f-01', name: 'Core Employee Directory & Org Chart', code: 'CORE_EMPLOYEE_DIR', category: 'Core HR', description: 'Centralized employee profiles, departmental trees, and organization chart.', type: 'Boolean', min_tier_name: 'Starter', is_high_value: false, status: 'Active' },
  { id: 'f-02', name: 'Employee Self-Service (ESS Portal)', code: 'ESS_PORTAL', category: 'Employee Self-Service', description: 'Mobile and web self-service for profile edits, tax declarations, and document downloads.', type: 'Boolean', min_tier_name: 'Starter', is_high_value: false, status: 'Active' },
  { id: 'f-03', name: 'TL & Supervisor Portal', code: 'TEAM_LEAD_PORTAL', category: 'Core HR', description: 'Manager approval workflows for leaves, shift swaps, and attendance regularizations.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: false, status: 'Active' },
  { id: 'f-04', name: 'Document Management & Digital E-Sign', code: 'DOCUMENTS_ESIGN', category: 'Core HR', description: 'Employee contract signing, Aadhaar e-Sign, and automated letter generation.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: true, status: 'Active' },
  
  // Attendance & Tracking
  { id: 'f-05', name: 'Basic Check-in / Check-out', code: 'ATTENDANCE_BASIC', category: 'Attendance', description: 'Web-based and basic mobile clock-in/out logging.', type: 'Boolean', min_tier_name: 'Starter', is_high_value: false, status: 'Active' },
  { id: 'f-06', name: 'GPS Geofence Clock-in', code: 'ATTENDANCE_GPS', category: 'Attendance', description: 'Geofenced mobile check-ins with radius validation for remote and field teams.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: true, status: 'Active' },
  { id: 'f-07', name: 'Shift Scheduling & Roster Management', code: 'ATTENDANCE_ROSTER', category: 'Attendance', description: 'Complex rotational shifts, night allowance calculations, and auto-rosters.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: false, status: 'Active' },
  { id: 'f-08', name: 'Biometric Push Hardware Adapters', code: 'BIOMETRIC_ADAPTERS', category: 'Biometrics & Hardware', description: 'Direct daemon adapter connections for Mantra, eSSL, Suprema, and ZKTeco turnstiles.', type: 'Boolean', min_tier_name: 'Enterprise', is_high_value: true, status: 'Active' },
  
  // Leave
  { id: 'f-09', name: 'Leave Types & Applications', code: 'LEAVE_BASIC', category: 'Leave', description: 'Standard paid, sick, and casual leave policy management.', type: 'Boolean', min_tier_name: 'Starter', is_high_value: false, status: 'Active' },
  { id: 'f-10', name: 'Leave Policies & Auto-Accruals', code: 'LEAVE_AUTO_ACCRUAL', category: 'Leave', description: 'Automated monthly/annual accrual rules, sandwich leaves, and encashment calculators.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: true, status: 'Active' },

  // Payroll
  { id: 'f-11', name: 'Standard Payroll Run', code: 'PAYROLL_STANDARD', category: 'Payroll', description: 'Basic salary calculation, deductions, and bank transfer advice generation.', type: 'Boolean', min_tier_name: 'Starter', is_high_value: false, status: 'Active' },
  { id: 'f-12', name: 'Statutory Compliance (PF/ESI/PT)', code: 'PAYROLL_STATUTORY', category: 'Payroll', description: 'Automated Provident Fund, ESI, Professional Tax, and Form 16 generator.', type: 'Boolean', min_tier_name: 'Professional', is_high_value: true, status: 'Active' },
  { id: 'f-13', name: 'Expense Claims & Travel Desk', code: 'EXPENSE_REIMBURSEMENTS', category: 'Payroll', description: 'Multi-currency expense claims with receipt OCR and payroll reimbursement sync.', type: 'Boolean', min_tier_name: 'Business', is_high_value: false, status: 'Active' },

  // Messaging & WhatsApp
  { id: 'f-14', name: 'WhatsApp Payslips & Approvals', code: 'WHATSAPP_PAYSLIPS', category: 'WhatsApp & Messaging', description: 'Automated payslip PDF delivery and leave approval actions directly over WhatsApp Cloud API.', type: 'Boolean', min_tier_name: 'Business', is_high_value: true, status: 'Active' },

  // Recruitment & Talent
  { id: 'f-15', name: 'Recruitment & ATS Pipeline', code: 'ATS_RECRUITMENT', category: 'Recruitment', description: 'Job board posting, candidate Kanban pipeline, and resume parsing engine.', type: 'Boolean', min_tier_name: 'Business', is_high_value: false, status: 'Active' },
  { id: 'f-16', name: 'LMS Video & SCORM Player', code: 'LMS_TRAINING', category: 'Performance', description: 'Video course modules, interactive SCORM compliance quizzes, and certificates.', type: 'Boolean', min_tier_name: 'Business', is_high_value: false, status: 'Active' },

  // AI & Advanced Intelligence
  { id: 'f-17', name: 'AI Copilot Policy Search', code: 'AI_COPILOT', category: 'AI & Copilot', description: 'Natural language HR assistant for company policies, benefits, and query resolution.', type: 'Boolean', min_tier_name: 'Enterprise', is_high_value: true, status: 'Active' },
  { id: 'f-18', name: 'Advanced BI Analytics & Export', code: 'BI_ANALYTICS', category: 'Performance', description: 'Customizable workforce dashboards, retention heatmaps, and scheduled CSV/PDF exports.', type: 'Boolean', min_tier_name: 'Business', is_high_value: true, status: 'Active' },
  
  // Integrations, Security & Infrastructure
  { id: 'f-19', name: 'Custom Webhooks & HMAC API Keys', code: 'DEV_WEBHOOKS_API', category: 'Integrations & Security', description: 'Full REST API gateway and high-throughput real-time webhook endpoints.', type: 'Boolean', min_tier_name: 'Business', is_high_value: true, status: 'Active' },
  { id: 'f-20', name: '7-Year Immutable Forensic Audit Logs', code: 'FORENSIC_AUDIT_LOGS', category: 'Integrations & Security', description: 'Tamper-evident SOC 2 compliant forensic history of all data changes.', type: 'Boolean', min_tier_name: 'Enterprise', is_high_value: true, status: 'Active' },
  { id: 'f-21', name: 'Dedicated VPC Database Isolation', code: 'DEDICATED_VPC', category: 'Integrations & Security', description: 'Single-tenant database cluster with dedicated encryption keys and VPC peering.', type: 'Boolean', min_tier_name: 'Enterprise', is_high_value: true, status: 'Active' },
  { id: 'f-22', name: '24/7 Dedicated Support Lead & 15m SLA', code: 'SUPPORT_SLA_PREMIUM', category: 'Support & SLAs', description: 'Named technical account manager with 15-minute response SLA and phone hotline.', type: 'Boolean', min_tier_name: 'Enterprise', is_high_value: true, status: 'Active' },
];

let initialPlans: TierPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    code: 'STARTER',
    description: 'Essential core HR, leave, and attendance for small growing teams.',
    target_company_size: '10 – 50 Employees',
    value_proposition: 'Get automated attendance and standard payroll running on day one with zero IT overhead.',
    status: 'Active',
    currency: 'INR',
    monthly_price: 18000,
    annual_price: 180000,
    min_seats: 10,
    included_seats: 50,
    max_seats: 50,
    allow_overage: false,
    price_per_additional_seat: 0,
    features: ['CORE_EMPLOYEE_DIR', 'ESS_PORTAL', 'ATTENDANCE_BASIC', 'LEAVE_BASIC', 'PAYROLL_STANDARD'],
    quotas: {
      max_employees: 50,
      max_locations: 2,
      max_biometric_devices: 0,
      max_api_requests_per_month: 5000,
      max_storage_gb: 10,
      max_whatsapp_messages_per_month: 0,
      support_sla_hours: 48,
      data_retention_years: 1,
      max_admin_seats: 2,
    },
    tenant_count: 0,
    created_at: '2025-01-01',
    updated_at: '2026-08-01',
    internal_notes: 'Optimized for small businesses with single-office operations.',
    history: [
      { id: 'h1', timestamp: '2026-08-01 10:00', actor: 'Platform Lead Anand', change_summary: 'Included seats increased from 35 to 50' },
    ],
  },
  {
    id: 'plan-pro',
    name: 'Professional',
    code: 'PROFESSIONAL',
    description: 'Mid-sized companies needing GPS tracking, leave accruals, and statutory compliance.',
    target_company_size: '50 – 200 Employees',
    value_proposition: 'Complete workforce management with GPS geofencing, multi-branch tracking, and automated statutory PF/ESI.',
    status: 'Active',
    currency: 'INR',
    monthly_price: 45000,
    annual_price: 450000,
    min_seats: 50,
    included_seats: 200,
    max_seats: 200,
    allow_overage: true,
    price_per_additional_seat: 150,
    features: [
      'CORE_EMPLOYEE_DIR',
      'ESS_PORTAL',
      'TEAM_LEAD_PORTAL',
      'DOCUMENTS_ESIGN',
      'ATTENDANCE_BASIC',
      'ATTENDANCE_GPS',
      'ATTENDANCE_ROSTER',
      'LEAVE_BASIC',
      'LEAVE_AUTO_ACCRUAL',
      'PAYROLL_STANDARD',
      'PAYROLL_STATUTORY',
    ],
    quotas: {
      max_employees: 200,
      max_locations: 10,
      max_biometric_devices: 5,
      max_api_requests_per_month: 50000,
      max_storage_gb: 50,
      max_whatsapp_messages_per_month: 2000,
      support_sla_hours: 12,
      data_retention_years: 3,
      max_admin_seats: 10,
    },
    tenant_count: 0,
    created_at: '2025-01-01',
    updated_at: '2026-08-10',
    internal_notes: 'Most popular tier across growing manufacturing and tech clients.',
    history: [
      { id: 'h2', timestamp: '2026-08-10 14:30', actor: 'Super Admin', change_summary: 'Enabled GPS Geofence and Document E-Sign entitlement' },
    ],
  },
  {
    id: 'plan-business',
    name: 'Business',
    code: 'BUSINESS',
    description: 'Advanced workforce management with WhatsApp payslips, recruitment, and deep BI analytics.',
    target_company_size: '200 – 500 Employees',
    value_proposition: 'Full-stack enterprise HR automation with WhatsApp interactive approvals, ATS talent pipeline, and executive BI analytics.',
    status: 'Active',
    currency: 'INR',
    monthly_price: 85000,
    annual_price: 850000,
    min_seats: 100,
    included_seats: 500,
    max_seats: 500,
    allow_overage: true,
    price_per_additional_seat: 120,
    features: [
      'CORE_EMPLOYEE_DIR',
      'ESS_PORTAL',
      'TEAM_LEAD_PORTAL',
      'DOCUMENTS_ESIGN',
      'ATTENDANCE_BASIC',
      'ATTENDANCE_GPS',
      'ATTENDANCE_ROSTER',
      'LEAVE_BASIC',
      'LEAVE_AUTO_ACCRUAL',
      'PAYROLL_STANDARD',
      'PAYROLL_STATUTORY',
      'EXPENSE_REIMBURSEMENTS',
      'WHATSAPP_PAYSLIPS',
      'ATS_RECRUITMENT',
      'LMS_TRAINING',
      'BI_ANALYTICS',
      'DEV_WEBHOOKS_API',
    ],
    quotas: {
      max_employees: 500,
      max_locations: 25,
      max_biometric_devices: 20,
      max_api_requests_per_month: 250000,
      max_storage_gb: 250,
      max_whatsapp_messages_per_month: 10000,
      support_sla_hours: 4,
      data_retention_years: 5,
      max_admin_seats: 25,
    },
    tenant_count: 0,
    created_at: '2025-01-01',
    updated_at: '2026-08-12',
    internal_notes: 'Includes dedicated account manager and priority 4h response SLA.',
    history: [
      { id: 'h3', timestamp: '2026-08-12 09:15', actor: 'Super Admin', change_summary: 'Annual price updated from ₹8,00,000 to ₹8,50,000' },
    ],
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    code: 'ENTERPRISE',
    description: 'Unlimited scalability with biometric push adapters, AI copilot, VPC isolation, and 24/7 SLA.',
    target_company_size: '500 – 5,000+ Employees',
    value_proposition: 'Mission-critical enterprise grade infrastructure with hardware turnstile adapters, AI Copilot, dedicated VPC, and 15-min SLA hotline.',
    status: 'Active',
    currency: 'INR',
    monthly_price: 180000,
    annual_price: 1800000,
    min_seats: 500,
    included_seats: 5000,
    max_seats: -1, // Unlimited
    allow_overage: true,
    price_per_additional_seat: 80,
    features: [
      'CORE_EMPLOYEE_DIR',
      'ESS_PORTAL',
      'TEAM_LEAD_PORTAL',
      'DOCUMENTS_ESIGN',
      'ATTENDANCE_BASIC',
      'ATTENDANCE_GPS',
      'ATTENDANCE_ROSTER',
      'BIOMETRIC_ADAPTERS',
      'LEAVE_BASIC',
      'LEAVE_AUTO_ACCRUAL',
      'PAYROLL_STANDARD',
      'PAYROLL_STATUTORY',
      'EXPENSE_REIMBURSEMENTS',
      'WHATSAPP_PAYSLIPS',
      'ATS_RECRUITMENT',
      'LMS_TRAINING',
      'AI_COPILOT',
      'BI_ANALYTICS',
      'DEV_WEBHOOKS_API',
      'FORENSIC_AUDIT_LOGS',
      'DEDICATED_VPC',
      'SUPPORT_SLA_PREMIUM',
    ],
    quotas: {
      max_employees: 5000,
      max_locations: 100,
      max_biometric_devices: 100,
      max_api_requests_per_month: 2000000,
      max_storage_gb: 1000,
      max_whatsapp_messages_per_month: 50000,
      support_sla_hours: 0.25, // 15 mins
      data_retention_years: 7,
      max_admin_seats: 100,
    },
    tenant_count: 0,
    created_at: '2025-01-01',
    updated_at: '2026-08-14',
    internal_notes: 'Tailored for multi-plant enterprise corporations with bespoke integrations.',
    history: [
      { id: 'h4', timestamp: '2026-08-14 11:00', actor: 'Super Admin', change_summary: 'Added 7-Year Forensic Audit Log & Dedicated VPC entitlement' },
    ],
  },
];

let initialTenantSubscriptions: TenantSubscriptionItem[] = [];

export const platformTierPlansService = {
  // --- Plans CRUD ---
  getPlans(filters?: { status?: string; search?: string }): TierPlan[] {
    const liveSubs = platformSubscriptionService.getSubscriptions();
    const liveOrgs = platformTenantService.getOrganizations();

    let result = initialPlans.map((p) => {
      // Dynamic count of active/trial tenants subscribed to this plan tier
      const subCount = liveSubs.filter(
        (s) =>
          (s.plan_id === p.id ||
            s.plan?.toLowerCase() === p.name.toLowerCase() ||
            s.plan?.toUpperCase() === p.code) &&
          (s.status === 'Active' || s.status === 'Trial')
      ).length;

      const orgCount = liveOrgs.items.filter(
        (o) =>
          (o.plan?.toLowerCase() === p.name.toLowerCase() ||
            o.plan?.toUpperCase() === p.code) &&
          (o.status === 'Active' || o.status === 'Trial')
      ).length;

      return {
        ...p,
        tenant_count: Math.max(subCount, orgCount),
      };
    });

    if (filters?.status && filters.status !== 'All') {
      result = result.filter((p) => p.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return result;
  },

  checkPlanCodeAvailability(code: string): { available: boolean; reason?: string } {
    const formatted = code.trim().toUpperCase();
    if (!formatted) {
      return { available: false, reason: 'Plan code cannot be empty.' };
    }
    const exists = initialPlans.some((p) => p.code.toUpperCase() === formatted);
    if (exists) {
      return { available: false, reason: `Plan code "${formatted}" already exists.` };
    }
    return { available: true };
  },

  getPlanById(id: string): TierPlan | undefined {
    const plans = this.getPlans();
    return plans.find((p) => p.id === id || p.code.toLowerCase() === id.toLowerCase());
  },

  async createPlan(data: Partial<TierPlan> & {
    recommended?: boolean;
    category?: string;
    target_segment?: string;
    billing_model?: string;
    billing_interval?: string;
    trial_enabled?: boolean;
    trial_days?: number;
    setup_fee?: number;
    unlimited_seats?: boolean;
  }): Promise<TierPlan> {
    const code = (data.code || data.name || 'CUSTOM').toUpperCase().trim().replace(/\s+/g, '_');

    if (initialPlans.some((p) => p.code.toUpperCase() === code)) {
      throw new Error(`Plan code "${code}" already exists.`);
    }

    const newPlan: TierPlan = {
      id: `plan-${(data.name || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: data.name || 'New Tier Plan',
      code,
      description: data.description || '',
      target_company_size: data.target_company_size || data.target_segment || 'Growing Organizations',
      value_proposition: data.value_proposition || data.description || '',
      status: data.status || 'Draft',
      currency: data.currency || 'INR',
      monthly_price: Number(data.monthly_price) || 0,
      annual_price: Number(data.annual_price) || (Number(data.monthly_price) || 0) * 10,
      min_seats: Number(data.min_seats) || 10,
      included_seats: Number(data.included_seats) || 50,
      max_seats: data.unlimited_seats ? -1 : Number(data.max_seats) || Number(data.included_seats) || 50,
      allow_overage: !!data.allow_overage,
      price_per_additional_seat: Number(data.price_per_additional_seat) || 0,
      features: data.features || ['CORE_EMPLOYEE_DIR', 'ESS_PORTAL', 'ATTENDANCE_BASIC'],
      quotas: data.quotas || {
        max_employees: Number(data.included_seats) || 50,
        max_locations: 5,
        max_biometric_devices: 2,
        max_api_requests_per_month: 25000,
        max_storage_gb: 25,
        max_whatsapp_messages_per_month: 1000,
      },
      tenant_count: 0,
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
      internal_notes: data.internal_notes || '',
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          actor: 'WorkForce Super Admin',
          change_summary: `Plan created in ${data.status || 'Draft'} state (${data.currency || 'INR'})`,
        },
      ],
    };

    initialPlans.unshift(newPlan);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLAN_CREATED',
      resource_type: 'TierPlan',
      resource_id: newPlan.id,
      severity: 'Normal',
      reason: `Created new SaaS subscription plan "${newPlan.name}" (${newPlan.code})`,
    });

    return newPlan;
  },

  async updatePlan(id: string, updates: Partial<TierPlan>): Promise<TierPlan> {
    const plan = initialPlans.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');

    const beforePrice = `₹${plan.monthly_price.toLocaleString()}`;
    Object.assign(plan, updates, { updated_at: new Date().toISOString().slice(0, 10) });
    const afterPrice = `₹${plan.monthly_price.toLocaleString()}`;

    plan.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: `Plan configuration updated`,
      before_value: `Price: ${beforePrice}`,
      after_value: `Price: ${afterPrice}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLAN_UPDATED',
      resource_type: 'TierPlan',
      resource_id: plan.id,
      severity: 'Normal',
      reason: `Updated plan configuration for ${plan.name}`,
    });

    return plan;
  },

  async duplicatePlan(id: string): Promise<TierPlan> {
    const source = initialPlans.find((p) => p.id === id);
    if (!source) throw new Error('Source plan not found');

    const duplicated = await this.createPlan({
      ...source,
      name: `${source.name} (Copy)`,
      code: `${source.code}_COPY`,
      status: 'Draft',
      tenant_count: 0,
      internal_notes: `Duplicated from ${source.name}`,
    });

    return duplicated;
  },

  async archivePlan(id: string): Promise<TierPlan> {
    const plan = initialPlans.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');

    plan.status = 'Archived';
    plan.updated_at = new Date().toISOString().slice(0, 10);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLAN_ARCHIVED',
      resource_type: 'TierPlan',
      resource_id: plan.id,
      severity: 'High',
      reason: `Archived plan ${plan.name}. Existing ${plan.tenant_count} tenants remain active.`,
    });

    return plan;
  },

  async restorePlan(id: string): Promise<TierPlan> {
    const plan = initialPlans.find((p) => p.id === id);
    if (!plan) throw new Error('Plan not found');

    plan.status = 'Active';
    plan.updated_at = new Date().toISOString().slice(0, 10);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLAN_RESTORED',
      resource_type: 'TierPlan',
      resource_id: plan.id,
      severity: 'Normal',
      reason: `Restored archived plan ${plan.name} back to Active state`,
    });

    return plan;
  },

  async deletePlan(id: string): Promise<void> {
    const idx = initialPlans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    const plan = initialPlans[idx];
    if (plan.tenant_count > 0) {
      throw new Error(`Cannot delete plan ${plan.name}: ${plan.tenant_count} active tenant subscriptions depend on it.`);
    }

    initialPlans.splice(idx, 1);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'PLAN_DELETED',
      resource_type: 'TierPlan',
      resource_id: id,
      severity: 'Critical',
      reason: `Permanently deleted plan ${plan.name}`,
    });
  },

  // --- Features Catalog & Capabilities Engine ---
  getFeatures(filters?: {
    category?: string;
    status?: string;
    search?: string;
    min_tier?: string;
    module?: string;
    plan?: string;
    is_metered?: boolean;
    high_value_only?: boolean;
  }): PlanFeatureItem[] {
    let result = [...initialFeatures];

    if (filters?.category && filters.category !== 'All') {
      result = result.filter((f) => f.category === filters.category);
    }
    if (filters?.status && filters.status !== 'All') {
      result = result.filter((f) => f.status === filters.status || f.lifecycle_status === filters.status);
    }
    if (filters?.min_tier && filters.min_tier !== 'All') {
      result = result.filter((f) => f.min_tier_name === filters.min_tier);
    }
    if (filters?.module && filters.module !== 'All') {
      result = result.filter((f) => (f.module || f.category) === filters.module);
    }
    if (filters?.high_value_only) {
      result = result.filter((f) => f.is_high_value);
    }
    if (filters?.is_metered !== undefined) {
      result = result.filter((f) => !!f.is_metered === filters.is_metered);
    }
    if (filters?.plan && filters.plan !== 'All') {
      const plan = initialPlans.find((p) => p.id === filters.plan || p.name.toLowerCase() === filters.plan?.toLowerCase() || p.code === filters.plan);
      if (plan) {
        result = result.filter((f) => plan.features.includes(f.code));
      }
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.code.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.short_description && f.short_description.toLowerCase().includes(q)) ||
          f.category.toLowerCase().includes(q)
      );
    }
    return result;
  },

  getFeatureMetrics() {
    const all = initialFeatures;
    return {
      total: all.length,
      active: all.filter((f) => f.status === 'Active').length,
      draft: all.filter((f) => f.status === 'Draft').length,
      beta: all.filter((f) => f.status === 'Beta').length,
      deprecated: all.filter((f) => f.status === 'Deprecated').length,
      archived: all.filter((f) => f.status === 'Archived').length,
      needs_attention: all.filter((f) => f.status === 'Deprecated' || !f.description || f.dependencies?.length === 0).length,
    };
  },

  checkFeatureCodeAvailability(code: string): { available: boolean; reason?: string } {
    const formatted = code.trim().toUpperCase().replace(/[^A-Z0-9_.]/g, '');
    if (!formatted) {
      return { available: false, reason: 'Feature code cannot be empty.' };
    }
    const exists = initialFeatures.some((f) => f.code.toUpperCase() === formatted);
    if (exists) {
      return { available: false, reason: `Feature code "${formatted}" is already in use.` };
    }
    return { available: true };
  },

  getFeatureById(id: string): PlanFeatureItem | undefined {
    return initialFeatures.find((f) => f.id === id || f.code.toLowerCase() === id.toLowerCase());
  },

  getFeatureByCode(code: string): PlanFeatureItem | undefined {
    return initialFeatures.find((f) => f.code.toUpperCase() === code.toUpperCase().trim());
  },

  async createFeature(data: Partial<PlanFeatureItem>): Promise<PlanFeatureItem> {
    const code = (data.code || data.name || 'FEATURE').toUpperCase().trim().replace(/[^A-Z0-9_.]/g, '_');

    if (initialFeatures.some((f) => f.code.toUpperCase() === code)) {
      throw new Error(`Feature code "${code}" already exists.`);
    }

    const newFeature: PlanFeatureItem = {
      id: `f-${Date.now().toString().slice(-4)}`,
      name: data.name || 'New Capability Feature',
      code,
      category: data.category || 'Core HR',
      module: data.module || data.category || 'Core HR',
      description: data.description || '',
      short_description: data.short_description || data.description || '',
      detailed_description: data.detailed_description || '',
      type: data.type || 'Boolean',
      value_classification: data.value_classification || 'Standard',
      access_model: data.access_model || 'Boolean Access',
      min_tier_name: data.min_tier_name || 'Starter',
      is_high_value: !!data.is_high_value,
      status: data.status || 'Draft',
      lifecycle_status: data.lifecycle_status || (data.status as any) || 'Draft',
      is_metered: !!data.is_metered,
      usage_resource_code: data.usage_resource_code,
      default_unit: data.default_unit || 'count',
      default_period: data.default_period || 'monthly',
      default_limit: data.default_limit,
      default_overage_policy: data.default_overage_policy || 'Block',
      default_overage_price: data.default_overage_price,
      dependencies: data.dependencies || [],
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 10),
    };

    initialFeatures.unshift(newFeature);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_CREATED',
      resource_type: 'PlanFeature',
      resource_id: newFeature.id,
      severity: 'Normal',
      reason: `Created new entitlement capability "${newFeature.name}" (${newFeature.code})`,
    });

    return newFeature;
  },

  async updateFeature(id: string, updates: Partial<PlanFeatureItem>): Promise<PlanFeatureItem> {
    const feat = initialFeatures.find((f) => f.id === id || f.code.toUpperCase() === id.toUpperCase());
    if (!feat) throw new Error('Feature not found');

    const beforeName = feat.name;
    Object.assign(feat, updates, { updated_at: new Date().toISOString().slice(0, 10) });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_UPDATED',
      resource_type: 'PlanFeature',
      resource_id: feat.id,
      severity: 'Normal',
      reason: `Updated capability "${beforeName}" (${feat.code}) configuration`,
    });

    return feat;
  },

  async duplicateFeature(id: string): Promise<PlanFeatureItem> {
    const source = initialFeatures.find((f) => f.id === id || f.code.toUpperCase() === id.toUpperCase());
    if (!source) throw new Error('Source feature not found');

    const newCode = `${source.code}_V2`;
    const duplicated = await this.createFeature({
      ...source,
      id: `f-${Date.now().toString().slice(-4)}`,
      name: `${source.name} (Copy)`,
      code: newCode,
      status: 'Draft',
      lifecycle_status: 'Draft',
      created_at: new Date().toISOString().slice(0, 10),
    });

    return duplicated;
  },

  async archiveFeature(id: string, reason?: string): Promise<PlanFeatureItem> {
    const feat = initialFeatures.find((f) => f.id === id || f.code.toUpperCase() === id.toUpperCase());
    if (!feat) throw new Error('Feature not found');

    feat.status = 'Archived';
    feat.lifecycle_status = 'Archived';
    feat.updated_at = new Date().toISOString().slice(0, 10);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_ARCHIVED',
      resource_type: 'PlanFeature',
      resource_id: feat.id,
      severity: 'High',
      reason: reason || `Archived capability ${feat.name} (${feat.code}) from active catalog`,
    });

    return feat;
  },

  async restoreFeature(id: string): Promise<PlanFeatureItem> {
    const feat = initialFeatures.find((f) => f.id === id || f.code.toUpperCase() === id.toUpperCase());
    if (!feat) throw new Error('Feature not found');

    feat.status = 'Draft';
    feat.lifecycle_status = 'Draft';
    feat.updated_at = new Date().toISOString().slice(0, 10);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_RESTORED',
      resource_type: 'PlanFeature',
      resource_id: feat.id,
      severity: 'Normal',
      reason: `Restored capability ${feat.name} to Draft status`,
    });

    return feat;
  },

  checkFeatureReferences(featureCode: string): {
    plansCount: number;
    planNames: string[];
    canDelete: boolean;
    reason?: string;
  } {
    const matchingPlans = initialPlans.filter((p) => p.features.includes(featureCode));
    const isReferenced = matchingPlans.length > 0;

    return {
      plansCount: matchingPlans.length,
      planNames: matchingPlans.map((p) => p.name),
      canDelete: !isReferenced,
      reason: isReferenced
        ? `Referenced by ${matchingPlans.length} active plan(s): ${matchingPlans.map((p) => p.name).join(', ')}`
        : undefined,
    };
  },

  async deleteFeature(id: string): Promise<void> {
    const featIndex = initialFeatures.findIndex((f) => f.id === id || f.code.toUpperCase() === id.toUpperCase());
    if (featIndex === -1) throw new Error('Feature not found');

    const feat = initialFeatures[featIndex];
    const ref = this.checkFeatureReferences(feat.code);

    if (!ref.canDelete) {
      throw new Error(`Cannot permanently delete feature "${feat.name}": ${ref.reason}. Archive this feature instead.`);
    }

    initialFeatures.splice(featIndex, 1);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_DELETED',
      resource_type: 'PlanFeature',
      resource_id: id,
      severity: 'Critical',
      reason: `Permanently deleted unused draft feature "${feat.name}" (${feat.code})`,
    });
  },

  async assignFeatureToPlan(featureCode: string, planId: string): Promise<void> {
    const plan = initialPlans.find((p) => p.id === planId || p.code === planId);
    if (!plan) throw new Error('Target plan not found');

    if (!plan.features.includes(featureCode)) {
      plan.features.push(featureCode);
      plan.updated_at = new Date().toISOString().slice(0, 10);

      await platformAuditService.logEvent({
        actor_id: 'user-superadmin',
        actor_name: 'WorkForce Super Admin',
        actor_role: 'Super Admin',
        action: 'PLAN_FEATURE_ASSIGNED',
        resource_type: 'PlanFeature',
        resource_id: featureCode,
        severity: 'Normal',
        reason: `Assigned feature "${featureCode}" to plan "${plan.name}"`,
      });
    }
  },

  async removeFeatureFromPlan(featureCode: string, planId: string): Promise<void> {
    const plan = initialPlans.find((p) => p.id === planId || p.code === planId);
    if (!plan) throw new Error('Target plan not found');

    const idx = plan.features.indexOf(featureCode);
    if (idx !== -1) {
      plan.features.splice(idx, 1);
      plan.updated_at = new Date().toISOString().slice(0, 10);

      await platformAuditService.logEvent({
        actor_id: 'user-superadmin',
        actor_name: 'WorkForce Super Admin',
        actor_role: 'Super Admin',
        action: 'PLAN_FEATURE_REMOVED',
        resource_type: 'PlanFeature',
        resource_id: featureCode,
        severity: 'Normal',
        reason: `Removed feature "${featureCode}" from plan "${plan.name}"`,
      });
    }
  },

  // --- Subscriptions & Tenants ---
  getSubscriptions(filters?: { plan?: string; search?: string }): TenantSubscriptionItem[] {
    const liveSubs = platformSubscriptionService.getSubscriptions();
    const liveOrgs = platformTenantService.getOrganizations();

    // Map live subscriptions + organizations
    const merged: TenantSubscriptionItem[] = liveSubs.map((s) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      tenant_name: s.tenant_name,
      plan_id: s.plan_id,
      plan_name: s.plan,
      billing_cycle: s.billing_cycle,
      amount_formatted: `₹${(s.total_amount / 1000).toFixed(0)}K / ${s.billing_cycle}`,
      status: s.status as any,
      current_seats: s.used_seats,
      seat_limit: s.seats,
      usage_pct: s.seats > 0 ? Math.round((s.used_seats / s.seats) * 100) : 0,
      auto_renew: s.auto_renew,
      start_date: s.start_date,
      renewal_date: s.renewal_date,
    }));

    // If there are organizations with plans not in subscriptions list, merge them
    for (const org of liveOrgs.items) {
      if (!merged.some((m) => m.tenant_id === org.id)) {
        merged.push({
          id: `sub-${org.id}`,
          tenant_id: org.id,
          tenant_name: org.display_name || org.legal_name,
          plan_id: `plan-${org.plan.toLowerCase()}`,
          plan_name: org.plan,
          billing_cycle: org.billing_cycle === 'Annual' ? 'Annual' : 'Monthly',
          amount_formatted: org.mrr_formatted || `₹${(org.mrr / 1000).toFixed(0)}K / Mo`,
          status: org.status as any,
          current_seats: org.active_employees,
          seat_limit: org.seat_limit,
          usage_pct: org.seat_limit > 0 ? Math.round((org.active_employees / org.seat_limit) * 100) : 0,
          auto_renew: org.auto_renew,
          start_date: org.created_at,
          renewal_date: org.renewal_date,
        });
      }
    }

    let result = merged;
    if (filters?.plan && filters.plan !== 'All') {
      result = result.filter(
        (s) => s.plan_name.toLowerCase() === filters.plan?.toLowerCase() || s.plan_id === filters.plan
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((s) => s.tenant_name.toLowerCase().includes(q) || s.tenant_id.toLowerCase().includes(q));
    }
    return result;
  },

  async changeTenantPlan(subscriptionId: string, newPlanId: string): Promise<TenantSubscriptionItem> {
    const sub = initialTenantSubscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error('Subscription not found');
    const newPlan = initialPlans.find((p) => p.id === newPlanId);
    if (!newPlan) throw new Error('Target plan not found');

    const oldPlanName = sub.plan_name;
    sub.plan_id = newPlan.id;
    sub.plan_name = newPlan.name;
    sub.seat_limit = newPlan.included_seats;
    sub.usage_pct = Math.round((sub.current_seats / sub.seat_limit) * 100);
    sub.amount_formatted = `₹${Math.round(newPlan.monthly_price / 1000)}K / Month`;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      resource_type: 'TenantSubscription',
      resource_id: sub.id,
      severity: 'High',
      reason: `Changed ${sub.tenant_name} subscription from ${oldPlanName} to ${newPlan.name}`,
    });

    return sub;
  },

  async toggleAutoRenew(subscriptionId: string): Promise<TenantSubscriptionItem> {
    const sub = initialTenantSubscriptions.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error('Subscription not found');
    sub.auto_renew = !sub.auto_renew;
    return sub;
  },
};
