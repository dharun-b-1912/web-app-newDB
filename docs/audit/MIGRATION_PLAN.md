# JOY PeopleHR — Database Multi-Tenant Migration Plan

**Migration ID:** `20260911_109_enterprise_multitenant_hardening.sql`  
**Execution Type:** Idempotent, Schema-Aware, Explicit Type Casting, Zero Downtime  
**Status:** READY FOR PRODUCTION  

---

## Updated SQL Script

```sql
-- supabase/migrations/20260911_109_enterprise_multitenant_hardening.sql
-- 1. Helper function for authoritative organization resolution in RLS
CREATE OR REPLACE FUNCTION public.current_authenticated_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'organization_id')::TEXT,
    (auth.jwt() -> 'app_metadata' ->> 'organization_id')::TEXT,
    'org-joy-01'
  );
$$;

-- 2. Ensure composite indexes and unique constraints for idempotent biometric events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_events') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_events' AND column_name = 'device_user_id') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_events_idemp 
      ON public.attendance_events(organization_id, device_id, device_user_id, "timestamp");
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_attendance_events') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_biometric_events_idemp 
    ON public.biometric_attendance_events(tenant_id, device_id, device_user_id, punch_timestamp);
  END IF;
END $$;

-- 3. Ensure unique constraint on active payroll runs to prevent concurrent double calculation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payroll_runs' AND column_name = 'month') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payroll_runs' AND column_name = 'year') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_month_year 
      ON public.payroll_runs(organization_id, month, year);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payroll_runs' AND column_name = 'pay_period_id') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_runs_period 
      ON public.payroll_runs(organization_id, pay_period_id);
    END IF;
  END IF;
END $$;

-- 4. Enable RLS across all tenant business tables
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.biometric_device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_biometric_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payroll_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Standard Universal Tenant RLS Policies (SELECT, INSERT, UPDATE, DELETE)
DO $$
BEGIN
  -- Employees Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
    CREATE POLICY "tenant_isolation_employees" ON public.employees
      FOR ALL
      USING (organization_id::TEXT = public.current_authenticated_org_id())
      WITH CHECK (organization_id::TEXT = public.current_authenticated_org_id());
  END IF;

  -- Attendance Daily Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_daily') THEN
    DROP POLICY IF EXISTS "tenant_isolation_attendance_daily" ON public.attendance_daily;
    CREATE POLICY "tenant_isolation_attendance_daily" ON public.attendance_daily
      FOR ALL
      USING (organization_id::TEXT = public.current_authenticated_org_id())
      WITH CHECK (organization_id::TEXT = public.current_authenticated_org_id());
  END IF;

  -- Biometric Devices Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_devices') THEN
    DROP POLICY IF EXISTS "tenant_isolation_biometric_devices" ON public.biometric_devices;
    CREATE POLICY "tenant_isolation_biometric_devices" ON public.biometric_devices
      FOR ALL
      USING (organization_id::TEXT = public.current_authenticated_org_id())
      WITH CHECK (organization_id::TEXT = public.current_authenticated_org_id());
  END IF;

  -- Payroll Runs Policy
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs') THEN
    DROP POLICY IF EXISTS "tenant_isolation_payroll_runs" ON public.payroll_runs;
    CREATE POLICY "tenant_isolation_payroll_runs" ON public.payroll_runs
      FOR ALL
      USING (organization_id::TEXT = public.current_authenticated_org_id())
      WITH CHECK (organization_id::TEXT = public.current_authenticated_org_id());
  END IF;
END $$;
```
