-- ============================================================================
-- Rollback for Migration 192: SaaS-Wide Tenant-Configurable Overtime Management Engine
-- ============================================================================

DROP POLICY IF EXISTS "ot_policy_rules_write" ON public.ot_policy_rules;
DROP POLICY IF EXISTS "ot_policy_rules_select" ON public.ot_policy_rules;
DROP POLICY IF EXISTS "org_ot_settings_write" ON public.organization_ot_settings;
DROP POLICY IF EXISTS "org_ot_settings_select" ON public.organization_ot_settings;

DROP INDEX IF EXISTS idx_ot_rec_org_ot_status;
ALTER TABLE public.overtime_records
    DROP COLUMN IF EXISTS approval_history,
    DROP COLUMN IF EXISTS adjustment_reason,
    DROP COLUMN IF EXISTS conflict_policy_ids,
    DROP COLUMN IF EXISTS calculation_evidence,
    DROP COLUMN IF EXISTS ot_status,
    DROP COLUMN IF EXISTS approved_minutes,
    DROP COLUMN IF EXISTS calculated_minutes,
    DROP COLUMN IF EXISTS policy_id,
    DROP COLUMN IF EXISTS ot_mode;

DROP INDEX IF EXISTS idx_ot_policy_rules_effective;
DROP INDEX IF EXISTS idx_ot_policy_rules_org_active;
DROP TABLE IF EXISTS public.ot_policy_rules;
DROP TABLE IF EXISTS public.organization_ot_settings;

