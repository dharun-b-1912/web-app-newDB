// src/features/platform/subviews/PlatformSettingsView.tsx
// ============================================================
// WorkForceOS — Platform Settings, API Keys & Webhooks Console
// ============================================================

import React, { useState } from 'react';
import {
  Key,
  Webhook,
  Sliders,
  Shield,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { platformApiKeyService, platformWebhookService } from '../../../services/platform';
import { PlatformApiKey, WebhookEndpoint, WebhookDeliveryItem } from '../../../types/platformAdmin';
import { PageHeader, EnterpriseDataTable } from '../../../components/workforce';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Tabs } from '../../../components/ui/Tabs';
import { Switch } from '../../../components/ui/Switch';

export const PlatformSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('api_keys');

  // API Keys State
  const [apiKeys, setApiKeys] = useState<PlatformApiKey[]>(() =>
    platformApiKeyService.getKeys()
  );
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyGeneratedSecret, setNewKeyGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Webhooks State
  const [endpoints] = useState<WebhookEndpoint[]>(() =>
    platformWebhookService.getEndpoints()
  );
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>(() =>
    platformWebhookService.getDeliveries()
  );

  // Maintenance State
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;

    const { key, rawSecret } = await platformApiKeyService.createApiKey({
      name: newKeyName,
      scopes: ['organizations.read', 'employees.read', 'attendance.write'],
      rate_limit_per_min: 500,
    });

    setApiKeys([key, ...apiKeys]);
    setNewKeyGeneratedSecret(rawSecret);
  };

  const handleRevokeKey = async (id: string) => {
    const updated = await platformApiKeyService.revokeApiKey(id);
    setApiKeys(apiKeys.map((k) => (k.id === id ? updated : k)));
  };

  const handleReplayWebhook = async (deliveryId: string) => {
    const updated = await platformWebhookService.replayWebhook(deliveryId);
    setDeliveries(deliveries.map((d) => (d.id === deliveryId ? updated : d)));
  };

  const keyColumns = [
    {
      id: 'name',
      header: 'Key Name & Prefix',
      sortable: true,
      accessor: (k: PlatformApiKey) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{k.name}</div>
          <div className="font-mono text-[11px] text-slate-500">
            {k.key_prefix}••••••••••••••••
          </div>
        </div>
      ),
    },
    {
      id: 'scopes',
      header: 'Assigned Scopes',
      accessor: (k: PlatformApiKey) => (
        <div className="flex gap-1 flex-wrap">
          {k.scopes.map((scope) => (
            <span
              key={scope}
              className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
            >
              {scope}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      accessor: (k: PlatformApiKey) => <StatusBadge status={k.status} size="xs" />,
    },
    {
      id: 'rate_limit',
      header: 'Rate Limit',
      accessor: (k: PlatformApiKey) => (
        <span className="font-mono text-xs text-slate-700 font-bold">
          {k.rate_limit_per_min} req/min
        </span>
      ),
    },
    {
      id: 'created',
      header: 'Created At',
      sortable: true,
      accessor: (k: PlatformApiKey) => (
        <span className="font-mono text-xs text-slate-500">{k.created_at}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right' as const,
      accessor: (k: PlatformApiKey) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {k.status === 'Active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRevokeKey(k.id)}
              className="h-7 text-xs px-2 text-red-600 hover:bg-red-50"
            >
              Revoke
            </Button>
          )}
        </div>
      ),
    },
  ];

  const deliveryColumns = [
    {
      id: 'event',
      header: 'Webhook Event',
      sortable: true,
      accessor: (d: WebhookDeliveryItem) => (
        <div>
          <div className="font-mono font-bold text-slate-900 text-xs">{d.event_type}</div>
          <div className="text-[10px] text-slate-400 font-mono">ID: {d.id}</div>
        </div>
      ),
    },
    {
      id: 'endpoint',
      header: 'Endpoint Target',
      accessor: (d: WebhookDeliveryItem) => (
        <span className="font-mono text-xs text-slate-700">{d.endpoint_id}</span>
      ),
    },
    {
      id: 'response',
      header: 'Status Code',
      sortable: true,
      accessor: (d: WebhookDeliveryItem) => (
        <StatusBadge
          status={d.http_status === 200 ? '200 OK' : `${d.http_status} Error`}
          size="xs"
        />
      ),
    },
    {
      id: 'duration',
      header: 'Latency',
      sortable: true,
      accessor: (d: WebhookDeliveryItem) => (
        <span className="font-mono text-xs text-slate-700">{d.latency_ms}ms</span>
      ),
    },
    {
      id: 'time',
      header: 'Delivered At',
      sortable: true,
      accessor: (d: WebhookDeliveryItem) => (
        <span className="font-mono text-xs text-slate-500">{d.delivered_at}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right' as const,
      accessor: (d: WebhookDeliveryItem) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReplayWebhook(d.id)}
            className="h-7 text-xs px-2"
            leftIcon={<RefreshCw className="w-3 h-3" />}
          >
            Replay
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Generate API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                  Developer Credentials
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Generate Master API Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!newKeyGeneratedSecret ? (
              <form onSubmit={handleGenerateKey} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    API Key Descriptive Identifier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Billing Sync Bot"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#047857] outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsKeyModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Create API Key
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                  <span className="font-bold block">Save your Secret Token Now!</span>
                  <p className="text-[11px] leading-relaxed">
                    This raw secret token will only be shown once. If lost, you will need to regenerate a new key.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl flex items-center justify-between gap-2 break-all">
                  <span>{newKeyGeneratedSecret}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyGeneratedSecret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsKeyModalOpen(false);
                      setNewKeyGeneratedSecret(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Platform Settings & Integrations"
        description="Manage developer REST API master keys, outbound webhook meshes, and global system maintenance toggles."
        badge={<StatusBadge status="HMAC SHA-256 Webhooks" size="xs" />}
        actions={
          activeTab === 'api_keys' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNewKeyGeneratedSecret(null);
                setNewKeyName('');
                setIsKeyModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Generate Master API Key
            </Button>
          ) : null
        }
      />

      {/* Tab Navigation */}
      <Tabs
        tabs={[
          { id: 'api_keys', label: 'REST Developer API Keys', badge: apiKeys.length },
          { id: 'webhooks', label: 'Outbound Webhook Deliveries', badge: deliveries.length },
          { id: 'maintenance', label: 'System Maintenance Controls' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'api_keys' && (
        <EnterpriseDataTable
          columns={keyColumns}
          data={apiKeys}
          keyExtractor={(k) => k.id}
          pageSize={10}
        />
      )}

      {activeTab === 'webhooks' && (
        <EnterpriseDataTable
          columns={deliveryColumns}
          data={deliveries}
          keyExtractor={(d) => d.id}
          pageSize={10}
        />
      )}

      {activeTab === 'maintenance' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-5 max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Platform Maintenance Window Toggle
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, tenants will receive a high-visibility scheduled maintenance header warning. Read-only database replica failover will be triggered.
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Scheduled Window:</span>
            <span className="font-mono font-bold text-slate-900">
              Sunday 02:00 AM – 04:00 AM IST
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
