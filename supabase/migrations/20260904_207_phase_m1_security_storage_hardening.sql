-- ============================================================================
-- JOY PeopleHR — Migration 20260904_207
-- Phase M.1 Security Definer Hardening & Supabase Storage Production Isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURITY DEFINER FUNCTION HARDENING
-- ----------------------------------------------------------------------------

-- 1.1 public.is_platform_admin()
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (
    (auth.jwt() ->> 'email') = 'superadmin@joypeoplehr.com'
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false)
    OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean, false)
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

-- 1.2 public.is_org_admin(p_org_id uuid)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT (
    public.is_platform_admin()
    OR (
      p_org_id IS NOT NULL AND EXISTS (
        SELECT 1 
        FROM public.user_profiles up
        JOIN public.user_roles ur ON ur.user_profile_id = up.id
        JOIN public.roles r ON ur.role_id = r.id
        WHERE up.auth_user_id = auth.uid()
          AND up.organization_id = p_org_id
          AND r.code IN ('COMPANY_ADMIN', 'HR_HEAD', 'SUPER_ADMIN')
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO service_role;

-- 1.3 public.get_active_user_org_id()
CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_org_id', true), '')::UUID,
    (NULLIF(auth.jwt() ->> 'organization_id', ''))::UUID,
    (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

REVOKE ALL ON FUNCTION public.get_active_user_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_user_org_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_user_org_id() TO service_role;

-- 1.4 public.get_active_user_employee_id()
CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    up.employee_id,
    (SELECT e.id FROM public.employees e WHERE e.user_id = up.id LIMIT 1)
  )
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_user_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_user_employee_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_user_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_user_employee_id() TO service_role;

-- 1.5 public.current_org_id()
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'organization_id', ''),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', ''),
    (SELECT organization_id::text FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.current_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_org_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO service_role;

-- 1.6 public.fn_prevent_employee_field_tampering()
CREATE OR REPLACE FUNCTION public.fn_prevent_employee_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF public.is_org_admin(OLD.organization_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify organization_id';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify company_id';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify user_id';
  END IF;

  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employee_code';
  END IF;

  IF NEW.employment_status IS DISTINCT FROM OLD.employment_status THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_status';
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify department_id';
  END IF;

  IF NEW.designation_id IS DISTINCT FROM OLD.designation_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify designation_id';
  END IF;

  IF NEW.reporting_manager_id IS DISTINCT FROM OLD.reporting_manager_id THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify reporting_manager_id';
  END IF;

  IF NEW.doj IS DISTINCT FROM OLD.doj THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify date of joining';
  END IF;

  IF NEW.employment_type IS DISTINCT FROM OLD.employment_type THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify employment_type';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_prevent_employee_field_tampering() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_prevent_employee_field_tampering() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prevent_employee_field_tampering() TO service_role;

-- 1.7 public.rls_auto_enable()
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated;


-- ----------------------------------------------------------------------------
-- 2. STORAGE BUCKET CREATION (CANONICAL PROJECT ONLY)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee_documents', 'employee_documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('employee-documents', 'employee-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];


-- ----------------------------------------------------------------------------
-- 3. STORAGE RLS HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_storage_object(p_bucket_id text, p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_auth_id uuid := auth.uid();
  v_caller_org_id uuid;
  v_caller_emp_id uuid;
  v_parts text[];
  v_target_org_id uuid;
  v_target_emp_id uuid;
BEGIN
  -- 1. Must be authenticated
  IF v_caller_auth_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Platform Admin has universal access
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  -- 3. Only apply logic to employee document buckets
  IF p_bucket_id NOT IN ('employee_documents', 'employee-documents', 'documents') THEN
    RETURN false;
  END IF;

  -- 4. Resolve caller identity
  SELECT up.organization_id, COALESCE(up.employee_id, e.id)
  INTO v_caller_org_id, v_caller_emp_id
  FROM public.user_profiles up
  LEFT JOIN public.employees e ON e.user_id = up.id
  WHERE up.auth_user_id = v_caller_auth_id
  LIMIT 1;

  v_parts := string_to_array(trim(leading '/' from p_object_name), '/');

  -- Format A: {organization_id}/{employee_id}/...
  IF array_length(v_parts, 1) >= 2 AND v_parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_org_id := v_parts[1]::uuid;
    
    -- If caller is Org Admin for this organization -> ALLOW
    IF public.is_org_admin(v_target_org_id) THEN
      RETURN true;
    END IF;

    -- If caller is Employee in this organization and employee_id matches -> ALLOW
    IF v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_target_emp_id := v_parts[2]::uuid;
      IF v_target_org_id = v_caller_org_id AND v_target_emp_id = v_caller_emp_id THEN
        RETURN true;
      END IF;
    END IF;

    RETURN false;
  END IF;

  -- Format B: employees/{employee_id}/... (Flutter app convention)
  IF array_length(v_parts, 1) >= 2 AND v_parts[1] = 'employees' THEN
    IF v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_target_emp_id := v_parts[2]::uuid;
      
      -- Self access
      IF v_target_emp_id = v_caller_emp_id THEN
        RETURN true;
      END IF;

      -- Org admin access
      SELECT e.organization_id INTO v_target_org_id FROM public.employees e WHERE e.id = v_target_emp_id;
      IF v_target_org_id IS NOT NULL AND public.is_org_admin(v_target_org_id) THEN
        RETURN true;
      END IF;
    END IF;

    RETURN false;
  END IF;

  -- Format C: tenants/{tenant_id}/... or tenant/{tenant_id}/organization/{org_id}/employee/{emp_id}/...
  IF array_length(v_parts, 1) >= 4 AND (v_parts[1] = 'tenant' OR v_parts[1] = 'tenants') THEN
    -- Look for organization ID and employee ID in path
    FOR i IN 1..array_length(v_parts, 1) LOOP
      IF v_parts[i] = 'organization' AND i + 1 <= array_length(v_parts, 1) AND v_parts[i+1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_target_org_id := v_parts[i+1]::uuid;
      END IF;
      IF (v_parts[i] = 'employee' OR v_parts[i] = 'employees' OR v_parts[i] = 'claims' OR v_parts[i] = 'services') AND i + 1 <= array_length(v_parts, 1) AND v_parts[i+1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_target_emp_id := v_parts[i+1]::uuid;
      END IF;
    END LOOP;

    IF v_target_org_id IS NOT NULL AND public.is_org_admin(v_target_org_id) THEN
      RETURN true;
    END IF;

    IF v_target_emp_id IS NOT NULL AND v_target_emp_id = v_caller_emp_id THEN
      RETURN true;
    END IF;

    RETURN false;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_storage_object(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_storage_object(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text, text) TO service_role;


-- ----------------------------------------------------------------------------
-- 4. STORAGE RLS POLICIES ON storage.objects
-- ----------------------------------------------------------------------------

-- Drop any old policies
DROP POLICY IF EXISTS "employee_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_delete" ON storage.objects;

-- SELECT policy (Read / Download / List / Signed URLs)
CREATE POLICY "employee_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name)
);

-- INSERT policy (Upload)
CREATE POLICY "employee_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_storage_object(bucket_id, name)
);

-- UPDATE policy
CREATE POLICY "employee_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name)
)
WITH CHECK (
  public.can_access_storage_object(bucket_id, name)
);

-- DELETE policy
CREATE POLICY "employee_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name)
);

-- Service role bypass is automatic in Supabase Storage, but grant explicit permissions
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.buckets TO service_role;
