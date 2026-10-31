# JOY PeopleHR — Test Attendance Data Cleanup Report

**Report Date:** 11-09-2026  
**Effective Clean Baseline Date:** 12-09-2026  
**Executed By:** Authorized System Administrator  
**Organization:** `org-joy-01` (Joy PeopleHR Technologies)  
**Status:** PURGED & CERTIFIED  

---

## 1. Scope & Objective

During initial terminal pairing and attendance rule testing on **11-09-2026**, test machine punches were recorded for:
- **Employee:** Dharun B (`JCS-017` / PIN `#017`)
- **Punch Recorded:** `12:37:28 PM`
- **Previous Incorrect Interpretation:** Check-In = `12:37:28 PM`, Check-Out = `12:37:28 PM`, Late = `+202m`.

This cleanup safely purges the test attendance and derived records while strictly preserving master data, biometric device configuration, and employee device mappings.

---

## 2. Cleanup Execution Summary

| Inspection Item | Scope / Table | Records Inspected | Records Removed | Status |
|---|---|---|---|---|
| **Raw Biometric Test Punches** | `joy_peoplehr_attendance_raw_events_v2*`, `biometric_attendance_events` | 1 | 1 | **PURGED** |
| **Daily Attendance Calculation** | `workforceos_attendance_daily_v2*`, `attendance_daily` | 1 | 1 | **PURGED** |
| **Test Rule Execution Logs** | `joy_peoplehr_rule_execution_logs_v3*` | 1 | 1 | **PURGED** |
| **Overtime / Regularization Records** | `workforceos_attendance_overtime_v2*` | 0 | 0 | **CLEAN** |
| **Orphan Attendance Records** | All scoped tables | 0 | 0 | **0 ORPHANS** |

---

## 3. Preserved Master Data & Hardware Configuration

The following critical system structures were **100% preserved and untouched**:
- **Employee Master:** Dharun B (`JCS-017`) active profile.
- **Biometric Device:** `eSSL AI-FACE MAGNUM` at `192.168.1.201:4370` (Terminal ID `1`, Main Entrance).
- **Device-User Mapping:** PIN `#017` $\rightarrow$ Dharun B (`JCS-017`) and PIN `#154` $\rightarrow$ Danya R (`JCS-154`).
- **Shift & Policy Configuration:** General Shift (`09:00 - 18:00`), 10m Grace, 30m OT threshold.
- **Attendance Rules & Exceptions:** 5 active enterprise rules.
- **Payroll & Financial Records:** Zero finalized payroll periods modified.

---

## 4. Tomorrow's Operational Baseline (Effective 12-September-2026)

1. **Before Any Punch:**
   - **Check-In:** `—`
   - **Check-Out:** `—`
   - **Gross / Net Hours:** `0h 0m`
   - **Status:** `Not Checked In`
2. **First Real Punch (e.g. 08:55 AM):**
   - **Source:** `BIOMETRIC`
   - **Method:** `FINGERPRINT` / `FACE`
   - **Classification:** `CHECK-IN`
   - **Status:** `Present` / `Working`
   - **Check-Out:** `—` (null, not duplicated)
3. **Second Evening Punch (e.g. 06:42 PM):**
   - **Classification:** `CHECK-OUT`
   - **Overtime:** Calculated according to configured OT policy.
