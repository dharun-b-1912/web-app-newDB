-- supabase/migrations/20261022_fix_multitenant_automated_attendance_mis.sql
-- ============================================================================
-- Joy PeopleHR Enterprise — Multi-Tenant Automated MIS Report Scheduling
-- Fixes:
-- 1. Adds whatsapp_recipients to attendance_report_schedules
-- 2. Resets stale evening locks so Evening Final Checkout reports dispatch automatically
-- 3. Updates fn_dispatch_scheduled_attendance_report to loop over ALL enabled tenants
--    and pass organization_id, slot, and mode to attendance-report-dispatcher
-- ============================================================================

-- 1. Add whatsapp_recipients column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_report_schedules' 
          AND column_name = 'whatsapp_recipients'
    ) THEN
        ALTER TABLE public.attendance_report_schedules 
        ADD COLUMN whatsapp_recipients JSONB NOT NULL DEFAULT '["919840209900"]'::jsonb;
    END IF;
END $$;

-- 2. Update existing schedule for Joy Corporate Solutions
UPDATE public.attendance_report_schedules
SET 
    whatsapp_recipients = '["919840209900"]'::jsonb,
    evening_enabled = true,
    evening_time = '19:00',
    morning_enabled = true,
    morning_time = '10:30',
    last_evening_run_at = NULL, -- Reset stale evening lock from 2026-10-21
    last_evening_status = NULL,
    updated_at = now()
WHERE organization_id = '0c621892-e938-4707-9957-13534ea32c19'::uuid;

-- 3. Update the stored procedure to support Multi-Tenant SaaS
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
    v_today DATE;
    v_dispatched_count INT := 0;
    v_skipped_count INT := 0;
BEGIN
    v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;
    v_slot := COALESCE(
        p_slot, 
        CASE WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Kolkata')) < 14 THEN 'MORNING' ELSE 'EVENING' END
    );

    -- Loop through ALL active tenant schedules (SaaS Multi-Tenant)
    FOR v_sched IN 
        SELECT * 
        FROM public.attendance_report_schedules 
        WHERE enabled = true 
    LOOP
        -- Check if morning / evening slot is enabled for this specific tenant
        IF v_slot = 'MORNING' AND NOT COALESCE(v_sched.morning_enabled, true) THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        IF v_slot = 'EVENING' AND NOT COALESCE(v_sched.evening_enabled, true) THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Deduplication Guard: Do not re-dispatch if this tenant's slot already succeeded today
        IF v_slot = 'MORNING' 
           AND v_sched.last_morning_run_at IS NOT NULL 
           AND (v_sched.last_morning_run_at AT TIME ZONE 'Asia/Kolkata')::date = v_today 
           AND v_sched.last_morning_status = 'SUCCESS' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        IF v_slot = 'EVENING' 
           AND v_sched.last_evening_run_at IS NOT NULL 
           AND (v_sched.last_evening_run_at AT TIME ZONE 'Asia/Kolkata')::date = v_today 
           AND v_sched.last_evening_status = 'SUCCESS' THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Invoke Edge Function with tenant-scoped payload via pg_net
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
            PERFORM net.http_post(
                url := 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/attendance-report-dispatcher',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                    'organization_id', v_sched.organization_id,
                    'slot', v_slot,
                    'mode', 'AUTOMATED_SCHEDULE',
                    'date', to_char(v_today, 'YYYY-MM-DD')
                )
            );
            v_dispatched_count := v_dispatched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'slot', v_slot, 
        'date', to_char(v_today, 'YYYY-MM-DD'),
        'tenants_dispatched', v_dispatched_count,
        'tenants_skipped', v_skipped_count
    );
END;
$$;

-- 4. Ensure pg_cron jobs are properly scheduled
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

        -- Slot 2: Evening Final Check-Out Audit (07:00 PM IST = 13:30 UTC)
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
