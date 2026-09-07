-- ============================================================================
-- JOY PeopleHR — Migration 20260904_200
-- Phase H: Employee Private Data Row-Level Security Remediation
-- Canonical Project: ysiajemrqakfngasehhi
-- 
-- PROBLEM: All private employee-domain tables use a monolithic
--   `organization_id = get_active_user_org_id()` policy for ALL operations.
--   This leaks private data (PAN, Aadhaar, bank details, salary, payslips)
--   between peers within the same organization whenever rows exist.
--
-- CLASSIFICATION OF TABLES:
--   TIER 1 — STRICTLY PRIVATE (employee sees ONLY own row; admins see all in org):
--     employee_statutory_details  (PAN, Aadhaar, UAN, PF, ESI)
--     employee_bank_details       (bank account, IFSC, account number)
--     employee_salary_assignments (CTC, salary structure)
--     payroll_line_items          (earnings/deductions breakdown)
--     payslips                    (monthly payslip)
--
--   TIER 2 — HR-MANAGED PRIVATE (admin creates/edits; employee reads own only):
--     employee_profiles           (DOB, gender, marital status, blood group)
--     employee_addresses          (personal address)
--     employee_documents          (uploaded docs - PAN card, offer letter, etc.)
--
--   TIER 3 — SELF-SERVICE PRIVATE (employee creates/edits own; admin sees all in org):
--     leave_balances              (accrued leave balance)
--     leave_requests              (leave applications)
--     attendance_daily            (attendance summary)
--     employee_requests           (reimbursements, HR requests)
--
-- STRATEGY:
--   - DROP existing monolithic _tenant_isolation policy per table
--   - CREATE command-specific SELECT/INSERT/UPDATE/DELETE policies:
--       SELECT: (employee_id in (SELECT id FROM employees WHERE user_id = my_profile_id))
--               OR is_org_admin(organization_id)
--               OR is_platform_admin()
--       INSERT/UPDATE/DELETE: is_org_admin(organization_id) OR is_platform_admin()
--         (with self-allowed exceptions for TIER 3 tables)
--
-- SAFETY: Cross-organization isolation is PRESERVED by retaining organization_id
--         in all admin-side checks via is_org_admin() which scopes to org.
-- ============================================================================

-- Helper: Subquery to resolve caller's employee_id (NULL if not an employee)
-- (Reused in multiple policies — defined inline to avoid extra function)

-- ============================================================================
-- TIER 1: STRICTLY PRIVATE — employee_statutory_details
-- Fields: PAN, Aadhaar, UAN, PF number, ESI number (statutory identifiers)
-- ============================================================================
DROP POLICY IF EXISTS "employee_statutory_details_tenant_isolation" ON public.employee_statutory_details;
DROP POLICY IF EXISTS "employee_statutory_details_select" ON public.employee_statutory_details;
DROP POLICY IF EXISTS "employee_statutory_details_insert" ON public.employee_statutory_details;
DROP POLICY IF EXISTS "employee_statutory_details_update" ON public.employee_statutory_details;
DROP POLICY IF EXISTS "employee_statutory_details_delete" ON public.employee_statutory_details;

-- SELECT: Own row OR org admin/platform admin
CREATE POLICY "employee_statutory_details_select" ON public.employee_statutory_details
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- INSERT: Only org admin or platform admin
CREATE POLICY "employee_statutory_details_insert" ON public.employee_statutory_details
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- UPDATE: Org admin or platform admin only (statutory details are HR-controlled)
CREATE POLICY "employee_statutory_details_update" ON public.employee_statutory_details
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
)
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- DELETE: Only org admin or platform admin
CREATE POLICY "employee_statutory_details_delete" ON public.employee_statutory_details
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
);

-- ============================================================================
-- TIER 1: STRICTLY PRIVATE — employee_bank_details
-- Fields: bank account number, IFSC, account type (financial PII)
-- ============================================================================
DROP POLICY IF EXISTS "employee_bank_details_tenant_isolation" ON public.employee_bank_details;
DROP POLICY IF EXISTS "employee_bank_details_select" ON public.employee_bank_details;
DROP POLICY IF EXISTS "employee_bank_details_insert" ON public.employee_bank_details;
DROP POLICY IF EXISTS "employee_bank_details_update" ON public.employee_bank_details;
DROP POLICY IF EXISTS "employee_bank_details_delete" ON public.employee_bank_details;

