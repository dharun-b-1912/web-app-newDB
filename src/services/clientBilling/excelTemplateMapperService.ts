// src/services/clientBilling/excelTemplateMapperService.ts
// ============================================================================
// JOY PeopleHR — Legacy Excel Template Mapper & Multi-Sheet Export Compiler
// ============================================================================

import {
  ExcelTemplateDefinition,
  ExcelSheetDefinition,
  BillingRun,
} from '../../types/clientBilling';

export const STANDARD_EXCEL_TEMPLATES: ExcelTemplateDefinition[] = [
  {
    id: 'tmpl-multi-plant-01',
    tenant_id: 'tenant-joy-01',
    template_code: 'PLANT_DUAL_SHEET_V2',
    template_name: 'Plant 1 & Plant 2 Dual-Sheet Wage & OT Register',
    version: 2,
    status: 'PUBLISHED',
    description: 'Corporate multi-plant invoice format with separate tabs for assembly associates and overtime workings',
    applicable_plants: ['Plant 1 (Powertrain)', 'Plant 2 (EV Chassis)'],
    published_at: '2026-04-01T10:00:00Z',
    published_by: 'Finance Operations Desk',
    created_at: '2026-03-15T09:00:00Z',
    sheets: [
      {
        sheet_id: 'sheet-plant-1',
        sheet_name: 'Plant 1 - Regular Wages',
        sheet_type: 'PLANT_1',
        title_header: 'ELECTRODIVE POWERTRAIN - PLANT 1 REGULAR WAGE BILLING REGISTER',
        columns: [
          { column_key: 'A', header_label: 'Sl. No', source_path: 'index', format: 'NUMBER', width: 8, is_visible: true, order: 1 },
          { column_key: 'B', header_label: 'Associate ID', source_path: 'employee_code', format: 'TEXT', width: 14, is_visible: true, order: 2 },
          { column_key: 'C', header_label: 'Associate Name', source_path: 'employee_name', format: 'TEXT', width: 24, is_visible: true, order: 3 },
          { column_key: 'D', header_label: 'UAN / EPFO No', source_path: 'uan', format: 'TEXT', width: 16, is_visible: true, order: 4 },
          { column_key: 'E', header_label: 'ESIC No', source_path: 'esi_number', format: 'TEXT', width: 16, is_visible: true, order: 5 },
          { column_key: 'F', header_label: 'Paid Days', source_path: 'payable_days', format: 'NUMBER', width: 10, is_visible: true, order: 6 },
          { column_key: 'G', header_label: 'Basic Wages', source_path: 'basic_earned', format: 'CURRENCY', width: 14, is_visible: true, order: 7 },
          { column_key: 'H', header_label: 'DA Earned', source_path: 'da_earned', format: 'CURRENCY', width: 12, is_visible: true, order: 8 },
          { column_key: 'I', header_label: 'HRA Earned', source_path: 'hra_earned', format: 'CURRENCY', width: 12, is_visible: true, order: 9 },
          { column_key: 'J', header_label: 'Gross Billable Base', source_path: 'gross_billable_wages', format: 'CURRENCY', width: 16, is_visible: true, order: 10 },
          { column_key: 'K', header_label: 'Employer PF (13%)', source_path: 'total_employer_pf_cost', format: 'CURRENCY', width: 16, is_visible: true, order: 11 },
          { column_key: 'L', header_label: 'Employer ESI (3.25%)', source_path: 'employer_esi_3_25', format: 'CURRENCY', width: 16, is_visible: true, order: 12 },
          { column_key: 'M', header_label: 'Total Billable Amt', source_path: 'employee_total_billing', format: 'CURRENCY', width: 18, is_visible: true, order: 13 },
        ],
        totals_formulas: {
          'F': 'SUM(F6:F100)',
          'G': 'SUM(G6:G100)',
          'H': 'SUM(H6:H100)',
          'I': 'SUM(I6:I100)',
          'J': 'SUM(J6:J100)',
          'K': 'SUM(K6:K100)',
          'L': 'SUM(L6:L100)',
          'M': 'SUM(M6:M100)',
        },
      },
      {
        sheet_id: 'sheet-ot-workings',
        sheet_name: 'OT Workings & Breakdown',
        sheet_type: 'OT_BILL',
        title_header: 'CONTRACTUAL OVERTIME WORKINGS & DOUBLE RATE BILLING LEDGER',
        columns: [
          { column_key: 'A', header_label: 'Sl. No', source_path: 'index', format: 'NUMBER', width: 8, is_visible: true, order: 1 },
          { column_key: 'B', header_label: 'Associate ID', source_path: 'employee_code', format: 'TEXT', width: 14, is_visible: true, order: 2 },
          { column_key: 'C', header_label: 'Associate Name', source_path: 'employee_name', format: 'TEXT', width: 24, is_visible: true, order: 3 },
          { column_key: 'D', header_label: 'Designation', source_path: 'designation', format: 'TEXT', width: 18, is_visible: true, order: 4 },
          { column_key: 'E', header_label: 'Approved OT Hours', source_path: 'ot_hours', format: 'NUMBER', width: 14, is_visible: true, order: 5 },
          { column_key: 'F', header_label: 'OT Rate / Hr', formula_expression: '(Basic + DA) / (26 * 8) * 2', format: 'CURRENCY', width: 14, is_visible: true, order: 6 },
          { column_key: 'G', header_label: 'Total OT Billing (₹)', source_path: 'ot_amount_earned', format: 'CURRENCY', width: 18, is_visible: true, order: 7 },
        ],
        totals_formulas: {
          'E': 'SUM(E6:E100)',
          'G': 'SUM(G6:G100)',
        },
      },
      {
        sheet_id: 'sheet-summary-recap',
        sheet_name: 'Statutory Recap & GST',
        sheet_type: 'SUMMARY',
        title_header: 'MONTHLY TAX INVOICE CONSOLIDATED STATUTORY & SERVICE CHARGE SUMMARY',
        columns: [
          { column_key: 'A', header_label: 'Billing Component', source_path: 'component_name', format: 'TEXT', width: 30, is_visible: true, order: 1 },
          { column_key: 'B', header_label: 'Rate / Basis', source_path: 'basis_description', format: 'TEXT', width: 24, is_visible: true, order: 2 },
          { column_key: 'C', header_label: 'Total Amount (INR)', source_path: 'line_amount', format: 'CURRENCY', width: 20, is_visible: true, order: 3 },
        ],
      },
    ],
  },
];

