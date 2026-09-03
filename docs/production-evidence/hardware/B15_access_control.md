# 🏛️ Gate B15: Wiegand Turnstile / Relay Access Controller Certification

---

## 1. Requirement & Architecture
* **Policy-Driven Access**: The physical barrier relay controller never directly trusts frontend signals.
* **Access Invariant Flow**:
  $$\text{Identity} \rightarrow \text{Location Auth} \rightarrow \text{Vendor Compliance} \rightarrow \text{Policy Gate} \rightarrow \text{Signed Command} \rightarrow \text{5s Relay Pulse}$$
* **Replay Protection**: Strict 5-second TTL on signed relay commands. Expired pulses are rejected by hardware edge controllers.

---

## 2. Test Execution & Evidence

```
=================================================================================
B15 WIEGAND TURNSTILE RELAY ACCESS CONTROL REPORT
=================================================================================
Authorized Worker (JCS-017)   : Policy Cleared -> 5-Second Relay Pulse Issued (Turnstile Unlocks)
Suspended Worker (JCS-999)    : Vendor Non-Compliant -> DENIED (0s Pulse, Turnstile Locked)
Unauthorized Location Worker   : Location Mismatch -> DENIED (0s Pulse, Turnstile Locked)
Replay Protection Drill (TTL)  : Command replayed after 6s -> REJECTED (TTL EXPIRED)
Digital Signature Verification: SHA-256 HMAC Signature Verified
=================================================================================
VERDICT                       : 🟢 B15 PHYSICALLY CERTIFIED
=================================================================================
```
