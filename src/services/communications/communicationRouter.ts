// src/services/communications/communicationRouter.ts
// ============================================================
// WorkforceOS Unified Employee Communication Router
// Primary: WhatsApp (Rich) ➔ Universal Fallback: Airtel SMS (DLT Scrubbed)
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { airtelSmsClient } from './airtelSmsClient';
import { WhatsAppClient } from '../whatsapp/whatsappClient';
import {
  EmployeeCommunicationProfile,
  CommunicationDispatchRequest,
  CommunicationDispatchResult,
  ChannelDispatchAttempt,
  CommunicationChannel,
} from './types';
import {
  OFFICIAL_TEMPLATES,
  renderTemplate,
  resolveTemplateKey,
} from './templateRegistry';

export class CommunicationRouter {
  private static instance: CommunicationRouter;
  private waClient = WhatsAppClient.getInstance();

  private constructor() {}

  public static getInstance(): CommunicationRouter {
    if (!CommunicationRouter.instance) {
      CommunicationRouter.instance = new CommunicationRouter();
    }
    return CommunicationRouter.instance;
  }

  /**
   * The Master Communication Dispatcher
   * Routes dynamically based on phone capabilities with automatic Airtel SMS fallback.
   */
  public async dispatch(req: CommunicationDispatchRequest): Promise<CommunicationDispatchResult> {
    const { employee, eventType, variables } = req;
    const attempts: ChannelDispatchAttempt[] = [];
    const empCode = employee.employeeCode || employee.employeeId || 'EMP';
    const isFeaturePhone = employee.phoneType === 'FEATURE_PHONE_SMS';
    const isSmsPreferred = employee.communicationPreference === 'SMS' || employee.phoneType === 'SMARTPHONE_SMS';
    const canAttemptWhatsApp = !isFeaturePhone && !isSmsPreferred && employee.whatsappEnabled !== false && req.forceChannel !== 'SMS';

    let primarySuccess = false;
    let finalChannel: CommunicationChannel = 'WHATSAPP';
    let fallbackTriggered = false;
    let waAttempt: ChannelDispatchAttempt | null = null;
    let smsAttempt: ChannelDispatchAttempt | null = null;

    // ── 1. Primary Attempt: WhatsApp (Rich Channel) ─────────────────────────
    if (canAttemptWhatsApp) {
      const waTemplateKey = resolveTemplateKey(eventType, 'WHATSAPP');
      const waTemplate = OFFICIAL_TEMPLATES[waTemplateKey];
      const messageBody = waTemplate ? renderTemplate(waTemplate.bodyPattern, variables) : variables.join(' ');

      try {
        const waRes = await this.waClient.sendText({
          to: employee.mobileNumber,
          text: messageBody,
          organizationId: employee.organizationId,
          employeeId: employee.employeeId,
        });

        if (waRes.success) {
          primarySuccess = true;
          finalChannel = 'WHATSAPP';
          waAttempt = {
            channel: 'WHATSAPP',
            provider: 'META_OR_AIRTEL',
            providerMessageId: waRes.messageId,
            status: 'SUCCESS',
            dispatchedAt: new Date().toISOString(),
          };
          attempts.push(waAttempt);

          await this.persistMessageLog({
            organizationId: employee.organizationId,
            employeeId: employee.employeeId,
            recipientPhone: employee.mobileNumber,
            channel: 'WHATSAPP',
            messageType: eventType,
            templateKey: waTemplateKey,
            providerMessageId: waRes.messageId,
            contentText: messageBody,
            status: 'DELIVERED',
            sentAt: new Date().toISOString(),
          });
        } else {
          waAttempt = {
            channel: 'WHATSAPP',
            provider: 'META_OR_AIRTEL',
            status: 'FAILED',
            errorReason: waRes.error || 'USER_NOT_ON_WHATSAPP',
            dispatchedAt: new Date().toISOString(),
          };
          attempts.push(waAttempt);
        }
      } catch (err: any) {
        waAttempt = {
          channel: 'WHATSAPP',
          provider: 'META_OR_AIRTEL',
          status: 'FAILED',
          errorReason: err.message || 'WHATSAPP_DISPATCH_EXCEPTION',
          dispatchedAt: new Date().toISOString(),
        };
        attempts.push(waAttempt);
      }
    }

    // ── 2. Fallback or Feature-Phone Route: Airtel SMS ──────────────────────
    if (!primarySuccess) {
      // ── Hardware Biometric Policy ──────────────────────────────────────────
      // Check-In and Check-Out SMS alerts are strictly restricted to physical
      // biometric hardware devices (eSSL / ZKTeco machine punches).
      // Web ESS and Mobile punches are suppressed from sending SMS.
      if (eventType === 'CHECK_IN' || eventType === 'CHECK_OUT') {
        const punchSource = String(req.metadata?.punchSource || req.metadata?.source || '').toUpperCase();
        const hasDeviceId = Boolean(req.metadata?.deviceId || req.metadata?.device_id || req.metadata?.deviceSerial);
        const isBiometricHardware = punchSource === 'BIOMETRIC' || (hasDeviceId && punchSource !== 'WEB' && punchSource !== 'MOBILE' && punchSource !== 'WEB_ESS');

        if (!isBiometricHardware) {
          return {
            success: true, // Marked as successful bypass to avoid false error alarms
            finalChannel: 'SMS',
            attempts,
            fallbackTriggered,
            logSummary: `[SMS_BYPASS_POLICY] ${eventType} SMS suppressed: restricted exclusively to physical Biometric hardware devices (detected punch source: ${punchSource || 'WEB/MOBILE'}).`,
          };
        }
      }

      if (canAttemptWhatsApp) {
        fallbackTriggered = true;
      }
      finalChannel = 'SMS';

      const smsTemplateKey = resolveTemplateKey(eventType, 'SMS');
      const smsTemplate = OFFICIAL_TEMPLATES[smsTemplateKey];
      const smsBody = smsTemplate ? renderTemplate(smsTemplate.bodyPattern, variables) : variables.join(' ');

      const smsRes = await airtelSmsClient.sendSms({
        destinationAddress: employee.mobileNumber,
        message: smsBody,
        dltTemplateId: smsTemplate?.dltTemplateId,
        senderId: smsTemplate?.senderId || 'JCSPRL',
      });

      smsAttempt = {
        channel: 'SMS',
        provider: 'AIRTEL_IQ',
        providerMessageId: smsRes.messageId,
        status: smsRes.success ? 'SUCCESS' : 'FAILED',
        errorReason: smsRes.reason,
        dispatchedAt: new Date().toISOString(),
      };
      attempts.push(smsAttempt);

      // Persist fallback SMS record with reference to failed WhatsApp message
      const waDbId = waAttempt ? await this.persistMessageLog({
        organizationId: employee.organizationId,
        employeeId: employee.employeeId,
        recipientPhone: employee.mobileNumber,
        channel: 'WHATSAPP',
        messageType: eventType,
        templateKey: resolveTemplateKey(eventType, 'WHATSAPP'),
        status: 'FAILED',
        failureReason: waAttempt.errorReason,
        fallbackChannel: 'SMS',
      }) : undefined;

      await this.persistMessageLog({
        organizationId: employee.organizationId,
        employeeId: employee.employeeId,
        recipientPhone: employee.mobileNumber,
        channel: 'SMS',
        messageType: eventType,
        templateKey: smsTemplateKey,
        dltTemplateId: smsTemplate?.dltTemplateId,
        providerMessageId: smsRes.messageId,
        contentText: smsBody,
        status: smsRes.success ? 'DELIVERED' : 'FAILED',
        failureReason: smsRes.reason,
        fallbackMessageId: waDbId,
        sentAt: new Date().toISOString(),
        deliveredAt: smsRes.success ? new Date().toISOString() : undefined,
      });
    }

    // ── 3. Canonical Formatted Terminal Trace ──────────────────────────────
    let logSummary = '';
    if (!fallbackTriggered && primarySuccess) {
      logSummary = `[COMMUNICATION] event=${eventType} employee=${empCode} WhatsApp status=DELIVERED FINAL SUCCESS`;
    } else if (fallbackTriggered) {
      const waReason = waAttempt?.errorReason || 'FAILED';
      const smsStatus = smsAttempt?.status === 'SUCCESS' ? 'DELIVERED' : 'FAILED';
      logSummary = `[COMMUNICATION] event=${eventType} employee=${empCode} WhatsApp status=FAILED reason=${waReason} Fallback → SMS SMS status=${smsStatus} FINAL ${smsStatus === 'DELIVERED' ? 'SUCCESS' : 'FAILED'}`;
    } else {
      // Direct SMS (Feature phone / Button phone / SMS Preference)
      const smsStatus = smsAttempt?.status === 'SUCCESS' ? 'DELIVERED' : 'FAILED';
      const reasonLabel = isFeaturePhone ? 'Feature Phone' : 'SMS Preferred';
      logSummary = `[COMMUNICATION] event=${eventType} employee=${empCode} channel=SMS (${reasonLabel}) SMS status=${smsStatus} FINAL ${smsStatus === 'DELIVERED' ? 'SUCCESS' : 'FAILED'}`;
    }

    console.log(logSummary);

    return {
      success: primarySuccess || (smsAttempt?.status === 'SUCCESS'),
      finalChannel,
      attempts,
      fallbackTriggered,
      logSummary,
    };
  }

