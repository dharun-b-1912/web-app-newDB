-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 016
-- Target Project: ysiajemrqakfngasehhi
-- Description: Employee Document Management & Verification Vault
-- ============================================================================

-- 1. Document Types Classification
CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_mandatory_for_onboarding BOOLEAN NOT NULL DEFAULT true,
    requires_verification BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_doc_types_org_code UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_doc_types_org ON public.document_types(organization_id);

-- 2. Employee Uploaded Documents (Supabase Storage metadata)
CREATE TABLE IF NOT EXISTS public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES public.document_types(id),
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_emp ON public.employee_documents(employee_id, document_type_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_org ON public.employee_documents(organization_id);
