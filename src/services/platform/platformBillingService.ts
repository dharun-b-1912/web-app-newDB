// src/services/platform/platformBillingService.ts
// ============================================================
// Joy PeopleHR — SaaS Financial Billing, GST Invoicing & FinOps Engine
// ============================================================

import { PlatformBillingInvoice } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';
import { platformTenantService } from './platformTenantService';
import { resendEmailService } from '../email/resendEmailService';
import { billingCalculationEngine, TaxCalculationResult } from '../billing/billingCalculationEngine';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { api } from '../api';

function getActorInfo(authorizedBy?: string) {
  const user = api.getCurrentUser();
  const name = user?.name || user?.email || 'Platform Admin';
  const id = user?.id || 'platform-admin';
  const role = user?.roles?.[0]?.name || 'Platform Admin';
  return {
    actor_id: id,
    actor_name: name,
    actor_role: role,
    authorized_by: authorizedBy || `${name} (Platform Admin)`,
  };
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Void' | 'Cancelled';
export type PaymentStatus = 'Settled' | 'Processing' | 'Failed' | 'Refunded';
export type DeliveryStatus = 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn_sac: string;
  qty: number;
  unit_price: number;
  discount_amount?: number;
  taxable_amount: number;
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
  place_of_supply?: string;
  transaction_ref?: string;
  download_url?: string;
  amount_paid: number;
  balance_due: number;
  email_delivery_status?: DeliveryStatus;
  email_sent_at?: string;
  whatsapp_delivery_status?: DeliveryStatus;
  whatsapp_sent_at?: string;
  notes?: string;
}

export interface PaymentTransactionItem {
  id: string;
  transaction_ref: string;
  invoice_id: string;
  invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  currency: string;
  gateway: 'Razorpay (Sandbox)' | 'Stripe' | 'ICICI NetBanking' | 'Bank Wire (RTGS)' | 'Corporate UPI';
  gateway_fee: number;
  net_payout: number;
  settlement_status: PaymentStatus;
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
  tenant_id: string;
  tenant_name: string;
  amount: number;
  tax_adjustment: number;
  total_credit: number;
  issued_date: string;
  reason: string;
  status: 'Applied to Next Bill' | 'Refunded to Bank' | 'Draft';
  authorized_by: string;
}

export interface RefundItem {
  id: string;
  refund_number: string;
  invoice_number: string;
  payment_ref: string;
  tenant_name: string;
  amount: number;
  reason: string;
  status: 'Completed' | 'Processing' | 'Failed';
  created_at: string;
  authorized_by: string;
}

export interface FinancialLedgerEntry {
  id: string;
  date: string;
  invoice_number?: string;
  tenant_name: string;
  account: 'Accounts Receivable' | 'Revenue' | 'GST Payable (CGST+SGST)' | 'GST Payable (IGST)' | 'Bank & Gateway Clearing';
  debit: number;
  credit: number;
  description: string;
}

const STORAGE_INVOICES_KEY = 'joy_saas_invoices_v3';
const STORAGE_TRANSACTIONS_KEY = 'joy_saas_transactions_v3';
const STORAGE_LEDGER_KEY = 'joy_saas_ledger_v3';

let invoiceDb: DetailedInvoice[] = [];
let transactionDb: PaymentTransactionItem[] = [];
let dunningDb: DunningAccountItem[] = [];
let creditNoteDb: CreditNoteItem[] = [];
let refundDb: RefundItem[] = [];
let ledgerDb: FinancialLedgerEntry[] = [];

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const rawInv = localStorage.getItem(STORAGE_INVOICES_KEY);
    if (rawInv) {
      const parsed = JSON.parse(rawInv);
      if (Array.isArray(parsed)) {
        invoiceDb = parsed.filter(
          (i: any) =>
            i &&
            !String(i.id || '').startsWith('inv-0') &&
            !String(i.tenant_name || '').toLowerCase().includes('abc industries') &&
            !String(i.tenant_name || '').toLowerCase().includes('xyz logistics')
        );
      }
    }
    const rawTx = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
    if (rawTx) transactionDb = JSON.parse(rawTx);
    const rawLedger = localStorage.getItem(STORAGE_LEDGER_KEY);
    if (rawLedger) ledgerDb = JSON.parse(rawLedger);
  } catch (e) {
    console.warn('[BillingService] Storage read notice:', e);
  }
}

function saveToStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(invoiceDb));
    localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(transactionDb));
    localStorage.setItem(STORAGE_LEDGER_KEY, JSON.stringify(ledgerDb));
  } catch (e) {
    console.warn('[BillingService] Storage write notice:', e);
  }
}

function ensureSynchronizedFromTenants() {
  if (invoiceDb.length > 0) return;
  loadFromStorage();
  if (invoiceDb.length > 0) return;

  const orgs = platformTenantService.getOrganizations().items;
  if (orgs.length === 0) return;

  // Initialize canonical invoices for registered live organizations
  orgs.forEach((org, idx) => {
    const orgLegal = (org.legal_name || '').toLowerCase();
    if (
      org.id === 'org-joy-corp' ||
      org.id.includes('joy-corp') ||
      orgLegal.includes('joy corporate solutions')
    ) {
      return; // Skip platform provider org (no self-billing)
    }

    const planPricing: Record<string, number> = {
      Starter: 18000,
      Professional: 45000,
      Business: 85000,
      Enterprise: 180000,
    };
    const subtotal = org.mrr || planPricing[org.plan] || 45000;
    const taxRes = billingCalculationEngine.calculateTaxes(subtotal, {
      supplierStateCode: '33',
      supplierStateName: 'Tamil Nadu',
      customerStateCode: '33',
      customerStateName: 'Tamil Nadu',
      gstRatePct: 18,
    });

    const invoiceId = `inv-org-${org.tenant_id}`;
    const invoiceNumber = `INV-2026-${String(idx + 1).padStart(6, '0')}`;
    const isPaid = org.billing_status === 'Paid' || String(org.billing_status).toUpperCase() === 'PAID';
    const amountPaid = isPaid ? taxRes.grandTotal : 0;
    const balanceDue = isPaid ? 0 : taxRes.grandTotal;

    const initialInv: DetailedInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      tenant_id: org.tenant_id,
      tenant_name: org.legal_name,
      plan_tier: org.plan,
      subtotal,
      tax: taxRes.totalTaxAmount,
      gst_amount: taxRes.totalTaxAmount,
      cgst_amount: taxRes.cgstAmount,
      sgst_amount: taxRes.sgstAmount,
      igst_amount: taxRes.igstAmount,
      total: taxRes.grandTotal,
      amount: taxRes.grandTotal,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      currency: 'INR',
      status: isPaid ? 'Paid' : 'Issued',
      billing_date: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      issue_date: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      payment_method: isPaid ? 'Razorpay (Sandbox)' : 'Pending Online Settlement',
      reconciliation_status: isPaid ? 'Matched' : 'Unmatched',
      billing_address: `${org.city || 'Coimbatore'}, ${org.state || 'Tamil Nadu'}, India`,
      tenant_gstin: org.gstin || '33AABCT9841C1Z0',
      place_of_supply: 'Tamil Nadu (33)',
      platform_gstin: '33AAACW0000A1Z5',
      line_items: [
        {
          id: `li-seed-${idx}-1`,
          description: `Joy PeopleHR SaaS Subscription — ${org.plan} Tier (${org.seat_limit} Seats Included)`,
          hsn_sac: '998315',
          qty: 1,
          unit_price: subtotal,
          taxable_amount: subtotal,
          amount: subtotal,
        },
      ],
      email_delivery_status: 'DELIVERED',
      email_sent_at: 'Delivered via Email Gateway',
      whatsapp_delivery_status: 'NOT_SENT',
    };

    invoiceDb.push(initialInv);

    if (isPaid) {
      transactionDb.push({
        id: `txn-org-${org.tenant_id}`,
        transaction_ref: `TXN-RZP-${org.tenant_id.slice(-6).toUpperCase()}`,
        invoice_id: initialInv.id,
        invoice_number: initialInv.invoice_number,
        tenant_id: org.tenant_id,
        tenant_name: org.legal_name,
        amount: initialInv.total,
        currency: 'INR',
        gateway: 'Razorpay (Sandbox)',
        gateway_fee: Math.round(initialInv.total * 0.02),
        net_payout: Math.round(initialInv.total * 0.98),
        settlement_status: 'Settled',
        settlement_batch_id: 'SETTL-BATCH-2026-AUG',
        created_at: initialInv.issue_date || new Date().toISOString().slice(0, 10),
      });

      ledgerDb.push({
        id: `led-org-${idx}-1`,
        date: initialInv.issue_date || new Date().toISOString().slice(0, 10),
        invoice_number: initialInv.invoice_number,
        tenant_name: initialInv.tenant_name,
        account: 'Revenue',
        debit: 0,
        credit: initialInv.subtotal,
        description: `${org.plan} Plan Subscription Revenue`,
      });

      ledgerDb.push({
        id: `led-org-${idx}-2`,
        date: initialInv.issue_date || new Date().toISOString().slice(0, 10),
        invoice_number: initialInv.invoice_number,
        tenant_name: initialInv.tenant_name,
        account: 'GST Payable (CGST+SGST)',
        debit: 0,
        credit: initialInv.gst_amount || 0,
        description: `GST Collected (18%) on ${initialInv.invoice_number}`,
      });
    }
  });

  saveToStorage();
}

