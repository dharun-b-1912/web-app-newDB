-- ============================================================================
-- Joy PeopleHR Enterprise — Migration 113
-- Enterprise pg_cron & Scheduled Background Processing Engine
-- Handles: Daily Attendance Settlement, Biometric Heartbeats, Monthly Leave Accruals,
-- Session Cleanups, and pg_cron / pg_net background automation.
-- ============================================================================

-- 1. Conditionally enable extensions if permitted in the environment
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron extension could not be initialized automatically. Stored procedures will remain directly invokable.';
    END;
    
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_net extension could not be initialized automatically.';
    END;
END $$;

-- ============================================================================
-- 2. Stored Procedure: Batch Settle Daily Attendance for Working Day
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_batch_settle_daily_attendance(
    p_date DATE DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_emp RECORD;
    v_active_count INTEGER := 0;
    v_settled_count INTEGER := 0;
    v_absent_count INTEGER := 0;
    v_holiday_count INTEGER := 0;
    v_leave_count INTEGER := 0;
    v_present_recalc INTEGER := 0;
    
    v_day_of_week INTEGER; -- 0=Sun, 1=Mon, ..., 6=Sat
    v_is_holiday BOOLEAN;
    v_has_approved_leave BOOLEAN;
    v_leave_is_unpaid BOOLEAN;
    v_punch_count INTEGER;
BEGIN
    v_day_of_week := EXTRACT(DOW FROM p_date);

    -- Loop through all active, confirmed, or probation employees
    FOR v_emp IN
        SELECT e.id, e.organization_id, e.work_location_id, e.status
        FROM public.employees e
        WHERE e.status IN ('Active', 'Confirmed', 'Probation', 'ACTIVE', 'CONFIRMED', 'PROBATION')
    LOOP
        v_active_count := v_active_count + 1;

        -- 1. Check if employee already has an authoritative daily attendance record
        IF EXISTS (
            SELECT 1 FROM public.attendance_daily
            WHERE employee_id = v_emp.id AND attendance_date = p_date
        ) THEN
            -- Check if punches exist and daily record just needs recalculation
            SELECT COUNT(*) INTO v_punch_count
            FROM public.attendance_punches
            WHERE employee_id = v_emp.id
              AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date;

            IF v_punch_count > 0 THEN
                PERFORM public.fn_recalculate_daily_attendance(v_emp.id, p_date);
                v_present_recalc := v_present_recalc + 1;
            END IF;
            CONTINUE;
        END IF;

        -- 2. Check if punches exist for this employee on this date
        SELECT COUNT(*) INTO v_punch_count
        FROM public.attendance_punches
        WHERE employee_id = v_emp.id
          AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p_date;

        IF v_punch_count > 0 THEN
            -- Punches exist: recalculate and populate daily attendance
            PERFORM public.fn_recalculate_daily_attendance(v_emp.id, p_date);
            v_present_recalc := v_present_recalc + 1;
            v_settled_count := v_settled_count + 1;
            CONTINUE;
        END IF;

        -- 3. Check for approved leave requests covering this date
        v_has_approved_leave := false;
        v_leave_is_unpaid := false;

        SELECT 
            true, 
            COALESCE(lt.is_paid = false, false)
        INTO 
            v_has_approved_leave, 
            v_leave_is_unpaid
        FROM public.leave_requests lr
        LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = v_emp.id
          AND lr.status IN ('APPROVED', 'Approved')
          AND p_date BETWEEN lr.start_date AND lr.end_date
        LIMIT 1;

        IF v_has_approved_leave THEN
            INSERT INTO public.attendance_daily (
                organization_id, employee_id, attendance_date,
                status, payable_status, is_regularized,
                total_work_minutes, break_minutes, late_entry_minutes, early_exit_minutes, overtime_minutes
            ) VALUES (
                v_emp.organization_id, v_emp.id, p_date,
                'ON_LEAVE', CASE WHEN v_leave_is_unpaid THEN 0.00 ELSE 1.00 END, false,
                0, 0, 0, 0, 0
            ) ON CONFLICT (employee_id, attendance_date) DO NOTHING;

            v_leave_count := v_leave_count + 1;
            v_settled_count := v_settled_count + 1;
            CONTINUE;
        END IF;

        -- 4. Check if Sunday (Weekend Off) or Company Holiday
        v_is_holiday := false;
        IF v_day_of_week = 0 THEN
            v_is_holiday := true;
        END IF;

        -- Check company holiday calendar if table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'holiday_calendar'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM public.holiday_calendar
                WHERE organization_id = v_emp.organization_id
                  AND holiday_date = p_date
            ) THEN
                v_is_holiday := true;
            END IF;
        END IF;

        IF v_is_holiday THEN
            INSERT INTO public.attendance_daily (
                organization_id, employee_id, attendance_date,
                status, payable_status, is_regularized,
                total_work_minutes, break_minutes, late_entry_minutes, early_exit_minutes, overtime_minutes
            ) VALUES (
                v_emp.organization_id, v_emp.id, p_date,
                'HOLIDAY', 1.00, false,
                0, 0, 0, 0, 0
            ) ON CONFLICT (employee_id, attendance_date) DO NOTHING;

            v_holiday_count := v_holiday_count + 1;
            v_settled_count := v_settled_count + 1;
            CONTINUE;
        END IF;

        -- 5. Default Working Day with ZERO punches and NO approved leave: Mark ABSENT (Loss of Pay)
        INSERT INTO public.attendance_daily (
            organization_id, employee_id, attendance_date,
            status, payable_status, is_regularized,
            total_work_minutes, break_minutes, late_entry_minutes, early_exit_minutes, overtime_minutes
        ) VALUES (
            v_emp.organization_id, v_emp.id, p_date,
            'ABSENT', 0.00, false,
            0, 0, 0, 0, 0
        ) ON CONFLICT (employee_id, attendance_date) DO NOTHING;

        v_absent_count := v_absent_count + 1;
        v_settled_count := v_settled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'settled_date', p_date,
        'active_employees_evaluated', v_active_count,
        'settled_records_created', v_settled_count,
        'recalculated_present', v_present_recalc,
        'marked_absent_lop', v_absent_count,
        'marked_leave', v_leave_count,
        'marked_holiday_weekoff', v_holiday_count,
        'executed_at', now()
    );
