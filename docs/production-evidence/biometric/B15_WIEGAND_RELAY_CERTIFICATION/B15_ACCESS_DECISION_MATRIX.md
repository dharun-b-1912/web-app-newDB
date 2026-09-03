# 🏛️ Gate B15: Access Decision Engine Contract & State Matrix

---

## 1. Decision Contract Invariant
Every access request produces one deterministic result from the authoritative centralized policy engine:

| Decision Value | Description | Relay Action | Pulse Duration |
| :--- | :--- | :--- | :---: |
| `ALLOW` | All compliance, location, and tamper checks passed | Open Turnstile | `5000ms` |
| `DENY_IDENTITY_NOT_FOUND` | Identifier cannot be resolved in canonical master | Keep Locked | `0ms` |
| `DENY_EMPLOYMENT_INACTIVE`| Worker is terminated, suspended, or on leave | Keep Locked | `0ms` |
| `DENY_LOCATION_UNAUTHORIZED`| Worker not in 9 canonical location authorizations | Keep Locked | `0ms` |
| `DENY_VENDOR_SUSPENDED` | Vendor has statutory non-compliance or blacklisted | Keep Locked | `0ms` |
| `DENY_DEVICE_TAMPERED` | Physical sensor triggered `DEVICE_TAMPER_DETECTED` | Keep Locked | `0ms` |
| `DENY_DEVICE_UNTRUSTED` | TLS handshake failed or fingerprint unpinned | Keep Locked | `0ms` |
| `DENY_POLICY_RESTRICTED` | Shift time violation or overtime quota reached | Keep Locked | `0ms` |
