# JOY PEOPLEHR — ENTERPRISE SAAS ARCHITECTURE BASELINE (CONSTITUTION)

**Status:** **FROZEN ARCHITECTURAL CONSTITUTION**  
**Release Version:** `v1.0.0-production-release`  
**Certified Commit:** `9830c3174c54fd615b0e91152174a5fb704f315c`  
**Backend:** Canonical Supabase Production (`https://wmqjmyzzamgxyeuotbki.supabase.co`)  
**Schema:** Migrations `001` through `093`  
**Security:** RLS Tenant Isolation via `public.current_org_id()`  
**Operational Status:** **PRODUCTION OPERATIONAL & CERTIFIED**  

---

## 1. Architectural Maturity & Classification Matrix

| Layer / Domain | Current Classification | Status Detail |
|:---|:---:|---|
| **Application Recovery** | ✅ **Complete** | Monolithic architectural fragmentation eliminated across Phases 1–10. |
| **Production Deployment** | ✅ **Operational** | Live, serving traffic with zero downtime and sub-second latencies. |
| **Authentication Baseline** | ✅ **Certified** | Substring role checking purged; JWT & `app_users` authoritative. |
| **RLS Boundary Baseline** | ✅ **Certified** | Universal `USING (true)` policies revoked; strict `current_org_id()` scoping. |
| **Core HR Persistence** | ✅ **Operational** | Reactive `useEmployees` hook with write-through Supabase sync. |
| **Attendance Architecture**| ✅ **Operational** | Immutable `attendance_events` auditing with auto-sync daily projections. |
| **Leave Double-Entry Ledger**| ✅ **Operational**| Append-only `leave_ledger_transactions` (grant, consumption, adjustment). |
| **Payroll Lifecycle** | ✅ **Operational** | Immutability lock state machine with Indian statutory formulas (PF, ESIC). |
| **Secret Isolation** | ✅ **Operational** | Frontend scrubbed of private keys; all dispatches via backend proxies. |
| **Mock Contamination** | ✅ **Governed** | Prohibited in production data paths; enforced by automated guards. |
| **Database Canonical Inventory**| 🟡 **Phase 11 Audited**| Pass 1 complete: 317 tables inventoried, 19 canonical, 118 active. |
| **Legacy Schema Register** | 🟡 **Phase 11 Audited**| Pass 1 complete: 71 orphan candidate tables safely cataloged. |
| **FK & Index Forensics** | 🟡 **Phase 11 Audited**| Pass 1 complete: 300 FKs and 557 indexes mapped and verified. |
| **Schema Consolidation** | 🟡 **Controlled Forward Evolution** | Pass 2 will implement targeted security, integrity, compatibility, and performance corrections through small forward-only migrations. No mass schema rewrite or destructive consolidation is authorized. Canonicalization does not mean minimizing table count. Canonicalization means establishing one authoritative owner for each business concept, one authoritative relationship model, one tenant ownership standard, and one governed lifecycle for legacy compatibility. |

---

## 2. The 5 Immutable Architectural Boundaries

```
1. DATABASE BOUNDARY
   Supabase PostgreSQL ──────► AUTHORITATIVE DATA (Zero Client-Side Source of Truth)

2. TENANT BOUNDARY
   organizations.id ─────────► organization_id ──► RLS ──► public.current_org_id()

3. APPLICATION BOUNDARY
   UI ──► Hook ──────────────► Service ────────► Repository ──► Supabase PostgREST

4. SECURITY BOUNDARY
   Browser (Anon Key Only)   Private Secrets ──► Edge Function / Server Proxy / Privileged

5. HISTORICAL DATA BOUNDARY
   Event ────────────────────► IMMUTABLE RECORD (Attendance, Leave, Payroll, Audit)
```

1. **Database Boundary:** Supabase PostgreSQL is the sole system of record. Client-side storage (`localStorage`, IndexedDB) is strictly an ephemeral read-through acceleration and offline-resilience layer.
2. **Tenant Boundary:** The single canonical SaaS ownership model is `organization_id UUID` bound to `public.current_org_id()`. Cross-tenant data leakage is physically blocked at the database engine level.
3. **Application Boundary:** UI components never query Supabase directly (`supabase.from()`). All access flows through Hooks, Services, and Repositories.
4. **Security Boundary:** Browser bundles never contain private API keys, service role credentials, or privileged access tokens. Privileged operations route through backend proxies.
5. **Historical Data Boundary:** Critical historical operations are recorded as immutable, append-only logs (`attendance_events`, `leave_ledger_transactions`, `payroll_entries`, `audit_logs`). Derived summaries may be updated, but history is never overwritten.

---

## 3. Mandatory 15-Step Feature Development Lifecycle

Every new feature or enhancement must strictly follow this sequential path:

