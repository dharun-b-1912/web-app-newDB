# JOY PeopleHR — Complete Database ↔ Application Mapping Report
**Canonical Database Project:** `ysiajemrqakfngasehhi` (PostgreSQL 15 / Supabase)  
**Verification Date:** September 3, 2026  

---

## 1. End-to-End Application File to Database Mapping

| Application Service File | Primary Functions | Database Target Object (Table / RPC) | Columns Queried / Mutated | Org Scope Enforced | Company Scope Enforced | RLS Applied | UI Module |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/services/api.ts` | `getEmployees`, `createEmployee`, `updateEmployee` | `public.employees`, `public.employee_bank_details`, `public.employee_statutory_details` | `id`, `company_id`, `organization_id`, `department_id`, `designation_id`, `status` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Employee Management |
| `src/services/organization/companyService.ts` | `getCompanies`, `createCompany` | `public.companies` | `id`, `organization_id`, `legal_name`, `trade_name`, `tax_id` | Yes (`organization_id`) | N/A (Defines Company) | Yes | Org Architecture |
| `src/services/organization/departmentService.ts` | `getDepartments`, `createDepartment` | `public.departments` | `id`, `organization_id`, `company_id`, `name`, `code` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Departments & Teams |
| `src/services/organization/designationService.ts`| `getDesignations`, `createDesignation` | `public.designations` | `id`, `organization_id`, `company_id`, `title`, `code` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Designation Directory |
| `src/services/attendance/attendanceService.ts` | `getDailyAttendance`, `markPunch` | `public.attendance_daily`, `public.attendance_punches` | `id`, `employee_id`, `company_id`, `attendance_date`, `status`, `punch_time` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Attendance Operations |
| `src/services/attendance/attendanceRosterService.ts` | `getShifts`, `assignShift` | `public.shifts`, `public.employee_shift_assignments` | `id`, `shift_name`, `company_id`, `start_time`, `end_time`, `employee_id` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Shift & Roster Calendar |
| `src/services/leaveApi.ts` | `getLeaveRequests`, `submitLeaveRequest` | `public.leave_requests`, `public.leave_balances` | `id`, `employee_id`, `company_id`, `leave_type_id`, `start_date`, `end_date`, `status` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Leave Management |
| `src/services/payrollApi.ts` | `getPayrollRuns`, `generatePayslips` | `public.payroll_runs`, `public.payroll_line_items`, `public.payslips` | `id`, `payroll_run_id`, `company_id`, `gross_pay`, `net_pay`, `status` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Payroll Processing |
| `src/services/recruitment/recruitmentService.ts` | `getRequisitions`, `getCandidates` | `public.job_openings`, `public.job_applicants` | `id`, `company_id`, `department_id`, `title`, `candidate_name`, `stage` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Recruitment ATS |
| `src/services/vendorService.ts`, `vendorPortalService.ts` | `getVendors`, `getWorkers` | `public.vendors`, `public.vendor_workers`, `public.vendor_invoices` | `id`, `vendor_name`, `worker_code`, `deployed_company_id`, `daily_wage_rate` | Yes (`organization_id`) | Yes (`deployed_company_id`) | Yes | Vendor & Contractor Hub |
| `src/services/document/documentService.ts` | `getDocuments`, `uploadDocument` | `public.employee_documents`, `public.document_types` | `id`, `employee_id`, `document_type_id`, `file_url`, `verification_status` | Yes (`organization_id`) | Yes (via `employee_id`) | Yes | Documents & E-Sign |
| `src/services/asset/assetService.ts` | `getAssets`, `assignAsset` | `public.assets`, `public.asset_assignments` | `id`, `company_id`, `asset_name`, `serial_number`, `assigned_to_employee_id` | Yes (`organization_id`) | Yes (`company_id`) | Yes | Asset Management |
| `src/services/workOvertimeService.ts` | `submitOvertimeRequest`, `submitWfhRequest` | `public.notification_events`, `public.employee_requests` | `id`, `recipient_user_id`, `channel`, `title`, `message`, `action_url` | Yes (`organization_id`) | Yes | Yes | Work & Overtime / WFH |
| `src/services/platform/platformTenantService.ts`| `getTenants`, `provisionTenant` | `public.organizations`, `public.saas_subscriptions` | `id`, `name`, `slug`, `status`, `plan_id` | Platform Wide | N/A | Yes | Super Admin SaaS Hub |

---

## 2. Multi-Tenant Architectural Enforcement Summary
- **Organization Boundary:** Enforced by PostgreSQL RLS using `public.get_active_user_org_id()`.
- **Company Scope:** Enforced on all company-specific entities using `company_id` filters.
- **Normalized Join Integrity:** Single flat queries replaced with normalized joins across `employee_bank_details` and `employee_statutory_details`.
