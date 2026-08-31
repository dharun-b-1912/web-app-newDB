// src/services/payroll/epfo/epfEcrValidationService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — 15-Point EPFO ECR Validation Engine
// Pre-Upload File & Statutory Schema Integrity Verifier
// ============================================================================

import { EPFOEcrRow } from '../../../types/epfoCompliance';

export interface EcrValidationIssue {
  employee_id: string;
  employee_code: string;
  field: string;
  type: 'BLOCKER' | 'WARNING';
  message: string;
  suggested_action: string;
}

export interface EcrBatchValidationResult {
  isValid: boolean;
  hasBlockers: boolean;
  totalRows: number;
  validRows: number;
  warningRows: number;
  blockedRows: number;
  issues: EcrValidationIssue[];
}

export class EPFEcrValidationService {
  /**
   * Validate a single 11-field EPFO ECR row
   */
  public static validateRow(row: EPFOEcrRow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Field 1: UAN — Exactly 12 numeric digits
    const uan = (row.field_1_uan || '').trim();
    if (!uan) {
      errors.push('UAN is missing (Field 1 requires 12 digits).');
    } else if (!/^\d{12}$/.test(uan)) {
      errors.push(`Invalid UAN: "${uan}". Must be exactly 12 numeric digits.`);
    }

    // 2. Field 2: Member Name — Non-empty
    const name = (row.field_2_member_name || '').trim();
    if (!name) {
      errors.push('Member Name is missing (Field 2).');
    } else if (name.includes('#~#')) {
      errors.push('Member Name contains forbidden delimiter "#~#".');
    }

    // 3. Field 3: Gross Wages
    const gross = row.field_3_gross_wages;
    if (isNaN(gross) || gross < 0) {
      errors.push(`Invalid Gross Wages: ${gross}. Must be a non-negative integer.`);
    }

    // 4. Field 4: EPF Wages
    const epf = row.field_4_epf_wages;
    if (isNaN(epf) || epf < 0) {
      errors.push(`Invalid EPF Wages: ${epf}.`);
    }

    // 5. Field 5: EPS Wages
    const eps = row.field_5_eps_wages;
    if (isNaN(eps) || eps < 0) {
      errors.push(`Invalid EPS Wages: ${eps}.`);
    } else if (eps > 15000) {
      errors.push(`EPS Wage ${eps} exceeds statutory ₹15,000 ceiling.`);
    }

    // 6. Field 6: EDLI Wages
    const edli = row.field_6_edli_wages;
    if (isNaN(edli) || edli < 0) {
      errors.push(`Invalid EDLI Wages: ${edli}.`);
    } else if (edli > 15000) {
      errors.push(`EDLI Wage ${edli} exceeds statutory ₹15,000 ceiling.`);
    }

    // 7. Field 7: EPF Contribution Remitted (12%)
    const epfContrib = row.field_7_epf_contribution_remitted;
    const expectedEpfContrib = Math.round(epf * 0.12);
    if (isNaN(epfContrib) || epfContrib < 0) {
      errors.push(`Invalid EPF Contribution: ${epfContrib}.`);
    } else if (Math.abs(epfContrib - expectedEpfContrib) > 1) {
      warnings.push(`EPF Contribution (${epfContrib}) differs from standard 12% calculation (${expectedEpfContrib}).`);
    }

    // 8. Field 8: EPS Contribution Remitted (8.33% max ₹1,250)
    const epsContrib = row.field_8_eps_contribution_remitted;
    if (isNaN(epsContrib) || epsContrib < 0) {
      errors.push(`Invalid EPS Contribution: ${epsContrib}.`);
    } else if (epsContrib > 1250) {
      errors.push(`EPS Contribution ${epsContrib} exceeds maximum statutory limit of ₹1,250.`);
    }

    // 9. Field 9: EPF/EPS Difference
    const diff = row.field_9_epf_eps_difference;
    const expectedDiff = epfContrib - epsContrib;
    if (isNaN(diff) || diff < 0) {
      errors.push(`Invalid EPF/EPS Difference: ${diff}.`);
    } else if (diff !== expectedDiff) {
      errors.push(`EPF/EPS Difference mismatch: Received ${diff}, expected ${expectedDiff} (Field 7 [${epfContrib}] - Field 8 [${epsContrib}]).`);
    }

    // 10. Field 10: NCP Days
    const ncp = row.field_10_ncp_days;
    if (isNaN(ncp) || ncp < 0 || ncp > 31) {
      errors.push(`Invalid NCP Days: ${ncp}. Must be an integer between 0 and 31.`);
    } else if (!Number.isInteger(ncp)) {
      errors.push(`NCP Days must be a whole integer (${ncp} received).`);
    }

    // 11. Field 11: Refund of Advance
    const refund = row.field_11_refund_of_advance;
    if (isNaN(refund) || refund < 0) {
      errors.push(`Invalid Refund of Advance: ${refund}. Must be 0 or positive integer.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate entire ECR batch and check for duplicate UANs
   */
  public static validateBatch(rows: EPFOEcrRow[]): EcrBatchValidationResult {
    const issues: EcrValidationIssue[] = [];
    const uanSeen = new Map<string, string>(); // UAN -> Employee Code

    let validRows = 0;
    let warningRows = 0;
    let blockedRows = 0;

    for (const row of rows) {
      const rowResult = this.validateRow(row);
      const uan = (row.field_1_uan || '').trim();

      // Cross-row duplicate UAN check
      if (uan && /^\d{12}$/.test(uan)) {
        if (uanSeen.has(uan)) {
          rowResult.errors.push(`Duplicate UAN ${uan}: already assigned to employee ${uanSeen.get(uan)}.`);
          rowResult.isValid = false;
        } else {
          uanSeen.set(uan, row.employee_code);
        }
      }

      rowResult.errors.forEach(err => {
        issues.push({
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          field: 'ECR Row',
          type: 'BLOCKER',
          message: err,
          suggested_action: 'Correct employee UAN or salary basis before generating ECR text file.',
        });
      });

      rowResult.warnings.forEach(warn => {
        issues.push({
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          field: 'ECR Row',
          type: 'WARNING',
          message: warn,
          suggested_action: 'Review warning.',
        });
      });

      if (!rowResult.isValid) {
        blockedRows++;
      } else if (rowResult.warnings.length > 0) {
        warningRows++;
        validRows++;
      } else {
        validRows++;
      }
    }

    return {
      isValid: blockedRows === 0,
      hasBlockers: blockedRows > 0,
      totalRows: rows.length,
      validRows,
      warningRows,
      blockedRows,
      issues,
    };
  }
}
