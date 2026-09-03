# 🏛️ Gate B15: Wiegand Turnstile Relay Access Control Test Plan

---

## 1. Access Invariant Architecture
$$\text{Identity} \rightarrow \text{Location Authorization} \rightarrow \text{Vendor Compliance} \rightarrow \text{Policy Gate} \rightarrow \text{Signed Command} \rightarrow \text{5s Pulse}$$

---

## 2. Replay & Boundary Test Scenarios
* **Scenario A (Authorized Staff)**: Issued signed command $\rightarrow$ 5-second pulse $\rightarrow$ Turnstile unlocks.
* **Scenario B (Suspended Contractor)**: Policy blocks access $\rightarrow$ 0-second pulse $\rightarrow$ Turnstile locked.
* **Scenario C (Unauthorized Location)**: Geofence mismatch $\rightarrow$ 0-second pulse $\rightarrow$ Turnstile locked.
* **Scenario D (Replay Attack)**: Stolen command replayed after 6 seconds ($>5\text{s TTL}$) $\rightarrow$ Hardware controller rejects expired command.
