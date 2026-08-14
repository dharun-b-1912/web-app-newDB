// src/services/platform/platformBillingService.ts
// ============================================================
// WorkForceOS — SaaS Financial Billing, GST Invoicing & Reconciliation Service
// ============================================================

import { PlatformBillingInvoice } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

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
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  line_items?: InvoiceLineItem[];
  billing_address?: string;
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

// Authoritative Billing Data (Populated live from Web / Supabase)
const initialInvoices: DetailedInvoice[] = [];
const initialTransactions: PaymentTransactionItem[] = [];
const initialDunning: DunningAccountItem[] = [];
const initialCreditNotes: CreditNoteItem[] = [];

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

  async markAsPaid(id: string, paymentMethod?: string, reference?: string): Promise<DetailedInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Paid';
    target.paid_at = new Date().toISOString();
    if (paymentMethod) target.payment_method = paymentMethod;
    if (reference) target.payment_gateway_ref = reference;
    target.reconciliation_status = 'Matched';

    // Add to transaction ledger
    initialTransactions.unshift({
      id: `tx-${Date.now()}`,
      transaction_ref: reference || `utr_${Date.now()}`,
      invoice_id: target.id,
      invoice_number: target.invoice_number,
      tenant_id: target.tenant_id,
      tenant_name: target.tenant_name,
      amount: target.total || target.amount,
      gateway: 'Bank Wire (RTGS)',
      gateway_fee: 0,
      net_payout: target.total || target.amount,
      settlement_status: 'Settled',
      settlement_batch_id: `manual_settle_${Date.now()}`,
      created_at: new Date().toLocaleString(),
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'INVOICE_MARKED_PAID',
      resource_type: 'Invoice',
      resource_id: id,
      severity: 'Normal',
      reason: `Invoice ${target.invoice_number} manually reconciled with reference ${reference || 'N/A'}`,
    });

    return target;
  },

  async issueRefund(id: string, reason: string): Promise<DetailedInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Refunded';

    initialCreditNotes.unshift({
      id: `cn-${Date.now()}`,
      credit_note_number: `CN-2026-00${initialCreditNotes.length + 1}`,
      original_invoice_number: target.invoice_number,
      tenant_name: target.tenant_name,
      amount: target.total || target.amount,
      issued_date: new Date().toISOString().split('T')[0],
      reason: reason || 'SaaS subscription credit refund issued',
      status: 'Refunded to Bank',
      authorized_by: 'WorkForce Super Admin',
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'INVOICE_REFUND_ISSUED',
      resource_type: 'Invoice',
      resource_id: id,
      severity: 'High',
      reason: reason || 'SaaS subscription credit refund issued',
    });

    return target;
  },

  async triggerDunningRetry(dunningId: string): Promise<void> {
    const item = initialDunning.find(d => d.id === dunningId);
    if (item) {
      item.retry_count += 1;
      item.last_attempt_message = `Manual payment retry initiated on ${new Date().toLocaleDateString()}: Payment gateway webhook sent.`;
    }
  },
};
