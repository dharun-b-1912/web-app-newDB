# JOY PeopleHR — Vendor Ecosystem Reality Reconciliation Document
**Document Target:** Canonical Vendor & Contractor Ecosystem Architecture  
**Status:** Authoritative Pre-Implementation Audit  
**Date:** September 9, 2026  
**Target SaaS Launch:** September 26, 2026  
**Database Target:** Canonical Supabase PostgreSQL (`ysiajemrqakfngasehhi`)

---

## 1. Existing Database Tables Audit

Through auditing existing migrations (`20260829_068_enterprise_vendor_and_manpower_management_master.sql` and `20260901_090_enterprise_vendor_governance_os.sql`), the following authoritative tables already exist in the database:

| Existing Table | Purpose & Key Columns | Canonical Status |
|---|---|---|
| `public.vendors` | Core vendor master: `id`, `organization_id`, `legal_entity_id`, `vendor_code`, `legal_name`, `trade_name`, `vendor_type`, `status`, `pan`, `gstin`, `primary_contact_name`, `primary_contact_email`, `primary_contact_phone`, `address_line1`, `city`, `state`, `postal_code`, `manpower_license_no`, `max_workforce_capacity`, `bank_name`, `account_name`, `account_number_masked`, `account_number_encrypted`, `ifsc_code`, `bank_branch`. | **REUSE & EXTEND** |
| `public.vendor_contracts` | Commercial agreements: `id`, `vendor_id`, `contract_number`, `contract_type`, `start_date`, `end_date`, `payment_terms`, `service_charge_percentage`, `status`, `document_url`. | **REUSE & EXTEND** |
| `public.vendor_documents` | Compliance documents: `id`, `vendor_id`, `document_type`, `document_name`, `file_name`, `file_url`, `expiry_date`, `verification_status`, `verified_by`, `verified_at`, `rejection_reason`. | **REUSE & EXTEND** |
| `public.vendor_employees` | Contractor workforce directory: `id`, `tenant_id`, `vendor_id`, `employee_code`, `first_name`, `last_name`, `display_name`, `mobile`, `email`, `worker_category`, `skill_category`, `designation`, `department`, `status`, `current_client_id`, `work_location`, `daily_wage_rate`, `ot_hourly_rate`, `uan`, `esic_number`, `aadhaar_masked`, `pan`. | **REUSE** |
| `public.vendor_employee_assignments` | Site deployments: `id`, `vendor_id`, `employee_id`, `employee_name`, `designation`, `worker_category`, `client_name`, `work_location`, `status`, `start_date`, `end_date`. | **REUSE** |
| `public.vendor_attendance_records` | Biometric attendance punches: `id`, `tenant_id`, `vendor_id`, `employee_id`, `employee_code`, `date`, `shift_code`, `total_hours_worked`, `ot_hours`, `status`, `is_client_verified`. | **REUSE** |
| `public.vendor_purchase_orders` | Commercial POs: `id`, `tenant_id`, `vendor_id`, `po_number`, `po_date`, `total_budget`, `utilized_amount`, `balance_amount`, `status`. | **REUSE** |
| `public.vendor_invoices` | Vendor billing: `id`, `tenant_id`, `vendor_id`, `invoice_number`, `invoice_date`, `billing_period`, `po_id`, `base_amount`, `service_charge_amount`, `cgst_amount`, `sgst_amount`, `total_amount`, `net_payable_amount`, `status`, `three_way_match_status`. | **REUSE** |
| `public.vendor_payments` | Payouts & disbursements: `id`, `vendor_id`, `invoice_id`, `amount`, `status`, `transaction_reference_utr`, `bank_account_number`, `ifsc_code`, `payment_date`, `return_reason`, `return_notes`, `returned_date`, `resolution_notes`, `resolved_at`. | **REUSE** |
| `public.vendor_statutory_challans` | PF/ESIC returns: `id`, `vendor_id`, `billing_period`, `challan_type`, `challan_number`, `remitted_amount`, `employee_count`. | **REUSE** |
| `public.vendor_audit_logs` | Immutable audit trail: `id`, `vendor_id`, `entity_type`, `action`, `previous_value`, `new_value`, `performed_by`, `role`. | **REUSE** |
| `public.workforce_employment_relationships`| Cross-employment mapping: `id`, `organization_id`, `person_id`, `employment_type`, `employer_type`, `vendor_id`, `effective_from`, `status`. | **REUSE** |
| `public.contract_worker_deployments`| Operational site allocations: `id`, `organization_id`, `vendor_id`, `worker_id`, `plant_location_id`, `status`. | **REUSE** |

---

## 2. Existing Services Audit

