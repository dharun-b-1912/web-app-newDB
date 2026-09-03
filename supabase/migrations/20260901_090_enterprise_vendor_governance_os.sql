-- supabase/migrations/20260901_090_enterprise_vendor_governance_os.sql
-- ============================================================================
-- JOY PEOPLEHR — ENTERPRISE PRINCIPAL EMPLOYER <-> CONTRACTOR GOVERNANCE OS
-- Employment Relationships, 10-Stage Lifecycle, Policy Gating, Performance Score
-- ============================================================================

-- 1. WORKFORCE EMPLOYMENT RELATIONSHIPS (Preserves Identity vs Relationship History)
CREATE TABLE IF NOT EXISTS public.workforce_employment_relationships (
    id text PRIMARY KEY DEFAULT ('rel_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    person_id text NOT NULL, -- Canonical workforce identity (employees.id)
    employment_type text NOT NULL DEFAULT 'CONTRACT_WORKER', -- DIRECT_EMPLOYEE, CONTRACT_WORKER, VENDOR_WORKER, TRAINEE, APPRENTICE, CONSULTANT, INTERN
    employer_type text NOT NULL DEFAULT 'VENDOR', -- PRINCIPAL_EMPLOYER, VENDOR
    employer_id text,
    vendor_id text,
    effective_from date NOT NULL,
    effective_to date,
    status text NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, TERMINATED, CONVERTED_TO_DIRECT
    conversion_source text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workforce_employment_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rel_select_policy ON public.workforce_employment_relationships;
DROP POLICY IF EXISTS rel_insert_policy ON public.workforce_employment_relationships;
DROP POLICY IF EXISTS rel_update_policy ON public.workforce_employment_relationships;
DROP POLICY IF EXISTS rel_delete_policy ON public.workforce_employment_relationships;
CREATE POLICY rel_select_policy ON public.workforce_employment_relationships FOR SELECT TO public USING (true);
CREATE POLICY rel_insert_policy ON public.workforce_employment_relationships FOR INSERT TO public WITH CHECK (true);
CREATE POLICY rel_update_policy ON public.workforce_employment_relationships FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY rel_delete_policy ON public.workforce_employment_relationships FOR DELETE TO public USING (true);
GRANT ALL ON public.workforce_employment_relationships TO anon, authenticated, service_role;

-- 2. MANPOWER REQUISITIONS (Demand & Fulfilment State Machine)
CREATE TABLE IF NOT EXISTS public.manpower_requisitions (
    id text PRIMARY KEY DEFAULT ('req_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    plant_location_id text NOT NULL,
    plant_location_name text NOT NULL,
    department_name text NOT NULL,
    trade_skill text NOT NULL, -- FITTER, WELDER, HELPER, ELECTRICIAN, SECURITY, OPERATOR, CUSTOM
    requested_count integer NOT NULL DEFAULT 1,
    approved_count integer NOT NULL DEFAULT 0,
    submitted_candidates integer NOT NULL DEFAULT 0,
    deployed_count integer NOT NULL DEFAULT 0,
    fulfilment_pct numeric NOT NULL DEFAULT 0.0,
    daily_rate numeric NOT NULL DEFAULT 0.0,
    shift_name text NOT NULL DEFAULT 'Morning Shift',
    start_date date NOT NULL,
    end_date date,
    requested_by text,
    status text NOT NULL DEFAULT 'OPEN', -- DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, PARTIALLY_FULFILLED, FULLY_FULFILLED, CLOSED, REJECTED, ON_HOLD
    vendor_id text,
    hr_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manpower_requisitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS req_select_policy ON public.manpower_requisitions;
DROP POLICY IF EXISTS req_insert_policy ON public.manpower_requisitions;
DROP POLICY IF EXISTS req_update_policy ON public.manpower_requisitions;
DROP POLICY IF EXISTS req_delete_policy ON public.manpower_requisitions;
CREATE POLICY req_select_policy ON public.manpower_requisitions FOR SELECT TO public USING (true);
CREATE POLICY req_insert_policy ON public.manpower_requisitions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY req_update_policy ON public.manpower_requisitions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY req_delete_policy ON public.manpower_requisitions FOR DELETE TO public USING (true);
GRANT ALL ON public.manpower_requisitions TO anon, authenticated, service_role;

-- 3. CONTRACT WORKER DEPLOYMENTS & POLICY ACCESS GATE
CREATE TABLE IF NOT EXISTS public.contract_worker_deployments (
    id text PRIMARY KEY DEFAULT ('dep_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    requisition_id text REFERENCES public.manpower_requisitions(id) ON DELETE SET NULL,
    vendor_id text NOT NULL,
    vendor_name text NOT NULL,
    worker_id text NOT NULL, -- Canonical workforce identity (employees.id)
    worker_name text NOT NULL,
    worker_code text,
    plant_location_id text NOT NULL,
    plant_location_name text NOT NULL,
    department_name text,
    trade_skill text,
    deployment_start_date date NOT NULL,
    deployment_end_date date,
    status text NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, SUBMITTED, DOCUMENT_VERIFIED, SAFETY_CLEARED, APPROVED, ACTIVE, SUSPENDED, RETURNED, COMPLETED
    is_safety_trained boolean NOT NULL DEFAULT false,
    is_biometric_enrolled boolean NOT NULL DEFAULT false,
    access_gate_decision text NOT NULL DEFAULT 'BLOCK', -- BLOCK, WARN, ALLOW_WITH_EXCEPTION
    access_gate_reason text,
    approved_by text,
    approved_at timestamptz,
    remarks text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_worker_deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dep_select_policy ON public.contract_worker_deployments;
DROP POLICY IF EXISTS dep_insert_policy ON public.contract_worker_deployments;
DROP POLICY IF EXISTS dep_update_policy ON public.contract_worker_deployments;
DROP POLICY IF EXISTS dep_delete_policy ON public.contract_worker_deployments;
CREATE POLICY dep_select_policy ON public.contract_worker_deployments FOR SELECT TO public USING (true);
CREATE POLICY dep_insert_policy ON public.contract_worker_deployments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY dep_update_policy ON public.contract_worker_deployments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY dep_delete_policy ON public.contract_worker_deployments FOR DELETE TO public USING (true);
GRANT ALL ON public.contract_worker_deployments TO anon, authenticated, service_role;

-- 4. VENDOR REPRESENTATIVES (Multi-Contact Directory)
CREATE TABLE IF NOT EXISTS public.vendor_representatives (
    id text PRIMARY KEY DEFAULT ('vrep_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    vendor_id text NOT NULL,
    contact_role text NOT NULL, -- PRIMARY, BILLING, COMPLIANCE_OFFICER, SITE_SUPERVISOR, SIGNATORY
    name text NOT NULL,
    email text NOT NULL,
    mobile text NOT NULL,
    designation text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_representatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vrep_select_policy ON public.vendor_representatives;
DROP POLICY IF EXISTS vrep_insert_policy ON public.vendor_representatives;
DROP POLICY IF EXISTS vrep_update_policy ON public.vendor_representatives;
DROP POLICY IF EXISTS vrep_delete_policy ON public.vendor_representatives;
CREATE POLICY vrep_select_policy ON public.vendor_representatives FOR SELECT TO public USING (true);
CREATE POLICY vrep_insert_policy ON public.vendor_representatives FOR INSERT TO public WITH CHECK (true);
CREATE POLICY vrep_update_policy ON public.vendor_representatives FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY vrep_delete_policy ON public.vendor_representatives FOR DELETE TO public USING (true);
GRANT ALL ON public.vendor_representatives TO anon, authenticated, service_role;

-- 5. VENDOR COMPLIANCE & OPERATIONAL PERFORMANCE SCORES
CREATE TABLE IF NOT EXISTS public.vendor_compliance_scores (
    id text PRIMARY KEY DEFAULT ('vcs_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    vendor_id text NOT NULL,
    vendor_name text NOT NULL,
    compliance_score numeric NOT NULL DEFAULT 100.0,
    performance_score numeric NOT NULL DEFAULT 100.0,
    overall_governance_score numeric NOT NULL DEFAULT 100.0,
    risk_level text NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    risk_trend text NOT NULL DEFAULT 'STABLE', -- IMPROVING, STABLE, DECLINING
    document_score numeric NOT NULL DEFAULT 25.0,
    statutory_score numeric NOT NULL DEFAULT 25.0,
    license_score numeric NOT NULL DEFAULT 20.0,
    attendance_discipline_score numeric NOT NULL DEFAULT 10.0,
    worker_kyc_score numeric NOT NULL DEFAULT 10.0,
    billing_accuracy_score numeric NOT NULL DEFAULT 10.0,
    fulfilment_rate_score numeric NOT NULL DEFAULT 25.0,
    has_expired_license boolean NOT NULL DEFAULT false,
    pending_worker_kyc_count integer NOT NULL DEFAULT 0,
    evaluated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_score UNIQUE (organization_id, vendor_id)
);
ALTER TABLE public.vendor_compliance_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vcs_select_policy ON public.vendor_compliance_scores;
DROP POLICY IF EXISTS vcs_insert_policy ON public.vendor_compliance_scores;
DROP POLICY IF EXISTS vcs_update_policy ON public.vendor_compliance_scores;
DROP POLICY IF EXISTS vcs_delete_policy ON public.vendor_compliance_scores;
CREATE POLICY vcs_select_policy ON public.vendor_compliance_scores FOR SELECT TO public USING (true);
CREATE POLICY vcs_insert_policy ON public.vendor_compliance_scores FOR INSERT TO public WITH CHECK (true);
CREATE POLICY vcs_update_policy ON public.vendor_compliance_scores FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY vcs_delete_policy ON public.vendor_compliance_scores FOR DELETE TO public USING (true);
GRANT ALL ON public.vendor_compliance_scores TO anon, authenticated, service_role;

-- 6. 5-WAY FINANCIAL RECONCILIATION WITH COMPLIANCE SNAPSHOT
CREATE TABLE IF NOT EXISTS public.vendor_5way_reconciliations (
    id text PRIMARY KEY DEFAULT ('vrec_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    billing_period text NOT NULL, -- e.g. 2026-08
    vendor_id text NOT NULL,
    vendor_name text NOT NULL,
    approved_manpower_count integer NOT NULL DEFAULT 0,
    actual_clocked_worker_count integer NOT NULL DEFAULT 0,
    clocked_ot_hours numeric NOT NULL DEFAULT 0.0,
    eligible_ot_hours numeric NOT NULL DEFAULT 0.0,
    approved_ot_hours numeric NOT NULL DEFAULT 0.0,
    rejected_ot_hours numeric NOT NULL DEFAULT 0.0,
    billable_ot_hours numeric NOT NULL DEFAULT 0.0,
    ot_variance_reason text,
    calculated_gross_wages numeric NOT NULL DEFAULT 0.0,
    calculated_margin numeric NOT NULL DEFAULT 0.0,
    calculated_gst numeric NOT NULL DEFAULT 0.0,
    calculated_tds numeric NOT NULL DEFAULT 0.0,
    calculated_net_payable numeric NOT NULL DEFAULT 0.0,
    vendor_claimed_amount numeric NOT NULL DEFAULT 0.0,
    variance_amount numeric NOT NULL DEFAULT 0.0,
    variance_pct numeric NOT NULL DEFAULT 0.0,
    match_status text NOT NULL DEFAULT 'PERFECT_MATCH', -- PERFECT_MATCH, VARIANCE_DETECTED, DISPUTED, RESOLVED, ON_HOLD
    compliance_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, -- Historical compliance snapshot at approval
    reconciliation_notes text,
    hr_approved_at timestamptz,
    finance_approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_5way_reconciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vrec_select_policy ON public.vendor_5way_reconciliations;
DROP POLICY IF EXISTS vrec_insert_policy ON public.vendor_5way_reconciliations;
DROP POLICY IF EXISTS vrec_update_policy ON public.vendor_5way_reconciliations;
DROP POLICY IF EXISTS vrec_delete_policy ON public.vendor_5way_reconciliations;
CREATE POLICY vrec_select_policy ON public.vendor_5way_reconciliations FOR SELECT TO public USING (true);
CREATE POLICY vrec_insert_policy ON public.vendor_5way_reconciliations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY vrec_update_policy ON public.vendor_5way_reconciliations FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY vrec_delete_policy ON public.vendor_5way_reconciliations FOR DELETE TO public USING (true);
GRANT ALL ON public.vendor_5way_reconciliations TO anon, authenticated, service_role;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_rel_person ON public.workforce_employment_relationships(person_id, status);
CREATE INDEX IF NOT EXISTS idx_req_org_plant ON public.manpower_requisitions(organization_id, plant_location_id);
CREATE INDEX IF NOT EXISTS idx_dep_req ON public.contract_worker_deployments(requisition_id, status);
CREATE INDEX IF NOT EXISTS idx_dep_worker ON public.contract_worker_deployments(worker_id);
CREATE INDEX IF NOT EXISTS idx_vrep_vendor ON public.vendor_representatives(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vcs_org_risk ON public.vendor_compliance_scores(organization_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_vrec_period_vendor ON public.vendor_5way_reconciliations(billing_period, vendor_id);
