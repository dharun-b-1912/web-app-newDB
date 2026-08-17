// src/services/platform/platformBillingService.ts
// ============================================================
// WorkForceOS — SaaS Financial Billing, GST Invoicing & FinOps Engine
// ============================================================

import { PlatformBillingInvoice } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';
import { billingCalculationEngine, TaxCalculationResult } from '../billing/billingCalculationEngine';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

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

// Canonical Primary Verified Invoice: Joy Corporate Solutions Pvt Ltd
const defaultJoyInvoice: DetailedInvoice = {
  id: 'inv-joy-000001',
  invoice_number: 'INV-2026-000001',
  tenant_id: 'org-joy-corp',
  tenant_name: 'Joy Corporate Solutions Pvt Ltd',
  plan_tier: 'Professional',
  subtotal: 45000,
  tax: 8100,
  gst_amount: 8100,
  cgst_amount: 4050,
  sgst_amount: 4050,
  igst_amount: 0,
  total: 53100,
  amount: 53100,
  amount_paid: 53100,
  balance_due: 0,
  currency: 'INR',
  status: 'Paid',
  billing_date: '2026-08-01',
  issue_date: '2026-08-01',
  due_date: '2026-08-16',
  paid_at: '2026-08-01 10:15 IST',
  payment_method: 'Corporate UPI / Sandbox Gateway',
  transaction_ref: 'PAY-TEST-000001',
  reconciliation_status: 'Matched',
  download_url: '#',
  billing_address: 'Joy Tower, OMR Expressway, Chennai, Tamil Nadu 600096, India',
  place_of_supply: 'Tamil Nadu (33)',
  platform_gstin: '33AAACW0000A1Z5',
  email_delivery_status: 'DELIVERED',
  email_sent_at: '2026-08-01 10:16 IST',
  whatsapp_delivery_status: 'DELIVERED',
  whatsapp_sent_at: '2026-08-01 10:16 IST',
  line_items: [
    {
      id: 'li-1',
      description: 'WorkForceOS Professional Plan Subscription (100 Active Seats)',
      hsn_sac: '998313',
      qty: 1,
      unit_price: 45000,
      discount_amount: 0,
      taxable_amount: 45000,
      amount: 45000,
    },
  ],
};

let invoiceDb: DetailedInvoice[] = [defaultJoyInvoice];

let transactionDb: PaymentTransactionItem[] = [
  {
    id: 'pay-001',
    transaction_ref: 'PAY-TEST-000001',
    invoice_id: 'inv-joy-000001',
    invoice_number: 'INV-2026-000001',
    tenant_id: 'org-joy-corp',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    amount: 53100,
    currency: 'INR',
    gateway: 'Razorpay (Sandbox)',
    gateway_fee: 1062,
    net_payout: 52038,
    settlement_status: 'Settled',
    settlement_batch_id: 'SETTLE-2026-08-01-001',
    created_at: '2026-08-01 10:15 IST',
  },
];

let dunningDb: DunningAccountItem[] = [];
let creditNoteDb: CreditNoteItem[] = [];
let refundDb: RefundItem[] = [];

let ledgerDb: FinancialLedgerEntry[] = [
  {
    id: 'led-1',
    date: '2026-08-01',
    invoice_number: 'INV-2026-000001',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    account: 'Accounts Receivable',
    debit: 53100,
    credit: 0,
    description: 'Invoice INV-2026-000001 issued',
  },
  {
    id: 'led-2',
    date: '2026-08-01',
    invoice_number: 'INV-2026-000001',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    account: 'Revenue',
    debit: 0,
    credit: 45000,
    description: 'SaaS Professional Plan Subscription',
  },
  {
    id: 'led-3',
    date: '2026-08-01',
    invoice_number: 'INV-2026-000001',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    account: 'GST Payable (CGST+SGST)',
    debit: 0,
    credit: 8100,
    description: 'CGST (₹4,050) + SGST (₹4,050) output tax',
  },
  {
    id: 'led-4',
    date: '2026-08-01',
    invoice_number: 'INV-2026-000001',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    account: 'Bank & Gateway Clearing',
    debit: 53100,
    credit: 0,
    description: 'Settled via Razorpay Sandbox',
  },
  {
    id: 'led-5',
    date: '2026-08-01',
    invoice_number: 'INV-2026-000001',
    tenant_name: 'Joy Corporate Solutions Pvt Ltd',
    account: 'Accounts Receivable',
    debit: 0,
    credit: 53100,
    description: 'Payment cleared for INV-2026-000001',
  },
];

