// src/features/admin/subviews/AuditLogsView.tsx
// ============================================================
// Joy PeopleHR — Immutable Governance & Security Audit Trail
// Displays 4-Level Data Sensitivity, Actor Attribution, and Change Reasons
// ============================================================

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { governanceAuditService, GovernanceAuditRecord } from '../../../services/governance/governanceAuditService';
import { AuditLogEntry } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { History, Download, ShieldCheck, Eye, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AuditLogsView: React.FC = () => {
  const { showToast } = useToast();
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceAuditRecord[]>([]);
  const [systemLogs, setSystemLogs] = useState<AuditLogEntry[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<GovernanceAuditRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'governance' | 'system'>('governance');

  useEffect(() => {
    setGovernanceLogs(governanceAuditService.getAuditLogs());
    setSystemLogs(adminApi.getAuditLogs());
  }, []);

  const handleExportAudit = () => {
    let csvContent = 'data:text/csv;charset=utf-8,EventCode,Actor,Role,TargetEntity,TargetID,Sensitivity,Reason,Timestamp\n';
    governanceLogs.forEach(g => {
      csvContent += `${g.event_code},"${g.actor_name}","${g.actor_role}","${g.target_entity}","${g.target_id}","Level ${g.sensitivity_level}","${g.reason || 'Direct update'}","${g.timestamp}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'governance_audit_trail_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Immutable Audit Log Exported (CSV)');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#07563D]" />
            <span>Immutable Governance Audit Logs & Security Events</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Authority with Accountability trail: Every sensitive modification includes actor attribution, before/after diffs, and mandatory override reasons (7-year retention).
          </p>
        </div>

        <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportAudit}>
          Export Audit Trail (CSV)
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('governance')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'governance' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Data Governance & Overrides ({governanceLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'system' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          System & Security Events ({systemLogs.length})
        </button>
      </div>

      {/* Governance Logs Table */}
      {activeTab === 'governance' ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          {governanceLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-gray-800">No sensitive override events yet</p>
              <p className="mt-1">All sensitive records modified by Company Admin will be immutably cataloged here with mandatory change justifications.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-4 font-mono">Event Code</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4 text-center">Sensitivity</th>
                  <th className="p-4">Mandatory Reason</th>
                  <th className="p-4 font-mono">Timestamp</th>
                  <th className="p-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {governanceLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900">{log.event_code}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{log.actor_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{log.actor_role}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{log.target_label}</div>
                      <div className="text-[10px] text-gray-500">{log.target_entity} ({log.target_id})</div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge
                        variant={log.sensitivity_level === 4 ? 'danger' : log.sensitivity_level === 3 ? 'warning' : 'info'}
                        size="sm"
                      >
                        Level {log.sensitivity_level}
                      </Badge>
                    </td>
                    <td className="p-4 max-w-xs truncate text-gray-700 font-medium">
                      {log.reason || '—'}
                    </td>
                    <td className="p-4 font-mono text-gray-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAudit(log)}
                        className="text-xs text-emerald-700"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Diff
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">Event Code</th>
                <th className="p-4">Actor</th>
                <th className="p-4 font-mono">Module</th>
                <th className="p-4">Action</th>
                <th className="p-4 font-mono">Target Entity</th>
                <th className="p-4 font-mono">IP Address</th>
                <th className="p-4 font-mono">Timestamp</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {systemLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{log.event_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{log.actor_name}</td>
                  <td className="p-4 font-sans font-bold text-gray-700">{log.module_name}</td>
                  <td className="p-4 font-sans text-gray-800 font-medium">{log.action}</td>
                  <td className="p-4 text-gray-700">{log.entity_type} ({log.entity_id})</td>
                  <td className="p-4 text-gray-600">{log.ip_address}</td>
                  <td className="p-4 text-gray-600">{log.timestamp}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{log.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diff Inspection Modal */}
      {selectedAudit && (
        <Modal
          isOpen={!!selectedAudit}
          onClose={() => setSelectedAudit(null)}
          title={`Audit Diff Inspection — ${selectedAudit.event_code}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Actor:</span>
                <span className="font-bold text-gray-900">{selectedAudit.actor_name} ({selectedAudit.actor_role})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target:</span>
                <span className="font-bold text-gray-900">{selectedAudit.target_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Override Reason:</span>
                <span className="font-bold text-emerald-800">{selectedAudit.reason || 'None provided'}</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 text-[11px] font-bold text-gray-600 uppercase">
                Field Value Modifications
              </div>
              {selectedAudit.diffs?.map((diff, i) => (
                <div key={i} className="p-3 text-xs flex items-center justify-between gap-4 bg-white">
                  <span className="font-bold text-gray-800">{diff.fieldLabel}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 line-through">
                      {String(diff.oldValue || '—')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      {String(diff.newValue || '—')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right">
              <Button size="sm" onClick={() => setSelectedAudit(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
