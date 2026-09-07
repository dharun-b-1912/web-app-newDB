# JOY PeopleHR — Flutter Mobile App → Canonical Database Master Mapping

**Canonical Supabase Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Canonical Schema Authority:** 64 Public PostgreSQL Tables (Greenfield Migrations 001–024)  
**Flutter Application:** `workforce_os` (Flutter 3.47.1)  
**Audit Scope:** READ-ONLY Forensic Database & Contract Discovery  
**Date:** 2026-09-04  

---

## 1. Executive Summary & Identity Mapping

The Flutter mobile application is designed as an employee-facing client that interacts with the same Supabase database as the Joy PeopleHR web application.

```
══════════════════════════════════════════════════════════════════════════════
                    FLUTTER → DATABASE IDENTITY CHAIN
══════════════════════════════════════════════════════════════════════════════
Supabase Auth User (`auth.users.id`)
   ↓ (1:1 via auth.uid())
User Profile (`public.user_profiles.id`)
   ↓ (Holds organization_id & email/phone)
User Role (`public.user_roles.user_id` -> `public.roles.id`)
   ↓ (Resolves EMPLOYEE / MANAGER role)
Employee Master (`public.employees.id` / `public.employees.user_id`)
   ↓ (Scoped by organization_id)
Domain Sub-Entities:
   ├── `public.employee_profiles` (Personal, avatar, bio)
   ├── `public.employee_addresses` (Residential & permanent)
   ├── `public.employee_bank_details` (Bank account, IFSC)
   ├── `public.employee_statutory_details` (PAN, Aadhaar, UAN, ESI)
   ├── `public.employee_documents` (Uploaded KYC & certificates)
   ├── `public.attendance_punches` (Live biometric/mobile punches)
   ├── `public.attendance_daily` (Daily aggregated timesheets)
   ├── `public.attendance_regularizations` (Punch corrections & approvals)
   ├── `public.leave_balances` & `public.leave_requests` (Leave ledger)
   ├── `public.payroll_line_items` & `public.payslips` (Compensation & slips)
   └── `public.notification_events` (Broadcasts & push alerts)
══════════════════════════════════════════════════════════════════════════════
```

---

## 2. Granular Module-by-Module Database Mapping

### Module 1: Authentication & Identity
- **Flutter Views:** `LoginScreen`, `PermissionGatekeeperScreen`
- **Repository:** `SupabaseAuthRepository`
- **Current Flutter Call:** `supabase.auth.signInWithPassword(...)` -> query `profiles` / `app_users`
- **Canonical Schema Target:**
  - `auth.users` (GoTrue Auth session)
  - `public.user_profiles` (`id = auth.uid()`, `organization_id`, `email`, `phone`)
  - `public.user_roles` (`user_id = auth.uid()`, `role_id -> public.roles.id`)
  - `public.employees` (`user_id = auth.uid()` or `work_email = auth.user.email`)
- **Status:** **PASS WITH ADAPTER (Replace legacy `app_users`/`profiles` with `user_profiles`)**

---

### Module 2: Employee Profile & Personal Data
- **Flutter Views:** `ProfileScreen`, `EditProfileScreen`, `BankDetailsScreen`, `VirtualIdScreen`
- **Repository:** `SupabaseEmployeeRepository`
- **Current Flutter Call:** Queries `employees`, `employee_bank_accounts`, `employee_statutory_details`, `employee_avatar_assets`
- **Canonical Schema Target:**
  - `public.employees` (`first_name`, `last_name`, `employee_code`, `work_email`, `department_id`, `designation_id`, `work_location_id`, `employment_type`, `status`, `hire_date`)
  - `public.employee_profiles` (`avatar_url`, `personal_email`, `phone_number`, `date_of_birth`, `gender`, `marital_status`, `blood_group`)
  - `public.employee_addresses` (`address_type`, `address_line_1`, `city`, `state`, `postal_code`, `country`)
  - `public.employee_bank_details` (`account_number`, `bank_name`, `ifsc_code`, `account_type`)
  - `public.employee_statutory_details` (`pan_number`, `aadhaar_number`, `uan`, `pf_number`, `esi_number`)
- **Status:** **PASS WITH ADAPTER (Map `employee_bank_accounts` -> `employee_bank_details`)**

---

### Module 3: Time, Attendance & Shifts
- **Flutter Views:** `AttendanceScreen`, `RegularizationScreen`, `RosterScreen`, `EmployeeHomeScreen`
- **Repository:** `SupabaseAttendanceRepository`
- **Current Flutter Call:** Queries `attendance_events`, `attendance_daily`, `attendance_regularization_requests`, `attendance_roster_entries`, `work_locations`
- **Canonical Schema Target:**
  - `public.attendance_punches` (`employee_id`, `punch_type` IN (`CHECK_IN`, `CHECK_OUT`), `punch_time`, `latitude`, `longitude`, `punch_source` = `'MOBILE'`, `work_location_id`, `is_geofence_verified`)
  - `public.attendance_daily` (`employee_id`, `attendance_date`, `status`, `total_work_minutes`, `overtime_minutes`)
  - `public.attendance_regularizations` (`employee_id`, `attendance_date`, `requested_check_in`, `requested_check_out`, `reason`, `status`)
  - `public.employee_shift_assignments` (`employee_id`, `shift_id -> public.shifts.id`, `effective_date`)
  - `public.work_locations` (`id`, `name`, `latitude`, `longitude`, `geofence_radius_meters`)
