# JOY PeopleHR — Target Database Architecture Blueprint
**Document Version:** 1.0.0-PROD  
**Database Project ID:** `ysiajemrqakfngasehhi` (Canonical Greenfield PostgreSQL 15 / Supabase)  
**Author:** Lead Database Architect & SaaS Systems Architect  
**Classification:** Engineering Specification & System Blueprint  

---

## 1. Executive Summary

JOY PeopleHR is evolving into an enterprise-grade, multi-tenant Human Resource Management System (HRMS) SaaS platform. The new target database architecture is designed from first principles as a **clean, greenfield database** that replaces the legacy schema iterations.

The target architecture enforces a strict physical and logical boundary:
$$\text{JOY Platform Control Plane} \longleftrightarrow \text{Enterprise Multi-Tenant HR Engine}$$

### Core Tenets of the Greenfield Architecture
1. **Single Canonical Tenant Key (`organization_id`)**: Every organization-owned entity directly or indirectly belongs to exactly one `organization_id` (UUID). The legacy duality between `tenant_id` and `organization_id` is completely abolished.
2. **Platform vs. Customer Separation**: SaaS subscription billing, platform staff, feature flag entitlements, and global audit logs reside in a designated **Platform Domain** and are never intermingled with customer employee HR records.
3. **Normalized Relational Integrity**: Employee records, compensation assignments, historical attendance punches, leave ledger debits, and payroll lines are fully normalized with strict foreign keys, eliminating JSONB bloat and denormalized string duplication.
4. **Immutable Transaction Ledgers**: Core financial and time-tracking entities (`attendance_punches`, `leave_ledger_entries`, `payroll_line_items`, and `audit_log_entries`) are append-only to ensure regulatory compliance and forensic auditability.
5. **Database-Level Row Level Security (RLS)**: Tenant data isolation is guaranteed at the PostgreSQL kernel level using Supabase JWT metadata and session-cached context helpers, ensuring zero cross-tenant data leakage even under compromised application code.

---

## 2. Multi-Tenant Architectural Model

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │               JOY PeopleHR SaaS Platform               │
                                  │           Supabase Project: ysiajemrqakfngasehhi       │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                ┌─────────────────────────────┴─────────────────────────────┐
                                │                                                           │
                                ▼                                                           ▼
            ┌──────────────────────────────────────┐                    ┌──────────────────────────────────────┐
            │       Platform Control Plane         │                    │     Customer Multi-Tenant Database    │
            │  - SaaS Plans & Feature Flags        │                    │  - Unified Normalized Schema         │
            │  - Subscriptions & Invoicing         │                    │  - Multi-Entity Corporate Tree       │
            │  - Platform Staff IAM & Audit        │                    │  - Strict organization_id RLS        │
            └──────────────────────────────────────┘                    └──────────────────┬───────────────────┘
                                                                                           │
                                             ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
                                             │                                                                                           │
                                             ▼                                                                                           ▼
                        ┌─────────────────────────────────────────┐                                                 ┌─────────────────────────────────────────┐
                        │      Organization A (Spear Digital)     │                                                 │ Organization B (Joy Corporate Solutions)│
                        │ organization_id: 8a1b2c3d-...           │                                                 │ organization_id: 9e8f7d6c-...           │
                        └────────────────────┬────────────────────┘                                                 └────────────────────┬────────────────────┘
                                             │                                                                                           │
                     ┌───────────────────────┼───────────────────────┐                                           ┌───────────────────────┼───────────────────────┐
                     │ 1:N                   │ 1:N                   │ 1:N                                       │ 1:N                   │ 1:N                   │ 1:N
                     ▼                       ▼                       ▼                                           ▼                       ▼                       ▼
            ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐                         ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
            │   Legal Entity  │     │   Departments   │     │  Vendors/Agency │                         │   Legal Entity  │     │   Departments   │     │  Vendors/Agency │
            │   (Companies)   │     │   & Locations   │     │    Contractors  │                         │   (Companies)   │     │   & Locations   │     │    Contractors  │
            └────────┬────────┘     └────────┬────────┘     └────────┬────────┘                         └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
                     │                       │                       │                                           │                       │                       │
                     └───────────────────────┼───────────────────────┘                                           └───────────────────────┼───────────────────────┘
                                             │
                                             ▼
                                ┌─────────────────────────┐
                                │        Employees        │
                                └────────────┬────────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
                     ▼                       ▼                       ▼
            ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
            │   Attendance    │     │      Leave      │     │     Payroll     │
            │  & Biometrics   │     │  Ledger System  │     │  Gross-to-Net   │
            └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Hierarchy & Structural Integrity
