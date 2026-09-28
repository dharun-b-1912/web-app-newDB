// src/services/__tests__/vendorPortalCrossPortalIntegration.test.ts
// ============================================================================
// JOY PeopleHR — Cross-Portal Invoice Persistence, Review Queue & Role Security
// Verifies that vendor-submitted invoices appear in Company HR review queue,
// 3-way matching executes across shared records, and payment is AP-controlled.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { VendorInvoiceService, VendorInvoiceRecord } from '../vendor/vendorInvoiceService';
import { PurchaseOrderService } from '../vendor/purchaseOrderService';
import { VendorManpowerBillingEngine } from '../vendor/vendorManpowerBillingEngine';

describe('Cross-Portal Vendor-to-Company HR Workflow & Role Isolation', () => {
  const testOrgId = 'org-joy-main';
  const vendorAlpha = 'VND-ALPHA-01';
  const vendorBeta = 'VND-BETA-02';
  const invoiceNumberAlpha = `INV-ALPHA-${Date.now()}`;

  let createdPoId: string;
  let createdInvoiceId: string;

  it('1. Company HR creates and approves Purchase Order for Vendor Alpha', async () => {
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: testOrgId,
      vendorId: vendorAlpha,
      poNumber: `PO-ALPHA-${Date.now()}`,
      contractReference: 'CON-ALPHA-2026',
      servicePeriod: '2026-08',
      lineItems: [
        {
          category: 'MANPOWER_SERVICES',
          description: 'Assembly Line Technicians',
          quantity: 26,
          unit: 'DAYS',
          unitPrice: 650,
          taxRatePct: 18,
        },
      ],
      submitForApproval: true,
    });

    expect(poRes.success).toBe(true);
    expect(poRes.po).toBeDefined();
    createdPoId = poRes.po!.id;

    // Company approves PO
    const approveRes = await PurchaseOrderService.approvePurchaseOrder(createdPoId, 'usr-hr-admin', 'Approved for vendor dispatch');
    expect(approveRes.success).toBe(true);
  });

  it('2. Vendor Alpha submits invoice against the approved PO', async () => {
    const invRes = await VendorInvoiceService.createInvoice({
      organizationId: testOrgId,
      vendorId: vendorAlpha,
      poId: createdPoId,
      invoiceNumber: invoiceNumberAlpha,
      billingPeriod: '2026-08',
      contractReference: 'CON-ALPHA-2026',
      items: [
        {
          poLineItemId: 'line-1',
          description: 'Assembly Line Technicians',
          category: 'MANPOWER_SERVICES',
          workforceCount: 26,
          ratePerUnit: 650,
          serviceChargePct: 8.0,
          taxRatePct: 18.0,
        },
      ],
    });

    expect(invRes.success).toBe(true);
    expect(invRes.invoice).toBeDefined();
    expect(invRes.invoice?.approvalStatus).toBe('SUBMITTED');
    expect(invRes.invoice?.paymentStatus).toBe('UNPAID');
    createdInvoiceId = invRes.invoice!.id;
  });

  it('3. Company HR review queue discovers the submitted invoice from the shared store', async () => {
    // Company HR queries the review queue with no vendor filter (vendorId: undefined)
    const queueRes = await VendorInvoiceService.listInvoices({
      organizationId: testOrgId,
      vendorId: undefined, // All vendors in company tenant
    });

    expect(queueRes.success).toBe(true);
    const discovered = queueRes.invoices.find((i) => i.id === createdInvoiceId);
    expect(discovered).toBeDefined();
    expect(discovered?.invoiceNumber).toBe(invoiceNumberAlpha);
    expect(discovered?.approvalStatus).toBe('SUBMITTED');
  });

  it('4. Multi-tenant / Vendor Isolation: Vendor Beta CANNOT see Vendor Alpha invoice', async () => {
    const betaQuery = await VendorInvoiceService.listInvoices({
      organizationId: testOrgId,
      vendorId: vendorBeta, // Scoped to Vendor Beta only
    });

    expect(betaQuery.success).toBe(true);
    const leaked = betaQuery.invoices.find((i) => i.id === createdInvoiceId);
    expect(leaked).toBeUndefined(); // Strictly isolated
  });

  it('5. Company HR performs 3-Way Match and approves the invoice', async () => {
    const invoice = await VendorInvoiceService.getInvoiceById(createdInvoiceId);
    expect(invoice).toBeDefined();

    const po = (await PurchaseOrderService.getPurchaseOrders({ organizationId: testOrgId }))
      .pos.find((p) => p.id === createdPoId);
    expect(po).toBeDefined();

    const match = VendorInvoiceService.perform3WayMatch(invoice!, po!, 26);
    expect(match.matchStatus).toBe('MATCHED');

    // Company HR marks as APPROVED
    const approveRes = await VendorInvoiceService.updateApprovalStatus(
      createdInvoiceId,
      'APPROVED',
      'Verified against biometric muster roll and approved PO rates.'
    );
    expect(approveRes.success).toBe(true);
  });

  it('6. Vendor Alpha queries their portal and sees the updated status APPROVED', async () => {
    const vendorQuery = await VendorInvoiceService.listInvoices({
      organizationId: testOrgId,
      vendorId: vendorAlpha,
    });

    const myInvoice = vendorQuery.invoices.find((i) => i.id === createdInvoiceId);
    expect(myInvoice).toBeDefined();
    expect(myInvoice?.approvalStatus).toBe('APPROVED');
    expect(myInvoice?.reviewerRemarks).toContain('Verified against biometric muster roll');
    // Payment status remains UNPAID until finance disburses
    expect(myInvoice?.paymentStatus).toBe('UNPAID');
  });

  it('7. Company Accounts Payable disburses payment and records CMS/UTR reference', async () => {
    const utrRef = 'CMS-HDFC-99281203';
    const payRes = await VendorInvoiceService.updatePaymentStatus(
      createdInvoiceId,
      'PAID',
      utrRef
    );
    expect(payRes.success).toBe(true);

    // Verify persisted state reflects PAID
    const paidInvoice = await VendorInvoiceService.getInvoiceById(createdInvoiceId);
    expect(paidInvoice?.paymentStatus).toBe('PAID');
    expect(paidInvoice?.paymentReference).toBe(utrRef);
    expect(paidInvoice?.paidAt).toBeDefined();
  });
});