- **Status:** **PASS WITH ADAPTER (Map `attendance_events` -> `attendance_punches`, `attendance_roster_entries` -> `employee_shift_assignments`)**

---

### Module 4: Leave Management
- **Flutter Views:** `LeaveScreen`, `ApplyLeaveModal`
- **Repository:** `SupabaseLeaveRepository`
- **Current Flutter Call:** Queries `leave_types`, `leave_entitlements`, `leave_requests`
- **Canonical Schema Target:**
  - `public.leave_types` (`id`, `name`, `code`, `is_paid`, `is_active`)
  - `public.leave_balances` (`employee_id`, `leave_type_id`, `balance`, `accrued`, `used`)
  - `public.leave_requests` (`employee_id`, `leave_type_id`, `start_date`, `end_date`, `total_days`, `reason`, `status`)
  - `public.leave_ledger_entries` (`employee_id`, `leave_type_id`, `transaction_type`, `days_count`, `reason`)
- **Status:** **PASS WITH ADAPTER (Map `leave_entitlements` -> `leave_balances`)**

---

### Module 5: Documents & Vault
- **Flutter Views:** `DocumentsScreen`, `UploadDocumentModal`
- **Repository:** `SupabaseEmployeeRepository`, `DocumentUploadService`
- **Current Flutter Call:** Queries `document_requirements`, `employee_documents`, storage bucket `employee-documents`
- **Canonical Schema Target:**
  - `public.document_types` (`id`, `name`, `code`, `category`, `is_mandatory`)
  - `public.employee_documents` (`employee_id`, `document_type_id`, `file_path`, `document_number`, `verification_status`)
  - Storage Bucket: `employee-documents` / `documents`
- **Status:** **PASS WITH ADAPTER (Map `document_requirements` -> `document_types`)**

---

### Module 6: Payslips & Compensation
- **Flutter Views:** `PayslipsScreen`
- **Repository:** `SupabaseMoreModulesRepository`, `PayslipPdfService`
- **Current Flutter Call:** Queries `employee_payslips`
- **Canonical Schema Target:**
  - `public.payslips` (`id`, `employee_id`, `payroll_line_item_id`, `payslip_number`, `storage_path`, `is_published`, `published_at`)
  - `public.payroll_line_items` (`id`, `gross_earnings`, `total_deductions`, `net_pay`, `earnings_breakdown JSONB`, `deductions_breakdown JSONB`, `total_working_days`, `payable_days`, `lop_days`)
  - `public.payroll_runs` (`id`, `month`, `year`, `status`)
- **Status:** **PASS WITH ADAPTER (Map `employee_payslips` -> `payslips` + `payroll_line_items`)**

---

### Module 7: Notifications & Broadcasts
- **Flutter Views:** `CommunicationScreen`, `NotificationCenterScreen`
- **Repository:** `SupabaseEmployeeRelationsRepository`, `SupabaseNotificationRepository`
- **Current Flutter Call:** Queries `company_announcements`, `communications`, `notification_deliveries`, `notification_events`
- **Canonical Schema Target:**
  - `public.notification_events` (`id`, `organization_id`, `user_id`, `event_type`, `payload JSONB`, `is_read`, `created_at`)
- **Status:** **PASS WITH ADAPTER (Consolidate announcement & alert tables to `notification_events`)**

---

### Module 8: Helpdesk, Grievance, Claims & Services
- **Flutter Views:** `HelpdeskScreen`, `GrievanceScreen`, `ClaimsScreen`, `ServiceCatalogScreen`, `LettersScreen`
- **Repository:** `SupabaseMoreModulesRepository`
- **Current Flutter Call:** Queries `helpdesk_tickets`, `expense_claims`, `service_requests`, `digital_letters`
- **Canonical Schema Target:**
  - `public.employee_requests` (`id`, `employee_id`, `request_type` IN (`EXPENSE_CLAIM`, `LETTER_REQUEST`, `SERVICE_REQUEST`, `GENERAL`), `details JSONB`, `status`)
  - `public.posh_and_grievance_cases` (`id`, `employee_id`, `case_type`, `description`, `severity`, `status`, `is_anonymous`)
  - `public.employee_documents` (`file_path`, `document_type_id`)
- **Status:** **PASS WITH ADAPTER (Map requests to `employee_requests`, grievance to `posh_and_grievance_cases`)**