- **Platform Layer**: Governs global operations, pricing tiers, platform API keys, and system telemetry across all customer instances.
- **Organization (`organizations`)**: The root enterprise boundary. Each customer organization has an immutable UUID (`organization_id`).
- **Company / Legal Entity (`companies`)**: Organizations can operate multiple legal entities (e.g. Joy Corporate Solutions Pvt Ltd, Spear Digital Media LLC) for distinct tax registrations, statutory filings (PF/ESI/GSTIN), and corporate headquarters.
- **Branches & Work Locations (`branches`, `work_locations`)**: Physical offices and geofenced facilities tied to a specific legal entity.
- **Departments & Designations (`departments`, `designations`)**: Organizational structural hierarchy supporting parent-child department trees.
- **Employees (`employees`)**: Central workforce entity linked to organization, legal company, primary branch, department, and designation.

---

## 3. Greenfield Domain Architecture

The greenfield schema is partitioned into **16 cohesive domains**, encompassing 58 normalized tables:

```
[01. Platform & SaaS Control Plane] ──► Global plans, subscriptions, platform IAM, global audit
[02. Organization & Hierarchy]      ──► Organizations, legal entities, branches, departments, designations
[03. Identity & Access (IAM)]       ──► Auth user profiles, organization memberships, roles, permissions
[04. Workforce & Employee Core]     ──► Employees, profiles, statutory details, bank accounts, custom fields
[05. Employee Lifecycle & Moves]    ──► Onboarding, probation, promotions, department transfers, offboarding
[06. Time & Attendance Engine]      ──► Biometric devices, raw punches, daily attendance, regularizations
[07. Shift & Roster Management]     ──► Shifts, rotational policies, weekly schedules, employee shift mappings
[08. Leave & Absence Management]    ──► Leave types, balance allocations, requests, immutable ledger entries
[09. Universal Approvals Engine]    ──► Multi-tier approval workflows, dynamic steps, approval action audit
[10. Payroll & Compensation Core]   ──► Salary components, structures, assignments, monthly runs, line items
[11. Vendor & Manpower OS]          ──► Staffing agencies, contractual workers, purchase orders, agency billing
[12. Performance & Appraisals]      ──► Review cycles, OKRs, KPIs, 360 review submissions, ratings
[13. Learning & LMS]                ──► Course catalog, mandatory training assignments, certifications
[14. Documents & Digital Storage]   ──► Document metadata, versioning, verification requests, secure storage
[15. Employee Requests & Helpdesk]  ──► Service catalog, internal grievance/requests, ticket life cycles
[16. Platform Services & Outbox]    ──► Transactional notifications, webhook mesh, background job runner
```

---

## 4. Universal Database Conventions & Standards

To ensure zero ambiguity and absolute maintainability, all tables, columns, indexes, and constraints adhere to strict conventions:

| Architectural Element | Canonical Convention | Example / Rule |
| :--- | :--- | :--- |
| **Primary Keys** | `id UUID DEFAULT gen_random_uuid() PRIMARY KEY` | Every table uses native UUIDv4. No serial integers or composite PKs. |
| **Tenant Ownership** | `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Direct tenant tables MUST have indexed `organization_id`. |
| **Table Naming** | `lower_snake_case` plural nouns | `employees`, `attendance_records`, `leave_requests` |
| **Foreign Key Columns** | `<singular_target_table>_id` | `company_id`, `department_id`, `reporting_manager_id` |
| **Timestamps** | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` | UTC with timezone. Trigger `set_updated_at` on updates. |
| **Currency & Amounts** | `NUMERIC(15, 2)` | Precision 15, scale 2. Floating-point types (`FLOAT`, `REAL`) are strictly forbidden. |
| **Date & Time** | `DATE` for calendar dates, `TIME` for shift boundaries | `join_date DATE`, `start_time TIME WITHOUT TIME ZONE` |
| **Boolean Flags** | `is_<condition>` or `has_<property>` with `DEFAULT false/true` | `is_active BOOLEAN NOT NULL DEFAULT true` |
| **Status Fields** | `VARCHAR(32)` with explicit `CHECK (status IN (...))` | Enforces domain validation without complex schema migration locks. |
| **Index Naming** | `idx_<table_name>_<columns>` | `idx_employees_org_status`, `idx_attendance_emp_date` |
| **Foreign Key Naming**| `fk_<source_table>_<target_table>` | `fk_employees_departments` |
| **Unique Constraints**| `uq_<table_name>_<columns>` | `uq_employees_org_code` (Unique per organization) |

