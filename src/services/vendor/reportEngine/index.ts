// src/services/vendor/reportEngine/index.ts
// ============================================================================
// Joy PeopleHR — Enterprise Workforce XLSX Report Rendering Engine
// Master Orchestrator: Multi-Sheet Workbook, Excel Tables, Print Setup & Validation
// ============================================================================

import ExcelJS from 'exceljs';
import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  AttendancePeriod,
} from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, WorkforceWorkbookDataset, ReportValidationResult } from './types';
import { CoverSheetBuilder, CoverSummaryStats } from './coverSheetBuilder';
import { AttendanceSheetBuilder } from './attendanceSheetBuilder';
import { MRReportSheetBuilder } from './mrReportSheetBuilder';
import { OTReportSheetBuilder } from './otReportSheetBuilder';
import { ReconciliationSheetBuilder } from './reconciliationSheetBuilder';
import { ExceptionsSheetBuilder } from './exceptionsSheetBuilder';
import { ReportValidator } from './reportValidator';

export * from './types';
export * from './excelStyles';
export * from './headerBuilder';
export * from './reportValidator';

export class WorkforceReportEngine {
  /**
   * Applies smart corporate defaults so exports never display generic placeholders
   */
  static normalizeConfig(config?: Partial<CompanyBrandingConfig>): CompanyBrandingConfig {
    const cfg = config || {};
    const isGenericCompany = !cfg.company_name || cfg.company_name.toLowerCase() === 'company';
    const isGenericSite = !cfg.site_name || cfg.site_name.toLowerCase() === 'site';
    const isGenericVendor = !cfg.vendor_name || cfg.vendor_name.toLowerCase() === 'vendor';

    return {
      from_date: cfg.from_date || cfg.period_from || '2026-08-26',
      to_date: cfg.to_date || cfg.period_to || '2026-09-25',
      period_from: cfg.period_from || cfg.from_date || '2026-08-26',
      period_to: cfg.period_to || cfg.to_date || '2026-09-25',
      company_name: isGenericCompany ? 'Joy Corporate Solutions Pvt Ltd' : cfg.company_name!,
      site_name: isGenericSite ? 'Unit II' : cfg.site_name!,
      vendor_name: isGenericVendor ? 'Joy Manpower Services Private Limited' : cfg.vendor_name!,
      contract_po: cfg.contract_po || 'JOY-PO-2026-MP08',
      report_status: cfg.report_status || 'COMPANY VERIFIED',
      template_version: cfg.template_version || 'v2.4 Enterprise Production',
      generated_at: cfg.generated_at || new Date().toLocaleString('en-IN'),
      generated_by: cfg.generated_by || 'HR Administrator',
      include_cover_sheet: cfg.include_cover_sheet !== false,
      sheets: cfg.sheets || ['attendance', 'mr_report', 'ot_report', 'reconciliation', 'exceptions'],
      ...cfg,
    };
  }

