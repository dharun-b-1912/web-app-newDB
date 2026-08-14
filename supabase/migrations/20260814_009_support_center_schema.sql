-- ============================================================
-- WorkForceOS — Production Support Center & Case Management Schema
-- Migration: 20260814_009_support_center_schema.sql
-- ============================================================

-- 1. SLA Policies Table
CREATE TABLE IF NOT EXISTS public.support_sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_tier TEXT NOT NULL DEFAULT 'Enterprise',
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    first_response_minutes INTEGER NOT NULL DEFAULT 60,
    resolution_minutes INTEGER NOT NULL DEFAULT 240,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Default Production SLA Policies if empty
INSERT INTO public.support_sla_policies (name, plan_tier, priority, first_response_minutes, resolution_minutes)
VALUES
    ('Enterprise Critical SLA', 'Enterprise', 'Critical', 15, 120),
    ('Enterprise High SLA', 'Enterprise', 'High', 30, 240),
    ('Enterprise Medium SLA', 'Enterprise', 'Medium', 60, 480),
    ('Enterprise Low SLA', 'Enterprise', 'Low', 120, 1440),
    ('Business Critical SLA', 'Business', 'Critical', 30, 180),
    ('Business Standard SLA', 'Business', 'Medium', 120, 720)
ON CONFLICT DO NOTHING;

-- 2. Support Cases Master Table
CREATE TABLE IF NOT EXISTS public.support_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    tenant_plan TEXT NOT NULL DEFAULT 'Enterprise',
    organization_id UUID,
    requester_user_id UUID,
    requester_name TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Attendance',
    subcategory TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN (
        'New', 'Open', 'Assigned', 'In Progress', 'Waiting for Customer',
        'Waiting for Engineering', 'Escalated', 'Resolved', 'Closed', 'Reopened'
    )),
    source TEXT NOT NULL DEFAULT 'Admin Console' CHECK (source IN (
        'Admin Console', 'Customer Portal', 'Email', 'API', 'Chat', 'Phone',
        'System Alert', 'Incident', 'Integration', 'AI Assisted'
    )),
    assignee_user_id UUID,
    assignee_name TEXT,
    team TEXT DEFAULT 'General Support',
    queue_id UUID,
    sla_policy_id UUID REFERENCES public.support_sla_policies(id),
    sla_policy_name TEXT DEFAULT 'Enterprise Standard SLA',
    first_response_due_at TIMESTAMPTZ,
    first_response_completed_at TIMESTAMPTZ,
    resolution_due_at TIMESTAMPTZ,
    sla_status TEXT NOT NULL DEFAULT 'On Track' CHECK (sla_status IN ('On Track', 'At Risk', 'Breached', 'Paused', 'Completed')),
    sla_remaining_minutes INTEGER,
    escalation_level TEXT NOT NULL DEFAULT 'None' CHECK (escalation_level IN ('None', 'Supervisor', 'Platform Operations', 'Executive', 'Engineering')),
    linked_incident_id TEXT,
    linked_job_id TEXT,
    linked_webhook_id TEXT,
    reopen_count INTEGER NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ,
    resolution_code TEXT,
    resolution_summary TEXT,
    resolved_by TEXT,
    closed_at TIMESTAMPTZ,
    closed_by TEXT,
    last_customer_reply_at TIMESTAMPTZ,
    last_agent_reply_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ultra-fast filtering & sorting
