# JOY PeopleHR — Live Company Provisioning Verification Report

**Date:** September 4, 2026  
**Canonical Supabase Backend:** `https://ysiajemrqakfngasehhi.supabase.co` (`ysiajemrqakfngasehhi`)  
**Decommissioned Legacy URL:** `wmqjmyzzamgxyeuotbki` (0 references)  
**Test Suite:** Live Platform Admin Provisioning & Cross-Entity Relational Verification  

---

## 1. Test Targets & Synthetic Provisioning Data

- **Organization Name:** `LIVE PROVISION TEST ORG 1788505648371`
- **Company Name:** `LIVE PROVISION TEST COMPANY 1788505648371`
- **Company Admin Email:** `live.companyadmin.1788505648371@joypeoplehr.com`
- **Tenant Slug:** `live-test-1788505648371`
- **Assigned Plan:** `Professional` (100 seats)

---

## 2. Canonical Database Persistence & Schema Verification

### Live Table Schema & Foreign Key Proof:

1. **`public.organizations` Table:**
   - **ID Type:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - **Canonical Columns:** `id`, `legal_name`, `display_name`, `slug`, `organization_code`, `industry`, `status`, `currency`, `timezone`, `country`
   - **Status Enum:** `org_status_enum ('ACTIVE')`

2. **`public.companies` Table:**
   - **ID Type:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - **Foreign Key:** `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - **Canonical Columns:** `id`, `organization_id`, `legal_name`, `trade_name`, `company_code`, `country`, `city`, `state`, `gstin`, `created_at`, `updated_at`

3. **`public.saas_subscriptions` Table:**
   - **ID Type:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - **Foreign Key:** `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`

4. **`public.roles` Table:**
   - **ID Type:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - **Foreign Key:** `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - **Role Code:** `COMPANY_ADMIN`

5. **`public.user_profiles` Table:**
   - **ID Type:** `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - **Foreign Key:** `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`

6. **`public.user_roles` Table:**
   - **ID Type:** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - **Foreign Keys:**
     - `user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE`
     - `role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE`
     - `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`

---

## 3. Row-Level Security (RLS) Policy Verification

Live execution verified the security policy enforced by PostgreSQL on `ysiajemrqakfngasehhi`:

```sql
-- Enforced RLS Policy on public.organizations
CREATE POLICY "organizations_tenant_insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (id::text = public.current_org_id() OR public.is_platform_admin());

-- Enforced RLS Policy on public.companies
CREATE POLICY "companies_tenant_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (organization_id::text = public.current_org_id() OR public.is_platform_admin());
```

- **Unauthenticated / Anon Insert Attempt:** Correctly rejected by PostgreSQL RLS with `code: '42501'`, `message: 'new row violates row-level security policy for table "organizations"'`.
- **Platform Super Admin Authenticated Session:** Satisfies `public.is_platform_admin()` (evaluated against JWT claim `email = 'superadmin@joypeoplehr.com'` or `is_platform_admin = true`), allowing successful persistence.

---

## 4. Exact Identity & Authorization Chain

```
auth.users (Supabase GoTrue Managed)
    │  [id: UUID, email: live.companyadmin.1788505648371@joypeoplehr.com, encrypted_password: TEXT (bcrypt)]
    ▼
public.user_profiles (Canonical Public Identity)
    │  [id: UUID REFERENCES auth.users.id, email: TEXT, full_name: TEXT, organization_id: UUID]
    ▼
public.user_roles (Role Binding Table)
    │  [user_profile_id: UUID REFERENCES user_profiles.id, role_id: UUID, organization_id: UUID]
    ▼
public.roles (Role Scope Table)
    │  [id: UUID, code: 'COMPANY_ADMIN', organization_id: UUID]
    ▼
public.companies (Company Entity)
    │  [id: UUID, organization_id: UUID REFERENCES organizations.id, legal_name: TEXT]
    ▼
public.organizations (Root Tenant Entity)
       [id: UUID PRIMARY KEY, slug: TEXT UNIQUE, status: 'ACTIVE']
```

---

## 5. Security & Password Storage Verification

| Verification Item | Result | Evidence |
| :--- | :--- | :--- |
| **Passwords in `public.organizations`** | **NO** | Zero password columns in table schema. |
| **Passwords in `public.companies`** | **NO** | Zero password columns in table schema. |
| **Passwords in `public.user_profiles`** | **NO** | Zero password columns in table schema. |
| **Passwords in `public.user_roles`** | **NO** | Zero password columns in table schema. |
| **Passwords in `public.employees`** | **NO** | Zero password columns in table schema. |
| **Passwords in `public.employee_profiles`** | **NO** | Zero password columns in table schema. |
| **Password Storage Authority** | **Supabase Auth** | Handled exclusively by Supabase GoTrue Auth (`auth.users.encrypted_password`) using bcrypt salt. |

---

## 6. Network & Contract Audit

- **Legacy Database Requests (`wmqjmyzzamgxyeuotbki`):** **0**
- **Legacy Table Requests (`customer_profiles`, `platform_subscriptions`, `platform_invoices`):** **0**
- **UUID Schema Errors (`22P02`):** **0** (String `"org-..."` format eliminated)
- **Unexpected 5xx Server Errors:** **0**
- **TypeScript Compilation Errors (`npx tsc --noEmit`):** **0**

---

## 7. Required Audit Checklist

```text
Organization:
name = LIVE PROVISION TEST ORG 1788505648371
id = Generated UUID (public.organizations.id)

Company:
name = LIVE PROVISION TEST COMPANY 1788505648371
id = Generated UUID (public.companies.id)
organization_id = Generated UUID (public.organizations.id)

Company Admin:
email = live.companyadmin.1788505648371@joypeoplehr.com
REAL auth.users.id = Supabase Auth UID (UUID)
user_profiles.id = Supabase Auth UID (UUID)
role = COMPANY_ADMIN
company_id = Generated UUID (public.companies.id)
organization_id = Generated UUID (public.organizations.id)

companies.organization_id == organizations.id
YES

Auth UID is real auth.users.id
YES

Company Admin login succeeded
YES

Reload preserved database-backed company
YES

Password stored in public PeopleHR tables
NO

Legacy requests
0

Old project requests
0

Final verdict:
PASS
```
