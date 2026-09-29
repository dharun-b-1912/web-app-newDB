// src/services/vendor/bullPlant1/bullPlant1TemplateService.ts
// ============================================================================
// Joy PeopleHR — Bull Plant 1 Excel Template & Presentation Structure Service
// Spec Section 1, 6, 11: Builds authoritative client layout with controlled
// sheets: INVOICE, PLANT 1 (Payroll), DEDUCTIONS, SUMMARY, and SOURCE_AUDIT.
// ============================================================================

import ExcelJS from 'exceljs';
import { BullPlant1InvoiceSummary, BULL_PLANT_1_INVOICE } from '../fixtures/bullPlant1InvoiceFixture';
import { BULL_PLANT_1_COLUMNS } from './bullPlant1ColumnMap';

export class BullPlant1TemplateService {
  /**
   * Initializes a brand new Excel workbook formatted precisely to Bull Plant 1 standards
   */
  static createBullPlant1Workbook(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR — Bull Plant 1 Engine';
    wb.created = new Date();
    return wb;
  }

  /**
   * Sets up Sheet 1: INVOICE (Tax Invoice layout matching client commercial PO)
   */
  static renderInvoiceSheet(
    wb: ExcelJS.Workbook,
    invoice: BullPlant1InvoiceSummary = BULL_PLANT_1_INVOICE
  ): ExcelJS.Worksheet {
    const invSheet = wb.addWorksheet('INVOICE', {
      views: [{ showGridLines: true }],
    });

    invSheet.columns = [
      { key: 'A', width: 4 },
      { key: 'B', width: 8 },
      { key: 'C', width: 56 },
      { key: 'D', width: 22 },
      { key: 'E', width: 26 },
      { key: 'F', width: 20 },
    ];

    // Invoice Header & Client Block
    invSheet.getCell('B2').value = 'INVOICE';
    invSheet.getCell('B2').font = { bold: true, size: 16, color: { argb: 'FF07563D' } };

    invSheet.getCell('B3').value = invoice.clientName;
    invSheet.getCell('B3').font = { bold: true, size: 12 };
    invSheet.getCell('E3').value = 'Type :';
    invSheet.getCell('F3').value = 'Tax Invoice';
    invSheet.getCell('F3').font = { bold: true };

    invSheet.getCell('B4').value = '5, 1 A, Trichy Rd, ';
    invSheet.getCell('E4').value = 'Tax Inv No :';
    invSheet.getCell('F4').value = invoice.invoiceNo;
    invSheet.getCell('F4').font = { bold: true };

    invSheet.getCell('B5').value = 'Chinthamanipudur, ';
    invSheet.getCell('E5').value = 'INV Date :';
    invSheet.getCell('F5').value = invoice.invoiceDate;

    invSheet.getCell('B6').value = 'Coimbatore -641 103, Tamilnadu, India.';
    invSheet.getCell('E6').value = 'GST No :';
    invSheet.getCell('F6').value = invoice.clientGst;

    invSheet.getCell('B7').value = `PAN No : ${invoice.clientPan}`;
    invSheet.getCell('E7').value = 'PAN No : ';
    invSheet.getCell('F7').value = invoice.clientPan;

    invSheet.getCell('B8').value = `GST NO : ${invoice.vendorGst}`;
    invSheet.getCell('B8').font = { bold: true, color: { argb: 'FF07563D' } };
    invSheet.getCell('E8').value = 'Tax Payable on Reverse Charges';
    invSheet.getCell('F8').value = 'NO';

    // Table Header
    const headerRow = invSheet.getRow(9);
    headerRow.values = ['', 'SI.NO', 'Description', '', 'Category of Service', 'SAC Code'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF07563D' },
    };
    headerRow.height = 24;

    invSheet.getCell('C10').value = `Towards Labour Charges for the following works carried out at your premises on your behalf in period of ${invoice.periodStart} to ${invoice.periodEnd}`;
    invSheet.getCell('C10').font = { size: 9, italic: true };
    invSheet.getCell('E10').value = invoice.categoryOfService;
    invSheet.getCell('F10').value = Number(invoice.sacCode);

    // Dynamic Line items
    const lines = [
      { sno: 1, desc: 'Total earnings', val: invoice.totalEarnings },
      { sno: 2, desc: 'OT Earnings', val: invoice.totalOtEarnings },
      { sno: 3, desc: 'EPF 13%', val: invoice.employerPf13 },
      { sno: 4, desc: 'ESI 3.25%', val: invoice.employerEsi325 },
      { sno: 5, desc: 'Service charge 8%', val: invoice.serviceCharge8 },
    ];

    lines.forEach((l, idx) => {
      const rIdx = 11 + idx;
      const r = invSheet.getRow(rIdx);
      r.getCell('B').value = l.sno;
      r.getCell('C').value = l.desc;
      r.getCell('F').value = l.val;
      r.getCell('F').numFmt = '#,##0.00';
    });

    // Subtotal & GST lines
    invSheet.getCell('E17').value = 'Taxable Amount';
    invSheet.getCell('E17').font = { bold: true };
    invSheet.getCell('F17').value = invoice.taxableAmount;
    invSheet.getCell('F17').font = { bold: true };
    invSheet.getCell('F17').numFmt = '#,##0.00';

    invSheet.getCell('C18').value = 'a) SGST 09%';
    invSheet.getCell('D18').value = 0.09;
    invSheet.getCell('D18').numFmt = '0.00%';
    invSheet.getCell('E18').value = invoice.taxableAmount;
    invSheet.getCell('E18').numFmt = '#,##0.00';
    invSheet.getCell('F18').value = invoice.sgst9;
    invSheet.getCell('F18').numFmt = '#,##0.00';

    invSheet.getCell('C19').value = 'b) CGST 09%';
    invSheet.getCell('D19').value = 0.09;
    invSheet.getCell('D19').numFmt = '0.00%';
    invSheet.getCell('E19').value = invoice.taxableAmount;
    invSheet.getCell('E19').numFmt = '#,##0.00';
    invSheet.getCell('F19').value = invoice.cgst9;
    invSheet.getCell('F19').numFmt = '#,##0.00';

    invSheet.getCell('C21').value = 'Grand Total';
    invSheet.getCell('C21').font = { bold: true, size: 12, color: { argb: 'FF07563D' } };
    invSheet.getCell('F21').value = invoice.grandTotal;
    invSheet.getCell('F21').font = { bold: true, size: 12, color: { argb: 'FF07563D' } };
    invSheet.getCell('F21').numFmt = '₹#,##0.00';

    invSheet.getCell('C22').value = '(Annexure Attached)';
    invSheet.getCell('C22').font = { italic: true, size: 9, color: { argb: 'FF666666' } };

    invSheet.getCell('C23').value = invoice.amountInWords;
    invSheet.getCell('C23').font = { bold: true, size: 10 };

    return invSheet;
  }

