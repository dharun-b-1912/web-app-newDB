# 🏛️ Gate B12: Device Firmware Compliance Monitoring Test Plan

---

## 1. Governance Policy Matrix
* `CURRENT`: Firmware version $\ge$ recommended version $\rightarrow$ **ALLOW**
* `OUTDATED`: Firmware version $<$ recommended version but $\ge$ minimum version $\rightarrow$ **WARN**
* `CRITICAL`: Firmware version $<$ minimum approved security version or in critical list $\rightarrow$ **RESTRICT**
* `UNKNOWN`: Missing/unverifiable telemetry or unsupported model $\rightarrow$ **INVESTIGATE**

---

## 2. Test Execution & Evidence Matrix (11 Tests)

| Test ID | Scenario | Input Firmware | Expected Status | Result |
| :--- | :--- | :--- | :---: | :---: |
| **B12-T01** | Current Recommended Version | `v3.4.1` on SilkBio-101TC | `CURRENT` | 🟢 PASS |
| **B12-T02** | Older Functional Version | `v3.1.0` on SilkBio-101TC | `OUTDATED` | 🟢 PASS |
| **B12-T03** | Semantic Version Parsing | `3.4.1` without 'v' | `CURRENT` | 🟢 PASS |
| **B12-T04** | Upgrade Detection | Upgraded from v2.5 to v3.4.1 | `CURRENT` | 🟢 PASS |
| **B12-T05** | Audit Event Logging | `v2.5.0` on eSSL | `OUTDATED` | 🟢 PASS |
| **B12-T06** | Below Minimum Threshold | `v2.0.0` (Min: 2.4.0) | `CRITICAL` | 🟢 PASS |
| **B12-T07** | Vulnerable Version List | `v1.1.0` in critical list | `CRITICAL` | 🟢 PASS |
| **B12-T08** | Unreadable / Empty Version | Empty string `""` | `UNKNOWN` | 🟢 PASS |
| **B12-T09** | Unsupported Model | `GenericNoBrand ModelX` | `UNKNOWN` | 🟢 PASS |
| **B12-T10** | Missing Device ID | Empty `deviceId` | `UNKNOWN` | 🟢 PASS |
| **B12-T11** | Cross-Tenant Lookup | Foreign tenant ID | `UNKNOWN` | 🟢 PASS |
