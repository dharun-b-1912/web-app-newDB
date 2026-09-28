// src/services/vendor/reportEngine/reconciliationSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 04: Attendance x MR x OT Three-Way Reconciliation
// Audits Present Days, OT Hours, Payable Days, flags discrepancies with status pills
// ============================================================================

import ExcelJS from 'exceljs';
import { AttendanceOTReconciliationRow } from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, KpiCardItem } from './types';
import { HeaderBuilder } from './headerBuilder';
import { COLORS, FONTS, BORDERS, NUM_FMTS, ALIGN, applyPrintSetup } from './excelStyles';

export class ReconciliationSheetBuilder {
  static build(
    wb: ExcelJS.Workbook,
    reconciliation: AttendanceOTReconciliationRow[],
    config: CompanyBrandingConfig
  ): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('04_Reconciliation');
    const TOTAL_COLS = 14;

    // 1. KPI Calculations
    const totalRecords = reconciliation.length;
    const matchedCount = reconciliation.filter((r) => r.status === 'MATCHED').length;
    const mismatchCount = reconciliation.filter((r) => r.status === 'MISMATCH').length;
    const missingCount = reconciliation.filter((r) => r.status.startsWith('MISSING')).length;
    const totalPresentVariance = reconciliation.reduce((sum, r) => sum + Math.abs(r.present_variance || 0), 0);
    const totalOtVariance = reconciliation.reduce((sum, r) => sum + Math.abs(r.ot_variance || 0), 0);

    const kpis: KpiCardItem[] = [
      { label: 'Reconciled Personnel', value: totalRecords.toLocaleString() },
      { label: 'Perfect Match (100%)', value: matchedCount.toLocaleString() },
      { label: 'Attention Required', value: (mismatchCount + missingCount).toLocaleString() },
      { label: 'Present Days Variance', value: totalPresentVariance.toFixed(1) },
      { label: 'Overtime Hours Variance', value: totalOtVariance.toFixed(2) },
    ];

    // 2. Render Header Area
    let nextRow = HeaderBuilder.renderCorporateHeader(
      ws,
      {
        sheetTitle: 'ATTENDANCE × MR × OT THREE-WAY RECONCILIATION AUDIT',
        sheetCode: '04_Reconciliation',
        config,
        hasRecords: totalRecords > 0,
      },
      TOTAL_COLS
    );

    // 3. Render Pre-Table KPI Cards
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis, TOTAL_COLS);

    // 4. Render Empty State Banner if no records
    if (totalRecords === 0) {
      nextRow = HeaderBuilder.renderEmptyStateBanner(
        ws,
        nextRow,
        {
          sheetTitle: 'RECONCILIATION AUDIT',
          sheetCode: '04_Reconciliation',
          config,
          hasRecords: false,
        },
        TOTAL_COLS
      );
    }

    // 5. Build Table Rows
    const tableHeaderRow = nextRow;
    let tableRows: any[][] = [];

    if (totalRecords > 0) {
      tableRows = reconciliation.map((row) => {
        const attPayable = (row.attendance_present_days || 0);
        const mrPayable = (row.mr_present_days || 0);
        const payableVariance = Math.round((attPayable - mrPayable) * 10) / 10;

        let displayStatus = row.status.replace(/_/g, ' ');
        if (row.status === 'MISMATCH') {
          if (row.present_variance !== 0 && row.ot_variance !== 0) displayStatus = 'DAYS & OT MISMATCH';
          else if (row.present_variance !== 0) displayStatus = 'PRESENT DAYS MISMATCH';
          else if (row.ot_variance !== 0) displayStatus = 'OT HOURS MISMATCH';
        }

        return [
          row.employee_name || '—',
          row.employee_id || '—',
          'Production', // fallback department
          Math.round((row.attendance_present_days || 0) * 10) / 10,
          Math.round((row.mr_present_days || 0) * 10) / 10,
          Math.round((row.present_variance || 0) * 10) / 10,
          Math.round((row.attendance_ot_hours || 0) * 100) / 100,
          Math.round((row.ot_report_hours || 0) * 100) / 100,
          Math.round((row.ot_variance || 0) * 100) / 100,
          Math.round(attPayable * 10) / 10,
          Math.round(mrPayable * 10) / 10,
          payableVariance,
          displayStatus,
          row.notes || (row.status === 'MATCHED' ? 'All records reconciled' : 'Discrepancy detected'),
        ];
      });
    } else {
      tableRows = [[
        'No reconciliation records logged for this cycle', '—', '—',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 'MATCHED', 'Zero Activity',
      ]];
    }

    // 6. Add Real Excel Table
    ws.addTable({
      name: 'ReconciliationTable',
      ref: `A${tableHeaderRow}`,
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: [
        { name: 'Employee', filterButton: true, totalsRowLabel: 'TOTAL' },
        { name: 'Employee ID', filterButton: true },
        { name: 'Department', filterButton: true },
        { name: 'Attendance Present Days', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'MR Present Days', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Present Variance', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Attendance OT Hours', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT Report Hours', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT Variance', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Attendance Payable Days', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'MR Payable Days', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Payable Day Variance', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'Status', filterButton: true },
        { name: 'Notes', filterButton: true },
      ],
      rows: tableRows,
    });

    const dataStartRow = tableHeaderRow + 1;
    const dataEndRow = dataStartRow + tableRows.length - 1;
    const totalsRow = dataEndRow + 1;

    // Header Styling
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

        if (c === 1 || c === 3 || c === 14) {
          cell.alignment = ALIGN.LEFT;
        } else if (c === 2 || c === 13) {
          cell.alignment = ALIGN.CENTER;
        } else if (c === 7 || c === 8 || c === 9) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.HOURS;
        } else {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = '0.0';
        }

        // Status Badge Highlighting
        if (c === 13) {
          const statusText = (cell.value || '').toString().toUpperCase();
          if (statusText === 'MATCHED') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_GREEN_BG } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_GREEN_FG } };
          } else if (statusText.includes('MISMATCH')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_RED_BG } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_RED_FG } };
          } else if (statusText.includes('MISSING')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_AMBER_BG } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_AMBER_FG } };
          }
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

      if (c === 7 || c === 8 || c === 9) cell.numFmt = NUM_FMTS.HOURS;
      else if (c === 4 || c === 5 || c === 6 || c === 10 || c === 11 || c === 12) cell.numFmt = '0.0';
    }

    // 7. Render Approval Section
    HeaderBuilder.renderApprovalSection(ws, totalsRow + 1, TOTAL_COLS);

    // 8. Freeze Panes
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: tableHeaderRow }];

    // 9. Column Widths
    const widths = [
      24, // Employee
      15, // Employee ID
      18, // Department
      22, // Attendance Present Days
      18, // MR Present Days
      16, // Present Variance
      20, // Attendance OT Hours
      18, // OT Report Hours
      14, // OT Variance
      22, // Attendance Payable Days
      18, // MR Payable Days
      20, // Payable Day Variance
      24, // Status
      35, // Notes
    ];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // 10. Print Setup
    applyPrintSetup(ws, {
      orientation: 'landscape',
      printTitlesRow: `${tableHeaderRow}:${tableHeaderRow}`,
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Attendance x MR x OT Reconciliation',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
