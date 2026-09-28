// src/services/whatsapp/whatsappNotificationService.ts
// ============================================================================
// High-Level WhatsApp Notification & Automation Dispatch Service
// Dispatches Payslips, Onboarding, Leaves, Attendance & Broadcast Announcements
// ============================================================================

import { supabase } from '../../lib/supabase';
import { whatsAppClient } from './whatsappClient';
import { WhatsAppTemplateRegistry } from './templateRegistry';
import { normalizeIndianPhone } from './phoneUtils';
import {
  WhatsAppPayslipTrigger,
  WhatsAppLeaveApprovalTrigger,
  WhatsAppLeaveStatusUpdateTrigger,
  WhatsAppAttendanceAlertTrigger,
  WhatsAppAnnouncementBroadcastTrigger,
  WhatsAppOnboardingInviteTrigger,
  WhatsAppCelebrationTrigger,
  WhatsAppAuthOtpTrigger,
} from './types';

export class WhatsAppNotificationService {
  private static instance: WhatsAppNotificationService;

  public static getInstance(): WhatsAppNotificationService {
    if (!WhatsAppNotificationService.instance) {
      WhatsAppNotificationService.instance = new WhatsAppNotificationService();
    }
    return WhatsAppNotificationService.instance;
  }

  /**
   * 1. Delivers Monthly Payslip to Employee with encrypted PDF
   */
  async sendMonthlyPayslip(trigger: WhatsAppPayslipTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildPayslipTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 2. Delivers Candidate Digital Onboarding Invite with tokenized signing link
   */
  async sendCandidateOnboardingInvite(trigger: WhatsAppOnboardingInviteTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildOnboardingInviteTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 2b. Automatically dispatches Welcome Pack with Branded Image & Interactive Buttons
   * Sent immediately upon Employee Creation or Onboarding Completion
   */
  async sendEmployeeWelcomeOnboarding(params: {
    phone: string;
    employeeName: string;
    employeeCode: string;
    companyName?: string;
    designation?: string;
    organizationId?: string;
    employeeId?: string;
    portalUrl?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    let company = params.companyName || 'Joy Corporate Solutions Pvt. Ltd.';
    let role = params.designation || 'Senior Software Engineer';
    let empName = params.employeeName;
    let empCode = params.employeeCode;
    const portal = params.portalUrl || 'https://app.joypeoplehr.com';

    // ── Auto-enrich with authoritative Supabase employee record ─────────────
    try {
      const cleanPhone = normalizeIndianPhone(params.phone);
      const last10 = cleanPhone.slice(-10);
      const { data: dbEmp } = await supabase
        .from('employees')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${last10},phone.ilike.%${last10}%`)
        .limit(1)
        .maybeSingle();

      if (dbEmp) {
        if (dbEmp.employee_code && (!empCode || empCode.startsWith('emp-') || empCode.includes('demo') || empCode === dbEmp.id)) {
          empCode = dbEmp.employee_code;
        }
        if (dbEmp.display_name || (dbEmp.first_name && dbEmp.last_name)) {
          empName = dbEmp.display_name || `${dbEmp.first_name} ${dbEmp.last_name}`.trim();
        }
        if (dbEmp.designation_id) {
          const desigMap: Record<string, string> = {
            'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7': 'Senior Software Engineer',
            '0dfa6748-c76b-4867-a9f4-59eaf6804a44': 'HR Operations Specialist',
          };
          if (desigMap[dbEmp.designation_id]) {
            role = desigMap[dbEmp.designation_id];
          }
        }
      }
    } catch (dbErr) {
      console.warn('[WhatsAppWelcome] DB enrichment failed, using params:', dbErr);
    }

    // Pre-uploaded welcome banner on Meta's servers (1200×446 JPEG, 95 KB)
    // Uploaded via Meta Media API — no external CDN needed, guaranteed WhatsApp delivery
    const welcomeImageMediaId =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WA_WELCOME_IMAGE_MEDIA_ID) ||
      (typeof process !== 'undefined' && process.env?.META_WA_WELCOME_IMAGE_MEDIA_ID) ||
      '2189577828652515'; // fallback: uploaded 2026-09-22

    const bannerImageUrl = params.imageUrl || 'https://app.joypeoplehr.com/joy-people-hr-logo.png';

    // ── Attempt 1: Template message (bypasses 24-hr window completely) ────────
    // Works for ANY employee phone without them ever messaging us first.
    // Requires: Meta Business Verification + template APPROVED status.
    // Template: joy_hr_welcome_v2 — body vars: {{1}}=name, {{2}}=employee_code
    try {
      const templatePayload = {
        to: params.phone,
        templateName: 'joy_hr_welcome_v2',
        languageCode: 'en_US',
        category: 'UTILITY' as const,
        organizationId: params.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: params.employeeId,
        components: [
          {
            type: 'body' as const,
            parameters: [
              { type: 'text' as const, text: empName },
              { type: 'text' as const, text: empCode },
            ],
          },
        ],
        metadata: { eventType: 'EMPLOYEE_WELCOME_ONBOARDING' },
      };
      const tplRes = await whatsAppClient.sendTemplate(templatePayload);
      if (tplRes.success) {
        console.info('[WhatsAppWelcome] Template sent successfully to', params.phone);
        return tplRes;
      }
      console.warn('[WhatsAppWelcome] Template send failed (likely pending approval), trying interactive fallback:', tplRes.error);
    } catch (tplErr: any) {
      console.warn('[WhatsAppWelcome] Template error:', tplErr.message);
    }

    const interactiveBody =
      `*Joy PeopleHR • HR Assistant*\n` +
      `_WhatsApp Employee Self-Service_\n\n` +
      `🎉 *Welcome to ${company}!* 👋\n` +
      `Hi *${empName}*, welcome to the Joy PeopleHR family!\n` +
      `Your employee onboarding is complete. We're happy to have you with us.\n\n` +
      `👤 *Your Employee Profile*\n` +
      `🆔 *Employee Code:* ${empCode}\n` +
      `💼 *Role:* ${role}\n\n` +
      `🌟 *Your HR Assistant is Ready!*\n` +
      `You can use this chat to access your HR services quickly:\n` +
      `📄 *1. Payslip* – View or download monthly salary statement\n` +
      `🌴 *2. Leave* – Check leave balance and apply for leave\n` +
      `🕘 *3. Attendance* – View attendance and clock-in status\n` +
      `📢 *4. Company News* – Stay updated with announcements\n` +
      `🌐 *5. HR Portal* – Access your complete employee dashboard\n\n` +
      `How would you like to continue? 👇\n` +
      `1️⃣ Payslip  2️⃣ Leave  3️⃣ Attendance  4️⃣ News  5️⃣ Portal\n\n` +
      `💬 Tap a button below or reply with a number (1-5)\n` +
      `🔗 Portal: ${portal}\n\n` +
      `📱 Save this number as Joy PeopleHR HR Assistant`;

    try {
      // 1. Primary: Interactive Button Message with Image Header + Quick Reply Buttons
      //    Employee can simply TAP buttons without any manual typing!
      const interactiveRes = await whatsAppClient.sendInteractive({
        to: params.phone,
        type: 'button',
        header: {
          type: 'image',
          image: {
            id: welcomeImageMediaId,
          },
        },
        body: {
          text: interactiveBody,
        },
        footer: {
          text: 'People First. Work Simplified.',
        },
        action: {
          buttons: [
               { type: 'reply', reply: { id: 'MENU_PAYSLIP',    title: '📄 Payslip' } },
            { type: 'reply', reply: { id: 'MENU_LEAVE',      title: '🌴 Leave' } },
            { type: 'reply', reply: { id: 'MENU_ATTENDANCE', title: '🕘 Attendance' } },
          ],
        },
        organizationId: params.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: params.employeeId,
      });

      if (interactiveRes.success) {
        return interactiveRes;
      }

      console.warn('[WhatsAppWelcome] Interactive button failed, sending image fallback:', interactiveRes.error);

      // Fallback 1: Image attachment with caption
      const imgRes = await whatsAppClient.sendImage({
        to: params.phone,
        imageUrl: bannerImageUrl,
        mediaId: welcomeImageMediaId,
        caption: interactiveBody,
        organizationId: params.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: params.employeeId,
      });

      if (imgRes.success) {
        return imgRes;
      }

      // Fallback 2: Plain text
      console.warn('[WhatsAppWelcome] Image failed, sending text fallback');
      return whatsAppClient.sendText({
        to: params.phone,
        text: interactiveBody,
        organizationId: params.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: params.employeeId,
      });
    } catch (err: any) {
      console.warn('[WhatsAppWelcome] Error sending welcome:', err);
      return { success: false, error: err.message || 'WhatsApp Welcome Dispatch failed' };
    }
  }


  /**
   * 3. Sends 1-Click Interactive Leave Approval to Manager
   */
  async sendLeaveApprovalToManager(trigger: WhatsAppLeaveApprovalTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildLeaveApprovalRequestTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 4. Sends Leave Decision Status Notification to Employee
   */
  async sendLeaveStatusToEmployee(trigger: WhatsAppLeaveStatusUpdateTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildLeaveStatusUpdateTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 5. Sends Attendance Anomaly / Missed Punch Alert to Employee
   */
  async sendAttendanceAnomalyAlert(trigger: WhatsAppAttendanceAlertTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildAttendanceAnomalyTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 6. Broadcasts HR Announcement to Multiple Employees (Batched & Rate-Limited)
   */
  async broadcastAnnouncement(trigger: WhatsAppAnnouncementBroadcastTrigger): Promise<{
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
  }> {
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of trigger.recipients) {
      try {
        const payload = WhatsAppTemplateRegistry.buildAnnouncementTemplate(
          recipient.phone,
          recipient.employeeName,
          trigger
        );
        payload.employeeId = recipient.employeeId;

        const res = await whatsAppClient.sendTemplate(payload);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error(`[WhatsAppBroadcast] Error sending to ${recipient.phone}:`, err);
        failedCount++;
      }
    }

    return {
      totalRecipients: trigger.recipients.length,
      sentCount,
      failedCount,
    };
  }

  /**
   * 7. Sends Birthday / Work Anniversary Greeting
   */
  async sendCelebrationGreeting(trigger: WhatsAppCelebrationTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildCelebrationTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 8. Sends 2FA / Authentication OTP Code
   */
  async sendAuthOtp(trigger: WhatsAppAuthOtpTrigger): Promise<{ success: boolean; error?: string }> {
    const payload = WhatsAppTemplateRegistry.buildAuthOtpTemplate(trigger);
    return whatsAppClient.sendTemplate(payload);
  }

  /**
   * 9. Sends Vendor Onboarding & Verification Invitation
   */
  async sendVendorOnboardingInvite(params: {
    phone: string;
    vendorName: string;
    vendorCode: string;
    onboardingLink: string;
    organizationId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return whatsAppClient.sendText({
      to: params.phone,
      text: `Hello ${params.vendorName},\n\nYou have been invited to register on Joy Corporate Solutions Vendor Portal.\nVendor Code: ${params.vendorCode}\n\nPlease complete your onboarding and statutory compliance registration here:\n${params.onboardingLink}`,
      organizationId: params.organizationId || 'org-joy-main',
    });
  }

  /**
   * 10. Sends Vendor Compliance Document Expiry Alert
   */
  async sendVendorDocumentExpiryAlert(params: {
    phone: string;
    vendorName: string;
    documentType: string;
    expiryDate: string;
    organizationId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return whatsAppClient.sendText({
      to: params.phone,
      text: `Attention ${params.vendorName},\n\nYour compliance document '${params.documentType}' is set to expire on ${params.expiryDate}.\n\nPlease upload the renewed copy immediately on the Joy PeopleHR Vendor Portal to avoid compliance hold.`,
      organizationId: params.organizationId || 'org-joy-main',
    });
  }

  /**
   * 11. Sends Vendor Invoice Status Notification
   */
  async sendVendorInvoiceStatusAlert(params: {
    phone: string;
    vendorName: string;
    invoiceNumber: string;
    status: string;
    notes?: string;
    organizationId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return whatsAppClient.sendText({
      to: params.phone,
      text: `Notice to ${params.vendorName},\n\nYour invoice ${params.invoiceNumber} status has been updated to: *${params.status}*.${params.notes ? `\nDetails: ${params.notes}` : ''}\n\nCheck portal for complete details.`,
      organizationId: params.organizationId || 'org-joy-main',
    });
  }

  /**
   * Fetches real-time WhatsApp Communication Delivery Analytics for HR Dashboard
   */
  async getDispatchAnalytics(organizationId: string): Promise<{
    totalSent: number;
    delivered: number;
    read: number;
    failed: number;
    recentLogs: any[];
  }> {
    try {
      const { data: logs } = await supabase
        .from('communication_dispatch_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('channel', 'WHATSAPP')
        .order('created_at', { ascending: false })
        .limit(50);

      const recentLogs = logs || [];
      const totalSent = recentLogs.length;
      const delivered = recentLogs.filter((l) => l.status === 'DELIVERED' || l.status === 'READ').length;
      const read = recentLogs.filter((l) => l.status === 'READ').length;
      const failed = recentLogs.filter((l) => l.status === 'FAILED' || l.status === 'REJECTED').length;

      return {
        totalSent,
        delivered,
        read,
        failed,
        recentLogs,
      };
    } catch {
      return {
        totalSent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        recentLogs: [],
      };
    }
  }
}

export const whatsAppNotificationService = WhatsAppNotificationService.getInstance();
