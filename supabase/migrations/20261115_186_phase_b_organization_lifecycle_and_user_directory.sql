-- ============================================================================
-- Migration: 20261115_186_phase_b_organization_lifecycle_and_user_directory.sql
-- Joy PeopleHR — Phase B: Global User Management & Organization Lifecycle
-- 1. Create organization_lifecycle_history table for immutable state audit.
-- 2. Create transition_organization_lifecycle() RPC with strict platform admin guard.
-- 3. Create get_platform_user_directory() RPC for cross-tenant user oversight.
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATION LIFECYCLE HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_email TEXT,
    actor_ip TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_lifecycle_history_org 
    ON public.organization_lifecycle_history(organization_id, created_at DESC);

ALTER TABLE public.organization_lifecycle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_lifecycle_history_isolation" ON public.organization_lifecycle_history
FOR ALL TO authenticated
USING (
    public.is_platform_admin() = true
    OR organization_id IN (SELECT public.get_auth_user_org_ids())
    OR organization_id = (SELECT public.get_current_user_org_id())
    OR organization_id::text = public.current_org_id()
)
WITH CHECK (
    public.is_platform_admin() = true
);

-- ============================================================================
-- 2. TRANSITION ORGANIZATION LIFECYCLE RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.transition_organization_lifecycle(
    p_organization_id UUID,
    p_new_status TEXT,
    p_reason TEXT,
    p_actor_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_prev_status TEXT;
    v_actor_email TEXT := COALESCE(auth.jwt() ->> 'email', 'platform-admin@joypeoplehr.com');
    v_actor_id TEXT := COALESCE(p_actor_id, auth.uid()::text, 'platform-super-admin');
    v_valid_statuses TEXT[] := ARRAY['Trial', 'Active', 'Suspended', 'Locked', 'Archived', 'Cancelled', 'Grace Period', 'Payment Pending'];
    v_history_id UUID;
BEGIN
    -- Security Gate: Only verified Platform Super Admins can transition organization lifecycle
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only verified Platform Super Admins can alter organization lifecycle state';
    END IF;

    -- Validate target status
    IF NOT (p_new_status = ANY(v_valid_statuses)) THEN
        RAISE EXCEPTION 'Invalid status transition: % is not a recognized organization lifecycle state', p_new_status;
    END IF;

    -- Fetch current organization status
    SELECT status INTO v_prev_status
    FROM public.organizations
    WHERE id = p_organization_id::text OR id::text = p_organization_id::text
    LIMIT 1;

    IF v_prev_status IS NULL THEN
        RAISE EXCEPTION 'Organization with ID % not found', p_organization_id;
    END IF;

    IF v_prev_status = p_new_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Organization is already in ' || p_new_status || ' state',
            'organization_id', p_organization_id,
            'status', p_new_status
        );
    END IF;

    -- 1. Update Organization Table
    UPDATE public.organizations
    SET 
        status = p_new_status,
        updated_at = now()
    WHERE id = p_organization_id::text OR id::text = p_organization_id::text;

    -- 2. Insert into Immutable Lifecycle History
    INSERT INTO public.organization_lifecycle_history (
        organization_id,
        previous_status,
        new_status,
        reason,
        actor_id,
        actor_email,
        metadata
    ) VALUES (
        p_organization_id,
        v_prev_status,
        p_new_status,
        p_reason,
        v_actor_id,
        v_actor_email,
        jsonb_build_object('timestamp', now(), 'source', 'SUPER_ADMIN_CONTROL_PLANE')
    ) RETURNING id INTO v_history_id;

    -- 3. Log to Platform Audit Events
    BEGIN
        INSERT INTO public.platform_audit_events (
            tenant_id,
            actor_id,
            actor_email,
            action,
            resource_type,
            resource_id,
            details
        ) VALUES (
            p_organization_id::text,
            v_actor_id,
            v_actor_email,
            'ORGANIZATION_LIFECYCLE_TRANSITION',
            'ORGANIZATION',
            p_organization_id::text,
            jsonb_build_object(
                'previous_status', v_prev_status,
                'new_status', p_new_status,
                'reason', p_reason,
                'lifecycle_history_id', v_history_id
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking for audit log failures
    END;

    RETURN jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id,
        'previous_status', v_prev_status,
        'new_status', p_new_status,
        'reason', p_reason,
        'history_id', v_history_id,
        'transitioned_at', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_organization_lifecycle(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_organization_lifecycle(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ============================================================================
-- 3. GET PLATFORM USER DIRECTORY RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_platform_user_directory(
    p_search TEXT DEFAULT NULL,
    p_org_id TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_total INT;
    v_users JSONB;
BEGIN
    -- Security Gate: Only verified Platform Super Admins can query the platform-wide user directory
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only Platform Super Admins can access the cross-tenant user directory';
    END IF;

    -- Query from user_profiles combined with organization_memberships and organizations
    WITH filtered_users AS (
        SELECT 
            up.id AS user_id,
            up.auth_user_id,
            up.email,
            COALESCE(up.full_name, e.display_name, up.email) AS full_name,
            up.phone,
            up.avatar_url,
            COALESCE(up.status, 'ACTIVE') AS status,
            up.created_at,
            up.updated_at,
            o.id AS organization_id,
            COALESCE(o.display_name, o.legal_name, o.name, 'Enterprise Workplace') AS organization_name,
            COALESCE(om.role_code, up.role, 'EMPLOYEE') AS role_code,
            COALESCE(om.status, 'Active') AS membership_status,
            e.employee_code
        FROM public.user_profiles up
        LEFT JOIN public.organizations o ON (o.id = up.organization_id::text OR o.id::text = up.organization_id::text)
        LEFT JOIN public.organization_memberships om ON (om.user_id = up.id OR om.user_id = up.auth_user_id)
        LEFT JOIN public.employees e ON (e.id = up.employee_id OR e.user_id = up.auth_user_id::text OR e.work_email ILIKE up.email)
        WHERE 
            (p_search IS NULL OR p_search = '' OR 
             up.email ILIKE '%' || p_search || '%' OR 
             up.full_name ILIKE '%' || p_search || '%' OR
             e.employee_code ILIKE '%' || p_search || '%')
            AND (p_org_id IS NULL OR p_org_id = '' OR p_org_id = 'all' OR up.organization_id::text = p_org_id OR o.id = p_org_id)
            AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR om.role_code ILIKE p_role OR up.role ILIKE p_role)
            AND (p_status IS NULL OR p_status = '' OR p_status = 'all' OR up.status ILIKE p_status)
    ),
    counted AS (
        SELECT COUNT(*) AS total_count FROM filtered_users
    )
    SELECT 
        (SELECT total_count FROM counted),
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', fu.user_id,
                    'auth_user_id', fu.auth_user_id,
                    'email', fu.email,
                    'full_name', fu.full_name,
                    'phone', fu.phone,
                    'avatar_url', fu.avatar_url,
                    'status', fu.status,
                    'created_at', fu.created_at,
                    'organization_id', fu.organization_id,
                    'organization_name', fu.organization_name,
                    'role_code', fu.role_code,
                    'membership_status', fu.membership_status,
                    'employee_code', fu.employee_code
                )
            ),
            '[]'::jsonb
        )
    INTO v_total, v_users
    FROM (
        SELECT * FROM filtered_users
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) fu;

    RETURN jsonb_build_object(
        'total', COALESCE(v_total, 0),
        'limit', p_limit,
        'offset', p_offset,
        'users', COALESCE(v_users, '[]'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_user_directory(TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_user_directory(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated, service_role;

-- ============================================================================
-- 4. MULTI-TENANT LOCATION & ADDRESS ATTRIBUTES SAFETY
-- ============================================================================
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registered_address TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);