```text
PRODUCT REQUIREMENT
        │
        ▼
DOMAIN DESIGN
        │
        ▼
DATABASE MODEL
        │
        ▼
MIGRATION (Forward-Only + Safety Guards)
        │
        ▼
RLS DESIGN (public.current_org_id())
        │
        ▼
INDEX & QUERY DESIGN
        │
        ▼
BACKEND CONTRACT / RPC / EDGE FUNCTION
        │
        ▼
REPOSITORY
        │
        ▼
SERVICE
(Async + Read-Through Cache + Explicit Failure States)
        │
        ▼
WEB / MOBILE UI
        │
        ▼
UNIT & INTEGRATION TESTS
        │
        ▼
DATABASE SECURITY TESTS
        │
        ▼
AUTOMATED GOVERNANCE GUARD
        │
        ▼
STAGING VALIDATION
        │
        ▼
CONTROLLED RELEASE
        │
        ▼
OBSERVABILITY
```

---

## 4. The 10 Canonical Architectural Anchors

### 1. Zero Synthetic Production Data
Production business flows must never silently substitute mock, seed, fixture, or fabricated records for unavailable backend data (`apiData || mockData` and `catch { return fakeData }` are strictly forbidden). Backend failures must produce explicit loading, retry, offline-queue, or error states.

### 2. Canonical Database Authority
Supabase PostgreSQL is the authoritative system of record. `localStorage`, `sessionStorage`, IndexedDB, React Query caches, and in-memory stores are acceleration or offline-resilience layers only. No client-side cache may silently become the source of truth.

### 3. Single Canonical Tenant Identifier
All new tenant-owned business tables must use `organization_id UUID` referencing the canonical `organizations(id)` table. Historical `tenant_id` usages are transitional and consolidated forward-only.

### 4. Strict Database-Enforced Tenant Isolation
Every tenant-owned table must enforce Row Level Security (`organization_id = public.current_org_id()`). Universal open policies (`USING (true)` / `WITH CHECK (true)`) are strictly prohibited for tenant-owned data.

### 5. Authoritative Identity and Role Resolution
Application roles must originate from authoritative identity data, JWT claims, or controlled `app_users` records. String matching (e.g. `email.includes("admin")` or `username.startsWith("manager")`) is permanently prohibited.

### 6. Server-Side Secret Isolation
Private credentials including service-role keys, email provider keys, payment keys, AI provider credentials, and biometric gateway secrets must never be exposed to browser bundles. Privileged operations must execute through controlled server-side endpoints or backend services.

### 7. Immutable Business Ledgers
Critical historical events must preserve append-only auditability (`attendance_events`, `leave_ledger_transactions`, `payroll_entries`, `audit_logs`, `workflow_events`). Derived balances may be recalculated, but historical transactions must remain traceable.

### 8. Database-First Feature Architecture
Every new business capability must begin with domain and database design before frontend implementation, following the mandatory 15-step development lifecycle.

### 9. Forward-Only Production Schema Evolution
Production migrations are immutable historical records. Never modify deployed migration history, patch schemas without migrations, or perform destructive rollbacks without backup validation. All corrections must use controlled forward migrations.

### 10. Production Verification Is Mandatory
No production release is authorized until all required automated architecture and verification gates pass.

---

## 5. Automated Quality Gate Enforcement Suite

> **The Single Authoritative Release Rule:**  
> `npm run verify:production` is the **single authoritative technical release eligibility command**. Individual underlying commands remain diagnostic tools but cannot independently authorize production deployment. Production release is strictly blocked unless `verify:production` exits with code 0.

| Quality Gate Command | Target & Scope | Enforcement Status |
|:---|:---|:---:|
| **`npm run verify:production`** | **Master Authoritative Pipeline: Executes all 9 validation stages & emits evidence artifact.** | **PASSED (GREEN / CODE 0)** |
| `npm run guard:governance` | Enforces 10 Canonical Anchors: blocks email role elevation, client secrets, and open RLS. | **PASSED (GREEN)** |
| `npm run audit:schema` | Migration consistency, table inventory, PK/timestamp standardization, orphan detection. | **PASSED (GREEN)** |
| `npm run audit:tenant` | `organization_id` canonical standard, active legacy `tenant_id`, dual-key compatibility. | **PASSED (GREEN)** |
| `npm run audit:rls` | RLS enablement audit, anonymous penetration defense, permissive policy detection. | **PASSED (GREEN)** |
| `npm run audit:database` | Foreign key integrity, composite index optimization, triggers, and immutable ledgers. | **PASSED (GREEN)** |
| `npm run typecheck` | Strict static TypeScript typecheck (`tsc --noEmit`). | **PASSED (0 Errors)** |
| `npm test` | Automated security suite (4/4) + 10 Production Reality Gates (10/10). | **PASSED (14/14)** |
| `npm run test:cutover` | Operational cutover smoke runner across 7 stages (8/8). | **PASSED (8/8)** |
| `npm run build` | Code-split production build with zero bundled secrets (1,702 kB main chunk). | **PASSED (10.4s)** |

---

## 6. Architecture Governance Sign-Off

- **Document Authority:** Frozen Architecture Constitution
- **Current Lifecycle:** Joy PeopleHR Product Evolution Program
- **Execution Mandate:** Read-Only Audit (Pass 1) Complete; Forward Migrations (Pass 2) strictly queued.
