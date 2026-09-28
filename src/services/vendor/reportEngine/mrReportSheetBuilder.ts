// src/services/vendor/reportEngine/mrReportSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 02: Monthly Manpower Reconciliation (MR Report)
// Full 23-column operational breakdown, Shift split, Leave & Payable Days
// ============================================================================

import ExcelJS from 'exceljs';
import { VendorMRReportRecord } from '../vendorAttendanceEngineService';
import { CompanyBrandingConfig, KpiCardItem } from './types';
import { HeaderBuilder } from './headerBuilder';
import { COLORS, FONTS, BORDERS, NUM_FMTS, ALIGN, applyPrintSetup } from './excelStyles';

export class MRReportSheetBuilder {
  static build(
    wb: ExcelJS.Workbook,
    mrReport: VendorMRReportRecord[],
    config: CompanyBrandingConfig
  ): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('02_MR_Report');
    const TOTAL_COLS = 23;

    // 1. Calculate Aggregate Totals
    const totalWorkers = mrReport.length;
    const totals = mrReport.reduce(
      (acc, mr) => {
        const payable = (mr.present_days || 0) + (mr.nfh || 0) + (mr.weekly_off || 0) + (mr.cl || 0) + (mr.pl || 0);
        return {
          present: acc.present + (mr.present_days || 0),
          nfh: acc.nfh + (mr.nfh || 0),
          wo: acc.wo + (mr.weekly_off || 0),
          cl: acc.cl + (mr.cl || 0),
          pl: acc.pl + (mr.pl || 0),
          lop: acc.lop + (mr.lop || 0),
          shifts: acc.shifts + (mr.no_of_shifts_present || 0),
          g: acc.g + (mr.general_shift || 0),
          s1: acc.s1 + (mr.shift_1 || 0),
          s2: acc.s2 + (mr.shift_2 || 0),
          s3: acc.s3 + (mr.shift_3 || 0),
          ot: acc.ot + (mr.ot_hours || 0),
          ot4: acc.ot4 + (mr.ot_gt_4hrs_count || 0),
          ot8: acc.ot8 + (mr.ot_gt_8hrs_on_woff || 0),
          fa: acc.fa + (mr.fa || 0),
          na: acc.na + (mr.na || 0),
          payable: acc.payable + payable,
        };
      },
      {
        present: 0, nfh: 0, wo: 0, cl: 0, pl: 0, lop: 0,
        shifts: 0, g: 0, s1: 0, s2: 0, s3: 0, ot: 0, ot4: 0, ot8: 0, fa: 0, na: 0, payable: 0,
      }
    );

    const kpis: KpiCardItem[] = [
      { label: 'Total Workers', value: totalWorkers.toLocaleString() },
      { label: 'Present Days', value: totals.present.toFixed(1) },
      { label: 'Paid Holidays (NFH)', value: totals.nfh.toFixed(1) },
      { label: 'Weekly Offs', value: totals.wo.toFixed(1) },
      { label: 'Leaves (CL+PL)', value: (totals.cl + totals.pl).toFixed(1) },
      { label: 'Loss of Pay (LOP)', value: totals.lop.toFixed(1) },
      { label: 'Total Shifts', value: totals.shifts.toLocaleString() },
      { label: 'Total Overtime (Hrs)', value: totals.ot.toFixed(2) },
      { label: 'Payable Days', value: totals.payable.toFixed(1) },
      { label: 'Compliance (FA/NA)', value: `${totals.fa} / ${totals.na}` },
    ];

    // 2. Render Header Area
    let nextRow = HeaderBuilder.renderCorporateHeader(
      ws,
      {
        sheetTitle: 'MONTHLY MANPOWER RECONCILIATION REPORT (MR REPORT)',
        sheetCode: '02_MR_Report',
        config,
        hasRecords: totalWorkers > 0,
      },
      TOTAL_COLS
    );

