# WorkforceOS Enterprise HRMS — Two-Developer Parallel Collaboration Plan

> **Project:** `workforceos-enterprise-hrms`  
> **Stack:** React 19 · TypeScript · Vite · TailwindCSS v4 · Recharts · Lucide · Supabase  
> **Date:** August 14, 2026  
> **Version:** 1.0

---

## 👥 Team Split At a Glance

| | Developer 1 (D1) | Developer 2 (D2) |
|---|---|---|
| **Domain** | Platform Admin + HR & Company Admin | Manager + Team Lead + Employee |
| **Persona** | Super Admin, Company Admin, HR Head | Manager, Team Lead, Employee |
| **Key Features** | Platform SaaS control, all HR core modules | ESS portal, TL supervisor hub, Manager views |
| **Route Prefix** | `platform-*`, `admin-*`, `payroll-*`, `analytics-*`, `lms-*`, `performance-*`, `leave-*`, `attendance-*`, etc. | `tl-*`, `ess-*`, `dashboard`, `workspace` |

---

## 📁 File Ownership Registry

> **Legend:** 🔵 D1 Exclusive · 🟢 D2 Exclusive · 🟡 Shared (coordinate) · 🔴 Frozen (no solo edits)

### `src/features/` — Module Features

| Feature Folder | Owner | Notes |
|---|---|---|
| `platform/` | 🔵 D1 | Full SaaS Platform Admin panel |
| `admin/` | 🔵 D1 | Company control plane, RBAC, audit |
| `people/` | 🔵 D1 | Employee master directory |
| `organization/` | 🔵 D1 | Org chart, departments, designations |
| `payroll/` | 🔵 D1 | Payroll processing, salary, statutory |
| `attendance/` | 🔵 D1 | Attendance master, biometric, GPS |
| `leave/` | 🔵 D1 | Leave types, policies, accrual engine |
| `lms/` | 🔵 D1 | Learning management system |
| `performance/` | 🔵 D1 | OKR, KPI, KRA, appraisal cycles |
| `analytics/` | 🔵 D1 | All BI dashboards and reports |
| `talent/` | 🔵 D1 | Recruitment ATS, career dev, compensation |
| `onboarding/` | 🔵 D1 | New hire workflows |
| `offboarding/` | 🔵 D1 | Exit clearance, F&F |
| `compliance/` | 🔵 D1 | Labor law, POSH, employee relations |
| `documents/` | 🔵 D1 | Document vault, e-sign |
| `automation/` | 🔵 D1 | Workflow engine, approvals, notifications |
| `settings/` | 🔵 D1 | System settings |
| `rbac/` | 🔵 D1 | Role & permission management |
| `tl/` | 🟢 D2 | Team Lead supervisor portal |
| `ess/` | 🟢 D2 | Employee Self-Service portal |
| `dashboard/` | 🟢 D2 | HR Dashboard landing (shared-role view) |
| `workspace/` | 🟢 D2 | My Workspace, HR Services |
| `auth/` | 🟡 Shared | Login, session — agree first, freeze |
| `other/` | 🟡 Shared | Travel, POSH ops, helpdesk, engagement |
| `assistant/` | 🟡 Shared | AI copilot drawer |

---

### `src/components/` — Shared UI Layer

| File / Folder | Owner | Rules |
|---|---|---|
| `shell/AppShell.tsx` | 🔴 Frozen | Core layout wrapper — no changes without PR |
| `shell/Sidebar.tsx` | 🟡 Shared | Each dev edits **only their role's menu section** |
| `shell/Topbar.tsx` | 🔴 Frozen | Do not modify independently |
| `shell/UserMenu.tsx` | 🔴 Frozen | Persona switcher — agreed shape, do not touch |
| `shell/GlobalSearch.tsx` | 🟡 Shared | Coordinate if adding new searchable entities |
| `ui/` | 🟡 Shared | Both devs can add new UI primitives via PR |
| `auth/RouteGuard.tsx` | 🔴 Frozen | RBAC enforcement — only change together |

---

### `src/` — Core Infrastructure

