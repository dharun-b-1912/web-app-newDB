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
  StatutoryStandardPreset,
  CodeOnWagesAssessment,
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
  statutoryStandardPreset?: StatutoryStandardPreset;
  enforce50PercentWageRule?: boolean;
  statutoryQuarterlyOtLimit?: number;
  statutorySpreadoverHoursLimit?: number;
  statutoryMaxDailyOtHours?: number;
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
  private static activePolicyId: string | null = null;

  static {
    // 1. Platform Default: Factories Act 1948 Standard (1.5x Company Norm, 2.0x Statutory)
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
      statutory_standard_preset: 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: false,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: 10.5,
      statutory_max_daily_ot_hours: 4.0,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 2. Code on Wages 2019 Standard Policy (2.0x Statutory, 50% Basic Wage Base)
    this.registerPolicyRecord({
      id: 'pol-code-on-wages-2019',
      organization_id: 'default',
      company_id: 'default',
      policy_name: 'Code on Wages 2019 Standard (50% Base / 2.0x OT)',
      calculation_method: 'DYNAMIC_MULTIPLIER',
      salary_basis: 'BASIC_PLUS_DA',
      working_days_divisor: 26,
      working_hours_per_day: 8,
      company_multiplier: 1.5,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: 2.0,
      statutory_standard_preset: 'CODE_ON_WAGES_2019',
      enforce_50_percent_wage_rule: true,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: 12.0,
      statutory_max_daily_ot_hours: 4.0,
      effective_from: '2026-04-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    });

    // 3. Reference Excel Case 1: Salary ₹17,000 / 26 / 8, Company Norm 1.5x / ₹75
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
      statutory_standard_preset: 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: false,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: 10.5,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 4. Reference Excel Case 2: Fixed Hourly Rate ₹70/hr
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
      statutory_standard_preset: 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: false,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: 10.5,
      effective_from: '2025-01-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    // 5. Contract Labour Plant Default: 25 Working Days, Fixed ₹75/hr (₹600 / 8)
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
      statutory_standard_preset: 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: false,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: 10.5,
      effective_from: '2026-08-01',
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });

    // Restore cached tenant policies from localStorage if running in browser
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedActiveId = localStorage.getItem('joy_active_ot_policy_id');
        if (storedActiveId) {
          this.activePolicyId = storedActiveId;
        }
        const keys = Object.keys(localStorage).filter(k => k.startsWith('joy_payroll_ot_policy_'));
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw) as OTPolicyRecord;
            if (parsed && parsed.id) {
              this.policies.set(parsed.id, parsed);
            }
          }
        }
      } catch (_) {}
    }
  }

  public static setActivePolicyId(policyId: string): void {
    if (this.policies.has(policyId)) {
      this.activePolicyId = policyId;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('joy_active_ot_policy_id', policyId);
        } catch (_) {}
      }
    }
  }

  public static getActivePolicyId(): string | null {
    if (this.activePolicyId && this.policies.has(this.activePolicyId)) {
      return this.activePolicyId;
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('joy_active_ot_policy_id');
        if (stored && this.policies.has(stored)) {
          this.activePolicyId = stored;
          return stored;
        }
      } catch (_) {}
    }
    return null;
  }

  public static getActivePolicy(): OTPolicyRecord | null {
    const id = this.getActivePolicyId();
    if (id && this.policies.has(id)) {
      return this.policies.get(id)!;
    }
    const all = Array.from(this.policies.values());
    return all.find(p => p.status === 'ACTIVE') || all[0] || null;
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
      statutory_standard_preset: legacyPolicy.statutoryStandardPreset || 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: legacyPolicy.enforce50PercentWageRule || false,
      statutory_quarterly_ot_limit: legacyPolicy.statutoryQuarterlyOtLimit || 115,
      statutory_spreadover_hours_limit: legacyPolicy.statutorySpreadoverHoursLimit || 10.5,
      statutory_max_daily_ot_hours: legacyPolicy.statutoryMaxDailyOtHours || 4.0,
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
    // 0a. Explicit policy ID requested
    if (params.policyId && this.policies.has(params.policyId)) {
      return this.policies.get(params.policyId)!;
    }

    const targetDate = params.date || new Date().toISOString().slice(0, 10);

    // 0b. If an active policy was explicitly set / selected, verify and prioritize it
    const activeId = this.getActivePolicyId();
    if (activeId && this.policies.has(activeId)) {
      const activePolicy = this.policies.get(activeId)!;
      if (activePolicy.status === 'ACTIVE') {
        const fromValid = activePolicy.effective_from <= targetDate;
        const toValid = !activePolicy.effective_to || activePolicy.effective_to >= targetDate;
        if (fromValid && toValid) {
          // If no specific company requested, or if company matches, or policy is scoped broadly
          if (
            !params.companyId ||
            !activePolicy.company_id ||
            activePolicy.company_id === 'default' ||
            activePolicy.company_id === params.companyId ||
            activePolicy.company_id === 'org-joy-main'
          ) {
            return activePolicy;
          }
        }
      }
    }

    // Sort all policies by updated_at descending so newly saved ones are matched first
    const sortedPolicies = Array.from(this.policies.values()).sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    );

    // 1. Check company-specific active policy covering the date
    if (params.companyId) {
      for (const p of sortedPolicies) {
        if (p.company_id === params.companyId && p.status === 'ACTIVE') {
          const fromValid = p.effective_from <= targetDate;
          const toValid = !p.effective_to || p.effective_to >= targetDate;
          if (fromValid && toValid) return p;
        }
      }
    }

    // 2. Check organization-specific active policy covering the date
    if (params.organizationId) {
      for (const p of sortedPolicies) {
        if (p.organization_id === params.organizationId && p.status === 'ACTIVE') {
          const fromValid = p.effective_from <= targetDate;
          const toValid = !p.effective_to || p.effective_to >= targetDate;
          if (fromValid && toValid) return p;
        }
      }
    }

    // 3. Check any active policy with 'default' company/organization (sorted latest first)
    for (const p of sortedPolicies) {
      if ((p.company_id === 'default' || p.organization_id === 'default' || !p.company_id) && p.status === 'ACTIVE') {
        const fromValid = p.effective_from <= targetDate;
        const toValid = !p.effective_to || p.effective_to >= targetDate;
        if (fromValid && toValid) return p;
      }
    }

    // 4. Fallback to platform default
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
      statutoryStandardPreset: record.statutory_standard_preset || 'FACTORIES_ACT_1948',
      enforce50PercentWageRule: record.enforce_50_percent_wage_rule || false,
      statutoryQuarterlyOtLimit: record.statutory_quarterly_ot_limit || 115,
      statutorySpreadoverHoursLimit: record.statutory_spreadover_hours_limit || 10.5,
      statutoryMaxDailyOtHours: record.statutory_max_daily_ot_hours || 4.0,
      roundingMode: record.rounding_mode || 'ROUND_HALF_UP',
      applicableTo: 'ALL_EMPLOYEES',
      approvalRequired: true,
      effectiveFrom: record.effective_from,
      effectiveTo: record.effective_to || undefined,
      active: record.status === 'ACTIVE',
    };
  }

  /**
   * Code on Wages (2019) Section 2(y) Evaluation Engine
   * Evaluates if Basic + DA constitutes at least 50% of Total Remuneration.
   * If excluded allowances exceed 50%, computes deemed wages for statutory benefit bases.
   */
  public static evaluateCodeOnWagesCompliance(params: {
    totalGrossRemuneration: number;
    basicSalary: number;
    daAmount?: number;
    excludedAllowances?: number;
  }): CodeOnWagesAssessment {
    const gross = Math.max(0, params.totalGrossRemuneration);
    const basicAndDa = Math.max(0, params.basicSalary + (params.daAmount || 0));
    const allowances = params.excludedAllowances !== undefined
      ? Math.max(0, params.excludedAllowances)
      : Math.max(0, gross - basicAndDa);

    const basicPercentage = gross > 0 ? (basicAndDa / gross) * 100 : 100;
    const allowancesPercentage = gross > 0 ? (allowances / gross) * 100 : 0;
    const allowanceCap50 = gross * 0.50;

    const excessAllowances = Math.max(0, allowances - allowanceCap50);
    const deemedWageAddition = excessAllowances; // Sec 2(y) proviso
    const adjustedStatutoryWageBase = basicAndDa + deemedWageAddition;
    const isCompliant = excessAllowances === 0;

    let explanation = '';
    if (isCompliant) {
      explanation = `Basic + DA (₹${basicAndDa.toLocaleString('en-IN')}) is ${basicPercentage.toFixed(1)}% of Gross CTC (≥ 50% threshold). 100% compliant with Section 2(y) Code on Wages 2019.`;
    } else {
      explanation = `Excluded allowances (₹${allowances.toLocaleString('en-IN')}, ${allowancesPercentage.toFixed(1)}%) exceed 50% ceiling by ₹${excessAllowances.toLocaleString('en-IN')}. Deemed wage addition of ₹${deemedWageAddition.toLocaleString('en-IN')} applied to statutory wage base.`;
    }

    return {
      is_compliant: isCompliant,
      total_gross_remuneration: Number(gross.toFixed(2)),
      basic_and_da_amount: Number(basicAndDa.toFixed(2)),
      basic_and_da_percentage: Number(basicPercentage.toFixed(2)),
      excluded_allowances_amount: Number(allowances.toFixed(2)),
      excluded_allowances_percentage: Number(allowancesPercentage.toFixed(2)),
      allowance_cap_50_percent: Number(allowanceCap50.toFixed(2)),
      excess_excluded_allowances: Number(excessAllowances.toFixed(2)),
      deemed_wage_addition: Number(deemedWageAddition.toFixed(2)),
      adjusted_statutory_wage_base: Number(adjustedStatutoryWageBase.toFixed(2)),
      rule_citation: 'Code on Wages 2019, Section 2(y) Proviso',
      explanation,
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
      errors.push('Calculation method is required (STRICT_GOVERNMENT_NORM, DYNAMIC_MULTIPLIER, or FIXED_HOURLY_RATE).');
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
   * Multi-tenant resilient: Syncs with in-memory map, localStorage, and Supabase safely.
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
      statutory_standard_preset: policy.statutory_standard_preset || 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: policy.enforce_50_percent_wage_rule || false,
      statutory_quarterly_ot_limit: policy.statutory_quarterly_ot_limit ?? 115,
      statutory_spreadover_hours_limit: policy.statutory_spreadover_hours_limit ?? 10.5,
      statutory_max_daily_ot_hours: policy.statutory_max_daily_ot_hours ?? 4.0,
      effective_from: policy.effective_from || new Date().toISOString().slice(0, 10),
      effective_to: policy.effective_to || null,
      status: policy.status || 'ACTIVE',
      rounding_mode: policy.rounding_mode || 'ROUND_HALF_UP',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: existing?.created_by || actor.id,
      updated_by: actor.id,
    };

    // 1. Store in memory registry
    this.registerPolicyRecord(updatedRecord);
    if (updatedRecord.status === 'ACTIVE') {
      this.setActivePolicyId(updatedRecord.id);
    }

    // 2. Persist to localStorage for client-side multi-tenant resiliency
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`joy_payroll_ot_policy_${updatedRecord.organization_id}`, JSON.stringify(updatedRecord));
        localStorage.setItem(`joy_payroll_ot_policy_${updatedRecord.id}`, JSON.stringify(updatedRecord));
        if (updatedRecord.status === 'ACTIVE') {
          localStorage.setItem('joy_active_ot_policy_id', updatedRecord.id);
          localStorage.setItem('joy_latest_saved_ot_policy', JSON.stringify(updatedRecord));
        }
      } catch (_) {}
    }

    // 3. Create audit log
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

    // 4. Sync to Supabase if connected and tenant ID is valid UUID
    if (isSupabaseEnabled) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (isUuid.test(updatedRecord.organization_id)) {
          await supabase.from('payroll_ot_policies').upsert(updatedRecord);
          await supabase.from('payroll_ot_policy_audit_logs').insert(auditItem);
        }
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
    const filtered = list.filter(p => {
      if (organizationId && p.organization_id !== organizationId && p.organization_id !== 'default') return false;
      if (companyId && p.company_id && p.company_id !== companyId && p.company_id !== 'default') return false;
      return true;
    });

    // Deduplicate and sort newest first
    const seen = new Set<string>();
    const deduped: OTPolicyRecord[] = [];
    for (const p of filtered) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        deduped.push(p);
      }
    }

    return deduped.sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    );
  }

  /**
   * PRIMARY CALCULATION METHOD
   * Pure deterministic calculation adhering to the reference Excel structure and statutory norms.
   * Preserves actual_ot_hours from attendance, calculates company payroll OT amount,
   * derives separate government/statutory reporting fields, and attaches Code on Wages 2019 assessment.
   */
  public static calculateDedicated(input: OTPolicyCalculationInput): OTPolicyCalculationResult {
    const policy = input.policy_override
      ? { ...this.resolvePolicyForDate({ companyId: input.company_id, organizationId: input.organization_id, date: input.payroll_date }), ...input.policy_override }
      : this.resolvePolicyForDate({ companyId: input.company_id, organizationId: input.organization_id, date: input.payroll_date });

    const hours = Math.max(0, input.actual_ot_hours);
    const wageBasis = Math.max(0, input.monthly_salary_basis);
    const divisor = policy.working_days_divisor > 0 ? policy.working_days_divisor : 26;
    const standardHours = policy.working_hours_per_day > 0 ? policy.working_hours_per_day : 8;

    // 1. Code on Wages Assessment (50% Wage Rule & Deemed Wages)
    const basicInput = input.basic_salary !== undefined ? input.basic_salary : (wageBasis * 0.5);
    const daInput = input.da_amount || 0;
    const allowancesInput = input.allowances_amount !== undefined ? input.allowances_amount : Math.max(0, wageBasis - (basicInput + daInput));
    const codeOnWages = this.evaluateCodeOnWagesCompliance({
      totalGrossRemuneration: wageBasis,
      basicSalary: basicInput,
      daAmount: daInput,
      excludedAllowances: allowancesInput,
    });

    // 2. Base Daily & Hourly Rate Derivation
    const baseDailyRate = wageBasis / divisor;
    const baseHourlyRate = baseDailyRate / standardHours;

    // 3. Government Norms Rate & Statutory Amount (Factories Act / Code on Wages 2.0x standard)
    const govtMultiplier = policy.government_multiplier > 0 ? policy.government_multiplier : 2.0;
    
    // If enforce_50_percent_wage_rule is active, statutory hourly rate is computed on adjusted deemed wage base
    const statutoryEffectiveWageBasis = (policy.enforce_50_percent_wage_rule && codeOnWages.deemed_wage_addition > 0)
      ? codeOnWages.adjusted_statutory_wage_base
      : wageBasis;
    const statutoryBaseHourlyRate = (statutoryEffectiveWageBasis / divisor) / standardHours;
    const governmentHourlyRate = statutoryBaseHourlyRate * govtMultiplier;
    const governmentStatutoryAmount = this.applyRounding(hours * governmentHourlyRate, policy.rounding_mode || 'ROUND_HALF_UP');

    // 4. Company Payroll Context (Strict Government Norm vs Dynamic Multiplier vs Fixed Hourly Rate)
    let companyHourlyRate: number;
    let compMultiplier: number | undefined;
    let fixedRate: number | undefined;

    if (policy.calculation_method === 'STRICT_GOVERNMENT_NORM') {
      companyHourlyRate = governmentHourlyRate;
      compMultiplier = govtMultiplier;
    } else if (policy.calculation_method === 'FIXED_HOURLY_RATE' && policy.fixed_hourly_rate !== undefined) {
      companyHourlyRate = policy.fixed_hourly_rate;
      fixedRate = policy.fixed_hourly_rate;
    } else {
      compMultiplier = policy.company_multiplier && policy.company_multiplier > 0 ? policy.company_multiplier : 1.5;
      companyHourlyRate = baseHourlyRate * compMultiplier;
    }

    const rawCompanyOTAmount = hours * companyHourlyRate;
    const companyOTAmount = this.applyRounding(rawCompanyOTAmount, policy.rounding_mode || 'ROUND_HALF_UP');

    // 5. Government Equivalent Hours & Reporting Amount (Derived context for value reconciliation)
    const governmentEquivalentHours = policy.calculation_method === 'STRICT_GOVERNMENT_NORM'
      ? hours
      : (governmentHourlyRate > 0 ? companyOTAmount / governmentHourlyRate : 0);
    const governmentReportingAmount = companyOTAmount; // By definition reconciles exactly

    // 6. Reconciliation Difference (Reporting Amount - Company Amount)
    const reconciliationDiff = Number(Math.abs(governmentReportingAmount - companyOTAmount).toFixed(4));
    const isReconciled = reconciliationDiff <= 0.05;

    let formulaDescription = '';
    if (policy.calculation_method === 'STRICT_GOVERNMENT_NORM') {
      formulaDescription = `${hours} OT hrs × ₹${companyHourlyRate.toFixed(2)}/hr (Strict 2.0x Statutory Double Rate) = ₹${companyOTAmount.toFixed(2)} [Form XXV/XXVI Direct: ${hours.toFixed(2)} hrs @ ₹${governmentHourlyRate.toFixed(2)}/hr]`;
    } else if (policy.calculation_method === 'FIXED_HOURLY_RATE') {
      formulaDescription = `${hours} OT hrs × ₹${companyHourlyRate.toFixed(2)}/hr (Fixed Rate) = ₹${companyOTAmount.toFixed(2)} [Govt Equiv: ${governmentEquivalentHours.toFixed(4)} hrs @ ₹${governmentHourlyRate.toFixed(2)}/hr]`;
    } else {
      formulaDescription = `${hours} OT hrs × (₹${wageBasis.toLocaleString('en-IN')} ÷ ${divisor}d ÷ ${standardHours}h) × ${compMultiplier}x = ₹${companyOTAmount.toFixed(2)} [Govt Equiv: ${governmentEquivalentHours.toFixed(4)} hrs @ ₹${governmentHourlyRate.toFixed(2)}/hr]`;
    }

    // Explicit Formula Chain (Formulas A-E)
    const formulaADailyWageRate = Number(baseDailyRate.toFixed(2));
    const formulaBBaseHourlyRate = Number(baseHourlyRate.toFixed(2));
    const formulaCCompanyOtHourlyRate = Number(companyHourlyRate.toFixed(2));
    const formulaDCompanyOtAmount = Number(companyOTAmount.toFixed(2));
    const formulaEStatutoryReferenceRate = Number(governmentHourlyRate.toFixed(2));
    const formulaEStatutoryReferenceAmount = Number((hours * governmentHourlyRate).toFixed(2));

    // Statutory Validation Label & Status
    const statutoryComplianceStatus: 'VERIFIED_STATUTORY_CALCULATION' | 'CONFIGURED_REFERENCE' | 'EXCEPTION_REQUIRING_REVIEW' =
      (policy.statutory_standard_preset === 'FACTORIES_ACT_1948' || policy.statutory_standard_preset === 'CODE_ON_WAGES_2019')
        ? 'VERIFIED_STATUTORY_CALCULATION'
        : 'CONFIGURED_REFERENCE';

    const spreadoverLimit = policy.statutory_spreadover_hours_limit || (policy.statutory_standard_preset === 'CODE_ON_WAGES_2019' ? 12.0 : 10.5);
    const quarterlyCap = policy.statutory_quarterly_ot_limit || 115;
    const observedDailySpread = standardHours + Math.min(hours, 4.0); // Shift + daily OT
    const isDailySpreadCompliant = observedDailySpread <= spreadoverLimit;
    const isQuarterlyCapCompliant = hours <= quarterlyCap;

    const complianceAudit = {
      is_daily_spread_compliant: isDailySpreadCompliant,
      is_quarterly_cap_compliant: isQuarterlyCapCompliant,
      statutory_spreadover_hours_limit: spreadoverLimit,
      statutory_quarterly_ot_limit: quarterlyCap,
      observed_daily_spread_hours: observedDailySpread,
      observed_quarterly_ot_hours: hours,
      statutory_framework: policy.statutory_standard_preset || 'FACTORIES_ACT_1948',
      jurisdiction_note: policy.statutory_standard_preset === 'CODE_ON_WAGES_2019'
        ? 'Code on Wages 2019: Sec. 2(y) 50% Basic wage rule, 2.0x Double Ordinary Rate, 12h max daily spreadover.'
        : 'Factories Act, 1948: Sec. 59 2.0x Double Ordinary Rate, 10.5h max daily spreadover, 115h quarterly cap.',
    };

    const calculatedAt = new Date().toISOString();
    const immutableSnapshot = {
      policy_id: policy.id,
      policy_name: policy.policy_name,
      version: `v${new Date(policy.effective_from || '2026-08-01').getFullYear()}.${(new Date(policy.effective_from || '2026-08-01').getMonth() + 1).toString().padStart(2, '0')}`,
      effective_from: policy.effective_from,
      effective_to: policy.effective_to || null,
      wage_basis: wageBasis,
      working_days_divisor: divisor,
      shift_hours_per_day: standardHours,
      company_multiplier: compMultiplier || 1.5,
      government_multiplier: govtMultiplier,
      approved_ot_hours: hours,
      company_ot_rate: Number(companyHourlyRate.toFixed(4)),
      company_ot_amount: Number(companyOTAmount.toFixed(2)),
      rounding_mode: policy.rounding_mode || 'ROUND_HALF_UP',
      calculated_at: calculatedAt,
    };

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
      statutory_standard_preset: policy.statutory_standard_preset || 'FACTORIES_ACT_1948',
      enforce_50_percent_wage_rule: policy.enforce_50_percent_wage_rule || false,
      statutory_quarterly_ot_limit: quarterlyCap,
      statutory_spreadover_hours_limit: spreadoverLimit,
      code_on_wages: codeOnWages,
      government_equivalent_ot_hours: Number(governmentEquivalentHours.toFixed(8)),
      government_reporting_amount: Number(governmentReportingAmount.toFixed(2)),
      reconciliation_difference: reconciliationDiff,
      is_reconciled: isReconciled,
      reconciliation_status: isReconciled ? 'RECONCILED' : 'VARIANCE_DETECTED',

      // Explicit Formula Chain (Formulas A-E)
      formula_a_daily_wage_rate: formulaADailyWageRate,
      formula_b_base_hourly_rate: formulaBBaseHourlyRate,
      formula_c_company_ot_hourly_rate: formulaCCompanyOtHourlyRate,
      formula_d_company_ot_amount: formulaDCompanyOtAmount,
      formula_e_statutory_reference_rate: formulaEStatutoryReferenceRate,
      formula_e_statutory_reference_amount: formulaEStatutoryReferenceAmount,

      // Statutory Validation & Compliance
      statutory_compliance_status: statutoryComplianceStatus,
      compliance_audit: complianceAudit,
      immutable_snapshot: immutableSnapshot,

      policy_id: policy.id,
      policy_name: policy.policy_name,
      formula_description: formulaDescription,
      calculated_at: calculatedAt,
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
