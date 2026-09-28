// src/services/vendor/exportVendorAttendanceXLSX.ts
// ============================================================================
// Joy PeopleHR — VENDOR Attendance & OT Reconciliation XLSX Export Service
//
// Architecture:
//                    ATTENDANCE INGESTION
//                           │
//                           ▼
//                ┌──────────────────────┐
//                │ Normalized Attendance │
//                │      Data Layer       │
//                └──────────┬───────────┘
//                           │
//             ┌─────────────┴─────────────┐
//             ▼                           ▼
//       VENDOR PORTAL                 COMPANY HR
//       Export Service               Export Service
//             │                           │
//             ▼                           ▼
//     Vendor XLSX                    HR XLSX
//
// Important Rules:
//  1. Never read from the rendered/paginated UI table or browser DOM.
//  2. Vendor export requests the normalized data via getVendorAttendanceExportData().
//  3. Preserves daily grain (employee + attendance_date) in 01_Attendance.
//  4. Preserves monthly grain (one row per employee) in 02_MR_Report.
//  5. Preserves 44-worker master population even when only 43 have attendance.
//  6. Generates client-ready workbook with professional layout, Excel formulas,
//     frozen headers, filters, zebra striping, and auditable EXPORT CONTROL block.
// ============================================================================

import ExcelJS from 'exceljs';
import {
  getVendorAttendanceExportData,
  VendorAttendanceNormalizedDataService,
  AttendanceExportRequest,
  NormalizedAttendanceDataset,
  ExportIntegrityResult,
} from './vendorAttendanceNormalizedDataService';
import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  AttendancePeriod,
} from './vendorAttendanceEngineService';

// ---------------------------------------------------------------------------
// EXPORT OPTIONS — what sheets to include
// ---------------------------------------------------------------------------
export type VendorExportSheetOption =
  | 'attendance'
  | 'mr_report'
  | 'ot_report'
  | 'reconciliation'
  | 'exceptions';

export interface VendorExportOptions {
  sheets?: VendorExportSheetOption[];
  includeCover?: boolean;
  includeExportControl?: boolean;
  forceExport?: boolean;
}

// ---------------------------------------------------------------------------
// PROGRESS CALLBACK
// ---------------------------------------------------------------------------
export type ExportProgressCallback = (step: string, done: boolean) => void;

// ---------------------------------------------------------------------------
// EXPORT RESULT
// ---------------------------------------------------------------------------
export interface VendorExportResult {
  success: boolean;
  filename: string;
  integrity: ExportIntegrityResult;
  warnings: string[];
  error?: string;
}

