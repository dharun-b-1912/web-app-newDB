-- ============================================================================
-- Migration: 20260820_041_shifts_rosters_policies_multitenant_schema.sql
-- Description: Enterprise Multi-Tenant Shift Master, Date-Specific Rosters,
--              Versioned Policies, Normalized Punches, and Attendance Ledger
-- ============================================================================

-- 1. SHIFT MASTER
CREATE TABLE IF NOT EXISTS public.attendance_shifts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  shift_code TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  description TEXT,
  shift_type TEXT NOT NULL DEFAULT 'FIXED',
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  scheduled_duration_minutes INTEGER NOT NULL DEFAULT 540,
  net_working_minutes INTEGER NOT NULL DEFAULT 480,
  cross_midnight BOOLEAN NOT NULL DEFAULT false,
  attendance_date_cutoff TEXT NOT NULL DEFAULT '06:00',
  grace_in_minutes INTEGER NOT NULL DEFAULT 15,
  grace_out_minutes INTEGER NOT NULL DEFAULT 15,
  early_out_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
  late_threshold_minutes INTEGER NOT NULL DEFAULT 30,
  min_hours_full_day NUMERIC NOT NULL DEFAULT 8,
  min_hours_half_day NUMERIC NOT NULL DEFAULT 4,
  break_mode TEXT NOT NULL DEFAULT 'FIXED',
  breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ot_enabled BOOLEAN NOT NULL DEFAULT true,
  min_ot_threshold_minutes INTEGER NOT NULL DEFAULT 30,
  weekday_ot_rate NUMERIC NOT NULL DEFAULT 1.0,
  weekly_off_ot_rate NUMERIC NOT NULL DEFAULT 1.5,
  holiday_ot_rate NUMERIC NOT NULL DEFAULT 2.0,
  max_ot_daily_minutes INTEGER DEFAULT 240,
  requires_manager_approval BOOLEAN NOT NULL DEFAULT true,
  requires_hr_approval BOOLEAN NOT NULL DEFAULT false,
  applies_to JSONB NOT NULL DEFAULT '{"type":"ORGANIZATION","ids":[]}'::jsonb,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_shifts_org_code ON public.attendance_shifts(organization_id, shift_code);
CREATE INDEX IF NOT EXISTS idx_attendance_shifts_org_status ON public.attendance_shifts(organization_id, status);

