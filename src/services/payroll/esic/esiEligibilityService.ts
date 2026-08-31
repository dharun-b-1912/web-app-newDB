// src/services/payroll/esic/esiEligibilityService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — ESIC Statutory Eligibility & Contribution Engine
// 2-Step Coverage vs Contribution • Contribution Periods • Disability Thresholds
// ============================================================================

import { ESICoverageStatus, ESIStatutoryProfile } from '../../../types/esicCompliance';
import { ESIStatutoryAssessment } from '../../../types/payroll';

export interface ESICoverageEvaluationResult {
  isCovered: boolean;
  coverageStatus: ESICoverageStatus;
  coverageWage: number;
  overtimeWage: number;
  contributionWage: number;
  employeeContribution: number;
  employerContribution: number;
  totalLiability: number;
  wageCeilingApplied: number;
  isDisabilityCategory: boolean;
  contributionPeriod: {
    periodId: string;
    periodName: string;
    cycleStart: string;
    cycleEnd: string;
  };
  reasonNotes: string;
}

export class ESIEligibilityService {
  public static readonly STANDARD_WAGE_CEILING = 21000;
  public static readonly DISABILITY_WAGE_CEILING = 25000;
  public static readonly EMPLOYEE_RATE = 0.0075; // 0.75%
  public static readonly EMPLOYER_RATE = 0.0325; // 3.25%

  /**
   * Determine Contribution Period based on pay period date
   * Period 1: 1st April to 30th September
   * Period 2: 1st October to 31st March
   */
  public static getContributionPeriod(dateStr: string): {
    periodId: string;
    periodName: string;
    cycleStart: string;
    cycleEnd: string;
  } {
    const dt = new Date(dateStr);
    const month = dt.getMonth() + 1; // 1-12
    const year = dt.getFullYear();

    if (month >= 4 && month <= 9) {
      return {
        periodId: `CP-${year}-P1`,
        periodName: `Apr ${year} – Sep ${year}`,
        cycleStart: `${year}-04-01`,
        cycleEnd: `${year}-09-30`,
      };
    } else if (month >= 10) {
      return {
        periodId: `CP-${year}-${year + 1}-P2`,
        periodName: `Oct ${year} – Mar ${year + 1}`,
        cycleStart: `${year}-10-01`,
        cycleEnd: `${year + 1}-03-31`,
      };
    } else {
      return {
        periodId: `CP-${year - 1}-${year}-P2`,
        periodName: `Oct ${year - 1} – Mar ${year}`,
        cycleStart: `${year - 1}-10-01`,
        cycleEnd: `${year}-03-31`,
      };
    }
  }

  /**
   * Complete 2-Step ESI Assessment
   * Step 1: Coverage Wage (salary excluding OT) <= ₹21,000 (or ₹25,000 for disability)
   * Step 2: Contribution Wage = Coverage Wage + Approved OT (if covered)
   */
  public static evaluateCoverageAndContribution(params: {
    salaryWithoutOT: number;
    approvedOTRemuneration: number;
    payDate?: string;
    historicalCoverageStatus?: ESICoverageStatus;
    isDisabilityCategory?: boolean;
    isExited?: boolean;
    exitDate?: string;
  }): ESICoverageEvaluationResult {
    const {
      salaryWithoutOT,
      approvedOTRemuneration,
      payDate = new Date().toISOString(),
      historicalCoverageStatus = 'NOT_COVERED',
      isDisabilityCategory = false,
      isExited = false,
    } = params;

    const wageCeiling = isDisabilityCategory
      ? this.DISABILITY_WAGE_CEILING
      : this.STANDARD_WAGE_CEILING;

    const coverageWage = Math.max(0, salaryWithoutOT);
    const overtimeWage = Math.max(0, approvedOTRemuneration);
    const contribPeriod = this.getContributionPeriod(payDate);

    let isCovered = false;
    let coverageStatus: ESICoverageStatus = 'NOT_COVERED';
    let reasonNotes = '';

    if (isExited) {
      isCovered = false;
      coverageStatus = 'LEFT_SERVICE';
      reasonNotes = 'Employee has separated from service';
    } else if (coverageWage <= wageCeiling) {
      // Direct ceiling eligibility
      isCovered = true;
      if (historicalCoverageStatus === 'NOT_COVERED' || historicalCoverageStatus === 'OUT_OF_COVERAGE') {
        coverageStatus = 'NEWLY_COVERED';
        reasonNotes = `Newly eligible (Coverage Wage ₹${coverageWage} <= ₹${wageCeiling})`;
      } else {
        coverageStatus = 'COVERED';
        reasonNotes = `Statutory coverage active (Coverage Wage ₹${coverageWage} <= ₹${wageCeiling})`;
      }
    } else {
      // Above ceiling: check if continuation of coverage within the current contribution period applies
      if (historicalCoverageStatus === 'COVERED' || historicalCoverageStatus === 'CONTINUING_COVERAGE' || historicalCoverageStatus === 'NEWLY_COVERED') {
        isCovered = true;
        coverageStatus = 'CONTINUING_COVERAGE';
        reasonNotes = `Wage crossed ceiling (₹${coverageWage} > ₹${wageCeiling}), but covered until contribution period ends (${contribPeriod.periodName})`;
      } else {
        isCovered = false;
        coverageStatus = 'NOT_COVERED';
        reasonNotes = `Coverage wage ₹${coverageWage} exceeds ceiling ₹${wageCeiling} (OT excluded from test)`;
      }
    }

    // Contribution Calculation
    let contributionWage = 0;
    let employeeContribution = 0;
    let employerContribution = 0;

    if (isCovered) {
      // Once covered, all approved wages including OT are subject to contribution without ceiling
      contributionWage = coverageWage + overtimeWage;
      employeeContribution = Math.round((contributionWage * this.EMPLOYEE_RATE) * 100) / 100;
      employerContribution = Math.round((contributionWage * this.EMPLOYER_RATE) * 100) / 100;
    }

    return {
      isCovered,
      coverageStatus,
      coverageWage,
      overtimeWage,
      contributionWage,
      employeeContribution,
      employerContribution,
      totalLiability: employeeContribution + employerContribution,
      wageCeilingApplied: wageCeiling,
      isDisabilityCategory,
      contributionPeriod: contribPeriod,
      reasonNotes,
    };
  }
}
