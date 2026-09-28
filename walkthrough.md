# Walkthrough: Joy PeopleHR — Enterprise Vendor Operations, Performance Leaderboard & Dedicated Document Vault

We have enhanced the **Joy PeopleHR Vendor Operations Platform** into a production-grade enterprise SaaS experience with strict portal separation, transparent workforce analytics, a 5-category compliance vault with maker-checker verification, and complete PO-to-Invoice matching.

---

## 1. Key Architectural Improvements

### A. Strict Portal Separation
- **Company HR Governance (`/vendor-directory`, `/vendor-pos`, `/vendor-invoices`)**:
  - Full authority to register, invite, review, and approve vendors.
  - Dispatch Purchase Orders, review 3-way matching discrepancies, and approve invoices for payment.
  - Maker-checker verification for uploaded compliance documents with mandatory rejection reasoning.
- **Dedicated Vendor Portal (`/vendor-login`, `/vendor-portal`)**:
  - Completely isolated workspace dedicated to authorized vendor administrators.
  - **No Competitor Visibility**: Vendors can only see their own organization, authorized assignments, workforce, POs, and invoices.
  - **No Self-Onboarding**: The `+ Onboard Vendor` action is strictly removed from the vendor-side UI; vendors access their portal via invitation.

### B. Transparent Workforce Performance Leaderboard
Replaced simplistic or arbitrary ranking scores with transparent, mathematically grounded metrics:
- **Attendance Rate (%)**:
  $$\text{Attendance Rate} = \frac{\text{Present Days} + \text{Approved Leave Days}}{\text{Scheduled Days} - \text{Holidays / Weekly Offs}} \times 100$$
- **Punctuality & On-Time Rate (%)**:
  - Configurable 15-minute grace period against scheduled shift start times.
  - Late check-in minutes calculated only when a valid scheduled shift exists.
  - Overnight shifts handled seamlessly.
- **Strict Overtime Segregation**:
  - **Approved Overtime** is tracked and displayed separately.
  - **Unapproved Overtime** is strictly segregated and **never added to billable work hours** or invoices.
- **Data Completeness (%)**:
  - Tracks missing punch exceptions (e.g. missing check-in or check-out) against eligible days.
- **Transparent Composite Score**:
  - Documented weighted breakdown: $40\%$ Attendance + $25\%$ Punctuality + $20\%$ Work-Hour Compliance + $15\%$ Task Quality.

### C. Dedicated Vendor Document Vault & Workforce KYC Management
Transformed the document experience into an enterprise repository with **strict scope isolation**:
1. **Vendor Organization Documents Scope**:
   - **Registration & Tax**: PAN Card, GSTIN (REG-06), MSME/Udyam certificates, Bank Cancelled Cheque / Mandate.
   - **Contracts & Commercial**: Master Service Agreements (MSA), Approved Rate Cards, Commercial Annexures.
   - **Statutory Returns & Challans**: CLRA Contract Labor License (Form V), Monthly ESI Deposit Challans & IP Returns, Monthly EPF ECR Challans & Receipts.
   - **Invoices & Remittance**: Audited Tax Invoices, Attendance Muster Backing Sheets, Payment Receipts.
2. **Deployed Workforce & Employee Documents Scope**:
   - Individual worker KYC and statutory employment documents for the vendor's deployed staff (e.g. Murugan P, Anand Kumar, Sangeetha M, Vignesh K, Rajesh S, Priya R).
   - **Worker Selector**: Filter by "All Workers (6 Deployed)" or drill down into an individual worker profile with live compliance completion tracking (e.g. "7 of 8 Documents Verified — 87.5%").
   - **Individual Statutory Records**: Aadhaar Card, PAN Card, Police Verification Certificate, Medical Fitness Certificate, ESI Pehchan Card, EPFO UAN Form 11, Contractor Deployment Order, and Site Safety & Skill Induction Certificates.
   - **Action Triggers**: Immediate re-upload on rejected/correction-required records, renew-and-replace on expiring licenses, and interactive preview modal.
