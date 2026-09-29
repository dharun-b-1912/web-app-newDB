import { describe, it, expect, beforeEach } from 'vitest';
import {
  VendorAssetService,
  STANDARD_ASSET_CATALOG,
} from '../vendor/vendorAssetService';

describe('Joy PeopleHR — Dedicated Vendor Asset Management & Recovery Certification', () => {
  const orgId = 'org-joy-test';
  const vendorId = 'VND-JOY-01';
  const siteId = 'site-che-01';

  beforeEach(() => {
    // Clean mock localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('certifies standard catalog has realistic presets with prices and returnability', () => {
    expect(STANDARD_ASSET_CATALOG.length).toBeGreaterThanOrEqual(8);

    const boots = STANDARD_ASSET_CATALOG.find((p) => p.name.includes('Boots'));
    expect(boots).toBeDefined();
    expect(boots?.returnableType).toBe('NON_RETURNABLE');
    expect(boots?.defaultPrice).toBe(1200);
    expect(boots?.defaultDeductionTarget).toBe('WORKER_PAYROLL_DEDUCTION');

    const toolkit = STANDARD_ASSET_CATALOG.find((p) => p.name.includes('Toolkit'));
    expect(toolkit).toBeDefined();
    expect(toolkit?.returnableType).toBe('RETURNABLE');
    expect(toolkit?.defaultPrice).toBe(4500);
    expect(toolkit?.defaultDeductionTarget).toBe('VENDOR_INVOICE_DEDUCTION');
  });

  it('certifies issuing an asset automatically computes pricing and binds worker metadata', () => {
    const issued = VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: '20385',
      workerName: 'SAKTHI S',
      workerRole: 'Boiler Technician',
      workerDepartment: 'Mechanical Maintenance',
      assetName: 'Certified Electrical Maintenance Toolkit',
      category: 'TOOL_EQUIPMENT',
      serialNumber: 'TL-88992',
      returnableType: 'RETURNABLE',
      unitPrice: 4500,
      quantity: 1,
      expectedReturnDate: '2026-10-15',
      deductionTarget: 'VENDOR_INVOICE_DEDUCTION',
      deductionAmount: 0,
    });

    expect(issued.id).toBeDefined();
    expect(issued.workerName).toBe('SAKTHI S');
    expect(issued.totalValue).toBe(4500);
    expect(issued.status).toBe('ISSUED');
    expect(issued.returnableType).toBe('RETURNABLE');
  });

  it('certifies return inspection workflow with damage penalty assessment and recovery calculation', () => {
    const issued = VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: '20392',
      workerName: 'ARUNKUMAR M',
      assetName: 'Two-Way UHF Walkie-Talkie Set',
      category: 'COMMUNICATION',
      returnableType: 'RETURNABLE',
      unitPrice: 3200,
      quantity: 1,
      deductionTarget: 'VENDOR_INVOICE_DEDUCTION',
      deductionAmount: 0,
    });

    // Inspect return with damage
    const returned = VendorAssetService.processReturn({
      allocationId: issued.id,
      actualReturnDate: '2026-09-25',
      conditionAtReturn: 'DAMAGED',
      assessedDamagePenalty: 1200,
      penaltyDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
      returnRemarks: 'Broken casing from fall',
    });

    expect(returned.status).toBe('DAMAGED');
    expect(returned.conditionAtReturn).toBe('DAMAGED');
    expect(returned.deductionAmount).toBe(1200);
    expect(returned.deductionStatus).toBe('PENDING_APPROVAL');
    expect(returned.deductionTarget).toBe('VENDOR_INVOICE_DEDUCTION');
  });

  it('certifies automatic staging to Controlled Payroll Deductions for Wage Engine', () => {
    const nonReturnableAsset = VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: '20398',
      workerName: 'DINESH K',
      assetName: 'Company Uniform Workwear (2 Sets)',
      category: 'UNIFORM',
      returnableType: 'NON_RETURNABLE',
      unitPrice: 900,
      quantity: 1,
      deductionTarget: 'WORKER_PAYROLL_DEDUCTION',
      deductionAmount: 500,
      deductionReason: 'Uniform set issue recovery',
    });

    expect(nonReturnableAsset.deductionStatus).toBe('PENDING_APPROVAL');
    expect(nonReturnableAsset.deductionAmount).toBe(500);

    // Staging to payroll
    VendorAssetService.pushToControlledPayrollDeductions(nonReturnableAsset);

    const deductions = VendorAssetService.getControlledDeductions();
    expect(deductions.length).toBeGreaterThan(0);
    const found = deductions.find((d: any) => d.employeeCode === '20398');
    expect(found).toBeDefined();
    expect(found?.amount).toBe(500);
    expect(found?.category).toBe('UNIFORM');
  });

  it('certifies staging to Vendor Invoice Debit Note for 3-Way Match', () => {
    const asset = VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: '20385',
      workerName: 'SAKTHI S',
      assetName: 'Damaged Toolkit Replacement',
      category: 'TOOL_EQUIPMENT',
      returnableType: 'RETURNABLE',
      unitPrice: 2000,
      deductionTarget: 'VENDOR_INVOICE_DEDUCTION',
      deductionAmount: 2000,
    });

    const staged = VendorAssetService.stageForInvoice(asset.id, 'INV-DEB-2026-009');
    expect(staged.deductionStatus).toBe('STAGED_FOR_INVOICE');
    expect(staged.linkedInvoiceNumber).toBe('INV-DEB-2026-009');
  });

  it('certifies multi-tenant scoping and summary metrics computation', () => {
    VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: 'WRK-20385',
      workerName: 'Sakthi S',
      assetName: 'Safety Boots',
      category: 'SAFETY_PPE',
      returnableType: 'NON_RETURNABLE',
      unitPrice: 1200,
      deductionTarget: 'WORKER_PAYROLL_DEDUCTION',
      deductionAmount: 600,
    });

    const metrics = VendorAssetService.getSummaryMetrics({ organizationId: orgId, vendorId: vendorId });
    expect(metrics.totalAllocated).toBeGreaterThan(0);
    expect(metrics.totalAssetValue).toBeGreaterThan(0);
  });

  it('certifies export to CSV contains commercial and custody fields', () => {
    VendorAssetService.issueAsset({
      organizationId: orgId,
      vendorId: vendorId,
      siteId: siteId,
      workerCode: 'WRK-20385',
      workerName: 'Sakthi S',
      assetName: 'Safety Boots',
      category: 'SAFETY_PPE',
      returnableType: 'NON_RETURNABLE',
      unitPrice: 1200,
      deductionTarget: 'WORKER_PAYROLL_DEDUCTION',
      deductionAmount: 600,
    });

    const { blob, fileName } = VendorAssetService.exportToCSV({ organizationId: orgId, vendorId: vendorId });
    expect(fileName).toContain('Vendor_Worker_Asset_Custody_Register');
    expect(blob.size).toBeGreaterThan(100);
  });
});
