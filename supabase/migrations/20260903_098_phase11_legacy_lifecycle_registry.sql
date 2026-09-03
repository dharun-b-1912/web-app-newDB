-- ============================================================================
-- Migration: 20260903_098_phase11_legacy_lifecycle_registry.sql
-- Description: Phase 11 Pass 2 Legacy Object Lifecycle Governance Registry
-- Scope: Establishes the authoritative schema object lifecycle registry
--        to safely track the 71 orphan candidate tables without dropping data.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.legacy_object_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_name TEXT NOT NULL UNIQUE,
    object_type TEXT NOT NULL DEFAULT 'TABLE',
    classification TEXT NOT NULL DEFAULT 'ORPHAN_CANDIDATE',
    deprecation_status TEXT NOT NULL DEFAULT 'DEPRECATED_MONITORED',
    safe_to_archive BOOLEAN NOT NULL DEFAULT false,
    drop_after_version TEXT NOT NULL DEFAULT 'v2.0.0',
    notes TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by TEXT NOT NULL DEFAULT 'Enterprise SaaS Architecture Governance'
);

ALTER TABLE public.legacy_object_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legacy_registry_select ON public.legacy_object_registry;
CREATE POLICY legacy_registry_select ON public.legacy_object_registry
    FOR SELECT TO authenticated 
    USING (public.is_platform_admin() OR public.current_org_id() IS NOT NULL);

-- Seed initial audit records for the top detected orphan candidates
INSERT INTO public.legacy_object_registry (object_name, object_type, classification, deprecation_status, notes)
VALUES
    ('old_employee_data', 'TABLE', 'ORPHAN_CANDIDATE', 'DEPRECATED_MONITORED', 'Historical prototype table with 0 repository references. Retained non-destructively.'),
    ('draft_vendor_workers', 'TABLE', 'ORPHAN_CANDIDATE', 'DEPRECATED_MONITORED', 'Superseded by canonical vendor_workers table in migration 075.'),
    ('legacy_attendance_buffer', 'TABLE', 'ORPHAN_CANDIDATE', 'DEPRECATED_MONITORED', 'Superseded by canonical attendance_events table.'),
    ('temp_salary_staging', 'TABLE', 'ORPHAN_CANDIDATE', 'DEPRECATED_MONITORED', 'Staging table from early payroll migration. Superseded by employee_salary_assignments.')
ON CONFLICT (object_name) DO NOTHING;
