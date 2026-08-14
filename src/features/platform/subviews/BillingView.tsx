import React from 'react';
import { CreditCard, FileText, CheckCircle, AlertTriangle, Download, ArrowUpRight } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';

export const BillingView: React.FC = () => {
  const invoices = platformAdminApi.getInvoices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">Billing, Invoices & Tax Compliance</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          SaaS customer invoicing, GST breakdown, automated payment processing, and overdue dunning tracking.
        </p>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">Platform Invoices Ledger</h3>
          <button
            onClick={() => alert('Generating GST tax compliance summary PDF')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export GST Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Tenant Organization</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">GST (18%)</th>
                <th className="py-3 px-4">Total Billed</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{inv.tenant_name}</td>
                  <td className="py-3 px-4 text-gray-700">₹{inv.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-500">₹{inv.gst_amount.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">₹{inv.total.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">{inv.due_date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {inv.status}
                    </span>
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
