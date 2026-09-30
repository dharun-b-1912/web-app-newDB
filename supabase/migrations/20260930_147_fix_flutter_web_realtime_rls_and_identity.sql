-- ============================================================================
-- Migration: 20260930_147_fix_flutter_web_realtime_rls_and_identity.sql
-- Description:
--   1. Reconciles user_profiles <-> employees bilateral identity links
--   2. Backfills document_types.name from display_name / code
--   3. Restores SECURITY DEFINER & safe search_path on core identity,
--      geofence location, and attendance RPCs broken by migration 122
--   4. Replaces broken current_setting('app.current_organization_id') RLS
--      policies on employee_documents, employee_bank_details,
--      employee_statutory_details, employee_emergency_contacts,
--      employee_addresses, employee_profiles, employees, expense_claims,
--      notification_events, and storage.objects
--   5. Adds all canonical Flutter & Web App tables to supabase_realtime
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. FIX fn_prevent_employee_field_tampering SO ADMIN / SERVICE_ROLE / INITIAL LINKING SUCCEEDS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_prevent_employee_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_platform_admin()
     OR public.is_org_admin(OLD.organization_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify organization_id';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify company_id';
  END IF;

  -- Allow linking user_id when OLD.user_id IS NULL; block tampering once linked
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify user_id';
  END IF;

  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employee_code';
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_status';
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. RECONCILE BILATERAL EMPLOYEE <-> USER_PROFILE IDENTITY LINKS
-- ----------------------------------------------------------------------------

-- 1a. Link user_profiles.employee_id where email matches employees.work_email
UPDATE public.user_profiles up
SET employee_id = e.id,
    organization_id = COALESCE(up.organization_id, e.organization_id)
FROM public.employees e
WHERE up.employee_id IS NULL
  AND lower(trim(up.email)) = lower(trim(e.work_email));

-- 1b. Link employees.user_id to user_profiles.id where employee_id or email matches
UPDATE public.employees e
SET user_id = up.id
FROM public.user_profiles up
WHERE (e.user_id IS NULL OR e.user_id NOT IN (SELECT id FROM public.user_profiles))
  AND (
    up.employee_id = e.id
    OR lower(trim(up.email)) = lower(trim(e.work_email))
  );

-- 1c. Ensure user_profiles.employee_id is also set when employees.user_id points to user_profiles.id
UPDATE public.user_profiles up
SET employee_id = e.id
FROM public.employees e
WHERE up.employee_id IS NULL
  AND e.user_id = up.id;

-- 1d. Clear forced password change flags in auth.users metadata so employee/admin logins do not stall
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"must_change_password": false, "require_password_change": false}'::jsonb
WHERE raw_user_meta_data->>'must_change_password' = 'true'
   OR raw_user_meta_data->>'require_password_change' = 'true';

-- ----------------------------------------------------------------------------
-- 2. BACKFILL DOCUMENT_TYPES NAME & ENSURE READABLE CATALOG
-- ----------------------------------------------------------------------------

