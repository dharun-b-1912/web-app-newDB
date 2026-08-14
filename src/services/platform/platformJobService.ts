// src/services/platform/platformJobService.ts
// ============================================================
// WorkForceOS — Background Worker Queue & Job Monitoring Service
// ============================================================

import { PlatformBackgroundJob, JobType } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialJobs: PlatformBackgroundJob[] = [
  { id: 'job-901', type: 'USAGE_AGGREGATION', name: 'Monthly Tenant Resource Metering Rollup', status: 'Completed', progress_percent: 100, priority: 1, attempt_count: 1, max_attempts: 3, started_at: '2026-08-14 06:00 AM', completed_at: '2026-08-14 06:03 AM', duration_sec: 184 },
  { id: 'job-902', type: 'LEAVE_ACCRUAL', name: 'Automated Monthly Leave Credit Calculation', status: 'Completed', progress_percent: 100, priority: 2, attempt_count: 1, max_attempts: 3, started_at: '2026-08-14 01:00 AM', completed_at: '2026-08-14 01:08 AM', duration_sec: 480 },
  { id: 'job-903', type: 'TENANT_PROVISIONING', name: 'NextGen Retail India 10-Stage Provisioning', status: 'Failed', progress_percent: 40, priority: 1, attempt_count: 2, max_attempts: 5, started_at: '2026-08-11 02:30 PM', duration_sec: 45, error_message: 'Role permissions initialization timeout' },
  { id: 'job-904', type: 'WEBHOOK_DELIVERY', name: 'Outbound HMAC Webhook Broadcast Batch #4412', status: 'Running', progress_percent: 68, priority: 2, attempt_count: 1, max_attempts: 3, started_at: '2026-08-14 10:55 AM' },
  { id: 'job-905', type: 'INVOICE_GENERATION', name: 'SaaS Monthly Subscription Invoices Dispatch', status: 'Completed', progress_percent: 100, priority: 1, attempt_count: 1, max_attempts: 3, started_at: '2026-08-01 12:00 AM', completed_at: '2026-08-01 12:12 AM', duration_sec: 720 },
  { id: 'job-906', type: 'WHATSAPP_BROADCAST', name: 'Automated Independence Day Holiday Broadcast', status: 'Queued', progress_percent: 0, priority: 3, attempt_count: 0, max_attempts: 3 },
];

export const platformJobService = {
  getJobs(): PlatformBackgroundJob[] {
    return initialJobs;
  },

  async retryJob(id: string): Promise<PlatformBackgroundJob> {
    const target = initialJobs.find(j => j.id === id);
    if (!target) throw new Error('Background job not found');

    target.status = 'Running';
    target.attempt_count += 1;
    target.error_message = undefined;

    setTimeout(() => {
      target.status = 'Completed';
      target.progress_percent = 100;
      target.completed_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1500);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'BACKGROUND_JOB_RETRY_TRIGGERED',
      resource_type: 'BackgroundJob',
      resource_id: id,
      severity: 'Normal',
      reason: `Manually restarted ${target.name} (Attempt ${target.attempt_count})`,
    });

    return target;
  },

  async cancelJob(id: string): Promise<PlatformBackgroundJob> {
    const target = initialJobs.find(j => j.id === id);
    if (!target) throw new Error('Background job not found');

    target.status = 'Cancelled';

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'BACKGROUND_JOB_CANCELLED',
      resource_type: 'BackgroundJob',
      resource_id: id,
      severity: 'High',
      reason: `Job ${target.name} cancelled by administrator`,
    });

    return target;
  },
};
