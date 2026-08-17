// src/features/platform/components/tenants/CustomerBillingTab.tsx
// ============================================================
// WorkForceOS — Customer Billing, Invoices & Settlement Tab
// ============================================================

import React, { useState } from 'react';
import {
  FileText,
  CreditCard,
  Download,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerBillingTabProps {
  organization: OrganizationRecord;
}

export const CustomerBillingTab: React.FC<CustomerBillingTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();

  const [invoices] = useState([
    {
      id: 'inv-joy-000001',
      invoice_number: 'INV-2026-000001',
      period: 'Monthly Subscription (100 Seats)',
      subtotal: 45000,
      tax: 8100,
      total: 53100,
      status: 'Paid',
      issue_date: '2026-08-01',
      due_date: '2026-08-16',
      paid_at: '2026-08-01 10:15 IST',
      payment_method: 'UPI / NetBanking (Sandbox)',
      transaction_ref: 'PAY-TEST-000001',
    },
  ]);

  const handleDownloadInvoice = (invNum: string) => {
    showToast(`Downloading official GST invoice ${invNum}...`, 'success');
  };

  const handleSendInvoice = (invNum: string) => {
    showToast(`Dispatched invoice ${invNum} to billing contact (${org.primary_admin_email})`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. BILLING HEALTH METRICS
         ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Billing Status</span>
          <div className="text-xl font-bold text-[#047857] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{org.billing_status} (Good Standing)</span>
          </div>
          <span className="text-[11px] text-gray-500">Auto-debit active on Sandbox Gateway</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding Balance</span>
          <div className="text-2xl font-bold font-mono text-gray-900">₹0.00</div>
          <span className="text-[11px] text-gray-500">No overdue receivables</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Billed YTD</span>
          <div className="text-2xl font-bold font-mono text-gray-900">₹53,100</div>
          <span className="text-[11px] text-gray-500">Including 18% GST</span>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. INVOICE HISTORY TABLE
         ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tax Invoices & Settlement History</h3>
            <p className="text-xs text-gray-500 mt-0.5">Authoritative invoice ledger with statutory GST breakdown.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-4">Billing Period</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">GST (18%)</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Settled Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                  <td className="py-3.5 px-4 text-gray-600">{inv.period}</td>
                  <td className="py-3.5 px-4 font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">₹{inv.tax.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900">₹{inv.total.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">{inv.paid_at}</td>
                  <td className="py-3.5 px-5 text-right space-x-2">
                    <button
                      onClick={() => handleDownloadInvoice(inv.invoice_number)}
                      title="Download PDF Invoice"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendInvoice(inv.invoice_number)}
                      title="Send Invoice to Billing Contact"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
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
