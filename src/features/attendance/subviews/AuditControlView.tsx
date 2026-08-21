import React, { useState, useEffect } from 'react';
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

  const audits = [
    { id: 'aud-1', entity: 'Daily Punch Calculation', actor: 'SYSTEM CALCULATION ENGINE', event: 'RECONCILED', target: 'Hari Priya (WF-1001)', details: 'Computed Net 480 mins worked, 0m late, 22m OT from Biometric Gateway swipe.', timestamp: 'Today 09:05 AM' },
    { id: 'aud-2', entity: 'Policy Version Published', actor: 'Hari Priya (HR Head)', event: 'PUBLISHED', target: 'General Day Policy v2', details: 'Updated grace time tolerance from 10m to 15m effective 2026-08-01.', timestamp: '2026-08-01 10:00 AM' },
    { id: 'aud-3', entity: 'Attendance Regularization', actor: 'Dharun Joy (Company Admin)', event: 'APPROVED', target: 'Deepa Subramanian (WF-1003)', details: 'Approved client on-site check-in regularization for 2026-08-14.', timestamp: '2026-08-14 06:30 PM' },
    { id: 'aud-4', entity: 'Shift Assignment Override', actor: 'Hari Priya (HR Head)', event: 'OVERRIDDEN', target: 'Karthik Natarajan (WF-1002)', details: 'Swapped shift from General to Evening shift for maintenance window.', timestamp: '2026-08-10 02:15 PM' },
  ];

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
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-800 rounded-full">
              Tamper-Proof Audit Trail Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Immutable calculation trace, HR manual punch corrections, multi-level signoff timeline, and system events.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => handleTabSwitch('ledger')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Ledger & Audits
          </button>
          <button
            onClick={() => handleTabSwitch('corrections')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'corrections' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Corrections
          </button>
          <button
            onClick={() => handleTabSwitch('approvals')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'approvals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <History className="w-3.5 h-3.5" />
            Approval History
          </button>
          <button
            onClick={() => handleTabSwitch('activity')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'activity' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            Activity Logs
          </button>
        </div>
      </div>

      {/* 2. AUDIT TIMELINE TABLE */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-xs">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 uppercase tracking-wider">
            {activeSubTab === 'ledger'
              ? 'Immutable Calculation & Policy Event Trace'
              : activeSubTab === 'corrections'
              ? 'Manual HR Attendance Adjustments & Reason Audits'
              : activeSubTab === 'approvals'
              ? 'Multi-Level Regularization & Overtime Signoff History'
              : 'System Gateway & Webhook Ingestion Telemetry'}
          </h3>
          <span className="text-gray-500 font-mono text-[11px]">SHA-256 Audit Log Integrity: Valid</span>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3">Entity & Scope</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Event Type</th>
              <th className="p-3">Target Employee / Resource</th>
              <th className="p-3">Change Summary & Calculation Trace</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {audits.map(aud => (
              <tr key={aud.id} className="hover:bg-gray-50/70">
                <td className="p-3 font-semibold text-gray-900">{aud.entity}</td>
                <td className="p-3 text-gray-700 font-medium">{aud.actor}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-800 rounded">
                    {aud.event}
                  </span>
                </td>
                <td className="p-3 font-medium text-[#07563D]">{aud.target}</td>
                <td className="p-3 text-gray-600 max-w-md">{aud.details}</td>
                <td className="p-3 font-mono text-gray-500 text-right">{aud.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
