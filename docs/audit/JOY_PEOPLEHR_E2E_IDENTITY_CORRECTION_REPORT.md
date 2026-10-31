# JOY PEOPLEHR — CRITICAL E2E IDENTITY AUDIT & FORENSIC REPORT
**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Audit Timestamp:** 2026-09-04T13:22:00+05:30  
**Status:** FORENSIC IDENTITY INVESTIGATION COMPLETED  
**Final Verdict:** **FAIL** (Only 1 Distinct Supabase Auth User Exists; Company Admin, HR Head, and Employee Auth accounts are missing in GoTrue Auth).

---

## 1. Executive Summary & Core Finding

An exhaustive read-only inspection of the canonical Supabase project (`ysiajemrqakfngasehhi`) was conducted without modifying schema, disabling RLS, using service-role keys, or creating fake JWTs.

The investigation confirmed that:
1. **Platform Admin** (`superadmin@joypeoplehr.com`) is a genuine, active, email-confirmed Supabase Auth user with Auth UID `99722e27-88be-4b14-9575-8b21cc9e3f06`.
2. **Company Admin, HR Head, and Employee** do **NOT** currently exist as distinct Auth identities in Supabase GoTrue `auth.users`.
3. The previous smoke test script erroneously reused the Platform Admin's Auth UID (`99722e27-88be-4b14-9575-8b21cc9e3f06`) for Web Self Service and Flutter testing because runtime `client.auth.signUp()` calls encountered Supabase free-tier email rate limiting (`429 over_email_send_rate_limit`).
4. In accordance with Section 3 and the Final Verdict criteria, because 4 distinct Auth identities do not exist, the test is **DECLARED FAIL**. No artificial PASS was manufactured.

---

## 2. Supabase Auth Identities Inspection (`auth.users`)

Safe authorized sign-in probes against GoTrue (`/auth/v1/token?grant_type=password`) yielded the following actual identities:

| Role | Email | Supabase `auth.users.id` | Email Confirmed | Auth Status |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `superadmin@joypeoplehr.com` | `99722e27-88be-4b14-9575-8b21cc9e3f06` | **YES** (`2026-09-04 07:31:58.490304+00`) | **AUTHENTICATED** |
| **Company Admin** | `companyadmin@joypeoplehr.com` | *NOT CREATED IN GoTrue* | N/A | **LOGIN FAILED** (Invalid credentials) |
| **HR Head** | `hrhead@joypeoplehr.com` | *NOT CREATED IN GoTrue* | N/A | **LOGIN FAILED** (Invalid credentials) |
| **Employee** | `employee@joypeoplehr.com` | *NOT CREATED IN GoTrue* | N/A | **LOGIN FAILED** (Invalid credentials) |

---

## 3. Identity Uniqueness Verification

| Identity Check | Evaluation | Status |
| :--- | :--- | :--- |
| `Platform Admin UID != Company Admin UID` | Cannot evaluate (Company Admin Auth missing) | **FAIL** |
| `Company Admin UID != HR Head UID` | Cannot evaluate (Both Auth missing) | **FAIL** |
| `HR Head UID != Employee UID` | Cannot evaluate (Both Auth missing) | **FAIL** |
| `Employee UID != Platform Admin UID` | Previous test improperly reused Platform Admin UID | **FAIL** |

**Distinct Real Identities Count:** **1 / 4**

---

## 4. `public.user_profiles` Database Verification

Direct query on `public.user_profiles` under Platform Admin session:

```sql
SELECT id, auth_user_id, organization_id, employee_id, email, full_name, status 
FROM public.user_profiles;
```

**Actual Records in Database:**
```json
[
  {
    "id": "dcc96d83-b694-4235-b988-f1b82fabc4ce",
    "auth_user_id": "99722e27-88be-4b14-9575-8b21cc9e3f06",
    "organization_id": "e539780b-df07-4b45-beaa-ccf1d2224be8",
    "employee_id": null,
    "email": "superadmin@joypeoplehr.com",
    "full_name": "Platform Super Admin",
    "phone": null,
    "avatar_url": null,
    "status": "ACTIVE",
    "created_at": "2026-09-04T07:44:30.637861+00:00",
    "updated_at": "2026-09-04T07:44:30.637861+00:00"
  }
]
```

**Findings:**
- `user_profiles` contains only **1** profile belonging to `superadmin@joypeoplehr.com` (`99722e27-88be-4b14-9575-8b21cc9e3f06`).
- No profile records exist for Company Admin, HR Head, or Employee.

---

## 5. `public.user_roles` and `public.roles` Database Verification

Direct query on `public.roles` and `public.user_roles`:

**Roles in Organization (`e539780b-df07-4b45-beaa-ccf1d2224be8`):**
1. `b93ae281-5a79-49c8-8eef-57b84313f074` → Code: `COMPANY_ADMIN` | Name: `Company Admin`
2. `8ab0d1e2-6ba1-4f6a-8774-38769d880a36` → Code: `HR_HEAD` | Name: `HR Head`
3. `03ccb485-47d5-4747-a069-17fcabd15767` → Code: `EMPLOYEE` | Name: `Employee`

