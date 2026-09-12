// src/services/resilience/bulkJobService.ts
// ============================================================================
// JOY PeopleHR — Asynchronous Bulk Job Orchestrator
// 500+ / 1000+ Employee Batches • Progress Tracking • Partial Failure Recovery
// ============================================================================

export type BulkJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface BulkJob<T = any> {
  jobId: string;
  organizationId: string;
  requestedBy: string;
  operation: string;
  status: BulkJobStatus;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  startedAt: string;
  completedAt?: string;
  items: T[];
  failedItems: { item: T; error: string }[];
  errorSummary?: string;
}

class BulkJobService {
  private jobs: Map<string, BulkJob> = new Map();

  createJob<T>(organizationId: string, requestedBy: string, operation: string, items: T[]): BulkJob<T> {
    const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const job: BulkJob<T> = {
      jobId,
      organizationId,
      requestedBy,
      operation,
      status: 'QUEUED',
      total: items.length,
      processed: 0,
      successful: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      items,
      failedItems: [],
    };
    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Executes a bulk job in controlled concurrency batches without blocking the browser.
   */
  async executeInBatches<T, R>(
    jobId: string,
    batchSize = 25,
    processor: (item: T) => Promise<R>,
    onProgress?: (progress: { processed: number; total: number; percentage: number }) => void
  ): Promise<BulkJob<T>> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    job.status = 'RUNNING';

    for (let i = 0; i < job.items.length; i += batchSize) {
      if ((job.status as BulkJobStatus) === 'CANCELLED') break;

      const batch = job.items.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item: any) => {
          try {
            await processor(item);
            job.successful += 1;
          } catch (err: any) {
            job.failed += 1;
            job.failedItems.push({ item, error: err.message || String(err) });
          } finally {
            job.processed += 1;
          }
        })
      );

      if (onProgress) {
        onProgress({
          processed: job.processed,
          total: job.total,
          percentage: Math.round((job.processed / job.total) * 100),
        });
      }

      // Micro-yield to prevent main thread starvation
      await new Promise((r) => setTimeout(r, 10));
    }

    job.completedAt = new Date().toISOString();
    job.status = job.failed === 0 ? 'COMPLETED' : job.successful > 0 ? 'PARTIAL_SUCCESS' : 'FAILED';
    return job;
  }

  getJob(jobId: string): BulkJob | null {
    return this.jobs.get(jobId) || null;
  }

  listJobsForTenant(organizationId: string): BulkJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.organizationId === organizationId);
  }
}

export const bulkJobService = new BulkJobService();
