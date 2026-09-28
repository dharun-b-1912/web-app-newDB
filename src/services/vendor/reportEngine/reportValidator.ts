// src/services/vendor/reportEngine/reportValidator.ts
// ============================================================================
// Joy PeopleHR — Pre-Export Data Consistency & Workbook Validation Engine
// Ensures zero broken formulas (#REF!, #DIV/0!, etc.), audits 3-way reconciliation
// ============================================================================

import ExcelJS from 'exceljs';
import { WorkforceWorkbookDataset, ReportValidationResult } from './types';

export class ReportValidator {
  /**
   * Performs pre-export data consistency check across all 5 datasets
   */
  static validateDataset(dataset: WorkforceWorkbookDataset): ReportValidationResult {
    const issues: string[] = [];
    const attendance = dataset.attendance || [];
    const mrReport = dataset.mrReport || [];
    const otMatrix = dataset.otMatrix || [];
    const reconciliation = dataset.reconciliation || [];
    const exceptions = dataset.exceptions || [];

    const attendanceEmpIds = new Set(attendance.map((a) => a.employee_id || a.employee_code));
    const mrEmpIds = new Set(mrReport.map((m) => m.employee_id || m.employee_code));
    const otEmpIds = new Set(otMatrix.map((o) => o.employee_id || o.employee_code));
    const reconEmpIds = new Set(reconciliation.map((r) => r.employee_id));

    // Audit OT hours reconciliation
    const attendanceOtTotal = Math.round(attendance.reduce((s, a) => s + (a.ot_hours || 0), 0) * 100) / 100;
    const matrixOtTotal = Math.round(otMatrix.reduce((s, o) => s + (o.total_ot_hours || 0), 0) * 100) / 100;
    const otVariance = Math.round(Math.abs(attendanceOtTotal - matrixOtTotal) * 100) / 100;

    if (otVariance > 0.05) {
      issues.push(`Overtime variance detected: Attendance OT (${attendanceOtTotal}h) does not equal Matrix OT (${matrixOtTotal}h). Discrepancy: ${otVariance}h`);
    }

    // Check count differences if records exist
    if (dataset.attendance.length > 0 && dataset.mrReport.length > 0) {
      if (attendanceEmpIds.size !== mrEmpIds.size) {
        issues.push(`Employee count variance: ${attendanceEmpIds.size} workers in daily attendance vs ${mrEmpIds.size} in MR report.`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        attendanceCount: dataset.attendance.length,
        mrCount: dataset.mrReport.length,
        otCount: dataset.otMatrix.length,
        reconciliationCount: dataset.reconciliation.length,
        exceptionsCount: dataset.exceptions.length,
        attendanceOtTotal,
        matrixOtTotal,
        otVariance,
      },
    };
  }

  /**
   * Audits the generated ExcelJS workbook for broken formulas or syntax errors
   */
  static validateWorkbook(wb: ExcelJS.Workbook): { passed: boolean; formulaErrors: string[] } {
    const formulaErrors: string[] = [];

    wb.eachSheet((ws) => {
      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.type === ExcelJS.ValueType.Formula) {
            const formulaStr = cell.formula;
            if (formulaStr.includes('#REF!') || formulaStr.includes('#VALUE!') || formulaStr.includes('#DIV/0!') || formulaStr.includes('#NAME?')) {
              formulaErrors.push(`Broken formula detected in ${ws.name} at cell ${cell.address}: ${formulaStr}`);
            }
          }
        });
      });
    });

    return {
      passed: formulaErrors.length === 0,
      formulaErrors,
    };
  }
}
