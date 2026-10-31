# JOY PeopleHR — Attendance State Machine

## 1. Lifecycle State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> NOT_CHECKED_IN: Working Day Starts

    NOT_CHECKED_IN --> CHECKED_IN: First Valid Punch (Biometric/Mobile) [Source Locked]
    
    CHECKED_IN --> CHECKED_IN: Modality Punches (Face/Finger/RFID) [Audited/Continuous]
    CHECKED_IN --> CHECKED_IN: Foreign Source Punches [Marked IGNORED_SOURCE_LOCK]
    CHECKED_IN --> ON_BREAK: Break Out Punch / Action
    
    ON_BREAK --> CHECKED_IN: Break In Punch / Action
    
    CHECKED_IN --> CHECKED_OUT: Last Valid Punch / Check-Out Action
    CHECKED_OUT --> CHECKED_OUT: Later Valid Punch [Updates Last-Out / OT]
    
    CHECKED_IN --> AUTO_CHECKED_OUT: Shift End Cutoff (if Auto-Checkout Enabled)
    
    CHECKED_OUT --> REGULARIZATION_PENDING: HR Regularization Requested
    REGULARIZATION_PENDING --> REGULARIZED: Manager / HR Approval
    
    CHECKED_OUT --> FINALIZED: Payroll Period Locked
    AUTO_CHECKED_OUT --> FINALIZED: Payroll Period Locked
    REGULARIZED --> FINALIZED: Payroll Period Locked
    
    NOT_CHECKED_IN --> ABSENT: Cutoff reached with 0 punches
    NOT_CHECKED_IN --> ON_LEAVE: Approved Leave on Roster
    NOT_CHECKED_IN --> WEEK_OFF: Scheduled Rest Day
    NOT_CHECKED_IN --> HOLIDAY: Gazetted Public Holiday
```

---

## 2. State Invariants

1. **`NOT_CHECKED_IN`**:
   - `first_in_at = null`, `last_out_at = null`, `active_source = null`.
   - Mobile UI shows `[ Clock In Now ]`.
2. **`CHECKED_IN`**:
   - `first_in_at = ISO Timestamp`, `active_source = BIOMETRIC | MOBILE`.
   - `is_source_locked = true`.
   - Mobile live timer runs dynamically: `now() - first_in_at`.
   - Mobile UI shows `● Checked In` with live second counter.
3. **`CHECKED_OUT`**:
   - `last_out_at = ISO Timestamp`.
   - `net_work_minutes`, `late_minutes`, `early_minutes`, and `overtime_minutes` computed.
   - Mobile live timer stops.
4. **`AUTO_CHECKED_OUT`**:
   - Closed by system worker at shift cutoff with `check_out_source = SYSTEM`, `check_out_method = AUTO`.
