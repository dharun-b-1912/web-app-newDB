-- ============================================================================
-- Migration: 20260904_206_phase_l_product_certification_remediation.sql
-- Description: Phase L — Fix attendance_punches self-insert for mobile & Web check-in
--              and ensure HR Head employee identity exists for approvals.
-- ============================================================================

-- 1. ATTENDANCE PUNCHES INSERT POLICY
-- Allow authenticated employees to record their own check-in/check-out punch,
-- while allowing org admins / platform admins to record punches for anyone.
DROP POLICY IF EXISTS "attendance_punches_insert" ON public.attendance_punches;

CREATE POLICY "attendance_punches_insert" ON public.attendance_punches
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR public.is_platform_admin()
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- 2. ENSURE HR HEAD EMPLOYEE RECORD FOR AUDIT & APPROVALS
DO $$
DECLARE
  v_auth_user_id UUID;
  v_profile_id UUID;
  v_org_id UUID := 'e539780b-df07-4b45-beaa-ccf1d2224be8';
  v_comp_id UUID := '5537b879-7299-48a4-bdfe-16e327a2d3d0';
  v_hr_emp_id UUID;
BEGIN
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = 'e2e.hrhead.1788509683332@joypeoplehr.com';
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Ensure user_profiles exists
    SELECT id INTO v_profile_id FROM public.user_profiles WHERE auth_user_id = v_auth_user_id;
    IF v_profile_id IS NULL THEN
      INSERT INTO public.user_profiles (auth_user_id, organization_id, email, first_name, last_name, role)
      VALUES (v_auth_user_id, v_org_id, 'e2e.hrhead.1788509683332@joypeoplehr.com', 'HR', 'Head', 'HR_ADMIN')
      RETURNING id INTO v_profile_id;
    END IF;

    -- Ensure employees row exists
    SELECT id INTO v_hr_emp_id FROM public.employees WHERE user_id = v_profile_id;
    IF v_hr_emp_id IS NULL THEN
      INSERT INTO public.employees (
        id, organization_id, company_id, user_id, employee_code, first_name, last_name, display_name, work_email, is_active
      ) VALUES (
        gen_random_uuid(), v_org_id, v_comp_id, v_profile_id, 'HR-HEAD-001', 'HR', 'Head', 'HR Head', 'e2e.hrhead.1788509683332@joypeoplehr.com', true
      );
    END IF;
  END IF;
END $$;
