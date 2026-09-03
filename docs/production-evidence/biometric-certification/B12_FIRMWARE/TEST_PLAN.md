# 🏛️ Gate B12: Device Firmware Compliance Monitoring Test Plan

---

## 1. Governance Policy Matrix
* `CURRENT`: Firmware version $\ge$ recommended version $\rightarrow$ **ALLOW**
* `OUTDATED`: Firmware version $<$ recommended version but $\ge$ minimum version $\rightarrow$ **WARN**
* `CRITICAL`: Firmware version $<$ minimum approved security version $\rightarrow$ **RESTRICT**
* `UNKNOWN`: Missing/unverifiable telemetry $\rightarrow$ **INVESTIGATE**

---

## 2. Test Execution Proof
* [x] **Device A**: `v3.4.1` on `v3.4.1` policy $\rightarrow$ `CURRENT` (Normal Operation)
* [x] **Device B**: `v3.1.0` on `v3.4.1` policy $\rightarrow$ `OUTDATED` (Warning Alert to IT)
* [x] **Device C**: `v2.0.0` on `v3.0.0` minimum policy $\rightarrow$ `CRITICAL` (Restricted Mode)
