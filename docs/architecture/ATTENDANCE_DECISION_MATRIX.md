# JOY PeopleHR — Attendance Decision Matrix

## 1. Multi-Channel Event Resolution Matrix

| Current State | Inbound Source | Inbound Method | Action / Evaluation | Decision Code | Session Effect | Mobile Timer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **No Active Session** | BIOMETRIC | Fingerprint | First valid event -> Create Session, Lock to BIOMETRIC | `ACCEPTED_CHECK_IN` | `first_in_at` = event time, `status` = CHECKED_IN | Starts running automatically |
| **No Active Session** | BIOMETRIC | Face | First valid event -> Create Session, Lock to BIOMETRIC | `ACCEPTED_CHECK_IN` | `first_in_at` = event time, `status` = CHECKED_IN | Starts running automatically |
| **No Active Session** | BIOMETRIC | RFID | First valid event -> Create Session, Lock to BIOMETRIC | `ACCEPTED_CHECK_IN` | `first_in_at` = event time, `status` = CHECKED_IN | Starts running automatically |
| **No Active Session** | MOBILE | GPS App | First valid event -> Create Session, Lock to MOBILE | `ACCEPTED_CHECK_IN` | `first_in_at` = event time, `status` = CHECKED_IN | Starts running |
| **Active (MOBILE)** | BIOMETRIC | Fingerprint | Source locked to MOBILE -> Audit only | `IGNORED_SOURCE_LOCK` | Preserved as raw audit, Session unchanged | Continues running |
| **Active (MOBILE)** | BIOMETRIC | Face | Source locked to MOBILE -> Audit only | `IGNORED_SOURCE_LOCK` | Preserved as raw audit, Session unchanged | Continues running |
| **Active (MOBILE)** | BIOMETRIC | RFID | Source locked to MOBILE -> Audit only | `IGNORED_SOURCE_LOCK` | Preserved as raw audit, Session unchanged | Continues running |
| **Active (BIOMETRIC)** | MOBILE | GPS App | Source locked to BIOMETRIC -> Duplicate blocked | `IGNORED_SOURCE_LOCK` | Shows "Already Checked In via Biometric" | Continues running |
| **Active (BIOMETRIC)** | BIOMETRIC | Face (< 5 mins) | Within check-in debounce window | `DUPLICATE` | Raw logged, No premature checkout | Continues running |
| **Active (BIOMETRIC)** | BIOMETRIC | Face (> 5 mins) | Eligible checkout event -> Record Last-Out | `ACCEPTED_CHECK_OUT` / `UPDATED_LAST_OUT` | `last_out_at` = event time, `status` = CHECKED_OUT | Stops timer |
| **Active (MOBILE)** | MOBILE | GPS App | Explicit Checkout button pressed | `ACCEPTED_CHECK_OUT` | `last_out_at` = event time, `status` = CHECKED_OUT | Stops timer |
| **Any** | ANY | Any | Identical event ID / timestamp (< 3s) | `DUPLICATE` | Audit logged, No duplicate records | Unchanged |
| **Any** | BIOMETRIC | Unknown PIN | PIN not mapped to any active employee | `UNMAPPED_USER` | Raw event logged, No fake employee created | Unchanged |

---

## 2. Policy Override Modes

1. **`LOCK_FIRST_SOURCE` (Default Enterprise Standard)**:
   - The channel (Mobile or Biometric) that initiates the day owns the attendance lifecycle.
   - Secondary channel punches are recorded in raw diagnostic logs as `IGNORED_FOR_SOURCE_LOCK`.
2. **`ALLOW_CROSS_CHANNEL` (Hybrid Factory Mode)**:
   - Mobile check-in can be paired with Biometric check-out or vice-versa under verified supervisor settings.
3. **`ADMIN_OVERRIDE`**:
   - HR Admin can manually adjust or regularize source with audited before/after records.
