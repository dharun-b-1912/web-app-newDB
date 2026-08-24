import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest, HolidayCalendar, LeaveEntitlement, LeaveException } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Clock,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Layers,
  ChevronRight,
  UserX,
  CalendarDays,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LeaveDashboardViewProps {
  onSelectKpiFilter?: (filterKey: string) => void;
  onOpenRequestDetails?: (request: LeaveRequest) => void;
}

export const LeaveDashboardView: React.FC<LeaveDashboardViewProps> = ({
  onSelectKpiFilter,
  onOpenRequestDetails,
}) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [exceptions, setExceptions] = useState<LeaveException[]>([]);

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
    setCalendars(leaveApi.getHolidayCalendars());
    setEntitlements(leaveApi.getEntitlements());
    setExceptions(leaveApi.getExceptions());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Real KPI calculations
  const pendingRequests = requests.filter(r => r.status === 'Pending' || r.status === 'Submitted');
  const onLeaveTodayRequests = requests.filter(
    r => r.status === 'Approved' && r.from_date <= todayStr && r.to_date >= todayStr
  );
  const upcomingRequests = requests.filter(
    r => r.status === 'Approved' && r.from_date > todayStr
  );
  const openExceptions = exceptions.filter(e => e.status === 'Open');
  const lowBalanceEntitlements = entitlements.filter(e => e.available_balance <= 2);
  const encashmentsPending = leaveApi.getEncashments().filter(e => e.status === 'Submitted');
  const adjustmentsPending = leaveApi.getAdjustments().filter(a => a.status === 'PendingApproval');

  const compactMetrics = [
    {
      id: 'pending-requests',
      label: 'Pending Requests',
      value: pendingRequests.length,
      unit: 'items',
      status: pendingRequests.length > 0 ? 'warning' : 'neutral',
      description: 'Awaiting manager / HR approval',
      icon: Clock,
      onClick: () => onSelectKpiFilter?.('pending-requests'),
    },
    {
      id: 'on-leave-today',
      label: 'On Leave Today',
      value: onLeaveTodayRequests.length,
      unit: 'employees',
      status: 'neutral',
      description: 'Active approved leaves',
      icon: UserX,
      onClick: () => onSelectKpiFilter?.('on-leave-today'),
    },
    {
      id: 'upcoming-leave',
      label: 'Upcoming Leave',
      value: upcomingRequests.length,
      unit: 'scheduled',
      status: 'neutral',
      description: 'Approved leaves in pipeline',
      icon: CalendarDays,
      onClick: () => onSelectKpiFilter?.('approved-requests'),
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      value: openExceptions.length,
      unit: 'flags',
      status: openExceptions.length > 0 ? 'danger' : 'success',
      description: 'Policy & threshold breaches',
      icon: ShieldAlert,
      onClick: () => onSelectKpiFilter?.('exceptions'),
    },
    {
      id: 'low-balance',
      label: 'Low Balance Alerts',
      value: lowBalanceEntitlements.length,
      unit: 'records',
      status: lowBalanceEntitlements.length > 0 ? 'warning' : 'neutral',
      description: 'Balances ≤ 2 days',
      icon: Layers,
      onClick: () => onSelectKpiFilter?.('low-balance'),
    },
  ];

  const handleQuickApprove = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    leaveApi.approveLeaveRequest(reqId, 'HR Admin (Quick Action)', 'Approved from Dashboard');
    setRequests(leaveApi.getLeaveRequests());
  };

  const handleQuickReject = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = prompt('Please provide reason for rejection:');
    if (reason) {
      leaveApi.rejectLeaveRequest(reqId, 'HR Admin (Quick Action)', reason);
      setRequests(leaveApi.getLeaveRequests());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Compact Clickable Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {compactMetrics.map(metric => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.id}
              onClick={metric.onClick}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all cursor-pointer group bg-white shadow-2xs hover:shadow-sm hover:border-[#07563D]/40',
                metric.status === 'danger' && 'border-rose-200 bg-rose-50/20',
                metric.status === 'warning' && 'border-amber-200 bg-amber-50/20'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 truncate">
                  {metric.label}
                </span>
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    metric.status === 'danger'
                      ? 'text-rose-600'
                      : metric.status === 'warning'
                      ? 'text-amber-600'
                      : 'text-[#07563D]'
                  )}
                />
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-gray-900 tracking-tight">
                  {metric.value}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">
                  {metric.unit}
                </span>
              </div>

              <p className="mt-1 text-[10px] text-gray-500 line-clamp-1">
                {metric.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Operational Timeline: Today's Active Leaves */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#07563D]" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Operational View — On Leave Today ({todayStr})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-500 font-mono">
                {onLeaveTodayRequests.length} Active
              </span>
            </div>

            {onLeaveTodayRequests.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-900">Full Staff Presence Today</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  No employees are currently on approved leave for today's roster.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Leave Type</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Return Date</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {onLeaveTodayRequests.map(req => (
                      <tr
                        key={req.id}
                        onClick={() => onOpenRequestDetails?.(req)}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5 font-bold text-gray-900">
                          {req.employee_name}
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {req.department_name}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-gray-800">
                          <Badge variant="neutral" size="sm">{req.leave_type_name}</Badge>
                        </td>
                        <td className="p-3.5 font-mono text-gray-600">
                          {req.leave_days_deducted} d
                          <span className="block text-[10px] text-gray-400">
                            {req.from_date} → {req.to_date}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="emerald" size="sm">Active</Badge>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-gray-900">
                          {new Date(new Date(req.to_date).getTime() + 86400000).toISOString().split('T')[0]}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRequestDetails?.(req);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                            title="View Request Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Queue Summary */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Requests Needing Immediate Review ({pendingRequests.length})
                </h3>
              </div>
              <button
                onClick={() => onSelectKpiFilter?.('pending-requests')}
                className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-1"
              >
                <span>View All Requests</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                You're all caught up! No pending leave requests in the queue.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {pendingRequests.slice(0, 4).map(req => (
                  <div
                    key={req.id}
                    onClick={() => onOpenRequestDetails?.(req)}
                    className="p-4 hover:bg-gray-50/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900">{req.employee_name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 font-mono text-[11px]">{req.department_name}</span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Requested <strong className="text-gray-900">{req.leave_days_deducted} days</strong> of{' '}
                        <strong className="text-[#07563D]">{req.leave_type_name}</strong> ({req.from_date} to {req.to_date})
                      </p>
                      {req.reason && (
                        <p className="text-[11px] text-gray-400 italic line-clamp-1">
                          "{req.reason}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleQuickApprove(req.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={(e) => handleQuickReject(req.id, e)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Dedicated Attention Required Section */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">Attention Required</h3>
            </div>

            <div className="space-y-2.5">
              {openExceptions.length === 0 &&
              pendingRequests.length === 0 &&
              encashmentsPending.length === 0 &&
              adjustmentsPending.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <span>Zero compliance exceptions or pending action items.</span>
                </div>
              ) : (
                <>
                  {openExceptions.map(exc => (
                    <div
                      key={exc.id}
                      onClick={() => onSelectKpiFilter?.('exceptions')}
                      className="p-3 rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="rose" size="sm">{exc.severity} Severity</Badge>
                        <span className="text-[10px] text-gray-400 font-mono">Exception</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">{exc.title}</h4>
                      <p className="text-[11px] text-gray-600 line-clamp-1">{exc.description}</p>
                    </div>
                  ))}

                  {encashmentsPending.length > 0 && (
                    <div
                      onClick={() => onSelectKpiFilter?.('encashment-pending')}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="amber" size="sm">Action Required</Badge>
                        <span className="text-[10px] text-gray-400 font-mono">Encashment</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">
                        {encashmentsPending.length} Leave Encashment Request(s)
                      </h4>
                      <p className="text-[11px] text-gray-600">Pending HR payout verification & payroll sync.</p>
                    </div>
                  )}

                  {adjustmentsPending.length > 0 && (
                    <div
                      onClick={() => onSelectKpiFilter?.('adjustments')}
                      className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 hover:bg-blue-50 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="blue" size="sm">Pending Audit</Badge>
                        <span className="text-[10px] text-gray-400 font-mono">Adjustments</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight">
                        {adjustmentsPending.length} Manual Leave Adjustment(s)
                      </h4>
                      <p className="text-[11px] text-gray-600">Awaiting HR manager authorization stamp.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick System Context Card */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Leave Policy Engine Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Leave Types:</span>
                <strong className="text-gray-900 font-mono">{leaveApi.getLeaveTypes().filter(t => t.is_active).length} configured</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Policies:</span>
                <strong className="text-gray-900 font-mono">{leaveApi.getLeavePolicies().filter(p => p.status === 'Active').length} policies</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Holiday Calendars:</span>
                <strong className="text-gray-900 font-mono">{calendars.length} regions</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Accrual Engine:</span>
                <strong className="text-emerald-700 font-mono font-bold">Idempotent Ready</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
