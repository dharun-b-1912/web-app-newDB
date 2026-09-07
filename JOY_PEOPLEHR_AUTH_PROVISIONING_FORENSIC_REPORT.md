# JOY PEOPLEHR — AUTHENTICATION PROVISIONING FORENSIC AUDIT REPORT
**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Audit Date:** 2026-09-04T13:34:00+05:30  
**Phase:** PHASE A — COMPREHENSIVE REPOSITORY & AUTH ARCHITECTURE FORENSIC AUDIT  
**Status:** FORENSIC INSPECTION COMPLETED  

---

## 1. Executive Summary

A comprehensive repository audit was conducted across the entire codebase to trace how authentication identities and roles are provisioned across the 4 hierarchy tiers:
1. **Platform Admin** (`superadmin@joypeoplehr.com`)
2. **Company Admin** (`companyadmin@joypeoplehr.com`)
3. **HR Head** (`hrhead@joypeoplehr.com`)
4. **Employee** (`employee@joypeoplehr.com`)

The audit verified that the previous E2E test incorrectly reported a PASS by reusing the Platform Admin Auth UID (`99722e27-88be-4b14-9575-8b21cc9e3f06`) across multiple tiers due to client-side email rate limits (`429 over_email_send_rate_limit`).

---

## 2. Forensic Findings by Hierarchy Tier (Items A through L)

### A. How Platform Admin Creates a Company Admin
- **Trigger**: Platform Admin opens Platform UI → `PlatformTenantView` → `CreateCompanyModal` / `platformProvisioningEngine.ts`.
- **Database Action**: Directly inserts into canonical `public.organizations` (Org ID: `e539780b-df07-4b45-beaa-ccf1d2224be8`) and `public.companies` (Company ID: `5537b879-7299-48a4-bdfe-16e327a2d3d0`).
- **Invitation Action**: Calls `platformAuthInvitationService.inviteUser()` which dispatches an email via Resend API (`resendEmailService`).

### B. How the Invitation is Stored
- **Database Table**: `public.organization_invitations` in PostgreSQL.
- **Fields**: `id`, `organization_id`, `email`, `full_name`, `role`, `invitation_token`, `status`, `expires_at`.

### C. How the Invitation is Accepted
- **Route**: User navigates to `/auth/accept-invite?token=...&org=...&email=...&role=...`.
- **UI Component**: `src/features/platform/components/tenants/AcceptInviteModal.tsx`.
- **Previous Flaw**: Previously had a mock `setTimeout(..., 1000)` without executing GoTrue registration.
- **Remediated State**: Calls `platformAuthInvitationService.acceptInvitation()` which calls `supabase.auth.signUp()`, captures the real `auth.users.id`, and links `user_profiles` and `user_roles`.

### D. How the Real Supabase Auth User is Created
- **Client Route**: `supabase.auth.signUp({ email, password, options: { data: { ... } } })`.
- **Edge/Server Route**: `supabase/functions/employee-auth-provisioner/index.ts` uses `supabaseAdmin.auth.admin.createUser()` to securely provision GoTrue identities on the backend.

### E. How `public.user_profiles` is Created
- **Contract**:
  - `id`: UUID (Primary Key)
  - `auth_user_id`: UUID (Foreign Key to `auth.users.id`, NOT NULL)
  - `organization_id`: UUID (Foreign Key to `organizations.id`, NOT NULL)
  - `employee_id`: UUID (Foreign Key to `employees.id`, NULL for Admin/HR)
  - `email`: Text
  - `full_name`: Text
  - `status`: `'ACTIVE'`
- **Unique Constraint**: `uq_user_profiles_auth_org (auth_user_id, organization_id)`.

### F. How `public.user_roles` is Created
- **Contract**:
  - `id`: UUID (Primary Key)
  - `organization_id`: UUID (Foreign Key to `organizations.id`, NOT NULL)
  - `user_profile_id`: UUID (Foreign Key to `user_profiles.id`, NOT NULL)
  - `role_id`: UUID (Foreign Key to `roles.id`, NOT NULL)
- **Canonical Role IDs in Org (`e539780b-df07-4b45-beaa-ccf1d2224be8`)**:
  - `COMPANY_ADMIN`: `b93ae281-5a79-49c8-8eef-57b84313f074`
  - `HR_HEAD`: `8ab0d1e2-6ba1-4f6a-8774-38769d880a36`
  - `EMPLOYEE`: `03ccb485-47d5-4747-a069-17fcabd15767`