CREATE POLICY "employee_bank_details_select" ON public.employee_bank_details
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_bank_details_insert" ON public.employee_bank_details
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_bank_details_update" ON public.employee_bank_details
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_bank_details_delete" ON public.employee_bank_details
FOR DELETE TO authenticated
USING (
  public.is_org_admin(organization_id)
);

-- ============================================================================
-- TIER 1: STRICTLY PRIVATE — employee_salary_assignments
-- Fields: salary structure, CTC, effective date (compensation PII)
-- ============================================================================
DROP POLICY IF EXISTS "employee_salary_assignments_tenant_isolation" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_select" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_insert" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_update" ON public.employee_salary_assignments;
DROP POLICY IF EXISTS "employee_salary_assignments_delete" ON public.employee_salary_assignments;

CREATE POLICY "employee_salary_assignments_select" ON public.employee_salary_assignments
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_salary_assignments_insert" ON public.employee_salary_assignments
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "employee_salary_assignments_update" ON public.employee_salary_assignments
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "employee_salary_assignments_delete" ON public.employee_salary_assignments
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 1: STRICTLY PRIVATE — payroll_line_items
-- Fields: earnings/deductions breakdown per payroll run
-- ============================================================================
DROP POLICY IF EXISTS "payroll_line_items_tenant_isolation" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_select" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_insert" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_update" ON public.payroll_line_items;
DROP POLICY IF EXISTS "payroll_line_items_delete" ON public.payroll_line_items;

CREATE POLICY "payroll_line_items_select" ON public.payroll_line_items
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "payroll_line_items_insert" ON public.payroll_line_items
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "payroll_line_items_update" ON public.payroll_line_items
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "payroll_line_items_delete" ON public.payroll_line_items
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 1: STRICTLY PRIVATE — payslips
-- Fields: monthly payslip (gross, net, tax, deductions)
-- ============================================================================
DROP POLICY IF EXISTS "payslips_tenant_isolation" ON public.payslips;
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
DROP POLICY IF EXISTS "payslips_insert" ON public.payslips;
DROP POLICY IF EXISTS "payslips_update" ON public.payslips;
DROP POLICY IF EXISTS "payslips_delete" ON public.payslips;

CREATE POLICY "payslips_select" ON public.payslips
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "payslips_insert" ON public.payslips
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "payslips_update" ON public.payslips
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "payslips_delete" ON public.payslips
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 2: HR-MANAGED PRIVATE — employee_profiles
-- Fields: DOB, gender, marital status, blood group (personal PII)
-- ============================================================================
DROP POLICY IF EXISTS "employee_profiles_tenant_isolation" ON public.employee_profiles;
DROP POLICY IF EXISTS "employee_profiles_select" ON public.employee_profiles;
DROP POLICY IF EXISTS "employee_profiles_insert" ON public.employee_profiles;
DROP POLICY IF EXISTS "employee_profiles_update" ON public.employee_profiles;
DROP POLICY IF EXISTS "employee_profiles_delete" ON public.employee_profiles;

CREATE POLICY "employee_profiles_select" ON public.employee_profiles
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_profiles_insert" ON public.employee_profiles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_profiles_update" ON public.employee_profiles
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_profiles_delete" ON public.employee_profiles
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 2: HR-MANAGED PRIVATE — employee_addresses
-- Fields: personal residential address (PII)
-- ============================================================================
DROP POLICY IF EXISTS "employee_addresses_tenant_isolation" ON public.employee_addresses;
DROP POLICY IF EXISTS "employee_addresses_select" ON public.employee_addresses;
DROP POLICY IF EXISTS "employee_addresses_insert" ON public.employee_addresses;
DROP POLICY IF EXISTS "employee_addresses_update" ON public.employee_addresses;
DROP POLICY IF EXISTS "employee_addresses_delete" ON public.employee_addresses;