| Service | Location | Current Capability | Status |
|---|---|---|---|
| `vendorService.ts` | `src/services/` | Company Admin vendor CRUD, vendor listing, workforce queries, contracts, payments, returned payments resolution. | **EXTEND** |
| `vendorPortalService.ts` | `src/services/` | Vendor self-service portal state, 3-way match, Form V generation, contractor employee management, attendance, invoice submissions. | **EXTEND** |
| `roleResolutionService.ts`| `src/services/auth/` | Resolves user profile, role precedence, and maps `VENDOR_ADMIN` to vendor portal. | **ALIGNED** |
| `portalAccessResolver.ts` | `src/services/auth/` | Deterministic portal access engine: locks Vendor Admin into `PortalType.VENDOR` with zero internal HR/payroll access. | **ALIGNED** |
| `hrEventBus.ts` | `src/services/` | Event bus for real-time reactivity and multi-tenant broadcast. | **ALIGNED** |
| `unifiedApprovalEngine.ts` | `src/services/approvals/` | Universal approval engine supporting multi-tier approvals. | **CONNECT ADAPTER** |

---

## 3. Existing Routes Audit

- **Company Admin Routes:**
  - `/manpower` $\to$ `ManpowerWorkspace` (`initialTab="settlement"`)
  - `/vendors` or `/organization-vendors` $\to$ `ManpowerWorkspace` (`initialTab="partners"`)
  - `/vendor-assignments` $\to$ `ManpowerWorkspace` (`initialTab="deployment"`)
  - `/vendor-settlement-workspace` $\to$ `ManpowerWorkspace` (`initialTab="settlement"`)
  - `/client-billing` $\to$ `ManpowerWorkspace` (`initialTab="billing"`)
- **Vendor Admin Routes:**
  - `/vendor`, `/vendor-portal`, `/vendor-dashboard`, `/vendor-workforce`, `/vendor-employees`, `/vendor-attendance`, `/vendor-invoices`, `/vendor-compliance`, `/vendor-settlement`, etc. $\to$ `VendorMasterModule`.

---

## 4. Existing UI Components Audit

- `src/features/manpower/ManpowerWorkspace.tsx`: Host component for Company Admin's 5 manpower workspaces: `partners`, `deployment`, `settlement`, `billing`, and `compliance`.
- `src/features/organization/VendorsView.tsx`: Company Admin table of vendors, vendor details drawer, contract worker approval, document verification, and returned payment resolution.
- `src/features/organization/wizard/VendorCreateWizardModal.tsx`: 7-step wizard for Company Admin.
- `src/features/vendor/VendorMasterModule.tsx`: Multi-tab Vendor Admin portal (Client Workspaces, Settlement, Licenses, Workforce, Deployments, Attendance, Invoices, Compliance).
- `src/features/vendor/subviews/VendorOnboardingWizardModal.tsx`: 4-step vendor self-service onboarding modal.
- `src/features/vendor/components/IssueFormVModal.tsx`: Generates CLRA Form V certificates.
- `src/features/vendor/components/ThreeWayMatchModal.tsx`: 3-way match reconciliation modal.

---

## 5. Existing Authentication & RBAC Audit

- Supabase GoTrue Auth is the sole identity plane.
- User profile (`public.user_profiles`) contains `vendor_id` and `organization_id`.
- `PortalAccessResolver` deterministically isolates Vendor Admin:
  - Allowed portals: `[PortalType.VENDOR]`.
  - Default route: `vendor-settlement-workspace` or `vendor/dashboard`.
  - Internal HR/Payroll: strictly blocked (`scopes.employee = false`, `scopes.vendor = true`).
- `RouteGuard.tsx` rejects any internal routes (`payroll`, `employees`, `platform`, etc.) for `Vendor Admin`.

---

## 6. Existing Row-Level Security (RLS) Audit

- Multi-tenant RLS is present on `public.vendors`, `public.vendor_contracts`, `public.vendor_documents`, `public.vendor_employees`, `public.vendor_invoices`, `public.vendor_payments`, etc.
- Current policies verify `organization_id = (auth.jwt() ->> 'organization_id')::TEXT`.
- **Hardening Needed:** Vendor Admin must have vendor-scoped policies (`vendor_id = (auth.jwt() ->> 'vendor_id')::TEXT`) so Vendor A cannot query Vendor B rows even within the same multi-tenant organization.

---

## 7. Missing Pieces Identified

