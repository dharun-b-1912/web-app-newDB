# 09. FORWARD MIGRATION PLAN — CONTROLLED & NON-DESTRUCTIVE

**Execution Mode:** Forward-Only / Non-Destructive / Pass 2 Planning  

---

## 1. Migration Assessment

Based on the forensic audit of Migrations 001–093 and live Supabase queries:
- **Baseline Stability:** All canonical tables (`employees`, `attendance_events`, `leave_requests`, `payroll_periods`, etc.) are operational, RLS-protected, and functioning correctly.
- **Migration 092 Impact:** Dropped universal permissive policies across public business tables.
- **Identified Items for Forward Consolidation:**
  1. `notification_templates_master`: Add tenant-scoped DELETE policy.
  2. `vendor_5way_reconciliations`: Add tenant-scoped DELETE policy.
  3. `organization_policies`: Add tenant-scoped DELETE policy.
  4. Progressive column consolidation: Add `organization_id` where only `tenant_id` exists on active tables.

---

## 2. Planned Migration Sequence (Post-Audit Pass 2)

| Migration Number | File Name | Objective | Risk Level |
|:---:|:---|:---|:---:|
| **094** | `20260903_094_phase11_forward_security_consolidation.sql` | Remediate the 3 open auxiliary delete policies with explicit tenant scoping. | **LOW (Safe)** |
| **095** | `20260903_095_phase11_tenant_column_alignment.sql` | Idempotent column check ensuring `organization_id` presence on active tables. | **LOW (Safe)** |

> **Safety Rule:** Neither migration shall DROP columns, tables, or existing historical migrations.
