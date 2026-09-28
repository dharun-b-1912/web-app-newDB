import { describe, it, expect, beforeEach } from 'vitest';
import {
  VendorOnboardingService,
  VendorOnboardingDraft,
} from '../vendor/vendorOnboardingService';
import { PurchaseOrderService } from '../vendor/purchaseOrderService';
import {
  VendorManpowerBillingEngine,
  VendorBillingRuleConfig,
} from '../vendor/vendorManpowerBillingEngine';
import {
  VendorInvoiceService,
  VendorInvoiceRecord,
} from '../vendor/vendorInvoiceService';
import { ARJUNA_NATURALS_JULY_2026_WORKERS } from '../vendor/fixtures/arjunaNaturalJuly2026Fixture';
import { PurchaseOrder } from '../../types/vendorPortal';

describe('Joy PeopleHR — Complete End-to-End Enterprise Flow: HR ➔ Vendor ➔ PO ➔ Attendance ➔ Wage Breakup ➔ Invoice ➔ 3-Way Match ➔ Financial Settlement', () => {
  const TEST_ORG_ID = 'org-joy-enterprise-01';
  const TEST_VENDOR_ID = 'JOY MANPOWER SERVICE';
  const TEST_CLIENT_ID = 'arjuna-natural-coimbatore';

  beforeEach(() => {
    // Reset/seed test fixtures if needed
  });

  it('executes the full lifecycle with 100% mathematical and statutory accuracy', async () => {
    // ========================================================================
    // STEP 1: COMPANY HR ONBOARDS VENDOR & CREATES SECURE ACTIVATION TOKEN
    // ========================================================================
    const onboardingSubmission: any = {
      id: 'sub-joy-e2e-001',
      organizationId: TEST_ORG_ID,
      currentStep: 5,
      status: 'SUBMITTED',
      company: {
        legalName: 'JOY MANPOWER SERVICE',
        tradeName: 'Joy Manpower Solutions',
        vendorCode: 'VND-JOY-01',
        companyStructure: 'PRIVATE_LIMITED',
        pan: 'AOAPR4773D',
        gstin: '33AOAPR4773D1Z2',
        msmeNumber: 'UDYAM-TN-03-0012345',
        registeredAddress: {
          street: 'No.16, Krishna Complex, Avinashi Main Road',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641407',
          country: 'India',
        },
        authorizedContact: {
          fullName: 'Thirumalai Murugan',
          email: 'thirumalairk27@gmail.com',
          phone: '+919843012345',
          designation: 'Managing Director',
        },
      },
      statutory: {
        esiRegistrationNumber: '56001195190001001',
        pfRegistrationNumber: 'CB/CBE/1724259000',
        laborLicenseNumber: 'CLRA/TN/2026/0491',
      },
      banking: {
        accountHolderName: 'JOY MANPOWER SERVICE',
        bankName: 'HDFC Bank Ltd',
        accountNumber: '50200088991122',
        ifscCode: 'HDFC0001234',
        branch: 'Peelamedu Coimbatore',
        complianceContact: {
          fullName: 'Thirumalai Murugan',
          email: 'thirumalairk27@gmail.com',
          phone: '+919843012345',
        },
      },
      clientAssignment: {
        clientCompanyId: TEST_CLIENT_ID,
        clientCompanyName: 'Arjuna Natural Pvt Ltd',
        siteName: 'Factory Premises — Unit 2 Plant',
        contractCode: 'CON-ARJUNA-MANPOWER-2026',
        masterPoNumber: 'PO-ARJUNA-2026-07-E2E',
        maxWorkforceCapacity: 50,
        serviceChargePercentage: 8.0,
        contractStartDate: '2026-07-01',
        contractEndDate: '2027-06-30',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save and register vendor
    const regResult = await VendorOnboardingService.registerAndActivateVendor(
      onboardingSubmission,
      'HR Procurement Director'
    );
    expect(regResult.success).toBe(true);
    expect(regResult.submission.vendorId).toBeDefined();
    expect(regResult.token).toBeDefined();
    expect(regResult.activationUrl).toContain('accept-invite');

    // ========================================================================
    // STEP 2: COMPANY HR ISSUES PURCHASE ORDER (PO) & VENDOR ACCEPTS
    // ========================================================================
    const poCreateRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: TEST_ORG_ID,
      vendorId: TEST_VENDOR_ID,
      vendorName: 'JOY MANPOWER SERVICE',
      poNumber: 'PO-ARJUNA-2026-07-E2E',
      contractReference: 'CON-ARJUNA-MANPOWER-2026',
      servicePeriod: '2026-07',
      poDate: '2026-07-01',
      validFrom: '2026-07-01',
      validUntil: '2026-07-31',
      currency: 'INR',
      paymentTerms: 'Net 30',
      deliveryLocation: 'Arjuna Natural Plant Site - Unit 2, Coimbatore',
      costCenter: 'CC-MFG-COIMBATORE',
      department: 'Manpower Operations',
      requestingManager: 'Factory HR Manager',
      notes: 'Approved Purchase Order for July 2026 Contract Workforce',
      items: [
        {
          category: 'MANPOWER_SERVICES',
          description: "Contract Workforce Regular Wages (84.5 days @ ₹620/day)",
          quantity: 84.5,
          unit: 'DAYS',
          unitPrice: 620.0,
          discountPct: 0,
          taxRatePct: 18.0,
        },
        {
          category: 'OVERTIME_SERVICES',
          description: "Contract Workforce Overtime Wages (70.0 hrs approved OT)",
          quantity: 1,
          unit: 'LUMPSUM',
          unitPrice: 26825.0,
          discountPct: 0,
          taxRatePct: 18.0,
        },
        {
          category: 'STATUTORY_PF',
          description: 'Employer PF Contribution @ 13% on Wages',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6810.7,
          discountPct: 0,
          taxRatePct: 18.0,
        },
        {
          category: 'STATUTORY_ESI',
          description: 'Employer ESI Contribution @ 3.25% on Wages',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 1702.68,
          discountPct: 0,
          taxRatePct: 18.0,
        },
        {
          category: 'SERVICE_CHARGE',
          description: 'Agency Service Charge @ 8% on Gross Contract Wages',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6337.2,
          discountPct: 0,
          taxRatePct: 18.0,
        },
        {
          category: 'ROOM_ALLOWANCE',
          description: 'Room Allowance (Approved Billable Allowance)',
          quantity: 93,
          unit: 'DAYS',
          unitPrice: 80.0,
          discountPct: 0,
          taxRatePct: 18.0,
        },
      ],
    });

    expect(poCreateRes.success).toBe(true);
    const po = poCreateRes.po!;
    expect(po.poNumber).toBe('PO-ARJUNA-2026-07-E2E');
    expect(Math.round(po.taxableAmount)).toBe(101506); // 79215 + 6810.7 + 1702.68 + 6337.2 + 7440
    expect(Math.round(po.grandTotal)).toBe(119777);

    // Company Approver approves PO
    const approvePoRes = await PurchaseOrderService.approvePurchaseOrder(
      po.id,
      'Senior HR Vice President',
      'PO Cap and rate card approved for July 2026'
    );
    expect(approvePoRes.success).toBe(true);
    expect(['APPROVED', 'SENT_TO_VENDOR']).toContain(approvePoRes.po?.status);

    // Vendor acknowledges and accepts PO
    const vendorAcceptRes = await PurchaseOrderService.respondToPurchaseOrder({
      poId: po.id,
      actorName: 'Thirumalai Murugan',
      action: 'ACCEPT',
      note: 'PO accepted by Joy Manpower Service. Workforce mobilization confirmed.',
    });
    expect(vendorAcceptRes.success).toBe(true);
    expect(vendorAcceptRes.po?.status).toBe('ACCEPTED');

    // ========================================================================
    // STEP 3: WORKFORCE DEPLOYMENT & VERIFIED BIOMETRIC ATTENDANCE MUSTER
    // ========================================================================
    // Workers:
    // 1. Manikandan P: 25.5 pay days, 22.0 OT hrs
    // 2. Sasikumar R: 30.0 pay days, 24.0 OT hrs
    // 3. Arunkumar M: 29.0 pay days, 24.0 OT hrs
    // Total Pay Days = 84.5 days. Total OT = 70.0 hrs.
    const workerInputs = ARJUNA_NATURALS_JULY_2026_WORKERS.map((w) => ({
      employeeId: w.workerCode,
      employeeCode: w.workerCode,
      employeeName: w.workerName,
      dailyWages: w.dailyWages,
      payDays: w.payDays,
      otHours: w.otHours,
      workingDaysForAllowance: w.allowanceWorkingDays,
    }));

    const totalDaysMuster = workerInputs.reduce((sum, w) => sum + w.payDays, 0);
    const totalOtHoursMuster = workerInputs.reduce((sum, w) => sum + w.otHours, 0);
    expect(totalDaysMuster).toBe(84.5);
    expect(totalOtHoursMuster).toBe(346.0);

    // ========================================================================
    // STEP 4: AUTOMATED WAGE BREAKUP ENGINE (REFERENCE B REPLICATION)
    // ========================================================================
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

    const wageBreakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(
      workerInputs,
      billingRules
    );

    // Deep Statutory Validation:
    // 1. Regular wages: 84.5 days * ₹620 = ₹52,390
    expect(wageBreakup.totalRegularWages).toBe(52390);

    // 2. Overtime wages: (346.0 hrs ot stipend) = ₹26,825
    expect(wageBreakup.totalOtStipend).toBe(26825);

    // 3. Gross Contract Manpower Services = ₹52,390 + ₹26,825 = ₹79,215
    expect(wageBreakup.totalGrossWages).toBe(79215);

    // 4. Employer PF @ 13% on regular wages = ₹6,810.70 (₹6,811)
    expect(Math.round(wageBreakup.employerPfAmount)).toBe(6811);

    // 5. Employer ESI @ 3.25% on regular wages = ₹1,702.68 (₹1,703)
    expect(Math.round(wageBreakup.employerEsiAmount)).toBe(1703);

    // 6. Service Charge @ 8% on Gross = ₹6,337.20 (₹6,337)
    expect(Math.round(wageBreakup.serviceChargesAmount)).toBe(6337);

    // 7. Billable Allowances (Room) = ₹7,440
    expect(wageBreakup.totalBillableAllowances).toBe(7440);

    // 8. Taxable Subtotal = ₹101,505.58 (₹101,506)
    expect(Math.round(wageBreakup.billingBaseTaxable)).toBe(101506);

    // 9. Taxes: CGST 9% (₹9,135.50) + SGST 9% (₹9,135.50) = ₹18,271
    expect(Math.round(wageBreakup.cgstAmount)).toBe(9136);
    expect(Math.round(wageBreakup.sgstAmount)).toBe(9136);
    expect(Math.round(wageBreakup.totalTaxAmount)).toBe(18271);

    // 10. Grand Total = ₹119,776.58 (₹119,777)
    expect(Math.round(wageBreakup.grandTotal)).toBe(119777);
    expect(wageBreakup.grandTotalInWords).toContain('One Lakh Nineteen Thousand Seven Hundred');

    // ========================================================================
    // STEP 5: VENDOR INVOICE SUBMISSION & COMPANY HR 3-WAY MATCH VERIFICATION
    // ========================================================================
    const invCreateRes = await VendorInvoiceService.createInvoice({
      vendorId: TEST_VENDOR_ID,
      organizationId: TEST_ORG_ID,
      poId: po.id,
      invoiceNumber: 'INV-ARJUNA-2026-07-E2E',
      billingPeriod: '2026-07',
      contractReference: 'CON-ARJUNA-MANPOWER-2026',
      invoiceDate: '2026-08-01',
      dueDate: '2026-08-15',
      approvalStatus: 'DRAFT',
      clientCompanyName: 'Arjuna Natural Pvt Ltd',
      clientGstin: '33AACCA8648K1ZG',
      vendorLegalName: 'JOY MANPOWER SERVICE',
      vendorGstin: '33AOAPR4773D1Z2',
      vendorPan: 'AOAPR4773D',
      vendorPfCode: 'CB/CBE/1724259000',
      vendorEsicCode: '56001195190001001',
      sacCode: '998519',
      servicePeriod: '01.07.2026 TO 31.07.2026',
      calculationBreakup: wageBreakup,
      items: [
        {
          category: 'MANPOWER_SERVICES',
          description: 'Contract Manpower Services (84.5 days muster)',
          workforceCount: 84.5,
          ratePerUnit: 620,
          serviceChargePct: 8.0,
          taxRatePct: 18.0,
          lineTotal: 79215.0,
        },
        {
          category: 'STATUTORY_PF',
          description: 'Employer PF Contribution @ 13% on Wages',
          workforceCount: 1,
          ratePerUnit: 6810.7,
          lineTotal: 6810.7,
        },
        {
          category: 'STATUTORY_ESI',
          description: 'Employer ESI Contribution @ 3.25% on Wages',
          workforceCount: 1,
          ratePerUnit: 1702.68,
          lineTotal: 1702.68,
        },
        {
          category: 'SERVICE_CHARGE',
          description: 'Service Charges @ 8% on Gross',
          workforceCount: 1,
          ratePerUnit: 6337.2,
          lineTotal: 6337.2,
        },
        {
          category: 'ROOM_ALLOWANCE',
          description: 'Room Allowance',
          workforceCount: 93,
          ratePerUnit: 80,
          lineTotal: 7440.0,
        },
      ],
    });

    expect(invCreateRes.success).toBe(true);
    const invoice = invCreateRes.invoice!;

    // Upload Statutory Proofs into Document Vault
    await VendorInvoiceService.uploadSupportingDocument(invoice.id, {
      documentType: 'PF_ECR_CHALLAN',
      fileName: 'PF_Challan_ECR_July2026.pdf',
      fileSize: 1024 * 120,
      uploadedBy: 'Vendor Account Admin',
    });
    await VendorInvoiceService.uploadSupportingDocument(invoice.id, {
      documentType: 'ESI_MONTHLY_RECEIPT',
      fileName: 'ESI_Receipt_July2026.pdf',
      fileSize: 1024 * 85,
      uploadedBy: 'Vendor Account Admin',
    });
    await VendorInvoiceService.uploadSupportingDocument(invoice.id, {
      documentType: 'WAGE_REGISTER_SIGNATURED',
      fileName: 'Signed_Wage_Register_July2026.pdf',
      fileSize: 1024 * 310,
      uploadedBy: 'Vendor Account Admin',
    });

    // Vendor Submits Invoice
    const submitRes = await VendorInvoiceService.submitInvoice(invoice.id, 'Thirumalai Murugan');
    expect(submitRes.success).toBe(true);
    expect(submitRes.invoice?.approvalStatus).toBe('SUBMITTED');

    // Run 3-Way Match (PO vs Attendance Muster vs Invoice)
    const matchResult = VendorInvoiceService.perform3WayMatch(
      submitRes.invoice!,
      po,
      84.5
    );
    expect(matchResult.isMatched).toBe(true);
    expect(matchResult.matchingStatus).toBe('MATCHED');
    expect(matchResult.quantityVariance).toBe(0);

    // Company HR completes 10-Point Audit Sign-Off
    const reviewChecklist = {
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
    await VendorInvoiceService.updateReviewChecklist(
      invoice.id,
      reviewChecklist,
      'Verified against Arjuna Natural biometric turnstile logs and PO-ARJUNA-2026-07-E2E rate card.'
    );

    // Company HR Approves Invoice
    const approveInvRes = await VendorInvoiceService.reviewInvoice(invoice.id, {
      decision: 'APPROVE',
      reviewerRemarks: 'Verified and approved for Accounts Payable processing.',
      reviewerId: 'hr-director-01',
    });
    expect(approveInvRes.success).toBe(true);
    expect(approveInvRes.invoice?.approvalStatus).toBe('APPROVED');
    expect(approveInvRes.invoice?.paymentStatus).toBe('UNPAID'); // Payment remains strictly unreleased until AP settlement

    // ========================================================================
    // STEP 6: FINANCIAL SETTLEMENT, STATUTORY TDS (SEC 194C) & NET DISBURSEMENT
    // ========================================================================
    // Company Accounts Payable runs Settlement Engine:
    // Taxable Base: ₹101,505.58
    // TDS under Section 194C @ 2% for Corporate Contractor:
    // TDS = 101,505.58 * 2% = ₹2,030.11
    // Performance Retention @ 5%:
    // Retention = 101,505.58 * 5% = ₹5,075.28
    // Gross Invoice: ₹119,776.58
    // Net Payable: ₹119,776.58 - ₹2,030.11 - ₹5,075.28 = ₹112,671.19
    const settlement = await VendorInvoiceService.calculateSettlement(invoice.id, {
      tdsSection: '194C_COMPANY_2PCT',
      retentionPct: 5.0,
      penaltyOrDeductions: 0,
    });

    expect(settlement.tdsSection).toBe('194C_COMPANY_2PCT');
    expect(settlement.tdsRatePct).toBe(2.0);
    expect(Math.round(settlement.tdsAmount)).toBe(2030); // ₹2,030.11
    expect(Math.round(settlement.retentionAmount)).toBe(5075); // ₹5,075.28
    expect(Math.round(settlement.grossInvoiceAmount)).toBe(119777); // ₹119,776.58
    expect(Math.round(settlement.netPayableAmount)).toBe(112671); // ₹112,671.19
    expect(settlement.netPayableInWords).toContain('One Lakh Twelve Thousand Six Hundred Seventy');

    // Accounts Payable releases funds via NEFT with official UTR
    const disbursementRes = await VendorInvoiceService.recordSettlementDisbursement(
      invoice.id,
      {
        utrNumber: 'UTR-HDFC-20260805-778899',
        paymentMode: 'NEFT',
        bankAccount: '50200088991122',
        bankName: 'HDFC Bank Ltd',
        ifsc: 'HDFC0001234',
        disbursedAt: new Date().toISOString(),
        processedBy: 'Head of Accounts Payable',
      }
    );

    expect(disbursementRes.success).toBe(true);
    expect(disbursementRes.invoice?.paymentStatus).toBe('PAID');
    expect(disbursementRes.settlement?.settlementStatus).toBe('DISBURSED');
    expect(disbursementRes.settlement?.disbursementDetails?.utrNumber).toBe('UTR-HDFC-20260805-778899');
    expect(disbursementRes.settlement?.disbursementDetails?.bankAccountMasked).toBe('••••••••1122');

    // PO Balance Reconciliation Verification
    expect(disbursementRes.settlement?.poReconciliation).toBeDefined();
    expect(disbursementRes.settlement?.poReconciliation?.poNumber).toBe('PO-ARJUNA-2026-07-E2E');
    expect(Math.round(disbursementRes.settlement?.poReconciliation?.currentDisbursement || 0)).toBe(119777);
  });
});
