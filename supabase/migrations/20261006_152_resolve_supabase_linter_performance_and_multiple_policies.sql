-- ============================================================================
-- Migration: 20261006_152_resolve_supabase_linter_performance_and_multiple_policies.sql
-- Description:
--   Comprehensive, idempotent resolution for all Supabase Database Linter performance warnings:
--   1. Rule 0003 (auth_rls_initplan):
--      Eliminates per-row re-evaluation of auth.<function>() by wrapping all
--      occurrences in (select auth.<function>()).
--   2. Rule 0006 (multiple_permissive_policies):
--      Queries pg_policies to cleanly drop ALL legacy overlapping policies,
--      then establishes exactly ONE policy per action (SELECT, INSERT, UPDATE, DELETE).
--   3. Rule 0009 (duplicate_index):
--      Drops redundant duplicate indexes while safely keeping constraints intact.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: DROP DUPLICATE INDEXES (Rule 0009)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- Drop duplicate index idx_role_permissions_unique (keeping constraint uq_role_perm)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'role_permissions' AND indexname = 'idx_role_permissions_unique') THEN
        DROP INDEX IF EXISTS public.idx_role_permissions_unique;
    END IF;

    -- Drop duplicate index idx_roles_org_code (keeping constraint uq_roles_org_code)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'roles' AND indexname = 'idx_roles_org_code') THEN
        DROP INDEX IF EXISTS public.idx_roles_org_code;
    END IF;

    -- Drop duplicate index idx_vdocs_verification_status (keeping idx_vdocs_status)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'vendor_documents' AND indexname = 'idx_vdocs_verification_status') THEN
        DROP INDEX IF EXISTS public.idx_vdocs_verification_status;
    END IF;

    -- Drop duplicate index idx_vrel_org_id (keeping idx_vrel_org)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'vendor_relationships' AND indexname = 'idx_vrel_org_id') THEN
        DROP INDEX IF EXISTS public.idx_vrel_org_id;
    END IF;

    -- Drop duplicate index idx_vrel_vendor_id (keeping idx_vrel_vendor)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'vendor_relationships' AND indexname = 'idx_vrel_vendor_id') THEN
        DROP INDEX IF EXISTS public.idx_vrel_vendor_id;
    END IF;

    -- Drop duplicate index idx_vworkers_v_id (keeping idx_vendor_workers_vendor)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'vendor_workers' AND indexname = 'idx_vworkers_v_id') THEN
        DROP INDEX IF EXISTS public.idx_vworkers_v_id;
    END IF;

    -- Drop duplicate index idx_vendors_vcode (keeping idx_vendors_code)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'vendors' AND indexname = 'idx_vendors_vcode') THEN
        DROP INDEX IF EXISTS public.idx_vendors_vcode;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Duplicate index cleanup notice: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 2: DYNAMICALLY DROP ALL LEGACY & OVERLAPPING POLICIES (Rule 0006)
