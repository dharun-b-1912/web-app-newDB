# JOY PEOPLEHR — AUTHENTICATION PHASE C PROVISIONING REPORT

**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Audit & Remediation Timestamp:** 2026-09-04T13:40:00+05:30  
**Phase:** PHASE C — REAL GO TRUE AUTH PROVISIONING ARCHITECTURE REMEDIATION  
**Security Posture:** ZERO SCHEMA DRIFT | RLS PRESERVED | ZERO CLIENT SERVICE-ROLE LEAKS | CANONICAL POSTGRESQL & GOTRUE  

---

## 1. Edge Function Before State

- **File**: `supabase/functions/employee-auth-provisioner/index.ts`
- **Previous Deficiencies**:
  - Called a legacy RPC `provision_employee_auth_identity` targeting non-canonical `employee_auth_identities`.
  - Did not upsert canonical `public.user_profiles`.
  - Did not link canonical `public.user_roles` (`COMPANY_ADMIN`, `HR_HEAD`, `EMPLOYEE`).
  - Did not link canonical `public.employees.user_id`.
  - Lacked caller authorization token verification.
  - Lacked atomic rollback logic if public DB linkage failed after GoTrue user creation.

---

## 2. Edge Function After State

- **File**: [index.ts](file:///d:/Joy%20Corporate%20Solutions/JOY%20PeopleHR/web-app/Joy%20PeopleHR%20new%20version/workforceos-enterprise-hrms/supabase/functions/employee-auth-provisioner/index.ts)
- **Implemented Remediation**:
  1. **JWT Verification**: Verifies incoming `Authorization: Bearer <JWT>` header via `supabaseAdmin.auth.getUser()`.
  2. **GoTrue Creation**: Invokes `supabaseAdmin.auth.admin.createUser()` with `email_confirm: true` to generate genuine GoTrue Auth UIDs.
  3. **Canonical User Profile**: Upserts `public.user_profiles` with `auth_user_id = GoTrue UID`, `organization_id`, `employee_id`, `email`, `full_name`, `status = 'ACTIVE'`.
  4. **Canonical Role Linkage**: Upserts `public.user_roles` using canonical role IDs (`COMPANY_ADMIN`, `HR_HEAD`, `EMPLOYEE`).
  5. **Employee Linkage**: For employee provisioning, sets `employees.user_id = user_profiles.id` (preserving foreign key constraint `employees.user_id REFERENCES public.user_profiles(id)`).
  6. **Atomic Rollback**: Catches any database linkage failure and automatically triggers `supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)`.

---

## 3. Auth Provisioning Architecture

```
Client (Web / Flutter)
    ↓ (User Action: Invite / Provision)
POST /functions/v1/employee-auth-provisioner (with caller JWT)
    ↓
Deno Edge Environment (SUPABASE_SERVICE_ROLE_KEY)
    ├── 1. supabaseAdmin.auth.admin.createUser() → Returns Real GoTrue UID
    ├── 2. INSERT INTO public.user_profiles (auth_user_id = GoTrue UID)
    ├── 3. INSERT INTO public.user_roles (user_profile_id = user_profiles.id, role_id)
    └── 4. UPDATE public.employees SET user_id = user_profiles.id (if Employee)
```

---

## 4. Invalid Auth User Handling

The three manually assigned UUIDs in `auth.users`:
- `11111111-1111-4111-a111-111111111111` (Company Admin)
- `22222222-2222-4222-a222-222222222222` (HR Head)
- `33333333-3333-4333-a333-333333333333` (Employee)

were confirmed to be invalid test artifacts lacking `auth.identities` records, causing GoTrue login handshakes to fail with `Database error querying schema`.

---

## 5. Auth Identity Matrix & Verification

| Hierarchy Tier | Email | GoTrue Auth UID | `user_profiles.id` | `employee_id` | Role Code | Live GoTrue Login Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `superadmin@joypeoplehr.com` | `99722e27-88be-4b14-9575-8b21cc9e3f06` | `dcc96d83-b694-4235-b988-f1b82fabc4ce` | `NULL` | `PLATFORM_ADMIN` | **LOGIN SUCCESS** (200 OK) |
| **Company Admin** | `companyadmin@joypeoplehr.com` | *Awaiting GoTrue creation* | `90c363ce-4d89-44d3-8ac7-96ee9ba8c40e` | `NULL` | `COMPANY_ADMIN` | **LOGIN FAILED** (`Database error querying schema`) |
| **HR Head** | `hrhead@joypeoplehr.com` | *Awaiting GoTrue creation* | `b306484b-81a6-44c2-97c2-f061777f933a` | `NULL` | `HR_HEAD` | **LOGIN FAILED** (`Database error querying schema`) |
| **Employee** | `employee@joypeoplehr.com` | *Awaiting GoTrue creation* | `5433898b-024d-4de5-ba05-8e1ffaa60bfa` | `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5` | `EMPLOYEE` | **LOGIN FAILED** (`Database error querying schema`) |

---

## 6. Build & Type Verification

- **Web Application Build (`npm run build`)**: **PASS** (Built 3,124 modules in 25.77s without errors).
- **Flutter Application Analysis (`flutter analyze`)**: **PASS** (0 errors).

---

## 7. Remaining Blocker

The remote Supabase Edge Function `employee-auth-provisioner` has not been deployed to the remote Supabase project (`404 NOT_FOUND`), and the client-side `client.auth.signUp()` continues to hit free-tier email rate limits (`429 over_email_send_rate_limit`).

---

## FINAL VERDICT

# **PHASE C = FAIL — DO NOT PROCEED**

*(Reason: Although the Edge Function code, client-side provisioning flows, and database relational mappings have been architecturally remediated, genuine GoTrue-managed Auth identities for Company Admin, HR Head, and Employee do not yet exist in GoTrue, and login verification fails).*
