import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  FileEdit,
  History,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';
import { attendanceApi } from '../../../services/attendanceApi';
import { workLocationService } from '../../../services/location/workLocationService';
import { Badge } from '../../../components/ui/Badge';

export interface AuditControlViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const AuditControlView: React.FC<AuditControlViewProps> = ({
  currentTab = 'calculation-audit',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'corrections' | 'approvals' | 'activity'>(() => {
    if (currentTab === 'attendance-corrections') return 'corrections';
    if (currentTab === 'approval-history') return 'approvals';
    if (currentTab === 'attendance-activity-logs') return 'activity';
    return 'ledger';
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [locationEvents, setLocationEvents] = useState<any[]>([]);

  const loadData = useCallback(() => {
    api.getEmployees().then((emps) => {
      setEmployees(emps);
    }).catch(() => []);

    const todayStr = new Date().toISOString().split('T')[0];
    const recs = attendanceApi.getDailyAttendance(todayStr);
    setDailyRecords(recs);

    const evts = workLocationService.getLocationEvents();
    setLocationEvents(evts);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentTab === 'attendance-corrections') setActiveSubTab('corrections');
    else if (currentTab === 'approval-history') setActiveSubTab('approvals');
    else if (currentTab === 'attendance-activity-logs') setActiveSubTab('activity');
    else if (currentTab === 'calculation-audit') setActiveSubTab('ledger');
  }, [currentTab]);

  const handleTabSwitch = (tab: 'ledger' | 'corrections' | 'approvals' | 'activity') => {
    setActiveSubTab(tab);
    if (onNavigateSubPath) {
      const map: Record<string, string> = {
        ledger: 'calculation-audit',
        corrections: 'attendance-corrections',
        approvals: 'approval-history',
        activity: 'attendance-activity-logs',
      };
      onNavigateSubPath(map[tab]);
    }
  };

  // Build live audit events from actual daily records and location events
  const dynamicAudits = useMemo(() => {
    const list: any[] = [];

    // Daily records reconciliation audit
    dailyRecords.forEach((rec, idx) => {
      if (rec.in_time) {
        list.push({
          id: `aud-punch-${rec.id || idx}`,
          entity: 'Daily Punch Calculation',
          actor: 'SYSTEM CALCULATION ENGINE',
          event: 'RECONCILED',
          target: `${rec.employee_name} (${rec.employee_code})`,
          details: `Computed ${rec.net_working_minutes || 0}m worked, ${rec.late_minutes || 0}m late, ${rec.overtime_minutes || 0}m OT from ${rec.source || 'Unified Gateway'}.`,
          timestamp: rec.date ? `${rec.date} ${rec.in_time}` : 'Today 09:00 AM',
        });
      }
    });

    // Location Events
    locationEvents.slice(0, 10).forEach((evt, idx) => {
      list.push({
        id: `aud-loc-${evt.id || idx}`,
        entity: 'GPS Geofence Authorization',
        actor: 'GEOFENCE POLICY GUARD',
        event: evt.geofence_status === 'INSIDE' ? 'VERIFIED' : 'VIOLATION_FLAGGED',
        target: `${evt.employee_name || 'Staff'} (${evt.employee_code || 'WF-EMP'})`,
        details: `${evt.event_type} evaluated at ${evt.distance_meters}m from center (Accuracy: ±${evt.accuracy_meters}m).`,
        timestamp: new Date(evt.device_timestamp).toLocaleString(),
      });
    });

    return list;
  }, [dailyRecords, locationEvents]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Segment Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Attendance Audit, Governance & Control</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-800 rounded-full">
              Tamper-Proof Audit Trail Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Immutable calculation trace, HR manual punch corrections, multi-level signoff timeline, and system events.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs flex-wrap gap-1">
          <button
            onClick={() => handleTabSwitch('ledger')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'ledger' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ledger & Audits ({dynamicAudits.length})
          </button>
          <button
            onClick={() => handleTabSwitch('corrections')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'corrections' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Punch Corrections (0)
          </button>
          <button
            onClick={() => handleTabSwitch('approvals')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'approvals' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <History className="w-3.5 h-3.5" />
            Approval History (0)
          </button>
          <button
            onClick={() => handleTabSwitch('activity')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'activity' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            System Activity ({locationEvents.length})
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Authoritative Event Audit Stream</h3>
          <span className="text-xs text-gray-500 font-mono">Current Tenant Scoped</span>
        </div>

        {dynamicAudits.length > 0 ? (
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Entity / Domain</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Event</th>
                <th className="p-3.5">Target Staff</th>
                <th className="p-3.5">Details & Trace</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dynamicAudits.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="p-3.5 font-bold text-gray-900">{a.entity}</td>
                  <td className="p-3.5 text-gray-700 font-medium">{a.actor}</td>
                  <td className="p-3.5">
                    <Badge variant={a.event === 'VERIFIED' || a.event === 'RECONCILED' ? 'emerald' : 'rose'} size="sm">
                      {a.event}
                    </Badge>
                  </td>
                  <td className="p-3.5 font-semibold text-gray-800">{a.target}</td>
                  <td className="p-3.5 text-gray-600 max-w-md">{a.details}</td>
                  <td className="p-3.5 text-right font-mono text-gray-500">{a.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-xs text-gray-500">
            No audit events recorded yet for this organization. System events and calculation traces will stream here in real-time.
          </div>
        )}
      </div>
    </div>
  );
};
