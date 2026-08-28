// src/services/platform/platformProvisioningService.ts
// ============================================================
// Joy PeopleHR — Tenant Provisioning Engine (Idempotent 10-Stage State Machine)
// ============================================================

import { TenantProvisioningRun, ProvisioningStepDetail } from '../../types/platformAdmin';
import { platformTenantService } from './platformTenantService';
import { platformAuditService } from './platformAuditService';

const STAGE_DEFINITIONS: { id: string; label: string; description: string }[] = [
  { id: 'org_record', label: '1. Organization Context', description: 'Initialize legal entity & multi-tenant isolation schema' },
  { id: 'db_schema', label: '2. Database & RLS Boundary', description: 'Configure schema partitions & security row policies' },
  { id: 'auth_engine', label: '3. Identity & Authentication', description: 'Setup Super Admin & Company Admin JWT credentials' },
  { id: 'storage_vault', label: '4. Encrypted Document Vault', description: 'Allocate tenant S3 storage bucket with 256-bit AES' },
  { id: 'rbac_matrix', label: '5. RBAC & System Roles', description: 'Seed system roles (Company Admin, HR Head, TL, Employee)' },
  { id: 'default_config', label: '6. Organization Config', description: 'Setup Asia/Kolkata timezone, INR currency & April-March FY' },
  { id: 'integrations', label: '7. Integrations Mesh', description: 'Initialize SendGrid email gateway & WhatsApp webhook bot' },
  { id: 'subscription', label: '8. Subscription & Entitlements', description: 'Generate active subscription contract & allocate seat quota' },
  { id: 'notifications', label: '9. Notification Stream', description: 'Send onboarding email invitation to primary company admin' },
  { id: 'verification', label: '10. Health Verification', description: 'Run end-to-end sandbox connectivity validation check' },
];

const LOCAL_PROVISIONING_KEY = 'workforce_platform_provisioning_runs';

const initialRuns: TenantProvisioningRun[] = [
  {
    id: 'prov-101',
    tenant_id: 'org-cybersoft-new',
    tenant_name: 'CyberSoft Global Tech Ltd',
    plan: 'Professional',
    admin_email: 'anish@cybersoft.com',
    current_step_index: 10,
    total_steps: 10,
    steps: { database: true, authentication: true, storage: true, roles: true, permissions: true, default_config: true, email: true, subscription: true },
    step_details: STAGE_DEFINITIONS.map(s => ({
      ...s,
      status: 'COMPLETED',
      started_at: '2026-08-01 09:00:00',
      completed_at: '2026-08-01 09:02:14',
      retry_count: 0,
    })),
    status: 'READY',
    started_at: '2026-08-01 09:00 AM',
    completed_at: '2026-08-01 09:02 AM',
    execution_logs: [
      '[09:00:01] Initializing organization record org-cybersoft-new...',
      '[09:00:15] Creating database partition and applying RLS policies...',
      '[09:00:40] Provisioning primary admin credentials for anish@cybersoft.com...',
      '[09:01:05] S3 bucket workforceos-tenant-org-cybersoft-new created with 50GB quota.',
      '[09:01:25] 6 System roles and 48 granular permissions seeded successfully.',
      '[09:01:45] Default company profile initialized with India tax rules.',
      '[09:02:00] Professional subscription activated (120 seats).',
      '[09:02:14] Verification check passed: 10/10 stages completed in 2m 14s.',
    ],
  },
  {
    id: 'prov-102',
    tenant_id: 'org-nextgen-draft',
    tenant_name: 'NextGen Retail India',
    plan: 'Business',
    admin_email: 'rajesh@nextgenretail.in',
    current_step_index: 5,
    total_steps: 10,
    steps: { database: true, authentication: true, storage: true, roles: true, permissions: false, default_config: false, email: false, subscription: false },
    step_details: STAGE_DEFINITIONS.map((s, idx) => ({
      ...s,
      status: idx < 4 ? 'COMPLETED' : idx === 4 ? 'FAILED' : 'PENDING',
      started_at: idx <= 4 ? '2026-08-11 02:30:00' : undefined,
      completed_at: idx < 4 ? '2026-08-11 02:30:45' : undefined,
      error_message: idx === 4 ? 'Role permissions initialization timeout' : undefined,
      retry_count: idx === 4 ? 1 : 0,
    })),
    status: 'FAILED',
    started_at: '2026-08-11 02:30 PM',
    error_message: 'Role permissions initialization timeout at stage 5/10',
    execution_logs: [
      '[02:30:01] Starting tenant provisioning for NextGen Retail India...',
      '[02:30:10] Organization context created.',
      '[02:30:25] Database RLS boundary established.',
      '[02:30:45] Admin user account provisioned.',
      '[02:31:15] Storage vault initialized.',
      '[02:31:45] ERROR: Role permissions matrix transaction timed out while locking roles table.',
    ],
  },
];

