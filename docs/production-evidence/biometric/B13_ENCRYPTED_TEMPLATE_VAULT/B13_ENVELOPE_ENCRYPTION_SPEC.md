# 🏛️ Gate B13: Biometric Template Cryptographic Envelope Specification

---

## 1. Cryptographic Envelope Architecture
* **Algorithm**: `AES_256_GCM` with 128-bit authentication tag.
* **KMS Key Reference**: `kms://joy-prod-hsm/bio-key-*` (Hardware Security Module root).
* **Integrity Anchor**: SHA-256 digital fingerprint calculated on plaintext template prior to encryption and sealed into the envelope.

```json
{
  "vault_id": "VLT_98F2A109",
  "employee_id": "EMP-617871",
  "device_id": "ZK-COIMBATORE-001",
  "vault_reference": "vault://biometrics/enc_EMP-617871_1788250.enc",
  "key_reference": "kms://joy-prod-hsm/bio-key-ZK-COIMBATORE-001",
  "encryption_algorithm": "AES_256_GCM",
  "integrity_hash": "SHA256:7cf340fa83eff263309a65cf23fa7b12d592b23a1a98075304b9eb9a6a894677",
  "created_at": "2026-09-01T08:58:00Z"
}
```