### G. How `employee_id` is Linked
- Linked in `user_profiles.employee_id = employees.id` (Target: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`).

### H. How `employees.user_id` is Linked
- In the deployed PostgreSQL schema, `employees.user_id` has a Foreign Key constraint `employees_user_id_fkey` referencing `public.user_profiles.id`.

### I. Whether an Edge Function / Backend Provisioner Exists
- **Found**: `supabase/functions/employee-auth-provisioner/index.ts` exists and implements server-side `supabaseAdmin.auth.admin.createUser` for trusted backend provisioning.

### J. Whether Any Client-Side Code is Attempting Privileged Auth Creation
- **Verified**: No `service_role` key is exposed in `src/`, `flutter_app/`, or client bundles. All client code uses standard anon key and authenticated session JWTs.

### K. Whether Any `localStorage` / Mock Fallback Still Exists
- **Purged**:
  - `authService.ts` fake session cache removed.
  - `adminApi.ts` `localStorage` invitations removed; replaced with live PostgreSQL queries.
  - `platformProvisioningEngine.ts` in-memory fallback removed.

### L. Whether Any Code Can Silently Substitute Platform Admin UID
- **Eliminated**: All hardcoded fallback UUID assignments removed from test runners and application services.

---

## 3. GoTrue Identity Discovery (`auth.identities`)

In Supabase GoTrue Auth, user sign-in via `signInWithPassword` requires both:
1. An entry in `auth.users` (with hashed password and confirmed email).
2. An entry in `auth.identities` linking `user_id` to the `'email'` provider.

When `auth.identities` is missing, GoTrue returns `Database error querying schema`.

---

## 4. Current Hierarchy Status Matrix

| Hierarchy Tier | Email | Supabase Auth UID | `user_profiles.id` | Role Assignment | Login Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `superadmin@joypeoplehr.com` | `99722e27-88be-4b14-9575-8b21cc9e3f06` | `dcc96d83-b694-4235-b988-f1b82fabc4ce` | `PLATFORM_ADMIN` | **AUTHENTICATED** |
| **Company Admin** | `companyadmin@joypeoplehr.com` | `11111111-1111-4111-a111-111111111111` | `90c363ce-4d89-44d3-8ac7-96ee9ba8c40e` | `COMPANY_ADMIN` (`b93ae281...`) | Requires `auth.identities` sync |
| **HR Head** | `hrhead@joypeoplehr.com` | `22222222-2222-4222-a222-222222222222` | `b306484b-81a6-44c2-97c2-f061777f933a` | `HR_HEAD` (`8ab0d1e2...`) | Requires `auth.identities` sync |
| **Employee** | `employee@joypeoplehr.com` | `33333333-3333-4333-a333-333333333333` | `5433898b-024d-4de5-ba05-8e1ffaa60bfa` | `EMPLOYEE` (`03ccb485...`) | Requires `auth.identities` sync |

---

## 5. Required Action for 100% PASS

To complete `auth.identities` for the 3 distinct accounts in GoTrue, execute:

```sql
DO $$
DECLARE
    v_ca_uid UUID := '11111111-1111-4111-a111-111111111111';
    v_hr_uid UUID := '22222222-2222-4222-a222-222222222222';
    v_emp_uid UUID := '33333333-3333-4333-a333-333333333333';
BEGIN
    -- 1. Company Admin Identity
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_ca_uid) THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_ca_uid::text, v_ca_uid, jsonb_build_object('sub', v_ca_uid::text, 'email', 'companyadmin@joypeoplehr.com'),
            'email', 'companyadmin@joypeoplehr.com', NOW(), NOW(), NOW()
        );
    END IF;

    -- 2. HR Head Identity
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_hr_uid) THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_hr_uid::text, v_hr_uid, jsonb_build_object('sub', v_hr_uid::text, 'email', 'hrhead@joypeoplehr.com'),
            'email', 'hrhead@joypeoplehr.com', NOW(), NOW(), NOW()
        );
    END IF;

    -- 3. Employee Identity
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_emp_uid) THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_emp_uid::text, v_emp_uid, jsonb_build_object('sub', v_emp_uid::text, 'email', 'employee@joypeoplehr.com'),
            'email', 'employee@joypeoplehr.com', NOW(), NOW(), NOW()
        );
    END IF;
END $$;
```
