// src/services/platform/platformBillingService.ts
// ============================================================
// WorkForceOS — SaaS Financial Billing & Reconciliation Service
// ============================================================

import { PlatformBillingInvoice } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialInvoices: PlatformBillingInvoice[] = [
  { id: 'inv-8819', invoice_number: 'INV-2026-0801', tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', subtotal: 145000, gst_amount: 26100, total: 171100, amount: 171100, currency: 'INR', billing_date: '2026-08-01', due_date: '2026-08-15', paid_at: '2026-08-03 11:20 AM', status: 'Paid', payment_method: 'Razorpay Corporate NetBanking', payment_gateway_ref: 'pay_rzp_99812401', reconciliation_status: 'Matched' },
  { id: 'inv-8820', invoice_number: 'INV-2026-0802', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics & Supply Chain', subtotal: 210000, gst_amount: 37800, total: 247800, amount: 247800, currency: 'INR', billing_date: '2026-08-01', due_date: '2026-08-10', status: 'Overdue', payment_method: 'Bank Wire Transfer (NEFT/RTGS)', reconciliation_status: 'Needs Review' },
  { id: 'inv-8821', invoice_number: 'INV-2026-0803', tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions Pvt Ltd', subtotal: 85000, gst_amount: 15300, total: 100300, amount: 100300, currency: 'INR', billing_date: '2026-08-01', due_date: '2026-08-15', paid_at: '2026-08-01 02:45 PM', status: 'Paid', payment_method: 'Corporate Credit Card (Visa 4012)', payment_gateway_ref: 'ch_stripe_8812901', reconciliation_status: 'Matched' },
  { id: 'inv-8822', invoice_number: 'INV-2026-0804', tenant_id: 'org-apex-06', tenant_name: 'Apex Financial Services Ltd', subtotal: 320000, gst_amount: 57600, total: 377600, amount: 377600, currency: 'INR', billing_date: '2026-08-01', due_date: '2026-08-20', paid_at: '2026-08-04 04:10 PM', status: 'Paid', payment_method: 'Direct Bank Settlement (ICICI Bank)', payment_gateway_ref: 'utr_icici_2026080410', reconciliation_status: 'Matched' },
  { id: 'inv-8823', invoice_number: 'INV-2026-0805', tenant_id: 'org-innovate-05', tenant_name: 'Innovate Labs Pvt Ltd', subtotal: 18000, gst_amount: 3240, total: 21240, amount: 21240, currency: 'INR', billing_date: '2026-08-01', due_date: '2026-08-15', paid_at: '2026-08-02 09:15 AM', status: 'Paid', payment_method: 'Corporate UPI AutoPay', payment_gateway_ref: 'upi_rzp_774120', reconciliation_status: 'Matched' },
];

export const platformBillingService = {
  getInvoices(): PlatformBillingInvoice[] {
    return initialInvoices;
  },

  async markAsPaid(id: string, paymentMethod?: string, reference?: string): Promise<PlatformBillingInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Paid';
    target.paid_at = new Date().toISOString();
    if (paymentMethod) target.payment_method = paymentMethod;
    if (reference) target.payment_gateway_ref = reference;
    target.reconciliation_status = 'Matched';

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

  async issueRefund(id: string, reason: string): Promise<PlatformBillingInvoice> {
    const target = initialInvoices.find(inv => inv.id === id);
    if (!target) throw new Error('Invoice not found');

    target.status = 'Refunded';

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
};