// ─── In-memory session cache (no localStorage) ───────────────────────────────
const STORAGE_KEYS = {
  TEMPLATES: 'excel_templates',
};
const _store = new Map<string, any>();

export class ExcelTemplateMapperService {
  private static getStorage<T>(key: string, fallback: T): T {
    return _store.has(key) ? _store.get(key) : fallback;
  }

  private static setStorage<T>(key: string, value: T): void {
    _store.set(key, value);
  }

  public static getTemplates(): ExcelTemplateDefinition[] {
    const list = this.getStorage<ExcelTemplateDefinition[]>(STORAGE_KEYS.TEMPLATES, []);
    if (list.length === 0) {
      this.setStorage(STORAGE_KEYS.TEMPLATES, STANDARD_EXCEL_TEMPLATES);
      return STANDARD_EXCEL_TEMPLATES;
    }
    return list;
  }

  public static saveTemplate(tmpl: ExcelTemplateDefinition): ExcelTemplateDefinition {
    const list = this.getTemplates();
    const idx = list.findIndex((t) => t.id === tmpl.id || t.template_code === tmpl.template_code);
    if (idx >= 0) {
      list[idx] = tmpl;
    } else {
      list.push(tmpl);
    }
    this.setStorage(STORAGE_KEYS.TEMPLATES, list);
    return tmpl;
  }

  public static publishTemplate(templateId: string, author: string): ExcelTemplateDefinition {
    const list = this.getTemplates();
    const idx = list.findIndex((t) => t.id === templateId);
    if (idx < 0) throw new Error('Template not found');

    const updated: ExcelTemplateDefinition = {
      ...list[idx],
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: author,
      version: list[idx].version + 1,
    };

    list[idx] = updated;
    this.setStorage(STORAGE_KEYS.TEMPLATES, list);
    return updated;
  }

  public static compileWorkbookExportData(
    template: ExcelTemplateDefinition,
    run: BillingRun
  ): {
    workbookName: string;
    sheets: {
      sheetName: string;
      headers: string[];
      rows: (string | number)[][];
      totals: Record<string, string | number>;
    }[];
  } {
    const sheets = template.sheets.map((s) => {
      const headers = s.columns.filter((c) => c.is_visible).map((c) => c.header_label);
      const rows = run.employee_results.map((emp, idx) => {
        return s.columns
          .filter((c) => c.is_visible)
          .map((col) => {
            if (col.source_path === 'index') return idx + 1;
            if (col.source_path && col.source_path in emp) {
              return (emp as any)[col.source_path] ?? 0;
            }
            return '-';
          });
      });

      return {
        sheetName: s.sheet_name,
        headers,
        rows,
        totals: s.totals_formulas ?? {},
      };
    });

    return {
      workbookName: `${run.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${run.period}_Wage_Billing.xlsx`,
      sheets,
    };
  }
}