END;
$$;

-- ============================================================================
-- 3. Stored Procedure: Biometric Device Heartbeat & Health Check
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_check_biometric_device_heartbeats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_degraded_count INTEGER := 0;
BEGIN
    -- Flag devices as Offline if last heartbeat exceeded 15 minutes
    UPDATE public.biometric_devices
    SET 
        status = 'Offline',
        diagnostic = jsonb_build_object(
            'status', 'NO_NETWORK',
            'power_status', 'POWERED_ON',
            'lan_status', 'UNREACHABLE',
            'port_status', 'TIMEOUT',
            'internet_status', 'DISCONNECTED',
            'failure_reason', 'LAN Gateway Heartbeat timeout exceeding 15 minutes',
            'troubleshooting_steps', jsonb_build_array(
                'Verify device power cable is firmly connected',
                'Check network switch and router LED indicators',
                'Ensure local Workforce Gateway agent service is running'
            ),
            'last_checked_at', now()
        ),
        updated_at = now()
    WHERE status IN ('Online', 'Syncing')
      AND (last_heartbeat_at IS NULL OR last_heartbeat_at < now() - INTERVAL '15 minutes');

    GET DIAGNOSTICS v_degraded_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'devices_marked_offline', v_degraded_count,
        'evaluated_at', now()
    );
END;
$$;

-- ============================================================================
-- 4. Stored Procedure: Monthly Leave Accrual Credit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_process_monthly_leave_accruals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_accrued_count INTEGER := 0;
    v_emp RECORD;
    v_type RECORD;
    v_current_year INTEGER;
    v_monthly_credit NUMERIC(4, 2) := 1.50; -- Standard 1.5 days per month (18 days/year)
