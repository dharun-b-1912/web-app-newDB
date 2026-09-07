# JOY PeopleHR — Flutter Mobile Application Comprehensive Inventory

**Target Application:** `workforce_os` (Flutter 3.47.1 / Dart 3.13.1)  
**Root Directory:** `flutter_app/`  
**Target Canonical Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Decommissioned Backend Found:** `wmqjmyzzamgxyeuotbki` (**CRITICAL BLOCKER IN CONFIG**)  
**Discovery Mode:** READ-ONLY Forensic Discovery  
**Date:** 2026-09-04  

---

## 1. Project Structure & Environment Inventory

### Core Meta
- **Package Name:** `workforce_os`
- **Version:** `1.0.0+5`
- **Flutter SDK:** `>=3.10.0`, Dart `>=3.0.0 <4.0.0` (Active CLI: `Flutter 3.47.1`)
- **Key Dependencies (`pubspec.yaml`):**
  - `supabase_flutter: ^2.8.0` (Supabase Client & Auth SDK)
  - `firebase_core: ^3.6.0`, `firebase_messaging: ^15.1.3`, `firebase_crashlytics: ^4.1.3`
  - `shared_preferences: ^2.2.2` (Local key-value caching)
  - `geolocator: ^13.0.2` & `permission_handler: ^11.3.1` (Geofencing / Punch tracking)
  - `file_picker: ^8.1.2`, `image_picker: ^1.1.2`, `pdfx: ^2.6.0` (Document & media vault)
  - `shadcn_flutter: ^0.0.43`, `google_fonts: ^6.2.1` (UI Design System)

---

## 2. Complete Flutter Screens & Views Inventory (28 Views)

| # | Screen File | Route / Navigation Entry | Purpose / Domain | Key UI Controls & Actions | Current Data Source / Provider |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `features/auth/screens/login_screen.dart` | `/login` / Root Gate | Email & Password authentication | Email, Password inputs, Sign In button, Biometric quick unlock | `supabase_auth_repository.dart` |
| 2 | `features/auth/screens/permission_gatekeeper_screen.dart` | Auth onboarding gate | Device permissions (Location, Camera, Push) | Permission request buttons, Continue action | `permission_handler`, `LocationService` |
| 3 | `features/employee/home/screens/employee_home_screen.dart` | Tab 0 (Home) | Main Employee Dashboard | Punch button, Quick actions, Daily shift widget, Announcements card | `SupabaseAttendanceRepository`, `SupabaseNotificationRepository` |
| 4 | `features/employee/attendance/screens/attendance_screen.dart` | Tab 1 (Attendance) | Punch In/Out, Geofenced Punch, Timesheet | Punch action, Geolocation verification, Monthly calendar view, History | `SupabaseAttendanceRepository`, `LocationService` |
| 5 | `features/employee/leave/screens/leave_screen.dart` | Tab 2 (Leave) | Leave balances, Request history & Apply | Apply Leave modal, Balance cards, History list, Cancel request | `SupabaseLeaveRepository` |
| 6 | `features/employee/payslips/screens/payslips_screen.dart` | Tab 3 / More (Payslips) | Monthly digital payslips & breakdown | Month selector, Net pay card, Detailed breakdown drawer, Download PDF | `SupabaseMoreModulesRepository`, `PayslipPdfService` |
| 7 | `features/employee/profile/screens/profile_screen.dart` | Tab 4 (Profile) | Employee profile, Identity & Personal info | Profile header, Personal details, Bank/Statutory drawer, Logout | `SupabaseEmployeeRepository` |
| 8 | `features/employee/more/screens/more_screen.dart` | Bottom Nav (More) | Navigation catalog for 15+ sub-modules | Grid menu items (Claims, Assets, LMS, Grievance, Virtual ID, etc.) | `app_services_catalog.dart` |
| 9 | `features/employee/claims/screens/claims_screen.dart` | More -> Claims | Expense reimbursement claim requests | New Claim modal, Receipt photo upload, Amount input, Claim history | `SupabaseMoreModulesRepository` |
| 10 | `features/employee/communication/screens/communication_screen.dart` | More -> Broadcasts | Company broadcasts & alerts | Announcement feed, Unread badges, Mark as read | `SupabaseEmployeeRelationsRepository` |
| 11 | `features/employee/documents/screens/documents_screen.dart` | More -> Documents | Employee document vault & uploads | Upload Document button, File picker, Verification badge, View PDF | `SupabaseEmployeeRepository`, `DocumentUploadService` |
| 12 | `features/employee/grievance/screens/grievance_screen.dart` | More -> POSH & Grievance | POSH / Grievance case filing & tracking | Anonymous toggle, Case description, Severity picker, Incident history | `SupabaseMoreModulesRepository` |
| 13 | `features/employee/helpdesk/screens/helpdesk_screen.dart` | More -> Helpdesk | IT / HR support ticket creation & chat | Create Ticket modal, Category dropdown, Priority picker, Thread view | `SupabaseMoreModulesRepository` |
| 14 | `features/employee/letters/screens/letters_screen.dart` | More -> Letters | Official HR letters (Offer, Promotion) | Letter cards, Preview PDF, Download button | `SupabaseMoreModulesRepository` |
| 15 | `features/employee/performance/screens/performance_screen.dart` | More -> Performance | Appraisal cycles, Goals & Reviews | Goal progress sliders, Self-appraisal form, Rating summary | `SupabaseMoreModulesRepository` |
| 16 | `features/employee/roster/screens/roster_screen.dart` | More -> Shift Roster | Weekly / Monthly work schedule & shifts | Shift calendar, Shift swap request, Timing details | `SupabaseAttendanceRepository` |
| 17 | `features/employee/virtual_id/screens/virtual_id_screen.dart` | More -> Digital ID | Digital employee badge & QR code | Employee photo, Designation, QR code, Department, Org branding | `SupabaseEmployeeRepository` |
| 18 | `features/employee/services/screens/service_catalog_screen.dart` | More -> Services | Internal HR service request portal | Category tabs, Request modal, Dynamic input fields | `SupabaseMoreModulesRepository` |
| 19 | `features/profile/screens/edit_profile_screen.dart` | Profile -> Edit | Profile editing (Phone, Address, Contact) | Phone input, Address fields, Emergency contact form, Save button | `SupabaseEmployeeRepository` |
| 20 | `features/profile/screens/bank_details_screen.dart` | Profile -> Bank & Statutory | Bank account & PAN / Aadhaar viewer | Account number, Bank name, IFSC, PAN, UAN, ESI fields | `SupabaseEmployeeRepository` |
| 21 | `features/profile/screens/security_settings_screen.dart` | Profile -> Security | Password change, Biometric login toggle | Current password, New password, FaceID / Fingerprint switch | `SupabaseAuthRepository` |
| 22 | `features/employee/attendance/screens/regularization_screen.dart` | Attendance -> Regularize | Attendance regularization requests | Date picker, Missing punch time, Reason dropdown, Submit button | `SupabaseAttendanceRepository` |
| 23 | `features/employee/leave/screens/apply_leave_modal.dart` | Leave -> Apply | Apply for Leave dialog | Leave type picker, Date range, Total days count, Reason text | `SupabaseLeaveRepository` |
| 24 | `features/employee/claims/screens/new_claim_modal.dart` | Claims -> New Claim | Expense claim creation dialog | Expense type, Date, Amount input, Bill attachment picker | `SupabaseMoreModulesRepository` |
| 25 | `features/employee/helpdesk/screens/new_ticket_modal.dart` | Helpdesk -> New Ticket | Support ticket creation dialog | Department target, Subject input, Description, Attachment | `SupabaseMoreModulesRepository` |
| 26 | `features/employee/documents/screens/upload_document_modal.dart` | Documents -> Upload | Document upload drawer | Document type picker, Document number, File selector, Upload action | `SupabaseEmployeeRepository` |
| 27 | `features/employee/performance/screens/goal_update_modal.dart` | Performance -> Update Goal | Update goal progress dialog | Progress slider (0-100%), Status dropdown, Comment input | `SupabaseMoreModulesRepository` |
| 28 | `features/employee/home/screens/notification_center_screen.dart` | Home -> Bell Icon | Notification center feed | Notification list, Filter (All/Unread), Clear all action | `SupabaseNotificationRepository` |

