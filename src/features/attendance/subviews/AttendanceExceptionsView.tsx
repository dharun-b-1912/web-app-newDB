import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ScanFace,
  MapPin,
  Clock,
  RotateCw,
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  FileEdit,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  attendanceOperationsEngine,
  AttendanceExceptionItem,
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
} from '../../../services/attendance/attendanceOperationsEngine';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export interface AttendanceExceptionsViewProps {
  onNavigateSubPath?: (subPath: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const AttendanceExceptionsView: React.FC<AttendanceExceptionsViewProps> = ({
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [exceptions, setExceptions] = useState<AttendanceExceptionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'NEW' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedException, setSelectedException] = useState<AttendanceExceptionItem | null>(null);

  // Resolution modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Route to Regularization modal
  const [isRouteRegModalOpen, setIsRouteRegModalOpen] = useState(false);
  const [reqIn, setReqIn] = useState('09:00 AM');
  const [reqOut, setReqOut] = useState('06:00 PM');
  const [regReason, setRegReason] = useState('');

  const loadData = () => {
    // Purge any legacy mock exceptions
    try {
      const stored = localStorage.getItem('wf_att_ops_exceptions_list_org-joy-01');
      if (stored && (stored.includes('exc-sys-101') || stored.includes('exc-sys-102'))) {
        localStorage.removeItem('wf_att_ops_exceptions_list_org-joy-01');
      }
    } catch (_) {}

    const list = attendanceOperationsEngine.getExceptions();
    setExceptions(list);
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('exception.resolved', () => loadData());
    return () => unsub();
  }, []);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (activeTab === 'CRITICAL' && e.severity !== 'CRITICAL') return false;
      if (activeTab === 'NEW' && e.status !== 'NEW') return false;
      if (activeTab === 'INVESTIGATING' && e.status !== 'INVESTIGATING') return false;
      if (activeTab === 'RESOLVED' && e.status !== 'RESOLVED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.employee_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          e.diagnosis_reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [exceptions, activeTab, searchQuery]);

  const handleOpenResolveModal = (exc: AttendanceExceptionItem) => {
    setSelectedException(exc);
    setResolutionNotes(`Fixed technical fault for ${exc.type}. Roster and device mappings re-verified.`);
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = () => {
    if (!selectedException) return;
    attendanceOperationsEngine.resolveException(
      selectedException.id,
      resolutionNotes,
      user?.name || 'Attendance Admin'
    );
    showToast(`✓ Exception ${selectedException.id} resolved. System recalculated derived attendance.`);
    setIsResolveModalOpen(false);
    setSelectedException(null);
    loadData();
  };

  const handleOpenRouteToRegModal = (exc: AttendanceExceptionItem) => {
    setSelectedException(exc);
    setReqIn('09:00 AM');
    setReqOut('06:00 PM');
    setRegReason(`Auto-routed from Exception ${exc.id}: ${exc.diagnosis_reason}`);
    setIsRouteRegModalOpen(true);
  };

  const handleConfirmRouteToReg = () => {
    if (!selectedException) return;
    attendanceOperationsEngine.submitRegularizationFromException(selectedException.id, {
      requested_in: reqIn,
      requested_out: reqOut,
      reason: regReason,
      submitted_by: user?.name || 'HR Specialist',
    });

    showToast(`✓ Exception routed to Regularization Desk. Manager approval request created.`);
    setIsRouteRegModalOpen(false);
    setSelectedException(null);
    loadData();
  };

  // Metrics
  const totalCount = exceptions.length;
  const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL').length;
  const newCount = exceptions.filter(e => e.status === 'NEW').length;
  const investigatingCount = exceptions.filter(e => e.status === 'INVESTIGATING').length;
  const resolvedCount = exceptions.filter(e => e.status === 'RESOLVED').length;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Attendance Exceptions Queue</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
              Investigation Workspace
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Investigate hardware errors, unassigned shifts, GPS violations, and biometric mismatches before they generate false lateness.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('late-early');
            }}
            className="text-xs font-bold text-gray-700"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Late / Early Tracking
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('regularization');
            }}
            className="text-xs font-bold text-gray-700"
          >
            <FileEdit className="w-3.5 h-3.5 mr-1" />
            Regularization Desk
          </Button>
        </div>
      </div>

      {/* 2. Compact Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'ALL' ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Exceptions</span>
            <Layers className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-gray-500 font-semibold">All technical queues</span>
        </button>

        <button
          onClick={() => setActiveTab('CRITICAL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'CRITICAL' ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Critical Severity</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{criticalCount}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Blocks shift evaluation</span>
        </button>

        <button
          onClick={() => setActiveTab('NEW')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'NEW' ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20" : "bg-white border-gray-200 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>New Anomalies</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{newCount}</div>
          <span className="text-[10px] text-amber-700 font-semibold">Unassigned triage</span>
        </button>

        <button
          onClick={() => setActiveTab('INVESTIGATING')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'INVESTIGATING' ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Investigating</span>
            <Activity className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{investigatingCount}</div>
          <span className="text-[10px] text-blue-700 font-semibold">Under hardware test</span>
        </button>

        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'RESOLVED' ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20" : "bg-white border-gray-200 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Calculations restored</span>
        </button>
      </div>

      {/* 3. Technical Investigation Workspace */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">System & Data Diagnostics</h3>
            <span className="text-xs text-gray-500">({filteredExceptions.length} active investigations)</span>
          </div>

          <div className="relative text-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search diagnosis or employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Exception ID</th>
                <th className="p-3">Type & Severity</th>
                <th className="p-3">Affected Employee</th>
                <th className="p-3">Date & Source</th>
                <th className="p-3">System Diagnosis & Reason</th>
                <th className="p-3">Suggested Action</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-gray-800">Zero System Exceptions!</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">All hardware gateways, GPS boundaries, and shift mappings are 100% synchronized.</p>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map(exc => (
                  <tr key={exc.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-mono text-gray-500 whitespace-nowrap">{exc.id}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{exc.type}</div>
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-extrabold rounded",
                        exc.severity === 'CRITICAL' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {exc.severity}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(exc.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline"
                      >
                        {exc.employee_name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">{exc.employee_code} • {exc.department}</div>
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">
                      <div className="font-mono">{exc.date}</div>
                      <div className="text-[10px] text-gray-400">{exc.source}</div>
                    </td>
                    <td className="p-3 text-gray-700 max-w-sm">
                      <p className="font-medium text-gray-900">{exc.diagnosis_reason}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Expected: {exc.diagnosis_expected} | Got: {exc.diagnosis_received}</p>
                    </td>
                    <td className="p-3 text-emerald-800 font-medium max-w-xs">{exc.suggested_action}</td>
                    <td className="p-3 whitespace-nowrap">
                      {exc.status === 'RESOLVED' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Resolved
                        </span>
                      ) : exc.status === 'INVESTIGATING' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                          Investigating
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                          New
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {exc.status !== 'RESOLVED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleOpenResolveModal(exc)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
                          >
                            Resolve
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenRouteToRegModal(exc)}
                            className="text-purple-700 hover:bg-purple-50 border-purple-200 font-bold text-xs"
                          >
                            Route to Regularization
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">Fixed & Recalculated</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. RESOLUTION MODAL */}
      {isResolveModalOpen && selectedException && (
        <Modal
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          title={`Resolve Technical Exception: ${selectedException.id}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <span className="font-bold text-gray-900">{selectedException.type} • {selectedException.employee_name} ({selectedException.employee_code})</span>
              <p className="text-gray-600">{selectedException.diagnosis_reason}</p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Resolution & Fix Notes *</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmResolve} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Mark Resolved & Recalculate Attendance
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. ROUTE TO REGULARIZATION MODAL */}
      {isRouteRegModalOpen && selectedException && (
        <Modal
          isOpen={isRouteRegModalOpen}
          onClose={() => setIsRouteRegModalOpen(false)}
          title="Route Exception to Regularization Desk"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <p className="font-bold text-purple-900">
                Exception $\rightarrow$ Regularization: {selectedException.employee_name} ({selectedException.employee_code})
              </p>
              <p className="text-purple-700 mt-1">
                This exception requires employee/manager attendance signoff to confirm actual check-in/out times.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-In</label>
                <input
                  type="text"
                  value={reqIn}
                  onChange={e => setReqIn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Requested Check-Out</label>
                <input
                  type="text"
                  value={reqOut}
                  onChange={e => setReqOut(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason & Context</label>
              <textarea
                rows={3}
                value={regReason}
                onChange={e => setRegReason(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsRouteRegModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmRouteToReg} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Create Regularization Claim
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
