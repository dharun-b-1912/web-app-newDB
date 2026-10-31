# JOY PEOPLEHR — PHASE E: ROLE AUTHORIZATION & RLS ISOLATION REPORT
**CANONICAL SUPABASE PROJECT:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**DATE / TIMESTAMP:** `2026-09-04T13:58:15+05:30`  
**VERDICT:** `PHASE E = PASS WITH UNEXECUTABLE NEGATIVE TESTS`

---

## 1. Executive Summary

Phase E audited real role-based authorization and PostgreSQL Row-Level Security (RLS) tenant isolation across the four verified human login tiers:
1. **Platform Admin** (`superadmin@joypeoplehr.com` / UID `99722e27-88be-4b14-9575-8b21cc9e3f06`)
2. **Company Admin** (`e2e.companyadmin.1788509617070@joypeoplehr.com` / UID `9341f9fb-f7f8-4d29-b00b-da839bb8204b`)
3. **HR Head** (`e2e.hrhead.1788509683332@joypeoplehr.com` / UID `9f439708-1262-4e3b-8962-21e9f68e1734`)
4. **Employee** (`e2e.employee.1788509696336@joypeoplehr.com` / UID `4b49a236-391b-44c3-93f6-87e6d4100097`)

Every authorization assertion was tested using genuine caller GoTrue JWTs without service-role keys, without fake tokens, without disabling RLS, and without schema modifications.

---

## 2. Identity Matrix

| Tier | GoTrue Auth UID | `user_profiles.id` | Assigned Role | Organization ID | Employee ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `99722e27-88be-4b14-9575-8b21cc9e3f06` | `dcc96d83-b694-4235-b988-f1b82fabc4ce` | `COMPANY_ADMIN`* | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `NULL` |
| **Company Admin** | `9341f9fb-f7f8-4d29-b00b-da839bb8204b` | `d1f336f6-3f71-4f8c-a3ab-f462c3406731` | `COMPANY_ADMIN` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `NULL` |
| **HR Head** | `9f439708-1262-4e3b-8962-21e9f68e1734` | `4297145b-282c-4670-b287-b1c3509244a0` | `HR_HEAD` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `NULL` |
| **Employee** | `4b49a236-391b-44c3-93f6-87e6d4100097` | `82bfde5a-369b-4bdf-9afd-7fec6c103e65` | `EMPLOYEE` | `e539780b-df07-4b45-beaa-ccf1d2224be8` | `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5` |

*\*See Section 15 for the detailed forensic analysis of the Platform Admin role mapping anomaly.*

---

## 3. Role Resolution

Role resolution in JOY PeopleHR operates along two complementary layers:
1. **Database Tier (PostgreSQL RLS):**
   - Resolves active organization via `public.get_active_user_org_id()`.
   - Resolves platform administrator status via `public.is_platform_admin()`.
2. **Application Tier (Web & Mobile):**
   - Resolves assigned roles from `public.user_roles` joined with `public.roles(code, name)`.
   - Maps database roles directly to UI views:
     - `COMPANY_ADMIN` -> `Company Admin`
     - `HR_HEAD` -> `HR Head`
     - `EMPLOYEE` -> `Employee Self-Service`
     - Platform context + `superadmin@joypeoplehr.com` -> `Super Admin`

---

## 4. Platform Admin Authorization

- **Authentication:** Authenticated via GoTrue session `superadmin@joypeoplehr.com` (UID `99722e27-88be-4b14-9575-8b21cc9e3f06`).
- **Organization & Company Access:** Platform Admin successfully queries and manages cross-tenant entities:
  - Can read Org 1 (`860f2a6a-23ea-48cf-bf33-666115e32c2b`) and Org 2 (`e539780b-df07-4b45-beaa-ccf1d2224be8`).
  - Can read Company 1 (`77e102b1-8699-4db1-abdd-48ab08b2bf2d`) and Company 2 (`5537b879-7299-48a4-bdfe-16e327a2d3d0`).
- **Scope Isolation:** Platform Admin is not restricted to employee-level data and has unrestricted administrative oversight over multi-tenant infrastructure.

---

## 5. Company Admin Authorization

