-- ============================================================================
-- JOY PeopleHR — Migration 20260907_300
-- Phase Storage Architecture Canonicalization: Multi-Tenant Secure Storage
-- employee-documents, employee-letters, employee-profile-pictures
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CANONICAL PRIVATE STORAGE BUCKETS
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('employee-documents', 'employee-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('employee-letters', 'employee-letters', false, 20971520, ARRAY['application/pdf']),
  ('employee-profile-pictures', 'employee-profile-pictures', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. STRICT STORAGE ACCESS VALIDATION FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_storage_object(
    p_bucket_id text,
    p_object_name text,
    p_operation text DEFAULT 'SELECT'
)
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
  v_clean_path text;
  v_target_org_id uuid;
  v_target_emp_id uuid;
  v_category text;
  v_op text := UPPER(COALESCE(p_operation, 'SELECT'));
BEGIN
  -- 1. Reject anonymous users
  IF v_caller_auth_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Platform Admin has universal access
  IF public.is_platform_admin() THEN
    RETURN true;
  END IF;

  -- 3. Restrict to canonical buckets
  IF p_bucket_id NOT IN ('employee-documents', 'employee-letters', 'employee-profile-pictures', 'employee_documents') THEN
    RETURN false;
  END IF;

  -- 4. Path safety: reject null/empty or path traversal attempts
  IF p_object_name IS NULL OR length(trim(p_object_name)) = 0 THEN
    RETURN false;
  END IF;

  IF p_object_name LIKE '%..%' OR p_object_name LIKE '%\%' THEN
    RETURN false;
  END IF;

  v_clean_path := trim(both '/' from p_object_name);
  v_parts := string_to_array(v_clean_path, '/');

  -- Canonical Path format: <org_uuid>/<emp_uuid>/<category>/<file_name>
  -- Total segments must be exactly 4
  IF array_length(v_parts, 1) != 4 THEN
    RETURN false;
  END IF;

  -- Validate UUID formats using regex
  IF NOT (v_parts[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN false;
  END IF;

  IF NOT (v_parts[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN false;
  END IF;

  v_target_org_id := v_parts[1]::uuid;
  v_target_emp_id := v_parts[2]::uuid;
  v_category := lower(v_parts[3]);

  -- Category validation according to bucket
  IF p_bucket_id = 'employee-documents' OR p_bucket_id = 'employee_documents' THEN
    IF v_category != 'documents' THEN
      RETURN false;
    END IF;
  ELSIF p_bucket_id = 'employee-letters' THEN
    IF v_category != 'letters' THEN
      RETURN false;
    END IF;
  ELSIF p_bucket_id = 'employee-profile-pictures' THEN
    IF v_category != 'profile' THEN
      RETURN false;
    END IF;
  ELSE
    RETURN false;
  END IF;

  -- 5. Resolve caller identity
  SELECT up.organization_id, COALESCE(up.employee_id, e.id)
  INTO v_caller_org_id, v_caller_emp_id
  FROM public.user_profiles up
  LEFT JOIN public.employees e ON e.user_id = up.id
  WHERE up.auth_user_id = v_caller_auth_id
  LIMIT 1;

  IF v_caller_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- 6. Org Admin Authorization: Caller is Admin in target organization
  IF public.is_org_admin(v_target_org_id) THEN
    -- Admin can only operate within their own organization
    IF v_caller_org_id = v_target_org_id THEN
      RETURN true;
    END IF;
  END IF;

  -- 7. Employee Authorization
  IF v_caller_org_id = v_target_org_id AND v_caller_emp_id IS NOT NULL AND v_caller_emp_id = v_target_emp_id THEN
    -- A. Employee Documents: Employee can SELECT, INSERT, UPDATE, DELETE own files
    IF p_bucket_id = 'employee-documents' OR p_bucket_id = 'employee_documents' THEN
      RETURN true;
    END IF;

    -- B. Employee Profile Pictures: Employee can SELECT, INSERT, UPDATE, DELETE own avatar
    IF p_bucket_id = 'employee-profile-pictures' THEN
      RETURN true;
    END IF;

    -- C. Employee Letters: Employee can ONLY SELECT (Read/Download) official letters.
    -- Employees are strictly DENIED INSERT, UPDATE, DELETE on official HR letters.
    IF p_bucket_id = 'employee-letters' THEN
      IF v_op = 'SELECT' THEN
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- All other requests denied
  RETURN false;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_storage_object(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_storage_object(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text, text, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. STORAGE RLS POLICIES ON storage.objects
-- ----------------------------------------------------------------------------

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_objects_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_delete" ON storage.objects;

-- SELECT policy (Read / Download / List / Signed URLs)
CREATE POLICY "storage_objects_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name, 'SELECT')
);

-- INSERT policy (Upload)
CREATE POLICY "storage_objects_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_storage_object(bucket_id, name, 'INSERT')
);

-- UPDATE policy
CREATE POLICY "storage_objects_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name, 'UPDATE')
)
WITH CHECK (
  public.can_access_storage_object(bucket_id, name, 'UPDATE')
);

-- DELETE policy
CREATE POLICY "storage_objects_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  public.can_access_storage_object(bucket_id, name, 'DELETE')
);

-- ----------------------------------------------------------------------------
-- 4. DIGITAL LETTER IMMUTABILITY & PROTECTION TRIGGER ON employee_documents
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_protect_employee_digital_letters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Platform Admin and Org Admin can manage all records
  IF public.is_platform_admin() OR (TG_OP != 'DELETE' AND public.is_org_admin(NEW.organization_id::uuid)) OR (TG_OP = 'DELETE' AND public.is_org_admin(OLD.organization_id::uuid)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For regular employees:
  -- 1. Disallow deleting official digital letters
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_digital_letter = true OR OLD.storage_bucket = 'employee-letters' THEN
      RAISE EXCEPTION 'Access Denied: Official employee letters cannot be deleted by employees.';
    END IF;
    RETURN OLD;
  END IF;

  -- 2. Disallow inserting official digital letters
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_digital_letter = true OR NEW.storage_bucket = 'employee-letters' OR NEW.letter_type IS NOT NULL THEN
      RAISE EXCEPTION 'Access Denied: Official employee letters can only be issued by authorized HR Administrators.';
    END IF;
    RETURN NEW;
  END IF;

  -- 3. Disallow updating official digital letters or converting docs into letters
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_digital_letter = true OR OLD.storage_bucket = 'employee-letters' THEN
      RAISE EXCEPTION 'Access Denied: Official employee letters cannot be modified by employees.';
    END IF;

    IF NEW.is_digital_letter = true OR NEW.storage_bucket = 'employee-letters' OR NEW.letter_type IS NOT NULL THEN
      RAISE EXCEPTION 'Access Denied: Cannot convert document to official letter.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_employee_digital_letters ON public.employee_documents;
CREATE TRIGGER trg_protect_employee_digital_letters
BEFORE INSERT OR UPDATE OR DELETE ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_employee_digital_letters();

-- ----------------------------------------------------------------------------
-- 5. SEED STANDARD DOCUMENT TYPES (IF MISSING)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  FOR v_org_id IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.document_types (organization_id, name, code, is_mandatory_for_onboarding, requires_verification)
    VALUES 
      (v_org_id, 'Aadhaar Card', 'AADHAAR', true, true),
      (v_org_id, 'PAN Card', 'PAN', true, true),
      (v_org_id, 'Passport', 'PASSPORT', false, true),
      (v_org_id, 'Driving License', 'DRIVING_LICENSE', false, true),
      (v_org_id, 'Educational Certificate', 'EDUCATION_CERTIFICATE', true, true),
      (v_org_id, 'Previous Experience Letter', 'EXPERIENCE_CERTIFICATE', false, true),
      (v_org_id, 'Official Appointment Letter', 'APPOINTMENT_LETTER', false, false),
      (v_org_id, 'Relieving & Experience Letter', 'RELIEVING_LETTER', false, false)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
