// src/features/admin/subviews/ApiManagementView.tsx
// ============================================================
// Joy PeopleHR — Developer API Keys & Webhook Access
// Real Key Generation, Permission Scoping, and Revocation Controls
// ============================================================

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { ApiKeyItem } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Cpu, Plus, Lock, KeyRound, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const ApiManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['employees.read', 'attendance.write']);

  const refreshKeys = () => {
    setKeys(adminApi.getApiKeys());
  };

  useEffect(() => {
    refreshKeys();
  }, []);

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      showToast('Please enter an application client name', 'error');
      return;
    }

    adminApi.createApiKey(clientName.trim(), selectedScopes);
    showToast(`Generated API Key for ${clientName}`, 'success');
    setClientName('');
    setIsModalOpen(false);
    refreshKeys();
  };

  const handleRevoke = (id: string, name: string) => {
    adminApi.revokeApiKey(id);
    showToast(`Revoked API Key for ${name}`, 'info');
    refreshKeys();
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#07563D]" />
            <span>Developer API Keys, Rate Limits & Webhooks</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">REST/GraphQL API key provisioning, scope restrictions, 100 req/min rate limiting, and signed webhook dispatches</p>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-[#07563D] hover:bg-[#053e2c] text-white"
          onClick={() => setIsModalOpen(true)}
        >
          Generate API Key
        </Button>
      </div>

      {/* Keys Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs space-y-2">
            <KeyRound className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold text-gray-800">No Active API Keys</p>
            <p>Generate a scoped API key to connect external ERPs, biometric devices, or mobile applications.</p>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="mt-2">
              Create New Key
            </Button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Client / Application</th>
                <th className="p-4 font-mono">Key Prefix</th>
                <th className="p-4">Authorized Scopes</th>
                <th className="p-4 font-mono">Created Date</th>
                <th className="p-4 font-mono">Last Used</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{k.client_name}</td>
                  <td className="p-4 font-mono text-gray-700 font-bold">{k.key_prefix}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map(s => (
                        <span key={s} className="bg-gray-100 text-gray-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-gray-600 text-[11px]">{k.created_at}</td>
                  <td className="p-4 font-mono text-gray-600 text-[11px]">{k.last_used_at}</td>
                  <td className="p-4 text-center"><Badge variant="emerald">{k.status}</Badge></td>
                  <td className="p-4 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(k.id, k.client_name)}
                      className="text-red-600 hover:bg-red-50 text-xs"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate API Key Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Scoped In-Bound API Key"
        size="md"
      >
        <form onSubmit={handleGenerateKey} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-900">Application / Client Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Joy Time Tracker App / SAP Connector"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-900">Permissions & Scopes</label>
            <div className="space-y-2 border border-gray-200 p-3 rounded-xl bg-gray-50/60 max-h-40 overflow-y-auto text-xs">
              {[
                { id: 'employees.read', label: 'employees.read — Read employee profiles and organization taxonomy' },
                { id: 'attendance.write', label: 'attendance.write — Push biometric punches and mobile attendance' },
                { id: 'leave.write', label: 'leave.write — Submit and approve employee leave requests' },
                { id: 'payroll.read', label: 'payroll.read — Export finalized salary registers and tax slips' },
                { id: 'vendors.read', label: 'vendors.read — Query contractor manpower deployments' },
              ].map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    className="w-4 h-4 text-[#07563D] rounded border-gray-300"
                  />
                  <span className="text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="bg-[#07563D] hover:bg-[#053e2c] text-white"
            >
              Generate Live Key
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
