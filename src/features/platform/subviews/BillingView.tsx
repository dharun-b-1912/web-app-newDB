// src/features/platform/subviews/BillingView.tsx
// ============================================================
// Joy PeopleHR — SaaS Financial Billing, GST Invoicing & FinOps Console
// ============================================================

import React, { useState, useMemo } from 'react';
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
  Percent,
  SlidersHorizontal,
} from 'lucide-react';
import {
  platformBillingService,
  DetailedInvoice,
  PaymentTransactionItem,
  DunningAccountItem,
  CreditNoteItem,
  RefundItem,
  FinancialLedgerEntry,
} from '../../../services/platform/platformBillingService';
import { platformTenantService } from '../../../services/platform/platformTenantService';
import { CreateInvoiceMultiStepModal } from '../components/billing/CreateInvoiceMultiStepModal';
import { InvoicePreviewModal } from '../components/billing/InvoicePreviewModal';
import { RecordPaymentModal } from '../components/billing/RecordPaymentModal';
import { CreateCreditNoteModal } from '../components/billing/CreateCreditNoteModal';
import { IssueRefundModal } from '../components/billing/IssueRefundModal';
import { BillingSettingsModal } from '../components/billing/BillingSettingsModal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export interface BillingViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigateTab }) => {
  const { showToast } = useToast();

  // Version counter for live re-renders
  const [dataVersion, setDataVersion] = useState(0);
  const refreshData = () => setDataVersion((v) => v + 1);

  React.useEffect(() => {
    platformTenantService.fetchLiveFromSupabase().then(() => {
      refreshData();
    });
  }, []);

  // Period Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Current Month');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Active Tab State (7 Tabs)
  const [activeTab, setActiveTab] = useState<
    'invoices' | 'payments' | 'receivables' | 'credit_notes' | 'refunds' | 'tax' | 'reconciliation'
  >('invoices');

  // Modals State
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showBillingSettingsModal, setShowBillingSettingsModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<DetailedInvoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<DetailedInvoice | null>(null);
  const [selectedInvoiceForCredit, setSelectedInvoiceForCredit] = useState<DetailedInvoice | null>(null);
  const [selectedInvoiceForRefund, setSelectedInvoiceForRefund] = useState<DetailedInvoice | null>(null);

  // Data Collections
  const invoices = useMemo(() => platformBillingService.getInvoices(), [dataVersion]);
  const transactions = useMemo(() => platformBillingService.getTransactions(), [dataVersion]);
  const dunning = useMemo(() => platformBillingService.getDunning(), [dataVersion]);
  const creditNotes = useMemo(() => platformBillingService.getCreditNotes(), [dataVersion]);
  const refunds = useMemo(() => platformBillingService.getRefunds(), [dataVersion]);
  const ledger = useMemo(() => platformBillingService.getLedger(), [dataVersion]);

  // Receivables list
  const receivables = useMemo(() => {
    return invoices.filter((i) => i.balance_due > 0);
  }, [invoices]);

  // Dynamic Calculated KPIs (Zero Hardcoding)
  const kpiMetrics = useMemo(() => {
    return platformBillingService.calculateKpis(selectedPeriod);
  }, [selectedPeriod, dataVersion]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.plan_tier && inv.plan_tier.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' ? true : inv.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Export CSV
  const handleExportInvoices = () => {
    const rows = [
      ['Invoice #', 'Customer', 'Plan', 'Issue Date', 'Due Date', 'Subtotal', 'Tax (GST)', 'Total', 'Amount Paid', 'Balance Due', 'Status'],
      ...invoices.map((i) => [
        i.invoice_number,
        `"${i.tenant_name}"`,
        i.plan_tier || 'Professional',
        i.issue_date || i.billing_date,
        i.due_date,
        i.subtotal,
        i.gst_amount || i.tax,
        i.total,
        i.amount_paid,
        i.balance_due,
        i.status,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Joy PeopleHR_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Razorpay Gateway Diagnostics & Webhook Testing State
  const [gatewayDiag, setGatewayDiag] = useState<any>(null);
  const [isRunningDiag, setIsRunningDiag] = useState<boolean>(false);
  const [diagOutput, setDiagOutput] = useState<string | null>(null);

  const runGatewayDiagnostic = async () => {
    setIsRunningDiag(true);
    try {
      const res = await fetch('/api/razorpay/diagnostic');
      const data = await res.json();
      setGatewayDiag(data);
      setDiagOutput(`[Razorpay Gateway Diagnostic]\nStatus: ${data.status.toUpperCase()}\nKey ID: ${data.key_id}\nEnvironment: ${data.environment}\nAPI Reachable: ${data.api_reachable ? 'YES (200 OK)' : 'NO'}\nTest Order ID: ${data.test_order_id || 'N/A'}\nWebhook Secret Configured: ${data.webhook_secret_configured ? 'YES' : 'NO'}\nTimestamp: ${data.timestamp}`);
    } catch (e: any) {
      setDiagOutput(`Diagnostic check failed: ${e.message}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const runTestWebhook = async () => {
    setIsRunningDiag(true);
    try {
      const testEvent = {
        event: 'payment.captured',
        account_id: 'acc_test_joypeoplehr',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: `pay_test_${Date.now()}`,
              amount: 500000,
              currency: 'INR',
              status: 'captured',
              order_id: `order_test_${Date.now()}`,
              notes: {
                diagnostic: 'admin_test_webhook_ping',
              },
            },
          },
        },
      };

      const res = await fetch('/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent),
      });
      const data = await res.json();
      setDiagOutput(`[Razorpay Ingress Webhook Simulation]\nStatus: ${res.status} OK\nEvent: ${data.event}\nSignature Verified: ${data.verified ? 'YES (HMAC Match)' : 'NO'}\nProcessed At: ${data.processed_at}`);
    } catch (e: any) {
      setDiagOutput(`Webhook test failed: ${e.message}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* ----------------------------------------------------
          1. HEADER TOOLBAR
         ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer invoices, payments, GST, collections and financial records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter Dropdown */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-xs cursor-pointer"
          >
            <option value="Current Month">Current Month (Aug 2026)</option>
            <option value="Previous Month">Previous Month (Jul 2026)</option>
            <option value="Current Quarter">Current Q2 (Jul-Sep 2026)</option>
            <option value="Previous Quarter">Previous Q1 (Apr-Jun 2026)</option>
            <option value="Current Financial Year">Current FY 2026-27</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportInvoices}
            className="flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBillingSettingsModal(true)}
            className="flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
            Billing Settings
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateInvoiceModal(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-xs font-bold text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            + Create Invoice
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. DYNAMIC REALTIME CALCULATED 5-KPI TILES
         ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* KPI 1: Gross Invoiced */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Invoiced</span>
          <div className="text-2xl font-bold font-mono text-gray-900">₹{kpiMetrics.grossInvoiced.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-gray-400 font-medium">Taxable Subtotal</span>
        </div>

        {/* KPI 2: Collected */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Collected</span>
          <div className="text-2xl font-bold font-mono text-[#047857]">₹{kpiMetrics.collected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-700 font-medium">Settled Payments</span>
        </div>

        {/* KPI 3: Outstanding */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Outstanding</span>
          <div className="text-2xl font-bold font-mono text-gray-900">₹{kpiMetrics.outstanding.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-gray-400 font-medium">Uncollected Balance</span>
        </div>

        {/* KPI 4: Overdue */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overdue</span>
          <div className="text-2xl font-bold font-mono text-rose-600">₹{kpiMetrics.overdue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-rose-600 font-medium">Past Due Receivables</span>
        </div>

        {/* KPI 5: Tax Collected */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tax Collected</span>
          <div className="text-2xl font-bold font-mono text-purple-700">₹{kpiMetrics.taxCollected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-purple-700 font-medium">GST Payable Output</span>
        </div>
      </div>

      {/* ----------------------------------------------------
          2.1 RAZORPAY GATEWAY & WEBHOOK LIVE DIAGNOSTIC HUD
         ---------------------------------------------------- */}
      <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 border border-emerald-200/80 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-900">Razorpay Enterprise Billing & Webhook Gateway</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {gatewayDiag?.status === 'healthy' ? 'Active & Operational (200 OK)' : 'Active (Sandbox Ready)'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Key ID: <span className="font-mono font-bold text-gray-700">rzp_test_TqReUSPk2WMRmD</span> • Ingress: <span className="font-mono text-gray-700">/api/razorpay/webhook</span> • Auto-Refunds & HMAC Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={runGatewayDiagnostic}
              disabled={isRunningDiag}
              className="text-xs font-bold text-[#047857] border-emerald-300 hover:bg-emerald-50 h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRunningDiag ? 'animate-spin' : ''}`} />
              Test API Key & Orders
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runTestWebhook}
              disabled={isRunningDiag}
              className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 h-8"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Simulate Webhook
            </Button>
          </div>
        </div>

        {diagOutput && (
          <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap relative animate-in fade-in">
            <button
              onClick={() => setDiagOutput(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800"
            >
              Dismiss
            </button>
            {diagOutput}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          3. 7 TABS BAR WITH LIVE RECORD COUNTS
         ---------------------------------------------------- */}
      <div className="border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'invoices', label: `Invoices (${invoices.length})` },
            { id: 'payments', label: `Payments (${transactions.length})` },
            { id: 'receivables', label: `Receivables (${receivables.length})` },
            { id: 'credit_notes', label: `Credit Notes (${creditNotes.length})` },
            { id: 'refunds', label: `Refunds (${refunds.length})` },
            { id: 'tax', label: `Tax / GST (${invoices.length})` },
            { id: 'reconciliation', label: `Reconciliation Ledger (${ledger.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                activeTab === tab.id
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------
          4. TAB 1: INVOICES DIRECTORY
         ---------------------------------------------------- */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
              >
                <option value="all">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Issued">Issued (Pending)</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan Tier</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4">Tax (18%)</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setPreviewInvoice(inv)}
                      className="hover:bg-gray-50/60 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{inv.tenant_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          {inv.plan_tier || 'Professional'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{inv.issue_date || inv.billing_date}</td>
                      <td className="py-3.5 px-4 font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">₹{(inv.gst_amount || inv.tax || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">₹{inv.total.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700">₹{inv.amount_paid.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">₹{inv.balance_due.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                              : inv.status === 'Partially Paid'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewInvoice(inv)}
                          className="h-7 text-[11px] font-bold"
                        >
                          View
                        </Button>
                        {inv.balance_due > 0 && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="h-7 text-[11px] bg-[#047857] hover:bg-[#036246] text-white font-bold"
                          >
                            Pay
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

      {/* ----------------------------------------------------
          5. TAB 2: PAYMENTS & SETTLEMENTS
         ---------------------------------------------------- */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Transaction Ref</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel / Gateway</th>
                  <th className="py-3 px-4">Gross Settled</th>
                  <th className="py-3 px-4">Gateway Fee</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4">Settlement Batch</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-5 font-mono font-bold text-[#047857]">{tx.transaction_ref}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{tx.invoice_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{tx.tenant_name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{tx.gateway}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">₹{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">₹{tx.gateway_fee.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">₹{tx.net_payout.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">{tx.settlement_batch_id}</td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                        {tx.settlement_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          6. TAB 3: ACCOUNTS RECEIVABLE
         ---------------------------------------------------- */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      You're all caught up! No outstanding receivables.
                    </td>
                  </tr>
                ) : (
                  receivables.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-gray-900">{rec.tenant_name}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#047857]">{rec.invoice_number}</td>
                      <td className="py-3.5 px-4 text-gray-500">{rec.due_date}</td>
                      <td className="py-3.5 px-4 font-mono">₹{rec.total.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700">₹{rec.amount_paid.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">₹{rec.balance_due.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-5 text-right space-x-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedInvoiceForPayment(rec)}
                          className="h-7 text-[11px] bg-[#047857] hover:bg-[#036246] text-white font-bold"
                        >
                          Record Payment
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          7. TAB 4: CREDIT NOTES
         ---------------------------------------------------- */}
      {activeTab === 'credit_notes' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Credit Note #</th>
                  <th className="py-3 px-4">Original Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Credit Amount</th>
                  <th className="py-3 px-4">GST Adjustment</th>
                  <th className="py-3 px-4">Total Credit</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No credit notes issued.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-purple-700">{cn.credit_note_number}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{cn.original_invoice_number}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{cn.tenant_name}</td>
                      <td className="py-3.5 px-4 font-mono">₹{cn.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500">₹{cn.tax_adjustment.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">₹{cn.total_credit.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-gray-600">{cn.reason}</td>
                      <td className="py-3.5 px-5 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {cn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          8. TAB 5: REFUNDS
         ---------------------------------------------------- */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Refund #</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">Gateway Refund / Payment Ref</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      No refunds processed.
                    </td>
                  </tr>
                ) : (
                  refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-rose-600">{ref.refund_number}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{ref.invoice_number}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{ref.tenant_name}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">₹{ref.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                        {ref.gateway_refund_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {ref.gateway_refund_id}
                          </span>
                        ) : (
                          <span className="text-gray-400">{ref.payment_ref || 'Local / Manual'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                          {ref.payment_method || 'Razorpay (Test)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{ref.reason}</td>
                      <td className="py-3.5 px-4 text-gray-500">{ref.created_at}</td>
                      <td className="py-3.5 px-5 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          {ref.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          9. TAB 6: TAX / GST COMPLIANCE
         ---------------------------------------------------- */}
      {activeTab === 'tax' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 text-xs text-purple-950 flex items-center justify-between">
            <div>
              <strong className="block font-bold">Indian GST Output Tax Liability</strong>
              <span>Supplier GSTIN: <strong>33AAACW0000A1Z5</strong> (Tamil Nadu • SAC 998313 Software as a Service)</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-purple-700 block">Total GST Output (18%)</span>
              <strong className="text-lg font-mono text-purple-900">₹{kpiMetrics.taxCollected.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Place of Supply</th>
                    <th className="py-3 px-4">Taxable Value</th>
                    <th className="py-3 px-4">CGST (9%)</th>
                    <th className="py-3 px-4">SGST (9%)</th>
                    <th className="py-3 px-4">IGST (18%)</th>
                    <th className="py-3 px-5 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-gray-900">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{inv.tenant_name}</td>
                      <td className="py-3.5 px-4 text-gray-600">{inv.place_of_supply || 'Tamil Nadu (33)'}</td>
                      <td className="py-3.5 px-4 font-mono">₹{inv.subtotal.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-purple-700">₹{(inv.cgst_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-purple-700">₹{(inv.sgst_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-mono text-purple-700">₹{(inv.igst_amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-purple-900">
                        ₹{(inv.gst_amount || inv.tax || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          10. TAB 7: RECONCILIATION LEDGER
         ---------------------------------------------------- */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-xs">Double-Entry Financial Audit Ledger</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Immutable accounting ledger recording debit/credit entries for all invoices and settlements.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-5 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-xs">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-5 font-sans text-gray-500">{entry.date}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{entry.invoice_number || '—'}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-gray-900">{entry.tenant_name}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        {entry.account}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-600">{entry.description}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-purple-700">
                      {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODALS & DRAWERS
         ---------------------------------------------------- */}
      {/* 1. Create Invoice Multi-Step Wizard */}
      <CreateInvoiceMultiStepModal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        onInvoiceCreated={(newInv) => {
          refreshData();
          setPreviewInvoice(newInv);
        }}
      />

      {/* 2. Dedicated Invoice Document Preview & Print Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          isOpen={true}
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onRecordPayment={(inv) => {
            setSelectedInvoiceForPayment(inv);
          }}
          onIssueCreditNote={(inv) => {
            setSelectedInvoiceForCredit(inv);
          }}
          onIssueRefund={(inv) => {
            setSelectedInvoiceForRefund(inv);
          }}
          onRefreshData={refreshData}
        />
      )}

      {/* 3. Record Payment Settlement Modal */}
      {selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={true}
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onPaymentRecorded={refreshData}
        />
      )}

      {/* 4. Issue Credit Note Modal */}
      {selectedInvoiceForCredit && (
        <CreateCreditNoteModal
          isOpen={true}
          invoice={selectedInvoiceForCredit}
          onClose={() => setSelectedInvoiceForCredit(null)}
          onCreditNoteCreated={refreshData}
        />
      )}

      {/* 5. Issue Refund Modal */}
      {selectedInvoiceForRefund && (
        <IssueRefundModal
          isOpen={true}
          invoice={selectedInvoiceForRefund}
          onClose={() => setSelectedInvoiceForRefund(null)}
          onRefundIssued={refreshData}
        />
      )}

      {/* 6. Billing Settings Modal */}
      <BillingSettingsModal
        isOpen={showBillingSettingsModal}
        onClose={() => setShowBillingSettingsModal(false)}
      />
    </div>
  );
};
