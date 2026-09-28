// src/services/vendor/reportEngine/coverSheetBuilder.ts
// ============================================================================
// Joy PeopleHR — Sheet 00: Cover Page & Executive Summary
// Sets enterprise tone, table of contents, high-level reconciliation & sign-off
// ============================================================================

import ExcelJS from 'exceljs';
import { CompanyBrandingConfig } from './types';
import { COLORS, FONTS, BORDERS, applyPrintSetup } from './excelStyles';

export interface CoverSummaryStats {
  totalEmployees: number;
  totalRecords: number;
  presentDays: number;
  workedHours: number;
  otHours: number;
  payableDays: number;
  exceptionsCount: number;
  reconciliationIssues: number;
}

export class CoverSheetBuilder {
  static build(wb: ExcelJS.Workbook, config: CompanyBrandingConfig, stats: CoverSummaryStats): ExcelJS.Worksheet {
    const ws = wb.addWorksheet('00_Cover', {
      views: [{ showGridLines: true }],
    });

    const maxCols = 8;
    const endColLetter = 'H';

    // 1. Executive Top Banner
    ws.mergeCells(`A1:${endColLetter}2`);
    const banner = ws.getCell('A1');
    const compName = (config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD').toUpperCase();
    const siteName = (config.site_name || 'UNIT II').toUpperCase();
    banner.value = `  ${compName}\n  ${siteName} — MANPOWER OPERATIONS & VENDOR COMPLIANCE`;
    banner.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLORS.TEXT_WHITE } };
    banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PRIMARY_DARK } };
    banner.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
    ws.getRow(1).height = 28;
    ws.getRow(2).height = 24;

    // 2. Sub-accent bar
    ws.mergeCells(`A3:${endColLetter}3`);
    const bar = ws.getCell('A3');
    bar.value = `  Joy PeopleHR — Official Vendor Monthly Workforce Reconciliation Dossier`;
    bar.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFE2E8F0' } };
    bar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PRIMARY_LIGHT } };
    bar.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(3).height = 20;

    ws.getRow(4).height = 14; // blank

    // 3. Document Details Card
    ws.mergeCells(`B5:G5`);
    const docTitle = ws.getCell('B5');
    docTitle.value = `MONTHLY WORKFORCE RECONCILIATION DOSSIER`;
    docTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: COLORS.PRIMARY_DARK } };
    docTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(5).height = 26;

    const details = [
      ['Vendor Name', config.vendor_name || 'Joy Manpower Services Private Limited'],
      ['Operating Site / Unit', config.site_name || 'Unit II'],
      ['Reporting Cycle', config.period_label || `${config.from_date} to ${config.to_date}`],
      ['Contract / PO Number', config.contract_po || 'JOY-PO-2026-MP08'],
      ['Dossier Status', config.report_status || 'COMPANY VERIFIED'],
      ['Generated On', config.generated_at || new Date().toLocaleString('en-IN')],
      ['Authorized User', config.generated_by || 'HR Administrator'],
      ['Report Specification', `${config.template_version || 'v2.4 Enterprise Production'} (Audit Compliant)`],
    ];

    let currRow = 6;
    details.forEach(([lbl, val]) => {
      ws.mergeCells(`B${currRow}:C${currRow}`);
      ws.mergeCells(`D${currRow}:G${currRow}`);

      const lCell = ws.getCell(`B${currRow}`);
      lCell.value = lbl;
      lCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.TEXT_MUTED } };
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      lCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const vCell = ws.getCell(`D${currRow}`);
      vCell.value = val;
      vCell.font = { name: 'Segoe UI', size: 9.5, bold: lbl === 'Dossier Status', color: { argb: COLORS.TEXT_MAIN } };
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FILL_WHITE } };
      vCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      for (let c = 2; c <= 7; c++) {
        ws.getCell(currRow, c).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          left: c === 2 || c === 4 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
          right: c === 3 || c === 7 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
        };
      }

      ws.getRow(currRow).height = 20;
      currRow++;
    });

    currRow++; // blank line
    ws.getRow(currRow).height = 14;

    // 4. Executive Summary Table
    ws.mergeCells(`B${currRow}:G${currRow}`);
    const sumHeader = ws.getCell(`B${currRow}`);
    sumHeader.value = 'OPERATIONAL CYCLE SUMMARY METRICS';
    sumHeader.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLORS.PRIMARY_DARK } };
    sumHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(currRow).height = 22;
    currRow++;

    const kpiMetrics = [
      ['Total Deployed Workers', stats.totalEmployees.toLocaleString()],
      ['Total Attendance Logs', stats.totalRecords.toLocaleString()],
      ['Cumulative Present Days', stats.presentDays.toFixed(1)],
      ['Total Worked Hours', stats.workedHours.toFixed(2)],
      ['Total Overtime (OT) Hours', stats.otHours.toFixed(2)],
      ['Total Payable Days', stats.payableDays.toFixed(1)],
      ['Exceptions Flagged', stats.exceptionsCount.toLocaleString()],
      ['Reconciliation Discrepancies', stats.reconciliationIssues.toLocaleString()],
    ];

    kpiMetrics.forEach(([kpi, val]) => {
      ws.mergeCells(`B${currRow}:E${currRow}`);
      ws.mergeCells(`F${currRow}:G${currRow}`);

      const kCell = ws.getCell(`B${currRow}`);
      kCell.value = kpi;
      kCell.font = { name: 'Segoe UI', size: 9, bold: false, color: { argb: COLORS.TEXT_MAIN } };
      kCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      kCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const vCell = ws.getCell(`F${currRow}`);
      vCell.value = val;
      vCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.TEXT_MAIN } };
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FILL_WHITE } };
      vCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      for (let c = 2; c <= 7; c++) {
        ws.getCell(currRow, c).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          left: c === 2 || c === 6 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
          right: c === 5 || c === 7 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
        };
      }

      ws.getRow(currRow).height = 19;
      currRow++;
    });

    currRow++; // blank
    ws.getRow(currRow).height = 14;

    // 5. Table of Contents
    ws.mergeCells(`B${currRow}:G${currRow}`);
    const tocHeader = ws.getCell(`B${currRow}`);
    tocHeader.value = 'WORKBOOK CONTENTS & SHEET DIRECTORY';
    tocHeader.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLORS.PRIMARY_DARK } };
    tocHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(currRow).height = 22;
    currRow++;

    const contents = [
      ['01_Attendance', 'Daily Attendance Register: In/Out punches, shifts, 1st/2nd half statuses & OT'],
      ['02_MR_Report', 'Monthly Manpower Reconciliation: Present days, NFH, W/Off, leaves & shift breakups'],
      ['03_OT_Report', 'Overtime Reconciliation Matrix: Daily OT grid across cycle, thresholds (≥4H, ≥8H)'],
      ['04_Reconciliation', 'Three-Way Audit: Attendance vs MR vs OT hours & payable day variance analysis'],
      ['05_Exceptions', 'Operational Exceptions: Missing check-ins/outs, punch anomalies & unapproved OT'],
    ];

    contents.forEach(([sh, desc]) => {
      ws.mergeCells(`B${currRow}:C${currRow}`);
      ws.mergeCells(`D${currRow}:G${currRow}`);

      const sCell = ws.getCell(`B${currRow}`);
      sCell.value = sh;
      sCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.PRIMARY_DARK } };
      sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const dCell = ws.getCell(`D${currRow}`);
      dCell.value = desc;
      dCell.font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.TEXT_MAIN } };
      dCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FILL_WHITE } };
      dCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      for (let c = 2; c <= 7; c++) {
        ws.getCell(currRow, c).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } },
          left: c === 2 || c === 4 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
          right: c === 3 || c === 7 ? { style: 'thin', color: { argb: COLORS.BORDER_LIGHT } } : undefined,
        };
      }

      ws.getRow(currRow).height = 19;
      currRow++;
    });

    currRow += 2;

    // 6. Signatures block
    ws.mergeCells(`B${currRow}:G${currRow}`);
    const sigCell = ws.getCell(`B${currRow}`);
    sigCell.value = `Verified By (Company HR): ___________________________      Authorized Signatory (Vendor): ___________________________`;
    sigCell.font = FONTS.APPROVAL_TITLE;
    sigCell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(currRow).height = 30;

    // Column widths
    ws.getColumn(1).width = 4;
    ws.getColumn(2).width = 22;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;
    ws.getColumn(7).width = 20;
    ws.getColumn(8).width = 4;

    applyPrintSetup(ws, {
      orientation: 'portrait',
      companyName: config.company_name || 'JOY CORPORATE SOLUTIONS PVT LTD',
      reportName: 'Workforce Pack Cover Sheet',
      periodLabel: config.period_label || `${config.from_date} to ${config.to_date}`,
    });

    return ws;
  }
}
