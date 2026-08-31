// src/services/payroll/esic/esiValidationService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — 15-Point ESIC Upload Validation Engine
// Pre-Upload Integrity & Statutory Format Verifier
// ============================================================================

import { ESICUploadRow, ESICUploadBatch } from '../../../types/esicCompliance';
import { ESIReasonCodeService } from './esiReasonCodeMaster';

export interface ValidationIssue {
  employee_id: string;
  employee_code: string;
  field: string;
  type: 'BLOCKER' | 'WARNING';
  message: string;
  suggested_action: string;
}

export interface ESICBatchValidationResult {
  isValid: boolean;
  hasBlockers: boolean;
  totalRows: number;
  validRows: number;
  warningRows: number;
  blockedRows: number;
  issues: ValidationIssue[];
}

export class ESIValidationService {
  /**
   * Validate a single ESIC upload row against all statutory and format rules
   */
  public static validateRow(row: ESICUploadRow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. IP Number: Exactly 10 digits numeric
    const ipTrimmed = (row.col_a_ip_number || '').trim();
    if (!ipTrimmed) {
      errors.push('IP Number is missing (mandatory 10 digits).');
    } else if (!/^\d{10}$/.test(ipTrimmed)) {
      errors.push(`Invalid IP Number: "${ipTrimmed}". Must be exactly 10 numeric digits without letters or spaces.`);
    }

    // 2. IP Name: Only alphabets and space (A-Z, a-z, space)
    const nameTrimmed = (row.col_b_ip_name || '').trim();
    if (!nameTrimmed) {
      errors.push('IP Name is missing.');
    } else if (!/^[A-Za-z ]+$/.test(nameTrimmed)) {
      warnings.push(`IP Name "${nameTrimmed}" contains non-alphabetic characters. Recommended: use statutory name override with alphabets and spaces only.`);
    }

    // 3. Days: Whole number between 0 and 31
    const days = row.col_c_days;
    if (isNaN(days) || days < 0 || days > 31) {
      errors.push(`Invalid working days: ${days}. Must be an integer between 0 and 31.`);
    } else if (!Number.isInteger(days)) {
      errors.push(`Days must be a whole integer (${days} received). Ensure CEILING transformation is applied.`);
    }

    // 4. Monthly Wages: Non-negative
    const wages = row.col_d_monthly_wages;
    if (isNaN(wages) || wages < 0) {
      errors.push(`Invalid Monthly Wages: ${wages}. Must be a non-negative number.`);
    }

    // 5. Zero-Wage & Reason Code Validation
    const isZeroWage = wages === 0;
    const isZeroDays = days === 0;
    const reasonCode = row.col_e_reason_code;
    const reasonMaster = ESIReasonCodeService.getReasonByCode(reasonCode);

    if (isZeroWage || isZeroDays) {
      if (reasonCode === undefined || reasonCode === null) {
        errors.push('Zero wages / zero days requires a valid Reason Code (0-13).');
      } else if (!reasonMaster) {
        errors.push(`Unknown Reason Code: ${reasonCode}. Must be a valid controlled reason code (0-13).`);
      }
    }

    // 6. Last Working Day (LWD) Rules
    const lwd = (row.col_f_last_working_day || '').trim();

    if (reasonMaster) {
      if (reasonMaster.requires_last_working_day) {
        if (!lwd) {
          errors.push(`Reason "${reasonMaster.name}" (Code ${reasonCode}) mandates a valid Last Working Day.`);
        } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(lwd)) {
          errors.push(`Invalid Last Working Day format: "${lwd}". ESIC requires DD/MM/YYYY text date.`);
        }
      } else {
        // LWD must be blank for reasons where it is not required (e.g. On Leave)
        if (lwd) {
          errors.push(`Last Working Day must be BLANK for reason "${reasonMaster.name}" (Code ${reasonCode}). Found: "${lwd}".`);
        }
      }

      if (reasonMaster.is_high_risk) {
        warnings.push(`High-Risk Reason "${reasonMaster.name}" selected. Employee will be excluded from future automatic ESIC monthly lists.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate entire ESIC Upload Batch and detect cross-row issues (duplicates, etc.)
   */
  public static validateBatch(rows: ESICUploadRow[]): ESICBatchValidationResult {
    const issues: ValidationIssue[] = [];
    const ipSeen = new Map<string, string>(); // IP -> Employee Code

    let validRows = 0;
    let warningRows = 0;
    let blockedRows = 0;

    for (const row of rows) {
      const rowResult = this.validateRow(row);
      const ip = (row.col_a_ip_number || '').trim();

      // Cross-row duplicate IP check
      if (ip && /^\d{10}$/.test(ip)) {
        if (ipSeen.has(ip)) {
          rowResult.errors.push(`Duplicate IP Number ${ip}: already used by employee ${ipSeen.get(ip)}.`);
          rowResult.isValid = false;
        } else {
          ipSeen.set(ip, row.employee_code);
        }
      }

      // Record errors as blockers
      rowResult.errors.forEach(err => {
        issues.push({
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          field: 'Upload Row',
          type: 'BLOCKER',
          message: err,
          suggested_action: 'Correct the field before regenerating the ESIC upload file.',
        });
      });

      // Record warnings
      rowResult.warnings.forEach(warn => {
        issues.push({
          employee_id: row.employee_id,
          employee_code: row.employee_code,
          field: 'Upload Row',
          type: 'WARNING',
          message: warn,
          suggested_action: 'Review warning. You may proceed if verified.',
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
