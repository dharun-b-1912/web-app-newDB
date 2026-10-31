# JOY PeopleHR — Module 03: People / Employee Lifecycle Reality Reconciliation Report
**Authoritative Architectural Audit & Baseline Invariants**
**Date:** September 8, 2026 | **Scope:** People Core Domain, Identity Mapping, Hierarchy & Lifecycle

---

## 1. Executive Summary

The **People / Employee Domain** is the fundamental aggregate root of the entire JOY PeopleHR enterprise platform. An exhaustive audit of the PostgreSQL schema revealed that **41 foreign-key tables directly reference `employees(id)`**, spanning Attendance, Leave, Payroll, Assets, Documents, Recruitment, Biometrics, Approvals, and Offboarding/FnF.

Therefore, People Core cannot be treated as a simple CRUD screen. It must serve as the authoritative owner of:
1. **Employee Identity** (`user_profiles` $\leftrightarrow$ `employees` $\leftrightarrow$ Supabase Auth).
2. **Employment Lifecycle State Transitions** (`DRAFT` $\to$ `ONBOARDING` $\to$ `PROBATION` $\to$ `CONFIRMED` $\to$ `NOTICE_PERIOD` $\to$ `EXITED` / `TERMINATED` $\to$ `REHIRED`).
3. **Hierarchy & Reporting Integrity** (Directed Acyclic Graph with cycle prevention).
4. **Departmental & Positional Transfers / Promotions** (Auditable lifecycle event streams).
5. **Historical Immutability & Soft-Delete Preservation** (Zero hard deletes of historical employees).

---

## 2. Canonical Reality Audit: Database vs Codebase

### A. Live Supabase Columns vs Client Types
| Table | Live Columns in Supabase | Application Client Representation (`src/types/index.ts`) | Reconciliation Finding / Gap |
| :--- | :--- | :--- | :--- |
| **`employees`** | `id`, `organization_id`, `company_id`, `branch_id`, `department_id`, `designation_id`, `user_id`, `employee_code`, `first_name`, `last_name`, `middle_name`, `display_name`, `work_email`, `personal_email`, `phone`, `avatar_url`, `employment_status`, `employment_type`, `confirmation_date`, `reporting_manager_id`, `deleted_at`, `created_at`, `updated_at`. | `status` (frontend) vs `employment_status` (DB). `bank` and `statutory` objects in TS type are normalized in separate tables in DB. | **Resolution:** Map `employment_status` $\leftrightarrow$ `status` bidirectionally. Store bank & statutory details in `employee_bank_details` and `employee_statutory_details`. Preserve `deleted_at` for soft deletes. |
| **`user_profiles`** | `id`, `organization_id`, `auth_user_id`, `employee_id`, `email`, `avatar_url`, `phone`, `status`, `created_at`, `updated_at`. | User profile linked to employee and auth user. | **Resolution:** Ensure 1:1 identity consistency. When employee is exited or suspended, `user_profiles.status` transitions to `INACTIVE`. |
| **`employee_lifecycle_events`** | `id`, `organization_id`, `employee_id`, `event_type`, `effective_date`, `remarks`, `created_by`, `created_at`. | `LifecycleHistoryItem` stored in `employment.history` JSON blob. | **Resolution:** Establish `employee_lifecycle_events` as the server-authoritative append-only ledger for all status changes, promotions, transfers, and exits. |
| **`departments`** | `id`, `organization_id`, `company_id`, `name`, `code`, `parent_department_id`, `head_employee_id`, `is_active`, `created_at`, `updated_at`. | `Department` interface. | **Resolution:** Verify departmental transfers ensure `department_id` belongs to the same `organization_id`. |
| **`designations`** | `id`, `organization_id`, `company_id`, `title`, `code`, `grade`, `created_at`, `updated_at`. | `Designation` interface. | **Resolution:** Verify promotions ensure `designation_id` belongs to the same `organization_id`. |

### B. Foreign Key Consumers of `employees(id)` (41 Identified Tables)
1. `attendance_daily`
2. `attendance_events`
3. `leave_entitlements`
4. `leave_requests`
5. `employee_requests`
6. `employee_statutory_details`
7. `employee_bank_accounts`
8. `employee_family_nominees`
9. `employee_emergency_contacts`
10. `employee_documents`
11. `employee_profile_change_requests`
12. `vendor_employee_assignments`
13. `employee_onboardings`
14. `onboarding_policy_acknowledgements`
15. `employee_separations`
16. `exit_interviews`
17. `separation_fnf_readiness`
18. `separation_audit_logs`
19. `assets`
20. `employee_reporting_relationships`
21. `vendor_deployments`
22. `requisitions`
23. `requisition_approvals`
24. `job_openings`
25. `candidates`
26. `interviews`
27. `interview_scorecards`
28. `offers`
29. `offer_approvals`
30. `biometric_raw_punches`
31. `biometric_pin_mappings`
32. `biometric_user_identities`
33. `attendance_intervals`
34. `attendance_daily_summaries`
35. `employee_avatar_assets`
36. `workforce_identity_aliases`
37. `employee_work_location_assignments`
38. `fnf_settlements`
39. `payroll_input_snapshots`
40. `payroll_adjustments`
41. `overtime_records`

