// src/services/whatsapp/webhookHandler.ts
// ============================================================================
// Joy PeopleHR WhatsApp Webhook Ingress & Delivery Status Callback Processor
// Validates Meta Hub tokens, routes 2-way bot commands, and updates dispatch logs
// ============================================================================

import { supabase } from '../../lib/supabase';
import { MetaWebhookPayload, WhatsAppMessageStatus } from './types';
import { whatsAppBotEngine } from './botEngine';

export class WhatsAppWebhookHandler {
  private static instance: WhatsAppWebhookHandler;
  private readonly verifyToken: string;

  private constructor() {
    this.verifyToken = import.meta.env.VITE_META_WA_VERIFY_TOKEN || 'joy_peoplehr_meta_webhook_secret_token';
  }

  public static getInstance(): WhatsAppWebhookHandler {
    if (!WhatsAppWebhookHandler.instance) {
      WhatsAppWebhookHandler.instance = new WhatsAppWebhookHandler();
    }
    return WhatsAppWebhookHandler.instance;
  }

  /**
   * Validates Meta Webhook Verification Challenge (GET request)
   */
  public verifySubscription(params: {
    mode?: string;
    token?: string;
    challenge?: string;
  }): { isValid: boolean; challenge?: string } {
    const { mode, token, challenge } = params;

    if (mode === 'subscribe' && token === this.verifyToken) {
      return { isValid: true, challenge };
    }
    return { isValid: false };
  }

  /**
   * Processes inbound webhook event payload (POST request)
   */
  async processWebhookEvent(payload: MetaWebhookPayload): Promise<{ processedCount: number }> {
    if (payload.object !== 'whatsapp_business_account') {
      return { processedCount: 0 };
    }

    let processedCount = 0;

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const val = change.value;

        // 1. Process Status Updates (DELIVERED, READ, FAILED)
        if (val.statuses && val.statuses.length > 0) {
          for (const statusObj of val.statuses) {
            await this.handleDeliveryStatusUpdate(statusObj.id, statusObj.status, statusObj.errors);
            processedCount++;
          }
        }

        // 2. Process Inbound Messages & Interactive Replies
        if (val.messages && val.messages.length > 0) {
          for (const msg of val.messages) {
            const senderPhone = msg.from;
            const messageId = msg.id;

            let textContent: string | undefined;
            let buttonPayload: string | undefined;
            let listReplyId: string | undefined;

            if (msg.type === 'text' && msg.text) {
              textContent = msg.text.body;
            } else if (msg.type === 'interactive' && msg.interactive) {
              if (msg.interactive.type === 'button_reply' && msg.interactive.button_reply) {
                buttonPayload = msg.interactive.button_reply.id;
                textContent = msg.interactive.button_reply.title;
              } else if (msg.interactive.type === 'list_reply' && msg.interactive.list_reply) {
                listReplyId = msg.interactive.list_reply.id;
                textContent = msg.interactive.list_reply.title;
              }
            } else if (msg.type === 'button' && msg.button) {
              buttonPayload = msg.button.payload;
              textContent = msg.button.text;
            }

            // Route to Bot State Machine
            await whatsAppBotEngine.handleInboundMessage({
              from: senderPhone,
              messageId,
              text: textContent,
              buttonPayload,
              listReplyId,
            });

            processedCount++;
          }
        }
      }
    }

    return { processedCount };
  }

  /**
   * Updates dispatch log status in database based on Meta callback
   */
  private async handleDeliveryStatusUpdate(
    providerMessageId: string,
    status: WhatsAppMessageStatus,
    errors?: Array<{ code: number; title: string; message: string }>
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (errors && errors.length > 0) {
        updateData.error_code = errors[0].code.toString();
        updateData.error_message = `${errors[0].title}: ${errors[0].message}`;
      }

      await supabase
        .from('communication_dispatch_logs')
        .update(updateData)
        .eq('provider_message_id', providerMessageId);
    } catch (err) {
      console.warn('[WhatsAppWebhookHandler] Error updating dispatch log status:', err);
    }
  }
}

export const whatsAppWebhookHandler = WhatsAppWebhookHandler.getInstance();
