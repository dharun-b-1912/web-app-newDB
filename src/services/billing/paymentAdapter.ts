// src/services/billing/paymentAdapter.ts
// ============================================================
// WorkForceOS — Payment Provider Adapter & Sandbox Engine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from '../platform/platformAuditService';

export type PaymentGatewayType = 'Razorpay Sandbox' | 'Stripe Sandbox' | 'Offline / Bank Transfer (Test)';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface CreatePaymentIntentParams {
  organizationId: string;
  invoiceId: string;
  subscriptionId?: string;
  amount: number; // in INR
  currency: string;
  paymentMethodType: 'UPI' | 'Card' | 'NetBanking' | 'Corporate Account';
  idempotencyKey?: string;
}

export interface PaymentTransactionResult {
  paymentId: string;
  providerPaymentId: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentGatewayType;
  paidAt?: string;
  idempotencyKey?: string;
}

export interface WebhookPayload {
  event: 'payment.succeeded' | 'payment.failed' | 'subscription.renewed' | 'invoice.paid';
  payload: {
    paymentId: string;
    organizationId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
  };
  signature: string;
  idempotencyKey: string;
}

export const paymentAdapter = {
  /**
   * Execute a payment in Test/Sandbox mode.
   * Creates real database payment records idempotently.
   */
  async processSandboxPayment(params: CreatePaymentIntentParams): Promise<PaymentTransactionResult> {
    const {
      organizationId,
      invoiceId,
      subscriptionId,
      amount,
      currency,
      paymentMethodType,
      idempotencyKey = crypto.randomUUID(),
    } = params;

    const paymentId = 'pay-' + crypto.randomUUID();
    const providerPaymentId = 'PAY-TEST-' + Math.floor(100000 + Math.random() * 900000);
    const paidAt = new Date().toISOString();

    const record: PaymentTransactionResult = {
      paymentId,
      providerPaymentId,
      organizationId,
      invoiceId,
      amount,
      currency,
      status: 'succeeded',
      provider: 'Razorpay Sandbox',
      paidAt,
      idempotencyKey,
    };

    if (isSupabaseEnabled) {
      try {
        // 1. Insert payment record idempotently
        await supabase.from('platform_payments').insert([
          {
            id: paymentId,
            tenant_id: organizationId,
            invoice_id: invoiceId,
            subscription_id: subscriptionId,
            provider: 'Razorpay Sandbox',
            provider_payment_id: providerPaymentId,
            amount,
            currency,
            status: 'succeeded',
            payment_method_type: paymentMethodType,
            idempotency_key: idempotencyKey,
            paid_at: paidAt,
          },
        ]);

        // 2. Mark invoice as paid
        await supabase
          .from('platform_invoices')
          .update({
            status: 'Paid',
            amount_paid: amount,
            amount_due: 0.0,
            paid_at: paidAt,
            payment_gateway_ref: providerPaymentId,
            reconciliation_status: 'Matched',
          })
          .eq('id', invoiceId);

        // 3. Mark subscription as Active
        if (subscriptionId) {
          await supabase
            .from('platform_subscriptions')
            .update({
              status: 'Active',
            })
            .eq('id', subscriptionId);
        }

        // 4. Update organization commercial status
        await supabase
          .from('organizations')
          .update({
            status: 'Active',
            billing_status: 'Paid',
            lifecycle_state: 'Active',
          })
          .eq('id', organizationId);
      } catch (err) {
        console.warn('[PaymentAdapter] Supabase payment recording fallback:', err);
      }
    }

    // 5. Audit Logging
    await platformAuditService.logEvent({
      action: 'payment.succeeded',
      resource_type: 'platform_payments',
      resource_id: paymentId,
      organization_id: organizationId,
      details: `Test payment of ₹${amount.toLocaleString('en-IN')} succeeded via Razorpay Sandbox for Invoice ${invoiceId}`,
      severity: 'Info',
    });

    return record;
  },

  /**
   * Handle incoming server-to-server webhook with signature and idempotency verification.
   */
  async handlePaymentWebhook(webhook: WebhookPayload): Promise<{ success: boolean; message: string }> {
    const { event, payload, signature, idempotencyKey } = webhook;

    if (!signature || signature !== 'valid_sandbox_sig') {
      return { success: false, message: 'Invalid webhook signature' };
    }

    // Verify Idempotency in Supabase
    if (isSupabaseEnabled) {
      const { data: existing } = await supabase
        .from('platform_payments')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        return { success: true, message: 'Webhook already processed (Idempotent duplicate ignored)' };
      }
    }

    if (event === 'payment.succeeded') {
      await this.processSandboxPayment({
        organizationId: payload.organizationId,
        invoiceId: payload.invoiceId,
        amount: payload.amount,
        currency: payload.currency,
        paymentMethodType: 'UPI',
        idempotencyKey,
      });
    }

    return { success: true, message: 'Webhook processed successfully' };
  },
};
