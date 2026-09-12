// src/services/payroll/otPolicyEngine.ts
// ============================================================================
// JOY PeopleHR — Authoritative Dedicated Overtime (OT) Engine & Policy Service
// Pure Deterministic Math • Strict Separation of Government Norms & Company Norms
// Reference: "Ot calsution for govt notms and company norms.xlsx"
// ============================================================================

import {
  OTCalculationMethod,
  OTSalaryBasis,
  OTRoundingMode,
  OTPolicyRecord,
  OTPolicyCalculationInput,
  OTPolicyCalculationResult,
  OTPolicyAuditLog,
} from '../../types/otPolicy';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export type OTCalculationBasis =
  | 'SALARY_DERIVED'   // Hourly Rate = (Wage Basis / Divisor Days) / Standard Hours Per Day
  | 'FIXED_HOURLY'     // Direct contractual hourly rate (e.g. ₹75/hr or ₹70/hr)
  | 'MULTIPLIER'       // Base Hourly Rate * Configured Multiplier
  | 'POLICY_OVERRIDE'; // Contract-specific approved formula override

export interface OTPolicy {
  policyId: string;
  tenantId: string;
  companyId?: string;
  contractId?: string;
  policyName: string;
  basis: OTCalculationBasis;
  divisorDays: number;            // e.g. 26 (standard working days), 30 (calendar/fixed), 31
  standardHoursPerDay: number;    // default 8 hours per shift
  governmentMultiplier: number;   // standard 2.0x (Factories Act 1948 / State Contract Labour Rules)
  companyMultiplier: number;      // e.g. 1.5x, 1.0x
  fixedHourlyRate?: number;       // e.g. 75, 70 (when basis is FIXED_HOURLY)
  roundingMode: OTRoundingMode;
  applicableTo: 'ALL_EMPLOYEES' | 'CONTRACT_WORKERS' | 'DAILY_WAGE' | 'STAFF';
  approvalRequired: boolean;
  effectiveFrom: string;          // YYYY-MM-DD
  effectiveTo?: string;           // YYYY-MM-DD
  active: boolean;
}

export interface OTCalculationInput {
  approvedOTHours: number;
  monthlySalaryOrWageBasis: number; // e.g. ₹17,000 or basic ₹8,400 or daily ₹600 * 26
  policyOverride?: Partial<OTPolicy>;
  tenantId?: string;
  companyId?: string;
  contractId?: string;
}

export interface OTCalculationBreakdown {
  approvedOTHours: number;
  monthlyWageBasis: number;
  divisorDays: number;
  standardHoursPerDay: number;
  baseDailyRate: number;
  baseHourlyRate: number;
  governmentMultiplier: number;
  governmentHourlyRate: number;
  companyMultiplier: number;
  companyHourlyRate: number;
  applicableRateType: 'COMPANY_NORM' | 'GOVERNMENT_NORM' | 'FIXED_HOURLY';
  effectiveHourlyRate: number;
  companyOTAmount: number;
  governmentOTAmount: number;
  actualOTAmount: number;
  equivalentGovernmentHours: number; // Actual Amount / Govt Rate (as shown in reference Excel row 8)
  roundingMode: OTRoundingMode;
  formulaDescription: string;
  policyId: string;
}

export class OTPolicyEngine {
  private static policies: Map<string, OTPolicyRecord> = new Map();
  private static auditLogs: OTPolicyAuditLog[] = [];

