import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { ApiKeyItem } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Cpu, Plus, Lock, KeyRound } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const ApiManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);

  useEffect(() => {
    setKeys(adminApi.getApiKeys());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#07563D]" />
            <span>Developer API Keys, Rate Limits & Signed Webhooks</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">REST/GraphQL API key provisioning, scope restrictions, 100 req/min rate limiting, and signed webhook dispatches</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Generate API Key modal opened')}>
          Generate API Key
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Client Name</th>
              <th className="p-4 font-mono">Key Prefix</th>
              <th className="p-4">API Scopes</th>
              <th className="p-4 font-mono">Created At</th>
              <th className="p-4 font-mono">Last Used</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {keys.map(k => (
              <tr key={k.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">{k.client_name}</td>
                <td className="p-4 text-gray-700 font-bold">{k.key_prefix}</td>
                <td className="p-4 font-sans text-gray-700">{k.scopes.join(', ')}</td>
                <td className="p-4 text-gray-600">{k.created_at}</td>
                <td className="p-4 text-gray-600">{k.last_used_at}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{k.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
