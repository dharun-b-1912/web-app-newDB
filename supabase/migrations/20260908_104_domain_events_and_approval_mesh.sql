-- ============================================================================
-- JOY PeopleHR — Migration 104
-- Gate 3: Transactional Outbox Domain Event Mesh & Unified Approvals
-- Idempotent, Server-Authoritative, Persistent Event Infrastructure
-- ============================================================================

-- 1. Create public.domain_events Table
CREATE TABLE IF NOT EXISTS public.domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'DEAD_LETTER'
            )
        ),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Indexes for optimal concurrency and querying
CREATE INDEX IF NOT EXISTS idx_domain_events_processing
ON public.domain_events(status, available_at, created_at);

CREATE INDEX IF NOT EXISTS idx_domain_events_organization
ON public.domain_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_type
ON public.domain_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate
ON public.domain_events(aggregate_type, aggregate_id);

-- 2. Create public.overtime_records Table (Authoritative Domain Entity)
CREATE TABLE IF NOT EXISTS public.overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    approved_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    payroll_eligible BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ot_rec_emp ON public.overtime_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_ot_rec_org_status ON public.overtime_records(organization_id, status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

-- Policies for domain_events
DROP POLICY IF EXISTS "domain_events_select" ON public.domain_events;
CREATE POLICY "domain_events_select" ON public.domain_events
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "domain_events_insert" ON public.domain_events;
CREATE POLICY "domain_events_insert" ON public.domain_events
FOR INSERT TO authenticated
WITH CHECK (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "domain_events_update" ON public.domain_events;
CREATE POLICY "domain_events_update" ON public.domain_events
FOR UPDATE TO authenticated
USING (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

-- Policies for overtime_records
DROP POLICY IF EXISTS "overtime_records_select" ON public.overtime_records;
CREATE POLICY "overtime_records_select" ON public.overtime_records
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    AND (
        public.is_org_admin(organization_id)
        OR public.is_platform_admin()
        OR employee_id IN (
            SELECT e.id FROM public.employees e
            JOIN public.user_profiles up ON up.id = e.user_id
            WHERE up.auth_user_id = auth.uid()
            LIMIT 1
        )
    )
);

DROP POLICY IF EXISTS "overtime_records_insert" ON public.overtime_records;
CREATE POLICY "overtime_records_insert" ON public.overtime_records
FOR INSERT TO authenticated
WITH CHECK (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "overtime_records_update" ON public.overtime_records;
CREATE POLICY "overtime_records_update" ON public.overtime_records
FOR UPDATE TO authenticated
USING (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

-- 4. Server-Side Outbox Concurrency RPC: Claim Events with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.fn_claim_domain_events(
    p_worker_id TEXT,
    p_batch_size INTEGER DEFAULT 10
)
RETURNS SETOF public.domain_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH claimable AS (
        SELECT id
        FROM public.domain_events
        WHERE status IN ('PENDING', 'FAILED')
          AND available_at <= now()
          AND (locked_at IS NULL OR locked_at < now() - INTERVAL '5 minutes')
        ORDER BY available_at ASC, created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.domain_events de
    SET status = 'PROCESSING',
        locked_at = now(),
        locked_by = p_worker_id
    FROM claimable
    WHERE de.id = claimable.id
    RETURNING de.*;
END;
$$;

-- 5. Outbox Event Resolution RPCs: Success and Exponential Backoff Failure
CREATE OR REPLACE FUNCTION public.fn_complete_domain_event(
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.domain_events
    SET status = 'COMPLETED',
        processed_at = now(),
        locked_at = NULL,
        locked_by = NULL
    WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'event_id', p_event_id, 'status', 'COMPLETED');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_fail_domain_event(
    p_event_id UUID,
    p_error TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_new_retry INTEGER;
    v_new_status VARCHAR(32);
    v_delay_seconds INTEGER;
    v_new_available TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_event FROM public.domain_events WHERE id = p_event_id;
    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    v_new_retry := v_event.retry_count + 1;

    IF v_new_retry >= v_event.max_retries THEN
        v_new_status := 'DEAD_LETTER';
        v_new_available := now();
    ELSE
        v_new_status := 'PENDING';
        -- Exponential backoff:
        -- Attempt 1 -> 30s
        -- Attempt 2 -> 2m (120s)
        -- Attempt 3 -> 10m (600s)
        -- Attempt 4 -> 30m (1800s)
        -- Attempt 5+ -> DEAD_LETTER
        CASE v_new_retry
            WHEN 1 THEN v_delay_seconds := 30;
            WHEN 2 THEN v_delay_seconds := 120;
            WHEN 3 THEN v_delay_seconds := 600;
            WHEN 4 THEN v_delay_seconds := 1800;
            ELSE v_delay_seconds := 3600;
        END CASE;
        v_new_available := now() + (v_delay_seconds || ' seconds')::INTERVAL;
    END IF;

    UPDATE public.domain_events
    SET status = v_new_status,
        retry_count = v_new_retry,
        available_at = v_new_available,
        last_error = p_error,
        locked_at = NULL,
        locked_by = NULL
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', p_event_id,
        'status', v_new_status,
        'retry_count', v_new_retry,
        'available_at', v_new_available
    );
END;
$$;

GRANT ALL ON public.domain_events TO authenticated, service_role;
GRANT ALL ON public.overtime_records TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_claim_domain_events(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_complete_domain_event(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_fail_domain_event(UUID, TEXT) TO authenticated, service_role;
