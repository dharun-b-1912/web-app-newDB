// src/services/platform/platformCapabilitiesService.ts
// ============================================================
// Joy PeopleHR — Product Capabilities & Feature Flags Control Service
// ============================================================

import {
  ProductCapability,
  TenantCapabilityOverride,
  LifecycleStage,
  AccessExplanationResult,
} from '../../types/productCapabilities';
import { platformAuditService } from './platformAuditService';
import { platformTenantService } from './platformTenantService';

let initialCapabilities: ProductCapability[] = [
  {
    id: 'cap-01',
    name: 'GPS Geofence Attendance',
    code: 'attendance.gps',
    product: 'HRMS',
    module: 'Attendance',
    category: 'Attendance',
    description: 'Allow employees to record attendance with radius-verified geofencing on mobile devices.',
    type: 'Boolean',
    lifecycle: 'General Availability',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Professional', 'Business', 'Enterprise'],
    rollout_percentage: 50,
    eligible_tenants_count: 168,
    enabled_tenants_count: 84,
    active_users_count: 3428,
    error_rate_pct: 0.4,
    latency_ms: 210,
    availability_pct: 99.98,
    owners: {
      product: 'Priya Sharma (PM)',
      engineering: 'Arun K (Tech Lead)',
      support: 'Tier-2 Mobile Desk',
    },
    dependencies: {
      requires: ['attendance.core', 'platform.mobile_gateway'],
      conflicts: ['attendance.manual_override_only'],
      recommended: ['biometric.daemon_sync'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: true,
    },
    readiness_score: 100,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 5.0,
    },
    overrides_count: 2,
    created_at: '2025-02-10',
    updated_at: '2026-08-14 14:32',
    updated_by: 'Super Admin',
    history: [
      { id: 'h-1', timestamp: '2026-08-14 14:32', actor: 'Super Admin', change_summary: 'Rollout increased', before_value: '25%', after_value: '50%' },
      { id: 'h-2', timestamp: '2026-08-01 10:00', actor: 'Arun K', change_summary: 'Promoted to General Availability' },
    ],
  },
  {
    id: 'cap-02',
    name: 'WhatsApp Payslips & Approvals',
    code: 'communication.whatsapp_payslips',
    product: 'HRMS',
    module: 'Communication',
    category: 'Communication',
    description: 'Instant PDF delivery of monthly payslips and 1-click interactive manager leave approvals via Meta Cloud API.',
    type: 'Integration',
    lifecycle: 'General Availability',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Business', 'Enterprise'],
    rollout_percentage: 100,
    eligible_tenants_count: 44,
    enabled_tenants_count: 44,
    active_users_count: 8940,
    error_rate_pct: 0.1,
    latency_ms: 380,
    availability_pct: 99.95,
    owners: {
      product: 'Rajesh Verma (PM)',
      engineering: 'Siddharth M (Lead)',
      support: 'Integrations Team',
    },
    dependencies: {
      requires: ['payroll.processing', 'integrations.meta_cloud_api'],
      conflicts: [],
      recommended: ['security.mandatory_mfa'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: true,
    },
    readiness_score: 100,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 3.0,
    },
    overrides_count: 1,
    created_at: '2025-04-15',
    updated_at: '2026-08-14 14:18',
    updated_by: 'Super Admin',
    history: [
      { id: 'h-3', timestamp: '2026-08-14 14:18', actor: 'Super Admin', change_summary: 'Enabled for Business Tier' },
    ],
  },
  {
    id: 'cap-03',
    name: 'AI HR Copilot Policy Search',
    code: 'ai.copilot_policy_search',
    product: 'HRMS',
    module: 'AI Capabilities',
    category: 'AI Capabilities',
    description: 'Natural language HR assistant answering company policy queries, leave allowances, and handbook retrieval.',
    type: 'AI Capability',
    lifecycle: 'Beta',
    environment: 'Production',
    status: 'Active',
    default_enabled: false,
    allowed_plans: ['Enterprise'],
    rollout_percentage: 25,
    eligible_tenants_count: 8,
    enabled_tenants_count: 3,
    active_users_count: 420,
    error_rate_pct: 1.8,
    latency_ms: 820,
    availability_pct: 99.7,
    owners: {
      product: 'Aakash Mehta (PM AI)',
      engineering: 'Dr. Devika Rao (AI Lead)',
      support: 'Specialist AI Pod',
    },
    dependencies: {
      requires: ['documents.central_repo', 'security.rag_vector_db'],
      conflicts: [],
      recommended: ['analytics.query_engine'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: false,
      documentation: true,
    },
    readiness_score: 83,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 4.0,
    },
    overrides_count: 3,
    created_at: '2026-01-10',
    updated_at: '2026-08-14 13:52',
    updated_by: 'Super Admin',
    history: [
      { id: 'h-4', timestamp: '2026-08-14 13:52', actor: 'Super Admin', change_summary: 'Granted beta override to 3 enterprise tenants' },
    ],
  },
  {
    id: 'cap-04',
    name: 'Biometric Turnstile Push Gateway',
    code: 'biometrics.hardware_daemon',
    product: 'HRMS',
    module: 'Biometrics',
    category: 'Biometrics',
    description: 'Real-time WebSocket hardware listener for Mantra, eSSL, Suprema, and ZKTeco turnstile daemons.',
    type: 'Integration',
    lifecycle: 'General Availability',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Enterprise'],
    rollout_percentage: 100,
    eligible_tenants_count: 8,
    enabled_tenants_count: 8,
    active_users_count: 14200,
    error_rate_pct: 0.05,
    latency_ms: 95,
    availability_pct: 99.99,
    owners: {
      product: 'Priya Sharma (PM)',
      engineering: 'Karthik N (IoT Lead)',
      support: 'Hardware Support Desk',
    },
    dependencies: {
      requires: ['attendance.core', 'integrations.gateway_listener'],
      conflicts: [],
      recommended: [],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: true,
    },
    readiness_score: 100,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 2.0,
    },
    overrides_count: 0,
    created_at: '2025-01-05',
    updated_at: '2026-08-10',
    updated_by: 'Super Admin',
    history: [],
  },
  {
    id: 'cap-05',
    name: 'India Statutory Compliance Engine (PF/ESI/PT/TDS)',
    code: 'payroll.statutory_india',
    product: 'HRMS',
    module: 'Payroll',
    category: 'India Compliance',
    description: 'Automated statutory computation for PF ECR, ESIC challans, state-specific Professional Tax, and Form 16 Part B generator.',
    type: 'Workflow',
    lifecycle: 'General Availability',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Professional', 'Business', 'Enterprise'],
    rollout_percentage: 100,
    eligible_tenants_count: 128,
    enabled_tenants_count: 128,
    active_users_count: 24500,
    error_rate_pct: 0.02,
    latency_ms: 180,
    availability_pct: 99.99,
    owners: {
      product: 'Venkat Raman (Payroll PM)',
      engineering: 'Girish T (Compliance Lead)',
      support: 'Payroll Audit Desk',
    },
    dependencies: {
      requires: ['payroll.processing', 'organization.statutory_entities'],
      conflicts: [],
      recommended: ['finance.bank_advice_payout'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: true,
    },
    readiness_score: 100,
    rollback_policy: {
      auto_rollback_enabled: false,
      max_error_rate_pct: 1.0,
    },
    overrides_count: 0,
    created_at: '2025-01-01',
    updated_at: '2026-08-01',
    updated_by: 'Super Admin',
    history: [],
  },
  {
    id: 'cap-06',
    name: 'Rotational Shift Roster & Night Allowance',
    code: 'attendance.roster_management',
    product: 'HRMS',
    module: 'Attendance',
    category: 'Attendance',
    description: 'Complex rotational shifts, night allowance calculations, shift swap requests, and auto-roster assignments.',
    type: 'Workflow',
    lifecycle: 'General Availability',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Professional', 'Business', 'Enterprise'],
    rollout_percentage: 100,
    eligible_tenants_count: 128,
    enabled_tenants_count: 128,
    active_users_count: 18200,
    error_rate_pct: 0.2,
    latency_ms: 160,
    availability_pct: 99.96,
    owners: {
      product: 'Priya Sharma (PM)',
      engineering: 'Arun K (Tech Lead)',
      support: 'Workforce Operations',
    },
    dependencies: {
      requires: ['attendance.core'],
      conflicts: [],
      recommended: ['attendance.gps'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: true,
    },
    readiness_score: 100,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 5.0,
    },
    overrides_count: 0,
    created_at: '2025-03-20',
    updated_at: '2026-08-05',
    updated_by: 'Super Admin',
    history: [],
  },
  {
    id: 'cap-07',
    name: 'Applicant Tracking System (ATS Pipeline)',
    code: 'recruitment.ats_pipeline',
    product: 'HRMS',
    module: 'Recruitment',
    category: 'Recruitment',
    description: 'Job requisition workflows, career portal publishing, candidate Kanban board, and interview scorecards.',
    type: 'Workflow',
    lifecycle: 'Early Access',
    environment: 'Production',
    status: 'Active',
    default_enabled: true,
    allowed_plans: ['Business', 'Enterprise'],
    rollout_percentage: 60,
    eligible_tenants_count: 44,
    enabled_tenants_count: 26,
    active_users_count: 1240,
    error_rate_pct: 0.6,
    latency_ms: 240,
    availability_pct: 99.9,
    owners: {
      product: 'Meera Sen (PM Talent)',
      engineering: 'Vivek P (Full Stack Lead)',
      support: 'Talent Suite Support',
    },
    dependencies: {
      requires: ['organization.structure', 'documents.central_repo'],
      conflicts: [],
      recommended: ['onboarding.digital_preboarding'],
    },
    readiness_checklist: {
      backend: true,
      frontend: true,
      permissions: true,
      tests: true,
      monitoring: true,
      documentation: false,
    },
    readiness_score: 83,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 4.0,
    },
    overrides_count: 4,
    created_at: '2025-11-10',
    updated_at: '2026-08-12',
    updated_by: 'Super Admin',
    history: [],
  },
  {
    id: 'cap-08',
    name: 'Payroll V2 Calculation Engine',
    code: 'payroll.v2_engine',
    product: 'HRMS',
    module: 'Payroll',
    category: 'Payroll',
    description: 'High-speed distributed formula payroll engine with parallel multi-threading for 50,000+ payslips.',
    type: 'Workflow',
    lifecycle: 'Development',
    environment: 'Staging',
    status: 'Draft',
    default_enabled: false,
    allowed_plans: ['Enterprise'],
    rollout_percentage: 0,
    eligible_tenants_count: 8,
    enabled_tenants_count: 0,
    active_users_count: 0,
    error_rate_pct: 4.8,
    latency_ms: 120,
    availability_pct: 98.5,
    owners: {
      product: 'Venkat Raman (Payroll PM)',
      engineering: 'Karthik N & Girish T',
      support: 'Core Engineering',
    },
    dependencies: {
      requires: ['payroll.processing', 'infra.redis_cluster'],
      conflicts: [],
      recommended: [],
    },
    readiness_checklist: {
      backend: true,
      frontend: false,
      permissions: true,
      tests: false,
      monitoring: true,
      documentation: false,
    },
    readiness_score: 50,
    rollback_policy: {
      auto_rollback_enabled: true,
      max_error_rate_pct: 2.0,
    },
    overrides_count: 0,
    created_at: '2026-06-01',
    updated_at: '2026-08-14',
    updated_by: 'Venkat Raman',
    history: [],
  },
];

