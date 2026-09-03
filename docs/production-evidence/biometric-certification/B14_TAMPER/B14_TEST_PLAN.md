# 🏛️ Gate B14: Physical Device Tamper Detection & Security Escalation Test Plan

---

## 1. Scope & Physical Security Objective
Verify that physical device cover opening, wall removal, or enclosure tampering triggers immediate hardware signal processing, device state transition to `TAMPER_ALERT`, broadcast to Command Center, and mandatory `UNACKNOWLEDGED` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED` lifecycle without silent auto-closure.

---

## 2. Test Cases & Acceptance Matrix (5 Tests)

| Test ID | Scenario Description | Sensor Signal | Expected Lifecycle State | Pass/Fail |
| :--- | :--- | :--- | :---: | :---: |
| **B14-T01** | Physical Microswitch Cover Open | `CHASSIS_COVER_SWITCH` (OPEN) | `UNACKNOWLEDGED` + Device Restricted | 🟢 PASS |
| **B14-T02** | Optical Wall Removal Breach | `OPTICAL_WALL_REMOVAL` ($4200\text{mV}$) | `CRITICAL` `UNACKNOWLEDGED` Alert | 🟢 PASS |
| **B14-T03** | Security Officer Acknowledgement | Admin ID attached | State advances to `INVESTIGATING` | 🟢 PASS |
| **B14-T04** | Administrative Inspection & Resolution | Inspection notes recorded | State advances to `RESOLVED` (Restored) | 🟢 PASS |
| **B14-T05** | Silent Auto-Closure Rejection | Automated retry attempt | Blocked; Incident remains immutable | 🟢 PASS |
