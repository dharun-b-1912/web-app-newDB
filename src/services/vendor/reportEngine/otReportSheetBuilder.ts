// src/services/vendor/reportEngine/otReportSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 03: Overtime Reconciliation Matrix (Daily Grid)
// Matrix across date cycle, threshold counts (≥4H, ≥8H), dual freeze panes & print setup
// ============================================================================

import ExcelJS from 'exceljs';
import {
  VendorOTMatrixRecord,
  AttendancePeriod,
  VendorAttendanceEngineService,
} from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, KpiCardItem } from './types';
import { HeaderBuilder } from './headerBuilder';
import { COLORS, FONTS, BORDERS, NUM_FMTS, ALIGN, applyPrintSetup } from './excelStyles';

export class OTReportSheetBuilder {
  static build(
    wb: ExcelJS.Workbook,
    otMatrix: VendorOTMatrixRecord[],
    period: AttendancePeriod,
    config: CompanyBrandingConfig
  ): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('03_OT_Report');

    // 1. Generate date range
    const fromDate = period?.from_date || config.period_from || '2026-08-26';
    const toDate = period?.to_date || config.period_to || '2026-09-25';
    const dates = VendorAttendanceEngineService.generateDateRange(fromDate, toDate);
    const dateLabels = dates.map((d) => VendorAttendanceEngineService.formatDateShort(d));

    // Columns structure:
    // Col 1: Employee ID
    // Col 2: Employee Name
    // Col 3: Department
    // Col 4 to (3 + dates.length): Date columns
    // Then: Total OT Hours, OT ≥ 4H Count, OT ≥ 8H W/Off Count, Approval Status
    const FIXED_COLS_COUNT = 3;
    const TOTAL_COLS = FIXED_COLS_COUNT + dates.length + 4;

    // 2. Summary KPI calculations
    const totalEmployees = otMatrix.length;
    const employeesWithOt = otMatrix.filter((e) => (e.total_ot_hours || 0) > 0).length;
    const totalOtHours = otMatrix.reduce((sum, e) => sum + (e.total_ot_hours || 0), 0);
    const ot4Count = otMatrix.reduce((sum, e) => sum + (e.ot_gt_4hrs_occurrences || 0), 0);
    const approvedOt = otMatrix.filter((e) => e.approval_status === 'APPROVED').reduce((s, e) => s + e.total_ot_hours, 0);
    const pendingOt = totalOtHours - approvedOt;

    const kpis: KpiCardItem[] = [
      { label: 'Total Workers', value: totalEmployees.toLocaleString() },
      { label: 'Workers with Overtime', value: employeesWithOt.toLocaleString() },
      { label: 'Total OT Hours', value: totalOtHours.toFixed(2) },
      { label: 'Approved OT Hours', value: approvedOt.toFixed(2) },
      { label: 'Pending Review OT', value: pendingOt.toFixed(2) },
      { label: 'OT ≥ 4H Occurrences', value: ot4Count.toLocaleString() },
    ];

    // 3. Render Header Area
    let nextRow = HeaderBuilder.renderCorporateHeader(
      ws,
      {
        sheetTitle: 'OVERTIME RECONCILIATION REPORT (DAILY CYCLE MATRIX)',
        sheetCode: '03_OT_Report',
        config,
        hasRecords: totalEmployees > 0,
      },
      TOTAL_COLS
    );

