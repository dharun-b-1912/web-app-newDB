import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building,
  DollarSign,
  Printer,
  Download,
  Search,
  Check,
  FileText,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  Sliders,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Cpu,
  Layers,
  Info,
  ExternalLink,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { payrollApi } from '../../../services/payrollApi';
import { BankDisbursementBatch, BankDisbursementItem } from '../../../types/payroll';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { RecordBankConfirmationModal } from './RecordBankConfirmationModal';

export interface DisbursementBatchDetailModalProps {
  batch: BankDisbursementBatch | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const DisbursementBatchDetailModal: React.FC<DisbursementBatchDetailModalProps> = ({
  batch,
  onClose,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'validation' | 'approval' | 'bank-submission' | 'reconciliation' | 'failures' | 'audit'
  >('overview');

  const [searchPaymentQuery, setSearchPaymentQuery] = useState<string>('');
  const [selectedItemDetail, setSelectedItemDetail] = useState<BankDisbursementItem | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [checkerNotes, setCheckerNotes] = useState<string>('');
  const [isSubmittingBank, setIsSubmittingBank] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [selectedDownloadTemplateId, setSelectedDownloadTemplateId] = useState<string>(batch?.template_id || 'tmpl-hdfc-enet');

  const bankTemplates = useMemo(() => payrollApi.getBankPaymentTemplates(), []);

  if (!batch) return null;

  const items = batch.items || [];

  const filteredItems = useMemo(() => {
    if (!searchPaymentQuery.trim()) return items;
    const q = searchPaymentQuery.toLowerCase();
    return items.filter(it =>
      it.employee_name.toLowerCase().includes(q) ||
      it.employee_code.toLowerCase().includes(q) ||
      (it.department && it.department.toLowerCase().includes(q)) ||
      (it.bank_reference_number && it.bank_reference_number.toLowerCase().includes(q))
    );
  }, [items, searchPaymentQuery]);

  const failedItems = useMemo(() => {
    return items.filter(it => it.bank_status === 'Failed' || it.bank_status === 'Rejected');
  }, [items]);

  const settledItems = useMemo(() => {
    return items.filter(it => it.bank_status === 'Settled' || it.bank_status === 'Success');
  }, [items]);

  // Checker Approval Action
  const handleCheckerApprove = () => {
    setIsApproving(true);
    try {
      payrollApi.approveChecker(batch.id, user?.name || 'Finance Checker', checkerNotes);
      showToast(`✓ Checker approval granted for batch ${batch.batch_number}!`);
      setIsApproving(false);
      onRefresh();
    } catch (err: any) {
      setIsApproving(false);
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  // Transmit to Bank Action
  const handleSubmitToBank = () => {
    setIsSubmittingBank(true);
    try {
      payrollApi.submitToBank(batch.id, user?.name || 'Treasury Officer');
      showToast(`✓ Batch ${batch.batch_number} transmitted to Bank Gateway!`);
      setIsSubmittingBank(false);
      onRefresh();
    } catch (err: any) {
      setIsSubmittingBank(false);
      showToast(err.message || 'Submission failed', 'error');
    }
  };

  // Simulate / Fetch Bank Return Responses
  const handleSimulateBankReturn = () => {
    try {
      const updated = payrollApi.simulateBankResponse(batch.id);
      showToast(`✓ Bank settlement processed: ${updated.successful_count} Settled, ${updated.failed_count} Failed.`);
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Retry Failed Item
  const handleRetryItem = (itemId: string) => {
    setIsRetrying(true);
    try {
      payrollApi.retryFailedPayment(batch.id, itemId, undefined, user?.name || 'Treasury Officer');
      showToast(`✓ Successfully retransmitted and settled payment.`);
      setIsRetrying(false);
      onRefresh();
    } catch (err: any) {
      setIsRetrying(false);
      showToast(err.message, 'error');
    }
  };

  // Reconcile Batch
  const handleReconcile = () => {
    setIsReconciling(true);
    try {
      payrollApi.reconcileBatch(batch.id, user?.name || 'Finance Officer');
      showToast(`✓ Fully reconciled ${batch.batch_number} (₹0.00 Unexplained Variance)`);
      setIsReconciling(false);
      onRefresh();
    } catch (err: any) {
      setIsReconciling(false);
      showToast(err.message, 'error');
    }
  };

  // Download Bank File
  const handleDownloadFile = (tmplId?: string) => {
    try {
      const targetId = tmplId || selectedDownloadTemplateId || batch.template_id;
      const fileData = payrollApi.generateBankFile(batch.id, targetId);
      const blob = new Blob([fileData.content], { type: fileData.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✓ Downloaded ${fileData.fileName}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">

        {/* ─── 1. BATCH DETAIL HEADER ────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-[#07563D] to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0 shadow-lg border-b border-emerald-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-emerald-300 font-black text-xl flex items-center justify-center border border-white/15 shadow-inner shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight font-mono">{batch.batch_number}</h2>
                <span className="bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border border-white/10">
                  {batch.pay_period}
                </span>
                <span className={cn(
                  "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs",
                  batch.status === 'Reconciled' ? "bg-teal-400/20 text-teal-200 border border-teal-400/40" :
                  batch.status === 'Settled' || batch.status === 'Paid' ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40" :
                  batch.status === 'Approved' ? "bg-blue-400/20 text-blue-200 border border-blue-400/40" :
                  batch.status === 'BankProcessing' || batch.status === 'Submitted' ? "bg-purple-400/20 text-purple-200 border border-purple-400/40 animate-pulse" :
                  batch.status === 'PartiallySettled' || batch.status === 'ExceptionsFound' ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" :
                  "bg-white/10 text-slate-300 border border-white/10"
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {batch.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-100/80 mt-1 flex-wrap font-medium">
                <span>Total: <strong className="text-white font-mono">₹{batch.total_amount.toLocaleString('en-IN')}</strong></span>
                <span className="text-white/30">•</span>
                <span>{batch.total_transactions} Employees</span>
                <span className="text-white/30">•</span>
                <span>Source: <strong className="text-emerald-200">{batch.source_bank_name || 'HDFC Corporate CMS'}</strong></span>
                <span className="text-white/30">•</span>
                <span>Maker: <strong className="text-slate-200">{batch.maker_name || 'HR Maker'}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => handleDownloadFile()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 shadow-xs backdrop-blur-md transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Export Bank File</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 shadow-xs backdrop-blur-md transition-all cursor-pointer select-none"
            >
              <Printer className="w-4 h-4 text-slate-200 shrink-0" />
              <span>Print Register</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white/90 hover:text-white transition-all cursor-pointer ml-1 shadow-xs"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── 2. TOP SUMMARY METRIC STRIP (7 SLEEK CAPSULES) ─────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 p-3.5 sm:px-6 bg-slate-50 border-b border-slate-200/80 shrink-0">
          
          {/* 1. TOTAL SCOPE */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Total Scope
            </span>
            <strong className="text-sm sm:text-base font-black text-slate-900 font-mono mt-1 block tracking-tight">
              ₹{batch.total_amount.toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {batch.total_transactions} Instructions
            </span>
          </div>

          {/* 2. MODE */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-blue-50/70 to-blue-50/20 border border-blue-200/70 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Mode
            </span>
            <strong className="text-sm sm:text-base font-black text-blue-950 font-mono mt-1 block tracking-tight">
              {batch.payment_mode}
            </strong>
            <span className="text-[10px] text-blue-700 font-medium block mt-0.5">
              Direct Settlement
            </span>
          </div>

          {/* 3. BANK STATUS */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-purple-50/70 to-purple-50/20 border border-purple-200/70 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Bank Status
            </span>
            <strong className="text-sm sm:text-base font-black text-purple-950 font-mono mt-1 block tracking-tight truncate">
              {batch.status === 'BankProcessing' ? 'In Flight' : batch.status === 'Approved' ? 'Authorized' : batch.status}
            </strong>
            <span className="text-[10px] text-purple-700 font-medium block mt-0.5 truncate">
              {batch.bank_reference_id ? 'Ref Recorded' : 'Pending Transmit'}
            </span>
          </div>

          {/* 4. SETTLED */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-emerald-50/20 border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Bank Settled
            </span>
            <strong className="text-sm sm:text-base font-black text-emerald-950 font-mono mt-1 block tracking-tight">
              ₹{(batch.successful_amount ?? (batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? batch.total_amount : 0)).toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
              {batch.successful_count ?? settledItems.length} Settled ✓
            </span>
          </div>

          {/* 5. FAILED / RETURNS */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-rose-50/70 to-rose-50/20 border border-rose-200/70 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Failed / Returns
            </span>
            <strong className="text-sm sm:text-base font-black text-rose-950 font-mono mt-1 block tracking-tight">
              ₹{(batch.failed_amount || 0).toLocaleString('en-IN')}
            </strong>
            <span className="text-[10px] text-rose-700 font-medium block mt-0.5">
              {batch.failed_count || failedItems.length} Exceptions
            </span>
          </div>

          {/* 6. RECONCILIATION */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-teal-50/80 to-teal-50/20 border border-teal-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Reconciliation
            </span>
            <strong className="text-sm sm:text-base font-black text-teal-950 font-mono mt-1 block tracking-tight truncate">
              {batch.status === 'Reconciled' ? 'Zero Variance ✓' : batch.status === 'Settled' ? 'Ready to Match' : 'Pending'}
            </strong>
            <span className="text-[10px] text-teal-700 font-medium block mt-0.5 truncate">
              {batch.reconciled_by ? `By ${batch.reconciled_by}` : 'Awaiting Settlement'}
            </span>
          </div>

          {/* 7. PAY DATE */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Value Date
            </span>
            <strong className="text-sm sm:text-base font-black text-slate-800 font-mono mt-1 block tracking-tight">
              31 Aug 2026
            </strong>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              Monthly Cycle
            </span>
          </div>
        </div>

        {/* ─── 3. NAVIGATION TABS (8 TABS) ─────────────────────────────────── */}
        <div className="bg-white px-4 sm:px-6 pt-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0 shadow-2xs">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'payments', label: `Payments (${items.length})`, icon: DollarSign },
            { id: 'validation', label: 'Validation Rules', icon: ShieldCheck },
            { id: 'approval', label: 'Maker-Checker Approval', icon: FileCheck },
            { id: 'bank-submission', label: 'Bank Transmission', icon: Cpu },
            { id: 'reconciliation', label: 'Reconciliation', icon: Calculator },
            { id: 'failures', label: `Failures & Returns (${failedItems.length})`, icon: AlertTriangle },
            { id: 'audit', label: 'Audit Trail', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-slate-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── 4. TAB CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/60">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* ─── 1. SLEEK CONNECTED LIFECYCLE PIPELINE ────────────────── */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#07563D]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Payment Lifecycle & Authorization Flow</h3>
                      <p className="text-xs text-slate-500">Continuous execution tracking from Maker sign-off to Zero-Variance Reconciliation.</p>
                    </div>
                  </div>
                  <Badge variant="emerald">Live Execution Engine</Badge>
                </div>

                {/* 5-Step Connected Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs relative">
                  
                  {/* Step 1: Maker Signed */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between",
                    batch.maker_signed_at || batch.status !== 'Draft'
                      ? "bg-gradient-to-b from-emerald-50/90 to-emerald-50/30 border-emerald-300/80 text-emerald-950 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ✓
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        Step 1
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Maker Signed</strong>
                      <span className="text-[11px] text-slate-500 block">HR Administrator</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold mt-1.5 block">✓ Verified & Signed</span>
                    </div>
                  </div>

                  {/* Step 2: Checker Approval */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between",
                    batch.checker_approved_at || batch.status === 'Approved' || batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                      ? "bg-gradient-to-b from-emerald-50/90 to-emerald-50/30 border-emerald-300/80 text-emerald-950 shadow-2xs"
                      : batch.status === 'PendingApproval' || batch.status === 'ReadyForApproval' || batch.status === 'MakerReviewed'
                      ? "bg-gradient-to-b from-amber-50 to-amber-50/20 border-amber-300 text-amber-950 ring-2 ring-amber-400/40 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-xs",
                        batch.checker_approved_at || batch.status === 'Approved' || batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      )}>
                        {batch.checker_approved_at || batch.status === 'Approved' || batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? '✓' : '2'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Step 2
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Checker Approval</strong>
                      <span className="text-[11px] text-slate-500 block">Finance Head (Dual Control)</span>
                      <span className="text-[10px] font-mono font-bold mt-1.5 block">
                        {batch.checker_approved_at || batch.status === 'Approved' || batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? '✓ Authorized' : '⏳ Awaiting Signoff'}
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Bank Transmitted */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between",
                    batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                      ? "bg-gradient-to-b from-emerald-50/90 to-emerald-50/30 border-emerald-300/80 text-emerald-950 shadow-2xs"
                      : batch.status === 'Approved' || batch.status === 'FileGenerated'
                      ? "bg-gradient-to-b from-purple-50 to-purple-50/20 border-purple-300 text-purple-950 ring-2 ring-purple-400/40 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-xs",
                        batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                          ? "bg-emerald-600 text-white"
                          : "bg-purple-600 text-white"
                      )}>
                        {batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? '✓' : '3'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Step 3
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Bank Transmitted</strong>
                      <span className="text-[11px] text-slate-500 block">{batch.source_bank_name || 'HDFC Corporate Desk'}</span>
                      <span className="text-[10px] font-mono font-bold mt-1.5 block">
                        {batch.status === 'Submitted' || batch.status === 'BankProcessing' || batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? '✓ File Generated & Sent' : '⏳ Ready to Transmit'}
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Bank Settled */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between",
                    batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                      ? "bg-gradient-to-b from-emerald-50/90 to-emerald-50/30 border-emerald-300/80 text-emerald-950 shadow-2xs"
                      : batch.status === 'BankProcessing' || batch.status === 'Submitted'
                      ? "bg-gradient-to-b from-blue-50 to-blue-50/20 border-blue-300 text-blue-950 ring-2 ring-blue-400/40 shadow-xs animate-pulse"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-xs",
                        batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled'
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 text-white"
                      )}>
                        {batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? '✓' : '4'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Step 4
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Bank Settled</strong>
                      <span className="text-[11px] text-slate-500 block">UTR References Assigned</span>
                      <span className="text-[10px] font-mono font-bold mt-1.5 block">
                        {batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? `✓ ${batch.successful_count || items.length} Debited & Settled` : '⏳ Bank Processing'}
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Zero-Variance Reconciled */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between",
                    batch.status === 'Reconciled' || batch.status === 'Closed'
                      ? "bg-gradient-to-b from-teal-50/90 to-teal-50/30 border-teal-300/80 text-teal-950 shadow-2xs font-bold"
                      : batch.status === 'Settled' || batch.status === 'Paid'
                      ? "bg-gradient-to-b from-amber-50 to-amber-50/20 border-amber-300 text-amber-950 ring-2 ring-amber-400/40 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shadow-xs",
                        batch.status === 'Reconciled' || batch.status === 'Closed'
                          ? "bg-teal-600 text-white"
                          : "bg-slate-400 text-white"
                      )}>
                        {batch.status === 'Reconciled' || batch.status === 'Closed' ? '✓' : '5'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Step 5
                      </span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">Reconciled</strong>
                      <span className="text-[11px] text-slate-500 block">Finance Officer Signoff</span>
                      <span className="text-[10px] font-mono font-bold mt-1.5 block">
                        {batch.status === 'Reconciled' ? '✓ Zero Variance Balance' : '⏳ Pending Match'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Sleek Next Action Callout Capsule */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#07563D] text-white border border-emerald-500/20 flex items-center justify-between flex-wrap gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 shrink-0 border border-white/10">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-black text-emerald-300 tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Next Recommended Action:
                      </span>
                      <strong className="text-sm font-bold text-white block">
                        {(batch.status === 'PendingApproval' || batch.status === 'ReadyForApproval' || batch.status === 'MakerReviewed') && 'Finance Approver must grant Checker Dual-Control Approval'}
                        {(batch.status === 'Approved' || batch.status === 'FileGenerated' || batch.status === 'Draft' || batch.status === 'Validated') && 'Transmit payment batch to Bank Corporate Gateway & generate official bulk file'}
                        {(batch.status === 'BankProcessing' || batch.status === 'Submitted') && 'Bank processing credits. Record bank return settlement via Email, Phone, or Statement.'}
                        {(batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'PartiallySettled') && 'Bank credited transactions. Execute zero-variance bank reconciliation.'}
                        {(batch.status === 'Reconciled') && 'Disbursement batch is 100% balanced and fully reconciled.'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(batch.status === 'PendingApproval' || batch.status === 'ReadyForApproval' || batch.status === 'MakerReviewed') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleCheckerApprove}
                        disabled={isApproving}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve as Checker (Finance Head)
                      </Button>
                    )}

                    {(batch.status === 'Approved' || batch.status === 'FileGenerated' || batch.status === 'Draft' || batch.status === 'Validated') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSubmitToBank}
                        disabled={isSubmittingBank}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Transmit Batch to Bank Gateway
                      </Button>
                    )}

                    {(batch.status === 'BankProcessing' || batch.status === 'Submitted' || batch.status === 'Approved' || batch.status === 'FileGenerated') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsConfirmationModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Record Bank Confirmation (Email/Phone)
                      </Button>
                    )}

                    {(batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'PartiallySettled') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleReconcile}
                        disabled={isReconciling}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5 mr-1.5" /> Run Zero-Variance Reconciliation
                      </Button>
                    )}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Batch Details */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Disbursement Details</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Batch Identifier:</span>
                      <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">{batch.batch_number}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Payroll Cycle:</span>
                      <strong className="text-slate-900 font-semibold">{batch.pay_period}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Payment Mode:</span>
                      <strong className="text-slate-900 font-semibold">{batch.payment_mode} (Direct Settlement)</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Source Account:</span>
                      <strong className="text-slate-900 font-mono text-[11px] truncate max-w-[170px]">{batch.bank_account_source}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Creation Timestamp:</span>
                      <strong className="text-slate-900 font-medium">{new Date(batch.created_at).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Maker-Checker State */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Dual Authorization State</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Maker (Initiator)</span>
                        <strong className="text-slate-900 font-bold">{batch.maker_name || 'HR Maker'}</strong>
                      </div>
                      <Badge variant="emerald">Signed ✓</Badge>
                    </div>

                    <div className={cn(
                      "flex justify-between items-center p-3 rounded-2xl border",
                      batch.checker_approved_at
                        ? "bg-emerald-50/60 border-emerald-200/60"
                        : "bg-amber-50/60 border-amber-200/60"
                    )}>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Checker (Finance Approver)</span>
                        <strong className="text-slate-900 font-bold">{batch.checker_name || 'Finance Approver'}</strong>
                      </div>
                      <Badge variant={batch.checker_approved_at ? 'emerald' : 'amber'}>
                        {batch.checker_approved_at ? 'Approved ✓' : 'Awaiting Signoff'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 3. Action Hub */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Lifecycle Engine</h3>
                      </div>
                      <Badge variant="emerald">Active</Badge>
                    </div>
                    <p className="text-xs text-slate-500">Execute current stage in dual-authorization pipeline.</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    {(batch.status === 'PendingApproval' || batch.status === 'ReadyForApproval' || batch.status === 'MakerReviewed') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleCheckerApprove}
                        disabled={isApproving}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve as Checker
                      </Button>
                    )}

                    {(batch.status === 'Approved' || batch.status === 'FileGenerated' || batch.status === 'Draft' || batch.status === 'Validated') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSubmitToBank}
                        disabled={isSubmittingBank}
                        className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Send to Bank Gateway
                      </Button>
                    )}

                    {(batch.status === 'BankProcessing' || batch.status === 'Submitted' || batch.status === 'Approved' || batch.status === 'FileGenerated') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsConfirmationModalOpen(true)}
                        className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Record Bank Confirmation
                      </Button>
                    )}

                    {(batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'PartiallySettled') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleReconcile}
                        disabled={isReconciling}
                        className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        <Calculator className="w-3.5 h-3.5 mr-1.5" /> Run Full Bank Reconciliation
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Payment Instruction Ledger ({items.length} Payments)</h3>
                  <p className="text-xs text-gray-500">Itemized employee bank disbursements with From-Bank to To-Bank routing trace.</p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search payment..."
                    value={searchPaymentQuery}
                    onChange={e => setSearchPaymentQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-3 py-3">Department</th>
                      <th className="px-3 py-3">From Bank ➔ To Bank</th>
                      <th className="px-3 py-3">Beneficiary Account</th>
                      <th className="px-3 py-3">IFSC</th>
                      <th className="px-3 py-3 text-right">Net Amount</th>
                      <th className="px-3 py-3">Bank Ref / UTR</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map(it => {
                      const isIntra = it.transfer_type === 'Intra-Bank (Same Bank FT)' || (it.ifsc_code && (batch.source_ifsc || 'HDFC').slice(0, 4) === it.ifsc_code.slice(0, 4));
                      return (
                        <tr
                          key={it.id}
                          onClick={() => setSelectedItemDetail(it)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-gray-900 block">{it.employee_name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{it.employee_code}</span>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{it.department || 'Operations'}</td>
                          <td className="px-3 py-3">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-gray-900 block">
                                {it.bank_name || 'Karur Vysya Bank'}
                              </span>
                              <span className={cn(
                                "inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                                isIntra ? "bg-emerald-100 text-emerald-900" : "bg-blue-100 text-blue-900"
                              )}>
                                {isIntra ? 'Intra-Bank FT' : 'Inter-Bank NEFT'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-700">{it.account_number_masked}</td>
                          <td className="px-3 py-3 font-mono text-gray-700">{it.ifsc_code}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-[#07563D]">
                            ₹{it.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-600">
                            {it.bank_reference_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              it.bank_status === 'Settled' || it.bank_status === 'Success' ? "bg-emerald-100 text-emerald-900" :
                              it.bank_status === 'Failed' || it.bank_status === 'Rejected' ? "bg-rose-100 text-rose-900" :
                              it.bank_status === 'Processing' ? "bg-purple-100 text-purple-900" :
                              "bg-gray-100 text-gray-700"
                            )}>
                              {it.bank_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: VALIDATION */}
          {activeTab === 'validation' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Pre-Disbursement Rule Engine Verification</h3>
                  <p className="text-xs text-gray-500">Automated multi-factor integrity verification executed prior to Maker submission.</p>
                </div>
                <Badge variant="emerald">100% Policy Reconciled</Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {(batch.validation_checks || []).map(chk => (
                  <div
                    key={chk.id}
                    className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-gray-900 font-bold">{chk.name}</strong>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-600">
                            {chk.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-600 block mt-0.5">{chk.message}</span>
                      </div>
                    </div>
                    <Badge variant="emerald">{chk.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: APPROVAL */}
          {activeTab === 'approval' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Maker-Checker Authorization Timeline</h3>
                <p className="text-xs text-gray-500">Dual-control financial authorization trace.</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                  <span className="text-emerald-700 font-bold shrink-0 mt-0.5">STEP 1</span>
                  <div>
                    <strong className="text-gray-900 block font-sans">Maker Review Signed</strong>
                    <span className="text-gray-500 text-[11px]">Actor: {batch.maker_name || 'HR Administrator'} • Timestamp: {batch.maker_signed_at || batch.created_at}</span>
                    {batch.maker_notes && <p className="text-gray-700 text-xs mt-1 font-sans">Notes: "{batch.maker_notes}"</p>}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                  <span className="text-blue-700 font-bold shrink-0 mt-0.5">STEP 2</span>
                  <div>
                    <strong className="text-gray-900 block font-sans">Checker Approval</strong>
                    <span className="text-gray-500 text-[11px]">Actor: {batch.checker_name || 'Finance Approver'} • Status: {batch.checker_approved_at ? 'Approved' : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BANK TRANSMISSION */}
          {activeTab === 'bank-submission' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Bank Transmission & Gateway Connection</h3>
                  <p className="text-xs text-gray-500">Direct integration telemetry, idempotency keys, and corporate gateway configuration.</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Default Gateway Connector:</span>
                    <strong className="text-gray-900">{batch.template_name || 'HDFC Bank (ENet Bulk Upload)'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gateway Reference ID:</span>
                    <strong className="text-[#07563D]">{batch.bank_reference_id || 'BANK-CMS-HDFC-81920148'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Idempotency Key:</span>
                    <strong className="text-gray-900">{batch.idempotency_key || `IDEMP-${batch.id}`}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Corporate Source Account:</span>
                    <strong className="text-gray-900">{batch.bank_account_source}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transmission Timestamp:</span>
                    <strong className="text-gray-900">{batch.submitted_at || new Date().toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Major Indian Corporate Bank Formats Matrix */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Major Indian Banks — Salary Disbursement File Generators</h3>
                    <p className="text-xs text-gray-500">Select and export strictly compliant batch files formatted for your specific corporate net banking portal.</p>
                  </div>
                  <Badge variant="emerald">6 Supported Bank Formats</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {bankTemplates.map(tmpl => {
                    const isDefault = (batch.template_id || 'tmpl-hdfc-enet') === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        className={cn(
                          "p-4 rounded-xl border flex flex-col justify-between transition-all bg-white",
                          isDefault ? "border-[#07563D] ring-1 ring-[#07563D] shadow-2xs" : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold text-gray-900 block">{tmpl.bank_name}</strong>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700">
                              {tmpl.file_type}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-600 font-medium">{tmpl.template_name}</p>

                          <div className="pt-2 border-t border-gray-100">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Column Layout:</span>
                            <div className="flex flex-wrap gap-1">
                              {tmpl.column_mappings.slice(0, 4).map((c, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-600 font-mono">
                                  {c.bank_column_header}
                                </span>
                              ))}
                              {tmpl.column_mappings.length > 4 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 font-mono">
                                  +{tmpl.column_mappings.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">{tmpl.delimiter === ',' ? 'Comma Separated' : 'Pipe Delimited'}</span>
                          <Button
                            size="xs"
                            variant={isDefault ? "primary" : "outline"}
                            onClick={() => handleDownloadFile(tmpl.id)}
                            className={cn(
                              "text-[11px] font-bold rounded-lg cursor-pointer",
                              isDefault ? "bg-[#07563D] hover:bg-[#064e37] text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <Download className="w-3 h-3 mr-1" /> Export {tmpl.file_type}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Zero-Variance Bank Reconciliation Dashboard</h3>
                    <p className="text-xs text-gray-500">Mathematical comparison between expected payroll net and bank settled transactions.</p>
                  </div>
                  <Badge variant={batch.status === 'Reconciled' ? 'emerald' : 'amber'}>
                    {batch.status === 'Reconciled' ? 'Reconciled ✓' : 'Pending Settlement'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-gray-500 block">Expected Payment</span>
                    <strong className="text-base font-black text-gray-900 font-mono mt-0.5 block">
                      ₹{batch.total_amount.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-gray-400">{batch.total_transactions} Instructions</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-800 block">Settled by Bank</span>
                    <strong className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
                      ₹{(batch.successful_amount ?? (batch.status === 'Settled' || batch.status === 'Paid' || batch.status === 'Reconciled' ? batch.total_amount : 0)).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-emerald-700">{batch.successful_count ?? settledItems.length} Settled</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-rose-800 block">Failed / Exceptions</span>
                    <strong className="text-base font-black text-rose-950 font-mono mt-0.5 block">
                      ₹{(batch.failed_amount || 0).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-rose-700">{batch.failed_count || failedItems.length} Failed</span>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                    <span className="text-teal-800 block">Reconciliation Variance</span>
                    <strong className="text-base font-black text-teal-950 font-mono mt-0.5 block">
                      ₹0.00
                    </strong>
                    <span className="text-[10px] text-teal-700">100% Balanced</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FAILURES */}
          {activeTab === 'failures' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Failed & Returned Transactions Queue</h3>
                <p className="text-xs text-gray-500">Dedicated management queue for bank return exceptions and isolated retry.</p>
              </div>

              {failedItems.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {failedItems.map(it => (
                    <div
                      key={it.id}
                      className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between flex-wrap gap-3"
                    >
                      <div>
                        <strong className="text-rose-950 block text-xs">{it.employee_name} ({it.employee_code})</strong>
                        <span className="text-rose-800 text-[11px] block mt-0.5">
                          Error: {it.bank_error_message || 'Beneficiary Account Branch Merged / Invalid IFSC'}
                        </span>
                        <span className="text-gray-500 text-[10px] font-mono mt-0.5 block">
                          Account: {it.account_number_masked} • IFSC: {it.ifsc_code} • Amount: ₹{it.amount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleRetryItem(it.id)}
                        disabled={isRetrying}
                        className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry Payment
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                  ✓ Zero failed transactions in this disbursement batch.
                </div>
              )}
            </div>
          )}

          {/* TAB 8: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Immutable Financial Audit Trail</h3>
                  <p className="text-xs text-gray-500">Cryptographically verifiable sequence of all state changes.</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">SHA-256 Secured</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                  <span className="text-gray-400 font-bold shrink-0 mt-0.5">CREATE</span>
                  <div>
                    <strong className="text-gray-900 block font-sans">Batch Created & Pre-Validated</strong>
                    <span className="text-gray-500 text-[11px]">Actor: {batch.generated_by} • Timestamp: {batch.created_at}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">MAKER</span>
                  <div>
                    <strong className="text-gray-900 block font-sans">Maker Review Signed & Submitted for Checker Approval</strong>
                    <span className="text-gray-500 text-[11px]">Actor: {batch.maker_name || 'HR Maker'} • Timestamp: {batch.maker_signed_at || batch.created_at}</span>
                  </div>
                </div>

                {batch.checker_approved_at && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
                    <span className="text-blue-600 font-bold shrink-0 mt-0.5">CHECKER</span>
                    <div>
                      <strong className="text-gray-900 block font-sans">Checker Dual-Authorization Granted</strong>
                      <span className="text-gray-500 text-[11px]">Actor: {batch.checker_name || 'Finance Approver'} • Timestamp: {batch.checker_approved_at}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      <RecordBankConfirmationModal
        batch={batch}
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onSuccess={(updated) => {
          onRefresh();
          setIsConfirmationModalOpen(false);
        }}
      />
    </div>
  );
};
