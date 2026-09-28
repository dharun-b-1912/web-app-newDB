// src/services/vendor/reportEngine/attendanceSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 01: Professional Attendance Report Builder
// Pure Excel Table, 1st Half/2nd Half, Formula Totals, Freeze Panes & Print Setup
// ============================================================================

import ExcelJS from 'exceljs';
import { VendorDailyAttendance, HALF_DAY_LABELS } from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, KpiCardItem } from './types';
import { HeaderBuilder } from './headerBuilder';
import { COLORS, FONTS, BORDERS, NUM_FMTS, ALIGN, applyPrintSetup } from './excelStyles';

export class AttendanceSheetBuilder {
  /**
   * Translates half-day database codes to clean operational labels (Never expose S1/S2)
   */
  static formatHalfDay(val?: string): string {
    if (!val) return '—';
    const clean = val.toUpperCase().trim();
    if (clean === 'P') return 'Present';
    if (clean === 'A') return 'Absent';
    if (clean === 'WO') return 'Weekly Off';
    if (clean === 'H' || clean === 'NFH') return 'Holiday';
    if (clean === 'CL') return 'Casual Leave';
    if (clean === 'PL') return 'Privilege Leave';
    if (clean === 'LOP') return 'Loss of Pay';
    if (clean === 'HD') return 'Half Day';
    if (clean === 'WFH') return 'Work From Home';
    if (clean === 'OD') return 'On Duty';
    if (clean === 'WP') return 'Weekly Present';
    if (clean === 'MP') return 'Missing Punch';
    return HALF_DAY_LABELS[clean as any] || clean;
  }

  /**
   * Formats attendance status to professional business labels
   */
  static formatStatus(status?: string): string {
    if (!status) return 'Not Marked';
    const s = status.toUpperCase().trim();
    if (s === 'PRESENT') return 'Present';
    if (s === 'ABSENT') return 'Absent';
    if (s === 'LEAVE') return 'Leave';
    if (s === 'WEEKLY_OFF' || s === 'WEEKLY OFF' || s === 'WO') return 'Weekly Off';
    if (s === 'HOLIDAY') return 'Holiday';
    if (s === 'HALF_DAY' || s === 'HALF DAY') return 'Half Day';
    if (s === 'WFH') return 'WFH';
    if (s === 'APPROVED') return 'Approved';
    if (s === 'VERIFIED') return 'Verified';
    if (s === 'SUBMITTED') return 'Submitted';
    if (s === 'DRAFT') return 'Draft';
    if (s === 'REJECTED') return 'Rejected';
    return status;
  }

  static build(
    wb: ExcelJS.Workbook,
    attendance: VendorDailyAttendance[],
    config: CompanyBrandingConfig
  ): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('01_Attendance');
    const TOTAL_COLS = 17;

    // 1. KPI Calculations
    const uniqueEmployees = new Set(attendance.map((a) => a.employee_id || a.employee_code));
    const totalRecords = attendance.length;
    let presentHalves = 0;
    let absentHalves = 0;
    let leaveHalves = 0;
    let woHalves = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let totalWorked = 0;
    let totalOt = 0;

    attendance.forEach((r) => {
      const s1 = (r.first_half_status || '').toUpperCase();
      const s2 = (r.second_half_status || '').toUpperCase();

      const isP = (s: string) => s === 'P' || s === 'WP' || s === 'OD' || s === 'WFH';
      const isL = (s: string) => s === 'CL' || s === 'PL' || s === 'LOP' || s === 'L';
      const isW = (s: string) => s === 'WO';
      const isA = (s: string) => s === 'A';

      if (isP(s1)) presentHalves += 0.5;
      if (isP(s2)) presentHalves += 0.5;
      if (isL(s1)) leaveHalves += 0.5;
      if (isL(s2)) leaveHalves += 0.5;
      if (isW(s1)) woHalves += 0.5;
      if (isW(s2)) woHalves += 0.5;
      if (isA(s1)) absentHalves += 0.5;
      if (isA(s2)) absentHalves += 0.5;

      if ((r.late_minutes || 0) > 0) lateCount++;
      if ((r.early_out_minutes || 0) > 0) earlyCount++;
      totalWorked += r.worked_hours || 0;
      totalOt += r.ot_hours || 0;
    });

    const kpis: KpiCardItem[] = [
      { label: 'Total Workers', value: uniqueEmployees.size.toLocaleString() },
      { label: 'Attendance Records', value: totalRecords.toLocaleString() },
      { label: 'Present Days', value: presentHalves.toFixed(1) },
      { label: 'Absent Days', value: absentHalves.toFixed(1) },
      { label: 'Leave Days', value: leaveHalves.toFixed(1) },
      { label: 'Weekly Off', value: woHalves.toFixed(1) },
      { label: 'Late Arrivals', value: lateCount.toLocaleString() },
      { label: 'Early Outs', value: earlyCount.toLocaleString() },
      { label: 'Total Worked (Hrs)', value: totalWorked.toFixed(2) },
      { label: 'Total Overtime (Hrs)', value: totalOt.toFixed(2) },
    ];

    // 2. Render Header Area
    let nextRow = HeaderBuilder.renderCorporateHeader(
      ws,
      {
        sheetTitle: 'ATTENDANCE REPORT (DAILY PUNCHES & WORKING HOURS)',
        sheetCode: '01_Attendance',
        config,
        hasRecords: totalRecords > 0,
      },
      TOTAL_COLS
    );

