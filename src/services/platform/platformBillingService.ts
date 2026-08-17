// src/services/platform/platformBillingService.ts
// ============================================================
// WorkForceOS — SaaS Financial Billing, GST Invoicing & Reconciliation Service
// ============================================================

import { PlatformBillingInvoice } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn_sac: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface DetailedInvoice extends PlatformBillingInvoice {
  plan_tier?: string;
  tenant_gstin?: string;
  platform_gstin?: string;
  tax?: number;
  issue_date?: string;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  line_items?: InvoiceLineItem[];
  billing_address?: string;
  transaction_ref?: string;
  download_url?: string;
}

export interface PaymentTransactionItem {
  id: string;
  transaction_ref: string;
  invoice_id: string;
  invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  gateway: 'Razorpay' | 'Stripe' | 'ICICI NetBanking' | 'Bank Wire (RTGS)' | 'Corporate UPI';
  gateway_fee: number;
  net_payout: number;
  settlement_status: 'Settled' | 'Processing' | 'Failed' | 'Refunded';
  settlement_batch_id: string;
  created_at: string;
}

export interface DunningAccountItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  invoice_number: string;
  overdue_amount: number;
  days_overdue: number;
  aging_bucket: 'Current (0-15d)' | '16-30 Days' | '31-60 Days' | '60+ Days';
  retry_count: number;
  max_retries: number;
  next_retry_date: string;
  dunning_status: 'Grace Period' | 'Active Dunning' | 'Escalated' | 'Access Suspended';
  contact_email: string;
  last_attempt_message: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_number: string;
  original_invoice_number: string;
  tenant_name: string;
  amount: number;
  issued_date: string;
  reason: string;
  status: 'Applied to Next Bill' | 'Refunded to Bank' | 'Draft';
  authorized_by: string;
}

// Canonical Paid Invoice for Joy Corporate Solutions Pvt Ltd
const defaultJoyInvoice: DetailedInvoice = {
  id: 'inv-joy-000001',
  invoice_number: 'INV-2026-000001',
  tenant_id: 'org-joy-corp',
  tenant_name: 'Joy Corporate Solutions Pvt Ltd',
  plan_tier: 'Professional',
  subtotal: 45000,
  tax: 8100,
  gst_amount: 8100,
  total: 53100,
  amount: 53100,
  currency: 'INR',
  status: 'Paid',
  billing_date: new Date().toISOString().split('T')[0],
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
  paid_at: new Date().toISOString(),
  payment_method: 'UPI / NetBanking (Sandbox)',
  transaction_ref: 'PAY-TEST-000001',
  reconciliation_status: 'Matched',
  download_url: '#',
  cgst_amount: 4050,
  sgst_amount: 4050,
  line_items: [
    {
      id: 'li-1',
      description: 'Professional Plan Monthly Subscription (100 Included Seats)',
      hsn_sac: '998313',
      qty: 1,
      unit_price: 45000,
      amount: 45000,
    },
  ],
};

const defaultJoyTransaction: PaymentTransactionItem = {
  id: 'pay-joy-000001',
  transaction_ref: 'PAY-TEST-000001',
  invoice_id: 'inv-joy-000001',
  invoice_number: 'INV-2026-000001',
  tenant_id: 'org-joy-corp',
  tenant_name: 'Joy Corporate Solutions Pvt Ltd',
  amount: 53100,
  gateway: 'Razorpay',
  gateway_fee: 0,
  net_payout: 53100,
  settlement_status: 'Settled',
  settlement_batch_id: 'BATCH-2026-0817',
  created_at: new Date().toISOString(),
};

let initialInvoices: DetailedInvoice[] = [defaultJoyInvoice];
let initialTransactions: PaymentTransactionItem[] = [defaultJoyTransaction];
let initialDunning: DunningAccountItem[] = [];
let initialCreditNotes: CreditNoteItem[] = [];

export const platformBillingService = {
  getInvoices(): DetailedInvoice[] {
    return initialInvoices;
  },

  getTransactions(): PaymentTransactionItem[] {
    return initialTransactions;
  },

  getDunning(): DunningAccountItem[] {
    return initialDunning;
  },

  getCreditNotes(): CreditNoteItem[] {
    return initialCreditNotes;
  },

  getMetrics() {
    const invoices = this.getInvoices();
    const paidInvoices = invoices.filter((i) => i.status === 'Paid');
    const totalCollected = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

    return {
      total_invoices: invoices.length,
      paid_invoices_count: paidInvoices.length,
      total_collected_inr: totalCollected,
      overdue_count: overdueInvoices.length,
      overdue_amount_inr: overdueAmount,
      collection_rate_pct: invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100,
    };
  },

  async markAsPaid(id: string, paymentMethod?: string, reference?: string): Promise<DetailedInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Paid';
    target.paid_at = new Date().toISOString();
    target.payment_method = paymentMethod || target.payment_method;
    target.transaction_ref = reference || target.transaction_ref;
    target.reconciliation_status = 'Matched';

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_invoices')
          .update({
            status: 'Paid',
            paid_at: target.paid_at,
            payment_method: target.payment_method,
            payment_gateway_ref: target.transaction_ref,
            reconciliation_status: 'Matched',
          })
          .eq('id', id);
      } catch (err) {
        console.warn('[PlatformBillingService] Supabase markAsPaid fallback:', err);
      }
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'INVOICE_MARKED_PAID',
      resource_type: 'Invoice',
      resource_id: target.invoice_number,
      severity: 'Normal',
      reason: `Settled payment of ₹${target.total.toLocaleString('en-IN')} via ${target.payment_method || 'Sandbox Gateway'}`,
    });

    return target;
  },

  async voidInvoice(id: string, reason: string): Promise<DetailedInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Refunded';

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'INVOICE_VOIDED',
      resource_type: 'Invoice',
      resource_id: target.invoice_number,
      severity: 'High',
      reason: `Voided invoice ${target.invoice_number}: ${reason}`,
    });

    return target;
  },

  async issueRefund(invoiceId: string, amountOrReason?: number | string, optionalReason?: string): Promise<DetailedInvoice> {
    const target = initialInvoices.find(inv => inv.id === invoiceId);
    if (!target) throw new Error('Invoice not found');

    const refundAmount = typeof amountOrReason === 'number' ? amountOrReason : target.total;
    const reasonText = typeof amountOrReason === 'string' ? amountOrReason : optionalReason || 'Administrative refund';

    target.status = 'Refunded';

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'PAYMENT_REFUNDED',
      resource_type: 'Invoice',
      resource_id: target.invoice_number,
      severity: 'High',
      reason: `Processed refund of ₹${refundAmount.toLocaleString('en-IN')} for ${target.invoice_number}: ${reasonText}`,
    });

    return target;
  },

  async triggerDunningRetry(dunningId: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Retried automated charge sequence for account ${dunningId}`,
    };
  },
};
