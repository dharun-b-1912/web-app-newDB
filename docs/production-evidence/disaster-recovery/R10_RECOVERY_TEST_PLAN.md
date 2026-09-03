# 🧪 Joy PeopleHR — Gate R10: PITR Disaster Recovery Test Plan & Scenario Drill

---

## 🎯 Drill Scenario Definition

| Stage | Simulated Time | Event / Transaction | Target System State |
| :---: | :---: | :--- | :--- |
| **Phase 1** | `10:00:00 UTC` | Employee attendance punched for 2,500 factory workers | Persisted in `attendance_events` with SHA-256 idempotency key |
| **Phase 2** | `10:05:00 UTC` | Vendor invoice approved and snapshot sealed | Stored in `vendor_5way_reconciliations` with SHA-256 seal `7FA821B4C9...` |
| **Phase 3** | `10:10:00 UTC` | Erroneous / unauthorized test transaction injected | Corrupting records |
| **Phase 4** | `10:15:00 UTC` | Catastrophic incident / table deletion detected | Writes frozen |
| **Phase 5** | `10:20:00 UTC` | **PITR Recovery Triggered to `10:09:59 UTC`** | Restore WAL point before corruption |

---

## 📊 Required Acceptance Proof
* [x] **Attendance Records**: 100% restored up to 10:00:00.
* [x] **Vendor Invoices**: 100% restored up to 10:05:00.
* [x] **SHA-256 Seal Invariance**: `pre_incident_hash === restored_hash` (0 drift).
* [x] **Erroneous Transactions**: 10:10:00 corrupt records cleanly excluded.
* [x] **Tenant Boundary**: Zero cross-tenant data leakage.
