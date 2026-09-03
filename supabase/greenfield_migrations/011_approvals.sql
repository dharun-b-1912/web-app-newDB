-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 011
-- Target Project: ysiajemrqakfngasehhi
-- Description: Universal Approvals Engine & Multi-Tier Routing
-- ============================================================================

-- 1. Approval Workflows
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_appr_wf_org_module UNIQUE (organization_id, module)
);

CREATE INDEX IF NOT EXISTS idx_appr_wf_org ON public.approval_workflows(organization_id);

-- 2. Approval Instances (Running execution instance)
CREATE TABLE IF NOT EXISTS public.approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    requester_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    current_step_order INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appr_inst_target ON public.approval_instances(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_appr_inst_org ON public.approval_instances(organization_id);

-- 3. Approval Actions (Audit log of individual decisions)
CREATE TABLE IF NOT EXISTS public.approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    approval_instance_id UUID NOT NULL REFERENCES public.approval_instances(id) ON DELETE CASCADE,
    actor_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    action VARCHAR(32) NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'DELEGATE', 'REQUEST_INFO')),
    comments TEXT,
    action_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appr_actions_inst ON public.approval_actions(approval_instance_id);
CREATE INDEX IF NOT EXISTS idx_appr_actions_org ON public.approval_actions(organization_id);
