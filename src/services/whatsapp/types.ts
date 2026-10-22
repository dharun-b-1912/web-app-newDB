// src/services/whatsapp/types.ts
// ============================================================================
// Joy PeopleHR Enterprise WhatsApp Business & Bot Automation Type Definitions
// Compliant with Meta Cloud API v20.0 and Airtel IQ Gateway Specifications
// ============================================================================

export type WhatsAppProvider = 'META_CLOUD_API' | 'AIRTEL_IQ' | 'MOCK_SANDBOX';

export type WhatsAppMessageStatus =
  | 'QUEUED'
  | 'SUBMITTED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'UNDELIVERED'
  | 'REJECTED';

export type WhatsAppMessageType =
  | 'template'
  | 'text'
  | 'interactive'
  | 'document'
  | 'image'
  | 'audio'
  | 'location';

export type WhatsAppTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

export type WhatsAppTemplateLanguage =
  | 'en'
  | 'en_US'
  | 'en_GB'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml';

// ============================================================================
// Meta HSM Template Component Models
// ============================================================================

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video' | 'payload';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  image?: {
    link?: string;
    id?: string;
  };
  payload?: string;
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  sub_type?: 'quick_reply' | 'url' | 'catalog';
  index?: number | string;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppSendTemplatePayload {
  to: string; // E.164 formatted, e.g. 919876543210
  templateName: string;
  languageCode: WhatsAppTemplateLanguage | string;
  components: WhatsAppTemplateComponent[];
  organizationId: string;
  employeeId?: string;
  category?: WhatsAppTemplateCategory;
  metadata?: Record<string, any>;
}

// ============================================================================
// Interactive Messages (Buttons, Lists)
// ============================================================================

export interface WhatsAppButtonReply {
  type: 'reply';
  reply: {
    id: string; // e.g. 'APPROVE_LEAVE_REQ_102'
    title: string; // max 20 chars
  };
}

export interface WhatsAppListSectionRow {
  id: string;
  title: string; // max 24 chars
  description?: string; // max 72 chars
}

export interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListSectionRow[];
}

export interface WhatsAppInteractivePayload {
  to: string;
  type: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'document';
    text?: string;
    link?: string;
    image?: {
      id?: string;
      link?: string;
    };
    document?: {
      id?: string;
      link?: string;
      filename?: string;
    };
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    buttons?: WhatsAppButtonReply[];
    button?: string; // List trigger title
    sections?: WhatsAppListSection[];
  };
  organizationId: string;
  employeeId?: string;
}

export interface WhatsAppSendTextPayload {
  to: string;
  text: string;
  organizationId: string;
  employeeId?: string;
  previewUrl?: boolean;
}

export interface WhatsAppSendDocumentPayload {
  to: string;
  documentUrl?: string;
  fileBuffer?: Buffer | Uint8Array;
  filename: string;
  caption?: string;
  organizationId: string;
  employeeId?: string;
  mediaId?: string;
  sha256Checksum?: string;
  mimeType?: string;
  runId?: string;
}

// ============================================================================
// Inbound Webhook Payload Types (Meta Graph API)
// ============================================================================

export interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'interactive' | 'button' | 'document' | 'image' | 'location';
        text?: {
          body: string;
        };
        interactive?: {
          type: 'button_reply' | 'list_reply';
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
        button?: {
          text: string;
          payload: string;
        };
        document?: {
          id: string;
          filename: string;
          mime_type: string;
          sha256: string;
        };
        location?: {
          latitude: number;
          longitude: number;
          name?: string;
          address?: string;
        };
      }>;
      statuses?: Array<{
        id: string;
        status: WhatsAppMessageStatus;
        timestamp: string;
        recipient_id: string;
        pricing?: {
          billable: boolean;
          pricing_model: string;
          category: string;
        };
        errors?: Array<{
          code: number;
          title: string;
          message: string;
          error_data?: {
            details: string;
          };
        }>;
      }>;
    };
    field: string;
  }>;
}

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}

// ============================================================================
// Bot State, Identity & Session Context
// ============================================================================

export type WhatsAppRoleContext = 'EMPLOYEE' | 'TEAM_LEAD' | 'SUPERVISOR' | 'MANAGER' | 'HR' | 'ADMIN';

