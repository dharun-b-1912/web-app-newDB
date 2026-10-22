-- supabase/migrations/20261016_attendance_report_schedules.sql
-- ============================================================================
-- Enterprise Attendance MIS Report Database Storage & Schedule Management
-- Replaces localStorage with persistent PostgreSQL storage and Edge Function integration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '0c621892-e938-4707-9957-13534ea32c19'::uuid,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule_mode VARCHAR(32) NOT NULL DEFAULT 'TWICE_DAILY',
    morning_enabled BOOLEAN NOT NULL DEFAULT true,
    morning_time VARCHAR(10) NOT NULL DEFAULT '10:30',
    evening_enabled BOOLEAN NOT NULL DEFAULT true,
    evening_time VARCHAR(10) NOT NULL DEFAULT '19:00',
    frequency VARCHAR(32) NOT NULL DEFAULT 'DAILY',
    recipients JSONB NOT NULL DEFAULT '["hr@joycorporatesolutions.com", "marimuthu@joycorporatesolutions.com"]'::jsonb,
    cc VARCHAR(255) DEFAULT '',
    attach_excel BOOLEAN NOT NULL DEFAULT true,
    attach_csv BOOLEAN NOT NULL DEFAULT true,
    include_punches BOOLEAN NOT NULL DEFAULT true,
    include_shift_breakdown BOOLEAN NOT NULL DEFAULT true,
    custom_note TEXT DEFAULT 'Daily workforce attendance audit & biometric punch verification report.',
    last_morning_run_at TIMESTAMPTZ,
    last_morning_status VARCHAR(32),
    last_morning_message TEXT,
    last_evening_run_at TIMESTAMPTZ,
    last_evening_status VARCHAR(32),
    last_evening_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_report_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '0c621892-e938-4707-9957-13534ea32c19'::uuid,
    slot VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    mode VARCHAR(32) NOT NULL,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    headcount INT NOT NULL DEFAULT 0,
    message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_report_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_report_schedules' AND policyname = 'allow_all_attendance_report_schedules') THEN
        CREATE POLICY allow_all_attendance_report_schedules ON public.attendance_report_schedules FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_report_logs' AND policyname = 'allow_all_attendance_report_logs') THEN
        CREATE POLICY allow_all_attendance_report_logs ON public.attendance_report_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
END $$;

INSERT INTO public.attendance_report_schedules (
    organization_id, enabled, morning_time, evening_time, recipients
) VALUES (
    '0c621892-e938-4707-9957-13534ea32c19'::uuid, true, '10:30', '19:00', '["hr@joycorporatesolutions.com", "marimuthu@joycorporatesolutions.com"]'::jsonb
) ON CONFLICT DO NOTHING;
