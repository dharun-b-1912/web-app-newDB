-- supabase/migrations/20260912_111_fix_attendance_rules_fk_type_mismatch.sql
-- ============================================================================
-- JOY PeopleHR — Migration 111
-- FIX: attendance_rules FK type mismatch (TEXT vs UUID on organizations.id)
-- ============================================================================
-- Root Cause:
--   organizations.id was originally TEXT ('org-' prefix) in migration 001,
--   but later migrations (036, 102, 104) declared organization_id as UUID
--   when referencing it. This caused the live Supabase DB to have
--   organizations.id as UUID, while migration 110 declared organization_id TEXT.
--
-- Fix Strategy:
--   1. Drop all attendance_rules* tables from migration 110 (they failed to create).
--   2. Recreate them with organization_id as TEXT (no FK REFERENCES to organizations).
--   3. Tenant isolation is fully enforced via RLS check_user_organization_access().
--   4. Re-apply all indexes, RLS policies, and seed templates.
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up any partial state from failed migration 110
-- ============================================================================
DROP TABLE IF EXISTS public.attendance_rule_audit_logs CASCADE;
DROP TABLE IF EXISTS public.attendance_rule_executions CASCADE;
DROP TABLE IF EXISTS public.attendance_rule_exceptions CASCADE;
DROP TABLE IF EXISTS public.attendance_rule_versions CASCADE;
DROP TABLE IF EXISTS public.attendance_rules CASCADE;
DROP TABLE IF EXISTS public.attendance_rule_templates CASCADE;

-- ============================================================================
-- 1. ATTENDANCE RULES MASTER TABLE
-- organization_id is TEXT with NO FK constraint.
-- Tenant isolation is enforced 100% by RLS policies below.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT        NOT NULL,
    company_id      TEXT,
    branch_id       TEXT,
    site_id         TEXT,

    rule_code    VARCHAR(64)  NOT NULL,
    rule_name    VARCHAR(255) NOT NULL,
    description  TEXT,

    category VARCHAR(64) NOT NULL CHECK (
        category IN (
            'CHECK_IN_OUT','GRACE_LATE','BREAKS','OVERTIME','MISSING_PUNCH',
            'DUPLICATES','EMPLOYEE_EXCEPTIONS','AUTO_CHECKOUT','SOURCE_PRIORITY',
            'SHIFT_EXCEPTION','DEVICE_RULES','ADVANCED'
        )
    ),

    rule_type     VARCHAR(64) NOT NULL DEFAULT 'STANDARD',
    priority      INT         NOT NULL DEFAULT 50 CHECK (priority >= 1 AND priority <= 100),
    status        VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),

    scope_type VARCHAR(64) NOT NULL DEFAULT 'ORGANIZATION' CHECK (
        scope_type IN (
            'ORGANIZATION','COMPANY','BRANCH','SITE','DEPARTMENT',
            'DESIGNATION','EMPLOYEE_GROUP','SHIFT','VENDOR','INDIVIDUAL_EMPLOYEE','DEVICE'
        )
    ),
    scope_target TEXT  DEFAULT 'ALL',
    scope_labels JSONB DEFAULT '[]'::jsonb,

    trigger_event VARCHAR(64) NOT NULL DEFAULT 'FIRST_PUNCH' CHECK (
        trigger_event IN (
            'FIRST_PUNCH','ANY_PUNCH','BEFORE_SHIFT','DURING_SHIFT',
            'AFTER_SHIFT','BETWEEN_TIME','AFTER_SHIFT_END'
        )
    ),

    conditions            JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions               JSONB NOT NULL DEFAULT '[]'::jsonb,
    configuration         JSONB NOT NULL DEFAULT '{}'::jsonb,

    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to   DATE,

    is_active             BOOLEAN NOT NULL DEFAULT true,
    is_system_default     BOOLEAN NOT NULL DEFAULT false,
    human_readable_summary TEXT,

    rule_version INT  NOT NULL DEFAULT 1,
    created_by   TEXT,
    updated_by   TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_att_rule_org_code_ver UNIQUE (organization_id, rule_code, rule_version)
);

