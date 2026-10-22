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
  WhatsAppPayrollMisReportTrigger,
  WhatsAppAttendanceMisReportTrigger,
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

    const components: any[] = [];

    if (trigger.payslipPdfUrl) {
      components.push({
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
      });
    }

    const templateName = trigger.templateName || 'joy_monthly_payslip_v1';

    if (templateName === 'joy_payslip_notification_v2') {
      // Phase 4 canonical approved format
      components.length = 0; // reset components
      if (trigger.payslipPdfUrl) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: trigger.payslipPdfUrl,
                filename: `JoyPeopleHR_Payslip_${trigger.employeeCode || trigger.employeeId || 'EMP'}_${trigger.monthYear.replace(/\s+/g, '_')}.pdf`,
              },
            },
          ],
        });
      }
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: trigger.employeeName },                                      // {{1}} Employee Name
          { type: 'text', text: trigger.monthYear },                                         // {{2}} Month & Year
          { type: 'text', text: trigger.employeeCode || trigger.employeeId || '--' },        // {{3}} Employee ID
          { type: 'text', text: trigger.companyName || 'JOY Corporate Solutions Pvt. Ltd.' },// {{4}} Company
          { type: 'text', text: typeof trigger.netPay === 'number' ? `₹${formattedSalary}` : String(trigger.netPay) }, // {{5}} Net Salary
          { type: 'text', text: trigger.paymentStatus || 'Payment Scheduled' },              // {{6}} Payment Status
          { type: 'text', text: trigger.payDate },                                           // {{7}} Pay Date
          { type: 'text', text: trigger.portalUrl || 'https://app.joypeoplehr.com/portal/payslips' }, // {{8}} Portal URL
        ],
      });
    } else {
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: trigger.employeeName },             // {{1}} Employee Name
          { type: 'text', text: trigger.monthYear },                // {{2}} Month & Year
          { type: 'text', text: String(formattedSalary) },          // {{3}} Net Salary
          { type: 'text', text: maskedAccount || 'Bank Transfer' }, // {{4}} Bank Account
          { type: 'text', text: trigger.payDate },                  // {{5}} Pay Date
        ],
      });

      if (templateName === 'payslip') {
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: 0,
          parameters: [
            { type: 'payload', payload: `CONFIRM_PAYSLIP_${trigger.employeeId || 'EMP'}_${trigger.monthYear.replace(/\s+/g, '_')}` },
          ],
        });
      }
    }

    return {
      to,
      templateName,
      languageCode: 'en',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      employeeId: trigger.employeeId,
      components,
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
   * 2b. Employee Welcome V2 Template Builder (joy_hr_welcome_v2 - ID: 1394884269294382)
   * Meta Approved Utility Template with Header Image and 4 Positional Body Parameters:
   * {{1}} Company Name, {{2}} Employee Name, {{3}} Employee ID, {{4}} Official Email
   */
  static buildWelcomeV2Template(params: {
    to: string;
    employeeName: string;
    employeeCode: string;
    companyName?: string;
    workEmail?: string;
    organizationId?: string;
    employeeId?: string;
    mediaId?: string;
    imageUrl?: string;
  }): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(params.to);
    const mediaId = params.mediaId || import.meta.env.VITE_WA_WELCOME_IMAGE_MEDIA_ID || '1833658240976922';
    const email = params.workEmail || 'support@joyglobalcorp.com';

    return {
      to,
      templateName: 'joy_hr_welcome_v2',
      languageCode: 'en',
      category: 'UTILITY',
      organizationId: params.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
      employeeId: params.employeeId,
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: params.imageUrl ? { link: params.imageUrl } : { id: mediaId },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.companyName || 'Joy Corporate Solutions' },
            { type: 'text', text: params.employeeName },
            { type: 'text', text: params.employeeCode },
            { type: 'text', text: email },
          ],
        },
      ],
      metadata: {
        eventType: 'EMPLOYEE_WELCOME_ONBOARDING',
        templateId: '1394884269294382',
        templateName: 'joy_hr_welcome_v2',
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

  /**
   * 9. Monthly Payroll MIS & Statutory Summary Report Builder for HR / Management
   */
  static buildPayrollMisReportTemplate(trigger: WhatsAppPayrollMisReportTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.recipientPhone);
    const fmtGross = typeof trigger.totalGrossPay === 'number'
      ? trigger.totalGrossPay.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : trigger.totalGrossPay;
    const fmtNet = typeof trigger.totalNetPay === 'number'
      ? trigger.totalNetPay.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : trigger.totalNetPay;
    const fmtStat = typeof trigger.totalStatutoryDeductions === 'number'
      ? trigger.totalStatutoryDeductions.toLocaleString('en-IN', { maximumFractionDigits: 2 })
      : trigger.totalStatutoryDeductions;

    const components: any[] = [];

    if (trigger.reportPdfUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: trigger.reportPdfUrl,
              filename: `Payroll_MIS_${trigger.monthYear.replace(/\s+/g, '_')}.pdf`,
            },
          },
        ],
      });
    }

    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: trigger.recipientName },                   // {{1}} HR Name
        { type: 'text', text: trigger.monthYear },                       // {{2}} Month Year
        { type: 'text', text: trigger.companyName },                     // {{3}} Company Name
        { type: 'text', text: String(trigger.totalHeadcount) },          // {{4}} Headcount
        { type: 'text', text: `₹${fmtGross}` },                          // {{5}} Total Gross
        { type: 'text', text: `₹${fmtNet}` },                            // {{6}} Total Net
        { type: 'text', text: `₹${fmtStat}` },                           // {{7}} Statutory Deductions
        { type: 'text', text: trigger.runId || 'PR-FINAL' },             // {{8}} Run Reference ID
      ],
    });

    components.push({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [
        { type: 'text', text: trigger.runId || 'latest' },
      ],
    });

    return {
      to,
      templateName: 'joy_payroll_mis_summary_v1',
      languageCode: 'en_US',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components,
      metadata: {
        eventType: 'PAYROLL_MIS_REPORT_DISPATCH',
        monthYear: trigger.monthYear,
        runId: trigger.runId,
      },
    };
  }

  /**
   * 10. Attendance & Biometric Audit MIS Report Template Builder for HR / Management
   * Meta Approved Utility Template (ID: 1728820144855571) 'daily_mis_report_v1'
   * Header: DOCUMENT (PDF attachment)
   * Body: 9 Positional Parameters:
   * {{1}} Recipient Name, {{2}} Report Title, {{3}} Report Date,
   * {{4}} Company Name, {{5}} Total Workforce, {{6}} Present Turnout (Staff + %),
   * {{7}} Late Clock-ins, {{8}} Weekly Off / Leave, {{9}} Cumulative Billed Hours
   * Buttons: 1 Quick Reply — "Acknowledge Audit" (payload ACK_DAILY_MIS_...)
   */
  static buildAttendanceMisReportTemplate(trigger: WhatsAppAttendanceMisReportTrigger): WhatsAppSendTemplatePayload {
    const to = normalizeIndianPhone(trigger.recipientPhone);
    const components: any[] = [];

    const safeFilename = trigger.pdfFilename || `JOY_Attendance_MIS_${trigger.reportDate.replace(/\s+/g, '_')}.pdf`;
    const cleanCompany = (!trigger.companyName || trigger.companyName === 'Workforce Organization')
      ? 'Joy Corporate Solutions'
      : trigger.companyName;

    if (trigger.mediaId) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              id: trigger.mediaId,
              filename: safeFilename,
            },
          },
        ],
      });
    } else if (trigger.reportPdfUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'document',
            document: {
              link: trigger.reportPdfUrl,
              filename: safeFilename,
            },
          },
        ],
      });
    }

    const reportTitle = trigger.reportTitle || 'Daily Attendance & Biometric Audit Report';

    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: trigger.recipientName },             // {{1}} Recipient (e.g. HR Operations)
        { type: 'text', text: reportTitle },                       // {{2}} Report Title
        { type: 'text', text: trigger.reportDate },                // {{3}} Report Date (e.g. 20 October 2026)
        { type: 'text', text: cleanCompany },                      // {{4}} Company Name (e.g. Joy Corporate Solutions)
        { type: 'text', text: String(trigger.totalWorkforce) },    // {{5}} Total Workforce
        { type: 'text', text: trigger.presentTurnout },            // {{6}} Present Turnout (e.g. 13 Staff (62% Turnout))
        { type: 'text', text: String(trigger.lateClockIns) },      // {{7}} Late Clock-In Arrivals
        { type: 'text', text: String(trigger.weeklyOffOrLeave) },  // {{8}} Weekly Off / Approved Leave
        { type: 'text', text: trigger.cumulativeWorkHours },       // {{9}} Total Billed Shift Duration
      ],
    });

    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      parameters: [
        { type: 'payload', payload: `ACK_DAILY_MIS_${trigger.reportDate.replace(/\s+/g, '_')}` },
      ],
    });

    return {
      to,
      templateName: trigger.templateName || 'daily_mis_report_v1',
      languageCode: 'en',
      category: 'UTILITY',
      organizationId: trigger.organizationId,
      components,
      metadata: {
        eventType: 'ATTENDANCE_MIS_REPORT_DISPATCH',
        reportDate: trigger.reportDate,
        totalWorkforce: trigger.totalWorkforce,
        presentTurnout: trigger.presentTurnout,
      },
    };
  }
}