| File | Owner | Rules |
|---|---|---|
| `App.tsx` | 🔴 **Frozen after kickoff** | All routes agreed upfront. Any new route = joint PR |
| `types/index.ts` | 🔵 D1 owns · D2 proposes | D2 opens PR for type changes, D1 merges |
| `types/tl.ts` | 🟢 D2 | D2 can freely extend |
| `types/ess.ts` | 🟢 D2 | D2 can freely extend |
| `types/platformAdmin.ts` | 🔵 D1 | D1 owns fully |
| `types/*.ts` (all others) | 🔵 D1 | All HR domain types |
| `hooks/useAuth.tsx` | 🔴 Frozen | Auth contract frozen after kickoff session |
| `hooks/usePermission.ts` | 🔴 Frozen | RBAC hook — freeze after agreement |
| `hooks/useTenant.tsx` | 🔴 Frozen | Tenant hook — freeze after agreement |
| `services/api.ts` | 🔴 Frozen | Core API class — freeze after kickoff |
| `services/mockData.ts` | 🔴 Frozen | Shared mock data — both read, neither edits solo |
| `services/tlApi.ts` | 🟢 D2 | D2 owns fully |
| `services/essApi.ts` | 🟢 D2 | D2 owns fully |
| `services/*Api.ts` (others) | 🔵 D1 | D1 owns all HR service APIs |
| `index.css` | 🔴 Frozen | Global design tokens — coordinate before changing |
| `main.tsx` | 🔴 Frozen | Entry point — do not touch |

---

## 🌿 Git Branch Strategy

```
main (production-ready, protected)
 └── dev (integration branch — merge target)
      ├── feat/d1-platform-admin
      ├── feat/d1-hr-core
      ├── feat/d1-payroll-leave-attendance
      ├── feat/d1-analytics-performance
      └── feat/d2-ess-portal
      └── feat/d2-tl-supervisor
      └── feat/d2-manager-dashboard
```

### Daily Git Workflow

```bash
# Start of day — always pull latest dev first
git checkout dev
git pull origin dev

# Switch to your feature branch and rebase
git checkout feat/d1-hr-core        # or your branch
git rebase dev                      # keep your branch current

# Work, commit frequently with clear messages
git commit -m "feat(payroll): add salary processing step wizard"

# End of day — push your branch
git push origin feat/d1-hr-core

# Every 1-2 days — merge into dev
git checkout dev
git merge feat/d1-hr-core
git push origin dev
```

### Commit Message Convention

```
feat(module): short description        # New feature
fix(module): short description         # Bug fix
refactor(module): short description    # Code cleanup
types(module): add/update interfaces   # Type changes
shared: description                    # Touches shared files
```

**Examples:**
```
feat(payroll): implement payroll processing 4-step wizard
feat(ess): add leave application modal with validation
fix(attendance): correct biometric sync timestamp parsing
types(leave): add LeaveAccrualRule interface
shared(sidebar): add ess-learning menu item to D2 section
```

---

## 🤝 Kickoff Session Checklist (Do Together — ~2 Hours)

Before splitting, complete this checklist **as a pair**:

### Phase 1 — Agree on Auth Contracts (30 min)

- [ ] Lock `useAuth` — agree on `user.roles[0].name` values:
  - `'Super Admin'` → Platform Admin
  - `'Company Admin'` → Company Admin (HRMS)
  - `'HR Head'` → HR Admin
  - `'Manager'` → Manager
  - `'Team Lead'` → Team Lead
  - `'Employee'` → Employee ESS
- [ ] Lock `usePermission` — agree on `canViewModule(route)` logic per role
- [ ] Lock `useTenant` — agree on `tenantId` / `companyId` shape
- [ ] **Tag and freeze:** `git tag v0.1-contracts`

### Phase 2 — Agree on All Route Strings (20 min)

Review every `case` in `App.tsx`. Both devs must agree:
- No new routes added without joint PR
- D2 confirms all `tl-*` and `ess-*` routes are complete
- D1 confirms all `platform-*` and `admin-*` routes are complete
- **Tag and freeze App.tsx**

### Phase 3 — Agree on Core TypeScript Types (30 min)