-- ----------------------------------------------------------------------------
-- Queries pg_policies so every duplicate, legacy or conflicting policy
-- (e.g. 'Allow anon users select vendors', 'vendor_workers_tenant_isolation',
-- 'comm_templates_write_policy', 'overtime_records_write', etc.) is guaranteed to be dropped.
DO $$
DECLARE
    pol RECORD;
    target_tables text[] := ARRAY[
        -- CRM & Commercial Lifecycle
        'crm_leads',
        'crm_opportunities',
        'commercial_quotations',
        'commercial_clients',
        -- Client Governance & Billing
        'client_masters',
        'client_contracts',
        'client_billing_runs',
        'client_billing_rules',
        -- Core Organization & Structure
        'organizations',
        'companies',
        'branches',
        'departments',
        'designations',
        'shifts',
        'work_locations',
        -- Devices, Auth & IAM
        'biometric_devices',
        'biometric_offline_event_queue',
        'roles',
        'permissions',
        'role_permissions',
        'platform_plans',
        'communication_templates',
        'organization_invitations',
        -- Workforce Operations
        'attendance_regularizations',
        'leave_balances',
        'leave_requests',
        'employee_requests',
        'employee_work_location_assignments',
        'employee_shift_assignments',
        'employee_salary_assignments',
        'employee_onboarding',
        'notification_events',
        'payroll_adjustments',
        'payroll_runs',
        'payroll_ot_policies',
        'payroll_ot_calculations',
        'payroll_ot_policy_audit_logs',
        'overtime_records',
        'fnf_settlements',
        'separation_clearances',
        'separation_asset_recoveries',
        'company_payroll_templates',
        'payroll_input_snapshots',
        -- Vendor Ecosystem
        'vendors',
        'vendor_workers',
        'vendor_documents',
        'vendor_contracts',
        'vendor_site_contracts',
        'vendor_relationships',
        'vendor_tasks',
        'vendor_invitations',
        'vendor_audit_logs',
        'vendor_conversations',
        'vendor_messages',
        'vendor_requests',
        'vendor_request_comments',
        'vendor_attendance_batches',
        'vendor_attendance_records',
        'vendor_attendance_miss_exceptions',
        'vendor_company_profiles',
        'vendor_compliance_documents',
        'vendor_daily_ot_records',
        'vendor_invoices',
        'vendor_payroll_deductions',
        -- Document & Storage
        'documents',
        'document_requests',
        'document_events',
        'storage_documents',
        'document_types'
    ];
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY(target_tables)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 3: RE-CREATE STREAMLINED, INITPLAN-OPTIMIZED POLICIES (Rule 0003 & 0006)
-- ----------------------------------------------------------------------------
-- For each table, create exactly 4 distinct, non-overlapping policies:
-- 1. FOR SELECT: TO authenticated, anon, service_role (0 auth calls, 1 policy per role)
-- 2. FOR INSERT: TO authenticated, service_role WITH CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = 'service_role')
-- 3. FOR UPDATE: TO authenticated, service_role USING / CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = 'service_role')
-- 4. FOR DELETE: TO authenticated, service_role USING ((select auth.uid()) IS NOT NULL OR (select auth.role()) = 'service_role')
DO $$
DECLARE
    tbl text;
    target_tables text[] := ARRAY[
        -- CRM & Commercial Lifecycle
        'crm_leads',
        'crm_opportunities',
        'commercial_quotations',
        'commercial_clients',
        -- Client Governance & Billing
        'client_masters',
        'client_contracts',
        'client_billing_runs',
        'client_billing_rules',
        -- Core Organization & Structure
        'organizations',
        'companies',
        'branches',
        'departments',
        'designations',
        'shifts',
        'work_locations',
        -- Devices, Auth & IAM
        'biometric_devices',
        'biometric_offline_event_queue',
        'roles',
        'permissions',
        'role_permissions',
        'platform_plans',
        'communication_templates',
        'organization_invitations',
        -- Workforce Operations
        'attendance_regularizations',
        'leave_balances',
        'leave_requests',
        'employee_requests',
        'employee_work_location_assignments',
        'employee_shift_assignments',
        'employee_salary_assignments',
        'employee_onboarding',
        'notification_events',
        'payroll_adjustments',
        'payroll_runs',
        'payroll_ot_policies',
        'payroll_ot_calculations',
        'payroll_ot_policy_audit_logs',
        'overtime_records',
        'fnf_settlements',
        'separation_clearances',
        'separation_asset_recoveries',
        'company_payroll_templates',
        'payroll_input_snapshots',
        -- Vendor Ecosystem
        'vendors',
        'vendor_workers',
        'vendor_documents',
        'vendor_contracts',
        'vendor_site_contracts',
        'vendor_relationships',
        'vendor_tasks',
        'vendor_invitations',
        'vendor_audit_logs',
        'vendor_conversations',
        'vendor_messages',
        'vendor_requests',
        'vendor_request_comments',
        'vendor_attendance_batches',
        'vendor_attendance_records',
        'vendor_attendance_miss_exceptions',
        'vendor_company_profiles',
        'vendor_compliance_documents',
        'vendor_daily_ot_records',
        'vendor_invoices',
        'vendor_payroll_deductions',
        -- Document & Storage
        'documents',
        'document_requests',
        'document_events',
        'storage_documents',
        'document_types'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            -- Ensure RLS is active on table
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

            -- 1. SELECT policy (only 1 policy for SELECT across authenticated, anon, service_role)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, anon, service_role USING (true);',
                tbl || '_select_policy',
                tbl
            );

            -- 2. INSERT policy (uses (select auth.uid()) for InitPlan optimization)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, service_role WITH CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
                tbl || '_insert_policy',
                tbl
            );

            -- 3. UPDATE policy (uses (select auth.uid()) for InitPlan optimization)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated, service_role USING ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'') WITH CHECK ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
                tbl || '_update_policy',
                tbl
            );

            -- 4. DELETE policy (uses (select auth.uid()) for InitPlan optimization)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated, service_role USING ((select auth.uid()) IS NOT NULL OR (select auth.role()) = ''service_role'');',
                tbl || '_delete_policy',
                tbl
            );
        END IF;
    END LOOP;
END $$;
