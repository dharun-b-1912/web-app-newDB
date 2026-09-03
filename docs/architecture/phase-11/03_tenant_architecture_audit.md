# 03. TENANT ARCHITECTURE AUDIT — TENANT KEY USAGE & CONSISTENCY

**Audit Date:** September 3, 2026  
**Objective:** Map and classify every tenant key identifier across tables and code.

---

## 1. Classification Matrix

| Tenant Identifier Pattern | Table Count | Architectural Status | Action Plan |
|:---|:---:|---|---|
| **Category A: `organization_id` Only** | **96** | **CANONICAL STANDARD** | No change required. Enforces `organization_id = public.current_org_id()`. |
| **Category B: `tenant_id` Only** | **50** | **ACTIVE LEGACY** | Retain column; ensure RLS function `current_org_id()` maps correctly; forward migration compatibility. |
| **Category C: Dual Keys (`organization_id` & `tenant_id`)** | **71** | **TRANSITIONAL ARTIFACT** | Historical migrations added both columns. RLS uses `COALESCE(organization_id::text, tenant_id::text)`. Progressive consolidation planned. |
| **Category D: Non-Tenant Platform / Lookup** | **101** | **GLOBAL / LOOKUP** | Public plans, global system settings, lookup enumerations. |

---

## 2. Dual Key Tables (Top Sample)
These tables contain both `organization_id` and `tenant_id` due to historical schema evolution:
- `locations`
- `employees`
- `platform_api_keys`
- `audit_logs`
- `support_cases`
- `events`
- `employee_documents`
- `document_categories`
- `document_type_master`
- `document_folders`
- `document_master`
- `document_versions`
- `document_shares`
- `esign_requests`
- `document_audit_logs`
- `location_types`
- `asset_categories`
- `asset_types`
- `asset_attribute_definitions`
- `assets`
- `inventory_items`
- `asset_audit_logs`
- `attendance_policies`
- `attendance_daily_ledger`
- `attendance_policy_audit_logs`

---

## 3. Frontend & Repository Parameter Alignment
- `src/services/api.ts`: Uses `organization_id` dynamically via `getActiveOrgId()`.
- `src/services/payrollApi.ts`: Supports both `tenant_id` and `organization_id` queries.
- `src/services/leaveApi.ts`: Uses `organization_id` canonical standard.
- `src/services/attendanceApi.ts`: Uses `organization_id` canonical standard.
