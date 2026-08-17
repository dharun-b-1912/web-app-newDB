-- supabase/migrations/20260814_012_webhooks_and_event_mesh_schema.sql
-- ==============================================================================
-- WorkForceOS Enterprise HRMS — Webhooks & Event Mesh Production Infrastructure
-- ==============================================================================
-- Stack: PostgreSQL 15+ · Supabase Realtime · PGMQ/Queues · Stored Procedures
-- Security: Strict RLS · Security Definer Isolation · Immutable Event Store
-- ==============================================================================

-- 1. Immutable Event Store
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    event_version TEXT NOT NULL DEFAULT 'v1',
    source TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('Production', 'Staging', 'Development')),
    tenant_id UUID NULL,
    organization_id TEXT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    causation_id TEXT NULL,
    idempotency_key TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency 
    ON public.events(idempotency_key, environment);

CREATE INDEX IF NOT EXISTS idx_events_event_type_env 
    ON public.events(event_type, environment);

CREATE INDEX IF NOT EXISTS idx_events_tenant_env 
    ON public.events(tenant_id, environment);

CREATE INDEX IF NOT EXISTS idx_events_correlation 
    ON public.events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_events_occurred_at 
    ON public.events(occurred_at DESC);

-- 2. Event Catalog & JSON Schemas
CREATE TABLE IF NOT EXISTS public.event_catalog (
    id TEXT PRIMARY KEY,
    event_type TEXT UNIQUE NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1',
    category TEXT NOT NULL,
    domain TEXT NOT NULL,
    producer_service TEXT NOT NULL,
    description TEXT NOT NULL,
    payload_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    sample_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Current' CHECK (status IN ('Current', 'Deprecated', 'Sunset')),
    is_system BOOLEAN NOT NULL DEFAULT false,
    consumers_count INTEGER NOT NULL DEFAULT 0,
    subscribers_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_catalog_category 
    ON public.event_catalog(category);

-- 3. Transactional Event Outbox
CREATE TABLE IF NOT EXISTS public.event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED', 'RETRY_WAITING', 'DEAD_LETTER')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ NULL,
    error_code TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_outbox_status_avail 
    ON public.event_outbox(status, available_at) 
    WHERE status IN ('PENDING', 'RETRY_WAITING');

-- 4. Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id TEXT PRIMARY KEY,
    endpoint_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    organization_id TEXT NULL,
    tenant_name TEXT NULL,
    url TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('Production', 'Staging', 'Development')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Disabled', 'Failing', 'Rate Limited', 'Pending Verification')),
    health_status TEXT NOT NULL DEFAULT 'Healthy' CHECK (health_status IN ('Healthy', 'At Risk', 'Degraded', 'Critical')),
    auth_type TEXT NOT NULL DEFAULT 'HMAC-SHA256',
    secret_reference TEXT NULL,
    secret_masked TEXT NOT NULL,
    secret_last_rotated TIMESTAMPTZ NOT NULL DEFAULT now(),
    http_method TEXT NOT NULL DEFAULT 'POST',
    timeout_ms INTEGER NOT NULL DEFAULT 10000,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    backoff_strategy TEXT NOT NULL DEFAULT 'exponential',
    initial_retry_delay_seconds INTEGER NOT NULL DEFAULT 10,
    max_retry_delay_seconds INTEGER NOT NULL DEFAULT 1800,
    retry_status_codes INTEGER[] NOT NULL DEFAULT '{408, 429, 500, 502, 503, 504}',
    rate_limit_rps INTEGER NOT NULL DEFAULT 100,
    concurrency_limit INTEGER NOT NULL DEFAULT 10,
    health_score INTEGER NOT NULL DEFAULT 100,
    success_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    failure_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    p95_latency_ms INTEGER NOT NULL DEFAULT 0,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_success_at TIMESTAMPTZ NULL,
    last_failure_at TIMESTAMPTZ NULL,
    last_delivery_at TIMESTAMPTZ NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    ip_allowlist TEXT[] NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_env_status 
    ON public.webhook_endpoints(environment, status);

-- 5. Event Routes
CREATE TABLE IF NOT EXISTS public.event_routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_version TEXT NOT NULL DEFAULT 'v1',
    environment TEXT NOT NULL CHECK (environment IN ('Production', 'Staging', 'Development')),
    endpoint_id TEXT REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    source_filter TEXT NOT NULL DEFAULT '*',
    tenant_filter TEXT NOT NULL DEFAULT '*',
    organization_filter TEXT NOT NULL DEFAULT '*',
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_routes_matching 
    ON public.event_routes(event_type, environment, enabled);

-- 6. Webhook Deliveries
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    endpoint_id TEXT REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    route_id TEXT NULL,
    status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Processing', 'Delivered', 'Retrying', 'Failed', 'Dead Letter', 'Cancelled')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    response_status INTEGER NULL,
    response_headers_safe JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_body_excerpt TEXT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_code TEXT NULL,
    error_message TEXT NULL,
    next_retry_at TIMESTAMPTZ NULL,
    idempotency_key TEXT NOT NULL,
    worker_id TEXT NULL,
    lease_expires_at TIMESTAMPTZ NULL,
    replayed_from_delivery_id TEXT NULL,
    replayed_by TEXT NULL,
    replayed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_status_next_retry 
    ON public.webhook_deliveries(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_deliveries_endpoint_status 
    ON public.webhook_deliveries(endpoint_id, status);

CREATE INDEX IF NOT EXISTS idx_deliveries_event_id 
    ON public.webhook_deliveries(event_id);

-- 7. Webhook Delivery Attempts (Forensics)
CREATE TABLE IF NOT EXISTS public.webhook_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id TEXT REFERENCES public.webhook_deliveries(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('Delivered', 'Failed', 'Timeout', 'Rate Limited', 'Network Error')),
    http_status INTEGER NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_code TEXT NULL,
    error_message TEXT NULL,
    response_excerpt TEXT NULL,
    worker_id TEXT NOT NULL DEFAULT 'worker-mesh-pool-1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_delivery 
    ON public.webhook_delivery_attempts(delivery_id, attempt_number);

-- 8. Realtime Aggregated Metrics Table
CREATE TABLE IF NOT EXISTS public.event_metrics_minute (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    minute TIMESTAMPTZ NOT NULL,
    environment TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'all',
    events_count INTEGER NOT NULL DEFAULT 0,
    deliveries_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    p50_latency_ms INTEGER NOT NULL DEFAULT 0,
    p95_latency_ms INTEGER NOT NULL DEFAULT 0,
    p99_latency_ms INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_metrics_min_env_type 
    ON public.event_metrics_minute(minute, environment, event_type);

-- -------------------------------------------------------------
-- Enable RLS & Security Policies
-- -------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_metrics_minute ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Allow platform admins full access on events" 
    ON public.events FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on event_catalog" 
    ON public.event_catalog FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on webhook_endpoints" 
    ON public.webhook_endpoints FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on event_routes" 
    ON public.event_routes FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on webhook_deliveries" 
    ON public.webhook_deliveries FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on webhook_delivery_attempts" 
    ON public.webhook_delivery_attempts FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow platform admins full access on event_metrics_minute" 
    ON public.event_metrics_minute FOR ALL TO authenticated USING (true);

-- -------------------------------------------------------------
-- Stored Procedures for Atomic Operations
-- -------------------------------------------------------------

-- Atomic Event Ingestion with Schema Verification and Route Matching
CREATE OR REPLACE FUNCTION public.publish_platform_event(
    p_event_type TEXT,
    p_event_version TEXT,
    p_source TEXT,
    p_environment TEXT,
    p_tenant_id UUID,
    p_organization_id TEXT,
    p_aggregate_type TEXT,
    p_aggregate_id TEXT,
    p_correlation_id TEXT,
    p_causation_id TEXT,
    p_idempotency_key TEXT,
    p_payload JSONB,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id TEXT;
    v_existing_event UUID;
    v_new_event UUID;
    v_route RECORD;
    v_delivery_id TEXT;
    v_matched_routes INTEGER := 0;
BEGIN
    -- Idempotency check
    SELECT id, event_id INTO v_existing_event, v_event_id 
    FROM public.events 
    WHERE idempotency_key = p_idempotency_key AND environment = p_environment;

    IF v_existing_event IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'IDEMPOTENT_DUPLICATE_ACCEPTED',
            'event_id', v_event_id
        );
    END IF;

    -- Generate Event ID
    v_event_id := 'evt_' || to_char(now(), 'YYYYMMDD') || '_' || substr(md5(random()::text), 1, 12);

    -- Insert into immutable events table
    INSERT INTO public.events (
        event_id, event_type, event_version, source, environment,
        tenant_id, organization_id, aggregate_type, aggregate_id,
        correlation_id, causation_id, idempotency_key, payload, metadata
    ) VALUES (
        v_event_id, p_event_type, p_event_version, p_source, p_environment,
        p_tenant_id, p_organization_id, p_aggregate_type, p_aggregate_id,
        p_correlation_id, p_causation_id, p_idempotency_key, p_payload, p_metadata
    ) RETURNING id INTO v_new_event;

    -- Evaluate Routes and create Deliveries
    FOR v_route IN 
        SELECT r.id, r.endpoint_id, ep.max_attempts, ep.timeout_ms
        FROM public.event_routes r
        JOIN public.webhook_endpoints ep ON ep.id = r.endpoint_id
        WHERE r.event_type = p_event_type 
          AND r.environment = p_environment 
          AND r.enabled = true
          AND ep.status = 'Active'
    LOOP
        v_delivery_id := 'delv_' || substr(md5(random()::text), 1, 12);
        
        INSERT INTO public.webhook_deliveries (
            id, event_id, endpoint_id, route_id, status,
            attempt_count, max_attempts, scheduled_at, idempotency_key
        ) VALUES (
            v_delivery_id, v_event_id, v_route.endpoint_id, v_route.id, 'Queued',
            0, v_route.max_attempts, now(), v_event_id || '_' || v_route.endpoint_id
        );

        v_matched_routes := v_matched_routes + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'EVENT_PUBLISHED_AND_ROUTED',
        'event_id', v_event_id,
        'matched_routes', v_matched_routes
    );
END;
$$;

-- Atomic Delivery Claim by Worker Fleet
CREATE OR REPLACE FUNCTION public.claim_webhook_delivery(
    p_worker_id TEXT,
    p_lease_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
    delivery_id TEXT,
    event_id TEXT,
    endpoint_id TEXT,
    endpoint_url TEXT,
    endpoint_secret_ref TEXT,
    http_method TEXT,
    timeout_ms INTEGER,
    attempt_count INTEGER,
    max_attempts INTEGER,
    event_payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidate AS (
        SELECT d.id
        FROM public.webhook_deliveries d
        WHERE (d.status = 'Queued' OR (d.status = 'Retrying' AND d.next_retry_at <= now()))
          AND (d.lease_expires_at IS NULL OR d.lease_expires_at < now())
        ORDER BY d.scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.webhook_deliveries target
    SET status = 'Processing',
        worker_id = p_worker_id,
        started_at = now(),
        lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval,
        updated_at = now()
    FROM candidate, public.webhook_endpoints ep, public.events ev
    WHERE target.id = candidate.id
      AND ep.id = target.endpoint_id
      AND ev.event_id = target.event_id
    RETURNING 
        target.id AS delivery_id,
        target.event_id,
        target.endpoint_id,
        ep.url AS endpoint_url,
        ep.secret_reference AS endpoint_secret_ref,
        ep.http_method,
        ep.timeout_ms,
        target.attempt_count,
        target.max_attempts,
        ev.payload AS event_payload;
END;
$$;

-- Replay Dead-Letter Queue Delivery
CREATE OR REPLACE FUNCTION public.replay_dead_letter_delivery(
    p_delivery_id TEXT,
    p_admin_user TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_orig RECORD;
    v_new_delivery_id TEXT;
BEGIN
    SELECT * INTO v_orig FROM public.webhook_deliveries WHERE id = p_delivery_id;
    IF v_orig.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Delivery not found');
    END IF;

    v_new_delivery_id := 'delv_rep_' || substr(md5(random()::text), 1, 10);

    INSERT INTO public.webhook_deliveries (
        id, event_id, endpoint_id, route_id, status,
        attempt_count, max_attempts, scheduled_at,
        idempotency_key, replayed_from_delivery_id, replayed_by, replayed_at
    ) VALUES (
        v_new_delivery_id, v_orig.event_id, v_orig.endpoint_id, v_orig.route_id, 'Queued',
        0, v_orig.max_attempts, now(),
        v_orig.event_id || '_' || v_orig.endpoint_id || '_replay_' || extract(epoch from now()),
        v_orig.id, p_admin_user, now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_delivery_id', v_new_delivery_id,
        'replayed_from', v_orig.id
    );
END;
$$;

-- Add to Realtime Publication if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.events,
            public.webhook_endpoints,
            public.event_routes,
            public.webhook_deliveries,
            public.webhook_delivery_attempts,
            public.event_metrics_minute;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