function getLocalRuns(): TenantProvisioningRun[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROVISIONING_KEY);
    return raw ? JSON.parse(raw) : initialRuns;
  } catch {
    return initialRuns;
  }
}

function saveLocalRuns(runs: TenantProvisioningRun[]): void {
  try {
    localStorage.setItem(LOCAL_PROVISIONING_KEY, JSON.stringify(runs));
  } catch (err) {
    console.error('Failed to save provisioning runs', err);
  }
}

export const platformProvisioningService = {
  getProvisioningRuns(): TenantProvisioningRun[] {
    return getLocalRuns();
  },

  async startProvisioning(data: {
    legal_name: string;
    trade_name?: string;
    owner_name: string;
    owner_email: string;
    industry: string;
    city: string;
    employee_count: number;
    plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  }): Promise<TenantProvisioningRun> {
    const tenantId = `org-${Date.now().toString(36)}`;
    const runId = `prov-${Date.now()}`;

    const stepDetails: ProvisioningStepDetail[] = STAGE_DEFINITIONS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'RUNNING' : 'PENDING',
      started_at: idx === 0 ? new Date().toISOString() : undefined,
      retry_count: 0,
    }));

    const newRun: TenantProvisioningRun = {
      id: runId,
      tenant_id: tenantId,
      tenant_name: data.legal_name,
      plan: data.plan,
      admin_email: data.owner_email,
      current_step_index: 0,
      total_steps: 10,
      steps: { database: true, authentication: false, storage: false, roles: false, permissions: false, default_config: false, email: false, subscription: false },
      step_details: stepDetails,
      status: 'PROVISIONING',
      started_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      execution_logs: [
        `[${new Date().toLocaleTimeString()}] Provisioning initiated for "${data.legal_name}" on ${data.plan} plan.`,
        `[${new Date().toLocaleTimeString()}] Stage 1/10: Initializing organization context & tenant isolation boundaries...`,
      ],
    };

    // Save initial run state
    const runs = getLocalRuns();
    saveLocalRuns([newRun, ...runs]);

    // Create the organization record
    await platformTenantService.createTenant({
      id: tenantId,
      legal_name: data.legal_name,
      trade_name: data.trade_name || data.legal_name,
      owner_name: data.owner_name,
      owner_email: data.owner_email,
      industry: data.industry,
      city: data.city,
      employee_count: data.employee_count,
      plan: data.plan,
      status: 'Active',
    });

    // Fast asynchronous state simulation for real feel
    setTimeout(() => {
      const currentRuns = getLocalRuns();
      const target = currentRuns.find(r => r.id === runId);
      if (target) {
        target.status = 'READY';
        target.completed_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        target.current_step_index = 10;
        target.step_details = STAGE_DEFINITIONS.map(s => ({
          ...s,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          retry_count: 0,
        }));
        target.execution_logs.push(
          `[${new Date().toLocaleTimeString()}] All 10 provisioning stages completed successfully.`,
          `[${new Date().toLocaleTimeString()}] Welcome credentials dispatched to ${data.owner_email}.`
        );
        saveLocalRuns(currentRuns);
      }
    }, 1500);

    return newRun;
  },

  async retryProvisioning(runId: string): Promise<TenantProvisioningRun> {
    const runs = getLocalRuns();
    const target = runs.find(r => r.id === runId);
    if (!target) throw new Error('Provisioning run not found');

    target.status = 'RETRYING';
    target.error_message = undefined;
    target.execution_logs.push(`[${new Date().toLocaleTimeString()}] Retrying failed provisioning stages from checkpoint...`);
    saveLocalRuns(runs);

    // Simulate recovery
    setTimeout(() => {
      const currentRuns = getLocalRuns();
      const r = currentRuns.find(x => x.id === runId);
      if (r) {
        r.status = 'READY';
        r.current_step_index = 10;
        r.step_details = STAGE_DEFINITIONS.map(s => ({
          ...s,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          retry_count: s.id === 'rbac_matrix' ? 2 : 0,
        }));
        r.completed_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        r.execution_logs.push(`[${new Date().toLocaleTimeString()}] Checkpoint recovery completed. Tenant verified.`);
        saveLocalRuns(currentRuns);
      }
    }, 1200);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'PROVISIONING_RETRY_TRIGGERED',
      resource_type: 'ProvisioningJob',
      resource_id: runId,
      severity: 'Normal',
      reason: 'Administrator restarted paused provisioning state machine',
    });

    return target;
  },
};
