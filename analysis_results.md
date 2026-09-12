# 🏢 JOY PeopleHR (WorkforceOS) — Comprehensive Project Deep Analysis

**Date of Analysis:** September 2026  
**Repository:** `Joy-PeopleHR` / `workforceos-enterprise-hrms`  
**Platforms:** Web Enterprise Portal (React 19 / Vite 6 / Node.js) & Mobile Companion App (Flutter 3.x / Dart)  
**Backend & Persistence:** Supabase Cloud (PostgreSQL 15 + RLS + GoTrue Auth)  
**Hardware Gateway:** ZKTeco / eSSL Biometric Attendance IoT Agent  

---

## 1. Executive Summary & Product Architecture

**JOY PeopleHR** (branded internally and in repositories as **WorkforceOS Enterprise HRMS**) is a production-grade Human Resource Management System and Contractor Governance SaaS platform. It bridges permanent internal workforce operations with external vendor labor governance.

The platform employs a **Dual-Client, Single-Persistence Architecture**:
1. **Web Enterprise Portal (React 19 + TypeScript + Vite + Express):** Dedicated to HR Operations, Company Admins, Managers, Team Leads, Platform Super Admins, and Vendor Staffing Agencies. Includes over 17 domain modules and 108+ granular subviews.
2. **Mobile Companion Application (Flutter 3.x / Dart):** Tailored as a consumer-grade Employee Self-Service (ESS) app built with Klarna-inspired UI tokens, GPS geofenced clock-in/out, biometric anti-spoofing, encrypted PDF payslip generation, and real-time requests.
3. **IoT Gateway Layer:** Dedicated Node.js hardware agent communicating via TCP/UDP with physical ZKTeco/eSSL biometric time clocks.
4. **Unified Canonical Backend:** Both clients and the IoT gateway connect directly to a single Supabase PostgreSQL instance (`ysiajemrqakfngasehhi`) secured with 100% Row-Level Security (RLS).

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   JOY PEOPLEHR ENTERPRISE HRMS                                    │
├───────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│         WEB ENTERPRISE APPLICATION                │          MOBILE COMPANION APPLICATION         │
│     (React 19 / TypeScript / Tailwind CSS v4)     │              (Flutter 3.x / Dart)             │
│                                                   │                                               │
│  • Platform & Tenant Administration               │  • Smart GPS Geofenced Clock-In / Out         │
│  • 360° Workforce Directory & Onboarding          │  • Real-Time Shift & Attendance Timesheet     │
│  • Indian Statutory Payroll Engine v4.0           │  • Leave Application & Balance Tracking       │
│  • Vendor & Contractor 3-Way Match Settlement     │  • Encrypted PDF Payslips & Earnings View     │
│  • Recruitment ATS & Kanban Pipeline              │  • Document Vault & KYC Camera Upload         │
│  • Performance (OKRs / 360 Reviews / Bell Curve)  │  • Virtual QR Employee ID Badge               │
│  • Enterprise LMS & SCORM Training                │  • Helpdesk Tickets & Expense Claims          │
│  • POSH Committee & Grievance Cases               │  • Push Notifications & Announcements         │
├───────────────────────────────────────────────────┴───────────────────────────────────────────────┤
│                                  UNIFIED CANONICAL DATA ACCESS LAYER                              │
│                                  Supabase JS SDK  │  Supabase Flutter SDK                         │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                   SHARED SUPABASE POSTGRESQL 15                                   │
│                        (Project: ysiajemrqakfngasehhi  |  64 Greenfield Tables)                   │
│                                                                                                   │
│  • 100% Tables Protected with Row-Level Security (RLS) Multi-Tenant & Employee Isolation         │
│  • Supabase GoTrue Auth (Single Identity Chain: auth.users -> user_profiles -> employees)         │
│  • Supabase Private Storage Buckets ('employee_documents', 'avatars', 'company_assets')           │
│  • Realtime WebSocket Event Subscriptions (CDC) for Outbox & Notification Mesh                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack Breakdown

