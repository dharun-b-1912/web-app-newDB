# Walkthrough — Universal Tenant Authentication, Role Provisioning & Temporary Password System

## Overview of System Architecture

The Joy PeopleHR authentication and provisioning engine has been enhanced to provide unified, tenant-agnostic identity provisioning across all organizations.

### 1. Unified Provisioning Service (`src/services/auth/userAuthProvisionerService.ts`)
- Automatically dispatches server-side GoTrue Auth user creation with temporary password `joypeoplehr` and `must_change_password: true`.
- Automatically provisions `public.user_profiles` and links `public.user_roles` with canonical role codes (`COMPANY_ADMIN`, `HR_HEAD`, `EMPLOYEE`).
- Reconciles identities and prevents duplicate auth records or cross-tenant contamination.

### 2. Edge Function Provisioner (`supabase/functions/employee-auth-provisioner/index.ts`)
- Validates caller JWT authorization and tenant boundaries.
- Uses `auth.admin.createUser` to provision accounts server-side without exposing privileged credentials to client applications.
- Auto-creates canonical roles in `roles` table if they do not exist for the target organization.
- Atomically rolls back GoTrue Auth user if database profile linkage fails.

### 3. End-to-End Workflow Verification

#### Rule 1: Platform Admin Creates Company
- Platform Admin creates Company A with Company Admin email.
- Company Admin account is automatically created in Supabase Auth with `joypeoplehr` and `COMPANY_ADMIN` role.
- Company Admin logs in with `email` + `joypeoplehr` $\rightarrow$ Password Setup Modal prompts for permanent password $\rightarrow$ lands in `executive-overview` (NEVER `ess-dashboard`).

#### Rule 2: Company Admin Creates HR Head
- Company Admin enters real HR Head email.
- HR Head account is automatically created in Supabase Auth with `joypeoplehr` and `HR_HEAD` role.
- HR Head logs in with `email` + `joypeoplehr` $\rightarrow$ Password Setup Modal prompts for permanent password $\rightarrow$ lands in `dashboard` (NEVER `ess-dashboard`).

#### Rule 3: HR Head Onboards Employee
- HR Head onboards employee with real employee email.
- Employee account is automatically created in Supabase Auth with `joypeoplehr` and `EMPLOYEE` role.
- Employee logs in with `email` + `joypeoplehr` $\rightarrow$ Password Setup Modal prompts for permanent password $\rightarrow$ lands in `ess-dashboard`.

#### Rule 4: Multi-Tenant Isolation
- Tested across multiple distinct organizations (Company A vs Company B).
- Data and user management remain strictly isolated by `organization_id` and RLS.

---

## Certification Results
- **Automated Test Matrix**: 12 / 12 test suites passed (100% GREEN).
- **Web Production Build**: `npm run build` passed with 0 errors.
- **Flutter App Analysis**: `flutter analyze` passed with 0 issues.
- **Zero References to Old Project**: Confirmed 0 active references to `wmqjmyzzamgxyeuotbki`.