  static {
    // 1. Platform Default: Dynamic 1.5x Multiplier
    this.registerPolicyRecord({
      id: 'pol-default-company-1.5',
      organization_id: 'default',
      company_id: 'default',
      policy_name: 'Standard Company Norm (1.5x OT)',
      calculation_method: 'DYNAMIC_MULTIPLIER',
      salary_basis: 'MONTHLY_GROSS',
      working_days_divisor: 26,
      working_hours_per_day: 8,
      company_multiplier: 1.5,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: 2.0,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 2. Reference Excel Case 1: Salary ₹17,000 / 26 / 8, Company Norm 1.5x / ₹75
    this.registerPolicyRecord({
      id: 'pol-excel-case-1',
      organization_id: 'default',
      company_id: 'default',
      policy_name: 'Excel Case 1: Salary ₹17,000 (26d/8h)',
      calculation_method: 'DYNAMIC_MULTIPLIER',
      salary_basis: 'MONTHLY_GROSS',
      working_days_divisor: 26,
      working_hours_per_day: 8,
      company_multiplier: 1.5,
      fixed_hourly_rate: 75,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: 2.0,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 3. Reference Excel Case 2: Fixed Hourly Rate ₹70/hr
    this.registerPolicyRecord({
      id: 'pol-excel-case-2',
      organization_id: 'default',
      company_id: 'default',
      policy_name: 'Excel Case 2: Fixed Hourly ₹70/hr',
      calculation_method: 'FIXED_HOURLY_RATE',
      salary_basis: 'MONTHLY_GROSS',
      working_days_divisor: 26,
      working_hours_per_day: 8,
      fixed_hourly_rate: 70,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: 2.0,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 4. Contract Labour Plant Default: 25 Working Days, Fixed ₹75/hr (₹600 / 8)
    this.registerPolicyRecord({
      id: 'pol-21-workers-fixed-75',
      organization_id: 'default',
      company_id: 'coimbatore-plant',
      policy_name: 'Contract Labour Plant Fixed ₹75/hr (25d/8h)',
      calculation_method: 'FIXED_HOURLY_RATE',
      salary_basis: 'DAILY_WAGE_X26',
      working_days_divisor: 25,
      working_hours_per_day: 8,
      fixed_hourly_rate: 75,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: 2.0,
      effective_from: '2026-08-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });
  }

  public static registerPolicyRecord(policy: OTPolicyRecord): void {
    this.policies.set(policy.id, policy);
  }

  public static registerPolicy(legacyPolicy: OTPolicy): void {
    const record: OTPolicyRecord = {
      id: legacyPolicy.policyId,
      organization_id: legacyPolicy.tenantId,
      company_id: legacyPolicy.companyId,
      policy_name: legacyPolicy.policyName,
      calculation_method: legacyPolicy.basis === 'FIXED_HOURLY' ? 'FIXED_HOURLY_RATE' : 'DYNAMIC_MULTIPLIER',
      salary_basis: 'MONTHLY_GROSS',
      working_days_divisor: legacyPolicy.divisorDays,
      working_hours_per_day: legacyPolicy.standardHoursPerDay,
      company_multiplier: legacyPolicy.companyMultiplier,
      fixed_hourly_rate: legacyPolicy.fixedHourlyRate,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: legacyPolicy.governmentMultiplier,
      effective_from: legacyPolicy.effectiveFrom,
      effective_to: legacyPolicy.effectiveTo,
      status: legacyPolicy.active ? 'ACTIVE' : 'INACTIVE',
      rounding_mode: legacyPolicy.roundingMode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.registerPolicyRecord(record);
  }

  /**
   * Resolves the active policy for a company and payroll date using strict effective dating.
   */
  public static resolvePolicyForDate(params: {
    companyId?: string;
    organizationId?: string;
    date?: string;
    policyId?: string;
  }): OTPolicyRecord {
    if (params.policyId && this.policies.has(params.policyId)) {
      return this.policies.get(params.policyId)!;
    }

    const targetDate = params.date || new Date().toISOString().slice(0, 10);

    // 1. Check company-specific active policy covering the date
    if (params.companyId) {
      for (const p of this.policies.values()) {
        if (p.company_id === params.companyId && p.status === 'ACTIVE') {
          const fromValid = p.effective_from <= targetDate;
          const toValid = !p.effective_to || p.effective_to >= targetDate;
          if (fromValid && toValid) return p;
        }
      }
    }

    // 2. Check organization-specific active policy covering the date
    if (params.organizationId) {
      for (const p of this.policies.values()) {
        if (p.organization_id === params.organizationId && p.status === 'ACTIVE') {
          const fromValid = p.effective_from <= targetDate;
          const toValid = !p.effective_to || p.effective_to >= targetDate;
          if (fromValid && toValid) return p;
        }
      }
    }

    // 3. Fallback to platform default
    return this.policies.get('pol-default-company-1.5')!;
  }

  public static resolvePolicy(params: {
    tenantId?: string;
    companyId?: string;
    contractId?: string;
    policyId?: string;
  }): OTPolicy {
    const record = this.resolvePolicyForDate({
      companyId: params.companyId,
      organizationId: params.tenantId,
      policyId: params.policyId,
    });

    return {
      policyId: record.id,
      tenantId: record.organization_id,
      companyId: record.company_id,
      policyName: record.policy_name,
      basis: record.calculation_method === 'FIXED_HOURLY_RATE' ? 'FIXED_HOURLY' : 'MULTIPLIER',
      divisorDays: record.working_days_divisor,
      standardHoursPerDay: record.working_hours_per_day,
      governmentMultiplier: record.government_multiplier,
      companyMultiplier: record.company_multiplier || 1.5,
      fixedHourlyRate: record.fixed_hourly_rate,
      roundingMode: record.rounding_mode || 'ROUND_HALF_UP',
      applicableTo: 'ALL_EMPLOYEES',
      approvalRequired: true,
      effectiveFrom: record.effective_from,
      effectiveTo: record.effective_to || undefined,
      active: record.status === 'ACTIVE',
    };
  }

  /**
   * Comprehensive validation before persisting an OT Policy configuration
   */
  public static validatePolicy(policy: Partial<OTPolicyRecord>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.policy_name || policy.policy_name.trim().length === 0) {
      errors.push('Policy name is required.');
    }

    if (!policy.calculation_method) {
      errors.push('Calculation method is required (DYNAMIC_MULTIPLIER or FIXED_HOURLY_RATE).');
    }

    const divisor = policy.working_days_divisor ?? 26;
    if (divisor <= 0) {
      errors.push('Working days divisor must be greater than 0.');
    }

    const hours = policy.working_hours_per_day ?? 8;
    if (hours <= 0) {
      errors.push('Working hours per day must be greater than 0.');
    }

    if (policy.calculation_method === 'DYNAMIC_MULTIPLIER') {
      const multiplier = policy.company_multiplier;
      if (multiplier === undefined || multiplier === null || multiplier <= 0) {
        errors.push('A valid positive multiplier is required for Dynamic Multiplier mode (e.g. 1.25, 1.50, 2.00).');
      }
    } else if (policy.calculation_method === 'FIXED_HOURLY_RATE') {
      const rate = policy.fixed_hourly_rate;
      if (rate === undefined || rate === null || rate < 0) {
        errors.push('A valid non-negative hourly rate is required for Fixed Hourly Rate mode.');
      }
    }

    const govtMultiplier = policy.government_multiplier ?? 2.0;
    if (govtMultiplier <= 0) {
      errors.push('Government multiplier must be greater than 0 (standard 2.0x).');
    }

    if (policy.effective_from && policy.effective_to) {
      if (policy.effective_to < policy.effective_from) {
        errors.push('Effective To date cannot be earlier than Effective From date.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Saves or updates an OT Policy record and writes an auditable log entry.
   */
  public static async savePolicy(
    policy: Omit<OTPolicyRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string },
    actor = { id: 'admin', name: 'Payroll Admin' },
    reason?: string
  ): Promise<{ success: boolean; policy?: OTPolicyRecord; errors?: string[] }> {
    const validation = this.validatePolicy(policy);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const policyId = policy.id || `pol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = this.policies.get(policyId);

    const updatedRecord: OTPolicyRecord = {
      id: policyId,
      organization_id: policy.organization_id || 'default',
      company_id: policy.company_id,
      policy_name: policy.policy_name,
      calculation_method: policy.calculation_method,
      salary_basis: policy.salary_basis || 'MONTHLY_GROSS',
      working_days_divisor: policy.working_days_divisor ?? 26,
      working_hours_per_day: policy.working_hours_per_day ?? 8,
      company_multiplier: policy.calculation_method === 'DYNAMIC_MULTIPLIER' ? policy.company_multiplier : undefined,
      fixed_hourly_rate: policy.calculation_method === 'FIXED_HOURLY_RATE' ? policy.fixed_hourly_rate : undefined,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: policy.government_multiplier ?? 2.0,
      effective_from: policy.effective_from || new Date().toISOString().slice(0, 10),
      effective_to: policy.effective_to || null,
      status: policy.status || 'ACTIVE',
      rounding_mode: policy.rounding_mode || 'ROUND_HALF_UP',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: existing?.created_by || actor.id,
      updated_by: actor.id,
    };

    // Store in memory registry
    this.registerPolicyRecord(updatedRecord);

    // Create audit log
    const auditItem: OTPolicyAuditLog = {
      id: `ot-aud-${Date.now()}`,
      organization_id: updatedRecord.organization_id,
      ot_policy_id: updatedRecord.id,
      actor_id: actor.id,
      actor_name: actor.name,
      action: existing ? 'UPDATED' : 'CREATED',
      old_values: existing,
      new_values: updatedRecord,
      change_reason: reason || (existing ? 'Updated policy configuration' : 'Initial policy creation'),
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(auditItem);

    // Sync to Supabase if connected
    if (isSupabaseEnabled) {
      try {
        await supabase.from('payroll_ot_policies').upsert(updatedRecord);
        await supabase.from('payroll_ot_policy_audit_logs').insert(auditItem);
      } catch (err) {
        console.warn('[OTPolicyEngine] Supabase policy sync notice:', err);
      }
    }

    return { success: true, policy: updatedRecord };
  }

  public static getAuditLogs(policyId?: string): OTPolicyAuditLog[] {
    if (policyId) {
      return this.auditLogs.filter(a => a.ot_policy_id === policyId);
    }
    return this.auditLogs;
  }

  public static getPolicies(organizationId?: string, companyId?: string): OTPolicyRecord[] {
    const list = Array.from(this.policies.values());
    return list.filter(p => {
      if (organizationId && p.organization_id !== organizationId && p.organization_id !== 'default') return false;
      if (companyId && p.company_id && p.company_id !== companyId && p.company_id !== 'default') return false;
      return true;
    });
  }

  /**
   * PRIMARY CALCULATION METHOD
   * Pure deterministic calculation adhering to the reference Excel structure.
   * Preserves actual_ot_hours from attendance, calculates company payroll OT amount,
   * and derives separate government/statutory reporting fields.
   */
  public static calculateDedicated(input: OTPolicyCalculationInput): OTPolicyCalculationResult {
    const policy = input.policy_override
      ? { ...this.resolvePolicyForDate({ companyId: input.company_id, organizationId: input.organization_id, date: input.payroll_date }), ...input.policy_override }
      : this.resolvePolicyForDate({ companyId: input.company_id, organizationId: input.organization_id, date: input.payroll_date });

    const hours = Math.max(0, input.actual_ot_hours);
    const wageBasis = Math.max(0, input.monthly_salary_basis);
    const divisor = policy.working_days_divisor > 0 ? policy.working_days_divisor : 26;
    const standardHours = policy.working_hours_per_day > 0 ? policy.working_hours_per_day : 8;

    // 1. Base Daily & Hourly Rate Derivation
    const baseDailyRate = wageBasis / divisor;
    const baseHourlyRate = baseDailyRate / standardHours;

    // 2. Government Norms Rate & Statutory Amount (Factories Act 2.0x standard)
    const govtMultiplier = policy.government_multiplier > 0 ? policy.government_multiplier : 2.0;
    const governmentHourlyRate = baseHourlyRate * govtMultiplier;
    const governmentStatutoryAmount = this.applyRounding(hours * governmentHourlyRate, policy.rounding_mode || 'ROUND_HALF_UP');

    // 3. Company Payroll Context (Dynamic Multiplier vs Fixed Hourly Rate)
    let companyHourlyRate: number;
    let compMultiplier: number | undefined;
    let fixedRate: number | undefined;

    if (policy.calculation_method === 'FIXED_HOURLY_RATE' && policy.fixed_hourly_rate !== undefined) {
      companyHourlyRate = policy.fixed_hourly_rate;
      fixedRate = policy.fixed_hourly_rate;
    } else {
      compMultiplier = policy.company_multiplier && policy.company_multiplier > 0 ? policy.company_multiplier : 1.5;
      companyHourlyRate = baseHourlyRate * compMultiplier;
    }

    const rawCompanyOTAmount = hours * companyHourlyRate;
    const companyOTAmount = this.applyRounding(rawCompanyOTAmount, policy.rounding_mode || 'ROUND_HALF_UP');

    // 4. Government Equivalent Hours & Reporting Amount (Derived context for value reconciliation)
    const governmentEquivalentHours = governmentHourlyRate > 0
      ? companyOTAmount / governmentHourlyRate
      : 0;
    const governmentReportingAmount = companyOTAmount; // By definition reconciles exactly

    // 5. Reconciliation Difference (Reporting Amount - Company Amount)
    const reconciliationDiff = Number(Math.abs(governmentReportingAmount - companyOTAmount).toFixed(4));
    const isReconciled = reconciliationDiff <= 0.05;

    const formulaDescription = policy.calculation_method === 'FIXED_HOURLY_RATE'
      ? `${hours} OT hrs × ₹${companyHourlyRate.toFixed(2)}/hr (Fixed Rate) = ₹${companyOTAmount.toFixed(2)} [Govt Equiv: ${governmentEquivalentHours.toFixed(4)} hrs @ ₹${governmentHourlyRate.toFixed(2)}/hr]`
      : `${hours} OT hrs × (₹${wageBasis.toLocaleString('en-IN')} ÷ ${divisor}d ÷ ${standardHours}h) × ${compMultiplier}x = ₹${companyOTAmount.toFixed(2)} [Govt Equiv: ${governmentEquivalentHours.toFixed(4)} hrs @ ₹${governmentHourlyRate.toFixed(2)}/hr]`;

    return {
      actual_ot_hours: hours,
      monthly_salary_basis: wageBasis,
      working_days_divisor: divisor,
      working_hours_per_day: standardHours,
      base_daily_rate: Number(baseDailyRate.toFixed(4)),
      base_hourly_rate: Number(baseHourlyRate.toFixed(4)),
      company_calculation_method: policy.calculation_method,
      company_multiplier: compMultiplier,
      company_fixed_hourly_rate: fixedRate,
      company_ot_rate: Number(companyHourlyRate.toFixed(4)),
      company_ot_amount: Number(companyOTAmount.toFixed(2)),
      government_multiplier: govtMultiplier,
      government_ot_rate: Number(governmentHourlyRate.toFixed(4)),
      government_statutory_amount: Number(governmentStatutoryAmount.toFixed(2)),
      government_equivalent_ot_hours: Number(governmentEquivalentHours.toFixed(8)),
      government_reporting_amount: Number(governmentReportingAmount.toFixed(2)),
      reconciliation_difference: reconciliationDiff,
      is_reconciled: isReconciled,
      reconciliation_status: isReconciled ? 'RECONCILED' : 'VARIANCE_DETECTED',
      policy_id: policy.id,
      policy_name: policy.policy_name,
      formula_description: formulaDescription,
      calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Legacy compatibility wrapper for existing tests and call sites
   */
  public static calculate(input: OTCalculationInput): OTCalculationBreakdown {
    const res = this.calculateDedicated({
      actual_ot_hours: input.approvedOTHours,
      monthly_salary_basis: input.monthlySalaryOrWageBasis,
      company_id: input.companyId,
      organization_id: input.tenantId,
      policy_override: input.policyOverride ? {
        calculation_method: input.policyOverride.basis === 'FIXED_HOURLY' ? 'FIXED_HOURLY_RATE' : 'DYNAMIC_MULTIPLIER',
        working_days_divisor: input.policyOverride.divisorDays,
        working_hours_per_day: input.policyOverride.standardHoursPerDay,
        company_multiplier: input.policyOverride.companyMultiplier,
        fixed_hourly_rate: input.policyOverride.fixedHourlyRate,
        government_multiplier: input.policyOverride.governmentMultiplier,
      } : undefined,
    });

    return {
      approvedOTHours: res.actual_ot_hours,
      monthlyWageBasis: res.monthly_salary_basis,
      divisorDays: res.working_days_divisor,
      standardHoursPerDay: res.working_hours_per_day,
      baseDailyRate: res.base_daily_rate,
      baseHourlyRate: res.base_hourly_rate,
      governmentMultiplier: res.government_multiplier,
      governmentHourlyRate: res.government_ot_rate,
      companyMultiplier: res.company_multiplier || 1.5,
      companyHourlyRate: res.company_ot_rate,
      applicableRateType: res.company_calculation_method === 'FIXED_HOURLY_RATE' ? 'FIXED_HOURLY' : 'COMPANY_NORM',
      effectiveHourlyRate: Number(res.company_ot_rate.toFixed(2)),
      companyOTAmount: res.company_ot_amount,
      governmentOTAmount: res.government_statutory_amount,
      actualOTAmount: res.company_ot_amount,
      equivalentGovernmentHours: res.government_equivalent_ot_hours,
      roundingMode: 'ROUND_HALF_UP',
      formulaDescription: res.formula_description,
      policyId: res.policy_id,
    };
  }

  public static calculateOT(params: {
    actualOtHours: number;
    monthlyGrossSalary: number;
    fixedDaysInMonth?: number;
    standardShiftHours?: number;
    companyPolicy?: {
      policyType: 'FIXED_HOURLY' | 'MULTIPLIER' | 'SALARY_DERIVED';
      fixedHourlyRate?: number;
      customMultiplier?: number;
    };
  }): {
    dailyWageRate: number;
    singleHourlyRate: number;
    governmentNormsHourlyRate: number;
    companyNormsHourlyRate: number;
    actualOtEarnings: number;
    equivalentGovernmentHours: number;
  } {
    const res = this.calculate({
      approvedOTHours: params.actualOtHours,
      monthlySalaryOrWageBasis: params.monthlyGrossSalary,
      policyOverride: {
        divisorDays: params.fixedDaysInMonth || 26,
        standardHoursPerDay: params.standardShiftHours || 8,
        basis: params.companyPolicy?.policyType === 'FIXED_HOURLY' ? 'FIXED_HOURLY' : 'MULTIPLIER',
        fixedHourlyRate: params.companyPolicy?.fixedHourlyRate,
        companyMultiplier: params.companyPolicy?.customMultiplier || 1.5,
      },
    });

    return {
      dailyWageRate: res.baseDailyRate,
      singleHourlyRate: res.baseHourlyRate,
      governmentNormsHourlyRate: res.governmentHourlyRate,
      companyNormsHourlyRate: res.companyHourlyRate,
      actualOtEarnings: res.actualOTAmount,
      equivalentGovernmentHours: res.equivalentGovernmentHours,
    };
  }

  private static applyRounding(val: number, mode: OTRoundingMode): number {
    switch (mode) {
      case 'ROUND_UP':
        return Math.ceil(val);
      case 'ROUND_DOWN':
        return Math.floor(val);
      case 'EXACT':
        return Number(val.toFixed(2));
      case 'ROUND_HALF_UP':
      default:
        // In payroll earnings, wage components maintain paise precision (2 decimal places)
        return Number((Math.round((val + Number.EPSILON) * 100) / 100).toFixed(2));
    }
  }
}
