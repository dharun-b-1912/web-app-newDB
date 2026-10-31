# JOY PeopleHR — Data Source Forensic Audit Report
**Target Database Project:** `ysiajemrqakfngasehhi` (Canonical PostgreSQL 15 / Supabase)  
**Audit Date:** September 3, 2026  
**Application Origin Tested:** `http://localhost:3000`  

---

============================================================
DATA SOURCE FORENSIC RESULT
============================================================

SUPABASE PROJECT:
ysiajemrqakfngasehhi

DATABASE EMPLOYEE COUNT:
0

DATABASE ACTIVE EMPLOYEE COUNT:
0

DASHBOARD ACTIVE WORKFORCE:
3

DASHBOARD NEW JOINERS:
3

DASHBOARD ATTENDANCE:
1

============================================================

SOURCE OF DISPLAYED EMPLOYEE DATA:

LOCAL STORAGE (Client-Side Cached State from previous browser session)

============================================================

CURRENT COMPANY:
Joy Corporate Solutions Private Ltd

CURRENT COMPANY ID:
comp-joy-01 (Default initial client context ID)

CURRENT ORGANIZATION ID:
org-joy-01 (Default initial tenant context ID)

COMPANY FILTER:
PASS (Direct SQL query applies `.eq('company_id', companyId)`)

============================================================

OLD DATABASE REFERENCE:
NOT FOUND (Legacy project wmqjmyzzamgxyeuotbki is completely absent from code and environment)

OLD SUPABASE PROJECT REFERENCE:
NOT FOUND

============================================================

CACHE:

LOCAL STORAGE:
FOUND (Keys: `workforce_employees`, `workforce_active_company`, `workforce_active_organization`)

SESSION STORAGE:
NOT FOUND

INDEXEDDB:
NOT FOUND

REACT QUERY:
NOT FOUND

ZUSTAND:
NOT FOUND

REDUX:
NOT FOUND

SERVICE WORKER:
NOT FOUND

============================================================

ROOT CAUSE:

1. The new PostgreSQL database `ysiajemrqakfngasehhi` is 100% clean and contains 0 rows across `employees`, `companies`, and `organizations`.
2. The browser running on `localhost:3000` retained the client-side `localStorage` key (`workforce_employees`) from your earlier browser usage.
3. During initial page render, `src/services/api.ts` uses an offline-resilience pattern (`getEmployeesSync`) to serve data from `localStorage.getItem('workforce_employees')` while the asynchronous Supabase query executes.
4. When the asynchronous query `supabase.from('employees').select('*').eq('company_id', 'comp-joy-01')` completes against `ysiajemrqakfngasehhi`, it returns 0 rows (`[]`).
5. Because 0 rows are returned from the empty database, the UI does not receive new database records to overwrite the initial local cache, leaving the 3 cached employees ("Dharun B", "Danya R", "Thirumalai R K") visible in the component state.

============================================================

RECOMMENDED FIX:

1. When Supabase returns an authoritative empty array `[]` (confirming 0 employees exist in the connected company), immediately clear stale local cache `localStorage.removeItem('workforce_employees')` so the UI accurately displays 0 active workforce and prompts the user to add their first employee.
2. Ensure `getEmployeesSync()` returns an empty array `[]` whenever Supabase is enabled and verified connected.

============================================================

CRITICAL ISSUES:
0

HIGH ISSUES:
0

MEDIUM ISSUES:
1 (Client-side offline fallback retaining stale local records when remote DB returns empty set)

============================================================
