# JOY PeopleHR — Application to Database Mapping Specification
**Document Version:** 1.0.0-PROD  
**Database Project ID:** `ysiajemrqakfngasehhi` (Greenfield Target Database)  
**Status:** Pure Audit & Future Mapping Plan (Zero Code Modified)  

---

## 1. Overview & Migration Principles

This document maps all existing TypeScript services, custom hooks, and UI workspaces in `workforceos-enterprise-hrms` to the target greenfield database architecture.

### Mapping Invariants:
1. **Universal Elimination of `tenant_id`**: All queries currently filtering by `.eq('tenant_id', ...)` will transition directly to `.eq('organization_id', ...)`.
2. **Normalized Data Access**: Complex JSONB payload extractions (e.g. nested banking, statutory PAN/Aadhaar in `employee.profile`) will map cleanly to dedicated child tables (`employee_bank_details`, `employee_statutory_details`, `employee_profiles`).
3. **Canonical Table Names**: Consolidated aliases and legacy table names are mapped to their target greenfield equivalents.

---

## 2. Comprehensive Service & Feature Mapping Matrix

| Existing Service / Feature File | Current Legacy Database Dependency | Target Greenfield Table | Required Future Application Changes (Post-Approval) |
| :--- | :--- | :--- | :--- |
| **`src/services/api.ts`** (Workforce Core) | `employees`, `employee_profiles`, `companies`, `departments`, `designations`, `branches` | `public.employees`<br>`public.employee_profiles`<br>`public.companies`<br>`public.departments`<br>`public.designations`<br>`public.branches` | 1. Replace `sanitizeEmployeeForSupabase()` with normalized table inserts.<br>2. Remove legacy fallback to localStorage mock keys.<br>3. Enforce single `organization_id` query filters. |
| **`src/services/attendanceApi.ts`** | `attendance_records`, `attendance_events`, `attendance_daily_summary`, `attendance_regularizations` | `public.attendance_punches`<br>`public.attendance_daily`<br>`public.attendance_regularizations` | 1. Direct raw punches to `attendance_punches`.<br>2. Query daily rollups from `attendance_daily` instead of computing on client.<br>3. Map regularization approvals to `attendance_regularizations`. |
| **`src/services/leaveApi.ts`** | `leaves`, `leave_requests`, `leave_balances`, `leave_ledger_transactions` | `public.leave_types`<br>`public.leave_balances`<br>`public.leave_requests`<br>`public.leave_ledger_entries` | 1. Standardize on `leave_ledger_entries` (immutable transaction log).<br>2. Point balance checks to `leave_balances` snapshot table. |
| **`src/services/payrollApi.ts`** | `salary_components`, `salary_structures`, `employee_salary_assignments`, `payroll_periods`, `employee_payslips` | `public.salary_components`<br>`public.salary_structures`<br>`public.employee_salary_assignments`<br>`public.payroll_runs`<br>`public.payroll_line_items`<br>`public.payslips` | 1. Rename query targets from `payroll_periods` to `payroll_runs`.<br>2. Store calculated line items in normalized `payroll_line_items`.<br>3. Fetch payslips from `payslips` metadata table. |
| **`src/services/vendorPortalService.ts`** | `vendors`, `vendor_workers`, `vendor_assignments`, `vendor_invoices`, `vendor_purchase_orders` | `public.vendors`<br>`public.vendor_workers`<br>`public.vendor_invoices` | 1. Consolidate `vendor_assignments` into `vendor_workers.deployed_company_id`.<br>2. Standardize invoice submission to `vendor_invoices`. |
| **`src/services/onboardingService.ts`** | `employee_onboardings`, `onboarding_tasks`, `document_requirements` | `public.employee_onboarding`<br>`public.document_types`<br>`public.employee_documents` | 1. Replace JSON task lists with `employee_onboarding` workflow stages.<br>2. Upload files directly to private `documents` bucket and record in `employee_documents`. |
| **`src/services/offboardingService.ts`** | `employee_separations`, `exit_clearance_items`, `fnf_settlements` | `public.employee_separations`<br>`public.payroll_runs` | 1. Map separation requests to `employee_separations`.<br>2. Route FnF payouts directly through `payroll_line_items` with settlement flag. |
| **`src/services/profileService.ts`** | `employees`, `employee_bank_and_statutory` | `public.employees`<br>`public.employee_profiles`<br>`public.employee_bank_details`<br>`public.employee_statutory_details` | 1. Split compound bank/statutory updates into atomic child table queries.<br>2. Enforce verified flag on bank account modifications. |
| **`src/services/lmsApi.ts`** | `lms_courses`, `lms_enrollments`, `lms_programs` | `public.lms_courses`<br>`public.lms_enrollments` | 1. Query course catalog directly from `lms_courses`.<br>2. Track completions and certificates via `lms_enrollments`. |
| **`src/services/performanceApi.ts`** | `performance_goals`, `performance_reviews`, `performance_cycles` | `public.performance_cycles`<br>`public.performance_goals`<br>`public.performance_reviews` | 1. Standardize on `performance_reviews` (storing self and manager ratings).<br>2. Compute 9-box talent matrix directly from `performance_reviews`. |
| **`src/services/employeeRelationsService.ts`** | `grievances`, `posh_cases`, `disciplinary_actions`, `helpdesk_tickets` | `public.employee_requests`<br>`public.posh_and_grievance_cases` | 1. Route general requests to `employee_requests`.<br>2. Store confidential POSH cases in `posh_and_grievance_cases`. |
| **`src/services/platform/platformSettingsService.ts`** | `platform_settings`, `platform_api_keys`, `saas_subscriptions` | `public.platform_plans`<br>`public.saas_subscriptions`<br>`public.platform_users` | 1. Read SaaS catalog from `platform_plans`.<br>2. Manage tenant subscriptions via `saas_subscriptions`. |
| **`src/services/auth/authService.ts`** | `users`, `organization_invitations`, `phone_otp_verifications` | `public.user_profiles`<br>`public.roles`<br>`public.user_roles` | 1. Link Supabase Auth sessions to `user_profiles`.<br>2. Resolve active roles through `user_roles` join table. |
| **`src/hooks/useTenant.tsx`** | `organizations`, `companies`, `organization_profiles` | `public.organizations`<br>`public.companies` | 1. Fetch active enterprise tree from `organizations` and `companies`.<br>2. Remove legacy local storage caching fallbacks. |

