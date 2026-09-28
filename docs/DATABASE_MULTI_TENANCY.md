# JOY PeopleHR — Database Multi-Tenancy Architecture

## 1. Executive Summary
JOY PeopleHR implements a strict, normalized **Organization-First Multi-Tenant Architecture** in PostgreSQL and Supabase. The hierarchy ensures complete data isolation across organizations while supporting granular sub-entities:

$$\text{Organization} \longrightarrow \text{Company / Legal Entity} \longrightarrow \text{Branch / Site} \longrightarrow \text{Device} \longrightarrow \text{Attendance Rules} \longrightarrow \text{Employees}$$

No attendance record, biometric punch, device credential, rule condition, or audit log belonging to Organization A is ever accessible to or evaluated against Organization B.

---

## 2. Relational Entity Hierarchy

| Entity | Primary Key | Foreign Key | Tenant Scope | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`organizations`** | `id` (`TEXT`) | Root Tenant | Self | The top-level enterprise boundary (e.g., `org-joy-01`). |
| **`companies`** | `id` (`TEXT`) | `organization_id` | Organization | Authoritative legal entities within an organization. |
| **`branches`** | `id` (`TEXT`) | `company_id` | Company / Org | Physical sites, factories, or offices. |
| **`biometric_connectors`** | `id` (`TEXT`) | `organization_id`, `branch_id` | Branch / Org | Edge gateway running the JOY Attendance Connector daemon. |
| **`biometric_devices`** | `id` (`TEXT`) | `organization_id`, `company_id`, `branch_id` | Branch / Org | Physical hardware terminal (e.g. eSSL AI-FACE MAGNUM). |
| **`attendance_rules`** | `id` (`UUID`) | `organization_id`, `company_id`, `branch_id` | Organization | Deterministic policy defining grace, shifts, breaks, and overtime. |
| **`attendance_rule_versions`**| `id` (`UUID`) | `rule_id`, `organization_id` | Organization | Immutable version snapshot for auditability. |
| **`attendance_rule_exceptions`**| `id` (`UUID`) | `organization_id`, `company_id`, `employee_id` | Employee / Org | Level 1 priority exemptions for specific employees. |
| **`attendance_rule_executions`**| `id` (`UUID`) | `organization_id`, `employee_id`, `rule_id` | Organization | Audit ledger recording every deterministic rule evaluation. |
| **`attendance_rule_audit_logs`**| `id` (`UUID`) | `organization_id`, `rule_id` | Organization | Immutable mutation history of rule additions, edits, and archives. |

---

## 3. Row-Level Security (RLS) Enforcement

All attendance and device tables enforce PostgreSQL Row-Level Security (RLS). Access policies evaluate tenant boundaries through:

```sql
CREATE POLICY att_rules_tenant_isolation ON public.attendance_rules
    FOR ALL
    USING (public.check_user_organization_access(organization_id))
    WITH CHECK (public.check_user_organization_access(organization_id));
```

The helper function `public.check_user_organization_access(target_org_id)` verifies:
1. **Service Role / Internal Jobs:** Full internal execution for automated cron routines and backend sync.
2. **Platform Super Admins:** Multi-tenant maintenance access via `app_metadata.is_platform_admin`.
3. **Tenant Users:** Strict validation against `public.organization_memberships` ensuring the user has an active membership in the target organization.

---

## 4. Frontend Organization Context Binding

The frontend web application never relies on client-side authority:
1. The authoritative active tenant is resolved from the server-side JWT session via [`organizationContextService.resolveUserContext(user)`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/organizationContextService.ts).
2. Switching organizations via the UI emits an event on [`hrEventBus`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/hrEventBus.ts) (`employee.updated`), causing all views (including [`AttendanceRulesView`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/features/attendance/subviews/AttendanceRulesView.tsx)) to dynamically re-query the target organization's dataset **without a full-page reload (`window.location.reload()`)**.
