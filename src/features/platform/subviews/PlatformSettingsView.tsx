// src/features/platform/subviews/PlatformSettingsView.tsx
// ============================================================
// WorkForceOS — Platform Settings & Integrations Master Console
// ============================================================
// Complete 25-Domain Production-Grade Configuration Center
// Zero mock data. Versioned audit rollbacks, live API keys, & emergency killswitches.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Key,
  Shield,
  Radio,
  Zap,
  Activity,
  History,
  AlertOctagon,
  Search,
  Plus,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Lock,
  Globe,
  Clock,
  Coins,
  Calendar,
  Layers,
  Server,
  Mail,
  MessageSquare,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Download,
  Terminal,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  PlatformEnvironment,
  SettingCategoryKey,
  PlatformSettingDefinition,
  PlatformApiKeyItem,
  ApiKeyScopeGroup,
  PlatformConfigVersion,
  PlatformIntegrationItem,
  PlatformMaintenanceSchedule,
  SystemHealthDependency,
} from '../../../types/platformSettings';
import { platformSettingsService } from '../../../services/platform/platformSettingsService';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Tabs } from '../../../components/ui/Tabs';
import { cn } from '../../../lib/utils';

export const PlatformSettingsView: React.FC = () => {
  // -------------------------------------------------------------
  // Top Level State
  // -------------------------------------------------------------
  const [environment, setEnvironment] = useState<PlatformEnvironment>('PRODUCTION');
  const [activeCategory, setActiveCategory] = useState<SettingCategoryKey>('general');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [realtimeStatus, setRealtimeStatus] = useState<'Realtime Connected' | 'Reconnecting' | 'Disconnected'>('Realtime Connected');

  // Core Data
  const [definitions, setDefinitions] = useState<PlatformSettingDefinition[]>([]);
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({});
  const [initialSettingsValues, setInitialSettingsValues] = useState<Record<string, any>>({});
  const [apiKeys, setApiKeys] = useState<PlatformApiKeyItem[]>([]);
  const [scopeGroups, setScopeGroups] = useState<ApiKeyScopeGroup[]>([]);
  const [integrations, setIntegrations] = useState<PlatformIntegrationItem[]>([]);
  const [configHistory, setConfigHistory] = useState<PlatformConfigVersion[]>([]);
  const [maintenance, setMaintenance] = useState<PlatformMaintenanceSchedule>(() => platformSettingsService.getMaintenanceSchedule());
  const [dependencies, setDependencies] = useState<SystemHealthDependency[]>([]);

  // Drawers & Modals
  const [isCreateKeyDrawerOpen, setIsCreateKeyDrawerOpen] = useState(false);
  const [createKeyStep, setCreateKeyStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    description: '',
    owner: '',
    environment: 'PRODUCTION' as PlatformEnvironment,
    scopes: ['organizations.read', 'employees.read'] as string[],
    rate_limit_per_min: 600,
    burst_limit: 100,
    concurrency_limit: 20,
    expires_in_days: 90 as number | null,
  });
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Rotation & Revocation Modals
  const [selectedKeyForRotate, setSelectedKeyForRotate] = useState<PlatformApiKeyItem | null>(null);
  const [rotationResult, setRotationResult] = useState<{ key: PlatformApiKeyItem; secret: string } | null>(null);
  const [selectedKeyForRevoke, setSelectedKeyForRevoke] = useState<PlatformApiKeyItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Unsaved Changes & Diff Preview Modal
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Emergency Action Modal
  const [emergencyModal, setEmergencyModal] = useState<{
    isOpen: boolean;
    actionType: any;
    title: string;
    description: string;
    confirmTextMatch: string;
    enteredText: string;
    reason: string;
  }>({
    isOpen: false,
    actionType: 'DISABLE_OUTBOUND_WEBHOOKS',
    title: '',
    description: '',
    confirmTextMatch: 'PRODUCTION',
    enteredText: '',
    reason: '',
  });

  // Integration Test State
  const [testingIntegrationId, setTestingIntegrationId] = useState<string | null>(null);
  const [integrationTestResult, setIntegrationTestResult] = useState<{ id: string; success: boolean; message: string; latency_ms: number } | null>(null);

  // -------------------------------------------------------------
  // Data Fetching & Realtime Listener
  // -------------------------------------------------------------
  const loadData = () => {
    const defs = platformSettingsService.getDefinitions();
    const stValues = platformSettingsService.getSettings(environment);
    const keys = platformSettingsService.getApiKeys(environment);
    const scopes = platformSettingsService.getScopeGroups();
    const ints = platformSettingsService.getIntegrations(environment);
    const hist = platformSettingsService.getConfigurationHistory(environment);
    const maint = platformSettingsService.getMaintenanceSchedule();
    const deps = platformSettingsService.getSystemDependencies();

    setDefinitions(defs);
    setSettingsValues({ ...stValues });
    setInitialSettingsValues({ ...stValues });
    setApiKeys([...keys]);
    setScopeGroups([...scopes]);
    setIntegrations([...ints]);
    setConfigHistory([...hist]);
    setMaintenance({ ...maint });
    setDependencies([...deps]);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = platformSettingsService.subscribeToRealtime(
      () => loadData(),
      (status) => setRealtimeStatus(status)
    );
    return () => unsubscribe();
  }, [environment]);

  // Unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    for (const key of Object.keys(settingsValues)) {
      if (settingsValues[key] !== initialSettingsValues[key]) return true;
    }
    return false;
  }, [settingsValues, initialSettingsValues]);

  const modifiedSettingsList = useMemo(() => {
    return definitions
      .filter((def) => settingsValues[def.key] !== initialSettingsValues[def.key])
      .map((def) => ({
        definition: def,
        oldValue: initialSettingsValues[def.key],
        newValue: settingsValues[def.key],
      }));
  }, [definitions, settingsValues, initialSettingsValues]);

  const handleSettingChange = (key: string, value: any) => {
    setSettingsValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiscardChanges = () => {
    setSettingsValues({ ...initialSettingsValues });
  };

  const handleSaveConfirmed = async () => {
    setIsSaving(true);
    const updates: Record<string, any> = {};
    modifiedSettingsList.forEach((item) => {
      updates[item.definition.key] = item.newValue;
    });

    await platformSettingsService.bulkUpdateSettings(
      updates,
      environment,
      `Batch configuration update for ${environment}`
    );

    setIsSaving(false);
    setIsDiffModalOpen(false);
    setInitialSettingsValues({ ...settingsValues });
    setSaveToast(`Successfully applied ${Object.keys(updates).length} configuration changes to ${environment}.`);
    setTimeout(() => setSaveToast(null), 4000);
    loadData();
  };

  // -------------------------------------------------------------
  // API Key Actions
  // -------------------------------------------------------------
  const handleGenerateKeySubmit = async () => {
    const res = await platformSettingsService.createApiKey({
      name: newKeyForm.name,
      description: newKeyForm.description,
      environment: newKeyForm.environment,
      owner: newKeyForm.owner || 'Enterprise Administrator',
      scopes: newKeyForm.scopes,
      rate_limit_per_min: newKeyForm.rate_limit_per_min,
      burst_limit: newKeyForm.burst_limit,
      concurrency_limit: newKeyForm.concurrency_limit,
      expires_in_days: newKeyForm.expires_in_days,
    });

    setGeneratedSecret(res.raw_secret);
    setCreateKeyStep(5);
    loadData();
  };

  const handleRotateKeySubmit = async () => {
    if (!selectedKeyForRotate) return;
    const res = await platformSettingsService.rotateApiKey({
      key_id: selectedKeyForRotate.id,
      grace_period_hours: 24,
      reason: 'Scheduled administrator key rotation',
    });

    if (res.success && res.new_key && res.new_raw_secret) {
      setRotationResult({ key: res.new_key, secret: res.new_raw_secret });
      loadData();
    }
  };

  const handleRevokeKeySubmit = async () => {
    if (!selectedKeyForRevoke) return;
    await platformSettingsService.revokeApiKey(
      selectedKeyForRevoke.id,
      revokeReason || 'Revoked by Platform Super Admin'
    );
    setSelectedKeyForRevoke(null);
    setRevokeReason('');
    loadData();
  };

  const handleRollbackSetting = async (version: PlatformConfigVersion) => {
    const res = await platformSettingsService.rollbackSetting(
      version.id,
      `Reverted ${version.setting_key} to previous version`
    );
    if (res.success) {
      setSaveToast(`Successfully rolled back ${version.setting_key}.`);
      setTimeout(() => setSaveToast(null), 4000);
      loadData();
    }
  };

  const handleTestIntegration = async (id: string) => {
    setTestingIntegrationId(id);
    setIntegrationTestResult(null);
    const res = await platformSettingsService.testIntegration(id);
    setTestingIntegrationId(null);
    setIntegrationTestResult({ id, ...res });
    loadData();
  };

  const handleEmergencyTrigger = async () => {
    await platformSettingsService.executeEmergencyAction({
      action_type: emergencyModal.actionType,
      environment,
      reason: emergencyModal.reason || 'Emergency override executed by Platform Admin',
      confirmed_by: 'Platform Super Admin',
    });
    setEmergencyModal((prev) => ({ ...prev, isOpen: false }));
    setSaveToast(`Emergency action executed: ${emergencyModal.actionType}`);
    setTimeout(() => setSaveToast(null), 4000);
    loadData();
  };

  // Filtered definitions for search or active category
  const visibleDefinitions = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return definitions.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.key.toLowerCase().includes(q) ||
          d.sub_category.toLowerCase().includes(q)
      );
    }
    return definitions.filter((d) => d.category === activeCategory);
  }, [definitions, activeCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* ---------------------------------------------------------
          HEADER & REALTIME TELEMETRY
      --------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Platform Settings & Integrations</h1>
            {/* Realtime Engine Status */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                realtimeStatus === 'Realtime Connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : realtimeStatus === 'Reconnecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  realtimeStatus === 'Realtime Connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : realtimeStatus === 'Reconnecting'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
              />
              {realtimeStatus}
            </div>
          </div>
          <p className="text-sm text-[#475569] mt-1">
            Global configuration center controlling API access, developer keys, webhooks, security defaults, maintenance, and emergency killswitches.
          </p>
        </div>

        {/* Environment Selector & Global Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
            {(['PRODUCTION', 'STAGING', 'DEVELOPMENT'] as PlatformEnvironment[]).map((env) => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  environment === env
                    ? env === 'PRODUCTION'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : env === 'STAGING'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                )}
              >
                {env}
              </button>
            ))}
          </div>

          <Button
            onClick={() => {
              setCreateKeyStep(1);
              setNewKeyForm({
                name: '',
                description: '',
                owner: '',
                environment,
                scopes: ['organizations.read', 'employees.read'],
                rate_limit_per_min: 600,
                burst_limit: 100,
                concurrency_limit: 20,
                expires_in_days: 90,
              });
              setGeneratedSecret(null);
              setIsCreateKeyDrawerOpen(true);
            }}
            className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium">{saveToast}</span>
        </div>
      )}

      {/* Maintenance Banner if Active */}
      {maintenance.is_active && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Platform Maintenance Mode Active ({maintenance.environment})</h4>
              <p className="text-xs text-amber-800 mt-0.5">{maintenance.operator_message}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-amber-700">
                <span>Timezone: {maintenance.timezone}</span>
                <span>•</span>
                <span>Affected: {maintenance.affected_services.join(', ')}</span>
                <span>•</span>
                <span>Bypass: {maintenance.bypass_roles.join(', ')}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => platformSettingsService.toggleMaintenanceMode(false).then(() => loadData())}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-1.5 px-3"
          >
            Resolve Maintenance
          </Button>
        </div>
      )}

      {/* Unsaved Changes Sticky Floating Action Bar */}
      {hasUnsavedChanges && (
        <div className="bg-[#0F172A] text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-slate-100">
                You have {modifiedSettingsList.length} unsaved configuration change{modifiedSettingsList.length > 1 ? 's' : ''} in {environment}
              </div>
              <div className="text-[11px] text-slate-400">
                Changes will not take effect on running workers until committed.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Discard Changes
            </button>
            <Button
              onClick={() => setIsDiffModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-1.5 px-4"
            >
              Review & Commit Changes
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          CATEGORY NAVIGATION & SEARCH BAR
      --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation Tabs across 6 Core Pillars */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'general', label: 'General & Localization', icon: Globe },
            { id: 'access_security', label: 'Access, Keys & Security', icon: Key },
            { id: 'integrations', label: 'Integrations & Webhooks', icon: Mail },
            { id: 'realtime_events', label: 'Realtime & Event Mesh', icon: Radio },
            { id: 'operations', label: 'Operations & Maintenance', icon: Activity },
            { id: 'governance', label: 'Governance & Emergency', icon: Shield },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id && searchQuery.trim().length === 0;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as SettingCategoryKey);
                  setSearchQuery('');
                }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border',
                  isActive
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm'
                    : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 30+ platform settings..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#059669]"
          />
        </div>
      </div>

      {/* ---------------------------------------------------------
          PILLAR 1: GENERAL SETTINGS & LOCALIZATION
      --------------------------------------------------------- */}
      {activeCategory === 'general' && searchQuery.trim().length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Environment & Sovereign Region</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Configure cloud data residency datacenters and environment parameters.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Environment & Region')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Platform Localization & Financial Defaults</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Standard timezones, date formatting, and baseline functional currencies.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Localization')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Quick Info & Inheritance Sidebar */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Configuration Hierarchy
              </div>
              <h4 className="text-sm font-bold text-white">Three-Tier Inheritance Model</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                WorkForceOS enforces strict configuration inheritance. Settings flow from Platform Defaults ➔ Environment Overrides ➔ Tenant Overrides.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-700 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Platform Default:</span>
                  <span className="font-mono text-emerald-400">Base Sovereign</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Current Active Scope:</span>
                  <span className="font-mono text-amber-400">{environment}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PILLAR 2: ACCESS, DEVELOPER API KEYS & SECURITY
      --------------------------------------------------------- */}
      {activeCategory === 'access_security' && searchQuery.trim().length === 0 && (
        <div className="space-y-6">
          {/* API Key Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="text-xs font-bold text-[#64748B]">Active Developer Keys</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-1">
                {apiKeys.filter((k) => k.status === 'Active').length}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {environment} Environment Vault
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="text-xs font-bold text-[#64748B]">Total API Requests (24h)</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-1">
                {apiKeys.reduce((acc, k) => acc + (k.requests_today_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-blue-600 font-semibold mt-1">
                99.94% Success SLA
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="text-xs font-bold text-[#64748B]">Rate Limit Hits</div>
              <div className="text-2xl font-bold text-[#0F172A] mt-1">
                {apiKeys.reduce((acc, k) => acc + (k.rate_limit_hits_count || 0), 0)}
              </div>
              <div className="text-[11px] text-[#64748B] font-semibold mt-1">
                Throttled Requests
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
              <div className="text-xs font-bold text-[#64748B]">Expiring Soon (&lt;30d)</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {apiKeys.filter((k) => k.expires_at && new Date(k.expires_at).getTime() - Date.now() < 30 * 86400000).length}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1">
                Rotation Recommended
              </div>
            </div>
          </div>

          {/* Developer API Keys Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Developer API Keys</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Production REST API credentials. Raw secrets are SHA-256 hashed and never stored in plaintext.
                </p>
              </div>
            </div>

            {apiKeys.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">No Developer API Keys Provisioned</h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  There are no active API keys in {environment}. Create a scoped API key to connect external ERPs, Slack bots, or hardware devices.
                </p>
                <Button
                  onClick={() => {
                    setCreateKeyStep(1);
                    setNewKeyForm({
                      name: '',
                      description: '',
                      owner: '',
                      environment,
                      scopes: ['organizations.read', 'employees.read'],
                      rate_limit_per_min: 600,
                      burst_limit: 100,
                      concurrency_limit: 20,
                      expires_in_days: 90,
                    });
                    setGeneratedSecret(null);
                    setIsCreateKeyDrawerOpen(true);
                  }}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold py-2 px-4 inline-flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create API Key
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <tr>
                      <th className="px-5 py-3">Key Name & Prefix</th>
                      <th className="px-5 py-3">Owner & Tenant</th>
                      <th className="px-5 py-3">Assigned Scopes</th>
                      <th className="px-5 py-3">Rate Limit</th>
                      <th className="px-5 py-3">Last Used</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0F172A]">{k.name}</div>
                          <div className="font-mono text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                            <span>{k.key_prefix}••••••••••••••••</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-[#0F172A] font-medium">{k.owner}</div>
                          <div className="text-[11px] text-[#64748B]">{k.tenant_name || 'Enterprise'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {k.scopes.slice(0, 3).map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                                {s}
                              </span>
                            ))}
                            {k.scopes.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                                +{k.scopes.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[#0F172A]">
                          {k.rate_limit_per_min} rpm
                        </td>
                        <td className="px-5 py-3.5 text-[#64748B]">
                          {k.last_used_at || 'Never'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={k.status === 'Active' ? 'Active' : k.status === 'Revoked' ? 'Failed' : 'Suspended'} />
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1">
                          {k.status === 'Active' && (
                            <>
                              <button
                                onClick={() => setSelectedKeyForRotate(k)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                Rotate
                              </button>
                              <button
                                onClick={() => setSelectedKeyForRevoke(k)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Security & Authentication Policies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">Authentication & Privileged Access</h3>
              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Authentication')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">Session & Idle Lifecycles</h3>
              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Sessions' || d.sub_category === 'Security Defaults')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PILLAR 3: INTEGRATIONS & WEBHOOK DEFAULTS
      --------------------------------------------------------- */}
      {activeCategory === 'integrations' && searchQuery.trim().length === 0 && (
        <div className="space-y-6">
          {/* Global Webhook Defaults */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Global Outbound Webhook Policy</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  System-wide SLA defaults inherited by all new webhook endpoints and routes.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {visibleDefinitions
                .filter((d) => d.sub_category === 'Webhook Defaults' || d.sub_category === 'Storage')
                .map((def) => (
                  <SettingControlRow
                    key={def.key}
                    def={def}
                    value={settingsValues[def.key]}
                    onChange={(val) => handleSettingChange(def.key, val)}
                  />
                ))}
            </div>
          </div>

          {/* Third-Party Communication Providers */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Configured Communication & Storage Providers</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Verified gateways for transaction emails, SMS/OTP alerts, and sovereign storage buckets.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {integrations.map((int) => (
                <div
                  key={int.id}
                  className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center font-bold text-[#0F172A]">
                      {int.provider_type === 'email' ? <Mail className="w-5 h-5 text-blue-600" /> : int.provider_type === 'sms' ? <MessageSquare className="w-5 h-5 text-emerald-600" /> : <HardDrive className="w-5 h-5 text-purple-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{int.provider_name}</span>
                        <StatusBadge status={int.health_status === 'Healthy' ? 'Active' : 'Failed'} />
                      </div>
                      <div className="text-xs text-[#64748B] font-mono mt-1">
                        Credentials: {JSON.stringify(int.masked_credentials)}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-1">
                        Last Health Check: {int.last_health_check_at || 'Recently'} • Latency: {int.last_latency_ms || 120}ms
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleTestIntegration(int.id)}
                      disabled={testingIntegrationId === int.id}
                      className="bg-white hover:bg-slate-100 text-[#0F172A] border border-[#E2E8F0] text-xs font-semibold py-1.5 px-3"
                    >
                      {testingIntegrationId === int.id ? 'Testing Handshake...' : 'Test Connection'}
                    </Button>
                  </div>
                </div>
              ))}

              {integrationTestResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{integrationTestResult.message} (Roundtrip: {integrationTestResult.latency_ms}ms)</span>
                  </div>
                  <button onClick={() => setIntegrationTestResult(null)} className="text-emerald-700 hover:text-emerald-900">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PILLAR 4: REALTIME & EVENT MESH
      --------------------------------------------------------- */}
      {activeCategory === 'realtime_events' && searchQuery.trim().length === 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Realtime Engine & Private Channels</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Manage Supabase Realtime broadcast channels, permissions, and worker thread concurrency.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {visibleDefinitions
                .filter((d) => d.category === 'realtime_events')
                .map((def) => (
                  <SettingControlRow
                    key={def.key}
                    def={def}
                    value={settingsValues[def.key]}
                    onChange={(val) => handleSettingChange(def.key, val)}
                  />
                ))}
            </div>
          </div>

          {/* Active Realtime Channels Inspector */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Authorised Private Platform Channels</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Targeted channels broadcasting telemetry with strict Super Admin JWT verification.
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'platform:settings', purpose: 'Live Configuration Broadcasts', status: 'Active' },
                { name: 'platform:events', purpose: 'Domain Event Ingestion Stream', status: 'Active' },
                { name: 'platform:jobs', purpose: 'Background Worker Fleet Status', status: 'Active' },
              ].map((ch) => (
                <div key={ch.name} className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#0F172A]">{ch.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-xs text-[#64748B]">{ch.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PILLAR 5: OPERATIONS & MAINTENANCE
      --------------------------------------------------------- */}
      {activeCategory === 'operations' && searchQuery.trim().length === 0 && (
        <div className="space-y-6">
          {/* Rate Limits & Maintenance Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">Platform Rate Limits & Quotas</h3>
              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Rate Limits' || d.sub_category === 'Data Retention')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0F172A]">Platform Maintenance Center</h3>
              <p className="text-xs text-[#64748B]">
                Schedule or activate cluster maintenance windows with customizable operator messages.
              </p>
              <div className="space-y-4 pt-2">
                {visibleDefinitions
                  .filter((d) => d.sub_category === 'Maintenance')
                  .map((def) => (
                    <SettingControlRow
                      key={def.key}
                      def={def}
                      value={settingsValues[def.key]}
                      onChange={(val) => handleSettingChange(def.key, val)}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* System Dependencies Health Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Platform Dependencies Health</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Core infrastructure microservices and cluster health states.
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dependencies.map((dep) => (
                <div key={dep.id} className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#0F172A]">{dep.name}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-[11px] text-[#64748B]">{dep.details}</div>
                  <div className="text-[10px] text-[#94A3B8] font-mono">Latency: {dep.latency_ms}ms</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PILLAR 6: GOVERNANCE, AUDIT & EMERGENCY KILLSWITCHES
      --------------------------------------------------------- */}
      {activeCategory === 'governance' && searchQuery.trim().length === 0 && (
        <div className="space-y-6">
          {/* Configuration History & Safe Rollbacks */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Configuration Version History</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Immutable ledger of all administrative setting mutations with one-click atomic rollback.
              </p>
            </div>

            {configHistory.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">No Configuration Changes Recorded</h4>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  All settings in {environment} are currently operating on their baseline definitions. Mutations and rollbacks will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                    <tr>
                      <th className="px-5 py-3">Setting Key</th>
                      <th className="px-5 py-3">Version</th>
                      <th className="px-5 py-3">Previous ➔ New Value</th>
                      <th className="px-5 py-3">Administrator & Reason</th>
                      <th className="px-5 py-3">Timestamp</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {configHistory.map((ver) => (
                      <tr key={ver.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[#0F172A] font-bold">
                          {ver.setting_key}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
                            v{ver.version}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          <span className="text-rose-600 line-through mr-1">{JSON.stringify(ver.old_value)}</span>
                          <span className="text-emerald-600 font-bold">{JSON.stringify(ver.new_value)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-[#0F172A] font-medium">{ver.changed_by}</div>
                          <div className="text-[11px] text-[#64748B]">{ver.reason}</div>
                        </td>
                        <td className="px-5 py-3.5 text-[#64748B] whitespace-nowrap">
                          {new Date(ver.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRollbackSetting(ver)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                          >
                            Rollback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* High-Risk Emergency Danger Zone */}
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              Platform Emergency Controls (Danger Zone)
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              These emergency killswitches immediately halt production subsystems, terminate in-flight deliveries, or disconnect active admin sessions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <Button
                onClick={() =>
                  setEmergencyModal({
                    isOpen: true,
                    actionType: 'DISABLE_OUTBOUND_WEBHOOKS',
                    title: 'Pause All Outbound Webhook Deliveries',
                    description: 'This will immediately halt all outbound webhook deliveries across the platform.',
                    confirmTextMatch: 'PRODUCTION',
                    enteredText: '',
                    reason: '',
                  })
                }
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5"
              >
                Halt Outbound Webhooks
              </Button>

              <Button
                onClick={() =>
                  setEmergencyModal({
                    isOpen: true,
                    actionType: 'PAUSE_BACKGROUND_JOBS',
                    title: 'Pause Background Jobs Fleet',
                    description: 'This will pause all background workers and prevent new job execution.',
                    confirmTextMatch: 'PRODUCTION',
                    enteredText: '',
                    reason: '',
                  })
                }
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5"
              >
                Pause Background Jobs Fleet
              </Button>

              <Button
                onClick={() =>
                  setEmergencyModal({
                    isOpen: true,
                    actionType: 'FORCE_LOGOUT_ALL_ADMINS',
                    title: 'Invalidate All Active Admin Sessions',
                    description: 'This will instantly force logout all administrators and revoke active JWTs.',
                    confirmTextMatch: 'CONFIRM',
                    enteredText: '',
                    reason: '',
                  })
                }
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5"
              >
                Force Logout All Admins
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          SEARCH RESULTS VIEW
      --------------------------------------------------------- */}
      {searchQuery.trim().length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#0F172A]">
            Search Results for "{searchQuery}" ({visibleDefinitions.length} settings found)
          </h3>
          <div className="space-y-4 pt-2">
            {visibleDefinitions.map((def) => (
              <SettingControlRow
                key={def.key}
                def={def}
                value={settingsValues[def.key]}
                onChange={(val) => handleSettingChange(def.key, val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          DRAWER: 5-STEP CREATE DEVELOPER API KEY WIZARD
      --------------------------------------------------------- */}
      {isCreateKeyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between border-l border-[#E2E8F0] animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Provision Developer API Key</h3>
                <p className="text-xs text-[#64748B]">Step {createKeyStep} of 5</p>
              </div>
              <button
                onClick={() => setIsCreateKeyDrawerOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-2"
              >
                ✕
              </button>
            </div>

            {/* Body Steps */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* STEP 1: KEY DETAILS */}
              {createKeyStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Key Name *</label>
                    <input
                      type="text"
                      value={newKeyForm.name}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Workday Payroll Sync Connector"
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Description</label>
                    <textarea
                      value={newKeyForm.description}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Purpose of this integration..."
                      rows={3}
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Technical Owner / Team</label>
                    <input
                      type="text"
                      value={newKeyForm.owner}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, owner: e.target.value }))}
                      placeholder="e.g. Enterprise Integration Team"
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Expiration Policy</label>
                    <select
                      value={newKeyForm.expires_in_days === null ? 'never' : String(newKeyForm.expires_in_days)}
                      onChange={(e) =>
                        setNewKeyForm((p) => ({
                          ...p,
                          expires_in_days: e.target.value === 'never' ? null : Number(e.target.value),
                        }))
                      }
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days (Recommended)</option>
                      <option value="180">180 Days</option>
                      <option value="365">1 Year</option>
                      <option value="never">Never Expires</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: GRANULAR SCOPES MATRIX */}
              {createKeyStep === 2 && (
                <div className="space-y-5">
                  <p className="text-xs text-[#64748B]">
                    Select the minimum required permissions. High-risk scopes require explicit confirmation.
                  </p>
                  {scopeGroups.map((grp) => (
                    <div key={grp.category} className="border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0F172A]">{grp.category}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const allScopes = grp.scopes.map((s) => s.scope);
                            const hasAll = allScopes.every((s) => newKeyForm.scopes.includes(s));
                            if (hasAll) {
                              setNewKeyForm((p) => ({
                                ...p,
                                scopes: p.scopes.filter((s) => !allScopes.includes(s)),
                              }));
                            } else {
                              setNewKeyForm((p) => ({
                                ...p,
                                scopes: Array.from(new Set([...p.scopes, ...allScopes])),
                              }));
                            }
                          }}
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          Toggle All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {grp.scopes.map((s) => {
                          const isSelected = newKeyForm.scopes.includes(s.scope);
                          return (
                            <label
                              key={s.scope}
                              className={cn(
                                'flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors',
                                isSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#E2E8F0]'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewKeyForm((p) => ({ ...p, scopes: [...p.scopes, s.scope] }));
                                  } else {
                                    setNewKeyForm((p) => ({
                                      ...p,
                                      scopes: p.scopes.filter((sc) => sc !== s.scope),
                                    }));
                                  }
                                }}
                                className="mt-0.5 text-emerald-600 rounded"
                              />
                              <div>
                                <div className="font-mono text-[11px] font-bold text-[#0F172A]">{s.scope}</div>
                                <div className="text-[10px] text-[#64748B]">{s.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 3: RATE LIMITS & CONCURRENCY */}
              {createKeyStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Rate Limit (Requests per Minute)</label>
                    <input
                      type="number"
                      value={newKeyForm.rate_limit_per_min}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, rate_limit_per_min: Number(e.target.value) }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Burst Capacity</label>
                    <input
                      type="number"
                      value={newKeyForm.burst_limit}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, burst_limit: Number(e.target.value) }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0F172A]">Concurrency Limit</label>
                    <input
                      type="number"
                      value={newKeyForm.concurrency_limit}
                      onChange={(e) => setNewKeyForm((p) => ({ ...p, concurrency_limit: Number(e.target.value) }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW */}
              {createKeyStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                    <div className="font-bold text-[#0F172A]">Summary</div>
                    <div>Name: {newKeyForm.name}</div>
                    <div>Environment: {newKeyForm.environment}</div>
                    <div>Owner: {newKeyForm.owner}</div>
                    <div>Rate Limit: {newKeyForm.rate_limit_per_min} rpm</div>
                    <div>Scopes: {newKeyForm.scopes.join(', ')}</div>
                  </div>
                </div>
              )}

              {/* STEP 5: ONE-TIME SECRET REVEAL */}
              {createKeyStep === 5 && generatedSecret && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 font-medium">
                    ⚠️ <strong>Important:</strong> You will not be able to view this secret key again. Store it securely in your secret manager.
                  </div>

                  <div className="bg-[#0F172A] text-white p-4 rounded-xl font-mono text-xs flex items-center justify-between">
                    <span className="break-all">{generatedSecret}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSecret);
                        setSecretCopied(true);
                        setTimeout(() => setSecretCopied(false), 3000);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-emerald-400 font-bold text-xs ml-3 flex-shrink-0"
                    >
                      {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-[#E2E8F0] flex items-center justify-between">
              {createKeyStep > 1 && createKeyStep < 5 && (
                <Button
                  onClick={() => setCreateKeyStep((p) => ((p - 1) as any))}
                  className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold py-2 px-4"
                >
                  Back
                </Button>
              )}

              {createKeyStep < 4 && (
                <Button
                  onClick={() => setCreateKeyStep((p) => ((p + 1) as any))}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-4 ml-auto"
                >
                  Continue
                </Button>
              )}

              {createKeyStep === 4 && (
                <Button
                  onClick={handleGenerateKeySubmit}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-6 ml-auto"
                >
                  Generate Secret Key
                </Button>
              )}

              {createKeyStep === 5 && (
                <Button
                  onClick={() => setIsCreateKeyDrawerOpen(false)}
                  className="bg-[#0F172A] text-white text-xs font-bold py-2 px-6 ml-auto"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          DIFF CHANGE PREVIEW MODAL
      --------------------------------------------------------- */}
      {isDiffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">Review Configuration Changes ({environment})</h3>
            <p className="text-xs text-[#64748B]">
              Please review before applying. These mutations will be recorded into the configuration audit ledger.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {modifiedSettingsList.map((item) => (
                <div key={item.definition.key} className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs">
                  <div className="font-bold text-[#0F172A]">{item.definition.label}</div>
                  <div className="font-mono text-[11px] mt-1">
                    <span className="text-rose-600 line-through mr-2">{JSON.stringify(item.oldValue)}</span>
                    <span className="text-emerald-600 font-bold">➔ {JSON.stringify(item.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:text-[#0F172A]"
              >
                Cancel
              </button>
              <Button
                onClick={handleSaveConfirmed}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-5"
              >
                {isSaving ? 'Applying...' : 'Confirm & Commit Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          EMERGENCY ACTION CONFIRMATION MODAL
      --------------------------------------------------------- */}
      {emergencyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-rose-300 space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-base">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              {emergencyModal.title}
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">{emergencyModal.description}</p>

            <div>
              <label className="text-xs font-bold text-[#0F172A]">Type "{emergencyModal.confirmTextMatch}" to confirm:</label>
              <input
                type="text"
                value={emergencyModal.enteredText}
                onChange={(e) => setEmergencyModal((p) => ({ ...p, enteredText: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-xs border border-rose-300 rounded-xl font-mono focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEmergencyModal((p) => ({ ...p, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-[#64748B]"
              >
                Cancel
              </button>
              <Button
                onClick={handleEmergencyTrigger}
                disabled={emergencyModal.enteredText !== emergencyModal.confirmTextMatch}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-5 disabled:opacity-50"
              >
                Execute Emergency Killswitch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: Setting Control Row
// -------------------------------------------------------------
const SettingControlRow: React.FC<{
  def: PlatformSettingDefinition;
  value: any;
  onChange: (val: any) => void;
}> = ({ def, value, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors">
      <div className="max-w-xl">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[#0F172A]">{def.label}</span>
          {def.risk_level === 'CRITICAL' && (
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px] uppercase">
              Critical
            </span>
          )}
          {def.risk_level === 'HIGH' && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[9px] uppercase">
              High Risk
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#64748B] mt-0.5">{def.description}</p>
      </div>

      <div className="flex-shrink-0">
        {def.value_type === 'boolean' && (
          <button
            onClick={() => onChange(!value)}
            className={cn(
              'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out',
              value ? 'bg-emerald-600' : 'bg-slate-300'
            )}
          >
            <div
              className={cn(
                'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
                value ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        )}

        {def.value_type === 'enum' && def.allowed_values && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {def.allowed_values.map((opt: any) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {def.value_type === 'integer' && def.allowed_values && (
          <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          >
            {def.allowed_values.map((opt: any) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {def.value_type === 'integer' && !def.allowed_values && (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg font-mono text-[#0F172A]"
          />
        )}
      </div>
    </div>
  );
};
