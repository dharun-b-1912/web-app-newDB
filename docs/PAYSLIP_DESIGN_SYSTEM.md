# JOY PeopleHR — Universal Payslip Design System & A4 Blueprint

## 1. Overview & Visual Objective
The **Universal Blue Payslip** is the production-grade, authoritative payroll document format for **JOY PeopleHR**. It is designed to replace traditional corporate IT-style salary slips with an industrial, executive-ready document optimized for:
- Factory workers & operators
- Blue-collar workforce
- Contract labour & staffing agency personnel
- Supervisors, administrative staff & executives

The document balances **maximum readability**, **strong visual branding**, and **75–90% natural A4 vertical page utilization** without leaving awkward blank space or spilling onto a second page.

---

## 2. A4 Page Dimensions & Utilization

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Paper Size** | Standard ISO A4 Portrait ($210\text{mm} \times 297\text{mm}$) | Universal printing compatibility |
| **Print Margins** | $12\text{mm}$ Top/Bottom, $14\text{mm}$ Left/Right | Clean printable area without clipping |
| **Printable Width** | $182\text{mm}$ max ($780\text{px} - 820\text{px}$ in screen view) | Consistent table alignment |
| **Vertical Height** | $\approx 920\text{px} - 1000\text{px}$ | 80–90% vertical utilization of single A4 sheet |
| **Target Page Count** | **Strictly 1 Page** for standard payroll | Prevents orphan rows and split pages |

---

## 3. Visual Hierarchy & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. BRANDED BLUE COMPANY HEADER                                         │
│    [Logo]  Company Display Name & Legal Entity            PAYSLIP      │
│            Registered Address & Tax/PF Codes              AUGUST 2026  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. EMPLOYEE INFORMATION & WORKFORCE PROFILE                           │
│    Name, Code, Designation, Department, Shift, Worker Category, Bank   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ATTENDANCE & WORK SUMMARY (Prominent for Factory/Blue-Collar)       │
│    Calendar | Present | Weekly Off | Holiday | LOP | PAID DAYS | OT    │
│    Itemized Overtime statement: (Hours × Rate = Amount)                │
├────────────────────────────────────────────────────────────────────────┤
│ 4. FINANCIAL STATEMENT (2-Column High Contrast Layout)                 │
│    EARNINGS (Component, Units/Rate, Current)   DEDUCTIONS (Comp, Cat)  │
│    GROSS EARNINGS                              TOTAL DEDUCTIONS        │
├────────────────────────────────────────────────────────────────────────┤
│ 5. NET TAKE-HOME PAY (Hero Highlight Banner)                           │
│    Disbursement Mode, Bank Info, Amount in Words, Prominent Amount     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. STATUTORY COMPLIANCE & SEPARATE EMPLOYER CONTRIBUTIONS              │
│    UAN, PF No, ESI No, PAN, PT           Employer EPF & ESIC (Separate)│
├────────────────────────────────────────────────────────────────────────┤
│ 7. DOCUMENT FOOTER & STATUTORY DISCLAIMER                              │
│    Generation Timestamp, Payslip Ref ID, Version, Computer Generated    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Typography Scale

A clean system sans-serif font stack is used (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) with monospace accents for numbers (`ui-monospace, Consolas, monospace`).

