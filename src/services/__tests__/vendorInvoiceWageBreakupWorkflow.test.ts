import { describe, it, expect, beforeEach } from 'vitest';
import {
  VendorInvoiceService,
  VendorInvoiceRecord,
  CreateInvoiceInput,
} from '../vendor/vendorInvoiceService';
import {
  VendorManpowerBillingEngine,
  VendorBillingRuleConfig,
} from '../vendor/vendorManpowerBillingEngine';
import { ARJUNA_NATURALS_JULY_2026_WORKERS } from '../vendor/fixtures/arjunaNaturalJuly2026Fixture';

describe('Joy PeopleHR — Enterprise Vendor Invoice & Wage Breakup Workflow', () => {
  const TEST_ORG_ID = 'org-joy-main';
  const TEST_VENDOR_ID = 'JOY MANPOWER SERVICE';
  const TEST_PO_ID = 'PO-ARJUNA-2026-07-001';

  beforeEach(() => {
    // Clean test state if needed
  });

  describe('1. Automated Wage Breakup Engine (Reference B Compliance)', () => {
    it('accurately calculates the Reference B July 2026 wage breakup matching ₹119,777 grand total', () => {
      const billingRules: VendorBillingRuleConfig = {
        employerPfPct: 13.0,
        employerEsiPct: 3.25,
        serviceChargePct: 8.0,
        fixedRoomAllowance: 7440.0,
        fixedTransportAllowance: 0.0,
        isRoomAllowanceBillable: true,
        isTransportAllowanceBillable: false,
        cgstPct: 9.0,
        sgstPct: 9.0,
      };

      const workerInputs = ARJUNA_NATURALS_JULY_2026_WORKERS.map((w) => ({
        employeeId: w.workerCode,
        employeeCode: w.workerCode,
        employeeName: w.workerName,
        dailyWages: w.dailyWages,
        payDays: w.payDays,
        otHours: w.otHours,
        workingDaysForAllowance: w.allowanceWorkingDays,
      }));

      const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(
        workerInputs,
        billingRules
      );

      // Verify exact values matching Reference B:
      // S.No 1: Contract Manpower Services = ₹79,215
      expect(breakup.totalGrossWages).toBe(79215);

      // S.No 2: PF Employer Contribution @ 13% on Rs. 52,390 = ₹6,811 (6810.7)
      expect(breakup.totalRegularWages).toBe(52390);
      expect(Math.round(breakup.employerPfAmount)).toBe(6811);

      // S.No 3: ESI Employer Contribution @ 3.25% on Rs. 52,390 = ₹1,703 (1702.68)
      expect(breakup.totalRegularWages).toBe(52390);
      expect(Math.round(breakup.employerEsiAmount)).toBe(1703);

      // S.No 4: Service Charges @ 8% on Gross = ₹6,337 (6337.20)
      expect(Math.round(breakup.serviceChargesAmount)).toBe(6337);

      // S.No 5 & 6: Room + Transport Allowances = ₹7,440
      expect(breakup.totalBillableAllowances).toBe(7440);

      // Subtotal before tax = ₹101,506 (101505.58)
      expect(Math.round(breakup.billingBaseTaxable)).toBe(101506);

      // S.No 7 & 8: CGST @ 9% & SGST @ 9% = ₹9,136 each (9135.50)
      expect(Math.round(breakup.cgstAmount)).toBe(9136);
      expect(Math.round(breakup.sgstAmount)).toBe(9136);

      // Grand Total = ₹119,777 (119776.58)
      expect(Math.round(breakup.grandTotal)).toBe(119777);

      // Amount in words
      expect(breakup.grandTotalInWords).toContain('One Lakh Nineteen Thousand');
    });
  });

  describe('2. Vendor Invoice Creation, Dual Preview & Status Flow', () => {
    it('creates an invoice in DRAFT mode with full Reference A & B statutory metadata', async () => {
      const createInput: CreateInvoiceInput = {
        vendorId: TEST_VENDOR_ID,
        organizationId: TEST_ORG_ID,
        poId: TEST_PO_ID,
        invoiceNumber: 'INV-TEST-2026-07-888',
        billingPeriod: '2026-07',
        contractReference: 'CON-ARJUNA-2026',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-15',
        approvalStatus: 'DRAFT',
        clientCompanyName: 'Arjuna Natural Pvt Ltd',
        clientAddress: '15/4B, Sirambarayampalayam Road, Coimbatore - 641659',
        clientGstin: '33AACCA8648K1ZG',
        vendorLegalName: 'JOY MANPOWER SERVICE',
        vendorAddress: 'No.16, Krishna complex, Avinashi main road, Coimbatore - 641 407',
        vendorGstin: '33AOAPR4773D1Z2',
        vendorPan: 'AOAPR4773D',
        vendorPfCode: 'CB/CBE/1724259000',
        vendorEsicCode: '56001195190001001',
        sacCode: '998519',
        servicePeriod: '01.07.2026 TO 31.07.2026',
        items: [
          {
            description: 'Contract Manpower Services (84.5 days muster)',
            workforceCount: 84.5,
            ratePerUnit: 620,
            serviceChargePct: 8.0,
            taxRatePct: 18.0,
            lineTotal: 79215.0,
          },
          {
            description: 'Employer PF Contribution @ 13% on Wages',
            workforceCount: 1,
            ratePerUnit: 6811,
            lineTotal: 6811,
          },
          {
            description: 'Employer ESI Contribution @ 3.25% on Wages',
            workforceCount: 1,
            ratePerUnit: 1703,
            lineTotal: 1703,
          },
          {
            description: 'Service Charges @ 8% on Gross',
            workforceCount: 1,
            ratePerUnit: 6337,
            lineTotal: 6337,
          },
          {
            description: 'Room & Transport Allowance',
            workforceCount: 93,
            ratePerUnit: 80,
            lineTotal: 7440,
          },
        ],
      };

      const result = await VendorInvoiceService.createInvoice(createInput);
      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();

      const inv = result.invoice!;
      expect(inv.approvalStatus).toBe('DRAFT');
      expect(inv.paymentStatus).toBe('UNPAID');
      expect(inv.vendorGstin).toBe('33AOAPR4773D1Z2');
      expect(inv.sacCode).toBe('998519');
      expect(inv.clientGstin).toBe('33AACCA8648K1ZG');
      expect(inv.servicePeriod).toBe('01.07.2026 TO 31.07.2026');

      // Upload required supporting documents
      const docResult1 = await VendorInvoiceService.uploadSupportingDocument(inv.id, {
        documentType: 'INVOICE_PDF',
        fileName: 'Tax_Invoice_INV-888.pdf',
        fileSize: 1024 * 180,
        uploadedBy: 'Vendor Account Admin',
      });
      expect(docResult1.success).toBe(true);
      expect(docResult1.document?.status).toBe('PENDING');

      const docResult2 = await VendorInvoiceService.uploadSupportingDocument(inv.id, {
        documentType: 'PF_CHALLAN',
        fileName: 'PF_ECR_Receipt_July2026.pdf',
        fileSize: 1024 * 95,
        uploadedBy: 'Vendor Account Admin',
      });
      expect(docResult2.success).toBe(true);

      // Verify documents attached to invoice
      const updatedInv = await VendorInvoiceService.getInvoiceById(inv.id);
      expect(updatedInv?.supportingDocuments?.length).toBe(2);

      // Transition Draft to Submitted
      const submitResult = await VendorInvoiceService.submitInvoice(inv.id, 'Vendor Compliance Head');
      expect(submitResult.success).toBe(true);
      expect(submitResult.invoice?.approvalStatus).toBe('SUBMITTED');

      // Audit history records submission
      expect(submitResult.invoice?.statusHistory?.length).toBeGreaterThanOrEqual(2);
      const latestHistory = submitResult.invoice?.statusHistory?.slice(-1)[0];
      expect(latestHistory?.toStatus).toBe('SUBMITTED');
      expect(latestHistory?.changedBy).toBe('Vendor Compliance Head');
    });

    it('supports Company HR 3-Way match verification and sign-off checklist', async () => {
      // Create submitted invoice for review
      const invRes = await VendorInvoiceService.createInvoice({
        vendorId: TEST_VENDOR_ID,
        organizationId: TEST_ORG_ID,
        poId: TEST_PO_ID,
        invoiceNumber: 'INV-TEST-HR-REVIEW-001',
        billingPeriod: '2026-07',
        approvalStatus: 'SUBMITTED',
        items: [
          {
            description: 'Contract Manpower Services',
            workforceCount: 84.5,
            ratePerUnit: 620,
            lineTotal: 79215.0,
          },
        ],
      });

      const inv = invRes.invoice!;

      // Complete Company HR Review Checklist
      const checklistData = {
        vendor_active: true,
        po_valid: true,
        contract_active: true,
        inv_number_unique: true,
        billing_period_valid: true,
        wage_breakup_matched: true,
        rate_card_matched: true,
        statutory_rates_validated: true,
        attendance_muster_verified: true,
        compliance_docs_available: true,
      };

      const checklistRes = await VendorInvoiceService.updateReviewChecklist(
        inv.id,
        checklistData,
        'All muster punch logs verified. 3-way match verified against PO rate card.'
      );
      expect(checklistRes.success).toBe(true);
      expect(checklistRes.invoice?.reviewChecklist?.vendor_active).toBe(true);
      expect(checklistRes.invoice?.reviewChecklist?.attendance_muster_verified).toBe(true);
      expect(checklistRes.invoice?.reviewerRemarks).toContain('3-way match verified');

      // HR Approves Invoice
      const approveRes = await VendorInvoiceService.reviewInvoice(inv.id, {
        decision: 'APPROVE',
        reviewerRemarks: 'Approved for Accounts Payable processing',
        reviewerId: 'hr-head-01',
      });
      expect(approveRes.success).toBe(true);
      expect(approveRes.invoice?.approvalStatus).toBe('APPROVED');
      expect(approveRes.invoice?.paymentStatus).toBe('UNPAID'); // Payment remains strictly separate

      // Finance Disbursement Processing with UTR reference
      const paymentRes = await VendorInvoiceService.updatePaymentStatus(
        inv.id,
        'PAID',
        'UTR-HDFC-20260805-998877'
      );
      expect(paymentRes.success).toBe(true);

      const finalInv = await VendorInvoiceService.getInvoiceById(inv.id);
      expect(finalInv?.paymentStatus).toBe('PAID');
      expect(finalInv?.paymentReference).toBe('UTR-HDFC-20260805-998877');
      expect(finalInv?.paidAt).toBeDefined();
    });

    it('handles Return for Correction workflow gracefully', async () => {
      const invRes = await VendorInvoiceService.createInvoice({
        vendorId: TEST_VENDOR_ID,
        organizationId: TEST_ORG_ID,
        poId: TEST_PO_ID,
        invoiceNumber: 'INV-TEST-DISCREPANCY-002',
        billingPeriod: '2026-07',
        approvalStatus: 'SUBMITTED',
        items: [
          {
            description: 'Contract Manpower Services (Incorrect Days)',
            workforceCount: 95.0, // Variance: attendance says 84.5
            ratePerUnit: 620,
            lineTotal: 58900.0,
          },
        ],
      });

      const inv = invRes.invoice!;

      // HR sends correction request
      const reviewRes = await VendorInvoiceService.reviewInvoice(inv.id, {
        decision: 'REQUEST_CHANGE',
        reviewerRemarks: 'Billed days (95.0) exceed verified muster punches (84.5 days). Please reconcile and resubmit.',
        reviewerId: 'hr-auditor-02',
      });

      expect(reviewRes.success).toBe(true);
      expect(reviewRes.invoice?.approvalStatus).toBe('CORRECTION_REQUIRED');
      expect(reviewRes.invoice?.reviewerRemarks).toContain('Billed days (95.0) exceed verified muster');
    });
  });
});
