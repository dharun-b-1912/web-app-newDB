-- ============================================================================
-- Migration: 20260903_095_phase11_tenant_compatibility.sql
-- Description: Phase 11 Pass 2 Tenant Identifier Compatibility Foundation
-- Scope: Establishes a bidirectional synchronization trigger between
--        organization_id and legacy tenant_id on dual-key tables.
-- Non-Destructive: Does NOT rename or drop tenant_id. Prevents drift.
-- ============================================================================

-- 1. Create canonical normalization trigger function
CREATE OR REPLACE FUNCTION public.sync_tenant_and_org_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Forward compatibility: If organization_id provided, populate tenant_id
    IF NEW.organization_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
        NEW.tenant_id := NEW.organization_id::text;
    -- Backward compatibility: If legacy tenant_id provided, populate organization_id
    ELSIF NEW.tenant_id IS NOT NULL AND NEW.organization_id IS NULL THEN
        NEW.organization_id := NEW.tenant_id::text;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper to safely attach sync trigger to dual-key tables if both columns exist
CREATE OR REPLACE FUNCTION public.attach_tenant_sync_trigger(p_table text)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'tenant_id'
    ) THEN
        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_tenant_org ON public.%I;', p_table);
        EXECUTE format('
            CREATE TRIGGER trg_sync_tenant_org
            BEFORE INSERT OR UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_tenant_and_org_id();
        ', p_table);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach synchronization triggers to active core dual-key tables
DO $$
BEGIN
    PERFORM public.attach_tenant_sync_trigger('salary_components');
    PERFORM public.attach_tenant_sync_trigger('salary_structures');
    PERFORM public.attach_tenant_sync_trigger('employee_salary_assignments');
    PERFORM public.attach_tenant_sync_trigger('payroll_periods');
    PERFORM public.attach_tenant_sync_trigger('performance_goals');
    PERFORM public.attach_tenant_sync_trigger('performance_review_cycles');
    PERFORM public.attach_tenant_sync_trigger('lms_courses');
    PERFORM public.attach_tenant_sync_trigger('lms_enrollments');
END $$;
