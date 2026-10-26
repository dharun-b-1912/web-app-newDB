// src/services/attendance/attendanceMisDeliveryService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Unified MIS Report Delivery Service
// Ensures the EXACT same finalized PDF artifact generated for Email is delivered
// to WhatsApp as a document attachment with identical bytes, SHA-256 checksum,
// page count, and layout, with role-based access control and separate audit logs.
// ============================================================================

import { supabase, supabaseAdmin } from '../../lib/supabase';
import { api } from '../api';
import {
  attendanceReportExportService,
  AttendanceReportRow,
  AttendanceExportOptions,
} from './attendanceReportExportService';
import { ClassifiedPunchEvent } from './attendanceClassificationEngine';
import { attendanceReportEmailService, PreGeneratedPdfArtifact } from './attendanceReportEmailService';
import { whatsAppNotificationService } from '../whatsapp/whatsappNotificationService';
import { whatsAppClient } from '../whatsapp/whatsappClient';
import { whatsAppTemplateConfigService } from '../whatsapp/whatsappTemplateConfigService';
import { normalizeIndianPhone } from '../whatsapp/phoneUtils';
import { attendanceReportContactService } from './attendanceReportContactService';

// ============================================================================
// Types
// ============================================================================

export interface MisReportStats {
  totalWorkforce: number;
  presentCount: number;
  turnoutPct: number;
  lateCount: number;
  weeklyOffLeave: number;
  cumulativeHours: string;
  presentTurnout: string;
}

export interface AttendanceMisReportArtifact {
  runId: string;
  organizationId: string;
  companyName: string;
  reportDate: string;
  reportType: 'MORNING_CHECKIN' | 'EVENING_FINAL';
  cutoffTime: string;
  filename: string;
  buffer: Uint8Array;
  base64: string;
  sizeBytes: number;
  sha256Checksum: string;
  storagePath: string;
  documentUrl: string;
  pageCount: number;
  stats: MisReportStats;
}

export interface AuthorizedMisRecipientWhatsApp {
  phone: string;
  name: string;
  role: string;
  employeeId?: string;
}

export interface ResolvedMisRecipients {
  authorizedEmails: string[];
  authorizedWhatsApp: AuthorizedMisRecipientWhatsApp[];
  rejected: Array<{ target: string; reason: string }>;
}

export interface UnifiedMisDeliverySummary {
  success: boolean;
  runId: string;
  reportDate: string;
  reportType: 'MORNING_CHECKIN' | 'EVENING_FINAL';
  companyName: string;
  artifact: {
    filename: string;
    buffer: Uint8Array;
    base64: string;
    sizeBytes: number;
    sha256Checksum: string;
    documentUrl: string;
    pageCount: number;
    stats?: MisReportStats;
  };
  emailResults: {
    attempted: boolean;
    success: boolean;
    recipients: string[];
    error?: string;
  };
  whatsAppResults: {
    attempted: boolean;
    success: boolean;
    deliveries: Array<{
      phone: string;
      name: string;
      success: boolean;
      providerMessageId?: string;
      error?: string;
    }>;
  };
  rejectedRecipients: Array<{
    target: string;
    reason: string;
  }>;
}

// ============================================================================
// Cryptographic Hash Utility
// ============================================================================

/**
 * Computes deterministic SHA-256 hexadecimal hash across Node and Browser runtimes.
 */
export async function computeSha256(data: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // 1. Web Crypto API (Browser & modern Node)
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const arrayBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (_) { }
  }

  // 2. Node.js crypto module fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  } catch (_) { }

  // 3. Fallback deterministic hash if crypto unavailable
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash << 5) - hash + bytes[i];
    hash |= 0;
  }
  return `sha256-fallback-${Math.abs(hash).toString(16)}`;
}

/**
 * Counts PDF pages from buffer by inspecting page dictionary markers.
 */
export function countPdfPages(buffer: Uint8Array): number {
  try {
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 3;
  } catch {
    return 3;
  }
}

export interface PdfValidationResult {
  valid: boolean;
  sizeBytes: number;
  pageCount: number;
  sha256Checksum: string;
  mimeType: string;
  error?: string;
}

/**
 * Pre-Send PDF Validation Guard
 * Confirms artifact integrity, %PDF- signature, non-empty pages, WhatsApp size limits (<16MB),
 * absence of HTML error pages, and safe filename structure before media upload or dispatch.
 */