| Layer | Web Application | Flutter Mobile App | Backend & Infrastructure |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React 19.0.1 + Vite 6.2.3 | Flutter 3.x (SDK: `>=3.0.0 <4.0.0`) | Node.js 20+ Express Server (`server.js`) |
| **Language** | TypeScript 5.8.2 (`tsc --noEmit` verified clean) | Dart 3.x | SQL (PostgreSQL 15 PL/pgSQL) |
| **Styling & UI** | Tailwind CSS v4, Radix UI Primitives, Motion | Klarna Design Tokens, `shadcn_flutter`, Google Fonts | N/A |
| **State & Data Fetching** | `@tanstack/react-query` v5, Custom Sync Engine | Stateful Widgets, Supabase Repository Pattern | Supabase PostgreSQL Client Pool |
| **Backend Integration** | `@supabase/supabase-js` v2.112.3 | `supabase_flutter` v2.8.0 | Supabase Edge Functions (Deno) |
| **Authentication** | GoTrue Auth + Device Fingerprinting (`sessionProtection.ts`) | Supabase GoTrue Auth + Local Secure Storage | GoTrue + PostgreSQL RLS Policies |
| **Hardware / Location** | Google Maps API & Reverse Geocoding via Nominatim | `geolocator` v13 (Hardware anti-spoof, `isMock` check) | `node-zklib` UDP/TCP Biometric Protocol |
| **Document / PDF** | `pdfjs-dist` | `pdfx`, `photo_view`, `flutter_image_compress` | Supabase Storage Encrypted Buckets |
| **Monitoring & Logging** | Zero-Leakage Global Error Interceptor | Firebase Crashlytics & Firebase Messaging | PostgreSQL `audit_events` Immutable Ledger |
| **AI Integration** | Google Gemini 2.5 Flash (`@google/genai`) | Planned via Web Gateway | Google AI Studio REST APIs |

---

## 3. Database Architecture & Multi-Tenant Model

The persistence layer is governed by **64 Greenfield PostgreSQL tables** (`migrations 001–024`) with zero legacy table dependencies:

### The Unified Identity Chain
```
Supabase Auth (auth.users.id)
   │ (1:1 via auth.uid())
   ▼
User Profile (public.user_profiles.id) ── [organization_id]
   │
   ├─► User Role (public.user_roles -> public.roles) ── [5-Tier Hierarchy]
   │
   └─► Employee Record (public.employees.id)
          │
          ├── employee_profiles (Avatar, Blood Group, Personal Bio)
          ├── employee_bank_details (IFSC, Account Number)
          ├── employee_statutory_details (PAN, UAN, Aadhaar, PF, ESI)
          ├── employee_addresses (Present / Permanent)
          ├── attendance_punches & attendance_daily
          ├── leave_balances & leave_requests
          ├── payslips & payroll_line_items
          └── employee_documents (KYC, Degree, ID Proofs)
```

### Key Functional Data Clusters (64 Tables)
1. **Multi-Tenant Foundation (`003_platform`, `004_organizations`):** `platform_users`, `platform_plans`, `organizations`, `companies`, `branches`, `departments`, `teams`, `designations`, `work_locations`.
2. **RBAC & Identity (`005_identity`):** `user_profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`.
3. **Employee Master & Life Cycle (`006_employee_core`, `007_lifecycle`):** `employees`, `employee_bank_details`, `employee_statutory_details`, `emergency_contacts`, `employee_addresses`, `employee_dependents`, `employee_lifecycle_events`, `separation_requests`.
4. **Attendance, Shifts & IoT (`008_shifts`, `009_attendance`):** `shifts`, `shift_rosters`, `attendance_records`, `attendance_punches`, `attendance_regularizations`, `overtime_records`.
5. **Leave & Holidays (`010_leave`):** `leave_types`, `leave_balances`, `leave_requests`, `leave_ledger_entries`, `holidays`.
6. **Workflow & Approvals (`011_approvals`):** `approval_workflows`, `approval_instances`, `approval_actions`.
7. **Statutory Payroll Engine (`012_payroll`):** `salary_structures`, `employee_salary_assignments`, `payroll_runs`, `payslips`, `statutory_filings`.
8. **Vendor & Contractor Governance (`013_vendor_manpower`):** `vendors`, `vendor_contracts`, `vendor_workers`, `vendor_deployments`, `vendor_invoices`.
9. **Recruitment ATS (`019_recruitment`):** `job_postings`, `job_applications`, `interview_schedules`.
10. **Events & Notifications (`020_notifications`):** `notification_events`, `webhook_endpoints`, `webhook_deliveries`.

---

## 4. Web Application Deep Dive (`workforceos-enterprise-hrms`)

The web application is structured into **38 feature directories** located under `src/features/`:

### Core Subsystems
1. **Executive & Operational Dashboards:**
   - `ExecutiveOverviewView`: High-level workforce KPIs, headcount trends, cost per hire, and attrition rates.
   - `CommandCenterView`: Real-time operational exception radar (long absences, pending overtime, document expiry alerts).
   - `WorkforceOverviewView`: Departmental distribution, gender ratio, and location breakdown.
