// src/features/operations/RequestsApprovalsWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Requests & Approvals Workspace
// Separates: [ Actionable Inbox ] from [ Governance Policies ]
// ============================================================

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { ApprovalConfigView } from '../admin/subviews/ApprovalConfigView';
import { cn } from '../../lib/utils';

export type ApprovalsTab = 'inbox' | 'policies';

interface PendingRequestItem {
  id: string;
  type: 'Leave' | 'Regularization' | 'Overtime' | 'Expense' | 'Asset';
  employeeName: string;
  employeeId: string;
  department: string;
  avatarUrl?: string;
  summary: string;
  duration?: string;
  amount?: string;
  submittedAt: string;
  urgency: 'High' | 'Normal';
  currentLevel: string;
}

export const RequestsApprovalsWorkspace: React.FC<{ initialTab?: ApprovalsTab }> = ({
  initialTab = 'inbox',
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ApprovalsTab>(initialTab);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'urgent' | 'leave' | 'attendance' | 'expenses'>('all');
  
  // Realtime requests from persistent storage
  const [requests, setRequests] = useState<PendingRequestItem[]>(() => {
    try {
      const stored = localStorage.getItem('workforce_approval_requests_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'req-101',
        type: 'Leave',
        employeeName: 'Rahul Kumar',
        employeeId: 'JOY-EMP-042',
        department: 'Engineering',
        summary: 'Casual Leave (3 Days) — Family Function',
        duration: 'Sep 3 – Sep 5, 2026',
        submittedAt: 'Today at 09:15 AM',
        urgency: 'High',
        currentLevel: 'Level 1 (Reporting Manager)',
      },
      {
        id: 'req-102',
        type: 'Regularization',
        employeeName: 'Priya Sharma',
        employeeId: 'JOY-EMP-019',
        department: 'Product Design',
        summary: 'Mispunch Check-out Regularization (Biometric Sync Delay)',
        duration: 'Yesterday (Aug 31)',
        submittedAt: 'Today at 08:30 AM',
        urgency: 'Normal',
        currentLevel: 'Level 1 (Reporting Manager)',
      },
    ];
  });

  const handleApprove = (id: string, name: string) => {
    setRequests(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem('workforce_approval_requests_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Request for ${name} approved successfully`, 'success');
  };

  const handleReject = (id: string, name: string) => {
    setRequests(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem('workforce_approval_requests_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast(`Request for ${name} rejected`, 'info');
  };

  const filteredRequests = requests.filter(r => {
    if (inboxFilter === 'urgent') return r.urgency === 'High';
    if (inboxFilter === 'leave') return r.type === 'Leave';
    if (inboxFilter === 'attendance') return r.type === 'Regularization' || r.type === 'Overtime';
    if (inboxFilter === 'expenses') return r.type === 'Expense';
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>Operations Governance</span>
              <span>•</span>
              <span>Approval Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Requests & Approval Management
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Process daily workforce leave and attendance exceptions, or configure multi-level escalation matrices.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('inbox')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'inbox'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Approval Inbox ({requests.length} Pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'policies'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Approval Policies & Chains</span>
          </button>
        </div>
      </div>

      {/* Subviews */}
      {activeTab === 'inbox' ? (
        <div className="space-y-4">
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
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">All Clear! No Pending Requests</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                You have resolved all outstanding approvals across leaves, attendance regularizations, and expenses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(r => (
                <div
                  key={r.id}
                  className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-200 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                      {r.employeeName.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{r.employeeName}</span>
                        <span className="text-[11px] text-gray-400 font-mono">({r.employeeId})</span>
                        <Badge variant="secondary" size="sm" className="text-[10px]">
                          {r.department}
                        </Badge>
                        <Badge
                          variant={r.type === 'Leave' ? 'info' : r.type === 'Expense' ? 'purple' : 'warning'}
                          size="sm"
                          className="text-[10px]"
                        >
                          {r.type}
                        </Badge>
                        {r.urgency === 'High' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{r.summary}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        {r.duration && <span>Duration: {r.duration}</span>}
                        {r.amount && <span>Amount: <strong className="text-gray-800">{r.amount}</strong></span>}
                        <span>•</span>
                        <span>Submitted {r.submittedAt}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">{r.currentLevel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(r.id, r.employeeName)}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r.id, r.employeeName)}
                      className="text-xs bg-[#07563D] hover:bg-[#053e2c] text-white"
                    >
                      Approve Request
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ApprovalConfigView />
      )}
    </div>
  );
};
