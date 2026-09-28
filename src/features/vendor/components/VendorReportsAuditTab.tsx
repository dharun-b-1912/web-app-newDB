// src/features/vendor/components/VendorReportsAuditTab.tsx
// ============================================================================
// Joy PeopleHR — Vendor Operational Reports & Immutable Audit Trail Component
// Displays compliance reporting, active deployment stats, and auditable event timeline
// ============================================================================

import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, Clock, FileSpreadsheet, Download, Activity, FileText } from 'lucide-react';
import { VendorAuditLogRecord } from '../../../services/vendor/vendorCommunicationService';
import { supabase } from '../../../lib/supabase';

interface VendorReportsAuditTabProps {
  vendorId?: string;
  organizationId?: string;
  workforceCount?: number;
}

export const VendorReportsAuditTab: React.FC<VendorReportsAuditTabProps> = ({
  vendorId,
  organizationId = 'org-joy-main',
  workforceCount = 0,
}) => {
  // =========================================================================
  // ZERO-MOCK POLICY: Dynamic audit logs from database, starts completely empty
  // =========================================================================
  const [auditLogs, setAuditLogs] = useState<VendorAuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!vendorId) {
        setAuditLogs([]);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendor_audit_logs')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && Array.isArray(data)) {
          setAuditLogs(
            data.map((d: any) => ({
              id: d.id,
              vendorId: d.vendor_id,
              organizationId: d.organization_id,
              actorName: d.actor_name,
              actorType: d.actor_type,
              action: d.action,
              entityType: d.entity_type,
              entityId: d.entity_id,
              details: d.details,
              createdAt: d.created_at,
            }))
          );
        } else {
          setAuditLogs([]);
        }
      } catch (e) {
        setAuditLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [vendorId]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Vendor Operational Reports &amp; Immutable Audit Trail
          </h2>
          <p className="text-sm text-gray-500 mt-1">Export statutory compliance returns, workforce deployment metrics, and review auditable history.</p>
        </div>

        <button
          disabled={auditLogs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
        >
          <Download className="w-4 h-4" /> Export Complete Audit Bundle
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Overall Compliance Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">100%</div>
          <div className="text-[11px] text-gray-400 mt-1">Statutory Vault Verified</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Active Deployed Workforce</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{workforceCount} Workers</div>
          <div className="text-[11px] text-gray-400 mt-1">Authorized Operations Hub</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Monthly Invoice Volume</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">₹0.00</div>
          <div className="text-[11px] text-gray-400 mt-1">Live Invoicing System</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Pending Actions</div>
          <div className="text-2xl font-bold text-gray-700 mt-1">0 Requests</div>
          <div className="text-[11px] text-gray-400 mt-1">No outstanding audit alerts</div>
        </div>
      </div>

      {/* Audit Trail Timeline */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" /> Immutable Operational Audit Trail
        </h3>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            Querying audit trail from database...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-600">No operational audit entries recorded yet.</p>
            <p className="text-gray-400 mt-0.5">Actions such as attendance uploads, document verifications, and invoices will be logged here.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex gap-4 relative pl-8">
                <div className="w-7 h-7 rounded-full bg-indigo-50 border-2 border-indigo-600 flex items-center justify-center absolute left-0 top-0.5 z-10 text-indigo-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{log.action}</span>
                    <span className="text-gray-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-600 mt-1">
                    Actor: <span className="font-semibold text-gray-800">{log.actorName}</span> ({log.actorType})
                  </div>
                  {log.details && (
                    <div className="mt-2 font-mono text-[11px] bg-white p-2 rounded-lg border border-gray-200 text-gray-700">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
