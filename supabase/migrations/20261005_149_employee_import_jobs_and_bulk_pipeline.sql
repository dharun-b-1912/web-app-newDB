-- ============================================================================
-- Migration: 20261005_149_employee_import_jobs_and_bulk_pipeline.sql
-- Target: Joy PeopleHR Enterprise Workforce Management
-- Description: Table and RLS policies for Enterprise Employee Bulk Import Jobs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_code VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    successful_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN (
        'UPLOADED',
        'VALIDATING',
        'READY',
        'PROCESSING',
        'COMPLETED',
        'COMPLETED_WITH_ERRORS',
        'FAILED',
        'CANCELLED'
    )),
    error_summary JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast query by org, status, and code
CREATE INDEX IF NOT EXISTS idx_emp_import_jobs_org ON public.employee_import_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_emp_import_jobs_status ON public.employee_import_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_emp_import_jobs_code ON public.employee_import_jobs(import_code);

-- Enable Row Level Security
ALTER TABLE public.employee_import_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "employee_import_jobs_select_policy" ON public.employee_import_jobs;
DROP POLICY IF EXISTS "employee_import_jobs_insert_policy" ON public.employee_import_jobs;
DROP POLICY IF EXISTS "employee_import_jobs_update_policy" ON public.employee_import_jobs;

-- Policies:
-- SELECT: Admins or Users in the same Organization
CREATE POLICY "employee_import_jobs_select_policy" ON public.employee_import_jobs
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR (SELECT public.is_platform_admin())
);

-- INSERT: Only Org Admins (Company Admin, HR Head, Super Admin) or Platform Admin
CREATE POLICY "employee_import_jobs_insert_policy" ON public.employee_import_jobs
FOR INSERT TO authenticated
WITH CHECK (
    public.is_org_admin(organization_id)
);

-- UPDATE: Only Org Admins or Platform Admin
CREATE POLICY "employee_import_jobs_update_policy" ON public.employee_import_jobs
FOR UPDATE TO authenticated
USING (
    public.is_org_admin(organization_id)
)
WITH CHECK (
    public.is_org_admin(organization_id)
);

COMMENT ON TABLE public.employee_import_jobs IS 'Tracks batch enterprise employee import jobs, progress metrics, status lifecycle, and error summaries.';