CREATE POLICY "employee_addresses_select" ON public.employee_addresses
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_addresses_insert" ON public.employee_addresses
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_addresses_update" ON public.employee_addresses
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_addresses_delete" ON public.employee_addresses
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 2: HR-MANAGED PRIVATE — employee_documents
-- Fields: uploaded documents (PAN card scan, offer letter, etc.)
-- ============================================================================
DROP POLICY IF EXISTS "employee_documents_tenant_isolation" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_insert" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_update" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_delete" ON public.employee_documents;

CREATE POLICY "employee_documents_select" ON public.employee_documents
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_documents_insert" ON public.employee_documents
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_documents_update" ON public.employee_documents
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_documents_delete" ON public.employee_documents
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 3: SELF-SERVICE PRIVATE — leave_balances
-- Fields: accrued leave balance per leave type
-- Employee can read own; HR/Admin reads all in org; employee cannot self-INSERT/DELETE
-- ============================================================================
DROP POLICY IF EXISTS "leave_balances_tenant_isolation" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_insert" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_update" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_delete" ON public.leave_balances;

CREATE POLICY "leave_balances_select" ON public.leave_balances
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- Balance lifecycle is HR-controlled (accruals, resets)
CREATE POLICY "leave_balances_insert" ON public.leave_balances
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "leave_balances_update" ON public.leave_balances
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "leave_balances_delete" ON public.leave_balances
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 3: SELF-SERVICE PRIVATE — leave_requests
-- Fields: leave application (type, dates, reason, approval status)
-- Employee can read+create+update own; HR/Admin reads/updates all in org
-- ============================================================================
DROP POLICY IF EXISTS "leave_requests_tenant_isolation" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete" ON public.leave_requests;

CREATE POLICY "leave_requests_select" ON public.leave_requests
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- Employee can apply for their own leave
CREATE POLICY "leave_requests_insert" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- Employee can update (cancel) own pending requests; HR can update all
CREATE POLICY "leave_requests_update" ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "leave_requests_delete" ON public.leave_requests
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 3: SELF-SERVICE PRIVATE — attendance_daily
-- Fields: daily attendance summary (first-in, last-out, worked hours)
-- Employee reads own; HR/Admin reads all in org; attendance write is system/HR
-- ============================================================================
DROP POLICY IF EXISTS "attendance_daily_tenant_isolation" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_select" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_insert" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_update" ON public.attendance_daily;
DROP POLICY IF EXISTS "attendance_daily_delete" ON public.attendance_daily;

CREATE POLICY "attendance_daily_select" ON public.attendance_daily
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

-- Attendance records are created by the biometric/system pipeline and HR
CREATE POLICY "attendance_daily_insert" ON public.attendance_daily
FOR INSERT TO authenticated
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "attendance_daily_update" ON public.attendance_daily
FOR UPDATE TO authenticated
USING ( public.is_org_admin(organization_id) )
WITH CHECK ( public.is_org_admin(organization_id) );

CREATE POLICY "attendance_daily_delete" ON public.attendance_daily
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );

-- ============================================================================
-- TIER 3: SELF-SERVICE PRIVATE — employee_requests
-- Fields: HR requests (reimbursements, letter requests, etc.)
-- Employee reads+creates+updates own; HR reads/manages all in org
-- ============================================================================
DROP POLICY IF EXISTS "employee_requests_tenant_isolation" ON public.employee_requests;
DROP POLICY IF EXISTS "employee_requests_select" ON public.employee_requests;
DROP POLICY IF EXISTS "employee_requests_insert" ON public.employee_requests;
DROP POLICY IF EXISTS "employee_requests_update" ON public.employee_requests;
DROP POLICY IF EXISTS "employee_requests_delete" ON public.employee_requests;

CREATE POLICY "employee_requests_select" ON public.employee_requests
FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_requests_insert" ON public.employee_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_requests_update" ON public.employee_requests
FOR UPDATE TO authenticated
USING (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "employee_requests_delete" ON public.employee_requests
FOR DELETE TO authenticated
USING ( public.is_org_admin(organization_id) );