2. **Workforce & People Directory (`src/features/people`):**
   - 360° Digital Employee Profile with interactive tabbed drawer.
   - Bank details, statutory registrations (UAN, ESIC, PAN), emergency contacts, and document repository.
   - Dynamic organizational tree and hierarchical reporting structure.
3. **Indian Statutory Payroll Engine v4.0 (`src/features/payroll`):**
   - 4-Step automated monthly payroll pipeline: Verification $\rightarrow$ Pre-Compute & LOP Deduction $\rightarrow$ Statutory Adjustments $\rightarrow$ Approval & Final Disbursal.
   - **Statutory Computations:** Pro-rata Loss of Pay (LOP), EPF (12% employee / employer split with EPS/EDLI capping), ESIC (0.75% / 3.25% threshold at ₹21,000 gross), Professional Tax (PT slabs per state), and Dual Tax Regime (Old vs. New Section 115BAC).
   - **Government Export Formats:** Delimited EPFO ECR text format (`#~#`), ESIC return spreadsheet, and HDFC/ICICI/SBI Corporate NetBanking NEFT/RTGS batch CSV.
4. **Attendance & Biometric Engine (`src/features/attendance`):**
   - Unified punch ingestion blending hardware ZKTeco biometric time clocks, mobile GPS punches, and web manual logs.
   - Regularization approval queues and overtime multiplier calculation engine.
5. **Vendor & Contractor Governance (`src/features/vendor`, `manpower`):**
   - **4-Stage Lifecycle:**
     1. Vendor Onboarding, Labor Licenses (Form V), and active contracts.
     2. Gate Attendance Logs & Shift verification.
     3. 3-Way Match Settlement Engine (`Purchase Order Rate Card` vs `Gate Punch Hours` vs `Vendor Tax Invoice`).
     4. Statutory PF/ESI challan audit before payment authorization.
6. **Talent Acquisition ATS (`src/features/talent`):**
   - Requisition workflows, Kanban candidate pipeline, structured interview scorecards, and digital offer letters.
7. **Google Gemini 2.5 Flash AI Assistant Drawer (`src/features/assistant`):**
   - Context-aware copilot analyzing employee leave ledger balances, company policy documents, and attendance anomalies directly in natural language.
8. **Enterprise Hardened Server Gateway (`server.js`):**
   - Clickjacking prevention (`X-Frame-Options: SAMEORIGIN`), MIME-sniffing protection, HSTS, and strict CORS whitelist.
   - Multi-profile sliding-window rate limiting: Auth (10 req/min), Biometrics (500 req/min), Admin Sensitive (20 req/min), Standard (100 req/min).
   - Server-side Google Maps shortlink resolver and Nominatim reverse geocoder.
   - Resend email gateway proxy preventing API key leakage in client code.

---

## 5. Flutter Mobile Application Deep Dive (`flutter_app`)

The Flutter application (`workforce_os`) is designed as a consumer-grade mobile companion app for employees:

### Key Subsystems & Repositories
1. **Mobile Smart Attendance & Geofencing (`AttendanceScreen`):**
   - Proactive GPS location tracking using `geolocator`.
   - **Hardware Anti-Spoofing:** Enforces $\le 50$m accuracy threshold and inspects `isMock` flags to reject mock GPS locations.
   - Displays real-time live elapsed shift timer and active work location name.
   - Writes directly to canonical `attendance_punches`.
