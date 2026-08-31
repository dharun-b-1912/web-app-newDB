import React from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Badge } from '../../../components/ui/Badge';
import { VendorAuditLog } from '../../../types/vendorPortal';
import { History, Clock, User } from 'lucide-react';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: VendorAuditLog[];
  title?: string;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  title = 'Vendor Audit & Governance Trail',
}) => {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">
              Immutable Enterprise Audit Records ({logs.length})
            </span>
          </div>
          <Badge variant="outline" size="sm">
            Zero Tampering
          </Badge>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            No audit records registered for current selection.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" size="sm">
                      {log.entity_type}
                    </Badge>
                    <span className="font-bold text-xs text-gray-900 font-mono">
                      {log.action}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] text-gray-400 gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.performed_at).toLocaleString()}</span>
                  </div>
                </div>

                {log.remarks && (
                  <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    {log.remarks}
                  </p>
                )}

                {(log.previous_value || log.new_value) && (
                  <div className="text-[11px] font-mono grid grid-cols-2 gap-2 bg-gray-900 text-gray-200 p-2.5 rounded-lg">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">Previous Value</span>
                      <div className="truncate text-rose-300">{log.previous_value || 'None'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase">New Value</span>
                      <div className="truncate text-emerald-300">{log.new_value || 'None'}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      Performed by: <strong>{log.performed_by}</strong> ({log.role})
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">ID: {log.entity_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