export type WhatsAppPermission =
  | 'attendance.view_self'
  | 'attendance.check_in'
  | 'attendance.check_out'
  | 'leave.view_self'
  | 'leave.apply'
  | 'leave.cancel'
  | 'regularization.apply'
  | 'regularization.view_self'
  | 'payslip.view_self'
  | 'profile.view_self'
  | 'documents.view_self'
  | 'helpdesk.create'
  | 'helpdesk.create_ticket'
  | 'company_updates.view'
  | 'team.attendance.view'
  | 'team.leave.view'
  | 'team.members.view'
  | 'shift.roster.view'
  | 'leave.approve'
  | 'regularization.approve'
  | 'employee.search'
  | 'employee.view'
  | 'employee.documents.view'
  | 'reports.view'
  | 'policy.broadcast';

export interface ResolvedEmployeeIdentity {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  organizationId: string;
  companyName: string;
  department: string;
  designation: string;
  employmentStatus: string;
  phone: string;
  roleContext: WhatsAppRoleContext;
  directReportsCount: number;
  teamLeadReportsCount: number;
  managerId?: string | null;
  managerName?: string | null;
  permissions: WhatsAppPermission[];
}

export type WhatsAppAuthStatus =
  | 'UNAUTHENTICATED'
  | 'AWAITING_PHONE'
  | 'LOOKING_UP_EMPLOYEE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_FOUND'
  | 'AWAITING_COMPANY_SELECTION'
  | 'AWAITING_VERIFICATION'
  | 'AWAITING_OTP'
  | 'VERIFIED';

export type BotConversationState =
  | 'UNKNOWN'
  | 'AWAITING_PHONE'
  | 'LOOKING_UP_EMPLOYEE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_FOUND'
  | 'AWAITING_COMPANY_SELECTION'
  | 'AWAITING_VERIFICATION'
  | 'AWAITING_OTP'
  | 'VERIFIED'
  | 'RESOLVING_CONTEXT'
  | 'READY'
  | 'IDLE'
  | 'AWAITING_MENU_CHOICE'
  | 'PAYSLIP_MENU'
  | 'AWAITING_PAYSLIP_MONTH'
  | 'LEAVE_MENU'
  | 'APPLYING_LEAVE_TYPE'
  | 'APPLYING_LEAVE_DATES'
  | 'APPLYING_LEAVE_REASON'
  | 'APPLYING_LEAVE_CONFIRM'
  | 'ATTENDANCE_MENU'
  | 'SCHEDULE_MENU'
  | 'ANNOUNCEMENTS_MENU'
  | 'AWAITING_POLICY_QUERY'
  | 'AWAITING_TICKET_DESCRIPTION'
  | 'HR_SEARCHING_EMPLOYEE';

export interface WhatsAppFlowTrace {
  correlationId: string;
  stateHistory: BotConversationState[];
  employeeResolved: boolean;
  organizationResolved: boolean;
  verificationPassed: boolean;
  hierarchyResolved: boolean;
  permissionsResolved: boolean;
  menuResolved: boolean;
  finalResult: 'SUCCESS' | 'FAILED' | 'REJECTED' | 'PENDING';
  errorReason?: string;
}

