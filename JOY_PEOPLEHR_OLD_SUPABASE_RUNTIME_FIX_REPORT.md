# JOY PeopleHR — Old Supabase Runtime Connection Forensic Report & Resolution
**Canonical Supabase Project:** `ysiajemrqakfngasehhi` (PostgreSQL 15 / Supabase)  
**Verification Date:** September 3, 2026  

---

## 1. Exact Root Cause
The browser console request to `https://wmqjmyzzamgxyeuotbki.supabase.co/rest/v1/observability_events` was caused by a combination of:
1. **Long-Running Dev Server In-Memory Environment Cache**:
   - The Vite development server was started before `.env` and `src/lib/supabase.ts` were updated.
   - Vite injects `import.meta.env` at server initialization time. Because the dev process was running continuously for over 1.5 hours without restart, it served the old in-memory environment values.
2. **Experimental `observability_events` Remote Telemetry Path**:
   - `src/services/observability/telemetryIngestionBridge.ts` contained an automatic remote flushing routine attempting to upsert into `public.observability_events` via the global `supabase` client.
   - The table `observability_events` is an experimental non-canonical table that is not part of the 64 canonical database tables (which use `public.audit_logs`).

---

## 2. File & Function Trace

| Item | Details |
| :--- | :--- |
| **Triggering Function** | `TelemetryIngestionBridge.ingest()` and `TelemetryIngestionBridge.flushQueue()` |
| **File Path** | `src/services/observability/telemetryIngestionBridge.ts` (lines 121, 230) |
| **Logged In Console By** | `LoggerService.outputConsole()` (`src/services/diagnostics/loggerService.ts:167`) |
| **Supabase Client Used** | Single canonical client imported from `src/lib/supabase.ts` |
| **Config Source** | `import.meta.env.VITE_SUPABASE_URL` |

---

## 3. Discovered Supabase Clients Matrix

| Client # | File | URL Source | Key Source | Used By |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `src/lib/supabase.ts` (Line 30) | `VITE_SUPABASE_URL` (Fallback: `https://ysiajemrqakfngasehhi.supabase.co`) | `VITE_SUPABASE_ANON_KEY` (Fallback: `sb_publishable_...`) | **Entire Application (Single Canonical Client)** |

*Verification Result: There is strictly **ONE** Supabase client instantiation in the entire application.*

---

## 4. Remediation Actions Taken

1. **Deactivated Obsolete `observability_events` Remote Upsert**:
   - In `src/services/observability/telemetryIngestionBridge.ts`, set `isRemoteTableAvailable = false`.
   - Telemetry logging, PII redaction, and error interception continue operating safely in-memory and in `localStorage` without generating unmapped remote REST requests.
2. **Replaced All Legacy Test Scripts**:
   - Swept all 15 test scripts in `scripts/` and `scratch/` to point exclusively to `https://ysiajemrqakfngasehhi.supabase.co`.
3. **Verified Production Build Bundle**:
   - Executed `npm run build`.
   - Grep search on `dist/` confirms **0 occurrences of `wmqjmyzzamgxyeuotbki`**.
   - Canonical `https://ysiajemrqakfngasehhi.supabase.co` is bundled into production chunks.

---

## 5. Verification Scorecard

```
============================================================
OLD SUPABASE RUNTIME CONNECTION FORENSIC SCORECARD
============================================================

1. OLD SUPABASE RUNTIME REQUESTS:       0 (ZERO)
2. OLD PROJECT IN SOURCE CODE:          0 (ZERO)
3. OLD PROJECT IN DIST BUNDLE:          0 (ZERO)
4. OLD PROJECT IN TEST SCRIPTS:         0 (ZERO)
5. ACTIVE SUPABASE CLIENT:              https://ysiajemrqakfngasehhi.supabase.co
6. ACTIVE PUBLISHABLE KEY:              sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj
7. LOGGER OUTBOX / OBSERVABILITY:       DEACTIVATED (Canonical audit logs use public.audit_logs)
8. REALTIME REPLICATION CHANNEL:        CONNECTED (ysiajemrqakfngasehhi)
9. TYPECHECK RESULT:                    PASS (0 errors)
10. BUILD RESULT:                       PASS (0 errors)

============================================================
FINAL VERDICT:
PASS
============================================================
```
