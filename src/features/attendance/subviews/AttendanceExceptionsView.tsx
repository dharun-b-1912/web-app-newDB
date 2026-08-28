// src/features/attendance/subviews/AttendanceExceptionsView.tsx
// ============================================================================
// Joy PeopleHR — Production Attendance Exception & Escalation Engine
// Features: Realtime Operational Anomaly Detection, Manual Reconciliation Trigger,
// Evidence Audit Drawer, Multi-Tenant Scoping, and Regularization Desk Integration
// ============================================================================

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
  RefreshCw,
  UserCheck,
  Building,
  Eye,
  Check,
} from 'lucide-react';
import {
  attendanceExceptionEngineService,
  AttendanceException,
} from '../../../services/attendance/attendanceExceptionEngineService';
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

  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'MISSING_OUT' | 'MISSING_IN' | 'UNMAPPED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedException, setSelectedException] = useState<AttendanceException | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Resolution modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionMode, setResolutionMode] = useState<'MANUAL_CHECK_OUT' | 'APPROVED_INCOMPLETE' | 'IGNORED_WITH_REASON'>('MANUAL_CHECK_OUT');
  const [manualOutTime, setManualOutTime] = useState('18:00');
  const [resolutionReason, setResolutionReason] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const loadData = async () => {
    const list = await attendanceExceptionEngineService.fetchExceptionsFromDb();
    setExceptions(list);
  };

  const handleRunScanner = async () => {
    setIsScanning(true);
    try {
      const res = await attendanceExceptionEngineService.evaluateExceptions();
      showToast(`✓ Evaluated attendance records: ${res.newExceptionsCount} new anomalies flagged.`);
      const list = attendanceExceptionEngineService.getExceptions();
      setExceptions(list);
    } catch (err: any) {
      showToast(err.message || 'Scanner failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub1 = hrEventBus.subscribe('exception.created', () => {
      setExceptions(attendanceExceptionEngineService.getExceptions());
    });
    const unsub2 = hrEventBus.subscribe('exception.resolved', () => {
      setExceptions(attendanceExceptionEngineService.getExceptions());
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (activeTab === 'CRITICAL' && e.severity !== 'CRITICAL' && e.severity !== 'HIGH') return false;
      if (activeTab === 'MISSING_OUT' && e.exception_type !== 'MISSING_CHECK_OUT') return false;
      if (activeTab === 'MISSING_IN' && e.exception_type !== 'MISSING_CHECK_IN') return false;
      if (activeTab === 'UNMAPPED' && e.exception_type !== 'UNMAPPED_BIOMETRIC_PIN' && e.exception_type !== 'UNMAPPED_DEVICE_USER') return false;
      if (activeTab === 'RESOLVED' && e.status !== 'RESOLVED' && e.status !== 'DISMISSED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (e.employee_name && e.employee_name.toLowerCase().includes(q)) ||
          (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
          e.exception_type.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.vendor_name && e.vendor_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [exceptions, activeTab, searchQuery]);

  const handleOpenResolveModal = (exc: AttendanceException) => {
    setSelectedException(exc);
    setResolutionMode(exc.exception_type === 'MISSING_CHECK_OUT' ? 'MANUAL_CHECK_OUT' : 'APPROVED_INCOMPLETE');
    setManualOutTime('18:00');
    setResolutionReason(`Verified with ${exc.reporting_manager_name || 'reporting manager'}. Secondary verification confirmed.`);
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = async () => {
    if (!selectedException) return;
    setIsSubmittingResolve(true);
    try {
      await attendanceExceptionEngineService.resolveException(
        selectedException.id,
        resolutionMode,
        resolutionReason,
        user?.id || 'emp-hr-001',
        user?.name || 'Haripriya (HR Head)'
      );
      showToast(`✓ Exception resolved successfully. Attendance reconciled.`);
      setIsResolveModalOpen(false);
      setSelectedException(null);
      setExceptions(attendanceExceptionEngineService.getExceptions());
    } catch (err: any) {
      showToast(err.message || 'Resolution failed', 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // Live Metrics
  const metrics = attendanceExceptionEngineService.getMetrics();

  return (
    <div className="space-y-5">
      {/* 1. Header with "Run Now" Manual Reconciliation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-gray-900">Attendance Exception & Escalation Engine</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
              Automated Detector
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Detects missing check-outs, missing check-ins, unmapped biometric PINs, and operational anomalies with SLA escalations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRunScanner}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
            <span>{isScanning ? 'Reconciling...' : 'Run Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('late-early');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-[#07563D]" />
            <span>Late / Early Tracking</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('regularization');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Regularization Desk</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Metric Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'ALL' ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total Open</span>
            <Layers className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{metrics.totalOpen}</div>
          <span className="text-[10px] text-gray-500 font-semibold">All anomalies</span>
        </button>

        <button
          onClick={() => setActiveTab('CRITICAL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'CRITICAL' ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20" : "bg-white border-gray-200 hover:border-rose-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Critical / High</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-900 mt-1">{metrics.criticalHigh}</div>
          <span className="text-[10px] text-rose-700 font-semibold">Urgent attention</span>
        </button>

        <button
          onClick={() => setActiveTab('MISSING_OUT')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'MISSING_OUT' ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20" : "bg-white border-gray-200 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Missing Check-Out</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">{metrics.missingCheckOut}</div>
          <span className="text-[10px] text-amber-700 font-semibold">Shift ended</span>
        </button>

        <button
          onClick={() => setActiveTab('MISSING_IN')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'MISSING_IN' ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20" : "bg-white border-gray-200 hover:border-blue-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Missing Check-In</span>
            <Activity className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-900 mt-1">{metrics.missingCheckIn}</div>
          <span className="text-[10px] text-blue-700 font-semibold">Exit without entry</span>
        </button>

        <button
          onClick={() => setActiveTab('UNMAPPED')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'UNMAPPED' ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20" : "bg-white border-gray-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Unmapped PINs</span>
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900 mt-1">{metrics.unmappedPins}</div>
          <span className="text-[10px] text-purple-700 font-semibold">Machine PINs</span>
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
          <div className="text-xl font-black text-emerald-900 mt-1">{metrics.resolved}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Audited adjustments</span>
        </button>
      </div>

      {/* 3. Exception Queue Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-gray-900">Attendance Exception Queue</h3>
            <span className="text-xs text-gray-500 font-semibold">({filteredExceptions.length} records in view)</span>
          </div>

          <div className="relative text-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search employee, exception, vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">Exception Type</th>
                <th className="p-3">Employee & Vendor</th>
                <th className="p-3">Work Date & Device</th>
                <th className="p-3">Escalation Routing</th>
                <th className="p-3">System Description</th>
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
                    <p className="font-bold text-gray-800">Zero Open Exceptions</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      All biometric punches, check-ins, and check-outs are cleanly paired into completed attendance sessions.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map(exc => (
                  <tr key={exc.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{exc.exception_type.replace(/_/g, ' ')}</div>
                      <Badge
                        variant={exc.severity === 'CRITICAL' || exc.severity === 'HIGH' ? 'rose' : 'amber'}
                        size="sm"
                        className="text-[10px] font-bold mt-0.5"
                      >
                        {exc.severity}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                      <button
                        onClick={() => exc.employee_id && onOpenEmployeeProfile && onOpenEmployeeProfile(exc.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline cursor-pointer"
                      >
                        {exc.employee_name || 'Unmapped Machine User'}
                      </button>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {exc.employee_code ? `${exc.employee_code} • ${exc.department || 'General'}` : 'PIN: ' + (exc.biometric_pin || 'Unknown')}
                      </div>
                    </td>
                    <td className="p-3 text-gray-700 font-semibold whitespace-nowrap">
                      <div className="font-bold text-gray-900">{exc.work_date}</div>
                      <div className="text-[11px] text-gray-500 font-normal">
                        {exc.actual_in ? `IN: ${exc.actual_in}` : exc.actual_out ? `OUT: ${exc.actual_out}` : 'Biometric TCP'}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="blue" size="sm" className="text-[10px] gap-1 font-bold">
                        <UserCheck className="w-3 h-3" />
                        {exc.responsible_role === 'EMPLOYEE'
                          ? 'Employee → Manager'
                          : exc.responsible_role === 'MANAGER'
                          ? 'Manager → HR'
                          : 'Attendance Admin'}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-700 max-w-sm">
                      <p className="font-medium text-gray-900 leading-snug">{exc.description}</p>
                    </td>
                    <td className="p-3 text-emerald-800 font-bold whitespace-nowrap">{exc.suggested_action}</td>
                    <td className="p-3 whitespace-nowrap">
                      {exc.status === 'RESOLVED' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full inline-block">
                          Resolved
                        </span>
                      ) : exc.status === 'UNDER_REVIEW' ? (
                        <span className="px-3 py-1 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full inline-block">
                          Under Review
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-full inline-block animate-pulse">
                          Open Exception
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedException(exc);
                            setIsDetailDrawerOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>View</span>
                        </button>

                        {exc.status !== 'RESOLVED' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(exc)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-lg cursor-pointer shadow-2xs transition-colors"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">Reconciled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. DETAIL EVIDENCE DRAWER / MODAL */}
      {isDetailDrawerOpen && selectedException && (
        <Modal
          isOpen={isDetailDrawerOpen}
          onClose={() => setIsDetailDrawerOpen(false)}
          title={`Exception Evidence: ${selectedException.title}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-gray-900">{selectedException.employee_name || 'Machine User'}</div>
                  <div className="text-gray-500 font-medium">{selectedException.employee_code} • {selectedException.department}</div>
                </div>
                <Badge variant="rose" size="sm" className="font-bold">{selectedException.severity} SEVERITY</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200 text-gray-700">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Date</div>
                  <div className="font-bold text-gray-900">{selectedException.work_date}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Shift</div>
                  <div className="font-bold text-gray-900">{selectedException.shift_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Check-In</div>
                  <div className="font-bold text-gray-900">{selectedException.actual_in || 'Missing'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Check-Out</div>
                  <div className="font-bold text-gray-900">{selectedException.actual_out || 'Missing'}</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <div className="font-bold">System Diagnosis:</div>
              <p className="mt-0.5">{selectedException.description}</p>
              <div className="font-bold mt-2">Recommended Action:</div>
              <p className="text-emerald-800 font-semibold">{selectedException.suggested_action}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsDetailDrawerOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
              {selectedException.status !== 'RESOLVED' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenResolveModal(selectedException);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-xl cursor-pointer"
                >
                  Resolve Exception
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. INTERACTIVE RESOLUTION MODAL */}
      {isResolveModalOpen && selectedException && (
        <Modal
          isOpen={isResolveModalOpen}
          onClose={() => {
            if (!isSubmittingResolve) setIsResolveModalOpen(false);
          }}
          title={`Resolve Attendance Exception: ${selectedException.title}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="font-bold text-gray-900">{selectedException.employee_name} ({selectedException.employee_code})</div>
              <div className="text-gray-500">Date: {selectedException.work_date} • {selectedException.shift_name}</div>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-gray-700">Resolution Action:</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionMode('MANUAL_CHECK_OUT')}
                  className={cn(
                    "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                    resolutionMode === 'MANUAL_CHECK_OUT' ? "bg-emerald-50 border-[#07563D] ring-1 ring-[#07563D]" : "bg-white border-gray-200"
                  )}
                >
                  <div className="font-bold text-gray-900">Record Verified Check-Out</div>
                  <div className="text-[11px] text-gray-500">Manually insert verified shift departure punch.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionMode('APPROVED_INCOMPLETE')}
                  className={cn(
                    "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                    resolutionMode === 'APPROVED_INCOMPLETE' ? "bg-emerald-50 border-[#07563D] ring-1 ring-[#07563D]" : "bg-white border-gray-200"
                  )}
                >
                  <div className="font-bold text-gray-900">Approve Incomplete Session (Manager Waiver)</div>
                  <div className="text-[11px] text-gray-500">Waive missing checkout penalty based on manager confirmation.</div>
                </button>
              </div>
            </div>

            {resolutionMode === 'MANUAL_CHECK_OUT' && (
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Actual Out Time (IST):</label>
                <input
                  type="time"
                  value={manualOutTime}
                  onChange={e => setManualOutTime(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Resolution Reason / Audit Justification:</label>
              <textarea
                rows={2}
                value={resolutionReason}
                onChange={e => setResolutionReason(e.target.value)}
                placeholder="Enter justification for audit log..."
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                disabled={isSubmittingResolve}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={isSubmittingResolve || !resolutionReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isSubmittingResolve ? 'Reconciling...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