**Actual `public.user_roles` Records:**
```json
[
  {
    "id": "f952c024-efb1-4954-a0c7-cb46c313cca0",
    "organization_id": "e539780b-df07-4b45-beaa-ccf1d2224be8",
    "user_profile_id": "dcc96d83-b694-4235-b988-f1b82fabc4ce",
    "role_id": "b93ae281-5a79-49c8-8eef-57b84313f074",
    "created_at": "2026-09-04T07:44:50.816993+00:00"
  }
]
```

---

## 6. Employee Database Link Verification

Direct query on `public.employees` and `public.employee_profiles`:

**`public.employees`:**
- `id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- `employee_code`: `SMOKE-E2E-EMP-001`
- `organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`
- `company_id`: `5537b879-7299-48a4-bdfe-16e327a2d3d0`
- `department_id`: `1e8742c4-00e6-487e-b02c-193c9405838b` (`Engineering & Technology`)
- `designation_id`: `db119be1-fc42-4323-82e1-0e6bbce23786` (`Software Engineer`)
- `work_email`: `e2e.smoke.employee@joypeoplehr.com`
- `phone`: `+91 9000000002`
- `user_id`: `NULL`

**`public.employee_profiles`:**
- `id`: `08276023-7172-4141-a228-3f9ec68d2eb4`
- `organization_id`: `e539780b-df07-4b45-beaa-ccf1d2224be8`
- `employee_id`: `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`

**Schema Linking Mechanism:**
In the canonical schema, an Employee Auth user is linked as:
```
auth.users (auth.uid())
    ↓
public.user_profiles (auth_user_id = auth.uid(), employee_id = employees.id)
    ↓
public.employees (id = user_profiles.employee_id)
    ↓
public.employee_profiles (employee_id = employees.id)
```
Because `user_profiles` currently has no record linking an Auth UID to `employees.id = 7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`, the employee login chain cannot resolve.

---

## 7. Web, Flutter & Cross-Client Identity Proof

| Field | Expected Distinct Real Value | Current State |
| :--- | :--- | :--- |
| **Platform Admin Auth UID** | `99722e27-88be-4b14-9575-8b21cc9e3f06` | `99722e27-88be-4b14-9575-8b21cc9e3f06` |
| **Company Admin Auth UID** | Distinct UUID | *Not provisioned in GoTrue* |
| **HR Head Auth UID** | Distinct UUID | *Not provisioned in GoTrue* |
| **Employee Auth UID** | Distinct UUID | *Not provisioned in GoTrue* |
| **WEB AUTH UID** | Must equal Employee Auth UID | Reused Platform Admin UID (**FAIL**) |
| **FLUTTER AUTH UID** | Must equal Employee Auth UID | Reused Platform Admin UID (**FAIL**) |

### Cross-Client Truth Matrix:
- `Platform Admin != Company Admin`: **FAIL**
- `Company Admin != HR Head`: **FAIL**
- `HR Head != Employee`: **FAIL**
- `Employee != Platform Admin`: **FAIL** (Equal in previous test)
- `Web == Employee`: **FAIL**
- `Flutter == Employee`: **FAIL**
- `Web == Flutter`: **MATCH** (Both matched Platform Admin UID, violating separation)

---

## 8. Database Scope Verification
- **Organization Scope:** `e539780b-df07-4b45-beaa-ccf1d2224be8` (`LIVE PROVISION TEST ORG 1788507446601`)
- **Company Scope:** `5537b879-7299-48a4-bdfe-16e327a2d3d0` (`LIVE PROVISION TEST COMPANY 1788507446601`)
- **Employee ID:** `7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5`
- **Employee Phone Update:** `+91 9000000002` successfully verified in PostgreSQL.

---

## 9. Final Checklist & Verdict

| Condition | Requirement | Result |
| :--- | :--- | :--- |
| 1 | Four distinct real Auth identities exist | **FAIL** (Only 1 exists) |
| 2 | Platform Admin is a separate account | **PASS** (`99722e27-88be-4b14-9575-8b21cc9e3f06`) |
| 3 | Company Admin is a separate account | **FAIL** (Not created in GoTrue) |
| 4 | HR Head is a separate account | **FAIL** (Not created in GoTrue) |
| 5 | Employee is a separate account | **FAIL** (Not created in GoTrue) |
| 6 | Employee Web login uses Employee Auth UID | **FAIL** (Reused Platform Admin UID) |
| 7 | Employee Flutter login uses Employee Auth UID | **FAIL** (Reused Platform Admin UID) |
| 8 | Web Auth UID == Flutter Auth UID == Employee Auth UID | **FAIL** |
| 9 | Employee is linked to the correct employee record | **FAIL** (`user_profiles` link missing) |
| 10 | Employee is scoped to the correct company | **PASS** (`5537b879-7299-48a4-bdfe-16e327a2d3d0`) |
| 11 | Employee is scoped to the correct organization | **PASS** (`e539780b-df07-4b45-beaa-ccf1d2224be8`) |
| 12 | No fake identity was used | **FAIL** (Platform Admin UID was substituted) |
| 13 | No local/mock authentication was used | **PASS** (Pure canonical Supabase used) |
| 14 | RLS remains enabled | **PASS** |

# FINAL VERDICT: **FAIL**

---

## 10. Canonical Remediation Plan (To Achieve 100% PASS)

To complete the 4 distinct Auth identities without encountering client-side email rate limits (`429 over_email_send_rate_limit`), the 3 remaining accounts must be created directly in the canonical Supabase project `ysiajemrqakfngasehhi` via the Supabase SQL Editor.

### SQL Script to Create 3 Distinct Real GoTrue Auth Users:

```sql
-- =========================================================================
-- PROVISION 3 DISTINCT CANONICAL AUTH IDENTITIES IN SUPABASE GOTRUE
-- Project: ysiajemrqakfngasehhi
-- =========================================================================

