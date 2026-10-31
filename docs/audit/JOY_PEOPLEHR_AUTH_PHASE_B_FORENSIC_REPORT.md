# JOY PEOPLEHR — AUTHENTICATION PHASE B FORENSIC REPORT

**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Forensic Audit Timestamp:** 2026-09-04T13:37:00+05:30  
**Phase:** PHASE B — LIVE AUTH IDENTITY & RELATIONAL INTEGRITY FORENSIC VERIFICATION  
**Security Rules:** Zero schema modification | Zero RLS tampering | Zero client service-role exposure | No fake identities  

---

## 1. Actual Auth User State

Safe inspection via Supabase GoTrue Auth and PostgreSQL returned the following live state:

| Email | `auth.users` Record Exists | Actual Auth UID | Email Confirmed | `auth.identities` Exists | Provider | GoTrue Login Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`superadmin@joypeoplehr.com`** | **YES** | `99722e27-88be-4b14-9575-8b21cc9e3f06` | **YES** (`2026-09-04 07:31:58.490304+00`) | **YES** | `email` | **LOGIN SUCCESS** (200 OK, JWT Active) |
| **`companyadmin@joypeoplehr.com`** | Incomplete SQL Row | `11111111-1111-4111-a111-111111111111` | Timestamp set in SQL | **NO** | Missing | **LOGIN FAILED** (`Database error querying schema`) |
| **`hrhead@joypeoplehr.com`** | Incomplete SQL Row | `22222222-2222-4222-a222-222222222222` | Timestamp set in SQL | **NO** | Missing | **LOGIN FAILED** (`Database error querying schema`) |
| **`employee@joypeoplehr.com`** | Incomplete SQL Row | `33333333-3333-4333-a333-333333333333` | Timestamp set in SQL | **NO** | Missing | **LOGIN FAILED** (`Database error querying schema`) |

---

## 2. UID Origin Verification

| Identity | Evaluated Auth UID | Origin Verdict |
| :--- | :--- | :--- |
| **Platform Admin** | `99722e27-88be-4b14-9575-8b21cc9e3f06` | **REAL GO TRUE GENERATED** |
| **Company Admin** | `11111111-1111-4111-a111-111111111111` | **MANUALLY ASSIGNED / NOT VERIFIED AS GO TRUE-GENERATED IDENTITY** |
| **HR Head** | `22222222-2222-4222-a222-222222222222` | **MANUALLY ASSIGNED / NOT VERIFIED AS GO TRUE-GENERATED IDENTITY** |
| **Employee** | `33333333-3333-4333-a333-333333333333` | **MANUALLY ASSIGNED / NOT VERIFIED AS GO TRUE-GENERATED IDENTITY** |

---

## 3. Auth Identity Verification (`auth.identities`)

- **Root Cause of Failure**: In Supabase Auth GoTrue, authenticating via `signInWithPassword` requires GoTrue to resolve the user's login provider from `auth.identities`.
- When records are inserted manually into `auth.users` via raw SQL without executing GoTrue's internal identity generation, `auth.identities` remains unlinked, causing GoTrue to reject the authentication handshake with `Database error querying schema`.
- **Finding**: Manually patching internal Supabase Auth schema (`auth.identities`) via SQL is fragile and not supported as a production architecture. GoTrue users must be created through Supabase's official Admin Auth API (`supabaseAdmin.auth.admin.createUser()`).

---

## 4. Edge Function Inspection (`supabase/functions/employee-auth-provisioner/index.ts`)

| Item | Question | Forensic Assessment |
| :--- | :--- | :--- |
| **A** | Does it call `supabaseAdmin.auth.admin.createUser()`? | **YES** (Line 67 invokes `createUser` with `email_confirm: true`). |
| **B** | Is the service-role credential server-side only? | **YES** (Reads from Deno environment variable `SUPABASE_SERVICE_ROLE_KEY`). |
| **C** | Does it return the newly generated Auth UID? | **YES** (Returns `{ success: true, auth_user_id: authUserId }`). |
| **D** | Does it create/update `public.user_profiles`? | **NO** (Calls legacy `provision_employee_auth_identity` RPC instead of canonical `user_profiles`). |
| **E** | Does it create/update `public.user_roles`? | **NO** (Does not assign canonical `user_roles`). |
| **F** | Does it link employee identity correctly? | **NO** (Does not update canonical `employees.user_id` or `user_profiles.employee_id`). |
| **G** | Does it handle an already-existing Auth user safely? | **YES** (Lines 90–97 fall back to `listUsers` and reuse the UID). |
| **H** | Does it handle duplicate email? | **YES** (Matches email in user list). |
| **I** | Does it handle rollback if public DB linkage fails? | **NO** (Auth user remains created if public DB fails). |
| **J** | Does it expose privileged credentials to client? | **NO** (Strictly server-side execution). |

---

## 5. `public.employees.user_id` Foreign Key Verification

Live PostgreSQL schema inspection of table constraints:

```sql
-- Constraint Definition in deployed database:
ALTER TABLE public.employees 
ADD CONSTRAINT employees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id);
```

### Exact Foreign Key Target Results:
- **`employees.user_id` FK Target:** **`public.user_profiles.id`** (References the UUID Primary Key of `user_profiles`, NOT `auth.users.id`).
- **`user_profiles.auth_user_id` FK Target:** **`auth.users.id`** (References the UUID Primary Key of GoTrue `auth.users`).

---

## 6. Current Public Database Links

**Target Smoke Employee Record:**
- `employees.id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- `employees.employee_code`: `SMOKE-E2E-EMP-001`
- `employees.user_id`: `5433898b-024d-4de5-ba05-8e1ffaa60bfa`

**Target User Profile Record:**
- `user_profiles.id`: `5433898b-024d-4de5-ba05-8e1ffaa60bfa`
- `user_profiles.auth_user_id`: `33333333-3333-4333-a333-333333333333` (Manually assigned)
- `user_profiles.employee_id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- `user_profiles.organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`

**Target User Role Record:**
- `user_roles.user_profile_id`: `5433898b-024d-4de5-ba05-8e1ffaa60bfa`
- `user_roles.role_id`: `03ccb485-47d5-4747-a069-17fcabd15767` (`EMPLOYEE`)

### Actual Canonical Schema Resolution Path:
```
Supabase Auth GoTrue (auth.users.id)
       ↓ (auth_user_id)
public.user_profiles.id (dcc96d83..., 90c363ce..., b306484b..., 5433898b...)
       ↓                                                     ↓
public.user_roles (user_profile_id)            public.employees (user_id = user_profiles.id)
       ↓                                                     ↓
public.roles (role_id)                         public.user_profiles (employee_id = employees.id)
```

---

## 7. Company Admin Relational Verification

- `user_profiles.id`: `90c363ce-4d89-44d3-8ac7-96ee9ba8c40e`
- `user_profiles.auth_user_id`: `11111111-1111-4111-a111-111111111111`
- `user_profiles.organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`
- `user_profiles.employee_id`: `NULL`
- `user_roles.role_id`: `b93ae281-5a79-49c8-8eef-57b84313f074` (`COMPANY_ADMIN`)
- **GoTrue Auth Status**: **INCOMPLETE** (GoTrue login rejected with `Database error querying schema`).

---

## 8. HR Head Relational Verification

- `user_profiles.id`: `b306484b-81a6-44c2-97c2-f061777f933a`
- `user_profiles.auth_user_id`: `22222222-2222-4222-a222-222222222222`
- `user_profiles.organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`
- `user_profiles.employee_id`: `NULL`
- `user_roles.role_id`: `8ab0d1e2-6ba1-4f6a-8774-38769d880a36` (`HR_HEAD`)
- **GoTrue Auth Status**: **INCOMPLETE** (GoTrue login rejected with `Database error querying schema`).

---

## 9. Employee Relational Verification

- `user_profiles.id`: `5433898b-024d-4de5-ba05-8e1ffaa60bfa`
- `user_profiles.auth_user_id`: `33333333-3333-4333-a333-333333333333`
- `user_profiles.organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`
- `user_profiles.employee_id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- `employees.id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- `employees.user_id`: `5433898b-024d-4de5-ba05-8e1ffaa60bfa` (Matches `user_profiles.id`)
- `user_roles.role_id`: `03ccb485-47d5-4747-a069-17fcabd15767` (`EMPLOYEE`)
- **GoTrue Auth Status**: **INCOMPLETE** (GoTrue login rejected with `Database error querying schema`).

---

## 10. Security Verification

- Client applications (`src/` and `flutter_app/`) do **NOT** have `service_role` keys or admin credentials.
- Canonical RLS remains enabled on all tables.
- Platform Admin Auth UID (`99722e27-88be-4b14-9575-8b21cc9e3f06`) is isolated and not shared with any subordinate role.

---

## 11. Exact Remaining Blocker

Direct SQL insertion into `auth.users` bypassing Supabase GoTrue Auth engine creates an incomplete authentication identity that fails runtime token issuance with `Database error querying schema`.

---

## 12. Recommended Minimal Fix

1. Complete the server-side provisioning Edge Function / secure backend script to invoke `supabaseAdmin.auth.admin.createUser()` with server-side `SUPABASE_SERVICE_ROLE_KEY`.
2. Generate genuine, GoTrue-managed Auth UIDs for Company Admin, HR Head, and Employee.
3. Update `public.user_profiles.auth_user_id` to point to the newly generated authentic GoTrue UIDs.
4. Verify end-to-end multi-tier login across Web and Flutter.

---

## FINAL VERDICT

# **PHASE B = FAIL — DO NOT PROCEED**

*(Reason: Only Platform Admin is a verified GoTrue-generated Auth user. Company Admin, HR Head, and Employee Auth accounts were manually assigned in SQL, lack GoTrue identities, and fail login. Authentic GoTrue creation via Supabase Auth Admin API is required before proceeding to verification).*