---

## 5. Entity Relationship Model (High-Level Conceptual)

```
                            ┌────────────────────────┐
                            │     organizations      │
                            └───────────┬────────────┘
                                        │ 1:N
                     ┌──────────────────┼──────────────────┐
                     │ 1:N              │ 1:N              │ 1:N
           ┌─────────▼─────────┐ ┌──────▼──────┐ ┌─────────▼─────────┐
           │     companies     │ │ departments │ │      vendors      │
           └─────────┬─────────┘ └──────┬──────┘ └─────────┬─────────┘
                     │ 1:N              │ 1:N              │ 1:N
           ┌─────────▼─────────┐        │                  │
           │     branches      │        │                  │
           └─────────┬─────────┘        │                  │
                     │ 1:N              │                  │
                     └──────────────────┼──────────────────┘
                                        │
                           ┌────────────▼────────────┐
                           │        employees        │
                           └────────────┬────────────┘
        ┌──────────────────┬────────────┼──────────────────┬──────────────────┐
        │ 1:1              │ 1:N        │ 1:N              │ 1:N              │ 1:N
 ┌──────▼──────┐    ┌──────▼──────┐ ┌───▼────────┐ ┌───────▼──────┐    ┌──────▼──────┐
 │  employee   │    │ attendance  │ │   leave    │ │   payroll    │    │  employee   │
 │  _profiles  │    │   _daily    │ │ _balances  │ │    _runs     │    │ _documents  │
 └─────────────┘    └──────┬──────┘ └───┬────────┘ └───────┬──────┘    └─────────────┘
                           │ 1:N        │ 1:N              │ 1:N
                    ┌──────▼──────┐ ┌───▼────────┐ ┌───────▼──────┐
                    │ attendance  │ │   leave    │ │   payroll    │
                    │   _punches  │ │  _ledger   │ │ _line_items  │
                    └─────────────┘ └────────────┘ └──────────────┘
```

---

## 6. Data Ownership & Storage Classification

Every target table is categorized into one of three distinct ownership tiers:

1. **Direct Organization Ownership**: Contains `organization_id` directly on the table. RLS evaluates `organization_id = (SELECT get_active_user_organization_id())`.
2. **Indirect Organization Ownership**: Child line items (e.g. `payroll_line_items`, `leave_ledger_entries`, `attendance_punches`) link to a parent entity that is scoped to `organization_id`. (For maximum performance and defense-in-depth, high-velocity child tables also denormalize `organization_id` as an immutable foreign key).
3. **Platform-Level Entities**: Tables that exist above customer tenants (e.g. `platform_plans`, `saas_subscriptions`, `platform_users`, `platform_audit_logs`). RLS restricts access exclusively to authenticated platform administrators.

---

## 7. Scalability & High-Velocity Data Strategy

1. **Attendance Punches**: High-frequency biometric hardware punches land in `attendance_punches` with composite indexes on `(organization_id, punch_time)` and `(employee_id, punch_time)`. A daily roll-up cron calculates `attendance_daily` summaries, preventing N+1 calculation scans during payroll processing.
2. **Leave Ledger**: Leave balances are not computed on-the-fly across years; instead, `leave_balances` maintains live snapshot counts while `leave_ledger_entries` provides an immutable append-only record of every credit, debit, encashment, and lapse.
3. **Payroll Line Items**: Monthly payroll batches generate point-in-time immutable compensation records in `payroll_line_items` so that future structural changes to salary components never alter historical payslip disbursements.
