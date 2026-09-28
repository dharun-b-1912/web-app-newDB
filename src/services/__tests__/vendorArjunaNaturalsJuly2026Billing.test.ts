// src/services/__tests__/vendorArjunaNaturalsJuly2026Billing.test.ts
// ============================================================================
// Joy PeopleHR — Arjuna Naturals July 2026 Complete Vendor Workflow Test Suite
// Test Fixture: Test Data/ARJUNA NATURALS INVOICE JULY'26.xlsx
// Validates:
//   1. 23-Employee wage, OT, PF, and ESI mathematical integrity
//   2. Authoritative Breakup Sheet replication (Subtotal ₹101,505.58, Grand Total ₹119,776.58)
//   3. Transport allowance inclusion scenario (Subtotal ₹105,225.58, Grand Total ₹124,166.18)
//   4. Full PO → Attendance Reconciliation → Invoice → 3-Way Match → Company Approval → Payment lifecycle
//   5. Rate and headcount discrepancy defense
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  ARJUNA_NATURALS_JULY_2026_WORKERS,
  ARJUNA_NATURALS_WORKBOOK_BENCHMARK,
  getArjunaPayrollInputs,
} from '../vendor/fixtures/arjunaNaturalJuly2026Fixture';
import {
  VendorManpowerBillingEngine,
  VendorBillingRuleConfig,
} from '../vendor/vendorManpowerBillingEngine';
import { VendorAttendanceReconciliationService } from '../vendor/vendorAttendanceReconciliationService';
import { PurchaseOrderService } from '../vendor/purchaseOrderService';
import { VendorInvoiceService } from '../vendor/vendorInvoiceService';

