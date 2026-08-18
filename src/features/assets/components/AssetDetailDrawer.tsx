import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { assetAssignmentService } from '../../../services/asset/assetAssignmentService';
import { assetMaintenanceService } from '../../../services/asset/assetMaintenanceService';
import { assetTransferService } from '../../../services/asset/assetTransferService';
import { assetAuditService } from '../../../services/asset/assetAuditService';
import { UniversalAsset, AssetCondition } from '../../../types';
import {
  X,
  Package,
  QrCode,
  Calendar,
  DollarSign,
  UserCheck,
  RotateCcw,
  Wrench,
  Truck,
  History,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

interface AssetDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: UniversalAsset | null;
  onRefresh: () => void;
  onOpenAssign: (asset: UniversalAsset) => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({
  isOpen,
  onClose,
  asset,
  onRefresh,
  onOpenAssign,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'maintenance' | 'transfers' | 'audit'>('overview');
  const [returnCondition, setReturnCondition] = useState<AssetCondition>('GOOD');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);

  if (!isOpen || !asset) return null;

  const handleReturn = () => {
    try {
      assetAssignmentService.returnAsset({
        assetId: asset.id,
        conditionAtReturn: returnCondition,
        notes: returnNotes,
      });
      showToast('Asset returned to pool successfully.', 'success');
      setIsReturnModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to return asset.', 'error');
    }
  };

  const assignments = assetAssignmentService.getAssignments(asset.id);
  const maintenanceRecords = assetMaintenanceService.getMaintenanceRecords(asset.id);
  const transfers = assetTransferService.getTransfers(asset.id);
  const auditLogs = assetAuditService.getLogs(asset.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-[#07563D]/10 text-[#07563D] rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900 line-clamp-1">{asset.asset_name}</h2>
                <Badge variant={asset.status === 'AVAILABLE' ? 'emerald' : asset.status === 'ASSIGNED' ? 'blue' : 'amber'}>
                  {asset.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Code: <strong className="text-gray-900 font-mono">{asset.asset_code}</strong> • Type: {asset.asset_type_code}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Current Custodian:</span>
            <span className="font-mono text-gray-900">{asset.custodian_name || 'Unassigned (Pool)'}</span>
          </div>

          <div className="flex items-center gap-2">
            {asset.status === 'AVAILABLE' ? (
              <Button
                size="sm"
                onClick={() => onOpenAssign(asset)}
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs h-7"
              >
                Assign Asset
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReturnModalOpen(true)}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                Check-in / Return
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 flex items-center gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'assignments'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Custody History ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'maintenance'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Maintenance ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Primary Specs Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Serial Number / Asset Tag</span>
                  <span className="font-extrabold text-gray-900 font-mono mt-0.5 block">{asset.serial_number || 'N/A'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Current Condition</span>
                  <Badge variant="emerald" className="mt-0.5">{asset.condition}</Badge>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Purchase Valuation</span>
                  <span className="font-extrabold text-gray-900 font-mono mt-0.5 block">
                    ${asset.purchase_price.toLocaleString()} {asset.currency}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Warranty Expiration</span>
                  <span className="font-extrabold text-gray-900 font-mono mt-0.5 block">
                    {asset.warranty_end || 'Lifetime / N/A'}
                  </span>
                </div>
              </div>

              {/* Dynamic Custom Attributes */}
              {asset.custom_attributes && Object.keys(asset.custom_attributes).length > 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <Cpu className="w-4 h-4 text-[#07563D]" />
                    Custom Industry Specifications
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(asset.custom_attributes).map(([k, v]) => (
                      <div key={k} className="p-2 bg-white rounded-lg border border-gray-100 font-mono text-[11px]">
                        <span className="text-gray-400 capitalize block">{k.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-gray-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital QR Code Token Card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-extrabold">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    Asset Mobile QR Code
                  </div>
                  <p className="text-[11px] font-mono text-emerald-800">{asset.qr_code}</p>
                  <p className="text-[10px] text-emerald-600">Scan via WorkforceOS mobile client for quick check-in / check-out.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNMENT HISTORY */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custody & Assignment Log</h3>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No assignment records yet.</div>
              ) : (
                assignments.map(asgn => (
                  <div key={asgn.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{asgn.target_name} ({asgn.target_type})</span>
                      <Badge variant={asgn.status === 'ACTIVE' ? 'blue' : 'neutral'}>{asgn.status}</Badge>
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      Assigned by <strong>{asgn.assigned_by_name}</strong> on {new Date(asgn.assigned_at).toLocaleDateString()}
                    </p>
                    {asgn.purpose && <p className="text-gray-600 text-[11px] italic">"{asgn.purpose}"</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Service & Maintenance Records</h3>
              {maintenanceRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No maintenance records logged.</div>
              ) : (
                maintenanceRecords.map(m => (
                  <div key={m.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{m.title} ({m.maintenance_type})</span>
                      <Badge variant={m.status === 'COMPLETED' ? 'emerald' : 'amber'}>{m.status}</Badge>
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      Scheduled: {m.scheduled_date} • Technician: {m.technician_name || 'In-house IT'}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Immutable Asset Audit History</h3>
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No audit events recorded.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600">Actor: <strong>{log.actor_name}</strong></p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Check-in Return Modal */}
        {isReturnModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-6 h-6 text-[#07563D] shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Check-in Asset to Pool</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Inspect physical/operational condition before returning to available inventory pool.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Inspected Condition *
                </label>
                <select
                  value={returnCondition}
                  onChange={e => setReturnCondition(e.target.value as AssetCondition)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
                >
                  <option value="EXCELLENT">Excellent (Like New)</option>
                  <option value="GOOD">Good / Normal Wear</option>
                  <option value="FAIR">Fair (Operational)</option>
                  <option value="DAMAGED">Damaged (Requires Repair / Recovery)</option>
                  <option value="CRITICAL">Critical / Missing Parts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="e.g. Scratches on back casing, tested all ports OK."
                  className="w-full border border-gray-300 rounded-xl p-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsReturnModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReturn} className="bg-[#07563D] text-white">
                  Confirm Return
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