    // 3. Render KPI Summary Cards (Split into 2 rows of 5 cards for optimal readability)
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(0, 5), TOTAL_COLS);
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(5), TOTAL_COLS);

    // 4. Render Empty State Banner if no records
    if (totalRecords === 0) {
      nextRow = HeaderBuilder.renderEmptyStateBanner(
        ws,
        nextRow,
        {
          sheetTitle: 'ATTENDANCE REPORT',
          sheetCode: '01_Attendance',
          config,
          hasRecords: false,
        },
        TOTAL_COLS
      );
    }

    // 5. Prepare Table Rows
    const tableHeaderRow = nextRow;
    let tableRows: any[][] = [];

    if (totalRecords > 0) {
      tableRows = attendance.map((rec, idx) => [
        idx + 1,
        rec.employee_code || '—',
        rec.employee_name || '—',
        rec.department || '—',
        rec.attendance_date || '—',
        rec.shift_name || '—',
        AttendanceSheetBuilder.formatHalfDay(rec.first_half_status),
        AttendanceSheetBuilder.formatHalfDay(rec.second_half_status),
        rec.check_in || '—',
        rec.check_out || '—',
        rec.late_minutes || 0,
        rec.early_out_minutes || 0,
        Math.round((rec.worked_hours || 0) * 100) / 100,
        Math.round((rec.ot_hours || 0) * 100) / 100,
        AttendanceSheetBuilder.formatStatus(rec.attendance_status),
        (rec.ot_hours || 0) > 0 ? (rec.attendance_status === 'APPROVED' ? 'Approved' : 'Pending') : 'None',
        rec.verification_status === 'DISPUTED' ? 'Disputed Record' : '',
      ]);
    } else {
      // Clean blank structural row for 0-records state
      tableRows = [[
        1, '—', 'No attendance records logged for current period', '—', config.from_date, '—',
        '—', '—', '—', '—', 0, 0, 0, 0, 'No Records', '—', 'Zero Activity',
      ]];
    }

    // 6. Add Real Excel Table
    ws.addTable({
      name: 'AttendanceTable',
      ref: `A${tableHeaderRow}`,
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: [
        { name: 'S.No', filterButton: true },
        { name: 'Employee No', filterButton: true, totalsRowLabel: 'TOTAL' },
        { name: 'Employee Name', filterButton: true },
        { name: 'Department', filterButton: true },
        { name: 'Date', filterButton: true },
        { name: 'Shift', filterButton: true },
        { name: '1st Half', filterButton: true },
        { name: '2nd Half', filterButton: true },
        { name: 'IN', filterButton: true },
        { name: 'OUT', filterButton: true },
        { name: 'Late In (Min)', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Early Out (Min)', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Total Hours', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT Hours', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Attendance Status', filterButton: true },
        { name: 'OT Status', filterButton: true },
        { name: 'Remarks', filterButton: true },
      ],
      rows: tableRows,
    });

    // 7. Format Table Rows & Columns
    const dataStartRow = tableHeaderRow + 1;
    const dataEndRow = dataStartRow + tableRows.length - 1;
    const totalsRow = dataEndRow + 1;

    // Table Header Row Style
    ws.getRow(tableHeaderRow).height = 24;
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(tableHeaderRow, c);
      cell.font = FONTS.TABLE_HEADER;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
      cell.alignment = ALIGN.HEADER;
      cell.border = BORDERS.TABLE_HEADER;
    }

    // Data Rows Styling
    for (let r = dataStartRow; r <= dataEndRow; r++) {
      ws.getRow(r).height = 19;
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = ws.getCell(r, c);
        cell.font = FONTS.DATA_REGULAR;
        cell.border = BORDERS.TABLE_CELL;

        // Alignment & number formatting per column
        if (c === 1 || c === 2 || c === 5 || c === 6 || c === 7 || c === 8 || c === 9 || c === 10 || c === 15 || c === 16) {
          cell.alignment = ALIGN.CENTER;
        } else if (c === 11 || c === 12) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.COUNT;
        } else if (c === 13 || c === 14) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.HOURS;
        } else {
          cell.alignment = ALIGN.LEFT;
        }

        // Soft highlight for OT
        if (c === 14 && typeof cell.value === 'number' && cell.value >= 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_AMBER_BG } };
          cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_AMBER_FG } };
        }
      }
    }

    // Totals Row Styling
    ws.getRow(totalsRow).height = 22;
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(totalsRow, c);
      cell.font = FONTS.TOTALS_ROW;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FILL_TOTAL_ROW } };
      cell.border = BORDERS.TOTAL_ROW;
      if (c === 11 || c === 12) cell.numFmt = NUM_FMTS.COUNT;
      if (c === 13 || c === 14) cell.numFmt = NUM_FMTS.HOURS;
    }

    // 8. Sign-off Section
    HeaderBuilder.renderApprovalSection(ws, totalsRow + 1, TOTAL_COLS);

    // 9. Freeze Panes: keep headers visible when scrolling
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: tableHeaderRow }];

    // 10. Column Widths
    const colWidths = [
      6,   // S.No
      15,  // Employee No
      24,  // Employee Name
      18,  // Department
      13,  // Date
      10,  // Shift
      14,  // 1st Half
      14,  // 2nd Half
      10,  // IN
      10,  // OUT
      14,  // Late In (Min)
      14,  // Early Out (Min)
      13,  // Total Hours
      12,  // OT Hours
      16,  // Attendance Status
      14,  // OT Status
      22,  // Remarks
    ];
    colWidths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // 11. Print Setup
    applyPrintSetup(ws, {
      orientation: 'landscape',
      printTitlesRow: `${tableHeaderRow}:${tableHeaderRow}`,
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Attendance Report',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
