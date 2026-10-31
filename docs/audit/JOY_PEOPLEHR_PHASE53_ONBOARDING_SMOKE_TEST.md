# JOY PeopleHR — Phase 5.3 Controlled Authenticated Onboarding Smoke Test Report

**Canonical Supabase Target:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Decommissioned Legacy Database:** `wmqjmyzzamgxyeuotbki` (**0 Active References**)  
**Controlled Test User ID:** `8a8dce94-dcfc-42bf-8dd5-86b035a2ef56` (`phase52.live.admin.1788443292492@joypeoplehr.com`)  
**Overall Status:** **BLOCKED**  
**Date:** 2026-09-03  

---

## 1. Authentication Status (Step 1 & Step 16)

- **Existing Controlled Test User:** `8a8dce94-dcfc-42bf-8dd5-86b035a2ef56`
- **Login Request Target:** `https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password`
- **Response Status:** `HTTP 400 Bad Request`
- **Error Payload:** `{"code": "email_not_confirmed", "message": "Email not confirmed"}`
- **Auth Blocker Finding:** The Supabase Auth service on project `ysiajemrqakfngasehhi` has email confirmation enabled (`Confirm email: ON`). Password authentication is rejected by Supabase GoTrue until the account's email confirmation link is verified or email confirmation is toggled off in the project settings.
- **Rule Enforcement:** Per safety instructions, signup was **NOT** repeatedly called, authentication code was **NOT** altered, and no fake/local bypass was permitted.

---

## 2. Initial Database State (Step 2 Counts)

Verified live against `https://ysiajemrqakfngasehhi.supabase.co`:

| Table Name | Row Count | Expected Initial State | Status |
| :--- | :--- | :--- | :--- |
| `public.organizations` | **0** | 0 | **PASS (Clean)** |
| `public.companies` | **0** | 0 | **PASS (Clean)** |
| `public.user_profiles` | **0** | 0 | **PASS (Clean)** |
| `public.user_roles` | **0** | 0 | **PASS (Clean)** |
| `public.employees` | **0** | 0 | **PASS (Clean)** |
| `public.employee_profiles` | **0** | 0 | **PASS (Clean)** |
| `public.employee_onboarding` | **0** | 0 | **PASS (Clean)** |
| `public.employee_bank_details` | **0** | 0 | **PASS (Clean)** |
| `public.employee_statutory_details` | **0** | 0 | **PASS (Clean)** |
| `public.employee_addresses` | **0** | 0 | **PASS (Clean)** |

---

## 3. Onboarding Smoke Test Execution Matrix

| Verification Item | Status | Detailed Note / Finding |
| :--- | :--- | :--- |
| **AUTHENTICATION** | **FAIL (BLOCKED)** | `AuthApiError: Email not confirmed (status: 400, code: 'email_not_confirmed')` |
| **BOOTSTRAP (`fn_provision_initial_organization`)** | **BLOCKED** | Blocked pending valid JWT Bearer session containing `auth.uid()` |
| **ORGANIZATION CREATION** | **BLOCKED** | Cannot execute atomic provisioning without authenticated user token |
| **COMPANY CREATION** | **BLOCKED** | Blocked |
| **USER PROFILE CREATION** | **BLOCKED** | Blocked |
| **ORG ADMIN ROLE ASSIGNMENT** | **BLOCKED** | Blocked |
| **DASHBOARD** | **NOT TESTED** | Blocked on tenant bootstrap |
| **PEOPLE DIRECTORY** | **NOT TESTED** | Blocked on tenant bootstrap |
| **EMPLOYEE CREATE** | **NOT TESTED** | Blocked |
| **EMPLOYEE READ-BACK** | **NOT TESTED** | Blocked |
| **EMPLOYEE UPDATE** | **NOT TESTED** | Blocked |
| **EMPLOYEE PROFILE** | **NOT TESTED** | Blocked |
| **BANK DETAILS** | **NOT TESTED** | Blocked |
| **STATUTORY DETAILS** | **NOT TESTED** | Blocked |
| **ADDRESS** | **NOT TESTED** | Blocked |
| **ONBOARDING RECORD** | **NOT TESTED** | Blocked |
| **TENANT SCOPE** | **NOT FULLY TESTED** | Static verification passed; live write blocked on auth |
| **RLS** | **NOT FULLY TESTED** | `024_rls.sql` verified statically; live execution blocked on auth |
| **REALTIME** | **NOT PROVEN** | Realtime subscription bindings verified; live message dispatch blocked on auth |
| **NETWORK ERRORS** | **0 Application Errors** | Only `400 email_not_confirmed` observed from Supabase Auth endpoint |

---

## 4. Required Action to Unblock

To proceed with live authenticated bootstrapping and employee creation:

```
ACTION REQUIRED IN SUPABASE DASHBOARD:
1. Open Project: ysiajemrqakfngasehhi
2. Navigate to: Authentication → Providers → Email
3. Set "Confirm email" to: OFF (Disabled)
```

Alternatively, if a pre-confirmed user account exists in `auth.users` on `ysiajemrqakfngasehhi`, providing its verified credentials will immediately enable the live bootstrap sequence.
