-- ============================================================================
-- WorkforceOS Enterprise HRMS — Leave Management Suite v3.0
-- Migration: 20260824_043_enterprise_leave_crud_and_rpc_functions.sql
-- Description: Comprehensive Stored Functions, Atomic CRUD & RPC Procedures
-- ============================================================================

-- 1. FUNCTION: Upsert Leave Type
CREATE OR REPLACE FUNCTION public.fn_upsert_leave_type(
    p_organization_id TEXT,
    p_company_id TEXT,
    p_id TEXT,
    p_code VARCHAR(20),
    p_name VARCHAR(100),
    p_description TEXT,
    p_category VARCHAR(30),
    p_is_paid BOOLEAN,
    p_is_active BOOLEAN,
    p_gender_applicability VARCHAR(20),
    p_employment_types JSONB,
    p_min_service_days INTEGER,
    p_max_days_per_request NUMERIC(5,1),
    p_min_days_per_request NUMERIC(5,1),
    p_allow_half_day BOOLEAN,
    p_allow_hourly BOOLEAN,
    p_allow_negative_balance BOOLEAN,
    p_max_negative_balance NUMERIC(5,1),
    p_allow_carry_forward BOOLEAN,
    p_max_carry_forward_days NUMERIC(5,1),
    p_carry_forward_expiry_months INTEGER,
    p_allow_encashment BOOLEAN,
    p_max_encashment_days_per_year NUMERIC(5,1),
    p_min_balance_for_encashment NUMERIC(5,1),
    p_encashment_calculation_basis VARCHAR(30),
    p_attachment_required BOOLEAN,
    p_attachment_mandatory_days_threshold NUMERIC(5,1),
    p_approval_required BOOLEAN,
    p_approval_levels INTEGER,
    p_allow_backdated BOOLEAN,
    p_max_backdated_days INTEGER,
    p_allow_future BOOLEAN,
    p_max_future_days INTEGER,
    p_allow_cancellation BOOLEAN,
    p_allow_modification BOOLEAN,
    p_converts_to_lop_if_exhausted BOOLEAN,
    p_applicable_locations JSONB,
    p_applicable_departments JSONB,
    p_applicable_employee_groups JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_id TEXT := COALESCE(NULLIF(p_id, ''), 'lt-' || gen_random_uuid()::text);
    v_record RECORD;
BEGIN
    INSERT INTO public.leave_types (
        id, organization_id, company_id, code, name, description, category,
        is_paid, is_active, gender_applicability, employment_types,
        min_service_days, max_days_per_request, min_days_per_request,
        allow_half_day, allow_hourly, allow_negative_balance, max_negative_balance,
        allow_carry_forward, max_carry_forward_days, carry_forward_expiry_months,
        allow_encashment, max_encashment_days_per_year, min_balance_for_encashment,
        encashment_calculation_basis, attachment_required, attachment_mandatory_days_threshold,
        approval_required, approval_levels, allow_backdated, max_backdated_days,
        allow_future, max_future_days, allow_cancellation, allow_modification,
        converts_to_lop_if_exhausted, applicable_locations, applicable_departments,
        applicable_employee_groups, created_at, updated_at
    ) VALUES (
        v_target_id, p_organization_id, p_company_id, p_code, p_name, p_description, p_category,
        p_is_paid, p_is_active, p_gender_applicability, p_employment_types,
        p_min_service_days, p_max_days_per_request, p_min_days_per_request,
        p_allow_half_day, p_allow_hourly, p_allow_negative_balance, p_max_negative_balance,
        p_allow_carry_forward, p_max_carry_forward_days, p_carry_forward_expiry_months,
        p_allow_encashment, p_max_encashment_days_per_year, p_min_balance_for_encashment,
        p_encashment_calculation_basis, p_attachment_required, p_attachment_mandatory_days_threshold,
        p_approval_required, p_approval_levels, p_allow_backdated, p_max_backdated_days,
        p_allow_future, p_max_future_days, p_allow_cancellation, p_allow_modification,
        p_converts_to_lop_if_exhausted, p_applicable_locations, p_applicable_departments,
        p_applicable_employee_groups, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        is_paid = EXCLUDED.is_paid,
        is_active = EXCLUDED.is_active,
        gender_applicability = EXCLUDED.gender_applicability,
        employment_types = EXCLUDED.employment_types,
        min_service_days = EXCLUDED.min_service_days,
        max_days_per_request = EXCLUDED.max_days_per_request,
        min_days_per_request = EXCLUDED.min_days_per_request,
        allow_half_day = EXCLUDED.allow_half_day,
        allow_hourly = EXCLUDED.allow_hourly,
        allow_negative_balance = EXCLUDED.allow_negative_balance,
        max_negative_balance = EXCLUDED.max_negative_balance,
        allow_carry_forward = EXCLUDED.allow_carry_forward,
        max_carry_forward_days = EXCLUDED.max_carry_forward_days,
        carry_forward_expiry_months = EXCLUDED.carry_forward_expiry_months,
        allow_encashment = EXCLUDED.allow_encashment,
        max_encashment_days_per_year = EXCLUDED.max_encashment_days_per_year,
        min_balance_for_encashment = EXCLUDED.min_balance_for_encashment,
        encashment_calculation_basis = EXCLUDED.encashment_calculation_basis,
        attachment_required = EXCLUDED.attachment_required,
        attachment_mandatory_days_threshold = EXCLUDED.attachment_mandatory_days_threshold,
        approval_required = EXCLUDED.approval_required,
        approval_levels = EXCLUDED.approval_levels,
        allow_backdated = EXCLUDED.allow_backdated,
        max_backdated_days = EXCLUDED.max_backdated_days,
        allow_future = EXCLUDED.allow_future,
        max_future_days = EXCLUDED.max_future_days,
        allow_cancellation = EXCLUDED.allow_cancellation,
        allow_modification = EXCLUDED.allow_modification,
        converts_to_lop_if_exhausted = EXCLUDED.converts_to_lop_if_exhausted,
        applicable_locations = EXCLUDED.applicable_locations,
        applicable_departments = EXCLUDED.applicable_departments,
        applicable_employee_groups = EXCLUDED.applicable_employee_groups,
        updated_at = NOW()
    RETURNING * INTO v_record;

    RETURN to_jsonb(v_record);
END;
$$;


-- 2. FUNCTION: Submit Leave Request (Transactional Validation & Pending Balance Update)
CREATE OR REPLACE FUNCTION public.fn_submit_leave_request(
    p_organization_id TEXT,
    p_company_id TEXT,
    p_employee_id TEXT,
    p_employee_name VARCHAR(150),
    p_department_name VARCHAR(100),
    p_avatar_url TEXT,
    p_leave_type_id TEXT,
    p_leave_type_name VARCHAR(100),
    p_leave_type_code VARCHAR(20),
    p_leave_category VARCHAR(30),
    p_from_date DATE,
    p_to_date DATE,
    p_total_calendar_days NUMERIC(5,1),
    p_working_days NUMERIC(5,1),
    p_holiday_days NUMERIC(5,1),
    p_weekly_off_days NUMERIC(5,1),
    p_leave_days_deducted NUMERIC(5,1),
    p_is_half_day BOOLEAN,
    p_half_day_session VARCHAR(20),
    p_is_hourly BOOLEAN,
    p_hourly_duration_minutes INTEGER,
    p_reason TEXT,
    p_comments TEXT,
    p_attachment_url TEXT,
    p_contact_number VARCHAR(30),
    p_alternate_contact VARCHAR(30),
    p_manager_id TEXT,
    p_manager_name VARCHAR(150),
    p_is_lop BOOLEAN,
    p_daily_breakdown JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req_id TEXT := 'req-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_req_code VARCHAR(30) := 'LR-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    v_period VARCHAR(20) := TO_CHAR(p_from_date, 'YYYY');
    v_ent RECORD;
    v_req_record RECORD;
BEGIN
    -- Check overlapping approved or pending requests
    IF EXISTS (
        SELECT 1 FROM public.leave_requests
        WHERE employee_id = p_employee_id
          AND status IN ('Submitted', 'Pending', 'Approved')
          AND from_date <= p_to_date
          AND to_date >= p_from_date
    ) THEN
        RAISE EXCEPTION 'An overlapping leave request already exists for this date range.';
    END IF;

    -- Update or verify entitlement pending balance if not LOP
    IF NOT p_is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = p_employee_id
          AND leave_type_id = p_leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.leave_entitlements
            SET pending = pending + p_leave_days_deducted,
                available_balance = GREATEST(0.0, available_balance - p_leave_days_deducted),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;
    END IF;

    -- Insert Leave Request
    INSERT INTO public.leave_requests (
        id, organization_id, company_id, request_code, employee_id, employee_name,
        department_name, avatar_url, leave_type_id, leave_type_name, leave_type_code,
        leave_category, from_date, to_date, total_calendar_days, working_days,
        holiday_days, weekly_off_days, leave_days_deducted, is_half_day, half_day_session,
        is_hourly, hourly_duration_minutes, reason, comments, attachment_url,
        contact_number, alternate_contact, manager_id, manager_name, current_approver_name,
        status, is_lop, daily_breakdown, submitted_at, created_at
    ) VALUES (
        v_req_id, p_organization_id, p_company_id, v_req_code, p_employee_id, p_employee_name,
        p_department_name, p_avatar_url, p_leave_type_id, p_leave_type_name, p_leave_type_code,
        p_leave_category, p_from_date, p_to_date, p_total_calendar_days, p_working_days,
        p_holiday_days, p_weekly_off_days, p_leave_days_deducted, p_is_half_day, p_half_day_session,
        p_is_hourly, p_hourly_duration_minutes, p_reason, p_comments, p_attachment_url,
        p_contact_number, p_alternate_contact, p_manager_id, p_manager_name, p_manager_name,
        'Pending', p_is_lop, p_daily_breakdown, NOW(), NOW()
    )
    RETURNING * INTO v_req_record;

    -- Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_employee_id, p_employee_name,
        'LEAVE_REQUEST_SUBMITTED', 'LeaveRequest', v_req_id, NULL, to_jsonb(v_req_record)::TEXT
    );

    RETURN to_jsonb(v_req_record);
END;
$$;


-- 3. FUNCTION: Approve Leave Request (Atomically Updates Status, Ledger & Entitlement)
CREATE OR REPLACE FUNCTION public.fn_approve_leave_request(
    p_request_id TEXT,
    p_approver_id TEXT,
    p_approver_name VARCHAR(150),
    p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_period VARCHAR(20);
    v_ent RECORD;
    v_new_closing NUMERIC(6,2);
    v_new_available NUMERIC(6,2);
    v_ledger_id TEXT := 'tx-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
BEGIN
    SELECT * INTO v_req FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found', p_request_id;
    END IF;

    IF v_req.status = 'Approved' THEN
        RETURN to_jsonb(v_req);
    END IF;

    v_period := TO_CHAR(v_req.from_date, 'YYYY');

    -- Update Entitlement & Create Ledger Transaction if not LOP
    IF NOT v_req.is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            v_new_closing := GREATEST(0.0, v_ent.closing_balance - v_req.leave_days_deducted);
            v_new_available := GREATEST(0.0, (v_ent.closing_balance - v_req.leave_days_deducted) - GREATEST(0.0, v_ent.pending - v_req.leave_days_deducted));

            UPDATE public.leave_entitlements
            SET used = used + v_req.leave_days_deducted,
                pending = GREATEST(0.0, pending - v_req.leave_days_deducted),
                closing_balance = v_new_closing,
                available_balance = v_new_available,
                updated_at = NOW()
            WHERE id = v_ent.id;

            -- Record Immutable Ledger Entry
            INSERT INTO public.leave_ledger_transactions (
                id, organization_id, company_id, employee_id, employee_name,
                leave_type_id, leave_type_name, date, transaction_type,
                amount, balance_after, reference_id, actor_id, actor_name, reason, created_at
            ) VALUES (
                v_ledger_id, v_req.organization_id, v_req.company_id, v_req.employee_id, v_req.employee_name,
                v_req.leave_type_id, v_req.leave_type_name, v_req.from_date, 'Consumption',
                v_req.leave_days_deducted, v_new_closing, v_req.id, p_approver_id, p_approver_name,
                COALESCE(p_comments, 'Approved leave request ' || v_req.request_code), NOW()
            );
        END IF;
    END IF;

    -- Update Request Status
    UPDATE public.leave_requests
    SET status = 'Approved',
        approved_at = NOW(),
        current_approver_name = p_approver_name,
        comments = COALESCE(p_comments, comments)
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    -- Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_approver_id, p_approver_name,
        'LEAVE_REQUEST_APPROVED', 'LeaveRequest', p_request_id, 'Pending', 'Approved'
    );

    RETURN to_jsonb(v_req);
END;
$$;


-- 4. FUNCTION: Reject Leave Request (Releases Pending Days)
CREATE OR REPLACE FUNCTION public.fn_reject_leave_request(
    p_request_id TEXT,
    p_rejector_id TEXT,
    p_rejector_name VARCHAR(150),
    p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_period VARCHAR(20);
    v_ent RECORD;
BEGIN
    SELECT * INTO v_req FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found', p_request_id;
    END IF;

    v_period := TO_CHAR(v_req.from_date, 'YYYY');

    -- Release Pending Balance if was in Submitted/Pending state
    IF v_req.status IN ('Submitted', 'Pending') AND NOT v_req.is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.leave_entitlements
            SET pending = GREATEST(0.0, pending - v_req.leave_days_deducted),
                available_balance = GREATEST(0.0, available_balance + v_req.leave_days_deducted),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;
    END IF;

    -- Update Request
    UPDATE public.leave_requests
    SET status = 'Rejected',
        rejection_reason = p_rejection_reason,
        current_approver_name = p_rejector_name
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    -- Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_rejector_id, p_rejector_name,
        'LEAVE_REQUEST_REJECTED', 'LeaveRequest', p_request_id, 'Pending', p_rejection_reason
    );

    RETURN to_jsonb(v_req);
END;
$$;


-- 5. FUNCTION: Cancel Leave Request (Reversal & Balance Restoration)
CREATE OR REPLACE FUNCTION public.fn_cancel_leave_request(
    p_request_id TEXT,
    p_actor_id TEXT,
    p_actor_name VARCHAR(150),
    p_cancellation_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_period VARCHAR(20);
    v_ent RECORD;
    v_new_closing NUMERIC(6,2);
    v_ledger_id TEXT := 'tx-rev-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
BEGIN
    SELECT * INTO v_req FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found', p_request_id;
    END IF;

    v_period := TO_CHAR(v_req.from_date, 'YYYY');

    IF v_req.status = 'Approved' AND NOT v_req.is_lop THEN
        -- Reverse consumed leave in entitlements
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            v_new_closing := v_ent.closing_balance + v_req.leave_days_deducted;

            UPDATE public.leave_entitlements
            SET used = GREATEST(0.0, used - v_req.leave_days_deducted),
                closing_balance = v_new_closing,
                available_balance = v_ent.available_balance + v_req.leave_days_deducted,
                updated_at = NOW()
            WHERE id = v_ent.id;

            -- Record Reversal Ledger Transaction
            INSERT INTO public.leave_ledger_transactions (
                id, organization_id, company_id, employee_id, employee_name,
                leave_type_id, leave_type_name, date, transaction_type,
                amount, balance_after, reference_id, actor_id, actor_name, reason, created_at
            ) VALUES (
                v_ledger_id, v_req.organization_id, v_req.company_id, v_req.employee_id, v_req.employee_name,
                v_req.leave_type_id, v_req.leave_type_name, CURRENT_DATE, 'Reversal',
                v_req.leave_days_deducted, v_new_closing, v_req.id, p_actor_id, p_actor_name,
                'Cancellation Reversal: ' || p_cancellation_reason, NOW()
            );
        END IF;
    ELSIF v_req.status IN ('Submitted', 'Pending') AND NOT v_req.is_lop THEN
        -- Release pending reservation
        UPDATE public.leave_entitlements
        SET pending = GREATEST(0.0, pending - v_req.leave_days_deducted),
            available_balance = available_balance + v_req.leave_days_deducted,
            updated_at = NOW()
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period;
    END IF;

    -- Update Request Status
    UPDATE public.leave_requests
    SET status = 'Cancelled',
        cancellation_reason = p_cancellation_reason
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    -- Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_actor_id, p_actor_name,
        'LEAVE_REQUEST_CANCELLED', 'LeaveRequest', p_request_id, v_req.status, p_cancellation_reason
    );

    RETURN to_jsonb(v_req);
END;
$$;


-- 6. FUNCTION: Create Leave Adjustment (Manual HR Credit/Debit with Ledger Audit)
CREATE OR REPLACE FUNCTION public.fn_create_leave_adjustment(
    p_organization_id TEXT,
    p_company_id TEXT,
    p_employee_id TEXT,
    p_employee_name VARCHAR(150),
    p_leave_type_id TEXT,
    p_leave_type_name VARCHAR(100),
    p_adjustment_type VARCHAR(30),
    p_amount NUMERIC(6,2),
    p_reason TEXT,
    p_reference_no VARCHAR(50),
    p_effective_date DATE,
    p_actor_name VARCHAR(150),
    p_supporting_doc_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_adj_id TEXT := 'adj-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_ledger_id TEXT := 'tx-adj-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_period VARCHAR(20) := TO_CHAR(p_effective_date, 'YYYY');
    v_ent RECORD;
    v_new_closing NUMERIC(6,2);
    v_adj_record RECORD;
BEGIN
    -- 1. Insert Adjustment Record
    INSERT INTO public.leave_adjustments (
        id, organization_id, company_id, employee_id, employee_name,
        leave_type_id, leave_type_name, adjustment_type, amount,
        reason, reference_no, effective_date, created_by_name,
        actor_name, supporting_doc_url, status, created_at
    ) VALUES (
        v_adj_id, p_organization_id, p_company_id, p_employee_id, p_employee_name,
        p_leave_type_id, p_leave_type_name, p_adjustment_type, p_amount,
        p_reason, p_reference_no, p_effective_date, p_actor_name,
        p_actor_name, p_supporting_doc_url, 'Approved', NOW()
    )
    RETURNING * INTO v_adj_record;

    -- 2. Update Entitlements
    SELECT * INTO v_ent FROM public.leave_entitlements
    WHERE employee_id = p_employee_id
      AND leave_type_id = p_leave_type_id
      AND period = v_period
    FOR UPDATE;

    IF FOUND THEN
        IF p_adjustment_type IN ('Add', 'Grant', 'CarryForwardGrant') THEN
            v_new_closing := v_ent.closing_balance + p_amount;
            UPDATE public.leave_entitlements
            SET adjustments = adjustments + p_amount,
                closing_balance = v_new_closing,
                available_balance = available_balance + p_amount,
                updated_at = NOW()
            WHERE id = v_ent.id;
        ELSE
            v_new_closing := GREATEST(0.0, v_ent.closing_balance - p_amount);
            UPDATE public.leave_entitlements
            SET adjustments = adjustments - p_amount,
                closing_balance = v_new_closing,
                available_balance = GREATEST(0.0, available_balance - p_amount),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;

        -- 3. Record Immutable Ledger Entry
        INSERT INTO public.leave_ledger_transactions (
            id, organization_id, company_id, employee_id, employee_name,
            leave_type_id, leave_type_name, date, transaction_type,
            amount, balance_after, reference_id, actor_id, actor_name, reason, created_at
        ) VALUES (
            v_ledger_id, p_organization_id, p_company_id, p_employee_id, p_employee_name,
            p_leave_type_id, p_leave_type_name, p_effective_date, 'Adjustment',
            p_amount, v_new_closing, v_adj_id, 'usr-hr', p_actor_name,
            p_reason || ' (' || p_adjustment_type || ')', NOW()
        );
    END IF;

    -- 4. Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), 'usr-hr', p_actor_name,
        'LEAVE_ADJUSTMENT_CREATED', 'LeaveAdjustment', v_adj_id, NULL, to_jsonb(v_adj_record)::TEXT
    );

    RETURN to_jsonb(v_adj_record);
END;
$$;


-- 7. FUNCTION: Execute Monthly Batch Accrual Run
CREATE OR REPLACE FUNCTION public.fn_execute_monthly_accrual_run(
    p_organization_id TEXT,
    p_period VARCHAR(20),
    p_actor_name VARCHAR(150) DEFAULT 'System Accrual Engine'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id TEXT := 'run-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_emp_count INTEGER := 0;
    v_total_days NUMERIC(8,2) := 0.0;
    v_ent RECORD;
    v_monthly_credit NUMERIC(4,2) := 1.75; -- Standard statutory accrual per month
BEGIN
    FOR v_ent IN
        SELECT le.* FROM public.leave_entitlements le
        JOIN public.leave_types lt ON lt.id = le.leave_type_id
        WHERE le.organization_id = p_organization_id
          AND lt.is_active = true
          AND lt.category = 'Paid'
        FOR UPDATE
    LOOP
        UPDATE public.leave_entitlements
        SET accrued = accrued + v_monthly_credit,
            closing_balance = closing_balance + v_monthly_credit,
            available_balance = available_balance + v_monthly_credit,
            updated_at = NOW()
        WHERE id = v_ent.id;

        -- Record Ledger Entry for Accrual
        INSERT INTO public.leave_ledger_transactions (
            id, organization_id, company_id, employee_id, employee_name,
            leave_type_id, leave_type_name, date, transaction_type,
            amount, balance_after, reference_id, actor_id, actor_name, reason, created_at
        ) VALUES (
            'tx-acc-' || gen_random_uuid()::text, p_organization_id, v_ent.company_id, v_ent.employee_id, v_ent.employee_name,
            v_ent.leave_type_id, v_ent.leave_type_name, CURRENT_DATE, 'Accrual',
            v_monthly_credit, (v_ent.closing_balance + v_monthly_credit), v_log_id, 'sys-cron', p_actor_name,
            'Automated Monthly Accrual for period ' || p_period, NOW()
        );

        v_emp_count := v_emp_count + 1;
        v_total_days := v_total_days + v_monthly_credit;
    END LOOP;

    -- Insert Accrual Execution Log
    INSERT INTO public.accrual_execution_logs (
        id, period, run_timestamp, employees_processed,
        total_leave_days_credited, status
    ) VALUES (
        v_log_id, p_period, NOW(), v_emp_count, v_total_days, 'Completed'
    );

    RETURN jsonb_build_object(
        'log_id', v_log_id,
        'period', p_period,
        'employees_processed', v_emp_count,
        'total_leave_days_credited', v_total_days,
        'status', 'Completed'
    );
END;
$$;
