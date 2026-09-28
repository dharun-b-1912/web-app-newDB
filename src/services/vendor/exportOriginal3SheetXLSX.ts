// src/services/vendor/exportOriginal3SheetXLSX.ts
// ============================================================================
// Joy PeopleHR — Exact 3-Sheet XLSX Recreator for JOY SEP IN & OUT.xlsx
// Generates a single Excel file with 3 sheets:
//   Sheet 1: IN&OUT     — 1,251 daily attendance records grouped by department
//   Sheet 2: MR REPORT   — 44 employees (43 active + S.No 31) with formula sums
//   Sheet 3: OT          — 31 employees across 31 dates with formula sums (1,346 OT hrs)
// ============================================================================

import ExcelJS from 'exceljs';
import {
  AttendanceMasterService,
  AttendanceReconciliationMaster,
} from './attendanceMasterService';

export interface Original3SheetExportOptions {
  companyName?: string;
  location?: string;
  periodLabel?: string;
  vendorName?: string;
}

export async function exportOriginalFormat3SheetsXLSX(
  options: Original3SheetExportOptions = {}
): Promise<{ success: boolean; filename: string; buffer: Uint8Array }> {
  const master = AttendanceMasterService.getActiveMaster();
  const companyName = options.companyName || master.companyInfo.companyName || 'WATERTEC (INDIA) PRIVATE LIMITED';
  const location = options.location || master.companyInfo.location || 'Coimbatore';
  const periodLabel = options.periodLabel || master.reportingPeriod.label || '26-Aug-2026 - To 25-Sep-2026';
  const vendorName = options.vendorName || master.vendorInfo.vendorName || 'JOY MANPOWER SERVICES';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Joy PeopleHR Universal Attendance Engine';
  wb.created = new Date();
  wb.properties.date1904 = false;

  const HEADER_BG = '064E3B';
  const HEADER_LIGHT = '047857';
  const ALT_ROW = 'F0FDF4';
  const BORDER_COLOR = 'D1D5DB';

  const headerStyle: Partial<ExcelJS.Style> = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_BG}` } },
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      bottom: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
    },
  };

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
    bottom: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
    left: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
    right: { style: 'hair', color: { argb: `FF${BORDER_COLOR}` } },
  };

  // =========================================================================
  // SHEET 1: IN&OUT
  // =========================================================================
  const inoutWs = wb.addWorksheet('IN&OUT');
  inoutWs.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  // Row 1-4: Header Block
  inoutWs.mergeCells('A1:M1');
  inoutWs.getCell('A1').value = companyName;
  inoutWs.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${HEADER_BG}` }, name: 'Calibri' };
  inoutWs.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  inoutWs.getRow(1).height = 24;

  inoutWs.mergeCells('A2:M2');
  inoutWs.getCell('A2').value = location;
  inoutWs.getCell('A2').font = { size: 10, color: { argb: 'FF374151' }, name: 'Calibri' };
  inoutWs.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  inoutWs.mergeCells('A3:M3');
  inoutWs.getCell('A3').value = `Attendance Report From ${periodLabel}`;
  inoutWs.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FF111827' }, name: 'Calibri' };
  inoutWs.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  inoutWs.mergeCells('A4:M4');
  inoutWs.getCell('A4').value = 'Form 25 B (see Rule 103-B)';
  inoutWs.getCell('A4').font = { italic: true, size: 9, color: { argb: 'FF6B7280' }, name: 'Calibri' };
  inoutWs.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 6: Column Headers
  const inoutCols = [
    { header: 'S.No', width: 6 },
    { header: 'Employee No', width: 14 },
    { header: 'Name', width: 24 },
    { header: 'Date', width: 12 },
    { header: 'Shift', width: 8 },
    { header: '1st Half', width: 9 },
    { header: '2nd Half', width: 9 },
    { header: 'IN', width: 9 },
    { header: 'OUT', width: 9 },
    { header: 'Late IN(Min)', width: 13 },
    { header: 'Early Out(Min)', width: 14 },
    { header: 'Total Hours', width: 12 },
    { header: 'OT Hours', width: 10 },
  ];

  const inoutHeaderRow = inoutWs.getRow(6);
  inoutHeaderRow.height = 26;
  inoutCols.forEach((col, idx) => {
    const cell = inoutHeaderRow.getCell(idx + 1);
    cell.value = col.header;
    cell.style = headerStyle;
    inoutWs.getColumn(idx + 1).width = col.width;
  });

  inoutWs.views = [{ state: 'frozen', xSplit: 0, ySplit: 6 }];

  // Group records by Department
  const depts = Array.from(new Set(master.masterRecords.map((r) => r.department || 'General')));
  let currentInoutRow = 7;
  let inoutSno = 1;

  for (const dept of depts) {
    const deptRecords = master.masterRecords.filter((r) => (r.department || 'General') === dept);
    if (deptRecords.length === 0) continue;

    // Department banner row
    inoutWs.mergeCells(`A${currentInoutRow}:M${currentInoutRow}`);
    const bannerCell = inoutWs.getCell(`A${currentInoutRow}`);
    bannerCell.value = `Department: ${dept.toUpperCase()}`;
    bannerCell.font = { bold: true, size: 10, color: { argb: `FF${HEADER_BG}` }, name: 'Calibri' };
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
    inoutWs.getRow(currentInoutRow).height = 20;
    currentInoutRow++;

    deptRecords.forEach((rec, idx) => {
      const row = inoutWs.getRow(currentInoutRow);
      row.height = 17;
      const alt = idx % 2 === 1;

      const dateStr = rec.attendance_date.includes('-')
        ? rec.attendance_date
        : `${rec.attendance_date.slice(6, 8)}-${rec.attendance_date.slice(4, 6)}-${rec.attendance_date.slice(0, 4)}`;

      // Derive status from actual half-day status codes (A=Absent, WO=Weekly Off, OD=On Duty, P=Present)
      const getHalfStatus = (rec: any): string => {
        const s1 = String(rec.first_half_status || '').toUpperCase();
        const s2 = String(rec.second_half_status || '').toUpperCase();
        if (s1 === 'WO' || s2 === 'WO') return 'WO';
        if (s1 === 'OD' || s2 === 'OD') return 'OD';
        if (s1 === 'A' && s2 === 'A') return 'A';
        if (s1 === 'LOP' || s2 === 'LOP') return 'A';
        if (s1 === 'NFH') return 'NFH';
        if (s1 === 'CL' || s2 === 'CL') return 'CL';
        if (s1 === 'PL' || s2 === 'PL') return 'PL';
        if (s1 === 'P' || s1 === 'WP' || s2 === 'P' || s2 === 'WP') return 'P';
        return rec.present ? 'P' : 'A';
      };
      const halfStatus = getHalfStatus(rec);

      row.getCell(1).value = inoutSno++;
      row.getCell(2).value = rec.employee_id;
      row.getCell(3).value = rec.employee_name;
      row.getCell(4).value = dateStr;
      row.getCell(5).value = rec.shift_code || 'G1';
      row.getCell(6).value = String(rec.first_half_status || halfStatus);
      row.getCell(7).value = String(rec.second_half_status || halfStatus);
      row.getCell(8).value = rec.in_time || '—';
      row.getCell(9).value = rec.out_time || '—';
      row.getCell(10).value = '';
      row.getCell(11).value = '';
      row.getCell(12).value = rec.regular_hours > 0 ? rec.regular_hours.toFixed(2) : '—';
      row.getCell(13).value = rec.ot_hours > 0 ? rec.ot_hours.toFixed(2) : '';

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c);
        cell.font = { size: 9, name: 'Calibri' };
        cell.border = cellBorder;
        if (alt) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ALT_ROW}` } };
        }
        if ([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
      currentInoutRow++;
    });
  }

  // =========================================================================
  // SHEET 2: MR REPORT (44 Employees, S.No 1-44, Row 51 SUM Formulas)
  // =========================================================================
  const mrWs = wb.addWorksheet('MR REPORT');
  mrWs.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  // Row 1-3: Header Block
  mrWs.mergeCells('A1:S1');
  mrWs.getCell('A1').value = companyName;
  mrWs.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${HEADER_BG}` }, name: 'Calibri' };
  mrWs.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  mrWs.getRow(1).height = 24;

  mrWs.mergeCells('A2:S2');
  mrWs.getCell('A2').value = location;
  mrWs.getCell('A2').font = { size: 10, color: { argb: 'FF374151' }, name: 'Calibri' };
  mrWs.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  mrWs.mergeCells('A3:S3');
  mrWs.getCell('A3').value = `Attendance Details From ${periodLabel}`;
  mrWs.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FF111827' }, name: 'Calibri' };
  mrWs.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 6 & 7: Two-tier Headers matching JOY SEP IN & OUT.xlsx
  mrWs.mergeCells('A6:A7'); mrWs.getCell('A6').value = 'S.No';
  mrWs.mergeCells('B6:B7'); mrWs.getCell('B6').value = 'EMP ID';
  mrWs.mergeCells('C6:C7'); mrWs.getCell('C6').value = 'EMPLOYEE NAME';
  mrWs.mergeCells('D6:D7'); mrWs.getCell('D6').value = 'CATEGORY';
  mrWs.mergeCells('E6:E7'); mrWs.getCell('E6').value = 'DEPARTMENT';
  mrWs.mergeCells('F6:F7'); mrWs.getCell('F6').value = 'PRESENT DAYS';
  mrWs.mergeCells('G6:G7'); mrWs.getCell('G6').value = 'NFH';
  mrWs.mergeCells('H6:H7'); mrWs.getCell('H6').value = 'W/Off';
  mrWs.mergeCells('I6:I7'); mrWs.getCell('I6').value = 'CL';
  mrWs.mergeCells('J6:J7'); mrWs.getCell('J6').value = 'PL';
  mrWs.mergeCells('K6:K7'); mrWs.getCell('K6').value = 'LOP';

  mrWs.mergeCells('L6:O6'); mrWs.getCell('L6').value = 'NO.OF SHIFTS PER MONTH (PRESENT)';
  mrWs.getCell('L7').value = 'G.SHIFT';
  mrWs.getCell('M7').value = 'SHIFT I';
  mrWs.getCell('N7').value = 'SHIFT II';
  mrWs.getCell('O7').value = 'SHIFT III';

  mrWs.mergeCells('P6:P7'); mrWs.getCell('P6').value = 'OVERTIME';
  mrWs.mergeCells('Q6:Q7'); mrWs.getCell('Q6').value = 'NO.OF DAYS WORKED OVERTIME MORE THAN 4 HRS & 8 HRS IN W/OFF';
  mrWs.getCell('R7').value = 'FA';
  mrWs.getCell('S7').value = 'NA';

  // Apply header styles to rows 6 & 7
  [6, 7].forEach((rNum) => {
    const row = mrWs.getRow(rNum);
    row.height = 20;
    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.style = headerStyle;
    }
  });

  const mrColWidths = [6, 12, 24, 20, 16, 12, 7, 8, 6, 6, 7, 10, 10, 10, 10, 12, 22, 8, 8];
  mrColWidths.forEach((w, i) => { mrWs.getColumn(i + 1).width = w; });
  mrWs.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

  // Rows 8 to 51: All 44 employees
  master.mrReportRecords.forEach((rec, idx) => {
    const rowNum = idx + 8;
    const row = mrWs.getRow(rowNum);
    row.height = 17;
    const alt = idx % 2 === 1;
    const isInactive = rec.present_days === 0 && rec.weekly_off === 0;

    row.getCell(1).value = rec.sno;
    row.getCell(2).value = rec.employee_id;
    row.getCell(3).value = rec.employee_name;
    row.getCell(4).value = rec.category || vendorName;
    row.getCell(5).value = rec.department;
    row.getCell(6).value = rec.present_days;
    row.getCell(7).value = rec.nfh;
    row.getCell(8).value = rec.weekly_off;
    row.getCell(9).value = rec.cl;
    row.getCell(10).value = rec.pl;
    row.getCell(11).value = rec.lop;
    row.getCell(12).value = rec.general_shift;
    row.getCell(13).value = rec.shift_1;
    row.getCell(14).value = rec.shift_2;
    row.getCell(15).value = rec.shift_3;
    row.getCell(16).value = rec.ot_hours;
    row.getCell(17).value = rec.ot_gt_4hrs_count;
    row.getCell(18).value = rec.fa || 0;
    row.getCell(19).value = rec.na || 0;

    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.font = { size: 9, name: 'Calibri' };
      cell.border = cellBorder;

      if (isInactive) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      } else if (alt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ALT_ROW}` } };
      }

      if (c === 3 || c === 4 || c === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // Row 52: Totals Row with real Excel formulas (employees occupy rows 8 to 51)
  const mrTotalRow = mrWs.getRow(52);
  const mrLastDataRow = 8 + master.mrReportRecords.length - 1;
  const totalOtHours = master.stats.totalOtHours;
  const totalPresentDays = master.stats.totalPresentDays;
  const totalWeeklyOff = master.stats.totalWeeklyOff;
  const totalLOP = master.stats.totalLOP;
  const totalOtEntries = master.stats.totalOtEntries;

  mrTotalRow.height = 20;
  mrTotalRow.getCell(1).value = 'TOTAL';
  mrTotalRow.getCell(3).value = `${master.mrReportRecords.length} Employees`;
  mrTotalRow.getCell(6).value = { formula: `SUM(F8:F${mrLastDataRow})`, result: totalPresentDays };
  mrTotalRow.getCell(7).value = { formula: `SUM(G8:G${mrLastDataRow})`, result: 0 };
  mrTotalRow.getCell(8).value = { formula: `SUM(H8:H${mrLastDataRow})`, result: totalWeeklyOff };
  mrTotalRow.getCell(9).value = { formula: `SUM(I8:I${mrLastDataRow})`, result: 0 };
  mrTotalRow.getCell(10).value = { formula: `SUM(J8:J${mrLastDataRow})`, result: 0 };
  mrTotalRow.getCell(11).value = { formula: `SUM(K8:K${mrLastDataRow})`, result: totalLOP };
  mrTotalRow.getCell(12).value = { formula: `SUM(L8:L${mrLastDataRow})` };
  mrTotalRow.getCell(13).value = { formula: `SUM(M8:M${mrLastDataRow})` };
  mrTotalRow.getCell(14).value = { formula: `SUM(N8:N${mrLastDataRow})` };
  mrTotalRow.getCell(15).value = { formula: `SUM(O8:O${mrLastDataRow})` };
  mrTotalRow.getCell(16).value = { formula: `SUM(P8:P${mrLastDataRow})`, result: totalOtHours };
  mrTotalRow.getCell(17).value = { formula: `SUM(Q8:Q${mrLastDataRow})`, result: totalOtEntries };
  mrTotalRow.getCell(18).value = { formula: `SUM(R8:R${mrLastDataRow})` };
  mrTotalRow.getCell(19).value = { formula: `SUM(S8:S${mrLastDataRow})` };

  for (let c = 1; c <= 19; c++) {
    const cell = mrTotalRow.getCell(c);
    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: `FF${HEADER_BG}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${HEADER_LIGHT}` } },
      bottom: { style: 'double', color: { argb: `FF${HEADER_LIGHT}` } },
      left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // =========================================================================
  // SHEET 3: OT (31 Employees, 31 Date Columns, Row 38 Formula Sum = 1,346)
  // =========================================================================
  const otWs = wb.addWorksheet('OT');
  otWs.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 };

  // Row 1-3: Header Block
  otWs.mergeCells('A1:AM1');
  otWs.getCell('A1').value = companyName;
  otWs.getCell('A1').font = { bold: true, size: 14, color: { argb: `FF${HEADER_BG}` }, name: 'Calibri' };
  otWs.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  otWs.getRow(1).height = 24;

  otWs.mergeCells('A2:AM2');
  otWs.getCell('A2').value = location;
  otWs.getCell('A2').font = { size: 10, color: { argb: 'FF374151' }, name: 'Calibri' };
  otWs.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  otWs.mergeCells('A3:AM3');
  otWs.getCell('A3').value = `Over Time Report From ${periodLabel}`;
  otWs.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FF111827' }, name: 'Calibri' };
  otWs.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // 31 dates: 26, 27, 28, 29, 30, 31, 1, 2... 25
  const cycleDays = [26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

  const otFixedCols = [
    { header: 'S.No', width: 6 },
    { header: 'EMP ID', width: 12 },
    { header: 'EMPLOYEE NAME', width: 24 },
    { header: 'CATEGORY', width: 22 },
    { header: 'DEPARTMENT', width: 16 },
    { header: 'SUB-CATEGORY', width: 14 },
  ];

  const otHeaderRow = otWs.getRow(6);
  otHeaderRow.height = 26;
  otFixedCols.forEach((col, i) => {
    const cell = otHeaderRow.getCell(i + 1);
    cell.value = col.header;
    cell.style = headerStyle;
    otWs.getColumn(i + 1).width = col.width;
  });

  cycleDays.forEach((day, i) => {
    const colIdx = 7 + i;
    const cell = otHeaderRow.getCell(colIdx);
    cell.value = day;
    cell.style = headerStyle;
    otWs.getColumn(colIdx).width = 5;
  });

  const totalOtColIdx = 7 + cycleDays.length; // Column AL (38)
  const totalOtOccColIdx = totalOtColIdx + 1;  // Column AM (39)

  otHeaderRow.getCell(totalOtColIdx).value = 'TOTAL OT HR';
  otHeaderRow.getCell(totalOtColIdx).style = headerStyle;
  otWs.getColumn(totalOtColIdx).width = 14;

  otHeaderRow.getCell(totalOtOccColIdx).value = 'NO. OF TIMES OT - 4 HRS AND ABOVE';
  otHeaderRow.getCell(totalOtOccColIdx).style = headerStyle;
  otWs.getColumn(totalOtOccColIdx).width = 20;

  otWs.views = [{ state: 'frozen', xSplit: 6, ySplit: 6 }];

  // Rows 7 to 37: 31 employees with OT
  master.otMatrixRecords.forEach((emp, idx) => {
    const rowNum = idx + 7;
    const row = otWs.getRow(rowNum);
    row.height = 17;
    const alt = idx % 2 === 1;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = emp.employee_id;
    row.getCell(3).value = emp.employee_name;
    row.getCell(4).value = vendorName;
    row.getCell(5).value = emp.department;
    row.getCell(6).value = 'NA';

    // Map daily OT for the 31 dates
    cycleDays.forEach((day, di) => {
      const colIdx = 7 + di;
      const cell = row.getCell(colIdx);
      // match date by day number in daily_ot keys
      const matchingDateKey = Object.keys(emp.daily_ot || {}).find((dKey) => {
        const parts = dKey.split('-');
        const dayPart = parseInt(parts[parts.length - 1], 10);
        return dayPart === day;
      });
      const val = matchingDateKey ? emp.daily_ot[matchingDateKey] : undefined;
      if (val !== undefined && val !== null && val > 0) {
        cell.value = val;
      }
    });

    row.getCell(totalOtColIdx).value = emp.total_ot_hours;
    row.getCell(totalOtOccColIdx).value = emp.ot_gt_4hrs_occurrences;

    for (let c = 1; c <= totalOtOccColIdx; c++) {
      const cell = row.getCell(c);
      cell.font = { size: 9, name: 'Calibri' };
      cell.border = cellBorder;
      if (alt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ALT_ROW}` } };
      }
      if (c === 3 || c === 4 || c === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
  });

  // Row 38+: Totals with real formulas computed from actual data
  const otLastDataRow = 7 + master.otMatrixRecords.length - 1;
  const computedTotalOt = master.otMatrixRecords.reduce((s, r) => s + r.total_ot_hours, 0);
  const computedTotalOtOcc = master.otMatrixRecords.reduce((s, r) => s + r.ot_gt_4hrs_occurrences, 0);
  const otTotalRowNum = otLastDataRow + 1;
  const otTotalRow = otWs.getRow(otTotalRowNum);
  otTotalRow.height = 20;
  otTotalRow.getCell(1).value = 'TOTAL';
  otTotalRow.getCell(totalOtColIdx).value = { formula: `SUM(AL7:AL${otLastDataRow})`, result: computedTotalOt };
  otTotalRow.getCell(totalOtOccColIdx).value = { formula: `SUM(AM7:AM${otLastDataRow})`, result: computedTotalOtOcc };

  for (let c = 1; c <= totalOtOccColIdx; c++) {
    const cell = otTotalRow.getCell(c);
    cell.font = { bold: true, size: 9, name: 'Calibri', color: { argb: `FF${HEADER_BG}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${HEADER_LIGHT}` } },
      bottom: { style: 'double', color: { argb: `FF${HEADER_LIGHT}` } },
      left: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
      right: { style: 'thin', color: { argb: `FF${BORDER_COLOR}` } },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Generate buffer
  const rawBuffer = await wb.xlsx.writeBuffer();
  const buffer = new Uint8Array(rawBuffer);

  const filename = AttendanceMasterService.generateExportFilename('DITTO_3_SHEET');

  return { success: true, filename, buffer };
}