// ============================================================================
// MAIN ENTRY POINT — exportVendorAttendanceXLSX()
// ============================================================================
export async function exportVendorAttendanceXLSX(
  request: AttendanceExportRequest,
  options: VendorExportOptions = {},
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  const progress = (step: string, done = false) => onProgress?.(step, done);

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Fetch & normalize dataset via Normalized Attendance Data Layer
    // -----------------------------------------------------------------------
    progress('Fetching attendance records…', false);
    const dataset = await getVendorAttendanceExportData(request);
    progress('Fetching attendance records', true);

    // -----------------------------------------------------------------------
    // STEP 2: Validate export integrity before generating workbook
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // STEP 3: Build the XLSX workbook
    // -----------------------------------------------------------------------
    const sheets = options.sheets ?? [
      'attendance', 'mr_report', 'ot_report', 'reconciliation', 'exceptions'
    ];
    const includeCover = options.includeCover !== false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR — Workforce Operations Engine v3.0';
    wb.lastModifiedBy = request.generatedBy;
    wb.created = new Date();
    wb.modified = new Date();

    const generatedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    // Palette: Joy Emerald & Compliance Slate
    const EMERALD = '047857';
    const HEADER_BG = '064E3B';
    const ALT_ROW = 'F0FDF4';
    const WHITE = 'FFFFFF';
    const BORDER_COLOR = 'D1D5DB';

    const makeHeaderStyle = (bg = HEADER_BG): Partial<ExcelJS.Style> => ({
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
      font: { bold: true, color: { argb: `FF${WHITE}` }, size: 9, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
        right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      },
    });

    const makeCellStyle = (alt = false): Partial<ExcelJS.Style> => ({
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? `FF${ALT_ROW}` : `FF${WHITE}` } },
      font: { size: 9, name: 'Calibri' },
      border: {
        top: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
        bottom: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
        left: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
        right: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
      },
    });

    // -----------------------------------------------------------------------
    // 00_Cover
    // -----------------------------------------------------------------------
    if (includeCover) {
      progress('Building cover sheet…', false);
      buildVendorCoverSheet(wb, request, dataset, generatedAt, EMERALD, WHITE);
      progress('Building cover sheet', true);
    }

    // -----------------------------------------------------------------------
    // 01_Attendance — daily grain: employee + attendance_date
    // -----------------------------------------------------------------------
    if (sheets.includes('attendance')) {
      progress('Building attendance sheet…', false);
      buildAttendanceSheet(wb, dataset.attendanceRecords, makeHeaderStyle, makeCellStyle);
      progress('Building attendance sheet', true);
    }

    // -----------------------------------------------------------------------
    // 02_MR_Report — monthly grain: one row per employee (44 workers preserved)
    // -----------------------------------------------------------------------
    if (sheets.includes('mr_report')) {
      progress('Building MR Report…', false);
      buildMRReportSheet(wb, dataset.mrReport, makeHeaderStyle, makeCellStyle);
      progress('Building MR Report', true);
    }

    // -----------------------------------------------------------------------
    // 03_OT_Report — daily OT matrix across period dates
    // -----------------------------------------------------------------------
    if (sheets.includes('ot_report')) {
      progress('Calculating OT…', false);
      const period: AttendancePeriod = {
        id: `${request.periodStart}_${request.periodEnd}`,
        label: request.periodLabel,
        from_date: request.periodStart,
        to_date: request.periodEnd,
        period_type: 'ATTENDANCE_CYCLE',
      };
      buildOTReportSheet(wb, dataset.otMatrix, period, makeHeaderStyle, makeCellStyle);
      progress('Calculating OT', true);
    }

    // -----------------------------------------------------------------------
    // 04_Reconciliation — Attendance ↔ MR ↔ OT
    // -----------------------------------------------------------------------
    if (sheets.includes('reconciliation')) {
      progress('Running reconciliation…', false);
      buildReconciliationSheet(wb, dataset.reconciliation, makeHeaderStyle, makeCellStyle);
      progress('Running reconciliation', true);
    }

    // -----------------------------------------------------------------------
    // 05_Exceptions — punches, approvals, and NO ATTENDANCE
    // -----------------------------------------------------------------------
    if (sheets.includes('exceptions')) {
      buildExceptionsSheet(wb, dataset.exceptions, makeHeaderStyle, makeCellStyle);
    }

    // -----------------------------------------------------------------------
    // Generate filename and trigger download
    // -----------------------------------------------------------------------
    progress('Generating XLSX…', false);

    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
    const period = request.periodStart.replace(/-/g, '') + '_' + request.periodEnd.replace(/-/g, '');
    const filename = `VENDOR_ATTENDANCE_PACK_${clean(request.vendorName)}_${period}.xlsx`;

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

    progress('Generating XLSX', true);

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

// ============================================================================
// SINGLE-SHEET EXPORT CONVENIENCE HELPERS
// ============================================================================
export async function exportVendorAttendanceSheetOnly(
  request: AttendanceExportRequest,
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  return exportVendorAttendanceXLSX(request, { sheets: ['attendance'], includeCover: false }, onProgress);
}

export async function exportVendorMRReportOnly(
  request: AttendanceExportRequest,
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  return exportVendorAttendanceXLSX(request, { sheets: ['mr_report'], includeCover: false }, onProgress);
}

export async function exportVendorOTReportOnly(
  request: AttendanceExportRequest,
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  return exportVendorAttendanceXLSX(request, { sheets: ['ot_report'], includeCover: false }, onProgress);
}

