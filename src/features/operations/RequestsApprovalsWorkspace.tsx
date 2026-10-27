// src/features/operations/RequestsApprovalsWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Requests & Approvals Workspace
// Authoritative Backend Synchronization: Real Supabase Approvals
// Separates: [ Actionable Inbox ] from [ Governance Policies ]
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  CreditCard,
  Building2,
  Sparkles,
  RotateCcw,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { approvalService } from '../../services/notification/approvalService';
import { ApprovalRequestItem } from '../../types/notification';
import { ApprovalConfigView } from '../admin/subviews/ApprovalConfigView';
import { cn } from '../../lib/utils';

export type ApprovalsTab = 'inbox' | 'policies';

export const RequestsApprovalsWorkspace: React.FC<{ initialTab?: ApprovalsTab }> = ({
  initialTab = 'inbox',
}) => {
  const { showToast } = useToast();
  const { organization, activeCompany } = useTenant();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ApprovalsTab>(initialTab);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'urgent' | 'leave' | 'attendance' | 'expenses'>('all');
  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeOrgId = organization?.id || activeCompany?.organization_id;
      const data = await approvalService.getApprovalRequests({
        status: 'Pending',
        organizationId: activeOrgId,
      });
      setRequests(data || []);
    } catch (err: any) {
      console.warn('[RequestsApprovalsWorkspace] Error loading requests from database:', err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, activeCompany?.organization_id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Listen for tenant switch or approval events to keep synced
  useEffect(() => {
    const handleSync = () => loadRequests();
    window.addEventListener('approval:processed', handleSync);
    window.addEventListener('tenant:switched', handleSync);
    window.addEventListener('leave:updated', handleSync);
    window.addEventListener('attendance:regularized', handleSync);

    return () => {
      window.removeEventListener('approval:processed', handleSync);
      window.removeEventListener('tenant:switched', handleSync);
      window.removeEventListener('leave:updated', handleSync);
      window.removeEventListener('attendance:regularized', handleSync);
    };
  }, [loadRequests]);

  const handleApprove = async (id: string, name: string) => {
    setActionInProgressId(id);
    try {
      await approvalService.executeApproval({
        approvalId: id,
        decision: 'Approved',
        decidedByName: user?.name || user?.email || 'Company Administrator',
        comment: 'Approved by Company Administrator via Approval Hub',
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast(`✓ Request for ${name} approved successfully`, 'success');
      window.dispatchEvent(new CustomEvent('approval:processed', { detail: { id, decision: 'Approved' } }));
    } catch (err: any) {
      showToast(`Failed to approve request: ${err?.message || 'Database error'}`, 'error');
      await loadRequests();
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActionInProgressId(id);
    try {
      await approvalService.executeApproval({
        approvalId: id,
        decision: 'Rejected',
        decidedByName: user?.name || user?.email || 'Company Administrator',
        comment: 'Rejected by Company Administrator via Approval Hub',
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      showToast(`Request for ${name} rejected`, 'info');
      window.dispatchEvent(new CustomEvent('approval:processed', { detail: { id, decision: 'Rejected' } }));
    } catch (err: any) {
      showToast(`Failed to reject request: ${err?.message || 'Database error'}`, 'error');
      await loadRequests();
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const typeLower = (r.type || '').toLowerCase();
    if (inboxFilter === 'urgent') return r.details?.toLowerCase().includes('urgent') || r.title?.toLowerCase().includes('urgent');
    if (inboxFilter === 'leave') return typeLower.includes('leave');
    if (inboxFilter === 'attendance') return typeLower.includes('attendance') || typeLower.includes('regularization') || typeLower.includes('overtime');
    if (inboxFilter === 'expenses') return typeLower.includes('expense') || typeLower.includes('claim') || typeLower.includes('reimbursement');
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Executive Sub-Header & Tab Navigation (Zero Stacked Green Banners) */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('inbox')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'inbox'
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Approval Inbox ({requests.length} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'policies'
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Approval Policies & Chains</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadRequests}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs text-gray-600 hover:text-[#07563D] border-gray-200 gap-1.5 cursor-pointer"
            title="Refresh pending approvals from Supabase"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-[#07563D]')} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Subviews */}
      {activeTab === 'inbox' ? (
        <div className="space-y-3">
          {/* Inbox Filter Chips */}
          <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setInboxFilter('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
                inboxFilter === 'all' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              All Requests ({requests.length})
            </button>
            <button
              onClick={() => setInboxFilter('urgent')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5',
                inboxFilter === 'urgent' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Urgent</span>
            </button>
            <button
              onClick={() => setInboxFilter('leave')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
                inboxFilter === 'leave' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Leaves
            </button>
            <button
              onClick={() => setInboxFilter('attendance')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
                inboxFilter === 'attendance' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Attendance & Regularization
            </button>
            <button
              onClick={() => setInboxFilter('expenses')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
                inboxFilter === 'expenses' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Expense Claims
            </button>
          </div>

          {/* List of Requests */}
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-xs space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#07563D] mx-auto" />
              <p className="text-xs text-gray-500">Querying authoritative approval records from Supabase...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">All Clear! No Pending Requests</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                There are currently zero pending requests in the database for your active organization. All leaves, regularizations, and exceptions have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((r) => {
                const isWorking = actionInProgressId === r.id;
                const empName = r.requested_by_name || 'Employee';
                const initial = empName.charAt(0).toUpperCase();

                return (
                  <div
                    key={r.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-200 transition"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                        {initial}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{empName}</span>
                          {r.requested_by_email && (
                            <span className="text-[11px] text-gray-400 font-mono">({r.requested_by_email})</span>
                          )}
                          {r.department && (
                            <Badge variant="secondary" size="sm" className="text-[10px]">
                              {r.department}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              r.type?.toLowerCase().includes('leave')
                                ? 'info'
                                : r.type?.toLowerCase().includes('expense')
                                ? 'purple'
                                : 'warning'
                            }
                            size="sm"
                            className="text-[10px] capitalize"
                          >
                            {r.type}
                          </Badge>
                          {r.details?.toLowerCase().includes('urgent') && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800">{r.title}</p>
                        {r.details && (
                          <p className="text-xs text-gray-600 line-clamp-2">{r.details}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                          {r.amount_or_duration && <span>{r.amount_or_duration}</span>}
                          <span>•</span>
                          <span>
                            Submitted{' '}
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Status: {r.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isWorking}
                        onClick={() => handleReject(r.id, empName)}
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}
                      </Button>
                      <Button
                        size="sm"
                        disabled={isWorking}
                        onClick={() => handleApprove(r.id, empName)}
                        className="text-xs bg-[#07563D] hover:bg-[#053e2c] text-white cursor-pointer disabled:opacity-50"
                      >
                        {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve Request'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <ApprovalConfigView />
      )}
    </div>
  );
};
