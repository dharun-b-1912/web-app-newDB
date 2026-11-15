-- ============================================================================
-- Migration: 20261115_187_phase_c_seat_limits_and_entitlements.sql
-- Joy PeopleHR — Phase C: Authoritative Plan, Subscription & Central Entitlement Engine
-- 1. Server-side Seat Limit Enforcement Trigger on public.employees.
-- 2. check_tenant_seat_capacity() RPC for real-time seat checks.
-- 3. upgrade_tenant_subscription_plan() RPC with audit logging.
-- ============================================================================

-- ============================================================================
-- 1. SEAT CAPACITY CHECK RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_tenant_seat_capacity(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_seat_limit INT;
    v_active_count INT;
    v_plan TEXT;
BEGIN
    SELECT COALESCE(seat_limit, 25), COALESCE(plan, 'Starter')
    INTO v_seat_limit, v_plan
    FROM public.organizations
    WHERE id = p_organization_id::text OR id::text = p_organization_id::text
    LIMIT 1;

    IF v_seat_limit IS NULL THEN
        v_seat_limit := 25;
    END IF;

    SELECT COUNT(*) INTO v_active_count
    FROM public.employees
    WHERE (organization_id = p_organization_id::text OR organization_id::text = p_organization_id::text)
      AND employment_status = 'ACTIVE';

    RETURN jsonb_build_object(
        'organization_id', p_organization_id,
        'plan', v_plan,
        'seat_limit', v_seat_limit,
        'active_employees', v_active_count,
        'available_seats', GREATEST(0, v_seat_limit - v_active_count),
        'is_limit_reached', (v_active_count >= v_seat_limit),
        'utilization_pct', CASE WHEN v_seat_limit > 0 THEN ROUND((v_active_count::numeric / v_seat_limit::numeric) * 100, 1) ELSE 100 END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_tenant_seat_capacity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_tenant_seat_capacity(UUID) TO authenticated, service_role;

-- ============================================================================
-- 2. SERVER-SIDE SEAT LIMIT ENFORCEMENT FUNCTION & TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_employee_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_seat_limit INT;
    v_active_count INT;
    v_org_id TEXT;
BEGIN
    -- Only enforce when adding or activating an employee
    IF (TG_OP = 'INSERT' AND NEW.employment_status = 'ACTIVE') OR
       (TG_OP = 'UPDATE' AND NEW.employment_status = 'ACTIVE' AND OLD.employment_status <> 'ACTIVE') THEN

        v_org_id := NEW.organization_id;
        IF v_org_id IS NULL OR v_org_id = 'platform-root' THEN
            RETURN NEW;
        END IF;

        -- Platform Admins can bypass for maintenance
        IF public.is_platform_admin() THEN
            RETURN NEW;
        END IF;

        -- Fetch organization's configured seat limit
        SELECT COALESCE(seat_limit, 0) INTO v_seat_limit
        FROM public.organizations
        WHERE id = v_org_id OR id::text = v_org_id
        LIMIT 1;

        -- If seat_limit is set (> 0), verify capacity
        IF v_seat_limit > 0 THEN
            SELECT COUNT(*) INTO v_active_count
            FROM public.employees
            WHERE (organization_id = v_org_id OR organization_id::text = v_org_id)
              AND employment_status = 'ACTIVE'
              AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

            IF v_active_count >= v_seat_limit THEN
                RAISE EXCEPTION 'Seat limit reached for this organization (%/% active seats allocated). Please upgrade your subscription plan to add more employees.', v_active_count, v_seat_limit;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_employee_seat_limit ON public.employees;
CREATE TRIGGER trg_enforce_employee_seat_limit
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.enforce_employee_seat_limit();

-- ============================================================================
-- 3. UPGRADE TENANT SUBSCRIPTION PLAN RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upgrade_tenant_subscription_plan(
    p_organization_id UUID,
    p_plan TEXT,
    p_seats INT,
    p_mrr NUMERIC,
    p_billing_cycle TEXT DEFAULT 'MONTHLY',
    p_reason TEXT DEFAULT 'Commercial plan upgrade by Super Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_prev_plan TEXT;
    v_prev_seats INT;
    v_actor_email TEXT := COALESCE(auth.jwt() ->> 'email', 'platform-admin@joypeoplehr.com');
    v_actor_id TEXT := COALESCE(auth.uid()::text, 'platform-super-admin');
BEGIN
    -- Security Gate: Only Platform Super Admins can alter subscription commercial terms
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only verified Platform Super Admins can modify tenant subscription plans and seat allocations';
    END IF;

    -- Fetch current plan details
    SELECT plan, seat_limit INTO v_prev_plan, v_prev_seats
    FROM public.organizations
    WHERE id = p_organization_id::text OR id::text = p_organization_id::text
    LIMIT 1;

    IF v_prev_plan IS NULL THEN
        RAISE EXCEPTION 'Organization with ID % not found', p_organization_id;
    END IF;

    -- Update Organization table
    UPDATE public.organizations
    SET
        plan = p_plan,
        seat_limit = p_seats,
        mrr = p_mrr,
        billing_cycle = p_billing_cycle,
        updated_at = now()
    WHERE id = p_organization_id::text OR id::text = p_organization_id::text;

    -- Log to Platform Audit Events
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
            'SUBSCRIPTION_PLAN_UPGRADE',
            'ORGANIZATION_SUBSCRIPTION',
            p_organization_id::text,
            jsonb_build_object(
                'previous_plan', v_prev_plan,
                'new_plan', p_plan,
                'previous_seats', v_prev_seats,
                'new_seats', p_seats,
                'new_mrr', p_mrr,
                'billing_cycle', p_billing_cycle,
                'reason', p_reason
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking for audit log failures
    END;

    RETURN jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id,
        'previous_plan', v_prev_plan,
        'new_plan', p_plan,
        'seat_limit', p_seats,
        'mrr', p_mrr,
        'billing_cycle', p_billing_cycle,
        'updated_at', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.upgrade_tenant_subscription_plan(UUID, TEXT, INT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upgrade_tenant_subscription_plan(UUID, TEXT, INT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;

