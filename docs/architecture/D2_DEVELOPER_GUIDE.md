# WorkforceOS HRMS — Developer 2 (D2) Complete Guide

> **Your Domain:** Manager · Team Lead · Employee Self-Service  
> **Repo:** [github.com/dharun-b-1912/Joy-HRMS-DEV](https://github.com/dharun-b-1912/Joy-HRMS-DEV)  
> **Stack:** React 19 · TypeScript · Vite · TailwindCSS v4 · Supabase  
> **Date:** August 14, 2026

---

## 🧭 What You Own (D2 Domain)

| Module | Routes | Folder |
|---|---|---|
| **ESS Portal** | `ess-dashboard`, `ess-attendance`, `ess-leave`, `ess-payroll`, `ess-requests`, `ess-performance`, `ess-learning`, `ess-documents`, `ess-communication`, `ess-profile` | `src/features/ess/` |
| **TL Supervisor** | `tl-dashboard`, `tl-my-team`, `tl-attendance`, `tl-leave`, `tl-approvals`, `tl-tasks`, `tl-performance`, `tl-training`, `tl-communication`, `tl-reports` | `src/features/tl/` |
| **Dashboard** | `dashboard`, `workforce-overview`, `executive-overview` | `src/features/dashboard/` |
| **Workspace** | `my-workspace`, `workspace` | `src/features/workspace/MyWorkspaceView.tsx` |
| **ESS Types** | — | `src/types/ess.ts` |
| **TL Types** | — | `src/types/tl.ts` |
| **ESS API** | — | `src/services/essApi.ts` |
| **TL API** | — | `src/services/tlApi.ts` |

---

## 🚀 Step 1 — Clone & Setup (One-Time)

### 1.1 Clone the repo
```bash
git clone https://github.com/dharun-b-1912/Joy-HRMS-DEV.git
cd Joy-HRMS-DEV
```

### 1.2 Install dependencies
```bash
npm install
```

### 1.3 Create your `.env.local` (never commit this)
```env
VITE_GEMINI_API_KEY=""
GEMINI_API_KEY=""
APP_URL="http://localhost:3000"

VITE_SUPABASE_URL="https://wmqjmyzzamgxyeuotbki.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA"
```

### 1.4 Set your git identity
```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### 1.5 Switch to your branch and verify the app runs
```bash
git checkout feat/d2-ess-portal
npm run dev
# Open: http://localhost:3000
# Login as Employee → ESS portal
# Login as Team Lead → TL dashboard
```

---

## 🌿 Your Git Branches

```
main  ← protected, never push here
 └── dev  ← integration, merge here daily
      ├── feat/d2-ess-portal         ← Sprint 1 (ESS)
      ├── feat/d2-tl-supervisor      ← Sprint 2 (TL)
      └── feat/d2-manager-dashboard  ← Sprint 3 (Dashboard)
```

---

## 📅 Daily Git Workflow

### ☀️ Start of Day
```bash
# Pull latest changes from D1
git checkout dev
git pull origin dev

# Rebase your branch on top of dev
git checkout feat/d2-ess-portal
git rebase dev

npm run dev   # start building 🚀
```

### 🌙 End of Day
```bash
git add src/features/ess/
git commit -m "feat(ess): add leave application modal with date picker"
git push origin feat/d2-ess-portal
```

### 🔀 Merge to dev (every 1–2 days)
```bash
git checkout dev
git pull origin dev
git merge feat/d2-ess-portal
git push origin dev
```

---

## 📝 Commit Message Format

```bash
feat(ess): short description     # New ESS feature
feat(tl): short description      # New TL feature
fix(ess): short description      # Bug fix
types(ess): add XYZ interface    # Type changes (your files only)
shared: description              # ⚠️ Alert D1 first
```

---

## 🗓️ Build Order

### Sprint 1 — ESS Portal
Branch: `feat/d2-ess-portal`

| Sub-view | Route | File |
|---|---|---|
| ESS Home | `ess-dashboard` | `EssDashboardView.tsx` |
| My Attendance | `ess-attendance` | `EssAttendanceView.tsx` |
| My Leave | `ess-leave` | `EssLeaveView.tsx` |
| My Payroll | `ess-payroll` | `EssPayrollView.tsx` |
| My Requests | `ess-requests` | `EssRequestsView.tsx` |
| My Performance | `ess-performance` | `EssPerformanceView.tsx` |
| My Learning | `ess-learning` | `EssLearningView.tsx` |
| My Documents | `ess-documents` | `EssDocumentsView.tsx` |
| Communication | `ess-communication` | `EssCommunicationView.tsx` |
| My Profile | `ess-profile` | `EssProfileView.tsx` |

### Sprint 2 — TL Supervisor
Branch: `feat/d2-tl-supervisor`

| Sub-view | Route | File |
|---|---|---|
| TL Dashboard | `tl-dashboard` | `TlDashboardView.tsx` |
| My Team | `tl-my-team` | `TlMyTeamView.tsx` |
| Team Attendance | `tl-attendance` | `TlAttendanceView.tsx` |
| Team Leave | `tl-leave` | `TlLeaveView.tsx` |
| Approval Center | `tl-approvals` | `TlApprovalsView.tsx` |
| Team Tasks | `tl-tasks` | `TlTeamTasksView.tsx` |
| Performance | `tl-performance` | `TlPerformanceView.tsx` |
| Team Training | `tl-training` | `TlTrainingView.tsx` |
| Communication | `tl-communication` | `TlCommunicationView.tsx` |
| Team Reports | `tl-reports` | `TlReportsView.tsx` |

### Sprint 3 — Manager Dashboard
Branch: `feat/d2-manager-dashboard`

| Sub-view | Route | File |
|---|---|---|
| HR Dashboard | `dashboard` | `DashboardView.tsx` |
| Workforce Overview | `workforce-overview` | `DashboardView.tsx` |
| Executive Overview | `executive-overview` | `DashboardView.tsx` |
| My Workspace | `my-workspace` | `MyWorkspaceView.tsx` |

---

## 🚫 Files — DO NOT Touch Alone

| File | Rule |
|---|---|
| `src/App.tsx` | 🔴 Frozen — message D1 |
| `src/components/shell/AppShell.tsx` | 🔴 Frozen |
| `src/hooks/useAuth.tsx` | 🔴 Frozen |
| `src/hooks/usePermission.ts` | 🔴 Frozen |
| `src/services/api.ts` | 🔴 Frozen |
| `src/services/mockData.ts` | 🔴 Read only |
| `src/types/index.ts` | 🔵 D1 owns — raise a request |
| `src/index.css` | 🟡 Coordinate first |
| `src/components/shell/Sidebar.tsx` | 🟡 Edit your section only |

## ✅ Files — Fully Yours

```
src/features/ess/       ← 100% yours
src/features/tl/        ← 100% yours
src/features/dashboard/ ← 100% yours
src/types/ess.ts        ← 100% yours
src/types/tl.ts         ← 100% yours
src/services/essApi.ts  ← 100% yours
src/services/tlApi.ts   ← 100% yours
```

---

## ✅ Before Every Push — Checklist

```bash
npm run typecheck    # must be zero errors ✅
npm run dev          # test these login personas:

# Employee  → ess-dashboard, ess-leave, ess-payroll, ess-profile
# Team Lead → tl-dashboard, tl-my-team, tl-approvals, tl-tasks
# Manager   → dashboard, workforce-overview
# Switch personas mid-session → no crash, no white screen ✅
```

---

## 🔑 Quick Commands Reference Card

```bash
# === DAILY START ===
git checkout dev
git pull origin dev
git checkout feat/d2-ess-portal
git rebase dev
npm run dev

# === SAVE WORK ===
git add src/features/ess/
git commit -m "feat(ess): your message here"
git push origin feat/d2-ess-portal

# === SWITCH SPRINT ===
git checkout feat/d2-tl-supervisor     # Sprint 2
git checkout feat/d2-manager-dashboard # Sprint 3

# === MERGE TO DEV ===
git checkout dev
git pull origin dev
git merge feat/d2-ess-portal
git push origin dev

# === QUICK STATUS ===
git status
git log --oneline -5
git branch -a
```

---

## 🏆 D2 Golden Rules

1. ✅ Always start from `dev` — pull before you code
2. ✅ Only work in your feature branches — never `main`
3. ✅ Run `npm run typecheck` before every push
4. ✅ Test Employee + TL + Manager personas before done
5. ✅ Merge to `dev` every 1–2 days — don't diverge
6. ✅ Alert D1 before touching any shared/frozen file
7. ✅ Conflict in shared file = call D1, resolve together

---

*WorkforceOS — D2 Developer Guide v1.0 | August 14, 2026*