  // ── High-Level Convenience Methods ───────────────────────────────────────

  /**
   * Check-In Confirmation (WhatsApp Rich with fallback to concise Button Phone SMS)
   */
  public async sendCheckIn(
    employee: EmployeeCommunicationProfile,
    details: { employeeName: string; date: string; time: string; companyName: string }
  ): Promise<CommunicationDispatchResult> {
    return this.dispatch({
      eventType: 'CHECK_IN',
      employee,
      variables: [details.employeeName, details.date, details.time, details.companyName],
    });
  }

  /**
   * Check-Out Confirmation
   */
  public async sendCheckOut(
    employee: EmployeeCommunicationProfile,
    details: { employeeName: string; date: string; checkInTime: string; checkOutTime: string; workingTime: string }
  ): Promise<CommunicationDispatchResult> {
    return this.dispatch({
      eventType: 'CHECK_OUT',
      employee,
      variables: [details.employeeName, details.date, details.checkInTime, details.checkOutTime, details.workingTime],
    });
  }

  /**
   * Daily Attendance Summary
   */
  public async sendDailySummary(
    employee: EmployeeCommunicationProfile,
    details: { employeeName: string; date: string; checkIn: string; checkOut: string; hours: string; status: string }
  ): Promise<CommunicationDispatchResult> {
    return this.dispatch({
      eventType: 'DAILY_ATTENDANCE',
      employee,
      variables: [details.employeeName, details.date, details.checkIn, details.checkOut, details.hours, details.status],
    });
  }

