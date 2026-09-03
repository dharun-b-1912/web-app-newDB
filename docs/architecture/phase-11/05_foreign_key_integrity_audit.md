# 05. FOREIGN KEY INTEGRITY AUDIT — RELATIONAL CONSTRAINTS

**Audit Scope:** 300 foreign key constraints across migrations 001–093.

---

## 1. Verified Key Relationships

| Parent Table | Child Table | Foreign Key Column | Action Rule | Integrity Status |
|:---|:---|:---|:---|:---:|
| `organizations` | `employees` | `organization_id` | CASCADE | **VERIFIED** |
| `organizations` | `departments` | `organization_id` | CASCADE | **VERIFIED** |
| `organizations` | `payroll_periods` | `organization_id` | RESTRICT | **VERIFIED** |
| `employees` | `attendance_events` | `employee_id` | RESTRICT | **VERIFIED** |
| `employees` | `attendance_daily` | `employee_id` | CASCADE | **VERIFIED** |
| `employees` | `leave_requests` | `employee_id` | CASCADE | **VERIFIED** |
| `employees` | `leave_ledger_transactions` | `employee_id` | RESTRICT | **VERIFIED** |
| `employees` | `employee_salary_assignments` | `employee_id` | CASCADE | **VERIFIED** |
| `employees` | `lms_enrollments` | `employee_id` | CASCADE | **VERIFIED** |
| `employees` | `performance_goals` | `employee_id` | CASCADE | **VERIFIED** |

---

## 2. Integrity Principle: No Blind Constraint Additions
Per Phase 11 safety rules, no foreign key constraints should be introduced to historical orphan candidate tables without preflight integrity verification to prevent downtime or insert blockage.
