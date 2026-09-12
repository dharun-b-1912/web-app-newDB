# JOY PeopleHR — Enterprise QA & Quality Gate Strategy

## 1. Overview & Core Philosophy
The quality assurance strategy for **JOY PeopleHR** enforces a multi-layered verification pyramid. Automated testing precedes all human inspection, real hardware precedes cloud releases, and tenant isolation is validated at every commit.

```
       [ Production / Google Play ]
                   ▲
       [ Human QA & Pilot UAT ]
                   ▲
       [ Firebase App Distribution ]
                   ▲
       [ Firebase Test Lab (Real Devices) ]
                   ▲
    [ Integration & E2E Hardware Tests ]
                   ▲
    [ Unit Tests & Widget Component Tests ]
                   ▲
 [ Static Analysis (Flutter Analyze & TypeScript) ]
```

---

## 2. The 8 Testing Levels

| Test Level | Scope | Tools / Frameworks | Execution Trigger | Gate Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1: Static Analysis** | Dart linting, TypeScript types | `flutter analyze`, `tsc --noEmit` | Every PR & commit | 0 errors |
| **Level 2: Unit Testing** | Calculations, source locking, OT | `flutter test`, `vitest` | Every PR & commit | 100% pass |
| **Level 3: Widget Testing** | UI responsiveness, live timers | Flutter Widget Tester | Every PR & commit | 100% pass |
| **Level 4: Integration Testing**| Critical user journeys (Login->Punch) | Flutter `integration_test` | Merge to `qa`/`staging` | 100% pass |
| **Level 5: Security & RLS** | Multi-tenant isolation, data leaks | Supabase RLS test matrix | Every release build | 0 leaks |
| **Level 6: Hardware E2E** | eSSL device -> Connector -> Realtime | eSSL ADMS test suite | Every hardware release | <1s latency |
| **Level 7: Device Test Lab** | Real Android hardware matrix | Firebase Test Lab | Staging / RC builds | 0 crashes |
| **Level 8: UAT & Human QA** | Pilot employee & HR workflows | Firebase App Distribution | QA & Staging gates | Sign-off |

---

## 3. Mandatory Invariant Verification
1. **One Employee = One Attendance Session Per Day:** Regardless of channel (Face, Fingerprint, RFID, Mobile GPS).
2. **Attendance Source Lock:** The first accepted channel locks the active session mode.
3. **Dynamic Working Timer:** Computed server-side from `first_check_in`, unaffected by app termination or backgrounding.
4. **Tenant Isolation:** Cross-tenant queries return 0 rows.
