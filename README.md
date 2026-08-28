<div align="center">

# 🏢 Joy PeopleHR — WorkforceOS Enterprise HRMS
### *The Next-Generation, Multi-Tenant Workforce Operating System & HRMS Platform*

[![Version](https://img.shields.io/badge/version-4.0.0--PROD-07563D.svg?style=for-the-badge)](https://github.com/dharun-b-1912/Joy-PeopleHR)
[![React](https://img.shields.io/badge/React-19.0.1-blue.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B.svg?style=for-the-badge&logo=flutter)](https://flutter.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2.svg?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

<br />

**Joy PeopleHR (WorkforceOS)** is an enterprise-scale human capital management ecosystem combining a high-performance **React 19 Web Portal**, an ultra-slick **Flutter Mobile Companion App** (built with Klarna-style design aesthetics), a **ZKTeco Biometric IoT Gateway**, and complete **Indian Statutory Payroll Compliance** (EPF, ESIC, Professional Tax, TDS).

[Explore Web Architecture](#-web-application-architecture) • [Mobile Companion App](#-mobile-companion-app-flutter) • [Statutory Payroll Engine](#-statutory-payroll-engine) • [Installation Guide](#-quick-start--installation)

---

</div>

## 🌟 Key Highlights & Core Capabilities

- 🏢 **Multi-Tenant SaaS Control Plane**: 100% database Row-Level Security (RLS) isolation, dynamic feature flag switches, subscription tier gating, and active session killswitches.
- ⏰ **Multi-Channel Attendance Engine**: Unified presence pipeline blending hardware ZKTeco biometric fingerprint/face clocks, mobile GPS geofenced punching (with anti-spoof checks), and rotational shift rostering.
- 💳 **Indian Statutory Payroll Engine v4.0**: Automated 4-step monthly payroll execution with pro-rata Loss of Pay (LOP), EPF (ECR generation), ESIC returns, Tamil Nadu/All-India Professional Tax (PT), and Old vs. New TDS calculations.
- 📱 **Klarna-Grade Mobile Companion (Flutter)**: Consumer-quality mobile workspace featuring live running work timers, instant leave/expense applications, encrypted PDF payslips, and virtual QR employee ID badges.
- 🤖 **Context-Aware AI Copilot (Google Gemini 2.5 Flash)**: Embedded workspace AI drawer capable of calculating remaining leave balances, interpreting company HR policies, and answering employee queries in real time.
- 🎯 **ATS Recruitment & Talent Acquisition**: Requisitions, Kanban candidate pipeline, structured interview scorecards, and digital offer letter generation.
- 🏆 **Performance & 360° Appraisals**: Cascading OKRs/KPIs, quarterly review cycles, bell-curve calibration normalization, and PIP management.
- 🎓 **Enterprise LMS & POSH Compliance**: SCORM/video training player, online quizzes, automated PDF certificates, and internal POSH ICC grievance workflows.

---

## 🏛️ System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                   JOY PEOPLEHR ENTERPRISE HRMS                                    |
+---------------------------------------------------------------------------------------------------+
|   [ Web Application: React 19 / Vite 6 / TS ]   |   [ Mobile Application: Flutter 3.x / Dart ]    |
|   Tailwind CSS v4 + Radix UI + Motion           |   Klarna Design Tokens + GPS Geofencing         |
+-------------------------------------------------+-------------------------------------------------+
|                                 DOMAIN SERVICES LAYER                                             |
|   Core HR  |  Attendance & Bio  |  Leave Engine  |  Payroll v4.0  |  Recruitment ATS  |  LMS      |
+---------------------------------------------------------------------------------------------------+
|                              REALTIME EVENT & OUTBOX MESH                                         |
|   Database Change Data Capture  |  WebSocket Subscriptions  |  Multi-Channel Notification Mesh     |
+---------------------------------------------------------------------------------------------------+
|                             PERSISTENCE & SECURITY FOUNDATION                                     |
|   Supabase PostgreSQL 15+  |  69+ Migrations  |  Strict Multi-Tenant RLS  |  Encrypted Storage    |
+---------------------------------------------------------------------------------------------------+
```

---

## 📦 Functional Modules Overview

The platform is structured into **17 domain modules** and **108+ granular subviews**:

```
workforceos-enterprise-hrms/
├── src/
│   ├── features/
│   │   ├── admin/           # System Administration, User Accounts & Audit Logs
│   │   ├── analytics/       # Executive BI, C-Suite Analytics & Custom Report Builder
│   │   ├── assistant/       # Google Gemini 2.5 Flash AI Assistant Drawer
│   │   ├── attendance/      # Attendance Dashboard, Exceptions Queue, Biometrics & Shifts
│   │   ├── auth/            # Multi-Role Authentication & SSO Login Views
│   │   ├── automation/      # Visual Workflow Trigger Builder & Notification Rules
│   │   ├── compliance/      # Statutory Labor Compliance Registers & Policy Docs
│   │   ├── dashboard/       # Operational HR, Workforce & Executive Dashboards
│   │   ├── documents/       # Enterprise Document Vault & Digital E-Sign Engine
│   │   ├── er/              # Employee Relations, Grievances & POSH Committee
│   │   ├── ess/             # Employee Self-Service Hub (Attendance, Leaves, Payslips)
│   │   ├── leave/           # Leave Master v3, Accruals, Comp-Off & Holiday Calendars
│   │   ├── lms/             # Learning Management, SCORM Player & Certifications
│   │   ├── offboarding/     # Resignations, Clearance Matrix & F&F Handoff
│   │   ├── onboarding/      # Pre-boarding Checklists & Auto-Provisioning Bridges
│   │   ├── organization/    # Multi-Entity Companies, Branches, Org Chart & Assets
│   │   ├── payroll/         # 4-Step Payroll Engine, Statutory Tax Rules & Bank Sheets
│   │   ├── people/          # 360° Employee Master Directory & Digital Profiles
│   │   ├── performance/     # OKRs, KPI Libraries, 360 Reviews & Bell Curve Calibration
│   │   ├── platform/        # SaaS Platform Control Plane (Tenants, Billing, Subscriptions)
│   │   ├── rbac/            # 5-Tier Hierarchical Role-Based Access Control
│   │   ├── talent/          # ATS Recruitment Pipeline & Job Openings
│   │   ├── tl/              # Team Lead Supervisor Hub, Team Approvals & Sprints
│   │   └── work/            # Work Hours, Overtime Multipliers & WFH Requests
│   ├── services/            # Supabase Data Layer, Realtime Sync Engine & API Services
│   └── types/               # Canonical TypeScript Schemas & Statutory Interfaces
├── 1.FlutterApp/            # Consumer-Grade Mobile App (iOS / Android / Web)
├── scripts/                 # ZKTeco Hardware Biometric Gateway Agents & Sync Daemons
└── supabase/migrations/     # 69 Production SQL Migrations with Multi-Tenant RLS
```

---

## 💳 Statutory Payroll Engine (Indian Compliance)

Joy PeopleHR includes an out-of-the-box computation pipeline tailored for Indian statutory payroll:

```
[CTC Structure] ──> [Basic: 40-50%] + [HRA: 40-50%] + [Special Allowance] + [Allowances]
                           │
                           ├──> Employee EPF (12%)  + Employer EPF/EPS/EDLI (12% split)
                           ├──> ESIC (0.75% / 3.25% if Gross <= ₹21,000)
                           ├──> Professional Tax (PT) (Jurisdictional State Slabs)
                           ├──> Loss of Pay (LOP) = (Gross / Total Days) * Absent Days
                           └──> TDS Withholding (Old Regime vs. New Regime Sec 115BAC)
                           │
                           └──> [NET TAKE-HOME PAYOUT] ──> [Bank NEFT/RTGS Batch CSV] + [PDF Payslip]
```

### Government Portal Export Templates Included:
1. **EPFO ECR Text File**: Government-compliant `#~#` (hash-tilde-hash) delimited file for direct monthly upload to the EPFO Unified Portal.
2. **ESIC Monthly Return**: Excel returns format with IP numbers and contribution days.
3. **Corporate Bank Batch CSV**: Payout format compatible with HDFC CMS, ICICI Corporate NetBanking, and SBI Corporate Banking.
4. **Encrypted PDF Payslips**: Password-protected digital salary slips formatted with Indian currency words (*e.g., "Rupees Fifty-Four Thousand Only"*).

---

## 📱 Mobile Companion App (`1.FlutterApp`)

Built with **Flutter 3.x** and designed with modern **Klarna-inspired aesthetics**:
- **Smart GPS Geofencing Engine**: Proactively detects when an employee arrives at an authorized workplace perimeter and prompts a 1-tap check-in modal.
- **Hardware Anti-Spoofing**: Enforces strict GPS accuracy thresholds ($\le 50\text{m}$) and rejects mock/simulated location providers (`isMock`).
- **On-Device Receipt Compression**: Auto-compresses camera expense claim receipts to $<150\text{ KB}$ before uploading to secure storage.
- **Unified Approvals Desk**: Allows Team Leads and Managers to approve leaves, WFH, and regularizations on the go.

```bash
# Navigate to the Flutter companion directory
cd 1.FlutterApp/flutter_app

# Install Flutter dependencies
flutter pub get

# Run on Android / iOS device or emulator
flutter run
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v18.x` or `v20.x+`
- **npm** or **bun** / **pnpm** / **yarn**
- **Flutter SDK**: `v3.10.0+` (optional for mobile app development)

### 2. Clone the Repository
```bash
git clone https://github.com/dharun-b-1912/Joy-PeopleHR.git
cd Joy-PeopleHR
```

### 3. Install Web Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials in `.env.local`:
```env
# Google Gemini API Key for AI Copilot
VITE_GEMINI_API_KEY="your_gemini_api_key_here"

# Supabase Production Backend
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key_here"
```

### 5. Launch Development Server
```bash
npm run dev
```
Open your browser at **`http://localhost:3000`**.

---

## 🛠️ Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches Vite local development server with Hot Module Replacement on port 3000 |
| `npm run build` | Compiles optimized, tree-shaken production bundle into `dist/` |
| `npm run preview` | Serves the local production build for QA verification |
| `npm run typecheck` | Executes TypeScript type validation (`tsc --noEmit`) |
| `npm run lint` | Runs project-wide linting and type validation |
| `npm run clean` | Cleans build caches and previous bundle artifacts |

---

## 🗄️ Database & Migration Setup

The backend is backed by **69 sequential SQL migrations** located in [`supabase/migrations/`](file:///d:/Joy%20PeopleHR%20new%20version/workforceos-enterprise-hrms/supabase/migrations):

```bash
# Apply migrations via Supabase CLI (if running Supabase locally)
supabase db reset
supabase migration up
```

All database tables enforce strict multi-tenant isolation with `tenant_id` and `organization_id` Row-Level Security policies.

---

## 🔒 Security, RBAC & Compliance

WorkforceOS is designed following defense-in-depth security principles:
- **Tenant Isolation**: Strict PostgreSQL Row-Level Security (RLS) on all 60+ tables.
- **Fine-Grained Permissions**: Evaluated at runtime via `module.resource.action` syntax.
- **Immutable 7-Year Audit Trail**: Cryptographically hashes all mutations into the `audit_events` ledger.
- **POSH & Compliance Safeguarding**: Strict role-based isolation ensuring sexual harassment and grievance inquiries remain strictly confidential.

---

## 📄 License

This repository is proprietary software owned by **Joy Corporate Solutions Private Limited**. All rights reserved.

<div align="center">
  <sub>Built with ❤️ for modern enterprise workforces worldwide.</sub>
</div>