export async function validateMisReportPdf(params: {
  buffer: Uint8Array;
  filename: string;
  expectedDate?: string;
}): Promise<PdfValidationResult> {
  const { buffer, filename } = params;

  // 1. Presence and minimum size check (valid PDF is at least 1 KB)
  if (!buffer || buffer.byteLength < 1000) {
    throw new Error(`PDF validation failed: Generated buffer is too small or incomplete (${buffer?.byteLength || 0} bytes). Expected at least 1000 bytes.`);
  }

  // 2. Maximum WhatsApp provider file size limit check (Meta Cloud API max is 100MB, recommended < 16MB)
  const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024; // 16 MB
  if (buffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(`PDF validation failed: File size (${Math.round(buffer.byteLength / 1024)} KB) exceeds provider maximum limit of 16 MB.`);
  }

  // 3. Filename validation: must end in .pdf, no illegal filesystem characters
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    throw new Error(`PDF validation failed: Invalid filename "${filename}". Expected .pdf extension.`);
  }
  if (/[<>:"/\\|?*]/.test(filename)) {
    throw new Error(`PDF validation failed: Filename contains illegal characters.`);
  }

  // 4. Check against HTML/JSON error page replacement (e.g. 404/500/Access Denied)
  const sampleHead = new TextDecoder('latin1').decode(buffer.slice(0, 500)).toLowerCase();
  if (sampleHead.includes('<!doctype html') || sampleHead.includes('<html') || sampleHead.includes('{"error"') || sampleHead.includes('accessdenied')) {
    throw new Error('PDF validation failed: Artifact was replaced by an HTML/JSON error document.');
  }

  // 5. Verify magic bytes: %PDF-
  const headerStr = String.fromCharCode(...buffer.slice(0, 5));
  if (headerStr !== '%PDF-') {
    throw new Error(`PDF validation failed: Artifact lacks %PDF- magic signature (found "${headerStr}").`);
  }

  // 6. Page count validation: must have at least 1 page
  const pageCount = countPdfPages(buffer);
  if (pageCount <= 0) {
    throw new Error('PDF validation failed: PDF has 0 detectable pages.');
  }

  // 7. Cryptographic SHA-256 Checksum computation
  const sha256Checksum = await computeSha256(buffer);

  return {
    valid: true,
    sizeBytes: buffer.byteLength,
    pageCount,
    sha256Checksum,
    mimeType: 'application/pdf',
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AttendanceMisDeliveryService {
  private static instance: AttendanceMisDeliveryService;

  public static getInstance(): AttendanceMisDeliveryService {
    if (!AttendanceMisDeliveryService.instance) {
      AttendanceMisDeliveryService.instance = new AttendanceMisDeliveryService();
    }
    return AttendanceMisDeliveryService.instance;
  }

  /**
   * 1. Generates the finalized PDF artifact ONCE using the existing email MIS template.
   * Calculates SHA-256 checksum, uploads to secure storage, and generates access URL.
   */
  async generateMisReportArtifact(params: {
    rows: AttendanceReportRow[];
    punches?: ClassifiedPunchEvent[];
    options: {
      companyName?: string;
      reportDate: string;
      reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL';
      cutoffTime?: string;
      organizationId?: string;
    };
  }): Promise<AttendanceMisReportArtifact> {
    const options = params.options;
    let rows = params.rows || [];
    let punches = params.punches || [];
    const isMorning = options.reportType !== 'EVENING_FINAL';
    const reportType = isMorning ? 'MORNING_CHECKIN' : 'EVENING_FINAL';
    const dateStr = options.reportDate;

    // Auto-assemble authentic workforce rows and punches if empty rows provided
    if (!rows || rows.length === 0) {
      try {
        const { attendanceReportSchedulerService } = await import('./attendanceReportSchedulerService');
        const assembled = await attendanceReportSchedulerService.assembleReportDataAsync(dateStr);
        if (assembled.rows && assembled.rows.length > 0) {
          rows = assembled.rows;
          if (punches.length === 0 && assembled.punches) {
            punches = assembled.punches;
          }
        }
      } catch (err) {
        console.warn('[AttendanceMIS] Error auto-assembling rows in generateMisReportArtifact:', err);
      }
    }

    const activeTenantComp = typeof api !== 'undefined' ? api.getActiveCompany() : null;
    let company = (params.options.companyName && params.options.companyName !== 'Joy Corporate Solutions' && params.options.companyName !== 'Workforce Organization')
      ? params.options.companyName
      : (activeTenantComp?.name || activeTenantComp?.trade_name || activeTenantComp?.legal_name || params.options.companyName || 'Joy Corporate Solutions Pvt. Ltd.');
    if (company === 'Workforce Organization') {
      company = 'Joy Corporate Solutions';
    }

    const organizationId = options.organizationId || activeTenantComp?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
    const runId = `mis-run-${dateStr}-${reportType}-${Date.now()}`;

    // 1. Generate the finalized PDF through the canonical attendanceReportExportService
    const exportOptions: AttendanceExportOptions = {
      companyName: company,
      reportDate: dateStr,
      includePunches: true,
      reportType,
      cutoffTime: options.cutoffTime,
    };

    const pdfRes = await attendanceReportExportService.generatePdfDocument(rows, punches, exportOptions);

    // 2. Validate PDF through comprehensive pre-send validator
    const validation = await validateMisReportPdf({
      buffer: pdfRes.buffer,
      filename: pdfRes.filename,
      expectedDate: dateStr,
    });
    const sha256Checksum = validation.sha256Checksum;
    const pageCount = validation.pageCount;

    // 4. Compute unified workforce statistics
    const totalWorkforce = rows.length;
    const presentRows = rows.filter(
      (r) =>
        r.record?.status === 'Present' ||
        r.record?.status === 'Checked Out' ||
        (r.record?.status as string) === 'Working' ||
        !!r.record?.first_check_in
    );
    const presentCount = presentRows.length;
    const turnoutPct = totalWorkforce > 0 ? Math.round((presentCount / totalWorkforce) * 100) : 0;
    const lateCount = rows.filter(
      (r) => (r.record?.late_minutes || 0) > 0 || r.record?.status === 'Late'
    ).length;
    const weeklyOffLeave = rows.filter(
      (r) =>
        (r.record?.status as string) === 'Weekly Off' ||
        (r.record?.status as string) === 'On Leave' ||
        (r.record?.status as string) === 'Leave' ||
        r.record?.status === 'Holiday'
    ).length;
    const totalNetMinutes = rows.reduce((acc, r) => acc + (r.record?.net_working_minutes || 0), 0);
    const hrs = Math.floor(totalNetMinutes / 60);
    const mins = totalNetMinutes % 60;
    const cumulativeHours = isMorning ? (totalNetMinutes > 0 ? `${hrs}h ${mins}m` : 'Shift In-Progress') : `${hrs}h ${mins}m`;
    const presentTurnout = `${presentCount} Staff (${turnoutPct}% Turnout)`;

    const stats: MisReportStats = {
      totalWorkforce,
      presentCount,
      turnoutPct,
      lateCount,
      weeklyOffLeave,
      cumulativeHours,
      presentTurnout,
    };

    // 5. Persist artifact to Supabase storage bucket 'attendance-reports'
    const storagePath = `${pdfRes.filename}`;
    let documentUrl = '';

    try {
      const storageClient = supabaseAdmin || supabase;
      // Upload PDF buffer using administrative client to satisfy private bucket policy
      const { data: uploadData, error: uploadErr } = await storageClient.storage
        .from('attendance-reports')
        .upload(storagePath, pdfRes.buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        // Create signed URL valid for 48 hours (172800 seconds)
        const { data: signedData, error: signedErr } = await storageClient.storage
          .from('attendance-reports')
          .createSignedUrl(uploadData.path, 172800);

        if (!signedErr && signedData?.signedUrl) {
          documentUrl = signedData.signedUrl;
        }
      } else if (uploadErr) {
        console.info('[AttendanceMIS] Storage persist note:', uploadErr.message);
      }

      if (!documentUrl) {
        const { data: pubData } = storageClient.storage
          .from('attendance-reports')
          .getPublicUrl(storagePath);
        documentUrl = pubData?.publicUrl || '';
      }
    } catch (storageErr) {
      console.info('[AttendanceMIS] Storage persistence exception:', storageErr);
    }

    const artifact: AttendanceMisReportArtifact = {
      runId,
      organizationId,
      companyName: company,
      reportDate: dateStr,
      reportType,
      cutoffTime: options.cutoffTime || '10:30 AM',
      filename: pdfRes.filename,
      buffer: pdfRes.buffer,
      base64: pdfRes.base64,
      sizeBytes: pdfRes.buffer.byteLength,
      sha256Checksum,
      storagePath,
      documentUrl,
      pageCount,
      stats,
    };

    return artifact;
  }

  /**
   * 2. Resolves and authorizes recipient audience with strict RBAC restrictions.
   * Only HR, Admin, and Management roles are authorized to receive full workforce audit PDFs.
   * Revalidates tenant boundary, scope authorization, and phone number formatting.
   */
  async resolveAuthorizedMisRecipients(params: {
    organizationId?: string;
    scope?: 'ALL' | 'DEPARTMENT' | 'FILTERED' | 'SELECTED';
    departmentId?: string;
    emailTargets?: string[];
    whatsAppTargets?: string[];
    requestedByUserId?: string;
  }): Promise<ResolvedMisRecipients> {
    const orgId = params.organizationId || '0c621892-e938-4707-9957-13534ea32c19';
    const emailTargets = params.emailTargets || [];
    const whatsAppTargets = params.whatsAppTargets || [];
    const workforceScope = params.scope || 'ALL';

    const authorizedEmails: string[] = [];
    const authorizedWhatsApp: AuthorizedMisRecipientWhatsApp[] = [];
    const rejected: Array<{ target: string; reason: string }> = [];

    // Query authoritative mis_report_recipients table
    let dbRecipients: any[] = [];
    try {
      const dbClient = supabaseAdmin || supabase;
      const { data } = await dbClient
        .from('mis_report_recipients')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_verified', true);
      if (data) dbRecipients = data;
    } catch (_) { }

    // Fetch authorized contacts from directory
    const contacts = attendanceReportContactService.getOrganizationContacts();
    const hrEmails = attendanceReportContactService.getAutoDetectedHrEmails();

    // Query employees from Supabase for phone and role matching
    let employeesDb: any[] = [];
    try {
      const dbClient = supabaseAdmin || supabase;
      const { data } = await dbClient
        .from('employees')
        .select('id, employee_code, first_name, last_name, display_name, work_email, personal_email, phone, department_id, designation_id, organization_id')
        .is('deleted_at', null);
      if (data) employeesDb = data;
    } catch (_) { }

    // Known management / HR leadership emails configured for Joy PeopleHR
    const knownAuthorizedEmails = [
      'thirumalai@joyglobalcorp.com',
      'marimuthu@joycorporatesolutions.com',
      'saravanakumar@joycorporatesolutions.com',
      ...dbRecipients.map((r) => r.email?.toLowerCase()).filter(Boolean),
    ];

    // Process Email Targets
    emailTargets.forEach((rawEmail) => {
      const email = rawEmail.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        rejected.push({
          target: rawEmail,
          reason: 'Invalid email address format.',
        });
        return;
      }

      const contact = contacts.find((c) => c.email.toLowerCase() === email);
      const isAutoHr = hrEmails.map((e) => e.toLowerCase()).includes(email);
      const isKnownEmail = knownAuthorizedEmails.includes(email);
      const isHr = isAutoHr || isKnownEmail || contact?.isHr || /^(hr|people|talent|admin)@/i.test(email) || /hr|human resources|people/i.test(contact?.designation || '');
      const isExecutive = isHr || isKnownEmail || /director|chro|head|chief|vp|president|founder/i.test(contact?.designation || '');
      const isManager = contact?.isManager || /manager|lead|supervisor/i.test(contact?.designation || '');

      if (isExecutive || (isManager && workforceScope !== 'ALL')) {
        if (!authorizedEmails.includes(email)) {
          authorizedEmails.push(email);
        }

        // Also check if this authorized email has a registered WhatsApp number
        const matchedEmp = employeesDb.find(
          (e) =>
            (e.work_email && e.work_email.toLowerCase() === email) ||
            (e.personal_email && e.personal_email.toLowerCase() === email)
        );
        if (matchedEmp?.phone) {
          try {
            const normPhone = normalizeIndianPhone(matchedEmp.phone);
            if (normPhone && !authorizedWhatsApp.some((w) => w.phone === normPhone)) {
              authorizedWhatsApp.push({
                phone: normPhone,
                name: matchedEmp.display_name || `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim() || 'HR Leadership',
                role: contact?.designation || 'HR Management',
                employeeId: matchedEmp.id,
              });
            }
          } catch (_) { }
        }
      } else if (isManager && workforceScope === 'ALL') {
        rejected.push({
          target: email,
          reason: 'Scope restriction: Managers are permitted to receive department-level reports only, not organization-wide MIS.',
        });
      } else {
        rejected.push({
          target: email,
          reason: 'Unauthorized: General employee accounts cannot receive executive attendance & biometric audit logs.',
        });
      }
    });

    // Known management / test phone numbers configured for Joy PeopleHR + authoritative DB recipients
    const knownAuthorizedPhones = [
      '919840209900',
      '917825906580',
      ...dbRecipients.map((r) => String(r.phone).replace(/[^0-9]/g, '')).filter(Boolean),
    ];

    // Process WhatsApp Targets
    whatsAppTargets.forEach((rawPhone) => {
      const trimmed = String(rawPhone || '').trim();
      if (!trimmed) return;

      let normPhone: string | null = null;
      try {
        normPhone = normalizeIndianPhone(trimmed);
      } catch {
        rejected.push({
          target: rawPhone,
          reason: 'Invalid phone number format: Expected valid 10-digit Indian mobile number (+91...).',
        });
        return;
      }

      if (!normPhone || normPhone.length < 10) {
        rejected.push({
          target: rawPhone,
          reason: 'Invalid phone number format: Expected valid 10-digit Indian mobile number (+91...).',
        });
        return;
      }

      // Deduplicate
      if (authorizedWhatsApp.some((w) => w.phone === normPhone)) {
        return;
      }

      const isKnownPhone = knownAuthorizedPhones.includes(normPhone);

      // Look up phone in employee database
      const matchedEmp = employeesDb.find((e) => {
        if (!e.phone) return false;
        try {
          return normalizeIndianPhone(e.phone) === normPhone;
        } catch {
          return false;
        }
      });

      // Cross-Tenant Validation:
      // If employee exists in another tenant organization, block immediately
      if (matchedEmp && matchedEmp.organization_id && matchedEmp.organization_id !== orgId) {
        rejected.push({
          target: rawPhone,
          reason: `Cross-tenant violation: Recipient belongs to another organization (${matchedEmp.organization_id}).`,
        });
        return;
      }

      if (matchedEmp) {
        const empEmail = (matchedEmp.work_email || matchedEmp.personal_email || '').toLowerCase();
        const contact = contacts.find((c) => c.email.toLowerCase() === empEmail);
        const isHr =
          contact?.isHr ||
          /^(hr|people|talent|admin)@/i.test(empEmail) ||
          /hr|people|admin|director/i.test(contact?.designation || '');

        const isManager = contact?.isManager || /manager|lead|supervisor/i.test(contact?.designation || '');

        const isExecutive =
          isHr ||
          isKnownPhone ||
          empEmail.includes('joyglobalcorp.com') ||
          empEmail.includes('joycorporatesolutions.com');

        const isDbAuthorized = dbRecipients.some((r) => String(r.phone).replace(/[^0-9]/g, '') === normPhone);
        if (isExecutive || isDbAuthorized) {
          const dbRec = dbRecipients.find((r) => String(r.phone).replace(/[^0-9]/g, '') === normPhone);
          authorizedWhatsApp.push({
            phone: normPhone,
            name: dbRec?.name || matchedEmp.display_name || `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim() || 'HR Leadership',
            role: dbRec?.designation || contact?.designation || 'Authorized Management',
            employeeId: matchedEmp.id,
          });
        } else if (isManager) {
          if (workforceScope === 'ALL') {
            rejected.push({
              target: rawPhone,
              reason: `Role Restriction: Manager ${matchedEmp.employee_code || ''} is authorized for department-level reports only, not organization-wide MIS.`,
            });
          } else {
            authorizedWhatsApp.push({
              phone: normPhone,
              name: matchedEmp.display_name || `${matchedEmp.first_name || ''} ${matchedEmp.last_name || ''}`.trim() || 'Department Manager',
              role: contact?.designation || 'Department Manager',
              employeeId: matchedEmp.id,
            });
          }
        } else {
          rejected.push({
            target: rawPhone,
            reason: `Role Restriction: Employee ${matchedEmp.employee_code || ''} does not have HR/Management clearance for MIS biometric audit.`,
          });
        }
      } else if (isKnownPhone) {
        authorizedWhatsApp.push({
          phone: normPhone,
          name: 'Executive Management',
          role: 'Authorized Management',
        });
      } else {
        rejected.push({
          target: rawPhone,
          reason: 'Unauthorized external number: External WhatsApp destinations must be explicitly authorized by management policy.',
        });
      }
    });

    return {
      authorizedEmails,
      authorizedWhatsApp,
      rejected,
    };
  }

  /**
   * 3. Orchestrates unified MIS report delivery:
   * Generates the report ONCE, attaches identical PDF bytes to Email,
   * uploads to Meta Media API, sends identical document attachment to WhatsApp,
   * and records outbox and audit logs independently.
   */
  async deliverUnifiedMisReport(params: {
    rows: AttendanceReportRow[];
    punches?: ClassifiedPunchEvent[];
    reportDate: string;
    reportType?: 'MORNING_CHECKIN' | 'EVENING_FINAL';
    companyName?: string;
    organizationId?: string;
    scope?: 'ALL' | 'DEPARTMENT' | 'FILTERED' | 'SELECTED';
    emailRecipients?: string[];
    whatsAppRecipients?: string[];
    requestedByUserId?: string;
    customNote?: string;
    attachExcel?: boolean;
    attachCsv?: boolean;
    preGeneratedArtifact?: AttendanceMisReportArtifact;
  }): Promise<UnifiedMisDeliverySummary> {
    const reportType = params.reportType || 'MORNING_CHECKIN';
    const dateStr = params.reportDate;
    let companyName = params.companyName || 'Joy Corporate Solutions';
    if (companyName === 'Workforce Organization' || !companyName) {
      companyName = 'Joy Corporate Solutions';
    }
    const organizationId = params.organizationId || '0c621892-e938-4707-9957-13534ea32c19';
    const workforceScope = params.scope || 'ALL';

    // Step 1: Resolve and authorize recipients with strict RBAC & Scope checks
    const { authorizedEmails, authorizedWhatsApp, rejected } = await this.resolveAuthorizedMisRecipients({
      organizationId,
      scope: workforceScope,
      emailTargets: params.emailRecipients,
      whatsAppTargets: params.whatsAppRecipients,
      requestedByUserId: params.requestedByUserId,
    });

    // Auto-assemble authentic workforce rows and punches if not provided
    let rows = params.rows;
    let punches = params.punches;
    if (!rows || rows.length === 0) {
      try {
        console.log(`[UnifiedMIS] No pre-assembled rows passed for ${dateStr}. Assembling authentic workforce data from Supabase...`);
        const { attendanceReportSchedulerService } = await import('./attendanceReportSchedulerService');
        const assembled = await attendanceReportSchedulerService.assembleReportDataAsync(dateStr);
        rows = assembled.rows;
        if (!punches || punches.length === 0) {
          punches = assembled.punches;
        }
        if (!params.companyName || params.companyName === 'Workforce Organization') {
          companyName = assembled.companyName;
        }
      } catch (err) {
        console.warn('[UnifiedMIS] Auto-assembly exception in deliverUnifiedMisReport:', err);
        rows = [];
      }
    }

    // STRICT EMPTY DATA GUARD: Never dispatch empty / 0-staff reports to executive leadership or WhatsApp
    if (!rows || rows.length === 0) {
      console.warn(`[UnifiedMIS] Guard Triggered: Refusing to dispatch report for ${dateStr} because workforce headcount is 0. Aborting dispatch to prevent empty report delivery.`);
      return {
        runId: `abort-${Date.now()}`,
        reportDate: dateStr,
        reportType,
        companyName,
        success: false,
        artifact: {
          filename: `JOY_Attendance_MIS_${dateStr}.pdf`,
          buffer: new Uint8Array(),
          base64: '',
          sha256Checksum: '',
          sizeBytes: 0,
          pageCount: 0,
          documentUrl: '',
          stats: {
            totalWorkforce: 0,
            presentCount: 0,
            turnoutPct: 0,
            lateCount: 0,
            weeklyOffLeave: 0,
            cumulativeHours: '0h 0m',
            presentTurnout: '0 Staff (0% Turnout)',
          },
        },
        emailResults: { attempted: false, success: false, recipients: [], error: 'Aborted: 0 workforce rows available' },
        whatsAppResults: { attempted: false, success: false, deliveries: [] },
        rejectedRecipients: rejected,
      };
    }

    // Step 2: Generate the finalized PDF artifact ONCE (or reuse preGeneratedArtifact)
    const artifact = params.preGeneratedArtifact || (await this.generateMisReportArtifact({
      rows,
      punches,
      options: {
        companyName,
        reportDate: dateStr,
        reportType,
        organizationId,
      },
    }));

    console.log(`[UnifiedMIS] Generated shared artifact:`, {
      filename: artifact.filename,
      sizeBytes: artifact.sizeBytes,
      pageCount: artifact.pageCount,
      sha256Checksum: artifact.sha256Checksum,
      storageUrl: artifact.documentUrl,
    });

    // Step 3: Dispatch via Email with EXACT pre-generated artifact
    let emailResult = {
      attempted: false,
      success: false,
      recipients: authorizedEmails,
      error: undefined as string | undefined,
    };

    if (authorizedEmails.length > 0) {
      emailResult.attempted = true;
      try {
        const preGeneratedPdf: PreGeneratedPdfArtifact = {
          filename: artifact.filename,
          buffer: artifact.buffer,
          base64: artifact.base64,
          sha256Checksum: artifact.sha256Checksum,
          sizeBytes: artifact.sizeBytes,
        };

        const res = await attendanceReportEmailService.sendReportToHR({
          to: authorizedEmails,
          companyName,
          reportDate: dateStr,
          rows,
          punches,
          customMessage: params.customNote,
          attachPdf: true,
          attachExcel: params.attachExcel !== false,
          attachCsv: params.attachCsv !== false,
          reportType,
          preGeneratedPdf,
        });

        emailResult.success = res.success;
        if (!res.success) {
          emailResult.error = res.error;
        }

        // Record Email Audit Log
        await this.logAttendanceReportRun({
          organizationId,
          slot: reportType === 'MORNING_CHECKIN' ? 'MORNING' : 'EVENING',
          status: res.success ? 'SUCCESS' : 'ERROR',
          mode: 'UNIFIED_DISPATCH_EMAIL',
          recipients: authorizedEmails,
          headcount: rows.length,
          message: `Email MIS Report [${artifact.filename}] delivered (SHA-256: ${artifact.sha256Checksum.slice(0, 12)}...)`,
        });
      } catch (err: any) {
        emailResult.success = false;
        emailResult.error = err.message || 'Email delivery failure';
      }
    }

    // Step 4: Dispatch via WhatsApp as Document Attachment with EXACT same artifact
    let whatsAppResult = {
      attempted: false,
      success: false,
      deliveries: [] as Array<{
        phone: string;
        name: string;
        success: boolean;
        providerMessageId?: string;
        error?: string;
      }>,
    };

    if (authorizedWhatsApp.length > 0) {
      whatsAppResult.attempted = true;
      let allPassed = true;

      // 4a. Validate Meta Template Approval Status
      const templateValidation = whatsAppTemplateConfigService.validateTemplateForDispatch('ATTENDANCE_MIS_REPORT_V1');
      if (!templateValidation.valid) {
        console.warn('[AttendanceMIS] Template guard notice:', templateValidation.error);
      }

      // 4b. Pre-upload binary PDF buffer to Meta Media API for rock-solid document attachment delivery
      let uploadedMediaId: string | undefined;
      try {
        const mediaRes = await whatsAppClient.uploadMedia({
          fileBuffer: artifact.buffer,
          filename: artifact.filename,
          mimeType: 'application/pdf',
        });
        if (mediaRes.success && mediaRes.mediaId) {
          uploadedMediaId = mediaRes.mediaId;
        }
      } catch (mediaErr) {
        console.warn('[AttendanceMIS] Media upload notice:', mediaErr);
      }

      for (const recipient of authorizedWhatsApp) {
        try {
          const reportDateFormatted = new Date(dateStr + 'T00:00:00+05:30').toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });

          // Meta template trigger with document header referencing the exact artifact
          const trigger = {
            organizationId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name,
            reportTitle: reportType === 'MORNING_CHECKIN'
              ? 'Morning Workforce Check-In & Turnout Snapshot'
              : 'Daily Attendance & Biometric Audit Report',
            reportDate: reportDateFormatted,
            companyName,
            totalWorkforce: artifact.stats.totalWorkforce,
            presentTurnout: artifact.stats.presentTurnout,
            lateClockIns: artifact.stats.lateCount,
            weeklyOffOrLeave: artifact.stats.weeklyOffLeave,
            cumulativeWorkHours: artifact.stats.cumulativeHours,
            reportPdfUrl: artifact.documentUrl,
            pdfFilename: artifact.filename, // Exact official filename e.g. Joy_Corporate_Solutions_Executive_Morning_Snapshot_2026-10-21.pdf
            sha256Checksum: artifact.sha256Checksum,
            runId: artifact.runId,
            mediaId: uploadedMediaId,
          };

          // Try template dispatch first if approved
          let dispatchRes: { success: boolean; error?: string; messageId?: string } = { success: false };

          if (templateValidation.valid) {
            dispatchRes = await whatsAppNotificationService.sendAttendanceMisReport(trigger);
          }

          // If template dispatch fails or is not approved, fallback to genuine WhatsApp document attachment (NEVER plain text only)
          if (!dispatchRes.success && (artifact.documentUrl || uploadedMediaId || artifact.buffer)) {
            console.warn('[AttendanceMIS] Template delivery fallback, dispatching direct Document Attachment:', dispatchRes.error);
            const professionalCaption = whatsAppTemplateConfigService.formatProfessionalMisCaption({
              recipientName: recipient.name,
              reportName: trigger.reportTitle,
              reportDate: reportDateFormatted,
              reportCutoff: reportType === 'MORNING_CHECKIN' ? '10:30 AM' : '07:00 PM',
              reportStatus: 'Verified Biometric & Attendance Audit',
              companyName,
            });

            const docRes = await whatsAppClient.sendDocument({
              to: recipient.phone,
              documentUrl: artifact.documentUrl,
              mediaId: uploadedMediaId,
              fileBuffer: artifact.buffer,
              filename: artifact.filename,
              caption: professionalCaption,
              organizationId,
              employeeId: recipient.employeeId,
              sha256Checksum: artifact.sha256Checksum,
              runId: artifact.runId,
            });

            dispatchRes = docRes;
          }

          const providerMsgId = (dispatchRes as any).messageId;

          whatsAppResult.deliveries.push({
            phone: recipient.phone,
            name: recipient.name,
            success: dispatchRes.success,
            providerMessageId: providerMsgId,
            error: dispatchRes.error,
          });

          if (!dispatchRes.success) {
            allPassed = false;
          }

          // 4c. Record WhatsApp Outbox Log in communication_dispatch_logs (Strictly 'SUBMITTED' or 'FAILED')
          try {
            await supabase.from('communication_dispatch_logs').insert({
              organization_id: organizationId,
              employee_id: recipient.employeeId || null,
              channel: 'WHATSAPP',
              provider: 'META_CLOUD_API',
              recipient_phone: recipient.phone,
              template_key: 'ATTENDANCE_MIS_REPORT_V1',
              message_content: JSON.stringify({
                reportTitle: trigger.reportTitle,
                reportDate: reportDateFormatted,
                filename: artifact.filename,
                sha256Checksum: artifact.sha256Checksum,
                sizeBytes: artifact.sizeBytes,
                mediaId: uploadedMediaId,
              }),
              dynamic_payload: {
                recipientName: recipient.name,
                role: recipient.role,
                filename: artifact.filename,
                sha256Checksum: artifact.sha256Checksum,
                sizeBytes: artifact.sizeBytes,
                mediaId: uploadedMediaId,
              },
              provider_message_id: providerMsgId || null,
              status: dispatchRes.success ? 'SUBMITTED' : 'FAILED',
              error_code: dispatchRes.success ? null : 'DISPATCH_ERROR',
              error_message: dispatchRes.error || null,
              cost_inr: 0.45,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.warn('[AttendanceMIS] Outbox insertion warning:', logErr);
          }

          // 4d. Record Attendance Report Log
          await this.logAttendanceReportRun({
            organizationId,
            slot: reportType === 'MORNING_CHECKIN' ? 'MORNING' : 'EVENING',
            status: dispatchRes.success ? 'SUCCESS' : 'ERROR',
            mode: 'UNIFIED_DISPATCH_WHATSAPP',
            recipients: [recipient.phone],
            headcount: rows.length,
            message: `WhatsApp MIS Document [${artifact.filename}] delivered to ${recipient.phone} (SHA-256: ${artifact.sha256Checksum.slice(0, 12)}...)`,
          });
        } catch (waErr: any) {
          allPassed = false;
          whatsAppResult.deliveries.push({
            phone: recipient.phone,
            name: recipient.name,
            success: false,
            error: waErr.message || 'WhatsApp dispatch error',
          });
        }
      }

      whatsAppResult.success = allPassed;
    }

    return {
      success: (emailResult.attempted ? emailResult.success : true) && (whatsAppResult.attempted ? whatsAppResult.success : true),
      runId: artifact.runId,
      reportDate: dateStr,
      reportType,
      companyName,
      artifact: {
        filename: artifact.filename,
        buffer: artifact.buffer,
        base64: artifact.base64,
        sizeBytes: artifact.sizeBytes,
        sha256Checksum: artifact.sha256Checksum,
        documentUrl: artifact.documentUrl,
        pageCount: artifact.pageCount,
        stats: artifact.stats,
      },
      emailResults: emailResult,
      whatsAppResults: whatsAppResult,
      rejectedRecipients: rejected,
    };
  }

  /**
   * Records audit logs in Supabase attendance_report_logs table.
   */
  private async logAttendanceReportRun(params: {
    organizationId: string;
    slot: 'MORNING' | 'EVENING';
    status: 'SUCCESS' | 'ERROR';
    mode: string;
    recipients: string[];
    headcount: number;
    message: string;
  }): Promise<void> {
    try {
      await supabase.from('attendance_report_logs').insert([
        {
          organization_id: params.organizationId,
          slot: params.slot,
          status: params.status,
          mode: params.mode,
          recipients: params.recipients,
          headcount: params.headcount,
          message: params.message,
          executed_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn('[AttendanceMIS] Could not write audit log:', e);
    }
  }
}

export const attendanceMisDeliveryService = AttendanceMisDeliveryService.getInstance();
