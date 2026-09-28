// src/services/vendor/reportEngine/exceptionsSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 05: Attendance & Payroll Exceptions Log
// Flags anomalies: missing punches, invalid shifts, unapproved OT, duplicates
// ============================================================================

import ExcelJS from 'exceljs';
import { AttendanceException } from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, KpiCardItem } from './types';
import { HeaderBuilder } from './headerBuilder';
import { COLORS, FONTS, BORDERS, ALIGN, applyPrintSetup } from './excelStyles';

export class ExceptionsSheetBuilder {
  static formatExceptionType(rawType: string): string {
    const map: Record<string, string> = {
      MISSING_CHECK_IN: 'Missing Check-In',
      MISSING_CHECK_OUT: 'Missing Check-Out',
      MISSING_PUNCH: 'Missing Punch',
      INVALID_SHIFT: 'Invalid Shift',
      UNKNOWN_EMPLOYEE: 'Employee Not Found',
      EMPLOYEE_NOT_MAPPED_TO_VENDOR: 'Employee Not Mapped to Vendor',
      EMPLOYEE_NOT_MAPPED_TO_SITE: 'Employee Not Mapped to Site',
      OT_WITHOUT_ATTENDANCE: 'Overtime Without Attendance',
      OT_WITHOUT_APPROVAL: 'Overtime Without Approval',
      DUPLICATE_ATTENDANCE: 'Duplicate Attendance',
      DUPLICATE_OT: 'Duplicate Overtime',
      MR_MISMATCH: 'Attendance / MR Mismatch',
      INVOICE_MISMATCH: 'Invoice Discrepancy',
    };
    return map[rawType] || rawType.replace(/_/g, ' ');
  }

  static build(
    wb: ExcelJS.Workbook,
    exceptions: AttendanceException[],
    config: CompanyBrandingConfig
  ): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('05_Exceptions');
    const TOTAL_COLS = 14;

    // 1. KPI Calculations
    const totalExceptions = exceptions.length;
    const criticalCount = exceptions.filter((e) => e.severity === 'CRITICAL').length;
    const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;
    const mediumCount = exceptions.filter((e) => e.severity === 'MEDIUM').length;
    const lowCount = exceptions.filter((e) => e.severity === 'LOW').length;
    const resolvedCount = exceptions.filter((e) => e.resolved).length;
    const pendingCount = totalExceptions - resolvedCount;

    const kpis: KpiCardItem[] = [
      { label: 'Total Exceptions', value: totalExceptions.toLocaleString() },
      { label: 'Critical Severity', value: criticalCount.toLocaleString() },
      { label: 'High Severity', value: highCount.toLocaleString() },
      { label: 'Medium Severity', value: mediumCount.toLocaleString() },
      { label: 'Low Severity', value: lowCount.toLocaleString() },
      { label: 'Resolved Issues', value: resolvedCount.toLocaleString() },
      { label: 'Pending Action', value: pendingCount.toLocaleString() },
    ];

    // 2. Render Header Area
    let nextRow = HeaderBuilder.renderCorporateHeader(
      ws,
      {
        sheetTitle: 'ATTENDANCE & PAYROLL COMPLIANCE EXCEPTIONS AUDIT',
        sheetCode: '05_Exceptions',
        config,
        hasRecords: totalExceptions > 0,
      },
      TOTAL_COLS
    );

