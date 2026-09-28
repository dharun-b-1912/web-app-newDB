// src/services/vendor/vendorPayrollInputService.ts
// ============================================================================
// Joy PeopleHR — Configurable Vendor Payroll Rules & Input Engine
// Evaluates versioned formula rules for earnings & deductions with calculation previews
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface VendorPayrollRule {
  id: string;
  vendorId?: string;
  organizationId?: string;
  ruleName: string;
  ruleCode: string;
  ruleType: 'EARNING' | 'DEDUCTION' | 'ALLOWANCE';
  formulaExpression: string; // e.g. "hourly_rate * ot_hours * 2.0"
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  isActive: boolean;
  roundingMode: 'NEAREST' | 'UP' | 'DOWN';
  minThreshold?: number;
  maxThreshold?: number;
  description?: string;
}

export interface WorkerPayrollInputRecord {
  id: string;
  vendorId: string;
  workerId: string;
  workerName: string;
  periodMonth: string; // YYYY-MM
  baseWages: number;
  overtimePay: number;
  nightAllowance: number;
  attendanceBonus: number;
  otherAllowances: number;
  canteenDeduction: number;
  transportDeduction: number;
  roomRentDeduction: number;
  medicalDeduction: number;
  otherDeductions: number;
  totalGross: number;
  totalDeductions: number;
  netPayable: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'LOCKED' | 'REJECTED';
}

export interface FormulaCalculationExplanation {
  ruleCode: string;
  ruleName: string;
  formula: string;
  variablesEvaluated: Record<string, number>;
  calculatedResult: number;
  explanation: string;
}

export class VendorPayrollInputService {
  /**
   * Evaluate a formula rule against worker inputs safely
   */
  public static evaluateRule(
    rule: VendorPayrollRule,
    variables: Record<string, number>
  ): FormulaCalculationExplanation {
    const expr = rule.formulaExpression;
    let evaluatedFormula = expr;
    
    // Substitute variables safely
    Object.keys(variables).forEach((key) => {
      const val = variables[key] || 0;
      evaluatedFormula = evaluatedFormula.replace(new RegExp(`\\b${key}\\b`, 'g'), val.toString());
    });

    let result = 0;
    try {
      // Safe numeric evaluation for expressions with numbers and + - * / ( )
      if (/^[0-9\.\+\-\*\/\(\)\s]+$/.test(evaluatedFormula)) {
        result = Function(`"use strict"; return (${evaluatedFormula})`)();
      }
    } catch (e) {
      console.warn(`[VendorPayrollInputService] Error evaluating formula '${expr}':`, e);
    }

    if (rule.roundingMode === 'NEAREST') {
      result = Math.round(result * 100) / 100;
    } else if (rule.roundingMode === 'UP') {
      result = Math.ceil(result * 100) / 100;
    } else if (rule.roundingMode === 'DOWN') {
      result = Math.floor(result * 100) / 100;
    }

    if (rule.minThreshold !== undefined && result < rule.minThreshold) {
      result = rule.minThreshold;
    }
    if (rule.maxThreshold !== undefined && result > rule.maxThreshold) {
      result = rule.maxThreshold;
    }

    return {
      ruleCode: rule.ruleCode,
      ruleName: rule.ruleName,
      formula: expr,
      variablesEvaluated: variables,
      calculatedResult: result,
      explanation: `${rule.ruleName}: Evaluated '${expr}' with parameters ${JSON.stringify(variables)} → Result: ${result}`,
    };
  }

  /**
   * Calculate complete worker payroll inputs for a month using configured active rules
   */
  public static calculateWorkerPayroll(
    workerId: string,
    workerName: string,
    periodMonth: string,
    params: {
      dailyWageRate: number;
      workedDays: number;
      otHours: number;
      nightShiftsCount: number;
      canteenDays: number;
      canteenRatePerDay?: number;
      transportRatePerMonth?: number;
      otherAllowances?: number;
      otherDeductions?: number;
    }
  ): WorkerPayrollInputRecord {
    const baseWages = params.dailyWageRate * params.workedDays;

    // Overtime rule formula calculation
    const hourlyRate = params.dailyWageRate / 8;
    const otRule: VendorPayrollRule = {
      id: 'rule-ot-std',
      ruleCode: 'OT_2X',
      ruleName: 'Standard Overtime Rate (2.0x)',
      ruleType: 'EARNING',
      formulaExpression: 'hourly_rate * ot_hours * 2.0',
      effectiveFrom: '2026-01-01',
      version: 1,
      isActive: true,
      roundingMode: 'NEAREST',
    };

    const otExplanation = this.evaluateRule(otRule, {
      hourly_rate: hourlyRate,
      ot_hours: params.otHours,
    });
    const overtimePay = otExplanation.calculatedResult;

    // Night Shift Allowance formula calculation
    const nightAllowance = params.nightShiftsCount * 150; // ₹150 per night shift
    const attendanceBonus = params.workedDays >= 26 ? 1000 : 0; // ₹1000 bonus for full month
    const canteenDeduction = params.canteenDays * (params.canteenRatePerDay || 40);
    const transportDeduction = params.transportRatePerMonth || 500;
    const otherAllow = params.otherAllowances || 0;
    const otherDeduct = params.otherDeductions || 0;

    const totalGross = baseWages + overtimePay + nightAllowance + attendanceBonus + otherAllow;
    const totalDeductions = canteenDeduction + transportDeduction + otherDeduct;
    const netPayable = Math.max(0, totalGross - totalDeductions);

    return {
      id: `p-in-${workerId}-${periodMonth}`,
      vendorId: (params as any).vendorId || '',
      workerId,
      workerName,
      periodMonth,
      baseWages,
      overtimePay,
      nightAllowance,
      attendanceBonus,
      otherAllowances: otherAllow,
      canteenDeduction,
      transportDeduction,
      roomRentDeduction: 0,
      medicalDeduction: 0,
      otherDeductions: otherDeduct,
      totalGross,
      totalDeductions,
      netPayable,
      status: 'SUBMITTED',
    };
  }

  /**
   * Fetch active payroll rules
   */
  public static async getPayrollRules(vendorId?: string): Promise<VendorPayrollRule[]> {
    return [
      {
        id: 'rule-ot-01',
        ruleCode: 'OT_2X',
        ruleName: 'Double Overtime Rate (2.0x)',
        ruleType: 'EARNING',
        formulaExpression: 'hourly_rate * ot_hours * 2.0',
        effectiveFrom: '2026-01-01',
        version: 1,
        isActive: true,
        roundingMode: 'NEAREST',
        description: 'Standard OT calculation formula as per Factories Act & Code on Wages',
      },
      {
        id: 'rule-night-02',
        ruleCode: 'NIGHT_ALLOWANCE',
        ruleName: 'Night Shift Allowance',
        ruleType: 'EARNING',
        formulaExpression: 'night_shifts_count * 150',
        effectiveFrom: '2026-01-01',
        version: 1,
        isActive: true,
        roundingMode: 'NEAREST',
        description: 'Fixed night shift allowance per night worked',
      },
      {
        id: 'rule-canteen-03',
        ruleCode: 'CANTEEN_DEDUCT',
        ruleName: 'Canteen Recovery',
        ruleType: 'DEDUCTION',
        formulaExpression: 'canteen_days * 40',
        effectiveFrom: '2026-01-01',
        version: 1,
        isActive: true,
        roundingMode: 'NEAREST',
        description: 'Subsidized canteen food deduction per day utilized',
      },
    ];
  }
}
