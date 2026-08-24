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
} from 'lucide-react';
import {
  attendanceExceptionEngineService,
  AttendanceException,
} from '../../../services/attendance/attendanceExceptionEngineService';
import {
  biometricEventPipelineService,
} from '../../../services/attendance/biometricEventPipelineService';
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

  // Resolution modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionMode, setResolutionMode] = useState<'MANUAL_OUT' | 'APPROVE_INCOMPLETE' | 'IGNORE'>('MANUAL_OUT');
  const [manualOutTime, setManualOutTime] = useState('18:00');
  const [resolutionReason, setResolutionReason] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const loadData = async () => {
    // Initial evaluation
    await attendanceExceptionEngineService.evaluateExceptions();
    const list = attendanceExceptionEngineService.getExceptions();
    setExceptions(list);
  };

  const handleRunScanner = async () => {
    setIsScanning(true);
    try {
      const res = await attendanceExceptionEngineService.evaluateExceptions();
      showToast(`✓ Evaluated ${res.evaluatedCount} punches/sessions: ${res.newExceptionsCount} new anomalies detected.`);
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
    const unsub = hrEventBus.subscribe('exception.created', () => {
      setExceptions(attendanceExceptionEngineService.getExceptions());
    });
    const unsub2 = hrEventBus.subscribe('exception.resolved', () => {
      setExceptions(attendanceExceptionEngineService.getExceptions());
    });
    return () => {
      unsub();
      unsub2();
    };
  }, []);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (activeTab === 'CRITICAL' && e.severity !== 'CRITICAL' && e.severity !== 'HIGH') return false;
      if (activeTab === 'MISSING_OUT' && e.exception_type !== 'MISSING_CHECK_OUT') return false;
      if (activeTab === 'MISSING_IN' && e.exception_type !== 'MISSING_CHECK_IN') return false;
      if (activeTab === 'UNMAPPED' && e.exception_type !== 'UNKNOWN_BIOMETRIC_ID') return false;
      if (activeTab === 'RESOLVED' && e.status !== 'RESOLVED' && e.status !== 'IGNORED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.employee_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
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
    setResolutionMode(exc.exception_type === 'MISSING_CHECK_OUT' ? 'MANUAL_OUT' : 'APPROVE_INCOMPLETE');
    setManualOutTime('18:00');
    setResolutionReason(`Verified with ${exc.reporting_manager_name || 'reporting manager'}. Physical exit verified on secondary gate.`);
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = async () => {
    if (!selectedException) return;
    setIsSubmittingResolve(true);
    try {
      if (resolutionMode === 'MANUAL_OUT') {
        const dateStr = selectedException.work_date;
        const outIso = new Date(`${dateStr}T${manualOutTime}:00`).toISOString();
        attendanceExceptionEngineService.resolveWithManualCheckOut(
          selectedException.id,
          outIso,
          resolutionReason,
          user?.name || 'HR Administrator'
        );
        showToast(`✓ Resolved with manual check-out at ${manualOutTime}. Attendance recalculated.`);
      } else if (resolutionMode === 'APPROVE_INCOMPLETE') {
        attendanceExceptionEngineService.resolveAsApprovedIncomplete(
          selectedException.id,
          resolutionReason,
          user?.name || 'HR Administrator'
        );
        showToast(`✓ Approved incomplete session with manager justification.`);
      } else {
        attendanceExceptionEngineService.ignoreException(
          selectedException.id,
          resolutionReason,
          user?.name || 'HR Administrator'
        );
        showToast(`✓ Exception ignored with audit record.`);
      }

      setIsResolveModalOpen(false);
      setSelectedException(null);
      setExceptions(attendanceExceptionEngineService.getExceptions());
    } catch (err: any) {
      showToast(err.message || 'Resolution failed', 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // Metrics
  const totalCount = exceptions.length;
  const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
  const missingOutCount = exceptions.filter(e => e.exception_type === 'MISSING_CHECK_OUT').length;
  const missingInCount = exceptions.filter(e => e.exception_type === 'MISSING_CHECK_IN').length;
  const unmappedCount = exceptions.filter(e => e.exception_type === 'UNKNOWN_BIOMETRIC_ID').length;
  const resolvedCount = exceptions.filter(e => e.status === 'RESOLVED' || e.status === 'IGNORED').length;

  return (
    <div className="space-y-5">
      {/* 1. Header with Automated Scanner */}
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
            Detects missing check-outs, missing check-ins, unmapped biometric PINs, and vendor anomalies with automated escalation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunScanner}
            disabled={isScanning}
            className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isScanning && "animate-spin")} />
            {isScanning ? 'Evaluating Punches...' : 'Run Automated Exception Scanner'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateSubPath) onNavigateSubPath('late-early');
            }}
            className="text-xs font-bold text-gray-700 rounded-xl"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Late / Early Tracking
          </Button>
        </div>
      </div>

      {/* 2. Compact Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
            activeTab === 'ALL' ? "bg-gray-100 border-gray-400 ring-2 ring-gray-400/20" : "bg-white border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total</span>
            <Layers className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-black text-gray-900 mt-1">{totalCount}</div>
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
          <div className="text-xl font-black text-rose-900 mt-1">{criticalCount}</div>
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
          <div className="text-xl font-black text-amber-900 mt-1">{missingOutCount}</div>
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
          <div className="text-xl font-black text-blue-900 mt-1">{missingInCount}</div>
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
          <div className="text-xl font-black text-purple-900 mt-1">{unmappedCount}</div>
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
          <div className="text-xl font-black text-emerald-900 mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Audited adjustments</span>
        </button>
      </div>

      {/* 3. Exception Queue Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-gray-900">Attendance Exception Queue</h3>
            <span className="text-xs text-gray-500 font-semibold">({filteredExceptions.length} items)</span>
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
                  <tr key={exc.id} className="hover:bg-gray-50/70 transition-colors">
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
                    <td className="p-3 font-bold text-gray-900">
                      <button
                        onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(exc.employee_id)}
                        className="text-left hover:text-[#07563D] hover:underline"
                      >
                        {exc.employee_name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {exc.employee_code} • {exc.department}
                      </div>
                      {exc.vendor_name && (
                        <div className="text-[10px] text-purple-700 font-semibold flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" /> Vendor: {exc.vendor_name}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">
                      <div className="font-mono font-bold text-gray-900">{exc.work_date}</div>
                      <div className="text-[10px] text-gray-500">
                        {exc.check_in_device_name ? `IN: ${exc.check_in_device_name}` : exc.check_out_device_name ? `OUT: ${exc.check_out_device_name}` : 'Biometric TCP'}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant={exc.employment_type === 'VENDOR' ? 'purple' : 'blue'} size="sm" className="text-[10px] gap-1 font-bold">
                        <UserCheck className="w-3 h-3" />
                        {exc.employment_type === 'VENDOR'
                          ? `Vendor Mgr (${exc.vendor_manager_name || 'Lead'})`
                          : `Manager (${exc.reporting_manager_name || 'Lead'})`}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-700 max-w-sm">
                      <p className="font-medium text-gray-900 leading-snug">{exc.description}</p>
                    </td>
                    <td className="p-3 text-emerald-800 font-medium max-w-xs">{exc.suggested_action}</td>
                    <td className="p-3 whitespace-nowrap">
                      {exc.status === 'RESOLVED' ? (
                        <Badge variant="emerald" size="sm" className="text-[10px] font-bold">
                          Resolved ({exc.resolution_type})
                        </Badge>
                      ) : exc.status === 'IGNORED' ? (
                        <Badge variant="gray" size="sm" className="text-[10px] font-bold">
                          Ignored
                        </Badge>
                      ) : (
                        <Badge variant="rose" size="sm" className="text-[10px] font-bold animate-pulse">
                          Open Exception
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {exc.status === 'OPEN' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenResolveModal(exc)}
                          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs rounded-xl"
                        >
                          Resolve Exception
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs font-semibold">
                          Resolved by {exc.resolved_by_name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. INTERACTIVE RESOLUTION MODAL */}
      {isResolveModalOpen && selectedException && (
        <Modal
          isOpen={isResolveModalOpen}
          onClose={() => {
            if (!isSubmittingResolve) setIsResolveModalOpen(false);
          }}
          title={`Resolve Attendance Exception: ${selectedException.id}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Raw Biometric Evidence Callout */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">
                  {selectedException.employee_name} ({selectedException.employee_code})
                </span>
                <Badge variant="purple" size="sm">
                  {selectedException.employment_type === 'VENDOR' ? 'Vendor Worker' : 'Regular Employee'}
                </Badge>
              </div>
              <p className="text-gray-600 leading-relaxed">{selectedException.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[10px]">Work Date</span>
                  <strong>{selectedException.work_date}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-In Time</span>
                  <strong>{selectedException.check_in_time ? new Date(selectedException.check_in_time).toLocaleTimeString() : 'Missing'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Check-In Terminal</span>
                  <strong>{selectedException.check_in_device_name || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Resolution Action Selector */}
            <div className="space-y-2">
              <label className="block text-gray-800 font-bold">Select Resolution Action *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionMode('MANUAL_OUT')}
                  className={cn(
                    "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                    resolutionMode === 'MANUAL_OUT'
                      ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 font-bold text-emerald-950"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <p className="font-bold text-xs">Add Manual Check-Out</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Closes session & recalculates hours</p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionMode('APPROVE_INCOMPLETE')}
                  className={cn(
                    "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                    resolutionMode === 'APPROVE_INCOMPLETE'
                      ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200 font-bold text-blue-950"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <p className="font-bold text-xs">Approve Incomplete</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Waive missing punch with approval</p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionMode('IGNORE')}
                  className={cn(
                    "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                    resolutionMode === 'IGNORE'
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200 font-bold text-amber-950"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <p className="font-bold text-xs">Ignore Exception</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Keep session as-is with audit reason</p>
                </button>
              </div>
            </div>

            {resolutionMode === 'MANUAL_OUT' && (
              <div>
                <label className="block text-gray-700 font-bold mb-1">Exit / Check-Out Time (24h) *</label>
                <input
                  type="time"
                  value={manualOutTime}
                  onChange={e => setManualOutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-bold mb-1">Audit Justification & Context *</label>
              <textarea
                rows={3}
                value={resolutionReason}
                onChange={e => setResolutionReason(e.target.value)}
                placeholder="State why this correction is being recorded and who authorized it..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmittingResolve}
                onClick={() => setIsResolveModalOpen(false)}
                className="text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={isSubmittingResolve || !resolutionReason.trim()}
                onClick={handleConfirmResolve}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs rounded-xl"
              >
                {isSubmittingResolve ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Non-Destructive Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