  /**
   * Builds the complete 5-sheet (+ cover) operational workforce workbook
   */
  static async generateWorkbook(
    dataset: WorkforceWorkbookDataset
  ): Promise<{ wb: ExcelJS.Workbook; validation: ReportValidationResult; filename: string }> {
    const config = this.normalizeConfig(dataset.config);
    const datasetNorm: WorkforceWorkbookDataset = {
      config,
      period: dataset.period,
      attendance: dataset.attendance || [],
      mrReport: dataset.mrReport || [],
      otMatrix: dataset.otMatrix || [],
      reconciliation: dataset.reconciliation || [],
      exceptions: dataset.exceptions || [],
    };
    const validation = ReportValidator.validateDataset(datasetNorm);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR Operational Report Engine';
    wb.lastModifiedBy = config.generated_by || 'HR Administrator';
    wb.created = new Date();
    wb.modified = new Date();

    const sheetsToInclude = config.sheets || ['attendance', 'mr_report', 'ot_report', 'reconciliation', 'exceptions'];

    // 1. Cover Sheet (00_Cover)
    if (config.include_cover_sheet && sheetsToInclude.length > 1) {
      const stats: CoverSummaryStats = {
        totalEmployees: datasetNorm.mrReport.length || new Set(datasetNorm.attendance.map((a) => a.employee_id)).size,
        totalRecords: datasetNorm.attendance.length,
        presentDays: datasetNorm.mrReport.reduce((s, m) => s + (m.present_days || 0), 0),
        workedHours: datasetNorm.attendance.reduce((s, a) => s + (a.worked_hours || 0), 0),
        otHours: datasetNorm.otMatrix.reduce((s, o) => s + (o.total_ot_hours || 0), 0),
        payableDays: datasetNorm.mrReport.reduce((s, m) => s + (m.present_days || 0) + (m.nfh || 0) + (m.weekly_off || 0) + (m.cl || 0) + (m.pl || 0), 0),
        exceptionsCount: datasetNorm.exceptions.length,
        reconciliationIssues: datasetNorm.reconciliation.filter((r) => r.status !== 'MATCHED').length,
      };
      CoverSheetBuilder.build(wb, config, stats);
    }

    // 2. Sheet 01: Attendance
    if (sheetsToInclude.includes('attendance')) {
      AttendanceSheetBuilder.build(wb, datasetNorm.attendance, config);
    }

    // 3. Sheet 02: MR Report
    if (sheetsToInclude.includes('mr_report')) {
      MRReportSheetBuilder.build(wb, datasetNorm.mrReport, config);
    }

    // 4. Sheet 03: OT Report
    if (sheetsToInclude.includes('ot_report')) {
      OTReportSheetBuilder.build(wb, datasetNorm.otMatrix, datasetNorm.period, config);
    }

    // 5. Sheet 04: Reconciliation
    if (sheetsToInclude.includes('reconciliation')) {
      ReconciliationSheetBuilder.build(wb, datasetNorm.reconciliation, config);
    }

    // 6. Sheet 05: Exceptions
    if (sheetsToInclude.includes('exceptions')) {
      ExceptionsSheetBuilder.build(wb, datasetNorm.exceptions, config);
    }

    // Validate formulas across all created worksheets
    const formulaAudit = ReportValidator.validateWorkbook(wb);
    if (!formulaAudit.passed) {
      console.warn('[WorkforceReportEngine] Formula audit warnings:', formulaAudit.formulaErrors);
    }

    // Generate Standard Filename
    // e.g. JoyCorporate_JoyManpower_Monthly_Workforce_Pack_20260826_20260925.xlsx
    const cleanCompany = (config.company_name || 'JoyCorporate').replace(/[^a-zA-Z0-9]/g, '');
    const cleanVendor = (config.vendor_name || 'JoyManpower').replace(/[^a-zA-Z0-9]/g, '');
    const cleanFrom = (config.period_from || config.from_date || '20260826').replace(/[^0-9]/g, '');
    const cleanTo = (config.period_to || config.to_date || '20260925').replace(/[^0-9]/g, '');

    let reportType = 'Monthly_Workforce_Pack';
    if (sheetsToInclude.length === 1) {
      if (sheetsToInclude[0] === 'attendance') reportType = 'Attendance';
      else if (sheetsToInclude[0] === 'mr_report') reportType = 'MR_Report';
      else if (sheetsToInclude[0] === 'ot_report') reportType = 'OT_Matrix';
      else if (sheetsToInclude[0] === 'reconciliation') reportType = 'Reconciliation';
      else if (sheetsToInclude[0] === 'exceptions') reportType = 'Exceptions';
    }

    const filename = `${cleanCompany}_${cleanVendor}_${reportType}_${cleanFrom}_${cleanTo}.xlsx`;

    return { wb, validation, filename };
  }

  /**
   * Exports workbook and triggers browser download
   */
  static async exportWorkbook(dataset: WorkforceWorkbookDataset): Promise<ReportValidationResult> {
    const { wb, validation, filename } = await this.generateWorkbook(dataset);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return validation;
  }
}
