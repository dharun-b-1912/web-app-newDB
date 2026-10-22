// src/services/notification/universalNotificationEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise Universal Multi-Tenant Notification Rules Engine
// Dynamically orchestrates multi-channel dispatches across:
//   1. In-App Realtime Stream (Supabase notification_events)
//   2. Email (Hostinger Enterprise SMTP / Resend)
//   3. WhatsApp (Meta Cloud Business API & 2-Way Bot)
//   4. SMS (Airtel IQ TRAI DLT Prepaid Gateway)
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { resendEmailService } from '../email/resendEmailService';
import { whatsAppClient } from '../whatsapp/whatsappClient';
import { AirtelSmsClient } from '../communications/airtelSmsClient';

export type NotificationModule =
  | 'ATTENDANCE'
  | 'LEAVE'
  | 'PAYROLL'
  | 'IAM'
  | 'COMPLIANCE'
  | 'OVERTIME';

export type RecipientTarget =
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'HR_HEAD'
  | 'COMPANY_ADMIN'
  | 'DEPT_HEAD';

export type NotificationPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface NotificationRule {
  id: string;
  organization_id: string;
  rule_name: string;
  module: NotificationModule;
  event_trigger: string;
  description?: string;

  // Channel toggles
  enable_in_app: boolean;
  enable_email: boolean;
  enable_whatsapp: boolean;
  enable_sms: boolean;

  // Recipient routing
  target_recipients: RecipientTarget[];
  specific_user_ids?: string[];

  // Message templates
  subject_template?: string;
  body_template: string;
  whatsapp_template_name?: string;
  sms_dlt_template_id?: string;

  // Delivery controls
  priority: NotificationPriority;
  quiet_hours_respect: boolean;
  is_active: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface NotificationTriggerPayload {
  organizationId: string;
  eventTrigger: string;
  module?: NotificationModule;
  actorId?: string;
  actorName?: string;
  variables: Record<string, any>;
  recipients?: {
    employeeId?: string;
    employeeName?: string;
    email?: string;
    phone?: string;
    userId?: string;
    role?: string;
  }[];
  actionUrl?: string;
}

export interface ChannelDeliveryStatus {
  channel: 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'SMS';
  enabled: boolean;
  success: boolean;
  messageId?: string;
  error?: string;
  skippedReason?: string;
}

export interface NotificationDispatchResult {
  ruleId: string;
  ruleName: string;
  eventTrigger: string;
  dispatchedAt: string;
  channels: ChannelDeliveryStatus[];
  summary: string;
}

// Canonical organization fallback ID (Joy Corporate Solutions)
const CANONICAL_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

// Standard Pre-Seeded Default Rules for Multi-Tenant Provisioning
const DEFAULT_RULES: NotificationRule[] = [
  {
    id: 'rule-att-late',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Late Punch Notification',
    module: 'ATTENDANCE',
    event_trigger: 'PUNCH_LATE',
    description: 'Alert employee immediately when check-in punch occurs after designated shift start.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Attendance Notice: Late Punch Recorded on {{date}}',
    body_template: 'Hello {{employee_name}}, you clocked in at {{time}} today. Your regular shift start was {{shift_start}}. Please contact HR or apply for regularization if required.',
    priority: 'NORMAL',
    quiet_hours_respect: true,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-att-missing',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Missing Punch Escalation',
    module: 'ATTENDANCE',
    event_trigger: 'PUNCH_MISSING',
    description: 'Escalate to employee and manager when an expected punch-out is missing at shift end.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE', 'MANAGER'],
    subject_template: 'Action Required: Missing Punch Recorded on {{date}}',
    body_template: 'Missing punch recorded for {{employee_name}} ({{employee_code}}) on {{date}}. Please regularize your attendance punch within 24 hours to prevent LOP.',
    priority: 'HIGH',
    quiet_hours_respect: true,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-leave-applied',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Leave Application Submitted',
    module: 'LEAVE',
    event_trigger: 'LEAVE_APPLIED',
    description: 'Notify reporting manager and HR head immediately when an employee requests leave.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['MANAGER', 'HR_HEAD'],
    subject_template: 'New Leave Request: {{employee_name}} ({{leave_type}})',
    body_template: '{{employee_name}} has applied for {{leave_type}} from {{start_date}} to {{end_date}} ({{days}} days). Reason: {{reason}}. Click here to review: {{action_url}}',
    priority: 'HIGH',
    quiet_hours_respect: false,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-leave-approved',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Leave Request Approved',
    module: 'LEAVE',
    event_trigger: 'LEAVE_APPROVED',
    description: 'Dispatch approval confirmation across In-App, Email, and WhatsApp to employee.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Leave Approved: {{leave_type}} ({{start_date}} to {{end_date}})',
    body_template: 'Great news {{employee_name}}! Your {{leave_type}} request for {{days}} days ({{start_date}} to {{end_date}}) has been approved by {{approver_name}}.',
    priority: 'NORMAL',
    quiet_hours_respect: true,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-leave-rejected',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Leave Request Rejected',
    module: 'LEAVE',
    event_trigger: 'LEAVE_REJECTED',
    description: 'Notify employee with reason when a leave request is rejected.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Leave Request Status: Rejected for {{leave_type}}',
    body_template: 'Hello {{employee_name}}, your {{leave_type}} request from {{start_date}} to {{end_date}} was not approved. Remarks: {{remarks}}.',
    priority: 'HIGH',
    quiet_hours_respect: false,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-payroll-payslip',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Monthly Payslip Published',
    module: 'PAYROLL',
    event_trigger: 'PAYSLIP_PUBLISHED',
    description: 'Notify employee that digital payslip is generated and ready for secure download.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Your Payslip for {{month_year}} is Ready',
    body_template: 'Dear {{employee_name}}, your payslip for {{month_year}} is now available with net pay of {{net_pay}}. Access your portal to download the digital receipt: {{action_url}}',
    priority: 'NORMAL',
    quiet_hours_respect: true,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-payroll-salary',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Salary Credited Alert',
    module: 'PAYROLL',
    event_trigger: 'SALARY_CREDITED',
    description: 'Send multi-channel credit alert (including SMS & WhatsApp) when payroll is disbursed.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: true,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Salary Disbursed for {{month_year}} — {{organization_name}}',
    body_template: 'Dear {{employee_name}}, salary for {{month_year}} (Net: {{net_pay}}) has been processed to your bank account. Thank you for your hard work!',
    priority: 'HIGH',
    quiet_hours_respect: false,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-iam-invite',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Staff Invitation & Credential Delivery',
    module: 'IAM',
    event_trigger: 'STAFF_INVITATION',
    description: 'Send enterprise welcome invitation with secure login link and credentials.',
    enable_in_app: false,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['EMPLOYEE'],
    subject_template: 'Welcome to {{organization_name}} — Set Up Your Workspace Account',
    body_template: 'Welcome {{employee_name}}! You have been granted access to Joy PeopleHR under {{organization_name}}. Please activate your account here: {{action_url}}',
    priority: 'HIGH',
    quiet_hours_respect: false,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-iam-security',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Security Alert: MFA & Password Change',
    module: 'IAM',
    event_trigger: 'SECURITY_ALERT_MFA',
    description: 'High-priority alert across SMS and Email when security credentials change.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: false,
    enable_sms: true,
    target_recipients: ['EMPLOYEE', 'COMPANY_ADMIN'],
    subject_template: 'SECURITY ALERT: Account Credential Modified for {{employee_name}}',
    body_template: 'Security Notice: A password or MFA token modification occurred on your account at {{time}} on {{date}}. If this was not you, lock your account immediately.',
    priority: 'HIGH',
    quiet_hours_respect: false,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
  {
    id: 'rule-ot-variance',
    organization_id: CANONICAL_ORG_ID,
    rule_name: 'Overtime Variance & Compliance Exceeded',
    module: 'OVERTIME',
    event_trigger: 'OT_VARIANCE_DETECTED',
    description: 'Alert department head and HR when employee overtime exceeds statutory thresholds.',
    enable_in_app: true,
    enable_email: true,
    enable_whatsapp: true,
    enable_sms: false,
    target_recipients: ['MANAGER', 'HR_HEAD'],
    subject_template: 'OT Compliance Notice: Threshold Exceeded for {{employee_name}}',
    body_template: 'Overtime Alert: {{employee_name}} has exceeded the approved weekly OT limit (Current: {{days}} hrs). Please review shift scheduling.',
    priority: 'NORMAL',
    quiet_hours_respect: true,
    is_active: true,
    created_at: '2026-10-22T00:00:00.000Z',
    updated_at: '2026-10-22T00:00:00.000Z',
  },
];

const LOCAL_STORAGE_KEY = 'joy_notification_rules_v1';

export class UniversalNotificationEngine {
  private static instance: UniversalNotificationEngine;

  private constructor() {}

  public static getInstance(): UniversalNotificationEngine {
    if (!UniversalNotificationEngine.instance) {
      UniversalNotificationEngine.instance = new UniversalNotificationEngine();
    }
    return UniversalNotificationEngine.instance;
  }

  /**
   * Helper to load cached rules from browser localStorage
   */
  private getLocalRules(orgId: string): NotificationRule[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${orgId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    // Fallback to defaults
    return DEFAULT_RULES.map(r => ({ ...r, organization_id: orgId }));
  }

  /**
   * Helper to persist rules to browser localStorage
   */
  private setLocalRules(orgId: string, rules: NotificationRule[]): void {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${orgId}`, JSON.stringify(rules));
    } catch {}
  }

  /**
   * Fetch all notification rules for a tenant.
   * Gracefully queries PostgreSQL `public.notification_rules` and falls back
   * seamlessly to local state if migration is pending.
   */
  public async getRules(orgId: string = CANONICAL_ORG_ID): Promise<NotificationRule[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('notification_rules')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          this.setLocalRules(orgId, data as NotificationRule[]);
          return data as NotificationRule[];
        }
      } catch (err) {
        console.warn('[NotificationEngine] Remote table fetch fallback to local cache:', err);
      }
    }

    return this.getLocalRules(orgId);
  }

  /**
   * Create a new notification rule.
   */
  public async createRule(rule: Partial<NotificationRule>): Promise<NotificationRule> {
    const orgId = rule.organization_id || CANONICAL_ORG_ID;
    const newRule: NotificationRule = {
      id: rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: orgId,
      rule_name: rule.rule_name || 'Custom Notification Rule',
      module: rule.module || 'ATTENDANCE',
      event_trigger: rule.event_trigger || `CUSTOM_${Date.now()}`,
      description: rule.description || '',
      enable_in_app: rule.enable_in_app ?? true,
      enable_email: rule.enable_email ?? true,
      enable_whatsapp: rule.enable_whatsapp ?? false,
      enable_sms: rule.enable_sms ?? false,
      target_recipients: rule.target_recipients || ['EMPLOYEE'],
      specific_user_ids: rule.specific_user_ids || [],
      subject_template: rule.subject_template || '',
      body_template: rule.body_template || '',
      whatsapp_template_name: rule.whatsapp_template_name,
      sms_dlt_template_id: rule.sms_dlt_template_id,
      priority: rule.priority || 'NORMAL',
      quiet_hours_respect: rule.quiet_hours_respect ?? true,
      is_active: rule.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update local state
    const rules = this.getLocalRules(orgId);
    rules.push(newRule);
    this.setLocalRules(orgId, rules);

    // Sync to Supabase if table is ready
    if (isSupabaseEnabled) {
      try {
        await supabase.from('notification_rules').insert([newRule]);
      } catch (err) {
        console.warn('[NotificationEngine] Could not persist rule to Supabase:', err);
      }
    }

    return newRule;
  }

  /**
   * Update an existing notification rule.
   */
  public async updateRule(id: string, updates: Partial<NotificationRule>, orgId: string = CANONICAL_ORG_ID): Promise<NotificationRule | null> {
    const rules = this.getLocalRules(orgId);
    const index = rules.findIndex(r => r.id === id);

    if (index === -1) return null;

    const updated: NotificationRule = {
      ...rules[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    rules[index] = updated;
    this.setLocalRules(orgId, rules);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('notification_rules')
          .update(updates)
          .eq('id', id);
      } catch (err) {
        console.warn('[NotificationEngine] Could not update rule in Supabase:', err);
      }
    }

    return updated;
  }

  /**
   * Fast toggle active state for a rule.
   */
  public async toggleRuleActive(id: string, isActive: boolean, orgId: string = CANONICAL_ORG_ID): Promise<boolean> {
    const result = await this.updateRule(id, { is_active: isActive }, orgId);
    return !!result;
  }

  /**
   * Delete a notification rule.
   */
  public async deleteRule(id: string, orgId: string = CANONICAL_ORG_ID): Promise<boolean> {
    const rules = this.getLocalRules(orgId);
    const filtered = rules.filter(r => r.id !== id);
    this.setLocalRules(orgId, filtered);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('notification_rules').delete().eq('id', id);
      } catch (err) {
        console.warn('[NotificationEngine] Could not delete rule in Supabase:', err);
      }
    }

    return true;
  }

  /**
   * Replace template variables like {{employee_name}}, {{date}}, etc.
   */
  public interpolateVariables(template: string, vars: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      if (vars[key] !== undefined && vars[key] !== null) {
        return String(vars[key]);
      }
      return `{{${key}}}`;
    });
  }

  /**
   * Get all registered variable tokens available for template composition
   */
  public getAvailableVariables(module?: NotificationModule): { token: string; label: string; sample: string }[] {
    const common = [
      { token: '{{employee_name}}', label: 'Employee Full Name', sample: 'Marimuthu Tirumalaikumar' },
      { token: '{{employee_code}}', label: 'Employee Code', sample: 'JCS-20' },
      { token: '{{organization_name}}', label: 'Organization Name', sample: 'Joy Corporate Solutions Pvt Ltd' },
      { token: '{{date}}', label: 'Current / Event Date', sample: new Date().toLocaleDateString('en-GB') },
      { token: '{{time}}', label: 'Current / Event Time', sample: '09:45 AM' },
      { token: '{{action_url}}', label: 'Portal Action Link', sample: 'https://app.joypeoplehr.com' },
    ];

    switch (module) {
      case 'ATTENDANCE':
        return [
          ...common,
          { token: '{{shift_start}}', label: 'Shift Start Time', sample: '09:00 AM' },
          { token: '{{shift_end}}', label: 'Shift End Time', sample: '06:00 PM' },
          { token: '{{late_by_mins}}', label: 'Minutes Late', sample: '45' },
        ];
      case 'LEAVE':
        return [
          ...common,
          { token: '{{leave_type}}', label: 'Leave Type', sample: 'Casual Leave' },
          { token: '{{start_date}}', label: 'Leave Start Date', sample: '23-Oct-2026' },
          { token: '{{end_date}}', label: 'Leave End Date', sample: '24-Oct-2026' },
          { token: '{{days}}', label: 'Total Leave Days', sample: '2' },
          { token: '{{reason}}', label: 'Reason for Leave', sample: 'Family Function' },
          { token: '{{approver_name}}', label: 'Approver Name', sample: 'Praveen Kumar' },
          { token: '{{remarks}}', label: 'Approval / Rejection Remarks', sample: 'Approved with full coverage' },
        ];
      case 'PAYROLL':
        return [
          ...common,
          { token: '{{month_year}}', label: 'Payroll Month', sample: 'October 2026' },
          { token: '{{net_pay}}', label: 'Net Salary Amount', sample: '₹48,500' },
          { token: '{{gross_pay}}', label: 'Gross Salary Amount', sample: '₹55,000' },
          { token: '{{bank_account}}', label: 'Masked Bank Account', sample: '•••• 4092' },
        ];
      case 'OVERTIME':
        return [
          ...common,
          { token: '{{days}}', label: 'Overtime Hours Recorded', sample: '4.5' },
          { token: '{{approver_name}}', label: 'Operations Lead', sample: 'Thirumalai' },
        ];
      default:
        return common;
    }
  }

  /**
   * Dispatches notifications for an event across all enabled channels.
   */
  public async dispatch(payload: NotificationTriggerPayload): Promise<NotificationDispatchResult | null> {
    const rules = await this.getRules(payload.organizationId);
    const rule = rules.find(r => r.event_trigger === payload.eventTrigger && r.is_active);

    if (!rule) {
      console.log(`[NotificationEngine] No active rule found for trigger: ${payload.eventTrigger}`);
      return null;
    }

    const subject = this.interpolateVariables(rule.subject_template || '', payload.variables);
    const body = this.interpolateVariables(rule.body_template, payload.variables);

    const channelStatuses: ChannelDeliveryStatus[] = [];

    // 1. IN_APP Channel Dispatch
    if (rule.enable_in_app) {
      try {
        const inAppTitle = subject || rule.rule_name;
        if (isSupabaseEnabled) {
          const { error } = await supabase.from('notification_events').insert([
            {
              organization_id: payload.organizationId,
              recipient_user_id: payload.recipients?.[0]?.userId || null,
              channel: 'IN_APP',
              title: inAppTitle,
              message: body.substring(0, 300),
              action_url: payload.actionUrl || '/notifications',
              is_read: false,
              is_sent: true,
              sent_at: new Date().toISOString(),
            },
          ]);
          channelStatuses.push({
            channel: 'IN_APP',
            enabled: true,
            success: !error,
            error: error?.message,
          });
        } else {
          channelStatuses.push({
            channel: 'IN_APP',
            enabled: true,
            success: true,
          });
        }
      } catch (inAppErr: any) {
        channelStatuses.push({
          channel: 'IN_APP',
          enabled: true,
          success: false,
          error: inAppErr.message,
        });
      }
    } else {
      channelStatuses.push({
        channel: 'IN_APP',
        enabled: false,
        success: false,
        skippedReason: 'Disabled by tenant rule',
      });
    }

    // 2. EMAIL Channel Dispatch
    if (rule.enable_email) {
      const emailRecipients = (payload.recipients || [])
        .map(r => r.email)
        .filter((email): email is string => !!email && email.includes('@'));

      if (emailRecipients.length > 0) {
        try {
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
              <div style="background-color: #047857; padding: 18px 24px; border-radius: 8px 8px 0 0; text-align: left;">
                <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">Joy PeopleHR Notification</h1>
                <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 12px;">Enterprise Multi-Tenant Human Resources Control Plane</p>
              </div>
              <div style="padding: 24px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin-top: 0;">${subject || rule.rule_name}</h2>
                <p style="margin: 16px 0; white-space: pre-line;">${body}</p>
                ${
                  payload.actionUrl
                    ? `<div style="margin: 28px 0;">
                        <a href="${payload.actionUrl}" style="background-color: #047857; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px;">Open in Portal &rarr;</a>
                      </div>`
                    : ''
                }
              </div>
              <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; text-align: center; color: #9ca3af; font-size: 11px;">
                <p style="margin: 0;">Sent automatically by Joy PeopleHR Notification Engine &bull; Hostinger Secure SMTP</p>
                <p style="margin: 4px 0 0;">Do not reply directly to this automated security message.</p>
              </div>
            </div>
          `;

          const emailRes = await resendEmailService.sendEmail({
            to: emailRecipients,
            subject: subject || rule.rule_name,
            html: emailHtml,
            text: body,
          });

          channelStatuses.push({
            channel: 'EMAIL',
            enabled: true,
            success: emailRes.success,
            messageId: emailRes.id,
            error: emailRes.error,
          });
        } catch (emailErr: any) {
          channelStatuses.push({
            channel: 'EMAIL',
            enabled: true,
            success: false,
            error: emailErr.message,
          });
        }
      } else {
        channelStatuses.push({
          channel: 'EMAIL',
          enabled: true,
          success: false,
          skippedReason: 'No valid recipient email addresses found in payload',
        });
      }
    } else {
      channelStatuses.push({
        channel: 'EMAIL',
        enabled: false,
        success: false,
        skippedReason: 'Disabled by tenant rule',
      });
    }

    // 3. WHATSAPP Channel Dispatch
    if (rule.enable_whatsapp) {
      const phoneRecipients = (payload.recipients || [])
        .map(r => r.phone)
        .filter((phone): phone is string => !!phone && phone.length >= 10);

      if (phoneRecipients.length > 0) {
        try {
          const waPromises = phoneRecipients.map(async phone => {
            return whatsAppClient.sendText({
              to: phone,
              text: `*${subject || rule.rule_name}*\n\n${body}\n\n_Joy PeopleHR Automated Notification_`,
              organizationId: payload.organizationId,
              employeeId: payload.recipients?.[0]?.employeeId,
            });
          });

          const results = await Promise.all(waPromises);
          const allOk = results.every(r => r.success);

          channelStatuses.push({
            channel: 'WHATSAPP',
            enabled: true,
            success: allOk,
            messageId: results[0]?.messageId,
            error: results.find(r => !r.success)?.error,
          });
        } catch (waErr: any) {
          channelStatuses.push({
            channel: 'WHATSAPP',
            enabled: true,
            success: false,
            error: waErr.message,
          });
        }
      } else {
        channelStatuses.push({
          channel: 'WHATSAPP',
          enabled: true,
          success: false,
          skippedReason: 'No recipient mobile phone provided for WhatsApp delivery',
        });
      }
    } else {
      channelStatuses.push({
        channel: 'WHATSAPP',
        enabled: false,
        success: false,
        skippedReason: 'Disabled by tenant rule',
      });
    }

    // 4. SMS Channel Dispatch
    if (rule.enable_sms) {
      const phoneRecipients = (payload.recipients || [])
        .map(r => r.phone)
        .filter((phone): phone is string => !!phone && phone.length >= 10);

      if (phoneRecipients.length > 0) {
        try {
          const smsClient = AirtelSmsClient.getInstance();
          const smsPromises = phoneRecipients.map(async phone => {
            return smsClient.sendSms({
              destinationAddress: phone,
              message: body.substring(0, 155),
              dltTemplateId: rule.sms_dlt_template_id,
            });
          });

          const results = await Promise.all(smsPromises);
          const allOk = results.every(r => r.success);

          channelStatuses.push({
            channel: 'SMS',
            enabled: true,
            success: allOk,
            messageId: results[0]?.messageId,
            error: results.find(r => !r.success)?.reason,
          });
        } catch (smsErr: any) {
          channelStatuses.push({
            channel: 'SMS',
            enabled: true,
            success: false,
            error: smsErr.message,
          });
        }
      } else {
        channelStatuses.push({
          channel: 'SMS',
          enabled: true,
          success: false,
          skippedReason: 'No phone number provided for SMS delivery',
        });
      }
    } else {
      channelStatuses.push({
        channel: 'SMS',
        enabled: false,
        success: false,
        skippedReason: 'Disabled by tenant rule',
      });
    }

    // Log to communication_dispatch_logs in PostgreSQL
    if (isSupabaseEnabled) {
      try {
        const logEntries = channelStatuses
          .filter(c => c.enabled)
          .map(c => ({
            organization_id: payload.organizationId,
            employee_id: payload.recipients?.[0]?.employeeId || null,
            channel: c.channel,
            provider:
              c.channel === 'EMAIL'
                ? 'HOSTINGER_SMTP'
                : c.channel === 'WHATSAPP'
                ? 'META_CLOUD_API'
                : c.channel === 'SMS'
                ? 'AIRTEL_IQ'
                : 'SUPABASE_REALTIME',
            recipient_phone: payload.recipients?.[0]?.phone || null,
            template_key: rule.event_trigger,
            message_content: body,
            dynamic_payload: payload.variables,
            provider_message_id: c.messageId || null,
            status: c.success ? 'DELIVERED' : 'FAILED',
            error_message: c.error || null,
          }));

        if (logEntries.length > 0) {
          await supabase.from('communication_dispatch_logs').insert(logEntries);
        }
      } catch (logErr) {
        console.warn('[NotificationEngine] Logging notice:', logErr);
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.rule_name,
      eventTrigger: rule.event_trigger,
      dispatchedAt: new Date().toISOString(),
      channels: channelStatuses,
      summary: `Dispatched across ${channelStatuses.filter(c => c.enabled && c.success).length} active channels.`,
    };
  }

  /**
   * Run a live Test Dispatch for a specific rule to a test recipient
   */
  public async testDispatch(
    rule: NotificationRule,
    testRecipient: { email?: string; phone?: string; userId?: string }
  ): Promise<NotificationDispatchResult> {
    const sampleVars: Record<string, any> = {
      employee_name: 'Test Administrator',
      employee_code: 'JCS-ADMIN',
      organization_name: 'Joy Corporate Solutions Pvt Ltd',
      leave_type: 'Annual Leave',
      start_date: new Date().toLocaleDateString('en-GB'),
      end_date: new Date(Date.now() + 86400000).toLocaleDateString('en-GB'),
      days: '1',
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      shift_start: '09:00 AM',
      shift_end: '06:00 PM',
      month_year: 'October 2026',
      net_pay: '₹52,000',
      reason: 'Rule Test Verification',
      approver_name: 'System Admin',
      remarks: 'Verified via Universal Notification Engine',
      action_url: 'https://app.joypeoplehr.com/notifications',
    };

    const payload: NotificationTriggerPayload = {
      organizationId: rule.organization_id,
      eventTrigger: rule.event_trigger,
      module: rule.module,
      variables: sampleVars,
      actionUrl: 'https://app.joypeoplehr.com/notifications',
      recipients: [
        {
          employeeName: 'Test Administrator',
          email: testRecipient.email,
          phone: testRecipient.phone,
          userId: testRecipient.userId,
        },
      ],
    };

    return (await this.dispatch(payload)) || {
      ruleId: rule.id,
      ruleName: rule.rule_name,
      eventTrigger: rule.event_trigger,
      dispatchedAt: new Date().toISOString(),
      channels: [],
      summary: 'Test trigger executed.',
    };
  }

  /**
   * Fetch recent communication dispatch logs for the tenant audit view
   */
  public async getDispatchLogs(orgId: string = CANONICAL_ORG_ID, limit: number = 30): Promise<any[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('communication_dispatch_logs')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[NotificationEngine] Error fetching dispatch logs:', err);
      }
    }
    return [];
  }
}

export const universalNotificationEngine = UniversalNotificationEngine.getInstance();
