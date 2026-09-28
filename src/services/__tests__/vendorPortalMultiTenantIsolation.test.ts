// src/services/__tests__/vendorPortalMultiTenantIsolation.test.ts
// ============================================================================
// Joy People HR — Vendor Portal & HR Payroll Ecosystem Multi-Tenant Test Suite
// Gate 28: Multi-Tenant Data Isolation, Attendance Dual Ingestion & Daily OT
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { vendorComplianceService } from '../vendor/vendorComplianceService';
import { vendorAttendanceIngestionService } from '../vendor/vendorAttendanceIngestionService';
import { attendanceMissEscalationEngine } from '../operations/attendanceMissEscalationEngine';

describe('GATE 28: VENDOR PORTAL & MULTI-TENANT ISOLATION REALITY', () => {
  const ORG_A = 'org-joy-main';
  const ORG_B = 'org-competitor-xyz';
  const VENDOR_ALPHA = 'VEN-000001';
  const VENDOR_BETA = 'VEN-000002';
  const SITE_CHE = 'rel-stream-b-joy-che-01';

  // --------------------------------------------------------------------------
  // 1. Multi-Tenant Compliance Document Isolation & Verification
  // --------------------------------------------------------------------------
  it('Test 1: Multi-Tenant Compliance Isolation - Vendor Alpha cannot view Vendor Beta documents', () => {
    // Submit document for Vendor Alpha
    const docAlpha = vendorComplianceService.submitDocument({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      clientSiteContractId: SITE_CHE,
      category: 'STATUTORY_ESI_PF',
      documentType: 'ESI_CHALLAN',
      reportingPeriod: '2026-09',
      periodType: 'MONTHLY',
      title: 'ESI Monthly Paid Challan',
      fileName: 'esi_challan_sep2026.pdf',
      fileStoragePath: 'org/org-joy-main/vendor/VEN-000001/2026-09/esi.pdf',
      fileSizeBytes: 120400,
      mimeType: 'application/pdf',
      uploadedBy: 'ramesh.k@abcsecurity.in',
    });

    // Query for Vendor Beta
    const betaDocs = vendorComplianceService.listDocuments({
      organizationId: ORG_A,
      vendorId: VENDOR_BETA,
      reportingPeriod: '2026-09',
    });

    expect(betaDocs.some(d => d.id === docAlpha.id)).toBe(false);

    // Query for Vendor Alpha in a foreign Organization B
    const foreignOrgDocs = vendorComplianceService.listDocuments({
      organizationId: ORG_B,
      vendorId: VENDOR_ALPHA,
      reportingPeriod: '2026-09',
    });

    expect(foreignOrgDocs.length).toBe(0);
  });

  it('Test 2: Maker-Checker Verification Guard - Rejects cross-tenant verification attempt', () => {
    const doc = vendorComplianceService.submitDocument({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      category: 'STATUTORY_ESI_PF',
      documentType: 'PF_CHALLAN_TRRN',
      reportingPeriod: '2026-09',
      periodType: 'MONTHLY',
      title: 'PF TRRN Challan',
      fileName: 'pf_trrn.pdf',
      fileStoragePath: 'path/pf.pdf',
      fileSizeBytes: 50000,
      mimeType: 'application/pdf',
      uploadedBy: 'vendor@abc.com',
    });

    // Foreign org reviewer attempts to verify
    expect(() => {
      vendorComplianceService.verifyDocument({
        documentId: doc.id,
        organizationId: ORG_B, // Wrong Org
        reviewerId: 'rogue.reviewer@xyz.com',
        action: 'VERIFY',
        remarks: 'Illegal cross-tenant verification',
      });
    }).toThrow(/Cross-tenant document verification attempt blocked/i);

    // Legitimate Org A reviewer verifies
    const verifiedDoc = vendorComplianceService.verifyDocument({
      documentId: doc.id,
      organizationId: ORG_A,
      reviewerId: 'hr.admin@joyhospitality.com',
      action: 'VERIFY',
      remarks: 'Verified with EPFO TRRN portal',
    });

    expect(verifiedDoc.status).toBe('VERIFIED');
    expect(verifiedDoc.verifiedBy).toBe('hr.admin@joyhospitality.com');
  });

  // --------------------------------------------------------------------------
  // 2. Attendance Ingestion & Daily OT Engine
  // --------------------------------------------------------------------------
  it('Test 3: Vendor Attendance Upload - Validates employee mapping and detects row errors', () => {
    const validCodes = new Set(['VEN01-EMP01', 'VEN01-EMP02']);

    const rawRows = [
      { employeeCode: 'VEN01-EMP01', date: '2026-09-20', shiftCode: 'GENERAL', inTime: '09:00', outTime: '18:30', status: 'PRESENT', breakDurationMinutes: 60 },
      { employeeCode: 'UNKNOWN_EMP_99', date: '2026-09-20', shiftCode: 'GENERAL', inTime: '09:00', outTime: '18:00', status: 'PRESENT', breakDurationMinutes: 60 }, // Unmapped worker
      { employeeCode: 'VEN01-EMP01', date: '2026-09-20', shiftCode: 'GENERAL', inTime: '09:00', outTime: '18:30', status: 'PRESENT', breakDurationMinutes: 60 }, // Duplicate in batch
    ];

    const result = vendorAttendanceIngestionService.processVendorUpload({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      clientSiteContractId: SITE_CHE,
      batchName: 'Attendance_Sept2026_Batch1.csv',
      periodMonth: '2026-09',
      uploadedBy: 'ramesh.k@abcsecurity.in',
      rawRows,
      validEmployeeCodes: validCodes,
      standardShiftHours: 8,
      otHourlyRate: 81.73,
    });

    expect(result.totalRecords).toBe(3);
    expect(result.validRecords).toBe(1);
    expect(result.errorRecords).toBe(2);
    expect(result.isEligibleForIngestion).toBe(false);

    // Row 2 error: unmapped employee
    expect(result.rows[1].validationErrors?.[0]).toContain('not mapped to this vendor contract');
    // Row 3 error: duplicate date
    expect(result.rows[2].validationErrors?.[0]).toContain('Duplicate attendance record');
  });

  it('Test 4: Daily Overtime (OT) Engine - Calculates net working hours, break deduction & OT rate', () => {
    const validCodes = new Set(['VEN01-EMP01']);

    // 09:00 to 19:30 (10.5 total hours) - 60 min break = 9.5 net hours -> 8h regular + 1.5h OT
    const rawRows = [
      { employeeCode: 'VEN01-EMP01', employeeName: 'Murugan P', date: '2026-09-21', shiftCode: 'GENERAL', inTime: '09:00', outTime: '19:30', status: 'PRESENT', breakDurationMinutes: 60 },
    ];

    const result = vendorAttendanceIngestionService.processVendorUpload({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      clientSiteContractId: SITE_CHE,
      batchName: 'Clean_Batch.csv',
      periodMonth: '2026-09',
      uploadedBy: 'ramesh.k@abcsecurity.in',
      rawRows,
      validEmployeeCodes: validCodes,
      standardShiftHours: 8,
      otHourlyRate: 81.73,
    });

    expect(result.validRecords).toBe(1);
    expect(result.rows[0].regularWorkingHours).toBe(8);
    expect(result.rows[0].rawOtHours).toBe(1.5);
    expect(result.generatedOtRecords.length).toBe(1);

    const otRec = result.generatedOtRecords[0];
    expect(otRec.potentialOtHours).toBe(1.5);
    expect(otRec.otHourlyRate).toBe(81.73);
    expect(otRec.otPayableAmount).toBe(122.6); // 1.5 * 81.73 = 122.595 -> 122.6
    expect(otRec.approvalStatus).toBe('PENDING');

    // Approve OT
    const approvedOt = vendorAttendanceIngestionService.approveDailyOt({
      otRecordId: otRec.id,
      organizationId: ORG_A,
      approvedBy: 'karthik.mgr@joyhospitality.com',
      approvedOtHours: 1.5,
      remarks: 'Overtime authorized for inventory dispatch',
    });

    expect(approvedOt.approvalStatus).toBe('APPROVED');
    expect(approvedOt.approvedBy).toBe('karthik.mgr@joyhospitality.com');
  });

  // --------------------------------------------------------------------------
  // 3. Hierarchical Attendance Miss Exception & Escalation Engine
  // --------------------------------------------------------------------------
  it('Test 5: Hierarchical Miss Report & Escalation - Aggregates by Org -> Manager -> TL -> Worker', () => {
    const report = attendanceMissEscalationEngine.generateHierarchicalReport({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      reportDate: '2026-09-20',
    });

    expect(report.organizationId).toBe(ORG_A);
    expect(report.totalExceptions).toBeGreaterThan(0);
    expect(report.managers.length).toBeGreaterThan(0);

    const mgr = report.managers[0];
    expect(mgr.managerName).toContain('Karthik Raja');
    expect(mgr.teamLeaders.length).toBeGreaterThan(0);

    // Test SLA escalation trigger
    const escalatedList = attendanceMissEscalationEngine.processEscalations(ORG_A);
    expect(escalatedList.length).toBeGreaterThan(0);

    // Generate deduplicated email payloads
    const emailPayloads = attendanceMissEscalationEngine.generateEmailNotifications({
      organizationId: ORG_A,
      reportDate: '2026-09-20',
    });

    expect(emailPayloads.length).toBeGreaterThan(0);
    expect(emailPayloads[0].recipientRole).toBe('REPORTING_MANAGER');
    expect(emailPayloads[0].records.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 4. Vendor Onboarding State Machine & Validation
  // --------------------------------------------------------------------------
  it('Test 6: Vendor Onboarding Service - Validates PAN, GSTIN, IFSC and state transitions', async () => {
    const { VendorOnboardingService } = await import('../vendor/vendorOnboardingService');

    expect(VendorOnboardingService.isValidPAN('ABCDE1234F')).toBe(true);
    expect(VendorOnboardingService.isValidPAN('invalid-pan')).toBe(false);

    expect(VendorOnboardingService.isValidGSTIN('33ABCDE1234F1Z5')).toBe(true);
    expect(VendorOnboardingService.isValidGSTIN('wrong_gstin')).toBe(false);

    expect(VendorOnboardingService.isValidIFSC('HDFC0001234')).toBe(true);
    expect(VendorOnboardingService.isValidIFSC('HDFC1234')).toBe(false);

    expect(VendorOnboardingService.maskAccountNumber('50200012345678')).toBe('••••••••5678');

    // State machine transitions
    expect(VendorOnboardingService.canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(VendorOnboardingService.canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(VendorOnboardingService.canTransition('SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(VendorOnboardingService.canTransition('UNDER_REVIEW', 'APPROVED')).toBe(true);
    expect(VendorOnboardingService.canTransition('APPROVED', 'ACTIVE')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 5. Workforce Onboarding & Effective-Dated Deployment
  // --------------------------------------------------------------------------
  it('Test 7: Workforce Onboarding Service - Validates payload and builds active deployment mapping', async () => {
    const { VendorEmployeeOnboardingService } = await import('../vendor/vendorEmployeeOnboardingService');

    const payload = {
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      employeeCode: 'EMP-9901',
      firstName: 'Karthik',
      lastName: 'Subramaniam',
      gender: 'MALE' as const,
      dateOfBirth: '1995-04-12',
      joiningDate: '2026-09-01',
      designation: 'Senior CNC Technician',
      skillCategory: 'HIGHLY_SKILLED' as const,
      mobileNumber: '9840199882',
      aadhaarNumberMasked: 'XXXX-XXXX-1928',
      panMasked: 'ABCDE1928F',
      deployment: {
        clientCompanyId: 'comp-joy-che',
        clientCompanyName: 'Joy Hospitality Chennai Pvt Ltd',
        siteName: 'Chennai Central Operations Hub',
        contractCode: 'CON-JOY-CHE-2026-01',
        department: 'Precision Machining',
        assignedShift: 'GENERAL (09:00 - 18:00)',
        reportingManagerId: 'mgr-001',
        reportingManagerName: 'Karthik Raja',
        teamLeaderId: 'tl-001',
        teamLeaderName: 'Suresh V',
      },
      banking: {
        accountNumber: '502000887711',
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234',
        branch: 'Guindy',
      },
    };

    const res = VendorEmployeeOnboardingService.processOnboarding(payload);
    expect(res.valid).toBe(true);
    expect(res.employeeRecord.name).toBe('Karthik Subramaniam');
    expect(res.employeeRecord.skill).toBe('HIGHLY_SKILLED');
    expect(res.deploymentMapping?.contractCode).toBe('CON-JOY-CHE-2026-01');
    expect(res.deploymentMapping?.reportingManagerName).toBe('Karthik Raja');
    expect(res.deploymentMapping?.status).toBe('ACTIVE');
  });

  // --------------------------------------------------------------------------
  // 6. Dedicated Private Document Storage Isolation
  // --------------------------------------------------------------------------
  it('Test 8: Private Document Storage - Validates file types and denies cross-tenant access', async () => {
    const { VendorPrivateDocumentService } = await import('../vendor/vendorPrivateDocumentService');

    // 1. Path format adherence
    const storagePath = VendorPrivateDocumentService.buildStoragePath({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      subFolder: 'company/registration',
      fileName: 'pan_card.pdf',
    });

    expect(storagePath).toContain(`tenant/${ORG_A}/vendor/${VENDOR_ALPHA}/company/registration/`);

    // 2. File validation
    const validFile = { name: 'esi_doc.pdf', size: 1024 * 500, type: 'application/pdf' };
    expect(VendorPrivateDocumentService.validateDocument(validFile).valid).toBe(true);

    const oversizedFile = { name: 'huge_video.mp4', size: 25 * 1024 * 1024, type: 'video/mp4' };
    expect(VendorPrivateDocumentService.validateDocument(oversizedFile).valid).toBe(false);

    // 3. Cross-Tenant signed URL request denial
    const crossTenantUrl = await VendorPrivateDocumentService.getSignedDownloadUrl({
      storagePath,
      requesterOrgId: ORG_B, // Wrong organization!
    });
    expect(crossTenantUrl.error).toContain('Cross-tenant document access is strictly forbidden');
  });

  // --------------------------------------------------------------------------
  // 7. Attendance Miss Email Escalation Engine
  // --------------------------------------------------------------------------
  it('Test 9: Attendance Miss Email Engine - Generates idempotent runs and resolves hierarchy recipients', async () => {
    const { VendorAttendanceMissEmailService } = await import('../vendor/vendorAttendanceMissEmailService');

    const sampleExceptions = [
      {
        id: 'exc-001',
        organizationId: ORG_A,
        vendorId: VENDOR_ALPHA,
        clientSiteContractId: SITE_CHE,
        siteName: 'Chennai Central Hub',
        managerId: 'mgr-01',
        managerName: 'Karthik Raja',
        tlSupervisorId: 'tl-01',
        tlSupervisorName: 'Suresh V',
        employeeId: 'emp-01',
        employeeCode: 'VEN01-EMP01',
        employeeName: 'Murugan P',
        date: '2026-09-20',
        exceptionType: 'MISSING_IN_PUNCH' as const,
        standardHours: 8,
        actualHours: 0,
        status: 'OPEN' as const,
        escalationLevel: 0,
      },
    ];

    const recipients = VendorAttendanceMissEmailService.resolveRecipients(
      sampleExceptions,
      'Chennai Central Hub',
      'Joy Hospitality'
    );
    expect(recipients.some(r => r.role === 'TL_SUPERVISOR')).toBe(true);
    expect(recipients.some(r => r.role === 'OPERATIONS_MANAGER')).toBe(true);
    expect(recipients.some(r => r.role === 'CLIENT_HR')).toBe(true);

    const emailContent = VendorAttendanceMissEmailService.generateEmailContent({
      clientCompanyName: 'Joy Hospitality',
      siteName: 'Chennai Central Hub',
      date: '2026-09-20',
      exceptions: sampleExceptions,
    });
    expect(emailContent.subject).toContain('Attendance Exception Report');
    expect(emailContent.html).toContain('Karthik Raja');
    expect(emailContent.html).toContain('Murugan P');

    const dispatchRes = await VendorAttendanceMissEmailService.dispatchEscalationRun({
      organizationId: ORG_A,
      vendorId: VENDOR_ALPHA,
      clientCompanyName: 'Joy Hospitality',
      siteName: 'Chennai Central Hub',
      reportingDate: '2026-09-20',
      exceptions: sampleExceptions,
      triggeredBy: 'Ops Desk',
    });

    expect(dispatchRes.success).toBe(true);
    expect(dispatchRes.run?.status).toBe('SENT');
    expect(dispatchRes.run?.idempotencyKey).toContain(ORG_A);
  });
});

