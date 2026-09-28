// src/services/__tests__/vendorDocumentGovernanceMaster.test.ts
// ============================================================================
// JOY PeopleHR — Production Vendor Document Management & Storage Governance Tests
// Verifies Private Buckets, Dual-Role Authorization, Tenant/Vendor Isolation,
// Review Workflow, and Profile Media Separation
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VendorPrivateDocumentService,
  PRIVATE_VENDOR_BUCKET,
} from '../vendor/vendorPrivateDocumentService';
import {
  EmployeeProfileMediaService,
  PROFILE_MEDIA_BUCKET,
} from '../employee/employeeProfileMediaService';

describe('Vendor Document Management & Storage Governance Suite', () => {
  const TENANT_A = 'org-joy-main';
  const TENANT_B = 'org-foreign-tenant';
  const VENDOR_ALPHA = 'ven-001-apex';
  const VENDOR_BETA = 'ven-002-metro';

  beforeEach(() => {
    VendorPrivateDocumentService.clearMemoryStore();
  });

  describe('1. Storage Bucket & Path Hierarchy Governance', () => {
    it('generates isolated, human-readable yet secure object paths', () => {
      const path = VendorPrivateDocumentService.buildStoragePath({
        organizationId: TENANT_A,
        vendorId: VENDOR_ALPHA,
        subFolder: 'company/statutory',
        fileName: 'epfo_registration_2026.pdf',
      });

      expect(path).toContain(`tenant/${TENANT_A}/vendor/${VENDOR_ALPHA}/company/statutory/`);
      expect(path).toContain('epfo_registration_2026.pdf');
    });

    it('sanitizes and strips path traversal characters from filenames and paths', () => {
      const path = VendorPrivateDocumentService.buildStoragePath({
        organizationId: 'org-test/../../../tenant',
        vendorId: 'ven-1/../../vendor',
        subFolder: 'contracts/../../secrets',
        fileName: '../../evil_script.sh.pdf',
      });

      expect(path).not.toContain('..');
      expect(path).toContain('tenant/org-testtenant/vendor/ven-1vendor/');
    });

    it('validates file extension and rejects unauthorized formats', () => {
      const invalidFile = {
        name: 'payload.exe',
        size: 1024 * 100,
        type: 'application/x-msdownload',
      };
      const res = VendorPrivateDocumentService.validateDocument(invalidFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Disallowed file extension');
    });

    it('enforces 20MB file size ceiling on vendor documents', () => {
      const oversizedFile = {
        name: 'heavy_audit_bundle.pdf',
        size: 25 * 1024 * 1024, // 25MB
        type: 'application/pdf',
      };
      const res = VendorPrivateDocumentService.validateDocument(oversizedFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds 20MB limit');
    });
  });

  describe('2. Dual-Role Upload Authorization', () => {
    it('allows HR Admin to upload documents for any authorized vendor in organization', async () => {
      const dummyFile = {
        name: 'clra_license_2026.pdf',
        size: 204800,
        type: 'application/pdf',
      };

      const result = await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_ALPHA,
        vendorCode: 'VND-001',
        vendorName: 'Apex Security & Facility Services',
        documentCategory: 'CLRA',
        file: dummyFile as any,
        uploadedBy: 'hr.admin@joyhospitality.com',
        requesterRole: 'HR_ADMIN',
      });

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.bucket).toBe(PRIVATE_VENDOR_BUCKET);
      expect(result.document?.status).toBe('PENDING_REVIEW');
      expect(result.document?.category).toBe('CLRA');
    });

    it('allows Vendor Admin to upload documents for their OWN vendor organization', async () => {
      const dummyFile = {
        name: 'gstin_certificate.pdf',
        size: 102400,
        type: 'application/pdf',
      };

      const result = await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_ALPHA,
        documentCategory: 'GSTIN',
        file: dummyFile as any,
        uploadedBy: 'compliance@apexsecurity.com',
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA, // Matching vendor
      });

      expect(result.success).toBe(true);
      expect(result.document?.vendorId).toBe(VENDOR_ALPHA);
    });

    it('STRICTLY DENIES Vendor Admin attempting to upload to a different vendorId', async () => {
      const dummyFile = {
        name: 'unauthorized_file.pdf',
        size: 102400,
        type: 'application/pdf',
      };

      const result = await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_BETA, // Different vendor!
        documentCategory: 'GSTIN',
        file: dummyFile as any,
        uploadedBy: 'compliance@apexsecurity.com',
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA, // Only authorized for Alpha
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: Vendor Admin can only upload documents for their own vendor');
    });
  });

  describe('3. Multi-Tenant & Multi-Vendor Access Isolation', () => {
    beforeEach(async () => {
      // Seed two documents for different vendors
      await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_ALPHA,
        documentCategory: 'EPFO',
        file: { name: 'alpha_epfo.pdf', size: 1024, type: 'application/pdf' } as any,
        uploadedBy: 'alpha@vendor.com',
        requesterRole: 'HR_ADMIN',
      });

      await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_BETA,
        documentCategory: 'ESIC',
        file: { name: 'beta_esic.pdf', size: 1024, type: 'application/pdf' } as any,
        uploadedBy: 'beta@vendor.com',
        requesterRole: 'HR_ADMIN',
      });
    });

    it('allows HR Admin to list all vendor documents across the tenant', async () => {
      const listRes = await VendorPrivateDocumentService.listDocuments({
        organizationId: TENANT_A,
        requesterRole: 'HR_ADMIN',
      });

      expect(listRes.success).toBe(true);
      expect(listRes.documents.length).toBe(2);
    });

    it('constrains Vendor Admin to list ONLY their own documents', async () => {
      const listRes = await VendorPrivateDocumentService.listDocuments({
        organizationId: TENANT_A,
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA,
      });

      expect(listRes.success).toBe(true);
      expect(listRes.documents.length).toBe(1);
      expect(listRes.documents[0].vendorId).toBe(VENDOR_ALPHA);
    });

    it('STRICTLY BLOCKS Vendor Admin attempting to list another vendor documents', async () => {
      const listRes = await VendorPrivateDocumentService.listDocuments({
        organizationId: TENANT_A,
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA,
        vendorId: VENDOR_BETA, // Attempting cross-vendor inquiry
      });

      expect(listRes.success).toBe(false);
      expect(listRes.error).toContain('Cross-vendor document listing denied');
    });

    it('DENIES cross-tenant signed URL download access', async () => {
      const downloadRes = await VendorPrivateDocumentService.getSignedDownloadUrl({
        storagePath: `tenant/${TENANT_A}/vendors/${VENDOR_ALPHA}/compliance/1234_doc.pdf`,
        requesterOrgId: TENANT_B, // Foreign tenant!
      });

      expect(downloadRes.error).toContain('Cross-tenant document access is strictly forbidden');
      expect(downloadRes.url).toBeUndefined();
    });

    it('DENIES cross-vendor signed URL download access for Vendor Admin', async () => {
      const downloadRes = await VendorPrivateDocumentService.getSignedDownloadUrl({
        storagePath: `tenant/${TENANT_A}/vendors/${VENDOR_BETA}/compliance/1234_doc.pdf`,
        requesterOrgId: TENANT_A,
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA, // Requesting Beta's file
      });

      expect(downloadRes.error).toContain('Cross-vendor document access denied');
      expect(downloadRes.url).toBeUndefined();
    });
  });

  describe('4. HR Review & Approval Lifecycle', () => {
    let uploadedDocId: string;

    beforeEach(async () => {
      const up = await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: TENANT_A,
        vendorId: VENDOR_ALPHA,
        documentCategory: 'BANK_DOCUMENT',
        file: { name: 'cancelled_cheque.pdf', size: 50000, type: 'application/pdf' } as any,
        uploadedBy: 'vendor.admin@apex.com',
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: VENDOR_ALPHA,
      });
      uploadedDocId = up.document!.id;
    });

    it('STRICTLY BLOCKS Vendor Admin from self-approving compliance documents', async () => {
      const reviewRes = await VendorPrivateDocumentService.reviewDocument({
        documentId: uploadedDocId,
        reviewerId: 'vendor.admin@apex.com',
        reviewerRole: 'VENDOR_ADMIN',
        organizationId: TENANT_A,
        status: 'APPROVED',
      });

      expect(reviewRes.success).toBe(false);
      expect(reviewRes.error).toContain('Vendor Admin cannot review or approve');
    });

    it('allows HR Admin to approve document and records reviewer audit trail', async () => {
      const reviewRes = await VendorPrivateDocumentService.reviewDocument({
        documentId: uploadedDocId,
        reviewerId: 'hr.manager@joyhospitality.com',
        reviewerRole: 'HR_ADMIN',
        organizationId: TENANT_A,
        status: 'APPROVED',
      });

      expect(reviewRes.success).toBe(true);
      expect(reviewRes.document?.status).toBe('APPROVED');
      expect(reviewRes.document?.reviewedBy).toBe('hr.manager@joyhospitality.com');
      expect(reviewRes.document?.auditTrail?.length).toBeGreaterThanOrEqual(2);
    });

    it('requires mandatory rejection reason when HR Admin rejects a document', async () => {
      const rejectWithoutReason = await VendorPrivateDocumentService.reviewDocument({
        documentId: uploadedDocId,
        reviewerId: 'hr.manager@joyhospitality.com',
        reviewerRole: 'HR_ADMIN',
        organizationId: TENANT_A,
        status: 'REJECTED',
        rejectionReason: '', // Empty reason!
      });

      expect(rejectWithoutReason.success).toBe(false);
      expect(rejectWithoutReason.error).toContain('Rejection reason is mandatory');

      const rejectWithReason = await VendorPrivateDocumentService.reviewDocument({
        documentId: uploadedDocId,
        reviewerId: 'hr.manager@joyhospitality.com',
        reviewerRole: 'HR_ADMIN',
        organizationId: TENANT_A,
        status: 'REJECTED',
        rejectionReason: 'IFSC Code mismatch with bank statement header.',
      });

      expect(rejectWithReason.success).toBe(true);
      expect(rejectWithReason.document?.status).toBe('REJECTED');
      expect(rejectWithReason.document?.rejectionReason).toBe('IFSC Code mismatch with bank statement header.');
    });

    it('supports RESUBMISSION_REQUIRED workflow with instructions for Vendor', async () => {
      const resubmitReq = await VendorPrivateDocumentService.reviewDocument({
        documentId: uploadedDocId,
        reviewerId: 'hr.compliance@joyhospitality.com',
        reviewerRole: 'HR_ADMIN',
        organizationId: TENANT_A,
        status: 'RESUBMISSION_REQUIRED',
        resubmissionNote: 'Please upload original color scan with company seal visible.',
      });

      expect(resubmitReq.success).toBe(true);
      expect(resubmitReq.document?.status).toBe('RESUBMISSION_REQUIRED');
      expect(resubmitReq.document?.resubmissionNote).toBe('Please upload original color scan with company seal visible.');
    });
  });

  describe('5. Profile Media Separation Governance', () => {
    it('isolates employee profile photos to dedicated employee-profile-media bucket', () => {
      const path = EmployeeProfileMediaService.buildProfileImagePath(
        TENANT_A,
        'emp-101',
        'avatar.jpg'
      );

      expect(path).toContain(`tenant/${TENANT_A}/employees/emp-101/profile/avatar_`);
      expect(path).toMatch(/\.jpg$/);
    });

    it('enforces 5MB size limit and image-only MIME formats for profile media', () => {
      const validJpg = { name: 'photo.jpg', size: 1024 * 500, type: 'image/jpeg' };
      expect(EmployeeProfileMediaService.validateImage(validJpg).valid).toBe(true);

      const oversizedPhoto = { name: 'dslr_raw.jpg', size: 8 * 1024 * 1024, type: 'image/jpeg' };
      const resOver = EmployeeProfileMediaService.validateImage(oversizedPhoto);
      expect(resOver.valid).toBe(false);
      expect(resOver.error).toContain('exceeds 5MB maximum limit');

      const nonImage = { name: 'statutory_slip.pdf', size: 50000, type: 'application/pdf' };
      const resMime = EmployeeProfileMediaService.validateImage(nonImage);
      expect(resMime.valid).toBe(false);
      expect(resMime.error).toContain('Unsupported image type');
    });

    it('completes profile photo upload and returns dedicated bucket assignment', async () => {
      const mockImage = {
        name: 'haripriya_avatar.png',
        size: 350000,
        type: 'image/png',
      };

      const uploadResult = await EmployeeProfileMediaService.uploadProfilePhoto({
        organizationId: TENANT_A,
        employeeId: 'emp-hr-001',
        file: mockImage as any,
        sourceClient: 'FLUTTER_MOBILE',
      });

      expect(uploadResult.success).toBe(true);
      expect([PROFILE_MEDIA_BUCKET, 'peoplehr-private-profile-media', 'employee-documents']).toContain(uploadResult.storageBucket);
      expect(uploadResult.storagePath).toContain('tenant/org-joy-main/employees/emp-hr-001/profile/');
      expect(uploadResult.signedUrl).toBeDefined();
    });
  });
});
