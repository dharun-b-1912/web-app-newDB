// src/types/backgroundJobs.ts
// ============================================================
// Joy PeopleHR — Background Jobs & Worker Fleet Type Definitions
// ============================================================

export type JobStatus =
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Retrying'
  | 'Cancelled'
  | 'Dead Letter';

export type JobPriority = 'Critical' | 'High' | 'Normal' | 'Low';

export type RetryStrategy = 'Fixed' | 'Linear' | 'Exponential' | 'Custom';

export type QueueName =
  | 'default'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'webhooks'
  | 'attendance'
  | 'biometric'
  | 'billing'
  | 'invoice'
  | 'report'
  | 'tenant-provisioning'
  | 'data-import'
  | 'notifications'
  | 'maintenance';

export interface JobAttempt {
  id: string;
  job_id: string;
  attempt_number: number;
  worker_id: string;
  worker_host: string;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  status: 'Completed' | 'Failed' | 'Running';
  error_code?: string;
  error_message?: string;
  stack_trace?: string;
}

export interface JobLogEntry {
  id: string;
  job_id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

export interface JobExecution {
  id: string;
  job_number: string;
  task_name: string;
  queue: QueueName;
  tenant_id?: string;
  tenant_name?: string;
  environment: 'Production' | 'Staging' | 'Development';
  status: JobStatus;
  priority: JobPriority;
  worker_id?: string;
  worker_name?: string;
  attempt_count: number;
  max_attempts: number;
  retry_strategy: RetryStrategy;
  duration_sec?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  next_retry_at?: string;
  error_code?: string;
  error_message?: string;
  is_retryable: boolean;
  input_payload: Record<string, any>;
  output_result?: Record<string, any>;
  attempts: JobAttempt[];
  logs: JobLogEntry[];
  linked_support_case_id?: string;
  linked_incident_id?: string;
  linked_webhook_id?: string;
  trace_id: string;
}

export interface JobQueue {
  id: string;
  name: QueueName;
  display_name: string;
  depth: number;
  running_count: number;
  success_rate_pct: number;
  failure_rate_pct: number;
  throughput_per_min: number;
  oldest_job_age_sec: number;
  assigned_workers_count: number;
  concurrency_limit: number;
  rate_limit_per_min: number;
  status: 'Healthy' | 'Degraded' | 'Paused' | 'Draining';
  created_at: string;
}

export interface WorkerInstance {
  id: string;
  name: string;
  host: string;
  version: string;
  status: 'Healthy' | 'Busy' | 'Degraded' | 'Offline' | 'Draining';
  cpu_usage_pct: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  concurrency: number;
  active_jobs_count: number;
  assigned_queues: QueueName[];
  started_at: string;
  last_heartbeat_at: string;
}

export interface ScheduledCronJob {
  id: string;
  name: string;
  task: string;
  queue: QueueName;
  cron_expression: string;
  schedule_description: string;
  timezone: string;
  enabled: boolean;
  last_run_at?: string;
  last_run_status?: 'Completed' | 'Failed';
  next_run_at: string;
  owner: string;
}

export interface BackgroundJobsMetrics {
  total_waiting_queue_depth: number;
  running_jobs_count: number;
  failed_jobs_count: number;
  retrying_jobs_count: number;
  dead_letter_count: number;
  total_workers_count: number;
  healthy_workers_count: number;
  processing_throughput_per_min: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  engine_status: 'Healthy' | 'Degraded' | 'Critical';
}
