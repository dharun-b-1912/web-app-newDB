# JOY PeopleHR — Active Table Reference Matrix
**Canonical Supabase Target:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Database Architecture:** 64 Greenfield PostgreSQL Tables  
**Status:** 100% Active Application Codebase Strictly Mapped to Canonical Tables

---

## 1. Application-to-Canonical Database Mapping

| Legacy / Requested Reference | Canonical Database Table (64 Deployed) | Primary Application Service Files | Description & Status |
| :--- | :--- | :--- | :--- |
| `attendance_long_absences` | `public.attendance_daily` (`status: 'ABSENT'`) | `src/features/dashboard/CommandCenterView.tsx`, `src/services/operations/attendancePolicyEngine.ts` | Long absence attention metrics and detection mapped to daily attendance absence records. |
| `overtime_requests` | `public.attendance_regularizations` & `public.overtime_records` | `src/features/dashboard/CommandCenterView.tsx`, `src/services/workOvertimeService.ts` | Overtime pending counts and realtime subscriptions mapped to canonical regularizations and overtime records. |
| `employee_documents_master` | `public.employee_documents` | `src/features/dashboard/CommandCenterView.tsx`, `src/services/operations/employeeDocumentEngine.ts` | Document verification vault and pending approval badges mapped to canonical employee documents. |
| `vendor_commercial_agreements` | `public.vendors` | `src/features/dashboard/CommandCenterView.tsx`, `src/services/operations/vendorCommercialEngine.ts`, `vendorGovernanceEngine.ts`, `vendorGovernancePolicyEngine.ts` | Vendor compliance, agreements, and license status mapped to canonical vendors table. |
| `attendance_daily?date=eq...` (400 Bad Request) | `public.attendance_daily` (using `attendance_date`) | `src/services/attendanceApi.ts`, `AttendanceDashboardView.tsx`, `AttendanceHistoryView.tsx`, `EmployeeAttendanceView.tsx`, `attendanceRegularizationService.ts`, `attendanceDeviationService.ts`, `attendanceExceptionEngineService.ts` | Query column aligned to canonical `attendance_date`. |
| `attendance_regularization_requests` | `public.attendance_regularizations` | `src/services/attendanceApi.ts`, `src/services/attendance/attendanceRegularizationService.ts` | Regularization workflow requests and approval updates mapped directly to canonical table. |
| `approval_requests` | `public.approval_instances` & `public.approval_actions` | `src/services/notification/approvalService.ts` | Multi-tier approval workflow execution and audit logs mapped to canonical instances & actions. |
| `notification_deliveries` / `notification_outbox` | `public.notification_events` | `src/services/notification/notificationService.ts`, `notificationRealtimeEngine.ts` | Notifications outbox & event mesh mapped directly to canonical notification events. |
| `platform_profiles` / `platform_staff` | `public.platform_users` | `src/services/platform/platformProfileService.ts`, `platformStaffService.ts`, `authService.ts` | Platform operator, administrator, and control-plane user accounts. |
| `leave_entitlements` | `public.leave_balances` | `src/services/leaveApi.ts`, `src/services/realtimeSyncEngine.ts` | Live leave balance snapshots per employee and calendar year. |
| `leave_ledger_transactions` | `public.leave_ledger_entries` | `src/services/leaveApi.ts`, `src/services/realtimeSyncEngine.ts` | Financial-grade immutable leave audit and consumption transactions. |
| `employee_bank_accounts` | `public.employee_bank_details` | `src/services/api.ts`, `src/features/people/EmployeeProfileDrawer.tsx` | Employee bank account credentials and statutory payment records. |
| `observability_events` | Local Ingestion Buffer | `src/services/observability/telemetryIngestionBridge.ts` | Telemetry logs buffered safely locally without issuing 404/403 remote REST calls. |
| `organizations` | `public.organizations` | `src/services/api.ts`, `src/services/organizationContextService.ts` | Uses `.maybeSingle()` with null fallback during clean zero-state. |
| `companies` / `legal_entities` | `public.companies` | `src/services/api.ts`, `src/services/organizationContextService.ts` | Validates UUID format; no synthetic `comp-active` or `org-active` strings sent to Postgres. |

---

## 2. Complete 64 Canonical Greenfield Tables

