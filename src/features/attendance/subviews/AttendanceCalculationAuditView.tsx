// src/features/attendance/subviews/AttendanceCalculationAuditView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Attendance Calculation Audit & Explainability Console
// 9-State Lifecycle Ledger, "Explain Calculation" Drawer, Batch Recalculation & Immutable Audit Logs
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  FileText,
  Calculator,
  RefreshCw,
  Clock,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import {
  attendanceRosterService,
} from '../../../services/attendance/attendanceRosterService';
import {
  AttendanceLedgerRecord,
  PolicyAuditLog,
  AttendanceLifecycleStatus,
} from '../../../types/shiftRoster';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { cn } from '../../../lib/utils';

export const AttendanceCalculationAuditView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'AUDIT_LOGS'>('LEDGER');
  const [ledger, setLedger] = useState<AttendanceLedgerRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<PolicyAuditLog[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceLedgerRecord | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadData = () => {
    // Load ledger for active month
    const records = attendanceRosterService.getLedger('2026-08-01', '2026-08-31');
    setLedger(records);
    setAuditLogs(attendanceRosterService.getAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      // Re-evaluate attendance for sample employees
      attendanceRosterService.calculateDailyAttendance('WF-1004', '2026-08-20');
      attendanceRosterService.calculateDailyAttendance('WF-1003', '2026-08-20');
      loadData();
      setIsRecalculating(false);
      showToast('✓ Batch recalculation completed against active policy versions.');
    }, 800);
  };

  const getLifecycleBadge = (status: AttendanceLifecycleStatus) => {
    switch (status) {
      case 'CALCULATED':
        return <Badge variant="emerald" size="sm">Calculated</Badge>;
      case 'APPROVED':
        return <Badge variant="emerald" size="sm">Approved</Badge>;
      case 'LOCKED':
        return <Badge variant="gray" size="sm">Payroll Locked</Badge>;
      case 'EXCEPTION':
        return <Badge variant="rose" size="sm">Exception</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="purple" size="sm">Pending Approval</Badge>;
      default:
        return <Badge variant="gray" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Recalculate Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Attendance & Time</span>
            <span>/</span>
            <span>Audits & Operations</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">Calculation Ledger & Audits</span>
            <Badge variant="gray" size="sm" className="text-[10px] font-mono ml-1">
              Tenant: {getActiveOrgId()}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Calculation Ledger & Audits</h1>
          <p className="text-xs text-gray-500 mt-1">
            Immutable attendance ledger records, step-by-step rule explainability, and policy change history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-11 px-5"
          >
            <Calculator className={cn("w-4 h-4", isRecalculating && "animate-spin")} />
            {isRecalculating ? 'Recalculating...' : 'Batch Recalculate'}
          </Button>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === 'LEDGER' ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
          )}
        >
          Daily Attendance Ledger ({ledger.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer",
            activeTab === 'AUDIT_LOGS' ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
          )}
        >
          Policy & Shift Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* 3. TAB CONTENT: DAILY ATTENDANCE LEDGER */}
      {activeTab === 'LEDGER' && (
        <Card className="rounded-3xl border border-gray-200/80 overflow-hidden bg-white shadow-2xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80">
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Employee</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Date & Shift</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Policy Version</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Punch Timings</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Net Hours</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-700">Audit & Explain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledger.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{row.employee_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{row.employee_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{row.attendance_date}</div>
                      <div className="text-[10px] text-gray-500">{row.shift_name} ({row.shift_code})</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <Badge variant="purple" size="sm">
                        {row.policy_code} v{row.policy_version}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div>IN: <strong className="text-gray-900">{row.first_in || '—'}</strong></div>
                      <div>OUT: <strong className="text-gray-900">{row.last_out || '—'}</strong></div>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {Math.floor(row.net_minutes / 60)}h {row.net_minutes % 60}m
                    </td>
                    <td className="py-3 px-4">
                      {getLifecycleBadge(row.lifecycle_status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRecord(row)}
                        className="gap-1 text-xs font-bold rounded-xl border-emerald-200 text-[#07563D] bg-emerald-50/50 hover:bg-emerald-100"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Explain
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (
        <Card className="rounded-3xl border border-gray-200/80 overflow-hidden bg-white shadow-2xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80">
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Timestamp</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Actor</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Entity Type</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Change Summary</th>
                  <th className="py-3 px-4 text-left font-bold text-gray-700">Rationale / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{log.actor_name}</div>
                      <div className="text-[10px] text-gray-400">{log.actor_role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="gray" size="sm">{log.entity_type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {log.change_summary}
                    </td>
                    <td className="py-3 px-4 text-gray-500 italic">
                      {log.reason || 'Standard configuration update'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. "EXPLAIN CALCULATION" DRAWER / MODAL */}
      {selectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRecord(null)}
          title={`Calculation Breakdown: ${selectedRecord.employee_name} (${selectedRecord.attendance_date})`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {/* Header Summary */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-emerald-950 font-black text-sm">Status: {selectedRecord.status}</span>
                <Badge variant="purple" size="sm">{selectedRecord.policy_code} v{selectedRecord.policy_version}</Badge>
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold">
                {selectedRecord.calculation_explanation?.policy_summary}
              </p>
            </div>

            {/* Rule Explanations */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Check-In Evaluation:</span>
                <strong className="text-gray-900">{selectedRecord.calculation_explanation?.check_in_status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Check-Out Evaluation:</span>
                <strong className="text-gray-900">{selectedRecord.calculation_explanation?.check_out_status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Net Working Hours:</span>
                <strong className="text-gray-900">{selectedRecord.calculation_explanation?.working_time_status}</strong>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Overtime (OT):</span>
                <strong className="text-gray-900">{selectedRecord.calculation_explanation?.ot_status}</strong>
              </div>
            </div>

            {/* Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900 block">Calculation Audit Steps</span>
              {selectedRecord.audit_trail?.map((step, idx) => (
                <div key={idx} className="text-[11px] p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
                  <span className="text-gray-700"><strong>{step.actor}:</strong> {step.note}</span>
                  <span className="text-gray-400 font-mono">{new Date(step.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedRecord(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
