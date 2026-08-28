import { PeriodAttendanceMetrics } from '../attendance/attendanceCalculationService';
import { payrollCalculationEngine } from './payrollCalculationEngine';

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
  
  totalEmployeeDeductions: number;
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
      esiApplicable = false,
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
    
    // Net Attendance Adjustment
    const netAttendanceAdjustment = otEarnings - lopDeductionAmount;
    const effectiveGrossEarnings = Math.max(0, baseGross + netAttendanceAdjustment);
    
    // Recalculate statutory deductions against adjusted gross
    const adjustedBreakdown = payrollCalculationEngine.calculateBreakdown({
      annualCtc: effectiveGrossEarnings * 12,
      monthlyCtc: effectiveGrossEarnings,
      structureCode,
      pfApplicable,
      esiApplicable,
      ptApplicable,
    });

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
      totalEmployeeDeductions: adjustedBreakdown.totalEmployeeDeductions,
      totalEmployerContributions: adjustedBreakdown.totalEmployerContributions,
      netTakeHomePay: adjustedBreakdown.netMonthlyPay,
    };
  }
}

export const payrollImpactCalculationEngine = new PayrollImpactCalculationEngine();
