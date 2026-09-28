// src/services/__tests__/vendorEndToEndProcurementWorkflow.test.ts
// ============================================================================
// Joy PeopleHR — Enterprise End-to-End Procurement & Billing Engine Tests
// Workflow: Company PO -> Dispatch -> Vendor Acceptance -> Attendance & OT
//           -> Billing Rule Engine -> Invoice Prep -> 3-Way Match & Approval -> Payment
// ============================================================================

import { describe, it, expect } from 'vitest';
import { PurchaseOrderService } from '../vendor/purchaseOrderService';
import { VendorAttendanceReconciliationService } from '../vendor/vendorAttendanceReconciliationService';
import { VendorInvoiceService } from '../vendor/vendorInvoiceService';
import { VendorManpowerBillingEngine } from '../vendor/vendorManpowerBillingEngine';
import {
  ARJUNA_NATURALS_WORKBOOK_BENCHMARK,
  ARJUNA_NATURALS_JULY_2026_WORKERS,
} from '../vendor/fixtures/arjunaNaturalJuly2026Fixture';

describe('Vendor Procurement to Company Approval End-to-End Lifecycle', () => {
  const orgId = 'org-arjuna-natural';
  const vendorId = 'JOY MANPOWER SERVICE';
  const contractRef = 'CON-ARJUNA-MANPOWER-2026';
  const period = '2026-07';

  it('Phase 1 & 2: Company creates PO, approves, and dispatches to Vendor', async () => {
    // 1. Company Procurement creates PO with declared line items
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-TEST-ARJUNA-2026-07',
      contractReference: contractRef,
      servicePeriod: period,
      lineItems: [
        {
          category: 'MANPOWER_SERVICES',
          description: 'Contract Workforce Wages (Workings gross for July 2026)',
          quantity: 23,
          unit: 'WORKERS',
          unitPrice: 3444.13, // 79,215 / 23
          taxRatePct: 0,
        },
        {
          category: 'STATUTORY_PF',
          description: 'Employer PF Contribution @ 13% on regular wages (₹52,390)',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6810.7,
          taxRatePct: 0,
        },
        {
          category: 'STATUTORY_ESI',
          description: 'Employer ESI Contribution @ 3.25% on regular wages (₹52,390)',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 1702.68,
          taxRatePct: 0,
        },
        {
          category: 'SERVICE_CHARGE',
          description: 'Agency Service Charges @ 8% on Gross (₹79,215)',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6337.2,
          taxRatePct: 0,
        },
        {
          category: 'ALLOWANCE_ROOM',
          description: 'ADD Room Allowance @ 50 (93 W Days)',
          quantity: 93,
          unit: 'DAYS',
          unitPrice: 50.0,
          taxRatePct: 0,
        },
        {
          category: 'ALLOWANCE_TRANSPORT',
          description: 'ADD Transport Allowance @ 30 (93 W Days)',
          quantity: 93,
          unit: 'DAYS',
          unitPrice: 30.0,
          taxRatePct: 0,
        },
      ],
    });

    expect(poRes.success).toBe(true);
    expect(poRes.po).toBeDefined();
    const po = poRes.po!;
    expect(po.status).toBe('DRAFT');

    // 2. Company Approves PO and dispatches
    const approveRes = await PurchaseOrderService.approvePurchaseOrder({
      poId: po.id,
      approverName: 'Procurement Director',
      action: 'APPROVED',
      comments: 'Approved per contractual rate card for July 2026',
    });

    expect(approveRes.success).toBe(true);
    expect(approveRes.po?.status).toBe('SENT_TO_VENDOR');
  });

  it('Phase 3: Vendor reviews PO and accepts', async () => {
    // 1. Create and dispatch PO
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-ACCEPT-TEST-2026-07',
      contractReference: contractRef,
      servicePeriod: period,
      lineItems: [
        {
          category: 'MANPOWER_SERVICES',
          description: 'Contract Workforce Wages',
          quantity: 23,
          unitPrice: 3444.13,
          taxRatePct: 0,
        },
      ],
    });
    const poId = poRes.po!.id;
    await PurchaseOrderService.approvePurchaseOrder(poId);

    // 2. Vendor responds: ACCEPT
    const acceptRes = await PurchaseOrderService.respondToPurchaseOrder({
      poId,
      actorName: 'Joy Manpower Operations Head',
      action: 'ACCEPT',
      remarks: 'Terms accepted, deployed 23 staff to Coimbatore plant',
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.po?.status).toBe('ACCEPTED');
  });

  it('Phase 4: Workforce attendance, OT & allowance reconciliation matches Excel', () => {
    const recon = VendorAttendanceReconciliationService.loadArjunaNaturalsReconciliation({
      organizationId: orgId,
      vendorId,
    });

    expect(recon.totalDeployedWorkers).toBe(23);
    expect(recon.totalPayDays).toBe(84.5);
    expect(recon.totalApprovedOtHours).toBe(346);
    expect(recon.totalRegularWages).toBe(52390);
    expect(recon.totalOtStipend).toBe(26825);
    expect(recon.totalGrossWages).toBe(79215);

    // Allowances
    expect(recon.totalAllowanceWorkingDays).toBe(93);
    expect(recon.totalRoomAllowance).toBe(4650);
    expect(recon.totalTransportAllowance).toBe(2790);
    expect(recon.totalAllowanceAmount).toBe(7440);
  });

  it('Phase 5: Billing Rule Engine calculates exact line items with explicit source bases', () => {
    const inputPayroll = ARJUNA_NATURALS_JULY_2026_WORKERS.map((w) => ({
      employeeId: `emp-${w.workerCode.toLowerCase()}`,
      employeeCode: w.workerCode,
      employeeName: w.workerName,
      dailyWages: w.dailyWages,
      payDays: w.payDays,
      otHours: w.otHours,
      workingDaysForAllowance: w.allowanceWorkingDays,
    }));

    const result = VendorManpowerBillingEngine.calculateVendorBillingBreakup(inputPayroll, {
      employerPfPct: 13.0,
      employerEsiPct: 3.25,
      serviceChargePct: 8.0,
      roomAllowancePerDay: 50.0,
      transportAllowancePerDay: 30.0,
      isRoomAllowanceBillable: true,
      isTransportAllowanceBillable: true,
      cgstPct: 9.0,
      sgstPct: 9.0,
      roundGrandTotalToNearestRupee: true,
    });

    // Bases
    expect(result.contractServicesBase).toBe(79215);
    expect(result.totalRegularWages).toBe(52390);

    // Statutory line items on basic base (₹52,390)
    expect(result.employerPfAmount).toBe(6810.7);
    expect(Math.round(result.employerPfAmount)).toBe(6811);
    expect(result.employerEsiAmount).toBe(1702.68);
    expect(Math.round(result.employerEsiAmount)).toBe(1703);

    // Service Charge on gross base (₹79,215)
    expect(result.serviceChargesAmount).toBe(6337.2);
    expect(Math.round(result.serviceChargesAmount)).toBe(6337);

    // Allowances on 93 days
    expect(result.roomAllowanceTotal).toBe(4650);
    expect(result.transportAllowanceTotal).toBe(2790);
    expect(result.totalAllowances).toBe(7440);

    // Taxable Subtotal
    expect(result.billingBaseTaxable).toBe(101505.58);
    expect(Math.round(result.billingBaseTaxable)).toBe(101506);

    // GST @ 9% each
    expect(result.cgstAmount).toBe(9135.5);
    expect(Math.round(result.cgstAmount)).toBe(9136);
    expect(result.sgstAmount).toBe(9135.5);
    expect(Math.round(result.sgstAmount)).toBe(9136);

    // Grand total
    expect(result.grandTotal).toBe(119776.58);
    expect(result.grandTotalRounded).toBe(119777);
  });

  it('Phase 6, 7 & 8: Vendor submits invoice, Company 3-way match approves & tracks payment', async () => {
    const recon = VendorAttendanceReconciliationService.loadArjunaNaturalsReconciliation({
      organizationId: orgId,
      vendorId,
    });

    // 1. Create and accept PO matching verified workforce requirements
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-3WAY-2026-07',
      contractReference: contractRef,
      servicePeriod: period,
      lineItems: [
        {
          category: 'WAGES',
          description: 'Contract Workforce Regular & OT Wages',
          quantity: 23,
          unitPrice: 3444.13,
          taxRatePct: 18.0,
        },
      ],
    });
    const poId = poRes.po!.id;
    await PurchaseOrderService.approvePurchaseOrder(poId);
    await PurchaseOrderService.respondToPurchaseOrder({ poId, action: 'ACCEPT' });

    // 2. Vendor submits invoice against the accepted PO and verified reconciliation
    const invRes = await VendorInvoiceService.createInvoiceFromReconciliation({
      organizationId: orgId,
      vendorId,
      po: poRes.po!,
      reconciliation: recon,
      invoiceNumber: 'INV-JOY-2026-0099',
      billingRuleConfig: {
        employerPfPct: 13.0,
        employerEsiPct: 3.25,
        serviceChargePct: 8.0,
        roomAllowancePerDay: 50.0,
        transportAllowancePerDay: 30.0,
        isRoomAllowanceBillable: true,
        isTransportAllowanceBillable: true,
      },
    });

    expect(invRes.success).toBe(true);
    const invoice = invRes.invoice!;
    expect(invoice.approvalStatus).toBe('SUBMITTED');

    // 3. Company runs 3-way match review
    const match = VendorInvoiceService.perform3WayMatch(invoice, poRes.po, recon);
    expect(match.matchStatus).toBe('MATCHED');
    expect(match.rateVariance).toBe(0);

    // 4. Company Approves Invoice
    const reviewRes = await VendorInvoiceService.updateApprovalStatus(
      invoice.id,
      'APPROVED',
      '3-way match verified against 84.5 days muster and approved PO rates'
    );
    expect(reviewRes.success).toBe(true);

    const updatedInv = await VendorInvoiceService.getInvoiceById(invoice.id);
    expect(updatedInv?.approvalStatus).toBe('APPROVED');

    // 5. Finance Disbursements Tracking
    const payRes1 = await VendorInvoiceService.updatePaymentStatus(
      invoice.id,
      'PAYMENT_PROCESSING'
    );
    expect(payRes1.success).toBe(true);

    const payRes2 = await VendorInvoiceService.updatePaymentStatus(
      invoice.id,
      'PAID',
      'CMS-HDFC-99281726'
    );
    expect(payRes2.success).toBe(true);

    const finalInv = await VendorInvoiceService.getInvoiceById(invoice.id);
    expect(finalInv?.paymentStatus).toBe('PAID');
    expect(finalInv?.paymentReference).toBe('CMS-HDFC-99281726');
  });
});
