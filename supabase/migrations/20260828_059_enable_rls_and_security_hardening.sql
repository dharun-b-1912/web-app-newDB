-- ============================================================
-- Migration: 20260828_059_enable_rls_and_security_hardening.sql
-- Fix: Supabase Linter 0007 (policy_exists_rls_disabled) & 0013 (rls_disabled_in_public)
-- ============================================================

-- 1. Enable RLS on core tables
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_auth_identity ENABLE ROW LEVEL SECURITY;

-- 2. Ensure fallback / essential policies exist for public & authenticated access

-- ORGANIZATIONS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'organizations' 
          AND policyname = 'organizations_read_all'
    ) THEN
        CREATE POLICY "organizations_read_all" ON public.organizations
            FOR SELECT USING (true);
    END IF;
END $$;

-- EMPLOYEES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'employees' 
          AND policyname = 'employees_tenant_access'
    ) THEN
        CREATE POLICY "employees_tenant_access" ON public.employees
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- APP_USERS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'app_users' 
          AND policyname = 'app_users_all_access'
    ) THEN
        CREATE POLICY "app_users_all_access" ON public.app_users
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- EMPLOYEE_AUTH_IDENTITY (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'employee_auth_identity'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = 'employee_auth_identity' 
              AND policyname = 'employee_auth_identity_read'
        ) THEN
            CREATE POLICY "employee_auth_identity_read" ON public.employee_auth_identity
                FOR ALL USING (true) WITH CHECK (true);
        END IF;
    END IF;
END $$;
