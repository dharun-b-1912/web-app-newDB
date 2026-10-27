// src/services/platform/razorpayWebhookService.ts
// ============================================================================
// Joy PeopleHR — Razorpay Webhook Ingress & Event Processing Engine
// Handles Payment, Subscription & Invoice Lifecycle Events
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

export const RAZORPAY_WEBHOOK_SECRET =
  import.meta.env.VITE_RAZORPAY_WEBHOOK_SECRET || 'joy_rzp_webhook_secret_2026_x89k';

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: { entity: any };
    order?: { entity: any };
    subscription?: { entity: any };
    invoice?: { entity: any };
  };
  created_at: number;
}

export interface WebhookProcessResult {
  success: boolean;
  event: string;
  message: string;
  idempotent?: boolean;
  details?: any;
}

class RazorpayWebhookService {
  /**
   * Process incoming Razorpay webhook event
   */
  public async processWebhookEvent(eventData: RazorpayWebhookPayload): Promise<WebhookProcessResult> {
    const { event, payload, created_at } = eventData;
    console.log(`[RazorpayWebhook] Ingested Event: ${event} at ${new Date(created_at * 1000).toISOString()}`);

    try {
      switch (event) {
        // ── 1. PAYMENT & ORDER SUCCESS ──────────────────────────────────────────
        case 'payment.captured':
        case 'payment.authorized':
        case 'order.paid': {
          const payment = payload.payment?.entity;
          const order = payload.order?.entity;
          const paymentId = payment?.id || `pay_${Date.now()}`;
          const orderId = payment?.order_id || order?.id || '';
          const amountInPaise = payment?.amount || order?.amount || 0;
          const amountInInr = amountInPaise > 0 ? amountInPaise / 100 : 0;
          const method = payment?.method || 'Online';
          const notes = payment?.notes || order?.notes || {};

          const invoiceId = notes.invoice_id || notes.invoiceNumber || '';
          const subscriptionId = notes.subscription_id || '';
          const organizationId = notes.organization_id || notes.org_id || 'org-joy-01';
          const idempotencyKey = `webhook_${paymentId}_${event}`;

          // Check Idempotency in Supabase
          if (isSupabaseEnabled) {
            const { data: existing } = await supabase
              .from('platform_payments')
              .select('id')
              .eq('idempotency_key', idempotencyKey)
              .maybeSingle();

            if (existing) {
              return {
                success: true,
                event,
                idempotent: true,
                message: `Duplicate webhook for payment ${paymentId} safely ignored`,
              };
            }
          }

          const paidAt = new Date().toISOString();

          if (isSupabaseEnabled) {
            // 1. Insert into platform_payments
            await supabase.from('platform_payments').insert([
              {
                id: 'pay-' + crypto.randomUUID(),
                tenant_id: organizationId,
                invoice_id: invoiceId || null,
                subscription_id: subscriptionId || null,
                provider: 'Razorpay Sandbox',
                provider_payment_id: paymentId,
                amount: amountInInr,
                currency: 'INR',
                status: 'succeeded',
                payment_method_type: `Razorpay (${method.toUpperCase()})`,
                idempotency_key: idempotencyKey,
                paid_at: paidAt,
              },
            ]);

            // 2. Mark invoice as Paid
            if (invoiceId) {
              await supabase
                .from('platform_invoices')
                .update({
                  status: 'Paid',
                  amount_paid: amountInInr,
                  amount_due: 0.0,
                  paid_at: paidAt,
                  payment_gateway_ref: `${paymentId} (${orderId})`,
                  reconciliation_status: 'Matched',
                })
                .or(`id.eq.${invoiceId},invoice_number.eq.${invoiceId}`);
            }

            // 3. Mark subscription as Active
            if (subscriptionId) {
              await supabase
                .from('saas_subscriptions')
                .update({
                  status: 'Active',
                })
                .eq('id', subscriptionId);
            }

            // 4. Update organization commercial status
            if (organizationId) {
              await supabase
                .from('organizations')
                .update({
                  status: 'ACTIVE',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', organizationId);
            }
          }

          // 5. Audit Logging
          await platformAuditService.logEvent({
            action: 'payment.webhook_captured',
            resource_type: 'platform_payments',
            resource_id: paymentId,
            organization_id: organizationId,
            details: `Webhook ${event}: Settlement of ₹${amountInInr.toLocaleString('en-IN')} confirmed (Ref: ${paymentId})`,
            severity: 'Info',
          });

          return {
            success: true,
            event,
            message: `Payment ${paymentId} settled successfully for Invoice ${invoiceId || 'N/A'}`,
            details: { paymentId, orderId, amountInInr },
          };
        }

        // ── 2. SUBSCRIPTION CHARGED & ACTIVATED ─────────────────────────────────
        case 'subscription.charged':
        case 'subscription.activated':
        case 'subscription.authenticated': {
          const subEntity = payload.subscription?.entity;
          const subId = subEntity?.id;
          const currentEnd = subEntity?.current_end;
          const newRenewalDate = currentEnd
            ? new Date(currentEnd * 1000).toISOString().slice(0, 10)
            : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

          if (isSupabaseEnabled && subId) {
            await supabase
              .from('saas_subscriptions')
              .update({
                status: 'Active',
                renewal_date: newRenewalDate,
              })
              .or(`id.eq.${subId},gateway_subscription_id.eq.${subId}`);
          }

          await platformAuditService.logEvent({
            action: `subscription.${event}`,
            resource_type: 'saas_subscriptions',
            resource_id: subId || 'sub-global',
            organization_id: 'org-joy-01',
            details: `Webhook ${event}: Subscription marked Active with renewal on ${newRenewalDate}`,
            severity: 'Info',
          });

          return {
            success: true,
            event,
            message: `Subscription ${subId || ''} renewed until ${newRenewalDate}`,
          };
        }

        // ── 3. SUBSCRIPTION PAUSED & HALTED ─────────────────────────────────────
        case 'subscription.paused':
        case 'subscription.halted': {
          const subId = payload.subscription?.entity?.id;
          if (isSupabaseEnabled && subId) {
            await supabase
              .from('saas_subscriptions')
              .update({ status: 'Suspended' })
              .or(`id.eq.${subId},gateway_subscription_id.eq.${subId}`);
          }
          return { success: true, event, message: `Subscription ${subId} set to Suspended` };
        }

        // ── 4. SUBSCRIPTION CANCELLED ───────────────────────────────────────────
        case 'subscription.cancelled': {
          const subId = payload.subscription?.entity?.id;
          if (isSupabaseEnabled && subId) {
            await supabase
              .from('saas_subscriptions')
              .update({ status: 'Cancelled' })
              .or(`id.eq.${subId},gateway_subscription_id.eq.${subId}`);
          }
          return { success: true, event, message: `Subscription ${subId} cancelled` };
        }

        // ── 5. PAYMENT FAILED ───────────────────────────────────────────────────
        case 'payment.failed': {
          const payment = payload.payment?.entity;
          const paymentId = payment?.id || 'pay-failed';
          const errorDesc = payment?.error_description || 'Payment card/instrument declined';
          const notes = payment?.notes || {};

          await platformAuditService.logEvent({
            action: 'payment.failed',
            resource_type: 'platform_payments',
            resource_id: paymentId,
            organization_id: notes.organization_id || 'org-joy-01',
            details: `Payment ${paymentId} failed: ${errorDesc}`,
            severity: 'Error',
          });

          return {
            success: false,
            event,
            message: `Payment ${paymentId} failed: ${errorDesc}`,
          };
        }

        default: {
          console.log(`[RazorpayWebhook] Unhandled event category: ${event}`);
          return {
            success: true,
            event,
            message: `Event ${event} acknowledged`,
          };
        }
      }
    } catch (err: any) {
      console.error(`[RazorpayWebhook] Handler error:`, err);
      return {
        success: false,
        event,
        message: `Handler error: ${err.message}`,
      };
    }
  }
}

export const razorpayWebhookService = new RazorpayWebhookService();