BEGIN
    v_current_year := EXTRACT(YEAR FROM now())::INTEGER;

    -- Loop through active employees and leave types
    FOR v_emp IN
        SELECT e.id, e.organization_id
        FROM public.employees e
        WHERE e.status IN ('Active', 'Confirmed', 'Probation', 'ACTIVE', 'CONFIRMED', 'PROBATION')
    LOOP
        FOR v_type IN
            SELECT id, code, name, is_paid
            FROM public.leave_types
            WHERE organization_id = v_emp.organization_id
              AND is_active = true
              AND code IN ('CL', 'EL', 'PL', 'SL', 'CASUAL_LEAVE', 'EARNED_LEAVE', 'SICK_LEAVE')
        LOOP
            -- Check or insert into employee_leave_balances
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'employee_leave_balances'
            ) THEN
                INSERT INTO public.employee_leave_balances (
                    organization_id, employee_id, leave_type_id, year,
                    opening_balance, accrued_balance, used_balance, closing_balance, updated_at
                ) VALUES (
                    v_emp.organization_id, v_emp.id, v_type.id, v_current_year,
                    0, v_monthly_credit, 0, v_monthly_credit, now()
                )
                ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET
                    accrued_balance = public.employee_leave_balances.accrued_balance + v_monthly_credit,
                    closing_balance = public.employee_leave_balances.closing_balance + v_monthly_credit,
                    updated_at = now();

                v_accrued_count := v_accrued_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'year', v_current_year,
        'leave_balances_credited', v_accrued_count,
        'executed_at', now()
    );
END;
$$;

-- ============================================================================
-- 5. Stored Procedure: Expired Session & Token Cleanup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_cleanup_expired_sessions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cleaned_sessions INTEGER := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'platform_sessions'
    ) THEN
        UPDATE public.platform_sessions
        SET is_active = false, terminated_reason = 'EXPIRED_BY_CLEANUP_CRON'
        WHERE is_active = true
          AND expires_at < now();

        GET DIAGNOSTICS v_cleaned_sessions = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'sessions_deactivated', v_cleaned_sessions,
        'cleaned_at', now()
    );
END;
$$;

-- ============================================================================
-- 6. Register pg_cron Schedules (if pg_cron extension is active)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- 1. Daily Attendance Settlement at 23:55 IST (18:25 UTC)
        PERFORM cron.unschedule('daily-attendance-settlement') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-attendance-settlement');
        PERFORM cron.schedule(
            'daily-attendance-settlement',
            '25 18 * * *',
            'SELECT public.fn_batch_settle_daily_attendance();'
        );

        -- 2. Biometric Device Health & Heartbeat Check (Every 15 minutes)
        PERFORM cron.unschedule('biometric-device-heartbeat') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'biometric-device-heartbeat');
        PERFORM cron.schedule(
            'biometric-device-heartbeat',
            '*/15 * * * *',
            'SELECT public.fn_check_biometric_device_heartbeats();'
        );

        -- 3. Monthly Leave Accrual on 1st of month at 00:05 IST (18:35 UTC previous day)
        PERFORM cron.unschedule('monthly-leave-accrual') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-leave-accrual');
        PERFORM cron.schedule(
            'monthly-leave-accrual',
            '35 18 1 * *',
            'SELECT public.fn_process_monthly_leave_accruals();'
        );

        -- 4. Session & Credential Cleanup (Hourly)
        PERFORM cron.unschedule('session-cleanup-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'session-cleanup-hourly');
        PERFORM cron.schedule(
            'session-cleanup-hourly',
            '0 * * * *',
            'SELECT public.fn_cleanup_expired_sessions();'
        );

        RAISE NOTICE 'Enterprise pg_cron jobs registered successfully.';
    ELSE
        RAISE NOTICE 'pg_cron extension not active. Functions fn_batch_settle_daily_attendance, fn_check_biometric_device_heartbeats, etc., are available for external invocation via automated-cron-dispatcher Edge Function.';
    END IF;
END $$;