describe("Arjuna Naturals July 2026 Vendor PO → Attendance → OT → Invoice → Company Approval Suite", () => {
  const orgId = 'org-arjuna-natural';
  const vendorId = 'VEN-JOY-001';

  it('1. Reconciles all 23 employee wage and OT calculations from Workings sheet', () => {
    const inputs = getArjunaPayrollInputs();
    expect(inputs.length).toBe(23);

    const config: VendorBillingRuleConfig = {
      statutoryBase: 'REGULAR_WAGES',
      employeePfPct: 12.0,
      employeeEsiPct: 0.75,
    };

    let totalRegularWages = 0;
    let totalOtHours = 0;
    let totalOtStipend = 0;
    let totalGrossWages = 0;
    let totalEmployeePf = 0;
    let totalEmployeeEsi = 0;
    let totalNetPay = 0;

    inputs.forEach((empInput, idx) => {
      const benchmark = ARJUNA_NATURALS_JULY_2026_WORKERS[idx];
      const res = VendorManpowerBillingEngine.calculateEmployeePayroll(empInput, config);

      expect(res.regularWages).toBe(benchmark.regularWages);
      expect(res.otHours).toBe(benchmark.otHours);
      expect(res.otStipend).toBe(benchmark.otStipend);
      expect(res.grossWages).toBe(benchmark.grossWages);
      expect(res.employeePf).toBe(benchmark.employeePf);
      expect(res.employeeEsi).toBe(benchmark.employeeEsi);
      expect(res.netPay).toBe(benchmark.netPay);

      totalRegularWages += res.regularWages;
      totalOtHours += res.otHours;
      totalOtStipend += res.otStipend;
      totalGrossWages += res.grossWages;
      totalEmployeePf += res.employeePf;
      totalEmployeeEsi += res.employeeEsi;
      totalNetPay += res.netPay;
    });

    const expected = ARJUNA_NATURALS_WORKBOOK_BENCHMARK.employeePayrollTotals;
    expect(totalRegularWages).toBe(expected.totalRegularWages); // ₹52,390
    expect(totalOtHours).toBe(expected.totalOtHours); // 346 hours
    expect(totalOtStipend).toBe(expected.totalOtStipend); // ₹26,825
    expect(totalGrossWages).toBe(expected.totalGrossWages); // ₹79,215
    expect(totalEmployeePf).toBe(expected.totalEmployeePf); // ₹6,289
    expect(totalEmployeeEsi).toBe(expected.totalEmployeeEsi); // ₹398
    expect(totalNetPay).toBe(expected.totalNetPayToWorkers); // ₹72,528
  });

  it('2. Reproduces exact Breakup Sheet billing calculations (Subtotal ₹101,505.58, Grand Total ₹119,776.58)', () => {
    const inputs = getArjunaPayrollInputs();

    // Baseline configuration matching the workbook stored values
    const config: VendorBillingRuleConfig = {
      employerPfPct: 13.0,
      employerEsiPct: 3.25,
      serviceChargePct: 8.0,
      fixedRoomAllowance: 7440.0, // Stored workbook line 5 value
      isRoomAllowanceBillable: true,
      isTransportAllowanceBillable: false, // Workbook line 6: not in billing subtotal
      isContractWagesGross: true,
      cgstPct: 9.0,
      sgstPct: 9.0,
    };

    const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(inputs, config);

    const b = ARJUNA_NATURALS_WORKBOOK_BENCHMARK.billingBreakupTotals;
    expect(breakup.totalEmployeesCount).toBe(23);
    expect(breakup.contractServicesBase).toBe(b.contractServicesBase); // ₹79,215.00
    expect(breakup.employerPfAmount).toBe(b.employerPfAmount); // ₹6,810.70
    expect(Math.abs(breakup.employerEsiAmount - b.employerEsiAmount)).toBeLessThanOrEqual(0.01); // ₹1,702.68
    expect(breakup.serviceChargesAmount).toBe(b.serviceChargeAmount); // ₹6,337.20
    expect(breakup.billableRoomAllowance).toBe(b.roomAllowanceAmount); // ₹7,440.00
    expect(breakup.billableTransportAllowance).toBe(0); // Excluded as per workbook

    // Taxable subtotal: 79215 + 6810.7 + 1702.68 + 6337.2 + 7440 = 101,505.58
    expect(Math.abs(breakup.billingBaseTaxable - b.billingSubtotal)).toBeLessThanOrEqual(0.01);

    // Taxes: 9% CGST + 9% SGST
    expect(Math.abs(breakup.cgstAmount - b.cgstAmount)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(breakup.sgstAmount - b.sgstAmount)).toBeLessThanOrEqual(0.01);

    // Grand total: ₹119,776.58
    expect(Math.abs(breakup.grandTotal - b.grandTotal)).toBeLessThanOrEqual(0.01);
    expect(breakup.grandTotalRounded).toBe(b.grandTotalRounded); // 119,777
    expect(breakup.grandTotalInWords).toContain('Rupees One Lakh Nineteen Thousand Seven Hundred');
  });

  it('3. Evaluates Transport-Inclusive Scenario accurately (Subtotal ₹105,225.58, Grand Total ₹124,166.18)', () => {
    const inputs = getArjunaPayrollInputs();

    // Scenario where PO explicitly approves ₹3,720.00 transport allowance
    const config: VendorBillingRuleConfig = {
      employerPfPct: 13.0,
      employerEsiPct: 3.25,
      serviceChargePct: 8.0,
      fixedRoomAllowance: 7440.0,
      fixedTransportAllowance: 3720.0,
      isRoomAllowanceBillable: true,
      isTransportAllowanceBillable: true,
      isContractWagesGross: true,
      cgstPct: 9.0,
      sgstPct: 9.0,
    };

    const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(inputs, config);
    const scenario = ARJUNA_NATURALS_WORKBOOK_BENCHMARK.transportInclusiveScenario;

    // Subtotal: 101,505.58 + 3,720 = 105,225.58
    expect(Math.abs(breakup.billingBaseTaxable - scenario.subtotal)).toBeLessThanOrEqual(0.01);

    // Taxes: 9% CGST (₹9,470.30) + 9% SGST (₹9,470.30)
    expect(Math.abs(breakup.cgstAmount - scenario.cgstAmount)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(breakup.sgstAmount - scenario.sgstAmount)).toBeLessThanOrEqual(0.01);

    // Grand total: ₹124,166.18
    expect(Math.abs(breakup.grandTotal - scenario.grandTotal)).toBeLessThanOrEqual(0.01);
  });

  it('4. Reconciles Attendance dataset and enforces OT approval gating', () => {
    const reconciliation = VendorAttendanceReconciliationService.loadArjunaNaturalsReconciliation({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-ARJUNA-2026-07',
    });

    expect(reconciliation.totalDeployedWorkers).toBe(23);
    expect(reconciliation.totalPayDays).toBe(84.5);
    expect(reconciliation.totalApprovedOtHours).toBe(346);
    expect(reconciliation.totalUnapprovedOtHours).toBe(0);
    expect(reconciliation.isReconciled).toBe(true);

    // Scenario: worker with unapproved OT hours
    const testReconciliation = VendorAttendanceReconciliationService.reconcileAttendanceDataset({
      organizationId: orgId,
      vendorId,
      clientSiteId: 'site-test',
      clientSiteName: 'Test Premises',
      periodMonth: '2026-07',
      workers: [
        {
          workerCode: 'AJ001',
          workerName: 'LALHRIA TPULA',
          dailyWages: 620,
          payDays: 4.5,
          rawOtHours: 25, // Worked 25h OT
          approvedOtHours: 19, // Manager approved only 19h
        },
      ],
    });

    expect(testReconciliation.totalRawOtHours).toBe(25);
    expect(testReconciliation.totalApprovedOtHours).toBe(19);
    expect(testReconciliation.totalUnapprovedOtHours).toBe(6);
    expect(testReconciliation.isReconciled).toBe(false);
    expect(testReconciliation.reconciliationStatus).toBe('VARIANCE_FLAGGED');
    // Critical: Only 19 approved hours must enter billing input
    expect(testReconciliation.payrollInputs[0].otHours).toBe(19);
  });

  it('5. Executes Complete End-to-End Workflow: PO → Vendor Acceptance → Invoice → 3-Way Match → Company Approval → Payment', async () => {
    // Step 1: Company HR / Procurement creates Purchase Order
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-ARJUNA-2026-07',
      contractReference: 'CON-ARJUNA-MANPOWER-2026',
      servicePeriod: '2026-07',
      deliveryLocation: 'Factory Premises, Karumathampatty, Coimbatore',
      costCenter: 'CC-FACTORY-OPERATIONS',
      department: 'Production & BCM',
      requestingManager: 'Factory Operations Manager',
      lineItems: [
        {
          description: 'Being the Contract Services for supply of manpower (23 Heads x 84.5 Pay Days + 346 OT Hours)',
          quantity: 23,
          unitPrice: 3444.13, // Average wage per head
          taxRatePct: 18,
        },
      ],
    });

    expect(poRes.success).toBe(true);
    const po = poRes.po!;
    expect(po.status).toBe('DRAFT');

    // Step 2: Company Approves and Issues PO to Vendor
    const apprRes = await PurchaseOrderService.approvePurchaseOrder(
      po.id,
      'procurement.head@arjunanturals.com',
      'Approved for July 2026 Manpower Deployment'
    );
    expect(apprRes.success).toBe(true);
    expect(apprRes.po?.status).toBe('SENT_TO_VENDOR');

    // Step 3: Vendor Reviews and Accepts PO
    const respRes = await PurchaseOrderService.recordVendorResponse({
      poId: po.id,
      vendorId,
      responseType: 'ACCEPT',
      actorEmail: 'operations@joymanpowerservice.com',
      remarks: 'Purchase Order confirmed. 23 deployed associates allocated.',
    });
    expect(respRes.success).toBe(true);
    expect(respRes.po?.status).toBe('ACCEPTED');

    // Step 4: Reconcile Verified Attendance & Approved Overtime
    const recon = VendorAttendanceReconciliationService.loadArjunaNaturalsReconciliation({
      organizationId: orgId,
      vendorId,
      poNumber: po.poNumber,
    });
    expect(recon.isReconciled).toBe(true);

    // Step 5: Vendor Prepares and Submits Invoice directly from PO & Reconciliation
    const invRes = await VendorInvoiceService.createInvoiceFromReconciliation({
      vendorId,
      organizationId: orgId,
      po,
      reconciliation: recon,
      invoiceNumber: '134/2026-27',
      billingRuleConfig: {
        employerPfPct: 13.0,
        employerEsiPct: 3.25,
        serviceChargePct: 8.0,
        fixedRoomAllowance: 7440.0,
        isRoomAllowanceBillable: true,
        isTransportAllowanceBillable: false,
        isContractWagesGross: true,
        cgstPct: 9.0,
        sgstPct: 9.0,
      },
      notes: 'Supply of contract manpower for the period 01.07.2026 to 31.07.2026',
    });

    expect(invRes.success).toBe(true);
    const invoice = invRes.invoice!;
    expect(invoice.invoiceNumber).toBe('134/2026-27');
    expect(invoice.poId).toBe(po.id);
    expect(invoice.items.length).toBeGreaterThan(0);
    expect(Math.abs(invoice.subtotalAmount - 101505.58)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(invoice.totalAmount - 119776.58)).toBeLessThanOrEqual(0.01);

    // Step 6: 3-Way Match Verification (PO vs Attendance vs Invoice)
    const match = VendorInvoiceService.perform3WayMatch(invoice, po, recon);
    expect(match.matchingStatus).toBe('MATCHED');
    expect(match.isMatched).toBe(true);

    // Step 7: Company Reviewer Approves Invoice
    const approveInvRes = await VendorInvoiceService.updateApprovalStatus(invoice.id, 'APPROVED');
    expect(approveInvRes.success).toBe(true);

    // Step 8: Accounts Payable Disburses Payment
    const paymentRef = 'CMS-NEFT-ARJUNA-202607-001';
    const payRes = await VendorInvoiceService.updatePaymentStatus(invoice.id, 'PAID', paymentRef);
    expect(payRes.success).toBe(true);

    // Verify invoice final state
    const loadedInvoices = await VendorInvoiceService.listInvoices({ vendorId });
    const finalInvoice = loadedInvoices.invoices.find((i) => i.id === invoice.id);
    expect(finalInvoice).toBeDefined();
    expect(finalInvoice?.approvalStatus).toBe('APPROVED');
    expect(finalInvoice?.paymentStatus).toBe('PAID');
    expect(finalInvoice?.paymentReference).toBe(paymentRef);
  });

  it('6. Detects Headcount and Rate Discrepancies to Protect Company Approval', async () => {
    // PO for 23 heads at rate ₹3,444
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: orgId,
      vendorId,
      poNumber: 'PO-AUDIT-DISCREPANCY-01',
      lineItems: [
        {
          description: 'Contract Manpower',
          quantity: 23,
          unitPrice: 3444,
          taxRatePct: 18,
        },
      ],
    });
    const po = poRes.po!;

    // Invoice submitting inflated rate of ₹4,200 and claiming 25 heads
    const invRes = await VendorInvoiceService.createInvoice({
      vendorId,
      organizationId: orgId,
      poId: po.id,
      invoiceNumber: 'INV-INFLATED-01',
      billingPeriod: '2026-07',
      items: [
        {
          description: 'Contract Manpower',
          workforceCount: 25, // Inflated from 23
          ratePerUnit: 4200, // Inflated from 3444
          taxRatePct: 18,
        },
      ],
    });
    const invoice = invRes.invoice!;

    const match = VendorInvoiceService.perform3WayMatch(invoice, po, 23);
    expect(match.matchingStatus).not.toBe('MATCHED');
    expect(match.totalVarianceAmount).toBeGreaterThan(0);
  });
});
