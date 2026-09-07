# JOY PeopleHR — Company & Authentication Storage Audit Report

**Date:** September 4, 2026  
**Canonical Supabase Backend:** `https://ysiajemrqakfngasehhi.supabase.co`  
**Decommissioned Project:** `wmqjmyzzamgxyeuotbki` (0 references)  
**Audit Scope:** Platform Admin Company Provisioning & Credential Storage Architecture  

---

## 1. Executive Summary & Trace Analysis

When a customer organization / company is provisioned through the **Platform Admin Portal** (`/platform-dashboard` → `ProvisionCustomerModal.tsx`), the application processes the data through `platformProvisioningEngine.ts`, `platformTenantService.ts`, and `platformAuthInvitationService.ts`.

### Trace Findings:

1. **Company & Organization State:**
   - **Frontend Application State:** The provisioning wizard created an `OrganizationRecord` in memory (`platformTenantService.organizationDb`).
   - **Database Persistence (`public.organizations` & `public.companies`):** In the live Supabase PostgreSQL database, both tables currently report `count: 0`.
   - **Root Cause of Non-Persistence:** The provisioning engine generated a string identifier (`org-<slug>`) and attempted to insert into `customer_profiles` / `platform_subscriptions`, whereas the canonical PostgreSQL schema expects `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and enum `status org_status_enum ('ACTIVE')`. PostgreSQL rejected the string format (`22P02: invalid input syntax for type uuid`), causing the UI to maintain the record in application state.

2. **Company Admin User & Auth Credentials:**
   - **Supabase `auth.users`:** No direct Company Admin user was written to `auth.users` during the modal submission.
   - **Invitation Flow:** The platform provisioning engine dispatches an invitation token via `platformAuthInvitationService` to the Company Admin email with an activation link (`/reset-password?token=...`). The actual `auth.users` row is created when the user completes password setup via Supabase Auth GoTrue.
   - **Business Profile & Role Tables:** `public.user_profiles`, `public.user_roles`, and `public.roles` currently report `count: 0`.

---

## 2. Exact Relational Architecture

The canonical JOY PeopleHR identity and tenancy model connects user authentication to organization data as follows:

```
auth.users (Supabase GoTrue Managed)
    │  [id: UUID, encrypted_password: TEXT (bcrypt), email: TEXT]
    ▼
public.user_profiles (Canonical Public Schema)
    │  [id: UUID REFERENCES auth.users.id, email: TEXT, full_name: TEXT]
    ▼
public.user_roles (Role Binding Table)
    │  [user_id: UUID REFERENCES user_profiles.id, role_id: UUID]
    ▼
public.roles (Role Definition)
    │  [id: UUID, code: 'COMPANY_ADMIN', name: 'Company Administrator']
    ▼
public.companies (Company Entity)
    │  [id: UUID PRIMARY KEY, organization_id: UUID, name: TEXT, legal_name: TEXT]
    ▼
public.organizations (Top-Level Tenant Master)
       [id: UUID PRIMARY KEY, name: TEXT, slug: TEXT, status: 'ACTIVE']
```

---

## 3. Password Storage & Security Verification

### Search Scope for Credential Keywords:
- `password`
- `password_hash`
- `encrypted_password`
- `company_password`
- `user_password`

### Verification Results:

| Security Check | Finding | Detail |
| :--- | :--- | :--- |
| **Password stored in `public.organizations`?** | **NO** | `public.organizations` contains only business metadata (`legal_name`, `slug`, `status`). |
| **Password stored in `public.companies`?** | **NO** | `public.companies` contains only company profile data. |
| **Password stored in `public.user_profiles`?** | **NO** | `public.user_profiles` stores only display name, email, avatar, and timestamps. |
| **Plaintext Password in Public Tables?** | **NO** | Plaintext passwords are never persisted to any database table. |
| **Application Memory / Logs?** | **NO** | `piiScrubber.ts` and `platformAuditService.ts` automatically strip and redact `password` and `password_hash` keys before logging. |
| **Authentication Authority:** | **Supabase Auth** | All password hashing, salt generation, session JWTs, and MFA are handled exclusively by Supabase GoTrue Auth (`auth.users.encrypted_password`). |

---

## 4. Final Audit Matrix

```
AUTHENTICATION STORAGE:
Supabase Auth (auth.users)

BUSINESS USER STORAGE:
public.user_profiles, public.user_roles, public.roles, public.companies, public.organizations

PASSWORD STORED IN PUBLIC TABLES:
NO

REAL AUTH UID:
Pending user activation via Supabase Auth invitation flow (0 rows in public.user_profiles)

COMPANY ID:
Pending canonical UUID assignment in public.companies (0 rows in public.companies)

ORGANIZATION ID:
Pending canonical UUID assignment in public.organizations (0 rows in public.organizations)

USER PROFILE ID:
Pending canonical UUID assignment in public.user_profiles

ROLE:
COMPANY_ADMIN (Assigned upon onboarding completion)
```
