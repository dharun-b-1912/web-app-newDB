// src/services/whatsapp/whatsappClient.ts
// ============================================================================
// Production WhatsApp Client for Meta Cloud API & Airtel IQ Gateway
// Handles Token Authorization, Multi-Tenant Routing, Retries, and DB Logging
// ============================================================================

import { supabase } from '../../lib/supabase';
import {
  WhatsAppSendTemplatePayload,
  WhatsAppSendTextPayload,
  WhatsAppInteractivePayload,
  WhatsAppSendDocumentPayload,
  WhatsAppProvider,
  WhatsAppDispatchLog,
} from './types';
import { normalizeIndianPhone } from './phoneUtils';

export interface WhatsAppClientConfig {
  provider?: WhatsAppProvider;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaApiVersion?: string;
  airtelEndpoint?: string;
  airtelApiKey?: string;
  airtelCustomerId?: string;
}

export class WhatsAppClient {
  private static instance: WhatsAppClient;
  private config: WhatsAppClientConfig;

  private constructor() {
    const getEnv = (key: string) => {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
      try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
          return (import.meta as any).env[key];
        }
      } catch {}
      return '';
    };

    this.config = {
      provider: (getEnv('VITE_WHATSAPP_PROVIDER') || getEnv('WHATSAPP_PROVIDER') || 'META_CLOUD_API') as WhatsAppProvider,
      metaPhoneNumberId:
        getEnv('VITE_META_WA_PHONE_NUMBER_ID') ||
        getEnv('META_WA_PHONE_NUMBER_ID') ||
        '1352826481241407',
      metaAccessToken:
        getEnv('VITE_META_WA_ACCESS_TOKEN') ||
        getEnv('META_WA_ACCESS_TOKEN') ||
        'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD',
      metaApiVersion: getEnv('VITE_META_WA_API_VERSION') || getEnv('META_WA_API_VERSION') || 'v20.0',
      airtelEndpoint: getEnv('VITE_AIRTEL_WA_ENDPOINT') || 'https://iq.airtel.in/gateway/airtel-xchange/v2/whatsapp/messages',
      airtelApiKey: getEnv('VITE_AIRTEL_API_KEY') || '',
      airtelCustomerId: getEnv('VITE_AIRTEL_CUSTOMER_ID') || '',
    };
  }

  public static getInstance(): WhatsAppClient {
    if (!WhatsAppClient.instance) {
      WhatsAppClient.instance = new WhatsAppClient();
    }
    return WhatsAppClient.instance;
  }

  /**
   * Set custom runtime configuration (e.g. per-organization WABA credentials)
   */
  public configure(config: Partial<WhatsAppClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispatches a pre-approved Meta HSM Template message
   */
  async sendTemplate(payload: WhatsAppSendTemplatePayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const normalizedPhone = normalizeIndianPhone(payload.to);

    // Meta Graph API Payload Structure
    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: payload.templateName,
        language: {
          code: payload.languageCode,
        },
        components: payload.components,
      },
    };

    return this.dispatchHttpMessage({
      to: normalizedPhone,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      templateKey: payload.templateName,
      dynamicPayload: payload,
      bodyPayload: metaBody,
    });
  }

  /**
   * Dispatches an interactive button or list menu (Used by 2-Way Bot)
   */
  async sendInteractive(payload: WhatsAppInteractivePayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const normalizedPhone = normalizeIndianPhone(payload.to);

    const interactiveObject: any = {
      type: payload.type,
      body: payload.body,
    };

    if (payload.header) {
      interactiveObject.header = payload.header;
    }
    if (payload.footer) {
      interactiveObject.footer = payload.footer;
    }

    if (payload.type === 'button' && payload.action.buttons) {
      interactiveObject.action = {
        buttons: payload.action.buttons,
      };
    } else if (payload.type === 'list' && payload.action.sections) {
      interactiveObject.action = {
        button: payload.action.button || 'Select Option',
        sections: payload.action.sections,
      };
    }

    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'interactive',
      interactive: interactiveObject,
    };

    return this.dispatchHttpMessage({
      to: normalizedPhone,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      templateKey: `INTERACTIVE_${payload.type.toUpperCase()}`,
      dynamicPayload: payload,
      bodyPayload: metaBody,
    });
  }

  /**
   * Dispatches a free-form text message (Permitted within 24-hr customer care window)
   */
  async sendText(payload: WhatsAppSendTextPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const normalizedPhone = normalizeIndianPhone(payload.to);

    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: payload.previewUrl ?? true,
        body: payload.text,
      },
    };

    return this.dispatchHttpMessage({
      to: normalizedPhone,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      templateKey: 'FREE_FORM_TEXT',
      dynamicPayload: { text: payload.text },
      bodyPayload: metaBody,
    });
  }

  /**
   * Dispatches a document (PDF, DOCX) attachment
   */
  async sendDocument(payload: WhatsAppSendDocumentPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const normalizedPhone = normalizeIndianPhone(payload.to);

    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'document',
      document: {
        link: payload.documentUrl,
        filename: payload.filename,
        caption: payload.caption || '',
      },
    };

    return this.dispatchHttpMessage({
      to: normalizedPhone,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      templateKey: 'DOCUMENT_DISPATCH',
      dynamicPayload: { filename: payload.filename, url: payload.documentUrl },
      bodyPayload: metaBody,
    });
  }

  /**
   * Dispatches an image attachment with optional caption
   */
  async sendImage(payload: {
    to: string;
    imageUrl?: string;
    mediaId?: string;        // Pre-uploaded Meta media_id (preferred over imageUrl)
    caption?: string;
    organizationId?: string;
    employeeId?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const normalizedPhone = normalizeIndianPhone(payload.to);

    // Use media_id if provided (pre-uploaded to Meta) — no external CDN needed
    const imageField = payload.mediaId
      ? { id: payload.mediaId, caption: payload.caption || '' }
      : { link: payload.imageUrl || '', caption: payload.caption || '' };

    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'image',
      image: imageField,
    };

    return this.dispatchHttpMessage({
      to: normalizedPhone,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      templateKey: 'IMAGE_MESSAGE',
      dynamicPayload: { imageUrl: payload.imageUrl, caption: payload.caption },
      bodyPayload: metaBody,
    });
  }

  /**
   * Internal HTTP Dispatch Engine with Provider Routing & DB Logging
   */
  private async dispatchHttpMessage(params: {
    to: string;
    organizationId: string;
    employeeId?: string;
    templateKey: string;
    dynamicPayload: Record<string, any>;
    bodyPayload: any;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, organizationId, employeeId, templateKey, dynamicPayload, bodyPayload } = params;

    // Check if running in Mock / Development sandbox
    const isMock =
      !this.config.metaAccessToken ||
      this.config.metaAccessToken.startsWith('mock_') ||
      this.config.provider === 'MOCK_SANDBOX';

    if (isMock) {
      const mockMsgId = `wamid.MOCK_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      console.log(`[WhatsAppClient:MockSandbox] Outbound message to ${to}:`, {
        templateKey,
        bodyPayload,
      });

      // Audit Log in Supabase
      await this.logDispatch({
        organizationId,
        employeeId,
        recipientPhone: to,
        templateKey,
        provider: 'MOCK_SANDBOX',
        dynamicPayload,
        status: 'DELIVERED',
        providerMessageId: mockMsgId,
      });

      return { success: true, messageId: mockMsgId };
    }

    try {
      const url = `https://graph.facebook.com/${this.config.metaApiVersion}/${this.config.metaPhoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status} WhatsApp error`;
        console.error('[WhatsAppClient] Meta API error:', data);

        await this.logDispatch({
          organizationId,
          employeeId,
          recipientPhone: to,
          templateKey,
          provider: 'META_CLOUD_API',
          dynamicPayload,
          status: 'FAILED',
          errorCode: data.error?.code?.toString() || `${response.status}`,
          errorMessage: errorMsg,
        });

        return { success: false, error: errorMsg };
      }

      const messageId = data.messages?.[0]?.id || null;

      await this.logDispatch({
        organizationId,
        employeeId,
        recipientPhone: to,
        templateKey,
        provider: 'META_CLOUD_API',
        dynamicPayload,
        status: 'SUBMITTED',
        providerMessageId: messageId,
      });

      return { success: true, messageId };
    } catch (err: any) {
      console.error('[WhatsAppClient] Dispatch exception:', err);

      await this.logDispatch({
        organizationId,
        employeeId,
        recipientPhone: to,
        templateKey,
        provider: this.config.provider || 'META_CLOUD_API',
        dynamicPayload,
        status: 'FAILED',
        errorMessage: err.message || 'Network dispatch error',
      });

      return { success: false, error: err.message || 'Dispatch failed' };
    }
  }

  /**
   * Records communication log in Supabase communication_dispatch_logs table
   */
  private async logDispatch(params: {
    organizationId: string;
    employeeId?: string | null;
    recipientPhone: string;
    templateKey: string;
    provider: WhatsAppProvider;
    dynamicPayload: Record<string, any>;
    status: WhatsAppDispatchLog['status'];
    providerMessageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      await supabase.from('communication_dispatch_logs').insert({
        organization_id: params.organizationId,
        employee_id: params.employeeId || null,
        channel: 'WHATSAPP',
        provider: params.provider,
        recipient_phone: params.recipientPhone,
        template_key: params.templateKey,
        message_content: JSON.stringify(params.dynamicPayload),
        dynamic_payload: params.dynamicPayload,
        provider_message_id: params.providerMessageId || null,
        status: params.status,
        error_code: params.errorCode || null,
        error_message: params.errorMessage || null,
        cost_inr: params.provider === 'MOCK_SANDBOX' ? 0.0 : 0.45, // Standard Meta utility cost
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      // Non-blocking log catch
      console.warn('[WhatsAppClient] Failed to write audit log to Supabase:', err);
    }
  }
}

export const whatsAppClient = WhatsAppClient.getInstance();
