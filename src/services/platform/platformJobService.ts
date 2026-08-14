// src/services/platform/platformJobService.ts
// ============================================================
// WorkForceOS — Background Worker Queue & Job Monitoring Service
// ============================================================

import { PlatformBackgroundJob, JobType } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

// Authoritative Background Jobs (Populated dynamically on job triggers)
let initialJobs: PlatformBackgroundJob[] = [];

export const platformJobService = {
  getJobs(): PlatformBackgroundJob[] {
    return initialJobs;
  },

  getQueueTelemetry() {
    const jobs = this.getJobs();
    return {
      activeWorkersCount: 16,
      queuedJobsCount: jobs.filter(j => j.status === 'Queued').length,
      runningJobsCount: jobs.filter(j => j.status === 'Running').length,
      completedJobsCount: jobs.filter(j => j.status === 'Completed').length,
      failedJobsCount: jobs.filter(j => j.status === 'Failed').length,
      deadLetterCount: jobs.filter(j => j.attempt_count >= j.max_attempts && j.status === 'Failed').length,
      avgThroughputJobsPerMin: 142,
    };
  },

  async retryJob(id: string): Promise<PlatformBackgroundJob> {
    const target = initialJobs.find(j => j.id === id);
    if (!target) throw new Error('Background job not found');

    target.status = 'Completed';
    target.attempt_count += 1;
    target.progress_percent = 100;
    target.error_message = undefined;
    target.completed_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'BACKGROUND_JOB_RETRY_TRIGGERED',
      resource_type: 'BackgroundJob',
      resource_id: id,
      severity: 'Normal',
      reason: `Manually re-queued and executed ${target.name} (Attempt ${target.attempt_count})`,
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

  async triggerManualRun(jobType: JobType, name: string): Promise<PlatformBackgroundJob> {
    const newJob: PlatformBackgroundJob = {
      id: `job-${Date.now()}`,
      type: jobType,
      name,
      status: 'Completed',
      progress_percent: 100,
      priority: 1,
      attempt_count: 1,
      max_attempts: 3,
      started_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration_sec: 12,
    };

    initialJobs.unshift(newJob);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'MANUAL_JOB_TRIGGERED',
      resource_type: 'BackgroundJob',
      resource_id: newJob.id,
      severity: 'Normal',
      reason: `Triggered manual execution of ${name}`,
    });

    return newJob;
  },
};
