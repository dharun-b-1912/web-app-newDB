# 🏛️ Gate B11: Hardware TLS Network Stream Certification Test Plan

---

## 1. Objective & Scope
Certify that every biometric edge device communication stream connected to Joy PeopleHR is protected by Mutual TLS 1.2 / TLS 1.3 encryption, authenticates against pinned certificate fingerprints, and strictly rejects weak ciphers, expired certs, invalid CAs, hostname mismatches, and downgrade attempts.

---

## 2. Test Cases & Acceptance Matrix

| Test ID | Test Scenario | Expected Result | Pass / Block |
| :--- | :--- | :--- | :---: |
| **B11-01** | Valid Device Mutual TLS Handshake | Connection accepted; secure stream active | 🟢 PASS |
| **B11-02** | Expired Certificate Attempt | Rejected with `CERTIFICATE_EXPIRED` | 🔴 BLOCKED |
| **B11-03** | Unknown / Self-Signed CA | Rejected with `INVALID_CA` | 🔴 BLOCKED |
| **B11-04** | Hostname Mismatch | Rejected with `HOSTNAME_MISMATCH` | 🔴 BLOCKED |
| **B11-05** | TLS 1.0 Downgrade Attempt | Rejected with `TLS_DOWNGRADE` | 🔴 BLOCKED |
| **B11-06** | TLS 1.1 Downgrade Attempt | Rejected with `TLS_DOWNGRADE` | 🔴 BLOCKED |
| **B11-07** | TLS 1.2 Cipher Negotiation | Accepted with `TLS_AES_256_GCM_SHA384` | 🟢 PASS |
| **B11-08** | TLS 1.3 Cipher Negotiation | Accepted with `TLS_AES_256_GCM_SHA384` | 🟢 PASS |
| **B11-09** | Weak Cipher Suite (DES/RC4/MD5) | Rejected with `WEAK_CIPHER_REJECTED` | 🔴 BLOCKED |
| **B11-10** | Unregistered / Rogue Device | Rejected with `DEVICE_UNREGISTERED` | 🔴 BLOCKED |
| **B11-11** | Certificate Fingerprint Mismatch | Rejected with `DEVICE_CERTIFICATE_MISMATCH` | 🔴 BLOCKED |
| **B11-12** | 30s Interrupted Connection Recovery| Re-handshake verified; 0 duplicate punches | 🟢 PASS |
