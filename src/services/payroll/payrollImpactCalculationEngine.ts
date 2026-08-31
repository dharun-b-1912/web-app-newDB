import { PeriodAttendanceMetrics } from '../attendance/attendanceCalculationService';
import { payrollCalculationEngine } from './payrollCalculationEngine';
import { StatutoryRuleEngine } from './statutoryRuleEngine';
import { payrollApi } from '../payrollApi';

export interface PayrollImpactCalculationParams {
  annualCtc: number;
  monthlyCtc: number;
  metrics: PeriodAttendanceMetrics;
  otMultiplier?: number; // default 1.5x
  structureCode?: string;
  pfApplicable?: boolean;
  esiApplicable?: boolean;
  ptApplicable?: boolean;
}

export interface PayrollImpactResult {
  annualCtc: number;
  monthlyCtc: number;
  baseGrossEarnings: number;
  
  dailyWageRate: number;
  hourlyOtRate: number;
  
  scheduledDays: number;
  paidDays: number;
  lopDays: number;
  lopDeductionAmount: number;
  
  approvedOtMinutes: number;
  approvedOtHoursFormatted: string;
  otEarnings: number;
  
  netAttendanceAdjustment: number;
  effectiveGrossEarnings: number;
  
  basicEarned: number;
  hraEarned: number;
  specialEarned: number;
  
  epfEmployee: number;
  esicEmployee: number;
  professionalTax: number;
  estimatedTds: number;
  totalEmployeeDeductions: number;
  
  epfEmployer: number;
  esicEmployer: number;
  totalEmployerContributions: number;
  netTakeHomePay: number;
}

class PayrollImpactCalculationEngine {
  /**
   * Calculate precise attendance impact on monthly payroll
   */
  calculateImpact(params: PayrollImpactCalculationParams): PayrollImpactResult {
    const {
      annualCtc,
      monthlyCtc,
      metrics,
      otMultiplier = 1.5,
      structureCode = 'CORP_STD_01',
      pfApplicable = true,
      esiApplicable = true,
      ptApplicable = true,
    } = params;

    // Use canonical central calculation engine for base wage breakdown
    const baseBreakdown = payrollCalculationEngine.calculateBreakdown({
      annualCtc,
      monthlyCtc,
      structureCode,
      pfApplicable,
      esiApplicable,
      ptApplicable,
    });

    const baseGross = baseBreakdown.monthlyGrossEarnings;
    const totalCalendarDays = Math.max(1, metrics.totalCalendarDays || 31);
    
    // Daily Wage Rate: Base Gross / Calendar Days in Period
    const dailyWageRate = Math.round((baseGross / totalCalendarDays) * 100) / 100;
    
    // Standard Hourly OT Rate: (Daily Rate / 8 standard hours) * Multiplier
    const hourlyOtRate = Math.round(((dailyWageRate / 8.0) * otMultiplier) * 100) / 100;
    
    // LOP Calculation
    const lopDays = metrics.lopDays || 0;
    const lopDeductionAmount = Math.round(lopDays * dailyWageRate);
    
    // OT Calculation
    const approvedOtMinutes = metrics.approvedOvertimeMinutes || 0;
    const approvedOtHours = approvedOtMinutes / 60.0;
    const otEarnings = Math.round(approvedOtHours * hourlyOtRate);
    
    // Net Attendance Adjustment & Effective Gross
    const netAttendanceAdjustment = otEarnings - lopDeductionAmount;
    const effectiveGrossEarnings = Math.max(0, baseGross + netAttendanceAdjustment);

    // Wage Component Split after Attendance Adjustment
    const basicEarned = Math.round(effectiveGrossEarnings * 0.5);
    const hraEarned = Math.round(basicEarned * 0.4);
    const specialEarned = Math.max(0, effectiveGrossEarnings - basicEarned - hraEarned);

    // Fetch active tenant statutory rules
    const statutoryConfig = payrollApi.getStatutoryConfig();

    // Evaluate exact statutory withholdings on earned wage
    const pfEval = StatutoryRuleEngine.evaluatePF(basicEarned, true, pfApplicable, statutoryConfig);
    const esiEval = StatutoryRuleEngine.evaluateESI(effectiveGrossEarnings, 0, 'NEW_COVERAGE', statutoryConfig);
    const ptEval = StatutoryRuleEngine.evaluateProfessionalTax(effectiveGrossEarnings, 'Tamil Nadu', statutoryConfig);
    const tdsEval = StatutoryRuleEngine.evaluateProjectedTDS(effectiveGrossEarnings, effectiveGrossEarnings * 12, 'NEW');

    const epfEmployee = pfApplicable !== false ? pfEval.employee_contribution : 0;
    const esicEmployee = esiApplicable !== false && esiEval.is_covered ? esiEval.employee_contribution : 0;
    const professionalTax = ptApplicable !== false ? ptEval.ptAmount : 0;
    const estimatedTds = tdsEval.monthlyTdsWithholding;

    const totalEmployeeDeductions = epfEmployee + esicEmployee + professionalTax + estimatedTds;
    const netTakeHomePay = Math.max(0, effectiveGrossEarnings - totalEmployeeDeductions);

    const epfEmployer = pfApplicable !== false ? pfEval.total_employer_pf_cost : 0;
    const esicEmployer = esiApplicable !== false && esiEval.is_covered ? esiEval.employer_contribution : 0;
    const totalEmployerContributions = epfEmployer + esicEmployer;

    const otHrs = Math.floor(approvedOtMinutes / 60);
    const otMins = approvedOtMinutes % 60;
    const approvedOtHoursFormatted = `${otHrs}h ${otMins}m`;

    return {
      annualCtc,
      monthlyCtc,
      baseGrossEarnings: baseGross,
      dailyWageRate,
      hourlyOtRate,
      scheduledDays: metrics.scheduledWorkingDays,
      paidDays: metrics.presentDays + metrics.paidLeaveDays,
      lopDays,
      lopDeductionAmount,
      approvedOtMinutes,
      approvedOtHoursFormatted,
      otEarnings,
      netAttendanceAdjustment,
      effectiveGrossEarnings,
      basicEarned,
      hraEarned,
      specialEarned,
      epfEmployee,
      esicEmployee,
      professionalTax,
      estimatedTds,
      totalEmployeeDeductions,
      epfEmployer,
      esicEmployer,
      totalEmployerContributions,
      netTakeHomePay,
    };
  }
}

export const payrollImpactCalculationEngine = new PayrollImpactCalculationEngine();
