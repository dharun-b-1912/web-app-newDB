// src/features/platform/subviews/SaaSInvoicesView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Invoice Generator & Financial Billing Engine
// Tax Invoices, Proforma, Credit/Debit Notes, Payments & GST Compliance
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  Share2,
  Copy,
  Building2,
  Users,
  Eye,
  Edit2,
  X,
  Layers,
  DollarSign,
  ShieldCheck,
  Check,
  Receipt,
  FileText,
  Calendar,
  Send,
  Zap,
  Printer,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  SaaSInvoice,
  InvoiceType,
  InvoiceStatus,
  InvoicePaymentRecord,
  PaymentMethod,
} from '../../../types/saasCommercial';
import {
  saasCommercialService,
  SUPPLIER_COMPANY_DETAILS,
} from '../../../services/platform/saasCommercialService';
import { numberToWordsIndian } from '../../../services/payrollApi';

interface SaaSInvoicesViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SaaSInvoicesView: React.FC<SaaSInvoicesViewProps> = ({ onNavigateTab }) => {
  const [invoices, setInvoices] = useState<SaaSInvoice[]>(() =>
    saasCommercialService.getInvoices()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Preview Drawer
  const [previewInvoice, setPreviewInvoice] = useState<SaaSInvoice | null>(null);

  // Payment Modal
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<SaaSInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer (NEFT/RTGS)');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentOfficer, setPaymentOfficer] = useState('Finance Desk');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (typeFilter !== 'ALL' && inv.invoiceType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.clientName.toLowerCase().includes(query) ||
          inv.clientGstin.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [invoices, typeFilter, statusFilter, searchQuery]);

