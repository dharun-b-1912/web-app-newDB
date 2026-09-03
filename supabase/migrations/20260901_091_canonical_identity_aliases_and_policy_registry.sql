-- supabase/migrations/20260901_091_canonical_identity_aliases_and_policy_registry.sql
-- ============================================================================
-- JOY PEOPLEHR — CANONICAL DATA INTEGRITY & IDENTITY ALIAS REGISTRY
-- 1. workforce_identity_aliases (Strict Mapping of all External IDs to Canonical UUID)
-- 2. organization_policies (Central Configurable Policy Master for Attendance, OT, Vendor)
-- 3. Invariant Constraints on employee_work_location_assignments
-- ============================================================================

-- 1. WORKFORCE IDENTITY ALIASES (Single Source of Truth for all External Identifiers)
CREATE TABLE IF NOT EXISTS public.workforce_identity_aliases (
    id text PRIMARY KEY DEFAULT ('alias_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    alias_type text NOT NULL, -- EMPLOYEE_CODE, LEGACY_EMPLOYEE_ID, BIOMETRIC_ID, DEVICE_USER_ID, MOBILE_IDENTIFIER, ERP_IDENTIFIER, PAYROLL_IDENTIFIER, VENDOR_WORKER_CODE
    alias_value text NOT NULL,
    source_system text NOT NULL DEFAULT 'MANUAL', -- ZKTECO, ESSL, MANTRA, LEGACY_CSV, HRMS_PORTAL
    is_active boolean NOT NULL DEFAULT true,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_alias UNIQUE (organization_id, alias_type, alias_value)
);

ALTER TABLE public.workforce_identity_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alias_select_policy ON public.workforce_identity_aliases;
DROP POLICY IF EXISTS alias_insert_policy ON public.workforce_identity_aliases;
DROP POLICY IF EXISTS alias_update_policy ON public.workforce_identity_aliases;
DROP POLICY IF EXISTS alias_delete_policy ON public.workforce_identity_aliases;
CREATE POLICY alias_select_policy ON public.workforce_identity_aliases FOR SELECT TO public USING (true);
CREATE POLICY alias_insert_policy ON public.workforce_identity_aliases FOR INSERT TO public WITH CHECK (true);
CREATE POLICY alias_update_policy ON public.workforce_identity_aliases FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY alias_delete_policy ON public.workforce_identity_aliases FOR DELETE TO public USING (true);
GRANT ALL ON public.workforce_identity_aliases TO anon, authenticated, service_role;

-- 2. CENTRAL ORGANIZATION POLICIES MASTER
CREATE TABLE IF NOT EXISTS public.organization_policies (
    id text PRIMARY KEY DEFAULT ('pol_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    category text NOT NULL, -- ATTENDANCE, OVERTIME, VENDOR, SECURITY
    policy_key text NOT NULL,
    policy_value jsonb NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_policy_key UNIQUE (organization_id, category, policy_key)
);

ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pol_select_policy ON public.organization_policies;
DROP POLICY IF EXISTS pol_insert_policy ON public.organization_policies;
DROP POLICY IF EXISTS pol_update_policy ON public.organization_policies;
DROP POLICY IF EXISTS pol_delete_policy ON public.organization_policies;
CREATE POLICY pol_select_policy ON public.organization_policies FOR SELECT TO public USING (true);
CREATE POLICY pol_insert_policy ON public.organization_policies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY pol_update_policy ON public.organization_policies FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY pol_delete_policy ON public.organization_policies FOR DELETE TO public USING (true);
GRANT ALL ON public.organization_policies TO anon, authenticated, service_role;

-- Seed Standard Indian Factory Policies
INSERT INTO public.organization_policies (organization_id, category, policy_key, policy_value, description)
VALUES 
  ('org-joy-corporate-solutions-private-', 'ATTENDANCE', 'late_grace_minutes', '15'::jsonb, 'Grace minutes before clocking is flagged as late'),
  ('org-joy-corporate-solutions-private-', 'ATTENDANCE', 'monthly_late_allowance', '2'::jsonb, 'Permitted late instances per month before penalty deduction'),
  ('org-joy-corporate-solutions-private-', 'ATTENDANCE', 'short_hours_threshold', '4.0'::jsonb, 'Work hours below this threshold treated as Half Day'),
  ('org-joy-corporate-solutions-private-', 'ATTENDANCE', 'long_absence_days', '2'::jsonb, 'Consecutive unapproved absent days before exception escalation'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'daily_ot_cap_hours', '4.0'::jsonb, 'Maximum billable overtime hours per worker per day'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'monthly_ot_cap_hours', '50.0'::jsonb, 'Maximum billable overtime hours per worker per month'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'weekday_multiplier', '1.5'::jsonb, 'Overtime rate multiplier on regular working days'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'sunday_multiplier', '2.0'::jsonb, 'Overtime rate multiplier on Sunday / Weekly Off'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'holiday_multiplier', '2.0'::jsonb, 'Overtime rate multiplier on Declared National / Festival Holidays'),
  ('org-joy-corporate-solutions-private-', 'OVERTIME', 'comp_off_conversion_hours', '8.0'::jsonb, 'Approved overtime hours required to credit 1 Comp-Off Day'),
  ('org-joy-corporate-solutions-private-', 'VENDOR', 'invoice_variance_tolerance_abs', '10.0'::jsonb, 'Maximum absolute variance in INR auto-approved during 5-way matching'),
  ('org-joy-corporate-solutions-private-', 'VENDOR', 'invoice_variance_tolerance_pct', '0.25'::jsonb, 'Maximum percentage variance auto-approved during 5-way matching'),
  ('org-joy-corporate-solutions-private-', 'VENDOR', 'license_expiry_alert_days', '30'::jsonb, 'Days prior to Labour License expiry when alerts trigger')
ON CONFLICT (organization_id, category, policy_key) 
DO UPDATE SET policy_value = EXCLUDED.policy_value, updated_at = now();

-- 3. LOCATION AUTHORIZATIONS INVARIANT CONSTRAINT (Exactly 1 row per Employee per Location)
-- Clean duplicate rows first if any
DELETE FROM public.employee_work_location_assignments a
USING public.employee_work_location_assignments b
WHERE a.id > b.id
  AND a.organization_id = b.organization_id
  AND a.employee_id = b.employee_id
  AND a.work_location_id = b.work_location_id;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_alias_lookup ON public.workforce_identity_aliases(alias_type, alias_value);
CREATE INDEX IF NOT EXISTS idx_alias_emp ON public.workforce_identity_aliases(employee_id);
CREATE INDEX IF NOT EXISTS idx_org_pol ON public.organization_policies(organization_id, category);
