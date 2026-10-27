-- ============================================================================
-- JOY PeopleHR — Database Migration 20261026_163
-- Authoritative Approval Workflows & Multi-Tier Routing Sync
-- Eliminates client-side hardcoded fallbacks and synchronizes with Supabase
-- ============================================================================

-- 1. Ensure approval_workflows table exists and has full schema columns
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    sequence JSONB DEFAULT '["Reporting Manager", "HR Admin"]'::jsonb,
    escalation_hours INTEGER DEFAULT 24,
    reminder_hours INTEGER DEFAULT 12,
    auto_escalate BOOLEAN DEFAULT true,
    scope VARCHAR(100) DEFAULT 'Organization Wide',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add missing columns if table already existed with subset schema
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS sequence JSONB DEFAULT '["Reporting Manager", "HR Admin"]'::jsonb;
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS escalation_hours INTEGER DEFAULT 24;
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS reminder_hours INTEGER DEFAULT 12;
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS auto_escalate BOOLEAN DEFAULT true;
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS scope VARCHAR(100) DEFAULT 'Organization Wide';
ALTER TABLE public.approval_workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure unique constraint per organization & module
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_appr_wf_org_module'
    ) THEN
        ALTER TABLE public.approval_workflows
            ADD CONSTRAINT uq_appr_wf_org_module UNIQUE (organization_id, module);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint uq_appr_wf_org_module already exists or duplicate detected';
END $$;

-- 2. Indexes for fast tenant filtering
CREATE INDEX IF NOT EXISTS idx_appr_wf_org ON public.approval_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_appr_wf_module ON public.approval_workflows(organization_id, module);
CREATE INDEX IF NOT EXISTS idx_appr_wf_active ON public.approval_workflows(organization_id, is_active);

-- 3. Ensure Row-Level Security (RLS) is Enabled
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_workflows_tenant_isolation" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_select" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_insert" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_update" ON public.approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_delete" ON public.approval_workflows;

CREATE POLICY "approval_workflows_select" ON public.approval_workflows
FOR SELECT TO authenticated
USING (
    organization_id = (SELECT public.get_active_user_org_id())
    OR public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_insert" ON public.approval_workflows
FOR INSERT TO authenticated
WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_update" ON public.approval_workflows
FOR UPDATE TO authenticated
USING (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
)
WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

CREATE POLICY "approval_workflows_delete" ON public.approval_workflows
FOR DELETE TO authenticated
USING (
    public.is_org_admin(organization_id)
    OR public.is_platform_admin()
);

-- 4. Seed Standard Authoritative Baseline Workflows for Existing Organizations (if missing)
INSERT INTO public.approval_workflows (
    organization_id, module, code, name, description, sequence, escalation_hours, reminder_hours, auto_escalate, scope, is_active
)
SELECT
    org.id,
    wf.module,
    wf.code,
    wf.name,
    wf.description,
    wf.sequence::jsonb,
    wf.escalation_hours,
    wf.reminder_hours,
    wf.auto_escalate,
    wf.scope,
    true
FROM public.organizations org
CROSS JOIN (
    VALUES
        ('Attendance & Time', 'POL-ATT', 'Attendance & Regularization Approval', 'Handles mispunch claims, late arrival justifications, and manual punch overrides.', '["Reporting Manager", "Department Head", "HR Admin"]', 24, 12, true, 'Organization Wide'),
        ('Leave & Absence', 'POL-LEAVE', 'Leave Management Policy', 'Sequential review for casual, sick, privilege, and comp-off leave requests.', '["Reporting Manager", "Department Head"]', 24, 8, true, 'Organization Wide'),
        ('Travel & Claims', 'POL-TRV', 'Travel & Expense Policy', 'Multi-tier financial verification and reimbursement approval workflow.', '["Reporting Manager", "Department Head", "Finance Head"]', 48, 24, true, 'Organization Wide'),
        ('Payroll & Compensation', 'POL-PAY', 'Payroll Revision Policy', 'Executive tier signoff for compensation revisions and salary restructuring.', '["HR Head", "Finance Head", "CEO / Managing Director"]', 72, 24, false, 'Executive & Management')
) AS wf(module, code, name, description, sequence, escalation_hours, reminder_hours, auto_escalate, scope)
ON CONFLICT (organization_id, module) DO NOTHING;
