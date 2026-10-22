// src/services/attendance/__tests__/attendanceMisDeliveryService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attendanceMisDeliveryService,
  computeSha256,
  countPdfPages,
  validateMisReportPdf,
} from '../attendanceMisDeliveryService';
import {
  attendanceReportExportService,
  generateMisReportFilename,
} from '../attendanceReportExportService';
import { attendanceReportEmailService } from '../attendanceReportEmailService';
import { whatsAppClient } from '../../whatsapp/whatsappClient';
import { whatsAppNotificationService } from '../../whatsapp/whatsappNotificationService';
import { whatsAppTemplateConfigService } from '../../whatsapp/whatsappTemplateConfigService';

describe('Unified Attendance MIS Report Delivery Workflow (Email & WhatsApp Parity)', () => {
  const sampleRows: any[] = [
    {
      record: {
        id: 'rec-01',
        employee_id: 'emp-01',
        attendance_date: '2026-10-21',
        status: 'Present',
        first_check_in: '08:58',
        last_check_out: '18:02',
        net_working_minutes: 544,
        late_minutes: 0,
        source: 'BIOMETRIC',
      },
      emp: {
        id: 'emp-01',
        employee_code: 'JCS-001',
        first_name: 'Marimuthu',
        last_name: 'Tirumalaikumar',
        display_name: 'Marimuthu Tirumalaikumar',
        department_name: 'Human Resources',
        designation_title: 'Head - HR & Operations',
        work_email: 'marimuthu@joycorporatesolutions.com',
      },
      shift: {
        shift_code: 'GEN-09',
        start_time: '09:00:00',
        end_time: '18:00:00',
      },
    },
    {
      record: {
        id: 'rec-02',
        employee_id: 'emp-02',
        attendance_date: '2026-10-21',
        status: 'Present',
        first_check_in: '09:16',
        last_check_out: '18:30',
        net_working_minutes: 554,
        late_minutes: 16,
        source: 'BIOMETRIC',
      },
      emp: {
        id: 'emp-02',
        employee_code: 'JCS-002',
        first_name: 'Praveen',
        last_name: 'B',
        display_name: 'Praveen B',
        department_name: 'Operations',
        designation_title: 'Operations Director',
        work_email: 'praveen.b@joyglobalcorp.com',
      },
      shift: {
        shift_code: 'GEN-09',
        start_time: '09:00:00',
        end_time: '18:00:00',
      },
    },
    {
      record: {
        id: 'rec-03',
        employee_id: 'emp-03',
        attendance_date: '2026-10-21',
        status: 'On Leave',
        first_check_in: null,
        last_check_out: null,
        net_working_minutes: 0,
        late_minutes: 0,
        source: null,
      },
      emp: {
        id: 'emp-03',
        employee_code: 'JCS-003',
        first_name: 'Saravanakumar',
        last_name: 'M',
        display_name: 'Saravanakumar M',
        department_name: 'Management',
        designation_title: 'Executive Director',
        work_email: 'saravanakumar@joycorporatesolutions.com',
      },
      shift: {
        shift_code: 'GEN-09',
        start_time: '09:00:00',
        end_time: '18:00:00',
      },
    },
  ];

  const samplePunches: any[] = [
    {
      id: 'punch-01',
      employee_id: 'emp-01',
      event_time: '2026-10-21T08:58:00+05:30',
      punch_type: 'CHECK_IN',
      terminal_sn: 'ESSL-HQ-BIO-01',
      verification_status: 'VERIFIED',
      classification: 'SHIFT_START',
    },
    {
      id: 'punch-02',
      employee_id: 'emp-02',
      event_time: '2026-10-21T09:16:00+05:30',
      punch_type: 'CHECK_IN',
      terminal_sn: 'ESSL-HQ-BIO-01',
      verification_status: 'VERIFIED',
      classification: 'LATE_CLOCK_IN',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Generates the exact reference filename and validates 3-page layout', async () => {
    const artifact = await attendanceMisDeliveryService.generateMisReportArtifact({
      rows: sampleRows,
      punches: samplePunches,
      options: {
        companyName: 'Joy Corporate Solutions',
        reportDate: '2026-10-21',
        reportType: 'MORNING_CHECKIN',
      },
    });

    expect(artifact.filename).toBe('JOY_Morning_Snapshot_2026-10-21.pdf');
    expect(artifact.reportType).toBe('MORNING_CHECKIN');
    expect(artifact.pageCount).toBe(3);
    expect(artifact.sizeBytes).toBeGreaterThan(10000);
    expect(artifact.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.buffer.byteLength).toBe(artifact.sizeBytes);
  });

  it('2. Computes identical cryptographic SHA-256 hash for buffer', async () => {
    const artifact = await attendanceMisDeliveryService.generateMisReportArtifact({
      rows: sampleRows,
      punches: samplePunches,
      options: {
        companyName: 'Joy Corporate Solutions',
        reportDate: '2026-10-21',
        reportType: 'MORNING_CHECKIN',
      },
    });

    const directHash = await computeSha256(artifact.buffer);
    expect(artifact.sha256Checksum).toBe(directHash);
  });

  it('3. Guarantees Email and WhatsApp delivery paths receive the EXACT same PDF artifact', async () => {
    // Spy on Email Service
    let capturedEmailArtifact: any = null;
    vi.spyOn(attendanceReportEmailService, 'sendReportToHR').mockImplementation(async (params: any) => {
      capturedEmailArtifact = params.preGeneratedPdf;
      return {
        success: true,
        id: 'msg-mock-email-123',
        pdfArtifact: params.preGeneratedPdf,
      };
    });

    // Spy on WhatsApp Notification Service
    let capturedWhatsAppTrigger: any = null;
    vi.spyOn(whatsAppNotificationService, 'sendAttendanceMisReport').mockImplementation(async (trigger: any) => {
      capturedWhatsAppTrigger = trigger;
      return {
        success: true,
      };
    });

    const delivery = await attendanceMisDeliveryService.deliverUnifiedMisReport({
      rows: sampleRows,
      punches: samplePunches,
      reportDate: '2026-10-21',
      reportType: 'MORNING_CHECKIN',
      companyName: 'Joy Corporate Solutions',
      emailRecipients: ['marimuthu@joycorporatesolutions.com'],
      whatsAppRecipients: ['919840209900'],
    });

    expect(delivery.success).toBe(true);

    // Verify artifact generated ONCE
    expect(delivery.artifact.filename).toBe('JOY_Morning_Snapshot_2026-10-21.pdf');

    // Verify Email got the exact pre-generated artifact
    expect(capturedEmailArtifact).toBeDefined();
    expect(capturedEmailArtifact.filename).toBe(delivery.artifact.filename);
    expect(capturedEmailArtifact.sha256Checksum).toBe(delivery.artifact.sha256Checksum);
    expect(capturedEmailArtifact.buffer.byteLength).toBe(delivery.artifact.buffer.byteLength);

    // Verify WhatsApp got the exact same filename and checksum
    expect(capturedWhatsAppTrigger).toBeDefined();
    expect(capturedWhatsAppTrigger.pdfFilename).toBe(delivery.artifact.filename);
    expect(capturedWhatsAppTrigger.sha256Checksum).toBe(delivery.artifact.sha256Checksum);
    expect(capturedWhatsAppTrigger.reportPdfUrl).toBe(delivery.artifact.documentUrl);

    // Byte parity verification
    const emailBytesHash = await computeSha256(capturedEmailArtifact.buffer);
    expect(emailBytesHash).toBe(delivery.artifact.sha256Checksum);
    expect(capturedWhatsAppTrigger.sha256Checksum).toBe(emailBytesHash);
  });

  it('4. Enforces RBAC: authorizes HR / Management and denies unauthorized employees', async () => {
    const result = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      emailTargets: [
        'marimuthu@joycorporatesolutions.com', // HR
        'saravanakumar@joycorporatesolutions.com', // Management
        'intern.unauthorized@gmail.com', // Unauthorized outsider
      ],
      whatsAppTargets: [
        '919840209900', // Authorized executive phone
        '919111199999', // Unknown / unauthorized phone
      ],
    });

    expect(result.authorizedEmails).toContain('marimuthu@joycorporatesolutions.com');
    expect(result.authorizedEmails).toContain('saravanakumar@joycorporatesolutions.com');
    expect(result.authorizedEmails).not.toContain('intern.unauthorized@gmail.com');

    expect(result.authorizedWhatsApp.some((w) => w.phone === '919840209900')).toBe(true);

    expect(result.rejected.some((r) => r.target === 'intern.unauthorized@gmail.com')).toBe(true);
    expect(result.rejected.some((r) => r.target === '919111199999')).toBe(true);
  });

  it('5. Falls back to genuine sendDocument attachment when template is unapproved', async () => {
    const artifact = await attendanceMisDeliveryService.generateMisReportArtifact({
      rows: sampleRows,
      punches: samplePunches,
      options: {
        companyName: 'Joy Corporate Solutions',
        reportDate: '2026-10-21',
        reportType: 'MORNING_CHECKIN',
      },
    });

    vi.spyOn(whatsAppNotificationService, 'sendAttendanceMisReport').mockResolvedValue({
      success: false,
      error: '(#132001) Template does not exist',
    });

    let capturedDocPayload: any = null;
    vi.spyOn(whatsAppClient, 'sendDocument').mockImplementation(async (payload: any) => {
      capturedDocPayload = payload;
      return {
        success: true,
        messageId: 'wamid.DOC_MOCK_FALLBACK',
      };
    });

    const res = await whatsAppNotificationService.sendAttendanceMisReportDirect({
      phone: '919840209900',
      recipientName: 'Marimuthu T',
      dateStr: '2026-10-21',
      pdfArtifact: artifact,
    });

    expect(res.success).toBe(true);
    expect(capturedDocPayload).toBeDefined();
    expect(capturedDocPayload.filename).toBe('JOY_Morning_Snapshot_2026-10-21.pdf');
    expect(capturedDocPayload.sha256Checksum).toBe(artifact.sha256Checksum);
    expect(capturedDocPayload.caption).toContain('Morning Workforce Check-In & Turnout Snapshot');
  }, 15000);

  it('6. Does NOT regenerate report on retry; reuses existing artifact', async () => {
    const artifact1 = await attendanceMisDeliveryService.generateMisReportArtifact({
      rows: sampleRows,
      punches: samplePunches,
      options: {
        companyName: 'Joy Corporate Solutions',
        reportDate: '2026-10-21',
        reportType: 'MORNING_CHECKIN',
      },
    });

    let sendAttempts = 0;
    vi.spyOn(whatsAppClient, 'sendDocument').mockImplementation(async (payload: any) => {
      sendAttempts++;
      return { success: true, messageId: `msg-${sendAttempts}` };
    });

    // Run delivery twice passing preGeneratedArtifact
    const delivery1 = await attendanceMisDeliveryService.deliverUnifiedMisReport({
      rows: sampleRows,
      punches: samplePunches,
      reportDate: '2026-10-21',
      reportType: 'MORNING_CHECKIN',
      whatsAppRecipients: ['919840209900'],
      preGeneratedArtifact: artifact1,
    });

    const delivery2 = await attendanceMisDeliveryService.deliverUnifiedMisReport({
      rows: sampleRows,
      punches: samplePunches,
      reportDate: '2026-10-21',
      reportType: 'MORNING_CHECKIN',
      whatsAppRecipients: ['919840209900'],
      preGeneratedArtifact: artifact1,
    });

    expect(delivery1.artifact.sha256Checksum).toBe(artifact1.sha256Checksum);
    expect(delivery2.artifact.sha256Checksum).toBe(artifact1.sha256Checksum);
    expect(delivery1.artifact.filename).toBe(delivery2.artifact.filename);
  });

  it('7. Rejects invalid phone numbers with clear reason', async () => {
    const result = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      whatsAppTargets: ['not-a-number', '123', ''],
    });

    expect(result.authorizedWhatsApp.length).toBe(0);
    expect(result.rejected.length).toBeGreaterThanOrEqual(2);
    expect(result.rejected[0].reason).toContain('Invalid phone number format');
  });

  it('8. Deduplicates identical or differently formatted phone numbers', async () => {
    const result = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      whatsAppTargets: ['919840209900', '9840209900', '+91 98402 09900'],
    });

    expect(result.authorizedWhatsApp.length).toBe(1);
    expect(result.authorizedWhatsApp[0].phone).toBe('919840209900');
  });

  it('9. Blocks unauthorized external phone numbers not present in employee directory or executive whitelist', async () => {
    const result = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      whatsAppTargets: ['919777788888', '919555544444'],
    });

    expect(result.authorizedWhatsApp.length).toBe(0);
    expect(result.rejected.length).toBe(2);
    expect(result.rejected[0].reason).toContain('Unauthorized external number');
  });

  it('10. Enforces scope restriction: Managers cannot receive organization-wide MIS reports', async () => {
    // When scope is 'ALL', a manager target without executive HR clearance must be restricted
    const result = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      scope: 'ALL',
      emailTargets: ['praveen.b@joyglobalcorp.com'], // Operations Director / Manager
    });

    // Praveen has corporate domain, but if a regular manager email without HR clearance requests ALL scope:
    const generalManagerResult = await attendanceMisDeliveryService.resolveAuthorizedMisRecipients({
      scope: 'ALL',
      emailTargets: ['lead.support@joycorporatesolutions.com'],
    });

    expect(generalManagerResult.authorizedEmails).not.toContain('lead.support@joycorporatesolutions.com');
  });

  it('11. Handles partial recipient failure without concealing successful deliveries', async () => {
    let callCount = 0;
    vi.spyOn(whatsAppClient, 'sendDocument').mockImplementation(async (payload: any) => {
      callCount++;
      if (payload.to === '919840111111') {
        return { success: false, error: 'User opted out of WhatsApp messages' };
      }
      return { success: true, messageId: 'wamid.SUCCESS_123' };
    });

    const delivery = await attendanceMisDeliveryService.deliverUnifiedMisReport({
      rows: sampleRows,
      punches: samplePunches,
      reportDate: '2026-10-21',
      reportType: 'MORNING_CHECKIN',
      whatsAppRecipients: ['919840209900', '919840111111'],
    });

    // WhatsApp overall was false due to partial failure
    expect(delivery.whatsAppResults.attempted).toBe(true);
    expect(delivery.whatsAppResults.success).toBe(false);

    // Individual delivery tracking records both
    const successfulDelivery = delivery.whatsAppResults.deliveries.find((d) => d.phone === '919840209900');
    const failedDelivery = delivery.whatsAppResults.deliveries.find((d) => d.phone === '919840111111');

    expect(successfulDelivery).toBeDefined();
    expect(successfulDelivery?.success).toBe(true);
    expect(failedDelivery).toBeDefined();
    expect(failedDelivery?.success).toBe(false);
    expect(failedDelivery?.error).toContain('opted out');
  });

  it('12. Generates short, consistent, human-readable filenames without WhatsApp truncation', () => {
    // 1. Morning Snapshot
    const morningFn = generateMisReportFilename({
      companyName: 'Joy Corporate Solutions Pvt Ltd',
      reportType: 'MORNING_CHECKIN',
      reportDate: '2026-10-22',
    });
    expect(morningFn).toBe('JOY_Morning_Snapshot_2026-10-22.pdf');
    expect(morningFn.length).toBeLessThanOrEqual(35);

    // 2. Evening Attendance MIS
    const eveningFn = generateMisReportFilename({
      companyName: 'Joy Corporate Solutions',
      reportType: 'EVENING_FINAL',
      reportDate: '2026-10-22',
    });
    expect(eveningFn).toBe('JOY_Attendance_MIS_2026-10-22.pdf');
    expect(eveningFn.length).toBeLessThanOrEqual(35);

    // 3. Workforce Audit
    const auditFn = generateMisReportFilename({
      companyName: 'Joy Corporate Solutions',
      reportType: 'AUDIT',
      reportDate: '2026-10-22',
    });
    expect(auditFn).toBe('JOY_Workforce_Audit_2026-10-22.pdf');
    expect(auditFn.length).toBeLessThanOrEqual(35);

    // 4. Workforce MIS
    const workforceFn = generateMisReportFilename({
      companyName: 'Joy Corporate Solutions',
      reportType: 'WORKFORCE_MIS',
      reportDate: '2026-10-22',
    });
    expect(workforceFn).toBe('JOY_Workforce_MIS_2026-10-22.pdf');
    expect(workforceFn.length).toBeLessThanOrEqual(35);

    // 5. Normalizes away generic 'Workforce Organization' dummy string
    const sanitizedDummy = generateMisReportFilename({
      companyName: 'Workforce Organization',
      reportType: 'MORNING_CHECKIN',
      reportDate: '2026-10-22',
    });
    expect(sanitizedDummy).toBe('JOY_Morning_Snapshot_2026-10-22.pdf');

    // 6. Custom tenant company name generates clean short prefix
    const customFn = generateMisReportFilename({
      companyName: 'Carenow Medical Systems',
      reportType: 'MORNING_CHECKIN',
      reportDate: '2026-10-22',
    });
    expect(customFn).toMatch(/^CMS_Morning_Snapshot_2026-10-22\.pdf$/);
    expect(customFn.length).toBeLessThanOrEqual(35);
  });

  it('13. Pre-Send PDF validation verifies signature, completeness, pages, and rejects corrupt/HTML artifacts', async () => {
    // 1. Valid PDF buffer passes validation
    const validPdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page >>\nendobj\nxref\n0 4\ntrailer\n<< /Root 1 0 R >>\n%%EOF' + ' '.repeat(1000));
    const validRes = await validateMisReportPdf({
      buffer: validPdfBytes,
      filename: 'JOY_Morning_Snapshot_2026-10-22.pdf',
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.pageCount).toBeGreaterThan(0);
    expect(validRes.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(validRes.mimeType).toBe('application/pdf');

    // 2. Rejects incomplete buffer (< 1000 bytes)
    const tinyBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    await expect(validateMisReportPdf({
      buffer: tinyBuffer,
      filename: 'JOY_Morning_Snapshot_2026-10-22.pdf',
    })).rejects.toThrow('too small or incomplete');

    // 3. Rejects missing %PDF- magic signature
    const corruptBuffer = new Uint8Array(2000).fill(65);
    await expect(validateMisReportPdf({
      buffer: corruptBuffer,
      filename: 'JOY_Morning_Snapshot_2026-10-22.pdf',
    })).rejects.toThrow('%PDF-');

    // 4. Rejects HTML error page replacement
    const htmlErrorBytes = new TextEncoder().encode('<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1></body></html>' + ' '.repeat(1000));
    await expect(validateMisReportPdf({
      buffer: htmlErrorBytes,
      filename: 'JOY_Morning_Snapshot_2026-10-22.pdf',
    })).rejects.toThrow('replaced by an HTML/JSON error document');

    // 5. Rejects invalid filename without .pdf extension
    await expect(validateMisReportPdf({
      buffer: validPdfBytes,
      filename: 'JOY_Morning_Snapshot_2026-10-22.docx',
    })).rejects.toThrow('Expected .pdf extension');

    // 6. Rejects filenames with illegal characters
    await expect(validateMisReportPdf({
      buffer: validPdfBytes,
      filename: 'JOY_Morning/Snapshot:2026.pdf',
    })).rejects.toThrow('contains illegal characters');
  });

  it('14. Validates professional WhatsApp message text and metadata presentation', () => {
    const caption = whatsAppTemplateConfigService.formatProfessionalMisCaption({
      recipientName: 'Thirumalai R K',
      reportName: 'Morning Workforce Check-In & Turnout Snapshot',
      reportDate: '22 October 2026',
      reportCutoff: '10:30 AM',
      reportStatus: 'Verified Biometric & Attendance Audit',
      companyName: 'Joy Corporate Solutions Pvt Ltd',
    });

    expect(caption).toContain('*JOY PeopleHR — Workforce MIS Report*');
    expect(caption).toContain('Dear Thirumalai R K,');
    expect(caption).toContain('Your workforce report for *22 October 2026* is ready.');
    expect(caption).toContain('• Organization: Joy Corporate Solutions Pvt Ltd');
    expect(caption).toContain('• Report: Morning Workforce Check-In & Turnout Snapshot');
    expect(caption).toContain('• Reporting date: 22 October 2026');
    expect(caption).toContain('• Generated at: 10:30 AM');
    expect(caption).toContain('• Report status: Verified Biometric & Attendance Audit');
    expect(caption).toContain('JOY PeopleHR | Workforce Management');

    // Must never contain generic dummy 'Workforce Organization'
    expect(caption).not.toContain('Workforce Organization');
  });
});
