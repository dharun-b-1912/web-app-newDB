// src/features/vendor/components/VendorAssetAllocationTab.tsx
// ============================================================================
// Joy PeopleHR — Vendor Worker Asset Allocation & Equipment Tracking Component
// Manages asset issuance, category tagging, serial numbers, and return workflows
// ============================================================================

import React, { useState } from 'react';
import { Package, Plus, CheckCircle2, ShieldAlert, ArrowLeftRight, Search } from 'lucide-react';

export interface VendorWorkerAsset {
  id: string;
  workerName: string;
  workerCode: string;
  assetName: string;
  category: 'UNIFORM_SAFETY' | 'HARDWARE' | 'ID_BADGE' | 'TOOL_EQUIPMENT' | 'OTHER';
  serialNumber?: string;
  issuedDate: string;
  returnDate?: string;
  status: 'ISSUED' | 'RETURNED' | 'DAMAGED' | 'LOST';
}

interface VendorAssetAllocationTabProps {
  workers?: Array<{ code: string; name: string }>;
}

export const VendorAssetAllocationTab: React.FC<VendorAssetAllocationTabProps> = ({ workers = [] }) => {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Zero-mock policy: Assets list starts empty and populates dynamically
  const [assets, setAssets] = useState<VendorWorkerAsset[]>([]);

  // Form State
  const [workerName, setWorkerName] = useState(workers[0]?.name || '');
  const [workerCode, setWorkerCode] = useState(workers[0]?.code || '');
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState<VendorWorkerAsset['category']>('UNIFORM_SAFETY');
  const [serialNumber, setSerialNumber] = useState('');

  const handleIssueAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;

    const newAsset: VendorWorkerAsset = {
      id: `ast-${Date.now()}`,
      workerName: workerName || 'Assigned Staff',
      workerCode: workerCode || 'N/A',
      assetName,
      category,
      serialNumber,
      issuedDate: new Date().toISOString().split('T')[0],
      status: 'ISSUED',
    };

    setAssets([newAsset, ...assets]);
    setIsIssueModalOpen(false);
    setAssetName('');
    setSerialNumber('');
  };

  const handleStatusChange = (id: string, newStatus: VendorWorkerAsset['status']) => {
    setAssets(
      assets.map((a) =>
        a.id === id
          ? {
              ...a,
              status: newStatus,
              returnDate: newStatus === 'RETURNED' ? new Date().toISOString().split('T')[0] : a.returnDate,
            }
          : a
      )
    );
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Vendor Worker Asset Allocation
          </h2>
          <p className="text-sm text-gray-500 mt-1">Track safety gear, uniforms, RFID badges, and equipment allocated to contractor workforce.</p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Issue Asset to Worker
        </button>
      </div>

      {/* Filter Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search worker name, asset name, or serial number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Assets Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="py-3.5 px-4">Worker</th>
                <th className="py-3.5 px-4">Asset Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Serial Number</th>
                <th className="py-3.5 px-4">Issued Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-gray-700">No assets currently allocated</p>
                    <p className="text-xs text-gray-400 mt-1">Issue assets such as uniforms, RFID badges, and safety equipment to active workers.</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{ast.workerName}</div>
                      <div className="text-xs text-gray-400 font-mono">{ast.workerCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">{ast.assetName}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-600">{ast.category}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-600">{ast.serialNumber || '—'}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">{ast.issuedDate}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ast.status === 'ISSUED'
                            ? 'bg-blue-100 text-blue-800'
                            : ast.status === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ast.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ast.status === 'ISSUED' && (
                        <button
                          onClick={() => handleStatusChange(ast.id, 'RETURNED')}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                        >
                          Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleIssueAsset} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900">Issue Asset to Vendor Worker</h3>
              <button type="button" onClick={() => setIsIssueModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-gray-700">Worker</label>
                {workers.length > 0 ? (
                  <select
                    value={workerCode}
                    onChange={(e) => {
                      const sel = workers.find((w) => w.code === e.target.value);
                      if (sel) {
                        setWorkerCode(sel.code);
                        setWorkerName(sel.name);
                      }
                    }}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  >
                    {workers.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Worker Name & Code"
                    value={workerName}
                    onChange={(e) => {
                      setWorkerName(e.target.value);
                      setWorkerCode('EXT-01');
                    }}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  />
                )}
              </div>

              <div>
                <label className="text-gray-700">Asset Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Safety Helmet & Boots"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-gray-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                >
                  <option value="UNIFORM_SAFETY">Uniform & Safety Gear</option>
                  <option value="ID_BADGE">ID Badge & RFID Access</option>
                  <option value="TOOL_EQUIPMENT">Tools & Equipment</option>
                  <option value="HARDWARE">Hardware / IT Device</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-gray-700">Serial / Barcode Number</label>
                <input
                  type="text"
                  placeholder="e.g. S-994821"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsIssueModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                Confirm Issue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