-- ============================================================================
-- 2. ATTENDANCE RULE VERSIONS (Immutable Audit Archive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rule_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES public.attendance_rules(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL,
    version_number  INT  NOT NULL,

    rule_name     VARCHAR(255) NOT NULL,
    category      VARCHAR(64)  NOT NULL,
    priority      INT          NOT NULL,
    scope_type    VARCHAR(64)  NOT NULL,
    conditions    JSONB        NOT NULL,
    actions       JSONB        NOT NULL,
    configuration JSONB        NOT NULL,

    effective_from DATE NOT NULL,
    effective_to   DATE,
    change_reason  TEXT,
    changed_by     TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_att_rule_version UNIQUE (rule_id, version_number)
);

-- ============================================================================
-- 3. ATTENDANCE RULE EXCEPTIONS (Employee-Specific Exemptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rule_exceptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    company_id      TEXT,
    branch_id       TEXT,

    employee_id   TEXT         NOT NULL,
    employee_name VARCHAR(255),
    employee_code VARCHAR(64),
    rule_id       UUID REFERENCES public.attendance_rules(id) ON DELETE SET NULL,

    exception_type VARCHAR(64) NOT NULL CHECK (
        exception_type IN (
            'GRACE_OVERRIDE','SHIFT_OVERRIDE','OT_THRESHOLD_OVERRIDE',
            'BREAK_OVERRIDE','EARLY_DEPARTURE_PERMIT','CUSTOM_EXCEPTION'
        )
    ),

    title         VARCHAR(255) NOT NULL,
    reason        TEXT         NOT NULL,
    configuration JSONB        NOT NULL DEFAULT '{}'::jsonb,

    effective_from DATE        NOT NULL,
    effective_to   DATE,
    status         VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','INACTIVE','EXPIRED')),

    approved_by TEXT,
    created_by  TEXT,
    updated_by  TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. ATTENDANCE RULE EXECUTIONS (Deterministic Execution Ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rule_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    company_id      TEXT,
    branch_id       TEXT,

    employee_id   TEXT         NOT NULL,
    employee_name VARCHAR(255),
    employee_code VARCHAR(64),

    rule_id       UUID REFERENCES public.attendance_rules(id) ON DELETE SET NULL,
    rule_code     VARCHAR(64),
    rule_version  INT DEFAULT 1,

    attendance_event_id   TEXT,
    attendance_session_id TEXT,

    execution_status VARCHAR(32) NOT NULL
        CHECK (execution_status IN ('SUCCESS','CONFLICT','SKIPPED','FAILED')),
    decision         VARCHAR(64) NOT NULL,
    decision_reason  TEXT,

    input_snapshot  JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

    execution_duration_ms INT         NOT NULL DEFAULT 0,
    executed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. ATTENDANCE RULE AUDIT LOGS (Immutable Mutation History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rule_audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    rule_id         UUID REFERENCES public.attendance_rules(id) ON DELETE CASCADE,
    rule_code       VARCHAR(64),
    rule_version    INT DEFAULT 1,

    action VARCHAR(64) NOT NULL CHECK (
        action IN (
            'CREATED','UPDATED','ACTIVATED','DEACTIVATED','ARCHIVED',
            'PRIORITY_CHANGED','SCOPE_CHANGED','VERSION_CREATED'
        )
    ),

    old_values JSONB,
    new_values JSONB,
    changed_by TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason     TEXT
);

-- ============================================================================
-- 6. ATTENDANCE RULE TEMPLATES (Reusable Global/System Templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_rule_templates (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code         VARCHAR(64) NOT NULL UNIQUE,
    template_name         VARCHAR(255) NOT NULL,
    description           TEXT,
    category              VARCHAR(64) NOT NULL,
    default_priority      INT         NOT NULL DEFAULT 50,
    default_configuration JSONB       NOT NULL,
    conditions            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    actions               JSONB       NOT NULL DEFAULT '[]'::jsonb,
    is_global             BOOLEAN     NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. PERFORMANCE & TENANT SCOPED INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_att_rules_tenant_status   ON public.attendance_rules(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_att_rules_tenant_category ON public.attendance_rules(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_att_rules_tenant_priority ON public.attendance_rules(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_att_rules_effective        ON public.attendance_rules(organization_id, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_att_exceptions_tenant_emp ON public.attendance_rule_exceptions(organization_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_att_exceptions_effective  ON public.attendance_rule_exceptions(organization_id, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_att_exec_tenant_time ON public.attendance_rule_executions(organization_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_att_exec_employee    ON public.attendance_rule_executions(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_att_exec_rule        ON public.attendance_rule_executions(rule_id);

CREATE INDEX IF NOT EXISTS idx_att_audit_rule   ON public.attendance_rule_audit_logs(rule_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_att_audit_tenant ON public.attendance_rule_audit_logs(organization_id, changed_at DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.attendance_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rule_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rule_exceptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rule_executions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rule_audit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rule_templates   ENABLE ROW LEVEL SECURITY;

-- Helper function (replace if exists)
CREATE OR REPLACE FUNCTION public.check_user_organization_access(target_org_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN RETURN true; END IF;
  IF (auth.jwt() -> 'app_metadata' ->> 'is_platform_admin')::boolean IS TRUE THEN RETURN true; END IF;
  IF EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()::text
      AND status = 'Active'
  ) THEN RETURN true; END IF;
  IF (auth.jwt() -> 'user_metadata' ->> 'organization_id') = target_org_id THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Tenant Isolation for attendance_rules" ON public.attendance_rules;
CREATE POLICY "Tenant Isolation for attendance_rules"
ON public.attendance_rules FOR ALL TO authenticated
USING  (public.check_user_organization_access(organization_id))
WITH CHECK (public.check_user_organization_access(organization_id));

DROP POLICY IF EXISTS "Tenant Isolation for attendance_rule_versions" ON public.attendance_rule_versions;
CREATE POLICY "Tenant Isolation for attendance_rule_versions"
ON public.attendance_rule_versions FOR ALL TO authenticated
USING  (public.check_user_organization_access(organization_id))
WITH CHECK (public.check_user_organization_access(organization_id));

DROP POLICY IF EXISTS "Tenant Isolation for attendance_rule_exceptions" ON public.attendance_rule_exceptions;
CREATE POLICY "Tenant Isolation for attendance_rule_exceptions"
ON public.attendance_rule_exceptions FOR ALL TO authenticated
USING  (public.check_user_organization_access(organization_id))
WITH CHECK (public.check_user_organization_access(organization_id));

DROP POLICY IF EXISTS "Tenant Isolation for attendance_rule_executions" ON public.attendance_rule_executions;
CREATE POLICY "Tenant Isolation for attendance_rule_executions"
ON public.attendance_rule_executions FOR ALL TO authenticated
USING  (public.check_user_organization_access(organization_id))
WITH CHECK (public.check_user_organization_access(organization_id));

DROP POLICY IF EXISTS "Tenant Isolation for attendance_rule_audit_logs" ON public.attendance_rule_audit_logs;
CREATE POLICY "Tenant Isolation for attendance_rule_audit_logs"
ON public.attendance_rule_audit_logs FOR ALL TO authenticated
USING  (public.check_user_organization_access(organization_id))
WITH CHECK (public.check_user_organization_access(organization_id));

DROP POLICY IF EXISTS "Read attendance_rule_templates" ON public.attendance_rule_templates;
CREATE POLICY "Read attendance_rule_templates"
ON public.attendance_rule_templates FOR SELECT TO authenticated
USING (true);

-- ============================================================================
-- 9. DEFAULT SEED TEMPLATES
-- ============================================================================
INSERT INTO public.attendance_rule_templates
    (template_code, template_name, description, category, default_priority, default_configuration, conditions, actions)
VALUES
(
    'TMPL-GRACE-10',
    'Standard 10-Minute Grace Period',
    'Grants up to 10 minutes grace after scheduled shift start before marking an employee as late.',
    'GRACE_LATE', 50,
    '{"grace_minutes": 10}'::jsonb,
    '[{"field": "minutes_after_shift_start", "operator": "LESS_THAN_OR_EQUAL", "value": 10}]'::jsonb,
    '[{"action_type": "APPLY_GRACE", "parameters": {"grace_minutes": 10}}]'::jsonb
),
(
    'TMPL-DUP-05',
    '5-Minute Duplicate Punch Suppression',
    'Suppresses duplicate biometric and mobile punches within 5 minutes.',
    'DUPLICATES', 10,
    '{"min_punch_gap_minutes": 5}'::jsonb,
    '[{"field": "time_since_last_punch_minutes", "operator": "LESS_THAN", "value": 5}]'::jsonb,
    '[{"action_type": "IGNORE_DUPLICATE", "parameters": {"min_punch_gap_minutes": 5}}]'::jsonb
),
(
    'TMPL-OT-30',
    'Daily Overtime Threshold (30m+)',
    'Calculates overtime when an employee works at least 30 minutes beyond scheduled shift completion.',
    'OVERTIME', 60,
    '{"ot_threshold_minutes": 30, "ot_rounding": "15_MIN"}'::jsonb,
    '[{"field": "minutes_after_shift_end", "operator": "GREATER_THAN_OR_EQUAL", "value": 30}]'::jsonb,
    '[{"action_type": "CALCULATE_OT", "parameters": {"ot_threshold_minutes": 30, "ot_rounding": "15_MIN"}}]'::jsonb
),
(
    'TMPL-AUTO-OUT',
    'Shift Boundary Auto-Checkout Rule',
    'Automatically closes open attendance sessions 3 hours past shift end if physical checkout is missing.',
    'AUTO_CHECKOUT', 90,
    '{"cutoff_hours_after_shift": 3, "auto_checkout_source": "SYSTEM"}'::jsonb,
    '[{"field": "minutes_after_shift_end", "operator": "GREATER_THAN", "value": 180}]'::jsonb,
    '[{"action_type": "AUTO_CLOSE", "parameters": {"attendance_mode": "FIRST_IN_LAST_OUT"}}]'::jsonb
),
(
    'TMPL-CHAN-LOCK',
    'Attendance Channel Locking Rule',
    'Locks the attendance session to the first accepted channel (BIOMETRIC or MOBILE). Cross-channel punches are stored as raw evidence only — they do not create new sessions.',
    'SOURCE_PRIORITY', 5,
    '{"channel_lock": true, "lock_on": "FIRST_PUNCH", "accepted_channels": ["BIOMETRIC", "MOBILE"]}'::jsonb,
    '[{"field": "session_channel_locked", "operator": "EQUALS", "value": true}]'::jsonb,
    '[{"action_type": "IGNORE_CROSS_CHANNEL", "parameters": {"store_as_evidence": true}}]'::jsonb
)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================================
-- DONE. Migration 111 complete.
-- All attendance_rules* tables recreated without FK to organizations(id).
-- Tenant isolation enforced via RLS. Channel-locking template included.
-- ============================================================================
