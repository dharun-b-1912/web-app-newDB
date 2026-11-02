-- ============================================================================
-- Migration: 20261102_170_auto_ping_stale_shift_devices_cron.sql
-- Description: Automated Background GPS Wake-up Dispatcher for Active Shift Devices
-- Automatically triggers automated-cron-dispatcher?action=gps_ping every 15 mins
-- during active shift hours (08:00 to 20:00 IST / 02:30 to 14:30 UTC)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_trigger_shift_device_gps_ping()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url text := 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/automated-cron-dispatcher?action=gps_ping';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object(
                'action', 'gps_ping',
                'source', 'pg_cron_scheduler',
                'timestamp', now()
            )
        );
        RETURN jsonb_build_object('success', true, 'status', 'DISPATCHED_VIA_PG_NET');
    END IF;

    RETURN jsonb_build_object('success', false, 'reason', 'pg_net extension missing');
END;
$$;

-- Register pg_cron scheduled job (runs every 15 mins between 08:00 - 20:00 IST / 02:30 - 14:30 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('auto-ping-shift-devices') 
        WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-ping-shift-devices');

        PERFORM cron.schedule(
            'auto-ping-shift-devices',
            '*/15 2-14 * * 1-6',
            'SELECT public.fn_trigger_shift_device_gps_ping();'
        );

        RAISE NOTICE 'pg_cron auto-ping-shift-devices registered successfully.';
    ELSE
        RAISE NOTICE 'pg_cron extension not active. Function public.fn_trigger_shift_device_gps_ping() registered for manual or external webhook triggers.';
    END IF;
END $$;

