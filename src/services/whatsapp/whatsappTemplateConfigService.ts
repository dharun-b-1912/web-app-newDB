// src/services/whatsapp/whatsappTemplateConfigService.ts
// ============================================================================
// Joy PeopleHR Enterprise — WhatsApp Approved Template & Config Registry
// Tracks provider template IDs, Meta approval statuses, document parameters,
// and enforces approval guards before allowing production report dispatch.
// ============================================================================

export type TemplateApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';

export interface WhatsAppTemplateConfig {
  templateKey: string;
  internalPurpose: string;
  providerName: 'META_CLOUD_API' | 'AIRTEL_IQ';
  providerTemplateId: string;
  templateName: string;
  language: string;
  category: 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';
  approvalStatus: TemplateApprovalStatus;
  supportedVariables: string[];
  applicableReportTypes: ('MORNING_CHECKIN' | 'EVENING_FINAL')[];
  documentAttachmentSupported: boolean;
  headerType: 'DOCUMENT' | 'IMAGE' | 'TEXT' | 'NONE';
  enabled: boolean;
  lastVerifiedAt: string;
}

class WhatsAppTemplateConfigService {
  private static instance: WhatsAppTemplateConfigService;

  // Authoritative registry of WhatsApp templates with live Meta approval metadata
  private templates: Map<string, WhatsAppTemplateConfig> = new Map([
    [
      'ATTENDANCE_MIS_REPORT_V1',
      {
        templateKey: 'ATTENDANCE_MIS_REPORT_V1',
        internalPurpose: 'Executive Attendance & Biometric Audit MIS Report',
        providerName: 'META_CLOUD_API',
        providerTemplateId: '1728820144855571',
        templateName: 'daily_mis_report_v1',
        language: 'en',
        category: 'UTILITY',
        approvalStatus: 'APPROVED',
        supportedVariables: [
          'recipient_name',
          'report_title',
          'report_date',
          'company_name',
          'total_workforce',
          'present_turnout',
          'late_clock_ins',
          'weekly_off_or_leave',
          'cumulative_work_hours',
        ],
        applicableReportTypes: ['MORNING_CHECKIN', 'EVENING_FINAL'],
        documentAttachmentSupported: true,
        headerType: 'DOCUMENT',
        enabled: true,
        lastVerifiedAt: '2026-10-21T08:00:00Z',
      },
    ],
    [
      'PAYSLIP_V2',
      {
        templateKey: 'PAYSLIP_V2',
        internalPurpose: 'Monthly Digitally Signed Payslip Delivery',
        providerName: 'META_CLOUD_API',
        providerTemplateId: '1352826481241407_payslip',
        templateName: 'payslip',
        language: 'en',
        category: 'UTILITY',
        approvalStatus: 'APPROVED',
        supportedVariables: ['employee_name', 'month_year', 'net_pay', 'bank_details', 'pay_date'],
        applicableReportTypes: [],
        documentAttachmentSupported: true,
        headerType: 'DOCUMENT',
        enabled: true,
        lastVerifiedAt: '2026-10-21T08:00:00Z',
      },
    ],
    [
      'WELCOME_PACK_V2',
      {
        templateKey: 'WELCOME_PACK_V2',
        internalPurpose: 'Employee Welcome & Digital Onboarding Credentials',
        providerName: 'META_CLOUD_API',
        providerTemplateId: '1394884269294382',
        templateName: 'joy_hr_welcome_v2',
        language: 'en_US',
        category: 'UTILITY',
        approvalStatus: 'APPROVED',
        supportedVariables: ['company_name', 'employee_name', 'employee_code', 'work_email'],
        applicableReportTypes: [],
        documentAttachmentSupported: false,
        headerType: 'IMAGE',
        enabled: true,
        lastVerifiedAt: '2026-10-21T08:00:00Z',
      },
    ],
  ]);

  public static getInstance(): WhatsAppTemplateConfigService {
    if (!WhatsAppTemplateConfigService.instance) {
      WhatsAppTemplateConfigService.instance = new WhatsAppTemplateConfigService();
    }
    return WhatsAppTemplateConfigService.instance;
  }

  /**
   * Retrieves template configuration for Attendance MIS Report
   */
  getAttendanceMisTemplateConfig(): WhatsAppTemplateConfig {
    const config = this.templates.get('ATTENDANCE_MIS_REPORT_V1');
    if (!config) {
      throw new Error('Attendance MIS Report template configuration not found in registry');
    }
    return config;
  }

  /**
   * Checks if the Attendance MIS Report template is approved and enabled for production traffic
   */
  isAttendanceMisTemplateApproved(): boolean {
    const config = this.templates.get('ATTENDANCE_MIS_REPORT_V1');
    return !!config && config.approvalStatus === 'APPROVED' && config.enabled;
  }

  /**
   * Enforces backend authorization and approval guard before attempting template dispatch.
   * Prevents unapproved or draft templates from generating Meta API rejection errors.
   */
  validateTemplateForDispatch(templateKey: string): { valid: boolean; config?: WhatsAppTemplateConfig; error?: string } {
    const config = this.templates.get(templateKey);
    if (!config) {
      return { valid: false, error: `Unknown template key: ${templateKey}` };
    }
    if (!config.enabled) {
      return { valid: false, error: `Template ${config.templateName} is currently disabled in backend configuration` };
    }
    if (config.approvalStatus !== 'APPROVED') {
      return {
        valid: false,
        error: `Template ${config.templateName} is not approved by Meta (current status: ${config.approvalStatus}). Production dispatch blocked.`,
      };
    }
    return { valid: true, config };
  }

  /**
   * Formats Phase 4/6 standard professional confirmation caption for direct document attachments
   */
  formatProfessionalMisCaption(params: {
    recipientName: string;
    reportName: string;
    reportDate: string;
    reportCutoff: string;
    reportStatus: string;
    companyName?: string;
  }): string {
    const company = (params.companyName && params.companyName !== 'Workforce Organization')
      ? params.companyName
      : 'Joy Corporate Solutions Pvt. Ltd.';
    return (
      `*JOY PeopleHR — Workforce MIS Report*\n\n` +
      `Dear ${params.recipientName},\n\n` +
      `Your workforce report for *${params.reportDate}* is ready.\n\n` +
      `• Organization: ${company}\n` +
      `• Report: ${params.reportName}\n` +
      `• Reporting date: ${params.reportDate}\n` +
      `• Generated at: ${params.reportCutoff}\n` +
      `• Report status: ${params.reportStatus}\n\n` +
      `Please open the attached PDF to review the workforce summary, attendance details and applicable audit information.\n\n` +
      `JOY PeopleHR | Workforce Management`
    );
  }
}

export const whatsAppTemplateConfigService = WhatsAppTemplateConfigService.getInstance();
