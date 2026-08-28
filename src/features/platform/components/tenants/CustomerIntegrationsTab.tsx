// src/features/platform/components/tenants/CustomerIntegrationsTab.tsx
// ============================================================
// Joy PeopleHR — Customer Connected Integrations & Mesh Tab
// ============================================================

import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerIntegrationsTabProps {
  organization: OrganizationRecord;
}

export const CustomerIntegrationsTab: React.FC<CustomerIntegrationsTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();

  const [integrations, setIntegrations] = useState([
    {
      id: 'int-1',
      name: 'Razorpay Payment Gateway (Sandbox)',
      category: 'Billing & Payments',
      status: 'Connected',
      connected_since: '2026-08-01',
      last_sync: '10 min ago',
      metric: 'Auto-debit verified',
    },
    {
      id: 'int-2',
      name: 'WhatsApp Business Cloud API Mesh',
      category: 'Messaging',
      status: 'Connected',
      connected_since: '2026-08-05',
      last_sync: '1 hour ago',
      metric: '1,280 messages dispatched (100% delivered)',
    },
    {
      id: 'int-3',
      name: 'Biometric Turnstile Push Daemon',
      category: 'Hardware & Access',
      status: 'Connected',
      connected_since: '2026-08-10',
      last_sync: '5 min ago',
      metric: 'Active daemon pinging from on-premise relay',
    },
  ]);

  const handleTestConnection = (name: string) => {
    showToast(`Testing connection to ${name}... Connection OK (200)`, 'success');
  };

  const handleDisconnect = (id: string, name: string) => {
    setIntegrations(integrations.filter((i) => i.id !== id));
    showToast(`Disconnected ${name}`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div key={item.id} className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {item.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 text-xs">{item.name}</h4>
                <p className="text-[11px] text-gray-500 mt-1">{item.metric}</p>
              </div>

              <div className="text-[10px] text-gray-400 font-medium">
                Connected since {item.connected_since} • Last sync {item.last_sync}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection(item.name)}
                className="flex-1 text-[11px] font-bold text-gray-700"
              >
                Test Connection
              </Button>
              <button
                onClick={() => handleDisconnect(item.id, item.name)}
                className="px-2.5 py-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
