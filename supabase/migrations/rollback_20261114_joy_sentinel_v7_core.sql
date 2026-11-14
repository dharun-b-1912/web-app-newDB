-- supabase/migrations/rollback_20261114_joy_sentinel_v7_core.sql
-- ============================================================================
-- JOY SENTINEL V7: Phase 1 — Non-Cascading Dependency-Aware Rollback
-- ============================================================================
-- Surgically removes only V7 Phase 1 objects.
-- Preserves all live SaaS business tables and Sentinel V1-V6 components intact.
-- ============================================================================

-- 1. Revoke Grants and Drop Functions
REVOKE ALL ON FUNCTION public.fn_sentinel_audit_attendance_integrity(INT) FROM service_role, authenticated;
REVOKE ALL ON FUNCTION public.fn_sentinel_audit_payroll_integrity(INT) FROM service_role, authenticated;
REVOKE ALL ON FUNCTION public.fn_sentinel_get_tenant_impact() FROM service_role, authenticated;
REVOKE ALL ON FUNCTION public.fn_sentinel_evaluate_fix_verifications() FROM service_role, authenticated;

DROP FUNCTION IF EXISTS public.fn_sentinel_audit_attendance_integrity(INT);
DROP FUNCTION IF EXISTS public.fn_sentinel_audit_payroll_integrity(INT);
DROP FUNCTION IF EXISTS public.fn_sentinel_get_tenant_impact();
DROP FUNCTION IF EXISTS public.fn_sentinel_evaluate_fix_verifications();

-- 2. Drop RLS Policies
DROP POLICY IF EXISTS "Service role full access on sentinel_workflow_audits" ON public.sentinel_workflow_audits;
DROP POLICY IF EXISTS "Service role full access on sentinel_fix_verifications" ON public.sentinel_fix_verifications;
DROP POLICY IF EXISTS "Platform admin read on sentinel_workflow_audits" ON public.sentinel_workflow_audits;
DROP POLICY IF EXISTS "Platform admin read on sentinel_fix_verifications" ON public.sentinel_fix_verifications;

-- 3. Drop Tables (RESTRICT - zero cascade to protect any unexpected dependents)
DROP TABLE IF EXISTS public.sentinel_fix_verifications RESTRICT;
DROP TABLE IF EXISTS public.sentinel_workflow_audits RESTRICT;

