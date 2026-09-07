# JOY PeopleHR — Forensic Audit Critical Findings Log

**Date:** 2026-09-03  
**Target Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Scope:** Complete End-to-End UI → Service → Database Mapping Audit  

---

## 1. Summary of Classified Findings

| Priority | Category | Count | Status | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | Security / Data Isolation Blockers | **0** | **CLEAN** | Tenant isolation strictly enforced via RLS (`024_rls.sql`) and `auth.uid()` session scopes. |
| **P1** | Onboarding / Persistent Write Blockers | **1** | **IDENTIFIED** | Supabase Auth email confirmation setting (`Confirm email: ON`) prevents password sign-in until confirmed or disabled. |
| **P2** | Functional / Column Mismatch Defect | **0** | **CLEAN** | All attendance queries mapped to canonical column `attendance_date`. 400/404 runtime errors eliminated. |
| **P3** | UX / Zero-State Data Quality | **0** | **CLEAN** | Empty-state handlers implemented across all modules returning safe `[]` and zero metrics without failing REST calls. |
| **P4** | Technical Debt / Legacy References | **0** | **CLEAN** | Active source code contains 0 queries to decommissioned project (`wmqjmyzzamgxyeuotbki`) and 0 queries to non-canonical tables. |

---

## 2. Detailed Findings Breakdown

### [P1-01] Supabase Auth Email Confirmation Requirement on Greenfield Project
- **Severity:** P1 (Onboarding Blocker)
- **Component:** `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`
- **Description:** When a new user account is registered on project `ysiajemrqakfngasehhi`, Supabase GoTrue rejects login with `AuthApiError: Email not confirmed` because "Confirm email" is enabled in Supabase Authentication settings.
- **Evidence:** `scripts/e2e_phase52_live_onboarding.mjs` (status 400, code: `email_not_confirmed`).
- **Remediation:** Toggle "Confirm email" to OFF in Supabase Dashboard (Authentication -> Providers -> Email).