  const totalOutstanding = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  }, [invoices]);

  const collectedThisMonth = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  }, [invoices]);  const totalGstLiability = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0);
  }, [invoices]);

  const totalBilledValue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.totalInvoiceAmount || 0), 0);
  }, [invoices]);

  const handleOpenPayment = (inv: SaaSInvoice) => {
    setRecordingPaymentFor(inv);
    setPaymentAmount(inv.balanceDue);
    setPaymentUtr(`HDFCR${Date.now().toString().slice(-8)}`);
  };

  const handleSavePayment = () => {
    if (!recordingPaymentFor || paymentAmount <= 0) return;

    saasCommercialService.recordPayment(
      recordingPaymentFor.id,
      paymentAmount,
      paymentMethod,
      paymentUtr,
      paymentOfficer
    );

    const updatedList = saasCommercialService.getInvoices();
    setInvoices([...updatedList]);
    if (previewInvoice && previewInvoice.id === recordingPaymentFor.id) {
      setPreviewInvoice(updatedList.find((i) => i.id === recordingPaymentFor.id) || null);
    }
    setRecordingPaymentFor(null);
  };

  const handleSendWhatsAppInvoice = (inv: SaaSInvoice) => {
    const text = `*JOY PEOPLEHR — TAX INVOICE NOTIFICATION*
--------------------------------------------
🧾 *Invoice Number:* ${inv.invoiceNumber}
🏢 *Billed To:* ${inv.clientName} (GSTIN: ${inv.clientGstin})
📅 *Invoice Date:* ${inv.invoiceDate} | *Due Date:* ${inv.dueDate}
💰 *Total Amount:* ₹${inv.totalInvoiceAmount.toLocaleString('en-IN')}
⚠️ *Balance Due:* ₹${inv.balanceDue.toLocaleString('en-IN')}
📌 *Status:* ${inv.status}

BANK REMITTANCE DETAILS:
Beneficiary: ${inv.bankDetails.accountName}
Bank: ${inv.bankDetails.bankName}
Account No: ${inv.bankDetails.accountNumber}
IFSC Code: ${inv.bankDetails.ifsc}
UPI ID: ${inv.bankDetails.upiId}

Please remit the balance and quote reference ${inv.invoiceNumber}.
Joy Corporate Solutions Pvt Ltd | SAC 998313`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendEmailInvoice = (inv: SaaSInvoice) => {
    const subject = `Tax Invoice [${inv.invoiceNumber}] - ${inv.clientName} - Joy PeopleHR`;
    const body = `Dear Finance & Accounts Team,

Please find the details for your Joy PeopleHR SaaS subscription tax invoice.

TAX INVOICE DETAILS:
--------------------------------------------
Invoice Number: ${inv.invoiceNumber}
Client: ${inv.clientName}
Billing Period: ${inv.billingPeriodStart} to ${inv.billingPeriodEnd}
Taxable Value: ₹${inv.taxableValue.toLocaleString('en-IN')}
Statutory GST (18% SAC 998313): ₹${inv.totalTax.toLocaleString('en-IN')}
Total Invoice Amount: ₹${inv.totalInvoiceAmount.toLocaleString('en-IN')}
Amount Paid: ₹${inv.amountPaid.toLocaleString('en-IN')}
Balance Due: ₹${inv.balanceDue.toLocaleString('en-IN')}
Payment Due Date: ${inv.dueDate}

BANK REMITTANCE INSTRUCTIONS:
Beneficiary: ${inv.bankDetails.accountName}
Bank: ${inv.bankDetails.bankName}
Account Number: ${inv.bankDetails.accountNumber}
IFSC Code: ${inv.bankDetails.ifsc}
UPI ID: ${inv.bankDetails.upiId}

Kindly quote the invoice number when making electronic transfer and share the UTR reference for settlement clearance.

Warm regards,
Finance & Accounts Desk
Joy Corporate Solutions Private Limited
Level 6, Joy Tech Park, OMR, Chennai, India
billing@joypeoplehr.com`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap">Paid ✓</span>;
      case 'Partially Paid':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">Partially Paid</span>;
      case 'Sent':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">Sent</span>;
      case 'Issued':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">Issued</span>;
      case 'Overdue':
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">Overdue</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans pt-1">
      {/* ── 1. Top Header & Metrics ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Invoicing & Commercial Billing</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              GST Statutory Compliant (SAC 998313)
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            SaaS subscription tax invoices, proforma billings, credit/debit notes, and UTR payment settlements. Governed by subscription pricing snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-quotations');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-[#64748B]" />
            Quotations Pipeline
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-plans');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-[#64748B]" />
            Plans & Pricing
          </Button>
        </div>
      </div>

      {/* ── 2. Dynamic KPI Metrics Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <p className="text-[11.5px] text-amber-700 font-medium mt-1">
            {invoices.filter((i) => i.balanceDue > 0).length} invoice(s) pending clearance
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected Collections</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            ₹{collectedThisMonth.toLocaleString('en-IN')}
          </div>
          <p className="text-[11.5px] text-emerald-700 font-medium mt-1">
            {invoices.filter((i) => i.amountPaid > 0).length} invoice(s) verified via UTR
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Invoices</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{invoices.length} Issued</div>
          <p className="text-[11.5px] text-slate-500 mt-1">
            Total Billed: ₹{totalBilledValue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST Liability (18%)</span>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            ₹{totalGstLiability.toLocaleString('en-IN')}
          </div>
          <p className="text-[11.5px] text-blue-700 font-medium mt-1">GSTR-1 Outward Filing (SAC 998313)</p>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number, client name, or GSTIN..."
            className="w-full pl-10 pr-4 py-2 text-[13.5px] rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Types</option>
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="RECURRING">Recurring Invoice</option>
            <option value="CREDIT_NOTE">Credit Note</option>
            <option value="DEBIT_NOTE">Debit Note</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Sent">Sent</option>
            <option value="Issued">Issued</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* ── 4. Invoices Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 whitespace-nowrap">Invoice Number</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Type & Period</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Taxable Value</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">GST (18%)</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Total Amount</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Balance Due</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Due Date</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No matching invoices found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try clearing your search query or filter selections.
                    </p>
                    {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                      <div className="text-[10px] text-slate-400 font-normal font-sans">{inv.paymentTerms}</div>
                    </td>

                    <td className="py-2.5 px-3 max-w-[180px]">
                      <div className="font-bold text-slate-900 text-xs truncate" title={inv.clientName}>
                        {inv.clientName}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate">{inv.clientGstin}</div>
                    </td>

                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {inv.invoiceType === 'TAX_INVOICE' ? 'Tax Invoice' : inv.invoiceType}
                      </span>
                      <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono">
                        {inv.billingPeriodStart} → {inv.billingPeriodEnd}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                      ₹{inv.taxableValue.toLocaleString('en-IN')}
                    </td>

                    <td className="py-2.5 px-2.5 text-right text-slate-600 font-medium whitespace-nowrap">
                      ₹{inv.totalTax.toLocaleString('en-IN')}
                      <div className="text-[10px] text-slate-400">
                        {inv.isInterState ? 'IGST 18%' : 'CGST+SGST 18%'}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 text-sm whitespace-nowrap">
                      ₹{inv.totalInvoiceAmount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {inv.balanceDue > 0 ? (
                        <span className="text-rose-700">₹{inv.balanceDue.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">₹0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5 text-slate-700 font-medium whitespace-nowrap font-mono text-[11px]">
                      {inv.dueDate}
                    </td>

                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {renderStatusBadge(inv.status)}
                    </td>

                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setPreviewInvoice(inv);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded inline-flex items-center gap-1"
                        title="Print / Save Tax Invoice as PDF"
                      >
                        <Printer className="h-3 w-3" />
                        PDF
                      </button>

                      <button
                        onClick={() => handleSendWhatsAppInvoice(inv)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-emerald-200"
                        title="Share Invoice on WhatsApp"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                        WhatsApp
                      </button>

                      <button
                        onClick={() => handleSendEmailInvoice(inv)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-blue-200"
                        title="Email Tax Invoice to Client"
                      >
                        <Mail className="h-3 w-3 text-blue-600" />
                        Email
                      </button>

                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Review
                      </button>

                      {inv.balanceDue > 0 && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded shadow-xs inline-flex items-center gap-1"
                        >
                          <CreditCard className="h-3 w-3" />
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Detailed Tax Invoice Drawer ───────────────────────────────────── */}
      {previewInvoice && (
        <div className="invoice-drawer-backdrop fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end print:static print:bg-white print:p-0 print:m-0 print:block print:inset-auto">
          <div className="invoice-drawer-card bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-800 print:max-w-none print:w-full print:h-auto print:p-0 print:m-0 print:overflow-visible print:shadow-none print:border-none">
            {/* Header (Screen Only) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">
                  GST Outward Tax Invoice
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {previewInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Statutory Tax Invoice Printable Document */}
            <div id="tax-invoice-printable" className="mt-4 space-y-4 text-xs font-sans">
              {/* 1. Official Supplier Letterhead & Document Type */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[#07563D] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                      JP
                    </div>
                    <div>
                      <div className="text-base font-black tracking-tight text-slate-900 uppercase">
                        {previewInvoice.supplierName}
                      </div>
                      <div className="text-[11px] text-slate-600 leading-snug">
                        {SUPPLIER_COMPANY_DETAILS.address}
                      </div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span><strong>GSTIN:</strong> {previewInvoice.supplierGstin}</span>
                        <span><strong>State:</strong> {previewInvoice.supplierState} (Code 33)</span>
                        <span><strong>PAN:</strong> AAACW0000A</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-block bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded">
                      TAX INVOICE
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">
                      (Original for Recipient)
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 max-w-[200px] leading-tight text-right">
                      Sec 31, CGST Act 2017 & Rule 46 CGST Rules
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Invoice Meta & Recipient Details */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 print:bg-white print:border-slate-300">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Billed To (Client / Recipient)
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{previewInvoice.clientName}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{previewInvoice.clientAddress}</div>
                  <div className="text-[11px] font-mono font-semibold text-slate-800 mt-1">
                    GSTIN: <span className="text-blue-700">{previewInvoice.clientGstin}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Place of Supply: <strong>{previewInvoice.placeOfSupply}</strong>
                  </div>
                </div>

                <div className="border-l border-slate-200 pl-4 space-y-1.5 text-[11px] print:border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Number:</span>
                    <strong className="font-mono text-slate-900">{previewInvoice.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice Date:</span>
                    <strong className="text-slate-900">{previewInvoice.invoiceDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Due Date:</span>
                    <strong className="text-slate-900">{previewInvoice.dueDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription Ref:</span>
                    <strong className="text-slate-900">{previewInvoice.subscriptionId || 'Active Subscription'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reverse Charge:</span>
                    <strong className="text-slate-900">No</strong>
                  </div>
                </div>
              </div>

              {/* 3. Itemized Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 print:bg-slate-50 print:border-slate-300">
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Description of Services</th>
                      <th className="p-2.5 text-center">HSN/SAC</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Taxable (₹)</th>
                      <th className="p-2.5 text-right">GST (₹)</th>
                      <th className="p-2.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {previewInvoice.lineItems.map((li, idx) => (
                      <tr key={li.id}>
                        <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900">{li.description}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{li.sku}</div>
                        </td>
                        <td className="p-2.5 text-center font-mono font-medium">{li.sacCode || '998315'}</td>
                        <td className="p-2.5 text-center font-medium">{li.quantity} {li.unit || 'Mo'}</td>
                        <td className="p-2.5 text-right font-medium">₹{li.taxableValue.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right text-slate-600">
                          ₹{(li.cgstAmount + li.sgstAmount + li.igstAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          ₹{li.totalLineAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. Tax Calculation & Amount In Words */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Amount Chargeable (in words)
                    </span>
                    <div className="font-bold text-slate-900 text-xs mt-1 capitalize leading-relaxed">
                      {numberToWordsIndian(previewInvoice.totalInvoiceAmount)}
                    </div>
                  </div>

                  {/* Electronic Remittance */}
                  <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1 print:bg-white print:border-slate-300">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block text-[10px]">
                      Electronic Remittance (NEFT / RTGS / IMPS)
                    </span>
                    <div>Beneficiary: <strong>{previewInvoice.bankDetails.accountName}</strong></div>
                    <div>Bank: <strong>{previewInvoice.bankDetails.bankName}</strong> — A/C: <strong>{previewInvoice.bankDetails.accountNumber}</strong></div>
                    <div>IFSC: <strong>{previewInvoice.bankDetails.ifsc}</strong> • UPI ID: <strong>{previewInvoice.bankDetails.upiId}</strong></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs print:bg-white print:border-slate-300">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Services Subtotal:</span>
                    <span className="font-semibold text-slate-800">₹{previewInvoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {previewInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount Allowed:</span>
                      <span>-₹{previewInvoice.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-xs print:border-slate-300">
                    <span>Taxable Value:</span>
                    <span>₹{previewInvoice.taxableValue.toLocaleString('en-IN')}</span>
                  </div>

                  {previewInvoice.isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated GST (IGST 18%):</span>
                      <span>+₹{previewInvoice.igstAmount.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central GST (CGST 9%):</span>
                        <span>+₹{previewInvoice.cgstAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State GST (SGST 9%):</span>
                        <span>+₹{previewInvoice.sgstAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-black text-slate-900 bg-white p-2.5 rounded-lg border print:border-slate-400">
                    <span>Invoice Total (INR):</span>
                    <span className="text-slate-900">₹{previewInvoice.totalInvoiceAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-600 pt-1">
                    <span>Amount Paid / Settled:</span>
                    <span className="font-bold text-emerald-700">₹{previewInvoice.amountPaid.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-900">
                    <span>Net Balance Due:</span>
                    <span className={previewInvoice.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                      ₹{previewInvoice.balanceDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Verified Payment Transactions (if any) */}
              {previewInvoice.payments.length > 0 && (
                <div className="print:hidden">
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5">Verified Payment Transactions</h4>
                  <div className="space-y-1.5">
                    {previewInvoice.payments.map((p) => (
                      <div key={p.id} className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-emerald-900">₹{p.amount.toLocaleString('en-IN')} via {p.method}</div>
                          <div className="text-[10px] text-emerald-700 font-mono">UTR: {p.utrOrReference} • {p.paymentDate}</div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Verified ✓
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Statutory Declaration & Authorized Signature */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4 text-[10.5px] print:border-slate-300">
                <div className="text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 uppercase">Declaration</div>
                  <p className="leading-snug">
                    We declare that this invoice shows the actual price of the software subscriptions & cloud services described and that all particulars are true and correct. Software services are governed by the Master Subscription Agreement.
                  </p>
                </div>
                <div className="text-right flex flex-col justify-between items-end">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">For {previewInvoice.supplierName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Authorised Signatory</div>
                  </div>
                  <div className="pt-8">
                    <div className="border-t border-slate-400 w-44 text-center text-[10px] text-slate-500 pt-1">
                      Authorised Representative / Finance Desk
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Actions Toolbar (Hidden on Print) */}
            <div className="mt-5 space-y-4 print:hidden">
              {/* Invoice Dispatch & PDF Export Toolbar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Invoice Dispatch & Statutory PDF
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppInvoice(previewInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Send via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEmailInvoice(previewInvoice)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send via Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-emerald-400" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                {previewInvoice.balanceDue > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayment(previewInvoice)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Record Payment Settlement
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewInvoice(null)}
                >
                  Close Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Record Payment Modal ─────────────────────────────────────────── */}
      {recordingPaymentFor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Payment Remittance</h3>
                <p className="text-xs text-slate-500">{recordingPaymentFor.invoiceNumber} — {recordingPaymentFor.clientName}</p>
              </div>
              <button
                onClick={() => setRecordingPaymentFor(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount Received (₹ INR)</label>
                <input
                  type="number"
                  min={1}
                  max={recordingPaymentFor.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold text-emerald-700 rounded-lg border border-slate-300"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  Remaining balance due: ₹{recordingPaymentFor.balanceDue.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Bank Transfer (NEFT/RTGS)">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Credit Card">Corporate Credit Card</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  placeholder="e.g. HDFCR520261005881923"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Verified By (Finance Officer)</label>
                <input
                  type="text"
                  value={paymentOfficer}
                  onChange={(e) => setPaymentOfficer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordingPaymentFor(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Payment & Update Invoice ✓
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
