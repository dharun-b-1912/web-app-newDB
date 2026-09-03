-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 027
-- Target Project: ysiajemrqakfngasehhi
-- Description: Secure Initial Organization Onboarding Bootstrap Procedure
-- ============================================================================

-- Function: fn_provision_initial_organization
-- Description: Allows a newly authenticated user with no existing organization profile
-- to atomically create their initial Organization, default SaaS subscription, initial Company,
-- system administrator Role with all permissions, and User Profile.
-- Security: SECURITY DEFINER with strict search_path and execution restricted to authenticated role.

CREATE OR REPLACE FUNCTION public.fn_provision_initial_organization(
    p_organization_name VARCHAR,
    p_organization_slug VARCHAR DEFAULT NULL,
    p_organization_code VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT 'IN',
    p_currency VARCHAR DEFAULT 'INR',
    p_timezone VARCHAR DEFAULT 'Asia/Kolkata',
    p_initial_company_name VARCHAR DEFAULT NULL,
    p_initial_company_code VARCHAR DEFAULT NULL,
    p_user_full_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_user_email VARCHAR;
    v_org_id UUID;
    v_company_id UUID;
    v_profile_id UUID;
    v_admin_role_id UUID;
    v_company_code VARCHAR;
    v_org_code VARCHAR;
    v_slug VARCHAR;
    v_full_name VARCHAR;
BEGIN
    -- 1. Identity Verification: Must have an active authenticated session
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: User must be signed in to provision an organization'
            USING ERRCODE = '28000'; -- invalid_authorization_specification
    END IF;

    -- 2. Anti-Duplicate Check: User must not already possess an active organization profile
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = v_user_id) THEN
        RAISE EXCEPTION 'User profile already exists: Initial organization bootstrap can only be executed once per user'
            USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- 3. Fetch authenticated user email from auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', p_user_full_name, split_part(email, '@', 1))
    INTO v_user_email, v_full_name
    FROM auth.users
    WHERE id = v_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Authenticated user record not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Clean parameters and sanitize slug/codes
    v_org_code := COALESCE(NULLIF(trim(p_organization_code), ''), 'ORG-' || upper(substring(replace(v_user_id::text, '-', ''), 1, 6)));
    v_slug := lower(regexp_replace(COALESCE(NULLIF(trim(p_organization_slug), ''), trim(p_organization_name)), '[^a-z0-9\-]+', '-', 'gi'));
    v_slug := trim(both '-' from v_slug);
    IF v_slug = '' THEN
        v_slug := 'org-' || lower(substring(replace(v_user_id::text, '-', ''), 1, 8));
    END IF;

    -- Check slug uniqueness
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || lower(substring(replace(v_user_id::text, '-', ''), 1, 4));
    END IF;

    -- 5. Insert Organization (Root Tenant)
    INSERT INTO public.organizations (
        legal_name,
        display_name,
        slug,
        organization_code,
        country,
        currency,
        timezone,
        status
    ) VALUES (
        p_organization_name,
        p_organization_name,
        v_slug,
        v_org_code,
        COALESCE(NULLIF(p_country, ''), 'IN'),
        COALESCE(NULLIF(p_currency, ''), 'INR'),
        COALESCE(NULLIF(p_timezone, ''), 'Asia/Kolkata'),
        'ACTIVE'
    )
    RETURNING id INTO v_org_id;

    -- 6. Insert Default Enterprise SaaS Subscription
    INSERT INTO public.saas_subscriptions (
        organization_id,
        plan_id,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        max_employees_allowed
    )
    SELECT
        v_org_id,
        id,
        'ACTIVE',
        'MONTHLY',
        now(),
        now() + interval '365 days',
        500
    FROM public.platform_plans
    ORDER BY created_at ASC
    LIMIT 1;

    -- 7. Insert Initial Company
    v_company_code := COALESCE(NULLIF(trim(p_initial_company_code), ''), 'COMP-A');
    INSERT INTO public.companies (
        organization_id,
        legal_name,
        trade_name,
        company_code,
        city,
        state,
        postal_code,
        country,
        is_headquarters,
        is_active
    ) VALUES (
        v_org_id,
        COALESCE(NULLIF(p_initial_company_name, ''), p_organization_name || ' (HQ)'),
        COALESCE(NULLIF(p_initial_company_name, ''), p_organization_name),
        v_company_code,
        'Coimbatore',
        'Tamil Nadu',
        '641001',
        COALESCE(NULLIF(p_country, ''), 'IN'),
        true,
        true
    )
    RETURNING id INTO v_company_id;

    -- 8. Create Default System Administrator Role for the new Organization
    INSERT INTO public.roles (
        organization_id,
        name,
        code,
        description,
        hierarchy_level,
        is_system_role
    ) VALUES (
        v_org_id,
        'Organization Administrator',
        'ORG_ADMIN',
        'Full administrative control over the organization',
        1,
        true
    )
    RETURNING id INTO v_admin_role_id;

    -- Assign all permissions to the admin role
    INSERT INTO public.role_permissions (
        organization_id,
        role_id,
        permission_id,
        scope_level
    )
    SELECT
        v_org_id,
        v_admin_role_id,
        id,
        'COMPANY'
    FROM public.permissions;

    -- 9. Create User Profile for the Authenticated Creator
    INSERT INTO public.user_profiles (
        auth_user_id,
        organization_id,
        email,
        full_name,
        status
    ) VALUES (
        v_user_id,
        v_org_id,
        v_user_email,
        COALESCE(v_full_name, 'Organization Admin'),
        'ACTIVE'
    )
    RETURNING id INTO v_profile_id;

    -- 10. Assign Admin Role to User Profile
    INSERT INTO public.user_roles (
        organization_id,
        user_profile_id,
        role_id
    ) VALUES (
        v_org_id,
        v_profile_id,
        v_admin_role_id
    );

    -- 11. Return JSONB payload with generated identifiers
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', v_org_id,
        'organization_name', p_organization_name,
        'organization_slug', v_slug,
        'organization_code', v_org_code,
        'company_id', v_company_id,
        'company_code', v_company_code,
        'user_profile_id', v_profile_id,
        'role_id', v_admin_role_id
    );
END;
$$;

-- Security & Permissions
REVOKE ALL ON FUNCTION public.fn_provision_initial_organization FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_provision_initial_organization TO authenticated;
