# JOY PEOPLEHR — PHASE 11 CANONICAL SQL BACKEND ARCHITECTURE & DATABASE GOVERNANCE BLUEPRINT

**Document Authority:** Permanent Database Constitution & Domain Blueprint  
**Subordinate To:** `docs/architecture/ENTERPRISE_SAAS_ARCHITECTURE_BASELINE.md`  
**Target Backend:** Canonical Supabase PostgreSQL (`https://wmqjmyzzamgxyeuotbki.supabase.co`)  
**Status:** **ACTIVE CANONICAL SPECIFICATION**  
**Core Principle:** **Canonicalization does not mean minimizing table count. Canonicalization means establishing ONE authoritative owner for each business concept, ONE authoritative relationship model, ONE tenant ownership standard, and ONE governed lifecycle for legacy compatibility.**

---

## 1. The 11 Canonical SQL Domains

```
JOY PEOPLEHR SUPABASE POSTGRESQL
│
├── 01. PLATFORM & IDENTITY
│   ├── organizations               (Tenant Root Authority)
│   ├── organization_settings       (Tenant Configuration Flags)
│   ├── app_users                   (Unified Identity Accounts)
│   ├── roles                       (RBAC Role Master)
│   ├── permissions                 (Granular Access Matrix)
│   ├── user_roles                  (User-to-Role Bindings)
│   └── audit_logs                  (Immutable System Security Audit Trail)
│
├── 02. ORGANIZATION & CORE HR
│   ├── employees                   (Master Employee System of Record)
│   ├── employee_profiles           (Extended Personal & Demographics)
│   ├── departments                 (Hierarchical Business Units)
│   ├── designations                (Job Titles & Levels)
│   ├── locations                   (Geographic Sites & Facilities)
│   ├── branches                    (Branch Entities & Office Numbers)
│   ├── shifts                      (Shift Master & Timing Definitions)
│   └── reporting_relationships     (Management Tree & Org Hierarchy)
│
├── 03. EMPLOYMENT & COMPENSATION
│   ├── employment_contracts        (Offer & Terms of Employment)
│   ├── employee_salary_structures  (Assigned Salary Breakdowns)
│   ├── salary_components           (Statutory & Custom Earnings/Deductions)
│   ├── employee_bank_accounts      (Disbursement Bank Metadata)
│   └── employee_statutory_profiles (PF UAN, ESIC, PAN, Aadhaar)
│
├── 04. ATTENDANCE ENGINE
│   ├── attendance_devices          (Biometric Terminal Network)
│   ├── attendance_events           ← IMMUTABLE (Raw Biometric & Mobile Punch Logs)
│   ├── attendance_daily            (Daily Aggregated Working Minutes Projection)
│   ├── attendance_regularizations  (Exception & Punch Correction Workflow)
│   ├── shift_assignments           (Rostering & Employee Schedule Map)
│   └── attendance_sync_jobs        (Offline Device Batch Ingestion Log)
│
├── 05. LEAVE ENGINE
│   ├── leave_types                 (Leave Categories: Casual, Sick, Earned)
│   ├── leave_policies              (Accrual, Carry-Forward & Proration Rules)
│   ├── employee_leave_entitlements (Annual Balances & Quotas)
│   ├── leave_requests              (Application & Approval State Machine)
│   ├── leave_ledger_transactions   ← IMMUTABLE (Double-Entry Debit/Credit Ledger)
│   └── holiday_calendars           (Statutory & Company Holiday Schedules)
│
├── 06. PAYROLL ENGINE
│   ├── payroll_periods             (Monthly Pay Cycles & State Machine)
│   ├── payroll_runs                (Execution Instances & Batch Runs)
│   ├── payroll_entries             ← IMMUTABLE (Final Individual Employee Payslip Records)
│   ├── payroll_components          (Calculated Breakdown Line Items)
│   ├── statutory_configurations    (EPFO, ESIC, PT, TDS Slabs & Formulas)
│   ├── tax_declarations            (Employee Section 80C/80D Proofs)
│   └── disbursement_batches        (Bank NACH/NEFT Payout Packages)
│
├── 07. WORKFLOW & APPROVAL
│   ├── workflow_definitions        (Approval Matrix Rules: Leave, OT, Expense)
│   ├── workflow_instances          (Active Running Approval Requests)
│   ├── workflow_actions            ← IMMUTABLE (Historical Approval/Rejection Log)
│   └── approval_delegations        (Out-of-Office Approver Reassignments)
│
├── 08. DOCUMENT & COMPLIANCE
│   ├── employee_documents          (Vault Storage Metadata & Hashes)
│   ├── document_categories         (Identity, Contract, Education, Experience)
│   ├── compliance_requirements     (Statutory Document Checklist Rules)
│   └── compliance_records          (Audit Verification & Expiry Tracking)
│
├── 09. LMS & PERFORMANCE
│   ├── courses                     (Curriculum & Training Catalog)
│   ├── course_enrollments          (Employee Progress, Scores & Completion)
│   ├── performance_cycles          (Annual / Quarterly Review Cadence)
│   ├── performance_reviews         (Self, Manager & Peer Evaluations)
│   └── goals                       (OKRs, Objectives & Key Results)
│
├── 10. NOTIFICATION & COMMUNICATION
│   ├── notifications               (In-App Notification Dispatch Feed)
│   ├── notification_preferences    (Channel Opt-in / Opt-out Settings)
│   ├── email_events                (Outbound SMTP & Resend Delivery Log)
│   └── communication_logs          (Broadcast & Direct Employee Messages)
│
└── 11. PLATFORM OPERATIONS
    ├── integration_connections     (API Webhooks, ERP Connectors & Keys)
    ├── webhook_events              (Inbound & Outbound Payload Ledger)
    ├── background_jobs             (Async Job Processing & Queue Status)
    ├── idempotency_keys            (Duplicate Mutation Prevention Registry)
    └── system_events               (Platform Health & Diagnostic Telemetry)
```

