# JOY PEOPLEHR — ENTERPRISE PRODUCT EVOLUTION ROADMAP & GOVERNANCE SPECIFICATION

**Authority:** Enterprise Architecture Governance Board  
**Status:** **ACTIVE ROADMAP & PROGRAM SPECIFICATION**  
**Release Baseline:** `v1.0.0-production-release` (Commit `9830c3174c54fd615b0e91152174a5fb704f315c`)  
**Backend:** Canonical Supabase PostgreSQL (`https://wmqjmyzzamgxyeuotbki.supabase.co`)  

---

## 1. Master Program Evolution Architecture

```
════════════════════════════════════════════════════════════
         JOY PEOPLEHR ENTERPRISE EVOLUTION ROADMAP
════════════════════════════════════════════════════════════

PHASE 1–8
ARCHITECTURAL RECOVERY (COMPLETE)
        │
        ▼
PHASE 9
INDEPENDENT PRODUCTION VALIDATION (CERTIFIED)
        │
        ▼
PHASE 10
PRODUCTION CUTOVER & OPERATIONAL HANDOVER (CERTIFIED)
        │
        ▼
════════════════════════════════════════════════════════════
         PRODUCTION BASELINE FROZEN (v1.0.0)
════════════════════════════════════════════════════════════
        │
        ▼
PHASE 11
DATABASE INTELLIGENCE & CANONICALIZATION (CERTIFIED)
        │
        ├── PASS 1: READ-ONLY FORENSIC AUDIT (318 Tables Mapped)
        └── PASS 2: CONTROLLED FORWARD EVOLUTION (Migrations 094–098)
        │
        ▼
PHASE 12
PRODUCT DOMAIN MATURITY (NEXT ACTIVE FOCUS)
        │
        ├── Stream A: Core Workforce Intelligence
        ├── Stream B: Workforce Scheduling Intelligence
        ├── Stream C: Unified Workflow Approval Engine
        └── Stream D: Payroll Enterprise Statutory Maturity
        │
        ▼
PHASE 13
ENTERPRISE SCALE & MULTI-TENANT SAAS MATURITY
        │
        ├── Tenant Provisioning & Metering Engine
        ├── Automated Onboarding & Entitlement Gates
        └── Multi-Region Edge Caching & Scaled Event Processing
        │
        ▼
PHASE 14
AI, ANALYTICS & WORKFORCE INTELLIGENCE PLATFORM
        │
        ├── Attrition Risk Prediction Models
        ├── Automated Shift Optimization AI
        └── Natural Language HR Intelligence Assistant
```

---

## 2. Phase 12: Enterprise Product Domain Maturity

The goal of Phase 12 is to transition every functional module from basic operational HR into an enterprise-grade SaaS capability, strictly respecting the frozen architectural boundaries.

### Stream A: Core Workforce Intelligence (Lifecycle Immutability)
Never overwrite employment history. Transitions must be recorded as immutable lifecycle events:

```text
EMPLOYEE
   │
   ├── Employment Lifecycle
   ├── Probation → Confirmation
   ├── Department / Designation Transfer
   ├── Promotion & Grade Progression
   ├── Separation & Exit Clearance
   └── Rehire & Reinstatement
```

**Canonical Schema Specification:**
```sql
CREATE TABLE public.employee_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    event_type VARCHAR(50) NOT NULL, -- 'HIRE','PROBATION_CONFIRMED','PROMOTION','TRANSFER','SEPARATION','REHIRE'
    effective_date DATE NOT NULL,
    previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT,
    approved_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Stream B: Workforce Scheduling Intelligence
Evolve attendance beyond raw punch collection into predictive rostering and workforce planning:

```text
WORKFORCE PLANNING
       │
       ▼
SHIFT DEFINITIONS (Rotational, Night, Split, Grace Periods)
       │
       ▼
SHIFT ASSIGNMENTS (Roster Publishing, Shift Swapping)
       │
       ├────► ROSTER NOTIFICATIONS
       ├────► BIOMETRIC DEVICE NETWORK (Offline Buffering)
       └────► ATTENDANCE AGGREGATION ENGINE
                    │
                    ▼
              DAILY ATTENDANCE PROJECTIONS
                    │
                    ▼
                 PAYROLL LOSS OF PAY (LOP) / OT CALCULATION
```

---

### Stream C: Unified Workflow Approval Engine
Eliminate fragmented, module-specific approval silos. All approvals route through a centralized, event-driven engine:

```text
                 WORKFLOW ENGINE
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
     LEAVE         ATTENDANCE        HR ACTIONS
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
                 APPROVAL ENGINE (Hierarchy, Delegation, Escalation SLAs)
                        │
                        ▼
                 WORKFLOW EVENTS (IMMUTABLE AUDIT TRAIL)
