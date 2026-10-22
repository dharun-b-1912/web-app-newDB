// src/services/email/resendEmailService.ts
// ============================================================================
// WorkforceOS Enterprise — Production Resend Email Gateway Service
// Dispatches securely via /api/resend/emails backend proxy
// ============================================================================

import { getAppBaseUrl } from '../../lib/supabase';

export interface EmailAttachment {
  filename: string;
  content?: string; // base64 encoded string
  path?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string;
  tags?: { name: string; value: string }[];
  attachments?: EmailAttachment[];
}

export interface EmailDeliveryResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
  delivered_at?: string;
}

export interface ActivationEmailParams {
  to: string;
  employeeName: string;
  employeeId: string;
  loginIdentifier: string;
  activationToken: string;
  activationUrl?: string;
  tempPassword?: string;
  organizationName?: string;
  authMethod?: string;
  requiresPasswordChange?: boolean;
}

export interface PasswordResetEmailParams {
  to: string;
  employeeName: string;
  resetToken: string;
  resetUrl?: string;
  organizationName?: string;
  expiresInMinutes?: number;
}

export interface SecurityAlertEmailParams {
  to: string;
  employeeName: string;
  alertType: 'PASSWORD_CHANGED' | 'ACCOUNT_LOCKED' | 'NEW_DEVICE_LOGIN';
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
  organizationName?: string;
}

export interface PlatformStaffInviteEmailParams {
  to: string;
  recipientName: string;
  staffCode: string;
  roleDisplayName: string;
  roleKey: string;
  department?: string;
  invitedBy?: string;
  invitationUrl?: string;
  token?: string;
  mfaEnforced?: boolean;
  accountExpiryDate?: string;
  moduleRestrictions?: string[];
  organizationName?: string;
}

export interface OrganizationUserInviteEmailParams {
  to: string;
  recipientName: string;
  organizationName: string;
  roleDisplayName: string;
  roleKey?: string;
  department?: string;
  invitedBy?: string;
  invitationUrl?: string;
  token?: string;
  phone?: string;
  expiresInDays?: number;
}

export interface AccountCreationOtpEmailParams {
  to: string;
  recipientName: string;
  otpCode: string;
  purpose?: string;
  employeeId?: string;
  loginIdentifier?: string;
  organizationName?: string;
  activationUrl?: string;
  expiresInMinutes?: number;
}

export interface AccountActivatedConfirmationParams {
  to: string;
  employeeName: string;
  loginIdentifier?: string;
  loginUrl?: string;
  organizationName?: string;
}

export interface VendorActivationEmailParams {
  to: string;
  authorizedContactName: string;
  vendorLegalName: string;
  vendorCode: string;
  portalUrl?: string;
  activationToken: string;
  activationUrl?: string;
  companyName?: string;
  supportEmail?: string;
  expiresInDays?: number;
  customSubject?: string;
  customTemplateHtml?: string;
}

export interface HierarchicalEmailException {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  location?: string;
  status: string;
  checkIn: string;
  checkOut: string;
  scheduledTime?: string;
  issue: string;
  systemObservation?: string;
  resolutionStatus?: string;
  latestRemark?: {
    remark: string;
    authorName: string;
    authorRole: string;
    timestamp: string;
  };
}

export interface HierarchicalEmailSupervisor {
  supervisorName: string;
  supervisorRole: 'TL' | 'Supervisor';
  teamSize: number;
  attendanceIssues: number;
  exceptions: HierarchicalEmailException[];
}

export interface HierarchicalEmailManager {
  managerName: string;
  teamSize: number;
  attendanceIssues: number;
  pendingReviews?: number;
  supervisors: HierarchicalEmailSupervisor[];
}

export interface HierarchicalEmailDepartment {
  department: string;
  managers: HierarchicalEmailManager[];
}

export interface DailyAttendanceMisReportEmailParams {
  to: string | string[];
  recipientName: string;
  recipientRoleTitle: string; // 'Team Lead' | 'Reporting Manager' | 'Department Head' | 'HR Director'
  scopeDescription: string; // e.g. "Engineering & People Ops Squad" or "Operations & Tech Dept" or "Company-Wide Consolidated"
  reportDate: string; // formatted e.g. "19 Sep 2026"
  totalStrength: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  wfhCount: number;
  attendancePercentage: number;
  department?: string;
  location?: string;
  reportingManager?: string;
  generatedAt?: string;
  scheduledEmployees?: number;
  attendanceRecorded?: number;
  attendanceMissingCount?: number;
  missingCheckInCount?: number;
  missingCheckOutCount?: number;
  pendingReviewCount?: number;
  approvedExceptionsCount?: number;
  hierarchicalGroups?: HierarchicalEmailDepartment[];
  lateEmployees: Array<{
    code: string;
    name: string;
    department: string;
    inTime: string;
    lateMinutes: number;
  }>;
  absentEmployees: Array<{
    code: string;
    name: string;
    department: string;
    shift: string;
  }>;
  onLeaveEmployees: Array<{
    code: string;
    name: string;
    department: string;
    leaveType: string;
    duration: string;
  }>;
  dashboardUrl?: string;
  organizationName?: string;
  pdfAttachmentBase64?: string;
  pdfFilename?: string;
}

export interface AttendanceReconEmailParams {
  to: string | string[];
  vendorName: string;
  vendorCode?: string;
  contractPo?: string;
  clientCompanyName: string;
  siteName: string;
  periodLabel: string;
  totalWorkers: number;
  activeWorkers: number;
  totalRecords: number;
  totalOtHours: number;
  otEmployeesCount: number;
  activeOtPolicyName: string;
  activeOtMultiplier?: number;
  activeOtHourlyRate: number;
  totalOtDisbursableAmount: number;
  matchedCount: number;
  documentedVariancesCount: number;
  excelAttachmentBase64?: string;
  excelFilename?: string;
  customMessage?: string;
}

class ResendEmailService {
  private readonly defaultFrom: string = 'Joy PeopleHR <noreply@joypeoplehr.com>';

  private getApiUrl(): string {
    return '/api/email/send';
  }

  /**
   * Outbound email dispatcher through Hostinger SMTP Gateway (/api/email/send)
   */
  async sendEmail(payload: SendEmailPayload): Promise<EmailDeliveryResponse> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const validRecipients = recipients.filter((email) => email && email.includes('@'));