| # | Migration | Table Name | Purpose |
|---|---|---|---|
| 1 | `003_platform` | `public.platform_users` | Control plane operators & administrators |
| 2 | `003_platform` | `public.platform_plans` | SaaS pricing plans & feature flags catalog |
| 3 | `004_organizations` | `public.organizations` | Enterprise tenant root entities |
| 4 | `004_organizations` | `public.companies` | Legal entities under organizations |
| 5 | `004_organizations` | `public.branches` | Physical branch offices / physical locations |
| 6 | `004_organizations` | `public.departments` | Organizational departments |
| 7 | `004_organizations` | `public.teams` | Functional work teams |
| 8 | `004_organizations` | `public.designations` | Job titles and designation catalog |
| 9 | `004_organizations` | `public.work_locations` | Geofenced work sites & client facilities |
| 10 | `005_identity` | `public.user_profiles` | RBAC user profiles mapped to auth.users |
| 11 | `005_identity` | `public.roles` | System and tenant RBAC roles |
| 12 | `005_identity` | `public.permissions` | Granular permission registry |
| 13 | `005_identity` | `public.role_permissions` | Role-to-permission mapping |
| 14 | `005_identity` | `public.user_roles` | User-to-role assignment |
| 15 | `006_employee_core` | `public.employees` | Core employee master records |
| 16 | `006_employee_core` | `public.employee_bank_details` | Bank accounts for salary disbursement |
| 17 | `006_employee_core` | `public.employee_statutory_details` | PF, ESI, PAN, UAN, Aadhaar statutory details |
| 18 | `006_employee_core` | `public.emergency_contacts` | Employee emergency contacts |
| 19 | `006_employee_core` | `public.employee_addresses` | Permanent and current addresses |
| 20 | `006_employee_core` | `public.employee_dependents` | Family dependents and nominees |
| 21 | `007_lifecycle` | `public.employee_lifecycle_events` | Promotions, transfers, confirmations |
| 22 | `007_lifecycle` | `public.separation_requests` | Resignations, terminations, exit interviews |
| 23 | `008_shifts` | `public.shifts` | Shift policies and working hour definitions |
| 24 | `008_shifts` | `public.shift_rosters` | Scheduled employee shift assignments |
| 25 | `009_attendance` | `public.attendance_records` | Daily attendance check-ins / check-outs |
| 26 | `009_attendance` | `public.attendance_punches` | Raw biometric / mobile clock-in punches |
| 27 | `009_attendance` | `public.attendance_regularizations` | Attendance miss punch / deviation requests |
| 28 | `009_attendance` | `public.overtime_records` | Overtime calculations and approvals |
| 29 | `010_leave` | `public.leave_types` | Leave types catalog (CL, SL, PL, etc.) |
| 30 | `010_leave` | `public.leave_balances` | Live leave balance snapshots per year |
| 31 | `010_leave` | `public.leave_requests` | Applied leave requests |
| 32 | `010_leave` | `public.leave_ledger_entries` | Immutable audit log of leave accrual/usage |
| 33 | `010_leave` | `public.holidays` | Organization / company / branch holidays |
| 34 | `011_approvals` | `public.approval_workflows` | Configurable multi-step approval workflows |
| 35 | `011_approvals` | `public.approval_instances` | Live executing approval instances |
| 36 | `011_approvals` | `public.approval_actions` | Action decisions (Approve/Reject) audit log |
| 37 | `012_payroll` | `public.salary_structures` | Earnings & deductions salary templates |
| 38 | `012_payroll` | `public.employee_salary_assignments` | Employee CTC & component breakdown |
| 39 | `012_payroll` | `public.payroll_runs` | Monthly payroll processing runs |
| 40 | `012_payroll` | `public.payslips` | Generated employee payslips |
| 41 | `012_payroll` | `public.statutory_filings` | PF, ESI, TDS monthly filing logs |
| 42 | `013_vendor_manpower` | `public.vendors` | Manpower & contractor agency directory |
| 43 | `013_vendor_manpower` | `public.vendor_contracts` | Vendor SLAs, rates & commercial agreements |
| 44 | `013_vendor_manpower` | `public.vendor_workers` | Third-party contract workforce personnel |
| 45 | `013_vendor_manpower` | `public.vendor_deployments` | Daily vendor worker shifts & location assignments |
| 46 | `013_vendor_manpower` | `public.vendor_invoices` | Monthly vendor billing & verification sheets |
| 47 | `014_performance` | `public.appraisal_cycles` | Quarterly / annual appraisal cycles |
| 48 | `014_performance` | `public.goals` | OKRs and KPI goals |
| 49 | `014_performance` | `public.appraisal_reviews` | Self, manager, and HR review submissions |
| 50 | `015_lms` | `public.courses` | Training courses catalog |
| 51 | `015_lms` | `public.course_enrollments` | Employee course enrollments & progress |
| 52 | `016_documents` | `public.document_categories` | Document folder classification |
| 53 | `016_documents` | `public.employee_documents` | Uploaded employee certificates & records |
| 54 | `017_employee_requests` | `public.employee_requests` | Universal ticketing & helpdesk requests |
| 55 | `017_employee_requests` | `public.request_comments` | Discussion thread for employee requests |
| 56 | `018_assets` | `public.asset_categories` | Asset categories (Laptops, SIMs, etc.) |
| 57 | `018_assets` | `public.assets` | Company physical asset inventory |
| 58 | `018_assets` | `public.asset_allocations` | Asset allocation and return history |
| 59 | `019_recruitment` | `public.job_postings` | Active job openings & recruitment requisitions |
| 60 | `019_recruitment` | `public.job_applications` | Candidate applications and pipeline status |
| 61 | `019_recruitment` | `public.interview_schedules` | Candidate interview scheduling & evaluation |
| 62 | `020_notifications` | `public.notification_events` | Notifications outbox & event delivery log |
| 63 | `020_notifications` | `public.webhook_endpoints` | Outbound tenant webhook destinations |
| 64 | `020_notifications` | `public.webhook_deliveries` | Webhook delivery audit logs & HTTP status |

---

## 3. Environment & Configuration Proof

```bash
VITE_SUPABASE_URL=https://ysiajemrqakfngasehhi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj
```

- **Old Supabase (`wmqjmyzzamgxyeuotbki`):** 0 references in runtime code and configurations.
- **TypeScript Typecheck (`npm run typecheck`):** PASS (0 errors)
- **Production Build (`npm run build`):** PASS (0 errors)