    // 3. Render Pre-Table KPI Cards (Split into 2 rows: 4 cards + 3 cards)
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(0, 4), TOTAL_COLS);
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(4), TOTAL_COLS);

    // 4. Render Empty State Banner if no records
    if (totalExceptions === 0) {
      nextRow = HeaderBuilder.renderEmptyStateBanner(
        ws,
        nextRow,
        {
          sheetTitle: 'EXCEPTIONS AUDIT',
          sheetCode: '05_Exceptions',
          config,
          hasRecords: false,
        },
        TOTAL_COLS
      );
    }

    // 5. Build Table Rows
    const tableHeaderRow = nextRow;
    let tableRows: any[][] = [];

    if (totalExceptions > 0) {
      tableRows = exceptions.map((ex) => [
        ex.id,
        ExceptionsSheetBuilder.formatExceptionType(ex.exception_type),
        ex.employee_id || '—',
        ex.employee_name || '—',
        'Production', // Default department
        ex.attendance_date || config.from_date,
        ex.description,
        'BIOMETRIC ENGINE',
        ex.severity,
        ex.resolved ? 'Resolved' : 'Pending',
        config.generated_at || new Date().toLocaleDateString('en-IN'),
        ex.resolved_at || '—',
        ex.resolved_by || '—',
        ex.resolved ? 'Exception reviewed and cleared' : 'Action required prior to payroll lock',
      ]);
    } else {
      tableRows = [[
        'EXC-0000', 'No Exceptions Detected', '—', 'All Employees', '—',
        config.from_date, '100% compliant: No missing punches, invalid shifts, or unapproved OT detected',
        'SYSTEM AUDIT', 'LOW', 'Resolved', config.from_date, config.from_date, 'Auto-Engine', 'Zero compliance discrepancies',
      ]];
    }

    // 6. Add Real Excel Table
    ws.addTable({
      name: 'ExceptionsTable',
      ref: `A${tableHeaderRow}`,
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: [
        { name: 'Exception ID', filterButton: true, totalsRowLabel: 'TOTAL' },
        { name: 'Type', filterButton: true, totalsRowFunction: 'count' },
        { name: 'Employee ID', filterButton: true },
        { name: 'Employee Name', filterButton: true },
        { name: 'Department', filterButton: true },
        { name: 'Date', filterButton: true },
        { name: 'Description', filterButton: true },
        { name: 'Source', filterButton: true },
        { name: 'Severity', filterButton: true },
        { name: 'Status', filterButton: true },
        { name: 'Raised On', filterButton: true },
        { name: 'Resolved On', filterButton: true },
        { name: 'Resolved By', filterButton: true },
        { name: 'Resolution Notes', filterButton: true },
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

        if (c === 1 || c === 3 || c === 6 || c === 8 || c === 9 || c === 10 || c === 11 || c === 12) {
          cell.alignment = ALIGN.CENTER;
        } else {
          cell.alignment = ALIGN.LEFT;
        }

        // Severity Soft Badges
        if (c === 9) {
          const sev = (cell.value || '').toString().toUpperCase();
          if (sev === 'CRITICAL') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_RED_BG } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_RED_FG } };
          } else if (sev === 'HIGH') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFC2410C' } };
          } else if (sev === 'MEDIUM') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_AMBER_BG } };
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: COLORS.BADGE_AMBER_FG } };
          } else if (sev === 'LOW') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_SLATE_BG } };
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: COLORS.BADGE_SLATE_FG } };
          }
        }

        // Status Badge
        if (c === 10) {
          const st = (cell.value || '').toString();
          if (st === 'Resolved') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BADGE_GREEN_BG } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.BADGE_GREEN_FG } };
          } else {
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
    }

    // 7. Render Approval Section
    HeaderBuilder.renderApprovalSection(ws, totalsRow + 1, TOTAL_COLS);

    // 8. Freeze Panes
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: tableHeaderRow }];

    // 9. Column Widths
    const widths = [
      14, // Exception ID
      24, // Type
      15, // Employee ID
      22, // Employee Name
      18, // Department
      13, // Date
      45, // Description
      18, // Source
      12, // Severity
      12, // Status
      14, // Raised On
      14, // Resolved On
      16, // Resolved By
      35, // Resolution Notes
    ];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // 10. Print Setup
    applyPrintSetup(ws, {
      orientation: 'landscape',
      printTitlesRow: `${tableHeaderRow}:${tableHeaderRow}`,
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Attendance & Payroll Exceptions',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