---

## 2. The 5-Tier Object Classification Taxonomy

Every table across the 318 declared tables in the database is classified under this model:

| Classification | Meaning | Action Plan |
|:---:|---|---|
| 🟢 **Canonical** | Primary production authority for a core domain concept. | **Protect and evolve.** Strict RLS, type safety, performance indexing. |
| 🔵 **Active Supporting** | Actively queried by feature workflows or background services. | **Keep and document.** Maintain compatibility, add missing constraints. |
| 🟡 **Compatibility** | Transitional dual-key or historical bridge tables. | **Deprecate gradually.** Synchronized via non-destructive triggers (Migration 095). |
| 🟠 **Legacy Read-Only**| Historical table with read-only dependency. | **Freeze.** Disallow new schema mutations; maintain for reporting. |
| 🔴 **Orphan Candidate**| Zero verified repository dependencies (72 tables). | **Quarantine in Registry.** Never drop immediately. Logged in `legacy_object_registry`. |

```
               318 DECLARED SCHEMA TABLES
                           │
                           ▼
                    CLASSIFY EVERYTHING
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
🟢 Canonical          🔵 Active Supporting   🟡 Compatibility
(Protect & Evolve)    (Document & Maintain)  (Sync Triggers)
                           │
                           ├──────────────────────┐
                           ▼                      ▼
                     🟠 Legacy Read-Only    🔴 Orphan Candidates
                     (Freeze Operations)    (Quarantine in Registry)
                                                  │
                                                  ▼
                                            NO IMMEDIATE DROP
                                                  │
                                                  ▼
                                            Monitor Lifecycle
```

---

## 3. Permanent Tenant Ownership Standard

1. **Single Canonical Key:** Every new or migrated table must use:
   ```sql
   organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
   ```
2. **Strict RLS Policy Binding:** Every tenant table must enforce:
   ```sql
   ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "<table_name>_tenant_select" ON public.<table_name>
       FOR SELECT TO authenticated 
       USING (organization_id = public.current_org_id() OR public.is_platform_admin());

   CREATE POLICY "<table_name>_tenant_insert" ON public.<table_name>
       FOR INSERT TO authenticated 
       WITH CHECK (organization_id = public.current_org_id() OR public.is_platform_admin());

   CREATE POLICY "<table_name>_tenant_update" ON public.<table_name>
       FOR UPDATE TO authenticated 
       USING (organization_id = public.current_org_id() OR public.is_platform_admin())
       WITH CHECK (organization_id = public.current_org_id() OR public.is_platform_admin());

   CREATE POLICY "<table_name>_tenant_delete" ON public.<table_name>
       FOR DELETE TO authenticated 
       USING (organization_id = public.current_org_id() OR public.is_platform_admin());
   ```
3. **Universal Open Policies Prohibited:** `USING (true)` and `WITH CHECK (true)` are permanently prohibited on tenant-owned business data.

---

## 4. Append-Only Immutability Ledger Standards

The following entities are formally designated as **Immutable Historical Ledgers**:
- `public.attendance_events`
- `public.leave_ledger_transactions`
- `public.payroll_entries` (once payroll period is `LOCKED`)
- `public.workflow_actions`
- `public.audit_logs`

**Governance Rules for Immutable Ledgers:**
1. Direct `UPDATE` and `DELETE` operations are blocked by RLS policies or database triggers.
2. Balance corrections must use compensating transactions (e.g. `Reversal`, `Adjustment`, `Grant`), never row modification.
3. Timestamp columns are strictly `TIMESTAMPTZ NOT NULL DEFAULT now()`. The column `updated_at` is omitted as architecturally invalid for immutable event records.

---

## 5. Pass 2 Multi-Stage Execution Architecture

Phase 11 Pass 2 executes through 6 disciplined, non-destructive sub-stages:

```text
PASS 2.1 — SECURITY INTEGRITY (Completed in Migration 094)
├── Remediate auxiliary table RLS gaps
├── Enforce tenant scoping on delete policies
└── Audit SECURITY DEFINER search_paths

PASS 2.2 — REFERENTIAL INTEGRITY (Partially in Migration 096)
├── Verify foreign key consistency across the 11 domains
├── Validate cascade rules (RESTRICT on financial records)
└── Prevent orphan records

PASS 2.3 — TENANT NORMALIZATION (Completed in Migration 095)
├── Bidirectional sync trigger sync_tenant_and_org_id()
├── Zero breaking renames on legacy tenant_id
└── Progressive dual-key consolidation roadmap

PASS 2.4 — DATA INTEGRITY (Completed in Migration 096)
├── Date sanity CHECK constraints (leave_requests, payroll_periods)
├── UUID v4 primary key standard
└── Default now() on created_at

PASS 2.5 — PERFORMANCE (Completed in Migration 097)
├── Targeted composite indexes for priority query paths
├── Non-blocking CONCURRENT execution
└── Avoid index bloat

PASS 2.6 — LEGACY GOVERNANCE (Completed in Migration 098)
├── Deploy public.legacy_object_registry
├── Quarantine 72 orphan candidates safely
└── Enforce deprecation review timeline (drop_after_version)
```

---

## 6. Target Schema Contract & Sign-Off

- **Baseline Status:** Certified Production Operational
- **Database Evolution Mode:** Controlled Forward-Only
- **Destructive Drops Authorized:** **0 (None)**
