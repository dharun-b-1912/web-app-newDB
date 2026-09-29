// src/services/vendor/payrollTemplateService.ts
// ============================================================================
// Joy PeopleHR — Payroll Excel Template Service
// Defines and serves company-specific payroll layouts and master exports
// ============================================================================

import { PayrollTemplate } from '../../types/payrollTemplate';

export const JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE: PayrollTemplate = {
  templateId: 'TMPL_JOY_MANPOWER_SALARY_STATEMENT',
  templateName: 'Joy Manpower Services — Monthly Salary Statement Format',
  vendorId: 'VND-JOY-01',
  version: '2.0',
  description: 'Client-mandated salary statement with explicit D WAGE, BASIC 55%, HRA 45%, WAGES, Allowances, and Statutory Deductions.',
  layoutType: 'COMPANY_SALARY_STATEMENT',
  sheetName: 'Salary Statement',
  freezePanes: { xSplit: 3, ySplit: 2 },
  totalRowIncluded: true,
  signatureBlockIncluded: true,
  createdAt: '2026-08-26T00:00:00.000Z',
  sections: [
    {
      id: 'SEC_EMP',
      title: 'EMPLOYEE INFORMATION',
      category: 'EMPLOYEE_INFO',
      headerColor: 'FF07563D',
      columns: [
        { fieldKey: 's_no', headerLabel: 'S.No', category: 'EMPLOYEE_INFO', width: 6, isCalculated: false, required: true, align: 'center' },
        { fieldKey: 'emp_id', headerLabel: 'Emp ID', category: 'EMPLOYEE_INFO', width: 10, isCalculated: false, required: true, align: 'center', bold: true },
        { fieldKey: 'emp_name', headerLabel: 'Employee Name', category: 'EMPLOYEE_INFO', width: 22, isCalculated: false, required: true, bold: true },
        { fieldKey: 'department', headerLabel: 'DEPT', category: 'EMPLOYEE_INFO', width: 14, isCalculated: false, required: false },
        { fieldKey: 'category', headerLabel: 'Category', category: 'EMPLOYEE_INFO', width: 16, isCalculated: false, required: false },
      ],
    },
    {
      id: 'SEC_ATTD',
      title: 'ATTENDANCE METRICS',
      category: 'ATTENDANCE_METRICS',
      headerColor: 'FF1E3A8A',
      columns: [
        { fieldKey: 'daily_rate', headerLabel: 'D WAGE', category: 'ATTENDANCE_METRICS', width: 11, format: 'INR', isCalculated: false, required: true, align: 'right' },
        { fieldKey: 'working_days', headerLabel: 'W DAYS', category: 'ATTENDANCE_METRICS', width: 9, format: 'NUMBER', isCalculated: false, required: true, align: 'center' },
        { fieldKey: 'nfh_days', headerLabel: 'NFH', category: 'ATTENDANCE_METRICS', width: 8, format: 'NUMBER', isCalculated: false, required: false, align: 'center' },
        { fieldKey: 'payable_days', headerLabel: 'PAY DAYS', category: 'ATTENDANCE_METRICS', width: 10, format: 'NUMBER', isCalculated: true, required: true, align: 'center', bold: true },
        { fieldKey: 'lop_days', headerLabel: 'LOP', category: 'ATTENDANCE_METRICS', width: 8, format: 'NUMBER', isCalculated: false, required: false, align: 'center' },
        { fieldKey: 'ot_hours', headerLabel: 'OT HOURS', category: 'ATTENDANCE_METRICS', width: 10, format: 'NUMBER', isCalculated: false, required: false, align: 'center' },
        { fieldKey: 'night_shifts', headerLabel: 'NIGHT SHIFTS', category: 'ATTENDANCE_METRICS', width: 11, format: 'NUMBER', isCalculated: false, required: false, align: 'center' },
      ],
    },
    {
      id: 'SEC_EARN',
      title: 'EARNINGS BREAKUP',
      category: 'EARNINGS',
      headerColor: 'FF065F46',
      columns: [
        { fieldKey: 'basic_55', headerLabel: 'BASIC 55%', category: 'EARNINGS', width: 13, format: 'INR', isCalculated: true, required: true, align: 'right', calculationMethod: 'PERCENTAGE_OF_BASE', calculationValue: 55 },
        { fieldKey: 'hra_45', headerLabel: 'HRA 45%', category: 'EARNINGS', width: 13, format: 'INR', isCalculated: true, required: true, align: 'right', calculationMethod: 'PERCENTAGE_OF_BASE', calculationValue: 45 },
        { fieldKey: 'wages', headerLabel: 'Wages', category: 'EARNINGS', width: 13, format: 'INR', isCalculated: true, required: true, align: 'right', bold: true, calculationMethod: 'COMPUTED_SUM' },
        { fieldKey: 'ot_amount', headerLabel: 'OT', category: 'EARNINGS', width: 11, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'HOURLY_OT_RATE' },
        { fieldKey: 'ot_stipend', headerLabel: 'OT STIPEND', category: 'EARNINGS', width: 12, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'food_allowance', headerLabel: 'F.ALLOW', category: 'EARNINGS', width: 11, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'FIXED_PER_DAY', calculationValue: 50 },
        { fieldKey: 'night_allowance', headerLabel: 'N.ALLOW', category: 'EARNINGS', width: 11, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'PER_SHIFT_COUNT', calculationValue: 150 },
        { fieldKey: 'attendance_bonus', headerLabel: 'ATTN BONUS', category: 'EARNINGS', width: 13, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'ATTENDANCE_DRIVEN', calculationValue: 500 },
        { fieldKey: 'arrears', headerLabel: 'ARREARS', category: 'EARNINGS', width: 11, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'MANUAL_ENTRY', calculationValue: 0 },
        { fieldKey: 'other_earnings', headerLabel: 'OTHER EARNINGS', category: 'EARNINGS', width: 14, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'MANUAL_ENTRY', calculationValue: 0 },
        { fieldKey: 'gross_earnings', headerLabel: 'GROSS', category: 'EARNINGS', width: 14, format: 'INR', isCalculated: true, required: true, align: 'right', bold: true, backgroundColor: 'FFD1FAE5', calculationMethod: 'COMPUTED_SUM' },
      ],
    },
    {
      id: 'SEC_DED_STAT',
      title: 'STATUTORY DEDUCTIONS',
      category: 'DEDUCTIONS',
      headerColor: 'FF991B1B',
      columns: [
        { fieldKey: 'pf_employee', headerLabel: 'PF', category: 'DEDUCTIONS', width: 11, format: 'INR', isCalculated: true, required: true, align: 'right', calculationMethod: 'PERCENTAGE_OF_BASIC', calculationValue: 12, isEnabled: true },
        { fieldKey: 'esi_employee', headerLabel: 'ESI', category: 'DEDUCTIONS', width: 10, format: 'INR', isCalculated: true, required: true, align: 'right', calculationMethod: 'PERCENTAGE_OF_GROSS', calculationValue: 0.75, isEnabled: true },
        { fieldKey: 'pt', headerLabel: 'PT', category: 'DEDUCTIONS', width: 9, format: 'INR', isCalculated: true, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 208, isEnabled: false, description: 'Professional Tax (Disabled for non-slab months)' },
        { fieldKey: 'lwf', headerLabel: 'LWF', category: 'DEDUCTIONS', width: 8, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 20, isEnabled: false, description: 'Labour Welfare Fund (Annual Dec deduction only)' },
      ],
    },
    {
      id: 'SEC_DED_ASSET',
      title: 'ASSET & PPE RECOVERIES',
      category: 'DEDUCTIONS',
      headerColor: 'FFB45309',
      columns: [
        { fieldKey: 'shoe', headerLabel: 'SHOE', category: 'DEDUCTIONS', width: 11, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'uniform', headerLabel: 'UNIFORM', category: 'DEDUCTIONS', width: 11, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'asset_id', headerLabel: 'ID / TOOLS', category: 'DEDUCTIONS', width: 12, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'MANUAL_ENTRY', calculationValue: 0 },
      ],
    },
    {
      id: 'SEC_DED_MEAL',
      title: 'CANTEEN & MEAL RECOVERIES',
      category: 'DEDUCTIONS',
      headerColor: 'FFC2410C',
      columns: [
        { fieldKey: 'canteen', headerLabel: 'CANTEEN', category: 'DEDUCTIONS', width: 12, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'tiffin', headerLabel: 'TIFFIN', category: 'DEDUCTIONS', width: 10, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'food_recovery', headerLabel: 'FOOD RECOVERY', category: 'DEDUCTIONS', width: 13, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_DAY', calculationValue: 0 },
      ],
    },
    {
      id: 'SEC_DED_ADV',
      title: 'ADVANCES & WELFARE',
      category: 'DEDUCTIONS',
      headerColor: 'FF7C3AED',
      columns: [
        { fieldKey: 'advance', headerLabel: 'ADVANCE', category: 'DEDUCTIONS', width: 11, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 500 },
        { fieldKey: 'marriage', headerLabel: 'MARRIAGE', category: 'DEDUCTIONS', width: 11, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'rent', headerLabel: 'RENT', category: 'DEDUCTIONS', width: 10, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'FIXED_PER_MONTH', calculationValue: 0 },
        { fieldKey: 'other_deductions', headerLabel: 'OTHER DEDUCTION', category: 'DEDUCTIONS', width: 14, format: 'INR', isCalculated: false, required: false, align: 'right', calculationMethod: 'MANUAL_ENTRY', calculationValue: 0 },
        { fieldKey: 'total_deductions', headerLabel: 'TOTAL DEDUCTIONS', category: 'DEDUCTIONS', width: 15, format: 'INR', isCalculated: true, required: true, align: 'right', bold: true, backgroundColor: 'FFFEE2E2', calculationMethod: 'COMPUTED_SUM' },
      ],
    },
    {
      id: 'SEC_FINAL',
      title: 'FINAL NET AMOUNT & SIGNATURE',
      category: 'NET_AND_SIGNATURE',
      headerColor: 'FF1F2937',
      columns: [
        { fieldKey: 'net_pay', headerLabel: 'NET AMOUNT', category: 'NET_AND_SIGNATURE', width: 15, format: 'INR', isCalculated: true, required: true, align: 'right', bold: true, backgroundColor: 'FFD1FAE5', calculationMethod: 'COMPUTED_SUM' },
        { fieldKey: 'signature', headerLabel: 'SIGNATURE', category: 'NET_AND_SIGNATURE', width: 18, isCalculated: false, required: false, align: 'center', calculationMethod: 'MANUAL_ENTRY' },
      ],
    },
  ],
};

import { VendorPayrollTemplateDbService } from './vendorPayrollTemplateDbService';

export class PayrollTemplateService {
  private static templates: Map<string, PayrollTemplate> = new Map([
    [JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE.templateId, JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE],
  ]);

  static getTemplate(templateId: string): PayrollTemplate {
    return this.templates.get(templateId) ?? JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE;
  }

  static getTemplateForVendor(vendorId: string): PayrollTemplate {
    for (const t of this.templates.values()) {
      if (t.vendorId === vendorId) return t;
    }
    return JOY_MANPOWER_SALARY_STATEMENT_TEMPLATE;
  }

  static getAllTemplates(): PayrollTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Authoritative async database fetch for a specific company & vendor from PostgreSQL
   */
  static async fetchTemplateForCompany(companyId?: string, vendorId?: string): Promise<PayrollTemplate> {
    const tmpl = await VendorPayrollTemplateDbService.fetchTemplate({ companyId, vendorId });
    this.templates.set(tmpl.templateId, tmpl);
    return tmpl;
  }

  /**
   * Authoritative async database save for a specific company & vendor to PostgreSQL
   */
  static async saveTemplateForCompany(template: PayrollTemplate, companyId?: string, vendorId?: string): Promise<PayrollTemplate> {
    const res = await VendorPayrollTemplateDbService.saveTemplate(template, { companyId, vendorId });
    this.templates.set(res.template.templateId, res.template);
    return res.template;
  }

  /**
   * Sync memory cache
   */
  static updateTemplateInMemory(template: PayrollTemplate): void {
    this.templates.set(template.templateId, template);
  }
}