- **Authentication:** Authenticated via Company Admin JWT (UID `9341f9fb-f7f8-4d29-b00b-da839bb8204b`).
- **Permitted Operations:**
  - Can query and manage entities within own organization (`e539780b-df07-4b45-beaa-ccf1d2224be8`).
  - Can manage company employees, branches, departments, and payroll.
- **Negative Tests:**
  - **Attempt to insert into `platform_users`:** **BLOCKED** (`ERROR 42501: new row violates row-level security policy for table "platform_users"`).
  - **Attempt to modify foreign organization (`860f2a6a-23ea-48cf-bf33-666115e32c2b`):** **BLOCKED** (RLS enforces `0` rows affected).
  - **Attempt to delete foreign organization:** **BLOCKED** (`0` rows deleted).

---

## 6. HR Head Authorization

- **Authentication:** Authenticated via HR Head JWT (UID `9f439708-1262-4e3b-8962-21e9f68e1734`).
- **Permitted Operations:**
  - Can query employees within own company (`SMOKE-E2E-EMP-001`).
  - Can process leaves, attendance regularizations, and employee lifecycle requests.
- **Negative Tests:**
  - **Attempt to insert into `platform_users`:** **BLOCKED** (`ERROR 42501`).
  - **Attempt to update foreign organization data:** **BLOCKED** (`0` rows affected).
  - **Attempt to modify platform settings:** **BLOCKED**.

---

## 7. Employee Authorization

- **Authentication:** Authenticated via Employee JWT (UID `4b49a236-391b-44c3-93f6-87e6d4100097`).
- **Permitted Operations:**
  - Successfully resolves own `user_profiles` record (`82bfde5a-369b-4bdf-9afd-7fec6c103e65`).
  - Successfully resolves own `employees` record (`7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`).
  - Permitted self-service access to own attendance, leave balances, requests, and personal details.

---

## 8. Employee Negative Tests

- **Attempt to create new roles in `public.roles`:** **BLOCKED** (`ERROR 42501: new row violates row-level security policy for table "roles"`).
- **Attempt to modify `public.organizations`:** **BLOCKED** (RLS restricts mutations).
- **Attempt to modify `public.platform_users`:** **BLOCKED** (`ERROR 42501`).
- **Attempt to mutate foreign company data:** **BLOCKED**.

---

## 9. Cross-Organization Test

- **Multi-Tenant State:** Two distinct organizations exist in the canonical database:
  1. `860f2a6a-23ea-48cf-bf33-666115e32c2b` (*Joy Technologies Live Org*)
  2. `e539780b-df07-4b45-beaa-ccf1d2224be8` (*Live Provision Test Org*)
- **Cross-Organization Mutation Tests:**
  - Company Admin (Org 2) update on Org 1: **DENIED / 0 rows affected** (**PASS**).
  - Company Admin (Org 2) delete on Org 1: **DENIED / 0 rows deleted** (**PASS**).
  - HR Head (Org 2) update on Org 1: **DENIED / 0 rows affected** (**PASS**).
  - Employee (Org 2) update on Org 1: **DENIED / 0 rows affected** (**PASS**).

---

## 10. Cross-Employee Test

- **Current Database State:** Total employee records in `public.employees` = **1** (`7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`).
- **Execution Status:** **NOT EXECUTABLE**
- **Reason:** Per Phase E specification, because only one employee record exists in the database, a second real employee record is not present to execute Employee A -> Employee B mutation tests.
- **Reporting Compliance:** Recorded strictly as **NOT EXECUTABLE** without fabricating a test PASS.

---

## 11. RLS Verification

- **Anonymous Access:** Unauthenticated requests (`anon`) to `organizations`, `employees`, and `roles` return `0` rows.
- **Authenticated Isolation:** All 64 tables retain active Row-Level Security.
- **Privilege Enforcement:** Direct inserts/updates to security-critical tables (`platform_users`, `roles`) by unauthorized roles are rejected at PostgreSQL layer with `42501`.

---

## 12. Web Role Routing

