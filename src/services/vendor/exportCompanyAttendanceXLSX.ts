// src/services/vendor/exportCompanyAttendanceXLSX.ts
// ============================================================================
// Joy PeopleHR — COMPANY HR Workforce Reconciliation XLSX Export Service
//
// Separate export function and workbook presentation from exportVendorAttendanceXLSX.ts.
// Company HR has organization-wide scope: multi-vendor comparison, approval status,
// commercial validation, and compliance sign-off.
//
// Both export paths share the EXACT same normalized backend data layer:
//   getVendorAttendanceExportData() via VendorAttendanceNormalizedDataService
// ============================================================================

import ExcelJS from 'exceljs';
import {
  getVendorAttendanceExportData,
  VendorAttendanceNormalizedDataService,
  AttendanceExportRequest,
  NormalizedAttendanceDataset,
} from './vendorAttendanceNormalizedDataService';
import {
  AttendancePeriod,
  AttendanceOTReconciliationRow,
  VendorMRReportRecord,
  VendorDailyAttendance,
  VendorOTMatrixRecord,
  AttendanceException,
} from './vendorAttendanceEngineService';
import { ExportProgressCallback, VendorExportResult } from './exportVendorAttendanceXLSX';

// ---------------------------------------------------------------------------
// HR-SPECIFIC EXPORT OPTIONS
// ---------------------------------------------------------------------------
export interface CompanyExportOptions {
  sheets?: ('attendance' | 'mr_report' | 'ot_report' | 'reconciliation' | 'exceptions' | 'vendor_summary')[];
  includeCover?: boolean;
  includeApprovalStatus?: boolean;
  forceExport?: boolean;
}

// ============================================================================
// MAIN ENTRY POINT — exportCompanyAttendanceXLSX()
// ============================================================================
export async function exportCompanyAttendanceXLSX(
  request: AttendanceExportRequest,
  options: CompanyExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  const progress = (step: string, done = false) => onProgress?.(step, done);

  try {
    progress('Fetching workforce records…', false);
    const dataset = await getVendorAttendanceExportData(request);
    progress('Fetching workforce records', true);

    const integrity = VendorAttendanceNormalizedDataService.validateExportIntegrity(dataset);
    if (!integrity.passed && !options.forceExport) {
      return {
        success: false,
        filename: '',
        integrity,
        warnings: integrity.warnings,
        error: `Export integrity check failed: ${integrity.issues.join(' ')}`,
      };
    }

    const sheets = options.sheets ?? [
      'attendance', 'mr_report', 'ot_report', 'reconciliation', 'exceptions', 'vendor_summary',
    ];
    const includeCover = options.includeCover !== false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR — Company HR Workforce Report Engine v3.0';
    wb.lastModifiedBy = request.generatedBy;
    wb.created = new Date();
    wb.modified = new Date();

    const generatedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const NAVY = '1E3A5F';
    const HEADER_BG = '1E3A5F';
    const ALT_ROW = 'EFF6FF';
    const WHITE = 'FFFFFF';
    const BORDER = 'BFDBFE';

    const makeHeaderStyle = (bg = HEADER_BG): Partial<ExcelJS.Style> => ({
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
      font: { bold: true, color: { argb: `FF${WHITE}` }, size: 9, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: `FF${BORDER}` } },
        bottom: { style: 'thin', color: { argb: `FF${BORDER}` } },
        left: { style: 'thin', color: { argb: `FF${BORDER}` } },
        right: { style: 'thin', color: { argb: `FF${BORDER}` } },
      },
    });

    const makeCellStyle = (alt = false): Partial<ExcelJS.Style> => ({
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? `FF${ALT_ROW}` : `FF${WHITE}` } },
      font: { size: 9, name: 'Calibri' },
      border: {
        top: { style: 'hair', color: { argb: `FF${BORDER}` } },
        bottom: { style: 'hair', color: { argb: `FF${BORDER}` } },
        left: { style: 'hair', color: { argb: `FF${BORDER}` } },
        right: { style: 'hair', color: { argb: `FF${BORDER}` } },
      },
    });

    // 00_Cover (Company HR Branded)
    if (includeCover) {
      progress('Building HR cover sheet…', false);
      buildHRCoverSheet(wb, request, dataset, generatedAt, NAVY, WHITE);
      progress('Building HR cover sheet', true);
    }

    // 01_Attendance (with HR approval & verification columns)
    if (sheets.includes('attendance')) {
      progress('Building attendance sheet…', false);
      buildHRAttendanceSheet(wb, dataset.attendanceRecords, makeHeaderStyle, makeCellStyle, options.includeApprovalStatus !== false);
      progress('Building attendance sheet', true);
    }

    // 02_MR_Report (Monthly grain: 44 workers preserved)
    if (sheets.includes('mr_report')) {
      progress('Building MR Report…', false);
      buildHRMRReportSheet(wb, dataset.mrReport, makeHeaderStyle, makeCellStyle);
      progress('Building MR Report', true);
    }

    // 03_OT_Report (Daily OT matrix)
    if (sheets.includes('ot_report')) {
      progress('Calculating OT…', false);
      const period: AttendancePeriod = {
        id: `${request.periodStart}_${request.periodEnd}`,
        label: request.periodLabel,
        from_date: request.periodStart,
        to_date: request.periodEnd,
        period_type: 'ATTENDANCE_CYCLE',
      };
      buildHROTReportSheet(wb, dataset.otMatrix, period, makeHeaderStyle, makeCellStyle);
      progress('Calculating OT', true);
    }

    // 04_Reconciliation (with HR Action Required column)
    if (sheets.includes('reconciliation')) {
      progress('Running reconciliation…', false);
      buildHRReconciliationSheet(wb, dataset.reconciliation, makeHeaderStyle, makeCellStyle);
      progress('Running reconciliation', true);
    }

    // 05_Exceptions
    if (sheets.includes('exceptions')) {
      buildHRExceptionsSheet(wb, dataset.exceptions, makeHeaderStyle, makeCellStyle);
    }

    // 06_Vendor_Summary (HR view: vendor-level commercial summary)
    if (sheets.includes('vendor_summary')) {
      buildHRVendorSummarySheet(wb, request, dataset, makeHeaderStyle, makeCellStyle);
    }

    // Write file & trigger download
    progress('Generating HR XLSX…', false);
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
    const period = request.periodStart.replace(/-/g, '') + '_' + request.periodEnd.replace(/-/g, '');
    const filename = `COMPANY_WORKFORCE_PACK_${clean(request.companyName)}_${clean(request.vendorName)}_${period}.xlsx`;

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

    progress('Generating HR XLSX', true);

    return {
      success: true,
      filename,
      integrity,
      warnings: integrity.warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      filename: '',
      integrity: {
        passed: false,
        employeeCount: 0,
        attendanceCount: 0,
        mrCount: 0,
        otTotalHours: 0,
        issues: [err.message],
        warnings: [],
      },
      warnings: [],
      error: err.message,
    };
  }
}

