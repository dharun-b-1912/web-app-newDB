# Joy PeopleHR Enterprise — Vendor & Manpower Governance Documentation

## 📌 Executive Summary
The **Vendor & Contractor Governance Suite** in **Joy PeopleHR Enterprise HRMS** is an end-to-end statutory compliance, workforce allocation, and billing reconciliation system. It implements the legal framework required under the **Contract Labour (Regulation and Abolition) Act, 1970 (CLRA)**, **The Code on Wages, 2019**, and the **Factories Act, 1948**.

It establishes a strict operational hierarchy between **Vendors (Contracting Agencies / Service Providers)** and **Manpower (Contract Workforce / Individual Personnel)** to ensure zero statutory liabilities for Principal Employers.

---

## 🏢 1. Core Architectural Distinction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRINCIPAL EMPLOYER (JOY CORP)                      │
│             Issues Form V • Verifies Invoices • Audits Compliance       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Commercial Agreement / PO
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  VENDOR (The Contractor / Agency Entity)                │
│   • Registered Legal Entity (Pvt Ltd, LLP, Partnership, Prop)          │
│   • Holds GSTIN, PAN, Labour License, EPF/ESIC Employer Codes          │
│   • Submits Monthly Invoices & Proof of Statutory Remittance           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Employs & Deploys
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 MANPOWER (The On-Site Contract Workforce)               │
│   • Individual Workers (Technicians, Machine Operators, Helpers)       │
│   • Aadhaar KYC, UAN (EPF), ESIC IP Number, Safety Badges              │
│   • Daily GPS Geofence & Biometric Attendance Clocking                 │
│   • Daily Wage Breakdowns & Shift Allocations                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Attribute Comparison

| Dimension | **Vendor (Supplier / Contractor)** | **Manpower (Contract Workforce)** |
| :--- | :--- | :--- |
| **Legal Nature** | Corporate Body / Business Entity | Individual Human Being / Employee of Vendor |
| **Identification** | GSTIN, PAN, CIN, Labour License No. | Aadhaar, UAN (EPF), ESIC Insurance No. |
| **Primary Relationship** | Contract of Service with Principal Employer | Contract of Employment with Vendor |
| **Primary Transactions** | Master Service Agreements (MSAs), POs, Invoices | Daily Attendance Punches, Shifts, Wage Slips |
| **Statutory Deliverables** | CLRA Form V, EPF/ESIC ECR Challans, Form XII | Form XXIV Wage Cards, Safety Induction KYC |
| **Financial Settlement** | Corporate Bank Payout via 3-Way Match | Monthly Wages directly deposited by Vendor |

---

## 🔄 2. End-to-End Governance Lifecycle

### Phase 1: Vendor Onboarding & Statutory Accreditation
1. **Master Profile Creation:** Recording of Corporate Identity, GSTIN, PAN, MSME classification, and banking coordinates.
2. **CLRA Form V Generation:** Joy PeopleHR auto-generates Form V (Certificate of Employment of Contract Labour) specifying maximum worker headcount and validity dates.
3. **Labour License Verification:** The Vendor obtains and uploads their statutory Labour License issued by the Licensing Officer based on the Form V.

### Phase 2: Manpower Enrollment & Verification
1. **Worker KYC Collection:** Aadhaar number, permanent address, contact details, and emergency contacts.
2. **Social Security Tagging:** Linking of Universal Account Number (UAN) for Provident Fund and ESIC IP Number for health insurance.
3. **Site Deployment:** Allocation of the worker to specific Principal Employer branches (e.g. *Watertec Unit 3 Factory*, *Arasur HQ*, or *Client Sites*).

### Phase 3: Daily Time, Attendance & Shift Tracking
1. **Multi-Channel Clocking:** Contract workers clock in and out via **High-Accuracy GPS Geofence** or **Biometric Fingerprint/Face Terminals**.
2. **Shift Normalization:** Overtime (OT), late arrivals, and working hours are computed in real time.
3. **Location Isolation:** Punches are restricted to authorized geofence zones, recording exact latitude, longitude, and device accuracy.

### Phase 4: 3-Way Match Billing & Statutory Audit
Before any contractor invoice is approved for disbursement, Joy PeopleHR executes an automated **3-Way Match**:
1. **Purchase Order (PO) Match:** Verifies that invoiced manpower rates match agreed purchase order contracts.
2. **Attendance Ledger Match:** Reconciles billed man-days and hours against biometric/GPS attendance logs.
3. **Statutory Challan Match:** Confirms that the Vendor has deposited EPF (Electronic Challan cum Return - ECR) and ESIC contributions for every deployed worker in the preceding billing cycle.

---

## 💾 3. Database Schema Reference (PostgreSQL / Supabase)