---

## 3. Data Models Inventory (`flutter_app/lib/models/`)

1. **`employee_models.dart`** (28.2 KB):
   - `EmployeeProfile`, `EmployeeAddress`, `EmployeeBankDetails`, `EmployeeStatutoryDetails`, `EmployeeEmergencyContact`, `EmployeeAvatarAsset`
2. **`hrms_models.dart`** (19.7 KB):
   - `AttendancePunchModel`, `AttendanceDailyModel`, `AttendanceRegularizationModel`, `LeaveRequestModel`, `LeaveBalanceModel`, `LeaveTypeModel`, `PayslipSummaryModel`, `PayslipBreakdownModel`, `ShiftScheduleModel`
3. **`employee_relations_models.dart`** (13.7 KB):
   - `AnnouncementModel`, `CommunicationBroadcastModel`, `HelpdeskTicketModel`, `HelpdeskMessageModel`, `GrievanceCaseModel`, `ServiceRequestModel`, `DigitalLetterModel`, `ExpenseClaimModel`, `PerformanceGoalModel`
4. **`app_services_catalog.dart`** (4.0 KB):
   - `AppServiceItem`, `AppServiceCategory`, `AppServicesRegistry`

---

## 4. Repositories & Services Inventory (`flutter_app/lib/repositories/` & `flutter_app/lib/core/services/`)

### Repositories (9 modules):
- `supabase_auth_repository.dart` — Authentication, session lifecycle, token refresh
- `supabase_employee_repository.dart` — Profile, addresses, bank, statutory details, document vault
- `supabase_attendance_repository.dart` — Punch in/out, geofenced tracking, timesheets, regularization
- `supabase_leave_repository.dart` — Balances, leave applications, approval history
- `supabase_more_modules_repository.dart` — Payslips, claims, helpdesk, letters, grievance, LMS, performance
- `supabase_notification_repository.dart` — In-app notifications, FCM push token syncing
- `supabase_employee_relations_repository.dart` — Announcements, company communications, engagement
- `interfaces/auth_repository.dart` — Abstract contract for auth
- `interfaces/employee_repository.dart` — Abstract contract for employee operations

### Core Services (26 modules):
- `attendance_service.dart`, `attendance_time_service.dart`, `location_service.dart`, `shift_duration_calculator.dart`
- `document_upload_service.dart`, `file_pick_service.dart`, `file_download_service.dart`, `payslip_pdf_service.dart`
- `employee_identity_resolver.dart`, `employee_profile_mapper.dart`, `user_service.dart`, `sensitive_data_auth_service.dart`
- `push_notification_service.dart`, `push_sender_service.dart`, `local_notification_store.dart`, `notification_realtime_service.dart`, `employee_realtime_service.dart`
- `crash_reporting_service.dart`, `media_compression_service.dart`, `avatar_service.dart`, `realtime_outbox_service.dart`