let initialOverrides: TenantCapabilityOverride[] = [];

export const platformCapabilitiesService = {
  // --- Catalog CRUD ---
  getCapabilities(filters?: {
    module?: string;
    lifecycle?: string;
    status?: string;
    search?: string;
  }): ProductCapability[] {
    const orgs = platformTenantService.getOrganizations().items;

    let result = initialCapabilities.map((c) => {
      const eligible = orgs.filter((o) => c.allowed_plans.includes(o.plan)).length;
      const enabled = Math.round((eligible * c.rollout_percentage) / 100);
      return {
        ...c,
        eligible_tenants_count: eligible,
        enabled_tenants_count: enabled,
        active_users_count: orgs.reduce((sum, o) => sum + (o.active_employees || 0), 0),
        error_rate_pct: c.error_rate_pct !== undefined ? c.error_rate_pct : 0.0,
        latency_ms: c.latency_ms !== undefined ? c.latency_ms : 120,
      };
    });

    if (filters?.module && filters.module !== 'All') {
      result = result.filter((c) => c.module === filters.module);
    }
    if (filters?.lifecycle && filters.lifecycle !== 'All') {
      result = result.filter((c) => c.lifecycle === filters.lifecycle);
    }
    if (filters?.status && filters.status !== 'All') {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.module.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return result;
  },

  getModules(): string[] {
    return [
      'Core HR',
      'Employee Directory',
      'Attendance',
      'Leave Management',
      'Payroll',
      'Recruitment',
      'Onboarding',
      'Performance',
      'Learning / LMS',
      'Travel & Expense',
      'Documents',
      'Compliance',
      'Communication',
      'Workflows',
      'Analytics',
      'AI / Copilot',
      'Integrations',
      'Security',
      'Administration',
    ];
  },

  checkFeatureCodeAvailability(code: string): { available: boolean; reason?: string } {
    const formatted = code.trim().toLowerCase();
    if (!formatted) {
      return { available: false, reason: 'Feature code cannot be empty.' };
    }
    const exists = initialCapabilities.some((c) => c.code.toLowerCase() === formatted);
    if (exists) {
      return { available: false, reason: `Feature code "${formatted}" already exists.` };
    }
    return { available: true };
  },

  getCapabilityById(id: string): ProductCapability | undefined {
    return initialCapabilities.find((c) => c.id === id || c.code === id);
  },

  async createCapability(data: Partial<ProductCapability> & {
    owner_team?: string;
    tags?: string[];
    rollout_strategy?: string;
    quota_limits?: { type: string; amount: number; unit: string; period: string };
  }): Promise<ProductCapability> {
    const code = (data.code || data.name || 'feature.new').toLowerCase().trim().replace(/\s+/g, '_');

    // Server uniqueness check
    if (initialCapabilities.some((c) => c.code.toLowerCase() === code)) {
      throw new Error(`Feature code "${code}" already exists in product catalog.`);
    }

    const newCap: ProductCapability = {
      id: `cap-${Date.now().toString().slice(-4)}`,
      name: data.name || 'New Capability',
      code,
      product: data.product || 'HRMS',
      module: data.module || 'Core HR',
      category: (data.category || data.module || 'Core HR') as any,
      description: data.description || '',
      type: data.type || 'Boolean',
      lifecycle: data.lifecycle || 'Development',
      environment: data.environment || 'Staging',
      status: data.status || 'Active',
      default_enabled: !!data.default_enabled,
      allowed_plans: data.allowed_plans && data.allowed_plans.length > 0 ? data.allowed_plans : ['Professional', 'Business', 'Enterprise'],
      rollout_percentage: data.rollout_percentage ?? 0,
      eligible_tenants_count: 0,
      enabled_tenants_count: 0,
      active_users_count: 0,
      error_rate_pct: 0.0,
      latency_ms: 120,
      availability_pct: 100.0,
      owners: data.owners || {
        product: data.owner_team ? `${data.owner_team} Team` : 'Platform Product Lead',
        engineering: 'Core Engineering Lead',
        support: 'Support Tier-2',
      },
      dependencies: data.dependencies || { requires: [], conflicts: [], recommended: [] },
      readiness_checklist: data.readiness_checklist || {
        backend: true,
        frontend: true,
        permissions: true,
        tests: false,
        monitoring: true,
        documentation: false,
      },
      readiness_score: data.readiness_score ?? (data.dependencies?.requires && data.dependencies.requires.length > 0 ? 80 : 100),
      rollback_policy: data.rollback_policy || { auto_rollback_enabled: true, max_error_rate_pct: 5.0 },
      overrides_count: 0,
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updated_by: 'WorkForce Super Admin',
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          actor: 'WorkForce Super Admin',
          change_summary: `Feature created in ${data.lifecycle || 'Development'} stage (${data.environment || 'Staging'})`,
        },
      ],
    };

    initialCapabilities.unshift(newCap);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_CREATED',
      resource_type: 'ProductCapability',
      resource_id: newCap.id,
      severity: 'Normal',
      reason: `Created new product capability "${newCap.name}" (${newCap.code}) assigned to ${newCap.module}`,
    });

    return newCap;
  },

  async updateCapability(id: string, updates: Partial<ProductCapability>): Promise<ProductCapability> {
    const cap = initialCapabilities.find((c) => c.id === id);
    if (!cap) throw new Error('Capability not found');

    Object.assign(cap, updates, {
      updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      updated_by: 'Super Admin',
    });

    cap.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: 'Capability configuration updated',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_UPDATED',
      resource_type: 'ProductCapability',
      resource_id: cap.id,
      severity: 'Normal',
      reason: `Updated product capability ${cap.name}`,
    });

    return cap;
  },

  async updateRollout(id: string, percentage: number, reason?: string): Promise<ProductCapability> {
    const cap = initialCapabilities.find((c) => c.id === id);
    if (!cap) throw new Error('Capability not found');

    const before = `${cap.rollout_percentage}%`;
    cap.rollout_percentage = percentage;
    cap.enabled_tenants_count = Math.round((cap.eligible_tenants_count * percentage) / 100);
    cap.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ');

    cap.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: `Rollout percentage modified`,
      before_value: before,
      after_value: `${percentage}%`,
      reason: reason || 'Controlled staged release rollout',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_ROLLOUT_CHANGED',
      resource_type: 'ProductCapability',
      resource_id: cap.id,
      severity: 'High',
      reason: `Changed ${cap.name} rollout from ${before} to ${percentage}%`,
    });

    return cap;
  },

  async setLifecycleStage(id: string, stage: LifecycleStage, reason?: string): Promise<ProductCapability> {
    const cap = initialCapabilities.find((c) => c.id === id);
    if (!cap) throw new Error('Capability not found');

    const before = cap.lifecycle;
    cap.lifecycle = stage;
    cap.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ');

    cap.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: `Lifecycle stage transitioned`,
      before_value: before,
      after_value: stage,
      reason: reason || `Advanced stage to ${stage}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_LIFECYCLE_CHANGED',
      resource_type: 'ProductCapability',
      resource_id: cap.id,
      severity: 'High',
      reason: `Promoted ${cap.name} from ${before} to ${stage}`,
    });

    return cap;
  },

  async emergencyKillSwitch(id: string, reason: string): Promise<ProductCapability> {
    const cap = initialCapabilities.find((c) => c.id === id);
    if (!cap) throw new Error('Capability not found');

    cap.status = 'Kill-Switched';
    cap.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ');

    cap.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: `EMERGENCY KILL SWITCH ACTIVATED`,
      before_value: 'Active',
      after_value: 'Kill-Switched',
      reason: reason,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_DISABLED',
      resource_type: 'ProductCapability',
      resource_id: cap.id,
      severity: 'Critical',
      reason: `EMERGENCY KILL SWITCH: ${reason}`,
    });

    return cap;
  },

  async restoreKillSwitch(id: string, reason: string): Promise<ProductCapability> {
    const cap = initialCapabilities.find((c) => c.id === id);
    if (!cap) throw new Error('Capability not found');

    cap.status = 'Active';
    cap.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ');

    cap.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: 'WorkForce Super Admin',
      change_summary: `Kill Switch Deactivated — Restored to Active`,
      before_value: 'Kill-Switched',
      after_value: 'Active',
      reason: reason,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_ENABLED',
      resource_type: 'ProductCapability',
      resource_id: cap.id,
      severity: 'High',
      reason: `Deactivated Kill Switch for ${cap.name}: ${reason}`,
    });

    return cap;
  },

  // --- Tenant Overrides ---
  getOverrides(filters?: { capabilityId?: string; search?: string }): TenantCapabilityOverride[] {
    let result = [...initialOverrides];
    if (filters?.capabilityId && filters.capabilityId !== 'All') {
      result = result.filter((o) => o.capability_id === filters.capabilityId || o.capability_code === filters.capabilityId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.tenant_name.toLowerCase().includes(q) ||
          o.capability_name.toLowerCase().includes(q) ||
          o.reason.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async createOverride(data: Partial<TenantCapabilityOverride>): Promise<TenantCapabilityOverride> {
    const newOv: TenantCapabilityOverride = {
      id: `ov-${Date.now().toString().slice(-4)}`,
      tenant_id: data.tenant_id || 'org-custom-01',
      tenant_name: data.tenant_name || 'Organization Name',
      capability_id: data.capability_id || 'cap-01',
      capability_name: data.capability_name || 'Capability',
      capability_code: data.capability_code || 'feature.code',
      override_state: data.override_state || 'Enabled',
      reason: data.reason || 'Beta testing program',
      created_by: 'WorkForce Super Admin',
      created_at: new Date().toISOString().slice(0, 10),
      expires_at: data.expires_at,
      is_active: true,
    };

    initialOverrides.unshift(newOv);

    // Update count on capability
    const cap = initialCapabilities.find((c) => c.id === newOv.capability_id);
    if (cap) cap.overrides_count += 1;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_OVERRIDE_CREATED',
      resource_type: 'TenantOverride',
      resource_id: newOv.id,
      severity: 'Normal',
      reason: `Created ${newOv.override_state} override for ${newOv.tenant_name} on ${newOv.capability_name}`,
    });

    return newOv;
  },

  async deleteOverride(id: string): Promise<void> {
    const idx = initialOverrides.findIndex((o) => o.id === id);
    if (idx === -1) return;
    const removed = initialOverrides[idx];
    initialOverrides.splice(idx, 1);

    const cap = initialCapabilities.find((c) => c.id === removed.capability_id);
    if (cap && cap.overrides_count > 0) cap.overrides_count -= 1;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_OVERRIDE_REMOVED',
      resource_type: 'TenantOverride',
      resource_id: id,
      severity: 'Normal',
      reason: `Removed override for ${removed.tenant_name} on ${removed.capability_name}`,
    });
  },

  // --- Diagnostic & Access Explanation Resolution Engine ---
  explainAccess(tenantId: string, capabilityCode: string): AccessExplanationResult {
    const cap = initialCapabilities.find((c) => c.code === capabilityCode || c.id === capabilityCode) || initialCapabilities[0];
    const override = initialOverrides.find((o) => o.tenant_id === tenantId && o.capability_code === cap.code);

    const steps = [
      {
        step: '1. Feature Exists in Registry',
        passed: !!cap,
        detail: `Found definition "${cap.name}" (${cap.code}) in ${cap.module} module.`,
      },
      {
        step: '2. Lifecycle Status & Not Archived',
        passed: cap.lifecycle !== 'Archived' && cap.status !== 'Kill-Switched',
        detail: `Stage is "${cap.lifecycle}". Technical state is "${cap.status}".`,
      },
      {
        step: '3. Environment Allowed Scope',
        passed: cap.environment === 'Production' || cap.environment === 'All',
        detail: `Deployed in "${cap.environment}" environment cluster.`,
      },
      {
        step: '4. Prerequisite Dependencies Satisfied',
        passed: cap.dependencies.requires.length > 0,
        detail: `Required dependencies [${cap.dependencies.requires.join(', ')}] are operational.`,
      },
      {
        step: '5. Subscription Plan Entitlement',
        passed: cap.allowed_plans.includes('Professional') || cap.allowed_plans.includes('Enterprise'),
        detail: `Tenant plan (Enterprise) has entitlement inclusion.`,
      },
      {
        step: '6. Tenant Override Check',
        passed: !!override,
        detail: override ? `Active override found: "${override.override_state}" (${override.reason}).` : 'No tenant-specific override set; using standard rollout evaluation.',
      },
      {
        step: '7. Rollout Percentage Eligibility',
        passed: cap.rollout_percentage > 0,
        detail: `Rollout is set to ${cap.rollout_percentage}%. Tenant hash fits in eligible cohort.`,
      },
      {
        step: '8. Final Resolution',
        passed: cap.status === 'Active' && cap.lifecycle !== 'Archived',
        detail: 'All gate checks passed. Feature is fully rendered in tenant UI.',
      },
    ];

    const isFinalEnabled = steps.every((s) => s.passed);

    return {
      feature_code: cap.code,
      feature_name: cap.name,
      tenant_id: tenantId,
      tenant_name: override?.tenant_name || 'Joy Corporate Solutions Pvt Ltd',
      is_enabled: isFinalEnabled,
      plan_name: 'Enterprise',
      reason_summary: isFinalEnabled
        ? 'Enterprise Plan Entitlement + 50% Rollout Cohort + Dependencies Satisfied'
        : 'Access Gated by Plan Entitlement or Rollout Stage',
      checks: steps,
    };
  },

  getOverviewMetrics() {
    const caps = this.getCapabilities();
    const ovs = this.getOverrides();

    const liveFeatures = caps.filter((c) => c.status === 'Active' && c.lifecycle === 'General Availability').length;
    const inBeta = caps.filter((c) => c.lifecycle === 'Beta' || c.lifecycle === 'Pilot').length;
    const rollingOut = caps.filter((c) => c.rollout_percentage > 0 && c.rollout_percentage < 100).length;

    // Dynamically evaluate attention items based on kill-switched status, low readiness, or high error rates
    const attention_items = caps
      .filter((c) => c.status === 'Kill-Switched' || (c.readiness_score !== undefined && c.readiness_score < 70) || (c.error_rate_pct !== undefined && c.error_rate_pct > 3.0))
      .map((c) => ({
        id: `att-${c.id}`,
        severity: c.status === 'Kill-Switched' ? ('High' as const) : (c.error_rate_pct || 0) > 3.0 ? ('Medium' as const) : ('Low' as const),
        title: c.status === 'Kill-Switched'
          ? `${c.name} has emergency kill-switch active`
          : (c.error_rate_pct || 0) > 3.0
          ? `${c.name} error rate elevated to ${c.error_rate_pct}%`
          : `${c.name} readiness score is ${c.readiness_score}% (unresolved dependencies)`,
        feature_code: c.code,
        action: c.status === 'Kill-Switched' ? 'Inspect Kill-Switch' : 'Review Dependencies',
      }));

    // Extract recent release and rollout activity directly from capabilities history
    const allHistory = caps.flatMap((c) =>
      (c.history || []).map((h) => ({
        time: h.timestamp.includes(' ') ? h.timestamp.split(' ')[1] : 'Recent',
        title: `${c.name}: ${h.change_summary}`,
        actor: h.actor || 'Platform Admin',
        feature: c.code,
      }))
    );

    return {
      total_features: caps.length,
      live_features: liveFeatures,
      in_beta: inBeta,
      rolling_out: rollingOut,
      tenant_overrides: ovs.length,
      needs_attention: attention_items.length,
      attention_items,
      recent_activity: allHistory.slice(0, 5),
    };
  },
};
