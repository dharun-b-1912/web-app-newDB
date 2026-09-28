-- supabase/migrations/20260925_142_enterprise_vendor_compliance_vault_master.sql
-- ============================================================================
-- Joy PeopleHR — Enterprise Vendor Compliance Document Vault & Statutory Repository
-- Multi-Tenant Schema, Private Storage Bucket, Requirement Catalog & Review RPC
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure Canonical Private Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-private-documents',
  'vendor-private-documents',
  false,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];

-- 2. Compliance Requirements Master Table
CREATE TABLE IF NOT EXISTS public.compliance_requirements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code    TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (
    category IN (
      'REGISTRATION_TAX', 
      'CONTRACTS_COMMERCIAL', 
      'STATUTORY_REGISTRATIONS', 
      'MONTHLY_COMPLIANCE', 
      'ANNUAL_COMPLIANCE', 
      'WORKFORCE_KYC', 
      'EXCEPTIONS_REQUESTS'
    )
  ),
  frequency           TEXT NOT NULL CHECK (
    frequency IN ('ONCE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'EVENT_BASED')
  ),
  requiredness        TEXT NOT NULL DEFAULT 'MANDATORY' CHECK (
    requiredness IN ('MANDATORY', 'CONDITIONAL', 'OPTIONAL')
  ),
  applicability_rules JSONB DEFAULT '{"vendor_types": ["ALL"], "legal_structures": ["ALL"]}'::jsonb,
  description         TEXT,
  portal_help_url     TEXT,
  default_warning_days INT DEFAULT 30,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_req_category ON public.compliance_requirements(category);
CREATE INDEX IF NOT EXISTS idx_comp_req_frequency ON public.compliance_requirements(frequency);

-- 3. Augment vendor_documents with enterprise vault metadata
ALTER TABLE public.vendor_documents 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS site_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_id TEXT,
  ADD COLUMN IF NOT EXISTS requirement_id TEXT,
  ADD COLUMN IF NOT EXISTS requirement_code TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'VENDOR_ORGANIZATION' CHECK (scope IN ('VENDOR_ORGANIZATION', 'WORKFORCE_EMPLOYEE')),
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS worker_code TEXT,
  ADD COLUMN IF NOT EXISTS worker_role TEXT,
  ADD COLUMN IF NOT EXISTS compliance_period TEXT,
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS expiry_status TEXT DEFAULT 'VALID' CHECK (
    expiry_status IN ('PERMANENT', 'VALID', 'EXPIRING_SOON', 'EXPIRED')
  ),
  ADD COLUMN IF NOT EXISTS bucket_id TEXT DEFAULT 'vendor-private-documents',
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS previous_document_id TEXT,
  ADD COLUMN IF NOT EXISTS resubmission_note TEXT,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_remarks TEXT,
  ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

-- Indexes for lightning fast lookup
CREATE INDEX IF NOT EXISTS idx_vdocs_vendor_scope ON public.vendor_documents(vendor_id, scope);
CREATE INDEX IF NOT EXISTS idx_vdocs_period ON public.vendor_documents(compliance_period);
CREATE INDEX IF NOT EXISTS idx_vdocs_verification_status ON public.vendor_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_vdocs_expiry_status ON public.vendor_documents(expiry_status);
CREATE INDEX IF NOT EXISTS idx_vdocs_worker ON public.vendor_documents(worker_id) WHERE worker_id IS NOT NULL;

-- 4. Document Reviews Audit Trail Table
CREATE TABLE IF NOT EXISTS public.document_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         UUID NOT NULL,
  reviewer_id         TEXT,
  reviewer_name       TEXT,
  reviewer_role       TEXT NOT NULL DEFAULT 'HR_COMPLIANCE_OFFICER',
  decision            TEXT NOT NULL CHECK (
    decision IN ('VERIFIED', 'REJECTED', 'CHANGES_REQUESTED', 'UNDER_REVIEW')
  ),
  reason_code         TEXT,
  notes               TEXT,
  previous_status     TEXT,
  reviewed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_reviews_doc ON public.document_reviews(document_id);

-- 5. Seed Core Standard Requirements Catalog
INSERT INTO public.compliance_requirements (requirement_code, title, category, frequency, requiredness, description)
VALUES
  -- Registration & Tax
  ('DOC-PAN', 'PAN Card Certificate', 'REGISTRATION_TAX', 'ONCE', 'MANDATORY', 'Permanent Account Number copy issued by Income Tax Department'),
  ('DOC-GST', 'GST Registration Certificate (REG-06)', 'REGISTRATION_TAX', 'ONCE', 'MANDATORY', 'Form REG-06 containing GSTIN and principal place of business'),
  ('DOC-BANK', 'Bank Cancelled Cheque / Bank Mandate', 'REGISTRATION_TAX', 'ONCE', 'MANDATORY', 'Mandate letter or cancelled cheque bearing vendor legal name & IFSC'),
  ('DOC-MSME', 'MSME / Udyam Registration Certificate', 'REGISTRATION_TAX', 'ONCE', 'OPTIONAL', 'Udyam Registration Certificate for micro/small/medium enterprises'),
  ('DOC-INCORP', 'Certificate of Incorporation / Partnership Deed', 'REGISTRATION_TAX', 'ONCE', 'MANDATORY', 'ROC Certificate / Partnership Deed / LLP Agreement'),
  ('DOC-CONFLICT', 'Declaration of Conflict of Interest', 'REGISTRATION_TAX', 'ONCE', 'MANDATORY', 'Declaration certifying no conflict of interest with client personnel'),
  
  -- Contracts & Commercial
  ('DOC-MSA', 'Master Service Agreement (MSA)', 'CONTRACTS_COMMERCIAL', 'ONCE', 'MANDATORY', 'Executed Master Service Agreement between Client and Vendor'),
  ('DOC-RATE-CARD', 'Approved Commercial Rate Card', 'CONTRACTS_COMMERCIAL', 'ANNUAL', 'MANDATORY', 'Approved billable wage rates, allowance structures, and service charges'),
  ('DOC-WORK-ORDER', 'Site Work Order / Site Assignment Advice', 'CONTRACTS_COMMERCIAL', 'ANNUAL', 'MANDATORY', 'Client site deployment order authorizing workforce quotas'),
  
  -- Statutory Registrations
  ('DOC-CLRA-LIC', 'CLRA Contract Labour License (Form V)', 'STATUTORY_REGISTRATIONS', 'ANNUAL', 'MANDATORY', 'Contract labour registration/license under CLRA Act 1970'),
  ('DOC-PF-REG', 'EPFO Code Allotment Letter', 'STATUTORY_REGISTRATIONS', 'ONCE', 'MANDATORY', 'PF Establishment Code Registration document from EPFO portal'),
  ('DOC-ESI-REG', 'ESIC Code Registration Certificate', 'STATUTORY_REGISTRATIONS', 'ONCE', 'MANDATORY', 'ESI Employer Code allotment certificate issued by ESIC'),
  ('DOC-PT-REG', 'Professional Tax Registration (PTRC/PTEC)', 'STATUTORY_REGISTRATIONS', 'ONCE', 'MANDATORY', 'State-specific professional tax registration certificates'),
  ('DOC-LWF-REG', 'Labour Welfare Fund (LWF) Registration', 'STATUTORY_REGISTRATIONS', 'ONCE', 'CONDITIONAL', 'State Labour Welfare Board registration reference'),
  
  -- Monthly Compliance
  ('DOC-M-INVOICE', 'Monthly Vendor Commercial Invoice', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'Tax Invoice with GSTIN, billing period, SAC 998519 & PO reference'),
  ('DOC-M-ATTN-RECON', 'Monthly Attendance & OT Reconciliation Summary', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'Signed & verified muster roll summary matching PO billing days'),
  ('DOC-M-ESI-CHALLAN', 'Monthly ESI Challan & Payment Acknowledgment', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'ESIC Online Challan with bank transaction receipt'),
  ('DOC-M-ESI-STMT', 'Monthly ESI Serial Contribution Statement (Excel)', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'IP-wise worker breakdown of wages and employer/employee ESI'),
  ('DOC-M-PF-CHALLAN', 'Monthly PF ECR Challan & TRRN Payment Receipt', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'EPFO Electronic Challan cum Return (ECR) receipt with TRRN'),
  ('DOC-M-PF-STMT', 'Monthly PF Paid Serial Statement (Excel)', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'UAN-wise wage and PF contribution breakup statement'),
  ('DOC-M-SALARY-ACK', 'Salary Slip Acknowledgment / Bank Wage Proof', 'MONTHLY_COMPLIANCE', 'MONTHLY', 'MANDATORY', 'Bank NEFT advice / worker signature wage disbursement acknowledgment'),
  
  -- Annual Compliance
  ('DOC-A-FORM5', 'Annual Statutory Return (Form 5 / Form XXIV)', 'ANNUAL_COMPLIANCE', 'ANNUAL', 'MANDATORY', 'Annual labour return submitted to jurisdictional labour commissioner'),
  ('DOC-A-BONUS', 'Annual Ex-Gratia / Bonus Paid Statement', 'ANNUAL_COMPLIANCE', 'ANNUAL', 'MANDATORY', 'Statutory bonus disbursement statement under Payment of Bonus Act'),
  ('DOC-A-LEAVE-WAGES', 'Leave Wages Paid Reconciliation Statement', 'ANNUAL_COMPLIANCE', 'ANNUAL', 'MANDATORY', 'Annual leave encashment / wages in lieu of earned leave proof'),
  
  -- Workforce Deployed KYC
  ('DOC-W-ID-AADHAAR', 'Worker Government Photo ID / Aadhaar', 'WORKFORCE_KYC', 'ONCE', 'MANDATORY', 'Authorized identity proof for deployed contractor employee'),
  ('DOC-W-BANK', 'Worker Bank Account Passbook / Cheque', 'WORKFORCE_KYC', 'ONCE', 'MANDATORY', 'Account confirmation for direct bank wage transfer'),
  ('DOC-W-PF-UAN', 'EPFO UAN / Form 11 Declaration', 'WORKFORCE_KYC', 'ONCE', 'MANDATORY', 'Universal Account Number statutory declaration'),
  ('DOC-W-ESI-PEHCHAN', 'ESIC Pehchan Smart Card / Declaration', 'WORKFORCE_KYC', 'ONCE', 'MANDATORY', 'Insurance number and dispensary allocation card'),
  ('DOC-W-APPOINTMENT', 'Contractor Deployment Order', 'WORKFORCE_KYC', 'ONCE', 'MANDATORY', 'Official contractor appointment and site deployment order'),
  ('DOC-W-MEDICAL', 'Medical Fitness Certificate', 'WORKFORCE_KYC', 'ANNUAL', 'CONDITIONAL', 'Occupational health and fitness examination certificate'),
  ('DOC-W-POLICE', 'Police Verification Certificate', 'WORKFORCE_KYC', 'ONCE', 'CONDITIONAL', 'Background verification clearance from local police authority')
ON CONFLICT (requirement_code) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  frequency = EXCLUDED.frequency,
  requiredness = EXCLUDED.requiredness,
  description = EXCLUDED.description;

-- 6. Canonical Review RPC Function
CREATE OR REPLACE FUNCTION public.fn_review_vendor_document(
  p_document_id TEXT,
  p_status TEXT,
  p_reviewer_id TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_resubmission_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uuid UUID;
  v_doc RECORD;
  v_new_audit JSONB;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Handle UUID cast safely
  BEGIN
    v_uuid := p_document_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_uuid := NULL;
  END;

  IF v_uuid IS NOT NULL THEN
    SELECT * INTO v_doc FROM public.vendor_documents WHERE id = v_uuid;
  ELSE
    SELECT * INTO v_doc FROM public.storage_documents WHERE id = p_document_id;
  END IF;

  -- Validate target status
  IF p_status NOT IN ('VERIFIED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'RESUBMISSION_REQUIRED', 'UNDER_REVIEW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification status.');
  END IF;

  -- Normalize status names
  IF p_status = 'APPROVED' THEN p_status := 'VERIFIED'; END IF;
  IF p_status = 'RESUBMISSION_REQUIRED' THEN p_status := 'CHANGES_REQUESTED'; END IF;

  -- Rejection requires mandatory reason
  IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is mandatory.');
  END IF;

  -- Build audit trail item
  v_new_audit := jsonb_build_object(
    'action', p_status,
    'actor', p_reviewer_id,
    'timestamp', v_now,
    'reason', p_rejection_reason,
    'note', p_resubmission_note
  );

  -- Update vendor_documents if found
  IF v_uuid IS NOT NULL AND v_doc.id IS NOT NULL THEN
    UPDATE public.vendor_documents
    SET
      verification_status = p_status,
      rejection_reason = p_rejection_reason,
      resubmission_note = p_resubmission_note,
      verified_by = CASE WHEN p_reviewer_id ~* '^[0-9a-f-]{36}$' THEN p_reviewer_id::UUID ELSE NULL END,
      verified_at = v_now,
      audit_trail = COALESCE(audit_trail, '[]'::jsonb) || v_new_audit,
      updated_at = v_now
    WHERE id = v_uuid;

    -- Also record in document_reviews
    INSERT INTO public.document_reviews (
      document_id, reviewer_id, reviewer_name, decision, reason_code, notes, previous_status
    ) VALUES (
      v_uuid, p_reviewer_id, p_reviewer_id, p_status, p_rejection_reason, p_resubmission_note, v_doc.verification_status
    );

    RETURN jsonb_build_object('success', true, 'document_id', v_uuid, 'status', p_status);
  END IF;

  -- Fallback to storage_documents
  UPDATE public.storage_documents
  SET
    verification_status = p_status,
    review_status = p_status,
    verified_by = p_reviewer_id,
    verified_at = v_now,
    rejection_reason = p_rejection_reason,
    resubmission_note = p_resubmission_note,
    updated_at = v_now
  WHERE id = p_document_id;

  RETURN jsonb_build_object('success', true, 'document_id', p_document_id, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_review_vendor_document(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role, anon;

COMMIT;
