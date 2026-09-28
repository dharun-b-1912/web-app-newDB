// src/services/__tests__/vendorInvoicePrintCertification.test.ts
import { describe, it, expect } from 'vitest';
import { VendorInvoicePrintService } from '../vendor/vendorInvoicePrintService';
import { VendorInvoiceRecord } from '../vendor/vendorInvoiceService';

describe('VendorInvoicePrintService Certification', () => {
  const mockInvoice: VendorInvoiceRecord = {
    id: 'inv-test-001',
    vendorId: 'VND-JOY-01',
    invoiceNumber: 'INV-ARJUNA-2026-07-001',
    billingPeriod: '2026-07',
    servicePeriod: '01.07.2026 TO 31.07.2026',
    invoiceDate: '2026-08-07',
    dueDate: '2026-08-31',
    poId: 'PO-ARJUNA-2026-07',
    subtotalAmount: 101505.58,
    taxAmount: 18271.0,
    totalAmount: 119776.58,
    currency: 'INR',
    approvalStatus: 'APPROVED',
    paymentStatus: 'UNPAID',
    vendorLegalName: 'JOY MANPOWER SERVICE',
    vendorAddress: 'No.16, Krishna Complex, Avinashi Main Road, Coimbatore - 641 407',
    vendorGstin: '33AOAPR4773D1Z2',
    vendorPan: 'AOAPR4773D',
    vendorPfCode: 'CB/CBE/1724259000',
    vendorEsicCode: '56001195190001001',
    clientCompanyName: 'Arjuna Natural Pvt Ltd',
    clientAddress: '15/4B, Sirambarayampalayam Road, Coimbatore - 641 659',
    clientGstin: '33AACCA8648K1ZG',
    items: [
      {
        description: "Contract Workforce Wages (Workings gross July'26)",
        workforceCount: 84.5,
        ratePerUnit: 620.0,
        serviceChargePct: 8.0,
        taxRatePct: 18.0,
        lineTotal: 79215.0,
      },
      {
        description: 'Employer PF Contribution @ 13% on Wages',
        workforceCount: 1,
        ratePerUnit: 6810.7,
        serviceChargePct: 0,
        taxRatePct: 18.0,
        lineTotal: 6810.7,
      },
      {
        description: 'Employer ESI Contribution @ 3.25% on Wages',
        workforceCount: 1,
        ratePerUnit: 1702.68,
        serviceChargePct: 0,
        taxRatePct: 18.0,
        lineTotal: 1702.68,
      },
      {
        description: 'Agency Service Charge @ 8% on Gross Contract Wages',
        workforceCount: 1,
        ratePerUnit: 6337.2,
        serviceChargePct: 8.0,
        taxRatePct: 18.0,
        lineTotal: 6337.2,
      },
      {
        description: 'Room & Transport Allowance (Approved Billable Allowance)',
        workforceCount: 93,
        ratePerUnit: 80.0,
        serviceChargePct: 0,
        taxRatePct: 18.0,
        lineTotal: 7440.0,
      },
    ],
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '987654321098',
      ifsc: 'HDFC0001234',
    },
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-07T10:00:00.000Z',
  };

  it('1. converts currency and numbers to Indian English words properly', () => {
    const formatted = VendorInvoicePrintService.formatINR(119776.58);
    expect(formatted).toContain('1,19,776.58');

    const words = VendorInvoicePrintService.numberToWords(119776.58);
    expect(words).toContain('Rupees One Lakh Nineteen Thousand Seven Hundred');
    expect(words).toContain('Seventy Seven Only');
  });

  it('2. generates pristine Tax Invoice (Reference A) HTML without modal chrome', () => {
    const html = VendorInvoicePrintService.generateTaxInvoiceHtml(mockInvoice, 'PO-ARJUNA-2026-07');
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('ORIGINAL FOR RECIPIENT');
    expect(html).toContain('JOY MANPOWER SERVICE');
    expect(html).toContain('Arjuna Natural Pvt Ltd');
    expect(html).toContain('INV-ARJUNA-2026-07-001');
    expect(html).toContain('PO-ARJUNA-2026-07');
    expect(html).toContain('998519'); // SAC Code
    expect(html).toContain('79,215.00');
    expect(html).toContain('1,01,505.58');
    expect(html).toContain('1,19,776.58');
    expect(html).toContain('Amount Chargeable (in words)');
    expect(html).toContain('BANK PAYMENT MANDATE');
    expect(html).toContain('HDFC Bank Ltd');
    expect(html).toContain('Authorized Signatory &amp; Stamp');

    // Asserts zero modal UI artifacts
    expect(html).not.toContain('bg-black/60');
    expect(html).not.toContain('max-w-4xl');
    expect(html).not.toContain('Supporting Documents');
  });

  it('3. generates pristine Monthly Wage Breakup Sheet (Reference B) HTML matching Excel 1:1', () => {
    const html = VendorInvoicePrintService.generateWageBreakupHtml(mockInvoice, 'PO-ARJUNA-2026-07');
    expect(html).toContain('REFERENCE B — STATUTORY &amp; COMMERCIAL ANNEXURE');
    expect(html).toContain('MONTHLY WAGE BREAKUP SHEET');
    expect(html).toContain('INV-ARJUNA-2026-07-001');
    expect(html).toContain('79,215.00'); // Contract Services
    expect(html).toContain('6,810.70'); // PF 13%
    expect(html).toContain('1,702.68'); // ESI 3.25%
    expect(html).toContain('6,337.20'); // Service Charge 8%
    expect(html).toContain('7,440.00'); // Room & Transport
    expect(html).toContain('1,01,505.58'); // Total Taxable Base
    expect(html).toContain('9,135.50'); // CGST
    expect(html).toContain('9,135.50'); // SGST
    expect(html).toContain('1,19,776.58'); // Grand Total
    expect(html).toContain('Statutory Compliance Certification');
    expect(html).toContain('Vendor Billing Desk');
    expect(html).toContain('Authorized Signatory &amp; Stamp');

    // Asserts no toggle buttons or copy button in print output
    expect(html).not.toContain('Excel Clean (79215');
    expect(html).not.toContain('Exact Decimals');
    expect(html).not.toContain('Copy Table');
  });

  it('4. generates combined 2-page dossier with explicit page-break separation', () => {
    const invoiceHtml = VendorInvoicePrintService.generateTaxInvoiceHtml(mockInvoice);
    const breakupHtml = VendorInvoicePrintService.generateWageBreakupHtml(mockInvoice);
    expect(invoiceHtml).toBeDefined();
    expect(breakupHtml).toBeDefined();

    const masterStyles = VendorInvoicePrintService.getMasterPrintStyles();
    expect(masterStyles).toContain('@page');
    expect(masterStyles).toContain('size: A4 portrait');
    expect(masterStyles).toContain('page-break-after: always');
  });
});