```

**Core Capabilities:**
- Configurable multi-level approval hierarchies (Reporting Manager → Department Head → HR Admin).
- Time-based escalation SLAs and automated reminder dispatches.
- Out-of-office temporary delegation rules.
- Complete append-only audit trail in `workflow_actions` and `workflow_events`.

---

### Stream D: Payroll Enterprise Statutory Maturity
Make payroll entirely configuration-driven and effective-date versioned:

```text
SALARY STRUCTURE
       │
       ▼
PAYROLL COMPONENT ENGINE (Earnings, Deductions, Employer Contributions, Reimbursements)
       │
       ▼
STATUTORY RULE ENGINE (PF, ESIC, Professional Tax, TDS Slabs, LWF)
       │
       ▼
PAYROLL RUN (Calculation, Review, Lock)
       │
       ▼
PAYROLL ENTRIES ← IMMUTABLE FINAL RECORD
       │
       ▼
DISBURSEMENT PACKAGES (NACH / NEFT Banking Protocols)
```

**Effective-Date Versioning Standard:**
Statutory rules must never be hardcoded into application TypeScript logic. They must be stored in effective-dated database records:
```sql
CREATE TABLE public.statutory_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'EPFO','ESIC','PROFESSIONAL_TAX','TDS'
    effective_from DATE NOT NULL,
    effective_to DATE,
    configuration_json JSONB NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Tenant Compatibility Policy & Registry

To govern the transition between canonical `organization_id` and legacy `tenant_id` without accidental permanent divergence, the platform enforces the **Tenant Key Governance Model**:

| Table Category | Canonical Column | Legacy Column | Write Strategy | Read Strategy | Deprecation Roadmap |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Canonical Tables (19)** | `organization_id UUID` | *(None / Synced)* | Canonical Key Only | Canonical Key Only | Standard Permanent |
| **Active Dual-Key (71)** | `organization_id` | `tenant_id` | Dual Sync Trigger (095) | Coalesce / Canonical | Deprecate `tenant_id` v2.0 |
| **Legacy Tenant (50)** | *(Mapped via View)* | `tenant_id` | Transitional | Legacy Fallback | Migrate in Range 110–119 |
| **Platform / Lookup (101)**| *(None - Global)* | *(None)* | Platform Admin | Public Authenticated | Global Permanent |

---

## 4. Semantic SQL Migration Numbering Standard

To preserve clean historical ordering and eliminate file naming conflicts, future forward migrations are strictly partitioned by architectural domain:

| Migration Range | Target Architectural Domain |
|:---:|---|
| **`099–109`** | **Platform Governance, Security & RPC Contracts** |
| **`110–119`** | **Tenant Key Normalization & Compatibility Consolidation** |
| **`120–129`** | **Core HR & Employee Lifecycle Evolution** |
| **`130–139`** | **Workforce Scheduling & Attendance Intelligence** |
| **`140–149`** | **Leave & Unified Workflow Approval Engine** |
| **`150–159`** | **Enterprise Payroll & Statutory Slabs Maturity** |
| **`160–169`** | **Document Vault & Statutory Compliance Rules** |
| **`170–179`** | **LMS, Training & Performance OKR Engines** |
| **`180–189`** | **Platform Operations, Webhooks & Integrations** |
| **`190–199`** | **Performance, Composite Indexing & SaaS Scale** |

---

## 5. Master Production Release Verification Gate

Every release, pull request, or deployment candidate must achieve a 100% green status under the unified verification pipeline:

```bash
npm run verify:production
```

```
┌────────────────────────────────────────────────────────┐
│ JOY PEOPLEHR SAAS — PRODUCTION VERIFICATION PIPELINE   │
├────────────────────────────────────────────────────────┤
│ 1. guard:governance       (7 Immutable Directives)     │
│ 2. audit:schema           (318 Tables & PK Audit)      │
│ 3. audit:tenant           (Tenant Isolation Audit)     │
│ 4. audit:rls              (Zero Permissive Policies)   │
│ 5. audit:database         (FKs, Indexes, Ledgers)      │
│ 6. typecheck              (tsc --noEmit: 0 Errors)     │
│ 7. test:unit-security     (14 Security & Reality Gates)│
│ 8. test:cutover-smoke     (Live Supabase 7 Stages)     │
│ 9. build:production       (Chunk Splitting & Secrets)  │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
                    RELEASE ELIGIBLE
```
