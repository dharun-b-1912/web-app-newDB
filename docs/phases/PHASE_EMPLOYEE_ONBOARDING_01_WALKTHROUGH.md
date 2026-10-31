# PHASE EMPLOYEE-ONBOARDING-01: COMPLETE WALKTHROUGH
**HR HEAD → EMPLOYEE ONBOARDING PIPELINE & RUNTIME CLOSURE**
**Canonical Backend Target:** `https://ysiajemrqakfngasehhi.supabase.co`

---

## 1. Overview of Changes

### A. Employee Auth Service & TDZ Bug Fix
- **File:** `src/services/auth/employeeAuthService.ts`
- **Fix:** Initialized `const actorName = ...` before invoking `userAuthProvisionerService.provisionUser()`.
- **Audit Table Correction:** Replaced dead table `auth_audit_logs` (which produced HTTP 404) with canonical `public.audit_logs`, matching the PostgreSQL schema with columns `organization_id`, `entity_type`, `entity_id`, `action`, `new_values`, `ip_address`, `user_agent`, `created_at`.

### B. Platform Audit Service
- **File:** `src/services/platform/platformAuditService.ts`
- **Fix:** Switched `auth_audit_logs` inserts to `public.audit_logs` with valid JSONB `new_values`.

### C. StatusBadge Null-Safety & Fallback
- **File:** `src/components/ui/StatusBadge.tsx`
- **Fix:** Added null-safety check: `const safeStatus = status || 'Unknown'; const normalized = safeStatus.toString().toLowerCase();` to eliminate unhandled `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.
- **File:** `src/features/people/EmployeeList.tsx`
- **Fix:** Passed fallback canonical status `emp.status || (emp as any).employment_status || 'Active'`.

### D. Supabase Schema Sanitization & Sub-table Upserts
- **File:** `src/services/api.ts`
- **Fix:** 
  - Sanitized `employees` payload in `sanitizeEmployeeForSupabase()` to strip non-existent columns (`company_name`, `department_name`, etc.) and ensure valid enum casing.
  - Corrected `employee_bank_details` and `employee_statutory_details` upsert calls with required `organization_id`, UUID primary keys, and canonical column names (`pan_number`, `uan_number`).

### E. Edge Function Deployment
- **File:** `supabase/functions/employee-auth-provisioner/index.ts`
- **Fix:** Corrected foreign key linkage between `employees.user_id` and `user_profiles.id` / `user_profiles.employee_id`. Deployed via `npx supabase functions deploy employee-auth-provisioner --project-ref ysiajemrqakfngasehhi`.

### F. Resend Email Safety
- **File:** `src/services/email/resendEmailService.ts`
- **Fix:** Ensured missing or unconfigured Resend credentials log a clean warning without halting or rolling back employee provisioning.

---

## 2. End-to-End Onboarding Workflow Verification

```mermaid
sequenceDiagram
    autonumber
    actor HR as HR Head (Browser)
    participant UI as Employee Wizard Modal
    participant API as API & Onboarding Service
    participant Edge as Edge Function (employee-auth-provisioner)
    participant DB as PostgreSQL (ysiajemrqakfngasehhi)
    participant GoTrue as Supabase GoTrue Auth
    actor Emp as Employee (Web / Flutter)

    HR->>UI: Fills employee details (Name, Real Email, Dept, Role, Bank, Statutory)
    HR->>UI: Clicks "ONBOARD"
    UI->>API: finalizeOnboarding(payload)
    API->>DB: Insert master employee in public.employees
    API->>DB: Insert bank details in public.employee_bank_details
    API->>DB: Insert statutory details in public.employee_statutory_details
    API->>Edge: Invoke employee-auth-provisioner (HR Session Bearer)
    Edge->>GoTrue: auth.admin.createUser(email, password="joypeoplehr", must_change_password=true)
    Edge->>DB: Insert public.user_profiles (auth_user_id, organization_id, employee_id)
    Edge->>DB: Insert public.user_roles (user_profile_id, role_id=EMPLOYEE)
    Edge-->>API: { success: true, auth_user_id, user_profile_id, role_code: "EMPLOYEE" }
    API->>DB: Insert audit entry in public.audit_logs
    API-->>UI: Onboarding Success (closes modal, refetches directory)
    
    Note over Emp,GoTrue: Employee First Login Flow
    Emp->>GoTrue: signInWithPassword(email, "joypeoplehr")
    GoTrue-->>Emp: Authenticated Session (must_change_password = true)
    Emp->>UI: Enters new permanent password
    UI->>GoTrue: updateUser({ password: newPassword })
    GoTrue-->>Emp: Password Updated
    Emp->>UI: Lands directly on /ess-dashboard
```

---

## 3. Verification & Test Evidence

1. **Automated E2E Test Suite (`scratch/test_phase_employee_onboarding_01.mjs`):**
   - HR Head authenticated: `4d9bde74-2746-4a8b-96b0-1382de32d3ce`
   - Master employee created under tenant: `0c621892-e938-4707-9957-13534ea32c19`
   - Bank and statutory sub-tables persisted with zero schema errors.
   - GoTrue Auth user created with email and temporary password `joypeoplehr`.
   - Role strictly assigned as `EMPLOYEE` in `user_roles`.
   - Employee successfully logged in with `joypeoplehr`, changed password to permanent password, and logged in again.
   - Audit log recorded in `public.audit_logs` table.

2. **Build & Static Analysis:**
   - `npm run build`: **PASS (3,126 modules transformed, 0 errors)**
   - `flutter analyze`: **PASS (No issues found in 42.4s)**
   - Decommissioned Supabase scan: **0 references**
   - Client service role scan: **0 exposures**