1. **Vendor Invitations Structure (`public.vendor_invitations`)**:
   - Needed for Company Admin to invite vendor contacts via secure, expiring invitation tokens (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`).
2. **Server-Authoritative State Machine**:
   - `INVITED` $\to$ `DRAFT` $\to$ `SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `CORRECTION_REQUIRED` $\to$ `RESUBMITTED` $\to$ `APPROVED` $\to$ `ACTIVE`.
   - Terminal: `REJECTED`, `SUSPENDED`, `EXPIRED`, `TERMINATED`.
   - Transition validation guards rejecting illegal jumps (e.g. `DRAFT` $\to$ `ACTIVE`).
3. **Configurable Compliance Applicability Engine**:
   - Must implement the exact rules from the user's handwritten process:
     - **Vendor Name / Legal Entity**: Mandatory
     - **PAN**: Mandatory
     - **GSTIN**: Mandatory if applicable (can be marked "Not Applicable" with reason)
     - **Entity / Constitution Type**: Mandatory (`PRIVATE_LIMITED`, `PUBLIC_LIMITED`, `LLP`, `PARTNERSHIP`, `PROPRIETORSHIP`, `OTHER`). *Proprietorships are never forced into company-only fields.*
     - **MSME**: Conditional (`YES` + Udyam Number + Certificate / `NO` with reason / `NOT_APPLICABLE`).
     - **Commercial Agreement**: Mandatory before activation (Agreement number, start/end dates, rate card, margin, capacity, PDF upload).
     - **Licence**: Conditional by vendor/service category.
     - **Form V**: Conditional where applicable (Company Admin issuance: `FORM-V/JCS/YYYY/XXXX`).
     - **RC (Registration Certificate)**: Conditional — transport/vehicle providers only.
     - **ESI Certificate**: Conditional.
     - **EPF Certificate**: Conditional.
     - **Cancelled Cheque**: Mandatory before payment activation.
     - **Bank Details**: Mandatory before payment activation (account holder, bank, masked number, IFSC, branch).
4. **Unified Approval Engine Integration**:
   - Create `VendorOnboardingApprovalAdapter` (`targetEntityType: 'VENDOR_ONBOARDING'`).
   - Trigger domain events (`vendor.approved`, `vendor.activated`, `vendor.correction_requested`).
5. **30-Test Production Reality Gate Suite**:
   - `vendorEcosystemProductionCertification.test.ts` integrated into `runSuite.ts`.

---

## 8. Fields to Reuse vs. Fields to Add

### Fields Reused from Existing Schema
- `vendors`: `id`, `organization_id`, `legal_entity_id`, `vendor_code`, `legal_name`, `trade_name`, `vendor_type`, `status`, `pan`, `gstin`, `primary_contact_name`, `primary_contact_email`, `primary_contact_phone`, `address_line1`, `city`, `state`, `postal_code`, `manpower_license_no`, `max_workforce_capacity`, `bank_name`, `account_name`, `account_number_masked`, `account_number_encrypted`, `ifsc_code`, `bank_branch`.
- `vendor_contracts`: `vendor_id`, `contract_number`, `contract_type`, `start_date`, `end_date`, `payment_terms`, `service_charge_percentage`, `status`, `document_url`.
- `vendor_documents`: `vendor_id`, `document_type`, `document_name`, `file_name`, `file_url`, `expiry_date`, `verification_status`, `verified_by`, `verified_at`, `rejection_reason`.

### Fields to Add in Migration 105
- `vendors.constitution_type`: `VARCHAR(50) DEFAULT 'PRIVATE_LIMITED'` (Entity constitution: `PRIVATE_LIMITED`, `PUBLIC_LIMITED`, `LLP`, `PARTNERSHIP`, `PROPRIETORSHIP`, `OTHER`).
- `vendors.is_gst_applicable`: `BOOLEAN DEFAULT TRUE`.
- `vendors.gst_exemption_reason`: `TEXT`.
- `vendors.msme_registered`: `VARCHAR(20) DEFAULT 'NOT_APPLICABLE'`.
- `vendors.udyam_registration_number`: `VARCHAR(100)`.
- `vendors.correction_reason`: `TEXT`.
- `vendors.onboarding_step`: `INTEGER DEFAULT 1`.
- `vendors.compliance_completed`: `BOOLEAN DEFAULT FALSE`.
- Table `public.vendor_invitations`:
  - `id TEXT PRIMARY KEY`
  - `vendor_id TEXT NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE`
  - `organization_id TEXT NOT NULL`
  - `company_id TEXT NOT NULL`
  - `target_email VARCHAR(255) NOT NULL`
  - `target_phone VARCHAR(50)`
  - `invitation_token VARCHAR(255) NOT NULL UNIQUE`
  - `status VARCHAR(50) NOT NULL DEFAULT 'PENDING'`
  - `expires_at TIMESTAMPTZ NOT NULL`
  - `accepted_at TIMESTAMPTZ`
  - `created_by TEXT`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`

---

## 9. Migration Requirements

1. **Forward Migration**: `20260909_105_vendor_onboarding_ecosystem_and_compliance.sql`
   - Add new columns to `public.vendors` with `IF NOT EXISTS`.
   - Create table `public.vendor_invitations` with RLS.
   - Add RLS policies for Vendor Admin (`vendor_id = (auth.jwt() ->> 'vendor_id')`).
   - Add audit triggers and auto-updating timestamps.
2. **Backward Compatibility**:
   - Existing vendor rows default to `is_gst_applicable = true`, `constitution_type = 'PRIVATE_LIMITED'`, and `msme_registered = 'NOT_APPLICABLE'`.
3. **Rollback Strategy**:
   - Standalone drop column / drop table statements documented in migration header.
