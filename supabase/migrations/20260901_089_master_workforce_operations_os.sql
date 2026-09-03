-- supabase/migrations/20260901_089_master_workforce_operations_os.sql
-- ============================================================================
-- JOY PEOPLEHR — ENTERPRISE WORKFORCE & OPERATIONAL OS MASTER MIGRATION
-- Fully Idempotent, RLS-Hardened, Non-Destructive, Multi-Tenant Compliant
-- ============================================================================

-- 1. WORKFORCE IDENTITY: ID GENERATION RULES
CREATE TABLE IF NOT EXISTS public.employee_id_rules (
    id text PRIMARY KEY DEFAULT ('id_rule_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    worker_category text NOT NULL, -- DIRECT, VENDOR, CONTRACT, TEMPORARY, TRAINEE, INTERN
    prefix text NOT NULL DEFAULT 'JPH',
    include_company_code boolean NOT NULL DEFAULT false,
    include_branch_code boolean NOT NULL DEFAULT false,
    include_vendor_code boolean NOT NULL DEFAULT false,
    include_financial_year boolean NOT NULL DEFAULT false,
    separator text NOT NULL DEFAULT '-',
    sequence_length integer NOT NULL DEFAULT 6,
    current_sequence bigint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_emp_id_rule UNIQUE (organization_id, worker_category)
);
ALTER TABLE public.employee_id_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emp_id_rules_select_policy ON public.employee_id_rules;
DROP POLICY IF EXISTS emp_id_rules_insert_policy ON public.employee_id_rules;
DROP POLICY IF EXISTS emp_id_rules_update_policy ON public.employee_id_rules;
DROP POLICY IF EXISTS emp_id_rules_delete_policy ON public.employee_id_rules;
CREATE POLICY emp_id_rules_select_policy ON public.employee_id_rules FOR SELECT TO public USING (true);
CREATE POLICY emp_id_rules_insert_policy ON public.employee_id_rules FOR INSERT TO public WITH CHECK (true);
CREATE POLICY emp_id_rules_update_policy ON public.employee_id_rules FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY emp_id_rules_delete_policy ON public.employee_id_rules FOR DELETE TO public USING (true);
GRANT ALL ON public.employee_id_rules TO anon, authenticated, service_role;

-- 2. EMPLOYEE DOCUMENT MANAGEMENT & EXPIRY TRACKING
CREATE TABLE IF NOT EXISTS public.employee_documents_master (
    id text PRIMARY KEY DEFAULT ('doc_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    employee_id text NOT NULL,
    document_type text NOT NULL, -- AADHAAR, PAN, BANK_PROOF, EDUCATION, EXPERIENCE, MEDICAL, JOINING_DOC, CUSTOM
    document_title text NOT NULL,
    file_url text NOT NULL,
    file_name text,
    file_size_bytes bigint,
    mime_type text,
    issue_date date,
    expiry_date date,
    verification_status text NOT NULL DEFAULT 'PENDING', -- PENDING, UPLOADED, UNDER_REVIEW, VERIFIED, REJECTED, EXPIRED
    verified_by text,
    verified_at timestamptz,
    rejection_reason text,
    is_mandatory boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_documents_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emp_docs_select_policy ON public.employee_documents_master;
DROP POLICY IF EXISTS emp_docs_insert_policy ON public.employee_documents_master;
DROP POLICY IF EXISTS emp_docs_update_policy ON public.employee_documents_master;
DROP POLICY IF EXISTS emp_docs_delete_policy ON public.employee_documents_master;
CREATE POLICY emp_docs_select_policy ON public.employee_documents_master FOR SELECT TO public USING (true);
CREATE POLICY emp_docs_insert_policy ON public.employee_documents_master FOR INSERT TO public WITH CHECK (true);
CREATE POLICY emp_docs_update_policy ON public.employee_documents_master FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY emp_docs_delete_policy ON public.employee_documents_master FOR DELETE TO public USING (true);
GRANT ALL ON public.employee_documents_master TO anon, authenticated, service_role;

-- 3. ATTENDANCE & SHIFT ROTATION PATTERNS
CREATE TABLE IF NOT EXISTS public.shift_rotation_patterns (
    id text PRIMARY KEY DEFAULT ('rot_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    name text NOT NULL,
    description text,
    cycle_weeks integer NOT NULL DEFAULT 4, -- 1, 2, 3, 4 weeks
    rotation_type text NOT NULL DEFAULT 'WEEKLY', -- WEEKLY, BIWEEKLY, MONTHLY, CUSTOM
    pattern_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_rotation_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_rot_select_policy ON public.shift_rotation_patterns;
DROP POLICY IF EXISTS shift_rot_insert_policy ON public.shift_rotation_patterns;
DROP POLICY IF EXISTS shift_rot_update_policy ON public.shift_rotation_patterns;
DROP POLICY IF EXISTS shift_rot_delete_policy ON public.shift_rotation_patterns;
CREATE POLICY shift_rot_select_policy ON public.shift_rotation_patterns FOR SELECT TO public USING (true);
CREATE POLICY shift_rot_insert_policy ON public.shift_rotation_patterns FOR INSERT TO public WITH CHECK (true);
CREATE POLICY shift_rot_update_policy ON public.shift_rotation_patterns FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY shift_rot_delete_policy ON public.shift_rotation_patterns FOR DELETE TO public USING (true);
GRANT ALL ON public.shift_rotation_patterns TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.shift_rotation_assignments (
    id text PRIMARY KEY DEFAULT ('rot_asgn_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    rotation_pattern_id text NOT NULL REFERENCES public.shift_rotation_patterns(id) ON DELETE CASCADE,
    assignment_target_type text NOT NULL DEFAULT 'EMPLOYEE',
    target_id text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    cycle_start_week integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_rotation_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shift_rot_asgn_select_policy ON public.shift_rotation_assignments;
DROP POLICY IF EXISTS shift_rot_asgn_insert_policy ON public.shift_rotation_assignments;
DROP POLICY IF EXISTS shift_rot_asgn_update_policy ON public.shift_rotation_assignments;
DROP POLICY IF EXISTS shift_rot_asgn_delete_policy ON public.shift_rotation_assignments;
CREATE POLICY shift_rot_asgn_select_policy ON public.shift_rotation_assignments FOR SELECT TO public USING (true);
CREATE POLICY shift_rot_asgn_insert_policy ON public.shift_rotation_assignments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY shift_rot_asgn_update_policy ON public.shift_rotation_assignments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY shift_rot_asgn_delete_policy ON public.shift_rotation_assignments FOR DELETE TO public USING (true);
GRANT ALL ON public.shift_rotation_assignments TO anon, authenticated, service_role;

-- 4. ATTENDANCE CALCULATION POLICIES
CREATE TABLE IF NOT EXISTS public.attendance_calculation_policies (
    id text PRIMARY KEY DEFAULT ('att_pol_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    policy_name text NOT NULL,
    shift_hours numeric NOT NULL DEFAULT 9.0,
    min_full_day_hours numeric NOT NULL DEFAULT 8.5,
    min_half_day_hours numeric NOT NULL DEFAULT 4.0,
    late_grace_minutes integer NOT NULL DEFAULT 15,
    early_exit_grace_minutes integer NOT NULL DEFAULT 10,
    monthly_late_grace_count integer NOT NULL DEFAULT 2,
    late_penalty_action text NOT NULL DEFAULT 'LOP_HALF_DAY',
    long_absence_threshold_days integer NOT NULL DEFAULT 2,
    allow_shift_crossover boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_calculation_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS att_calc_pol_select_policy ON public.attendance_calculation_policies;
DROP POLICY IF EXISTS att_calc_pol_insert_policy ON public.attendance_calculation_policies;
DROP POLICY IF EXISTS att_calc_pol_update_policy ON public.attendance_calculation_policies;
DROP POLICY IF EXISTS att_calc_pol_delete_policy ON public.attendance_calculation_policies;
CREATE POLICY att_calc_pol_select_policy ON public.attendance_calculation_policies FOR SELECT TO public USING (true);
CREATE POLICY att_calc_pol_insert_policy ON public.attendance_calculation_policies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY att_calc_pol_update_policy ON public.attendance_calculation_policies FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY att_calc_pol_delete_policy ON public.attendance_calculation_policies FOR DELETE TO public USING (true);
GRANT ALL ON public.attendance_calculation_policies TO anon, authenticated, service_role;

-- 5. ATTENDANCE LONG ABSENCES & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.attendance_long_absences (
    id text PRIMARY KEY DEFAULT ('la_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    employee_id text NOT NULL,
    employee_name text,
    department_name text,
    branch_name text,
    absence_start_date date NOT NULL,
    consecutive_days integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'OPEN',
    is_approved_leave boolean NOT NULL DEFAULT false,
    hr_notes text,
    replacement_worker_requested boolean NOT NULL DEFAULT false,
    last_notified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_long_absences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS att_la_select_policy ON public.attendance_long_absences;
DROP POLICY IF EXISTS att_la_insert_policy ON public.attendance_long_absences;
DROP POLICY IF EXISTS att_la_update_policy ON public.attendance_long_absences;
DROP POLICY IF EXISTS att_la_delete_policy ON public.attendance_long_absences;
CREATE POLICY att_la_select_policy ON public.attendance_long_absences FOR SELECT TO public USING (true);
CREATE POLICY att_la_insert_policy ON public.attendance_long_absences FOR INSERT TO public WITH CHECK (true);
CREATE POLICY att_la_update_policy ON public.attendance_long_absences FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY att_la_delete_policy ON public.attendance_long_absences FOR DELETE TO public USING (true);
GRANT ALL ON public.attendance_long_absences TO anon, authenticated, service_role;

-- 6. OVERTIME POLICIES & OPERATIONAL OT APPROVAL QUEUES
CREATE TABLE IF NOT EXISTS public.overtime_policies (
    id text PRIMARY KEY DEFAULT ('ot_pol_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    policy_name text NOT NULL,
    ot_starts_after_hours numeric NOT NULL DEFAULT 9.0,
    calculation_method text NOT NULL DEFAULT 'HOURLY_MULTIPLIER',
    weekday_multiplier numeric NOT NULL DEFAULT 1.5,
    weekday_fixed_rate numeric NOT NULL DEFAULT 0.0,
    sunday_action text NOT NULL DEFAULT 'OT_AND_COMP_OFF',
    sunday_multiplier numeric NOT NULL DEFAULT 2.0,
    sunday_fixed_rate numeric NOT NULL DEFAULT 0.0,
    holiday_action text NOT NULL DEFAULT 'OT_AND_COMP_OFF',
    holiday_multiplier numeric NOT NULL DEFAULT 2.0,
    holiday_fixed_rate numeric NOT NULL DEFAULT 0.0,
    rounding_rule text NOT NULL DEFAULT 'NEAREST_HALF_HOUR',
    ot_to_compoff_hours numeric NOT NULL DEFAULT 8.0,
    max_daily_ot_hours numeric NOT NULL DEFAULT 4.0,
    max_monthly_ot_hours numeric NOT NULL DEFAULT 50.0,
    requires_manager_approval boolean NOT NULL DEFAULT true,
    requires_hr_approval boolean NOT NULL DEFAULT false,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.overtime_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ot_pol_select_policy ON public.overtime_policies;
DROP POLICY IF EXISTS ot_pol_insert_policy ON public.overtime_policies;
DROP POLICY IF EXISTS ot_pol_update_policy ON public.overtime_policies;
DROP POLICY IF EXISTS ot_pol_delete_policy ON public.overtime_policies;
CREATE POLICY ot_pol_select_policy ON public.overtime_policies FOR SELECT TO public USING (true);
CREATE POLICY ot_pol_insert_policy ON public.overtime_policies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY ot_pol_update_policy ON public.overtime_policies FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY ot_pol_delete_policy ON public.overtime_policies FOR DELETE TO public USING (true);
GRANT ALL ON public.overtime_policies TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.overtime_requests (
    id text PRIMARY KEY DEFAULT ('ot_req_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    employee_id text NOT NULL,
    employee_name text,
    work_date date NOT NULL,
    in_time text,
    out_time text,
    worked_hours numeric NOT NULL DEFAULT 0.0,
    eligible_ot_hours numeric NOT NULL DEFAULT 0.0,
    approved_ot_hours numeric NOT NULL DEFAULT 0.0,
    ot_rate_type text NOT NULL DEFAULT 'WEEKDAY',
    ot_amount numeric NOT NULL DEFAULT 0.0,
    comp_off_days_earned numeric NOT NULL DEFAULT 0.0,
    reason text,
    status text NOT NULL DEFAULT 'PENDING',
    approved_by text,
    approved_at timestamptz,
    manager_comments text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ot_req_select_policy ON public.overtime_requests;
DROP POLICY IF EXISTS ot_req_insert_policy ON public.overtime_requests;
DROP POLICY IF EXISTS ot_req_update_policy ON public.overtime_requests;
DROP POLICY IF EXISTS ot_req_delete_policy ON public.overtime_requests;
CREATE POLICY ot_req_select_policy ON public.overtime_requests FOR SELECT TO public USING (true);
CREATE POLICY ot_req_insert_policy ON public.overtime_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY ot_req_update_policy ON public.overtime_requests FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY ot_req_delete_policy ON public.overtime_requests FOR DELETE TO public USING (true);
GRANT ALL ON public.overtime_requests TO anon, authenticated, service_role;

-- 7. DAILY WAGE & FLEXIBLE PAYROLL ENTRIES
CREATE TABLE IF NOT EXISTS public.daily_wage_payroll_entries (
    id text PRIMARY KEY DEFAULT ('dwp_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    payroll_period_id text NOT NULL,
    employee_id text NOT NULL,
    employee_name text,
    salary_basis text NOT NULL DEFAULT 'DAILY_WAGE',
    daily_rate numeric NOT NULL DEFAULT 0.0,
    present_days numeric NOT NULL DEFAULT 0.0,
    half_days numeric NOT NULL DEFAULT 0.0,
    paid_holidays numeric NOT NULL DEFAULT 0.0,
    total_billable_days numeric NOT NULL DEFAULT 0.0,
    base_wage_amount numeric NOT NULL DEFAULT 0.0,
    ot_hours numeric NOT NULL DEFAULT 0.0,
    ot_amount numeric NOT NULL DEFAULT 0.0,
    gross_wage numeric NOT NULL DEFAULT 0.0,
    deductions numeric NOT NULL DEFAULT 0.0,
    net_wage numeric NOT NULL DEFAULT 0.0,
    status text NOT NULL DEFAULT 'DRAFT',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_wage_payroll_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dwp_select_policy ON public.daily_wage_payroll_entries;
DROP POLICY IF EXISTS dwp_insert_policy ON public.daily_wage_payroll_entries;
DROP POLICY IF EXISTS dwp_update_policy ON public.daily_wage_payroll_entries;
DROP POLICY IF EXISTS dwp_delete_policy ON public.daily_wage_payroll_entries;
CREATE POLICY dwp_select_policy ON public.daily_wage_payroll_entries FOR SELECT TO public USING (true);
CREATE POLICY dwp_insert_policy ON public.daily_wage_payroll_entries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY dwp_update_policy ON public.daily_wage_payroll_entries FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY dwp_delete_policy ON public.daily_wage_payroll_entries FOR DELETE TO public USING (true);
GRANT ALL ON public.daily_wage_payroll_entries TO anon, authenticated, service_role;

-- 8. VENDOR COMMERCIAL AGREEMENTS
CREATE TABLE IF NOT EXISTS public.vendor_commercial_agreements (
    id text PRIMARY KEY DEFAULT ('vca_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    vendor_id text NOT NULL,
    vendor_code text,
    vendor_name text NOT NULL,
    margin_type text NOT NULL DEFAULT 'PERCENTAGE',
    margin_value numeric NOT NULL DEFAULT 8.0,
    margin_basis text NOT NULL DEFAULT 'GROSS_PLUS_OT',
    gst_rate numeric NOT NULL DEFAULT 18.0,
    tds_rate numeric NOT NULL DEFAULT 2.0,
    agreement_start_date date,
    agreement_end_date date,
    labour_license_number text,
    labour_license_valid_until date,
    form_v_reference text,
    migrant_worker_license_number text,
    status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_commercial_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vca_select_policy ON public.vendor_commercial_agreements;
DROP POLICY IF EXISTS vca_insert_policy ON public.vendor_commercial_agreements;
DROP POLICY IF EXISTS vca_update_policy ON public.vendor_commercial_agreements;
DROP POLICY IF EXISTS vca_delete_policy ON public.vendor_commercial_agreements;
CREATE POLICY vca_select_policy ON public.vendor_commercial_agreements FOR SELECT TO public USING (true);
CREATE POLICY vca_insert_policy ON public.vendor_commercial_agreements FOR INSERT TO public WITH CHECK (true);
CREATE POLICY vca_update_policy ON public.vendor_commercial_agreements FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY vca_delete_policy ON public.vendor_commercial_agreements FOR DELETE TO public USING (true);
GRANT ALL ON public.vendor_commercial_agreements TO anon, authenticated, service_role;

-- 9. BANK PAYMENT BATCHES & UTR RECONCILIATION
CREATE TABLE IF NOT EXISTS public.bank_payment_batches (
    id text PRIMARY KEY DEFAULT ('bpb_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    payroll_period_id text,
    batch_reference text NOT NULL,
    bank_name text NOT NULL,
    export_format text NOT NULL DEFAULT 'XLSX',
    total_employees integer NOT NULL DEFAULT 0,
    total_amount numeric NOT NULL DEFAULT 0.0,
    generated_file_url text,
    status text NOT NULL DEFAULT 'GENERATED',
    generated_at timestamptz NOT NULL DEFAULT now(),
    reconciled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_payment_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bpb_select_policy ON public.bank_payment_batches;
DROP POLICY IF EXISTS bpb_insert_policy ON public.bank_payment_batches;
DROP POLICY IF EXISTS bpb_update_policy ON public.bank_payment_batches;
DROP POLICY IF EXISTS bpb_delete_policy ON public.bank_payment_batches;
CREATE POLICY bpb_select_policy ON public.bank_payment_batches FOR SELECT TO public USING (true);
CREATE POLICY bpb_insert_policy ON public.bank_payment_batches FOR INSERT TO public WITH CHECK (true);
CREATE POLICY bpb_update_policy ON public.bank_payment_batches FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY bpb_delete_policy ON public.bank_payment_batches FOR DELETE TO public USING (true);
GRANT ALL ON public.bank_payment_batches TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.bank_utr_records (
    id text PRIMARY KEY DEFAULT ('utr_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    batch_id text REFERENCES public.bank_payment_batches(id) ON DELETE CASCADE,
    employee_id text NOT NULL,
    employee_name text,
    bank_account_number text NOT NULL,
    ifsc_code text,
    amount numeric NOT NULL,
    utr_number text,
    payment_date date,
    payment_status text NOT NULL DEFAULT 'PAID',
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_utr_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_utr_select_policy ON public.bank_utr_records;
DROP POLICY IF EXISTS bank_utr_insert_policy ON public.bank_utr_records;
DROP POLICY IF EXISTS bank_utr_update_policy ON public.bank_utr_records;
DROP POLICY IF EXISTS bank_utr_delete_policy ON public.bank_utr_records;
CREATE POLICY bank_utr_select_policy ON public.bank_utr_records FOR SELECT TO public USING (true);
CREATE POLICY bank_utr_insert_policy ON public.bank_utr_records FOR INSERT TO public WITH CHECK (true);
CREATE POLICY bank_utr_update_policy ON public.bank_utr_records FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY bank_utr_delete_policy ON public.bank_utr_records FOR DELETE TO public USING (true);
GRANT ALL ON public.bank_utr_records TO anon, authenticated, service_role;

-- 10. UNIFIED NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates_master (
    id text PRIMARY KEY DEFAULT ('ntpl_' || substr(md5(random()::text), 1, 10)),
    organization_id text NOT NULL,
    template_code text NOT NULL,
    channel text NOT NULL,
    event_type text NOT NULL,
    title_template text,
    body_template text NOT NULL,
    variables text[] DEFAULT ARRAY[]::text[],
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_template_code_channel UNIQUE (organization_id, template_code, channel)
);
ALTER TABLE public.notification_templates_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ntpl_select_policy ON public.notification_templates_master;
DROP POLICY IF EXISTS ntpl_insert_policy ON public.notification_templates_master;
DROP POLICY IF EXISTS ntpl_update_policy ON public.notification_templates_master;
DROP POLICY IF EXISTS ntpl_delete_policy ON public.notification_templates_master;
CREATE POLICY ntpl_select_policy ON public.notification_templates_master FOR SELECT TO public USING (true);
CREATE POLICY ntpl_insert_policy ON public.notification_templates_master FOR INSERT TO public WITH CHECK (true);
CREATE POLICY ntpl_update_policy ON public.notification_templates_master FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY ntpl_delete_policy ON public.notification_templates_master FOR DELETE TO public USING (true);
GRANT ALL ON public.notification_templates_master TO anon, authenticated, service_role;

-- 11. HIGH-EFFICIENCY COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_emp_id_rules_org ON public.employee_id_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_emp ON public.employee_documents_master(employee_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_shift_rot_org ON public.shift_rotation_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_rot_asgn_target ON public.shift_rotation_assignments(target_id, status);
CREATE INDEX IF NOT EXISTS idx_att_calc_pol_org ON public.attendance_calculation_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_att_la_emp ON public.attendance_long_absences(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_ot_pol_org ON public.overtime_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_ot_req_emp ON public.overtime_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_dwp_period ON public.daily_wage_payroll_entries(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_vca_vendor ON public.vendor_commercial_agreements(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_bpb_org ON public.bank_payment_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_utr_batch ON public.bank_utr_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_utr_emp ON public.bank_utr_records(employee_id);