---

## 3. UI Feature Route to Database Domain Map

| Feature UI Route in `App.tsx` | View Component | Target Database Domain | Target Tables Queried |
| :--- | :--- | :--- | :--- |
| `/dashboard`, `/command-center` | `DashboardView.tsx` | Domain 02, 04, 06, 08 | `organizations`, `employees`, `attendance_daily`, `leave_requests` |
| `/people`, `/workforce` | `WorkforceWorkspace.tsx` | Domain 04, 05 | `employees`, `employee_profiles`, `departments`, `designations` |
| `/departments`, `/designations` | `OrganizationWorkspace.tsx` | Domain 02 | `companies`, `branches`, `departments`, `designations` |
| `/attendance`, `/daily`, `/ledger` | `AttendanceModuleMaster.tsx` | Domain 06, 07 | `attendance_punches`, `attendance_daily`, `shifts`, `biometric_devices` |
| `/leave`, `/leave-requests` | `LeaveManagementModule.tsx` | Domain 08, 09 | `leave_types`, `leave_balances`, `leave_requests`, `leave_ledger_entries` |
| `/payroll`, `/payroll-salary` | `PayrollMasterModule.tsx` | Domain 10 | `salary_components`, `salary_structures`, `payroll_runs`, `payslips` |
| `/vendor`, `/vendor-portal` | `VendorMasterModule.tsx` | Domain 11 | `vendors`, `vendor_workers`, `vendor_invoices` |
| `/performance` | `PerformanceMasterModule.tsx`| Domain 12 | `performance_cycles`, `performance_goals`, `performance_reviews` |
| `/lms` | `LmsMasterModule.tsx` | Domain 13 | `lms_courses`, `lms_enrollments` |
| `/documents` | `DocumentManagementView.tsx` | Domain 14 | `document_types`, `employee_documents` |
| `/helpdesk`, `/grievance` | `EmployeeRelationsMasterModule.tsx`| Domain 15 | `employee_requests`, `posh_and_grievance_cases` |
| `/ess`, `/ess-dashboard` | `EssMasterModule.tsx` | Domain 04, 06, 08, 10 | `employees`, `attendance_daily`, `leave_balances`, `payslips` |
| `/platform`, `/platform-dashboard` | `PlatformAdminMasterModule.tsx` | Domain 01 | `platform_users`, `platform_plans`, `saas_subscriptions` |
