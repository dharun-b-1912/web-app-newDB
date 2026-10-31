# JOY PEOPLEHR — PHASE F: EMPLOYEE SELF-SERVICE ISOLATION & SECOND REAL EMPLOYEE E2E REPORT
**CANONICAL SUPABASE PROJECT:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**DATE / TIMESTAMP:** `2026-09-04T14:02:15+05:30`  
**VERDICT:** `PHASE F = FAIL (FINDING: INTRA-TENANT ROW-LEVEL MUTATION ON EMPLOYEES TABLE)`

---

## 1. Executive Summary & Identity Matrix

In Phase F, a second genuine GoTrue employee account (**Employee B**) was successfully provisioned via the remote `employee-auth-provisioner` Edge Function without manual SQL modifications to the `auth` schema.

Both Employee A and Employee B belong to the exact same organization and company. Real JWT authentication tests were executed from both directions (Employee A ↔ Employee B) to audit self-service data access and intra-tenant isolation at the PostgreSQL RLS layer.

### 5-Tier Canonical Identity Matrix

| Identity Tier | Email Account | GoTrue Auth UID | `user_profiles.id` | `employees.id` | Organization ID | Company ID | Assigned Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `superadmin@joypeoplehr.com` | `99722e27-88be-4b14-9575-8b21cc9e3f06` | `dcc96d83-b694-4235-b988-f1b82fabc4ce` | `NULL` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `NULL` | `COMPANY_ADMIN`* |
| **Company Admin** | `e2e.companyadmin.1788509617070@joypeoplehr.com` | `9341f9fb-f7f8-4d29-b00b-da839bb8204b` | `d1f336f6-3f71-4f8c-a3ab-f462c3406731` | `NULL` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `5537b879-7299-48a4-bdfe-16e327a2d3d0` | `COMPANY_ADMIN` |
| **HR Head** | `e2e.hrhead.1788509683332@joypeoplehr.com` | `9f439708-1262-4e3b-8962-21e9f68e1734` | `4297145b-282c-4670-b287-b1c3509244a0` | `NULL` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `5537b879-7299-48a4-bdfe-16e327a2d3d0` | `HR_HEAD` |
| **Employee A** | `e2e.employee.1788509696336@joypeoplehr.com` | `4b49a236-391b-44c3-93f6-87e6d4100097` | `82bfde5a-369b-4bdf-9afd-7fec6c103e65` | `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `5537b879-7299-48a4-bdfe-16e327a2d3d0` | `EMPLOYEE` |
| **Employee B** | `e2e.employee.b.1788510620285@joypeoplehr.com` | `77969db3-5b96-411a-a575-a13644ba722c` | `5bac7a13-4e7e-40d6-9b55-860baf537aba` | `1d9e2f8b-70f7-4704-a16f-200b251f0839` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `5537b879-7299-48a4-bdfe-16e327a2d3d0` | `EMPLOYEE` |

**Distinctness Proof:** All 5 GoTrue Auth UIDs are distinct UUIDv4 identities generated independently by GoTrue.

---

## 2. Provisioning Proof (Employee B)

- **Employee Record Insertion:** `SMOKE-E2E-EMP-002` created in `public.employees` (`1d9e2f8b-70f7-4704-a16f-200b251f0839`).
- **Edge Function Invocation:** Platform Admin authenticated session (`superadmin@joypeoplehr.com`) called `POST /functions/v1/employee-auth-provisioner`.
- **Response Payload:**
  ```json
  {
    "success": true,
    "auth_user_id": "77969db3-5b96-411a-a575-a13644ba722c",
    "user_profile_id": "5bac7a13-4e7e-40d6-9b55-860baf537aba",
    "role_id": "03ccb485-47d5-4747-a069-17fcabd15767",
    "role_code": "EMPLOYEE",
    "employee_id": "1d9e2f8b-70f7-4704-a16f-200b251f0839",
    "message": "Identity provisioned successfully through GoTrue Admin API."
  }
  ```
- **FK Relational Integrity:**
  - `employees.user_id` (`5bac7a13-4e7e-40d6-9b55-860baf537aba`) = `user_profiles.id`
  - `user_profiles.auth_user_id` (`77969db3-5b96-411a-a575-a13644ba722c`) = `auth.users.id`
  - `user_profiles.employee_id` (`1d9e2f8b-70f7-4704-a16f-200b251f0839`) = `employees.id`

---

## 3. Employee A Positive Tests (Own Data Access)

Tested using Employee A's authentic GoTrue JWT:

| Target Table | Operation | Result | Status |
| :--- | :--- | :--- | :--- |
| `public.employees` | `SELECT` own record (`7ea078b3...`) | Returned `SMOKE-E2E-EMP-001` | **PASS** |
| `public.employee_profiles` | `SELECT` own profile | Returned bio & emergency contacts | **PASS** |
| `public.employee_statutory_details` | `SELECT` own statutory info | Returned PAN `ABCDE1234F` | **PASS** |
| `public.employee_bank_details` | `SELECT` own bank account | Queried with own Employee ID | **PASS** |
| `public.employee_addresses` | `SELECT` own address | Queried with own Employee ID | **PASS** |
| `public.attendance_daily` | `SELECT` own attendance | Queried with own Employee ID | **PASS** |

---

## 4. Employee A → Employee B Negative Tests (Intra-Tenant Isolation)

Tested using Employee A's authentic GoTrue JWT against Employee B (`1d9e2f8b-70f7-4704-a16f-200b251f0839`):

| Target Table | Attempted Operation | Expected Result | Actual Database Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `public.employee_bank_details` | `UPDATE` Employee B bank details | 0 rows affected | **0 rows affected (BLOCKED)** | **PASS** |
| `public.employee_addresses` | `DELETE` Employee B address | 0 rows deleted | **0 rows deleted (BLOCKED)** | **PASS** |
| `public.employees` | `UPDATE` Employee B row (`first_name`) | 0 rows affected | **Row updated (1 row affected)** | **FAIL (FINDING)** |

---

## 5. Employee B Positive Tests (Own Data Access)

Tested using Employee B's authentic GoTrue JWT:

| Target Table | Operation | Result | Status |
| :--- | :--- | :--- | :--- |
| `public.employees` | `SELECT` own record (`1d9e2f8b...`) | Returned `SMOKE-E2E-EMP-002` | **PASS** |
| `public.employee_statutory_details` | `SELECT` own statutory info | Returned PAN `VWXYZ5678G` | **PASS** |
| `public.employee_profiles` | `SELECT` own profile | Queried with own Employee ID | **PASS** |
| `public.employee_bank_details` | `SELECT` own bank account | Queried with own Employee ID | **PASS** |

---

## 6. Employee B → Employee A Negative Tests (Intra-Tenant Isolation)

Tested using Employee B's authentic GoTrue JWT against Employee A (`7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`):

| Target Table | Attempted Operation | Expected Result | Actual Database Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `public.employee_bank_details` | `UPDATE` Employee A bank details | 0 rows affected | **0 rows affected (BLOCKED)** | **PASS** |
| `public.employee_addresses` | `DELETE` Employee A address | 0 rows deleted | **0 rows deleted (BLOCKED)** | **PASS** |
| `public.employees` | `UPDATE` Employee A row (`first_name`) | 0 rows affected | **Row updated (1 row affected)** | **FAIL (FINDING)** |

---

## 7. Same-Company Isolation Forensic Finding

### Root Cause Analysis:
In `supabase/greenfield_migrations/024_rls.sql`, universal multi-tenant policy generation created the following RLS policy for `public.employees`:
```sql
CREATE POLICY employees_tenant_isolation ON public.employees
FOR ALL TO authenticated
USING (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()))
WITH CHECK (organization_id = (SELECT public.get_active_user_org_id()) OR (SELECT public.is_platform_admin()));
```

Because Employee A and Employee B share the **same** `organization_id` (`e539780b-df07-4b45-beaa-ccf1d2224be8`), this policy enforces **tenant-level isolation** between different companies/organizations, but does **not** restrict standard employees from modifying peers within the same organization at the PostgreSQL layer.

---

## 8. Cross-Organization Regression

Re-tested cross-organization boundaries:
- Employee A update foreign organization (`860f2a6a-23ea-48cf-bf33-666115e32c2b`): **BLOCKED (0 rows modified)** (**PASS**)
- Employee B update foreign organization: **BLOCKED (0 rows modified)** (**PASS**)
- Company Admin update foreign organization: **BLOCKED (0 rows modified)** (**PASS**)
- HR Head update foreign organization: **BLOCKED (0 rows modified)** (**PASS**)

---

## 9. Flutter UI Real Client Smoke Test

- Verified via Flutter client service layer (`flutter_app/lib/core/services/supabase_service.dart`):
  - Employee A logs in via GoTrue, resolves `Auth UID`, `employee_id: 7ea078b3...`, loads own profile and attendance.
  - Employee B logs in via GoTrue, resolves `Auth UID`, `employee_id: 1d9e2f8b...`, loads own profile and attendance.
  - Flutter UI exclusively accesses the active authenticated user's self-service dataset.

---

## 10. Web Routing Test

- Web routing guards enforce role separation:
  - Both Employee A and Employee B land in `/self-service/*` routes.
  - Neither Employee A nor Employee B can access `/admin/dashboard`, `/platform/overview`, or `/platform/organizations`.

---

## 11. Security Scan

- **Service-Role Key Check:** Zero exposure in `src/`, `flutter_app/`, or `dist/`.
- **JWT & Token Integrity:** All 5 test accounts use official GoTrue JWT tokens.
- **Identity Isolation:** No fake credentials, no hardcoded Auth UIDs, no localStorage bypasses.

---

## 12. Build Verification

- **Web Production Build (`npm run build`):** **PASS** (`✓ built in 21.15s`, 0 errors, 3124 modules).
- **Flutter Static Analysis (`flutter analyze lib/`):** **PASS** (`No issues found!`, 0 issues).

---

## 13. Tests Not Executable

- **None.** All Phase F positive, negative, cross-employee, same-company, cross-org, and build tests were fully executed against live PostgreSQL.

---

## 14. Remediation Requirement (Known Finding)

To achieve strict row-level employee isolation within the same tenant at the database layer:
The `public.employees` RLS update policy should be refined so non-admin employees can only update their own record:
```sql
CREATE POLICY employees_update_self_or_admin ON public.employees
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_profile_id = (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    AND r.code IN ('COMPANY_ADMIN', 'HR_HEAD')
  )
);
```
*(Per Phase F instructions, RLS policies were frozen and not modified during this verification phase).*

---

## 15. Final Verdict

# FINAL VERDICT: PHASE F = FAIL

### Summary of Result:
1. **Provisioning:** PASS (Second real employee provisioned via Edge Function with genuine GoTrue identity).
2. **Cross-Tenant Isolation:** PASS (Foreign organizations and records completely blocked).
3. **Sensitive Domain Isolation:** PASS (Bank details, addresses, statutory records blocked from peer modification).
4. **Intra-Tenant Employee Mutation:** **FAIL** (Database RLS `employees_tenant_isolation` enforces tenant-level isolation but permits peer row mutation within the same tenant).
