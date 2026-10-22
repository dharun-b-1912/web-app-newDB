-- supabase/migrations/20261016_pg_cron_attendance_report.sql
-- ============================================================================
-- Enterprise Automated pg_cron Attendance MIS Report Dispatcher
-- Invokes Edge Function directly on the Supabase server without client browser dependency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_dispatch_scheduled_attendance_report(
    p_slot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slot TEXT;
    v_sched RECORD;
BEGIN
    -- Check if automated schedule is enabled in the database
    SELECT * INTO v_sched 
    FROM public.attendance_report_schedules 
    WHERE enabled = true 
    ORDER BY updated_at DESC 
    LIMIT 1;

    IF v_sched IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Automated schedule disabled in database');
    END IF;

    v_slot := COALESCE(
        p_slot, 
        CASE WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Kolkata')) < 14 THEN 'MORNING' ELSE 'EVENING' END
    );

    -- Deduplication Guard: Do not re-dispatch if this slot already succeeded today
    IF v_slot = 'MORNING' AND v_sched.last_morning_run_at IS NOT NULL AND (v_sched.last_morning_run_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date AND v_sched.last_morning_status = 'SUCCESS' THEN
        RETURN jsonb_build_object('success', true, 'reason', 'Morning report already dispatched today');
    END IF;

    IF v_slot = 'EVENING' AND v_sched.last_evening_run_at IS NOT NULL AND (v_sched.last_evening_run_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date AND v_sched.last_evening_status = 'SUCCESS' THEN
        RETURN jsonb_build_object('success', true, 'reason', 'Evening report already dispatched today');
    END IF;

    -- Ensure pg_net is available and invoke the Edge Function
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        PERFORM net.http_post(
            url := 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/attendance-report-dispatcher',
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object(
                'slot', v_slot,
                'mode', 'AUTOMATED_SCHEDULE'
            )
        );
        RETURN jsonb_build_object('success', true, 'slot', v_slot, 'dispatched_via', 'pg_net');
    END IF;

    RETURN jsonb_build_object('success', false, 'reason', 'pg_net extension missing');
END;
$$;

-- Register pg_cron jobs if pg_cron is enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove old jobs if present
        PERFORM cron.unschedule('attendance-report-morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-report-morning');
        PERFORM cron.unschedule('attendance-report-evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-report-evening');
        PERFORM cron.unschedule('attendance-report-night') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-report-night');

        -- Slot 1: Morning Check-In (10:30 AM IST = 05:00 UTC)
        PERFORM cron.schedule(
            'attendance-report-morning',
            '0 5 * * *',
            'SELECT public.fn_dispatch_scheduled_attendance_report(''MORNING'');'
        );

        -- Slot 2: Evening Final Audit (07:00 PM IST = 13:30 UTC)
        PERFORM cron.schedule(
            'attendance-report-evening',
            '30 13 * * *',
            'SELECT public.fn_dispatch_scheduled_attendance_report(''EVENING'');'
        );

        -- Slot 3: Night Final Reconciliation (08:00 PM IST = 14:30 UTC)
        PERFORM cron.schedule(
            'attendance-report-night',
            '30 14 * * *',
            'SELECT public.fn_dispatch_scheduled_attendance_report(''EVENING'');'
        );
    END IF;
END $$;
