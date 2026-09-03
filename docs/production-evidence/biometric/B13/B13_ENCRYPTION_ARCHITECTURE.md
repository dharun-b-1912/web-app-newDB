# 🏛️ Gate B13: Biometric Envelope Encryption Architecture

---

## 1. Multi-Tier Key Management (KEK & DEK)

```mermaid
flowchart TD
    subgraph KMS_HSM ["Hardware Security Module (HSM)"]
        KEK["Key Encryption Key (Master KEK v1)"]
    end

    subgraph Per_Template_Envelope ["Per-Template Envelope"]
        DEK["Random 256-bit Data Key (DEK)"] -->|Encrypted by KEK| WrappedDEK["encrypted_dek"]
        DEK --> AES_GCM["AES-256-GCM Encryptor"]
        RawTemplate["Raw Biometric Buffer"] --> AES_GCM
        AAD["AAD (Tenant | Employee | Device | Version)"] --> AES_GCM
        AES_GCM --> Ciphertext["encrypted_payload"]
        AES_GCM --> AuthTag["auth_tag (128-bit)"]
        RawTemplate --> SHA256["SHA-256 Generator"]
        SHA256 --> IntegrityHash["integrity_hash"]
    end
```

---

## 2. Authenticated Additional Data (AAD) Invariant
The AAD strictly binds:
$$\text{AAD} = \text{organization\_id} \parallel \text{employee\_id} \parallel \text{device\_id} \parallel \text{template\_type} \parallel \text{template\_version}$$
This mathematically guarantees that ciphertext generated in Tenant A cannot be deciphered or applied within Tenant B.