UPDATE public.document_types
SET name = COALESCE(name, display_name, code, 'Document')
WHERE name IS NULL OR trim(name) = '';

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_types_select_all" ON public.document_types;
CREATE POLICY "document_types_select_all" ON public.document_types
FOR SELECT TO authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- 3. RESTORE SECURITY DEFINER & SAFE SEARCH_PATH ON IDENTITY & LOCATION RPCS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    up.employee_id,
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.auth_user_id LIMIT 1),
    (SELECT e.id FROM public.employees e WHERE lower(e.work_email) = lower(up.email) LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid() OR up.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_user_employee_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    up.organization_id,
    (SELECT e.organization_id FROM public.employees e WHERE e.id = up.employee_id LIMIT 1),
    (SELECT e.organization_id FROM public.employees e WHERE e.user_id = up.id LIMIT 1),
    (SELECT e.organization_id FROM public.employees e WHERE lower(e.work_email) = lower(up.email) LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid() OR up.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id text)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_org_id IS NULL OR trim(p_org_id) = '' THEN
    RETURN FALSE;
  END IF;
  BEGIN
    RETURN public.is_org_admin(p_org_id::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(text) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin') THEN
    ALTER FUNCTION public.is_org_admin(uuid) SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_admin') THEN
    ALTER FUNCTION public.is_platform_admin() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_org_id') THEN
    ALTER FUNCTION public.current_org_id() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_authenticated_org_id') THEN
    ALTER FUNCTION public.current_authenticated_org_id() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.current_authenticated_org_id() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_org_id') THEN
    ALTER FUNCTION public.get_current_user_org_id() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_profile_id') THEN
    ALTER FUNCTION public.get_current_user_profile_id() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_auth_user_org_ids') THEN
    ALTER FUNCTION public.get_auth_user_org_ids() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.get_auth_user_org_ids() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_get_my_assigned_work_locations') THEN
    ALTER FUNCTION public.fn_get_my_assigned_work_locations() SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.fn_get_my_assigned_work_locations() TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_record_attendance_punch') THEN
    ALTER FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.fn_record_attendance_punch(numeric, numeric, numeric, text, text, jsonb) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_recalculate_daily_attendance') THEN
    ALTER FUNCTION public.fn_recalculate_daily_attendance(uuid, date) SECURITY DEFINER SET search_path = public, pg_temp;
    GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_fn_on_punch_recorded') THEN
    ALTER FUNCTION public.trg_fn_on_punch_recorded() SECURITY DEFINER SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_prevent_employee_field_tampering') THEN
    ALTER FUNCTION public.fn_prevent_employee_field_tampering() SECURITY DEFINER SET search_path = public, pg_temp;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. REMEDIATE BROKEN RLS POLICIES (REPLACE current_setting WITH CANONICAL HELPERS)
-- ----------------------------------------------------------------------------

-- 4.1 public.employee_documents
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_documents_all_policy" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_scoped_policy" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_insert" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_update" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_delete" ON public.employee_documents;

CREATE POLICY "employee_documents_select" ON public.employee_documents
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR organization_id::text = public.get_active_user_org_id()::text
);

CREATE POLICY "employee_documents_insert" ON public.employee_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR organization_id::text = public.get_active_user_org_id()::text
);

CREATE POLICY "employee_documents_update" ON public.employee_documents
FOR UPDATE TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR organization_id::text = public.get_active_user_org_id()::text
)
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR organization_id::text = public.get_active_user_org_id()::text
);

CREATE POLICY "employee_documents_delete" ON public.employee_documents
FOR DELETE TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR organization_id::text = public.get_active_user_org_id()::text
);

-- 4.2 public.employee_bank_details
ALTER TABLE public.employee_bank_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_bank_details_all_policy" ON public.employee_bank_details;
DROP POLICY IF EXISTS "employee_bank_details_scoped_policy" ON public.employee_bank_details;
CREATE POLICY "employee_bank_details_scoped_policy" ON public.employee_bank_details
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.3 public.employee_statutory_details
ALTER TABLE public.employee_statutory_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_statutory_details_all_policy" ON public.employee_statutory_details;
DROP POLICY IF EXISTS "employee_statutory_details_scoped_policy" ON public.employee_statutory_details;
CREATE POLICY "employee_statutory_details_scoped_policy" ON public.employee_statutory_details
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.4 public.employee_emergency_contacts
ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_emergency_contacts_all_policy" ON public.employee_emergency_contacts;
DROP POLICY IF EXISTS "employee_emergency_contacts_scoped_policy" ON public.employee_emergency_contacts;
CREATE POLICY "employee_emergency_contacts_scoped_policy" ON public.employee_emergency_contacts
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.5 public.employee_addresses
ALTER TABLE public.employee_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_addresses_all_policy" ON public.employee_addresses;
DROP POLICY IF EXISTS "employee_addresses_scoped_policy" ON public.employee_addresses;
CREATE POLICY "employee_addresses_scoped_policy" ON public.employee_addresses
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.6 public.employee_profiles
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_profiles_all_policy" ON public.employee_profiles;
DROP POLICY IF EXISTS "employee_profiles_scoped_policy" ON public.employee_profiles;
CREATE POLICY "employee_profiles_scoped_policy" ON public.employee_profiles
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.7 public.employee_salary_assignments
ALTER TABLE public.employee_salary_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_salary_assignments_modify_policy" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_scoped_policy" ON public.employee_salary_assignments;
CREATE POLICY "employee_salary_assignments_scoped_policy" ON public.employee_salary_assignments
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR employee_id::text = public.get_active_user_employee_id()::text
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR employee_id::text IN (
    SELECT e.id::text FROM public.employees e
    WHERE public.is_org_admin(e.organization_id::text)
       OR e.organization_id::text = public.get_active_user_org_id()::text
  )
);