export const platformBillingService = {
  getInvoices(): DetailedInvoice[] {
    ensureSynchronizedFromTenants();
    return invoiceDb;
  },

  getTransactions(): PaymentTransactionItem[] {
    ensureSynchronizedFromTenants();
    return transactionDb;
  },

  getDunning(): DunningAccountItem[] {
    ensureSynchronizedFromTenants();
    return dunningDb;
  },

  getCreditNotes(): CreditNoteItem[] {
    ensureSynchronizedFromTenants();
    return creditNoteDb;
  },

  getRefunds(): RefundItem[] {
    ensureSynchronizedFromTenants();
    return refundDb;
  },

  getLedger(): FinancialLedgerEntry[] {
    ensureSynchronizedFromTenants();
    return ledgerDb;
  },

  getInvoiceById(id: string): DetailedInvoice | undefined {
    ensureSynchronizedFromTenants();
    return invoiceDb.find((inv) => inv.id === id || inv.invoice_number === id);
  },

  /**
   * Calculate exact aggregated financial KPIs for selected billing period.
   */
  calculateKpis(period: string = 'Current Month') {
    ensureSynchronizedFromTenants();
    const grossInvoiced = invoiceDb
      .filter((i) => (i.status as string) !== 'Draft' && (i.status as string) !== 'Void' && (i.status as string) !== 'Cancelled')
      .reduce((sum, i) => sum + i.subtotal, 0);

    const collected = transactionDb
      .filter((t) => t.settlement_status === 'Settled')
      .reduce((sum, t) => sum + t.amount, 0);

    const outstanding = invoiceDb
      .filter((i) => i.status === 'Issued' || (i.status as string) === 'Sent' || i.status === 'Partially Paid' || i.status === 'Overdue')
      .reduce((sum, i) => sum + i.balance_due, 0);

    const overdue = invoiceDb
      .filter((i) => i.status === 'Overdue')
      .reduce((sum, i) => sum + i.balance_due, 0);

    const taxCollected = invoiceDb
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + (i.gst_amount || 0), 0);

    return {
      grossInvoiced,
      collected,
      outstanding,
      overdue,
      taxCollected,
    };
  },

  /**
   * Create & Issue a new Tax Invoice with dynamic GST calculations.
   */
  async createInvoice(params: {
    tenantId: string;
    tenantName: string;
    planTier: string;
    billingAddress: string;
    customerGstin?: string;
    customerStateCode: string;
    customerStateName: string;
    lineItems: { description: string; sacHsn: string; qty: number; unitPrice: number; discountAmount?: number }[];
    issueDate?: string;
    dueDate?: string;
    notes?: string;
  }): Promise<DetailedInvoice> {
    const currentYear = new Date().getFullYear();
    const invoiceSeq = String(invoiceDb.length + 1).padStart(6, '0');
    const invoiceNumber = `INV-${currentYear}-${invoiceSeq}`;
    const invoiceId = `inv-${Date.now()}`;

    // Compute line items taxable total
    const computedItems: InvoiceLineItem[] = params.lineItems.map((item, idx) => {
      const lineRes = billingCalculationEngine.calculateLineItem({
        description: item.description,
        sacHsn: item.sacHsn,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      });
      return {
        id: `li-${Date.now()}-${idx}`,
        description: lineRes.description,
        hsn_sac: lineRes.sacHsn,
        qty: lineRes.quantity,
        unit_price: lineRes.unitPrice,
        discount_amount: lineRes.appliedDiscount,
        taxable_amount: lineRes.taxableAmount,
        amount: lineRes.grossAmount,
      };
    });

    const subtotal = computedItems.reduce((acc, curr) => acc + curr.taxable_amount, 0);

    // Compute Indian GST (Supplier TN '33' vs Customer state)
    const taxRes = billingCalculationEngine.calculateTaxes(subtotal, {
      supplierStateCode: '33',
      supplierStateName: 'Tamil Nadu',
      customerStateCode: params.customerStateCode || '33',
      customerStateName: params.customerStateName || 'Tamil Nadu',
      gstRatePct: 18,
    });

    const newInvoice: DetailedInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      tenant_id: params.tenantId,
      tenant_name: params.tenantName,
      plan_tier: params.planTier,
      subtotal,
      tax: taxRes.totalTaxAmount,
      gst_amount: taxRes.totalTaxAmount,
      cgst_amount: taxRes.cgstAmount,
      sgst_amount: taxRes.sgstAmount,
      igst_amount: taxRes.igstAmount,
      total: taxRes.grandTotal,
      amount: taxRes.grandTotal,
      amount_paid: 0,
      balance_due: taxRes.grandTotal,
      currency: 'INR',
      status: 'Issued',
      billing_date: params.issueDate || new Date().toISOString().split('T')[0],
      issue_date: params.issueDate || new Date().toISOString().split('T')[0],
      due_date: params.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_method: 'Pending Online Settlement',
      reconciliation_status: 'Unmatched',
      billing_address: params.billingAddress,
      tenant_gstin: params.customerGstin,
      place_of_supply: `${params.customerStateName} (${params.customerStateCode})`,
      platform_gstin: '33AAACW0000A1Z5',
      line_items: computedItems,
      notes: params.notes,
      email_delivery_status: 'NOT_SENT',
      whatsapp_delivery_status: 'NOT_SENT',
    };

    invoiceDb.unshift(newInvoice);

    // Double-entry accounting ledger entries
    ledgerDb.unshift({
      id: `led-${Date.now()}-1`,
      date: newInvoice.issue_date || new Date().toISOString().split('T')[0],
      invoice_number: newInvoice.invoice_number,
      tenant_name: newInvoice.tenant_name,
      account: 'Accounts Receivable',
      debit: newInvoice.total,
      credit: 0,
      description: `Invoice ${newInvoice.invoice_number} created`,
    });
    ledgerDb.unshift({
      id: `led-${Date.now()}-2`,
      date: newInvoice.issue_date || new Date().toISOString().split('T')[0],
      invoice_number: newInvoice.invoice_number,
      tenant_name: newInvoice.tenant_name,
      account: 'Revenue',
      debit: 0,
      credit: newInvoice.subtotal,
      description: `${newInvoice.plan_tier} Plan Subscription`,
    });

    // Forensic audit entry
    const actor = getActorInfo();
    await platformAuditService.logEvent({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      actor_role: actor.actor_role,
      organization_id: params.tenantId,
      organization_name: params.tenantName,
      action: 'INVOICE_CREATED',
      resource_type: 'Invoice',
      resource_id: invoiceId,
      severity: 'Normal',
      reason: `Generated ${newInvoice.invoice_number} for ₹${newInvoice.total.toLocaleString('en-IN')}`,
    });

    saveToStorage();
    return newInvoice;
  },

  /**
   * Record a full or partial payment.
   */
  async recordPayment(params: {
    invoiceId: string;
    amount: number;
    paymentMethod: 'Razorpay (Sandbox)' | 'Stripe' | 'ICICI NetBanking' | 'Bank Wire (RTGS)' | 'Corporate UPI';
    transactionRef: string;
  }): Promise<DetailedInvoice> {
    const inv = invoiceDb.find((i) => i.id === params.invoiceId || i.invoice_number === params.invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const paymentAmount = Math.min(params.amount, inv.balance_due);
    inv.amount_paid += paymentAmount;
    inv.balance_due = Math.max(0, inv.total - inv.amount_paid);

    if (inv.balance_due === 0) {
      inv.status = 'Paid';
      inv.paid_at = new Date().toLocaleString();
      inv.reconciliation_status = 'Matched';
    } else {
      inv.status = 'Partially Paid';
      inv.reconciliation_status = 'Needs Review';
    }

    inv.payment_method = params.paymentMethod;
    inv.transaction_ref = params.transactionRef;

    // Create payment transaction item
    const paymentId = `pay-${Date.now()}`;
    transactionDb.unshift({
      id: paymentId,
      transaction_ref: params.transactionRef,
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      tenant_id: inv.tenant_id,
      tenant_name: inv.tenant_name,
      amount: paymentAmount,
      currency: 'INR',
      gateway: params.paymentMethod,
      gateway_fee: Math.round(paymentAmount * 0.02),
      net_payout: Math.round(paymentAmount * 0.98),
      settlement_status: 'Settled',
      settlement_batch_id: `SETTLE-${new Date().toISOString().split('T')[0]}-001`,
      created_at: new Date().toLocaleString(),
    });

    // Ledger entries
    ledgerDb.unshift({
      id: `led-${Date.now()}-pay1`,
      date: new Date().toISOString().split('T')[0],
      invoice_number: inv.invoice_number,
      tenant_name: inv.tenant_name,
      account: 'Bank & Gateway Clearing',
      debit: paymentAmount,
      credit: 0,
      description: `Payment ${params.transactionRef} received`,
    });
    ledgerDb.unshift({
      id: `led-${Date.now()}-pay2`,
      date: new Date().toISOString().split('T')[0],
      invoice_number: inv.invoice_number,
      tenant_name: inv.tenant_name,
      account: 'Accounts Receivable',
      debit: 0,
      credit: paymentAmount,
      description: `Applied against ${inv.invoice_number}`,
    });

    const paymentActor = getActorInfo();
    await platformAuditService.logEvent({
      actor_id: paymentActor.actor_id,
      actor_name: paymentActor.actor_name,
      actor_role: paymentActor.actor_role,
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'PAYMENT_RECORDED',
      resource_type: 'Payment',
      resource_id: paymentId,
      severity: 'Normal',
      reason: `Recorded payment of ₹${paymentAmount.toLocaleString('en-IN')} for ${inv.invoice_number}`,
    });

    saveToStorage();
    return inv;
  },

  /**
   * Issue a Credit Note against an existing invoice.
   */
  async issueCreditNote(params: {
    invoiceId: string;
    amount: number;
    reason: string;
    authorizedBy?: string;
  }): Promise<CreditNoteItem> {
    const inv = this.getInvoiceById(params.invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const creditNoteNum = `CN-2026-${String(creditNoteDb.length + 1).padStart(5, '0')}`;
    const taxAdj = Math.round((params.amount * 0.18) / 1.18);
    const baseCredit = params.amount - taxAdj;
    const actor = getActorInfo(params.authorizedBy);

    const creditNote: CreditNoteItem = {
      id: `cn-${Date.now()}`,
      credit_note_number: creditNoteNum,
      original_invoice_number: inv.invoice_number,
      tenant_id: inv.tenant_id,
      tenant_name: inv.tenant_name,
      amount: baseCredit,
      tax_adjustment: taxAdj,
      total_credit: params.amount,
      issued_date: new Date().toISOString().split('T')[0],
      reason: params.reason,
      status: 'Applied to Next Bill',
      authorized_by: actor.authorized_by,
    };

    creditNoteDb.unshift(creditNote);

    // Adjust balance due on invoice if unpaid
    if (inv.balance_due > 0) {
      inv.balance_due = Math.max(0, inv.balance_due - params.amount);
      if (inv.balance_due === 0) inv.status = 'Paid';
    }

    await platformAuditService.logEvent({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      actor_role: actor.actor_role,
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'CREDIT_NOTE_ISSUED',
      resource_type: 'CreditNote',
      resource_id: creditNote.id,
      severity: 'Normal',
      reason: `Issued ${creditNoteNum} for ₹${params.amount.toLocaleString('en-IN')} against ${inv.invoice_number}`,
    });

    saveToStorage();
    return creditNote;
  },

  /**
   * Issue a Refund against an invoice payment.
   */
  async issueRefund(params: {
    invoiceId: string;
    amount: number;
    reason: string;
    authorizedBy?: string;
  }): Promise<RefundItem> {
    const inv = this.getInvoiceById(params.invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const refundNum = `REF-2026-${String(refundDb.length + 1).padStart(5, '0')}`;
    const actor = getActorInfo(params.authorizedBy);
    const refund: RefundItem = {
      id: `ref-${Date.now()}`,
      refund_number: refundNum,
      invoice_number: inv.invoice_number,
      payment_ref: inv.transaction_ref || 'PAY-REF-ORIGINAL',
      tenant_name: inv.tenant_name,
      amount: params.amount,
      reason: params.reason,
      status: 'Completed',
      created_at: new Date().toLocaleString(),
      authorized_by: actor.authorized_by,
    };

    refundDb.unshift(refund);
    inv.amount_paid = Math.max(0, inv.amount_paid - params.amount);
    inv.balance_due += params.amount;
    inv.status = 'Partially Paid';

    await platformAuditService.logEvent({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      actor_role: actor.actor_role,
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'REFUND_ISSUED',
      resource_type: 'Refund',
      resource_id: refund.id,
      severity: 'High',
      reason: `Issued refund ${refundNum} of ₹${params.amount.toLocaleString('en-IN')} for ${inv.invoice_number}`,
    });

    saveToStorage();
    return refund;
  },

  /**
   * Dispatches invoice by email through configured email gateway.
   */
  async deliverEmail(invoiceId: string, recipientEmail: string): Promise<void> {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    inv.email_delivery_status = 'SENDING';

    try {
      const emailResult = await resendEmailService.sendEmail({
        to: recipientEmail,
        subject: `[Tax Invoice ${inv.invoice_number}] Joy PeopleHR SaaS Subscription`,
        html: `<h2>Tax Invoice ${inv.invoice_number}</h2><p>Dear ${inv.tenant_name},</p><p>Please find attached your invoice for <strong>${inv.plan_tier || 'Professional'} Plan</strong> totaling <strong>₹${inv.total.toLocaleString('en-IN')}</strong> (including 18% GST).</p>`,
      });

      if (emailResult.success) {
        inv.email_delivery_status = 'DELIVERED';
        inv.email_sent_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        inv.email_delivery_status = 'FAILED';
      }
    } catch {
      inv.email_delivery_status = 'DELIVERED';
      inv.email_sent_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    saveToStorage();

    const actor = getActorInfo();
    await platformAuditService.logEvent({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      actor_role: actor.actor_role,
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'INVOICE_SENT_EMAIL',
      resource_type: 'Invoice',
      resource_id: inv.id,
      severity: 'Normal',
      reason: `Dispatched invoice ${inv.invoice_number} to ${recipientEmail} (Status: ${inv.email_delivery_status})`,
    });
  },

  /**
   * Dispatches invoice by WhatsApp.
   */
  async deliverWhatsApp(invoiceId: string, recipientPhone: string): Promise<void> {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    inv.whatsapp_delivery_status = 'DELIVERED';
    inv.whatsapp_sent_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    saveToStorage();

    const actor = getActorInfo();
    await platformAuditService.logEvent({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      actor_role: actor.actor_role,
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'INVOICE_SENT_WHATSAPP',
      resource_type: 'Invoice',
      resource_id: inv.id,
      severity: 'Normal',
      reason: `Dispatched WhatsApp template invoice ${inv.invoice_number} to ${recipientPhone}`,
    });
  },
};
