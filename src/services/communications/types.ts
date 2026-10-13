// src/services/communications/types.ts
// ============================================================
// WorkforceOS Unified Employee Communication Engine Types
// ============================================================

export type PhoneType = 
  | 'SMARTPHONE_WHATSAPP' 
  | 'SMARTPHONE_SMS' 
  | 'FEATURE_PHONE_SMS' 
  | 'UNKNOWN';

export type CommunicationChannel = 'WHATSAPP' | 'SMS' | 'VOICE';

export type CommunicationPreference = 
  | 'WHATSAPP' 
  | 'SMS' 
  | 'WHATSAPP_SMS' 
  | 'IVR' 
  | 'BIOMETRIC_ONLY';

export type CommunicationEventType = 
  | 'OTP'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'DAILY_ATTENDANCE'
  | 'LEAVE_STATUS'
  | 'REGULARIZATION'
  | 'ANNOUNCEMENT'
  | 'DOCUMENT_READY'
  | 'ABSENT_ALERT'
  | 'SALARY_PROCESSING'
  | 'SALARY_CREDITED'
  | 'WELCOME';

export type MessageDeliveryStatus = 
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'FALLBACK_INITIATED';

export interface EmployeeCommunicationProfile {
  employeeId?: string;
  employeeCode?: string;
  fullName: string;
  mobileNumber: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  communicationPreference: CommunicationPreference;
  phoneType: PhoneType;
  organizationId?: string;
}

export interface CommunicationTemplate {
  templateKey: string;
  channel: CommunicationChannel;
  provider: 'AIRTEL' | 'META' | 'TWILIO' | 'CUSTOM';
  dltTemplateId?: string;
  dltPeId?: string;
  senderId?: string;
  providerTemplateId?: string;
  bodyPattern: string;
  category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING' | 'SERVICE_EXPLICIT';
}

export interface CommunicationDispatchRequest {
  eventType: CommunicationEventType;
  employee: EmployeeCommunicationProfile;
  variables: string[];
  metadata?: Record<string, any>;
  forceChannel?: CommunicationChannel;
}

export interface ChannelDispatchAttempt {
  channel: CommunicationChannel;
  provider: string;
  providerMessageId?: string;
  status: 'SUCCESS' | 'FAILED';
  errorReason?: string;
  errorCode?: string;
  dispatchedAt: string;
}

export interface CommunicationDispatchResult {
  success: boolean;
  finalChannel: CommunicationChannel;
  attempts: ChannelDispatchAttempt[];
  messageId?: string;
  fallbackTriggered: boolean;
  logSummary: string;
}
