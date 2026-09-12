# JOY PeopleHR — Vendor Ecosystem UI/UX & Functional Reality Audit
**Document Version:** 1.0.0  
**Audit Date:** 09 September 2026  
**Target SaaS Launch:** 26 September 2026  
**Status:** Canonical Architectural Baseline

---

## Executive Summary

An audit of the current **Vendor & Contractors / Manpower** UI revealed that the backend domain engines (Multi-Tenancy, 3-Way Match, Muster Roll Finalization & Locking, Form V CLRA, and Stream B 21-Worker Attendance) are operating with 100% test certification across 20 gates. However, the user-facing navigation in `ManpowerWorkspace.tsx` and `VendorMasterModule.tsx` suffered from **mixed generational UI artifacts**:
1. Company HR Head was presented with vendor-side workspaces, multi-client hubs, settlement master screens, and 18 horizontal scrolling sub-tabs.
2. Conceptual duplication existed between "Manpower", "Vendors", "Agency Partners & CLRA", "Deployments", and "Settlement".
3. The Vendor Portal lacked strict persona framing, leaking company concepts into the contractor view and vice-versa.

This audit establishes the **Canonical Product Ownership** and defines the exact disposition for every screen.

---

## 1. Canonical Product Ownership Matrix

```
                    JOY PeopleHR
                         │
          ┌──────────────┴──────────────┐
          │                             │
     COMPANY PORTAL                 VENDOR PORTAL
  (Company HR / Admin)              (Vendor Admin)
          │                             │
   ┌──────┴────────┐            ┌───────┴────────┐
   │               │            │                │
Vendor Partners  Workforce     My Customers    My Workers
   │               │            │                │
Contracts       Deployment     Customer A      Customer B
Attendance      Compliance    Workers A       Workers B
Invoices        Settlement    Attendance A    Attendance B
```

* **Company Portal Rule:** Company owns the commercial, contractual, deployment-authorization, and compliance-governance relationship. Company sees only vendors authorized for that specific Legal Entity.
* **Vendor Portal Rule:** Vendor operates the contract workforce they provide, uploads compliance documents, files disputes, submits invoices, and tracks payment disbursements.
* **Boundary Rule:** Neither side receives unrestricted access to the other's operational or financial records.

---

## 2. Screen Disposition & Action Plan

