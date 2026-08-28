-- ============================================================================
-- WorkforceOS Enterprise HRMS — Production Leave Management Suite
-- Migration: 20260826_production_leave_engine_and_attendance_sync.sql
-- Description: Dynamic Org Leave Types, Ledger Transactions, Reporting Manager
--              Approval Routing, Realtime Notifications, and Attendance Sync
-- ============================================================================

-- 1. Ensure required columns on leave_requests for reporting manager and rejection
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS manager_id TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS current_approver_name VARCHAR(150);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS daily_breakdown JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS half_day_session VARCHAR(20) DEFAULT NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_hourly BOOLEAN DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_lop BOOLEAN DEFAULT false;

-- 2. Ensure Realtime Publication includes leave tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY[
        'leave_types',
        'leave_policies',
        'leave_entitlements',
        'leave_requests',
        'leave_ledger_transactions',
        'leave_audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_add LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', t);
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
            EXCEPTION WHEN duplicate_object THEN
                NULL;
            WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- 3. FUNCTION: Submit Leave Request with Automatic Reporting Manager Routing
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
    v_req_id TEXT := 'lr-' || gen_random_uuid()::text;
    v_req_code VARCHAR(30) := 'LV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    v_req_record RECORD;
    v_period VARCHAR(20) := TO_CHAR(p_from_date, 'YYYY');
    v_ent RECORD;
    v_mgr_id TEXT := p_manager_id;
    v_mgr_name VARCHAR(150) := p_manager_name;
    v_emp RECORD;
    v_notif_id UUID := gen_random_uuid();
BEGIN
    -- 1. Auto-resolve reporting manager if not provided
    IF v_mgr_id IS NULL OR v_mgr_id = '' THEN
        SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id LIMIT 1;
        IF FOUND THEN
            v_mgr_id := COALESCE(
                v_emp.employment->>'reports_to_id',
                v_emp.employment->>'manager_id',
                v_emp.employment->>'reporting_manager_id',
                'mgr-admin'
            );
            v_mgr_name := COALESCE(
                v_emp.employment->>'reports_to_name',
                v_emp.employment->>'manager_name',
                v_emp.employment->>'reporting_manager_name',
                'Reporting Manager'
            );
        END IF;
    END IF;

    -- 2. Check for overlapping active requests
    IF EXISTS (
        SELECT 1 FROM public.leave_requests
        WHERE employee_id = p_employee_id
          AND status IN ('Pending', 'Approved', 'SUBMITTED', 'PENDING_APPROVAL')
          AND from_date <= p_to_date
          AND to_date >= p_from_date
    ) THEN
        RAISE EXCEPTION 'An active leave request already exists covering this date range.';
    END IF;

    -- 3. Update pending days in leave_entitlements if not LOP
    IF NOT p_is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = p_employee_id
          AND leave_type_id = p_leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.leave_entitlements
            SET pending = pending + p_leave_days_deducted,
                available_balance = GREATEST(0.0, closing_balance - (pending + p_leave_days_deducted)),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;
    END IF;

    -- 4. Insert Leave Request
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
        p_contact_number, p_alternate_contact, v_mgr_id, v_mgr_name, v_mgr_name,
        'Pending', p_is_lop, p_daily_breakdown, NOW(), NOW()
    )
    RETURNING * INTO v_req_record;

    -- 5. Create Realtime Push Notification for Reporting Manager
    BEGIN
        INSERT INTO public.notification_events (
            id, event_type, category, severity, title, body,
            actor_name, resource_type, resource_id, metadata, created_at
        ) VALUES (
            v_notif_id, 'LEAVE_SUBMITTED', 'APPROVAL', 'ACTION_REQUIRED',
            'Leave Request Submitted · ' || p_employee_name,
            p_employee_name || ' requested ' || p_leave_days_deducted || ' day(s) of ' || p_leave_type_name || ' (' || TO_CHAR(p_from_date, 'DD Mon') || ' - ' || TO_CHAR(p_to_date, 'DD Mon') || ').',
            p_employee_name, 'leave_request', v_req_id,
            jsonb_build_object('employee_id', p_employee_id, 'manager_id', v_mgr_id, 'days', p_leave_days_deducted),
            NOW()
        );

        IF v_mgr_id IS NOT NULL AND v_mgr_id <> '' THEN
            INSERT INTO public.notification_deliveries (
                notification_id, recipient_employee_id, channel, status, delivered_at
            ) VALUES (
                v_notif_id, v_mgr_id, 'IN_APP', 'DELIVERED', NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 6. Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_employee_id, p_employee_name,
        'LEAVE_REQUEST_SUBMITTED', 'LeaveRequest', v_req_id, NULL, to_jsonb(v_req_record)::TEXT
    );

    RETURN to_jsonb(v_req_record);