export async function exportVendorReconciliationOnly(
  request: AttendanceExportRequest,
  onProgress?: ExportProgressCallback
): Promise<VendorExportResult> {
  return exportVendorAttendanceXLSX(request, { sheets: ['reconciliation'], includeCover: false }, onProgress);
}

// ============================================================================
// SHEET BUILDERS
// ============================================================================

// ----------------------------------------------------------------------------
// 00_COVER — Client-ready, executive layout matching Section 5 and Section 18
// ----------------------------------------------------------------------------
function buildVendorCoverSheet(
  wb: ExcelJS.Workbook,
  request: AttendanceExportRequest,
  dataset: NormalizedAttendanceDataset,
  generatedAt: string,
  EMERALD: string,
  WHITE: string
) {
  const ws = wb.addWorksheet('00_Cover');
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 };
  ws.columns = [{ width: 4 }, { width: 30 }, { width: 38 }, { width: 4 }];

  const addTitle = (row: number, text: string, size: number, bold: boolean, color: string, bg?: string) => {
    const r = ws.getRow(row);
    r.height = size + 10;
    const cell = ws.getCell(`B${row}`);
    ws.mergeCells(`B${row}:C${row}`);
    cell.value = text;
    cell.style = {
      font: { bold, size, color: { argb: `FF${color}` }, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: bg ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } } : undefined,
    };
  };

  const addKV = (row: number, key: string, value: string | number) => {
    const r = ws.getRow(row);
    r.height = 18;
    const kc = ws.getCell(`B${row}`);
    const vc = ws.getCell(`C${row}`);
    kc.value = key;
    vc.value = value;
    kc.style = { font: { bold: true, size: 9, name: 'Calibri', color: { argb: 'FF374151' } } };
    vc.style = { font: { size: 9, name: 'Calibri', color: { argb: 'FF111827' } } };
  };

  const addDivider = (row: number) => {
    ws.getRow(row).height = 6;
    const cell = ws.getCell(`B${row}`);
    ws.mergeCells(`B${row}:C${row}`);
    cell.style = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${EMERALD}` } } };
  };

  addTitle(2, 'JOY PEOPLEHR', 18, true, EMERALD);
  addTitle(3, 'WORKFORCE OPERATIONS & VENDOR COMPLIANCE', 10, false, '6B7280');
  ws.getRow(4).height = 8;
  addTitle(5, 'VENDOR ATTENDANCE & OT RECONCILIATION PACK', 13, true, WHITE, EMERALD);
  addDivider(6);
  ws.getRow(7).height = 10;

  addKV(8,  'Company',        request.companyName);
  addKV(9,  'Vendor',         request.vendorName);
  addKV(10, 'Site',           request.siteName);
  addKV(11, 'Period',         request.periodLabel);
  addKV(12, 'Generated',      generatedAt);
  addKV(13, 'Generated By',   request.generatedBy);

  ws.getRow(14).height = 10;
  addDivider(15);
  ws.getRow(16).height = 10;

  addTitle(17, 'WORKFORCE SUMMARY', 10, true, WHITE, '1F2937');
  addKV(18, 'Total Workers',                dataset.totalWorkers);
  addKV(19, 'Employees with attendance',    dataset.workersWithAttendance);
  addKV(20, 'Attendance records',           dataset.attendanceRecordCount.toLocaleString());
  addKV(21, 'OT records',                   dataset.otMatrix.length);
  addKV(22, 'Exceptions',                   dataset.exceptions.length);

  ws.getRow(23).height = 10;
  addDivider(24);
  ws.getRow(25).height = 10;

  addTitle(26, 'AUTHORIZATION & SIGN-OFF', 10, true, WHITE, '1F2937');
  addKV(27, 'Prepared By',              '___________________________');
  addKV(28, 'Vendor Reviewed By',       '___________________________');
  addKV(29, 'Company HR Verified By',   '___________________________');
  addKV(30, 'Approved By',              '___________________________');

  ws.getRow(31).height = 12;
  addDivider(32);
  ws.getRow(33).height = 8;

  // Section 18: Audit EXPORT CONTROL Block
  addTitle(34, 'EXPORT CONTROL', 9, true, '065F46', 'ECFDF5');
  addKV(35, 'Source',                    'Vendor Attendance Submission');
  addKV(36, 'Vendor',                    request.vendorName);
  addKV(37, 'Company',                   request.companyName);
  addKV(38, 'Site',                      request.siteName);
  addKV(39, 'Period',                    request.periodLabel);
  addKV(40, 'Unique Workers',            dataset.totalWorkers);
  addKV(41, 'Workers With Attendance',   dataset.workersWithAttendance);
  addKV(42, 'Attendance Records',        dataset.attendanceRecordCount);
  addKV(43, 'MR Workers',                dataset.mrReport.length);
  addKV(44, 'OT Records',                dataset.otMatrix.length);
  addKV(45, 'Reconciliation',            dataset.integrity.reconciliationIssues === 0 ? 'MATCHED' : 'VARIANCE');
  addKV(46, 'Generated Timestamp',       generatedAt);
}

// ----------------------------------------------------------------------------
// 01_Attendance — daily grain: employee + attendance_date
// Columns match Section 6 of requirements
// ----------------------------------------------------------------------------
function buildAttendanceSheet(
  wb: ExcelJS.Workbook,
  records: VendorDailyAttendance[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('01_Attendance');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  ws.columns = [
    { header: 'S.No',              key: 'sno',       width: 6 },
    { header: 'Employee ID',       key: 'emp_id',    width: 14 },
    { header: 'Employee Name',     key: 'emp_name',  width: 22 },
    { header: 'Department',        key: 'dept',      width: 16 },
    { header: 'Category',          key: 'cat',       width: 12 },
    { header: 'Date',              key: 'date',      width: 12 },
    { header: 'Shift',             key: 'shift',     width: 10 },
    { header: '1st Half',          key: 'h1',        width: 10 },
    { header: '2nd Half',          key: 'h2',        width: 10 },
    { header: 'IN',                key: 'in',        width: 9 },
    { header: 'OUT',               key: 'out',       width: 9 },
    { header: 'Regular Hours',     key: 'reg',       width: 13 },
    { header: 'Late In (Min)',      key: 'late',      width: 12 },
    { header: 'Early Out (Min)',    key: 'early',     width: 13 },
    { header: 'OT Hours',          key: 'ot',        width: 10 },
    { header: 'Attendance Status', key: 'status',    width: 16 },
    { header: 'Source',            key: 'source',    width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'Q1' };

  records.forEach((rec, idx) => {
    const alt = idx % 2 === 1;
    const row = ws.addRow([
      idx + 1,
      rec.employee_id,
      rec.employee_name,
      rec.department,
      rec.category || 'Skilled',
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
      rec.attendance_status || 'APPROVED',
      rec.attendance_source || 'UPLOAD',
    ]);
    row.height = 16;
    row.eachCell((cell) => Object.assign(cell, { style: makeCellStyle(alt) }));
  });

  // Totals row at the bottom
  const n = records.length + 1;
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(3).value = `${records.length} Daily Records`;
  totalRow.getCell(12).value = { formula: `SUM(L2:L${n})` };
  totalRow.getCell(15).value = { formula: `SUM(O2:O${n})` };
  totalRow.height = 18;
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
    };
  });
}

// ----------------------------------------------------------------------------
// 02_MR_Report — monthly grain: one row per employee for the reporting period
// Columns match Section 7 of requirements (preserves 44 workers)
// ----------------------------------------------------------------------------
function buildMRReportSheet(
  wb: ExcelJS.Workbook,
  mrReport: VendorMRReportRecord[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('02_MR_Report');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  ws.columns = [
    { header: 'S.No',                     key: 'sno',    width: 6 },
    { header: 'EMP ID',                   key: 'id',     width: 14 },
    { header: 'EMPLOYEE NAME',            key: 'name',   width: 24 },
    { header: 'CATEGORY',                 key: 'cat',    width: 12 },
    { header: 'DEPARTMENT',               key: 'dept',   width: 16 },
    { header: 'PRESENT DAYS',             key: 'pres',   width: 13 },
    { header: 'NFH',                      key: 'nfh',    width: 8 },
    { header: 'W/OFF',                    key: 'woff',   width: 8 },
    { header: 'CL',                       key: 'cl',     width: 7 },
    { header: 'PL',                       key: 'pl',     width: 7 },
    { header: 'LOP',                      key: 'lop',    width: 7 },
    { header: 'NO. OF SHIFTS (PRESENT)', key: 'shifts', width: 14 },
    { header: 'G.SHIFT',                  key: 'g',      width: 10 },
    { header: 'SHIFT I',                  key: 's1',     width: 9 },
    { header: 'SHIFT II',                 key: 's2',     width: 9 },
    { header: 'SHIFT III',                key: 's3',     width: 9 },
    { header: 'OT HOURS',                 key: 'ot',     width: 10 },
    { header: 'OT ≥4H',                   key: 'ot4',    width: 9 },
    { header: 'OT ≥8H W/OFF',             key: 'ot8',    width: 12 },
    { header: 'FA',                       key: 'fa',     width: 7 },
    { header: 'NA',                       key: 'na',     width: 7 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 30;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'U1' };

  mrReport.forEach((mr, idx) => {
    const alt = idx % 2 === 1;
    const isNoAttendance = mr.present_days === 0 && mr.weekly_off === 0 && mr.nfh === 0;

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
      mr.no_of_shifts_present,
      mr.general_shift,
      mr.shift_1,
      mr.shift_2,
      mr.shift_3,
      mr.ot_hours,
      mr.ot_gt_4hrs_count,
      mr.ot_gt_8hrs_on_woff,
      mr.fa || 0,
      mr.na || 0,
    ]);
    row.height = 16;
    row.eachCell((cell, colNum) => {
      const base = makeCellStyle(alt);
      if (isNoAttendance) {
        cell.style = {
          ...base,
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } },
        };
        if (colNum === 3) {
          cell.style = {
            ...cell.style,
            font: { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFB45309' } },
          };
        }
      } else {
        cell.style = base;
      }
    });
  });

  // Totals row at the bottom with formulas
  const n = mrReport.length + 1;
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(3).value = `${mrReport.length} Employees`;
  totalRow.getCell(6).value = { formula: `SUM(F2:F${n})` };
  totalRow.getCell(7).value = { formula: `SUM(G2:G${n})` };
  totalRow.getCell(8).value = { formula: `SUM(H2:H${n})` };
  totalRow.getCell(9).value = { formula: `SUM(I2:I${n})` };
  totalRow.getCell(10).value = { formula: `SUM(J2:J${n})` };
  totalRow.getCell(11).value = { formula: `SUM(K2:K${n})` };
  totalRow.getCell(12).value = { formula: `SUM(L2:L${n})` };
  totalRow.getCell(13).value = { formula: `SUM(M2:M${n})` };
  totalRow.getCell(14).value = { formula: `SUM(N2:N${n})` };
  totalRow.getCell(15).value = { formula: `SUM(O2:O${n})` };
  totalRow.getCell(16).value = { formula: `SUM(P2:P${n})` };
  totalRow.getCell(17).value = { formula: `SUM(Q2:Q${n})` };
  totalRow.getCell(18).value = { formula: `SUM(R2:R${n})` };
  totalRow.getCell(19).value = { formula: `SUM(S2:S${n})` };
  totalRow.getCell(20).value = { formula: `SUM(T2:T${n})` };
  totalRow.getCell(21).value = { formula: `SUM(U2:U${n})` };
  totalRow.height = 18;
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
    };
  });
}

// ----------------------------------------------------------------------------
// 03_OT_Report — daily OT matrix. Blank = no OT record (not 0)
// Columns match Section 8 of requirements
// ----------------------------------------------------------------------------
function buildOTReportSheet(
  wb: ExcelJS.Workbook,
  otMatrix: VendorOTMatrixRecord[],
  period: AttendancePeriod,
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('03_OT_Report');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  const dates = generateDateRange(period.from_date, period.to_date);

  const fixedCols = [
    { header: 'S.No',          key: 'sno',    width: 6 },
    { header: 'Employee ID',   key: 'id',     width: 14 },
    { header: 'Employee Name', key: 'name',   width: 22 },
    { header: 'Department',    key: 'dept',   width: 16 },
  ];
  const dateCols = dates.map((d) => ({
    header: formatDateShort(d), key: d, width: 7,
  }));
  const summaryCols = [
    { header: 'Total OT Hours',        key: 'tot',    width: 14 },
    { header: '≥4H Occurrences',        key: 'ot4',    width: 14 },
    { header: '≥8H W/OFF Occurrences',  key: 'ot8',    width: 16 },
    { header: 'Approval Status',        key: 'status', width: 14 },
  ];

  ws.columns = [...fixedCols, ...dateCols, ...summaryCols];

  const headerRow = ws.getRow(1);
  ws.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = String(col.header ?? '');
    cell.style = makeHeaderStyle(i >= 4 && i < 4 + dates.length ? '065F46' : undefined);
  });
  headerRow.height = 28;
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];

  otMatrix.forEach((emp, idx) => {
    const alt = idx % 2 === 1;
    const row = ws.addRow([]);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = emp.employee_id;
    row.getCell(3).value = emp.employee_name;
    row.getCell(4).value = emp.department;

    dates.forEach((d, di) => {
      const cell = row.getCell(5 + di);
      const ot = emp.daily_ot[d];
      // Blank means no OT record (do NOT turn blank into zero)
      if (ot !== undefined && ot !== null && ot > 0) {
        cell.value = ot;
      }
    });

    const summaryStart = 5 + dates.length;
    row.getCell(summaryStart).value = emp.total_ot_hours;
    row.getCell(summaryStart + 1).value = emp.ot_gt_4hrs_occurrences;
    row.getCell(summaryStart + 2).value = 0; // >=8H W/OFF occurrences
    row.getCell(summaryStart + 3).value = emp.approval_status || 'APPROVED';

    row.height = 16;
    row.eachCell((cell) => {
      if (!cell.style || !cell.style.fill) {
        Object.assign(cell, { style: makeCellStyle(alt) });
      }
    });
  });

  // Total row at bottom
  const n = otMatrix.length + 1;
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(3).value = `${otMatrix.length} Employees with OT`;
  const summaryStart = 5 + dates.length;
  totalRow.getCell(summaryStart).value = {
    formula: `SUM(${excelCol(summaryStart)}2:${excelCol(summaryStart)}${n})`,
  };
  totalRow.getCell(summaryStart + 1).value = {
    formula: `SUM(${excelCol(summaryStart + 1)}2:${excelCol(summaryStart + 1)}${n})`,
  };
  totalRow.height = 18;
  totalRow.eachCell((cell) => {
    cell.style = {
      font: { bold: true, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } },
    };
  });
}

// ----------------------------------------------------------------------------
// 04_Reconciliation — Proves Attendance ↔ MR ↔ OT exact match
// Columns match Section 9 of requirements
// ----------------------------------------------------------------------------
function buildReconciliationSheet(
  wb: ExcelJS.Workbook,
  reconciliation: AttendanceOTReconciliationRow[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('04_Reconciliation');
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  ws.columns = [
    { header: 'S.No',                   key: 'sno',      width: 6 },
    { header: 'Employee',               key: 'name',     width: 24 },
    { header: 'Employee ID',            key: 'id',       width: 14 },
    { header: 'Attendance Present Days', key: 'att_days', width: 18 },
    { header: 'MR Present Days',        key: 'mr_days',  width: 16 },
    { header: 'Present Variance',       key: 'p_var',    width: 14 },
    { header: 'Attendance OT Hours',    key: 'att_ot',   width: 16 },
    { header: 'OT Report Hours',        key: 'ot_rpt',   width: 14 },
    { header: 'OT Variance',            key: 'ot_var',   width: 12 },
    { header: 'Status',                 key: 'status',   width: 18 },
    { header: 'Notes',                  key: 'notes',    width: 44 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 28;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle() }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'K1' };

  reconciliation.forEach((row, idx) => {
    const alt = idx % 2 === 1;
    const isIssue = row.status !== 'MATCHED';
    const r = ws.addRow([
      idx + 1,
      row.employee_name,
      row.employee_id,
      row.attendance_present_days,
      row.mr_present_days,
      row.present_variance,
      row.attendance_ot_hours,
      row.ot_report_hours,
      row.ot_variance,
      row.status,
      row.notes || '',
    ]);
    r.height = 16;
    r.eachCell((cell, colNum) => {
      const base = makeCellStyle(alt);
      if (isIssue) {
        cell.style = {
          ...base,
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } },
        };
      } else {
        cell.style = base;
      }
      // Status column
      if (colNum === 10) {
        cell.style = {
          ...cell.style,
          font: { bold: true, size: 9, name: 'Calibri', color: { argb: isIssue ? 'FFB45309' : 'FF065F46' } },
        };
      }
      // Variance columns highlight
      if ((colNum === 6 || colNum === 9) && typeof cell.value === 'number' && cell.value !== 0) {
        cell.style = { ...cell.style, font: { bold: true, size: 9, name: 'Calibri', color: { argb: 'FFB91C1C' } } };
      }
    });
  });
}

// ----------------------------------------------------------------------------
// 05_Exceptions — Actual anomalies including NO ATTENDANCE RECORD
// Columns match Section 10 of requirements
// ----------------------------------------------------------------------------
function buildExceptionsSheet(
  wb: ExcelJS.Workbook,
  exceptions: AttendanceException[],
  makeHeaderStyle: (bg?: string) => Partial<ExcelJS.Style>,
  makeCellStyle: (alt?: boolean) => Partial<ExcelJS.Style>
) {
  const ws = wb.addWorksheet('05_Exceptions');
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

  ws.columns = [
    { header: 'Exception ID',  key: 'id',       width: 14 },
    { header: 'Type',          key: 'type',     width: 28 },
    { header: 'Employee ID',   key: 'emp',      width: 14 },
    { header: 'Employee',      key: 'name',     width: 24 },
    { header: 'Date',          key: 'date',     width: 16 },
    { header: 'Description',   key: 'desc',     width: 50 },
    { header: 'Severity',      key: 'sev',      width: 10 },
    { header: 'Source',        key: 'source',   width: 14 },
    { header: 'Resolved',      key: 'res',      width: 10 },
    { header: 'Resolution',    key: 'resnote',  width: 28 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = ws.columns.map((c) => String(c.header ?? ''));
  headerRow.height = 26;
  headerRow.eachCell((cell) => Object.assign(cell, { style: makeHeaderStyle('7C3AED') }));
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'J1' };

  if (exceptions.length === 0) {
    const noRow = ws.addRow(['—', 'No exceptions found for this period.', '', '', '', '', '', 'SYSTEM', 'Yes', 'Verified']);
    noRow.height = 18;
  } else {
    exceptions.forEach((exc, idx) => {
      const alt = idx % 2 === 1;
      const r = ws.addRow([
        exc.id,
        exc.exception_type.replace(/_/g, ' '),
        exc.employee_id || '—',
        exc.employee_name || '—',
        exc.attendance_date ? formatDateShort(exc.attendance_date) : '—',
        exc.description,
        exc.severity,
        'Attendance Engine',
        exc.resolved ? 'Yes' : 'No',
        exc.resolved_by || 'Pending Review',
      ]);
      r.height = 18;
      r.eachCell((cell) => {
        const base = makeCellStyle(alt);
        if (exc.severity === 'CRITICAL' || exc.severity === 'HIGH') {
          cell.style = { ...base, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } } };
        } else {
          cell.style = base;
        }
      });
    });
  }
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

// Convert 1-indexed column number to Excel column letters (1→A, 27→AA)
function excelCol(n: number): string {
  let s = '';
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
