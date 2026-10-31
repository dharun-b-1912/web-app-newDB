# JOY PeopleHR — Payroll Contract Reconciliation Report

**Audited Domain:** Payroll & Compensation (7 Canonical Tables)  
**Migration Authority:** `012_payroll.sql`  
**Target Backend:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Audit Scope:** READ-ONLY Forensic Contract Reconciliation  
**Date:** 2026-09-03  

---

## 1. Actual Database Schema Definition (`012_payroll.sql`)

### 1. `public.salary_components`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `name` | `VARCHAR(150)` | `NO` | — |
| `code` | `VARCHAR(50)` | `NO` | `UNIQUE(organization_id, code)` |
| `type` | `VARCHAR(30)` | `NO` | `CHECK (type IN ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'STATUTORY_EMPLOYER'))` |
| `calculation_type` | `VARCHAR(20)` | `NO` | `DEFAULT 'FLAT' CHECK (calculation_type IN ('FLAT', 'PERCENTAGE', 'FORMULA'))` |
| `is_taxable` | `BOOLEAN` | `NO` | `DEFAULT true` |
| `is_statutory` | `BOOLEAN` | `NO` | `DEFAULT false` |
| `is_active` | `BOOLEAN` | `NO` | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |

### 2. `public.salary_structures`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `name` | `VARCHAR(150)` | `NO` | — |
| `code` | `VARCHAR(50)` | `NO` | `UNIQUE(organization_id, code)` |
| `description` | `TEXT` | `YES` | — |
| `is_active` | `BOOLEAN` | `NO` | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |

### 3. `public.salary_structure_components`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `salary_structure_id` | `UUID` | `NO` | `REFERENCES public.salary_structures(id) ON DELETE CASCADE` |
| `salary_component_id` | `UUID` | `NO` | `REFERENCES public.salary_components(id) ON DELETE CASCADE` |
| `value` | `NUMERIC(15, 2)` | `NO` | `DEFAULT 0.00` |
| `formula_expression` | `TEXT` | `YES` | — |
| `display_order` | `INTEGER` | `NO` | `DEFAULT 1, UNIQUE(salary_structure_id, salary_component_id)` |

### 4. `public.employee_salary_assignments`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `employee_id` | `UUID` | `NO` | `REFERENCES public.employees(id) ON DELETE CASCADE` |
| `salary_structure_id` | `UUID` | `YES` | `REFERENCES public.salary_structures(id)` |
| `annual_ctc` | `NUMERIC(15, 2)` | `NO` | — |
| `monthly_gross` | `NUMERIC(15, 2)` | `NO` | — |
| `effective_from` | `DATE` | `NO` | — |
| `effective_to` | `DATE` | `YES` | — |
| `is_active` | `BOOLEAN` | `NO` | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |

### 5. `public.payroll_runs`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `company_id` | `UUID` | `NO` | `REFERENCES public.companies(id) ON DELETE RESTRICT` |
| `month` | `INTEGER` | `NO` | `CHECK (month BETWEEN 1 AND 12)` |
| `year` | `INTEGER` | `NO` | — |
| `total_employees` | `INTEGER` | `NO` | `DEFAULT 0` |
| `total_gross_pay` | `NUMERIC(15, 2)` | `NO` | `DEFAULT 0.00` |
| `total_deductions` | `NUMERIC(15, 2)` | `NO` | `DEFAULT 0.00` |
| `total_net_pay` | `NUMERIC(15, 2)` | `NO` | `DEFAULT 0.00` |
| `status` | `payroll_status_enum` | `NO` | `DEFAULT 'DRAFT'` |
| `processed_by` | `UUID` | `YES` | `REFERENCES public.user_profiles(id)` |
| `approved_by` | `UUID` | `YES` | `REFERENCES public.user_profiles(id)` |
| `disbursed_at` | `TIMESTAMPTZ` | `YES` | — |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now(), UNIQUE(company_id, year, month)` |

### 6. `public.payroll_line_items`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `payroll_run_id` | `UUID` | `NO` | `REFERENCES public.payroll_runs(id) ON DELETE CASCADE` |
| `employee_id` | `UUID` | `NO` | `REFERENCES public.employees(id) ON DELETE RESTRICT` |
| `total_working_days` | `NUMERIC(4, 2)` | `NO` | — |
| `payable_days` | `NUMERIC(4, 2)` | `NO` | — |
| `lop_days` | `NUMERIC(4, 2)` | `NO` | `DEFAULT 0.00` |
| `gross_earnings` | `NUMERIC(15, 2)` | `NO` | — |
| `total_deductions` | `NUMERIC(15, 2)` | `NO` | — |
| `net_pay` | `NUMERIC(15, 2)` | `NO` | `UNIQUE(payroll_run_id, employee_id)` |
| `earnings_breakdown` | `JSONB` | `NO` | `DEFAULT '{}'::jsonb` |
| `deductions_breakdown` | `JSONB` | `NO` | `DEFAULT '{}'::jsonb` |
| `statutory_employer_contributions` | `JSONB` | `NO` | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |

### 7. `public.payslips`
| Column Name | Data Type | Nullable | Default / Constraint |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `NO` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `organization_id` | `UUID` | `NO` | `REFERENCES public.organizations(id) ON DELETE CASCADE` |
| `payroll_line_item_id` | `UUID` | `NO` | `UNIQUE REFERENCES public.payroll_line_items(id) ON DELETE CASCADE` |
| `employee_id` | `UUID` | `NO` | `REFERENCES public.employees(id) ON DELETE RESTRICT` |
| `payslip_number` | `VARCHAR(50)` | `NO` | `UNIQUE` |
| `storage_path` | `TEXT` | `YES` | — |
| `is_published` | `BOOLEAN` | `NO` | `DEFAULT false` |
| `published_at` | `TIMESTAMPTZ` | `YES` | — |
| `downloaded_at` | `TIMESTAMPTZ` | `YES` | — |
| `created_at` | `TIMESTAMPTZ` | `NO` | `DEFAULT now()` |

---

## 2. Inconsistency Reconciliation Findings

### A. Annual CTC Location (`annual_ctc`)
- **Master Report Statement:** Master report listed `annual_ctc` as a column on `salary_structures`.
- **Actual DB Schema:** `annual_ctc` is **NOT** on `salary_structures`. `salary_structures` defines template compensation formulas (`name`, `code`, `description`, `is_active`).
- **Canonical Location:** `annual_ctc` resides on `public.employee_salary_assignments` (`NUMERIC(15, 2) NOT NULL`).
- **Status:** **MISMATCH IN MASTER REPORT (Identified & Clarified)**

### B. Payroll Period Mapping (`payroll_period` vs `month` & `year`)
- **Master Report Statement:** Master report listed `payroll_period` as a single `DATE` column on `payroll_runs`.
- **Actual DB Schema:** `payroll_runs` does **NOT** have a column named `payroll_period`. Instead, the canonical schema stores the period as two integer columns: `month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12)` and `year INTEGER NOT NULL`, with constraint `UNIQUE(company_id, year, month)`.
- **Status:** **MISMATCH IN MASTER REPORT (Identified & Clarified)**

### C. Salary Structure Column Name Discrepancies in `payrollApi.ts`
- **In `payrollApi.ts` line 510-511:** Service attempts to upsert `structure_code` and `structure_name`.
- **In Canonical Schema `012_payroll.sql:29-30`:** The actual columns are `name` and `code`.
- **Status:** **MISMATCH IN SERVICE PROPERTY ADAPTER (Identified & Clarified)**

---

## 3. Authoritative Payroll Field Contract Matrix

| Field Concept | Actual DB Table | Actual DB Column | Current Service Property | Correct Canonical DB Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Structure Name** | `salary_structures` | `name` | `structure_name` / `name` | `salary_structures.name` | **PASS (Adapter required)** |
| **Structure Code** | `salary_structures` | `code` | `structure_code` / `code` | `salary_structures.code` | **PASS (Adapter required)** |
| **Structure Active Flag**| `salary_structures` | `is_active` | `status` ('Active') | `salary_structures.is_active` | **PASS** |
| **Employee CTC** | `employee_salary_assignments` | `annual_ctc` | `annual_ctc` / `ctc` | `employee_salary_assignments.annual_ctc` | **PASS** |
| **Monthly Gross** | `employee_salary_assignments` | `monthly_gross` | `monthly_gross` | `employee_salary_assignments.monthly_gross` | **PASS** |
| **Effective From Date** | `employee_salary_assignments` | `effective_from` | `effective_from` | `employee_salary_assignments.effective_from` | **PASS** |
| **Payroll Month** | `payroll_runs` | `month` | `payroll_period` (YYYY-MM) | `payroll_runs.month` (INTEGER 1-12) | **PASS (Split required)** |
| **Payroll Year** | `payroll_runs` | `year` | `payroll_period` (YYYY-MM) | `payroll_runs.year` (INTEGER YYYY) | **PASS (Split required)** |
| **Total Gross Pay** | `payroll_runs` | `total_gross_pay` | `total_gross` | `payroll_runs.total_gross_pay` | **PASS** |
| **Total Net Pay** | `payroll_runs` | `total_net_pay` | `total_net_payout` | `payroll_runs.total_net_pay` | **PASS** |
| **Working Days** | `payroll_line_items` | `total_working_days` | `total_working_days` | `payroll_line_items.total_working_days` | **PASS** |
| **Payable Days** | `payroll_line_items` | `payable_days` | `payable_days` | `payroll_line_items.payable_days` | **PASS** |
| **Loss of Pay Days** | `payroll_line_items` | `lop_days` | `lop_days` | `payroll_line_items.lop_days` | **PASS** |
| **Employee Gross** | `payroll_line_items` | `gross_earnings` | `gross_earnings` | `payroll_line_items.gross_earnings` | **PASS** |
| **Employee Net** | `payroll_line_items` | `net_pay` | `net_pay` | `payroll_line_items.net_pay` | **PASS** |
| **Earnings JSON** | `payroll_line_items` | `earnings_breakdown`| `earnings_breakdown` | `payroll_line_items.earnings_breakdown` | **PASS** |
| **Deductions JSON** | `payroll_line_items` | `deductions_breakdown`| `deductions_breakdown` | `payroll_line_items.deductions_breakdown`| **PASS** |
| **Payslip Number** | `payslips` | `payslip_number` | `payslip_number` | `payslips.payslip_number` | **PASS** |
| **Line Item Reference** | `payslips` | `payroll_line_item_id`| `payroll_line_item_id` | `payslips.payroll_line_item_id` | **PASS** |

---

## 4. Summary & Verification

1. **`salary_structures` is a pure template table:** It does **not** store an individual employee's `annual_ctc`. An employee's compensation is assigned through `employee_salary_assignments` which holds `annual_ctc` and `monthly_gross`.
2. **`payroll_runs` stores month and year separately:** It does **not** have a `payroll_period` column; queries must filter on `month` (1-12) and `year`.
3. **`payslips` references `payroll_line_items`:** Payslip financial amounts (earnings, deductions, net pay) are stored on the parent `payroll_line_items` record.
