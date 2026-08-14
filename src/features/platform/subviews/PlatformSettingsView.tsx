// src/features/platform/subviews/PlatformSettingsView.tsx
// ============================================================
// WorkForceOS — Platform Settings, API Keys & Webhooks Console
// ============================================================

import React, { useState } from 'react';
import { Key, Webhook, Sliders, Shield, Plus, Copy, Check, RefreshCw, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { platformApiKeyService, platformWebhookService } from '../../../services/platform';
import { PlatformApiKey, WebhookEndpoint, WebhookDeliveryItem } from '../../../types/platformAdmin';

export const PlatformSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api_keys' | 'webhooks' | 'maintenance'>('api_keys');

  // API Keys State
  const [apiKeys, setApiKeys] = useState<PlatformApiKey[]>(() => platformApiKeyService.getKeys());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyGeneratedSecret, setNewKeyGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Webhooks State
  const [endpoints] = useState<WebhookEndpoint[]>(() => platformWebhookService.getEndpoints());
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>(() => platformWebhookService.getDeliveries());

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
    setApiKeys(apiKeys.map(k => (k.id === id ? updated : k)));
  };

  const handleReplayWebhook = async (deliveryId: string) => {
    const updated = await platformWebhookService.replayWebhook(deliveryId);
    setDeliveries(deliveries.map(d => (d.id === deliveryId ? updated : d)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              Platform Configurations
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">HMAC SHA-256 Webhooks</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Settings & Integrations</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage developer REST API master keys, outbound webhook meshes, and global system maintenance toggles.
          </p>
        </div>

        {activeTab === 'api_keys' && (
          <button
            onClick={() => {
              setNewKeyGeneratedSecret(null);
              setNewKeyName('');
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Master API Key
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-2xl shadow-2xs gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('api_keys')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'api_keys' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          REST Developer API Keys ({apiKeys.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'webhooks' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Outbound Webhook Mesh ({endpoints.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`py-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'maintenance' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Maintenance Mode & Global Switches
        </button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === 'api_keys' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-900">Active REST Master API Keys</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Key Prefix</th>
                  <th className="py-3 px-4">Authorized Scopes</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {apiKeys.map(k => (
                  <tr key={k.id} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{k.name}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 font-bold">{k.key_prefix}...</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {k.scopes.map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded-md font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{k.rate_limit_per_min} req/min</td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">{k.last_used_at || 'Never'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        k.status === 'Active' ? 'bg-emerald-100 text-[#07563D]' : 'bg-red-100 text-red-800'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {k.status === 'Active' && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-red-200"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900">Registered Webhook Endpoints</h3>
            <div className="space-y-3">
              {endpoints.map(ep => (
                <div key={ep.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{ep.tenant_name}</span>
                      <span className="font-mono text-emerald-700 font-bold">{ep.url}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{ep.description}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {ep.events.map(ev => (
                        <span key={ev} className="px-2 py-0.5 bg-emerald-50 text-[#07563D] text-[10px] rounded-md font-mono font-bold">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right font-mono text-gray-700">
                    <div className="font-bold text-emerald-700">{ep.success_rate_pct}% Success</div>
                    <div className="text-[10px] text-gray-400">Last delivery: {ep.last_delivery_at}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900">Recent Webhook Deliveries & Replay Desk</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">HTTP Status</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Delivered At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Replay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {deliveries.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{d.event_type}</td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-700">{d.http_status}</td>
                      <td className="py-3 px-4 font-mono">{d.latency_ms}ms</td>
                      <td className="py-3 px-4 text-gray-500 text-[11px] font-mono">{d.delivered_at}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleReplayWebhook(d.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-[#07563D] transition-colors cursor-pointer"
                          title="Replay Event"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Platform Maintenance Mode</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Displays a friendly maintenance banner across tenant portals while Super Admins perform database migrations.
              </p>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all cursor-pointer ${
                maintenanceMode ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 text-xs">
            <h3 className="text-lg font-black text-gray-900">Generate Master REST API Key</h3>

            {!newKeyGeneratedSecret ? (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Key Description Name *</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. SAP Integration Server Key"
                    className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsKeyModalOpen(false)} className="px-4 py-2 font-bold text-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-[#07563D] text-white rounded-xl font-bold cursor-pointer">
                    Generate Key Secret
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                  <strong>Save this secret now!</strong> It will never be shown again in plain text.
                </div>

                <div className="p-3 bg-gray-950 text-emerald-400 font-mono text-xs rounded-xl flex items-center justify-between">
                  <span className="break-all">{newKeyGeneratedSecret}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKeyGeneratedSecret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-300 ml-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setIsKeyModalOpen(false);
                      setNewKeyGeneratedSecret(null);
                    }}
                    className="px-5 py-2 bg-gray-900 text-white rounded-xl font-bold cursor-pointer"
                  >
                    I Have Saved My Secret
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
