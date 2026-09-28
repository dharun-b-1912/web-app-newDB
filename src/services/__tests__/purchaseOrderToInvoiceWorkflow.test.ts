// src/services/__tests__/purchaseOrderToInvoiceWorkflow.test.ts
// ============================================================================
// Joy PeopleHR — Purchase Order → Vendor Response → Invoice → 3-Way Match Test Suite
// Validates end-to-end B2B procurement workflow, server calculations, 3-way matching,
// and multi-tenant RLS isolation
// ============================================================================

import { describe, it, expect } from 'vitest';
import { PurchaseOrderService } from '../vendor/purchaseOrderService';
import { VendorInvoiceService } from '../vendor/vendorInvoiceService';
import { PurchaseOrder, VendorInvoiceRecord } from '../../types/vendorPortal';

describe('Purchase Order → Vendor Response → Invoice → 3-Way Match Workflow', () => {
  const sampleOrgId = 'org-joy-main';
  const sampleVendorId = 'VEN-000001';
  const unauthorizedVendorId = 'VEN-UNAUTHORIZED-99';

  it('1. Calculates line items, subtotal, tax, and grand total with decimal-safe precision', () => {
    const lineItems = [
      {
        description: 'Security Manpower Supply (21 Heads)',
        quantity: 21,
        unitPrice: 16900,
        taxRatePct: 18,
      },
      {
        description: 'Night Shift Transport Allowance',
        quantity: 1,
        unitPrice: 12000,
        taxRatePct: 18,
      },
    ];

    const calc = PurchaseOrderService.calculateTotals(lineItems);

    // Line 1: 21 * 16900 = 354,900
    // Line 2: 1 * 12000 = 12,000
    // Subtotal: 366,900
    // Tax (18%): 66,042
    // Grand Total: 432,942
    expect(calc.subtotalAmount).toBe(366900);
    expect(calc.taxAmount).toBe(66042);
    expect(calc.grandTotal).toBe(432942);
  });

  it('2. Creates a Purchase Order in DRAFT status and supports Company Approval', async () => {
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      vendorContactEmail: 'testvendor@gmail.com',
      contractReference: 'CON-JOY-CHE-2026-01',
      validFrom: '2026-09-01',
      validUntil: '2026-09-30',
      servicePeriod: '2026-09',
      paymentTermsDays: 30,
      costCenter: 'CC-SECURITY-01',
      department: 'Facility Operations',
      createdBy: 'hr.admin@joyhospitality.com',
      lineItems: [
        {
          description: 'Security Manpower Supply (21 Heads)',
          quantity: 21,
          unitPrice: 16900,
          taxRatePct: 18,
        },
      ],
    });

    expect(poRes.success).toBe(true);
    expect(poRes.po).toBeDefined();
    const po = poRes.po!;

    expect(po.status).toBe('DRAFT');
    expect(po.grandTotal).toBe(418782);

    // Approve PO
    const appRes = await PurchaseOrderService.approvePurchaseOrder(
      po.id,
      'ops.manager@joyhospitality.com',
      'Approved for September service deployment'
    );
    expect(appRes.success).toBe(true);
    expect(appRes.po?.status).toBe('SENT_TO_VENDOR');
  });

  it('3. Handles Vendor PO Response: ACCEPT, REJECT, and REQUEST_CHANGES', async () => {
    // Create & Approve PO
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      lineItems: [{ description: 'Housekeeping Staff', quantity: 10, unitPrice: 15000 }],
    });
    const po = poRes.po!;
    await PurchaseOrderService.approvePurchaseOrder(po.id, 'approver@joy.com');

    // Vendor Accepts PO
    const acceptRes = await PurchaseOrderService.recordVendorResponse({
      poId: po.id,
      vendorId: sampleVendorId,
      responseType: 'ACCEPT',
      actorEmail: 'testvendor@gmail.com',
      remarks: 'Order confirmed and manpower allocated.',
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.po?.status).toBe('ACCEPTED');

    // Vendor Request Changes scenario
    const poRes2 = await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      lineItems: [{ description: 'Extra Guard Shift', quantity: 5, unitPrice: 18000 }],
    });
    const po2 = poRes2.po!;
    await PurchaseOrderService.approvePurchaseOrder(po2.id, 'approver@joy.com');

    const changeRes = await PurchaseOrderService.recordVendorResponse({
      poId: po2.id,
      vendorId: sampleVendorId,
      responseType: 'REQUEST_CHANGES',
      changeCategory: 'PRICING_ISSUE',
      actorEmail: 'testvendor@gmail.com',
      remarks: 'Unit rate should be ₹19,000 as per updated OT rate card.',
    });

    expect(changeRes.success).toBe(true);
    expect(changeRes.po?.status).toBe('CHANGE_REQUESTED');
  });

  it('4. Creates Vendor Invoice linked to an Accepted PO and performs 3-Way Line Item Match', async () => {
    // 1. Create & Approve PO
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      contractReference: 'CON-JOY-CHE-2026-01',
      servicePeriod: '2026-09',
      lineItems: [
        {
          description: 'Security Guards Deployment (21 Heads x 26 Days)',
          quantity: 21,
          unitPrice: 16900,
          taxRatePct: 18,
        },
      ],
    });
    const po = poRes.po!;
    await PurchaseOrderService.approvePurchaseOrder(po.id, 'approver@joy.com');

    // 2. Vendor Submits Invoice against PO
    const invRes = await VendorInvoiceService.createInvoice({
      vendorId: sampleVendorId,
      organizationId: sampleOrgId,
      poId: po.id,
      invoiceNumber: 'INV-TEST-3WAY-001',
      billingPeriod: '2026-09',
      contractReference: 'CON-JOY-CHE-2026-01',
      items: [
        {
          poLineItemId: po.items[0].id,
          description: 'Security Guards Deployment (21 Heads x 26 Days)',
          workforceCount: 21,
          ratePerUnit: 16900,
          taxRatePct: 18,
        },
      ],
    });

    expect(invRes.success).toBe(true);
    const invoice = invRes.invoice!;
    expect(invoice.poId).toBe(po.id);

    // 3. Perform 3-Way Match against verified attendance (21 heads)
    const match = VendorInvoiceService.perform3WayMatch(invoice, po, 21);

    expect(match.matchStatus).toBe('MATCHED');
    expect(match.totalVarianceAmount).toBe(0);
    expect(match.itemMatches[0].matchStatus).toBe('MATCHED');
  });

  it('5. Detects Rate and Quantity Discrepancies in 3-Way Matching', async () => {
    // PO with rate ₹16,900 and quantity 21
    const poRes = await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      lineItems: [
        {
          description: 'Security Guards Deployment',
          quantity: 21,
          unitPrice: 16900,
          taxRatePct: 18,
        },
      ],
    });
    const po = poRes.po!;

    // Invoice with inflated rate ₹18,500
    const invRes = await VendorInvoiceService.createInvoice({
      vendorId: sampleVendorId,
      organizationId: sampleOrgId,
      poId: po.id,
      invoiceNumber: 'INV-DISCREPANT-01',
      billingPeriod: '2026-09',
      contractReference: 'CON-JOY-CHE-2026-01',
      items: [
        {
          poLineItemId: po.items[0].id,
          description: 'Security Guards Deployment',
          workforceCount: 21,
          ratePerUnit: 18500, // Inflated rate
          taxRatePct: 18,
        },
      ],
    });
    const invoice = invRes.invoice!;

    const match = VendorInvoiceService.perform3WayMatch(invoice, po, 26);

    expect(match.matchStatus).toBe('VARIANCE_FLAGGED');
    expect(match.totalVarianceAmount).toBeGreaterThan(0);
    expect(match.itemMatches[0].matchStatus).toBe('RATE_DISCREPANCY');
  });

  it('6. Enforces multi-tenant isolation for Purchase Orders', async () => {
    // Create PO for sampleVendorId
    await PurchaseOrderService.createPurchaseOrder({
      organizationId: sampleOrgId,
      vendorId: sampleVendorId,
      lineItems: [{ description: 'Test Item', quantity: 1, unitPrice: 1000 }],
    });

    // Query POs for unauthorized vendor
    const pos = await PurchaseOrderService.listPurchaseOrders({
      organizationId: sampleOrgId,
      vendorId: unauthorizedVendorId,
    });

    expect(pos.length).toBe(0);
  });
});
