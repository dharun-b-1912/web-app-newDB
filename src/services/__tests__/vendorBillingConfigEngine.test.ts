// src/services/__tests__/vendorBillingConfigEngine.test.ts
// ============================================================================
// JOY PeopleHR — Vendor Billing & Configuration Engine Unit Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { WageComponentMappingService } from '../clientBilling/wageComponentMappingService';
import { ChargeCategoryService } from '../clientBilling/chargeCategoryService';
import { StatutoryReconciliationService } from '../clientBilling/statutoryReconciliationService';
import { ExcelTemplateMapperService } from '../clientBilling/excelTemplateMapperService';
import { BillingRun } from '../../types/clientBilling';

// Mock localStorage for Node environment in Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe('Vendor Billing & Wage Configuration Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Wage Component Master & Dynamic Mapping', () => {
    it('seeds and retrieves standard master wage components', () => {
      const components = WageComponentMappingService.getMasterComponents();
      expect(components.length).toBeGreaterThan(5);
      const basic = components.find((c) => c.component_code === 'BASIC');
      expect(basic).toBeDefined();
      expect(basic?.statutory_treatment).toBe('PF_WAGE_BASIS');
    });

    it('generates default contract mappings for a client contract', () => {
      const mappings = WageComponentMappingService.getContractMappings('client-01', 'contract-01');
      expect(mappings.length).toBeGreaterThan(0);
      const basicMap = mappings.find((m) => m.component_code === 'BASIC');
      expect(basicMap?.is_included_in_billable_basis).toBe(true);
      expect(basicMap?.transformation_rule).toBe('INCLUDED_IN_BILLABLE_BASE');
    });

    it('updates mapping rule to exclude a component from billable wage basis', () => {
      WageComponentMappingService.getContractMappings('client-01', 'contract-01');
      const updated = WageComponentMappingService.updateMappingRule(
        'client-01',
        'contract-01',
        'HRA',
        { is_included_in_billable_basis: false, transformation_rule: 'SEPARATE_LINE_ITEM' }
      );
      const hra = updated.find((m) => m.component_code === 'HRA');
      expect(hra?.is_included_in_billable_basis).toBe(false);
      expect(hra?.transformation_rule).toBe('SEPARATE_LINE_ITEM');
    });

    it('accurately calculates simulated billable wage basis from component values', () => {
      const mappings = WageComponentMappingService.getContractMappings('client-01', 'contract-01');
      const simulation = WageComponentMappingService.calculateSimulatedWageBasis(mappings, {
        BASIC: 15000,
        DA: 3000,
        HRA: 4000,
        SPL_ALLOW: 1000,
        OT_WAGES: 2000,
        ATT_BONUS: 1000,
        INCENTIVE: 0,
        CANTEEN_REC: 650,
        UNIFORM_REC: 0,
      });

      // BASIC (15000) + DA (3000) + HRA (4000) + SPL_ALLOW (1000) + OT_WAGES (2000) + ATT_BONUS (1000) = 26000
      expect(simulation.billableWageBasis).toBe(26000);
      expect(simulation.grossEarnings).toBe(26650);
      expect(simulation.deductionsAndRecoveries).toBe(650);
    });
  });

  describe('2. Charge Category Master & Rate Evaluation', () => {
    it('retrieves master charge categories', () => {
      const categories = ChargeCategoryService.getMasterCategories();
      expect(categories.length).toBeGreaterThan(4);
      expect(categories.some((c) => c.category_code === 'SERVICE_CHARGE')).toBe(true);
      expect(categories.some((c) => c.category_code === 'TRANSPORT')).toBe(true);
    });

    it('evaluates percentage of billable wages charge correctly', () => {
      const amount = ChargeCategoryService.evaluateChargeAmount(
        { calculation_method: 'PERCENTAGE_OF_BILLABLE_WAGES', rate_value: 8.5 },
        { grossBillableWages: 24554, grossTotalWages: 24554, activeHeadcount: 1, payableDays: 30, otHours: 8 }
      );
      // 24554 * 0.085 = 2087.09 => 2087
      expect(amount).toBe(2087);
    });

    it('evaluates per active head charge correctly', () => {
      const amount = ChargeCategoryService.evaluateChargeAmount(
        { calculation_method: 'PER_EMPLOYEE', rate_value: 375 },
        { grossBillableWages: 50000, grossTotalWages: 50000, activeHeadcount: 4, payableDays: 120, otHours: 16 }
      );
      expect(amount).toBe(1500);
    });
  });

  describe('3. Statutory Reconciliation & Exception Tracking', () => {
    const mockRun: BillingRun = {
      id: 'run-test-01',
      tenant_id: 'tenant-joy-01',
      run_number: 'RUN-2026-08-001',
      client_id: 'client-01',
      client_name: 'Electrodive Powertrain',
      contract_id: 'contract-01',
      contract_number: 'CNT-001',
      contract_name: 'Assembly Manpower',
      period: 'August 2026',
      period_start_date: '2026-08-01',
      period_end_date: '2026-08-31',
      status: 'CALCULATED',
      active_employee_count: 1,
      total_payable_days: 30,
      total_ot_hours: 0,
      total_employee_gross_earnings: 24554,
      total_employee_recoveries: 650,
      total_employee_net_salary: 21000,
      total_gross_billable_wages: 24554,
      total_employer_pf: 1685,
      total_employer_esi: 0,
      total_employer_statutory: 1685,
      total_service_charges: 2032,
      total_transport_charges: 375,
      total_other_charges: 0,
      total_canteen_recoveries: 650,
      taxable_amount: 27961,
      tax_summary: {
        supplier_state_code: '33',
        supplier_state_name: 'Tamil Nadu',
        client_state_code: '33',
        client_state_name: 'Tamil Nadu',
        supply_type: 'INTRASTATE',
        taxable_value: 27961,
        cgst_rate_pct: 9,
        cgst_amount: 2516,
        sgst_rate_pct: 9,
        sgst_amount: 2516,
        igst_rate_pct: 0,
        igst_amount: 0,
        total_tax_amount: 5032,
        round_off_amount: 0,
        grand_total: 32993,
        amount_in_words: 'Thirty Two Thousand Nine Hundred Ninety Three Only',
      },
      line_items: [],
      employee_results: [
        {
          employee_id: 'emp-01',
          employee_code: 'EMP001',
          employee_name: 'Murugan P',
          designation: 'Assembly Associate',
          department: 'Powertrain',
          deployment_wage_type: 'MONTHLY_SALARY',
          calendar_days: 31,
          salary_divisor_days: 26,
          present_days: 26,
          paid_leaves: 0,
          paid_holidays: 4,
          weekly_offs: 0,
          lop_days: 0,
          payable_days: 30,
          ot_hours: 0,
          basic_earned: 14500,
          da_earned: 3200,
          hra_earned: 4100,
          special_allowance_earned: 1500,
          ot_amount_earned: 0,
          attendance_bonus_earned: 1254,
          incentive_earned: 0,
          arrears_earned: 0,
          leave_wages_earned: 0,
          other_earnings: 0,
          gross_earnings: 24554,
          gross_billable_wages: 24554,
          employee_pf: 1685,
          employee_esi: 0,
          employee_pt: 200,
          employee_tds: 0,
          canteen_deduction: 650,
          uniform_deduction: 0,
          advance_recovery: 0,
          other_deductions: 0,
          total_employee_deductions: 2535,
          net_employee_payable: 22019,
          employer_epf_3_67: 514,
          employer_eps_8_33: 1171,
          employer_pf_total_12: 1685,
          employer_edli_0_5: 0,
          employer_pf_admin_0_5: 0,
          total_employer_pf_cost: 1685,
          employer_esi_3_25: 0,
          employer_lwf: 0,
          total_employer_statutory_cost: 1685,
          billed_direct_wages: 24554,
          billed_statutory_cost: 1685,
          employee_total_billing: 26239,
        },
      ],
      reconciliation: {
        payroll_employee_count: 1,
        billed_employee_count: 1,
        employee_count_status: 'MATCHED',
        payroll_total_pay_days: 30,
        billed_total_pay_days: 30,
        pay_days_status: 'MATCHED',
        payroll_total_ot_hours: 0,
        billed_total_ot_hours: 0,
        ot_hours_status: 'MATCHED',
        payroll_employer_pf: 1685,
        billed_employer_pf: 1685,
        employer_pf_status: 'MATCHED',
        payroll_employer_esi: 0,
        billed_employer_esi: 0,
        employer_esi_status: 'MATCHED',
        notes: [],
      },
      validation: {
        is_valid: true,
        checks: [],
      },
      explainability: {
        employee_count: 1,
        total_payable_days: 30,
        total_ot_hours: 0,
        gross_earnings_explainer: { id: 'ge', title: 'Gross', formula: '', inputs: [], result: 24554 },
        billable_wages_explainer: { id: 'bw', title: 'Billable', formula: '', inputs: [], result: 24554 },
        employer_pf_explainer: { id: 'pf', title: 'PF', formula: '', inputs: [], result: 1685 },
        employer_esi_explainer: { id: 'esi', title: 'ESI', formula: '', inputs: [], result: 0 },
        service_charge_explainer: { id: 'sc', title: 'Service Charge', formula: '', inputs: [], result: 2032 },
        transport_charge_explainer: { id: 'tc', title: 'Transport', formula: '', inputs: [], result: 375 },
        canteen_recovery_explainer: { id: 'cr', title: 'Canteen', formula: '', inputs: [], result: 650 },
        taxable_amount_explainer: { id: 'ta', title: 'Taxable', formula: '', inputs: [], result: 27961 },
        gst_tax_explainer: { id: 'gt', title: 'GST', formula: '', inputs: [], result: 5032 },
        grand_total_explainer: { id: 'gtt', title: 'Grand Total', formula: '', inputs: [], result: 32993 },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('audits and detects clean balance with zero exceptions', () => {
      const result = StatutoryReconciliationService.auditAndReconcileRun(mockRun);
      expect(result.isCompliant).toBe(true);
      expect(result.headcountMatchPct).toBe(100);
      expect(result.exceptions.length).toBe(0);
    });

    it('detects and flags headcount mismatch exception', () => {
      const mismatchedRun = {
        ...mockRun,
        reconciliation: {
          ...mockRun.reconciliation,
          payroll_employee_count: 2,
          billed_employee_count: 1,
        },
      };
      const result = StatutoryReconciliationService.auditAndReconcileRun(mismatchedRun);
      expect(result.isCompliant).toBe(false);
      expect(result.exceptions.length).toBe(1);
      expect(result.exceptions[0].exception_type).toBe('HEADCOUNT_MISMATCH');
      expect(result.exceptions[0].severity).toBe('CRITICAL');
    });

    it('resolves an exception with audit notes', () => {
      const mismatchedRun = {
        ...mockRun,
        reconciliation: {
          ...mockRun.reconciliation,
          payroll_employee_count: 2,
          billed_employee_count: 1,
        },
      };
      const result = StatutoryReconciliationService.auditAndReconcileRun(mismatchedRun);
      const excId = result.exceptions[0].id;

      StatutoryReconciliationService.resolveException(
        excId,
        'Associate was on LOP during entire cycle; excluded from billing with client approval',
        'OVERRIDDEN',
        'Finance Head'
      );

      const saved = StatutoryReconciliationService.getExceptionsForRun(mockRun.id);
      expect(saved[0].status).toBe('OVERRIDDEN');
      expect(saved[0].resolved_by).toBe('Finance Head');
    });
  });

  describe('4. Legacy Excel Template Mapper & Compiler', () => {
    it('retrieves standard Excel templates with multi-sheet structure', () => {
      const templates = ExcelTemplateMapperService.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      const plantTmpl = templates[0];
      expect(plantTmpl.sheets.length).toBeGreaterThanOrEqual(2);
      expect(plantTmpl.sheets[0].columns.length).toBeGreaterThan(5);
    });

    it('publishes a new template version with incremented version number', () => {
      const templates = ExcelTemplateMapperService.getTemplates();
      const initialVersion = templates[0].version;
      const published = ExcelTemplateMapperService.publishTemplate(templates[0].id, 'Plant Head');

      expect(published.version).toBe(initialVersion + 1);
      expect(published.status).toBe('PUBLISHED');
      expect(published.published_by).toBe('Plant Head');
    });
  });
});
