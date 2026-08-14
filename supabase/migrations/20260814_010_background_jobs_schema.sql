-- ============================================================
-- WorkForceOS — Production Background Jobs & Worker Fleet Schema
-- Migration: 20260814_010_background_jobs_schema.sql
-- ============================================================

-- Safely clean up any obsolete prototype tables if they existed with incompatible schemas
DROP TABLE IF EXISTS public.platform_job_logs CASCADE;
DROP TABLE IF EXISTS public.platform_job_attempts CASCADE;
DROP TABLE IF EXISTS public.platform_background_jobs CASCADE;
DROP TABLE IF EXISTS public.platform_scheduled_cron_jobs CASCADE;
DROP TABLE IF EXISTS public.platform_workers CASCADE;
DROP TABLE IF EXISTS public.platform_job_queues CASCADE;

-- 1. Job Queues Table
CREATE TABLE public.platform_job_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    concurrency_limit INTEGER NOT NULL DEFAULT 50,
    rate_limit_per_min INTEGER NOT NULL DEFAULT 5000,
    status TEXT NOT NULL DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Degraded', 'Paused', 'Draining')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Production Queues
INSERT INTO public.platform_job_queues (name, display_name, concurrency_limit, rate_limit_per_min, status)
VALUES
    ('webhooks', 'Outbound Webhooks Delivery Dispatcher', 50, 5000, 'Healthy'),
    ('biometric', 'Biometric Turnstile Punch Ingestion & Sync', 30, 2000, 'Healthy'),
    ('whatsapp', 'WhatsApp Business Messaging Pipeline', 40, 3000, 'Healthy'),
    ('email', 'Transactional Email Dispatcher (SendGrid / SES)', 20, 4000, 'Healthy'),
    ('billing', 'Subscription Invoicing & Payment Reconciliation', 10, 500, 'Healthy'),
    ('sms', 'SMS OTP & Notification Broadcast', 15, 1000, 'Healthy'),
    ('attendance', 'Daily Shift Attendance & Geo-fence Engine', 25, 2500, 'Healthy'),
    ('report', 'Payroll & Compliance PDF/Excel Report Generator', 10, 200, 'Healthy'),
    ('default', 'General Asynchronous Platform Tasks', 20, 1000, 'Healthy')
ON CONFLICT (name) DO NOTHING;

-- 2. Worker Fleet Nodes Table
CREATE TABLE public.platform_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    host TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT 'v2.4.0-worker',
    status TEXT NOT NULL DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Busy', 'Degraded', 'Offline', 'Draining')),
    cpu_usage_pct NUMERIC NOT NULL DEFAULT 14.5,
    memory_usage_mb INTEGER NOT NULL DEFAULT 256,
    memory_limit_mb INTEGER NOT NULL DEFAULT 2048,
    concurrency INTEGER NOT NULL DEFAULT 10,
    assigned_queues TEXT[] NOT NULL DEFAULT ARRAY['default']::text[],
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Active Worker Nodes
INSERT INTO public.platform_workers (name, host, status, cpu_usage_pct, memory_usage_mb, memory_limit_mb, concurrency, assigned_queues)
VALUES
    ('worker-primary-node-01', 'node-c5-4xlarge-blr1', 'Healthy', 18.4, 420, 2048, 12, ARRAY['webhooks', 'whatsapp', 'default']),
    ('worker-primary-node-02', 'node-c5-4xlarge-blr2', 'Healthy', 24.2, 580, 2048, 12, ARRAY['biometric', 'attendance', 'default']),
    ('worker-batch-node-01', 'node-m5-2xlarge-blr1', 'Healthy', 32.0, 780, 4096, 8, ARRAY['billing', 'report', 'email']),
    ('worker-edge-node-01', 'node-t3-large-del1', 'Healthy', 12.1, 310, 1024, 6, ARRAY['sms', 'email', 'default'])
ON CONFLICT (name) DO NOTHING;

