# JOY PeopleHR — Legacy Reference & Query Audit Report
**Target Database Project:** `ysiajemrqakfngasehhi` (Canonical PostgreSQL 15 / Supabase)  
**Audit Date:** September 3, 2026  

---

## 1. Executive Summary

This audit identifies all remaining legacy table names, deprecated RPC calls, obsolete column references (specifically `tenant_id`), and old mock storage artifacts present across the TypeScript service and interface layers.

---

## 2. Legacy vs. Canonical Schema Mappings

| Legacy Term / Reference in Code | Occurrences | Location in Codebase | Canonical Greenfield Entity | Status / Required Migration Action |
| :--- | :---: | :--- | :--- | :--- |
| `tenant_id` | 741 references | `src/types/*.ts`, legacy services | `organization_id` | **MIGRATION REQUIRED**: Standardize all service query payloads and interface definitions from `tenant_id` to `organization_id`. |
| `workforce` (Table name) | 12 references | `src/services/vendorPortalService.ts` | `employees` / `vendor_workers` | **MIGRATION REQUIRED**: Update PostgREST `.from('workforce')` to `.from('employees')`. |
| `requisitions` (Table name) | 8 references | `src/services/recruitment/recruitmentService.ts`| `job_openings` | **MIGRATION REQUIRED**: Update `.from('requisitions')` to `.from('job_openings')`. |
| `candidates` (Table name) | 6 references | `src/services/recruitment/recruitmentService.ts`| `job_applicants` | **MIGRATION REQUIRED**: Update `.from('candidates')` to `.from('job_applicants')`. |
| `offers` (Table name) | 6 references | `src/services/recruitment/offerManagementService.ts`| `job_applicants` (stage = 'OFFER_EXTENDED') | **MIGRATION REQUIRED**: Point offer generation queries to `job_applicants`. |
| `realtime_outbox` (Table name) | 18 references | `src/services/workOvertimeService.ts` | `notification_events` | **MIGRATION REQUIRED**: Route asynchronous outbox events to `notification_events`. |
| `service_definitions` (Table name)| 4 references | `src/services/services/serviceCatalogService.ts` | `employee_requests` (request_type) | **MIGRATION REQUIRED**: Query `employee_requests` catalog. |
| Old Project ID `wmqjmyzzamgxyeuotbki`| 19 references | Test scripts & diagnostic views | `ysiajemrqakfngasehhi` | **MIGRATION REQUIRED**: Clean up legacy test script fallbacks to ensure zero stale connection references. |

---

## 3. RPC & Stored Procedure Audit

| RPC Function in Code | Target in Database | Status | Notes |
| :--- | :--- | :---: | :--- |
| `get_active_user_org_id()` | `public.get_active_user_org_id()` | ✅ LIVE | Core Security Definer session resolver function. |
| `get_active_user_employee_id()` | `public.get_active_user_employee_id()` | ✅ LIVE | Retrieves authenticated employee UUID. |
| `is_platform_admin()` | `public.is_platform_admin()` | ✅ LIVE | Verifies SaaS operator elevated permissions. |
| `fn_approve_leave_request()` | `public.fn_approve_leave_request()` | ✅ LIVE | Atomic double-entry leave deduction & approval. |
| `fn_reject_leave_request()` | `public.fn_reject_leave_request()` | ✅ LIVE | Atomic leave request rejection. |
| `fn_provision_employee_auth()` | `public.fn_provision_employee_auth()` | ✅ LIVE | Links auth user to employee directory. |
| `set_updated_at_timestamp()` | `public.set_updated_at_timestamp()` | ✅ LIVE | Universal mutable trigger. |

---

## 4. Query Scope & Filtering Evaluation

1. **Organization Scoping**:
   - Primary services (`src/services/api.ts`, `src/services/payrollApi.ts`, `src/services/leaveApi.ts`) pass `organization_id` correctly.
   - Database-level RLS provides kernel-level defense preventing cross-organization leakage regardless of client parameters.
2. **Company Scoping**:
   - Direct company filtering (`.eq('company_id', companyId)`) is implemented in `src/services/api.ts` and `src/services/companyService.ts`.
   - In several sub-modules (like Asset allocations and Holiday calendars), company filtering is performed in React component memory after fetching organization rows. **Direct database `.eq('company_id', selectedCompanyId)` filtering should be unified across all 38 workspaces in Phase 4.**
