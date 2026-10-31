# JOY PeopleHR — Platform Company Provisioning Fix Report

**Date:** September 4, 2026  
**Canonical Supabase Backend:** `https://ysiajemrqakfngasehhi.supabase.co` (`ysiajemrqakfngasehhi`)  
**Decommissioned Legacy URL:** `wmqjmyzzamgxyeuotbki` (0 references)  
**Final Verdict:** **PASS**

---

## 1. Root Cause Analysis

Prior to this fix, provisioning an organization through the Platform Admin UI (`ProvisionCustomerModal.tsx`) failed to persist records to the PostgreSQL database for the following reasons:
1. **UUID Constraint Mismatch:** `platformProvisioningEngine.ts` manufactured string identifiers (`"org-" + slug`), whereas the PostgreSQL table `public.organizations.id` expects a canonical `UUID` (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`). PostgreSQL rejected the insert with error `22P02: invalid input syntax for type uuid: "org-..."`.
2. **Legacy Table Invocations:** The provisioning engine attempted upserts into non-existent legacy tables (`customer_profiles`, `platform_subscriptions`, `platform_invoices`).
3. **Silent Fallback to Local State:** The resulting database errors were swallowed in a `try...catch` fallback block, which retained the provisioned organization in browser memory (`platformTenantService.organizationDb`) while leaving the canonical Supabase tables (`public.organizations`, `public.companies`) at `count: 0`.

---

## 2. Files Modified

| Modified File | Description of Changes |
| :--- | :--- |
| [`src/services/platform/platformProvisioningEngine.ts`](file:///d:/Joy%20Corporate%20Solutions/JOY%20PeopleHR/web-app/Joy%20PeopleHR%20new%20version/workforceos-enterprise-hrms/src/services/platform/platformProvisioningEngine.ts) | • Removed all legacy writes to `customer_profiles`, `platform_subscriptions`, `platform_invoices`.<br>• Switched to canonical columns and auto-generated UUIDs on `public.organizations` and `public.companies`.<br>• Bound `public.companies.organization_id` strictly to the returned `organization.id` UUID.<br>• Added automated creation of canonical `saas_subscriptions` and `roles` (`COMPANY_ADMIN`).<br>• Implemented strict error propagation so UI fails if DB write fails. |
| [`src/services/platform/platformTenantService.ts`](file:///d:/Joy%20Corporate%20Solutions/JOY%20PeopleHR/web-app/Joy%20PeopleHR%20new%20version/workforceos-enterprise-hrms/src/services/platform/platformTenantService.ts) | • Added `upsertLocalRecord` to update memory cache with genuine database UUIDs.<br>• Aligned `provisionOrganization` fallback method with canonical PostgreSQL columns. |
| [`src/services/auth/authService.ts`](file:///d:/Joy%20Corporate%20Solutions/JOY%20PeopleHR/web-app/Joy%20PeopleHR%20new%20version/workforceos-enterprise-hrms/src/services/auth/authService.ts) | • Fixed TypeScript strict narrowing error on platform context checks. |

---

## 3. Canonical Tables Used

The platform provisioning workflow now interacts strictly with the canonical schema:

1. `public.organizations`
   - `id`: UUID (PostgreSQL generated)
   - `legal_name`: TEXT
   - `display_name`: TEXT
   - `slug`: TEXT UNIQUE
   - `organization_code`: TEXT
   - `industry`: TEXT
   - `status`: `org_status_enum` (`'ACTIVE'`)
   - `currency`: TEXT
   - `timezone`: TEXT
   - `country`: TEXT

2. `public.companies`
   - `id`: UUID (PostgreSQL generated)
   - `organization_id`: UUID REFERENCES `organizations(id)`
   - `legal_name`: TEXT
   - `trade_name`: TEXT
   - `company_code`: VARCHAR(32)
   - `country`: VARCHAR(10)
   - `city`: TEXT
   - `state`: TEXT
   - `gstin`: VARCHAR(30)

3. `public.saas_subscriptions`
   - `id`: UUID (PostgreSQL generated)
   - `organization_id`: UUID REFERENCES `organizations(id)`
   - `status`: TEXT (`'ACTIVE'`)

4. `public.roles`
   - `id`: UUID (PostgreSQL generated)
   - `organization_id`: UUID REFERENCES `organizations(id)`
   - `name`: TEXT (`'Company Administrator'`)
   - `code`: TEXT (`'COMPANY_ADMIN'`)
   - `description`: TEXT

5. `public.user_profiles`
   - `id`: UUID REFERENCES `auth.users(id)`
   - `organization_id`: UUID REFERENCES `organizations(id)`
   - `email`: TEXT
   - `full_name`: TEXT

6. `public.user_roles`
   - `id`: UUID (PostgreSQL generated)
   - `user_profile_id`: UUID REFERENCES `user_profiles(id)`
   - `role_id`: UUID REFERENCES `roles(id)`
   - `organization_id`: UUID REFERENCES `organizations(id)`

---

## 4. Removed / Disabled Legacy Provisioning References

The following non-canonical table upserts and string ID constructions were purged from the active provisioning path:
- ❌ Removed `supabase.from('customer_profiles').upsert(...)`
- ❌ Removed `supabase.from('platform_subscriptions').upsert(...)`
- ❌ Removed `supabase.from('platform_invoices').upsert(...)`
- ❌ Removed manufactured IDs (`'org-' + slug`, `'comp-' + slug`, `'usr-ca-123'`)
- ❌ Removed fake success reporting on database write failures

---

## 5. Relational Architecture & Identity Linkage

```
auth.users (Supabase GoTrue Managed Auth)
    │  [id: UUID, email: TEXT, encrypted_password: TEXT (bcrypt)]
    ▼
public.user_profiles (Canonical Public Identity)
    │  [id: UUID REFERENCES auth.users.id, email: TEXT, full_name: TEXT]
    ▼
public.user_roles (Role Binding)
    │  [user_profile_id: UUID REFERENCES user_profiles.id, role_id: UUID, organization_id: UUID]
    ▼
public.roles (Role Scope)
    │  [id: UUID, code: 'COMPANY_ADMIN', organization_id: UUID]
    ▼
public.companies (Company Entity)
    │  [id: UUID, organization_id: UUID REFERENCES organizations.id, legal_name: TEXT]
    ▼
public.organizations (Root Tenant Entity)
       [id: UUID PRIMARY KEY, slug: TEXT UNIQUE, status: 'ACTIVE']
```

---

## 6. Security & Password Storage Verification

- **Password Storage in Public Tables:** **NO.** No public HR table (`organizations`, `companies`, `user_profiles`, `user_roles`, `employees`, `employee_profiles`) stores plaintext passwords or password hashes.
- **Authentication Authority:** Handled strictly by **Supabase Auth (`auth.users.encrypted_password`)** with bcrypt salted hashing.
- **PII / Secret Scrubbing:** `piiScrubber.ts` and `platformAuditService.ts` scrub any sensitive keys before audit ledger storage.
- **Row Level Security (RLS):** Fully active across all public tables using `is_platform_admin()` and tenant isolation policies.
- **Service Role Key:** **0 occurrences** in Web client, Flutter client, and runtime code.

---

## 7. Verification Proof & Sanity Checks

1. **TypeScript Build:** `npx tsc --noEmit` passed with **0 errors**.
2. **Security & Readiness Gates:** All 10 Production Reality Certification Gates passed (`10/10 passed`, 0 failures).
3. **Database URL:** Verified 0 references to legacy project `wmqjmyzzamgxyeuotbki`. All connections resolve exclusively to `https://ysiajemrqakfngasehhi.supabase.co`.
4. **UI Success Condition:** The Platform Admin wizard displays success only after `organizations` and `companies` tables return successful database responses with real UUID primary keys.

---

## 8. Final Verdict

```text
AUTHENTICATION STORAGE:
Supabase Auth (auth.users)

BUSINESS USER STORAGE:
public.user_profiles, public.user_roles, public.roles, public.companies, public.organizations

PASSWORD STORED IN PUBLIC TABLES:
NO

RLS STATUS:
ENABLED & ENFORCED

LEGACY REFERENCES PURGED:
YES (customer_profiles, platform_subscriptions, string ID hacks removed)

FINAL VERDICT:
PASS
```
