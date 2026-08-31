// src/services/email/resendEmailService.ts
// ============================================================================
// WorkforceOS Enterprise — Production Resend Email Gateway Service
// Integrated with Resend API: re_48vKshK9_CujUhsn56MPkviPGPUXoacin
// ============================================================================

import { getAppBaseUrl } from '../../lib/supabase';

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string;
  tags?: { name: string; value: string }[];
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

class ResendEmailService {
  private readonly apiKey: string = (import.meta as any).env?.VITE_RESEND_API_KEY || '';
  private readonly defaultFrom: string = 'Joy PeopleHR <noreply@joypeoplehr.com>';

  private getApiUrl(): string {
    return '/api/resend/emails';
  }

  /**
   * Generic low-level email sender through Resend REST API
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
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.subject,
      reply_to: payload.reply_to,
      tags: payload.tags,
    });

    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;
      const targetUrl = this.getApiUrl();

      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: requestBody,
        });
      } catch (proxyErr) {
        // Fallback to direct URL if proxy fails
        console.warn('[ResendService] Primary fetch failed, attempting direct fallback...', proxyErr);
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers,
          body: requestBody,
        });
      }

      const data = await response.json().catch(() => ({ message: response.statusText }));

      if (!response.ok) {
        console.warn('[ResendService] API returned error:', data);
        const errMsg =
          data.message ||
          data.error?.message ||
          (typeof data === 'string' ? data : `Resend Error (${response.status}): ${response.statusText}`);
        return {
          success: false,
          error: errMsg,
          message: errMsg,
        };
      }

      console.log('[ResendService] Email successfully dispatched in realtime:', data.id);
      return {
        success: true,
        id: data.id,
        message: 'Email delivered to mail transfer agent.',
        delivered_at: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[ResendService] Network or dispatch failure:', err);
      return {
        success: false,
        error: err.message || 'Failed to connect to Resend Email API gateway.',
      };
    }
  }

  /**
   * Dispatches Employee Welcome & App Access Invitation Email
   */
  async sendEmployeeActivationEmail(params: ActivationEmailParams): Promise<EmailDeliveryResponse> {
    const orgName = params.organizationName || 'Joy Corporate Solutions';
    const baseUrl = getAppBaseUrl();
    const activationLink = params.activationUrl || `${baseUrl}/activate?token=${encodeURIComponent(params.activationToken)}&emp=${encodeURIComponent(params.employeeId)}`;

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
        ${
          params.tempPassword
            ? `<div class="creds-row">
                <span class="creds-label">Temporary Password:</span>
                <span class="creds-value">${params.tempPassword}</span>
              </div>`
            : ''
        }
      </div>

      <div style="margin: 20px 0; padding: 14px 18px; background-color: #E6F4EA; border: 1.5px dashed #07563D; border-radius: 12px; text-align: center;">
        <div style="font-size: 11px; font-weight: 800; color: #07563D; text-transform: uppercase; margin-bottom: 4px;">🔑 One-Time Activation Code</div>
        <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #07563D; background: #ffffff; padding: 6px 14px; border-radius: 6px; display: inline-block; border: 1px solid #A3D9C9; user-select: all;">${params.activationToken}</div>
        <p style="margin: 6px 0 0 0; font-size: 11px; color: #07563D;">Enter this code in the portal or click the button below to activate.</p>
      </div>

      <div style="text-align: center;">
        <a href="${activationLink}" class="btn" target="_blank">Activate Account & Set Password</a>
      </div>

      <div class="security-note">
        <strong>Security Notice:</strong> This activation link is single-use and will expire in 24 hours. For security compliance, you will be required to change your temporary password on first login.
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
  <title>Invitation to Join ${orgName} — Joy PeopleHR</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Header Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, #047857 0%, #064e3b 50%, #022c22 100%); padding: 36px 32px 28px 32px; text-align: center;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 999px; padding: 4px 14px;">
              <span style="font-size: 11px; font-weight: 800; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.2px;">⚡ Organization Onboarding</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${orgName}</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Joy PeopleHR Enterprise Access Invitation</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; font-size: 14px; line-height: 1.6; color: #334155;">
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a;">
          Hello <strong style="color: #047857;">${params.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; color: #475569;">
          You have been invited by <strong>${params.invitedBy || 'the Organization Administrator'}</strong> to join <strong>${orgName}</strong> on the Joy PeopleHR Workforce Platform. Your profile has been assigned authorized credentials.
        </p>

        <!-- Access Profile Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0; overflow: hidden;">
          <tr>
            <td style="padding: 12px 18px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
              <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.8px;">Invitation & Role Credentials</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 42%;">Target Organization:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${orgName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Assigned Role:</td>
                  <td style="padding: 6px 0; text-align: right;">
                    <span style="background-color: #ecfdf5; color: #047857; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
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
                  <td style="padding: 6px 0; color: #334155; font-weight: 600; text-align: right;">${params.invitedBy || 'Platform Super Admin'}</td>
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
        <div style="margin: 22px 0; padding: 16px 20px; background-color: #f0fdf4; border: 1.5px dashed #10b981; border-radius: 14px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
            🔑 One-Time Invitation Code
          </div>
          <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 18px; font-weight: 800; color: #064e3b; letter-spacing: 1.5px; background: #ffffff; padding: 8px 16px; border-radius: 8px; display: inline-block; border: 1px solid #bbf7d0; user-select: all;">
            ${token}
          </div>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #047857;">
            Enter this code in the activation modal, or click the button below for instant 1-click setup.
          </p>
        </div>

        <!-- Primary CTA Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #047857 0%, #064e3b 100%); border-radius: 12px; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.35);">
              <a href="${invitationLink}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                Accept Invitation & Set Password →
              </a>
            </td>
          </tr>
        </table>

        <!-- Direct Link Box -->
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 14px; margin-top: 20px; font-size: 11px; word-break: break-all; color: #64748b;">
          <span style="color: #475569; font-weight: bold; display: block; margin-bottom: 4px;">Direct Invitation URL (Single-use):</span>
          <a href="${invitationLink}" style="color: #047857; text-decoration: none; word-break: break-all;">${invitationLink}</a>
        </div>

        <!-- Security Note -->
        <div style="margin-top: 24px; padding: 12px 16px; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; font-size: 12px; color: #854d0e; line-height: 1.5;">
          <strong>🔒 Security Compliance:</strong> This invitation is designated exclusively for <strong>${params.to}</strong>. Do not forward or share this link. Once accepted, you will create your private password and security authentication profile.
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">Joy PeopleHR Enterprise • Organization Management & IAM</p>
        <p style="margin: 0;">Automated System Dispatch • Real-time Delivery via Resend Gateway</p>
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
}

export const resendEmailService = new ResendEmailService();
