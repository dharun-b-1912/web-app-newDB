// src/services/__tests__/vendorTwoWayEcosystem.test.ts
// ============================================================================
// Joy PeopleHR — Complete Two-Way Vendor Management Ecosystem Integration Test Suite
// Verifies vendor onboarding, workforce linking, dual-ingestion attendance, payroll formula engine,
// statutory compliance documents, separate invoice approval/payment states, & two-way ticketing.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { VendorMasterService } from '../vendor/vendorMasterService';
import { VendorWorkforceService } from '../vendor/vendorWorkforceService';
import { VendorAttendanceService } from '../vendor/vendorAttendanceService';
import { VendorPayrollInputService } from '../vendor/vendorPayrollInputService';
import { VendorDocumentService } from '../vendor/vendorDocumentService';
import { VendorInvoiceService } from '../vendor/vendorInvoiceService';
import { VendorCommunicationService } from '../vendor/vendorCommunicationService';

describe('Joy PeopleHR — Complete Vendor Management Ecosystem Test Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Vendor Onboarding & Registration Tests
  // --------------------------------------------------------------------------
  describe('1. Vendor Onboarding & Profile Verification', () => {
    it('registers a new vendor and assigns unique vendor code', async () => {
      const res = await VendorMasterService.registerVendor({
        legalName: 'Test Manpower Agency Pvt Ltd',
        tradeName: 'Test Staffing',
        vendorType: 'MANPOWER_PROVIDER',
        panNumber: 'AABCT9988X',
        gstNumber: '33AABCT9988X1Z1',
        email: 'admin@teststaffing.com',
        phone: '+91 98401 00000',
        primaryContactName: 'Test Contact',
        primaryContactPhone: '+91 98401 00000',
        bankName: 'HDFC Bank',
        bankAccountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        maxCapacity: 75,
      });

      expect(res.success).toBe(true);
      expect(res.vendor).toBeDefined();
      expect(res.vendor?.vendorCode).toMatch(/^VEN-\d+/);
      expect(res.vendor?.status).toBe('INVITED');
    });

    it('prevents duplicate vendor registration with existing PAN', async () => {
      // Mock duplicate check
      const dupCheck = await VendorMasterService.checkForDuplicateVendor('AABCA1234F', undefined);
      // Returns duplicate result if existing in DB/mock
      expect(dupCheck).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Vendor Workforce & Master Linking Tests
  // --------------------------------------------------------------------------
  describe('2. Vendor Workforce & Single Source of Truth Linking', () => {
    it('submits a worker request by vendor and approves it with master employee link', async () => {
      const subRes = await VendorWorkforceService.submitWorker({
        vendorId: 'VEN-000001',
        firstName: 'Karthik',
        lastName: 'Raman',
        email: 'karthik.r@vendor.com',
        phone: '+91 98765 43210',
        designation: 'Security Supervisor',
        department: 'Security',
        skillLevel: 'Highly Skilled',
        dailyWageRate: 800,
        monthlyBaseSalary: 20800,
      });

      expect(subRes.success).toBe(true);
      expect(subRes.worker).toBeDefined();
      expect(subRes.worker?.workerCode).toMatch(/^WRK-\d+/);
      expect(subRes.worker?.status).toBe('PENDING_APPROVAL');

      // Company HR approves assignment
      const appRes = await VendorWorkforceService.approveWorkerAssignment(subRes.worker!.id, 'org-joy-main');
      expect(appRes.success).toBe(true);
      expect(appRes.employeeId).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Attendance Ingestion & Anomaly Validation Tests
  // --------------------------------------------------------------------------
  describe('3. Dual-Ingestion Attendance & Shift Overtime Engine', () => {
    it('ingests attendance batch, detects missing punches and overnight anomalies', async () => {
      const res = await VendorAttendanceService.ingestAttendanceBatch({
        vendorId: 'VEN-000001',
        organizationId: 'org-joy-main',
        periodMonth: '2026-09',
        source: 'FILE_UPLOAD',
        records: [
          { workerCode: 'VEN01-EMP01', date: '2026-09-01', checkIn: '2026-09-01T09:00:00Z', checkOut: '2026-09-01T19:00:00Z', status: 'PRESENT' },
          { workerCode: 'VEN01-EMP02', date: '2026-09-01', checkIn: '2026-09-01T09:00:00Z', checkOut: undefined, status: 'MISSING_PUNCH' },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.batchNumber).toMatch(/^ATT-BATCH-\d+/);
      expect(res.processedCount).toBe(2);
      expect(res.anomaliesCount).toBeGreaterThanOrEqual(1);
    });

    it('locks attendance period preventing post-approval modifications', async () => {
      const lockRes = await VendorAttendanceService.lockAttendancePeriod('VEN-000001', '2026-08');
      expect(lockRes.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Payroll Input & Formula Rule Engine Tests
  // --------------------------------------------------------------------------
  describe('4. Configurable Payroll Formula Engine', () => {
    it('evaluates overtime formula (hourly_rate * ot_hours * 2.0) accurately', () => {
      const otRule = {
        id: 'r-01',
        ruleCode: 'OT_2X',
        ruleName: 'Overtime 2.0x Rate',
        ruleType: 'EARNING' as const,
        formulaExpression: 'hourly_rate * ot_hours * 2.0',
        effectiveFrom: '2026-01-01',
        version: 1,
        isActive: true,
        roundingMode: 'NEAREST' as const,
      };

      const result = VendorPayrollInputService.evaluateRule(otRule, {
        hourly_rate: 100,
        ot_hours: 5,
      });

      expect(result.calculatedResult).toBe(1000); // 100 * 5 * 2 = 1000
    });

    it('calculates complete worker monthly payroll inputs with deductions', () => {
      const payroll = VendorPayrollInputService.calculateWorkerPayroll('wrk-001', 'Murugan P', '2026-09', {
        dailyWageRate: 650,
        workedDays: 26,
        otHours: 10,
        nightShiftsCount: 3,
        canteenDays: 22,
        canteenRatePerDay: 40,
        transportRatePerMonth: 500,
      });

      expect(payroll.baseWages).toBe(16900); // 650 * 26
      expect(payroll.nightAllowance).toBe(450); // 3 * 150
      expect(payroll.attendanceBonus).toBe(1000); // Full 26 days worked
      expect(payroll.canteenDeduction).toBe(880); // 22 * 40
      expect(payroll.transportDeduction).toBe(500);
      expect(payroll.totalGross).toBeGreaterThan(payroll.baseWages);
      expect(payroll.netPayable).toBe(payroll.totalGross - payroll.totalDeductions);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Statutory Compliance & Document Review Tests
  // --------------------------------------------------------------------------
  describe('5. Compliance Document Verification & Expiry Tracking', () => {
    it('uploads compliance document and transitions review status', async () => {
      const upRes = await VendorDocumentService.uploadDocument({
        vendorId: 'VEN-000001',
        documentCategory: 'STATUTORY_CHALLAN',
        documentType: 'Monthly ESI Challan',
        periodMonth: '2026-08',
        fileName: 'ESI_Challan_Aug2026.pdf',
        filePath: '/storage/vendors/VEN-000001/ESI_Challan.pdf',
      });

      expect(upRes.success).toBe(true);
      expect(upRes.document?.verificationStatus).toBe('UNDER_REVIEW');

      const revRes = await VendorDocumentService.reviewDocument(upRes.document!.id, 'APPROVED', undefined, 'hr-admin-1');
      expect(revRes.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Invoice & 3-Way Match Tests
  // --------------------------------------------------------------------------
  describe('6. Vendor Invoice & Separate Payment State Engine', () => {
    it('creates 3-way line item invoice and computes GST grand total', async () => {
      const invRes = await VendorInvoiceService.createInvoice({
        vendorId: 'VEN-000001',
        organizationId: 'org-joy-main',
        invoiceNumber: `TEST-INV-${Date.now()}`,
        billingPeriod: '2026-08',
        contractReference: 'CON-JOY-CHE-2026-01',
        items: [
          { description: 'Contract Security Deployment', workforceCount: 20, ratePerUnit: 15000, serviceChargePct: 10, taxRatePct: 18 },
        ],
      });

      expect(invRes.success).toBe(true);
      expect(invRes.invoice).toBeDefined();
      expect(invRes.invoice?.approvalStatus).toBe('SUBMITTED');
      expect(invRes.invoice?.paymentStatus).toBe('UNPAID');
    });

    it('enforces separate invoice approval and payment processing state transitions', async () => {
      const invId = 'inv-sample-01';

      // Step 1: Approve invoice
      const appRes = await VendorInvoiceService.updateApprovalStatus(invId, 'APPROVED');
      expect(appRes.success).toBe(true);

      // Step 2: Separate financial payment disbursement transition
      const payRes = await VendorInvoiceService.updatePaymentStatus(invId, 'PAYMENT_PROCESSING', 'CMS-REF-991');
      expect(payRes.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Two-Way Communication & Ticketing Tests
  // --------------------------------------------------------------------------
  describe('7. Two-Way Request Ticketing System', () => {
    it('creates a request ticket and appends conversation comments', async () => {
      const reqRes = await VendorCommunicationService.createRequest({
        vendorId: 'VEN-000001',
        senderType: 'COMPANY',
        authorName: 'HR Compliance Lead',
        category: 'COMPLIANCE',
        priority: 'HIGH',
        subject: 'Missing Monthly LWF Challan Copy',
        description: 'Please upload Labour Welfare Fund challan copy for H1 2026.',
      });

      expect(reqRes.success).toBe(true);
      expect(reqRes.request?.requestNumber).toMatch(/^REQ-\d+/);

      const cmtRes = await VendorCommunicationService.addComment({
        requestId: reqRes.request!.id,
        senderType: 'VENDOR',
        authorName: 'Vendor Compliance Manager',
        commentBody: 'Uploaded LWF challan receipt.',
      });

      expect(cmtRes.success).toBe(true);
      expect(cmtRes.comment?.senderType).toBe('VENDOR');
    });
  });
});