    if (validRecipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipient email address provided.',
      };
    }

    const requestBody = JSON.stringify({
      from: payload.from || this.defaultFrom,
      to: validRecipients,
      cc: payload.cc,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.subject,
      reply_to: payload.reply_to,
      tags: payload.tags,
      attachments: payload.attachments,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // In Node test runner or offline environments without active browser origin
    if (typeof window === 'undefined' || typeof location === 'undefined') {
      return {
        success: true,
        id: `mock-email-node-${Date.now()}`,
        message: 'Email invitation simulated successfully (Node / Test Runner Mode).',
        delivered_at: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers,
        body: requestBody,
      });

      const data = await response.json().catch(() => ({ message: response.statusText }));

      if (!response.ok) {
        console.warn('[Hostinger SMTP Gateway] Gateway returned notice:', data);
        const errMsg =
          data.error ||
          data.message ||
          (typeof data === 'string' ? data : `SMTP Gateway Error (${response.status}): ${response.statusText}`);
        return {
          success: false,
          error: errMsg,
          message: errMsg,
        };
      }

      console.log('[Hostinger SMTP Gateway] Email successfully processed:', data.id || data.provider);
      return {
        success: true,
        id: data.id,
        message: data.message || 'Email successfully processed by Hostinger SMTP gateway.',
        delivered_at: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('[Hostinger SMTP Gateway] Hostinger endpoint unreachable, attempting Resend API fallback...', err);

      // Real Fallback to Resend API (NO simulated delivery)
      const resendKey = (import.meta as any).env?.VITE_RESEND_API_KEY || 're_mock_dummy_resend_api_key_sanitized';
      try {
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: payload.from || this.defaultFrom,
            to: validRecipients,
            cc: payload.cc,
            subject: payload.subject,
            html: payload.html,
            attachments: payload.attachments?.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }),
        });

        const resendData = await resendResp.json().catch(() => null);
        if (resendResp.ok && resendData?.id) {
          return {
            success: true,
            id: resendData.id,
            message: `Email dispatched successfully via Resend API to ${validRecipients.join(', ')}.`,
            delivered_at: new Date().toISOString(),
          };
        } else {
          const failMsg = resendData?.message || `Resend HTTP ${resendResp.status}`;
          return {
            success: false,
            error: `Failed to deliver email: Hostinger SMTP unreachable and Resend returned: ${failMsg}`,
          };
        }
      } catch (resendErr: any) {
        return {
          success: false,
          error: `Failed to deliver email: ${err.message || 'SMTP Gateway unavailable'} and Resend: ${resendErr.message}`,
        };
      }
    }
  }

  /**
   * Dispatches Employee Welcome & App Access Invitation Email
   */
  async sendEmployeeActivationEmail(params: ActivationEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const activationLink = params.activationUrl || `${baseUrl}/activate?token=${encodeURIComponent(params.activationToken)}&emp=${encodeURIComponent(params.employeeId)}&email=${encodeURIComponent(params.to)}`;

    const tempPass = params.tempPassword || 'joypeoplehr';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${orgName} - Employee App Access</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #07563D; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; background: #E6F4EA; color: #07563D; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px; }
    .creds-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .creds-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .creds-row:last-child { margin-bottom: 0; }
    .creds-label { color: #64748b; font-weight: 600; }
    .creds-value { color: #0f172a; font-weight: 700; font-family: monospace; }
    .btn { display: inline-block; background: #07563D; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-align: center; margin: 16px 0; box-shadow: 0 2px 4px rgba(7, 86, 61, 0.2); }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    .security-note { font-size: 12px; color: #64748b; background: #fffbeb; border: 1px solid #fef3c7; padding: 10px 14px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Employee App Access</div>
      <h1>Welcome to ${orgName}</h1>
      <p>Your official employee portal and mobile access credentials</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${params.employeeName}</strong>,</p>
      <p>Your workforce profile has been successfully set up by the HR management team. You can now access attendance punching, leave applications, payslips, and HR services directly through your employee account.</p>
      
      <div class="creds-card">
        <div style="font-weight: 700; color: #07563D; margin-bottom: 12px; font-size: 13px; text-transform: uppercase;">Your Login Credentials</div>
        <div class="creds-row">
          <span class="creds-label">Login Identifier:</span>
          <span class="creds-value">${params.loginIdentifier}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Employee ID:</span>
          <span class="creds-value">${params.employeeId}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Auth Method:</span>
          <span class="creds-value">${params.authMethod || 'Employee ID + Password'}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Default / Temporary Password:</span>
          <span class="creds-value">${tempPass}</span>
        </div>
      </div>

      <!-- Google Play Store Mobile App Banner -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e6f4ea 100%); border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="display: inline-block; background: #07563D; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 8px;">
          📲 Android Mobile App
        </div>
        <h3 style="margin: 4px 0 8px 0; font-size: 16px; font-weight: 800; color: #064e3b;">
          Download Joy PeopleHR on Google Play Store
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #047857; line-height: 1.5;">
          Punch daily attendance with geofencing, submit leave applications, view work shifts, and download payslips directly on your mobile device.
        </p>
        <div style="text-align: center;">
          <a href="https://play.google.com/store/apps/details?id=com.joypeoplehr.app" target="_blank" style="display: inline-block; background: #07563D; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 26px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(7, 86, 61, 0.25);">
            ▶ Download on Google Play Store
          </a>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #065f46;">
          After installing, sign in using your Employee ID <strong>${params.employeeId}</strong> and default password <strong>${tempPass}</strong>.
        </p>
      </div>

      <div style="margin: 20px 0; padding: 14px 18px; background-color: #E6F4EA; border: 1.5px dashed #07563D; border-radius: 12px; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; color: #07563D; text-transform: uppercase; margin-bottom: 4px;">🔑 One-Time Web Portal Activation Code</div>
        <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #07563D; background: #ffffff; padding: 6px 14px; border-radius: 6px; display: inline-block; border: 1px solid #A3D9C9; user-select: all;">${params.activationToken}</div>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #07563D;">Enter this code in the portal or click the button below to activate via web.</p>
      </div>

      <div style="text-align: center;">
        <a href="${activationLink}" class="btn" target="_blank">Activate Account & Set Password (Web Portal)</a>
      </div>

      <div class="security-note">
        <strong>Security Notice:</strong> For security compliance, you can change your default password anytime from your profile settings in the app or portal.
      </div>
    </div>
    
    <div class="footer">
      <p>This automated email was sent by ${orgName} Workforce Management System.</p>
      <p>If you did not expect this invitation, please contact your HR Department immediately.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Welcome to ${orgName} — Activate Your Employee App Account (${params.loginIdentifier})`,
      html,
    });
  }

  /**
   * Dispatches Account Creation Verification OTP & 1-Click Activation Email
   */
  async sendAccountCreationOtpEmail(params: AccountCreationOtpEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const activationLink = params.activationUrl || `${baseUrl}/activate?email=${encodeURIComponent(params.to)}&otp=${encodeURIComponent(params.otpCode)}`;
    const expiryMins = params.expiresInMinutes || 10;
    const identifier = params.loginIdentifier || params.to;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Verification OTP - ${orgName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #07563D; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .otp-box { margin: 24px 0; padding: 20px; background-color: #F0FDF4; border: 2px dashed #16A34A; border-radius: 14px; text-align: center; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #07563D; background: #ffffff; padding: 10px 24px; border-radius: 8px; display: inline-block; border: 1px solid #BBF7D0; user-select: all; }
    .btn { display: inline-block; background: #07563D; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-align: center; margin: 16px 0; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    .badge { display: inline-block; background: #DCFCE7; color: #166534; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Security Verification</div>
      <h1>Account Activation OTP</h1>
      <p>${orgName} Workforce Platform</p>
    </div>
    <div class="content">
      <p>Hello <strong>${params.recipientName}</strong>,</p>
      <p>Your workforce account has been created. Please use the following 6-digit verification code to activate your account and set up your confidential password:</p>
      
      <div class="otp-box">
        <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 8px;">Your 6-Digit Activation Code</div>
        <div class="otp-code">${params.otpCode}</div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #166534; font-weight: 600;">⏱️ Valid for ${expiryMins} minutes. Do not share this code with anyone.</p>
      </div>

      <p>Alternatively, click the button below to instantly verify and activate in one click:</p>
      <div style="text-align: center;">
        <a href="${activationLink}" class="btn" target="_blank">Activate Account Directly →</a>
      </div>

      <div style="margin-top: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <strong>Login Identifier:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${identifier}</span>
        ${params.employeeId ? `<br><strong>Employee ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${params.employeeId}</span>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>This automated verification was dispatched by ${orgName}. If you did not request this, please contact IT Security immediately.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `${params.otpCode} is your ${orgName} Account Activation Code`,
      html,
    });
  }

  /**
   * Dispatches Confirmation Email after Account is Successfully Activated
   */
  async sendAccountActivatedConfirmationEmail(params: AccountActivatedConfirmationParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const loginUrl = params.loginUrl || `${baseUrl}/login`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Activated - ${orgName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #07563D; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #07563D; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-align: center; margin: 18px 0; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Account Activated Successfully</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${params.employeeName}</strong>,</p>
      <p>Your ${orgName} employee account has been activated and your permanent password has been set.</p>
      <p>You can now sign in at any time from your computer or the Joy PeopleHR mobile app.</p>
      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Sign In to Workforce Portal →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Your ${orgName} Employee Account is Ready!`,
      html,
    });
  }

  /**
   * Dispatches Professional Vendor Account Activation Email with Single-Use Secure Token
   */
  async sendVendorAccountActivationEmail(params: VendorActivationEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.companyName || 'Joy PeopleHR';
    const baseUrl = getAppBaseUrl();
    const portalUrl = params.portalUrl || `${baseUrl}/vendor`;
    const activationLink =
      params.activationUrl ||
      `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(params.activationToken)}&email=${encodeURIComponent(params.to)}&role=VENDOR_ADMIN`;
    const expiresInDays = params.expiresInDays || 7;
    const supportEmail = params.supportEmail || 'hr-support@joypeoplehr.com';

    const subject = params.customSubject || `Welcome to Joy PeopleHR — Activate Your Vendor Account`;

    let html = params.customTemplateHtml;
    if (html) {
      // Dynamic placeholder replacement for configurable templates
      html = html
        .replace(/{{authorized_contact_name}}/g, params.authorizedContactName)
        .replace(/{{vendor_legal_name}}/g, params.vendorLegalName)
        .replace(/{{vendor_code}}/g, params.vendorCode)
        .replace(/{{authorized_contact_email}}/g, params.to)
        .replace(/{{portal_url}}/g, portalUrl)
        .replace(/{{activation_url}}/g, activationLink)
        .replace(/{{invitation_expiry}}/g, `${expiresInDays} days`)
        .replace(/{{company_name}}/g, orgName)
        .replace(/{{support_email}}/g, supportEmail);
    } else {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Vendor Account - ${orgName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #07563D 0%, #047857 100%); color: #ffffff; padding: 32px 28px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 28px; font-size: 14px; line-height: 1.6; }
    .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .details-table td { padding: 6px 0; }
    .details-table td.label { color: #64748b; width: 140px; }
    .details-table td.value { color: #0f172a; font-weight: 600; }
    .btn { display: inline-block; background: #047857; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-align: center; margin: 16px 0; box-shadow: 0 4px 6px -1px rgba(4, 120, 87, 0.25); }
    .security-notice { background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin: 24px 0 16px 0; font-size: 12px; color: #92400e; }
    .security-notice ul { margin: 6px 0 0 0; padding-left: 18px; line-height: 1.6; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Vendor Governance &amp; Access</div>
      <h1>Welcome to Joy PeopleHR</h1>
      <p>Enterprise Workforce &amp; Vendor Management System</p>
    </div>
    <div class="content">
      <p>Dear <strong>${params.authorizedContactName}</strong>,</p>
      <p>Welcome to <strong>Joy PeopleHR</strong>.</p>
      <p>Your manpower vendor account for <strong>${params.vendorLegalName}</strong> has been registered in the Joy PeopleHR platform.</p>
      <p>You can use the vendor portal to manage relevant workforce, compliance, contract, and billing information based on the permissions assigned to your account.</p>

      <div class="details-box">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Your Account Details</div>
        <table class="details-table">
          <tr>
            <td class="label">Vendor Name:</td>
            <td class="value">${params.vendorLegalName}</td>
          </tr>
          <tr>
            <td class="label">Vendor Code:</td>
            <td class="value" style="font-family: monospace; color: #047857; font-size: 14px;">${params.vendorCode}</td>
          </tr>
          <tr>
            <td class="label">Registered Email:</td>
            <td class="value">${params.to}</td>
          </tr>
          <tr>
            <td class="label">Portal URL:</td>
            <td class="value"><a href="${portalUrl}" style="color: #047857; text-decoration: none;">${portalUrl}</a></td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${activationLink}" class="btn" target="_blank">Activate Your Joy PeopleHR Account</a>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Click the activation link to set up your password and access the vendor portal.</p>
      </div>

      <div class="security-notice">
        <strong>For your security:</strong>
        <ul>
          <li>The activation link is unique to your invitation.</li>
          <li>The link expires in ${expiresInDays} days according to the configured security policy.</li>
          <li>You will be required to create a secure password during activation.</li>
          <li>Do not share your activation link or password with anyone.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        If you did not expect this invitation, please contact your company HR administrator.
      </p>

      <p style="margin-top: 24px; font-size: 13px; color: #334155;">
        Regards,<br>
        <strong>Joy PeopleHR Team</strong><br>
        <span style="font-size: 11px; color: #64748b;">Automated Vendor Account Services</span>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">This automated notification was dispatched by ${orgName}. If you have any inquiries, reach us at <a href="mailto:${supportEmail}" style="color: #047857; text-decoration: none;">${supportEmail}</a>.</p>
    </div>
  </div>
</body>
</html>
      `;
    }

    return this.sendEmail({
      to: params.to,
      subject,
      html,
    });
  }

  /**
   * Dispatches Password Reset Email with single-use token
   */
  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const resetLink = params.resetUrl || `${baseUrl}/reset-password?token=${encodeURIComponent(params.resetToken)}`;
    const expiryMins = params.expiresInMinutes || 15;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ${orgName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #07563D; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #07563D; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; text-align: center; margin: 18px 0; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${params.employeeName}</strong>,</p>
      <p>We received a request to reset the password for your ${orgName} employee account.</p>
      
      <p>Click the button below to create a new secure password:</p>
      
      <div style="text-align: center;">
        <a href="${resetLink}" class="btn" target="_blank">Reset My Password →</a>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 18px 0; font-size: 12px; color: #64748b; text-align: center;">
        🔒 <strong>Encrypted Single-Use Session:</strong> This link is cryptographically signed and valid for <strong>${expiryMins} minutes</strong>.
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        If you did not request this password reset, no action is required and you can safely disregard this email.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Password Reset Request — ${orgName}`,
      html,
    });
  }

  /**
   * Dispatches Security Audit Notifications (e.g. password changed)
   */
  async sendSecurityAlertEmail(params: SecurityAlertEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const alertTitles = {
      PASSWORD_CHANGED: 'Your Employee Account Password Was Changed',
      ACCOUNT_LOCKED: 'Your Account Was Temporarily Locked (Failed Attempts)',
      NEW_DEVICE_LOGIN: 'New Device Login Detected',
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; }
    .title { color: #07563D; font-size: 18px; font-weight: bold; margin-bottom: 12px; }
    .meta { background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">${alertTitles[params.alertType] || 'Security Notice'}</div>
    <p>Hello <strong>${params.employeeName}</strong>,</p>
    <p>This is a security notification for your employee account at ${orgName}.</p>
    <div class="meta">
      <div><strong>Event:</strong> ${params.alertType}</div>
      <div><strong>Timestamp:</strong> ${params.timestamp}</div>
      ${params.ipAddress ? `<div><strong>IP Address:</strong> ${params.ipAddress}</div>` : ''}
      ${params.deviceInfo ? `<div><strong>Device / Browser:</strong> ${params.deviceInfo}</div>` : ''}
    </div>
    <p style="font-size: 12px; color: #dc2626;">If you did not perform this activity, contact HR security immediately to lock your credentials.</p>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Security Alert: ${alertTitles[params.alertType]} — ${orgName}`,
      html,
    });
  }

  /**
   * Dispatches High-Security Platform Staff & Delegated IAM Administrator Invitation Email
   */
  async sendPlatformStaffInvitationEmail(params: PlatformStaffInviteEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy PeopleHR Enterprise';
    const baseUrl = getAppBaseUrl();
    const token = params.token || `tok_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const invitationLink =
      params.invitationUrl ||
      `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(params.to)}&role=${encodeURIComponent(params.roleKey)}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platform Administrator Invitation — ${orgName}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0c1319; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #131d24; border-radius: 20px; overflow: hidden; border: 1px solid #1e2e38; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
    
    <!-- Top Header & Brand Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #047857 0%, #064e3b 50%, #022c22 100%); padding: 36px 32px 28px 32px; text-align: center; border-bottom: 1px solid #059669;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; padding: 4px 14px;">
              <span style="font-size: 11px; font-weight: 800; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.5px;">🔐 Platform Control Plane IAM</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Joy PeopleHR Enterprise</h1>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Delegated Administrator & Platform Staff Provisioning</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #f8fafc;">
          Hello <strong style="color: #ffffff;">${params.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0;">
          You have been granted authorized platform administrative credentials on the <strong>Joy PeopleHR Control Plane</strong>. An official staff account has been provisioned with delegated governance permissions.
        </p>

        <!-- Credentials & Provisioning Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a1014; border: 1px solid #1e2e38; border-radius: 14px; margin: 20px 0; overflow: hidden;">
          <tr>
            <td style="padding: 14px 18px; background-color: #0f1920; border-bottom: 1px solid #1e2e38;">
              <span style="font-size: 11px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 1px;">Access & Authority Profile</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; width: 40%;">Staff ID:</td>
                  <td style="padding: 6px 0; color: #f8fafc; font-weight: 700; font-family: monospace; text-align: right;">${params.staffCode}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Assigned Role:</td>
                  <td style="padding: 6px 0; text-align: right;">
                    <span style="background-color: #064e3b; color: #6ee7b7; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px; border: 1px solid #059669;">
                      ${params.roleDisplayName} (${params.roleKey})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Department:</td>
                  <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; text-align: right;">${params.department || 'Platform Operations'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">MFA Policy:</td>
                  <td style="padding: 6px 0; color: #34d399; font-weight: 700; text-align: right;">
                    ${params.mfaEnforced !== false ? '✅ Enforced (TOTP Hardware/App)' : 'Standard'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Inviting Authority:</td>
                  <td style="padding: 6px 0; color: #e2e8f0; font-weight: 600; text-align: right;">${params.invitedBy || 'THIRUMALAI R K (Super Admin)'}</td>
                </tr>
                ${
                  params.accountExpiryDate
                    ? `<tr>
                        <td style="padding: 6px 0; color: #94a3b8;">Account Validity:</td>
                        <td style="padding: 6px 0; color: #fbbf24; font-weight: 600; text-align: right;">Expires on ${new Date(params.accountExpiryDate).toLocaleDateString()}</td>
                      </tr>`
                    : `<tr>
                        <td style="padding: 6px 0; color: #94a3b8;">Account Validity:</td>
                        <td style="padding: 6px 0; color: #34d399; font-weight: 600; text-align: right;">Permanent Staff Account</td>
                      </tr>`
                }
              </table>
            </td>
          </tr>
        </table>

        <!-- Primary CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              <a href="${invitationLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                Accept Invitation & Initialize Credentials →
              </a>
            </td>
          </tr>
        </table>

        <!-- Direct Link Box -->
        <div style="background-color: #0a1014; border: 1px dashed #263843; border-radius: 10px; padding: 12px 14px; margin-top: 20px; font-size: 11px; word-break: break-all; color: #64748b;">
          <span style="color: #94a3b8; font-weight: bold; display: block; margin-bottom: 4px;">Direct Invitation Link (Single-use):</span>
          <a href="${invitationLink}" style="color: #34d399; text-decoration: none;">${invitationLink}</a>
        </div>

        <!-- Security Warning & Zero Trust Compliance -->
        <div style="margin-top: 24px; padding: 14px 16px; background-color: #19160d; border: 1px solid #78350f; border-radius: 10px; font-size: 12px; color: #fde68a; line-height: 1.5;">
          <strong style="color: #fbbf24;">⚠️ Zero Trust Security Notice:</strong><br>
          This invitation contains a time-sensitive cryptographic authentication token valid for 7 days. Platform audit trails log all IP addresses and device handshakes during initial registration.
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #0a1014; border-top: 1px solid #1e2e38; text-align: center; font-size: 11px; color: #64748b;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #94a3b8;">Joy PeopleHR Enterprise • Identity & Platform Control Plane</p>
        <p style="margin: 0;">Automated System Notice • Delivered securely via Resend SMTP Gateway</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `[Platform IAM] Invitation to join Joy PeopleHR as ${params.roleDisplayName} (${params.staffCode})`,
      html,
    });
  }

  /**
   * Dispatches Organization Customer Administrator / User Invitation Email
   */
  async sendOrganizationUserInvitationEmail(params: OrganizationUserInviteEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const token = params.token || `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const invitationLink =
      params.invitationUrl ||
      `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(params.to)}&role=${encodeURIComponent(params.roleDisplayName)}`;
    const expiryDays = params.expiresInDays || 7;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invitation to Join ${orgName} — Joy PeopleHR</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Banner -->
    <tr>
      <td bgcolor="#047857" style="background: linear-gradient(135deg, #047857 0%, #064e3b 50%, #022c22 100%); background-color: #047857; padding: 36px 32px 28px 32px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
          <tr>
            <td bgcolor="#065f46" style="background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; padding: 5px 16px;">
              <span style="font-size: 11px; font-weight: 800; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.2px;">⚡ Joy PeopleHR • Enterprise IAM</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${orgName}</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Authorized Workforce & Portal Access Invitation</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; font-size: 14px; line-height: 1.6; color: #334155;">
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a;">
          Hello <strong style="color: #047857;">${params.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          You have been formally invited by <strong>${params.invitedBy || 'the Organization Administrator'}</strong> to join <strong>${orgName}</strong> on the Joy PeopleHR Workforce Platform. Your role and profile permissions have been provisioned in the enterprise directory.
        </p>

        <!-- Access Profile Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
          <tr>
            <td bgcolor="#f1f5f9" style="padding: 12px 18px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.8px;">📋 Invitation & Role Credentials</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 40%;">Target Organization:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${orgName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
                  <td style="padding: 6px 0; text-align: right;">
                    <span style="background-color: #ecfdf5; color: #047857; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 6px; border: 1px solid #a7f3d0; display: inline-block;">
                      ${params.roleDisplayName}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Department:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${params.department || 'People Operations'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Registered Work Email:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace; text-align: right;">${params.to}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Invited By:</td>
                  <td style="padding: 6px 0; color: #334155; font-weight: 600; text-align: right;">${params.invitedBy || 'Company Administrator'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Validity:</td>
                  <td style="padding: 6px 0; color: #b45309; font-weight: 700; text-align: right;">Expires in ${expiryDays} days</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- One-Time Invitation Code Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #f0fdf4; border: 1.5px dashed #10b981; border-radius: 12px;">
          <tr>
            <td style="padding: 16px 20px; text-align: center;">
              <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
                🔑 One-Time Security Activation Code
              </div>
              <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 18px; font-weight: 800; color: #064e3b; letter-spacing: 1.5px; background: #ffffff; padding: 8px 18px; border-radius: 8px; display: inline-block; border: 1px solid #bbf7d0;">
                ${token}
              </div>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #047857;">
                Click the direct button below to activate your account in 1 click.
              </p>
            </td>
          </tr>
        </table>

        <!-- Primary CTA Button (Outlook Bulletproof) -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto;">
          <tr>
            <td align="center" bgcolor="#047857" style="background-color: #047857; border-radius: 10px;">
              <a href="${invitationLink}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 14px; font-weight: 800; color: #ffffff !important; text-decoration: none; letter-spacing: 0.2px; background-color: #047857; border-radius: 10px; border: 1px solid #064e3b;">
                Accept Invitation & Set Password →
              </a>
            </td>
          </tr>
        </table>

        <!-- Direct Link Box -->
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 14px; margin-top: 20px; font-size: 11px; word-break: break-all; color: #64748b;">
          <span style="color: #475569; font-weight: bold; display: block; margin-bottom: 4px;">Direct Invitation URL (Single-use):</span>
          <a href="${invitationLink}" style="color: #047857; text-decoration: underline; word-break: break-all;">${invitationLink}</a>
        </div>

        <!-- Security Note -->
        <div style="margin-top: 22px; padding: 12px 16px; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; font-size: 12px; color: #854d0e; line-height: 1.5;">
          <strong>🔒 Security Compliance:</strong> This invitation is designated exclusively for <strong>${params.to}</strong>. Do not forward or share this link. Once accepted, you will create your private password and security authentication profile.
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td bgcolor="#f8fafc" style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">Joy PeopleHR Enterprise • Identity & Access Management (IAM)</p>
        <p style="margin: 0;">Automated System Dispatch • Enterprise SMTP Gateway • Secured by TLS</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Invitation to join ${orgName} as ${params.roleDisplayName} — Joy PeopleHR`,
      html,
    });
  }

  /**
   * Dispatches Direct Authentication Link & Password Reset Link
   */
  async sendDirectAuthenticationLinkEmail(params: PasswordResetEmailParams & { directLoginUrl?: string; authType?: string }): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const authLink = params.directLoginUrl || params.resetUrl || `${baseUrl}/reset-password?token=${encodeURIComponent(params.resetToken)}`;
    const expiryMins = params.expiresInMinutes || 30;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Link — ${orgName}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #047857 0%, #064e3b 100%); padding: 32px 28px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.2); border-radius: 999px; padding: 4px 12px;">
              <span style="font-size: 11px; font-weight: 800; color: #d1fae5; text-transform: uppercase; letter-spacing: 1px;">🔐 Secure Authentication Link</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Joy PeopleHR Security</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">${orgName}</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px 28px 20px 28px; font-size: 14px; line-height: 1.6; color: #334155;">
        <p style="margin: 0 0 14px 0; font-size: 15px; color: #0f172a;">
          Hello <strong style="color: #047857;">${params.employeeName}</strong>,
        </p>
        <p style="margin: 0 0 18px 0; color: #475569;">
          A direct authentication and password configuration link was requested by the Platform Super Admin for your account at <strong>${orgName}</strong>.
        </p>

        <!-- One-Time Activation Code Box -->
        <div style="margin: 20px 0; padding: 16px 20px; background-color: #f0fdf4; border: 1.5px dashed #10b981; border-radius: 14px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
            🔑 One-Time Activation Code
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 18px; font-weight: 800; color: #064e3b; letter-spacing: 1.5px; background: #ffffff; padding: 8px 16px; border-radius: 8px; display: inline-block; border: 1px solid #bbf7d0; user-select: all;">
            ${params.resetToken}
          </div>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #047857;">
            Enter this code in the activation modal, or click the button below for instant 1-click access.
          </p>
        </div>

        <!-- CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto;">
          <tr>
            <td align="center" style="background: #047857; border-radius: 12px; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.3);">
              <a href="${authLink}" target="_blank" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none;">
                Authenticate & Set Password →
              </a>
            </td>
          </tr>
        </table>

        <!-- Security Protection Note -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin: 20px 0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
          🔒 <strong>Cryptographically Secured Session:</strong> Your one-time authentication credentials are encrypted directly inside the button link above and valid for <strong>${expiryMins} minutes</strong>.
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 12px 0 0 0;">
          If you did not request this link, no action is needed. Your existing account credentials remain safe.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0;">© ${new Date().getFullYear()} ${orgName} • Joy PeopleHR Platform Gateway</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Direct Authentication & Password Link — ${orgName}`,
      html,
    });
  }

  /**
   * Dispatches an executive Daily Attendance MIS Report email to Team Leads, Managers, or HR
   */
  async sendDailyAttendanceMisReportEmail(params: DailyAttendanceMisReportEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy PeopleHR Enterprise';
    const dashboardUrl = params.dashboardUrl || 'https://joypeoplehr.com/attendance';

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    const lateRowsHtml = params.lateEmployees.length > 0
      ? params.lateEmployees.map((e) => {
          const initials = getInitials(e.name);
          const isSevere = e.lateMinutes > 30;
          const badgeBg = isSevere ? '#fee2e2' : '#fef3c7';
          const badgeColor = isSevere ? '#b91c1c' : '#b45309';
          return `
            <tr>
              <td style="padding: 12px 14px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 32px; height: 32px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; text-align: center; color: #ffffff; font-size: 11px; font-weight: 800;">
                      ${initials}
                    </td>
                    <td style="padding-left: 10px;">
                      <div style="font-weight: 700; color: #0f172a;">${e.name}</div>
                      <div style="font-size: 11px; color: #64748b;">${e.code}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-weight: 600;">${e.department}</span>
              </td>
              <td style="padding: 12px 14px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9; font-weight: 700;">
                ${e.inTime}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block;">
                  +${e.lateMinutes} min ${isSevere ? '(Critical)' : 'delayed'}
                </span>
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #059669; font-size: 13px; font-weight: 600; background-color: #f0fdf4;">✓ Stellar Punctuality! All checked-in team members arrived on time within policy grace.</td></tr>`;

    const absentRowsHtml = params.absentEmployees.length > 0
      ? params.absentEmployees.map((e) => {
          const initials = getInitials(e.name);
          return `
            <tr>
              <td style="padding: 12px 14px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 32px; height: 32px; background: linear-gradient(135deg, #ef4444, #b91c1c); border-radius: 50%; text-align: center; color: #ffffff; font-size: 11px; font-weight: 800;">
                      ${initials}
                    </td>
                    <td style="padding-left: 10px;">
                      <div style="font-weight: 700; color: #0f172a;">${e.name}</div>
                      <div style="font-size: 11px; color: #64748b;">${e.code}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-weight: 600;">${e.department}</span>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                ${e.shift}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="background-color: #fee2e2; color: #dc2626; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800;">
                  Unplanned Absence
                </span>
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #059669; font-size: 13px; font-weight: 600; background-color: #f0fdf4;">✓ Zero Unplanned Absences recorded today. 100% scheduled workforce accounted for.</td></tr>`;

    const leaveRowsHtml = params.onLeaveEmployees.length > 0
      ? params.onLeaveEmployees.map((e) => {
          const initials = getInitials(e.name);
          return `
            <tr>
              <td style="padding: 12px 14px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; text-align: center; color: #ffffff; font-size: 11px; font-weight: 800;">
                      ${initials}
                    </td>
                    <td style="padding-left: 10px;">
                      <div style="font-weight: 700; color: #0f172a;">${e.name}</div>
                      <div style="font-size: 11px; color: #64748b;">${e.code}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-weight: 600;">${e.department}</span>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="background-color: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800;">
                  ${e.leaveType}
                </span>
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; font-weight: 600;">
                ${e.duration}
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #64748b; font-size: 12px;">No team members currently on approved leave today.</td></tr>`;

    const hierarchicalGroupsHtml = (params.hierarchicalGroups && params.hierarchicalGroups.length > 0)
      ? params.hierarchicalGroups.map((dept) => {
          const managersHtml = dept.managers.map((mgr) => {
            const supervisorsHtml = mgr.supervisors.map((sup) => {
              const exceptionsHtml = sup.exceptions.map((exc) => {
                const getBadgeBg = (st: string) => {
                  if (st.includes('Missing')) return '#fee2e2';
                  if (st === 'Late') return '#fef3c7';
                  if (st === 'Pending Review') return '#ede9fe';
                  return '#f1f5f9';
                };
                const getBadgeColor = (st: string) => {
                  if (st.includes('Missing')) return '#dc2626';
                  if (st === 'Late') return '#b45309';
                  if (st === 'Pending Review') return '#6d28d9';
                  return '#475569';
                };

                const remarkHtml = exc.latestRemark ? `
                  <div style="margin-top: 10px; padding: 8px 12px; background-color: #f8fafc; border-left: 3px solid #07563D; border-radius: 4px; font-size: 11px; color: #334155;">
                    <div style="font-weight: 700; color: #0f172a;">Latest Remark (${exc.latestRemark.authorName} — ${exc.latestRemark.authorRole}):</div>
                    <div style="margin-top: 2px;">"${exc.latestRemark.remark}"</div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Logged at ${exc.latestRemark.timestamp}</div>
                  </div>
                ` : '';

                return `
                  <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <span style="background-color: ${getBadgeBg(exc.status)}; color: ${getBadgeColor(exc.status)}; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 6px;">
                            ${exc.status.includes('Missing') ? '🔴' : exc.status === 'Late' ? '🟡' : '🟠'} ${exc.status}
                          </span>
                          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${exc.employeeName} <span style="font-size: 11px; color: #64748b; font-weight: normal;">(${exc.employeeCode})</span></div>
                          <div style="font-size: 11px; color: #64748b;">${exc.designation} • ${exc.department}</div>
                        </td>
                        <td align="right" valign="top">
                          <span style="font-size: 11px; font-weight: 600; color: #64748b;">Shift: 09:30 AM – 06:30 PM</span>
                        </td>
                      </tr>
                    </table>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 8px 12px;">
                      <tr>
                        <td style="font-size: 11px; color: #475569;"><strong>Check-In:</strong> ${exc.checkIn}</td>
                        <td style="font-size: 11px; color: #475569;"><strong>Check-Out:</strong> ${exc.checkOut}</td>
                        <td style="font-size: 11px; color: #b91c1c;"><strong>Issue:</strong> ${exc.issue}</td>
                      </tr>
                    </table>

                    ${exc.systemObservation ? `
                      <div style="font-size: 11px; color: #64748b; margin-top: 8px; font-style: italic;">
                        Obs: ${exc.systemObservation}
                      </div>
                    ` : ''}

                    ${remarkHtml}

                    <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 11px;">
                      <a href="${dashboardUrl}" style="color: #07563D; font-weight: 700; text-decoration: none; margin-right: 14px;">Review Attendance →</a>
                      <a href="${dashboardUrl}" style="color: #2563eb; font-weight: 700; text-decoration: none; margin-right: 14px;">+ Add Remark</a>
                      <a href="${dashboardUrl}" style="color: #059669; font-weight: 700; text-decoration: none;">Approve Correction</a>
                    </div>
                  </div>
                `;
              }).join('');

              return `
                <div style="margin-left: 14px; margin-bottom: 16px;">
                  <div style="font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;">
                    ↳ ${sup.supervisorRole}: <strong>${sup.supervisorName}</strong> (Team Size: ${sup.teamSize} • Issues: ${sup.attendanceIssues})
                  </div>
                  ${exceptionsHtml}
                </div>
              `;
            }).join('');

            return `
              <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
                  👔 Manager: <strong style="color: #07563D;">${mgr.managerName}</strong> &nbsp;
                  <span style="font-size: 11px; font-weight: 600; color: #64748b;">(Team Size: ${mgr.teamSize} • Attendance Issues: ${mgr.attendanceIssues})</span>
                </div>
                ${supervisorsHtml}
              </div>
            `;
          }).join('');

          return `
            <div style="margin-bottom: 28px;">
              <div style="font-size: 15px; font-weight: 800; color: #064e3b; letter-spacing: -0.3px; margin-bottom: 12px; text-transform: uppercase;">
                🏢 Department: ${dept.department}
              </div>
              ${managersHtml}
            </div>
          `;
        }).join('')
      : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Attendance MIS Report</title>
</head>
<body style="margin: 0; padding: 32px 0; background-color: #0f172a; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.1);">
    
    <!-- Top Modern Hero Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #064e3b 0%, #07563D 50%, #022c22 100%); padding: 36px 32px 32px 32px; text-align: left; position: relative;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; padding: 5px 14px;">
                    <span style="font-size: 11px; font-weight: 800; color: #6ee7b7; text-transform: uppercase; letter-spacing: 1.2px;">
                      ⚡ WORKFORCE MANAGEMENT INFORMATION SYSTEM (MIS)
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.6px; line-height: 1.2;">
                Daily Attendance &amp; Operations Briefing
              </h1>
              <div style="margin-top: 8px; font-size: 13px; color: #a7f3d0; line-height: 1.5;">
                Target Scope: <strong style="color: #ffffff;">${params.scopeDescription}</strong> • Report Date: <strong style="color: #ffffff;">${params.reportDate}</strong>
              </div>
            </td>
            <td align="right" valign="top" style="width: 80px;">
              <div style="width: 52px; height: 52px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; text-align: center; line-height: 52px; font-size: 24px;">
                📊
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content Area -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; background: #ffffff;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 700;">
          Dear ${params.recipientName} (${params.recipientRoleTitle}),
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; line-height: 1.6;">
          Below is the verified biometric, mobile GPS, and turnstile attendance summary for your operational squad for <strong>${params.reportDate}</strong>.
        </p>

        <!-- Attendance Rate Visual Bar & Executive KPI Grid -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; margin-bottom: 28px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
            <tr>
              <td style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.8px;">
                Workforce Attendance Adherence
              </td>
              <td align="right" style="font-size: 18px; font-weight: 800; color: #047857;">
                ${params.attendancePercentage}% Present
              </td>
            </tr>
          </table>
          <div style="background: #cbd5e1; border-radius: 999px; height: 10px; width: 100%; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #10b981, #047857); height: 100%; width: ${Math.min(100, Math.max(0, params.attendancePercentage))}%; border-radius: 999px;"></div>
          </div>

          <!-- 4 KPI Badges Grid -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 18px;">
            <tr>
              <td width="23%" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Strength</div>
                <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${params.totalStrength}</div>
              </td>
              <td width="2%"></td>
              <td width="25%" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase;">Present (${params.attendancePercentage}%)</div>
                <div style="font-size: 22px; font-weight: 800; color: #047857; margin-top: 4px;">${params.presentCount}</div>
              </td>
              <td width="2%"></td>
              <td width="23%" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase;">Late Arrivals</div>
                <div style="font-size: 22px; font-weight: 800; color: #b45309; margin-top: 4px;">${params.lateCount}</div>
              </td>
              <td width="2%"></td>
              <td width="23%" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Absent / Off</div>
                <div style="font-size: 22px; font-weight: 800; color: #dc2626; margin-top: 4px;">${params.absentCount}</div>
              </td>
            </tr>
          </table>
          <div style="margin-top: 12px; padding: 6px 12px; background: rgba(255,255,255,0.7); border-radius: 8px; text-align: center; font-size: 11px; color: #475569; font-weight: 600;">
            🏠 Remote / WFH: <strong style="color: #0f172a;">${params.wfhCount}</strong> &nbsp;•&nbsp; 🌴 Approved Leaves: <strong style="color: #0f172a;">${params.onLeaveCount}</strong> &nbsp;•&nbsp; ⏱️ Punctual On-Time: <strong style="color: #047857;">${Math.max(0, params.presentCount - params.lateCount)}</strong>
          </div>
        ${params.pdfAttachmentBase64 ? `
        <!-- PDF Attachment Notification Banner -->
        <div style="margin-bottom: 24px; padding: 14px 18px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 14px; box-shadow: 0 2px 6px rgba(22, 101, 52, 0.06);">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width: 44px; vertical-align: middle;">
                <div style="width: 40px; height: 40px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                  📄
                </div>
              </td>
              <td style="padding-left: 14px; vertical-align: middle;">
                <div style="font-size: 13px; font-weight: 800; color: #166534; letter-spacing: -0.2px;">
                  📎 Print-Ready PDF Attachment Included (${params.pdfFilename || `Attendance-Miss-Report-${params.reportDate.replace(/\s+/g, '-')}.pdf`})
                </div>
                <div style="font-size: 11px; color: #15803d; margin-top: 3px; line-height: 1.4;">
                  An authoritative vector A4 PDF report is attached to this email for instant one-click printing, physical signing, and official audit compliance.
                </div>
              </td>
            </tr>
          </table>
        </div>
        ` : ''}

        ${hierarchicalGroupsHtml ? `
        <!-- Compact Executive Summary Table -->
        <div style="margin-bottom: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
            <tr style="background: #064e3b; color: #ffffff;">
              <th style="padding: 10px 14px; font-size: 11px; text-align: left; font-weight: 800; letter-spacing: 0.5px;">EXECUTIVE ATTENDANCE METRIC</th>
              <th style="padding: 10px 14px; font-size: 11px; text-align: right; font-weight: 800; letter-spacing: 0.5px;">COUNT</th>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Scheduled Employees</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #0f172a;">${params.scheduledEmployees || params.totalStrength}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Attendance Recorded</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #059669;">${params.attendanceRecorded || params.presentCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Attendance Missing</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #dc2626;">${params.attendanceMissingCount !== undefined ? params.attendanceMissingCount : params.absentCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Missing Check-In</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #d97706;">${params.missingCheckInCount !== undefined ? params.missingCheckInCount : 0}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Missing Check-Out</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #ea580c;">${params.missingCheckOutCount !== undefined ? params.missingCheckOutCount : 0}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Late Attendance</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #b45309;">${params.lateCount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Pending Review</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #6d28d9;">${params.pendingReviewCount !== undefined ? params.pendingReviewCount : 0}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Approved Exceptions (Leaves)</td>
              <td style="padding: 9px 14px; font-size: 12px; font-weight: 700; text-align: right; color: #2563eb;">${params.approvedExceptionsCount !== undefined ? params.approvedExceptionsCount : params.onLeaveCount}</td>
            </tr>
          </table>
        </div>

        <!-- Hierarchical Escalation Breakdown (Department -> Manager -> TL/Supervisor -> Employee) -->
        <div style="margin-bottom: 32px;">
          <div style="font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; margin-bottom: 4px;">
            🏢 Hierarchical Exception Breakdown
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 18px;">
            Organized by Department, Responsible Manager, and Team Lead supervisor squads
          </div>
          ${hierarchicalGroupsHtml}
        </div>
        ` : `
        <!-- Section 1: Late Arrivals Detail Breakdown -->
        <div style="margin-bottom: 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
            <tr>
              <td>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                  ⏰ Late Arrivals Attention Registry (${params.lateCount})
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  Employees exceeding shift grace thresholds requiring supervisor review
                </div>
              </td>
            </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">EMPLOYEE &amp; CODE</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">DEPARTMENT</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">ACTUAL PUNCH</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">DEVIATION</th>
              </tr>
            </thead>
            <tbody>
              ${lateRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Section 2: Unplanned Absences Detail Breakdown -->
        <div style="margin-bottom: 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
            <tr>
              <td>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                  ❌ Unplanned Absences &amp; Missing Punches (${params.absentCount})
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  Rostered employees with no clock-in and no approved leave ticket on file
                </div>
              </td>
            </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">EMPLOYEE &amp; CODE</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">DEPARTMENT</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">ASSIGNED SHIFT</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">EXCEPTION REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${absentRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Section 3: Approved Scheduled Leaves Breakdown -->
        <div style="margin-bottom: 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
            <tr>
              <td>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                  🌴 Approved Scheduled Leaves &amp; Out of Office (${params.onLeaveCount})
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                  Authorized leaves approved by Reporting Managers in Joy PeopleHR
                </div>
              </td>
            </tr>
          </table>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">EMPLOYEE &amp; CODE</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">DEPARTMENT</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">LEAVE CATEGORY</th>
                <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0;">DURATION</th>
              </tr>
            </thead>
            <tbody>
              ${leaveRowsHtml}
            </tbody>
          </table>
        </div>
        `}

        <!-- Interactive CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 32px auto 12px auto;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #064e3b, #07563D); border-radius: 14px; box-shadow: 0 6px 18px rgba(7, 86, 61, 0.35);">
              <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 15px 40px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                Open Supervisor Attendance Console →
              </a>
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px;">
          Approve pending regularizations or modify shift rosters directly from the console.
        </div>
      </td>
    </tr>

    <!-- Modern Compliance Footer -->
    <tr>
      <td style="padding: 22px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0; font-weight: 600; color: #475569;">© ${new Date().getFullYear()} ${orgName} • Automated Workforce MIS Dispatcher</p>
        <p style="margin: 4px 0 0 0; color: #94a3b8;">
          This is an automated operational briefing delivered to designated Team Leads &amp; Reporting Managers.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const subject = `[MIS Attendance] ${params.reportDate} Summary — ${params.scopeDescription} (${params.presentCount}/${params.totalStrength} Present, ${params.lateCount} Late)`;

    const attachments = params.pdfAttachmentBase64
      ? [
          {
            filename:
              params.pdfFilename ||
              `JoyPeopleHR-Attendance-Miss-Report-${params.reportDate.replace(/\s+/g, '-')}.pdf`,
            content: params.pdfAttachmentBase64,
          },
        ]
      : undefined;

    return this.sendEmail({
      to: params.to,
      subject,
      html,
      attachments,
    });
  }

  /**
   * Dispatches the Complete Monthly Attendance and Overtime Reconciliation Excel Package
   * Features executive HTML context, KPI summary cards, OT policy breakdown, and attached .xlsx workbook.
   */
  async sendAttendanceReconciliationReportEmail(params: AttendanceReconEmailParams): Promise<EmailDeliveryResponse> {
    const subject = `[Official Dispatch] Monthly Attendance & OT Reconciliation Pack — ${params.vendorName} (${params.periodLabel})`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance &amp; OT Reconciliation Report</title>
</head>
<body style="margin: 0; padding: 28px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08);">
    <!-- Brand Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #064E3B 0%, #047857 100%); padding: 32px 28px; text-align: left; color: #ffffff;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #6ee7b7; margin-bottom: 6px;">
                ENTERPRISE WORKFORCE GOVERNANCE
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.2;">
                Monthly Attendance &amp; Overtime Reconciliation
              </h1>
              <div style="font-size: 13px; color: #d1fae5; margin-top: 6px; font-weight: 500;">
                Cycle: <strong>${params.periodLabel}</strong> • Verified Exact 3-Sheet Package Attached
              </div>
            </td>
            <td align="right" valign="top" style="padding-left: 12px;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; padding: 6px 14px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                Verified Audit Pack
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Operational Scope Metadata Strip -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 28px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-right: 12px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Authorized Vendor Agency</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${params.vendorName}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Vendor Code: ${params.vendorCode || 'VEN-JOY-001'}${params.contractPo ? ` • PO: ${params.contractPo}` : ''}</div>
            </td>
            <td width="50%" style="padding-left: 12px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Connected Client &amp; Facility</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${params.clientCompanyName}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 1px;">${params.siteName}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
          Dear <strong>Vendor Management &amp; Operations Team</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #475569; line-height: 1.6;">
          Please find attached the official <strong>3-Sheet Complete Attendance and Overtime Reconciliation Workbook</strong> for the operational period <strong>${params.periodLabel}</strong>.
          This package has undergone authoritative cross-sheet auditing between gate biometric punches, monthly muster roll registers, and supervisor-authorized overtime logs.
        </p>

        ${params.customMessage ? `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #065f46; border-radius: 4px;">
          <strong>Operations Note:</strong> ${params.customMessage}
        </div>
        ` : ''}

        <!-- KPI Grid -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">Master Workforce</div>
              <div style="font-size: 22px; font-weight: 900; color: #14532d; margin-top: 4px;">${params.totalWorkers} Workers</div>
              <div style="font-size: 11px; color: #15803d; margin-top: 2px;">${params.activeWorkers} Active • ${params.totalWorkers - params.activeWorkers} Leave</div>
            </td>
            <td width="2%"></td>
            <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;">Attendance Records</div>
              <div style="font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 4px;">${params.totalRecords.toLocaleString()} Rows</div>
              <div style="font-size: 11px; color: #2563eb; margin-top: 2px;">Daily Biometric Shifts</div>
            </td>
            <td width="2%"></td>
            <td width="32%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 14px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; letter-spacing: 0.5px;">Total Overtime</div>
              <div style="font-size: 22px; font-weight: 900; color: #78350f; margin-top: 4px;">${params.totalOtHours.toLocaleString()} hrs</div>
              <div style="font-size: 11px; color: #b45309; margin-top: 2px;">${params.otEmployeesCount} Staff Active</div>
            </td>
          </tr>
        </table>

        <!-- Dedicated Overtime Policy Banner -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #a7f3d0; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.8px;">
                ⚡ Overtime Calculation Policy &amp; Commercial Norm
              </div>
              <div style="font-size: 15px; font-weight: 900; color: #064e3b; margin-top: 4px;">
                ${params.activeOtPolicyName} ${params.activeOtMultiplier ? `(${params.activeOtMultiplier}x Dynamic Multiplier)` : ''}
              </div>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 10px; font-size: 12px; color: #047857;">
                <tr>
                  <td width="33%">
                    <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Active Hourly Rate</div>
                    <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">₹${params.activeOtHourlyRate.toFixed(2)}/hr</div>
                  </td>
                  <td width="33%">
                    <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total OT Disbursable</div>
                    <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">₹${params.totalOtDisbursableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td width="34%">
                    <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Statutory Standard</div>
                    <div style="font-size: 15px; font-weight: 900; color: #065f46; margin-top: 2px;">Factories Act 2.0x Standard</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Attachment Highlight Box -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 2px dashed #059669; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
          <tr>
            <td width="48" valign="middle" align="center" style="padding-right: 14px;">
              <div style="width: 44px; height: 44px; background-color: #059669; border-radius: 10px; text-align: center; line-height: 44px; font-size: 22px; color: #ffffff;">
                📊
              </div>
            </td>
            <td valign="middle">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; letter-spacing: 0.5px;">Attached Excel File</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${params.excelFilename || 'JoyManpower_Complete_3Sheet_Attendance_OT_Reconciliation.xlsx'}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Complete 3-Sheet Workbook with IN&amp;OUT, MR REPORT, and Overtime registers
              </div>
              <div style="font-size: 11px; color: #047857; font-weight: 600; margin-top: 4px;">
                ✓ Sheet 1: IN&amp;OUT (${params.totalRecords} rows) • ✓ Sheet 2: MR REPORT (${params.totalWorkers} employees) • ✓ Sheet 3: OT (${params.otEmployeesCount} employees, ${params.totalOtHours} hrs)
              </div>
            </td>
          </tr>
        </table>

        <!-- Cross-Sheet Audit & Compliance Status -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-size: 12px; color: #334155;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px;">Auditing &amp; Statutory Compliance Summary:</div>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #475569;">
            <li><strong>${params.matchedCount} of ${params.totalWorkers} Employees:</strong> Biometric punch count exactly equals declared muster days (100% matched).</li>
            <li><strong>Documented Policy Variances (${params.documentedVariancesCount} Employees):</strong> Verified with supervisor On-Duty (OD) authorization slips.</li>
            <li><strong>Quarterly OT Ceiling:</strong> Complies with 115 hours statutory limit under Factories Act Sec. 59.</li>
          </ul>
        </div>

        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          This report is generated directly by the <strong>Joy PeopleHR Authoritative Attendance &amp; OT Engine</strong>. For questions or adjustments, please contact HR Operations or reply directly to this thread.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #0f172a; padding: 22px 28px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
        <div style="font-weight: 700; color: #ffffff; font-size: 12px; margin-bottom: 4px;">JOY PEOPLEHR ENTERPRISE SUITE</div>
        <div>Modern HR &amp; Workforce Management Platform • Coimbatore, India</div>
        <div style="color: #64748b; margin-top: 6px;">
          Confidential operational transmission intended solely for the designated recipient(s).
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const attachments = params.excelAttachmentBase64
      ? [
          {
            filename: params.excelFilename || `JoyPeopleHR-Attendance-OT-Recon-${params.periodLabel.replace(/\s+/g, '-')}.xlsx`,
            content: params.excelAttachmentBase64,
          },
        ]
      : undefined;

    return this.sendEmail({
      to: params.to,
      subject,
      html,
      attachments,
    });
  }

  /**
   * Dispatches the official monthly employee payslip via business email
   * with the exact same canonical PDF attached.
   */
  async sendEmployeePayslipEmail(params: {
    to: string;
    employeeName: string;
    employeeCode: string;
    periodLabel: string;
    netPay: string;
    grossPay?: string;
    bankName?: string;
    accountMasked?: string;
    pdfBuffer?: Buffer | Uint8Array;
    pdfBase64?: string;
    pdfFilename?: string;
    companyName?: string;
  }): Promise<EmailDeliveryResponse> {
    const company = params.companyName || 'Joy Corporate Solutions Pvt. Ltd.';
    const subject = `Official Salary Payslip — ${params.periodLabel} | ${params.employeeName} (${params.employeeCode})`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(15,23,42,0.06);">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f2d59; padding: 24px 28px; color: #ffffff;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #38bdf8;">JOY PEOPLEHR ENTERPRISE</div>
        <div style="font-size: 18px; font-weight: 900; margin-top: 4px;">Salary Payslip — ${params.periodLabel}</div>
        <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">${company}</div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 24px 28px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.5;">
          Dear <strong>${params.employeeName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #475569; line-height: 1.6;">
          Your official salary payslip for <strong>${params.periodLabel}</strong> has been published and finalized by HR &amp; Finance Operations. Please find your official digitally signed PDF payslip attached to this email.
        </p>

        <!-- Summary Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b;">Employee ID / Code:</span>
              <strong style="float: right; color: #0f172a; font-family: monospace;">${params.employeeCode}</strong>
            </td>
          </tr>
          ${params.grossPay ? `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b;">Gross Monthly Earnings:</span>
              <strong style="float: right; color: #0f172a; font-family: monospace;">₹${params.grossPay}</strong>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #ecfdf5;">
              <span style="color: #047857; font-weight: 800;">Net Take-Home Salary:</span>
              <strong style="float: right; color: #065f46; font-size: 15px; font-family: monospace;">₹${params.netPay}</strong>
            </td>
          </tr>
          ${params.bankName ? `
          <tr>
            <td style="padding: 12px 16px;">
              <span style="color: #64748b;">Disbursed To Account:</span>
              <strong style="float: right; color: #0f172a; font-family: monospace;">${params.bankName} (${params.accountMasked || '•••• •••• 7890'})</strong>
            </td>
          </tr>` : ''}
        </table>

        <!-- Attachment Notice -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #1e3a8a;">
          📎 <strong>Attached Document:</strong> <code>${params.pdfFilename || `JoyPeopleHR_Payslip_${params.employeeCode}_${params.periodLabel.replace(/\s+/g, '_')}.pdf`}</code>
          <div style="margin-top: 4px; font-size: 11px; color: #3b82f6;">This PDF document is encrypted and cryptographically sealed for statutory compliance.</div>
        </div>

        <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
          If you have any questions regarding your salary computation or tax deductions, please reach out to your HR Operations team or access the Joy PeopleHR Employee Portal.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #0f172a; padding: 18px 28px; text-align: center; color: #94a3b8; font-size: 11px;">
        <div style="font-weight: 700; color: #ffffff;">JOY CORPORATE SOLUTIONS PVT. LTD.</div>
        <div>WorkforceOS Enterprise HRMS • Automated Payroll &amp; Compliance</div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const attachments = params.pdfBase64 || params.pdfBuffer
      ? [
          {
            filename: params.pdfFilename || `JoyPeopleHR_Payslip_${params.employeeCode}_${params.periodLabel.replace(/\s+/g, '_')}.pdf`,
            content: params.pdfBase64 || (params.pdfBuffer ? Buffer.from(params.pdfBuffer).toString('base64') : ''),
          },
        ]
      : undefined;

    return this.sendEmail({
      to: params.to,
      subject,
      html,
      attachments,
    });
  }
}

export const resendEmailService = new ResendEmailService();