    // 3. Render Pre-Table KPI Cards (2 rows of 5 cards)
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(0, 5), TOTAL_COLS);
    nextRow = HeaderBuilder.renderKpiCards(ws, nextRow, kpis.slice(5), TOTAL_COLS);

    // 4. Render Empty State Banner if no records
    if (totalWorkers === 0) {
      nextRow = HeaderBuilder.renderEmptyStateBanner(
        ws,
        nextRow,
        {
          sheetTitle: 'MR REPORT',
          sheetCode: '02_MR_Report',
          config,
          hasRecords: false,
        },
        TOTAL_COLS
      );
    }

    // 5. Build Table Rows
    const tableHeaderRow = nextRow;
    let tableRows: any[][] = [];

    if (totalWorkers > 0) {
      tableRows = mrReport.map((mr, idx) => {
        const payableDays = (mr.present_days || 0) + (mr.nfh || 0) + (mr.weekly_off || 0) + (mr.cl || 0) + (mr.pl || 0);
        return [
          idx + 1,
          mr.employee_code || '—',
          mr.employee_name || '—',
          mr.category || 'Skilled',
          mr.department || '—',
          Math.round((mr.present_days || 0) * 10) / 10,
          Math.round((mr.nfh || 0) * 10) / 10,
          Math.round((mr.weekly_off || 0) * 10) / 10,
          Math.round((mr.cl || 0) * 10) / 10,
          Math.round((mr.pl || 0) * 10) / 10,
          Math.round((mr.lop || 0) * 10) / 10,
          mr.no_of_shifts_present || 0,
          mr.general_shift || 0,
          mr.shift_1 || 0,
          mr.shift_2 || 0,
          mr.shift_3 || 0,
          Math.round((mr.ot_hours || 0) * 100) / 100,
          mr.ot_gt_4hrs_count || 0,
          mr.ot_gt_8hrs_on_woff || 0,
          mr.fa ?? 0,
          mr.na ?? 0,
          Math.round(payableDays * 10) / 10,
          '', // Remarks
        ];
      });
    } else {
      tableRows = [[
        1, '—', 'No manpower reconciliation records logged for this cycle', '—', '—',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Zero Activity',
      ]];
    }

    // 6. Add Real Excel Table
    ws.addTable({
      name: 'MRReportTable',
      ref: `A${tableHeaderRow}`,
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: true,
      },
      columns: [
        { name: 'S.No', filterButton: true },
        { name: 'EMP ID', filterButton: true, totalsRowLabel: 'TOTAL' },
        { name: 'EMPLOYEE NAME', filterButton: true },
        { name: 'CATEGORY', filterButton: true },
        { name: 'DEPARTMENT', filterButton: true },
        { name: 'PRESENT DAYS', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'NFH', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'W/OFF', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'CL', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'PL', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'LOP', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'NO. OF SHIFTS (PRESENT)', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'G.SHIFT', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'SHIFT I', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'SHIFT II', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'SHIFT III', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT HOURS', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT ≥ 4H', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'OT ≥ 8H W/OFF', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'FA', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'NA', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'TOTAL PAYABLE DAYS', filterButton: true, totalsRowFunction: 'sum' },
        { name: 'REMARKS', filterButton: true },
      ],
      rows: tableRows,
    });

    const dataStartRow = tableHeaderRow + 1;
    const dataEndRow = dataStartRow + tableRows.length - 1;
    const totalsRow = dataEndRow + 1;

    // Header Styling
    ws.getRow(tableHeaderRow).height = 26;
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

        if (c === 1 || c === 2 || c === 4) {
          cell.alignment = ALIGN.CENTER;
        } else if (c === 3 || c === 5 || c === 23) {
          cell.alignment = ALIGN.LEFT;
        } else if (c === 17) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.HOURS;
        } else if (c === 6 || c === 7 || c === 8 || c === 9 || c === 10 || c === 11 || c === 22) {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = '0.0';
        } else {
          cell.alignment = ALIGN.RIGHT;
          cell.numFmt = NUM_FMTS.COUNT;
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

      if (c === 17) cell.numFmt = NUM_FMTS.HOURS;
      else if (c === 6 || c === 7 || c === 8 || c === 9 || c === 10 || c === 11 || c === 22) cell.numFmt = '0.0';
      else if (c >= 12 && c <= 21) cell.numFmt = NUM_FMTS.COUNT;
    }

    // 7. Approval Block
    HeaderBuilder.renderApprovalSection(ws, totalsRow + 1, TOTAL_COLS);

    // 8. Freeze Panes
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: tableHeaderRow }];

    // 9. Column Widths
    const widths = [
      6,   // S.No
      14,  // EMP ID
      24,  // EMPLOYEE NAME
      14,  // CATEGORY
      18,  // DEPARTMENT
      14,  // PRESENT DAYS
      10,  // NFH
      10,  // W/OFF
      8,   // CL
      8,   // PL
      8,   // LOP
      18,  // NO. OF SHIFTS (PRESENT)
      10,  // G.SHIFT
      10,  // SHIFT I
      10,  // SHIFT II
      10,  // SHIFT III
      14,  // OT HOURS
      12,  // OT ≥ 4H
      16,  // OT ≥ 8H W/OFF
      8,   // FA
      8,   // NA
      18,  // TOTAL PAYABLE DAYS
      18,  // REMARKS
    ];
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // 10. Print Setup
    applyPrintSetup(ws, {
      orientation: 'landscape',
      printTitlesRow: `${tableHeaderRow}:${tableHeaderRow}`,
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Monthly Manpower Reconciliation (MR) Report',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
