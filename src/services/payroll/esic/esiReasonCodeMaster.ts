// src/services/payroll/esic/esiReasonCodeMaster.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — ESIC Controlled Zero-Wage Reason Master
// Exact Official ESIC Upload Codes & Last Working Day (LWD) Business Rules
// ============================================================================

import { ESIZeroWageReason } from '../../../types/esicCompliance';

export const ESI_ZERO_WAGE_REASONS: ESIZeroWageReason[] = [
  {
    code: 0,
    name: 'Without Reason',
    description: 'General zero wage without specific statutory reason (requires manual review)',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 1,
  },
  {
    code: 1,
    name: 'On Leave',
    description: 'Employee was on approved leave / Loss of Pay without separation',
    requires_last_working_day: false, // LWD must remain blank
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 2,
  },
  {
    code: 2,
    name: 'Left Service',
    description: 'Employee has resigned / exited employment during or prior to this period',
    requires_last_working_day: true, // LWD mandatory
    allows_zero_wage: true,
    is_high_risk: true, // High risk: removes from future monthly lists
    active: true,
    sort_order: 3,
  },
  {
    code: 3,
    name: 'Retired',
    description: 'Employee reached superannuation / retirement age',
    requires_last_working_day: true, // LWD mandatory
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 4,
  },
  {
    code: 4,
    name: 'Out of Coverage',
    description: 'Salary crossed statutory ceiling after contribution period completion',
    requires_last_working_day: true, // LWD mandatory
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 5,
  },
  {
    code: 5,
    name: 'Expired',
    description: 'Deceased employee separation',
    requires_last_working_day: true, // LWD mandatory
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 6,
  },
  {
    code: 6,
    name: 'Non Implemented area',
    description: 'Transferred or stationed in a non-ESIC notified district/zone',
    requires_last_working_day: true,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 7,
  },
  {
    code: 7,
    name: 'Compliance by Immediate Employer',
    description: 'Contractor or principal employer handles direct compliance',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 8,
  },
  {
    code: 8,
    name: 'Suspension of work',
    description: 'Disciplinary suspension or plant temporary suspension',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 9,
  },
  {
    code: 9,
    name: 'Strike/Lockout',
    description: 'Industrial strike or employer lockout period',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 10,
  },
  {
    code: 10,
    name: 'Retrenchment',
    description: 'Formal company retrenchment / restructuring separation',
    requires_last_working_day: true, // LWD mandatory
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 11,
  },
  {
    code: 11,
    name: 'No Work',
    description: 'Seasonal or temporary lack of work assignment',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: false,
    active: true,
    sort_order: 12,
  },
  {
    code: 12,
    name: "Doesn't Belong To This Employer",
    description: 'IP erroneously associated with this unit establishment code',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 13,
  },
  {
    code: 13,
    name: 'Duplicate IP',
    description: 'Duplicate Insurance Person registration under resolution',
    requires_last_working_day: false,
    allows_zero_wage: true,
    is_high_risk: true,
    active: true,
    sort_order: 14,
  },
];

export class ESIReasonCodeService {
  public static getAllReasons(): ESIZeroWageReason[] {
    return ESI_ZERO_WAGE_REASONS;
  }

  public static getReasonByCode(code: number): ESIZeroWageReason | undefined {
    return ESI_ZERO_WAGE_REASONS.find(r => r.code === code);
  }

  public static getReasonByName(name: string): ESIZeroWageReason | undefined {
    return ESI_ZERO_WAGE_REASONS.find(r => r.name.toLowerCase() === name.toLowerCase());
  }

  public static requiresLWD(code: number): boolean {
    const reason = this.getReasonByCode(code);
    return reason ? reason.requires_last_working_day : false;
  }

  public static isHighRisk(code: number): boolean {
    const reason = this.getReasonByCode(code);
    return reason ? reason.is_high_risk : false;
  }
}