export interface WhatsAppAuditEvent {
  id: string;
  correlationId: string;
  whatsappMessageId?: string;
  organizationId?: string;
  employeeId?: string;
  eventType: string;
  previousState?: BotConversationState | string;
  newState?: BotConversationState | string;
  action?: string;
  result: 'SUCCESS' | 'FAILED' | 'REJECTED' | 'DENIED' | 'PENDING';
  errorCode?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface BotSessionContext {
  waId: string;
  organizationId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  roleTitle?: string;
  department: string;
  companyName?: string;
  state: BotConversationState;
  authStatus?: WhatsAppAuthStatus;
  roleContext?: WhatsAppRoleContext;
  directReportsCount?: number;
  permissions?: WhatsAppPermission[];
  matchedCompanies?: ResolvedEmployeeIdentity[];
  pendingEmployee?: ResolvedEmployeeIdentity;
  correlationId?: string;
  flowTrace?: WhatsAppFlowTrace;
  draftData?: {
    enteredPhone?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    payslipMonth?: string;
    ticketCategory?: string;
    ticketQuery?: string;
  };
  otpChallenge?: {
    challengeId: string;
    expiresAt: number;
    attempts: number;
    maxAttempts: number;
    lastSentAt: number;
  };
  sessionExpiresAt?: string;
  verifiedAt?: string;
  verificationMethod?: 'WHATSAPP_OTP' | 'SMS_OTP' | 'INTERACTIVE_CONFIRMATION' | 'ADMIN_BYPASS';
  lastActiveAt: string;
}

// ============================================================================
// Event Trigger Interfaces
// ============================================================================

export interface WhatsAppPayslipTrigger {
  organizationId: string;
  employeeId: string;
  employeeCode?: string;
  companyName?: string;
  employeeName: string;
  phone: string;
  monthYear: string;
  netPay: string | number;
  bankAccountMasked: string;
  payDate: string;
  paymentStatus?: string;
  portalUrl?: string;
  payslipPdfUrl: string;
  templateName?: string;
}

export interface WhatsAppLeaveApprovalTrigger {
  organizationId: string;
  leaveRequestId: string;
  managerPhone: string;
  managerName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
}

export interface WhatsAppLeaveStatusUpdateTrigger {
  organizationId: string;
  employeePhone: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'Approved' | 'Rejected';
  reviewerName: string;
  comments?: string;
}

export interface WhatsAppAttendanceAlertTrigger {
  organizationId: string;
  employeeId: string;
  employeeName: string;
  phone: string;
  date: string;
  shiftName: string;
  anomalyType: 'MISSED_PUNCH_IN' | 'MISSED_PUNCH_OUT' | 'LATE_ARRIVAL';
  timeRecorded?: string;
}

export interface WhatsAppAnnouncementBroadcastTrigger {
  organizationId: string;
  title: string;
  content: string;
  category: 'ANNOUNCEMENT' | 'POLICY_UPDATE' | 'HOLIDAY' | 'EMERGENCY';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'BRANCH';
  targetFilterValue?: string;
  actionUrl?: string;
  recipients: Array<{
    employeeId: string;
    employeeName: string;
    phone: string;
  }>;
}

export interface WhatsAppOnboardingInviteTrigger {
  organizationId: string;
  companyName: string;
  candidateName: string;
  candidatePhone: string;
  invitationToken: string;
  expiryHours: number;
  portalUrl: string;
}

export interface WhatsAppCelebrationTrigger {
  organizationId: string;
  employeeName: string;
  phone: string;
  type: 'BIRTHDAY' | 'WORK_ANNIVERSARY';
  yearsOfService?: number;
  companyName: string;
}

export interface WhatsAppAuthOtpTrigger {
  organizationId: string;
  phone: string;
  otpCode: string;
  expiryMinutes: number;
  companyName: string;
}

export interface WhatsAppPayrollMisReportTrigger {
  organizationId: string;
  recipientPhone: string;
  recipientName: string;
  companyName: string;
  monthYear: string;
  totalHeadcount: number;
  totalGrossPay: string | number;
  totalNetPay: string | number;
  totalStatutoryDeductions: string | number;
  reportPdfUrl?: string;
  runId?: string;
}

export interface WhatsAppAttendanceMisReportTrigger {
  organizationId: string;
  recipientPhone: string;
  recipientName: string;           // {{1}} Recipient (e.g. HR Operations / HR Head)
  reportTitle?: string;            // {{2}} Report Title (e.g. Daily Attendance & Biometric Audit Report)
  reportDate: string;              // {{3}} Audit Date (e.g. 17 October 2026)
  companyName: string;             // {{4}} Company Name (e.g. Joy Corporate Solutions)
  totalWorkforce: number;          // {{5}} Total Workforce (e.g. 21)
  presentTurnout: string;          // {{6}} Present Turnout (e.g. 13 Staff (62% Turnout))
  lateClockIns: number;            // {{7}} Late Clock-ins (e.g. 12)
  weeklyOffOrLeave: number;        // {{8}} Weekly Off / Leave (e.g. 8)
  cumulativeWorkHours: string;     // {{9}} Cumulative Billed Hours (e.g. 86h 48m)
  reportPdfUrl?: string;           // Header document URL
  pdfFilename?: string;            // Header document attachment filename
  portalUrl?: string;              // Dynamic button URL
  templateName?: string;
  sha256Checksum?: string;         // Cryptographic SHA-256 hash guaranteeing identical artifact
  runId?: string;                  // Execution run identifier
  mediaId?: string;                // Pre-uploaded Meta media identifier
}

// ============================================================================
// Communication Dispatch Log Model
// ============================================================================

export interface WhatsAppDispatchLog {
  id: string;
  organization_id: string;
  employee_id?: string | null;
  channel: 'WHATSAPP';
  provider: WhatsAppProvider;
  recipient_phone: string;
  template_key: string;
  message_content: string;
  dynamic_payload: Record<string, any>;
  document_url?: string | null;
  provider_message_id?: string | null;
  status: WhatsAppMessageStatus;
  error_code?: string | null;
  error_message?: string | null;
  retry_count: number;
  cost_inr: number;
  created_at: string;
  updated_at: string;
}
