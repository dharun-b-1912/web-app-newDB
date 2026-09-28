// src/services/vendor/vendorAttendanceXlsxExport.ts
// ============================================================================
// Joy PeopleHR — Company -> Vendor Workforce XLSX Report Rendering Engine
// Rebuilt: Professional Attendance + MR + OT + Reconciliation + Exceptions Workbook
// Generates official operational Excel reports with real tables, print setup & audit validation
// ============================================================================

import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  XlsxExportConfig,
  AttendancePeriod,
  VendorAttendanceEngineService,
} from './vendorAttendanceEngineService';

import {
  WorkforceReportEngine,
  CompanyBrandingConfig,
  ReportValidationResult,
} from './reportEngine';

export * from './reportEngine';

// ---------------------------------------------------------------------------
// MAIN EXPORT FUNCTION — Builds multi-sheet enterprise workbook & downloads
// ---------------------------------------------------------------------------
export async function exportVendorAttendanceWorkbook(
  attendance: VendorDailyAttendance[],
  mrReport: VendorMRReportRecord[],
  otMatrix: VendorOTMatrixRecord[],
  reconciliation: AttendanceOTReconciliationRow[],
  exceptions: AttendanceException[],
  period: AttendancePeriod,
  config: XlsxExportConfig
): Promise<ReportValidationResult> {
  const brandConfig: CompanyBrandingConfig = {
    ...config,
    sheets: config.sheets || ['attendance', 'mr_report', 'ot_report', 'reconciliation', 'exceptions'],
  };

  return WorkforceReportEngine.exportWorkbook({
    attendance,
    mrReport,
    otMatrix,
    reconciliation,
    exceptions,
    period,
    config: brandConfig,
  });
}

// ---------------------------------------------------------------------------
// SINGLE-SHEET EXPORT OPTIONS (for specific operational extractions)
// ---------------------------------------------------------------------------
export async function exportAttendanceOnly(
  attendance: VendorDailyAttendance[],
  config: XlsxExportConfig
): Promise<ReportValidationResult> {
  const period: AttendancePeriod = {
    id: 'custom',
    label: config.period_label || `${config.from_date} to ${config.to_date}`,
    from_date: config.from_date,
    to_date: config.to_date,
    period_type: 'ATTENDANCE_CYCLE',
  };

  const brandConfig: CompanyBrandingConfig = {
    ...config,
    sheets: ['attendance'],
    include_cover_sheet: false,
  };

  return WorkforceReportEngine.exportWorkbook({
    attendance,
    mrReport: [],
    otMatrix: [],
    reconciliation: [],
    exceptions: [],
    period,
    config: brandConfig,
  });
}

export async function exportMRReportOnly(
  mrReport: VendorMRReportRecord[],
  config: XlsxExportConfig
): Promise<ReportValidationResult> {
  const period: AttendancePeriod = {
    id: 'custom',
    label: config.period_label || `${config.from_date} to ${config.to_date}`,
    from_date: config.from_date,
    to_date: config.to_date,
    period_type: 'ATTENDANCE_CYCLE',
  };

  const brandConfig: CompanyBrandingConfig = {
    ...config,
    sheets: ['mr_report'],
    include_cover_sheet: false,
  };

  return WorkforceReportEngine.exportWorkbook({
    attendance: [],
    mrReport,
    otMatrix: [],
    reconciliation: [],
    exceptions: [],
    period,
    config: brandConfig,
  });
}

export async function exportOTReportOnly(
  otMatrix: VendorOTMatrixRecord[],
  period: AttendancePeriod,
  config: XlsxExportConfig
): Promise<ReportValidationResult> {
  const brandConfig: CompanyBrandingConfig = {
    ...config,
    sheets: ['ot_report'],
    include_cover_sheet: false,
  };

  return WorkforceReportEngine.exportWorkbook({
    attendance: [],
    mrReport: [],
    otMatrix,
    reconciliation: [],
    exceptions: [],
    period,
    config: brandConfig,
  });
}
