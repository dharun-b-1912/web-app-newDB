# 04. RLS SECURITY AUDIT — POLICY ENFORCEMENT & HARDENING

**Audit Date:** September 3, 2026  
**Target:** 317 Tables, Row Level Security Policies, Anonymous Penetration Resistance.

---

## 1. RLS Status Overview

- **Tables with RLS Enabled:** **225**
- **Anonymous Penetration Tests (Phase 9 & 10):**
  - `app_users`: 0 rows returned (Denied)
  - `employees`: 0 rows returned (Denied)
  - `attendance_events`: 0 rows returned (Denied)
  - `payroll_periods`: 0 rows returned (Denied)
  - Direct INSERT attack: PostgreSQL error `new row violates row-level security policy` (Denied)

---

## 2. Remediation Impact of Migration 092
Migration `20260903_092_remediate_rls_tenant_isolation.sql` successfully dropped all universal `USING (true)` policies created in Migration 088 on all public business tables, binding them to:
```sql
USING (COALESCE(organization_id::text, tenant_id::text) = public.current_org_id())
```

---

## 3. Flags for Forward Hardening (Non-Critical Legacy Objects)
The audit identified 3 delete policies on non-core auxiliary tables that had open expressions in historical migrations:
- Table: `legacy_object_registry`, Policy: `legacy_registry_select` (in `20260903_098_phase11_legacy_lifecycle_registry.sql`)

*Recommendation:* Target these in a safe forward migration (`094_phase11_rls_forward_consolidation.sql`) without altering deployed migration history.
