// src/features/platform/subviews/BillingView.tsx
// ============================================================
// WorkForceOS — SaaS Financial Billing & Reconciliation Console
// ============================================================

import React, { useState } from 'react';
import { CreditCard, Download, FileText, CheckCircle2, Clock, AlertTriangle, ShieldCheck, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { platformBillingService } from '../../../services/platform';
import { PlatformBillingInvoice } from '../../../types/platformAdmin';
import { PrivilegedActionModal } from '../components/PrivilegedActionModal';

export const BillingView: React.FC = () => {
  const [invoices, setInvoices] = useState<PlatformBillingInvoice[]>(() => platformBillingService.getInvoices());
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [refundModal, setRefundModal] = useState<{ isOpen: boolean; invoice: PlatformBillingInvoice | null }>({
    isOpen: false,
    invoice: null,
  });

  const handleMarkPaid = async (id: string) => {
    const updated = await platformBillingService.markAsPaid(id, 'Manual Bank Verification', `utr_${Date.now()}`);
    setInvoices(invoices.map(inv => (inv.id === id ? updated : inv)));
  };

  const handleRefundConfirm = async (reason: string) => {
    if (!refundModal.invoice) return;
    const updated = await platformBillingService.issueRefund(refundModal.invoice.id, reason);
    setInvoices(invoices.map(inv => (inv.id === refundModal.invoice!.id ? updated : inv)));
    setRefundModal({ isOpen: false, invoice: null });
  };

  const filteredInvoices = invoices.filter(inv => selectedStatus === 'ALL' || inv.status === selectedStatus);

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const totalOutstanding = invoices.filter(i => i.status === 'Overdue' || i.status === 'Pending').reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Refund Privileged Modal */}
      <PrivilegedActionModal
        isOpen={refundModal.isOpen}
        onClose={() => setRefundModal({ isOpen: false, invoice: null })}
        onConfirm={handleRefundConfirm}
        title="Issue SaaS Subscription Refund"
        actionLabel="Process Financial Refund"
        targetName={`Invoice #${refundModal.invoice?.invoice_number} (₹${refundModal.invoice?.total.toLocaleString()})`}
        severity="Critical"
        requiredConfirmationText="REFUND"
        description="Issuing a refund will mark this invoice as refunded in the financial ledger and notify the billing contact. A mandatory compliance justification is required."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              Financial Operations
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">GST Compliance 18% Enabled</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Invoices & Billing Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            SaaS recurring invoices, payment gateway reconciliation status, and tax-compliant transaction records.
          </p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Collected SaaS Revenue (MTD)</div>
          <div className="text-2xl font-black text-[#07563D] mt-2">₹{(totalRevenue / 100000).toFixed(2)} Lakhs</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">100% Tax Invoices Reconciled</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Outstanding / Overdue Invoices</div>
          <div className="text-2xl font-black text-amber-700 mt-2">₹{(totalOutstanding / 100000).toFixed(2)} Lakhs</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-1">1 Tenant Overdue (Auto-retry active)</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Payment Gateway Health</div>
          <div className="text-2xl font-black text-gray-900 mt-2">99.98% Matched</div>
          <div className="text-[10px] text-gray-400 mt-1">Razorpay & Stripe Webhook Sync Active</div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-extrabold text-gray-900">Tax Invoices & Reconciliation Stream</h3>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Tenant Organization</th>
                <th className="py-3 px-4">Subtotal + GST (18%)</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reconciliation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/60">
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-900">{inv.tenant_name}</td>
                  <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                    ₹{inv.subtotal.toLocaleString()} + ₹{inv.gst_amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-black text-gray-900 font-mono">₹{inv.total.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-gray-600 text-[11px]">{inv.payment_method}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      inv.reconciliation_status === 'Matched' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {inv.reconciliation_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-100 text-[#07563D]'
                        : inv.status === 'Overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === 'Overdue' && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Mark Paid
                        </button>
                      )}
                      {inv.status === 'Paid' && (
                        <button
                          onClick={() => setRefundModal({ isOpen: true, invoice: inv })}
                          className="px-2 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
