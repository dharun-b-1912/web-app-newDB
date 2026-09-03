# 🏛️ Gate B15: Wiegand Turnstile & Relay Access Control Test Plan

---

## 1. Requirement & Invariant
No physical barrier or turnstile relay may trigger directly from a raw device punch. Every relay operation must traverse the server-side authorization chain:
$$\text{Identity Resolution} \rightarrow \text{Employment Check} \rightarrow \text{Location Authorization} \rightarrow \text{Vendor Compliance} \rightarrow \text{Tamper State Check} \rightarrow \text{Signed Access Decision} \rightarrow \text{5s Pulse}$$

---

## 2. Test Cases & Acceptance Matrix

| Test ID | Scenario | Authorization Context | Expected Output | Status |
| :--- | :--- | :--- | :--- | :---: |
| **B15-01** | Authorized Plant Worker | Active, Location Match, Vendor Compliant | `ALLOW` + 5000ms Relay Pulse | 🟢 PASS |
| **B15-02** | Suspended / Inactive Worker | Employment Status: Suspended | `DENY` + 0ms Pulse (Locked) | 🟢 PASS_BLOCKED |
| **B15-03** | Unauthorized Location Access | Location Assignment Mismatch | `DENY` + 0ms Pulse (Locked) | 🟢 PASS_BLOCKED |
| **B15-04** | Non-Compliant Vendor Worker | Vendor Statutory Violation | `DENY` + 0ms Pulse (Locked) | 🟢 PASS_BLOCKED |
| **B15-05** | Device in TAMPER_ALERT State | Chassis Cover Open | `DENY` + 0ms Pulse (Locked) | 🟢 PASS_BLOCKED |
| **B15-06** | Adversarial Replay Attack | Command replayed after 6s ($>5\text{s TTL}$) | `REJECTED_EXPIRED_COMMAND` | 🟢 PASS_BLOCKED |
| **B15-07** | Tampered Digital Signature | Modified payload signature hash | `REJECTED_SIGNATURE_MISMATCH` | 🟢 PASS_BLOCKED |