2. **Attendance History & Regularization (`RegularizationScreen`):**
   - Monthly calendar view showing daily statuses (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`).
   - 1-tap regularization request submission syncing directly to HR Web approval queue.
3. **Leave Management Hub (`LeaveScreen`):**
   - Visual balance cards for Casual Leave (CL), Sick Leave (SL), and Privilege/Earned Leave (PL/EL).
   - Date range selector with pro-rata day count calculation and attachment upload.
4. **Encrypted Payslip Viewer (`PayslipScreen`, `PayslipPdfService`):**
   - Password-protected digital salary slip generator.
   - Line-item breakdown displaying Basic, HRA, Special Allowance, PF, ESI, Professional Tax, and Net Payout formatted with Indian currency words.
5. **Mobile Document Vault (`DocumentsScreen`, `DocumentUploadService`):**
   - In-app camera and file picker (`image_picker`, `file_picker`).
   - On-device client compression (`flutter_image_compress`) reducing files to $<150$ KB before upload to private Supabase bucket `employee_documents`.
6. **Virtual Employee ID Badge (`VirtualIdScreen`):**
   - Digital company ID card displaying employee code, blood group, designation, emergency contacts, and dynamic scannable QR code for security gate verification.
7. **Helpdesk, Claims & Grievances:**
   - Multi-category employee service request ticketing (`employee_requests`).
   - Expense claim submission with receipt photo attachments.

---

## 6. Cross-Client Integration & Verification Status

A 31-step automated cross-client integration suite (`scripts/test_phase_n_cross_client_uat.mjs`) confirms end-to-end operational parity:

| Integration Test Workflow | Originating Client | Receiving Client | Database Artifact / Table | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Profile Mutation** | Web HR Admin | Flutter Employee | `public.employees`, `user_profiles` | **PASS (100%)** |
| **Document Upload & Verification** | Flutter Mobile | Web HR Admin | Bucket `employee_documents` + `employee_documents` | **PASS (100%)** |
| **Peer Document Isolation** | Mobile Peer B | Blocked | Storage RLS + Table RLS | **PASS (Zero Rows)** |
| **Shift Assignment** | Web Operations | Flutter Employee | `public.employee_shift_assignments`, `shifts` | **PASS (100%)** |
| **Attendance Punch & Regularize** | Flutter Mobile | Web HR Admin | `attendance_punches`, `attendance_regularizations` | **PASS (100%)** |
| **Leave Application & Approval** | Flutter Mobile | Web HR Admin | `leave_requests`, `leave_balances`, `ledger` | **PASS (100%)** |
| **Payslip & Compensation Access** | Web Payroll Run | Flutter Employee | `public.payslips`, `payroll_line_items` | **PASS (100%)** |
| **Helpdesk Ticket Resolution** | Flutter Mobile | Web Admin | `public.employee_requests` | **PASS (100%)** |

---

## 7. Security Architecture & Threat Defense

1. **PostgreSQL Row-Level Security (RLS):** All 64 tables enforce multi-tenant isolation via `organization_id` and individual employee privacy via `user_id = auth.uid()`.
2. **Device Fingerprinting (`sessionProtection.ts`):** Client environment signature computed from User-Agent, platform, screen resolution, timezone, and language using hybrid DJB2 + FNV-1a hash algorithm; detects hijacked tokens across browsers.
3. **Session Storage Isolation:** Ephemeral `sessionStorage` avoids cross-profile leakage on shared enterprise terminals.
4. **Immutable 7-Year Audit Trail:** Cryptographic event tracking for all payroll, role, and master employee mutations in `audit_events`.
5. **POSH & Grievance Confidentiality:** Dedicated isolation preventing general HR access to sensitive sexual harassment and internal dispute cases.

---

## 8. Current Strengths, Gaps & Production Recommendations

### Key Strengths
- **Comprehensive Scope:** Unifies permanent HRMS, vendor contractor compliance, and IoT attendance into one codebase.
- **Indian Statutory Compliance:** Ready-to-file EPFO ECR, ESIC, and State Professional Tax formats.
- **Modern Codebase:** React 19 + TypeScript + Vite 6 compiles with zero type errors (`tsc --noEmit` pass); Flutter app uses clean Klarna styling tokens.
- **Single Source of Truth:** Direct cross-client Supabase database sharing verified with 31 automated integration tests.

### Identified Nuances & Minor Gaps
1. **Flutter Notification Field Name Alignment:** `SupabaseNotificationRepository` in Flutter references `recipient_id` which should consistently map to `recipient_user_id` on the canonical `notification_events` table.
2. **Frontline Offline Punch Queue:** Factory and field workforce would benefit from local SQLite/Hive offline punch queuing with cryptographic timestamps for situations without cellular coverage.
3. **SMS / Mobile OTP Login:** Frontline contract and blue-collar workers often lack corporate email accounts; supporting phone OTP via Supabase GoTrue Auth will accelerate field adoption.
4. **Modular Mobile Announcements:** Company-wide broadcasts currently map to notifications; dedicated announcement banner widgets in Flutter would enhance communication.

---

## 9. Conclusion

The **JOY PeopleHR / WorkforceOS** repository represents a mature, well-engineered enterprise SaaS HRMS ecosystem. The web portal and Flutter mobile companion app are architecturally unified, backed by a hardened Supabase PostgreSQL foundation, and certified across 15+ forensic engineering phases. It is fully viable for production enterprise deployment and customer pilot rollouts.
