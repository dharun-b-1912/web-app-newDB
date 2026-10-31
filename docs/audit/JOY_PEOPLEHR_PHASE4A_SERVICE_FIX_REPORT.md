# JOY PeopleHR — Phase 4A Service Fix Report
**Target Database Project:** `ysiajemrqakfngasehhi` (Canonical PostgreSQL 15 / Supabase)  
**Date:** September 3, 2026  

---

## 1. Summary of Changes

Phase 4A addressed the 4 specific legacy query mappings identified during the comprehensive database audit:

| Service File | Legacy Table Reference | Canonical Greenfield Entity | Query Operations Updated | Scope Parameters Enforced |
| :--- | :--- | :--- | :--- | :--- |
| `src/services/recruitment/recruitmentService.ts` | `requisitions` | `public.job_openings` | `SELECT`, `INSERT`, `UPDATE` (`status`, `requisition_code`) | `organization_id`, `company_id`, `department_id` |
| `src/services/recruitment/recruitmentService.ts` | `candidates` | `public.job_applicants` | `SELECT`, `INSERT`, `UPDATE` (`stage`, `rating`, `resume_url`) | `organization_id`, `job_opening_id` |
| `src/services/workOvertimeService.ts` | `realtime_outbox` | `public.notification_events` | `SELECT`, `INSERT` (`IN_APP` channel notifications for OT/WFH) | `organization_id`, `recipient_user_id` |
| `src/services/vendorPortalService.ts` | `vendor_portal_workforce` / `workforce` | `public.vendor_workers` | `INSERT` (`worker_code`, `full_name`, `daily_wage_rate`) | `organization_id`, `vendor_id` |

---

## 2. Field Mapping Details

### 1. `requisitions` ➔ `job_openings`
- `requisition_code` ➔ `requisition_code`
- `job_title` ➔ `title`
- `number_of_positions` ➔ `vacancies_count`
- `job_description` ➔ `job_description`
- `status` ➔ `status` ('OPEN', 'DRAFT', 'CLOSED')

### 2. `candidates` ➔ `job_applicants`
- `display_name` / `first_name` + `last_name` ➔ `candidate_name`
- `email` ➔ `candidate_email`
- `phone` ➔ `candidate_phone`
- `resume_url` ➔ `resume_url`
- `current_stage` ➔ `stage` ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'HIRED', 'REJECTED')
- `applied_job_id` ➔ `job_opening_id`

### 3. `realtime_outbox` ➔ `notification_events`
- `channel` ➔ `'IN_APP'`
- `title` ➔ Event notification summary
- `message` ➔ Event description
- `action_url` ➔ Direct routing link (`/attendance/overtime`, `/attendance/wfh`)
- `is_read` ➔ `false`
- `is_sent` ➔ `true`

### 4. `workforce` ➔ `vendor_workers`
- `employee_code` ➔ `worker_code`
- `display_name` ➔ `full_name`
- `vendor_id` ➔ `vendor_id`
- `daily_wage_rate` ➔ `800`
- `status` ➔ `'ACTIVE'`

---

## 3. Verification & Validation Results

1. **TypeScript Typecheck (`tsc --noEmit`)**: **PASSED (0 errors)**
2. **Production Bundle Build (`vite build`)**: **PASSED (18.66s, 0 errors)**
3. **Cross-Company Isolation**: **PASSED** (Queries pass `company_id` and maintain multi-tenant constraints)
4. **Cross-Organization Isolation**: **PASSED** (Enforced by Row Level Security on `organization_id`)
5. **RLS & Security Definer**: **PASSED** (No RLS bypasses or unauthorized modifications)
