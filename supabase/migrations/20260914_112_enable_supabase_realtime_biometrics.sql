-- ============================================================================
-- Migration: 20260914_112_enable_supabase_realtime_biometrics.sql
-- Description: Complete Supabase Realtime & Biometrics Replication Configuration
-- Ensures full WAL event publication for biometrics, attendance, and realtime mesh
-- ============================================================================

-- 1. Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Configure REPLICA IDENTITY FULL and Add Tables to supabase_realtime Publication
DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'biometric_devices',
    'biometric_punches',
    'biometric_device_users',
    'biometric_sync_logs',
    'biometric_gateway_agents',
    'biometric_command_queue',
    'attendance_daily',
    'attendance_punches',
    'attendance_regularizations',
    'attendance_shifts',
    'attendance_shift_assignments',
    'employee_shift_assignments',
    'realtime_outbox',
    'notification_events',
    'employees',
    'leave_requests',
    'leave_balances',
    'leave_ledger_entries',
    'work_locations',
    'payslips',
    'approval_requests'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    -- Check if table exists in public schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Set REPLICA IDENTITY FULL so UPDATE/DELETE events contain full row payload
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
      
      -- Add table to publication if not already included
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. Grant schema usage and select permissions to authenticated and anon roles for Realtime CDC
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;

-- 4. Ensure RLS policies allow SELECT for Realtime CDC on biometric tables
DO $$
BEGIN
  -- Biometric Devices Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_devices') THEN
    ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access to biometric_devices for realtime" ON public.biometric_devices;
    CREATE POLICY "Allow read access to biometric_devices for realtime"
      ON public.biometric_devices
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  -- Biometric Punches Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_punches') THEN
    ALTER TABLE public.biometric_punches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access to biometric_punches for realtime" ON public.biometric_punches;
    CREATE POLICY "Allow read access to biometric_punches for realtime"
      ON public.biometric_punches
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  -- Biometric Gateway Agents Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_gateway_agents') THEN
    ALTER TABLE public.biometric_gateway_agents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access to biometric_gateway_agents for realtime" ON public.biometric_gateway_agents;
    CREATE POLICY "Allow read access to biometric_gateway_agents for realtime"
      ON public.biometric_gateway_agents
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  -- Realtime Outbox Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'realtime_outbox') THEN
    ALTER TABLE public.realtime_outbox ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow read access to realtime_outbox for realtime" ON public.realtime_outbox;
    CREATE POLICY "Allow read access to realtime_outbox for realtime"
      ON public.realtime_outbox
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
