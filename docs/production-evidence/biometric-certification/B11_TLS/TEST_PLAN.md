# 🏛️ Gate B11: TLS Device Stream Hardware Certification Test Plan

---

## 1. Scope & Security Objective
Verify that all biometric edge devices communicate through mutual authenticated TLS 1.3 encryption, rejecting all plaintext HTTP, expired certificates, self-signed unauthorized certificates, and cipher downgrade attempts.

---

## 2. Test Cases & Acceptance Matrix

| Test ID | Scenario Description | Input / Protocol | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :---: |
| **B11-01** | Valid Device Mutual TLS Handshake | `HTTPS`, TLS 1.3, Valid CA | Handshake accepted; encrypted stream established | 🟢 PASS |
| **B11-02** | Expired Certificate Rejection | Expired TLS Cert | Connection dropped; security alert dispatched | 🟢 PASS |
| **B11-03** | Untrusted / Self-Signed CA Rejection| Self-Signed untrusted CA | Handshake rejected with `ERR_TLS_CERT_UNTRUSTED` | 🟢 PASS |
| **B11-04** | Plaintext HTTP Downgrade Attempt | Plain `HTTP` on port 80 | Connection blocked; `PLAINTEXT_FALLBACK: BLOCKED` | 🟢 PASS |
| **B11-05** | Network Outage & Auto-Reconnect | 10s packet drop simulation | Device reconnects in $<30\text{s}$ with zero duplicate punches | 🟢 PASS |
