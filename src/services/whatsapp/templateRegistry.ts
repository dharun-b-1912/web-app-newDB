// src/services/whatsapp/templateRegistry.ts
// ============================================================================
// Joy PeopleHR Meta HSM (High Structured Message) Template Registry
// Pre-configured and validated against Meta Cloud API & Airtel IQ Gateway
// ============================================================================

import {
  WhatsAppSendTemplatePayload,
  WhatsAppPayslipTrigger,
  WhatsAppLeaveApprovalTrigger,
  WhatsAppLeaveStatusUpdateTrigger,
  WhatsAppAttendanceAlertTrigger,
  WhatsAppAnnouncementBroadcastTrigger,
  WhatsAppOnboardingInviteTrigger,
  WhatsAppCelebrationTrigger,
  WhatsAppAuthOtpTrigger,
} from './types';
import { normalizeIndianPhone, maskBankAccount } from './phoneUtils';

export class WhatsAppTemplateRegistry {
  /**
   * 1. Monthly Payslip PDF Delivery Template Builder
   */
  static buildPayslipTemplate(trigger: WhatsAppPayslipTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.phone);
    const maskedAccount = maskBankAccount(trigger.bankAccountMasked);
    const formattedSalary = typeof trigger.netPay === 'number' 
      ? trigger.netPay.toLocaleString('en-IN', { maximumFractionDigits: 2 }) 
      : trigger.netPay;

