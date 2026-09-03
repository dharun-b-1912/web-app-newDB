# 06. INDEX PERFORMANCE AUDIT — QUERY ACCELERATION & SCALABILITY

**Audit Scope:** 557 indexes declared across migrations 001–093.

---

## 1. Critical Index Surface

| Table Name | Primary Index | Tenant Filter Index | Composite & Date Indexes |
|:---|:---|:---|:---|
| `employees` | `employees_pkey` | `idx_employees_org_id` | `idx_employees_work_email`, `idx_employees_status` |
| `attendance_events` | `attendance_events_pkey` | `idx_att_events_org` | `idx_att_events_emp_time` (`employee_id`, `timestamp` DESC) |
| `attendance_daily` | `attendance_daily_pkey` | `idx_att_daily_org` | `idx_att_daily_emp_date` (`employee_id`, `date`) |
| `leave_requests` | `leave_requests_pkey` | `idx_leave_req_org` | `idx_leave_req_emp_status` |
| `leave_ledger_transactions`| `leave_ledger_pkey` | `idx_leave_ledger_org` | `idx_leave_ledger_emp_created` |
| `payroll_periods` | `payroll_periods_pkey` | `idx_payroll_periods_org`| `idx_payroll_periods_dates` |

---

## 2. Duplicate & Overlapping Index Analysis
Previous migrations (notably `086_fix_duplicate_indexes_and_billing_mesh_rls.sql` and `087_add_missing_foreign_key_indexes.sql`) remediated major index redundancy. 
No high-priority missing indexes on hot production paths were identified.
