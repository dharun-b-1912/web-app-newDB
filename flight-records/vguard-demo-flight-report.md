# Flight Recorder Diagnostic Report: V-Guard Executive Demo Readiness E2E
Generated At: 2026-09-18T15:04:32.849Z

## 1. Journey Milestones
- [x] **01. Application loads** (2026-09-18T15:04:10.876Z)
- [x] **02. Direct credentials entered** (2026-09-18T15:04:11.033Z)
- [x] **03. Authentication submitted** (2026-09-18T15:04:11.237Z)
- [x] **04. Executive Dashboard loaded** (2026-09-18T15:04:24.713Z)
- [x] **05. Employee Directory loaded** (2026-09-18T15:04:26.886Z)
- [x] **09. Attendance Workspace loaded** (2026-09-18T15:04:29.065Z)
- [x] **11. Payroll & Statutory loaded** (2026-09-18T15:04:30.935Z)
- [x] **13. Reports & Analytics loaded** (2026-09-18T15:04:32.738Z)

## 2. Uncaught JS Exceptions & Page Errors
✓ None detected

## 3. Console Errors
- ❌ `Failed to load resource: the server responded with a status of 400 ()`

## 4. Failed Network Requests (4xx / 5xx / Network Errors)
- 🔴 `POST https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password` -> Status: 400 (HTTP Error)
- 🔴 `HEAD https://ysiajemrqakfngasehhi.supabase.co/rest/v1/leave_requests?select=id&status=eq.PENDING&limit=1` -> Status: N/A (net::ERR_ABORTED)
- 🔴 `HEAD https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employee_documents?select=id&verification_status=eq.PENDING&limit=1` -> Status: N/A (net::ERR_ABORTED)

## 5. Slow API Requests (> 1500ms)
- ⏱️ `POST https://ysiajemrqakfngasehhi.supabase.co/auth/v1/token?grant_type=password` -> 11077ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/organizations?select=*&limit=1` -> 11840ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/leave_requests?select=*&order=created_at.desc` -> 11869ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/organizations?select=*&limit=1` -> 12279ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/departments?select=*` -> 2047ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_daily?select=*&attendance_date=eq.2026-09-18` -> 2079ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/attendance_punches?select=employee_id%2Cpunch_type%2Cverification_mode%2Cpunch_source%2Cdevice_id%2Cpunch_time&order=punch_time.asc&punch_time=gte.2026-09-17T10%3A00%3A00.000Z&punch_time=lte.2026-09-19T13%3A59%3A59.000Z` -> 1611ms
- ⏱️ `GET https://ysiajemrqakfngasehhi.supabase.co/rest/v1/employees?select=id%2Cemployee_code%2Cfirst_name%2Clast_name%2Cdisplay_name%2Cavatar_url` -> 1608ms