| # | Current Screen / Component | Current Location | Canonical Disposition | Target Persona & Module | Rationale |
|---|---|---|---|---|---|
| 1 | `VendorsView.tsx` | `src/features/organization/` | **KEEP & EXPAND** | **Company HR Head**<br>`Vendors & Workforce Hub` (`vendors`) | Core company-side vendor partner desk. Contains Vendor Cards, Risk Radar, Filter Bar, and 3-Way Match trigger. |
| 2 | `VendorOnboardingWizardModal.tsx` | `src/features/vendor/subviews/` | **KEEP & INTEGRATE** | **Company HR Head**<br>`+ Add Vendor` Flow | 8-step structured onboarding wizard: Identity, Statutory, Bank, Contract, Compliance, Workforce, Review, Approve. |
| 3 | `VendorAttendanceView.tsx` | `src/features/vendor/subviews/` | **SPLIT & RENAME** | **Company HR Head**<br>`Contractor Attendance` (`vendor-attendance`)<br>& **Vendor Admin**<br>`Workforce → Attendance` | Company sees locked muster rolls, biometric sources, and regularization; Vendor logs attendance disputes. |
| 4 | `VendorSettlementWorkspaceView.tsx` | `src/features/vendor/subviews/` | **MERGE & EVOLVE** | **Company HR Head**<br>`3-Way Match & Billing` (`vendor-settlement-workspace`) | Financial commercial reconciler (Attendance ↔ Contract PO ↔ Invoices ↔ Settlement Disbursements). |
| 5 | `VendorThreeWayMatchModal.tsx` | `src/features/organization/components/` | **KEEP & EMBED** | **Company HR Head**<br>`3-Way Match & Billing` | Centerpiece visual modal comparing Attendance (454 days), PO (₹5L budget), Invoice (₹367,430). |
| 6 | `VendorDashboardView.tsx` | `src/features/vendor/subviews/` | **MOVE TO VENDOR PORTAL** | **Vendor Admin**<br>`HOME → Dashboard` (`vendor-portal-dashboard`) | Dedicated Vendor Executive cockpit answering the 5 blueprint operational questions. |
| 7 | `VendorLicensesView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY** | **Company HR Head**<br>`Compliance & Risk Audit` (`vendor-dashboard`) | Licences expiry countdowns, Form V validity, and statutory renewal audits. |
| 8 | `VendorComplianceCalendarView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY** | **Company HR Head**<br>`Compliance & Risk Audit` | Statutory compliance task tracking (PF/ESI challans, returns). |
| 9 | `VendorStatutoryReturnsView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY** | **Company HR Head**<br>`Compliance & Risk Audit → Form V & Returns` | Form V generation, Certificate numbers, download, and CLRA filing audit. |
| 10 | `VendorMultiClientDashboardView.tsx` | `src/features/vendor/subviews/` | **MOVE TO VENDOR PORTAL** | **Vendor Admin**<br>`MY CUSTOMERS` | Dedicated Vendor switcher across authorized client companies (JOY Chennai, JOY Coimbatore). |
| 11 | `VendorEmployeesView.tsx` | `src/features/vendor/subviews/` | **MOVE TO VENDOR PORTAL** | **Vendor Admin**<br>`WORKFORCE → Workers` | Vendor maintains the operational profiles of their contract personnel. |
| 12 | `VendorAssignmentsView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY & VENDOR** | **Company HR Head**<br>`Vendors Hub → Deployment`<br>& **Vendor Admin**<br>`Workforce → Deployments` | Company authorizes site/shift deployment; Vendor views current deployed sites. |
| 13 | `VendorInvoicesView.tsx` | `src/features/vendor/subviews/` | **MOVE TO VENDOR PORTAL** | **Vendor Admin**<br>`BILLING → Invoices` | Vendor generates derived invoices from approved attendance and submits for 3-way match. |
| 14 | `VendorPaymentsReconciliationView.tsx` | `src/features/vendor/subviews/` | **MOVE TO VENDOR PORTAL** | **Vendor Admin**<br>`BILLING → Payments` | Vendor tracks settlement disbursement statuses, payment references, and returned payment fixes. |
| 15 | `VendorWageBreakdownView.tsx` | `src/features/vendor/subviews/` | **HIDE FROM LAUNCH** | Internal Calculation Engine | Underlying computation logic utilized by `vendorPortalService`. Not a standalone top-level screen. |
| 16 | `VendorPayrollVerificationView.tsx` | `src/features/vendor/subviews/` | **HIDE FROM LAUNCH** | Internal Calculation Engine | Subsumed into the `3-Way Match & Billing` workspace. |
| 17 | `VendorPayableEngineView.tsx` | `src/features/vendor/subviews/` | **HIDE FROM LAUNCH** | Internal Calculation Engine | Integrated into `VendorThreeWayMatchEngine`. |
| 18 | `VendorPurchaseOrdersView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY** | **Company HR Head**<br>`3-Way Match → PO / Contract` | PO contract limit governance, capacity exhaustion tracking, and amendments. |
| 19 | `VendorAuditReportsView.tsx` | `src/features/vendor/subviews/` | **MERGE TO COMPANY** | **Company HR Head**<br>`Compliance → Statutory Registers` | Audit trail and compliance verification logging. |
| 20 | `ManpowerWorkspace.tsx` | `src/features/manpower/` | **DEPRECATE** | Replaced by 4 Canonical Company Views | Eliminate the 5-tab wrapper and oversized hero banner in favor of clean enterprise views. |
| 21 | `VendorMasterModule.tsx` | `src/features/vendor/` | **REFACTOR** | Dedicated `VendorPortalWorkspace.tsx` | Eliminate 18 horizontal scrolling tabs. Structure into canonical Vendor sidebar layout. |

---

## 3. Canonical Company Navigation Structure

For **Company HR Head** / **Company Admin**:

```text
VENDOR & CONTRACTORS

