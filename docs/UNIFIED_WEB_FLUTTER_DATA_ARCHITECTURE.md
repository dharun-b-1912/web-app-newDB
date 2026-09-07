# JOY PeopleHR / WorkforceOS — Unified Web & Flutter Data Architecture

## 1. Executive Summary & Foundational Tenet

JOY PeopleHR / WorkforceOS operates on a **Single Canonical Supabase Database** (`ysiajemrqakfngasehhi`).
Both the Web HR/Admin application (React/TypeScript) and the Mobile Employee application (Flutter) connect directly to the identical backend schema, ensuring:
- **Zero duplicate tenant databases or parallel mobile-only database schemas.**
- **Zero mock/fictitious synchronization layers.**
- **Strict Row-Level Security (RLS)** ensuring multi-tenant data isolation and role-based employee record partitioning.
- **True Bidirectional Data Consistency**: Every change initiated in Flutter by an employee is immediately visible and actionable to HR in Web, and every update executed by HR in Web is instantaneously reflected in Flutter.

---

## 2. Canonical Database Information

- **Supabase Project ID:** `ysiajemrqakfngasehhi`
- **Supabase URL:** `https://ysiajemrqakfngasehhi.supabase.co`
- **Auth Model:** Supabase Auth (`auth.users`) linked with `public.user_profiles` and `public.employees`.
- **Tenant Context:** Multi-tenancy partitioned via `organization_id` (UUID foreign key to `public.organizations`).

---

## 3. Module-by-Module Table Mapping & Data Flow Matrix

| Functional Module | Canonical Database Table | Primary Keys & References | Web Service Layer | Flutter Repository Layer | Directionality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Attendance Regularization** | `public.attendance_regularizations` | `id` (PK), `organization_id` (FK org), `employee_id` (FK emp) | `attendanceRegularizationService.ts` | `supabase_attendance_repository.dart` | **Bidirectional** (Flutter Submit $\rightarrow$ Web Approve/Reject $\rightarrow$ Flutter Status Update) |
| **Attendance Punches & Daily Summary** | `public.attendance_punches`, `public.attendance_daily` | `id` (PK), `organization_id`, `employee_id`, `punch_time`, `punch_type` | `attendanceRosterService.ts`, `attendancePolicyEngine.ts` | `supabase_attendance_repository.dart` | **Bidirectional** (Flutter Geofenced Punch $\rightarrow$ Web Realtime Live Dashboard) |
| **Work Locations & Geofences** | `public.work_locations`, `public.employee_work_location_assignments` | `id` (PK), `organization_id`, `latitude`, `longitude`, `radius_meters` | `workLocationService.ts` | `supabase_location_repository.dart` | **Web $\rightarrow$ Flutter** (HR creates geofences $\rightarrow$ Flutter enforces nearest active geofence) |
| **Leave Management** | `public.leave_requests`, `public.leave_balances`, `public.leave_types`, `public.leave_ledger_entries` | `id` (PK), `organization_id`, `employee_id`, `leave_type_id`, `units`, `status` | `leaveApi.ts` | `supabase_leave_repository.dart` | **Bidirectional** (Flutter Apply $\rightarrow$ Web HR Review/Approve $\rightarrow$ Immutable Ledger $\rightarrow$ Flutter Live Balance) |
| **Employee Requests & Helpdesk** | `public.employee_requests` | `id` (PK), `organization_id`, `employee_id`, `request_type`, `priority`, `status`, `assigned_to` | `helpdeskService.ts` | `supabase_employee_relations_repository.dart` | **Bidirectional** (Flutter Submit $\rightarrow$ Web Workspace Resolution/Notes $\rightarrow$ Flutter Updates) |
| **Shift Schedules & Roster** | `public.shifts`, `public.employee_shift_assignments` | `id` (PK), `organization_id`, `employee_id`, `shift_id`, `valid_from`, `valid_to` | `attendanceRosterService.ts` | `supabase_more_modules_repository.dart` | **Web $\rightarrow$ Flutter** (HR Rostering & Shift rotation $\rightarrow$ Flutter 7-Day Live Schedule) |
| **Company Announcements & Notifications** | `public.notification_events` | `id` (PK), `organization_id`, `recipient_user_id` (NULL = Org Broadcast), `channel = 'IN_APP'` | `notificationService.ts` | `supabase_notification_repository.dart`, `supabase_more_modules_repository.dart` | **Web $\rightarrow$ Flutter / Bidirectional** (HR Broadcast $\rightarrow$ Mobile Feed & Targeted In-App Alerts) |
| **Payslips & Salary Assignments** | `public.payslips`, `public.payroll_runs`, `public.payroll_line_items`, `public.employee_salary_assignments` | `id` (PK), `organization_id`, `employee_id`, `payroll_run_id`, `net_pay` | `payrollApi.ts` | `supabase_payroll_repository.dart` | **Web $\rightarrow$ Flutter** (HR Payroll Batch Execution $\rightarrow$ Flutter Payslip PDF & Breakdown) |
| **Employee Profile & Documents** | `public.employees`, `public.employee_profiles`, `public.employee_documents`, `public.document_types` | `id` (PK), `organization_id`, `employee_id`, `storage_path`, `verification_status` | `employeeApi.ts` | `supabase_employee_repository.dart`, `supabase_document_repository.dart` | **Bidirectional** (Profile changes & Document uploads $\rightarrow$ HR Verification Queue) |

---

## 4. Scope Exclusions

As verified and certified:
- **LMS (Learning Management System)** is strictly HR/Web-only and intentionally excluded from Flutter ESS scope.
- **Performance Appraisals / OKR Evaluation Cycles** are HR/Web-only administrative workflows and intentionally excluded from Flutter ESS scope.

---

## 5. Security & Multi-Tenant Isolation Guarantees

1. **Row Level Security (RLS):**
   - Every canonical table enforces Postgres RLS with security definer helpers (`public.auth_org_id()`, `public.auth_user_id()`).
   - Tenant isolation prevents cross-tenant data visibility even if UUIDs are guessed.
   - Employee isolation ensures standard employees can only select/insert records where `employee_id` belongs to their authenticated user profile, while HR/Admin roles can select/update all records within their `organization_id`.
2. **Immutable Audit Trails:**
   - Leave Ledger (`public.leave_ledger_entries`) and Attendance punches (`public.attendance_punches`) are financial-grade immutable logs.
