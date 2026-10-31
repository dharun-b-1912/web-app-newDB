# JOY PeopleHR — Unified Multi-Mode Attendance Architecture

## Executive Summary
JOY PeopleHR implements a centralized, server-authoritative **Unified Multi-Mode Attendance Engine**. The fundamental invariant of this architecture is:

> **One Employee = One Authoritative Attendance Session Per Working Day** (unless an explicit split-shift/multi-session policy is configured).
> **The first valid attendance channel locks the session mode (Source Lock). Raw events from all modalities (Fingerprint, Face, RFID, Mobile GPS, Manual) are persisted for audit and diagnostics but never spawn duplicate attendance records.**

---

## 1. High-Level Architecture Diagram

```
                    RAW EVENTS STREAM
           (Fingerprint • Face • RFID • Mobile GPS)
                            │
            ┌───────────────┼───────────────┐
            │               │               │
        BIOMETRIC         MOBILE          MANUAL
     eSSL AI-FACE       GPS App / Web    HR Portal
            │               │               │
            └───────────────┼───────────────┘
                            ↓
                   TENANT VALIDATION
                            ↓
                   EMPLOYEE RESOLUTION
                            ↓
                MULTI-KEY DEDUPLICATION
                            ↓
                 ATTENDANCE SOURCE LOCK
                            ↓
                 SHIFT & GRACE RESOLUTION
                            ↓
                  FIRST-IN / LAST-OUT
                            ↓
             ONE AUTHORITATIVE DAILY SESSION
                            ↓
              OVERTIME & DURATION COMPUTATION
                            ↓
               REAL-TIME EVENT BUS DISPATCH
                   /                 \
                  /                   \
        MOBILE LIVE TIMER       HR WORKSPACE & DASHBOARD
```

---

## 2. Core Concepts

### 2.1 Raw Event vs. Attendance Session
- **Raw Event (`RawAttendanceEvent`)**: Represents a physical punch emitted by a biometric hardware device, mobile app, or browser. Contains physical details (PIN, timestamp, verification method, sequence number, device serial).
- **Attendance Session (`AttendanceSession`)**: The single authoritative daily working record for payroll, compliance, and time tracking. Encapsulates `first_in_at`, `last_out_at`, `active_source`, `net_work_minutes`, and `overtime_minutes`.

### 2.2 Attendance Source Locking (`active_source`)
1. **Scenario A (Biometric First)**:
   - 08:52 AM Fingerprint -> `CHECK_IN` accepted. `active_source = BIOMETRIC`, `check_in_method = FINGERPRINT`.
   - Mobile app receives real-time notification, starts working timer from `08:52 AM`, and shows `Source: BIOMETRIC • Fingerprint`.
   - 09:05 AM Face -> Same session continued (not a second check-in).
   - 18:07 PM RFID -> `CHECK_OUT / LAST_OUT` accepted.
   - Result: Exactly 1 attendance session.

2. **Scenario B (Mobile First)**:
   - 08:55 AM Mobile Check-In -> `CHECK_IN` accepted. `active_source = MOBILE`.
   - Mobile timer starts running from `08:55 AM`.
   - 09:03 AM Fingerprint -> Stored in raw logs, marked `IGNORED_FOR_SOURCE_LOCK`.
   - 18:10 PM Face -> Stored in raw logs, marked `IGNORED_FOR_SOURCE_LOCK`.
   - 18:15 PM Mobile Check-Out -> `CHECK_OUT` accepted.
   - Result: Exactly 1 attendance session owned by Mobile.

---

## 3. Data Model

```typescript
export interface AttendanceSession {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  attendance_date: string; // YYYY-MM-DD

  first_in_at: string | null;
  last_out_at: string | null;

  attendance_status: AttendanceSessionStatus;
  active_source: AttendanceSource | null;
  check_in_source: AttendanceSource | null;
  check_in_method: BiometricMethod | null;
  check_out_source: AttendanceSource | null;
  check_out_method: BiometricMethod | null;

  shift_id: string;
  shift_code: string;
  shift_name: string;
  shift_start: string;
  shift_end: string;

  grace_minutes: number;
  late_minutes: number;
  early_minutes: number;

  break_minutes: number;
  gross_work_minutes: number;
  net_work_minutes: number;
  overtime_minutes: number;

  source_locked_at: string | null;
  is_source_locked: boolean;
  lock_policy: SourceLockPolicy;

  raw_events_count: number;
  ignored_events_count: number;
  duplicate_events_count: number;

  status: 'ACTIVE' | 'FINALIZED' | 'REGULARIZED';
  version: number;
}
```

---

## 4. Concurrency & Idempotency Guarantees
- **Multi-Key Deduplication**: `hash(organization_id + device_id + pin + timestamp + sequence)` rejects duplicate packet re-transmissions.
- **Race Condition Defence**: Simultaneous mobile and biometric punches resolve deterministically through the session creation mutex; the winning event locks the session while the second is classified under the established lock.
