-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 022
-- Target Project: ysiajemrqakfngasehhi
-- Description: Core Stored Procedures, Business Logic & Security Definer Helpers
-- ============================================================================

-- 1. Get Active User Organization UUID (Session / JWT Cached)
CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_org_id', true), '')::UUID,
    (NULLIF(auth.jwt() ->> 'organization_id', ''))::UUID,
    (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- 2. Get Active User Employee UUID
CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 3. Check if Active Session is a Platform Administrator
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'is_platform_admin')::BOOLEAN,
    EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND is_active = true)
  );
$$;

-- 4. Atomic Leave Request Approval
CREATE OR REPLACE FUNCTION public.fn_approve_leave_request(
    p_request_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_bal RECORD;
    v_new_closing NUMERIC(6, 2);
    v_current_year INTEGER;
BEGIN
    -- Fetch request
    SELECT * INTO v_req FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_req.status != 'PENDING' THEN
        RAISE EXCEPTION 'Leave request is not in PENDING state';
    END IF;

    v_current_year := EXTRACT(YEAR FROM v_req.start_date);

    -- Fetch current balance
    SELECT * INTO v_bal FROM public.leave_balances 
    WHERE employee_id = v_req.employee_id 
      AND leave_type_id = v_req.leave_type_id 
      AND calendar_year = v_current_year
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave balance record not found for employee and year';
    END IF;

    IF v_bal.closing_balance < v_req.total_days THEN
        RAISE EXCEPTION 'Insufficient leave balance. Available: %, Requested: %', v_bal.closing_balance, v_req.total_days;
    END IF;

    v_new_closing := v_bal.closing_balance - v_req.total_days;

    -- 1. Update request status
    UPDATE public.leave_requests 
    SET status = 'APPROVED', approved_by = p_actor_id, approved_at = now(), updated_at = now()
    WHERE id = p_request_id;

    -- 2. Update balance
    UPDATE public.leave_balances 
    SET consumed = consumed + v_req.total_days, closing_balance = v_new_closing, updated_at = now()
    WHERE id = v_bal.id;

    -- 3. Insert into ledger
    INSERT INTO public.leave_ledger_entries (
        organization_id, employee_id, leave_type_id, leave_request_id,
        entry_type, units, running_balance_after, transaction_date, remarks
    ) VALUES (
        v_req.organization_id, v_req.employee_id, v_req.leave_type_id, p_request_id,
        'CONSUMPTION', -v_req.total_days, v_new_closing, CURRENT_DATE, 'Approved leave request'
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', p_request_id,
        'new_balance', v_new_closing
    );
END;
$$;

-- 5. Reject Leave Request
CREATE OR REPLACE FUNCTION public.fn_reject_leave_request(
    p_request_id UUID,
    p_actor_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.leave_requests 
    SET status = 'REJECTED', approved_by = p_actor_id, approved_at = now(), reason = COALESCE(reason, '') || ' [Rejection note: ' || COALESCE(p_reason, '') || ']', updated_at = now()
    WHERE id = p_request_id AND status = 'PENDING';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request not found or not in PENDING state';
    END IF;

    RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$$;

-- 6. Provision Employee Auth User
CREATE OR REPLACE FUNCTION public.fn_provision_employee_auth(
    p_employee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_emp RECORD;
    v_user_profile_id UUID;
    v_emp_role_id UUID;
BEGIN
    SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;

    -- Check if user profile already exists
    SELECT id INTO v_user_profile_id FROM public.user_profiles WHERE employee_id = p_employee_id;
    IF v_user_profile_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'user_profile_id', v_user_profile_id, 'message', 'Profile already exists');
    END IF;

    -- Fetch default Employee role
    SELECT id INTO v_emp_role_id FROM public.roles 
    WHERE organization_id = v_emp.organization_id AND code = 'EMPLOYEE' LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'employee_id', p_employee_id,
        'email', v_emp.work_email,
        'organization_id', v_emp.organization_id,
        'role_id', v_emp_role_id
    );
END;
$$;
