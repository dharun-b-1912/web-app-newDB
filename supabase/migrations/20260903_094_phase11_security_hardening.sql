-- ============================================================================
-- Migration: 20260903_094_phase11_security_hardening.sql
-- Description: Phase 11 Pass 2 Security & RLS Hardening (Auxiliary Masters)
-- Scope: Remediate permissive open policies on auxiliary operational tables:
--   1. public.notification_templates_master
--   2. public.vendor_5way_reconciliations
--   3. public.organization_policies
-- Standards: Strict tenant isolation via organization_id = public.current_org_id()
-- Backward Compatibility: Preserves service_role and platform_admin access.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notification_templates_master RLS Hardening
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notification_templates_master'
    ) THEN
        ALTER TABLE public.notification_templates_master ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS ntpl_select_policy ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_insert_policy ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_update_policy ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_delete_policy ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_tenant_select ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_tenant_insert ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_tenant_update ON public.notification_templates_master;
        DROP POLICY IF EXISTS ntpl_tenant_delete ON public.notification_templates_master;

        CREATE POLICY ntpl_tenant_select ON public.notification_templates_master
            FOR SELECT TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY ntpl_tenant_insert ON public.notification_templates_master
            FOR INSERT TO authenticated
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY ntpl_tenant_update ON public.notification_templates_master
            FOR UPDATE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            )
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY ntpl_tenant_delete ON public.notification_templates_master
            FOR DELETE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. vendor_5way_reconciliations RLS Hardening
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vendor_5way_reconciliations'
    ) THEN
        ALTER TABLE public.vendor_5way_reconciliations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS vrec_select_policy ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_insert_policy ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_update_policy ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_delete_policy ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_tenant_select ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_tenant_insert ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_tenant_update ON public.vendor_5way_reconciliations;
        DROP POLICY IF EXISTS vrec_tenant_delete ON public.vendor_5way_reconciliations;

        CREATE POLICY vrec_tenant_select ON public.vendor_5way_reconciliations
            FOR SELECT TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY vrec_tenant_insert ON public.vendor_5way_reconciliations
            FOR INSERT TO authenticated
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY vrec_tenant_update ON public.vendor_5way_reconciliations
            FOR UPDATE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            )
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY vrec_tenant_delete ON public.vendor_5way_reconciliations
            FOR DELETE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. organization_policies RLS Hardening
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_policies'
    ) THEN
        ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS pol_select_policy ON public.organization_policies;
        DROP POLICY IF EXISTS pol_insert_policy ON public.organization_policies;
        DROP POLICY IF EXISTS pol_update_policy ON public.organization_policies;
        DROP POLICY IF EXISTS pol_delete_policy ON public.organization_policies;
        DROP POLICY IF EXISTS pol_tenant_select ON public.organization_policies;
        DROP POLICY IF EXISTS pol_tenant_insert ON public.organization_policies;
        DROP POLICY IF EXISTS pol_tenant_update ON public.organization_policies;
        DROP POLICY IF EXISTS pol_tenant_delete ON public.organization_policies;

        CREATE POLICY pol_tenant_select ON public.organization_policies
            FOR SELECT TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY pol_tenant_insert ON public.organization_policies
            FOR INSERT TO authenticated
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY pol_tenant_update ON public.organization_policies
            FOR UPDATE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            )
            WITH CHECK (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );

        CREATE POLICY pol_tenant_delete ON public.organization_policies
            FOR DELETE TO authenticated
            USING (
                organization_id::text = public.current_org_id()
                OR public.is_platform_admin()
            );
    END IF;
END $$;
