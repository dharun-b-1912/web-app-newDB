// src/features/platform/subviews/BillingView.tsx
// ============================================================
// WorkForceOS — SaaS Financial Billing, GST Invoicing & FinOps Console
// ============================================================

import React, { useState } from 'react';
import {
  CreditCard,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Filter,
  RefreshCw,
  Plus,
  ExternalLink,
  Search,
  ArrowRight,
  Check,
  X,
  Printer,
  Mail,
  Receipt,
  Landmark,
  Building2,
  Send,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  platformBillingService,
  DetailedInvoice,
  PaymentTransactionItem,
  DunningAccountItem,
  CreditNoteItem,
} from '../../../services/platform/platformBillingService';
import { PrivilegedActionModal } from '../components/PrivilegedActionModal';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface BillingViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigateTab }) => {
  const [invoices, setInvoices] = useState<DetailedInvoice[]>(() =>
    platformBillingService.getInvoices()
  );
  const [transactions, setTransactions] = useState<PaymentTransactionItem[]>(() =>
    platformBillingService.getTransactions()
  );
  const [dunning, setDunning] = useState<DunningAccountItem[]>(() =>
    platformBillingService.getDunning()
  );
  const [creditNotes, setCreditNotes] = useState<CreditNoteItem[]>(() =>
    platformBillingService.getCreditNotes()
  );

  // Tabs: 'invoices' | 'transactions' | 'dunning' | 'credits'
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions' | 'dunning' | 'credits'>('invoices');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [previewInvoice, setPreviewInvoice] = useState<DetailedInvoice | null>(null);
  const [manualPayInvoice, setManualPayInvoice] = useState<DetailedInvoice | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [bankMethodInput, setBankMethodInput] = useState('Bank Wire Transfer (NEFT/RTGS)');
  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    invoice: DetailedInvoice | null;
  }>({
    isOpen: false,
    invoice: null,
  });

  const refreshData = () => {
    setInvoices([...platformBillingService.getInvoices()]);
    setTransactions([...platformBillingService.getTransactions()]);
    setDunning([...platformBillingService.getDunning()]);
    setCreditNotes([...platformBillingService.getCreditNotes()]);
  };

  const handleManualPaymentConfirm = async () => {
    if (!manualPayInvoice) return;
    await platformBillingService.markAsPaid(
      manualPayInvoice.id,
      bankMethodInput,
      utrInput || `UTR-BANK-${Date.now()}`
    );
    setManualPayInvoice(null);
    setUtrInput('');
    refreshData();
  };

  const handleRefundConfirm = async (reason: string) => {
    if (!refundModal.invoice) return;
    await platformBillingService.issueRefund(refundModal.invoice.id, reason);
    setRefundModal({ isOpen: false, invoice: null });
    refreshData();
  };

  const handleTriggerRetry = async (dunningId: string) => {
    await platformBillingService.triggerDunningRetry(dunningId);
    refreshData();
    alert('Payment retry triggered successfully. Gateway mandate pinged.');
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus = selectedStatus === 'all' || inv.status.toLowerCase() === selectedStatus.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      inv.tenant_name.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.id.toLowerCase().includes(q) ||
      (inv.tenant_gstin && inv.tenant_gstin.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const grossInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalCollected = invoices.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const pendingArBalance = invoices.filter((inv) => inv.status === 'Issued' || inv.status === 'Overdue').reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const overdueDunningAmount = dunning.reduce((sum, d) => sum + (d.overdue_amount || 0), 0);
  const gstRemittance = Math.round(totalCollected * 0.18);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. FinOps Distinct Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1E293B] text-white shadow-sm">
              <Receipt className="h-6 w-6 text-[#38BDF8]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Billing & Invoices</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                  <Landmark className="h-3 w-3 text-[#3B82F6]" />
                  FinOps Ledger & GST Compliance
                </span>
              </div>
              <p className="text-[13.5px] text-[#64748B] mt-0.5 max-w-3xl">
                Official GST tax invoices, payment gateways, dunning collections, and automated bank reconciliation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Exporting Official GST Invoices to Tally XML / Excel CSV...')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export GST GSTR-1
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => alert('Opening manual invoice draft generator...')}
            className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white shadow-sm font-semibold border border-[#334155]"
          >
            <Plus className="h-4 w-4 text-[#38BDF8]" />
            + Create Tax Invoice
          </Button>
        </div>
      </div>

      {/* 2. 5 Distinct FinOps KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Gross Invoiced</span>
            <Receipt className="h-3.5 w-3.5 text-[#64748B]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">
            {grossInvoiced > 0 ? `₹${(grossInvoiced / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#64748B]">Across {invoices.length} invoices</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Total Collected</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">
            {totalCollected > 0 ? `₹${(totalCollected / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold">
            {invoices.length > 0 ? `${Math.round((totalCollected / (grossInvoiced || 1)) * 100)}% settlement` : 'Nominal'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Pending AR Balance</span>
            <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <strong className="text-2xl font-bold text-[#2563EB] block mt-1">
            {pendingArBalance > 0 ? `₹${(pendingArBalance / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#2563EB] font-semibold">Net 15/30 Days term</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Overdue Dunning</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">
            {overdueDunningAmount > 0 ? `₹${(overdueDunningAmount / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#DC2626] font-semibold">
            {dunning.length} Accounts in escalation
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>GST Remittance</span>
            <Landmark className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <strong className="text-2xl font-bold text-[#7C3AED] block mt-1">
            {gstRemittance > 0 ? `₹${(gstRemittance / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#7C3AED] font-semibold">18% GST (CGST/SGST/IGST)</span>
        </div>
      </div>

      {/* 3. 4 Top FinOps Operational Tabs */}
      <div className="border-b border-[#E2E8F0] bg-white rounded-xl border p-1 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {[
            { id: 'invoices', label: 'Invoices & Tax Documents', count: invoices.length, icon: FileText },
            { id: 'transactions', label: 'Payment Gateway Settlements', count: transactions.length, icon: CreditCard },
            { id: 'dunning', label: 'Accounts Receivable & Dunning', count: dunning.length, icon: Clock },
            { id: 'credits', label: 'Credit Notes & Refunds', count: creditNotes.length, icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172B] hover:bg-[#F8FAFC]'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8]')} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    isActive ? 'bg-[#334155] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab?.('platform-subscriptions')}
          className="text-xs text-[#047857] hover:underline font-semibold flex items-center gap-1 px-3 py-1.5 cursor-pointer"
        >
          <span>View Customer Subscriptions</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: INVOICES & TAX DOCUMENTS
         --------------------------------------------------------- */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search invoice #, organization, GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1E293B]"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155]"
              >
                <option value="all">All Invoices</option>
                <option value="paid">Paid & Settled</option>
                <option value="issued">Issued / Unpaid</option>
                <option value="overdue">Overdue</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="text-xs text-[#64748B]">
              Showing <strong>{filteredInvoices.length}</strong> tax invoices
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Tax Invoice #</th>
                    <th className="py-3 px-4">Organization & GSTIN</th>
                    <th className="py-3 px-4">Plan Tier</th>
                    <th className="py-3 px-4">Taxable Base</th>
                    <th className="py-3 px-4">GST (18%)</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment Method / UTR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          className="hover:text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                          #{inv.invoice_number}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{inv.tenant_name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                          GSTIN: {inv.tenant_gstin || '29AAAAA0000A1Z5'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#334155]">
                          {inv.plan_tier || 'Enterprise'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#334155]">
                        ₹{(inv.subtotal ?? 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        ₹{(inv.gst_amount ?? 0).toLocaleString()}
                        <span className="block text-[9px] text-[#94A3B8]">
                          {inv.igst_amount ? 'IGST 18%' : 'CGST 9% + SGST 9%'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                        ₹{(inv.total ?? inv.amount ?? 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#0F172B] text-[11px]">{inv.payment_method}</div>
                        {inv.payment_gateway_ref && (
                          <div className="text-[10px] text-[#64748B] font-mono">{inv.payment_gateway_ref}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                            inv.status === 'Paid'
                              ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                              : inv.status === 'Issued'
                              ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                              : inv.status === 'Overdue'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          )}
                        >
                          ● {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewInvoice(inv)}
                          className="text-xs text-[#2563EB] hover:bg-[#EFF6FF]"
                        >
                          View Invoice
                        </Button>

                        {inv.status === 'Issued' || inv.status === 'Overdue' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManualPayInvoice(inv)}
                            className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                          >
                            Record Payment
                          </Button>
                        ) : null}

                        {inv.status === 'Paid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRefundModal({ isOpen: true, invoice: inv })}
                            className="text-xs text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: PAYMENT GATEWAY SETTLEMENTS
         --------------------------------------------------------- */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-xs text-[#0F172B]">Payment Gateway Transactions & Direct Settlements</h3>
                <p className="text-[11px] text-[#64748B]">Real-time webhook settlements from Razorpay, Stripe, and Direct Bank RTGS.</p>
              </div>
              <span className="text-xs font-bold text-[#047857] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                100% Reconciled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Transaction Ref / Gateway</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Gross Amount</th>
                    <th className="py-3 px-4">Gateway Fee</th>
                    <th className="py-3 px-4">Net Payout</th>
                    <th className="py-3 px-4">Settlement Batch</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                        <div>{tx.transaction_ref}</div>
                        <span className="text-[10px] text-[#2563EB] font-sans font-semibold">{tx.gateway}</span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#0F172B]">{tx.tenant_name}</td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">#{tx.invoice_number}</td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                        ₹{tx.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#DC2626]">
                        {tx.gateway_fee > 0 ? `-₹${tx.gateway_fee.toLocaleString()}` : '₹0 (RTGS/UPI)'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#047857]">
                        ₹{tx.net_payout.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                        {tx.settlement_batch_id}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          ● {tx.settlement_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[#64748B] text-[11px]">
                        {tx.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 3: ACCOUNTS RECEIVABLE & DUNNING
         --------------------------------------------------------- */}
      {activeTab === 'dunning' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-xs text-[#0F172B]">Automated Dunning Escalations & Unpaid Invoices</h3>
                <p className="text-[11px] text-[#64748B]">Automated retry cycles and finance communication before account suspension.</p>
              </div>
              <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-3 py-1 rounded-full border border-[#FCA5A5]">
                {dunning.length} Active Escalations
              </span>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {dunning.map((d) => (
                <div key={d.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172B]">{d.tenant_name}</span>
                      <span className="text-[10px] font-mono bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded font-bold border border-[#FCA5A5]">
                        {d.aging_bucket} ({d.days_overdue} Days Overdue)
                      </span>
                    </div>

                    <div className="text-xs text-[#64748B] flex items-center gap-3">
                      <span>Invoice: <strong>#{d.invoice_number}</strong></span>
                      <span>•</span>
                      <span>Overdue Amount: <strong className="text-[#DC2626] font-mono">₹{d.overdue_amount.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Retry Attempts: <strong>{d.retry_count} / {d.max_retries}</strong></span>
                      <span>•</span>
                      <span>Next Automated Retry: <strong>{d.next_retry_date}</strong></span>
                    </div>

                    <p className="text-[11px] text-[#475569] bg-[#F1F5F9] p-2 rounded-lg font-mono">
                      Last Gateway Ping: {d.last_attempt_message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerRetry(d.id)}
                      className="text-xs font-semibold text-[#1E293B] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Charge Now
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => alert(`Payment link sent via Email & WhatsApp to ${d.contact_email}`)}
                      className="text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" /> Send Payment Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 4: CREDIT NOTES & REFUNDS
         --------------------------------------------------------- */}
      {activeTab === 'credits' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-xs text-[#0F172B]">Credit Notes & Financial Reversals Ledger</h3>
                <p className="text-[11px] text-[#64748B]">Audited adjustments, SLA outage credits, and subscription balance refunds.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Credit Note #</th>
                    <th className="py-3 px-4">Original Invoice</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Credit Amount</th>
                    <th className="py-3 px-4">Reason / Justification</th>
                    <th className="py-3 px-4">Issued Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {creditNotes.map((cnItem) => (
                    <tr key={cnItem.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                        #{cnItem.credit_note_number}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        #{cnItem.original_invoice_number}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                        {cnItem.tenant_name}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#DC2626]">
                        -₹{cnItem.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-[#334155]">
                        {cnItem.reason}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        {cnItem.issued_date}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          ● {cnItem.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#64748B]">
                        {cnItem.authorized_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ENTERPRISE OFFICIAL GST TAX INVOICE PREVIEW MODAL
         --------------------------------------------------------- */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-[#E2E8F0] space-y-6 text-xs max-h-[90vh] overflow-y-auto">
            {/* Header Actions */}
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#047857]" />
                <h3 className="text-base font-bold text-[#0F172B]">Tax Invoice Receipt Preview</h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs text-[#334155] border-[#CBD5E1]"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert(`Official GST PDF downloaded for ${previewInvoice.invoice_number}`)}
                  className="text-xs text-[#334155] border-[#CBD5E1]"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                </Button>

                <button onClick={() => setPreviewInvoice(null)} className="text-[#94A3B8] hover:text-[#0F172B] ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Official GST Tax Invoice Body */}
            <div className="border border-[#E2E8F0] rounded-2xl p-6 bg-[#FAFAFA] space-y-6">
              {/* Header Company & Invoice Meta */}
              <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172B] tracking-tight">WORKFORCEOS TECHNOLOGIES PVT LTD</h2>
                  <p className="text-[11px] text-[#64748B]">Cloud HRMS & Enterprise Workforce Operating Platform</p>
                  <p className="text-[11px] text-[#64748B] mt-1">GSTIN: <strong className="font-mono text-[#0F172B]">29WORKFORCE001Z9</strong></p>
                  <p className="text-[11px] text-[#64748B]">CIN: U72200KA2026PTC998124 | PAN: AABCV9981K</p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#047857] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                    TAX INVOICE
                  </span>
                  <div className="font-mono font-bold text-sm text-[#0F172B] mt-2">#{previewInvoice.invoice_number}</div>
                  <div className="text-[11px] text-[#64748B]">Invoice Date: <strong>{previewInvoice.billing_date}</strong></div>
                  <div className="text-[11px] text-[#64748B]">Payment Due: <strong>{previewInvoice.due_date}</strong></div>
                </div>
              </div>

              {/* Billed To Information */}
              <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Billed To (Customer):</span>
                  <div className="font-bold text-sm text-[#0F172B] mt-0.5">{previewInvoice.tenant_name}</div>
                  <div className="text-[11px] text-[#475569] mt-0.5">{previewInvoice.billing_address || 'Registered Corporate Office'}</div>
                  <div className="text-[11px] text-[#0F172B] font-mono mt-1">
                    GSTIN: <strong>{previewInvoice.tenant_gstin || '29AAAAA0000A1Z5'}</strong>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Payment Status:</span>
                  <div>
                    <span
                      className={cn(
                        'text-xs px-2.5 py-0.5 rounded-full font-bold inline-block',
                        previewInvoice.status === 'Paid'
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                      )}
                    >
                      ● {previewInvoice.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">Method: <strong>{previewInvoice.payment_method}</strong></div>
                  {previewInvoice.payment_gateway_ref && (
                    <div className="text-[10px] font-mono text-[#64748B]">Ref: {previewInvoice.payment_gateway_ref}</div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b bg-[#F8FAFC] text-[#64748B] font-semibold">
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-4">SAC Code</th>
                      <th className="py-2.5 px-4">Qty / Seats</th>
                      <th className="py-2.5 px-4">Unit Rate</th>
                      <th className="py-2.5 px-4 text-right">Taxable Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {(previewInvoice.line_items || [
                      { id: '1', description: 'WorkForceOS Subscription Tier', hsn_sac: '998313', qty: 1, unit_price: previewInvoice.subtotal, amount: previewInvoice.subtotal }
                    ]).map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-semibold text-[#0F172B]">{item.description}</td>
                        <td className="py-3 px-4 font-mono text-[#64748B]">{item.hsn_sac}</td>
                        <td className="py-3 px-4 font-mono">{item.qty}</td>
                        <td className="py-3 px-4 font-mono">₹{item.unit_price.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172B]">
                          ₹{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax Breakup & Grand Total */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Taxable Subtotal:</span>
                    <strong className="font-mono text-[#0F172B]">₹{(previewInvoice.subtotal ?? 0).toLocaleString()}</strong>
                  </div>

                  {previewInvoice.igst_amount ? (
                    <div className="flex justify-between text-[#64748B]">
                      <span>IGST (18%):</span>
                      <span className="font-mono font-semibold text-[#0F172B]">₹{previewInvoice.igst_amount.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[#64748B]">
                        <span>CGST (9%):</span>
                        <span className="font-mono font-semibold text-[#0F172B]">₹{(previewInvoice.cgst_amount ?? (previewInvoice.gst_amount / 2)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#64748B]">
                        <span>SGST (9%):</span>
                        <span className="font-mono font-semibold text-[#0F172B]">₹{(previewInvoice.sgst_amount ?? (previewInvoice.gst_amount / 2)).toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  <div className="pt-2 border-t flex justify-between font-bold text-sm text-[#0F172B]">
                    <span>Total Payable:</span>
                    <strong className="font-mono text-base text-[#047857]">
                      ₹{(previewInvoice.total ?? previewInvoice.amount).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="text-[10px] text-[#94A3B8] border-t pt-3 flex justify-between">
                <span>Computer Generated Electronic Tax Invoice. No signature required.</span>
                <span>SAC 998313 - Information Technology Software Services</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MANUAL BANK PAYMENT RECORD MODAL
         --------------------------------------------------------- */}
      {manualPayInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#047857] uppercase">Manual Bank Reconciliation</span>
                <h3 className="text-base font-bold text-[#0F172B]">Record Offline Payment</h3>
              </div>
              <button onClick={() => setManualPayInvoice(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border space-y-1">
              <div>Invoice: <strong>#{manualPayInvoice.invoice_number}</strong></div>
              <div>Organization: <strong>{manualPayInvoice.tenant_name}</strong></div>
              <div>Amount Due: <strong className="text-[#047857] font-mono">₹{(manualPayInvoice.total ?? manualPayInvoice.amount).toLocaleString()}</strong></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#334155] block mb-1">Payment Method</label>
                <select
                  value={bankMethodInput}
                  onChange={(e) => setBankMethodInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-xs"
                >
                  <option value="Bank Wire Transfer (NEFT/RTGS)">Bank Wire Transfer (NEFT/RTGS)</option>
                  <option value="Direct Bank Settlement (ICICI Bank)">Direct Bank Settlement (ICICI Bank)</option>
                  <option value="Corporate Cheque / DD">Corporate Cheque / Demand Draft</option>
                  <option value="Razorpay Payment Link">Razorpay Payment Link</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#334155] block mb-1">Bank UTR / Transaction Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-ICICI-20260814991"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setManualPayInvoice(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleManualPaymentConfirm}
                className="bg-[#047857] hover:bg-[#036246] text-white font-semibold"
              >
                Confirm & Reconcile Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Privileged Refund Modal */}
      <PrivilegedActionModal
        isOpen={refundModal.isOpen}
        onClose={() => setRefundModal({ isOpen: false, invoice: null })}
        onConfirm={handleRefundConfirm}
        title="Issue Financial Refund & Credit Note"
        description={`Issue a financial reversal for invoice #${refundModal.invoice?.invoice_number} (${refundModal.invoice?.tenant_name}). This will generate an official GST Credit Note.`}
        actionType="REFUND"
        confirmButtonText="Authorize & Issue Credit Note"
        severity="High"
      />
    </div>
  );
};