---

## 3. Critical Architectural Vulnerabilities Identified

### 🚨 Vulnerability 1: Catastrophic Hard-Delete Risk
- **Finding:** In `src/services/api.ts` line 1577: `await supabase.from('employees').delete().eq('id', id);`
- **Impact:** Any attempt to hard-delete an employee with payroll, attendance, leave, or FnF records either crashes with a foreign key constraint violation (`ON DELETE RESTRICT`) or cascades and destroys audited corporate records.
- **Remediation:** Strictly prohibit hard-deleting employees who possess historical records. Enforce **Soft Delete** (`deleted_at = now()`, `employment_status = 'ARCHIVED'`).

### 🚨 Vulnerability 2: Reporting Hierarchy Cycles & Self-Reporting
- **Finding:** Currently, `reporting_manager_id` can be updated arbitrarily without cycle detection.
- **Impact:** An employee could be set as their own manager ($A \to A$) or a circular loop can be formed ($A \to B \to C \to A$), leading to infinite loops in `reportingHierarchyService.ts` or broken approval routing in `unifiedApprovalEngine.ts`.
- **Remediation:** Implement Depth-First Search (DFS) cycle detection during manager assignment. Throw `HIERARCHY_CYCLE_DETECTED` if an employee is assigned to report to themselves or anyone in their reporting subtree.

### 🚨 Vulnerability 3: Client-Side Lifecycle Mutations & Unaudited State Jumps
- **Finding:** Components and services mutate `employee.status` directly via `api.updateEmployee` without state machine validation.
- **Impact:** An `Exited` employee can be silently flipped back to `Probation` or `Active`, bypassing rehire background checks, probation rules, and FnF settlement finality.
- **Remediation:** Create `employeeLifecycleEngine.ts` with a formal state machine:
  $$\text{Draft} \to \text{Onboarding} \to \text{Probation} \to \text{Confirmed} \to \text{Notice Period} \to \text{Exited}$$
  Disallow illegal transitions (e.g. `Exited` $\to$ `Probation` without formal `Rehire`).

### 🚨 Vulnerability 4: Unrecorded Employment Transfers & Promotions
- **Finding:** Changing an employee's department, designation, branch, or manager directly overwrites fields without an immutable audit record in `employee_lifecycle_events`.
- **Impact:** Loss of historical organizational trajectory (e.g. inability to calculate historical tenure per department, pay revision milestones, or transfer dates).
- **Remediation:** Implement `transferEmployee` and `promoteEmployee` methods that atomically update fields, append immutable records to `employee_lifecycle_events`, and emit domain events.

### 🚨 Vulnerability 5: Cross-Tenant References & Identity Bleed
- **Finding:** If an administrator assigns a `reporting_manager_id` or `department_id` belonging to a different tenant, cross-tenant leaks occur in approval queues.
- **Remediation:** Enforce strict multi-tenant validation: `manager.organization_id === employee.organization_id` and `department.organization_id === employee.organization_id`.

---

## 4. Module 03 Certified Invariants

1. **State Machine Invariant:** Every status change must follow authorized lifecycle paths. Terminal states (`EXITED`, `TERMINATED`) require a dedicated `REHIRE` action to reactivate.
2. **Soft-Delete Invariant:** Employees with historical records in any of the 41 dependent tables cannot be purged; their `deleted_at` timestamp is set and their status becomes `ARCHIVED`.
3. **DAG Hierarchy Invariant:** The reporting structure must remain a Directed Acyclic Graph. Self-reporting and circular reporting are strictly blocked.
4. **Append-Only Lifecycle Ledger:** Every change of status, department, designation, or manager generates an immutable entry in `employee_lifecycle_events`.
5. **Exited Employee Barrier:** Exited employees are blocked from new leave requests, attendance clock-ins, and future open payroll runs.
6. **Multi-Tenant Boundary:** All employee operations and relationships are strictly isolated within the tenant's `organization_id`.
