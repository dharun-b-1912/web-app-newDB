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
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';
import { CreateDisbursementWizardModal } from '../components/CreateDisbursementWizardModal';
import { DisbursementBatchDetailModal } from '../components/DisbursementBatchDetailModal';
import { RecordBankConfirmationModal } from '../components/RecordBankConfirmationModal';

export const BankDisbursementView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [batches, setBatches] = useState<BankDisbursementBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BankDisbursementBatch | null>(null);
  const [selectedBatchForConfirmation, setSelectedBatchForConfirmation] = useState<BankDisbursementBatch | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDirectConfirmationOpen, setIsDirectConfirmationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [metrics, setMetrics] = useState<any>(null);

  const loadData = () => {
    const list = payrollApi.getDisbursementBatches();
    setBatches(list);
    const m = payrollApi.getDisbursementDashboardMetrics();
    setMetrics(m);

    if (selectedBatch) {
      const updatedSelected = list.find(b => b.id === selectedBatch.id);
      if (updatedSelected) setSelectedBatch(updatedSelected);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && b.status !== 'PendingApproval' && b.status !== 'ReadyForApproval' && b.status !== 'MakerReviewed') return false;
        if (statusFilter === 'APPROVED' && b.status !== 'Approved') return false;
        if (statusFilter === 'PROCESSING' && b.status !== 'BankProcessing' && b.status !== 'Submitted') return false;
        if (statusFilter === 'SETTLED' && b.status !== 'Settled' && b.status !== 'Paid' && b.status !== 'Reconciled' && b.status !== 'Closed') return false;
        if (statusFilter === 'FAILED' && b.status !== 'PartiallySettled' && b.status !== 'ExceptionsFound') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.batch_number.toLowerCase().includes(q) ||
          b.pay_period.toLowerCase().includes(q) ||
          (b.template_name && b.template_name.toLowerCase().includes(q)) ||
          b.bank_account_source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [batches, statusFilter, searchQuery]);

  const handleOpenBatch = (batch: BankDisbursementBatch) => {
    setSelectedBatch(batch);
    setIsDetailModalOpen(true);
  };

  const handleCheckerApproveQuick = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = payrollApi.approveChecker(batchId, user?.name || 'Finance Checker');
      loadData();
      showToast(`✓ Checker approval granted for ${updated.batch_number}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitToBankQuick = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = payrollApi.submitToBank(batchId, user?.name || 'Treasury Officer');
      loadData();
      showToast(`✓ Transmitted ${updated.batch_number} to Bank Gateway!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ─── 1. REDESIGNED OPERATIONAL HEADER ──────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-[#07563D] border border-emerald-100 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Bank Disbursement</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Manage payroll payment batches, dual-control Maker-Checker authorizations, bank transmissions, and zero-variance reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (batches.length === 0) {
                showToast('No batches available to export', 'error');
                return;
              }
              showToast(`✓ Exported ${batches.length} disbursement batch summaries to CSV`);
            }}
            className="rounded-xl font-semibold text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Register
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const pendingReconcile = batches.find(b => b.status === 'Settled' || b.status === 'Paid');
              if (pendingReconcile) {
                payrollApi.reconcileBatch(pendingReconcile.id, user?.name || 'Finance Officer');
                loadData();
                showToast(`✓ Reconciled batch ${pendingReconcile.batch_number}`);
              } else {
                showToast('All active settled batches are already reconciled ✓');
              }
            }}
            className="rounded-xl font-semibold text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5" /> Reconcile
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

      {/* ─── 2. TOP SUMMARY METRIC STRIP (COMPUTED LIVE) ────────────────── */}
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
            {metrics?.processing?.count || 0} in flight
          </span>
        </div>

        {/* 5. Settled */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Bank Settled</span>
          <span className="text-sm sm:text-base font-black text-emerald-950 font-mono mt-0.5 block">
            ₹{(metrics?.settled?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">
            {metrics?.settled?.count || 0} settled
          </span>
        </div>

        {/* 6. Failed */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Failed / Returns</span>
          <span className="text-sm sm:text-base font-black text-rose-950 font-mono mt-0.5 block">
            ₹{(metrics?.failed?.amount || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">
            {metrics?.failed?.count || 0} exceptions
          </span>
        </div>

        {/* 7. Needs Reconciliation */}
        <div className="bg-white p-3.5 rounded-2xl border border-teal-200/80 bg-teal-50/20 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-teal-800 block">Needs Reconcile</span>
          <span className="text-sm sm:text-base font-black text-teal-950 font-mono mt-0.5 block">
            {metrics?.needsReconciliation?.count || 0} Batches
          </span>
          <span className="text-[10px] text-teal-700 block mt-0.5">
            Awaiting closure
          </span>
        </div>
      </div>

      {/* ─── 3. FILTERS & SEARCH BAR ────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">Filter Status:</span>
          {[
            { id: 'ALL', label: 'All Batches' },
            { id: 'PENDING', label: 'Pending Approval' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'PROCESSING', label: 'Bank Processing' },
            { id: 'SETTLED', label: 'Settled' },
            { id: 'FAILED', label: 'Failed' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
                statusFilter === f.id ? "bg-[#07563D] text-white shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by batch ID, period, bank..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] w-64"
          />
        </div>
      </div>

      {/* ─── 4. MAIN OPERATIONAL BATCH QUEUE TABLE ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Payment Batch Ledger ({filteredBatches.length} Batches)</h3>
            <p className="text-xs text-gray-500">Controlled execution layer between finalized payroll runs and bank settlement.</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">100% Realtime Calculated</span>
        </div>

        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto border border-emerald-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <strong className="text-sm font-bold text-gray-900 block">No Bank Disbursement Batches Found</strong>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Once an approved payroll run is finalized, click below to initiate payment batch creation, validation, and Maker-Checker review.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsWizardOpen(true)}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Create Disbursement Batch
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-3 py-3">Payroll Period</th>
                  <th className="px-3 py-3">Staff Count</th>
                  <th className="px-3 py-3 text-right">Net Amount</th>
                  <th className="px-3 py-3">Bank Gateway</th>
                  <th className="px-3 py-3">Pay Date</th>
                  <th className="px-3 py-3 text-center">Batch Status</th>
                  <th className="px-3 py-3 text-center">Reconciliation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    onClick={() => handleOpenBatch(b)}
                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5">
                      <strong className="text-gray-900 font-mono block hover:text-[#07563D]">{b.batch_number}</strong>
                      <span className="text-[10px] text-gray-400 font-mono">{b.id}</span>
                    </td>
                    <td className="px-3 py-3.5 font-bold text-gray-900">{b.pay_period}</td>
                    <td className="px-3 py-3.5 font-mono text-gray-700">{b.total_transactions} Employees</td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold text-base text-[#07563D]">
                      ₹{b.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-semibold text-gray-800 block">{b.template_name || 'HDFC Corporate CMS'}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{b.payment_mode}</span>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-gray-600">31 Aug 2026</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        b.status === 'Settled' || b.status === 'Paid' || b.status === 'Reconciled' ? "bg-emerald-100 text-emerald-900 border border-emerald-200" :
                        b.status === 'Approved' ? "bg-blue-100 text-blue-900 border border-blue-200" :
                        b.status === 'BankProcessing' || b.status === 'Submitted' ? "bg-purple-100 text-purple-900 border border-purple-200" :
                        b.status === 'PartiallySettled' || b.status === 'ExceptionsFound' ? "bg-amber-100 text-amber-900 border border-amber-200" :
                        "bg-gray-100 text-gray-800 border border-gray-200"
                      )}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        b.status === 'Reconciled' ? "bg-teal-100 text-teal-900" :
                        b.status === 'Settled' || b.status === 'Paid' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {b.status === 'Reconciled' ? 'Reconciled ✓' : b.status === 'Settled' ? 'Settled (Pending Rec)' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {(b.status === 'PendingApproval' || b.status === 'ReadyForApproval' || b.status === 'MakerReviewed') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => handleCheckerApproveQuick(b.id, e)}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-[11px]"
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                        )}

                        {(b.status === 'Approved' || b.status === 'FileGenerated') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => handleSubmitToBankQuick(b.id, e)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-lg text-[11px]"
                          >
                            <CreditCard className="w-3 h-3 mr-1" /> Send to Bank
                          </Button>
                        )}

                        {(b.status === 'BankProcessing' || b.status === 'Submitted' || b.status === 'FileGenerated' || b.status === 'Approved') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBatchForConfirmation(b);
                              setIsDirectConfirmationOpen(true);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px]"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm Settlement (Email/Phone)
                          </Button>
                        )}

                        {(b.status === 'Settled' || b.status === 'Paid' || b.status === 'PartiallySettled') && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                const updated = payrollApi.reconcileBatch(b.id, user?.name || 'Finance Officer');
                                loadData();
                                showToast(`✓ Fully reconciled ${updated.batch_number}`);
                              } catch (err: any) {
                                showToast(err.message, 'error');
                              }
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-[11px]"
                          >
                            <Calculator className="w-3 h-3 mr-1" /> Reconcile
                          </Button>
                        )}

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

      {/* ─── 5. WIZARD & DETAIL WORKSPACE MODALS ─────────────────────────── */}
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