-- 2. EMPLOYEE SHIFT ROSTER ENTRIES
CREATE TABLE IF NOT EXISTS public.attendance_roster_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_code TEXT,
  employee_name TEXT,
  department_name TEXT,
  location_name TEXT,
  date DATE NOT NULL,
  shift_id TEXT NOT NULL,
  shift_code TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'FIXED',
  is_weekly_off BOOLEAN NOT NULL DEFAULT false,
  is_holiday BOOLEAN NOT NULL DEFAULT false,
  is_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_roster_emp_date ON public.attendance_roster_entries(organization_id, employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_roster_org_date ON public.attendance_roster_entries(organization_id, date);

-- 3. VERSIONED ATTENDANCE POLICIES
CREATE TABLE IF NOT EXISTS public.attendance_policies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  policy_code TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  general_rules JSONB NOT NULL DEFAULT '{"full_day_hours":8,"half_day_hours":4,"absent_threshold_hours":4}'::jsonb,
  check_in_rules JSONB NOT NULL DEFAULT '{"grace_minutes":15,"late_threshold_minutes":30,"action_after_grace":"LATE"}'::jsonb,
  check_out_rules JSONB NOT NULL DEFAULT '{"early_checkout_grace_minutes":15,"action_before_allowed":"EARLY_OUT"}'::jsonb,
  break_rules JSONB NOT NULL DEFAULT '{"mode":"FIXED","default_break_minutes":60,"auto_deduct":true}'::jsonb,
  overtime_rules JSONB NOT NULL DEFAULT '{"enabled":true,"min_threshold_minutes":30,"weekday_rate":1.0,"weekly_off_rate":1.5,"holiday_rate":2.0,"max_daily_minutes":240,"requires_approval":true}'::jsonb,
  late_deduction_rules JSONB NOT NULL DEFAULT '{"late_count_trigger":3,"deduction_amount_days":0.5,"reset_period":"MONTHLY"}'::jsonb,
  missing_punch_rules JSONB NOT NULL DEFAULT '{"auto_exception":true,"default_penalty":"REGULARIZATION_REQUIRED"}'::jsonb,
  night_shift_rules JSONB NOT NULL DEFAULT '{"cutoff_hour":6}'::jsonb,
  applies_to JSONB NOT NULL DEFAULT '{"type":"ORGANIZATION","ids":[]}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_policies_org_code ON public.attendance_policies(organization_id, policy_code);
CREATE INDEX IF NOT EXISTS idx_attendance_policies_org_status ON public.attendance_policies(organization_id, status);

-- 4. NORMALIZED PUNCHES (IMMUTABLE LAYER)
CREATE TABLE IF NOT EXISTS public.attendance_normalized_punches (
  id TEXT PRIMARY KEY,
  raw_punch_id TEXT,
  organization_id TEXT NOT NULL,
  device_id TEXT,
  device_serial TEXT,
  employee_id TEXT NOT NULL,
  employee_code TEXT,
  employee_name TEXT,
  punch_timestamp TIMESTAMPTZ NOT NULL,
  punch_date DATE NOT NULL,
  punch_time_str TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'IN',
  source TEXT NOT NULL DEFAULT 'BIOMETRIC',
  verification_mode TEXT NOT NULL DEFAULT 'Fingerprint',
  is_deduplicated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_normalized_punches_emp_date ON public.attendance_normalized_punches(organization_id, employee_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_normalized_punches_org_time ON public.attendance_normalized_punches(organization_id, punch_timestamp DESC);

-- 5. ATTENDANCE DAILY LEDGER (9-STATE LIFECYCLE & EXPLAINABILITY)
CREATE TABLE IF NOT EXISTS public.attendance_daily_ledger (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_code TEXT,
  employee_name TEXT,
  department TEXT,
  location TEXT,
  attendance_date DATE NOT NULL,
  roster_id TEXT,
  shift_id TEXT NOT NULL,
  shift_code TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_code TEXT NOT NULL,
  policy_version INTEGER NOT NULL DEFAULT 1,
  lifecycle_status TEXT NOT NULL DEFAULT 'CALCULATED',
  status TEXT NOT NULL DEFAULT 'Present',
  exception_type TEXT NOT NULL DEFAULT 'NONE',
  exception_reason TEXT,
  first_in TEXT,
  last_out TEXT,
  gross_minutes INTEGER NOT NULL DEFAULT 0,
  net_minutes INTEGER NOT NULL DEFAULT 0,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  early_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  regularization_id TEXT,
  regularization_reason TEXT,
  calculation_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_ledger_emp_date ON public.attendance_daily_ledger(organization_id, employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_ledger_org_status ON public.attendance_daily_ledger(organization_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_attendance_ledger_org_date ON public.attendance_daily_ledger(organization_id, attendance_date);

-- 6. POLICY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.attendance_policy_audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_audit_org_time ON public.attendance_policy_audit_logs(organization_id, timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_normalized_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policy_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. Shifts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_shifts' AND tablename = 'attendance_shifts') THEN
    CREATE POLICY tenant_isolation_shifts ON public.attendance_shifts
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;

  -- 2. Rosters
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_rosters' AND tablename = 'attendance_roster_entries') THEN
    CREATE POLICY tenant_isolation_rosters ON public.attendance_roster_entries
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;

  -- 3. Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policies' AND tablename = 'attendance_policies') THEN
    CREATE POLICY tenant_isolation_policies ON public.attendance_policies
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;

  -- 4. Punches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_normalized_punches' AND tablename = 'attendance_normalized_punches') THEN
    CREATE POLICY tenant_isolation_normalized_punches ON public.attendance_normalized_punches
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;

  -- 5. Ledger
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_ledger' AND tablename = 'attendance_daily_ledger') THEN
    CREATE POLICY tenant_isolation_ledger ON public.attendance_daily_ledger
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;

  -- 6. Audit Logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_policy_audit' AND tablename = 'attendance_policy_audit_logs') THEN
    CREATE POLICY tenant_isolation_policy_audit ON public.attendance_policy_audit_logs
      FOR ALL
      USING (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'))
      WITH CHECK (organization_id = COALESCE(current_setting('app.current_organization_id', true), 'org-joy-01'));
  END IF;
END $$;
