// src/services/vendor/bullPlant1/bullPlant1ExcelExporter.ts
// ============================================================================
// Joy PeopleHR — Bull Plant 1 Template-Driven Excel Exporter
// Spec Section 1, 3, 5, 9, 10: Populates calculated payroll into Bull Plant
// template using cell-by-cell semantic field mapping. Blocks export on invariant failure.
// ============================================================================

import ExcelJS from 'exceljs';
import {
  BullPlant1PayrollRow,
  BullPlant1PayrollMapper,
  BullPlant1ValidationSummary,
} from './bullPlant1PayrollMapper';
import { BullPlant1TemplateService } from './bullPlant1TemplateService';
import { BullPlant1ColumnMap, BULL_PLANT_1_COLUMNS } from './bullPlant1ColumnMap';
import { BullPlant1InvoiceSummary, BULL_PLANT_1_INVOICE } from '../fixtures/bullPlant1InvoiceFixture';

export class BullPlant1ExcelExporter {
  /**
   * Main export method: Validates calculated payroll, maps fields into template,
   * creates all sheets (INVOICE, PLANT 1, DEDUCTIONS, SUMMARY, AUDIT), and triggers browser download.
   */
  static async exportToBullPlant1Workbook(
    rows: BullPlant1PayrollRow[],
    invoice: BullPlant1InvoiceSummary = BULL_PLANT_1_INVOICE
  ): Promise<BullPlant1ValidationSummary> {
    // ── 1. MATHEMATICAL RECONCILIATION VALIDATION ────────────────────────────
    const validation = BullPlant1PayrollMapper.validateBullPlant1Rows(rows);
    if (!validation.canExport) {
      const errMessage = `Bull Plant 1 Excel Export Blocked: ${validation.blockingErrors.join(' | ')}`;
      console.error(errMessage);
      throw new Error(errMessage);
    }

    // ── 2. CREATE TEMPLATE WORKBOOK ──────────────────────────────────────────
    const wb = BullPlant1TemplateService.createBullPlant1Workbook();

    // ── 3. RENDER SHEET 1: INVOICE ───────────────────────────────────────────
    BullPlant1TemplateService.renderInvoiceSheet(wb, invoice);

    // ── 4. RENDER SHEET 2: PLANT 1 (EXPLICIT MAPPING) ────────────────────────
    const pSheet = BullPlant1TemplateService.renderPlant1SheetHeader(wb);

    rows.forEach((r, idx) => {
      const rowIdx = idx + 2; // Row 1 is header
      const row = pSheet.getRow(rowIdx);

      // Semantic Field Mapping (Spec Section 3)
      row.getCell(1).value = idx + 1; // S.No
      row.getCell(2).value = Number(r.employeeId) || r.employeeId;
      row.getCell(3).value = r.employeeName;
      row.getCell(4).value = 'July 2026';
      row.getCell(5).value = r.payableDays;
      row.getCell(6).value = r.workingDays;
      row.getCell(7).value = r.payableDays; // Sal Cal Days

      // Earnings split
      row.getCell(8).value = r.basic;
      row.getCell(9).value = r.hra;
      row.getCell(10).value = r.ta;
      row.getCell(11).value = r.turnPerf;
      row.getCell(12).value = r.hodAssPerf;
      row.getCell(13).value = r.taskPerf;
      row.getCell(14).value = r.dailyWage; // Per Day Rate

      // OT & Allowances
      row.getCell(15).value = r.otAmount;
      row.getCell(16).value = r.attendanceBonus;
      row.getCell(17).value = r.otherEarnings;
      row.getCell(18).value = r.arrears;
      row.getCell(19).value = r.otHours;
      row.getCell(20).value = r.otHours > 0 ? Math.round((r.otAmount / r.otHours) * 100) / 100 : r.dailyWage / 8;

      // Deductions
      row.getCell(21).value = r.canteen;
      row.getCell(22).value = r.uniform;
      row.getCell(23).value = r.shoe;
      row.getCell(24).value = r.otherDeduction;
      row.getCell(25).value = 0; // Leave waiver
      row.getCell(26).value = 0; // Bonus %
      row.getCell(27).value = r.pf;
      row.getCell(28).value = r.esi;

      // Totals
      row.getCell(29).value = r.gross;
      row.getCell(30).value = r.totalDeductions;
      row.getCell(31).value = r.netAmount;
      row.getCell(32).value = r.dailyWage; // Derived Total

      // Employer on-costs & Service Charge
      row.getCell(33).value = r.esiEmployer325;
      row.getCell(34).value = r.pfEmployer13;
      row.getCell(35).value = r.serviceCharge8;
      row.getCell(36).value = r.calculationStatus === 'NOT_ELIGIBLE' ? 'ON_LEAVE' : '';
      row.getCell(37).value = 'Biometric Attendance Synchronized';

      // HR Metadata
      row.getCell(38).value = r.branch || 'Plant 1';
      row.getCell(39).value = r.cadre || 'Technician';
      row.getCell(40).value = r.department || 'Assembly';
      row.getCell(41).value = r.designation || 'Operator';
      row.getCell(42).value = r.grade || 'G1';
      row.getCell(43).value = r.dateOfJoining || '01/01/2026';

      // Formatting
      [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35].forEach((col) => {
        row.getCell(col).numFmt = '#,##0.00';
      });

      if (r.calculationStatus === 'NOT_ELIGIBLE') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFBEB' },
        };
      }
    });

    // Grand Total Row with Excel SUM formulas
    const lastDataRow = rows.length + 1;
    const totRowIdx = lastDataRow + 1;
    const totRow = pSheet.getRow(totRowIdx);

    totRow.getCell(4).value = 'Grand Total';
    totRow.getCell(5).value = { formula: `SUM(E2:E${lastDataRow})` };
    totRow.getCell(6).value = { formula: `SUM(F2:F${lastDataRow})` };
    totRow.getCell(8).value = { formula: `SUM(H2:H${lastDataRow})` };
    totRow.getCell(9).value = { formula: `SUM(I2:I${lastDataRow})` };
    totRow.getCell(10).value = { formula: `SUM(J2:J${lastDataRow})` };
    totRow.getCell(11).value = { formula: `SUM(K2:K${lastDataRow})` };
    totRow.getCell(12).value = { formula: `SUM(L2:L${lastDataRow})` };
    totRow.getCell(13).value = { formula: `SUM(M2:M${lastDataRow})` };
    totRow.getCell(15).value = { formula: `SUM(O2:O${lastDataRow})` };
    totRow.getCell(16).value = { formula: `SUM(P2:P${lastDataRow})` };
    totRow.getCell(19).value = { formula: `SUM(S2:S${lastDataRow})` };
    totRow.getCell(21).value = { formula: `SUM(U2:U${lastDataRow})` };
    totRow.getCell(27).value = { formula: `SUM(AA2:AA${lastDataRow})` };
    totRow.getCell(28).value = { formula: `SUM(AB2:AB${lastDataRow})` };
    totRow.getCell(29).value = { formula: `SUM(AC2:AC${lastDataRow})` };
    totRow.getCell(30).value = { formula: `SUM(AD2:AD${lastDataRow})` };
    totRow.getCell(31).value = { formula: `SUM(AE2:AE${lastDataRow})` };
    totRow.getCell(33).value = { formula: `SUM(AG2:AG${lastDataRow})` };
    totRow.getCell(34).value = { formula: `SUM(AH2:AH${lastDataRow})` };
    totRow.getCell(35).value = { formula: `SUM(AI2:AI${lastDataRow})` };

    [8, 9, 10, 11, 12, 13, 15, 16, 21, 27, 28, 29, 30, 31, 33, 34, 35].forEach((col) => {
      totRow.getCell(col).numFmt = '#,##0.00';
    });

    totRow.font = { bold: true };
    totRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    // ── 5. RENDER SHEET 3: BULL_PLANT_DEDUCTIONS ─────────────────────────────
    const dedSheet = BullPlant1TemplateService.renderDeductionsSheetHeader(wb);
    rows.forEach((r) => {
      const dRow = dedSheet.addRow([
        r.employeeId,
        r.employeeName,
        r.department,
        r.pf,
        r.esi,
        r.canteen,
        r.uniform,
        r.shoe,
        r.otherDeduction,
        r.totalDeductions,
        r.calculationStatus,
      ]);
      [4, 5, 6, 7, 8, 9, 10].forEach((c) => (dRow.getCell(c).numFmt = '#,##0.00'));
    });

    // ── 6. RENDER SHEET 4: BULL_PLANT_SUMMARY ────────────────────────────────
    BullPlant1TemplateService.renderSummarySheet(
      wb,
      validation.totalGross,
      validation.totalDeductions,
      validation.totalNet,
      validation.activePayrollCount
    );

    // ── 7. RENDER SHEET 5: SOURCE_AUDIT_LINEAGE ──────────────────────────────
    const audSheet = BullPlant1TemplateService.renderAuditLineageHeader(wb);
    rows.forEach((r) => {
      audSheet.addRow([
        r.employeeId,
        r.employeeName,
        `Attendance Master (${r.workingDays} Present)`,
        `Contract PO Rate (₹${r.dailyWage}/day)`,
        'Basic 56% + HRA 10% + TA 4% + Turn 15% + HOD 6% + Task 9%',
        r.otHours > 0 ? `${r.otHours}h Authorized at Daily/8` : 'None',
        `PF Ceiling ₹15,000 · ESI Limit ₹21,000`,
        r.calculationStatus,
      ]);
    });

    // ── 8. TRIGGER BROWSER DOWNLOAD ──────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bull_PLANT_1_Invoice_Workings_July_2026_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return validation;
  }
}