| Element | Size | Weight | Color Token |
| :--- | :--- | :--- | :--- |
| **Company Display Title** | `20px` ($15\text{pt}$) | Black (`900`) | `#034078` (Joy Primary Blue) |
| **PAYSLIP Badge** | `12px` ($9\text{pt}$) | Black (`900`) | `#FFFFFF` on `#034078` |
| **Payroll Period** | `16px` ($12\text{pt}$) | Black (`900`) | `#0F172A` (Slate Dark) |
| **Section Titles** | `12px` ($9\text{pt}$) | Black (`900`) | `#034078` / `#FFFFFF` |
| **Field Labels** | `10px` ($7.5\text{pt}$) | Bold (`800`) | `#034078` (Uppercase tracking) |
| **Field Values** | `13.5px` ($10\text{pt}$) | Bold (`700`) | `#0F172A` (Slate 900) |
| **KPI Values (Attendance)**| `16px` ($12\text{pt}$) | Black (`900`) Mono | `#034078` / `#92400E` |
| **Table Headers** | `12px` ($9\text{pt}$) | Black (`900`) | `#FFFFFF` on `#034078` |
| **Table Rows (Components)**| `12.5px` ($9.5\text{pt}$) | Medium (`600`) | `#1E293B` |
| **Component Amounts** | `13.5px` ($10\text{pt}$) | Bold (`700`) Mono | `#0F172A` / `#E11D48` |
| **Gross / Deductions Totals**| `14px` ($10.5\text{pt}$) | Black (`900`) | `#034078` / `#9F1239` |
| **Net Pay Hero Number** | `28px` ($21\text{pt}$) | Black (`900`) Mono | `#FFFFFF` |
| **Amount in Words** | `12px` ($9\text{pt}$) | Medium Italic | `#E0F2FE` (Light Cyan) |
| **Footer & Disclaimer** | `10.5px` ($8\text{pt}$) | Medium / Italic | `#64748B` (Slate Neutral) |

---

## 5. Color Palette & Tokens

```css
/* Primary Blue Brand Identity */
--color-joy-blue-primary: #034078;      /* Header bar, table headers, key labels */
--color-joy-blue-dark:    #0B3A60;      /* Company title, primary text emphasis */
--color-joy-blue-accent:  #0F52BA;      /* Action badges, interactive accents */
--color-joy-blue-tint:    #F4F8FD;      /* Employee grid card background */
--color-joy-blue-subtle:  #EBF3FC;      /* Gross earnings subtotal bar */
--color-joy-blue-border:  #BFDBFE;      /* Structural division borders */

/* Deduction & Alert Accents */
--color-deduction-bg:     #FDF2F4;      /* Total deductions subtotal bar */
--color-deduction-border: #E11D48;      /* Top bar for deductions */
--color-deduction-text:   #9F1239;      /* Highlighted deduction figures */

/* Overtime Warm Highlight */
--color-ot-bg:            #FEF3C7;      /* OT summary metric cell */
--color-ot-text:          #92400E;      /* OT hours text */

/* Neutral Surfaces */
--color-paper-white:      #FFFFFF;      /* Clean white body background */
--color-slate-dark:       #0F172A;      /* High-contrast body text */
--color-slate-neutral:    #CBD5E1;      /* Table & card borders */
```

---

## 6. Multi-Archetype Support Matrix

| Workforce Archetype | Visible Modules & Adaptation |
| :--- | :--- |
| **Factory / Operator** | Full attendance grid, itemized OT rate & hours, line/section, shift timings, skill category, PF, ESI, PT, Canteen deductions. |
| **Contract Labour** | Contractor/Agency name, vendor employee token, deployment site, attendance days, dynamic OT, take-home pay. |
| **Office / Staff** | Clean salary structure (Basic, HRA, Special Allowance), standard attendance, PF, PT, TDS, Bank disbursement. |
| **Executive / Management**| Comprehensive compensation components, statutory tax, investment deductions, direct bank wire details. |

---

## 7. Strict Presentation Rule (No Calculation Drift)
- The payslip renderer **NEVER performs independent calculations**.
- Consumes the finalized `PayslipDocumentModel` generated by `PayrollCalculationEngine`.
- Enforces the mathematical invariant:
  $$\text{Net Pay} = \text{Gross Earnings} - \text{Total Employee Deductions}$$
- **Employer EPF (12%) & ESIC (3.25%)** are strictly isolated in an informational section and **never reduce employee Net Pay**.

---

## 8. Data Privacy & PII Masking
- **Bank Account**: Partially masked with 4 trailing digits (`•••• •••• 7192`).
- **PAN**: Masked (`AB••••1234F`).
- **UAN / ESI**: Masked (`10••••••8209`).
- Sensitive raw financial payloads and banking keys are excluded from client console logs.
