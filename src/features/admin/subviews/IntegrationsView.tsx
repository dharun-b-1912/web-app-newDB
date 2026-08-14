import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { IntegrationItem } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GitFork, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const IntegrationsView: React.FC = () => {
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);

  useEffect(() => {
    setIntegrations(adminApi.getIntegrations());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[#07563D]" />
            <span>Integration Marketplace & Connected Adapters</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Connect external biometric hardware, banking payroll rails, Communication Hub providers, and Supabase Storage</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Browse Integration Marketplace modal opened')}>
          Browse Marketplace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="emerald" size="sm">{item.category}</Badge>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{item.name}</h3>
              </div>
              <Badge variant="emerald">{item.status}</Badge>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600">
              Last Sync: {item.last_sync_at}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