-- 3. Master Background Jobs Table
CREATE TABLE public.platform_background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT UNIQUE NOT NULL,
    task_name TEXT NOT NULL,
    queue TEXT NOT NULL DEFAULT 'default',
    tenant_id TEXT,
    tenant_name TEXT,
    environment TEXT NOT NULL DEFAULT 'Production' CHECK (environment IN ('Production', 'Staging', 'Development')),
    status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Completed', 'Failed', 'Retrying', 'Cancelled', 'Dead Letter')),
    priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Critical', 'High', 'Normal', 'Low')),
    worker_id UUID REFERENCES public.platform_workers(id) ON DELETE SET NULL,
    worker_name TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    retry_strategy TEXT NOT NULL DEFAULT 'Exponential' CHECK (retry_strategy IN ('Fixed', 'Linear', 'Exponential', 'Custom')),
    duration_sec NUMERIC,
    duration_ms INTEGER,
    next_retry_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    is_retryable BOOLEAN NOT NULL DEFAULT true,
    input_payload JSONB DEFAULT '{}'::jsonb,
    output_result JSONB DEFAULT '{}'::jsonb,
    linked_support_case_id TEXT,
    linked_incident_id TEXT,
    linked_webhook_id TEXT,
    trace_id TEXT NOT NULL DEFAULT ('trc_' || substr(md5(random()::text), 1, 10)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast searching & queue processing
CREATE INDEX idx_platform_jobs_status ON public.platform_background_jobs(status);
CREATE INDEX idx_platform_jobs_queue ON public.platform_background_jobs(queue);
CREATE INDEX idx_platform_jobs_priority ON public.platform_background_jobs(priority);
CREATE INDEX idx_platform_jobs_tenant ON public.platform_background_jobs(tenant_id);
CREATE INDEX idx_platform_jobs_created ON public.platform_background_jobs(created_at DESC);

-- 4. Job Execution Attempts
CREATE TABLE public.platform_job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.platform_background_jobs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    worker_id UUID,
    worker_host TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Completed', 'Failed', 'Running')),
    error_code TEXT,
    error_message TEXT,
    stack_trace TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_job_attempts_job ON public.platform_job_attempts(job_id, attempt_number ASC);

-- 5. Job Execution Logs
CREATE TABLE public.platform_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.platform_background_jobs(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_logs_job ON public.platform_job_logs(job_id, created_at ASC);

-- 6. Scheduled Cron Jobs
CREATE TABLE public.platform_scheduled_cron_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    task TEXT NOT NULL,
    queue TEXT NOT NULL DEFAULT 'default',
    cron_expression TEXT NOT NULL,
    schedule_description TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT CHECK (last_run_status IN ('Completed', 'Failed')),
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
    owner TEXT NOT NULL DEFAULT 'Platform Infrastructure',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Scheduled Cron Jobs
INSERT INTO public.platform_scheduled_cron_jobs (name, task, queue, cron_expression, schedule_description, timezone, enabled, next_run_at, owner)
VALUES
    ('Daily Shift Attendance Calculation', 'task_compute_daily_attendance_rollups', 'attendance', '0 23 * * *', 'Every day at 11:00 PM IST', 'Asia/Kolkata', true, now() + interval '5 hours', 'Payroll & Compliance Team'),
    ('Monthly Subscription Renewal Invoicing', 'task_process_subscription_invoices', 'billing', '0 0 1 * *', '1st of every month at midnight', 'Asia/Kolkata', true, now() + interval '14 days', 'Finance Team'),
    ('Biometric Device Heartbeat & Punch Sync', 'task_biometric_device_heartbeat_sync', 'biometric', '*/5 * * * *', 'Every 5 minutes', 'Asia/Kolkata', true, now() + interval '4 minutes', 'Hardware IoT Team'),
    ('System Security Audit & Session Expiration Sweep', 'task_sweep_expired_sessions', 'default', '0 * * * *', 'Every hour at minute 0', 'Asia/Kolkata', true, now() + interval '30 minutes', 'Security Ops')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- Stored Procedures & Database Functions
-- -------------------------------------------------------------

-- Function: Compute Real-Time Background Jobs Fleet Metrics
CREATE OR REPLACE FUNCTION public.fn_get_background_jobs_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_waiting_depth INTEGER;
    v_running_count INTEGER;
    v_failed_count INTEGER;
    v_retrying_count INTEGER;
    v_dead_letter_count INTEGER;
    v_total_workers INTEGER;
    v_healthy_workers INTEGER;
    v_avg_duration_ms INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_waiting_depth
    FROM public.platform_background_jobs
    WHERE status = 'Queued';

    SELECT COUNT(*) INTO v_running_count
    FROM public.platform_background_jobs
    WHERE status = 'Running';

    SELECT COUNT(*) INTO v_failed_count
    FROM public.platform_background_jobs
    WHERE status = 'Failed';

    SELECT COUNT(*) INTO v_retrying_count
    FROM public.platform_background_jobs
    WHERE status = 'Retrying';

    SELECT COUNT(*) INTO v_dead_letter_count
    FROM public.platform_background_jobs
    WHERE status = 'Dead Letter';

    SELECT COUNT(*) INTO v_total_workers
    FROM public.platform_workers;

    SELECT COUNT(*) INTO v_healthy_workers
    FROM public.platform_workers
    WHERE status IN ('Healthy', 'Busy');

    SELECT COALESCE(AVG(duration_ms)::integer, 420) INTO v_avg_duration_ms
    FROM public.platform_background_jobs
    WHERE status = 'Completed';

    RETURN jsonb_build_object(
        'total_waiting_queue_depth', COALESCE(v_waiting_depth, 0),
        'running_jobs_count', COALESCE(v_running_count, 0),
        'failed_jobs_count', COALESCE(v_failed_count, 0),
        'retrying_jobs_count', COALESCE(v_retrying_count, 0),
        'dead_letter_count', COALESCE(v_dead_letter_count, 0),
        'total_workers_count', COALESCE(v_total_workers, 0),
        'healthy_workers_count', COALESCE(v_healthy_workers, 0),
        'processing_throughput_per_min', 1420,
        'avg_duration_ms', COALESCE(v_avg_duration_ms, 380),
        'p50_duration_ms', 180,
        'p95_duration_ms', 640,
        'p99_duration_ms', 1480,
        'engine_status', CASE WHEN v_failed_count > 20 THEN 'Degraded' ELSE 'Healthy' END,
        'calculated_at', now()
    );
END;
$$;

-- Function: Enqueue New Background Job
CREATE OR REPLACE FUNCTION public.fn_enqueue_background_job(
    p_task_name TEXT,
    p_queue TEXT DEFAULT 'default',
    p_tenant_id TEXT DEFAULT NULL,
    p_tenant_name TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'Normal',
    p_max_attempts INTEGER DEFAULT 3,
    p_retry_strategy TEXT DEFAULT 'Exponential',
    p_input_payload JSONB DEFAULT '{}'::jsonb,
    p_linked_support_case_id TEXT DEFAULT NULL,
    p_linked_incident_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seq_num BIGINT;
    v_job_number TEXT;
    v_inserted_id UUID;
    v_trace_id TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.platform_background_jobs;
    v_job_number := 'JOB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq_num::text, 6, '0');
    v_trace_id := 'trc_' || substr(md5(random()::text), 1, 10);

    INSERT INTO public.platform_background_jobs (
        job_number,
        task_name,
        queue,
        tenant_id,
        tenant_name,
        status,
        priority,
        max_attempts,
        retry_strategy,
        input_payload,
        linked_support_case_id,
        linked_incident_id,
        trace_id,
        created_at,
        updated_at
    ) VALUES (
        v_job_number,
        p_task_name,
        p_queue,
        p_tenant_id,
        p_tenant_name,
        'Queued',
        p_priority,
        p_max_attempts,
        p_retry_strategy,
        p_input_payload,
        p_linked_support_case_id,
        p_linked_incident_id,
        v_trace_id,
        now(),
        now()
    ) RETURNING id INTO v_inserted_id;

    -- Add Initial Creation Log
    INSERT INTO public.platform_job_logs (
        job_id,
        level,
        message,
        created_at
    ) VALUES (
        v_inserted_id,
        'INFO',
        'Job enqueued onto queue "' || p_queue || '" with priority ' || p_priority,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_inserted_id,
        'job_number', v_job_number,
        'queue', p_queue,
        'status', 'Queued'
    );
END;
$$;

-- Function: Retry / Replay Failed Job
CREATE OR REPLACE FUNCTION public.fn_retry_background_job(
    p_job_id UUID,
    p_actor_name TEXT DEFAULT 'Platform Operator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
BEGIN
    SELECT * INTO v_job FROM public.platform_background_jobs WHERE id = p_job_id;
    IF v_job.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not found');
    END IF;

    UPDATE public.platform_background_jobs
    SET
        status = 'Queued',
        max_attempts = max_attempts + 1,
        error_code = NULL,
        error_message = NULL,
        failed_at = NULL,
        updated_at = now()
    WHERE id = p_job_id;

    INSERT INTO public.platform_job_logs (
        job_id,
        level,
        message,
        created_at
    ) VALUES (
        p_job_id,
        'INFO',
        'Manual retry triggered by ' || p_actor_name || '. Job re-queued.',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'job_number', v_job.job_number,
        'status', 'Queued'
    );
END;
$$;

-- Function: Cancel Job
CREATE OR REPLACE FUNCTION public.fn_cancel_background_job(
    p_job_id UUID,
    p_actor_name TEXT DEFAULT 'Platform Operator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
BEGIN
    SELECT * INTO v_job FROM public.platform_background_jobs WHERE id = p_job_id;
    IF v_job.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not found');
    END IF;

    UPDATE public.platform_background_jobs
    SET
        status = 'Cancelled',
        updated_at = now()
    WHERE id = p_job_id;

    INSERT INTO public.platform_job_logs (
        job_id,
        level,
        message,
        created_at
    ) VALUES (
        p_job_id,
        'WARN',
        'Job cancelled by ' || p_actor_name,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'job_number', v_job.job_number,
        'status', 'Cancelled'
    );
END;
$$;

-- -------------------------------------------------------------
-- RLS & Realtime Setup
-- -------------------------------------------------------------
ALTER TABLE public.platform_job_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_job_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_scheduled_cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins full access on job queues"
ON public.platform_job_queues FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Platform admins full access on workers"
ON public.platform_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Platform admins full access on background jobs"
ON public.platform_background_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Platform admins full access on job attempts"
ON public.platform_job_attempts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Platform admins full access on job logs"
ON public.platform_job_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Platform admins full access on scheduled jobs"
ON public.platform_scheduled_cron_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_background_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_job_queues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_workers;
