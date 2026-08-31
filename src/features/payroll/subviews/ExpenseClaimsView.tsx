// src/features/payroll/subviews/ExpenseClaimsView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Expense Claims & Reimbursement Desk
// Features: Receipt Proof Inspection, Multi-Level Approval, Reimbursement Dispatch,
// and Realtime Outbox Sync with the Employee Flutter App
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { getSecureDocumentUrl } from '../../../lib/storage/secureStorage';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  FileText,
  DollarSign,
  Send,
  Building,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { expenseClaimService, ExpenseClaim } from '../../../services/expenses/expenseClaimService';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

export const ExpenseClaimsView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REIMBURSED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [resolvedProofUrl, setResolvedProofUrl] = useState<string | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'REIMBURSE'>('APPROVE');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [actionReason, setActionReason] = useState<string>('');
  const [reimbursementRef, setReimbursementRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await expenseClaimService.fetchClaims();
      setClaims(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load expense claims', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', loadData);

    let channel: any;
    if (isSupabaseEnabled) {
      try {
        channel = supabase
          .channel('web-expense-claims-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'expense_claims' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                showToast('🔔 New expense reimbursement claim received from employee.', 'info');
              }
              loadData();
            }
          )
          .subscribe();
      } catch (_) {}
    }

    return () => {
      unsub();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleOpenProof = async (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    let url = claim.receipt_url || null;

    if (url && isSupabaseEnabled) {
      try {
        const cleanPath = url
          .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/employee-documents\//, '')
          .replace(/^storage:\/\/employee-documents\//, '')
          .replace(/^employee-documents\//, '');
        const secureUrl = await getSecureDocumentUrl('employee-documents', cleanPath, 600);
        if (secureUrl) {
          url = secureUrl;
        }
      } catch (_) {}
    }

    setResolvedProofUrl(url);
    setIsProofModalOpen(true);
  };

  const filteredClaims = claims.filter(c => {
    if (activeTab === 'PENDING' && c.status !== 'PENDING') return false;
    if (activeTab === 'APPROVED' && c.status !== 'APPROVED') return false;
    if (activeTab === 'REIMBURSED' && c.status !== 'REIMBURSED') return false;
    if (activeTab === 'REJECTED' && c.status !== 'REJECTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.claim_number.toLowerCase().includes(q) ||
        c.employee_name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAction = (claim: ExpenseClaim, type: 'APPROVE' | 'REJECT' | 'REIMBURSE') => {
    setSelectedClaim(claim);
    setActionType(type);
    setApprovedAmount(claim.amount);
    setActionReason(type === 'APPROVE' ? 'Receipt verified and approved for payroll reimbursement.' : '');
    setReimbursementRef(`TXN-BANK-${Date.now().toString().slice(-6)}`);
    setIsActionModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedClaim) return;
    setIsSubmitting(true);
    try {
      if (actionType === 'APPROVE') {
        await expenseClaimService.approveClaim(
          selectedClaim.id,
          approvedAmount,
          user?.id || 'usr-hr-01',
          user?.name || 'HR & Finance Lead',
          actionReason
        );
        showToast(`✓ Claim #${selectedClaim.claim_number} approved for ₹${approvedAmount.toFixed(2)}.`);
      } else if (actionType === 'REJECT') {
        await expenseClaimService.rejectClaim(
          selectedClaim.id,
          actionReason,
          user?.id || 'usr-hr-01',
          user?.name || 'HR & Finance Lead'
        );
        showToast(`Claim #${selectedClaim.claim_number} rejected.`, 'info');
      } else if (actionType === 'REIMBURSE') {
        await expenseClaimService.reimburseClaim(
          selectedClaim.id,
          reimbursementRef || `TXN-BANK-${Date.now().toString().slice(-6)}`
        );
        showToast(`✓ Reimbursement for Claim #${selectedClaim.claim_number} marked as disbursed.`);
      }
      setIsActionModalOpen(false);
      setSelectedClaim(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = claims.filter(c => c.status === 'PENDING').length;
  const approvedCount = claims.filter(c => c.status === 'APPROVED').length;
  const reimbursedCount = claims.filter(c => c.status === 'REIMBURSED').length;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-gray-900">Expense Claims & Reimbursement Desk</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
              Finance & HR Approvals
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review employee expense claims, inspect uploaded bill receipts/photos, and approve for payroll disbursement.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Claims'}</span>
        </button>
      </div>

      {/* 2. Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={cn(
            "p-4 rounded-xl border text-left cursor-pointer transition-all",
            activeTab === 'PENDING' ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20" : "bg-white border-gray-200"
          )}
        >
          <div className="text-xs text-gray-500 font-bold">Pending Review</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Awaiting HR/Manager sign-off</div>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={cn(
            "p-4 rounded-xl border text-left cursor-pointer transition-all",
            activeTab === 'APPROVED' ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20" : "bg-white border-gray-200"
          )}
        >
          <div className="text-xs text-gray-500 font-bold">Approved for Payout</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Ready for bank disbursement</div>
        </button>

        <button
          onClick={() => setActiveTab('REIMBURSED')}
          className={cn(
            "p-4 rounded-xl border text-left cursor-pointer transition-all",
            activeTab === 'REIMBURSED' ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200"
          )}
        >
          <div className="text-xs text-gray-500 font-bold">Reimbursed</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{reimbursedCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Dispatched to bank account</div>
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "p-4 rounded-xl border text-left cursor-pointer transition-all",
            activeTab === 'ALL' ? "bg-gray-100 border-gray-300 ring-2 ring-gray-500/20" : "bg-white border-gray-200"
          )}
        >
          <div className="text-xs text-gray-500 font-bold">Total Claims</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{claims.length}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">All time submitted requests</div>
        </button>
      </div>

      {/* 3. Claims Table */}
      <Card className="p-0 border border-gray-200 overflow-hidden bg-white shadow-xs">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by claim #, employee, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#07563D] focus:border-[#07563D] transition-all"
            />
          </div>
          <div className="text-xs font-bold text-gray-500">
            Showing {filteredClaims.length} of {claims.length} claims
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <th className="p-3">Claim Ref #</th>
                <th className="p-3">Employee</th>
                <th className="p-3">Category</th>
                <th className="p-3">Expense Date</th>
                <th className="p-3 text-right">Claim Amount</th>
                <th className="p-3 text-right">Approved Amount</th>
                <th className="p-3 text-center">Receipt Proof</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold">No expense claims found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {searchQuery ? 'Try matching a different keyword' : 'New claims from mobile app will appear here in real time'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#07563D] whitespace-nowrap">
                      {claim.claim_number}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{claim.employee_name}</div>
                      <div className="text-[11px] text-gray-400">{claim.employee_code || 'JCS-EMP'} • {claim.department || 'General'}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 font-bold text-[11px] bg-slate-100 text-slate-700 rounded-md">
                        {claim.category}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">
                      {claim.expense_date}
                    </td>
                    <td className="p-3 text-right font-black text-gray-900 whitespace-nowrap">
                      ₹{claim.amount.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                      {claim.approved_amount ? `₹${claim.approved_amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {claim.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => handleOpenProof(claim)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#07563D] bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">No Receipt</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {claim.status === 'APPROVED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full inline-block">
                          Approved
                        </span>
                      ) : claim.status === 'REIMBURSED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-full inline-block">
                          Reimbursed
                        </span>
                      ) : claim.status === 'REJECTED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-full inline-block">
                          Rejected
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full inline-block animate-pulse">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {claim.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAction(claim, 'APPROVE')}
                            className="px-3 py-1 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-lg cursor-pointer shadow-2xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(claim, 'REJECT')}
                            className="px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : claim.status === 'APPROVED' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAction(claim, 'REIMBURSE')}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Disburse</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Bill / Receipt Proof Modal */}
      {isProofModalOpen && selectedClaim && (
        <Modal
          isOpen={isProofModalOpen}
          onClose={() => setIsProofModalOpen(false)}
          title={`Bill / Receipt Proof: ${selectedClaim.claim_number}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">{selectedClaim.employee_name} • {selectedClaim.category}</div>
                <div className="text-gray-500">Amount: ₹{selectedClaim.amount.toFixed(2)} • Expense Date: {selectedClaim.expense_date}</div>
              </div>
              <Badge variant="blue">{selectedClaim.receipt_filename || 'Receipt Attachment'}</Badge>
            </div>

            <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center min-h-[320px]">
              {resolvedProofUrl && resolvedProofUrl.startsWith('http') ? (
                (selectedClaim.receipt_filename?.toLowerCase().endsWith('.pdf') ||
                 resolvedProofUrl.toLowerCase().split('?')[0].endsWith('.pdf')) ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-300 bg-white shadow-inner flex flex-col items-center justify-center">
                      <iframe
                        src={`${resolvedProofUrl}#toolbar=0&navpanes=0`}
                        title="PDF Receipt Proof"
                        className="w-full h-full border-none rounded-xl"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={resolvedProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Full PDF in New Tab</span>
                      </a>
                      <a
                        href={resolvedProofUrl}
                        download={selectedClaim.receipt_filename || 'Receipt_Proof.pdf'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#07563D]" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-3">
                    <img
                      src={resolvedProofUrl}
                      alt="Claim Receipt Proof"
                      className="max-h-96 w-auto max-w-full object-contain rounded-xl shadow-md bg-white border border-gray-200"
                    />
                    <a
                      href={resolvedProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#07563D]" />
                      <span>Open High-Resolution Image</span>
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center p-6 text-gray-600">
                  <FileText className="w-12 h-12 text-[#07563D] mx-auto mb-2 opacity-70" />
                  <p className="font-bold text-gray-900">{selectedClaim.receipt_filename || 'Receipt Document'}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Uploaded securely to the employee-documents storage bucket.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsProofModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Approve / Reject / Reimburse Action Modal */}
      {isActionModalOpen && selectedClaim && (
        <Modal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          title={`${actionType === 'APPROVE' ? 'Approve' : actionType === 'REIMBURSE' ? 'Disburse Reimbursement' : 'Reject'} Expense Claim: ${selectedClaim.claim_number}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="font-bold text-gray-900">{selectedClaim.employee_name} ({selectedClaim.category})</div>
              <div className="text-gray-500">Claimed Amount: ₹{selectedClaim.amount.toFixed(2)}</div>
            </div>

            {actionType === 'APPROVE' && (
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Approved Reimbursement Amount (₹):</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-900 text-sm"
                />
              </div>
            )}

            {actionType === 'REIMBURSE' && (
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Bank Disbursement Reference / UTR Number:</label>
                <input
                  type="text"
                  value={reimbursementRef}
                  onChange={e => setReimbursementRef(e.target.value)}
                  placeholder="e.g. UTR-HDFC-984210"
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 text-xs font-bold"
                />
              </div>
            )}

            {actionType !== 'REIMBURSE' && (
              <div className="space-y-1">
                <label className="font-bold text-gray-700">
                  {actionType === 'APPROVE' ? 'Approval Comment / Payroll Notes:' : 'Rejection Reason (Visible to Employee):'}
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="Enter justification or instructions for payroll..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#07563D]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmitting || (actionType === 'REJECT' && !actionReason.trim())}
                className={cn(
                  "px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer disabled:opacity-50",
                  actionType === 'APPROVE'
                    ? "bg-[#07563D] hover:bg-[#064e37]"
                    : actionType === 'REIMBURSE'
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {isSubmitting
                  ? 'Processing...'
                  : actionType === 'APPROVE'
                  ? 'Confirm Approval'
                  : actionType === 'REIMBURSE'
                  ? 'Confirm Disbursement'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
