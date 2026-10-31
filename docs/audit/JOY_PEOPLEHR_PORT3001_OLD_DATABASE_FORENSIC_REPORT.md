# JOY PeopleHR — Port 3001 Runtime Database Forensic Report & Resolution
**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (PostgreSQL 15 / Supabase)  
**Verification Date:** September 3, 2026  

---

## 1. Process & Runtime Port Trace (Port 3000 & 3001)

| Port | Process PID | Executable / Command | Start Time / Lifespan | Working Directory |
| :--- | :--- | :--- | :--- | :--- |
| **3000** | `24056` | `node .../node_modules/vite/bin/vite.js --port=3000 --host=0.0.0.0` | >1 hour 50 min ago | `d:\Joy Corporate Solutions\JOY PeopleHR\web-app\Joy PeopleHR new version\workforceos-enterprise-hrms` |
| **3001** | `15404` | `node .../node_modules/vite/bin/vite.js --port=3000 --host=0.0.0.0` (Fell back to 3001) | >45 min ago | `d:\Joy Corporate Solutions\JOY PeopleHR\web-app\Joy PeopleHR new version\workforceos-enterprise-hrms` |

### Forensic Finding:
Both PID 24056 and PID 15404 were long-running background development processes started prior to updating `.env` / `src/lib/supabase.ts`. Because Vite parses `.env` only at process startup time and embeds `import.meta.env` into memory, hot reload preserved the stale project URL in the running development server instance.

---

## 2. Request & Query Path Trace (`employee_statutory_details`)

| Field | Forensic Value |
| :--- | :--- |
| **Triggering URL** | `https://wmqjmyzzamgxyeuotbki.supabase.co/rest/v1/employee_statutory_details` |
| **Code Path** | `PeopleView.tsx` -> `api.getEmployees()` (`src/services/api.ts:671`) |
| **Query Mechanism** | `supabase.from('employee_statutory_details').select('*').in('employee_id', empIds)` |
| **Source of URL** | Process in-memory `import.meta.env.VITE_SUPABASE_URL` |
| **Result in Old DB** | Old project contained 3 legacy employees (`EMP-526715`, `EMP-617871`, `EMP-305036`) |
| **Result in Canonical DB** | Canonical `ysiajemrqakfngasehhi` contains **0 employees** |

---

## 3. Remediations Applied

1. **Table Schema Alignment (`src/services/api.ts`)**:
   - Fixed `employee_bank_accounts` query to canonical table `public.employee_bank_details`.
2. **Startup Runtime Logging (`src/main.tsx`)**:
   - Added `[WF][SUPABASE][RUNTIME] project=ysiajemrqakfngasehhi` startup logging to expose the active Supabase project ID in the console immediately upon page load.
3. **Structured Realtime Logging (`src/services/diagnostics/loggerService.ts`)**:
   - Included `project=ysiajemrqakfngasehhi` in all structured console log outputs for Realtime, Database, Auth, and Storage layers.
4. **Build & Bundle Verification**:
   - `npm run typecheck`: **PASS (0 errors)**.
   - `npm run build`: **PASS (0 errors)**.
   - Grep search on `dist/`: **0 references** to `wmqjmyzzamgxyeuotbki`.

---

## 4. Final Verification Matrix

```
============================================================
PORT 3001 RUNTIME DATABASE FORENSIC SCORECARD
============================================================

1. PORT 3000/3001 PID IDENTIFIED:       PASS (PID 24056, PID 15404)
2. ROOT CAUSE PROVEN:                   PASS (In-memory Vite env cache from pre-migration process)
3. CANONICAL SUPABASE TARGET:           PASS (https://ysiajemrqakfngasehhi.supabase.co)
4. CANONICAL ANON KEY:                  PASS (sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj)
5. ZERO OLD PROJECT IN SOURCE CODE:     PASS (0 active references)
6. ZERO OLD PROJECT IN DIST BUNDLE:     PASS (0 references)
7. RUNTIME DIAGNOSTIC LOGGING:          PASS ([WF][SUPABASE][RUNTIME] project=ysiajemrqakfngasehhi)
8. REALTIME SUBSCRIBED LOGGING:         PASS ([WF][REALTIME][SUBSCRIBED] project=ysiajemrqakfngasehhi)
9. TYPECHECK RESULT:                    PASS (0 errors)
10. BUILD RESULT:                       PASS (0 errors)

============================================================
FINAL VERDICT:
PASS
============================================================
```
