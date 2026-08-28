-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 054
-- Real Production-Ready Document Request → Supabase → Flutter Notification Engine
-- Migration: 20260825_054_real_document_request_notification_workflow.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure document_requirements table has full enterprise columns & constraints
CREATE TABLE IF NOT EXISTS public.document_requirements (
    id TEXT PRIMARY KEY DEFAULT ('doc-req-' || gen_random_uuid()::text),
    tenant_id TEXT NOT NULL DEFAULT 'org-joy-01',
    organization_id TEXT DEFAULT 'org-joy-01',
    employee_id TEXT NOT NULL,
    employee_code TEXT,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'REQUIRED'
        CHECK (status IN ('REQUIRED', 'PENDING', 'UPLOADING', 'PROCESSING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REUPLOAD_REQUIRED', 'CANCELLED', 'EXPIRED')),
    rejection_reason TEXT,
    requested_by TEXT DEFAULT 'HR Team',
    document_id TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.document_requirements ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_doc_req_emp ON public.document_requirements(employee_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_status ON public.document_requirements(status);
CREATE INDEX IF NOT EXISTS idx_doc_req_idempotency ON public.document_requirements(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Ensure notification_events table has complete columns
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('APPROVAL', 'SECURITY', 'INTEGRATION', 'PLATFORM', 'BILLING', 'SUPPORT', 'ATTENDANCE', 'PAYROLL', 'SYSTEM', 'COMPLIANCE')),
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL', 'ACTION_REQUIRED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    actor_id UUID,
    actor_name TEXT,
    actor_avatar TEXT,
    resource_type TEXT,
    resource_id TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    target_user_ids TEXT[],
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS target_user_ids TEXT[];
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE public.notification_events ADD COLUMN IF NOT EXISTS action_url TEXT;

CREATE INDEX IF NOT EXISTS idx_notif_events_res ON public.notification_events(resource_type, resource_id);

-- 3. Ensure notification_deliveries table exists for recipient tracking
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notification_events(id) ON DELETE CASCADE,
    recipient_user_id UUID,
    recipient_employee_id TEXT,
    channel TEXT NOT NULL DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP', 'SMS')),
    status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'DISMISSED', 'FAILED', 'EXPIRED')),
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS recipient_employee_id TEXT;
ALTER TABLE public.notification_deliveries ALTER COLUMN recipient_user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_deliv_emp ON public.notification_deliveries(recipient_employee_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliv_rec ON public.notification_deliveries(recipient_user_id);

-- 4. Enable Realtime Publications for the essential workflow tables idempotently
DO $$
DECLARE
    tbl TEXT;
    tables_to_add TEXT[] := ARRAY[
        'document_requirements',
        'notification_events',
        'notification_deliveries',
        'employee_documents',
        'realtime_outbox'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH tbl IN ARRAY tables_to_add
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- 5. SERVER-SIDE ATOMIC DISPATCH FUNCTION (HR -> POSTGRES -> NOTIFICATION -> REALTIME)
CREATE OR REPLACE FUNCTION public.fn_dispatch_document_request(
    p_employee_id       TEXT,
    p_document_type     TEXT,
    p_title             TEXT,
    p_description       TEXT DEFAULT '',
    p_due_date          DATE DEFAULT NULL,
    p_is_mandatory      BOOLEAN DEFAULT TRUE,
    p_requested_by      TEXT DEFAULT 'HR Team',
    p_correlation_id    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req_id        TEXT;
    v_notif_id      UUID := gen_random_uuid();
    v_tenant_id     TEXT := 'org-joy-01';
    v_emp           RECORD;
    v_auth_uid      UUID;
    v_existing_req  RECORD;
BEGIN
    -- 1. Idempotency Check: Return existing if correlation_id already processed
    IF p_correlation_id IS NOT NULL AND p_correlation_id <> '' THEN
        SELECT * INTO v_existing_req 
        FROM public.document_requirements 
        WHERE idempotency_key = p_correlation_id 
        LIMIT 1;

        IF v_existing_req.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'request_id', v_existing_req.id,
                'status', v_existing_req.status,
                'correlation_id', p_correlation_id
            );
        END IF;
    END IF;

    -- 2. Resolve Employee Record & Tenant
    SELECT * INTO v_emp FROM public.employees 
    WHERE id = p_employee_id OR employee_code = p_employee_id 
    LIMIT 1;

    IF v_emp.organization_id IS NOT NULL AND v_emp.organization_id <> '' THEN
        v_tenant_id := v_emp.organization_id;
    END IF;

    -- Resolve recipient auth user ID if provisioned
    SELECT auth_user_id INTO v_auth_uid 
    FROM public.app_users 
    WHERE employee_id = p_employee_id 
    LIMIT 1;

    IF v_auth_uid IS NULL THEN
        SELECT auth_user_id INTO v_auth_uid 
        FROM public.employee_auth_identities 
        WHERE employee_id = p_employee_id 
        LIMIT 1;
    END IF;

    -- 3. Generate Request ID
    v_req_id := 'doc-req-' || gen_random_uuid()::text;

    -- 4. Insert Document Requirement Record
    INSERT INTO public.document_requirements (
        id, tenant_id, organization_id, employee_id, employee_code,
        document_type, title, description, required, due_date,
        status, requested_by, idempotency_key, created_at, updated_at
    ) VALUES (
        v_req_id, v_tenant_id, v_tenant_id, p_employee_id, COALESCE(v_emp.employee_code, p_employee_id),
        p_document_type, p_title, p_description, p_is_mandatory, p_due_date,
        'REQUIRED', p_requested_by, p_correlation_id, NOW(), NOW()
    );

    -- 5. Insert Canonical Notification Event
    INSERT INTO public.notification_events (
        id, event_type, category, severity,
        title, body, actor_name,
        resource_type, resource_id, action_url,
        metadata, target_user_ids, idempotency_key, created_at
    ) VALUES (
        v_notif_id, 'DOCUMENT_UPLOAD_REQUESTED', 'SYSTEM', 'WARNING',
        'Action Required: Document Upload (' || p_title || ')',
        CASE WHEN p_description <> '' THEN p_description ELSE 'HR requested you to upload: ' || p_title END,
        p_requested_by,
        'DOCUMENT_REQUIREMENT', v_req_id, '/documents/request/' || v_req_id,
        jsonb_build_object(
            'requirement_id', v_req_id,
            'employee_id', p_employee_id,
            'document_type', p_document_type,
            'due_date', p_due_date,
            'correlation_id', p_correlation_id
        ),
        ARRAY[p_employee_id, COALESCE(v_emp.employee_code, p_employee_id)],
        p_correlation_id,
        NOW()
    );

    -- 6. Insert Multi-Channel Delivery Record for Employee
    INSERT INTO public.notification_deliveries (
        notification_id, recipient_user_id, recipient_employee_id,
        channel, status, delivered_at, created_at
    ) VALUES (
        v_notif_id, v_auth_uid, p_employee_id,
        'IN_APP', 'DELIVERED', NOW(), NOW()
    );

    -- 7. Broadcast Realtime Outbox Event
    INSERT INTO public.realtime_outbox (
        event_type, entity_type, entity_id, organization_id, payload
    ) VALUES (
        'document.requested', 'DOCUMENT_REQUIREMENT', v_req_id, v_tenant_id,
        jsonb_build_object(
            'requirement_id', v_req_id,
            'employee_id', p_employee_id,
            'title', p_title,
            'document_type', p_document_type,
            'due_date', p_due_date,
            'notification_id', v_notif_id,
            'correlation_id', p_correlation_id,
            'created_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_req_id,
        'notification_id', v_notif_id,
        'recipient_employee_id', p_employee_id,
        'correlation_id', p_correlation_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_dispatch_document_request(TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, TEXT, TEXT) TO anon, authenticated, service_role, public;

-- 6. SERVER-SIDE ATOMIC DOCUMENT SUBMISSION (Flutter -> Storage -> Database -> Realtime)
CREATE OR REPLACE FUNCTION public.fn_submit_document_upload(
    p_requirement_id    TEXT,
    p_employee_id       TEXT,
    p_document_type     TEXT,
    p_file_name         TEXT,
    p_file_url          TEXT,
    p_storage_path      TEXT DEFAULT '',
    p_file_size_bytes   BIGINT DEFAULT 0,
    p_mime_type         TEXT DEFAULT 'application/pdf'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_doc_id    TEXT := 'doc-emp-' || gen_random_uuid()::text;
    v_tenant_id TEXT := 'org-joy-01';
BEGIN
    -- 1. Insert into employee_documents
    INSERT INTO public.employee_documents (
        id, employee_id, document_type, file_name, file_url,
        verification_status, uploaded_at
    ) VALUES (
        v_doc_id, p_employee_id, p_document_type, p_file_name, p_file_url,
        'PENDING', NOW()
    );

    -- 2. Update document_requirements status to SUBMITTED
    IF p_requirement_id IS NOT NULL AND p_requirement_id <> '' THEN
        UPDATE public.document_requirements
        SET status = 'SUBMITTED',
            document_id = v_doc_id,
            updated_at = NOW()
        WHERE id = p_requirement_id;
    END IF;

    -- 3. Emit Realtime Outbox Event for HR Web
    INSERT INTO public.realtime_outbox (
        event_type, entity_type, entity_id, organization_id, payload
    ) VALUES (
        'document.submitted', 'DOCUMENT_REQUIREMENT', COALESCE(p_requirement_id, v_doc_id), v_tenant_id,
        jsonb_build_object(
            'requirement_id', p_requirement_id,
            'document_id', v_doc_id,
            'employee_id', p_employee_id,
            'document_type', p_document_type,
            'file_name', p_file_name,
            'status', 'SUBMITTED',
            'submitted_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'document_id', v_doc_id,
        'requirement_id', p_requirement_id,
        'status', 'SUBMITTED'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_submit_document_upload(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT) TO anon, authenticated, service_role, public;

-- 7. SERVER-SIDE ATOMIC VERIFICATION / REJECTION
CREATE OR REPLACE FUNCTION public.fn_verify_document_requirement(
    p_requirement_id    TEXT,
    p_action            TEXT, -- 'APPROVE', 'REJECT', 'REUPLOAD_REQUIRED'
    p_rejection_reason  TEXT DEFAULT '',
    p_reviewer_name     TEXT DEFAULT 'HR Team'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req           RECORD;
    v_new_status    TEXT;
    v_notif_title   TEXT;
    v_notif_body    TEXT;
    v_notif_id      UUID := gen_random_uuid();
BEGIN
    SELECT * INTO v_req FROM public.document_requirements WHERE id = p_requirement_id;
    IF v_req.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Requirement not found');
    END IF;

    IF p_action = 'APPROVE' THEN
        v_new_status := 'VERIFIED';
        v_notif_title := 'Document Verified: ' || v_req.title;
        v_notif_body := 'Your uploaded document (' || v_req.title || ') has been reviewed and verified by ' || p_reviewer_name || '.';
    ELSIF p_action = 'REJECT' THEN
        v_new_status := 'REJECTED';
        v_notif_title := 'Document Rejected: ' || v_req.title;
        v_notif_body := 'Rejection Reason: ' || COALESCE(p_rejection_reason, 'Document did not meet verification standards.');
    ELSE
        v_new_status := 'REUPLOAD_REQUIRED';
        v_notif_title := 'Action Required: Re-upload ' || v_req.title;
        v_notif_body := 'Please re-upload a clearer copy of ' || v_req.title || '. Reason: ' || COALESCE(p_rejection_reason, 'Unclear document.');
    END IF;

    -- Update requirement
    UPDATE public.document_requirements
    SET status = v_new_status,
        rejection_reason = CASE WHEN p_action IN ('REJECT', 'REUPLOAD_REQUIRED') THEN p_rejection_reason ELSE NULL END,
        completed_at = CASE WHEN p_action = 'APPROVE' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_requirement_id;

    -- Update employee_documents verification status if linked
    IF v_req.document_id IS NOT NULL THEN
        UPDATE public.employee_documents
        SET verification_status = CASE WHEN p_action = 'APPROVE' THEN 'VERIFIED' ELSE 'REJECTED' END
        WHERE id = v_req.document_id;
    END IF;

    -- Create notification for employee
    INSERT INTO public.notification_events (
        id, event_type, category, severity,
        title, body, actor_name,
        resource_type, resource_id, action_url,
        metadata, target_user_ids, created_at
    ) VALUES (
        v_notif_id, 'DOCUMENT_' || p_action, 'SYSTEM',
        CASE WHEN p_action = 'APPROVE' THEN 'SUCCESS' ELSE 'WARNING' END,
        v_notif_title, v_notif_body, p_reviewer_name,
        'DOCUMENT_REQUIREMENT', p_requirement_id, '/documents/request/' || p_requirement_id,
        jsonb_build_object(
            'requirement_id', p_requirement_id,
            'employee_id', v_req.employee_id,
            'status', v_new_status,
            'rejection_reason', p_rejection_reason
        ),
        ARRAY[v_req.employee_id, COALESCE(v_req.employee_code, v_req.employee_id)],
        NOW()
    );

    -- Emit Realtime Outbox
    INSERT INTO public.realtime_outbox (
        event_type, entity_type, entity_id, organization_id, payload
    ) VALUES (
        'document.verified', 'DOCUMENT_REQUIREMENT', p_requirement_id, v_req.tenant_id,
        jsonb_build_object(
            'requirement_id', p_requirement_id,
            'employee_id', v_req.employee_id,
            'status', v_new_status,
            'action', p_action,
            'rejection_reason', p_rejection_reason,
            'verified_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'requirement_id', p_requirement_id,
        'status', v_new_status,
        'notification_id', v_notif_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_verify_document_requirement(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role, public;