    // 4. Render Pre-Table KPI Cards
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis, TOTAL_COLS);

    // 5. Render Empty State Banner if no records
    if (totalEmployees === 0) {
      nextRow = HeaderBuilder.renderEmptyStateBanner(
        ws,
        nextRow,
        {
          sheetTitle: 'OVERTIME REPORT',
          sheetCode: '03_OT_Report',
          config,
          hasRecords: false,
        },
        TOTAL_COLS
      );
    }

    // 6. Build Table Headers & Columns
    const tableHeaderRow = nextRow;
    const tableColumns: { name: string; filterButton?: boolean; totalsRowLabel?: string; totalsRowFunction?: 'sum' | 'count' }[] = [
      { name: 'Employee ID', filterButton: true, totalsRowLabel: 'DAILY TOTAL' },
      { name: 'Employee Name', filterButton: true },
      { name: 'Department', filterButton: true },
    ];

    dates.forEach((d, idx) => {
      tableColumns.push({
        name: dateLabels[idx],
        filterButton: false,
        totalsRowFunction: 'sum',
      });
    });

    tableColumns.push(
      { name: 'Total OT Hours', filterButton: true, totalsRowFunction: 'sum' },
      { name: 'OT ≥ 4H Count', filterButton: true, totalsRowFunction: 'sum' },
      { name: 'OT ≥ 8H W/Off Count', filterButton: true, totalsRowFunction: 'sum' },
      { name: 'Approval Status', filterButton: true }
    );

    // 7. Build Rows
    let tableRows: any[][] = [];

    if (totalEmployees > 0) {
      tableRows = otMatrix.map((emp) => {
        const row: any[] = [
          emp.employee_code || emp.employee_id || '—',
          emp.employee_name || '—',
          emp.department || '—',
        ];

        let count8hWoff = 0;
        dates.forEach((d) => {
          const val = emp.daily_ot[d];
          // Per spec: blank = no OT, not zero
          if (val != null && val > 0) {
            const roundedVal = Math.round(val * 100) / 100;
            row.push(roundedVal);
            if (roundedVal >= 8) count8hWoff++;
          } else {
            row.push(null); // blank cell
          }
        });

        row.push(Math.round((emp.total_ot_hours || 0) * 100) / 100);
        row.push(emp.ot_gt_4hrs_occurrences || 0);
        row.push(count8hWoff);
        row.push(emp.approval_status || 'PENDING');

        return row;
      });
    } else {
      // Clean zero row
      const blankRow: any[] = ['—', 'No overtime records logged for current period', '—'];
      dates.forEach(() => blankRow.push(null));
      blankRow.push(0, 0, 0, 'No Records');
      tableRows = [blankRow];
    }

    // 8. Add Real Excel Table
    ws.addTable({
      name: 'OTReportTable',
      ref: `A${tableHeaderRow}`,
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: tableColumns,
      rows: tableRows,
    });

    const dataStartRow = tableHeaderRow + 1;
    const dataEndRow = dataStartRow + tableRows.length - 1;
    const totalsRow = dataEndRow + 1;

    // Table Header Style
    ws.getRow(tableHeaderRow).height = 24;
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = ws.getCell(tableHeaderRow, c);
      cell.font = FONTS.TABLE_HEADER;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_HEADER } };
      cell.alignment = ALIGN.HEADER;
      cell.border = BORDERS.TABLE_HEADER;
    }

    // Data Rows Styling
    const dateStartCol = FIXED_COLS_COUNT + 1;
    const dateEndCol = FIXED_COLS_COUNT + dates.length;
    const totalOtCol = dateEndCol + 1;
    const ot4Col = dateEndCol + 2;
    const ot8Col = dateEndCol + 3;
    const statusCol = dateEndCol + 4;

    for (let r = dataStartRow; r <= dataEndRow; r++) {
      ws.getRow(r).height = 19;
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = ws.getCell(r, c);
        cell.font = FONTS.DATA_REGULAR;
        cell.border = BORDERS.TABLE_CELL;

        if (c === 1) {
          cell.alignment = ALIGN.CENTER;
        } else if (c === 2 || c === 3) {
          cell.alignment = ALIGN.LEFT;
        } else if (c >= dateStartCol && c <= dateEndCol) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.HOURS;

          // Restrained Soft Highlights for OT hours
          if (typeof cell.value === 'number') {
            if (cell.value >= 8) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_RED_BG } };
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_RED_FG } };
            } else if (cell.value >= 4) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_AMBER_BG } };
              cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_AMBER_FG } };
            } else if (cell.value > 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_GREEN_BG } };
              cell.font = { name: 'Segoe UI', size: 9, color: { argb: COLORS.BADGE_GREEN_FG } };
            }
          }
        } else if (c === totalOtCol) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.HOURS;
          cell.font = FONTS.DATA_BOLD;
        } else if (c === ot4Col || c === ot8Col) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.COUNT;
        } else if (c === statusCol) {
          cell.alignment = ALIGN.CENTER;
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

      if (c >= dateStartCol && c <= totalOtCol) {
        cell.numFmt = NUM_FMTS.HOURS;
        cell.alignment = ALIGN.RIGHT;
      } else if (c === ot4Col || c === ot8Col) {
        cell.numFmt = NUM_FMTS.COUNT;
        cell.alignment = ALIGN.RIGHT;
      }
    }

    // 9. Render Approval Section
    HeaderBuilder.renderApprovalSection(ws, totalsRow + 1, TOTAL_COLS);

    // 10. Dual Freeze Panes (Freeze left 3 employee columns & table headers)
    ws.views = [{ state: 'frozen', xSplit: FIXED_COLS_COUNT, ySplit: tableHeaderRow }];

    // 11. Column Widths
    ws.getColumn(1).width = 14; // Employee ID
    ws.getColumn(2).width = 24; // Employee Name
    ws.getColumn(3).width = 18; // Department

    for (let d = 0; d < dates.length; d++) {
      ws.getColumn(FIXED_COLS_COUNT + 1 + d).width = 9; // Date column
    }

    ws.getColumn(totalOtCol).width = 15; // Total OT
    ws.getColumn(ot4Col).width = 16;     // OT ≥ 4H
    ws.getColumn(ot8Col).width = 18;     // OT ≥ 8H W/Off
    ws.getColumn(statusCol).width = 15;  // Approval Status

    // 12. Print Setup
    applyPrintSetup(ws, {
      orientation: 'landscape',
      printTitlesRow: `${tableHeaderRow}:${tableHeaderRow}`,
      printTitlesColumn: 'A:C',
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Overtime Reconciliation Matrix',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
