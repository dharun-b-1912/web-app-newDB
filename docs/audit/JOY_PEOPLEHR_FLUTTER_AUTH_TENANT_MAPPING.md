# JOY PeopleHR — Flutter Authentication & Multi-Tenant Mapping

**Target Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Flutter App:** `workforce_os`  
**Date:** 2026-09-04  

---

## 1. Authentication Architecture & Flow

```
┌───────────────────────────┐
│     Flutter Login UI      │ -> email, password
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  SupabaseAuthRepository   │ -> supabase.auth.signInWithPassword(email, password)
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│       GoTrue Auth         │ -> Returns JWT session with sub = auth.uid()
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│   public.user_profiles    │ -> Fetches user_profiles WHERE id = auth.uid()
└─────────────┬─────────────┘    (Resolves organization_id, phone, email)
              │
              ▼
┌───────────────────────────┐
│     public.user_roles     │ -> Fetches user_roles WHERE user_id = auth.uid()
└─────────────┬─────────────┘    (Resolves EMPLOYEE / MANAGER role_id)
              │
              ▼
┌───────────────────────────┐
│     public.employees      │ -> Fetches employees WHERE user_id = auth.uid()
└───────────────────────────┘    (Resolves employee_id for all domain tables)
```

---

## 2. Entity Identity Resolution Rules

1. **`auth.users.id` (Auth UID):**
   - Issued by Supabase GoTrue Auth.
   - Primary key for `public.user_profiles.id`.
   - Never used directly as `employee_id`.

2. **`user_profiles.id` & `user_profiles.organization_id`:**
   - `id = auth.uid()`.
   - `organization_id` provides the authoritative tenant boundary for all subsequent queries.

3. **`employees.id` (Employee UID):**
   - The authoritative entity key for all employee business operations (`attendance_punches`, `leave_requests`, `payroll_line_items`, `employee_documents`).
   - Resolved by matching `public.employees.user_id = auth.uid()` or `public.employees.work_email = session.user.email`.

---

## 3. Tenant Boundary Enforcement in Flutter

- **Rule 1:** Every query to Supabase MUST be scoped by the resolved `organization_id` (either explicitly or via PostgreSQL RLS `get_active_user_org_id()`).
- **Rule 2:** Flutter must NOT invent fallback hardcoded UUIDs (`'00000000-0000-0000-0000-000000000000'` or `'default-org'`).
- **Rule 3:** SharedPreferences is strictly a cache for offline UX; it must be refreshed from `user_profiles` upon every fresh login.
