# JOY PeopleHR — Rate Limiting & Circuit Breaker Report

**Report Date:** 2026-09-11  
**Services:** `src/services/resilience/rateLimitService.ts`, `src/services/resilience/circuitBreakerService.ts`  
**Test Suite:** `src/services/__tests__/enterpriseResilienceAndRateLimit.test.ts` (Gates 1 & 2)  
**Overall Status:** PASSED & CERTIFIED  

---

## 1. Rate Limiting Configurations

| Endpoint Category | Max Requests Allowed | Window | Rate Limit Action |
|---|---|---|---|
| **Default API** | 120 req / min | 60 seconds | Throws `429 RATE_LIMITED` with `retryAfterSeconds` |
| **Device Commands** | 15 cmds / min | 60 seconds | Prevents terminal flooding on hardware |
| **Auth Endpoints** | 10 req / min | 60 seconds | Prevents brute force password/OTP attacks |
| **Bulk Operations** | 5 jobs / min | 60 seconds | Protects background queues |
| **Exports** | 10 exports / min | 60 seconds | Protects memory and PDF rendering |

---

## 2. Circuit Breaker Behavior

- **State Transitions:** `CLOSED` &rarr; `OPEN` (after 3 consecutive dependency failures) &rarr; `HALF_OPEN` (after 30s timeout) &rarr; `CLOSED` (after 2 successful probes).
- **Protection:** Protects `eSSL AI-FACE MAGNUM` terminal connections and external webhooks from cascading hang-ups during network degradation.
