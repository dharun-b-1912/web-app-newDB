import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { AuditLogEntry } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { History, Download, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AuditLogsView: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    setLogs(adminApi.getAuditLogs());
  }, []);

  const handleExportAudit = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EventCode,Actor,Module,Action,EntityType,EntityID,IPAddress,Timestamp,Status\n' +
      'EVT-8819,Anand Viswanathan,Security,MFA Policy Enforced,SecurityPolicy,sec-pol-1,106.51.72.18,2026-08-12 09:45 AM,Success\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'system_audit_trail_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Immutable Audit Log Exported (CSV)');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#07563D]" />
            <span>Immutable Platform Audit Logs & Security Events</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive audit trail of user activity, role assignments, security policy changes & data exports (7-year retention)</p>
        </div>

        <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportAudit}>
          Export Audit Trail (CSV)
        </Button>
      </div>

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
            {logs.map(log => (
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
    </div>
  );
};
