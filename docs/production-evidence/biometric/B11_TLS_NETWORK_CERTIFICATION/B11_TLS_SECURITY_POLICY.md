# 🏛️ Gate B11: Biometric Edge TLS Security Policy Standard

---

## 1. Enterprise Security Invariants
1. **Minimum Protocol Version**: `TLSv1.2` strictly enforced; `TLSv1.3` preferred.
2. **Plaintext Traffic**: Strictly **PROHIBITED** ($0$ HTTP fallback allowed).
3. **Mutual TLS**: Required for all production edge nodes.
4. **Certificate Pinning**: Inbound SHA-256 fingerprint must match `biometric_device_certificates`.
5. **No Blind Trust**: `rejectUnauthorized: true` is permanently locked.

```ts
export const BIOMETRIC_TLS_POLICY = {
  minVersion: "TLSv1.2",
  allowTLS12: true,
  allowTLS13: true,
  rejectUnauthorized: true,
  certificateValidation: true,
  hostnameValidation: true,
  weakCipherRejection: true,
  certificateFingerprintPinning: true,
  expiredCertificateRejection: true,
};
```