  /**
   * Sets up Sheet 2: PLANT 1 (The Canonical Bull Plant Technician Wage Register)
   */
  static renderPlant1SheetHeader(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
    const pSheet = wb.addWorksheet('PLANT 1', {
      views: [{ showGridLines: true, state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    const headers = BULL_PLANT_1_COLUMNS.map((c) => c.defaultHeader);
    const hRow = pSheet.addRow(headers);
    hRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    hRow.height = 24;
    hRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Set column widths
    BULL_PLANT_1_COLUMNS.forEach((col, idx) => {
      pSheet.getColumn(idx + 1).width = col.width;
    });

    return pSheet;
  }

  /**
   * Sets up Sheet 3: BULL_PLANT_DEDUCTIONS (Controlled deduction itemization)
   */
  static renderDeductionsSheetHeader(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
    const dedSheet = wb.addWorksheet('BULL PLANT DEDUCTIONS', {
      views: [{ showGridLines: true, state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    const dedHeaders = [
      'Emp ID', 'Employee Name', 'Department', 'PF 12%', 'ESI 0.75%',
      'Canteen', 'Uniform', 'Shoe', 'Other Deduction', 'Total Deductions', 'Status'
    ];
    const hRow = dedSheet.addRow(dedHeaders);
    hRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF991B1B' },
    };
    hRow.height = 24;
    hRow.alignment = { horizontal: 'center', vertical: 'middle' };

    dedSheet.columns = [
      { width: 12 }, { width: 24 }, { width: 18 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 16 }, { width: 16 }, { width: 16 },
    ];

    return dedSheet;
  }

  /**
   * Sets up Sheet 4: BULL_PLANT_SUMMARY (Workforce reconciliations and billing totals)
   */
  static renderSummarySheet(
    wb: ExcelJS.Workbook,
    totalGross: number,
    totalDeductions: number,
    totalNet: number,
    activeCount: number
  ): ExcelJS.Worksheet {
    const sumSheet = wb.addWorksheet('BULL PLANT SUMMARY', {
      views: [{ showGridLines: true }],
    });
    sumSheet.columns = [{ width: 4 }, { width: 36 }, { width: 24 }, { width: 35 }];

    sumSheet.getCell('B2').value = 'BULL MACHINES PLANT 1 — PAYROLL & INVOICE SUMMARY';
    sumSheet.getCell('B2').font = { bold: true, size: 14, color: { argb: 'FF07563D' } };

    const rows: [string, any][] = [
      ['Workforce Active Processed', `${activeCount} Technicians`],
      ['Total Regular & Performance Wages', totalGross],
      ['Total Employee Deductions', totalDeductions],
      ['Total Net Take-Home Disbursement', totalNet],
      ['Employer EPF Contribution (13%)', Math.round(totalGross * 0.0677 * 100) / 100],
      ['Employer ESI Contribution (3.25%)', Math.round(totalGross * 0.024 * 100) / 100],
      ['Vendor Service Charge (8%)', Math.round(totalGross * 0.08)],
    ];

    let rIdx = 4;
    rows.forEach(([lbl, val]) => {
      sumSheet.getCell(`B${rIdx}`).value = lbl;
      sumSheet.getCell(`B${rIdx}`).font = { bold: true, size: 10, color: { argb: 'FF374151' } };
      sumSheet.getCell(`C${rIdx}`).value = val;
      if (typeof val === 'number') sumSheet.getCell(`C${rIdx}`).numFmt = '₹#,##0.00';
      rIdx++;
    });

    return sumSheet;
  }

  /**
   * Sets up Sheet 5: SOURCE_AUDIT_LINEAGE (Lineage traceability)
   */
  static renderAuditLineageHeader(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
    const audSheet = wb.addWorksheet('SOURCE_AUDIT_LINEAGE', {
      views: [{ showGridLines: true, state: 'frozen', xSplit: 2, ySplit: 1 }],
    });

    const audHeaders = [
      'Emp ID', 'Employee Name', 'Pay Days Source', 'Daily Rate Source',
      'Split Ratio Applied', 'OT Matrix Verified', 'Statutory Cap Formula', 'Engine Status'
    ];
    const hRow = audSheet.addRow(audHeaders);
    hRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF374151' },
    };
    hRow.height = 24;

    audSheet.columns = [
      { width: 12 }, { width: 24 }, { width: 28 }, { width: 22 },
      { width: 26 }, { width: 22 }, { width: 26 }, { width: 16 }
    ];

    return audSheet;
  }
}
