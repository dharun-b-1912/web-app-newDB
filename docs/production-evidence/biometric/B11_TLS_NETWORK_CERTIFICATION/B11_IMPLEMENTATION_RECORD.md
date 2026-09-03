# 🏛️ Gate B11: Implementation & Architectural Boundary Record

---

## 1. Architectural Invariant & Placement
The TLS security adapter sits directly ahead of `biometricGatewayService.ts` and `biometricEventPipelineService.ts`. No biometric event or payload can bypass the TLS verification or device identity check.

```
PHYSICAL DEVICE (ZKTeco / eSSL / Mantra)
       │
       ▼ [TLS 1.2+ / TLS 1.3]
┌──────────────────────────────────────────────┐
│  src/services/biometric/security/            │
│                                              │
│  ├── biometricTLSValidator.ts                │
│  ├── deviceCertificateRegistry.ts            │
│  ├── tlsConnectionMonitor.ts                 │
│  └── tlsSecurityAudit.ts                     │
└──────────────────────┬───────────────────────┘
                       │ [Authenticated & Encrypted]
                       ▼
         biometricGatewayService.ts
                       │
                       ▼
       Canonical Attendance Pipeline
```

---

## 2. Source Code Modules

| File | Purpose |
| :--- | :--- |
| `src/services/biometric/security/biometricTLSValidator.ts` | Handshake validation, CA trust evaluation, version downgrade guard, and fingerprint pinning check. |
| `src/services/biometric/security/deviceCertificateRegistry.ts` | Single source of truth for approved device certificates, SHA-256 fingerprints, and validity dates. |
| `src/services/biometric/security/tlsConnectionMonitor.ts` | Connection lifecycle state machine (`CONNECTING` $\rightarrow$ `TLS_HANDSHAKE` $\rightarrow$ `AUTHENTICATED` $\rightarrow$ `STREAMING`). |
| `src/services/biometric/security/tlsSecurityAudit.ts` | Dispatches immutable security events across the enterprise notification bus (`biometric.tls.*`). |

---

## 3. Invariants Enforced
1. **Plaintext Fallback Blocked**: $0$ HTTP fallback permitted under any circumstance.
2. **Device Fingerprint Pinning**: Incoming SHA-256 certificate hash must match `deviceCertificateRegistry`.
3. **No Unauthenticated Processing**: Untrusted connections are terminated at socket/handshake level before reaching domain event parsers.
