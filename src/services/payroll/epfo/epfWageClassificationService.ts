// src/services/payroll/epfo/epfWageClassificationService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — EPFO Statutory Wage Classification & Split Engine
// Supports Company Migration Mode V1 (Q=G PF Wage) & Statutory Standard V2
// ============================================================================

import { ECRMappingMode } from '../../../types/epfoCompliance';

export interface EPFStatutorySplitResult {
  grossWages: number;             // Field 3: PF Wage in V1, Total Gross in V2
  epfWages: number;               // Field 4: Basic capped at ₹15k (or actual)
  epsWages: number;               // Field 5: Pensionable wage
  edliWages: number;              // Field 6: Insurance wage
  epfContributionRemitted: number;// Field 7: 12% of EPF Wage
  epsContributionRemitted: number;// Field 8: 8.33% of EPS Wage (Max ₹1,250)
  epfEpsDifference: number;       // Field 9: Field 7 - Field 8
  employerPfCost13: number;       // Internal Company 13% Cost
  employerGovPortion1: number;    // Internal Company 1% Admin/EDLI
  pfWageCeiling: number;
  epsCeiling: number;
  mappingMode: ECRMappingMode;
}

export class EPFWageClassificationService {
  public static readonly STATUTORY_PF_CEILING = 15000;
  public static readonly EPS_MAX_CONTRIBUTION = 1250; // Math.round(15000 * 0.0833) = 1250

  /**
   * Determine statutory ECR wage bases and contributions
   */
  public static calculateStatutorySplit(params: {
    grossEarnings: number;
    basicSalary: number;
    pfCapped?: boolean;
    epsEligible?: boolean;
    edliEligible?: boolean;
    mappingMode?: ECRMappingMode;
  }): EPFStatutorySplitResult {
    const {
      grossEarnings,
      basicSalary,
      pfCapped = true,
      epsEligible = true,
      edliEligible = true,
      mappingMode = 'COMPANY_MIGRATION_V1',
    } = params;

    const pfWageBase = basicSalary;
    const pfCeiling = this.STATUTORY_PF_CEILING;

    // 1. EPF Wages (Field 4): Basic capped at ₹15k or full basic if uncapped
    const epfWages = pfCapped ? Math.min(pfWageBase, pfCeiling) : pfWageBase;

    // 2. EPS Wages (Field 5): Pensionable wage subject to statutory ₹15k ceiling
    const epsWages = epsEligible ? Math.min(pfWageBase, pfCeiling) : 0;

    // 3. EDLI Wages (Field 6): Insurance wage base subject to statutory ₹15k ceiling
    const edliWages = edliEligible ? Math.min(pfWageBase, pfCeiling) : 0;

    // 4. Gross Wages (Field 3):
    // In Company Migration V1: Q = G (PF Wages) as in current Excel workbook
    // In Statutory Standard V2: Actual Gross Earnings
    const grossWages = mappingMode === 'COMPANY_MIGRATION_V1' ? epfWages : grossEarnings;

    // 5. EPF Contribution Remitted (Field 7): 12% of EPF Wage
    const epfContributionRemitted = Math.round(epfWages * 0.12);

    // 6. EPS Contribution Remitted (Field 8): 8.33% of EPS Wage (Statutory Cap ₹1,250)
    let epsContributionRemitted = 0;
    if (epsEligible && epsWages > 0) {
      if (epsWages >= pfCeiling) {
        epsContributionRemitted = this.EPS_MAX_CONTRIBUTION; // Exactly ₹1,250
      } else {
        epsContributionRemitted = Math.round(epsWages * (8.33 / 100));
      }
    }

    // 7. EPF/EPS Difference (Field 9): Exact statutory difference (Field 7 - Field 8)
    const epfEpsDifference = epfContributionRemitted - epsContributionRemitted;

    // Internal Company Employer Cost (13% total: 12% ER PF + 1% Gov Admin/EDLI)
    const employerGovPortion1 = Math.round(epfWages * 0.01);
    const employerPfCost13 = Math.round(epfWages * 0.13);

    return {
      grossWages,
      epfWages,
      epsWages,
      edliWages,
      epfContributionRemitted,
      epsContributionRemitted,
      epfEpsDifference,
      employerPfCost13,
      employerGovPortion1,
      pfWageCeiling: pfCeiling,
      epsCeiling: pfCeiling,
      mappingMode,
    };
  }
}