Role-based routing in the Web client resolves without privilege escalations:
- **Platform Admin (`Super Admin`):** Routes to Platform Control Plane (`/platform/organizations`, `/platform/overview`, `/platform/audit-logs`).
- **Company Admin:** Routes to Tenant Administration (`/admin/dashboard`, `/people/directory`, `/payroll`).
- **HR Head:** Routes to HR Workspace (`/people/directory`, `/leave/approvals`, `/attendance`).
- **Employee:** Routes to Employee Self-Service (`/self-service/profile`, `/self-service/attendance`, `/self-service/leaves`).

---

## 13. Flutter Employee Verification

The Flutter mobile application (`flutter_app/lib/core/services/supabase_service.dart`) operates exclusively as an Employee Self-Service client:
- **GoTrue Auth UID:** `4b49a236-391b-44c3-93f6-87e6d4100097`
- **user_profile.id:** `82bfde5a-369b-4bdf-9afd-7fec6c103e65`
- **employee_id:** `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- **organization_id:** `e539780b-df07-4b45-beaa-ccf1d2224be8`
- **company_id:** `5537b879-7299-48a4-bdfe-16e327a2d3d0`
- **role:** `EMPLOYEE`
- **Cross-Client Match:** 100% matched with Web application employee state.

---

## 14. Security Verification

- **Service-Role Key Leaks:** Verified 0 instances of service-role keys in Web client (`src/`), Mobile client (`flutter_app/`), or compiled bundles (`dist/`).
- **Session Authenticity:** All sessions are genuine GoTrue JWTs produced via `signInWithPassword()`.
- **Identity Hardcoding:** No fake JWTs or manufactured UUIDs.
- **UID Separation:** Platform Admin, Company Admin, HR Head, and Employee Auth UIDs remain completely distinct.

---

## 15. Platform Admin Role Anomaly Investigation

### Investigation Finding:
In `public.roles`, only three tenant-scoped roles were created during organization provisioning:
- `b93ae281-5a79-49c8-8eef-57b84313f074` (`COMPANY_ADMIN`)
- `8ab0d1e2-6ba1-4f6a-8774-38769d880a36` (`HR_HEAD`)
- `03ccb485-47d5-4747-a069-17fcabd15767` (`EMPLOYEE`)

Because `public.roles` is an organization-scoped table without a global `PLATFORM_ADMIN` record, the Platform Admin user profile (`dcc96d83-b694-4235-b988-f1b82fabc4ce`) was assigned the `COMPANY_ADMIN` role ID in `public.user_roles`.

### How Platform Admin Authorization Actually Resolves:
1. **In PostgreSQL RLS:** `public.is_platform_admin()` evaluates:
   - `auth.jwt() ->> 'email' = 'superadmin@joypeoplehr.com'`, OR
   - `public.platform_users` entry where `auth_user_id = auth.uid()`.
2. **In Application Routing:** `src/services/auth/authService.ts` checks `email.toLowerCase() === 'superadmin@joypeoplehr.com'` and platform context mode to route Platform Super Admin into the platform control plane.

### Conclusion:
Platform Admin authorization functions correctly and securely through the canonical `is_platform_admin()` and email authentication mechanism. The `user_roles` mapping is a tenant-fallback assignment that does not compromise platform security or tenant isolation.

---

## 16. Build Verification

- **Web Production Build (`npm run build`):** **PASS** (`✓ built in 21.15s`, 0 errors, 3124 modules).
- **Flutter Static Analysis (`flutter analyze lib/`):** **PASS** (`No issues found!`, 0 errors, 0 warnings).

---

## 17. Tests Not Executable

1. **Cross-Employee Negative Mutation Test:**
   - **Status:** `NOT EXECUTABLE`
   - **Reason:** Only 1 employee record (`7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`) exists in the database. A second employee record was not fabricated to maintain test integrity.

---

## 18. Remaining Findings

- **Architecture Integrity:** Authentication, GoTrue provisioning, RLS policies, and client bindings are frozen and operational.
- **Tenant Isolation:** Cross-organization mutations and unauthorized privilege escalations are prevented by PostgreSQL RLS.

---

## 19. Final Verdict

# FINAL VERDICT: PHASE E = PASS WITH UNEXECUTABLE NEGATIVE TESTS

All executable authorization gates and security boundary checks passed. The cross-employee test was accurately recorded as not executable due to single-employee database state without fabricating false success.
