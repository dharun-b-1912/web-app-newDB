# JOY PeopleHR — Multi-Mode Attendance Test Report
**Verification of All 20 Functional Gates & Section 100 UAT Certification**

---

## 1. Executive Summary

| Total Gates | Passed | Failed | Success Rate | Execution Engine |
| :---: | :---: | :---: | :---: | :---: |
| **22** | **22** | **0** | **100.0%** | Node / TSX Headless Runner |

All 20 Functional Gates defined in Section 99 and the end-to-end UAT Acceptance Tests defined in Section 100 passed with 100% precision.

---

## 2. Gate Verification Table

| Gate | Scenario | Channel & Method | Input Instant | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **1** | Fingerprint First | `BIOMETRIC` (Fingerprint) | `08:52:00` | `ACCEPTED_CHECK_IN`, locked to BIOMETRIC | `ACCEPTED_CHECK_IN` | **PASS** |
| **2** | Face First | `BIOMETRIC` (Face) | `08:50:00` | `ACCEPTED_CHECK_IN`, locked to BIOMETRIC | `ACCEPTED_CHECK_IN` | **PASS** |
| **3** | RFID First | `BIOMETRIC` (RFID Card) | `08:45:00` | `ACCEPTED_CHECK_IN`, locked to BIOMETRIC | `ACCEPTED_CHECK_IN` | **PASS** |
| **4** | Mobile First | `MOBILE` (GPS Geofence) | `08:55:00` | `ACCEPTED_CHECK_IN`, locked to MOBILE | `ACCEPTED_CHECK_IN` | **PASS** |
| **5** | Mobile + Fingerprint | `BIOMETRIC` while Mobile Active | `09:03:00` | `IGNORED_SOURCE_LOCK`, session untouched | `IGNORED_SOURCE_LOCK` | **PASS** |
| **6** | Mobile + Face | `BIOMETRIC` while Mobile Active | `09:06:00` | `IGNORED_SOURCE_LOCK`, session untouched | `IGNORED_SOURCE_LOCK` | **PASS** |
| **7** | Mobile + RFID | `BIOMETRIC` while Mobile Active | `18:00:00` | `IGNORED_SOURCE_LOCK`, session untouched | `IGNORED_SOURCE_LOCK` | **PASS** |
| **8** | Bio First + Mobile Check-in| `MOBILE` while Bio Active | `09:02:00` | `IGNORED_ALREADY_CHECKED_IN`, 0 dupes | `IGNORED_ALREADY_CHECKED_IN` | **PASS** |
| **9** | Modality Deduplication | Fingerprint + Face + RFID | `08:55` - `09:03` | Exactly 1 session created | 1 Session, Status: `CHECKED_IN` | **PASS** |
| **10** | Event Deduplication | Repeated Identical Punch | `09:03:00` | `DUPLICATE`, suppressed | `DUPLICATE` | **PASS** |
| **11** | Mobile Double-Tap | Rapid Double Click Check-In | `09:00:00` - `09:00:01` | 1 Created, 1 Ignored | `IGNORED_ALREADY_CHECKED_IN` | **PASS** |
| **12** | Concurrent Race | Simultaneous Bio & Mobile | `08:59:00` (Concurrent) | Exactly 1 winner, 1 session | Exactly 1 session created | **PASS** |
| **13** | Biometric Check-Out | Exit Punch after Shift | `18:05:00` | `ACCEPTED_CHECK_OUT`, net hours computed | `ACCEPTED_CHECK_OUT` | **PASS** |
| **14** | Mobile Check-Out | Explicit Mobile Checkout | `17:30:00` | `ACCEPTED_CHECK_OUT`, timer stopped | `ACCEPTED_CHECK_OUT` | **PASS** |
| **15** | Offline Biometric Sync | Buffered Punch 3h Late | `08:52:00` | Preserved event time `08:52:00` | `first_in_at = 08:52:00Z` | **PASS** |
| **16** | Offline Mobile Sync | Queued Mobile Punch | `08:45:00` | Preserved event time `08:45:00` | `first_in_at = 08:45:00Z` | **PASS** |
| **17** | Unmapped User | Machine User #999 | `09:15:00` | `UNMAPPED_USER`, 0 fake attendance | `UNMAPPED_USER`, session: null | **PASS** |
| **18** | Multi-Tenant Boundary | Cross-tenant Device Org | `09:10:00` | `ERROR` (Tenant boundary violation) | `ERROR`, session: null | **PASS** |
| **19** | Grace & Late Calculation | Punch at `09:25:00` on 09:00 | `09:25:00` | `late_minutes = 25` | `late_minutes = 25` | **PASS** |
| **20** | Overtime Calculation | Exit at `19:30:00` on 18:00 | `19:30:00` | `overtime_minutes = 90` | `overtime_minutes = 90` | **PASS** |
| **21** | Dharun B Bio-First UAT | Finger -> Face -> RFID -> Out | `08:52` -> `18:10` | 1 Session, Check-In: `08:52`, Out: `18:10` | 1 Session, 100% matched | **PASS** |
| **22** | Dharun B Mobile-First UAT| Mobile -> Bio Ignored -> Out | `08:55` -> `18:15` | 1 Session, 2 Raw Ignored, Out: `18:15` | 1 Session, 2 Ignored | **PASS** |