Review `src/types/index.ts` together. Lock these interfaces:

```typescript
// These are FROZEN — no solo changes
User, Role, Permission, Tenant, Company,
Employee, Department, Designation, Location
```

D2 is free to extend `tl.ts` and `ess.ts` domain types only.

### Phase 4 — Agree on Mock Data Contracts (20 min)

Review `services/mockData.ts` together:
- Lock the shape of `mockEmployees`, `mockDepartments`, `mockRoles`
- Both devs use the same mock data IDs in their features
- D2 can create additional mock data in `services/tlMockData.ts` and `services/essMockData.ts` (new files, owned by D2)

### Phase 5 — Create Stub Components (20 min, can be scripted)

Every feature module must export a named stub **before splitting**:

```tsx
// src/features/tl/TlMasterModule.tsx  (D2's stub — created at kickoff)
export const TlMasterModule: React.FC<{ initialTab?: string }> = () => (
  <div>TL Module — Under Construction</div>
);

// src/features/payroll/PayrollMasterModule.tsx  (D1's stub)
export const PayrollMasterModule: React.FC<{ initialTab?: string }> = () => (
  <div>Payroll Module — Under Construction</div>
);
```

This ensures `App.tsx` never has broken imports while both devs build.

---

## 🔴 Collision Prevention Rules

### Rule 1 — The 48-Hour PR Rule
Any change to a **🔴 Frozen** or **🟡 Shared** file must:
1. Be raised as a GitHub PR (or shared diff)
2. Be reviewed and approved by the other developer
3. Merged within 48 hours maximum

### Rule 2 — The Sidebar Section Boundary
`Sidebar.tsx` is divided into role sections. Each developer owns their section:

```tsx
{/* ═══ D1 SECTION ═══════════════════════════════════ */}
{/* Platform Admin, HR Admin, Payroll, Analytics, etc */}
{renderPlatformMenu()}
{renderHrMenu()}
{renderPayrollMenu()}
...

{/* ═══ D2 SECTION ═══════════════════════════════════ */}
{/* ESS, TL, Dashboard, Workspace */}
{renderEssMenu()}
{renderTlMenu()}
{renderDashboardMenu()}
```

**Neither dev edits the other's sidebar section without discussion.**

### Rule 3 — No Direct `main` Commits
```bash
# ❌ NEVER do this
git push origin main

# ✅ Always go through dev branch + PR
git push origin feat/your-branch
# then PR → dev → eventually main
```

### Rule 4 — Rebase Before Every PR
```bash
git fetch origin
git rebase origin/dev    # before opening any PR
```

This keeps history linear and prevents "merge hell".

### Rule 5 — Type Changes are D1 PRs
If D2 needs a new field on a shared type (e.g., `Employee.teamLeadId`):
1. D2 raises it as a GitHub Issue or message
2. D1 adds the field and creates a PR
3. D2 pulls and uses the new field

---

## 📋 Developer 1 (D1) — Module Build Order

> **Domain:** Platform Admin + HR Admin + Company Admin  
> **Suggested sequence — build in this order to avoid dependencies blocking you:**

### Sprint 1 — Foundation (Week 1)
- [ ] `PlatformAdminMasterModule` — all `platform-*` tabs
  - Platform Dashboard, Tenants, Provisioning, Health
  - Users, Staff, Roles, Subscriptions, Plans
  - Billing, Usage, Features, Flags, Marketplace
  - API Keys, Webhooks, Security, Sessions
  - Operations, Jobs, Incidents, Support, Audit, Announcements
- [ ] `AdminMasterModule` — all `admin-*` tabs
  - Admin Dashboard, User Management, Role Management
  - Permissions & Scope, Workflow Builder, Approval Config
  - Notification Settings, Audit Logs, Security & MFA
  - API & Webhooks, Integrations, Subscription, Billing, Settings

### Sprint 2 — Core HR (Week 2)
- [ ] `PeopleView` — Employee master directory
- [ ] `OrganizationView`, `DepartmentView`, `DesignationView`, `LocationView`
- [ ] `AssetsView` — IT asset tracking
- [ ] `OnboardingView` — new hire workflows
- [ ] `OffboardingView` — exit clearance
- [ ] `DocumentManagementView`

