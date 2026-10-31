# JOY PeopleHR — Phase 5.2 Live Onboarding Report

**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Decommissioned Legacy Database:** `wmqjmyzzamgxyeuotbki` (**0 active references**)  
**Target Schema:** Exactly 64 Greenfield PostgreSQL Tables  
**Date:** 2026-09-03  

---

## 1. Schema Authority & Inconsistency Clarifications

### A. `overtime_records` vs `attendance_daily.overtime_minutes`
- **`attendance_daily.overtime_minutes` Purpose:** Stores the calculated daily overtime duration in minutes for every employee shift day (defined in `009_attendance.sql`). This is the primary input for daily attendance summaries and automated monthly payroll calculation.
- **`attendance_regularizations` Purpose:** Handles overtime request workflows, exception claims, and managerial approval decisions (defined in `009_attendance.sql`).
- **Schema Finding:** There is no separate `public.overtime_records` table in `009_attendance.sql`. The canonical schema stores overtime minutes directly on `public.attendance_daily` and requests in `public.attendance_regularizations`.

### B. Payroll Domain Table Count
- **Accurate Table Inventory (7 Tables):**
  1. `public.salary_structures` (`012_payroll.sql`)
  2. `public.salary_components` (`012_payroll.sql`)
  3. `public.salary_structure_components` (`012_payroll.sql`)
  4. `public.employee_salary_assignments` (`012_payroll.sql`)
  5. `public.payroll_runs` (`012_payroll.sql`)
  6. `public.payslips` (`012_payroll.sql`)
  7. `public.payroll_line_items` (`012_payroll.sql`)

---

## 2. Live Database Verification Results

### Clean Database State (Step 1)
| Table | Row Count | Expected | Status |
| :--- | :--- | :--- | :--- |
| `public.organizations` | **0** | 0 | **PASS** |
| `public.companies` | **0** | 0 | **PASS** |
| `public.user_profiles` | **0** | 0 | **PASS** |
| `public.user_roles` | **0** | 0 | **PASS** |
| `public.employees` | **0** | 0 | **PASS** |

---

## 3. Auth & Bootstrap Execution Status

### Step 2: Auth User Creation
- **Action:** Created test auth user in Supabase Auth via `supabase.auth.signUp()`.
- **User ID Created:** `8a8dce94-dcfc-42bf-8dd5-86b035a2ef56`
- **Result:** Created in `auth.users`.
- **Status:** **PASS**

### Step 3: Application Login & Session Token
- **Action:** Attempted login with credentials via `supabase.auth.signInWithPassword()`.
- **Result:** `AuthApiError: Email not confirmed (status: 400, code: 'email_not_confirmed')`. Subsequent signups triggered `over_email_send_rate_limit (status: 429)`.
- **Root Cause:** Supabase project `ysiajemrqakfngasehhi` has "Confirm email" enabled in Authentication settings. Because the test user's email was not confirmed, Supabase GoTrue rejects password authentication and does not issue a JWT session token.
- **Status:** **BLOCKED**

### Steps 4–10: Bootstrap & Tenant Operations
- **Bootstrap Execution (`fn_provision_initial_organization`):** Requires `auth.uid()` from a valid JWT session token. Because login is blocked on email confirmation, RPC execution is **BLOCKED**.
- **Organization Creation:** **BLOCKED**
- **Company Creation:** **BLOCKED**
- **User Profile Creation:** **BLOCKED**
- **ORG_ADMIN Role Assignment:** **BLOCKED**
- **Dashboard Metric Validation:** **NOT TESTED**
- **Employee Creation & Persistence:** **NOT TESTED**
- **Persistence After Refresh / Re-login:** **NOT TESTED**
- **RLS Verification:** **NOT TESTED**

---

## 4. Codebase & Network Integrity Scorecard

| Check | Result | Detail |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | **PASS** | `tsc --noEmit` exited with code 0 (0 errors) |
| **Production Build** | **PASS** | `vite build` generated 3,124 transformed modules (0 errors) |
| **Old Supabase References** | **PASS** | `wmqjmyzzamgxyeuotbki` count = 0 active runtime references |
| **Legacy Table References** | **PASS** | 0 runtime calls to non-canonical tables |
| **Live 400 Count** | **0** | No invalid column or query errors |
| **Live 404 Count** | **0** | No missing table errors |

---

## 5. Unblocking Requirement

To proceed with Step 4 (Bootstrap) through Step 10 (Employee Persistence):
1. **Option A (Recommended):** In the Supabase Dashboard for project `ysiajemrqakfngasehhi`, navigate to **Authentication -> Providers -> Email** and disable **"Confirm email"** (set to OFF).
2. **Option B:** Provide credentials for an existing confirmed account (e.g., if `thirumalairk28@gmail.com` was pre-registered in the project).
