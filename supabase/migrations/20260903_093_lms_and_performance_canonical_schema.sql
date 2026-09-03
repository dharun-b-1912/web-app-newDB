-- ============================================================================
-- Migration: 20260903_093_lms_and_performance_canonical_schema.sql
-- Description: Canonical multi-tenant schema for LMS & Performance modules
-- Enforces strict RLS tenant isolation using public.current_org_id()
-- Fully type-safe: Handles both UUID and TEXT tenant_id / organization_id
-- ============================================================================

-- 1. LMS COURSES
CREATE TABLE IF NOT EXISTS public.lms_courses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  organization_id TEXT,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  description TEXT,
  category TEXT DEFAULT 'General',
  subcategory TEXT,
  difficulty_level TEXT DEFAULT 'Beginner',
  course_type TEXT DEFAULT 'Online',
  delivery_method TEXT DEFAULT 'SelfPaced',
  duration_hours NUMERIC DEFAULT 1,
  training_hours NUMERIC DEFAULT 1,
  language TEXT DEFAULT 'English',
  trainer_name TEXT,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  assessment_required BOOLEAN DEFAULT true,
  certification_available BOOLEAN DEFAULT true,
  validity_months INTEGER DEFAULT 12,
  cost NUMERIC DEFAULT 0,
  max_participants INTEGER DEFAULT 100,
  status TEXT DEFAULT 'Published',
  is_mandatory BOOLEAN DEFAULT false,
  modules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created in an earlier migration
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_lms_courses_tenant ON public.lms_courses(tenant_id);

-- 2. LMS ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.lms_enrollments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  organization_id TEXT,
  course_id TEXT NOT NULL DEFAULT '',
  employee_id TEXT NOT NULL DEFAULT '',
  employee_name TEXT,
  status TEXT DEFAULT 'Enrolled', -- Enrolled, InProgress, Completed, Dropped
  progress_percent NUMERIC DEFAULT 0,
  score NUMERIC DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lms_enrollments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.lms_enrollments ADD COLUMN IF NOT EXISTS organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_emp ON public.lms_enrollments(employee_id);

-- 3. PERFORMANCE GOALS
CREATE TABLE IF NOT EXISTS public.performance_goals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  organization_id TEXT,
  employee_id TEXT NOT NULL DEFAULT '',
  employee_name TEXT,
  department_name TEXT,
  team_name TEXT,
  manager_id TEXT,
  manager_name TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  goal_type TEXT DEFAULT 'Individual',
  start_date DATE,
  due_date DATE,
  priority TEXT DEFAULT 'Medium',
  weight NUMERIC DEFAULT 25,
  progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'InProgress', -- InProgress, Completed, Deferred, Cancelled
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Percentage',
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.performance_goals ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.performance_goals ADD COLUMN IF NOT EXISTS organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_perf_goals_emp ON public.performance_goals(employee_id);

-- 4. PERFORMANCE REVIEW CYCLES
CREATE TABLE IF NOT EXISTS public.performance_review_cycles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  organization_id TEXT,
  cycle_name TEXT NOT NULL DEFAULT '',
  cycle_type TEXT DEFAULT 'Annual', -- Annual, HalfYearly, Quarterly
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'Active', -- Draft, Active, Closed, Cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.performance_review_cycles ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.performance_review_cycles ADD COLUMN IF NOT EXISTS organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_perf_cycles_tenant ON public.performance_review_cycles(tenant_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY & POLICIES
-- ============================================================================

ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_review_cycles ENABLE ROW LEVEL SECURITY;

-- LMS Courses Policies
DROP POLICY IF EXISTS "lms_courses_tenant_select" ON public.lms_courses;
CREATE POLICY "lms_courses_tenant_select" ON public.lms_courses
  FOR SELECT TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "lms_courses_tenant_modify" ON public.lms_courses;
CREATE POLICY "lms_courses_tenant_modify" ON public.lms_courses
  FOR ALL TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

-- LMS Enrollments Policies
DROP POLICY IF EXISTS "lms_enrollments_tenant_select" ON public.lms_enrollments;
CREATE POLICY "lms_enrollments_tenant_select" ON public.lms_enrollments
  FOR SELECT TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "lms_enrollments_tenant_modify" ON public.lms_enrollments;
CREATE POLICY "lms_enrollments_tenant_modify" ON public.lms_enrollments
  FOR ALL TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

-- Performance Goals Policies
DROP POLICY IF EXISTS "perf_goals_tenant_select" ON public.performance_goals;
CREATE POLICY "perf_goals_tenant_select" ON public.performance_goals
  FOR SELECT TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "perf_goals_tenant_modify" ON public.performance_goals;
CREATE POLICY "perf_goals_tenant_modify" ON public.performance_goals
  FOR ALL TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

-- Performance Review Cycles Policies
DROP POLICY IF EXISTS "perf_cycles_tenant_select" ON public.performance_review_cycles;
CREATE POLICY "perf_cycles_tenant_select" ON public.performance_review_cycles
  FOR SELECT TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "perf_cycles_tenant_modify" ON public.performance_review_cycles;
CREATE POLICY "perf_cycles_tenant_modify" ON public.performance_review_cycles
  FOR ALL TO authenticated
  USING (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    COALESCE(organization_id::text, tenant_id::text) = public.current_org_id()
    OR public.is_platform_admin()
  );