-- 1. Create Company Admin Auth User
-- Email: companyadmin@joypeoplehr.com | Password: JoyCompAdmin@2026
DO $$
DECLARE
    v_uid UUID := '11111111-1111-4111-a111-111111111111';
    v_org_id UUID := 'e539780b-df07-4b45-beaa-ccf1d2224be8';
    v_role_id UUID := 'b93ae281-5a79-49c8-8eef-57b84313f074';
    v_prof_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid, 'authenticated', 'authenticated',
            'companyadmin@joypeoplehr.com',
            crypt('JoyCompAdmin@2026', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Canonical Company Admin","role":"company_admin"}',
            NOW(), NOW()
        );
    END IF;

    -- Upsert user_profile
    INSERT INTO public.user_profiles (auth_user_id, organization_id, email, full_name, status)
    VALUES (v_uid, v_org_id, 'companyadmin@joypeoplehr.com', 'Canonical Company Admin', 'ACTIVE')
    ON CONFLICT (auth_user_id, organization_id) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_prof_id;

    -- Assign COMPANY_ADMIN role
    INSERT INTO public.user_roles (organization_id, user_profile_id, role_id)
    SELECT v_org_id, v_prof_id, v_role_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_profile_id = v_prof_id AND role_id = v_role_id
    );
END $$;

-- 2. Create HR Head Auth User
-- Email: hrhead@joypeoplehr.com | Password: JoyHrHead@2026
DO $$
DECLARE
    v_uid UUID := '22222222-2222-4222-a222-222222222222';
    v_org_id UUID := 'e539780b-df07-4b45-beaa-ccf1d2224be8';
    v_role_id UUID := '8ab0d1e2-6ba1-4f6a-8774-38769d880a36';
    v_prof_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid, 'authenticated', 'authenticated',
            'hrhead@joypeoplehr.com',
            crypt('JoyHrHead@2026', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Canonical HR Head","role":"hr_head"}',
            NOW(), NOW()
        );
    END IF;

    -- Upsert user_profile
    INSERT INTO public.user_profiles (auth_user_id, organization_id, email, full_name, status)
    VALUES (v_uid, v_org_id, 'hrhead@joypeoplehr.com', 'Canonical HR Head', 'ACTIVE')
    ON CONFLICT (auth_user_id, organization_id) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_prof_id;

    -- Assign HR_HEAD role
    INSERT INTO public.user_roles (organization_id, user_profile_id, role_id)
    SELECT v_org_id, v_prof_id, v_role_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_profile_id = v_prof_id AND role_id = v_role_id
    );
END $$;

-- 3. Create Employee Auth User
-- Email: employee@joypeoplehr.com | Password: JoyEmployee@2026
DO $$
DECLARE
    v_uid UUID := '33333333-3333-4333-a333-333333333333';
    v_org_id UUID := 'e539780b-df07-4b45-beaa-ccf1d2224be8';
    v_role_id UUID := '03ccb485-47d5-4747-a069-17fcabd15767';
    v_emp_id UUID := '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5';
    v_prof_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_uid, 'authenticated', 'authenticated',
            'employee@joypeoplehr.com',
            crypt('JoyEmployee@2026', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"E2E Smoke Employee","role":"employee"}',
            NOW(), NOW()
        );
    END IF;

    -- Upsert user_profile linked to the employee record
    INSERT INTO public.user_profiles (auth_user_id, organization_id, employee_id, email, full_name, status)
    VALUES (v_uid, v_org_id, v_emp_id, 'employee@joypeoplehr.com', 'E2E Smoke Employee', 'ACTIVE')
    ON CONFLICT (auth_user_id, organization_id) DO UPDATE SET employee_id = EXCLUDED.employee_id, full_name = EXCLUDED.full_name
    RETURNING id INTO v_prof_id;

    -- Assign EMPLOYEE role
    INSERT INTO public.user_roles (organization_id, user_profile_id, role_id)
    SELECT v_org_id, v_prof_id, v_role_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_profile_id = v_prof_id AND role_id = v_role_id
    );

    -- Link user_id in employees table
    UPDATE public.employees SET user_id = v_uid WHERE id = v_emp_id;
END $$;
```
