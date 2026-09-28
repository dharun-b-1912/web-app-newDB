// src/services/__tests__/overtimePolicyFormulaChain.test.ts
// ============================================================================
// JOY PeopleHR — Overtime Policy Engine Formula Chain & Compliance Tests
// Tests Formulas A through E, Statutory Labeling, Caps, and Connected Billing
// ============================================================================

import { describe, it, expect } from 'vitest';
import { OTPolicyEngine } from '../payroll/otPolicyEngine';
import { VendorManpowerBillingEngine } from '../vendor/vendorManpowerBillingEngine';

describe('Overtime Policy Engine — Formula Chain & Verification Suite', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. FORMULAS A THROUGH E (Standard Prompt Configuration)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Standard Company Overtime Policy (₹17,000 / 26d / 8h / 1.5x / 2.0x / 30h OT)', () => {
    const calculation = OTPolicyEngine.calculateDedicated({
      actual_ot_hours: 30,
      monthly_salary_basis: 17000,
      policy_override: {
        policy_name: 'Standard Company Overtime Policy',
        effective_from: '2026-08-01',
        calculation_method: 'DYNAMIC_MULTIPLIER',
        working_days_divisor: 26,
        working_hours_per_day: 8,
        company_multiplier: 1.5,
        government_multiplier: 2.0,
        statutory_standard_preset: 'FACTORIES_ACT_1948',
        statutory_quarterly_ot_limit: 115,
        statutory_spreadover_hours_limit: 10.5,
      },
    });

    it('Formula A: calculates daily wage rate as ₹653.85 (17,000 / 26)', () => {
      // 17,000 / 26 = 653.84615... -> ₹653.85
      expect(calculation.formula_a_daily_wage_rate).toBe(653.85);
      expect(Math.abs(calculation.base_daily_rate - 653.8462)).toBeLessThan(0.01);
    });

    it('Formula B: calculates base hourly rate as ₹81.73/hr (653.85 / 8)', () => {
      // 653.84615 / 8 = 81.73076... -> ₹81.73/hr
      expect(calculation.formula_b_base_hourly_rate).toBe(81.73);
      expect(Math.abs(calculation.base_hourly_rate - 81.7308)).toBeLessThan(0.01);
    });

    it('Formula C: calculates company overtime hourly rate as ₹122.60/hr (81.73 × 1.5)', () => {
      // 81.730769 × 1.5 = 122.59615... -> ₹122.60/hr
      expect(calculation.formula_c_company_ot_hourly_rate).toBe(122.60);
      expect(Math.abs(calculation.company_ot_rate - 122.5962)).toBeLessThan(0.01);
    });

    it('Formula D: calculates company overtime amount as ₹3,677.88 (122.596 × 30 hrs)', () => {
      // 122.59615 × 30 = 3,677.8845... -> ₹3,677.88
      expect(calculation.formula_d_company_ot_amount).toBe(3677.88);
      expect(calculation.company_ot_amount).toBe(3677.88);
    });

    it('Formula E: calculates statutory reference rate as ₹163.46/hr and reference amount as ₹4,903.85 (81.73 × 2.0)', () => {
      // 81.730769 × 2 = 163.4615... -> ₹163.46/hr
      // 163.4615 × 30 = 4,903.846... -> ₹4,903.85
      expect(calculation.formula_e_statutory_reference_rate).toBe(163.46);
      expect(Math.abs(calculation.government_ot_rate - 163.4615)).toBeLessThan(0.01);
      expect(calculation.formula_e_statutory_reference_amount).toBe(4903.85);
    });

    it('verifies government equivalent hours reconciles with company OT payout', () => {
      // 3,677.88 / 163.46154 = 22.50 equivalent statutory hours
      expect(Math.abs(calculation.government_equivalent_ot_hours - 22.50)).toBeLessThan(0.01);
      expect(calculation.is_reconciled).toBe(true);
      expect(calculation.reconciliation_status).toBe('RECONCILED');
    });

    it('labels statutory status as VERIFIED_STATUTORY_CALCULATION under Factories Act 1948', () => {
      expect(calculation.statutory_compliance_status).toBe('VERIFIED_STATUTORY_CALCULATION');
      expect(calculation.compliance_audit.statutory_framework).toBe('FACTORIES_ACT_1948');
      expect(calculation.compliance_audit.is_quarterly_cap_compliant).toBe(true);
      expect(calculation.compliance_audit.statutory_quarterly_ot_limit).toBe(115);
    });

    it('attaches an immutable calculation snapshot for billing and invoice audit', () => {
      const snapshot = calculation.immutable_snapshot;
      expect(snapshot).toBeDefined();
      expect(snapshot.working_days_divisor).toBe(26);
      expect(snapshot.shift_hours_per_day).toBe(8);
      expect(snapshot.company_multiplier).toBe(1.5);
      expect(snapshot.approved_ot_hours).toBe(30);
      expect(snapshot.company_ot_amount).toBe(3677.88);
      expect(snapshot.effective_from).toBe('2026-08-01');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CODE ON WAGES 2019 & 50% WAGE RULE EVALUATION
  // ──────────────────────────────────────────────────────────────────────────
  describe('Code on Wages 2019 Standard (50% Basic Rule & 12h Spreadover)', () => {
    it('evaluates Code on Wages Sec 2(y) compliance and adjusts statutory deemed wage base if allowances > 50%', () => {
      // Monthly gross ₹20,000 with basic ₹7,000 (35%) and allowances ₹13,000 (65%)
      // 50% cap = ₹10,000. Excess allowances = ₹3,000. Deemed wage addition = ₹3,000.
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 10,
        monthly_salary_basis: 20000,
        basic_salary: 7000,
        allowances_amount: 13000,
        policy_override: {
          statutory_standard_preset: 'CODE_ON_WAGES_2019',
          enforce_50_percent_wage_rule: true,
          statutory_spreadover_hours_limit: 12.0,
          working_days_divisor: 26,
          working_hours_per_day: 8,
          government_multiplier: 2.0,
        },
      });

      expect(res.statutory_compliance_status).toBe('VERIFIED_STATUTORY_CALCULATION');
      expect(res.code_on_wages).toBeDefined();
      expect(res.code_on_wages?.is_compliant).toBe(false);
      expect(res.code_on_wages?.excess_excluded_allowances).toBe(3000);
      expect(res.code_on_wages?.deemed_wage_addition).toBe(3000);
      expect(res.code_on_wages?.adjusted_statutory_wage_base).toBe(10000); // 50% of 20,000
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STATUTORY COMPLIANCE CAPS & AUDIT FLAGS
  // ──────────────────────────────────────────────────────────────────────────
  describe('Compliance Caps & Limits (Quarterly Cap & Daily Spreadover)', () => {
    it('flags quarterly cap violation when OT hours exceed statutory limit (120h > 115h)', () => {
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 120, // Exceeds 115 hrs limit
        monthly_salary_basis: 17000,
        policy_override: {
          statutory_quarterly_ot_limit: 115,
        },
      });

      expect(res.compliance_audit.is_quarterly_cap_compliant).toBe(false);
      expect(res.compliance_audit.observed_quarterly_ot_hours).toBe(120);
    });

    it('validates daily spreadover compliance (8h shift + 2h OT = 10h <= 10.5h)', () => {
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 2,
        monthly_salary_basis: 17000,
        policy_override: {
          working_hours_per_day: 8,
          statutory_spreadover_hours_limit: 10.5,
        },
      });

      expect(res.compliance_audit.is_daily_spread_compliant).toBe(true);
      expect(res.compliance_audit.observed_daily_spread_hours).toBe(10);
    });

    it('labels non-standard / custom policies as CONFIGURED_REFERENCE', () => {
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 15,
        monthly_salary_basis: 17000,
        policy_override: {
          statutory_standard_preset: 'CUSTOM_STATUTORY',
        },
      });

      expect(res.statutory_compliance_status).toBe('CONFIGURED_REFERENCE');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DIFFERENT WORKING DAY DIVISORS & ZERO/NEGATIVE INPUT SAFEGUARDS
  // ──────────────────────────────────────────────────────────────────────────
  describe('Working Day Divisors & Mathematical Resilience', () => {
    it('calculates rates correctly with 30-day fixed calendar divisor', () => {
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 20,
        monthly_salary_basis: 15000,
        policy_override: {
          working_days_divisor: 30,
          working_hours_per_day: 8,
          company_multiplier: 1.5,
        },
      });

      // 15,000 / 30 = ₹500/day
      // 500 / 8 = ₹62.50/hr
      // 62.50 × 1.5 = ₹93.75/hr
      // 20 × 93.75 = ₹1,875.00
      expect(res.formula_a_daily_wage_rate).toBe(500.00);
      expect(res.formula_b_base_hourly_rate).toBe(62.50);
      expect(res.formula_c_company_ot_hourly_rate).toBe(93.75);
      expect(res.formula_d_company_ot_amount).toBe(1875.00);
    });

    it('safely clamps negative wage or zero OT hours without errors', () => {
      const res = OTPolicyEngine.calculateDedicated({
        actual_ot_hours: 0,
        monthly_salary_basis: 17000,
      });

      expect(res.actual_ot_hours).toBe(0);
      expect(res.company_ot_amount).toBe(0);
      expect(res.formula_d_company_ot_amount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CONNECTED VENDOR BILLING ENGINE & INVOICE SNAPSHOT INTEGRATION
  // ──────────────────────────────────────────────────────────────────────────
  describe('Integration with VendorManpowerBillingEngine', () => {
    it('applies configured otMultiplier (1.5x) in employee payroll calculation', () => {
      const employeeResult = VendorManpowerBillingEngine.calculateEmployeePayroll(
        {
          employeeId: 'EMP-001',
          employeeCode: 'WRK-001',
          employeeName: 'Ramesh Kumar',
          dailyWages: 653.85,
          payDays: 26,
          otHours: 30,
        },
        {
          otMultiplier: 1.5,
          otWorkingHoursPerDay: 8,
        }
      );

      // Hourly rate: 653.85 / 8 = 81.73125
      // OT rate: 81.73125 × 1.5 = 122.596875
      // 30 hrs OT: 122.596875 × 30 = 3,677.906 -> Math.round -> ₹3,678
      expect(employeeResult.regularWages).toBe(17000); // 653.85 * 26 = 17,000.1 -> 17,000
      expect(employeeResult.otStipend).toBe(3678);
      expect(employeeResult.grossWages).toBe(20678); // 17,000 + 3,678
    });

    it('preserves immutable otPolicySnapshot on billing breakup result', () => {
      const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(
        [
          {
            employeeId: 'EMP-001',
            employeeCode: 'WRK-001',
            employeeName: 'Ramesh Kumar',
            dailyWages: 653.85,
            payDays: 26,
            otHours: 30,
          },
        ],
        {
          otMultiplier: 1.5,
          otPolicySnapshot: {
            policyId: 'pol-standard-company',
            policyName: 'Standard Company Overtime Policy',
            version: 'v2026.08',
            multiplier: 1.5,
            statutoryMultiplier: 2.0,
            statutoryFramework: 'FACTORIES_ACT_1948',
            workingDaysDivisor: 26,
          },
        }
      );

      expect(breakup.otPolicySnapshot).toBeDefined();
      expect(breakup.otPolicySnapshot?.policyName).toBe('Standard Company Overtime Policy');
      expect(breakup.otPolicySnapshot?.multiplier).toBe(1.5);
      expect(breakup.otPolicySnapshot?.statutoryMultiplier).toBe(2.0);
    });
  });
});