### Sprint 3 — Attendance & Leave (Week 3)
- [ ] `AttendanceModuleMaster` — all attendance sub-tabs
- [ ] `LeaveManagementModule` — all leave sub-tabs

### Sprint 4 — Payroll & Talent (Week 4)
- [ ] `PayrollMasterModule` — all payroll sub-tabs
- [ ] `RecruitmentView` — ATS pipeline
- [ ] `TalentManagementView` — career dev, compensation

### Sprint 5 — Performance, LMS & Analytics (Week 5)
- [ ] `PerformanceMasterModule` — all performance sub-tabs
- [ ] `LmsMasterModule` — all LMS sub-tabs
- [ ] `AnalyticsMasterModule` — all analytics sub-tabs

### Sprint 6 — Automation & Compliance (Week 6)
- [ ] `AutomationView` — workflows, approvals, notifications
- [ ] `EmployeeRelationsView` — compliance
- [ ] `OtherMasterModule` — travel, POSH, helpdesk, engagement
- [ ] `HrServicesView`
- [ ] `ComplianceView`

---

## 📋 Developer 2 (D2) — Module Build Order

> **Domain:** Manager + Team Lead + Employee  
> **Suggested sequence:**

### Sprint 1 — ESS Foundation (Week 1)
- [ ] `EssMasterModule` — all `ess-*` tabs
  - ESS Home / Dashboard
  - My Attendance (personal check-in, regularization)
  - My Leave (apply, history, balances)
  - My Payroll (payslip viewer, tax docs)
  - My Requests (unified request center)
  - My Performance (self-assessment, goals)
  - My Learning (course player, certificates)
  - My Documents (personal vault)
  - Communication (announcements, surveys)
  - My Profile (personal info, emergency contact)

### Sprint 2 — TL Supervisor Hub (Week 2)
- [ ] `TlMasterModule` — all `tl-*` tabs
  - TL Dashboard (team health metrics)
  - My Team (member directory, status)
  - Team Attendance (live ledger, shifts)
  - Team Leave (approval desk, conflicts)
  - Approval Center (WFH, regularization, OT)
  - Team Tasks (sprint tasks, priorities)
  - Performance (team goals, OKR, feedback)
  - Team Training (LMS assignments, compliance)
  - Communication (team announcements, recognition)
  - Team Reports (attendance %, CSV export)

### Sprint 3 — Dashboard & Workspace (Week 3)
- [ ] `DashboardView` — HR Dashboard landing
  - Workforce Overview (`workforce-overview`)
  - Executive HR Overview (`executive-overview`)
- [ ] `MyWorkspaceView`
- [ ] `HrServicesView` (requests view)

### Sprint 4 — Manager Views & Polish (Week 4)
- [ ] Manager-scoped views of shared modules:
  - Department attendance view
  - Team leave approval flow (consumed from `leave/` API)
  - Performance review manager forms
- [ ] End-to-end ESS flow testing
- [ ] End-to-end TL flow testing

---

## 🧪 Testing Protocol

### Before Every PR

```bash
# 1. TypeScript check — zero errors allowed
npm run typecheck

# 2. Start dev server — verify no runtime crashes
npm run dev

# 3. Switch persona (via UserMenu) through all roles:
#    Super Admin → Company Admin → HR Head → Manager → Team Lead → Employee
#    No white screens, no console errors

# 4. Navigate every route you've touched
#    Sidebar click → correct module renders
```

### Shared Test Scenarios (Both devs run these)

| Scenario | Expected Result |
|---|---|
| Login as **Super Admin** → navigate `platform-dashboard` | PlatformAdminMasterModule renders |
| Login as **Company Admin** → navigate `admin-dashboard` | AdminMasterModule renders |
| Login as **HR Head** → navigate `payroll-dashboard` | PayrollMasterModule renders |
| Login as **Manager** → navigate `dashboard` | DashboardView renders |
| Login as **Team Lead** → navigate `tl-dashboard` | TlMasterModule renders |
| Login as **Employee** → navigate `ess-dashboard` | EssMasterModule renders |
| Switch persona mid-session | Redirects to correct home route, no crash |
| Navigate to unauthorized route | RouteGuard blocks, no crash |