    return {
      to,
      templateName: 'joy_monthly_payslip_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      employeeId: trigger.employeeId,
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: trigger.payslipPdfUrl,
                filename: `Payslip_${trigger.monthYear.replace(/\s+/g, '_')}.pdf`,
              },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.employeeName },             // {{1}} Employee Name
            { type: 'text', text: trigger.monthYear },                // {{2}} Month & Year
            { type: 'text', text: `₹${formattedSalary}` },            // {{3}} Net Salary
            { type: 'text', text: maskedAccount },                    // {{4}} Bank Account
            { type: 'text', text: trigger.payDate },                  // {{5}} Pay Date
          ],
        },
      ],
      metadata: {
        eventType: 'PAYROLL_SALARY_CREDITED',
        monthYear: trigger.monthYear,
        netPay: trigger.netPay,
      },
    };
  }

  /**
   * 2. Candidate Digital Onboarding Invite Template Builder
   */
  static buildOnboardingInviteTemplate(trigger: WhatsAppOnboardingInviteTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.candidatePhone);

    return {
      to,
      templateName: 'joy_onboarding_candidate_invite_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: trigger.companyName }, // Header: Welcome to {{1}}!
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.candidateName },                     // {{1}} Candidate Name
            { type: 'text', text: trigger.companyName },                       // {{2}} Company Name
            { type: 'text', text: trigger.expiryHours.toString() },            // {{3}} Expiry Hours
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            { type: 'text', text: trigger.invitationToken }, // URL dynamic token suffix
          ],
        },
      ],
      metadata: {
        eventType: 'ONBOARDING_INVITE_DISPATCH',
        token: trigger.invitationToken,
      },
    };
  }

  /**
   * 3. Attendance Shift Anomaly / Missed Punch Alert Template Builder
   */
  static buildAttendanceAnomalyTemplate(trigger: WhatsAppAttendanceAlertTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.phone);
    const anomalyLabels: Record<string, string> = {
      MISSED_PUNCH_IN: 'Missed Morning Clock-in',
      MISSED_PUNCH_OUT: 'Missed Evening Clock-out',
      LATE_ARRIVAL: `Late Arrival (Recorded at ${trigger.timeRecorded || 'Late'})`,
    };

    return {
      to,
      templateName: 'joy_attendance_anomaly_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      employeeId: trigger.employeeId,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.employeeName },                               // {{1}} Employee Name
            { type: 'text', text: trigger.date },                                       // {{2}} Date
            { type: 'text', text: trigger.shiftName },                                  // {{3}} Shift Name
            { type: 'text', text: anomalyLabels[trigger.anomalyType] || 'Shift Anomaly' }, // {{4}} Alert Description
          ],
        },
      ],
      metadata: {
        eventType: 'ATTENDANCE_ANOMALY_ALERT',
        anomalyType: trigger.anomalyType,
        date: trigger.date,
      },
    };
  }

  /**
   * 4. Manager 1-Click Leave Approval Template with Quick Reply Buttons
   */
  static buildLeaveApprovalRequestTemplate(trigger: WhatsAppLeaveApprovalTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.managerPhone);

    return {
      to,
      templateName: 'joy_leave_approval_action_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.managerName },                               // {{1}} Manager Name
            { type: 'text', text: trigger.employeeName },                              // {{2}} Requester Name
            { type: 'text', text: `${trigger.leaveType} (${trigger.daysCount} Day(s))` }, // {{3}} Leave Type & Duration
            { type: 'text', text: `${trigger.startDate} to ${trigger.endDate}` },      // {{4}} Dates
            { type: 'text', text: trigger.reason || 'Not specified' },                 // {{5}} Reason
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: 0,
          parameters: [
            { type: 'payload', payload: `APPROVE_LEAVE_${trigger.leaveRequestId}` },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: 1,
          parameters: [
            { type: 'payload', payload: `REJECT_LEAVE_${trigger.leaveRequestId}` },
          ],
        },
      ],
      metadata: {
        eventType: 'LEAVE_APPROVAL_REQUEST',
        leaveRequestId: trigger.leaveRequestId,
      },
    };
  }

  /**
   * 5. Leave Decision Status Notification to Employee Template Builder
   */
  static buildLeaveStatusUpdateTemplate(trigger: WhatsAppLeaveStatusUpdateTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.employeePhone);
    const statusEmoji = trigger.status === 'Approved' ? '✅ Approved' : '❌ Rejected';

    return {
      to,
      templateName: 'joy_leave_status_update_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.employeeName },                               // {{1}} Employee Name
            { type: 'text', text: trigger.leaveType },                                  // {{2}} Leave Type
            { type: 'text', text: `${trigger.startDate} to ${trigger.endDate}` },       // {{3}} Dates
            { type: 'text', text: statusEmoji },                                        // {{4}} Status
            { type: 'text', text: trigger.reviewerName },                               // {{5}} Approver Name
            { type: 'text', text: trigger.comments || 'No comments provided' },          // {{6}} Remarks
          ],
        },
      ],
      metadata: {
        eventType: 'LEAVE_STATUS_NOTIFY',
        status: trigger.status,
      },
    };
  }

  /**
   * 6. Company Announcement & HR Broadcast Template Builder
   */
  static buildAnnouncementTemplate(
    recipientPhone: string,
    recipientName: string,
    trigger: WhatsAppAnnouncementBroadcastTrigger
  ): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(recipientPhone);

    return {
      to,
      templateName: 'joy_company_announcement_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: trigger.title }, // Header: [Announcement Title]
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: recipientName },                               // {{1}} Employee Name
            { type: 'text', text: trigger.category },                           // {{2}} Category (e.g. POLICY_UPDATE)
            { type: 'text', text: trigger.content },                            // {{3}} Content Body
          ],
        },
      ],
      metadata: {
        eventType: 'COMPANY_ANNOUNCEMENT_BROADCAST',
        category: trigger.category,
      },
    };
  }

  /**
   * 7. Birthday & Work Anniversary Celebrations Template Builder
   */
  static buildCelebrationTemplate(trigger: WhatsAppCelebrationTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.phone);
    const eventHeading = trigger.type === 'BIRTHDAY' 
      ? '🎂 Happy Birthday!' 
      : `🎉 Happy Work Anniversary (${trigger.yearsOfService || 1} Years)!`;

    const greetingMessage = trigger.type === 'BIRTHDAY'
      ? `Wishing you a wonderful birthday filled with joy and success! On behalf of everyone at ${trigger.companyName}, thank you for being a valuable part of our team.`
      : `Congratulations on completing ${trigger.yearsOfService || 1} year(s) with ${trigger.companyName}! We truly appreciate your dedication and excellence.`;

    return {
      to,
      templateName: 'joy_employee_celebration_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: eventHeading },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.employeeName }, // {{1}} Employee Name
            { type: 'text', text: greetingMessage },      // {{2}} Celebration Message
            { type: 'text', text: trigger.companyName },  // {{3}} Company Name
          ],
        },
      ],
      metadata: {
        eventType: 'EMPLOYEE_CELEBRATION',
        celebrationType: trigger.type,
      },
    };
  }

  /**
   * 8. Authentication OTP / 2FA Verification Template Builder
   */
  static buildAuthOtpTemplate(trigger: WhatsAppAuthOtpTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.phone);

    return {
      to,
      templateName: 'joy_auth_otp_v1',
      languageCode: 'en_US',
      category: 'AUTHENTICATION',
      organizationId: trigger.organizationId,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: trigger.otpCode },                       // {{1}} OTP Code
            { type: 'text', text: trigger.expiryMinutes.toString() },      // {{2}} Expiry in minutes
            { type: 'text', text: trigger.companyName },                   // {{3}} Company Name
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            { type: 'text', text: trigger.otpCode },
          ],
        },
      ],
      metadata: {
        eventType: 'AUTH_OTP_VERIFY',
        otpExpiryMinutes: trigger.expiryMinutes,
      },
    };
  }
}
