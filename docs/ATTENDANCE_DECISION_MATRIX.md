# JOY PeopleHR — Attendance Decision Matrix
**Deterministic Evaluation Rules for All Clocking Events**

---

## 1. Complete Decision Result Codes

| Decision Result Code | Description | Attendance Effect | Live Stream Badge |
| :--- | :--- | :--- | :--- |
| **`ACCEPTED_CHECK_IN`** | First valid clocking event of the workday | Initializes daily session, locks source | `ACCEPTED` (Emerald) |
| **`ACCEPTED_IN_SESSION`** | Subsequent in-shift punch (e.g. Face after Fingerprint) | Raw event recorded, session remains Checked In | `IN SESSION` (Blue) |
| **`ACCEPTED_CHECK_OUT`** | First valid eligible checkout punch | Sets `last_out_at`, stops timer, computes net hours | `CHECKED OUT` (Blue) |
| **`UPDATED_LAST_OUT`** | Later exit punch following previous checkout | Updates `last_out_at` to latest punch (Last-Out Rule) | `UPDATED EXIT` (Indigo) |
| **`DUPLICATE`** | Repeated event within debounce window or identical hash | Suppressed from recalculation, preserved in audit | `DUPLICATE` (Gray) |
| **`IGNORED_SOURCE_LOCK`** | Event arrived from channel other than locked source | Preserved in raw device logs, attendance unchanged | `IGNORED (LOCKED)` (Amber) |
| **`IGNORED_ALREADY_CHECKED_IN`**| User attempted explicit check-in when session is active | Notifies user of existing check-in, 0 duplicates | `ALREADY IN` (Amber) |
| **`IGNORED_ALREADY_CHECKED_OUT`**| User attempted explicit checkout when already checked out| Re-affirms completed status, 0 duplicate checkouts | `ALREADY OUT` (Gray) |
| **`UNMAPPED_USER`** | Device PIN not linked to any active employee record | Stored in audit, triggers mapping notification | `UNMAPPED` (Rose) |
| **`ERROR`** | Tenant boundary mismatch or corrupted data | Rejected at ingestion boundary | `ERROR` (Red) |

---

## 2. Event Evaluation Decision Table

```
Event Ingestion
  │
  ├─► [Tenant ID Mismatch?]
  │      └─► YES: ERROR (Tenant boundary protection)
  │
  ├─► [Device PIN Mapped to Employee?]
  │      └─► NO:  UNMAPPED_USER (Stored in audit, no attendance session created)
  │
  ├─► [Rapid Duplicate (<3s or identical event hash)?]
  │      └─► YES: DUPLICATE (Suppressed from session recalculation)
  │
  ├─► [Active Session Exists for Today?]
  │      ├─► NO:
  │      │     └─► ACCEPTED_CHECK_IN (Initializes session, sets source lock)
  │      │
  │      └─► YES:
  │            ├─► [Explicit Check-In Intent?]
  │            │      └─► YES: IGNORED_ALREADY_CHECKED_IN
  │            │
  │            ├─► [Incoming Source != Active Locked Source?]
  │            │      └─► YES: IGNORED_SOURCE_LOCK (Audited, attendance untouched)
  │            │
  │            └─► [Incoming Source == Active Locked Source]
  │                   ├─► [Eligible for Check-Out? (Explicit OUT / >240m / Shift End)]
  │                   │      ├─► NO:  ACCEPTED_IN_SESSION (Session remains Checked In)
  │                   │      └─► YES:
  │                   │            ├─► [First Check-Out?]
  │                   │            │      └─► YES: ACCEPTED_CHECK_OUT
  │                   │            └─► [Subsequent Later Exit?]
  │                   │                   └─► YES: UPDATED_LAST_OUT (Last-Out Rule)
  │                   │
  │                   └─► [Already Checked Out & Explicit Checkout Intent?]
  │                          └─► YES: IGNORED_ALREADY_CHECKED_OUT
```

---

## 3. Shift & Checkout Window Eligibility Rules

An incoming biometric event is classified as an **Eligible Checkout Event** if and only if:
1. **Explicit Direction:** The hardware terminal or user payload explicitly flags direction as `OUT` (`punch_state = 1` or `punchDirection = 'OUT'`), OR
2. **Shift Completion Window:** The current timestamp is within the scheduled checkout window (`shift.end_time` minus early tolerance, e.g. `>= 17:50` on an 18:00 shift), OR
3. **Minimum Work Duration:** At least 240 minutes (4 hours / half-day minimum) have elapsed since `first_in_at`.

Any biometric event occurring prior to checkout eligibility (e.g., Face recognition at `09:05 AM` following Fingerprint at `08:52 AM`) is classified as `ACCEPTED_IN_SESSION` — keeping the employee in the `CHECKED_IN` / `WORKING` state without closing the session.