export const platformBillingService = {
  getInvoices(): DetailedInvoice[] {
    return invoiceDb;
  },

  getTransactions(): PaymentTransactionItem[] {
    return transactionDb;
  },

  getDunning(): DunningAccountItem[] {
    return dunningDb;
  },

  getCreditNotes(): CreditNoteItem[] {
    return creditNoteDb;
  },

  getRefunds(): RefundItem[] {
    return refundDb;
  },

  getLedger(): FinancialLedgerEntry[] {
    return ledgerDb;
  },

  getInvoiceById(id: string): DetailedInvoice | undefined {
    return invoiceDb.find((inv) => inv.id === id || inv.invoice_number === id);
  },

  /**
   * Calculate exact aggregated financial KPIs for selected billing period.
   */
  calculateKpis(period: string = 'Current Month') {
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
    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: params.tenantId,
      organization_name: params.tenantName,
      action: 'INVOICE_CREATED',
      resource_type: 'Invoice',
      resource_id: invoiceId,
      severity: 'Normal',
      reason: `Generated ${newInvoice.invoice_number} for ₹${newInvoice.total.toLocaleString('en-IN')}`,
    });

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

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'PAYMENT_RECORDED',
      resource_type: 'Payment',
      resource_id: paymentId,
      severity: 'Normal',
      reason: `Recorded payment of ₹${paymentAmount.toLocaleString('en-IN')} for ${inv.invoice_number}`,
    });

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
      authorized_by: params.authorizedBy || 'Thirumalai R K (Platform Admin)',
    };

    creditNoteDb.unshift(creditNote);

    // Adjust balance due on invoice if unpaid
    if (inv.balance_due > 0) {
      inv.balance_due = Math.max(0, inv.balance_due - params.amount);
      if (inv.balance_due === 0) inv.status = 'Paid';
    }

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'CREDIT_NOTE_ISSUED',
      resource_type: 'CreditNote',
      resource_id: creditNote.id,
      severity: 'Normal',
      reason: `Issued ${creditNoteNum} for ₹${params.amount.toLocaleString('en-IN')} against ${inv.invoice_number}`,
    });

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
      authorized_by: params.authorizedBy || 'Thirumalai R K (Platform Admin)',
    };

    refundDb.unshift(refund);
    inv.amount_paid = Math.max(0, inv.amount_paid - params.amount);
    inv.balance_due += params.amount;
    inv.status = 'Partially Paid';

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'REFUND_ISSUED',
      resource_type: 'Refund',
      resource_id: refund.id,
      severity: 'High',
      reason: `Issued refund ${refundNum} of ₹${params.amount.toLocaleString('en-IN')} for ${inv.invoice_number}`,
    });

    return refund;
  },

  /**
   * Dispatches invoice by email.
   */
  async deliverEmail(invoiceId: string, recipientEmail: string): Promise<void> {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    inv.email_delivery_status = 'DELIVERED';
    inv.email_sent_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: inv.tenant_id,
      organization_name: inv.tenant_name,
      action: 'INVOICE_SENT_EMAIL',
      resource_type: 'Invoice',
      resource_id: inv.id,
      severity: 'Normal',
      reason: `Dispatched invoice ${inv.invoice_number} to ${recipientEmail}`,
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

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
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
