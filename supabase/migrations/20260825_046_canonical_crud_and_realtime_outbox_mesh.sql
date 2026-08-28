    -- ============================================================================
    -- WorkForceOS Enterprise HRMS — Migration 046
    -- Canonical CRUD Mutation Engine, Optimistic Concurrency & Realtime Outbox Mesh
    -- Migration: 20260825_046_canonical_crud_and_realtime_outbox_mesh.sql
    -- ============================================================================

    -- 0. SAFE MULTI-TENANT ORG RESOLVER (Prevents 0-row RLS dropouts)
    CREATE OR REPLACE FUNCTION public.current_org_id()
    RETURNS TEXT 
    LANGUAGE sql 
    SECURITY DEFINER 
    STABLE
    SET search_path = public
    AS $$
    SELECT COALESCE(
        (SELECT organization_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1),
        (SELECT organization_id FROM public.employee_auth_identities WHERE auth_user_id = auth.uid() LIMIT 1),
        'org-joy-01'
    );
    $$;

    GRANT EXECUTE ON FUNCTION public.current_org_id() TO anon, authenticated, service_role, public;

    -- 1. MASTER CONSISTENCY CONTRACT COLUMNS
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_by TEXT;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1;
    ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_by TEXT;
    ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    ALTER TABLE public.designations ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1;
    ALTER TABLE public.designations ADD COLUMN IF NOT EXISTS updated_by TEXT;
    ALTER TABLE public.designations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS record_version INTEGER DEFAULT 1;
    ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_by TEXT;
    ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    -- 2. REALTIME OUTBOX TABLE (Transactional SaaS Event Mesh)
    CREATE TABLE IF NOT EXISTS public.realtime_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        organization_id TEXT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        record_version INTEGER NOT NULL DEFAULT 1,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        actor_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_realtime_outbox_tenant ON public.realtime_outbox(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_realtime_outbox_entity ON public.realtime_outbox(entity_type, entity_id);

    -- Enable RLS on realtime_outbox
    ALTER TABLE public.realtime_outbox ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "realtime_outbox_tenant_isolation" ON public.realtime_outbox;
    CREATE POLICY "realtime_outbox_tenant_isolation" ON public.realtime_outbox
        FOR ALL USING (
            tenant_id = public.current_org_id() 
            OR organization_id = public.current_org_id()
            OR auth.role() = 'service_role'
        );

    -- 3. CANONICAL EMPLOYEE MUTATION RPC (Optimistic Concurrency + Transactional Outbox)
    CREATE OR REPLACE FUNCTION public.fn_mutate_employee(
        p_employee_id TEXT,
        p_patch JSONB,
        p_expected_version INTEGER DEFAULT NULL,
        p_actor_id TEXT DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        v_existing public.employees%ROWTYPE;
        v_updated public.employees%ROWTYPE;
        v_caller_org TEXT;
        v_next_version INTEGER;
        v_first_name TEXT;
        v_last_name TEXT;
        v_display_name TEXT;
        v_dept_name TEXT;
        v_desig_title TEXT;
        v_branch_name TEXT;
        v_reporting_manager_name TEXT;
        v_audit_id UUID := gen_random_uuid();
        v_outbox_id UUID := gen_random_uuid();
        v_result JSONB;
    BEGIN
        -- 1. Fetch current canonical record
        SELECT * INTO v_existing
        FROM public.employees
        WHERE id = p_employee_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND: Employee record % does not exist', p_employee_id
                USING ERRCODE = 'P0002';
        END IF;

        -- 2. Concurrency Check (Optimistic Locking)
        IF p_expected_version IS NOT NULL AND v_existing.record_version IS NOT NULL THEN
            IF v_existing.record_version <> p_expected_version THEN
                RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Record version mismatch. Current version is %, expected %', 
                    v_existing.record_version, p_expected_version
                    USING ERRCODE = '40001';
            END IF;
        END IF;

        v_next_version := COALESCE(v_existing.record_version, 1) + 1;

        -- 3. Resolve Field Patches with fallback to existing values
        v_first_name := COALESCE((p_patch->>'first_name'), v_existing.first_name);
        v_last_name  := CASE WHEN p_patch ? 'last_name' THEN (p_patch->>'last_name') ELSE v_existing.last_name END;
        v_display_name := COALESCE(
            (p_patch->>'display_name'),
            TRIM(CONCAT(v_first_name, ' ', COALESCE(v_last_name, '')))
        );

        -- Resolve foreign display names if IDs are passed
        v_dept_name := COALESCE((p_patch->>'department_name'), v_existing.department_name);
        IF p_patch ? 'department_id' AND (p_patch->>'department_id') IS NOT NULL THEN
            SELECT name INTO v_dept_name FROM public.departments WHERE id = (p_patch->>'department_id');
            v_dept_name := COALESCE(v_dept_name, v_existing.department_name);
        END IF;

        v_desig_title := COALESCE((p_patch->>'designation_title'), v_existing.designation_title);
        IF p_patch ? 'designation_id' AND (p_patch->>'designation_id') IS NOT NULL THEN
            SELECT title INTO v_desig_title FROM public.designations WHERE id = (p_patch->>'designation_id');
            v_desig_title := COALESCE(v_desig_title, v_existing.designation_title);
        END IF;

        v_branch_name := COALESCE((p_patch->>'branch_name'), v_existing.branch_name);
        IF p_patch ? 'branch_id' AND (p_patch->>'branch_id') IS NOT NULL THEN
            SELECT name INTO v_branch_name FROM public.branches WHERE id = (p_patch->>'branch_id');
            v_branch_name := COALESCE(v_branch_name, v_existing.branch_name);
        END IF;

        v_reporting_manager_name := COALESCE((p_patch->>'reporting_manager_name'), v_existing.employment->>'reporting_manager_name');

        -- 4. Apply Atomic PostgreSQL Update
        UPDATE public.employees
        SET
            first_name         = v_first_name,
            last_name          = v_last_name,
            display_name       = v_display_name,
            work_email         = COALESCE((p_patch->>'work_email'), v_existing.work_email),
            avatar_url         = CASE WHEN p_patch ? 'avatar_url' THEN (p_patch->>'avatar_url') ELSE v_existing.avatar_url END,
            status             = COALESCE((p_patch->>'status'), v_existing.status),
            employment_type    = COALESCE((p_patch->>'employment_type'), v_existing.employment_type),
            employment_source  = COALESCE((p_patch->>'employment_source'), v_existing.employment_source),
            department_id      = CASE WHEN p_patch ? 'department_id' THEN (p_patch->>'department_id') ELSE v_existing.department_id END,
            department_name    = v_dept_name,
            designation_id     = CASE WHEN p_patch ? 'designation_id' THEN (p_patch->>'designation_id') ELSE v_existing.designation_id END,
            designation_title  = v_desig_title,
            branch_id          = CASE WHEN p_patch ? 'branch_id' THEN (p_patch->>'branch_id') ELSE v_existing.branch_id END,
            branch_name        = v_branch_name,
            location_name      = COALESCE((p_patch->>'location_name'), (p_patch->>'work_location'), v_existing.location_name),
            profile            = CASE WHEN p_patch ? 'profile' 
                                    THEN v_existing.profile || (p_patch->'profile')
                                    ELSE v_existing.profile END,
            employment         = CASE WHEN p_patch ? 'employment' 
                                    THEN v_existing.employment || (p_patch->'employment')
                                    ELSE v_existing.employment END,
            record_version     = v_next_version,
            updated_at         = NOW(),
            updated_by         = COALESCE(p_actor_id, auth.uid()::text, 'admin')
        WHERE id = p_employee_id
        RETURNING * INTO v_updated;

        -- Also keep app_users synced if first/last name changed
        UPDATE public.app_users
        SET name = v_display_name,
            email = v_updated.work_email
        WHERE employee_id = p_employee_id;

        -- 5. Insert Transactional Realtime Outbox Event
        INSERT INTO public.realtime_outbox (
            id,
            tenant_id,
            organization_id,
            entity_type,
            entity_id,
            event_type,
            record_version,
            payload,
            actor_id,
            created_at
        ) VALUES (
            v_outbox_id,
            COALESCE(v_updated.organization_id, 'org-joy-01'),
            v_updated.organization_id,
            'employee',
            v_updated.id,
            'employee.updated',
            v_next_version,
            jsonb_build_object(
                'id', v_updated.id,
                'first_name', v_updated.first_name,
                'last_name', v_updated.last_name,
                'display_name', v_updated.display_name,
                'work_email', v_updated.work_email,
                'status', v_updated.status,
                'department_name', v_updated.department_name,
                'designation_title', v_updated.designation_title,
                'branch_name', v_updated.branch_name,
                'record_version', v_next_version,
                'updated_at', v_updated.updated_at
            ),
            COALESCE(p_actor_id, auth.uid()::text),
            NOW()
        );

        -- 6. Insert Audit Log
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_events') THEN
            INSERT INTO public.audit_events (
                id, tenant_id, entity_type, entity_id, action, actor_id, changes, created_at
            ) VALUES (
                v_audit_id,
                COALESCE(v_updated.organization_id, 'org-joy-01'),
                'employee',
                v_updated.id,
                'UPDATE',
                COALESCE(p_actor_id, auth.uid()::text, 'admin'),
                jsonb_build_object('patch', p_patch, 'version', v_next_version),
                NOW()
            );
        END IF;

        -- Return canonical updated row
        v_result := to_jsonb(v_updated);
        RETURN v_result;
    END;
    $$;

    -- Grant EXECUTE to all roles
    GRANT EXECUTE ON FUNCTION public.fn_mutate_employee(TEXT, JSONB, INTEGER, TEXT) TO anon, authenticated, service_role, public;

    -- 4. ENABLE REALTIME REPLICATION FOR FLUTTER & WEB SUBSCRIBERS
    DO $$
    BEGIN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_outbox;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
        END;
    END $$;