END;
$$;

-- 4. FUNCTION: Approve Leave Request with Attendance Synchronization
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
    v_cur_date DATE;
    v_notif_id UUID := gen_random_uuid();
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

    -- 1. Update Entitlement & Create Ledger Transaction if not LOP
    IF NOT v_req.is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            v_new_closing := GREATEST(0.0, v_ent.closing_balance - v_req.leave_days_deducted);
            v_new_available := GREATEST(0.0, v_new_closing - GREATEST(0.0, v_ent.pending - v_req.leave_days_deducted));

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

    -- 2. Update Request Status
    UPDATE public.leave_requests
    SET status = 'Approved',
        approved_at = NOW(),
        current_approver_name = p_approver_name,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    -- 3. Synchronize Attendance Daily: Mark all span dates as 'Leave'
    BEGIN
        v_cur_date := v_req.from_date;
        WHILE v_cur_date <= v_req.to_date LOOP
            INSERT INTO public.attendance_daily (
                employee_id, date, status, leave_type, is_approved_leave,
                is_paid_leave, notes, created_at, updated_at
            ) VALUES (
                v_req.employee_id, v_cur_date,
                CASE WHEN v_req.is_half_day THEN 'HalfDay' ELSE 'Leave' END,
                v_req.leave_type_code, true, NOT v_req.is_lop,
                'Approved ' || v_req.leave_type_name || ' (' || v_req.request_code || ') by ' || p_approver_name,
                NOW(), NOW()
            )
            ON CONFLICT (employee_id, date) DO UPDATE SET
                status = CASE WHEN v_req.is_half_day THEN 'HalfDay' ELSE 'Leave' END,
                leave_type = EXCLUDED.leave_type,
                is_approved_leave = true,
                is_paid_leave = EXCLUDED.is_paid_leave,
                notes = EXCLUDED.notes,
                updated_at = NOW();

            v_cur_date := v_cur_date + INTERVAL '1 day';
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Create Notification for Employee
    BEGIN
        INSERT INTO public.notification_events (
            id, event_type, category, severity, title, body,
            actor_name, resource_type, resource_id, metadata, created_at
        ) VALUES (
            v_notif_id, 'LEAVE_APPROVED', 'APPROVAL', 'SUCCESS',
            'Leave Approved · ' || v_req.leave_type_name,
            'Your leave request for ' || TO_CHAR(v_req.from_date, 'DD Mon') || ' - ' || TO_CHAR(v_req.to_date, 'DD Mon') || ' (' || v_req.leave_days_deducted || ' days) has been approved by ' || p_approver_name || '.',
            p_approver_name, 'leave_request', v_req.id,
            jsonb_build_object('employee_id', v_req.employee_id, 'approver_id', p_approver_id, 'days', v_req.leave_days_deducted),
            NOW()
        );

        INSERT INTO public.notification_deliveries (
            notification_id, recipient_employee_id, channel, status, delivered_at
        ) VALUES (
            v_notif_id, v_req.employee_id, 'IN_APP', 'DELIVERED', NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 5. Audit Log
    INSERT INTO public.leave_audit_logs (
        id, timestamp, actor_id, actor_name, action, entity_type, entity_id, old_value, new_value
    ) VALUES (
        'aud-' || gen_random_uuid()::text, NOW(), p_approver_id, p_approver_name,
        'LEAVE_REQUEST_APPROVED', 'LeaveRequest', p_request_id, 'Pending', 'Approved'
    );

    RETURN to_jsonb(v_req);
END;
$$;

-- 5. FUNCTION: Reject Leave Request (Releases Pending Days & Notifies Employee)
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
    v_notif_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO v_req FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found', p_request_id;
    END IF;

    v_period := TO_CHAR(v_req.from_date, 'YYYY');

    -- Release Pending Days if not LOP
    IF NOT v_req.is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.leave_entitlements
            SET pending = GREATEST(0.0, pending - v_req.leave_days_deducted),
                available_balance = GREATEST(0.0, closing_balance - GREATEST(0.0, pending - v_req.leave_days_deducted)),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;
    END IF;

    -- Update Request Status
    UPDATE public.leave_requests
    SET status = 'Rejected',
        rejected_at = NOW(),
        rejection_reason = p_rejection_reason,
        current_approver_name = p_rejector_name,
        comments = COALESCE(p_rejection_reason, comments),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_req;

    -- Create Notification for Employee
    BEGIN
        INSERT INTO public.notification_events (
            id, event_type, category, severity, title, body,
            actor_name, resource_type, resource_id, metadata, created_at
        ) VALUES (
            v_notif_id, 'LEAVE_REJECTED', 'APPROVAL', 'WARNING',
            'Leave Request Rejected · ' || v_req.leave_type_name,
            'Your leave request for ' || TO_CHAR(v_req.from_date, 'DD Mon') || ' - ' || TO_CHAR(v_req.to_date, 'DD Mon') || ' was rejected by ' || p_rejector_name || '. Reason: ' || COALESCE(p_rejection_reason, 'No reason provided.'),
            p_rejector_name, 'leave_request', v_req.id,
            jsonb_build_object('employee_id', v_req.employee_id, 'rejector_id', p_rejector_id),
            NOW()
        );

        INSERT INTO public.notification_deliveries (
            notification_id, recipient_employee_id, channel, status, delivered_at
        ) VALUES (
            v_notif_id, v_req.employee_id, 'IN_APP', 'DELIVERED', NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

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

-- 6. FUNCTION: Cancel Leave Request (Reverses Ledger & Reverts Attendance)
CREATE OR REPLACE FUNCTION public.fn_cancel_leave_request(
    p_request_id TEXT,
    p_actor_id TEXT,
    p_actor_name VARCHAR(150),
    p_cancellation_reason TEXT DEFAULT NULL
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
    v_ledger_id TEXT := 'tx-rev-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_cur_date DATE;
BEGIN
    SELECT * INTO v_req FROM public.leave_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Leave request % not found', p_request_id;
    END IF;

    v_period := TO_CHAR(v_req.from_date, 'YYYY');

    -- If previously approved, restore balance & reverse ledger
    IF v_req.status = 'Approved' AND NOT v_req.is_lop THEN
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            v_new_closing := v_ent.closing_balance + v_req.leave_days_deducted;
            v_new_available := v_ent.available_balance + v_req.leave_days_deducted;

            UPDATE public.leave_entitlements
            SET used = GREATEST(0.0, used - v_req.leave_days_deducted),
                closing_balance = v_new_closing,
                available_balance = v_new_available,
                updated_at = NOW()
            WHERE id = v_ent.id;

            -- Ledger Reversal Entry
            INSERT INTO public.leave_ledger_transactions (
                id, organization_id, company_id, employee_id, employee_name,
                leave_type_id, leave_type_name, date, transaction_type,
                amount, balance_after, reference_id, actor_id, actor_name, reason, created_at
            ) VALUES (
                v_ledger_id, v_req.organization_id, v_req.company_id, v_req.employee_id, v_req.employee_name,
                v_req.leave_type_id, v_req.leave_type_name, NOW()::DATE, 'AdjustmentCredit',
                v_req.leave_days_deducted, v_new_closing, v_req.id, p_actor_id, p_actor_name,
                COALESCE(p_cancellation_reason, 'Cancelled leave request ' || v_req.request_code), NOW()
            );
        END IF;

        -- Revert attendance_daily records
        BEGIN
            v_cur_date := v_req.from_date;
            WHILE v_cur_date <= v_req.to_date LOOP
                UPDATE public.attendance_daily
                SET status = 'Scheduled',
                    is_approved_leave = false,
                    leave_type = NULL,
                    notes = 'Leave cancelled (' || v_req.request_code || ')',
                    updated_at = NOW()
                WHERE employee_id = v_req.employee_id AND date = v_cur_date;

                v_cur_date := v_cur_date + INTERVAL '1 day';
            END LOOP;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    ELSIF v_req.status = 'Pending' AND NOT v_req.is_lop THEN
        -- Release pending days
        SELECT * INTO v_ent FROM public.leave_entitlements
        WHERE employee_id = v_req.employee_id
          AND leave_type_id = v_req.leave_type_id
          AND period = v_period
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.leave_entitlements
            SET pending = GREATEST(0.0, pending - v_req.leave_days_deducted),
                available_balance = GREATEST(0.0, closing_balance - GREATEST(0.0, pending - v_req.leave_days_deducted)),
                updated_at = NOW()
            WHERE id = v_ent.id;
        END IF;
    END IF;

    -- Update Request Status
    UPDATE public.leave_requests
    SET status = 'Cancelled',
        cancelled_at = NOW(),
        comments = COALESCE(p_cancellation_reason, comments),
        updated_at = NOW()
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

-- 8. FUNCTION: Reconcile Employee Leave Balances from Approved Requests
CREATE OR REPLACE FUNCTION public.fn_reconcile_employee_leave_balances(
    p_employee_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ent RECORD;
    v_actual_used NUMERIC(6,2);
    v_actual_pending NUMERIC(6,2);
    v_reconciled_count INTEGER := 0;
BEGIN
    FOR v_ent IN
        SELECT e.*, t.code as type_code, t.name as type_name
        FROM public.leave_entitlements e
        LEFT JOIN public.leave_types t ON e.leave_type_id = t.id
        WHERE (p_employee_id IS NULL OR e.employee_id = p_employee_id)
    LOOP
        -- Calculate exact verified approved usage for this leave type
        SELECT COALESCE(SUM(COALESCE(working_days, leave_days_deducted, days_count, 1.0)), 0.0)
        INTO v_actual_used
        FROM public.leave_requests
        WHERE employee_id = v_ent.employee_id
          AND (
            leave_type_id = v_ent.leave_type_id
            OR UPPER(leave_type_code) = UPPER(v_ent.type_code)
            OR LOWER(leave_type_name) = LOWER(v_ent.type_name)
          )
          AND status IN ('Approved', 'APPROVED');

        -- Calculate active pending requests
        SELECT COALESCE(SUM(COALESCE(working_days, leave_days_deducted, days_count, 1.0)), 0.0)
        INTO v_actual_pending
        FROM public.leave_requests
        WHERE employee_id = v_ent.employee_id
          AND (
            leave_type_id = v_ent.leave_type_id
            OR UPPER(leave_type_code) = UPPER(v_ent.type_code)
            OR LOWER(leave_type_name) = LOWER(v_ent.type_name)
          )
          AND status IN ('Pending', 'PENDING', 'SUBMITTED', 'PENDING_APPROVAL');

        -- Update entitlement row
        UPDATE public.leave_entitlements
        SET used = v_actual_used,
            pending = v_actual_pending,
            closing_balance = GREATEST(0.0, (opening_balance + granted + accrued) - v_actual_used),
            available_balance = GREATEST(0.0, (opening_balance + granted + accrued) - v_actual_used - v_actual_pending),
            updated_at = NOW()
        WHERE id = v_ent.id;

        v_reconciled_count := v_reconciled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'reconciled_entitlements', v_reconciled_count,
        'employee_id', p_employee_id,
        'timestamp', NOW()
    );
END;
$$;

