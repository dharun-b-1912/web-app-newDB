# JOY PeopleHR — Platform Provisioning Forensic Audit Report

**Audit Date:** September 4, 2026  
**Target Supabase Backend:** `https://ysiajemrqakfngasehhi.supabase.co` (`ysiajemrqakfngasehhi`)  
**Investigation Mode:** Strictly Read-Only Forensic Evidence Analysis  
**Decommissioned Legacy URL:** `wmqjmyzzamgxyeuotbki` (0 occurrences)  

---

## 1. Database State: Verified Row Counts & Company Search

Direct, un-cached queries to the canonical Supabase project returned the following actual facts:

| Canonical Table | Live `COUNT(*)` | Query Status |
| :--- | :--- | :--- |
| `public.organizations` | **0** | Table exists, 0 records |
| `public.companies` | **0** | Table exists, 0 records |
| `public.saas_subscriptions` | **0** | Table exists, 0 records |
| `public.roles` | **0** | Table exists, 0 records |
| `public.user_profiles` | **0** | Table exists, 0 records |
| `public.user_roles` | **0** | Table exists, 0 records |

### Search for Target Provisioning Records:

- `SELECT * FROM public.organizations WHERE legal_name ILIKE '%LIVE PROVISION TEST ORG 1788505648371%'`:
  - **Result:** `[]` (0 rows found)
  - **Exists in Database:** **NO**

- `SELECT * FROM public.companies WHERE legal_name ILIKE '%LIVE PROVISION TEST COMPANY 1788505648371%'`:
  - **Result:** `[]` (0 rows found)
  - **Exists in Database:** **NO**

---

## 2. Forensic Trace: Why the Database Remains Empty

The forensic investigation identified the exact breakdown chain that prevented the organization from persisting into PostgreSQL:

```
[Platform Admin UI / ProvisionCustomerModal]
                    │
                    ▼
[platformProvisioningEngine.provisionCustomer()]
                    │
                    ▼
Sends POST request to Supabase REST:
https://ysiajemrqakfngasehhi.supabase.co/rest/v1/organizations
                    │
                    ▼
[PostgreSQL Row Level Security (RLS) Evaluation]
Policy: "organizations_tenant_insert" ON public.organizations FOR INSERT TO authenticated
Condition: WITH CHECK (id::text = public.current_org_id() OR public.is_platform_admin())
                    │
                    ├─► Client Session Status: "anon" (Unauthenticated Client)
                    │   No Supabase GoTrue Auth JWT present in request header
                    │
                    ▼
[PostgreSQL Rejects Request]
Error Code: 42501
Message: "new row violates row-level security policy for table 'organizations'"
                    │
                    ▼
[UI / Service In-Memory Fallback]
platformTenantService.organizationDb.unshift(newOrg)
Record saved in browser memory / localStorage
UI renders company from memory while PostgreSQL table has 0 rows
```

---

## 3. Exact Authentication Context During Provisioning Attempt

1. **Authentication State:** `authenticated = NO` (Client is executing requests with `anon` publishable key `sb_publishable_i_pb_...`).
2. **`auth.uid()`:** `NULL` (No active GoTrue JWT session on the Supabase client).
3. **`auth.role()`:** `anon` (PostgreSQL evaluates policies under the unauthenticated role).
4. **`public.is_platform_admin()`:** Evaluates to `FALSE` because `auth.jwt()` is null.
5. **PostgreSQL Error Code:** `42501` (`new row violates row-level security policy for table "organizations"`).

---

## 4. Local-State Fallback Audit

- **`platformTenantService.ts`:**
  Maintains an in-memory array `let organizationDb: OrganizationRecord[] = [];`.
  When an organization is provisioned, `organizationDb.unshift(newOrg)` adds the record to memory regardless of whether the Supabase insert succeeds or fails.
- **`ProvisionCustomerModal.tsx`:**
  Reflects organizations populated in `organizationDb`, causing the frontend UI to display newly created companies even when the underlying PostgreSQL database rejected the insert.

---

## 5. Summary Matrix

```text
Database Organizations Count:
0

Database Companies Count:
0

LIVE PROVISION TEST ORG 1788505648371 exists:
NO

LIVE PROVISION TEST COMPANY 1788505648371 exists:
NO

Supabase REST Request Sent:
YES (POST /rest/v1/organizations)

PostgreSQL Response:
ERROR 42501: new row violates row-level security policy for table "organizations"

Reason:
Request sent under "anon" role without authenticated Super Admin GoTrue JWT

Local-State Fallback Active:
YES (platformTenantService.organizationDb in-memory array)

Legacy Table Requests:
0 (Purged from active provisioning path)

Old Supabase Project Requests:
0 (Purged from active provisioning path)
```

---

## 6. Final Verdict

```text
FINAL VERDICT:
DATABASE WRITE FAILED
```
*(Sub-verdict: LOCAL-STATE FALLBACK STILL ACTIVE)*
