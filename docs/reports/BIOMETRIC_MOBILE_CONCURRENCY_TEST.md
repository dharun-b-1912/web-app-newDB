# JOY PeopleHR — Biometric & Mobile Concurrency Test

## 1. Concurrency Drill Description
A critical stability requirement of the **Unified Multi-Mode Attendance Engine** is guaranteeing zero-split sessions when an employee triggers simultaneous punches across different channels (e.g. tapping "Clock In" on the Mobile App while placing a finger or presenting their face to the physical `eSSL AI-FACE MAGNUM` terminal).

---

## 2. Test Execution & Result

### Test Scenario
- **Employee:** Dharun B (`emp-dharun-017`, `JCS-017`, PIN `017`)
- **Simultaneous Payloads:**
  1. `POST /api/mobile/punch` with `source: 'MOBILE'`, `timestamp: '2026-09-12T08:55:00.000Z'`
  2. `TCP / ADMS Push` from `192.168.1.201:4370` with `source: 'BIOMETRIC'`, `method: 'FINGERPRINT'`, `timestamp: '2026-09-12T08:55:00.000Z'`

```typescript
const [resMob, resBio] = await Promise.all([
  attendanceDecisionEngine.processEvent({
    organizationId: 'org-joy-test',
    employeeId: 'emp-dharun-017',
    eventTimestamp: '2026-09-12T08:55:00.000Z',
    source: 'MOBILE',
  }),
  attendanceDecisionEngine.processEvent({
    organizationId: 'org-joy-test',
    employeeId: 'emp-dharun-017',
    biometricPin: '017',
    eventTimestamp: '2026-09-12T08:55:00.000Z',
    source: 'BIOMETRIC',
    method: 'FINGERPRINT',
  }),
]);
```

### Verification Checks:
1. **Total Daily Sessions:** `attendanceDecisionEngine.getSessionsForDate('2026-09-12')` returns **exactly 1 session**.
2. **Duplicate Protection:** Zero orphan sessions or half-created records in storage.
3. **Winning Channel:** The winning event becomes `active_source` and locks the session; the second event is stored as a raw audit record without creating a second check-in.
4. **Result:** **100% Passed (Clean Serialization).**
