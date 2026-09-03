// src/services/operations/overtimePolicyEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 4: Policy-Driven Overtime (OT) & Work Hours Engine
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface OvertimePolicy {
  id?: string;
  organization_id: string;
  policy_name: string;
  ot_starts_after_hours: number; // e.g. 9.0
  calculation_method: 'HOURLY_MULTIPLIER' | 'FIXED_PER_HOUR' | 'FIXED_PER_SHIFT' | 'VENDOR_DEFINED';
  weekday_multiplier: number; // e.g. 1.5
  weekday_fixed_rate: number; // e.g. 150
  sunday_action: 'OT_ONLY' | 'COMP_OFF_ONLY' | 'OT_AND_COMP_OFF' | 'REGULAR_PAY';
  sunday_multiplier: number; // e.g. 2.0
  sunday_fixed_rate: number; // e.g. 250
  holiday_action: 'OT_ONLY' | 'COMP_OFF_ONLY' | 'OT_AND_COMP_OFF' | 'REGULAR_PAY';
  holiday_multiplier: number; // e.g. 2.0
  holiday_fixed_rate: number; // e.g. 300
  rounding_rule: 'EXACT' | 'ROUND_DOWN' | 'ROUND_UP' | 'NEAREST_HALF_HOUR';
  ot_to_compoff_hours: number; // e.g. 8.0 hours = 1 Comp-off
  max_daily_ot_hours: number; // e.g. 4.0
  max_monthly_ot_hours: number; // e.g. 50.0
  requires_manager_approval: boolean;
  requires_hr_approval: boolean;
  is_default: boolean;
}

export interface OvertimeCalculationInput {
  workedHours: number;
  hourlyRate: number;
  isSunday?: boolean;
  isHoliday?: boolean;
  policy: OvertimePolicy;
  vendorCustomRate?: number;
}

export interface OvertimeCalculationResult {
  eligibleOtHours: number;
  roundedOtHours: number;
  otPayAmount: number;
  compOffDaysEarned: number;
  applicableRateType: string;
  requiresApproval: boolean;
}

class OvertimePolicyEngine {
  /**
   * Calculates overtime hours, pay, and comp-off credits according to organizational policies
   */
  calculateOvertime(input: OvertimeCalculationInput): OvertimeCalculationResult {
    const { policy, workedHours, hourlyRate, isSunday, isHoliday, vendorCustomRate } = input;

    // 1. Determine raw eligible OT hours
    let rawOt = 0;
    if (isSunday || isHoliday) {
      rawOt = workedHours; // On Sundays/Holidays, entire shift duration is OT or special work
    } else {
      rawOt = Math.max(0, workedHours - policy.ot_starts_after_hours);
    }

    // Cap daily OT
    rawOt = Math.min(rawOt, policy.max_daily_ot_hours || 4.0);

    // 2. Apply Rounding Rule
    let roundedOt = rawOt;
    if (policy.rounding_rule === 'NEAREST_HALF_HOUR') {
      roundedOt = Math.round(rawOt * 2) / 2;
    } else if (policy.rounding_rule === 'ROUND_DOWN') {
      roundedOt = Math.floor(rawOt);
    } else if (policy.rounding_rule === 'ROUND_UP') {
      roundedOt = Math.ceil(rawOt);
    }

    if (roundedOt <= 0) {
      return {
        eligibleOtHours: 0,
        roundedOtHours: 0,
        otPayAmount: 0,
        compOffDaysEarned: 0,
        applicableRateType: 'NONE',
        requiresApproval: false,
      };
    }

    // 3. Compute OT Pay Amount & Comp-Off
    let otPayAmount = 0;
    let compOffDays = 0;
    let rateType = 'WEEKDAY';

    if (isSunday) {
      rateType = 'SUNDAY';
      if (policy.sunday_action === 'COMP_OFF_ONLY') {
        compOffDays = roundedOt >= policy.ot_to_compoff_hours ? 1 : roundedOt / policy.ot_to_compoff_hours;
      } else if (policy.sunday_action === 'OT_AND_COMP_OFF') {
        compOffDays = roundedOt >= policy.ot_to_compoff_hours ? 1 : roundedOt / policy.ot_to_compoff_hours;
        otPayAmount = policy.sunday_fixed_rate > 0
          ? roundedOt * policy.sunday_fixed_rate
          : roundedOt * (hourlyRate * (policy.sunday_multiplier || 2.0));
      } else {
        // OT_ONLY
        otPayAmount = policy.sunday_fixed_rate > 0
          ? roundedOt * policy.sunday_fixed_rate
          : roundedOt * (hourlyRate * (policy.sunday_multiplier || 2.0));
      }
    } else if (isHoliday) {
      rateType = 'HOLIDAY';
      if (policy.holiday_action === 'COMP_OFF_ONLY') {
        compOffDays = roundedOt >= policy.ot_to_compoff_hours ? 1 : roundedOt / policy.ot_to_compoff_hours;
      } else if (policy.holiday_action === 'OT_AND_COMP_OFF') {
        compOffDays = roundedOt >= policy.ot_to_compoff_hours ? 1 : roundedOt / policy.ot_to_compoff_hours;
        otPayAmount = policy.holiday_fixed_rate > 0
          ? roundedOt * policy.holiday_fixed_rate
          : roundedOt * (hourlyRate * (policy.holiday_multiplier || 2.0));
      } else {
        otPayAmount = policy.holiday_fixed_rate > 0
          ? roundedOt * policy.holiday_fixed_rate
          : roundedOt * (hourlyRate * (policy.holiday_multiplier || 2.0));
      }
    } else {
      // Normal Weekday OT
      if (policy.calculation_method === 'FIXED_PER_HOUR' && policy.weekday_fixed_rate > 0) {
        otPayAmount = roundedOt * policy.weekday_fixed_rate;
      } else if (policy.calculation_method === 'VENDOR_DEFINED' && vendorCustomRate) {
        otPayAmount = roundedOt * vendorCustomRate;
      } else {
        otPayAmount = roundedOt * (hourlyRate * (policy.weekday_multiplier || 1.5));
      }
    }

    return {
      eligibleOtHours: rawOt,
      roundedOtHours: roundedOt,
      otPayAmount: Number(otPayAmount.toFixed(2)),
      compOffDaysEarned: Number(compOffDays.toFixed(2)),
      applicableRateType: rateType,
      requiresApproval: policy.requires_manager_approval,
    };
  }

  /**
   * Fetches active OT policy for organization
   */
  async getActiveOtPolicy(orgId: string): Promise<OvertimePolicy> {
    const { data } = await supabase
      .from('overtime_policies')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_default', true)
      .maybeSingle();

    if (data) return data;

    // Standard default policy for manufacturing / factories
    return {
      organization_id: orgId,
      policy_name: 'Factory Standard Overtime Policy',
      ot_starts_after_hours: 9.0,
      calculation_method: 'HOURLY_MULTIPLIER',
      weekday_multiplier: 1.5,
      weekday_fixed_rate: 150,
      sunday_action: 'OT_AND_COMP_OFF',
      sunday_multiplier: 2.0,
      sunday_fixed_rate: 250,
      holiday_action: 'OT_AND_COMP_OFF',
      holiday_multiplier: 2.0,
      holiday_fixed_rate: 300,
      rounding_rule: 'NEAREST_HALF_HOUR',
      ot_to_compoff_hours: 8.0,
      max_daily_ot_hours: 4.0,
      max_monthly_ot_hours: 50.0,
      requires_manager_approval: true,
      requires_hr_approval: false,
      is_default: true,
    };
  }
}

export const overtimePolicyEngine = new OvertimePolicyEngine();
