# JOY PeopleHR — Flutter Integration Critical Findings Log

**Target Application:** `workforce_os` (Flutter)  
**Target Canonical Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Decommissioned Old Project:** `wmqjmyzzamgxyeuotbki`  
**Date:** 2026-09-04  
**Audit & Remediation Status:** 100% RESOLVED / PASS  

---

## 1. Summary of Discovered & Remediated Issues

| Severity | Count | Summary | Remediation Status |
| :--- | :--- | :--- | :--- |
| **P0 (Blocker)** | **1** | Default Supabase URL in `env_config.dart` pointed to decommissioned project `wmqjmyzzamgxyeuotbki` | **RESOLVED** |
| **P1 (Critical)** | **4** | Legacy entity names in repository queries (`employee_bank_accounts`, `document_requirements`, `leave_entitlements`, `attendance_roster_entries`, `attendance_events`, `employee_payslips`) | **RESOLVED** |
| **P2 (Major)** | **2** | Standalone ticketing/announcement queries mapped to canonical `employee_requests`, `posh_and_grievance_cases`, and `notification_events` | **RESOLVED** |
| **P3 (Minor)** | **0** | Clean | **PASS** |
| **P4 (Info)** | **0** | Dev Auto-Login mechanism configured | **IMPLEMENTED** |

---

## 2. Granular Blocker Log & Resolution Proofs

### 1. P0: Decommissioned Supabase Reference in Flutter Config (RESOLVED)
- **File:** `flutter_app/lib/core/config/env_config.dart:15`
- **Remediation:** Updated default URL to `https://ysiajemrqakfngasehhi.supabase.co` with publishable key `sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj`.
- **Proof:** Zero active occurrences of `wmqjmyzzamgxyeuotbki` in Flutter code.

### 2. P1: Legacy Table References in Flutter Repositories (RESOLVED)
- **`employee_bank_accounts` -> `employee_bank_details`:** Realigned in `supabase_auth_repository.dart` and `employee_identity_resolver.dart`.
- **`document_requirements` -> `document_types` & `employee_documents`:** Realigned in `supabase_more_modules_repository.dart`.
- **`leave_entitlements` -> `leave_balances` + `leave_types`:** Realigned in `supabase_leave_repository.dart`.
- **`attendance_roster_entries` -> `employee_shift_assignments` + `shifts`:** Realigned in `supabase_more_modules_repository.dart`.
- **`attendance_events` -> `attendance_punches` & `attendance_daily`:** Realigned in `supabase_attendance_repository.dart`.
- **`attendance_regularization_requests` -> `attendance_regularizations`:** Realigned in `supabase_attendance_repository.dart`.
- **`employee_payslips` -> `payslips` + `payroll_line_items`:** Realigned in `supabase_more_modules_repository.dart`.

### 3. P2: Consolidated Request & Notification Routing (RESOLVED)
- **Helpdesk & Grievance Tickets:** Realigned to canonical `public.employee_requests` and `public.posh_and_grievance_cases`.
- **Announcements & Notifications:** Realigned to canonical `public.notification_events`.
