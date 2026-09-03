# JOY PeopleHR — Row Level Security (RLS) Architecture
**Document Version:** 1.0.0-PROD  
**Database Project ID:** `ysiajemrqakfngasehhi` (Greenfield Supabase / PostgreSQL 15)  
**Classification:** Security Architecture & Isolation Blueprint  

---

## 1. Core Security Principle: Defense-in-Depth Isolation

In JOY PeopleHR, multi-tenancy is enforced primarily at the **database engine layer**. Frontend filtering and API middleware are treated merely as presentation helpers. 

$$\text{Zero Trust Invariant: A user in Organization A can NEVER select, insert, update, or delete records in Organization B.}$$

```
                                      [Supabase Client Request]
                                                  │
                                                  ▼
                                      [PostgreSQL 15 Kernel]
                                                  │
                                                  ▼
                                    [Row Level Security (RLS) Engine]
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      │                                                       │
                      ▼                                                       ▼
        [Platform Control Plane Policy]                         [Tenant Organization Policy]
    auth.jwt() ->> 'is_platform_admin' = true               organization_id = (SELECT get_active_user_org_id())
                      │                                                       │
                      ▼                                                       ▼
        Platform Tables Accessible                             Organization Data Strictly Isolated
```

---

## 2. Authentication & Tenant Session Resolution

1. **Identity Provider**: Supabase Auth (`auth.users`) provides cryptographically signed JWTs.
2. **JWT Claims Injection**: Upon login, user metadata carries:
   - `sub` (User UUID)
   - `email`
   - `organization_id` (Active Tenant UUID)
   - `role` (Primary Role Code, e.g. `'COMPANY_ADMIN'`, `'EMPLOYEE'`, `'SUPER_ADMIN'`)
3. **Session Context Helper Functions**:
   To avoid repetitive, slow nested subqueries across RLS policies, PostgreSQL helper functions are defined with `SECURITY DEFINER` and `STABLE` attributes:

```sql
-- Returns the active organization UUID from session or JWT
CREATE OR REPLACE FUNCTION public.get_active_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_org_id', true), '')::UUID,
    (NULLIF(auth.jwt() ->> 'organization_id', ''))::UUID,
    (SELECT organization_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- Returns the active employee UUID for the logged in user
CREATE OR REPLACE FUNCTION public.get_active_user_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Returns true if current session is an authorized Platform Operator
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'is_platform_admin')::BOOLEAN,
    EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND is_active = true)
  );
$$;
```

---

## 3. High-Performance RLS Policy Matrix

To prevent PostgreSQL query planner bottlenecks (specifically the `SubPlan/InitPlan` performance penalty on large tables), all RLS policies wrap helper functions inside scalar subqueries `(SELECT get_active_user_org_id())`, allowing the planner to cache the evaluation once per query instead of per-row.

### Canonical Tenant Isolation Policy Pattern

```sql
-- Direct Tenant Tables (e.g. companies, departments, designations, shifts, leave_types)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_tenant_isolation_select"
ON public.companies
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR (SELECT public.is_platform_admin())
);

CREATE POLICY "companies_tenant_isolation_modify"
ON public.companies
FOR ALL
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  OR (SELECT public.is_platform_admin())
)
WITH CHECK (
  organization_id = (SELECT public.get_active_user_org_id())
  OR (SELECT public.is_platform_admin())
);
```

---

## 4. Multi-Tier Role Access Scopes

| Scope Level | Role Classes | Access Rule Definition | Target Modules |
| :--- | :--- | :--- | :--- |
| **0. Platform** | `Super Admin`, `Platform Operator` | Unrestricted read/write across control plane + elevated tenant support access. | `platform_*`, `saas_*` |
| **1. Organization** | `Company Admin`, `Organization Owner` | Full read/write access across all legal entities, branches, and departments in the active `organization_id`. | Global Org Config, RBAC, All HR Modules |
| **2. Company / HR** | `HR Head`, `HR Admin` | Full operational read/write within assigned legal entities (`company_id`); cannot modify system-wide subscription settings. | People, Onboarding, Payroll, Attendance, Leave |
| **3. Department** | `Manager` | View and approve records where `reporting_manager_id == current_user.employee_id` OR `department_id == current_user.department_id`. | Attendance, Regularizations, Leave Approval, Appraisals |
| **4. Team** | `Team Lead` | View and manage shifts for immediate team members. | Team Roster, Shift Schedule, Daily Exceptions |
| **5. Self (ESS)** | `Employee` | Strictly limited to personal records where `employee_id == (SELECT get_active_user_employee_id())`. | ESS Dashboard, My Attendance, My Leaves, My Payslips |

---

## 5. Scope-Enforced Policies for Sensitive HR Domains

### 5.1 Employee Directory (`employees`)
```sql
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select_policy"
ON public.employees
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
);

CREATE POLICY "employees_hr_modify_policy"
ON public.employees
FOR ALL
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
      AND r.hierarchy_level <= 2
  )
);
```

### 5.2 Payroll Runs & Line Items (`payroll_line_items`)
```sql
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;

-- HR & Admins can view all line items in their org; Employees can ONLY view their own payslip line item
CREATE POLICY "payroll_line_items_select"
ON public.payroll_line_items
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  AND (
    employee_id = (SELECT public.get_active_user_employee_id())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
        AND r.hierarchy_level <= 2
    )
  )
);
```

### 5.3 Leave Requests (`leave_requests`)
```sql
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests_select"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT public.get_active_user_org_id())
  AND (
    -- 1. Employee sees their own leave
    employee_id = (SELECT public.get_active_user_employee_id())
    -- 2. Manager sees direct reports
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = leave_requests.employee_id
        AND e.reporting_manager_id = (SELECT public.get_active_user_employee_id())
    )
    -- 3. HR / Admin sees organization wide
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid())
        AND r.hierarchy_level <= 2
    )
  )
);
```

---

## 6. Secure Storage Bucket Policies

Supabase private storage buckets (`documents`, `payslips`, `avatars`) use bucket-level RLS:

1. **`documents` (Private Vault)**:
   - `auth.uid()` can upload and read their own folder: `/{organization_id}/{employee_id}/*`.
   - HR Admins with `hierarchy_level <= 2` can read all folders within their `organization_id`.
2. **`payslips` (Encrypted Private Vault)**:
   - Read-only for `employee_id` corresponding to the generated payslip path.
   - Write-only for automated server-side payroll generator functions.
3. **`avatars` (Public Read / Authenticated Write)**:
   - Publicly readable via CDN URLs; Write restricted to owner user profile.
