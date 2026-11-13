-- Migration: 20261112_177_fix_employee_codes_roles_memberships.sql
-- Purpose:
--   1. Fix Hariharan T's corrupted UUID employee_code -> sequential corporate code JCS-028
--      in both public.employees and auth.users.raw_user_meta_data.
--   2. Backfill missing foreign links between public.user_profiles.employee_id and
--      public.employees.user_id.
--   3. Normalize roles across public.user_profiles.role, public.user_roles, and
--      public.organization_memberships so every employee has an explicit verified role
--      (EMPLOYEE / HR_HEAD / COMPANY_ADMIN) and active organization membership.
--   4. Add a CHECK constraint preventing UUID-shaped values from ever being saved in
--      public.employees.employee_code.

BEGIN;

-- 1. Fix Hariharan T (or any employee whose employee_code was accidentally set to a UUID)
DO $$
DECLARE
  v_hari_emp_id uuid := 'f0abe178-0869-4bd7-852e-410ebc91eca4';
  v_hari_auth_id uuid := '46114b18-a2cc-4281-b9eb-689d53b39319';
  v_org_id uuid := '0c621892-e938-4707-9957-13534ea32c19';
  v_target_code text := 'JCS-028';
  v_code_taken boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE organization_id = v_org_id
      AND upper(employee_code) = upper(v_target_code)
      AND id <> v_hari_emp_id
  ) INTO v_code_taken;

  IF NOT v_code_taken THEN
    UPDATE public.employees
    SET employee_code = v_target_code,
        updated_at = now()
    WHERE id = v_hari_emp_id
      AND employee_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('employee_code', v_target_code),
        updated_at = now()
    WHERE id = v_hari_auth_id;
  END IF;
END $$;

-- 2. Backfill missing user_profiles.employee_id links from matching employee rows
UPDATE public.user_profiles up
SET employee_id = e.id,
    updated_at = now()
FROM public.employees e
WHERE up.employee_id IS NULL
  AND up.organization_id = e.organization_id
  AND (
    e.user_id = up.id
    OR (e.work_email IS NOT NULL AND up.email IS NOT NULL AND lower(e.work_email) = lower(up.email))
  );

-- 3. Backfill missing employees.user_id links from matching employee user_profiles
-- Prefer profiles already pointing to the employee; avoid overwriting with duplicate admin profiles if a dedicated employee profile exists.
UPDATE public.employees e
SET user_id = picked.profile_id,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (up.employee_id)
    up.employee_id,
    up.id AS profile_id
  FROM public.user_profiles up
  JOIN public.employees emp ON emp.id = up.employee_id
  WHERE emp.user_id IS NULL
  ORDER BY
    up.employee_id,
    CASE WHEN emp.work_email IS NOT NULL AND lower(up.email) = lower(emp.work_email) THEN 0 ELSE 1 END,
    up.created_at ASC
) picked
WHERE e.id = picked.employee_id
  AND e.user_id IS NULL;

-- 4. Backfill missing user_roles for active user_profiles (strictly honors explicit profile role or defaults to EMPLOYEE)
INSERT INTO public.user_roles (user_profile_id, organization_id, role_id)
SELECT
  up.id,
  up.organization_id,
  r.id
FROM public.user_profiles up
JOIN public.roles r
  ON r.organization_id = up.organization_id
 AND upper(r.code) = CASE
   WHEN upper(COALESCE(NULLIF(trim(up.role), ''), 'EMPLOYEE')) IN ('COMPANY_ADMIN', 'ORGANIZATION_ADMIN', 'HR_HEAD', 'HR_ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE')
     THEN upper(COALESCE(NULLIF(trim(up.role), ''), 'EMPLOYEE'))
   ELSE 'EMPLOYEE'
 END
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_profile_id = up.id
)
ON CONFLICT ON CONSTRAINT uq_user_roles DO NOTHING;

-- 5. Synchronize public.user_profiles.role from authoritative user_roles -> roles.code where blank/null
UPDATE public.user_profiles up
SET role = resolved.role_code,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (ur.user_profile_id)
    ur.user_profile_id,
    upper(r.code) AS role_code
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  ORDER BY
    ur.user_profile_id,
    CASE upper(r.code)
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ORGANIZATION_ADMIN' THEN 2
      WHEN 'COMPANY_ADMIN' THEN 3
      WHEN 'HR_HEAD' THEN 4
      WHEN 'HR_ADMIN' THEN 5
      WHEN 'MANAGER' THEN 6
      WHEN 'TEAM_LEAD' THEN 7
      ELSE 8
    END ASC
) resolved
WHERE up.id = resolved.user_profile_id
  AND (up.role IS NULL OR trim(up.role) = '' OR upper(trim(up.role)) <> resolved.role_code);

-- 6. Ensure unique constraint exists on organization_memberships (user_id, organization_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.organization_memberships'::regclass
      AND conname = 'uq_org_memberships_user_org'
  ) THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT uq_org_memberships_user_org UNIQUE (user_id, organization_id);
  END IF;
EXCEPTION WHEN duplicate_table OR duplicate_object THEN
  NULL;
END $$;

-- 7. Backfill active organization_memberships for all user_profiles
INSERT INTO public.organization_memberships (
  user_id,
  organization_id,
  role_id,
  role_code,
  status,
  is_default,
  activated_at
)
SELECT
  up.id,
  up.organization_id,
  r.id,
  upper(r.code),
  'Active',
  true,
  now()
FROM public.user_profiles up
JOIN LATERAL (
  SELECT r_inner.id, r_inner.code
  FROM public.user_roles ur
  JOIN public.roles r_inner ON r_inner.id = ur.role_id
  WHERE ur.user_profile_id = up.id
  ORDER BY
    CASE upper(r_inner.code)
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ORGANIZATION_ADMIN' THEN 2
      WHEN 'COMPANY_ADMIN' THEN 3
      WHEN 'HR_HEAD' THEN 4
      WHEN 'HR_ADMIN' THEN 5
      WHEN 'MANAGER' THEN 6
      WHEN 'TEAM_LEAD' THEN 7
      ELSE 8
    END ASC
  LIMIT 1
) r ON true
WHERE up.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = up.id
      AND om.organization_id = up.organization_id
  );

-- 8. Guard: Reject any future UUID values stored as employee_code
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS chk_employees_code_not_uuid;

ALTER TABLE public.employees
  ADD CONSTRAINT chk_employees_code_not_uuid
  CHECK (employee_code !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

COMMIT;

