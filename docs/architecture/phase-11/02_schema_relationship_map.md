# 02. SCHEMA RELATIONSHIP MAP — ACTUAL DATABASE ARCHITECTURE

**Audit Scope:** Real foreign key dependencies, references, and parent-child hierarchies derived from SQL AST inspection.

---

## 1. Actual System Topology

```mermaid
erDiagram
    organizations ||--o{ app_users : "tenant membership"
    organizations ||--o{ employees : "employs"
    organizations ||--o{ departments : "contains"
    organizations ||--o{ locations : "operates"
    organizations ||--o{ shifts : "schedules"
    organizations ||--o{ leave_types : "configures"
    organizations ||--o{ salary_components : "defines"
    organizations ||--o{ payroll_periods : "manages"

    employees ||--o{ attendance_events : "punches"
    employees ||--o{ attendance_daily : "aggregates"
    employees ||--o{ leave_requests : "submits"
    employees ||--o{ leave_ledger_transactions : "mutates balance"
    employees ||--o{ employee_salary_assignments : "assigned"
    employees ||--o{ lms_enrollments : "enrolls"
    employees ||--o{ performance_goals : "tracks"

    payroll_periods ||--o{ payroll_runs : "contains"
    payroll_runs ||--o{ disbursement_batches : "disburses"
```

---

## 2. Foreign Key Constraint Summary

- **Total Foreign Key Constraints Declared:** 300
- **Parent Keys:**
  - `organizations(id)`: 96 explicit child tables
  - `employees(id)`: 42 explicit child tables
  - `departments(id)`: 8 explicit child tables
  - `payroll_periods(id)`: 4 explicit child tables
- **Cascade Rules:** Majority use `ON DELETE CASCADE` or `ON DELETE RESTRICT` on master tenants.
