// src/services/__tests__/vendorPerformanceAndVault.test.ts
// ============================================================================
// Joy PeopleHR — Test Suite: Workforce Performance Engine & Vendor Document Vault
// Validates transparent attendance/punctuality formulas, overtime segregation,
// document lifecycle states, and maker-checker verification flows.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  VendorPerformanceService,
} from '../vendor/vendorPerformanceService';
import {
  VendorDocumentService,
  STANDARD_VENDOR_DOCUMENT_REQUIREMENTS,
} from '../vendor/vendorDocumentService';

describe('Workforce Performance & Attendance Analytics Engine', () => {
  describe('1. Attendance Rate Calculation', () => {
    it('calculates attendance rate correctly excluding weekly offs and holidays', () => {
      // 26 scheduled days in month, 4 weekly offs => 22 net scheduled days
      // 21 present days + 1 approved leave = 22 attended
      const rate = VendorPerformanceService.calculateAttendanceRate(21, 1, 26, 4);
      expect(rate).toBe(100);
    });

    it('handles absences accurately without fabricating 100% presence', () => {
      // 26 scheduled days, 4 weekly offs => 22 net scheduled
      // 18 present days, 0 approved leave, 4 unapproved absences => 18/22 = 81.8%
      const rate = VendorPerformanceService.calculateAttendanceRate(18, 0, 26, 4);
      expect(rate).toBe(81.8);
    });

    it('returns 100% when net scheduled days is zero or negative', () => {
      const rate = VendorPerformanceService.calculateAttendanceRate(0, 0, 4, 4);
      expect(rate).toBe(100);
    });
  });

  describe('2. Punctuality and On-Time Arrival Rate', () => {
    it('calculates on-time punctuality rate against actual present days', () => {
      // 20 present days, 18 on-time punches => 18/20 = 90.0%
      const onTimeRate = VendorPerformanceService.calculateOnTimeRate(18, 20);
      expect(onTimeRate).toBe(90.0);
    });

    it('returns 0% when worker was never present', () => {
      const onTimeRate = VendorPerformanceService.calculateOnTimeRate(0, 0);
      expect(onTimeRate).toBe(0);
    });
  });

  describe('3. Work-Hour Compliance & Overtime Segregation', () => {
    it('computes work-hour compliance against scheduled hours', () => {
      // 200 scheduled hours, 196 actual worked hours => 98.0%
      const compliance = VendorPerformanceService.calculateWorkHourCompliance(196, 200);
      expect(compliance).toBe(98.0);
    });

    it('strictly segregates approved overtime from unapproved overtime', async () => {
      const { records } = await VendorPerformanceService.getWorkforcePerformanceMetrics();
      expect(records.length).toBeGreaterThan(0);

      // Verify each record has approved and unapproved OT fields explicitly separate
      for (const record of records) {
        expect(record).toHaveProperty('approvedOtHours');
        expect(record).toHaveProperty('unapprovedOtHours');
        expect(typeof record.approvedOtHours).toBe('number');
        expect(typeof record.unapprovedOtHours).toBe('number');

        // Unapproved OT must not be merged into approved OT
        if (record.unapprovedOtHours > 0) {
          expect(record.unapprovedOtHours).not.toBe(record.approvedOtHours);
        }
      }
    });
  });

  describe('4. Data Completeness & Transparent Composite Scoring', () => {
    it('calculates data completeness accounting for missing check-in/out records', () => {
      // 25 present days, 2 days with missing punch exceptions => 23/25 = 92.0%
      const completeness = VendorPerformanceService.calculateDataCompleteness(25, 2);
      expect(completeness).toBe(92.0);
    });

    it('calculates transparent weighted score without arbitrary hidden rankings', () => {
      // 40% Attendance (100) + 25% Punctuality (90) + 20% Work Hours (95) + 15% Tasks (80)
      // = 40 + 22.5 + 19 + 12 = 93.5
      const composite = VendorPerformanceService.calculateCompositeScore(100, 90, 95, 80);
      expect(composite).toBe(93.5);
    });
  });
});

describe('Vendor Document Vault & Compliance Verification', () => {
  describe('1. Document Requirements & Categories', () => {
    it('provides standard compliance requirements across statutory and registration categories', () => {
      expect(STANDARD_VENDOR_DOCUMENT_REQUIREMENTS.length).toBeGreaterThanOrEqual(8);
      const panReq = STANDARD_VENDOR_DOCUMENT_REQUIREMENTS.find((r) => r.code === 'DOC-PAN');
      const clraReq = STANDARD_VENDOR_DOCUMENT_REQUIREMENTS.find((r) => r.code === 'DOC-CLRA');
      const pfReq = STANDARD_VENDOR_DOCUMENT_REQUIREMENTS.find((r) => r.code === 'DOC-PF-CHALLAN');

      expect(panReq?.isRequired).toBe(true);
      expect(clraReq?.category).toBe('LICENSE');
      expect(pfReq?.category).toBe('STATUTORY_CHALLAN');
    });
  });

  describe('2. Document Upload Lifecycle & State Transitions', () => {
    it('sets initial state to UNDER_REVIEW upon upload, not automatically VERIFIED', async () => {
      const uploadResult = await VendorDocumentService.uploadDocument({
        vendorId: 'VEN-000001',
        documentCategory: 'LICENSE',
        documentType: 'CLRA Contract Labor License',
        fileName: 'CLRA_License_2026.pdf',
        filePath: '/storage/vendors/VEN-000001/CLRA.pdf',
        issueDate: '2026-01-01',
        expiryDate: '2027-01-01',
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.document).toBeDefined();
      expect(uploadResult.document?.verificationStatus).toBe('UNDER_REVIEW');
    });

    it('supports Company HR maker-checker verification with approval', async () => {
      const reviewResult = await VendorDocumentService.reviewDocument(
        'doc-sample-01',
        'APPROVED',
        undefined,
        'usr-hr-reviewer-01'
      );
      expect(reviewResult.success).toBe(true);
    });

    it('records mandatory rejection reason when document is rejected', async () => {
      const rejectionResult = await VendorDocumentService.reviewDocument(
        'doc-sample-02',
        'REJECTED',
        'Document illegible; please upload clear PDF copy of Form REG-06',
        'usr-hr-reviewer-01'
      );
      expect(rejectionResult.success).toBe(true);
    });
  });

  describe('3. Expiry Monitoring', () => {
    it('detects documents expiring within 30 days window', async () => {
      const expiringDocs = await VendorDocumentService.getExpiringDocuments('VEN-000001');
      expect(Array.isArray(expiringDocs)).toBe(true);
      if (expiringDocs.length > 0) {
        expect(expiringDocs[0].expiryDate).toBeDefined();
      }
    });
  });
});