  /**
   * OTP Verification Code (Security hardened: zero employee details in body)
   */
  public async sendOtp(
    employee: EmployeeCommunicationProfile,
    details: { otpCode: string; validityMinutes: number }
  ): Promise<CommunicationDispatchResult> {
    return this.dispatch({
      eventType: 'OTP',
      employee,
      variables: [details.otpCode, String(details.validityMinutes)],
    });
  }

  // ── DB Persistence Helper ────────────────────────────────────────────────
  private async persistMessageLog(record: {
    organizationId?: string;
    employeeId?: string;
    recipientPhone: string;
    channel: CommunicationChannel;
    messageType: string;
    templateKey?: string;
    dltTemplateId?: string;
    providerMessageId?: string;
    contentText?: string;
    status: string;
    failureReason?: string;
    fallbackChannel?: string;
    fallbackMessageId?: string;
    sentAt?: string;
    deliveredAt?: string;
  }): Promise<string | undefined> {
    if (!isSupabaseEnabled) return undefined;

    try {
      const { data } = await supabase.from('communication_messages').insert([
        {
          organization_id: (record.organizationId && record.organizationId.length === 36) ? record.organizationId : null,
          employee_id: (record.employeeId && record.employeeId.length === 36) ? record.employeeId : null,
          recipient_phone: record.recipientPhone,
          channel: record.channel,
          message_type: record.messageType,
          template_key: record.templateKey,
          dlt_template_id: record.dltTemplateId,
          provider_message_id: record.providerMessageId,
          content_text: record.contentText,
          status: record.status,
          failure_reason: record.failureReason,
          fallback_channel: record.fallbackChannel,
          fallback_message_id: record.fallbackMessageId,
          sent_at: record.sentAt,
          delivered_at: record.deliveredAt,
        },
      ]).select('id').single();

      return data?.id;
    } catch {
      // In offline/test mode, safe non-blocking
      return undefined;
    }
  }
}

export const communicationRouter = CommunicationRouter.getInstance();
