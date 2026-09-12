# JOY PeopleHR — Unified Multi-Mode Attendance Architecture
**One Employee = One Attendance Session Per Working Day**
*Authoritative Single-Session Model • Source Lock • Modality Deduplication • Concurrency Protection*

---

## 1. Executive Summary & Golden Rules

In enterprise workforce management, employees interact with multiple clocking channels across a single day:
- **Biometric Terminals** (eSSL AI-FACE MAGNUM via Face, Fingerprint, RFID / Proximity Card, PIN)
- **Mobile GPS Application** (Geofenced mobile check-in/out with live working timer)
- **Manual HR / Admin Regularization**

### The Fundamental Golden Rules

1. **One Employee + One Working Day = One Authoritative Attendance Session:**
   Under no circumstances does an additional device punch or mobile clocking create a second or third daily attendance record.
2. **Raw Event ≠ Attendance Record:**
   Every physical punch produces an immutable **Raw Event** preserved in audit storage for compliance and hardware diagnostics. The **Attendance Decision Engine** determines whether that event initiates, continues, or closes the single daily attendance session.
3. **First-In Source Lock:**
   The first accepted clocking channel (Biometric or Mobile) locks the active attendance source for the workday (`LOCK_FIRST_SOURCE`).
   - If **Biometric** starts the session: Mobile displays "Checked In" with a live working timer derived from server `first_in_at`. Mobile does not require or allow a duplicate check-in.
   - If **Mobile** starts the session: Subsequent biometric punches are retained in the raw device audit trail, flagged as `IGNORED_FOR_ATTENDANCE_SOURCE_LOCK`, and do not alter the employee's attendance status or check-in timestamp.
4. **First-In / Last-Out Principle:**
   - **First-In:** First valid accepted event of the working day.
   - **Last-Out:** Last valid eligible checkout event, preventing premature checkout during morning continuation punches.

---

## 2. End-to-End Event Pipeline Architecture

```
                    EMPLOYEE PUNCH / CLOCKING
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
     BIOMETRIC              MOBILE                MANUAL
 Face / Finger / RFID    GPS Geofence          HR Regularization
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                   [ TENANT VALIDATION ]
            Matches Device Org to Employee Org
                               ▼
                 [ EMPLOYEE PIN RESOLUTION ]
            Hardware PIN #017 -> Dharun B (JCS-017)
                               ▼
                [ MULTI-KEY DEDUPLICATION ]
        Suppresses rapid multi-tap (<3s) / identical hash
                               ▼
             [ ATTENDANCE DECISION ENGINE v4.0 ]
                               │
               Has session started for today?
                   /                       \
                 NO                         YES
                 │                           │
                 ▼                           ▼
        [ FIRST-IN CREATION ]       [ SOURCE LOCK EVALUATION ]
     • Session Status: CHECKED_IN   • If locked to MOBILE and BIO arrives:
     • Source: Locked to First In     -> Stored in Audit, Attendance Unchanged
     • Record: 1 Attendance Record  • If same source:
     • Start: first_in_at             -> Check-out window & Last-Out evaluation
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                   [ ONE ATTENDANCE SESSION ]
                               │
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
  [ HR ATTENDANCE VIEW ]                    [ MOBILE APP & TIMER ]
  • Check-In: 08:52 AM                      • Status: Checked In
  • Source: BIOMETRIC • Fingerprint         • Live Timer: Elapsed from first_in_at
  • Working Duration & OT                   • No duplicate check-in required
```

---

## 3. Data Entities & Schema Separation

| Entity | Purpose | Mutability | Storage Target |
| :--- | :--- | :--- | :--- |
| **`raw_attendance_events`** | Immutable hardware evidence & mobile GPS logs | Append-only | PostgreSQL `attendance_punches` & local audit |
| **`attendance_session`** | Single authoritative daily attendance record | State machine updates | PostgreSQL `attendance_daily` & memory cache |
| **`biometric_device_users`** | Mapping of machine PINs to Employee UUIDs | Configurable | PostgreSQL `biometric_device_users` |
| **`shift_master`** | Schedules, grace periods, break & OT policies | Versioned | PostgreSQL `shifts` |

---

## 4. Source Locking Matrix

| Session State | Incoming Channel | Configured Policy | Engine Decision | Result on Attendance Session |
| :--- | :--- | :--- | :--- | :--- |
| **No Session** | Fingerprint (`08:52`) | `LOCK_FIRST_SOURCE` | `ACCEPTED_CHECK_IN` | Creates session, locked to `BIOMETRIC` |
| **Biometric Active** | Face (`09:05`) | `LOCK_FIRST_SOURCE` | `ACCEPTED_IN_SESSION` | Raw stored, session remains `CHECKED_IN` |
| **Biometric Active** | Mobile Check-In | `LOCK_FIRST_SOURCE` | `IGNORED_ALREADY_CHECKED_IN` | Rejected with info banner, 0 duplicate sessions |
| **Biometric Active** | Face (`18:10`) | `LOCK_FIRST_SOURCE` | `ACCEPTED_CHECK_OUT` | Session closed, `last_out_at` set to 18:10 |
| **No Session** | Mobile Check-In (`08:55`) | `LOCK_FIRST_SOURCE` | `ACCEPTED_CHECK_IN` | Creates session, locked to `MOBILE` |
| **Mobile Active** | Fingerprint (`09:04`) | `LOCK_FIRST_SOURCE` | `IGNORED_SOURCE_LOCK` | Raw stored, daily record untouched |
| **Mobile Active** | Face (`18:00`) | `LOCK_FIRST_SOURCE` | `IGNORED_SOURCE_LOCK` | Raw stored, daily record untouched |
| **Mobile Active** | Mobile Check-Out (`18:15`) | `LOCK_FIRST_SOURCE` | `ACCEPTED_CHECK_OUT` | Session closed, timer stopped |

---

## 5. Summary of Benefits

1. **Zero Phantom Sessions:** Employees never receive 2 or 3 daily records for using different hardware sensors or mobile.
2. **Accurate Payroll & OT:** Calculation consumes only the single authoritative attendance session.
3. **Auditing & Forensics:** Every physical punch is preserved with its exact hardware timestamp, timezone, and decision code.