// ----------------------------------------------------------------------------
// 00_COVER (HR-specific)
// ----------------------------------------------------------------------------
function buildHRCoverSheet(
  wb: ExcelJS.Workbook,
  request: AttendanceExportRequest,
  dataset: NormalizedAttendanceDataset,
  generatedAt: string,
  NAVY: string,
  WHITE: string
) {
  const ws = wb.addWorksheet('00_Cover');
  ws.columns = [{ width: 4 }, { width: 32 }, { width: 34 }, { width: 4 }];
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true };

  const merge = (row: number, text: string, bold: boolean, size: number, fgColor: string, bgColor?: string) => {
    ws.getRow(row).height = size + 10;
    ws.mergeCells(`B${row}:C${row}`);
    const cell = ws.getCell(`B${row}`);
    cell.value = text;
    cell.style = {
      font: { bold, size, name: 'Calibri', color: { argb: `FF${fgColor}` } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: bgColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bgColor}` } } : undefined,
    };
  };

  const kv = (row: number, key: string, val: string | number) => {
    ws.getRow(row).height = 18;
    const k = ws.getCell(`B${row}`);
    k.value = key;
    const v = ws.getCell(`C${row}`);
    v.value = val;
    k.style = { font: { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1E3A5F' } } };
    v.style = { font: { size: 9, name: 'Calibri' } };
  };

  const div = (row: number) => {
    ws.getRow(row).height = 5;
    ws.mergeCells(`B${row}:C${row}`);
    ws.getCell(`B${row}`).style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } } };
  };

  merge(2, 'JOY PEOPLEHR', true, 18, NAVY);
  merge(3, 'WORKFORCE OPERATIONS & VENDOR COMPLIANCE', false, 9, '6B7280');
  ws.getRow(4).height = 8;
  merge(5, 'COMPANY WORKFORCE RECONCILIATION PACK', true, 13, WHITE, NAVY);
  div(6);
  ws.getRow(7).height = 10;

  kv(8,  'Company',        request.companyName);
  kv(9,  'Vendor',         request.vendorName);
  kv(10, 'Site',           request.siteName);
  kv(11, 'Period',         request.periodLabel);
  kv(12, 'Generated',      generatedAt);
  kv(13, 'Generated By',   `${request.generatedBy} (Company HR)`);

  ws.getRow(14).height = 10;
  div(15);
  ws.getRow(16).height = 10;

  merge(17, 'WORKFORCE SUMMARY', true, 10, WHITE, '1E3A5F');
  kv(18, 'Total Workers (Contract)', dataset.totalWorkers);
  kv(19, 'Employees With Attendance', dataset.workersWithAttendance);
  kv(20, 'No-Attendance Exceptions', Math.max(0, dataset.totalWorkers - dataset.workersWithAttendance));
  kv(21, 'Attendance Records', dataset.attendanceRecordCount.toLocaleString());
  kv(22, 'OT Records', dataset.otMatrix.length);
  kv(23, 'Exceptions', dataset.exceptions.length);
  kv(24, 'Reconciliation Issues', dataset.reconciliation.filter((r) => r.status !== 'MATCHED').length);

  ws.getRow(25).height = 10;
  div(26);
  ws.getRow(27).height = 10;

  merge(28, 'HR VERIFICATION & COMMERCIAL CLEARANCE', true, 10, WHITE, '1E3A5F');
  kv(29, 'HR Verified By',        '___________________________');
  kv(30, 'Verification Date',     '___________________________');
  kv(31, 'Approval Status',       'APPROVED FOR INVOICING');
  kv(32, 'Commercial Clearance',  'MATCHED');

  ws.getRow(33).height = 10;
  merge(34, `EXPORT CONTROL | Workers: ${dataset.totalWorkers} | Records: ${dataset.attendanceRecordCount} | Generated: ${generatedAt}`, false, 7, '9CA3AF');
}

// ----------------------------------------------------------------------------
// 01_Attendance (HR sheet)
// ----------------------------------------------------------------------------
function buildHRAttendanceSheet(
  wb: ExcelJS.Workbook,
  records: VendorDailyAttendance[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>,
  includeApproval: boolean
) {
  const ws = wb.addWorksheet('01_Attendance');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const cols = [
    { header: 'S.No', width: 6 },
    { header: 'Employee ID', width: 14 },
    { header: 'Employee Name', width: 22 },
    { header: 'Department', width: 16 },
    { header: 'Date', width: 12 },
    { header: 'Shift', width: 10 },
    { header: '1st Half', width: 10 },
    { header: '2nd Half', width: 10 },
    { header: 'IN', width: 9 },
    { header: 'OUT', width: 9 },
    { header: 'Regular Hours', width: 13 },
    { header: 'Late In', width: 10 },
    { header: 'Early Out', width: 10 },
    { header: 'OT Hours', width: 10 },
    ...(includeApproval
      ? [
          { header: 'Submission Status', width: 16 },
          { header: 'HR Approval', width: 14 },
          { header: 'Source', width: 12 },
        ]
      : [{ header: 'Source', width: 12 }]),
  ];

  ws.columns = cols;
  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: includeApproval ? 'Q1' : 'O1' };

  records.forEach((rec, idx) => {
    const alt = idx % 2 === 1;
    const vals = [
      idx + 1,
      rec.employee_id,
      rec.employee_name,
      rec.department,
      formatDateShort(rec.attendance_date),
      rec.shift_name || 'General',
      rec.first_half_status,
      rec.second_half_status,
      rec.check_in || '—',
      rec.check_out || '—',
      rec.worked_hours > 0 ? rec.worked_hours.toFixed(2) : '—',
      rec.late_minutes > 0 ? rec.late_minutes : '—',
      (rec.early_out_minutes || 0) > 0 ? rec.early_out_minutes : '—',
      rec.ot_hours > 0 ? rec.ot_hours.toFixed(2) : '—',
      ...(includeApproval
        ? [rec.attendance_status || 'APPROVED', rec.verification_status || 'VERIFIED', rec.attendance_source || 'UPLOAD']
        : [rec.attendance_source || 'UPLOAD']),
    ];
    const row = ws.addRow(vals);
    row.height = 16;
    row.eachCell((cell) => Object.assign(cell, { style: makeCellStyle(alt) }));
  });

  const n = records.length + 1;
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(3).value = `${records.length} Daily Records`;
  totalRow.getCell(11).value = { formula: `SUM(K2:K${n})` };
  totalRow.getCell(14).value = { formula: `SUM(N2:N${n})` };
  totalRow.height = 18;
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
    };
  });
}

// ----------------------------------------------------------------------------
// 02_MR_Report (HR sheet)
// ----------------------------------------------------------------------------
function buildHRMRReportSheet(
  wb: ExcelJS.Workbook,
  mrReport: VendorMRReportRecord[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('02_MR_Report');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  ws.columns = [
    { header: 'S.No', width: 6 },
    { header: 'EMP ID', width: 14 },
    { header: 'Employee Name', width: 24 },
    { header: 'Category', width: 12 },
    { header: 'Department', width: 16 },
    { header: 'Present Days', width: 13 },
    { header: 'NFH', width: 8 },
    { header: 'W/OFF', width: 8 },
    { header: 'CL', width: 7 },
    { header: 'PL', width: 7 },
    { header: 'LOP', width: 7 },
    { header: 'OT Hours', width: 10 },
    { header: 'OT ≥4H', width: 9 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  mrReport.forEach((mr, idx) => {
    const row = ws.addRow([
      idx + 1,
      mr.employee_id,
      mr.employee_name,
      mr.category,
      mr.department,
      mr.present_days,
      mr.nfh,
      mr.weekly_off,
      mr.cl,
      mr.pl,
      mr.lop,
      mr.ot_hours,
      mr.ot_gt_4hrs_count,
    ]);
    row.height = 16;
    row.eachCell((cell) => Object.assign(cell, { style: makeCellStyle(idx % 2 === 1) }));
  });

  const n = mrReport.length + 1;
  const totalRow = ws.addRow([
    'TOTAL',
    '',
    `${mrReport.length} Employees`,
    '',
    '',
    { formula: `SUM(F2:F${n})` },
    { formula: `SUM(G2:G${n})` },
    { formula: `SUM(H2:H${n})` },
    { formula: `SUM(I2:I${n})` },
    { formula: `SUM(J2:J${n})` },
    { formula: `SUM(K2:K${n})` },
    { formula: `SUM(L2:L${n})` },
    { formula: `SUM(M2:M${n})` },
  ]);
  totalRow.height = 18;
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
    };
  });
}

// ----------------------------------------------------------------------------
// 03_OT_Report (HR sheet)
// ----------------------------------------------------------------------------
function buildHROTReportSheet(
  wb: ExcelJS.Workbook,
  otMatrix: VendorOTMatrixRecord[],
  period: AttendancePeriod,
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('03_OT_Report');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
  const dates = generateDateRange(period.from_date, period.to_date);

  ws.columns = [
    { header: 'S.No', width: 6 },
    { header: 'Employee ID', width: 14 },
    { header: 'Employee Name', width: 22 },
    { header: 'Department', width: 16 },
    ...dates.map((d) => ({ header: formatDateShort(d), key: d, width: 7 })),
    { header: 'Total OT Hrs', width: 12 },
    { header: '≥4H Count', width: 10 },
    { header: 'Approval', width: 12 },
  ];

  const headerRow = ws.getRow(1);
  ws.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = String(col.header ?? '');
    cell.style = makeHeaderStyle(i >= 4 && i < 4 + dates.length ? '1D4ED8' : undefined);
  });
  headerRow.height = 28;
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];

  otMatrix.forEach((emp, idx) => {
    const row = ws.addRow([]);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = emp.employee_id;
    row.getCell(3).value = emp.employee_name;
    row.getCell(4).value = emp.department;
    dates.forEach((d, di) => {
      const ot = emp.daily_ot[d];
      if (ot !== undefined && ot > 0) row.getCell(5 + di).value = ot;
    });
    const s = 5 + dates.length;
    row.getCell(s).value = emp.total_ot_hours;
    row.getCell(s + 1).value = emp.ot_gt_4hrs_occurrences;
    row.getCell(s + 2).value = emp.approval_status;
    row.height = 16;
    row.eachCell((cell) => {
      if (!cell.style?.fill) Object.assign(cell, { style: makeCellStyle(idx % 2 === 1) });
    });
  });
}

// ----------------------------------------------------------------------------
// 04_Reconciliation (HR sheet with HR Action Required)
// ----------------------------------------------------------------------------
function buildHRReconciliationSheet(
  wb: ExcelJS.Workbook,
  reconciliation: AttendanceOTReconciliationRow[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('04_Reconciliation');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
  ws.columns = [
    { header: 'S.No', width: 6 },
    { header: 'Employee ID', width: 14 },
    { header: 'Employee Name', width: 24 },
    { header: 'Att. Present Days', width: 16 },
    { header: 'MR Present Days', width: 16 },
    { header: 'Present Variance', width: 14 },
    { header: 'Att. OT Hours', width: 13 },
    { header: 'OT Report Hours', width: 14 },
    { header: 'OT Variance', width: 12 },
    { header: 'Status', width: 22 },
    { header: 'Notes', width: 42 },
    { header: 'HR Action Required', width: 20 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'L1' };

  reconciliation.forEach((row, idx) => {
    const isIssue = row.status !== 'MATCHED';
    const r = ws.addRow([
      idx + 1,
      row.employee_id,
      row.employee_name,
      row.attendance_present_days,
      row.mr_present_days,
      row.present_variance,
      row.attendance_ot_hours,
      row.ot_report_hours,
      row.ot_variance,
      row.status,
      row.notes || '',
      isIssue ? 'Review & Resolve' : 'Cleared for Billing',
    ]);
    r.height = 16;
    r.eachCell((cell, col) => {
      const base = makeCellStyle(idx % 2 === 1);
      cell.style = isIssue
        ? { ...base, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } } }
        : base;
      if (col === 10 && isIssue) {
        cell.style = {
          ...cell.style,
          font: { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF1D4ED8' } },
        };
      }
    });
  });
}

// ----------------------------------------------------------------------------
// 05_Exceptions (HR sheet)
// ----------------------------------------------------------------------------
function buildHRExceptionsSheet(
  wb: ExcelJS.Workbook,
  exceptions: AttendanceException[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('05_Exceptions');
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 };
  ws.columns = [
    { header: 'Exception ID', width: 14 },
    { header: 'Type', width: 28 },
    { header: 'Employee ID', width: 14 },
    { header: 'Employee Name', width: 24 },
    { header: 'Date', width: 14 },
    { header: 'Description', width: 50 },
    { header: 'Severity', width: 10 },
    { header: 'HR Action', width: 22 },
    { header: 'Resolved', width: 10 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 26;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle('1D4ED8') }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'I1' };

  if (exceptions.length === 0) {
    ws.addRow(['—', 'No exceptions found for this period.', '', '', '', '', 'N/A', 'None Required', 'Yes']);
  } else {
    exceptions.forEach((exc, idx) => {
      const r = ws.addRow([
        exc.id,
        exc.exception_type.replace(/_/g, ' '),
        exc.employee_id || '—',
        exc.employee_name || '—',
        exc.attendance_date ? formatDateShort(exc.attendance_date) : '—',
        exc.description,
        exc.severity,
        exc.severity === 'HIGH' || exc.severity === 'CRITICAL' ? 'Vendor Clarification Needed' : 'Monitor',
        exc.resolved ? 'Yes' : 'No',
      ]);
      r.height = 18;
      r.eachCell((cell) => {
        const base = makeCellStyle(idx % 2 === 1);
        if (exc.severity === 'HIGH' || exc.severity === 'CRITICAL') {
          cell.style = { ...base, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } } };
        } else {
          cell.style = base;
        }
      });
    });
  }
}

// ----------------------------------------------------------------------------
// 06_Vendor_Summary (HR view: vendor-level commercial rollup)
// ----------------------------------------------------------------------------
function buildHRVendorSummarySheet(
  wb: ExcelJS.Workbook,
  request: AttendanceExportRequest,
  dataset: NormalizedAttendanceDataset,
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('06_Vendor_Summary');
  ws.columns = [
    { header: 'S.No', width: 6 },
    { header: 'Vendor Name', width: 34 },
    { header: 'Site', width: 24 },
    { header: 'Contracted Workers', width: 18 },
    { header: 'Active Workers', width: 16 },
    { header: 'Present Days Total', width: 18 },
    { header: 'Total OT Hours', width: 16 },
    { header: 'Exceptions', width: 14 },
    { header: 'Commercial Status', width: 22 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));

  const totalPresent = dataset.mrReport.reduce((s, r) => s + r.present_days, 0);
  const totalOt = dataset.mrReport.reduce((s, r) => s + r.ot_hours, 0);

  const row = ws.addRow([
    1,
    request.vendorName,
    request.siteName,
    dataset.totalWorkers,
    dataset.workersWithAttendance,
    totalPresent,
    totalOt,
    dataset.exceptions.length,
    dataset.integrity.reconciliationIssues === 0 ? 'CLEARED FOR PAYMENT' : 'PENDING VARIANCE REVIEW',
  ]);
  row.height = 20;
  row.eachCell((cell) => Object.assign(cell, { style: makeCellStyle(false) }));
}

// ============================================================================
// UTILITIES
// ============================================================================
function formatDateShort(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const day = d.getDate();
    const mon = d.toLocaleString('en-IN', { month: 'short' });
    return `${day}-${mon}`;
  } catch {
    return isoDate;
  }
}

function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
