# JOY PeopleHR — Biometric & Mobile Concurrency Architecture & Tests
**Atomic Race Condition Defense & Unique Constraint Integrity**

---

## 1. Concurrency Problem Statement

In enterprise installations, employees may check in via mobile GPS while standing directly in front of the biometric terminal, or rapid double-taps can occur under high network latency:

```
[ Thread A: Mobile Request ] ───► [ Check Session Exists? ] ───► (No) ───► [ Insert Session A ]
                                             ▲
                                             │ (Race Window)
                                             ▼
[ Thread B: Biometric Punch ] ───► [ Check Session Exists? ] ───► (No) ───► [ Insert Session B ] ❌ DUPLICATE!
```

Without concurrency guards at both the database level and application memory level, two separate attendance sessions would be created for the same employee on the same date.

---

## 2. Multi-Tier Concurrency Architecture

### Tier 1: Database Unique Composite Constraint
In PostgreSQL / Supabase, the `attendance_daily` and `attendance_sessions` tables enforce a strict composite constraint:
```sql
CONSTRAINT uq_attendance_daily_tenant_emp_date 
UNIQUE (organization_id, employee_id, attendance_date);
```
Any concurrent transaction attempting to insert a second session for the same `(organization_id, employee_id, attendance_date)` triggers a PostgreSQL `23505 unique_violation`, which the engine catches and converts into an authoritative state lookup.

### Tier 2: Upstash Redis Distributed Mutex (15s Window)
Before executing punch processing:
```ts
const punchThrottle = await JoyRedis.verifyAndLockPunch(employeeId, timestamp, 15);
if (!punchThrottle.allowed) {
  throw new Error('Duplicate punch detected within 15s window. Please wait.');
}
```

### Tier 3: In-Memory Map Synchronization & Optimistic Versioning
The `AttendanceDecisionEngine` uses an atomic session key index:
```ts
const sessionKey = `${orgId}:${empId}:${date}`;
```
Simultaneous calls in `Promise.all([p1, p2])` evaluate sequentially through memory-synchronized blocks, guaranteeing that only the winning event initializes the session (`ACCEPTED_CHECK_IN`), while the second event receives `IGNORED_ALREADY_CHECKED_IN` or `DUPLICATE`.

---

## 3. Concurrency Test Results

### Test Execution: Gate 12
- **Simultaneous Payloads Sent:**
  1. `Mobile Check-In` for `emp-dharun-017` at `08:59:00Z`
  2. `Biometric Fingerprint` for `emp-dharun-017` at `08:59:00Z`
- **Execution:** `Promise.all([p1, p2])` with zero artificial delay.
- **Outcome:**
  - `sessions.length`: **Exactly 1 session created**
  - Session Source: Locked to winning thread
  - Losing thread: Cleanly handled without throwing uncaught exceptions
  - Duplicate Records: **0**
