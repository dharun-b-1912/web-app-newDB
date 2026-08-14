# WorkForceOS Enterprise HRMS — Project Architecture Audit

**Target Platform:** WorkForceOS Enterprise SaaS HRMS v5.0  
**Root Path:** `d:/Joy Corporate Solutions/workforceos-enterprise-hrms`  
**Date:** August 12, 2026  
**Auditor:** Chief Technology Officer & Principal SaaS Architect

---

## 1. System Overview & Technology Stack

WorkForceOS is built on a high-performance modern web architecture:
- **Core UI Framework:** React 18 with TypeScript 5 (Strict Type Safety)
- **Build Tooling:** Vite 6.4.3 (`npm run build` -> minified production bundle in ~10s)
- **Styling & Visual Identity:** Tailwind CSS v3 with Deep Green (`#07563D`) visual design system
- **Backend & Database:** Supabase PostgreSQL with Row-Level Security (RLS) policies
- **Authentication & RBAC:** Normalized 6-tier role hierarchy (Super Admin -> Company Admin -> HR Head -> Manager -> Team Lead -> Employee)
- **Icons:** Lucide React Enterprise Pack

---

## 2. Directory Structure & Layering Map

```text
src/
├── components/           # Reusable UI primitives and application shell components
│   ├── auth/             # Protected route guards and authorization wrappers
│   ├── shell/            # Sidebar, Topbar, AppShell, GlobalSearch, UserMenu, CompanySelector
│   └── ui/               # Avatar, Badge, Card, Modal, Drawer, Toast, Table, Buttons
├── features/             # Feature domain modules
│   ├── admin/            # Platform control plane (Users, Roles, Permissions, Security, Audit)
│   ├── analytics/        # Enterprise BI analytics (HR, CEO, Finance, Attrition, Cost)
│   ├── assistant/        # AI Copilot assistant drawer
│   ├── ats/              # Recruitment & Applicant Tracking System
│   ├── attendance/       # Clock-In, Shift Rosters, Overtime, Regularization
│   ├── auth/             # Login, Register, MFA & OAuth authentication
│   ├── compliance/       # Statutory compliance & labor law registers
│   ├── dashboard/        # Executive & Role-based HR dashboards
│   ├── documents/        # Organization e-signature document vault
│   ├── ess/              # Employee Self-Service ownership portal
│   ├── leave/            # Leave balance, entitlements, requests & calendar
│   ├── lms/              # Learning Management System & SCORM course player
│   ├── offboarding/      # Exit clearance & full & final settlement prep
│   ├── onboarding/       # New hire task lists & orientation engine
│   ├── organization/     # Org chart, entities, departments, branches, assets
│   ├── other/            # Travel, POSH, Grievances, Engagement, Helpdesk
│   ├── payroll/          # Salary structures, EPF/ESI statutory, PDF payslips
│   ├── people/           # Master employee directory & profile management
│   ├── performance/      # OKR goals, Review cycles, 360 feedback, PIP
│   ├── rbac/             # Visual role & permission simulator
│   ├── settings/         # System preferences & localization rules
│   ├── talent/           # Career development & CTC compensation reviews
│   ├── time/             # Time tracking logs & timesheets
│   ├── tl/               # Team Lead / Supervisor operational portal
│   └── workspace/        # Personal workspace & HR services dispatcher
├── hooks/                # Custom React hooks (useAuth, usePermission, useTenant)
├── lib/                  # Utilities, helper functions, RBAC permission engine
├── schemas/              # Zod validation schemas
├── services/             # API data services (adminApi, attendanceApi, leaveApi, payrollApi, etc.)
└── types/                # Domain interface definitions
```

---

## 3. Architecture Audit Sign-Off

The system enforces modular domain encapsulation. All 16 primary categories in `Sidebar.tsx` map to canonical domain services in `src/services/` and database tables in Supabase. Production build passes cleanly with **0 errors**.
