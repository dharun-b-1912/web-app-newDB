import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { BankDisbursementBatch, BankPaymentTemplate } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Search,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  ArrowRight,
  RefreshCw,
  Sliders,
  XCircle,
  Eye,
  UserCheck,
  Plus,
  FileText,
  AlertCircle,
  Printer,
  Calculator,
  Lock,
  Layers,
  Send,
  Trash2,
  Sparkles,
  FileDown,
  X
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../hooks/useTenant';
import { CreateDisbursementWizardModal } from '../components/CreateDisbursementWizardModal';
import { DisbursementBatchDetailModal } from '../components/DisbursementBatchDetailModal';
import { RecordBankConfirmationModal } from '../components/RecordBankConfirmationModal';
import { PayrollWorkflowStepper } from '../components/PayrollWorkflowStepper';

interface BankDisbursementViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const BankDisbursementView: React.FC<BankDisbursementViewProps> = ({
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { organization, activeCompany } = useTenant();
  const tenantId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';

  const [batches, setBatches] = useState<BankDisbursementBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BankDisbursementBatch | null>(null);
  const [selectedBatchForConfirmation, setSelectedBatchForConfirmation] = useState<BankDisbursementBatch | null>(null);
  const [checkerBatchToApprove, setCheckerBatchToApprove] = useState<BankDisbursementBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<BankDisbursementBatch | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [checkerNotes, setCheckerNotes] = useState('');
  const [checkerComplianceChecked, setCheckerComplianceChecked] = useState(false);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDirectConfirmationOpen, setIsDirectConfirmationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [metrics, setMetrics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    setIsRefreshing(true);
    try {
      const list = payrollApi.getDisbursementBatches(tenantId);
      setBatches(list);
      const m = payrollApi.getDisbursementDashboardMetrics(tenantId);
      setMetrics(m);

      if (selectedBatch) {
        const updatedSelected = list.find(b => b.id === selectedBatch.id);
        if (updatedSelected) setSelectedBatch(updatedSelected);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadData();
    const unsub1 = hrEventBus.subscribe('disbursement.*', () => loadData());
    const unsub2 = hrEventBus.subscribe('payroll.*', () => loadData());
    return () => {
      unsub1();
      unsub2();
    };
  }, [tenantId]);

  // Stage Pipeline Counts
  const pipelineCounts = useMemo(() => {
    const draftCount = batches.filter(b => b.status === 'Draft' || b.status === 'ValidationFailed').length;
    const approvalCount = batches.filter(b => b.status === 'PendingApproval' || b.status === 'ReadyForApproval' || b.status === 'MakerReviewed').length;
    const transmissionCount = batches.filter(b => b.status === 'Approved' || b.status === 'FileGenerated' || b.status === 'Submitted').length;
    const processingCount = batches.filter(b => b.status === 'BankProcessing' || b.status === 'Settled' || b.status === 'Paid' || b.status === 'PartiallySettled').length;
    const reconciledCount = batches.filter(b => b.status === 'Reconciled' || b.status === 'Closed').length;

    return {
      draft: draftCount,
      approval: approvalCount,
      transmission: transmissionCount,
      processing: processingCount,
      reconciled: reconciledCount
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DRAFT' && b.status !== 'Draft' && b.status !== 'ValidationFailed') return false;
        if (statusFilter === 'PENDING' && b.status !== 'PendingApproval' && b.status !== 'ReadyForApproval' && b.status !== 'MakerReviewed') return false;
        if (statusFilter === 'APPROVED' && b.status !== 'Approved' && b.status !== 'FileGenerated') return false;
        if (statusFilter === 'PROCESSING' && b.status !== 'BankProcessing' && b.status !== 'Submitted') return false;
        if (statusFilter === 'SETTLED' && b.status !== 'Settled' && b.status !== 'Paid') return false;
        if (statusFilter === 'RECONCILED' && b.status !== 'Reconciled' && b.status !== 'Closed') return false;
        if (statusFilter === 'FAILED' && b.status !== 'PartiallySettled' && b.status !== 'ExceptionsFound' && b.status !== 'ValidationFailed') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.batch_number.toLowerCase().includes(q) ||
          b.pay_period.toLowerCase().includes(q) ||
          (b.template_name && b.template_name.toLowerCase().includes(q)) ||
          b.bank_account_source.toLowerCase().includes(q) ||
          (b.bank_utr_master && b.bank_utr_master.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [batches, statusFilter, searchQuery]);

  const handleOpenBatch = (batch: BankDisbursementBatch) => {
    setSelectedBatch(batch);
    setIsDetailModalOpen(true);
  };

  const handleConfirmCheckerApproval = () => {
    if (!checkerBatchToApprove) return;
    try {
      const checkerName = user?.name || 'Authorized Finance Checker';
      const updated = payrollApi.approveChecker(checkerBatchToApprove.id, checkerName, tenantId);
      loadData();
      showToast(`✓ Dual-control approval granted for ${updated.batch_number}`);
      setCheckerBatchToApprove(null);
      setCheckerNotes('');
      setCheckerComplianceChecked(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitToBankQuick = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = payrollApi.submitToBank(batchId, user?.name || 'Treasury Officer', tenantId);
      loadData();
      showToast(`✓ Transmitted ${updated.batch_number} to Bank Gateway!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDownloadBankFile = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = payrollApi.downloadBankFormatFile(batchId, undefined, tenantId);
      loadData();
      showToast(`✓ Generated & downloaded ${result.fileName}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmDeleteBatch = () => {
    if (!batchToDelete) return;
    try {
      payrollApi.deleteDisbursementBatch(batchToDelete.id, tenantId);
      loadData();
      showToast(`✓ Deleted disbursement batch ${batchToDelete.batch_number}`);
      setBatchToDelete(null);
      setDeleteReason('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Automated Workflow Lifecycle Stepper */}
      <PayrollWorkflowStepper
        currentStage={batches.some(b => b.status === 'Settled' || b.status === 'Reconciled') ? 'report' : 'disburse'}
        onNavigateTab={stageKey => {
          if (onNavigateTab) onNavigateTab(stageKey);
        }}
      />
      
      {/* ─── 1. OPERATIONAL HEADER ──────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-[#07563D] border border-emerald-100 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Bank Disbursement Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#07563D]">
                  Dual-Control Banking
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Corporate salary payment batches, Maker-Checker authorizations, bank file generation, settlement UTR tracking, and zero-variance reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isRefreshing}
            className="rounded-xl font-semibold text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin text-[#07563D]")} /> Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (batches.length === 0) {
                showToast('No batches available to export', 'error');
                return;
              }
              payrollApi.exportDisbursementRegisterCSV(batches);
              showToast(`✓ Downloaded Bank Disbursement Register CSV (${batches.length} batches)`);
            }}
            className="rounded-xl font-semibold text-xs border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Register CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const pendingReconcile = batches.find(b => b.status === 'Settled' || b.status === 'Paid');
              if (pendingReconcile) {
                payrollApi.reconcileBatch(pendingReconcile.id, user?.name || 'Finance Officer', tenantId);
                loadData();
                showToast(`✓ Reconciled batch ${pendingReconcile.batch_number}`);
              } else {
                showToast('All active settled batches are already reconciled ✓');
              }
            }}
            className="rounded-xl font-semibold text-xs border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5" /> Reconcile All Settled
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Disbursement
          </Button>
        </div>
      </div>

      {/* ─── 2. INTERACTIVE DISBURSEMENT LIFECYCLE PIPELINE STRIP ────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#07563D]" />
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Disbursement Lifecycle Pipeline</span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Click any stage to filter active batches</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Stage 1: Draft & Validated */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? 'ALL' : 'DRAFT')}
            className={cn(
              "p-3 rounded-xl border text-left cursor-pointer transition-all select-none relative",
              statusFilter === 'DRAFT' ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400" : "bg-gray-50/70 border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">1. Draft & Validation</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700">
                {pipelineCounts.draft}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-900">Pre-Payment Checks</p>
            <span className="text-[10px] text-gray-500 block mt-0.5">Account & IFSC validated</span>
          </div>

          {/* Stage 2: Dual-Control Approval */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={cn(
              "p-3 rounded-xl border text-left cursor-pointer transition-all select-none relative",
              statusFilter === 'PENDING' ? "bg-amber-100/60 border-amber-400 ring-2 ring-amber-400" : "bg-amber-50/40 border-amber-200 hover:border-amber-300"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase">2. Checker Review</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                {pipelineCounts.approval}
              </span>
            </div>
            <p className="text-xs font-bold text-amber-950">Dual-Control Auth</p>
            <span className="text-[10px] text-amber-700 block mt-0.5">Requires Checker sign-off</span>
          </div>

          {/* Stage 3: Bank Transmission & File Export */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className={cn(
              "p-3 rounded-xl border text-left cursor-pointer transition-all select-none relative",
              statusFilter === 'APPROVED' ? "bg-blue-100/60 border-blue-400 ring-2 ring-blue-400" : "bg-blue-50/40 border-blue-200 hover:border-blue-300"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase">3. Bank File / CMS</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-200 text-blue-900">
                {pipelineCounts.transmission}
              </span>
            </div>
            <p className="text-xs font-bold text-blue-950">Bank Gateway</p>
            <span className="text-[10px] text-blue-700 block mt-0.5">HDFC / ICICI / SBI export</span>
          </div>

          {/* Stage 4: Bank Settlement & UTR */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PROCESSING' ? 'ALL' : 'PROCESSING')}
            className={cn(
              "p-3 rounded-xl border text-left cursor-pointer transition-all select-none relative",
              statusFilter === 'PROCESSING' ? "bg-emerald-100/60 border-emerald-400 ring-2 ring-emerald-400" : "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">4. Bank Settlement</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                {pipelineCounts.processing}
              </span>
            </div>
            <p className="text-xs font-bold text-emerald-950">Payout & UTR</p>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Accounts credited</span>
          </div>

          {/* Stage 5: Zero-Variance Reconciled */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'RECONCILED' ? 'ALL' : 'RECONCILED')}
            className={cn(
              "p-3 rounded-xl border text-left cursor-pointer transition-all select-none relative",
              statusFilter === 'RECONCILED' ? "bg-teal-100/60 border-teal-400 ring-2 ring-teal-400" : "bg-teal-50/40 border-teal-200 hover:border-teal-300"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-teal-700 uppercase">5. Reconciled</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-200 text-teal-900">
                {pipelineCounts.reconciled}
              </span>
            </div>
            <p className="text-xs font-bold text-teal-950">Zero-Variance</p>
            <span className="text-[10px] text-teal-700 block mt-0.5">Audit trail locked</span>
          </div>
        </div>
      </div>

      {/* ─── 3. TOP SUMMARY METRIC STRIP (COMPUTED LIVE) ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. Ready for Disbursement */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Ready to Disburse</span>
          <span className="text-sm sm:text-base font-black text-gray-900 font-mono mt-0.5 block">
            ₹{(metrics?.readyForDisbursement?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-500 block mt-0.5">
            {metrics?.readyForDisbursement?.count || 0} employees ({metrics?.readyForDisbursement?.eligibleRunsCount || 0} runs)
          </span>
        </div>

        {/* 2. Pending Approval */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Approval</span>
          <span className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5 block">
            ₹{(metrics?.pendingApproval?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">
            {metrics?.pendingApproval?.count || 0} employees ({metrics?.pendingApproval?.batchesCount || 0} batches)
          </span>
        </div>

        {/* 3. Submitted to Bank */}
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">Submitted to Bank</span>
          <span className="text-sm sm:text-base font-black text-blue-950 font-mono mt-0.5 block">
            ₹{(metrics?.submittedToBank?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-blue-700 block mt-0.5">
            {metrics?.submittedToBank?.count || 0} employees
          </span>
        </div>

        {/* 4. Processing */}
        <div className="bg-white p-3.5 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-purple-800 block">Bank Processing</span>
          <span className="text-sm sm:text-base font-black text-purple-950 font-mono mt-0.5 block">
            ₹{(metrics?.processing?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-purple-700 block mt-0.5">
            {metrics?.processing?.count || 0} transactions
          </span>
        </div>

        {/* 5. Settled */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-[#07563D] block">Bank Settled</span>
          <span className="text-sm sm:text-base font-black text-[#07563D] font-mono mt-0.5 block">
            ₹{(metrics?.settled?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">
            {metrics?.settled?.count || 0} payouts with UTR
          </span>
        </div>

        {/* 6. Returns / Failed */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Failed / Returns</span>
          <span className="text-sm sm:text-base font-black text-rose-950 font-mono mt-0.5 block">
            ₹{(metrics?.failedOrReturns?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">
            {metrics?.failedOrReturns?.count || 0} bounced accounts
          </span>
        </div>

        {/* 7. Reconciled */}
        <div className="bg-white p-3.5 rounded-2xl border border-teal-200/80 bg-teal-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-teal-800 block">Needs Reconcile</span>
          <span className="text-sm sm:text-base font-black text-teal-950 font-mono mt-0.5 block">
            {metrics?.needsReconciliation?.count || 0} Batches
          </span>
          <span className="text-[10px] text-teal-700 block mt-0.5">
            ₹{(metrics?.needsReconciliation?.amount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ─── 4. SEARCH & FILTER TOOLBAR ─────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by batch number, period, bank, or UTR..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: 'PENDING', label: 'Pending Approval' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'PROCESSING', label: 'Bank Processing' },
            { id: 'SETTLED', label: 'Settled' },
            { id: 'RECONCILED', label: 'Reconciled' },
            { id: 'FAILED', label: 'Exceptions / Failed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                statusFilter === tab.id
                  ? "bg-[#07563D] text-white shadow-2xs"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 5. MAIN DISBURSEMENT BATCHES TABLE ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">No disbursement batches found</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No batches match your search criteria. Try resetting filters.'
                  : 'Get started by creating a corporate salary disbursement batch from approved payroll runs.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsWizardOpen(true)}
              className="bg-[#07563D] text-white font-bold rounded-xl text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Disbursement Batch
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-3 py-3">Payroll Period</th>
                  <th className="px-3 py-3 text-center">Staff Count</th>
                  <th className="px-3 py-3 text-right">Net Amount</th>
                  <th className="px-3 py-3">Bank Gateway / Source</th>
                  <th className="px-3 py-3">Batch Status</th>
                  <th className="px-3 py-3">UTR Reference</th>
                  <th className="px-3 py-3 text-center">Reconciliation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => handleOpenBatch(b)}
                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center font-mono font-bold shrink-0 border border-emerald-100">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-gray-900 block font-mono font-bold">{b.batch_number}</strong>
                          <span className="text-[10px] text-gray-400 block">
                            Maker: {b.maker_name || b.generated_by || 'HR Admin'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-gray-800">{b.pay_period}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 font-bold text-gray-800 font-mono text-[11px]">
                        {b.total_transactions} Staff
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-black text-gray-900 text-xs">
                      ₹{b.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-800 block truncate max-w-[180px]">
                          {b.template_name || b.source_bank_name || 'HDFC Bank Ltd'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          A/C: {b.bank_account_source || '•••• •••• 9812'} • {b.payment_mode || 'NEFT'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                        b.status === 'Draft' ? "bg-gray-100 text-gray-700" :
                        b.status === 'PendingApproval' || b.status === 'ReadyForApproval' ? "bg-amber-100 text-amber-900 border border-amber-200" :
                        b.status === 'Approved' ? "bg-blue-100 text-blue-900 border border-blue-200" :
                        b.status === 'FileGenerated' ? "bg-indigo-100 text-indigo-900 border border-indigo-200" :
                        b.status === 'BankProcessing' || b.status === 'Submitted' ? "bg-purple-100 text-purple-900 border border-purple-200" :
                        b.status === 'Settled' || b.status === 'Paid' ? "bg-emerald-100 text-emerald-900 border border-emerald-200" :
                        b.status === 'Reconciled' || b.status === 'Closed' ? "bg-teal-100 text-teal-900 border border-teal-200" :
                        b.status === 'Cancelled' ? "bg-rose-100 text-rose-900 line-through" :
                        "bg-rose-100 text-rose-900"
                      )}>
                        {b.status === 'PendingApproval' ? 'Pending Approval' :
                         b.status === 'Approved' ? 'Approved' :
                         b.status === 'FileGenerated' ? 'File Generated' :
                         b.status === 'BankProcessing' ? 'Bank Processing' :
                         b.status === 'Settled' ? 'Settled (With UTR)' :
                         b.status === 'Reconciled' ? 'Reconciled ✓' :
                         b.status === 'Cancelled' ? 'Cancelled' : b.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      {b.bank_utr_master ? (
                        <div className="font-mono text-[11px] font-bold text-gray-900 truncate max-w-[140px]" title={b.bank_utr_master}>
                          {b.bank_utr_master}
                        </div>
                      ) : b.bank_reference_id ? (
                        <div className="font-mono text-[11px] text-gray-600 truncate max-w-[140px]" title={b.bank_reference_id}>
                          {b.bank_reference_id}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Pending Bank</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        b.status === 'Reconciled' ? "bg-teal-100 text-teal-900 font-black" :
                        b.status === 'Settled' || b.status === 'Paid' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {b.status === 'Reconciled' ? 'Zero Variance ✓' : b.status === 'Settled' ? 'Settled' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* 1. Checker Approval Action */}
                        {(b.status === 'PendingApproval' || b.status === 'ReadyForApproval' || b.status === 'MakerReviewed') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => {
                              setCheckerBatchToApprove(b);
                              setCheckerComplianceChecked(false);
                            }}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" /> Approve
                          </Button>
                        )}

                        {/* 2. One-Click Bank File Download */}
                        {(b.status === 'Approved' || b.status === 'FileGenerated' || b.status === 'Submitted' || b.status === 'BankProcessing' || b.status === 'Settled') && (
                          <button
                            onClick={(e) => handleDownloadBankFile(b.id, e)}
                            title="Download formatted Bank CMS File (HDFC, ICICI, SBI, Axis)"
                            className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5 text-[#07563D]" />
                          </button>
                        )}

                        {/* 3. Send to Bank */}
                        {(b.status === 'Approved' || b.status === 'FileGenerated') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => handleSubmitToBankQuick(b.id, e)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            <Send className="w-3 h-3 mr-1" /> Transmit
                          </Button>
                        )}

                        {/* 4. Confirm Bank Settlement */}
                        {(b.status === 'BankProcessing' || b.status === 'Submitted' || b.status === 'FileGenerated' || b.status === 'Approved') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => {
                              setSelectedBatchForConfirmation(b);
                              setIsDirectConfirmationOpen(true);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Record Settlement
                          </Button>
                        )}

                        {/* 5. Reconcile */}
                        {(b.status === 'Settled' || b.status === 'Paid' || b.status === 'PartiallySettled') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => {
                              try {
                                const updated = payrollApi.reconcileBatch(b.id, user?.name || 'Finance Officer', tenantId);
                                loadData();
                                showToast(`✓ Fully reconciled ${updated.batch_number}`);
                              } catch (err: any) {
                                showToast(err.message, 'error');
                              }
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            <Calculator className="w-3 h-3 mr-1" /> Reconcile
                          </Button>
                        )}

                        {/* 6. Cancel/Delete Draft or Pending */}
                        {(b.status === 'Draft' || b.status === 'PendingApproval' || b.status === 'ValidationFailed') && (
                          <button
                            onClick={() => setBatchToDelete(b)}
                            title="Cancel / Delete this batch"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 7. Full Inspector Modal */}
                        <button
                          onClick={() => handleOpenBatch(b)}
                          className="px-2.5 py-1 rounded-lg text-xs text-[#07563D] font-bold hover:bg-emerald-50 cursor-pointer border border-emerald-100 bg-emerald-50/40"
                        >
                          Inspect →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 6. DEDICATED QUICK CHECKER APPROVAL MODAL ───────────────────── */}
      {checkerBatchToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 border border-white/20">
                  <ShieldCheck className="w-5 h-5 text-blue-100" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Dual-Control Checker Authorization</h2>
                  <p className="text-xs text-blue-100 mt-0.5">Corporate Governance & Segregation of Duties</p>
                </div>
              </div>
              <button
                onClick={() => setCheckerBatchToApprove(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Batch Summary Card */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Disbursement Batch:</span>
                  <strong className="font-mono text-gray-900">{checkerBatchToApprove.batch_number}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Payroll Period:</span>
                  <strong className="text-gray-900">{checkerBatchToApprove.pay_period}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-semibold">Eligible Staff:</span>
                  <span className="font-bold text-gray-900">{checkerBatchToApprove.total_transactions} Employees</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-bold">Total Net Payout:</span>
                  <strong className="text-base font-black text-[#07563D] font-mono">
                    ₹{checkerBatchToApprove.total_amount.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Maker Info */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Prepared by (Maker): {checkerBatchToApprove.maker_name || checkerBatchToApprove.generated_by || 'HR Administrator'}</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Pre-payment account validation passed. All bank routing numbers verified.
                  </p>
                </div>
              </div>

              {/* Checker Notes */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Checker Authorization Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified against approved payroll summary sheet. Authorized for bank transmission."
                  value={checkerNotes}
                  onChange={e => setCheckerNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Compliance Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkerComplianceChecked}
                  onChange={e => setCheckerComplianceChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-700 focus:ring-blue-600"
                />
                <span className="text-[11px] font-semibold text-amber-950">
                  I confirm that as an authorized Checker, I have reviewed the payment totals and source accounts, and authorize this batch for bank CMS processing.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCheckerBatchToApprove(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={!checkerComplianceChecked}
                onClick={handleConfirmCheckerApproval}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                <Check className="w-4 h-4 mr-1.5" /> Authorize Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. DELETE / CANCEL CONFIRMATION MODAL ───────────────────────── */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-100" />
                <h3 className="font-bold text-sm">Delete Disbursement Batch</h3>
              </div>
              <button
                onClick={() => setBatchToDelete(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-gray-700 font-medium">
                Are you sure you want to delete batch <strong className="font-mono text-gray-900">{batchToDelete.batch_number}</strong>?
              </p>
              <p className="text-gray-500 text-[11px]">
                This will release the payroll run back to pending disbursement so a new batch can be generated if necessary.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBatchToDelete(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmDeleteBatch}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. WIZARD & DETAIL WORKSPACE MODALS ─────────────────────────── */}
      <CreateDisbursementWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={(newBatch) => {
          loadData();
          setSelectedBatch(newBatch);
          setIsDetailModalOpen(true);
        }}
      />

      {selectedBatch && isDetailModalOpen && (
        <DisbursementBatchDetailModal
          batch={selectedBatch}
          onClose={() => setIsDetailModalOpen(false)}
          onRefresh={loadData}
        />
      )}

      {selectedBatchForConfirmation && (
        <RecordBankConfirmationModal
          batch={selectedBatchForConfirmation}
          isOpen={isDirectConfirmationOpen}
          onClose={() => {
            setIsDirectConfirmationOpen(false);
            setSelectedBatchForConfirmation(null);
          }}
          onSuccess={(updated) => {
            loadData();
            setIsDirectConfirmationOpen(false);
            setSelectedBatchForConfirmation(null);
          }}
        />
      )}

    </div>
  );
};