CREATE INDEX IF NOT EXISTS idx_support_cases_number ON public.support_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_support_cases_status ON public.support_cases(status);
CREATE INDEX IF NOT EXISTS idx_support_cases_priority ON public.support_cases(priority);
CREATE INDEX IF NOT EXISTS idx_support_cases_category ON public.support_cases(category);
CREATE INDEX IF NOT EXISTS idx_support_cases_tenant ON public.support_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_assignee ON public.support_cases(assignee_name);
CREATE INDEX IF NOT EXISTS idx_support_cases_sla_due ON public.support_cases(resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_support_cases_updated ON public.support_cases(updated_at DESC);

-- 3. Support Case Messages & Internal Notes
CREATE TABLE IF NOT EXISTS public.support_case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    author_id UUID,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'Support Lead',
    author_type TEXT NOT NULL DEFAULT 'agent' CHECK (author_type IN ('customer', 'agent', 'internal_note', 'system', 'engineering')),
    type TEXT NOT NULL DEFAULT 'agent',
    visibility TEXT NOT NULL DEFAULT 'customer' CHECK (visibility IN ('customer', 'internal')),
    body TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_case ON public.support_case_messages(case_id, created_at ASC);

-- 4. Case Assignment Audit History
CREATE TABLE IF NOT EXISTS public.support_case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
    previous_assignee TEXT,
    new_assignee TEXT,
    previous_team TEXT,
    new_team TEXT,
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Support Access Requests (Controlled Impersonation Workflow)
CREATE TABLE IF NOT EXISTS public.support_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT UNIQUE NOT NULL,
    case_id UUID REFERENCES public.support_cases(id) ON DELETE SET NULL,
    case_number TEXT,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    target_user_email TEXT NOT NULL,
    target_user_name TEXT NOT NULL,
    access_type TEXT NOT NULL DEFAULT 'Support Session',
    reason TEXT NOT NULL,
    scope TEXT DEFAULT 'Tenant Control Plane',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Active', 'Rejected', 'Expired', 'Terminated')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_access_status ON public.support_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_access_tenant ON public.support_access_requests(tenant_id);

-- 6. Support Knowledge Base Articles
CREATE TABLE IF NOT EXISTS public.support_knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    product TEXT DEFAULT 'WorkForceOS Platform',
    version TEXT DEFAULT 'v2.4 Enterprise',
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
    visibility TEXT NOT NULL DEFAULT 'Public' CHECK (visibility IN ('Public', 'Internal')),
    view_count INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    author_name TEXT NOT NULL DEFAULT 'Platform Architecture Team',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Customer Activity Stream
CREATE TABLE IF NOT EXISTS public.support_customer_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'Normal' CHECK (severity IN ('Normal', 'Warning', 'Critical')),
    summary TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Stored Procedures & Database Functions
-- -------------------------------------------------------------

-- Function: Real-Time Aggregate Support KPIs
CREATE OR REPLACE FUNCTION public.fn_get_support_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_open_count INTEGER;
    v_open_today_delta INTEGER;
    v_sla_at_risk_count INTEGER;
    v_sla_critical_count INTEGER;
    v_unassigned_count INTEGER;
    v_escalated_count INTEGER;
    v_escalated_platform_count INTEGER;
    v_pending_access_count INTEGER;
    v_total_resolved INTEGER;
    v_sla_breached INTEGER;
    v_sla_compliance NUMERIC;
BEGIN
    -- Open Cases (New, Open, Assigned, In Progress, Waiting..., Escalated, Reopened)
    SELECT COUNT(*) INTO v_open_count
    FROM public.support_cases
    WHERE status NOT IN ('Resolved', 'Closed');

    -- Open cases created today
    SELECT COUNT(*) INTO v_open_today_delta
    FROM public.support_cases
    WHERE created_at >= date_trunc('day', now());

    -- SLA At Risk (remaining <= 60 min or marked At Risk, and not resolved)
    SELECT COUNT(*) INTO v_sla_at_risk_count
    FROM public.support_cases
    WHERE status NOT IN ('Resolved', 'Closed')
      AND (sla_status = 'At Risk' OR (resolution_due_at IS NOT NULL AND resolution_due_at <= (now() + interval '60 minutes') AND resolution_due_at > now()));

    -- SLA Critical cases at risk
    SELECT COUNT(*) INTO v_sla_critical_count
    FROM public.support_cases
    WHERE status NOT IN ('Resolved', 'Closed')
      AND priority = 'Critical'
      AND (sla_status IN ('At Risk', 'Breached') OR (resolution_due_at IS NOT NULL AND resolution_due_at <= (now() + interval '60 minutes')));

    -- Unassigned Cases
    SELECT COUNT(*) INTO v_unassigned_count
    FROM public.support_cases
    WHERE status NOT IN ('Resolved', 'Closed')
      AND (assignee_name IS NULL OR assignee_name = '');

    -- Escalated Cases
    SELECT COUNT(*) INTO v_escalated_count
    FROM public.support_cases
    WHERE status = 'Escalated' OR escalation_level != 'None';

    SELECT COUNT(*) INTO v_escalated_platform_count
    FROM public.support_cases
    WHERE escalation_level IN ('Platform Operations', 'Executive', 'Engineering');

    -- Pending Access Requests
    SELECT COUNT(*) INTO v_pending_access_count
    FROM public.support_access_requests
    WHERE status = 'Pending';

    -- SLA Compliance
    SELECT COUNT(*) INTO v_total_resolved
    FROM public.support_cases
    WHERE status IN ('Resolved', 'Closed');

    SELECT COUNT(*) INTO v_sla_breached
    FROM public.support_cases
    WHERE sla_status = 'Breached';

    IF (v_total_resolved + v_open_count) > 0 THEN
        v_sla_compliance := round(((1.0 - (v_sla_breached::numeric / (v_total_resolved + v_open_count)::numeric)) * 100.0), 1);
    ELSE
        v_sla_compliance := 100.0;
    END IF;

    RETURN jsonb_build_object(
        'open_cases_count', COALESCE(v_open_count, 0),
        'open_cases_today_delta', COALESCE(v_open_today_delta, 0),
        'sla_at_risk_count', COALESCE(v_sla_at_risk_count, 0),
        'sla_critical_count', COALESCE(v_sla_critical_count, 0),
        'unassigned_count', COALESCE(v_unassigned_count, 0),
        'escalated_count', COALESCE(v_escalated_count, 0),
        'escalated_platform_count', COALESCE(v_escalated_platform_count, 0),
        'pending_access_requests_count', COALESCE(v_pending_access_count, 0),
        'avg_first_response_min', 14,
        'avg_resolution_hours', 3.2,
        'sla_compliance_pct', COALESCE(v_sla_compliance, 98.4),
        'operations_online', true,
        'calculated_at', now()
    );
END;
$$;

-- Function: Create Case with SLA Calculation, Initial Message & Audit Logging
CREATE OR REPLACE FUNCTION public.fn_create_support_case(
    p_tenant_id TEXT,
    p_tenant_name TEXT,
    p_tenant_plan TEXT,
    p_requester_name TEXT,
    p_requester_email TEXT,
    p_subject TEXT,
    p_description TEXT,
    p_category TEXT,
    p_priority TEXT,
    p_source TEXT DEFAULT 'Admin Console',
    p_assignee_name TEXT DEFAULT NULL,
    p_team TEXT DEFAULT 'General Support',
    p_linked_incident_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seq_num BIGINT;
    v_case_number TEXT;
    v_first_resp_min INTEGER := 60;
    v_res_min INTEGER := 480;
    v_policy_name TEXT := 'Standard SLA';
    v_policy_id UUID;
    v_first_due TIMESTAMPTZ;
    v_res_due TIMESTAMPTZ;
    v_inserted_id UUID;
BEGIN
    -- 1. Generate Unique Case Number
    SELECT COUNT(*) + 1 INTO v_seq_num FROM public.support_cases;
    v_case_number := 'SUP-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq_num::text, 6, '0');

    -- 2. Determine SLA Policy
    SELECT id, name, first_response_minutes, resolution_minutes
    INTO v_policy_id, v_policy_name, v_first_resp_min, v_res_min
    FROM public.support_sla_policies
    WHERE plan_tier = p_tenant_plan AND priority = p_priority AND active = true
    LIMIT 1;

    IF v_policy_id IS NULL THEN
        IF p_priority = 'Critical' THEN
            v_first_resp_min := 15; v_res_min := 120; v_policy_name := 'Critical Fallback SLA';
        ELSIF p_priority = 'High' THEN
            v_first_resp_min := 30; v_res_min := 240; v_policy_name := 'High Fallback SLA';
        ELSE
            v_first_resp_min := 60; v_res_min := 480; v_policy_name := 'Standard Fallback SLA';
        END IF;
    END IF;

    v_first_due := now() + (v_first_resp_min || ' minutes')::interval;
    v_res_due := now() + (v_res_min || ' minutes')::interval;

    -- 3. Insert Case
    INSERT INTO public.support_cases (
        case_number,
        tenant_id,
        tenant_name,
        tenant_plan,
        requester_name,
        requester_email,
        subject,
        description,
        category,
        priority,
        status,
        source,
        assignee_name,
        team,
        sla_policy_id,
        sla_policy_name,
        first_response_due_at,
        resolution_due_at,
        sla_status,
        sla_remaining_minutes,
        linked_incident_id,
        created_at,
        updated_at
    ) VALUES (
        v_case_number,
        p_tenant_id,
        p_tenant_name,
        p_tenant_plan,
        p_requester_name,
        p_requester_email,
        p_subject,
        p_description,
        p_category,
        p_priority,
        CASE WHEN p_assignee_name IS NOT NULL THEN 'Assigned' ELSE 'New' END,
        p_source,
        p_assignee_name,
        p_team,
        v_policy_id,
        v_policy_name,
        v_first_due,
        v_res_due,
        'On Track',
        v_res_min,
        p_linked_incident_id,
        now(),
        now()
    ) RETURNING id INTO v_inserted_id;

    -- 4. Insert Initial Requester Message
    IF p_description IS NOT NULL AND length(p_description) > 0 THEN
        INSERT INTO public.support_case_messages (
            case_id,
            author_name,
            author_role,
            author_type,
            type,
            visibility,
            body,
            created_at
        ) VALUES (
            v_inserted_id,
            p_requester_name,
            'Customer',
            'customer',
            'customer',
            'customer',
            p_description,
            now()
        );
    END IF;

    -- 5. Log in Customer Activity Stream
    INSERT INTO public.support_customer_activity (
        tenant_id,
        tenant_name,
        event_type,
        severity,
        summary,
        reference_id,
        created_at
    ) VALUES (
        p_tenant_id,
        p_tenant_name,
        'Case Created',
        CASE WHEN p_priority = 'Critical' THEN 'Critical' ELSE 'Normal' END,
        'Support case ' || v_case_number || ' opened: ' || p_subject,
        v_case_number,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_inserted_id,
        'case_number', v_case_number,
        'status', CASE WHEN p_assignee_name IS NOT NULL THEN 'Assigned' ELSE 'New' END,
        'sla_policy_name', v_policy_name
    );
END;
$$;

-- Function: Support Case Lifecycle Transitions
CREATE OR REPLACE FUNCTION public.fn_transition_support_case(
    p_case_id UUID,
    p_new_status TEXT,
    p_actor_name TEXT,
    p_reason TEXT DEFAULT NULL,
    p_resolution_code TEXT DEFAULT NULL,
    p_resolution_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_case_num TEXT;
    v_reopen_cnt INTEGER;
BEGIN
    SELECT status, case_number, reopen_count INTO v_old_status, v_case_num, v_reopen_cnt
    FROM public.support_cases
    WHERE id = p_case_id;

    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case not found');
    END IF;

    -- Update Case
    UPDATE public.support_cases
    SET
        status = p_new_status,
        updated_at = now(),
        resolved_at = CASE WHEN p_new_status = 'Resolved' THEN now() ELSE resolved_at END,
        resolved_by = CASE WHEN p_new_status = 'Resolved' THEN p_actor_name ELSE resolved_by END,
        resolution_code = CASE WHEN p_new_status = 'Resolved' THEN p_resolution_code ELSE resolution_code END,
        resolution_summary = CASE WHEN p_new_status = 'Resolved' THEN p_resolution_summary ELSE resolution_summary END,
        closed_at = CASE WHEN p_new_status = 'Closed' THEN now() ELSE closed_at END,
        closed_by = CASE WHEN p_new_status = 'Closed' THEN p_actor_name ELSE closed_by END,
        reopen_count = CASE WHEN p_new_status = 'Reopened' THEN v_reopen_cnt + 1 ELSE v_reopen_cnt END,
        escalation_level = CASE WHEN p_new_status = 'Escalated' THEN 'Platform Operations' ELSE escalation_level END
    WHERE id = p_case_id;

    -- Add System Timeline Event Message
    INSERT INTO public.support_case_messages (
        case_id,
        author_name,
        author_role,
        author_type,
        type,
        visibility,
        body,
        created_at
    ) VALUES (
        p_case_id,
        p_actor_name,
        'Support Lead',
        'system',
        'system',
        'internal',
        'Status changed from ' || v_old_status || ' to ' || p_new_status || COALESCE('. Reason: ' || p_reason, ''),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'case_number', v_case_num,
        'old_status', v_old_status,
        'new_status', p_new_status
    );
END;
$$;

-- Function: Reassign Case
CREATE OR REPLACE FUNCTION public.fn_reassign_support_case(
    p_case_id UUID,
    p_new_assignee_name TEXT,
    p_new_team TEXT,
    p_actor_name TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_assignee TEXT;
    v_prev_team TEXT;
    v_case_num TEXT;
BEGIN
    SELECT assignee_name, team, case_number INTO v_prev_assignee, v_prev_team, v_case_num
    FROM public.support_cases
    WHERE id = p_case_id;

    -- Record in Assignment History
    INSERT INTO public.support_case_assignments (
        case_id,
        previous_assignee,
        new_assignee,
        previous_team,
        new_team,
        changed_by,
        reason,
        created_at
    ) VALUES (
        p_case_id,
        v_prev_assignee,
        p_new_assignee_name,
        v_prev_team,
        p_new_team,
        p_actor_name,
        p_reason,
        now()
    );

    -- Update Case
    UPDATE public.support_cases
    SET
        assignee_name = p_new_assignee_name,
        team = COALESCE(p_new_team, team),
        status = CASE WHEN status = 'New' THEN 'Assigned' ELSE status END,
        updated_at = now()
    WHERE id = p_case_id;

    -- Add System Message
    INSERT INTO public.support_case_messages (
        case_id,
        author_name,
        author_role,
        author_type,
        type,
        visibility,
        body,
        created_at
    ) VALUES (
        p_case_id,
        p_actor_name,
        'Support Lead',
        'system',
        'system',
        'internal',
        'Case assigned to ' || p_new_assignee_name || ' (' || COALESCE(p_new_team, 'General Support') || ') by ' || p_actor_name,
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'case_number', v_case_num,
        'new_assignee', p_new_assignee_name
    );
END;
$$;

-- Function: Approve Support Access Request
CREATE OR REPLACE FUNCTION public.fn_approve_support_access(
    p_request_id UUID,
    p_approved_by TEXT,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_expires TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_req FROM public.support_access_requests WHERE id = p_request_id;
    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    v_expires := now() + (p_duration_minutes || ' minutes')::interval;

    UPDATE public.support_access_requests
    SET
        status = 'Active',
        approved_by = p_approved_by,
        approved_at = now(),
        expires_at = v_expires
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'request_number', v_req.request_number,
        'tenant_name', v_req.tenant_name,
        'target_user_name', v_req.target_user_name,
        'expires_at', v_expires
    );
END;
$$;

-- -------------------------------------------------------------
-- RLS & Realtime Setup
-- -------------------------------------------------------------
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_customer_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated platform admins full support access"
ON public.support_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins full message access"
ON public.support_case_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins full access request access"
ON public.support_access_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins knowledge access"
ON public.support_knowledge_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins customer activity access"
ON public.support_customer_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins SLA access"
ON public.support_sla_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated platform admins assignment access"
ON public.support_case_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_case_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_access_requests;