### D. UI/UX Reorganization & Menu Uncluttering (Clean Enterprise SaaS)
Addressed excessive visual noise, duplicate menus, and stacked navigation:
1. **Streamlined Left Sidebar Navigation**:
   - Reorganized the vendor sidebar from 7 sprawling, noisy groups down into **4 crisp, focused SaaS operational pillars**:
     - **OVERVIEW**: Vendor Dashboard, Company Profile & Contracts.
     - **WORKFORCE & ATTENDANCE**: Workforce & Deployments, Attendance & Overtime, Performance Analytics.
     - **ORDERS & INVOICING**: Received Purchase Orders, Invoices & Payments.
     - **COMPLIANCE & SUPPORT**: Document Vault, Support & Tickets, Audit & Access Logs.
   - Company HR side streamlined under **VENDOR & WORKFORCE GOVERNANCE** with 6 non-overlapping, distinct governance items.
2. **Eliminated Double Horizontal Navigation**:
   - Removed the duplicate in-page 10-tab horizontal strip (`Dashboard | Company Profile | Orders | Nominations...`) that mirrored the sidebar, eliminating visual clutter and cognitive overload.
   - Replaced the heavy dark slab header with a sleek, light/dark-adaptive SaaS Page Header featuring breadcrumbs (`Vendor Portal / Document Vault`), section descriptions, and clean site/period controls.
3. **High-Contrast, Accessible Upload Modal**:
   - Fixed the dark-on-dark unreadable inputs inside the Upload Modal.
   - Re-styled with crisp borders (`border-slate-300 dark:border-slate-600`), readable text labels, accessible select options, and an intuitive file dropzone.

---

## 2. File Changes & Architecture

| Component / File | Description |
| :--- | :--- |
| [`src/services/vendor/vendorPerformanceService.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/vendor/vendorPerformanceService.ts) | Mathematical engine for Attendance Rate, On-Time Rate, Work-Hour Compliance, strict OT segregation, and data completeness. |
| [`src/services/vendor/vendorDocumentService.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/vendor/vendorDocumentService.ts) | Document vault service mapping 5 categories, 30-day expiry queries, and maker-checker approval/rejection workflows. |
| [`src/features/vendor/components/VendorLeaderboardTab.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/features/vendor/components/VendorLeaderboardTab.tsx) | Workforce performance table, KPI cards, filter toolbar (search, shift, sort), CSV export, and worker detail drawer with OT segregation callout. |
| [`src/features/vendor/components/VendorDocumentVaultTab.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/features/vendor/components/VendorDocumentVaultTab.tsx) | 5-category vault navigation, <30 days expiry alert banner, document upload modal (<= 5MB, PDF/images), and maker-checker review drawer. |
| [`src/features/vendor/VendorPortalWorkspace.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/features/vendor/VendorPortalWorkspace.tsx) | Integrated `VendorLeaderboardTab` (`leaderboard`) and `VendorDocumentVaultTab` (`compliance`). Dynamic navigation based on `isVendorPortal`. |
| [`src/components/shell/Sidebar.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/components/shell/Sidebar.tsx) | Updated sidebar menus for Company HR and Vendor Admin roles. Removed `vendor-onboarding` from vendor role navigation. |
| [`src/App.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/App.tsx) | Configured routes: `/vendor-leaderboard`, `/vendor-vault`, `/vendor-pos`, `/vendor-invoices`, `/vendor-directory`, `/vendor-portal`. |
| [`src/services/__tests__/vendorPerformanceAndVault.test.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/__tests__/vendorPerformanceAndVault.test.ts) | Automated test suite validating performance metric formulas, OT segregation, and document review state transitions. |

---

## 3. Verification Results

### 1. Automated Vitest Suites
All 43 tests pass across 5 test suites:
```bash
npx vitest run src/services/__tests__/vendorPerformanceAndVault.test.ts \
               src/services/__tests__/purchaseOrderToInvoiceWorkflow.test.ts \
               src/services/__tests__/vendorPortalSeparationAndAuth.test.ts \
               src/services/__tests__/vendorTwoWayEcosystem.test.ts \
               src/services/__tests__/vendorPortalMultiTenantIsolation.test.ts
```
```text
 Test Files  5 passed (5)
      Tests  43 passed (43)
   Duration  5.17s
```

### 2. Production Build
```bash
npx vite build --emptyOutDir=false
```
```text
✓ 3609 modules transformed.
rendering chunks...
dist/index.html                                   3.79 kB │ gzip:   1.16 kB
dist/assets/index-C4ZwJqRX.css                  271.64 kB │ gzip:  34.62 kB
dist/assets/VendorPortalWorkspace-B7Aub7Tk.js   288.69 kB │ gzip:  58.36 kB
✓ built in 8.14s
```
Zero JSX syntax errors or bundle compilation warnings.