├── 1. Vendors & Workforce Hub (`vendors`)
│   ├── Vendors (Active Vendors directory, risk tags, quick actions)
│   ├── Onboarding (Pending reviews, correction requests, 8-step wizard)
│   ├── Workforce (Authorized contract workers across all vendors)
│   ├── Deployment (Site assignment, shift authorization, gate pass)
│   └── Contracts (Active MSAs, rate cards, capacity allowances)
│
├── 2. Contractor Attendance (`vendor-attendance`)
│   ├── Muster Roll (Daily/monthly punches, 454 man-days, 194.5 OT)
│   ├── Exceptions & Regularizations (Biometric mismatches, reviews)
│   └── Monthly Lock Status (Cryptographic immutable snapshot hash)
│
├── 3. 3-Way Match & Billing (`vendor-settlement-workspace`)
│   ├── 3-Way Match Reconciler (Attendance vs Contract PO vs Invoices)
│   ├── Purchase Orders (PO budget limits, consumption monitoring)
│   ├── Invoices (Claimed amounts, approvals, variance checks)
│   └── Settlement (Disbursements, returned payment handling)
│
└── 4. Compliance & Risk Audit (`vendor-dashboard`)
    ├── Compliance Risk Radar (LOW, MEDIUM, HIGH, CRITICAL based on real data)
    ├── Licences & Expiry Hub (CLRA, Labour Licence countdowns)
    ├── Form V & Returns (Principal employer certificate generation & download)
    └── Statutory Registers (PF / ESI challans, ECR verification)
```

---

## 4. Canonical Vendor Navigation Structure

For **Vendor Admin** (`PortalType.VENDOR`):

```text
VENDOR PORTAL

├── HOME
│   └── Dashboard (`vendor-portal-dashboard`)
│
├── MY CUSTOMERS (`vendor-customers`)
│   └── Customer Relationships (JOY Chennai, JOY Coimbatore with Customer Switcher)
│
├── WORKFORCE
│   ├── Workers (`vendor-employees`)
│   ├── Deployments (`vendor-assignments`)
│   └── Attendance (`vendor-attendance`)
│
├── COMPLIANCE
│   ├── Documents & Compliance (`vendor-compliance`)
│   └── Licences & Expiry (`vendor-licenses`)
│
├── BILLING
│   ├── Invoices (`vendor-invoices`)
│   ├── 3-Way Match (`vendor-three-way-match`)
│   └── Payments (`vendor-payments`)
│
├── COMMUNICATION
│   └── Requests / Corrections (`vendor-requests`)
│
└── SETTINGS
    ├── Vendor Profile (`vendor-profile`)
    └── Users & Roles (`vendor-users`)
```

---

## 5. Implementation Roadmap
1. Create canonical Company-side views for the 4 modules:
   - `CompanyVendorsHubView.tsx` (Vendors & Workforce Hub)
   - `CompanyContractorAttendanceView.tsx` (Contractor Attendance)
   - `CompanyThreeWayMatchBillingView.tsx` (3-Way Match & Billing)
   - `CompanyComplianceRiskAuditView.tsx` (Compliance & Risk Audit)
2. Create dedicated `VendorPortalWorkspace.tsx` with Customer Switcher and canonical Vendor sidebar.
3. Update `App.tsx` routing:
   - Wire `vendors`, `vendor-attendance`, `vendor-settlement-workspace`, and `vendor-dashboard` directly to their dedicated Company views.
   - Wire `PortalType.VENDOR` to `VendorPortalWorkspace`.
4. Create test suite `vendorCompanyPortalCertification.test.ts` verifying all 30 scenarios.
5. Verify with `npx tsc --noEmit` and run all regression suites.
