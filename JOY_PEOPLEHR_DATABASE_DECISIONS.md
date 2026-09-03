# JOY PeopleHR — Architectural Decisions Requiring Approval
**Document Version:** 1.0.0-PROD  
**Database Project ID:** `ysiajemrqakfngasehhi` (Greenfield Target Database)  
**Phase:** Phase 1 Design Review  

---

## 1. Executive Decision Summary

Before advancing to database creation or migration script authoring in Phase 2, the following **8 fundamental architectural decisions** are presented for your formal review and approval.

---

## 2. Key Architectural Decisions

### Decision 1: Organization vs. Legal Entity Multi-Tier Hierarchy
- **Proposal**: Standardize on a two-tier organizational hierarchy:
  - `organizations`: Represents the enterprise group / tenant boundary (e.g. Joy Corporate Solutions Group, Spear Digital). This is the canonical RLS tenant key (`organization_id`).
  - `companies`: Represents individual registered legal corporate entities within an organization that hold discrete tax IDs (CIN, PAN, GSTIN, PF/ESI codes).
  - `branches` & `work_locations`: Physical offices and GPS geofences belonging to a company.
- **Trade-off Analysis**: Allows large enterprises with multiple subsidiaries to run consolidated HR operations while maintaining strict tax and legal entity boundaries for payroll.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 2: Employee Entity Normalization vs. JSONB Storage
- **Proposal**: Fully normalize the employee domain by separating personal background, residential addresses, bank accounts, and statutory tax numbers into dedicated child tables (`employee_profiles`, `employee_addresses`, `employee_bank_details`, `employee_statutory_details`) rather than storing them in a single unvalidated JSONB column.
- **Trade-off Analysis**:
  - *Pros*: Strict data types, indexing on PAN/Aadhaar/Bank accounts, precise column-level updates, atomic validation triggers.
  - *Cons*: Requires relational joins or views during complex workforce exports (mitigated by indexed foreign keys).
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 3: High-Velocity Raw Punch Stream vs. Processed Daily Attendance
- **Proposal**: Split attendance into two distinct layers:
  1. `attendance_punches`: High-velocity, append-only raw punch events from biometric machines (eSSL/ZKTeco), mobile GPS, and face apps.
  2. `attendance_daily`: Processed daily attendance rollup (first punch, last punch, work hours, overtime, late arrival, payable status) calculated by an automated background worker.
- **Trade-off Analysis**: Guarantees forensic auditability of raw biometric data while keeping payroll calculation queries instantaneous without re-scanning millions of raw punch timestamps.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 4: Financial-Grade Leave Accounting via Double-Entry Ledger
- **Proposal**: Adopt a financial ledger approach to leave management:
  - `leave_balances`: Live cache snapshot table for rapid UI rendering of available days.
  - `leave_ledger_entries`: Append-only, immutable transaction ledger recording every single credit (monthly accrual), debit (approved leave), encashment, or lapse with exact timestamp and reference.
- **Trade-off Analysis**: Prevents balance discrepancies, enables full retroactive auditing of leave accruals, and matches enterprise ERP accounting standards.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 5: Point-in-Time Immutable Payroll Snapshots
- **Proposal**: When a monthly payroll batch is finalized in `payroll_runs`, the computed salary breakdown, statutory contributions (PF, ESI, PT), and deductions are locked permanently inside `payroll_line_items`. Future changes to an employee's salary structure will never alter historical payslips.
- **Trade-off Analysis**: Eliminates statutory compliance risk and ensures historical payroll records remain legally audit-proof.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 6: Application IAM & Multi-Role Architecture
- **Proposal**: Decouple Supabase Auth from application role management by using `user_profiles`, `roles`, `permissions`, and `user_roles` join tables. A user can hold different roles across different companies or modules (e.g. Employee in Company A, Manager in Department B).
- **Trade-off Analysis**: Supports custom role definitions per enterprise without requiring Supabase auth schema modifications.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 7: Vendor & Contractual Manpower OS Integration
- **Proposal**: Integrate third-party staffing agency governance natively into the database via `vendors`, `vendor_workers`, and `vendor_invoices`. Contractual workers share the same attendance punch engine as permanent employees but remain segregated from internal corporate payroll runs.
- **Trade-off Analysis**: Gives enterprise clients complete visibility over contract labor compliance (PF/ESI proof verification) and invoice approvals.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

### Decision 8: Unified Universal Approvals Engine
- **Proposal**: Use a standardized approval state machine (`approval_workflows`, `approval_instances`, `approval_actions`) across Leave, Attendance Regularizations, Expense Claims, and Resignations, rather than building custom approval columns in every table.
- **Trade-off Analysis**: Centralizes multi-tier approval delegation (Manager $\rightarrow$ HR Head $\rightarrow$ Finance) in a single engine while keeping notification and escalation logic DRY.
- **Status**: `[RECOMMENDED / PENDING APPROVAL]`

---

## 3. Approval Sign-Off Request

Please review the above 8 architectural decisions. Once you provide feedback or confirmation on these decisions, we will be ready to proceed to **Phase 2 (Migration Script Authoring & Clean Schema Initialization on Project `ysiajemrqakfngasehhi`)**.