---

## 💬 Daily Communication Protocol

### Morning Standup (15 min)
Each dev answers:
1. **What did I complete yesterday?** (list routes/features)
2. **What am I building today?** (planned routes)
3. **Do I need to touch any shared file today?** → notify other dev immediately

### Shared File Alert Format
When you MUST touch a shared file, send this message to your partner:

```
🔔 SHARED FILE ALERT
File: src/components/shell/Sidebar.tsx
Change: Adding `ess-learning` menu item to D2 sidebar section
Impact: None on D1 section — isolated to ESS group
ETA: Today 3pm
PR: Will share diff before committing
```

### Conflict Resolution
If you hit a merge conflict in a shared file:
1. **Stop** — do not auto-resolve
2. **Call/message** your partner
3. **Resolve together** on a call
4. **Both review** the resolved file before committing

---

## 🚀 Quick Reference Card

### D1 Daily Commands
```bash
git checkout feat/d1-hr-core
git rebase origin/dev
# ... do your work ...
git add src/features/payroll/
git commit -m "feat(payroll): add salary component builder"
git push origin feat/d1-hr-core
```

### D2 Daily Commands
```bash
git checkout feat/d2-ess-portal
git rebase origin/dev
# ... do your work ...
git add src/features/ess/
git commit -m "feat(ess): add leave application modal"
git push origin feat/d2-ess-portal
```

### Integration Merge (every 1-2 days)
```bash
# Done by whoever finished a feature milestone
git checkout dev
git pull origin dev
git merge feat/d1-hr-core   # or d2 branch
# resolve any conflicts with partner
git push origin dev
```

---

## 📊 Module Completion Tracker

> Update this table as modules are completed. Both devs maintain this.

### D1 Modules

| Module | Status | Branch | Notes |
|---|---|---|---|
| PlatformAdminMasterModule | ⬜ Not Started | feat/d1-platform-admin | |
| AdminMasterModule | ⬜ Not Started | feat/d1-hr-core | |
| PeopleView | ⬜ Not Started | feat/d1-hr-core | |
| OrganizationView | ⬜ Not Started | feat/d1-hr-core | |
| AttendanceModuleMaster | ⬜ Not Started | feat/d1-payroll-leave-attendance | |
| LeaveManagementModule | ⬜ Not Started | feat/d1-payroll-leave-attendance | |
| PayrollMasterModule | ⬜ Not Started | feat/d1-payroll-leave-attendance | |
| PerformanceMasterModule | ⬜ Not Started | feat/d1-analytics-performance | |
| LmsMasterModule | ⬜ Not Started | feat/d1-analytics-performance | |
| AnalyticsMasterModule | ⬜ Not Started | feat/d1-analytics-performance | |
| AutomationView | ⬜ Not Started | feat/d1-analytics-performance | |

### D2 Modules

| Module | Status | Branch | Notes |
|---|---|---|---|
| EssMasterModule | ⬜ Not Started | feat/d2-ess-portal | |
| TlMasterModule | ⬜ Not Started | feat/d2-tl-supervisor | |
| DashboardView | ⬜ Not Started | feat/d2-manager-dashboard | |
| MyWorkspaceView | ⬜ Not Started | feat/d2-manager-dashboard | |

---

## ⚡ The Golden Rules Summary

> Print this and pin it at your desk.

1. 🔴 **Never commit directly to `main` or `dev`**
2. 🔴 **Never edit a 🔴 Frozen file alone** — always PR
3. 🟡 **For every shared file change** — send a Shared File Alert first
4. 🌿 **Rebase `dev` every morning** before starting work
5. 🧪 **Run `npm run typecheck` before every push** — zero errors
6. 💬 **If you're unsure — ask first, code second**
7. 🤝 **Conflict in a shared file = resolve together on a call**
8. 📋 **Update the Module Completion Tracker** when you finish a module

---

*WorkforceOS Enterprise HRMS — Team Collaboration Plan v1.0*  
*Generated: August 14, 2026*