### `public.vendors` (Contractor Master)
* **`id`** (`TEXT` / `UUID`): Unique Vendor Identifier.
* **`legal_name`** (`TEXT`): Registered Corporate Name.
* **`trade_name`** (`TEXT`): Doing-Business-As (DBA) Name.
* **`vendor_code`** (`TEXT`): Enterprise Reference Code (e.g. `VND-001`).
* **`vendor_type`** (`TEXT`): `MANPOWER`, `SECURITY`, `HOUSEKEEPING`, `LOGISTICS`.
* **`gstin`** (`TEXT`): 15-digit GST Identification Number.
* **`pan`** (`TEXT`): Income Tax Permanent Account Number.
* **`clra_license_no`** (`TEXT`): Contract Labour License Registration Number.
* **`compliance_status`** (`TEXT`): `COMPLIANT`, `PENDING_AUDIT`, `NON_COMPLIANT`.

### `public.vendor_workers` (Manpower Workforce Master)
* **`id`** (`TEXT` / `UUID`): Unique Worker Record Identifier.
* **`vendor_id`** (`TEXT`): Foreign Key to parent Vendor entity.
* **`worker_code`** (`TEXT`): Contractor Badge / ID Number.
* **`first_name`**, **`last_name`** (`TEXT`): Worker Name.
* **`aadhaar_hash`** (`TEXT`): Securely hashed Identity Record.
* **`uan_number`** (`TEXT`): Universal Account Number (EPF).
* **`esic_ip_number`** (`TEXT`): ESIC Insurance Person Identification.
* **`skill_level`** (`TEXT`): `UNSKILLED`, `SEMI_SKILLED`, `SKILLED`, `HIGHLY_SKILLED`.
* **`is_active`** (`BOOLEAN`): Deployment status on Principal Employer premises.

### `public.vendor_attendance_records` (Manpower Daily Clocking)
* **`id`** (`TEXT`): Unique Attendance Entry.
* **`worker_id`** (`TEXT`): Reference to `vendor_workers`.
* **`vendor_id`** (`TEXT`): Reference to `vendors`.
* **`punch_date`** (`DATE`): Attendance Date.
* **`first_in`**, **`last_out`** (`TIMESTAMPTZ`): Clocking Timestamps.
* **`work_location_id`** (`TEXT`): Geofence Facility Reference.
* **`total_hours`** (`NUMERIC`): Total daily working duration.
* **`overtime_hours`** (`NUMERIC`): Statutory Overtime duration.

### `public.vendor_invoices` (Contractor Commercial Billing)
* **`id`** (`TEXT`): Invoice Identifier.
* **`vendor_id`** (`TEXT`): Supplier reference.
* **`invoice_number`** (`TEXT`): Contractor invoice reference.
* **`invoice_period`** (`TEXT`): Billing cycle (e.g. `2026-08`).
* **`billed_man_days`** (`NUMERIC`): Billed worker days.
* **`verified_man_days`** (`NUMERIC`): System verified biometric days.
* **`total_amount`** (`NUMERIC`): Gross invoice payable.
* **`tds_amount`** (`NUMERIC`): Tax Deducted at Source (Section 194C).
* **`status`** (`TEXT`): `SUBMITTED`, `VERIFIED_3WAY_MATCH`, `APPROVED`, `PAID`.

---

## ⚖️ 4. Statutory Compliance & Legal Protection

| Compliance Rule | Legal Mandate | Joy PeopleHR Automated Control |
| :--- | :--- | :--- |
| **CLRA Form V** | Section 12, CLRA Act 1970 | System prevents onboarding contractor workers past Form V approved limits. |
| **Equal Pay for Equal Work** | Rule 25(2)(v)(a), CLRA Rules | Flags wage discrepancies between contract workers and regular staff for identical roles. |
| **EPF / ESIC Remittance** | EPF Act 1952 / ESI Act 1948 | Invoice approval is locked until valid ECR challan TRRN is linked and verified. |
| **Workplace Safety & Hours** | Factories Act 1948 | Enforces maximum 48-hour regular weekly limits with automated OT tracking. |
| **Wage Slip Issuance** | Form XIX / Form XXIV | Workers access digital wage cards through the Joy PeopleHR Mobile Channel. |

---

## 🚀 5. Summary & Best Practices
1. **Always assign Manpower workers to a registered Vendor.** Individual contractors cannot be deployed without an accredited parent Vendor.
2. **Enforce Geofence & Biometric clocking for all on-site Manpower.** This creates an indisputable audit ledger protecting the Principal Employer during labor inspections.
3. **Execute 3-Way Match reconciliation prior to invoice sign-off.** Eliminates overbilling, ghost workers, and unremitted statutory deductions.
