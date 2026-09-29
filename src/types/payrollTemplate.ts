// src/types/payrollTemplate.ts
// ============================================================================
// Joy PeopleHR — Payroll Excel Template Type System
// Enables custom corporate payroll formats without hard-coded code changes
// ============================================================================

export type TemplateSectionCategory =
  | 'EMPLOYEE_INFO'
  | 'ATTENDANCE_METRICS'
  | 'EARNINGS'
  | 'DEDUCTIONS'
  | 'EMPLOYER_CONTRIBUTIONS'
  | 'NET_AND_SIGNATURE'
  | 'CLIENT_BILLING';

export type CalculationMethodType =
  | 'PERCENTAGE_OF_BASE'      // e.g. 55% of Base Wage (Daily Rate × Pay Days)
  | 'PERCENTAGE_OF_BASIC'     // e.g. 12% of Basic
  | 'PERCENTAGE_OF_GROSS'     // e.g. 0.75% of Gross (ESI)
  | 'FIXED_PER_MONTH'         // e.g. ₹500 fixed amount
  | 'FIXED_PER_DAY'           // e.g. ₹50 × Working Days (Food Allowance)
  | 'PER_SHIFT_COUNT'         // e.g. ₹150 × Night Shifts (Night Allowance)
  | 'HOURLY_OT_RATE'          // e.g. Fixed contractual rate × OT Hours
  | 'STATUTORY_2X_BASIC'      // Statutory 2× Basic Hourly Rate: (Daily × Basic% / 8) × 2 (Factories Act Sec 59)
  | 'DOUBLE_ORDINARY_RATE'    // 2.00× Double Ordinary Rate Card: (Daily / 8) × 2
  | 'COMPANY_OT_POLICY'       // Company Norm Policy (1.50× Multiplier via OTPolicyEngine)
  | 'ATTENDANCE_DRIVEN'       // e.g. Attendance Bonus if >= 26 days
  | 'MANUAL_ENTRY'            // Variable user input
  | 'COMPUTED_SUM';           // E.g. Sum of earnings / deductions

export interface TemplateColumnDefinition {
  fieldKey: string;           // e.g. 'basic_55', 'hra_45', 'wages', 'f_allow'
  headerLabel: string;        // e.g. 'BASIC 55%', 'HRA 45%', 'F.ALLOW'
  category: TemplateSectionCategory;
  width: number;
  format?: 'INR' | 'NUMBER' | 'PERCENT' | 'TEXT' | 'DATE';
  formula?: string;           // Optional Excel formula template, e.g. '=H{row}*55%'
  isCalculated: boolean;
  required: boolean;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  backgroundColor?: string;
  textColor?: string;
  calculationMethod?: CalculationMethodType;
  calculationValue?: number;  // e.g. 55 for 55%, 500 for ₹500
  isCustom?: boolean;         // true if added by user
  isEnabled?: boolean;        // true by default; false disables/excludes component from calculation & export
  description?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  category: TemplateSectionCategory;
  columns: TemplateColumnDefinition[];
  headerColor?: string;
}

export interface PayrollTemplate {
  templateId: string;
  templateCode?: string;
  templateName: string;
  organizationId?: string;
  companyId?: string;
  vendorId?: string;
  clientId?: string;
  version: string;
  description: string;
  layoutType: 'STANDARD_11_SHEET' | 'COMPANY_SALARY_STATEMENT' | 'CLIENT_INVOICE_WORKINGS';
  sheetName: string;
  freezePanes?: { xSplit: number; ySplit: number };
  sections: TemplateSection[];
  totalRowIncluded: boolean;
  signatureBlockIncluded: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