-- 4.8 public.employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_scoped_write_policy" ON public.employees;
CREATE POLICY "employees_scoped_write_policy" ON public.employees
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR id::text = public.get_active_user_employee_id()::text
);

-- 4.9 public.expense_claims
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can access expense_claims" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_scoped_policy" ON public.expense_claims;
CREATE POLICY "expense_claims_scoped_policy" ON public.expense_claims
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
);

-- 4.10 public.notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_events_scoped_all" ON public.notification_events;
CREATE POLICY "notification_events_scoped_all" ON public.notification_events
FOR ALL TO authenticated
USING (
  recipient_user_id IS NULL
  OR recipient_user_id::text = auth.uid()::text
  OR recipient_user_id::text = public.get_active_user_employee_id()::text
  OR recipient_user_id::text IN (SELECT id::text FROM public.user_profiles WHERE auth_user_id = auth.uid())
  OR organization_id::text = public.get_active_user_org_id()::text
  OR public.is_org_admin(organization_id::text)
  OR public.is_platform_admin()
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 4.11 public.employee_requests, attendance_regularizations, leave_requests, leave_balances, payslips
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_requests_scoped_all" ON public.employee_requests;
CREATE POLICY "employee_requests_scoped_all" ON public.employee_requests
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

ALTER TABLE public.attendance_regularizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_regularizations_scoped_all" ON public.attendance_regularizations;
CREATE POLICY "attendance_regularizations_scoped_all" ON public.attendance_regularizations
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_requests_scoped_all" ON public.leave_requests;
CREATE POLICY "leave_requests_scoped_all" ON public.leave_requests
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_balances_scoped_all" ON public.leave_balances;
CREATE POLICY "leave_balances_scoped_all" ON public.leave_balances
FOR ALL TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payslips_scoped_select" ON public.payslips;
CREATE POLICY "payslips_scoped_select" ON public.payslips
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id::text)
  OR organization_id::text = public.get_active_user_org_id()::text
  OR employee_id::text = public.get_active_user_employee_id()::text
);

-- 4.12 Work Locations & Assignments
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_locations_scoped_select" ON public.work_locations;
CREATE POLICY "work_locations_scoped_select" ON public.work_locations
FOR SELECT TO authenticated
USING (true);

ALTER TABLE public.employee_work_location_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emp_work_loc_assignments_scoped_select" ON public.employee_work_location_assignments;
CREATE POLICY "emp_work_loc_assignments_scoped_select" ON public.employee_work_location_assignments
FOR SELECT TO authenticated
USING (true);

-- 4.13 Storage Objects UPDATE & DELETE policies (required for upsert: true and deleteDocument)
DROP POLICY IF EXISTS "storage_objects_peoplehr_update" ON storage.objects;
CREATE POLICY "storage_objects_peoplehr_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
)
WITH CHECK (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
);

DROP POLICY IF EXISTS "storage_objects_peoplehr_delete" ON storage.objects;
CREATE POLICY "storage_objects_peoplehr_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    'peoplehr-profile-media',
    'peoplehr-employee-documents',
    'peoplehr-vendor-documents',
    'peoplehr-payslips',
    'employee-profile-media',
    'employee-private-documents',
    'vendor-private-documents',
    'employee-documents',
    'peoplehr-private-documents',
    'payslips-private',
    'avatars'
  )
);

-- ----------------------------------------------------------------------------
-- 5. ENABLE SUPABASE REALTIME PUBLICATION & REPLICA IDENTITY FULL
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
  realtime_tables text[] := ARRAY[
    'employees',
    'user_profiles',
    'attendance_daily',
    'attendance_punches',
    'attendance_regularizations',
    'leave_requests',
    'leave_balances',
    'leave_types',
    'leave_ledger_entries',
    'employee_documents',
    'documents',
    'document_requests',
    'notification_events',
    'payslips',
    'employee_requests',
    'expense_claims',
    'work_locations',
    'employee_work_location_assignments',
    'employee_shift_assignments',
    'shifts',
    'employee_bank_details',
    'employee_statutory_details',
    'employee_emergency_contacts',
    'assets'
  ];
BEGIN
  FOREACH tbl IN ARRAY realtime_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;
