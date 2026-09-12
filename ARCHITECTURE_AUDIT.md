# JOY PeopleHR — Multi-Tenant Architecture & Security Audit

**Document Version:** 3.0.0-PROD  
**Author:** Principal Security Architect & Cloud Infrastructure Lead  
**Status:** FORENSIC AUDIT COMPLETE & CERTIFIED  

---

## 1. System Architecture Overview

JOY PeopleHR is designed as a high-performance multi-tenant Workforce Management and HR Operating System supporting hundreds of organizations with thousands of active employees.

```
                      JOY PEOPLEHR CLOUD PLATFORM
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
          Organization A                  Organization B
          (e.g., Joy Co.)                 (e.g., Acme Corp)
                 │                               │
         Authenticated Context           Authenticated Context
                 │                               │
         Attendance Engine               Attendance Engine
                 │                               │
         PostgreSQL Schema (RLS)         PostgreSQL Schema (RLS)
                 │                               │
         Tenant Storage Bucket           Tenant Storage Bucket
                 │                               │
        ┌────────┴────────┐             ┌────────┴────────┐
   Connector A1      Connector A2   Connector B1      Connector B2
        │                 │              │                 │
  Factory LAN        HQ Office      Branch LAN        Plant LAN
        │                 │              │                 │
  eSSL AiFace         ZKTeco        eSSL AiFace        ZK Face
  192.168.1.201       K40 Pro       192.168.2.100      SilkBio
```

---

## 2. Key Architecture Findings & Remediation Plan

### Finding 1: Context Resolution & Authority
- **Finding:** Client-side components previously read tenant IDs from URL parameters or `localStorage`.
- **Remediation:** Centralized in `TenantContextService` (`src/services/tenant/tenantContextService.ts`). All backend operations resolve the tenant authoritatively from Supabase Auth tokens (`auth.uid()`) and verified organization memberships. Client-supplied tenant IDs are strictly cross-checked; mismatches fail fast with `403 Forbidden`.

### Finding 2: Biometric Connector & Device Binding
- **Finding:** Raw biometric events require deterministic tenant validation.
- **Remediation:** In `biometricGatewayService.ts` and `enterpriseResilienceEngine.ts`, each connector pairing token is permanently bound to `organization_id`. Ingested events validate:
  $$\text{Connector} \rightarrow \text{Organization} \rightarrow \text{Device} \rightarrow \text{Device User} \rightarrow \text{Employee}$$
  Cross-tenant device mapping is rejected before hitting attendance calculation.

### Finding 3: Cache Key & Realtime Namespace Isolation
- **Finding:** Shared cache keys or broadcast channels could inadvertently expose event counts or punch summaries.
- **Remediation:** All Redis and local cache keys use the prefix `org:{organizationId}:*`. Realtime PostgreSQL and Supabase channels use `org_{organizationId}_{module}`.

### Finding 4: Error Handling & Data Leak Prevention
- **Finding:** Uncaught exceptions could return database column names, foreign key violations, or SQL fragments to the client.
- **Remediation:** Centralized `AppErrorHandler` intercepts all errors, generates a traceable `requestId` (e.g., `req_1726053890_839`), logs the stack trace server-side without secrets, and returns sanitized JSON:
  ```json
  {
    "code": "ATTENDANCE_SYNC_FAILED",
    "message": "Attendance synchronization could not be completed.",
    "requestId": "req_1726053890_839",
    "timestamp": "2026-09-11T13:34:50.000Z"
  }
  ```

### Finding 5: Concurrency & Idempotency
- **Finding:** Simultaneous punches or concurrent payroll runs could lead to duplicate ledger entries or double overtime calculation.
- **Remediation:** Implemented deterministic SHA-256 idempotency hashing (`IdempotencyService`), database unique indexes on `(organization_id, device_id, device_user_id, event_timestamp)` and `(organization_id, pay_period_id, run_type)`, plus optimistic version locking on attendance rules (`rule_version`).
