# 🏛️ Gate B15: Wiegand Turnstile & Barrier Relay Access Control Certification Test Plan

---

## 1. Scope & Golden Invariant
No physical barrier or turnstile relay may trigger directly from a raw device punch. Every relay operation must traverse the server-side authorization chain:
$$\text{Identity} \rightarrow \text{Employment Status} \rightarrow \text{Location Auth} \rightarrow \text{Vendor Compliance} \rightarrow \text{Tamper Check} \rightarrow \text{Signed Command} \rightarrow \text{5s Pulse}$$

---

## 2. Test Cases & Acceptance Matrix

| Test ID | Scenario | Input Context | Expected Result | Pass / Block |
| :--- | :--- | :--- | :--- | :---: |
| **B15-01** | Authorized Plant Worker | Valid ID, Active Status, Location Match | `ALLOW` $\rightarrow$ 5000ms Pulse | 🟢 PASS |
| **B15-02** | Unknown / Unresolved Identity | Non-existent worker ID | `DENY_IDENTITY_NOT_FOUND` | 🟢 PASS_BLOCKED |
| **B15-03** | Unauthorized Location Access | Location Assignment Mismatch | `DENY_LOCATION_UNAUTHORIZED` | 🟢 PASS_BLOCKED |
| **B15-04** | Suspended / Inactive Worker | Employment status = `SUSPENDED` | `DENY_EMPLOYMENT_INACTIVE` | 🟢 PASS_BLOCKED |
| **B15-05** | Tampered Device Signal | Target device in `TAMPER_ALERT` | `DENY_DEVICE_TAMPERED` | 🟢 PASS_BLOCKED |
| **B15-06** | Expired Command ($>5000\text{ms}$) | Expired timestamp in payload | `REJECTED_EXPIRED_COMMAND` | 🟢 PASS_BLOCKED |
| **B15-07** | Adversarial Replay Attack | Command replayed second time | `REJECTED_REPLAY_ATTEMPT` | 🟢 PASS_BLOCKED |
| **B15-08** | Tampered Digital Signature | Modified signature digest | `REJECTED_SIGNATURE_MISMATCH` | 🟢 PASS_BLOCKED |
| **B15-09** | Over-Max Pulse Clamp | Requested 30,000ms pulse | Clamped strictly to $\le 5000\text{ms}$ | 🟢 PASS |
| **B15-10** | Turnstile Pulse Timeout | Automatic return to secure locked state | Relay closes after 5000ms | 🟢 PASS |
