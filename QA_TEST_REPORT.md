# JOY PeopleHR — QA Master Test Execution Report

## 1. Test Execution Metrics

| Category | Total Executed | Passed | Failed | Skipped | Pass Rate | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Flutter Unit & Widget Tests** | 92 | 92 | 0 | 0 | **100%** | 6.2s |
| **Master Attendance Engine (Vitest)**| 20 | 20 | 0 | 0 | **100%** | 29ms |
| **TypeScript Type Check** | Entire codebase | Clean | 0 | 0 | **100%** | 4.8s |
| **Flutter Static Analysis** | Entire codebase | Clean | 0 | 0 | **100%** | 13.4s |
| **Biometric ADMS Ingestion** | Live Device (TDBD253600550) | Ingested | 0 | 0 | **100%** | Realtime (<500ms) |

---

## 2. Tested Critical Invariants
- **Gate A (Single Session):** Face punch followed by RFID or Mobile updates the single daily attendance row without creating duplicate sessions.
- **Gate B (Source Locking):** Biometric punch locks mode to `BIOMETRIC`, starting mobile timer dynamically. Mobile check-in locks mode to `MOBILE`.
- **Gate C (Timer Continuity):** Terminating and restarting mobile app resumes the dynamic timer accurately from `first_check_in`.
- **Gate D (Tenant Isolation):** Queries across company boundaries return 0 rows.
