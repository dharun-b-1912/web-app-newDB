// src/features/platform/subviews/IntegrationsControlCenterView.tsx
// ============================================================
// WorkForceOS — Integration Control Center (Super Admin Console)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCw,
  Play,
  Pause,
  Key,
  Shield,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Server,
  Zap,
  Radio,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Trash2,
  Lock,
  Globe,
  Sliders,
  ChevronDown,
  Info,
  SlidersHorizontal,
  X,
  AlertOctagon,
  Sparkles,
  MessageSquare,
  Share2,
  Fingerprint,
  Mail,
  Phone,
  Hash,
  Users,
  CreditCard,
  Briefcase,
  HardDrive,
  Cpu,
  Send,
  Plus,
  Unplug,
  CheckCheck,
} from 'lucide-react';
import {
  IntegrationEnvironment,
  IntegrationCategory,
  Integration,
  IntegrationConnection,
  IntegrationApiKey,
  OAuthApplication,
  BiometricDevice,
  DeviceGateway,
  WhatsAppAccount,
  MetaConnection,
  SyncJob,
  IntegrationLog,
  SecurityAlert,
  IntegrationMetrics,
  IntegrationProviderMeta,
  IntegrationStatus,
} from '../../../types/integrations';
import {
  platformIntegrationsService,
  INTEGRATION_PROVIDERS_META,
} from '../../../services/platform/platformIntegrationsService';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { cn } from '../../../lib/utils';

export const IntegrationsControlCenterView: React.FC = () => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [environment, setEnvironment] = useState<IntegrationEnvironment>('Production');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Data Sources
  const [metrics, setMetrics] = useState<IntegrationMetrics>(() => platformIntegrationsService.getMetrics());
  const [integrations, setIntegrations] = useState<Integration[]>(() => platformIntegrationsService.getIntegrations());
  const [apiKeys, setApiKeys] = useState<IntegrationApiKey[]>(() => platformIntegrationsService.getApiKeys());
  const [oauthApps, setOAuthApps] = useState<OAuthApplication[]>(() => platformIntegrationsService.getOAuthApps());
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>(() =>
    platformIntegrationsService.getBiometricDevices()
  );
  const [deviceGateways, setDeviceGateways] = useState<DeviceGateway[]>(() =>
    platformIntegrationsService.getDeviceGateways()
  );
  const [whatsappAccounts, setWhatsAppAccounts] = useState<WhatsAppAccount[]>(() =>
    platformIntegrationsService.getWhatsAppAccounts()
  );
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>(() =>
    platformIntegrationsService.getMetaConnections()
  );
  const [tenantConnections, setTenantConnections] = useState<IntegrationConnection[]>(() =>
    platformIntegrationsService.getTenantConnections()
  );
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>(() => platformIntegrationsService.getSyncJobs());
  const [logs, setLogs] = useState<IntegrationLog[]>(() => platformIntegrationsService.getLogs());
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(() =>
    platformIntegrationsService.getSecurityAlerts()
  );

  // Modals & Drawers
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [isCreateOAuthModalOpen, setIsCreateOAuthModalOpen] = useState(false);
  const [testConnectionTarget, setTestConnectionTarget] = useState<Integration | null>(null);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState<IntegrationConnection | null>(null);

  // Dangerous Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionText: string;
    requireTypeConfirm?: string;
    isDangerous?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionText: 'Confirm',
    onConfirm: () => {},
  });

  // Copied indicator helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const refreshData = () => {
    setMetrics(platformIntegrationsService.getMetrics(environment));
    setIntegrations([...platformIntegrationsService.getIntegrations()]);
    setApiKeys([...platformIntegrationsService.getApiKeys()]);
    setOAuthApps([...platformIntegrationsService.getOAuthApps()]);
    setBiometricDevices([...platformIntegrationsService.getBiometricDevices()]);
    setDeviceGateways([...platformIntegrationsService.getDeviceGateways()]);
    setWhatsAppAccounts([...platformIntegrationsService.getWhatsAppAccounts()]);
    setMetaConnections([...platformIntegrationsService.getMetaConnections()]);
    setTenantConnections([...platformIntegrationsService.getTenantConnections()]);
    setSyncJobs([...platformIntegrationsService.getSyncJobs()]);
    setLogs([...platformIntegrationsService.getLogs()]);
    setSecurityAlerts([...platformIntegrationsService.getSecurityAlerts()]);
  };

  React.useEffect(() => {
    refreshData();
    const unsub = platformIntegrationsService.subscribeToRealtimeChanges((state) => {
      setRealtimeState(state);
      refreshData();
    });
    return () => {
      if (unsub) unsub();
    };
  }, [environment]);

  // Filtered Integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((item) => {
      const matchEnv = item.environment === environment;
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchStatus = selectedStatusFilter === 'All' || item.status === selectedStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.provider_key.toLowerCase().includes(q);
      return matchEnv && matchCat && matchStatus && matchSearch;
    });
  }, [integrations, environment, selectedCategory, selectedStatusFilter, searchQuery]);

  // Actions
  const handleToggleIntegration = async (id: string, currentStatus: IntegrationStatus) => {
    const nextStatus: IntegrationStatus = currentStatus === 'Disabled' ? 'Connected' : 'Disabled';
    await platformIntegrationsService.toggleIntegrationStatus(id, nextStatus);
    refreshData();
  };

  const handleDeleteIntegration = (item: Integration) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Integration: ${item.name}`,
      description: `This will permanently disconnect ${item.name} for all ${item.tenants_count} active tenant organizations. Webhook endpoints and API pipelines will immediately cease functioning.`,
      actionText: 'Delete Integration',
      requireTypeConfirm: 'DISCONNECT',
      isDangerous: true,
      onConfirm: async () => {
        await platformIntegrationsService.deleteIntegration(item.id);
        refreshData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRevokeApiKey = (key: IntegrationApiKey) => {
    setConfirmDialog({
      isOpen: true,
      title: `Revoke API Key: ${key.name}`,
      description: `Are you sure you want to revoke API key prefix ${key.key_prefix}••••? All external applications using this key will be instantly blocked with HTTP 401 Unauthorized.`,
      actionText: 'Revoke Key',
      isDangerous: true,
      onConfirm: async () => {
        await platformIntegrationsService.revokeApiKey(key.id);
        refreshData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSyncDevice = async (deviceId: string) => {
    await platformIntegrationsService.syncBiometricDevice(deviceId);
    refreshData();
  };

  const handleRestartGateway = async (gatewayId: string) => {
    await platformIntegrationsService.restartGatewayAgent(gatewayId);
    refreshData();
  };

  const handleRefreshMetaToken = async (connId: string) => {
    await platformIntegrationsService.refreshMetaToken(connId);
    refreshData();
  };

  const handleTriggerSyncJob = async (jobName: string, provider: string) => {
    await platformIntegrationsService.triggerSyncJob(jobName, provider);
    refreshData();
  };

  const handleResolveAlert = async (alertId: string) => {
    await platformIntegrationsService.resolveSecurityAlert(alertId);
    refreshData();
  };

  // Provider Icon Helper
  const renderProviderIcon = (iconName: string, className?: string) => {
    const defaultClass = className || 'h-5 w-5';
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className={cn(defaultClass, 'text-[#25D366]')} />;
      case 'Share2':
        return <Share2 className={cn(defaultClass, 'text-[#1877F2]')} />;
      case 'Fingerprint':
        return <Fingerprint className={cn(defaultClass, 'text-[#047857]')} />;
      case 'Clock':
        return <Clock className={cn(defaultClass, 'text-[#2563EB]')} />;
      case 'Mail':
        return <Mail className={cn(defaultClass, 'text-[#0284C7]')} />;
      case 'Phone':
        return <Phone className={cn(defaultClass, 'text-[#E11D48]')} />;
      case 'Hash':
        return <Hash className={cn(defaultClass, 'text-[#E01E5A]')} />;
      case 'Users':
        return <Users className={cn(defaultClass, 'text-[#4F46E5]')} />;
      case 'CreditCard':
        return <CreditCard className={cn(defaultClass, 'text-[#0D9488]')} />;
      case 'DollarSign':
        return <CreditCard className={cn(defaultClass, 'text-[#6366F1]')} />;
      case 'Layers':
        return <Layers className={cn(defaultClass, 'text-[#0284C7]')} />;
      case 'Briefcase':
        return <Briefcase className={cn(defaultClass, 'text-[#EA580C]')} />;
      case 'HardDrive':
        return <HardDrive className={cn(defaultClass, 'text-[#059669]')} />;
      case 'Database':
        return <Database className={cn(defaultClass, 'text-[#F59E0B]')} />;
      default:
        return <Terminal className={cn(defaultClass, 'text-[#64748B]')} />;
    }
  };

  // -------------------------------------------------------------
  // Render Main Layout
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">API & Integrations</h1>

            {/* Environment Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
              {(['Production', 'Staging', 'Development'] as IntegrationEnvironment[]).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all',
                    environment === env
                      ? env === 'Production'
                        ? 'bg-[#047857] text-white shadow-sm'
                        : env === 'Staging'
                        ? 'bg-[#D97706] text-white shadow-sm'
                        : 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172B]'
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      environment === env
                        ? 'bg-white'
                        : env === 'Production'
                        ? 'bg-[#10B981]'
                        : env === 'Staging'
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#3B82F6]'
                    )}
                  />
                  {env.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Live Realtime Status Badge */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
                realtimeState === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : realtimeState === 'reconnecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  realtimeState === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : realtimeState === 'reconnecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-rose-500'
                )}
              />
              {realtimeState === 'connected'
                ? 'Realtime Engine Active'
                : realtimeState === 'reconnecting'
                ? 'Reconnecting...'
                : 'Offline'}
            </div>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Connect WorkForceOS with external services, devices, communication channels, APIs, and tenant applications.
          </p>
        </div>

        {/* Right Header Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('logs')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <FileCode className="h-4 w-4 text-[#64748B]" />
            View Integration Logs
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateKeyModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Key className="h-4 w-4 text-[#2563EB]" />
            Create API Key
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddWizardOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Add Integration
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Status Bar */}
      <div
        className={cn(
          'w-full p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors',
          metrics.engine_status === 'Healthy'
            ? 'bg-[#ECFDF5] border-[#A7F3D0]'
            : 'bg-[#FFFBEB] border-[#FDE68A]'
        )}
      >
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                metrics.engine_status === 'Healthy' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2.5 w-2.5 rounded-full',
                metrics.engine_status === 'Healthy' ? 'bg-[#059669]' : 'bg-[#D97706]'
              )}
            />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-bold text-[#0F172B]">
                Integration Engine {metrics.engine_status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/80 border border-black/5 text-[#047857]">
                {metrics.total_connected} Connected
              </span>
              {metrics.attention_count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#FEF3C7] text-[#92400E]">
                  {metrics.attention_count} Attention
                </span>
              )}
              {metrics.failed_count > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#FEE2E2] text-[#DC2626]">
                  {metrics.failed_count} Failed
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569] mt-0.5">
              Multi-tenant API Gateway, Webhooks, WhatsApp Cloud API, and Biometric Device Hub active.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            className="text-[#475569] hover:bg-black/5 text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh State
          </Button>
        </div>
      </div>

      {/* 3. Top Summary Cards (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1 */}
        <div
          onClick={() => setActiveTab('integrations')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Connected Integrations</span>
            <Layers className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.total_connected}</span>
            <span className="text-[11px] font-semibold text-[#059669]">
              {environment}
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Marketplace registry</p>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => setActiveTab('tenants')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#2563EB] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Active Tenants</span>
            <Users className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.active_tenants}</span>
            <span className="text-[11px] font-semibold text-[#059669]">Active bindings</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Using integrations</p>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => setActiveTab('webhooks')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#059669] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Webhook Health</span>
            <Send className="h-3.5 w-3.5 text-[#059669]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.webhook_success_pct}%</span>
            <span className="text-[11px] text-[#64748B]">{metrics.total_webhook_deliveries} events</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Delivery success</p>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => setActiveTab('api_keys')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#7C3AED] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>API Requests</span>
            <Activity className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.monthly_api_requests}</span>
            <span className="text-[11px] font-semibold text-[#059669]">
              Live throughput
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Request volume</p>
        </div>

        {/* Card 5 */}
        <div
          onClick={() => setActiveTab('security')}
          className={cn(
            'p-3.5 rounded-xl border shadow-sm transition-all cursor-pointer group',
            metrics.security_alerts_count > 0
              ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#D97706]'
              : 'bg-white border-[#E2E8F0]'
          )}
        >
          <div className="flex items-center justify-between text-xs text-[#92400E] font-medium">
            <span>Security Alerts</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.security_alerts_count}</span>
            <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
              {metrics.expiring_credentials_count} Expiring
            </span>
          </div>
          <p className="text-[11px] text-[#B45309] mt-1">Credentials & audit</p>
        </div>
      </div>

      {/* 4. Main Tab Navigation (12 Tabs) */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Activity, badge: null },
            { id: 'integrations', label: 'Integrations', icon: Layers, badge: filteredIntegrations.length },
            { id: 'api_keys', label: 'API Keys', icon: Key, badge: apiKeys.length },
            { id: 'oauth', label: 'OAuth Apps', icon: Shield, badge: oauthApps.length },
            { id: 'webhooks', label: 'Webhooks', icon: Send, badge: null },
            { id: 'biometrics', label: 'Biometric & Devices', icon: Fingerprint, badge: biometricDevices.length },
            { id: 'messaging', label: 'Messaging & Social', icon: MessageSquare, badge: null },
            { id: 'tenants', label: 'Tenant Connections', icon: Users, badge: tenantConnections.length },
            { id: 'sync', label: 'Sync & Jobs', icon: RefreshCw, badge: syncJobs.length },
            { id: 'logs', label: 'Logs & Events', icon: FileCode, badge: logs.length },
            { id: 'security', label: 'Security', icon: ShieldCheck, badge: metrics.security_alerts_count },
            { id: 'developer', label: 'Developer Tools', icon: Terminal, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-[#047857] text-[#047857]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172B] hover:border-[#CBD5E1]'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      tab.id === 'security' && metrics.security_alerts_count > 0
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : isActive
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: OVERVIEW
         --------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Attention Required Banner */}
          {securityAlerts.some((a) => a.status === 'Open') && (
            <div className="p-4 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#92400E] flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-[#D97706]" />
                  Attention Required — Operational & Security Warnings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('security')}
                  className="text-xs text-[#92400E] hover:bg-[#FEF3C7] p-1"
                >
                  View All Alerts <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {securityAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setActiveTab('security')}
                    className="p-3 bg-white rounded-lg border border-[#FDE68A] hover:border-[#D97706] transition-all cursor-pointer space-y-1"
                  >
                    <div className="font-bold text-[#0F172B] truncate">{alert.title}</div>
                    <div className="text-[11px] text-[#64748B] truncate">{alert.affected_resource}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid: Health Status & Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Integration Health Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172B]">Core Integration Ecosystem Health</h3>
                  <p className="text-xs text-[#64748B]">Real-time operational status across external platform adapters</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('integrations')}
                  className="text-xs text-[#334155]"
                >
                  Explore All ({integrations.length})
                </Button>
              </div>

              {integrations.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-[#0F172B]">No active integrations in {environment}</div>
                  <p className="text-[11px] text-[#64748B]">Click "+ Add Integration" to connect your first ERP, WhatsApp, or biometric bridge.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {integrations.slice(0, 6).map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                          {renderProviderIcon(
                            INTEGRATION_PROVIDERS_META.find((p) => p.provider_key === item.provider_key)?.icon_name || 'Terminal'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#0F172B]">{item.name}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {item.category} • {item.tenants_count} Tenants
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                            item.status === 'Connected' || item.status === 'Healthy'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : item.status === 'Degraded'
                              ? 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-[#FEF2F2] text-[#DC2626]'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              item.status === 'Connected' || item.status === 'Healthy'
                                ? 'bg-[#10B981]'
                                : item.status === 'Degraded'
                                ? 'bg-[#F59E0B]'
                                : 'bg-[#EF4444]'
                            )}
                          />
                          {item.status}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestConnectionTarget(item)}
                          className="text-xs text-[#047857] hover:bg-[#ECFDF5] p-1.5"
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Col: Recent Activity Timeline */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#047857]" />
                    Recent Activity Timeline
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857]">
                    Live Pulse
                  </span>
                </div>

                {logs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Clock className="w-7 h-7 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-[#0F172B]">No recent events</div>
                    <p className="text-[11px] text-[#64748B]">Inbound webhook deliveries and sync logs will appear here in real time.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0F172B]">{log.provider}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">{log.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-[#334155] line-clamp-2">{log.message}</p>
                        <div className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                          <span>{log.tenant_name || 'System'}</span>
                          <span>•</span>
                          <span className="font-mono">{log.request_id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('logs')}
                  className="w-full text-xs font-semibold text-[#0F172B]"
                >
                  View All Centralized Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: INTEGRATIONS (Marketplace & Registry)
         --------------------------------------------------------- */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          {/* Categories & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                'All',
                'Communication',
                'Social',
                'Workforce',
                'Finance',
                'HR',
                'Developer',
                'Storage',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    selectedCategory === cat
                      ? 'bg-[#047857] text-white shadow-sm'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172B]'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((item) => {
              const meta = INTEGRATION_PROVIDERS_META.find((p) => p.provider_key === item.provider_key);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:border-[#047857] transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                          {renderProviderIcon(meta?.icon_name || 'Terminal', 'h-6 w-6')}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#0F172B]">{item.name}</h4>
                          <span className="text-[11px] font-medium text-[#64748B]">{item.category}</span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          item.status === 'Connected' || item.status === 'Healthy'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : item.status === 'Degraded'
                            ? 'bg-[#FFFBEB] text-[#D97706]'
                            : 'bg-[#FEF2F2] text-[#DC2626]'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            item.status === 'Connected' || item.status === 'Healthy'
                              ? 'bg-[#10B981]'
                              : item.status === 'Degraded'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#EF4444]'
                          )}
                        />
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#64748B] mt-3 line-clamp-2">{item.description}</p>

                    {item.error_message && (
                      <div className="mt-2.5 p-2 rounded bg-[#FEF2F2] text-[11px] text-[#DC2626] border border-[#FECACA]">
                        {item.error_message}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B]">
                      <div>
                        <span>Used by: </span>
                        <strong className="text-[#0F172B]">{item.tenants_count} tenants</strong>
                      </div>
                      <div>
                        <span>Last sync: </span>
                        <strong className="text-[#0F172B]">{item.last_sync_at || 'Just now'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestConnectionTarget(item)}
                        className="text-xs flex-1 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
                      >
                        Test Connection
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleIntegration(item.id, item.status)}
                        className="text-xs text-[#64748B] hover:text-[#0F172B]"
                      >
                        {item.status === 'Disabled' ? 'Enable' : 'Disable'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteIntegration(item)}
                        className="text-xs text-[#DC2626] hover:bg-[#FEE2E2] p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 3: API KEYS
         --------------------------------------------------------- */}
      {activeTab === 'api_keys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B]">Platform REST & Client API Keys</h3>
              <p className="text-xs text-[#64748B]">
                Granular scoped tokens for WorkForce mobile apps, ERP connectors, and IoT device gateways.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateKeyModalOpen(true)}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
            >
              + Create API Key
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Key Name & Prefix</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Scope & Permissions</th>
                    <th className="py-3 px-4">Rate Limit</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{key.name}</div>
                        <div className="font-mono text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <span>{key.key_prefix}••••••••••••••••</span>
                          <button
                            onClick={() => handleCopy(key.key_prefix, key.id)}
                            className="text-[#94A3B8] hover:text-[#047857]"
                          >
                            {copiedId === key.id ? <Check className="h-3 w-3 text-[#047857]" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                          {key.environment}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex gap-1 flex-wrap">
                          {key.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="px-1.5 py-0.2 rounded bg-[#F8FAFC] text-[#334155] font-mono text-[10px] border border-[#CBD5E1]"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#334155]">{key.rate_limit_per_min} req/min</td>

                      <td className="py-3.5 px-4 text-[#64748B]">{key.last_used_at}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            key.status === 'Active' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF2F2] text-[#DC2626]'
                          )}
                        >
                          {key.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {key.status === 'Active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeApiKey(key)}
                            className="text-xs text-[#DC2626] hover:bg-[#FEE2E2]"
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 4: OAUTH APPS
         --------------------------------------------------------- */}
      {activeTab === 'oauth' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B]">OAuth 2.0 Client Applications</h3>
              <p className="text-xs text-[#64748B]">Manage PKCE authentication clients, redirect URIs, and token lifecycles.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOAuthModalOpen(true)}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
            >
              + Register OAuth App
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Application Name</th>
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4">Redirect URIs</th>
                    <th className="py-3 px-4">Active Tokens</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {oauthApps.map((app) => (
                    <tr key={app.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{app.name}</div>
                        <div className="text-[11px] text-[#64748B]">Owner: {app.owner}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#047857]">{app.client_id}</td>

                      <td className="py-3.5 px-4 max-w-xs truncate font-mono text-[11px] text-[#64748B]">
                        {app.redirect_uris.join(', ')}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">{app.active_tokens_count.toLocaleString()}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            app.status === 'Healthy' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFFBEB] text-[#D97706]'
                          )}
                        >
                          {app.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(app.client_id);
                            handleCopy(app.client_id, app.id);
                          }}
                          className="text-xs text-[#047857]"
                        >
                          {copiedId === app.id ? 'Copied!' : 'Copy Client ID'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 5: WEBHOOKS
         --------------------------------------------------------- */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <Send className="h-4 w-4 text-[#047857]" />
                WorkForceOS Outbound Webhook Subsystem
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                For complete deep-mesh routing, dead-letter recovery, and replay timelines, visit the dedicated Webhooks & Mesh console.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-[#ECFDF5] text-[#047857] font-bold">
                99.82% Success Rate
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Configured Webhook Hubs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {integrations
                .filter((i) => i.webhook_url)
                .map((wh) => (
                  <div key={wh.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#0F172B]">{wh.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#ECFDF5] text-[#047857]">
                        ● Active Pipeline
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[#64748B] truncate">{wh.webhook_url}</div>
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                      <span>Auth: {wh.auth_type}</span>
                      <button
                        onClick={() => handleCopy(wh.webhook_url || '', wh.id)}
                        className="text-[#047857] hover:underline flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy URL
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 6: BIOMETRIC & HARDWARE DEVICES
         --------------------------------------------------------- */}
      {activeTab === 'biometrics' && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-[#047857]" />
                Biometric Hardware & IoT Gateway Infrastructure
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Zero-knowledge encrypted punch ingestion through local tenant gateway daemons (Mantra, eSSL, Suprema, ZKTeco).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-[#ECFDF5] text-[#047857] font-bold">
                118 Online
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-[#FEF2F2] text-[#DC2626] font-bold">
                6 Offline
              </span>
            </div>
          </div>

          {/* Gateways Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deviceGateways.map((gw) => (
              <div key={gw.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server className="h-5 w-5 text-[#2563EB]" />
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">{gw.name}</h4>
                      <span className="text-[11px] text-[#64748B]">{gw.tenant_name}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-bold',
                      gw.status === 'Online' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFFBEB] text-[#D97706]'
                    )}
                  >
                    ● {gw.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B] p-2.5 rounded-lg bg-[#F8FAFC]">
                  <div>Agent: {gw.agent_version}</div>
                  <div>Heartbeat: {gw.last_heartbeat_at}</div>
                  <div>Local IP: {gw.local_ip}</div>
                  <div>Devices: {gw.connected_devices_count} active</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestartGateway(gw.id)}
                    className="text-xs border-[#CBD5E1] text-[#334155]"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Restart Daemon
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Device Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Connected Terminals</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Terminal & Serial</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Provider / Type</th>
                    <th className="py-3 px-4">IP & Gateway</th>
                    <th className="py-3 px-4">Enrolled Users</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {biometricDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{dev.device_name}</div>
                        <div className="font-mono text-[11px] text-[#64748B]">{dev.serial_number}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#0F172B]">{dev.tenant_name}</div>
                        <div className="text-[11px] text-[#94A3B8]">{dev.location}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0F172B]">{dev.provider}</span>
                        <div className="text-[11px] text-[#64748B]">{dev.device_type}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[#334155]">{dev.ip_address}</div>
                        <div className="text-[11px] text-[#94A3B8]">{dev.gateway_name}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">{dev.enrolled_employees_count}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            dev.status === 'Online'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : dev.status === 'Syncing'
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : 'bg-[#FEF2F2] text-[#DC2626]'
                          )}
                        >
                          {dev.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncDevice(dev.id)}
                          className="text-xs text-[#047857] hover:bg-[#ECFDF5]"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Sync Punches
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 7: MESSAGING & SOCIAL (WhatsApp & Meta)
         --------------------------------------------------------- */}
      {activeTab === 'messaging' && (
        <div className="space-y-6">
          {/* WhatsApp Accounts */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0F172B]">WhatsApp Business Cloud API Hub</h3>
                  <p className="text-xs text-[#64748B]">Official Meta WABA phone numbers, broadcast capacity, and delivery rates</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {whatsappAccounts.map((wa) => (
                <div key={wa.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">{wa.verified_name}</h4>
                      <span className="font-mono text-[11px] text-[#047857] font-bold">{wa.display_phone_number}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#ECFDF5] text-[#047857]">
                      {wa.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] p-2.5 bg-white rounded-lg border border-[#E2E8F0] text-center">
                    <div>
                      <span className="text-[#64748B]">Today:</span>
                      <p className="font-bold text-[#0F172B]">{wa.messages_today.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Delivered:</span>
                      <p className="font-bold text-[#059669]">{wa.delivered_pct}%</p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Templates:</span>
                      <p className="font-bold text-[#0F172B]">{wa.templates_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Social & Ads */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#1877F2]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0F172B]">Meta / Facebook & Instagram Pages</h3>
                  <p className="text-xs text-[#64748B]">Lead ads retrieval, Instagram branding, and Graph API OAuth token health</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metaConnections.map((meta) => (
                <div key={meta.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">{meta.page_name}</h4>
                      <span className="text-[11px] text-[#64748B] font-mono">{meta.ig_handle}</span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold',
                        meta.token_status === 'Valid' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF3C7] text-[#92400E]'
                      )}
                    >
                      {meta.token_status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#64748B]">Expires in {meta.token_expires_in_days} days</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshMetaToken(meta.id)}
                      className="text-xs text-[#1877F2] border-[#CBD5E1]"
                    >
                      <RotateCw className="h-3 w-3 mr-1" /> Extend Token (60d)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 8: TENANT CONNECTIONS
         --------------------------------------------------------- */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172B]">Cross-Tenant Integration Bindings</h3>
              <p className="text-xs text-[#64748B]">Granular oversight of which enterprise tenants are utilizing which platform integrations.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Integration Provider</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Usage & Health</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {tenantConnections.map((tc) => (
                    <tr key={tc.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">{tc.tenant_name}</td>
                      <td className="py-3.5 px-4 font-semibold text-[#334155]">{tc.provider_key}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            tc.status === 'Connected' || tc.status === 'Healthy'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : tc.status === 'Degraded'
                              ? 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-[#FEF2F2] text-[#DC2626]'
                          )}
                        >
                          {tc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">{tc.usage_summary}</td>
                      <td className="py-3.5 px-4 text-[#64748B]">{tc.last_sync_at}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTenantDetails(tc)}
                          className="text-xs text-[#047857]"
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 9: SYNC & BACKGROUND JOBS
         --------------------------------------------------------- */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B]">Integration Sync & Worker Jobs</h3>
              <p className="text-xs text-[#64748B]">Scheduled background pull/push batches across devices and external cloud APIs.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTriggerSyncJob('Biometric Punch Force Batch', 'mantra_biometrics')}
              className="text-xs"
            >
              <Play className="h-3.5 w-3.5 mr-1 text-[#047857]" /> Trigger Manual Batch
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Job Description</th>
                    <th className="py-3 px-4">Tenant Scope</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Records</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {syncJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{job.job_name}</div>
                        <div className="text-[11px] text-[#64748B]">{job.started_at}</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#334155]">{job.tenant_name}</td>
                      <td className="py-3.5 px-4 font-mono text-[#334155]">{job.duration_sec}s</td>
                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">{job.records_processed} records</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            job.status === 'Completed'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : job.status === 'Failed'
                              ? 'bg-[#FEF2F2] text-[#DC2626]'
                              : 'bg-[#FFFBEB] text-[#D97706]'
                          )}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {job.status === 'Failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTriggerSyncJob(job.job_name, job.provider)}
                            className="text-xs text-[#2563EB]"
                          >
                            <RotateCw className="h-3 w-3 mr-1" /> Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 10: LOGS & EVENTS
         --------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172B]">Centralized Integration Event Logs</h3>
              <p className="text-xs text-[#64748B]">Audit logs with correlation request IDs and HTTP response times.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Message</th>
                    <th className="py-3 px-4">HTTP</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Request ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono text-[#64748B]">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-[#0F172B]">{log.provider}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#047857]">{log.event_type}</td>
                      <td className="py-3 px-4 text-[#334155] max-w-sm">{log.message}</td>
                      <td className="py-3 px-4 font-mono font-bold">{log.http_status || 200}</td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">{log.latency_ms || 45}ms</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#94A3B8]">{log.request_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 11: SECURITY CENTER
         --------------------------------------------------------- */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#047857]" />
                Integration Security Score
              </h3>
              <p className="text-xs text-[#64748B]">Continuous posture assessment across credentials, OAuth expiry, and certificates.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-[#047857]">94 / 100</span>
              <p className="text-[11px] text-[#64748B]">Excellent Protection</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Security Recommendations</h4>
            {securityAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3',
                  alert.status === 'Resolved'
                    ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60'
                    : alert.severity === 'Critical'
                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                    : 'bg-[#FFFBEB] border-[#FDE68A]'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold',
                        alert.severity === 'Critical' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#92400E]'
                      )}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-bold text-xs text-[#0F172B]">{alert.title}</span>
                  </div>
                  <p className="text-xs text-[#475569] mt-1">{alert.description}</p>
                  <p className="text-[11px] text-[#047857] font-semibold mt-1">💡 {alert.recommendation}</p>
                </div>

                {alert.status === 'Open' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    className="text-xs border-[#CBD5E1] text-[#334155] whitespace-nowrap"
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 12: DEVELOPER TOOLS (API Explorer)
         --------------------------------------------------------- */}
      {activeTab === 'developer' && <DeveloperToolsSection />}

      {/* ---------------------------------------------------------
          MODALS & DRAWERS
         --------------------------------------------------------- */}

      {/* 1. Add Integration 7-Step Wizard */}
      {isAddWizardOpen && (
        <AddIntegrationWizardModal
          onClose={() => setIsAddWizardOpen(false)}
          onCreated={() => {
            setIsAddWizardOpen(false);
            refreshData();
          }}
        />
      )}

      {/* 2. Create API Key Modal */}
      {isCreateKeyModalOpen && (
        <CreateApiKeyModal
          environment={environment}
          onClose={() => setIsCreateKeyModalOpen(false)}
          onCreated={() => {
            setIsCreateKeyModalOpen(false);
            refreshData();
          }}
        />
      )}

      {/* 3. Register OAuth App Modal */}
      {isCreateOAuthModalOpen && (
        <CreateOAuthAppModal
          environment={environment}
          onClose={() => setIsCreateOAuthModalOpen(false)}
          onCreated={() => {
            setIsCreateOAuthModalOpen(false);
            refreshData();
          }}
        />
      )}

      {/* 4. Live Connection Diagnostic Modal */}
      {testConnectionTarget && (
        <TestConnectionModal
          integration={testConnectionTarget}
          onClose={() => setTestConnectionTarget(null)}
        />
      )}

      {/* 5. Dangerous Action Confirmation Modal */}
      {confirmDialog.isOpen && (
        <ConfirmDangerousActionModal
          dialog={confirmDialog}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// SUB-COMPONENTS (Modals, Wizards & Developer Tools)
// -------------------------------------------------------------

/**
 * 7-Step Add Integration Wizard Modal
 */
const AddIntegrationWizardModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProviderMeta>(INTEGRATION_PROVIDERS_META[0]);
  const [scope, setScope] = useState<string>('Platform-wide');
  const [authType, setAuthType] = useState<string>('OAuth 2.0');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleRunDiagnostic = async () => {
    setIsTesting(true);
    const res = await platformIntegrationsService.testConnection({ provider_key: selectedProvider.provider_key });
    setIsTesting(false);
    setTestResult(res);
  };

  const handleActivate = async () => {
    await platformIntegrationsService.createIntegration({
      provider_key: selectedProvider.provider_key,
      name: selectedProvider.name,
      category: selectedProvider.category,
      description: selectedProvider.description,
      scope: scope as any,
      auth_type: authType as any,
      webhook_url: `https://api.workforceos.com/webhooks/${selectedProvider.provider_key}/live`,
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0]">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172B]">Add Integration</h3>
            <p className="text-xs text-[#64748B]">Step {step} of 7 — {selectedProvider.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 p-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div
              key={s}
              className={cn('h-1.5 rounded-full', s <= step ? 'bg-[#047857]' : 'bg-[#E2E8F0]')}
            />
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 1 — Select Provider</h4>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                {INTEGRATION_PROVIDERS_META.map((prov) => (
                  <div
                    key={prov.id}
                    onClick={() => {
                      setSelectedProvider(prov);
                      setAuthType(prov.supported_auth[0]);
                    }}
                    className={cn(
                      'p-3 rounded-xl border cursor-pointer transition-all',
                      selectedProvider.id === prov.id
                        ? 'border-[#047857] bg-[#ECFDF5]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    )}
                  >
                    <div className="font-bold text-[#0F172B]">{prov.name}</div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{prov.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 2 — Select Multi-Tenant Scope</h4>
              <p className="text-[#64748B]">Choose how this integration will be shared across client organizations:</p>
              {['Platform-wide', 'Specific tenant', 'Tenant group', 'Environment-specific'].map((sc) => (
                <label
                  key={sc}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer',
                    scope === sc ? 'border-[#047857] bg-[#ECFDF5]' : 'border-[#E2E8F0]'
                  )}
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === sc}
                    onChange={() => setScope(sc)}
                  />
                  <div>
                    <div className="font-bold text-[#0F172B]">{sc}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {sc === 'Platform-wide'
                        ? 'Available to all 186 active tenant organizations automatically.'
                        : 'Restricted to a single enterprise tenant connection.'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 3 — Authentication Method</h4>
              <div>
                <label className="font-semibold text-[#334155]">Supported Auth Mode</label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  {selectedProvider.supported_auth.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Secrets are securely encrypted using AES-256 and never stored in client state.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 4 — Granted Permissions</h4>
              <div className="p-3 bg-[#F8FAFC] border rounded-lg space-y-1">
                <span className="font-bold text-[#0F172B]">Required Scopes:</span>
                <ul className="list-disc pl-4 text-[#334155] space-y-0.5">
                  {selectedProvider.required_permissions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 5 — Auto-Generated Webhook</h4>
              <div className="p-3 rounded-lg bg-[#0F172B] text-white font-mono text-[11px] break-all">
                https://api.workforceos.com/webhooks/{selectedProvider.provider_key}/live
              </div>
              <p className="text-[11px] text-[#64748B]">Payload signing: HMAC SHA-256 with timestamp verification.</p>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 6 — Live Connectivity Test</h4>
              <Button
                variant="outline"
                size="sm"
                disabled={isTesting}
                onClick={handleRunDiagnostic}
                className="w-full border-[#047857] text-[#047857] hover:bg-[#ECFDF5]"
              >
                {isTesting ? <RotateCw className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Run Live Handshake Diagnostic
              </Button>

              {testResult && (
                <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1">
                  <div className="font-bold text-[#065F46]">✓ All 6 Checks Passed ({testResult.total_latency_ms}ms)</div>
                  <p className="text-[11px] text-[#047857]">TLS, DNS, API Ping and OAuth Handshake verified.</p>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-3 text-center py-4">
              <div className="h-12 w-12 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center mx-auto">
                <CheckCheck className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-[#0F172B] text-base">Ready to Activate Integration</h4>
              <p className="text-[#64748B] max-w-sm mx-auto">
                {selectedProvider.name} will be registered for {scope} in Production.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="text-xs"
          >
            Back
          </Button>

          {step < 7 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep(step + 1)}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
            >
              Next Step <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleActivate}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
            >
              Activate Integration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Create API Key Modal
 */
const CreateApiKeyModal: React.FC<{
  environment: IntegrationEnvironment;
  onClose: () => void;
  onCreated: () => void;
}> = ({ environment, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [rateLimit, setRateLimit] = useState(1000);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'employees:read',
    'attendance:read',
    'attendance:write',
  ]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) return;
    const res = await platformIntegrationsService.createApiKey({
      name,
      environment,
      scopes: selectedScopes,
      rate_limit_per_min: rateLimit,
    });
    setCreatedSecret(res.rawSecret);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
            <Key className="h-4 w-4 text-[#047857]" />
            Create Developer API Key
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!createdSecret ? (
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-[#334155]">Key Name / Description</label>
              <input
                type="text"
                placeholder="e.g. WorkForce Mobile Client Gateway"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 border rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-[#334155]">Granular Scopes</label>
              <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto p-1">
                {[
                  'employees:read',
                  'employees:write',
                  'attendance:read',
                  'attendance:write',
                  'payroll:read',
                  'payroll:write',
                  'devices:read',
                  'devices:write',
                  'messages:send',
                  'webhooks:manage',
                ].map((sc) => (
                  <label key={sc} className="flex items-center gap-1.5 text-xs font-mono cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(sc)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedScopes([...selectedScopes, sc]);
                        else setSelectedScopes(selectedScopes.filter((x) => x !== sc));
                      }}
                    />
                    {sc}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#334155]">Rate Limit (Requests / Min)</label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-lg text-xs"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={!name}
              onClick={handleCreate}
              className="w-full bg-[#047857] hover:bg-[#036246] text-white font-semibold py-2.5"
            >
              Generate API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46]">
              <span className="font-bold">✓ API Key Created Successfully:</span>
              <p className="text-[11px] mt-0.5">Copy this secret now. For security reasons, it will never be displayed again.</p>
            </div>

            <div className="p-3 rounded-lg bg-[#0F172B] text-white font-mono flex items-center justify-between">
              <span className="break-all">{createdSecret}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(createdSecret)}
                className="text-white hover:bg-white/10 ml-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Register OAuth App Modal
 */
const CreateOAuthAppModal: React.FC<{
  environment: IntegrationEnvironment;
  onClose: () => void;
  onCreated: () => void;
}> = ({ environment, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [redirectUri, setRedirectUri] = useState('https://app.example.com/oauth/callback');

  const handleCreate = async () => {
    if (!name) return;
    await platformIntegrationsService.createOAuthApp({
      name,
      environment,
      redirect_uris: [redirectUri],
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0F172B]">Register OAuth 2.0 Client</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="font-semibold text-[#334155]">Application Name</label>
          <input
            type="text"
            placeholder="e.g. WorkForce Mobile App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="font-semibold text-[#334155]">Redirect Callback URI</label>
          <input
            type="text"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg text-xs font-mono"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!name}
          onClick={handleCreate}
          className="w-full bg-[#047857] hover:bg-[#036246] text-white font-semibold py-2.5"
        >
          Register Client
        </Button>
      </div>
    </div>
  );
};

/**
 * Live Connection Diagnostic Test Modal
 */
const TestConnectionModal: React.FC<{
  integration: Integration;
  onClose: () => void;
}> = ({ integration, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setIsRunning(true);
    const res = await platformIntegrationsService.testConnection({ provider_key: integration.provider_key });
    setIsRunning(false);
    setResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172B]">Test Connection: {integration.name}</h3>
            <p className="text-xs text-[#64748B]">Runs 6-point live diagnostic check across DNS, TLS, Auth, and APIs.</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!result ? (
          <div className="text-center py-6 space-y-3">
            <Button
              variant="primary"
              size="sm"
              disabled={isRunning}
              onClick={runTest}
              className="bg-[#047857] hover:bg-[#036246] text-white font-semibold px-6 py-2.5"
            >
              {isRunning ? <RotateCw className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
              Run Diagnostic Handshake
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                'p-3.5 rounded-xl border flex items-center justify-between',
                result.success ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              )}
            >
              <span className="font-bold">
                {result.success ? '✓ Diagnostic Passed' : '✗ Diagnostic Failed'} (Health: {result.health_score}%)
              </span>
              <span className="font-mono">{result.total_latency_ms}ms total</span>
            </div>

            <div className="space-y-1.5">
              {result.checks.map((chk: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#0F172B]">{chk.name}</div>
                    <div className="text-[10px] text-[#64748B]">{chk.message}</div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded',
                      chk.status === 'Passed' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#DC2626]'
                    )}
                  >
                    {chk.status} ({chk.latency_ms}ms)
                  </span>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={runTest} className="w-full">
              Rerun Test
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Confirm Dangerous Action Modal with typed validation
 */
const ConfirmDangerousActionModal: React.FC<{
  dialog: any;
  onClose: () => void;
}> = ({ dialog, onClose }) => {
  const [typedValue, setTypedValue] = useState('');
  const canConfirm = !dialog.requireTypeConfirm || typedValue === dialog.requireTypeConfirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-[#E2E8F0] text-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-[#0F172B]">{dialog.title}</h3>
        </div>

        <p className="text-[#64748B] leading-relaxed">{dialog.description}</p>

        {dialog.requireTypeConfirm && (
          <div className="space-y-1 pt-1">
            <label className="font-semibold text-[#334155]">
              Type <strong className="text-[#DC2626] font-mono">{dialog.requireTypeConfirm}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={dialog.requireTypeConfirm}
              className="w-full p-2 border rounded-lg font-mono text-xs"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canConfirm}
            onClick={dialog.onConfirm}
            className="text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            {dialog.actionText}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Developer Tools Interactive API Explorer
 */
const DeveloperToolsSection: React.FC = () => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [endpoint, setEndpoint] = useState('/api/v2/employees?department=Engineering');
  const [isExecuting, setIsExecuting] = useState(false);
  const [explorerResponse, setExplorerResponse] = useState<any>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    const res = await platformIntegrationsService.executeApiExplorer({ method, endpoint });
    setIsExecuting(false);
    setExplorerResponse(res);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4 max-w-4xl text-xs">
      <div>
        <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
          <Terminal className="h-5 w-5 text-[#047857]" />
          Platform API Explorer & Sandbox
        </h3>
        <p className="text-xs text-[#64748B]">
          Directly execute live authenticated requests against the WorkForceOS OpenAPI Gateway.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className="p-2.5 rounded-lg border font-mono font-bold bg-[#F8FAFC] text-[#0F172B]"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="flex-1 p-2.5 rounded-lg border font-mono text-xs"
        />

        <Button
          variant="primary"
          size="sm"
          disabled={isExecuting}
          onClick={handleExecute}
          className="bg-[#047857] hover:bg-[#036246] text-white font-semibold px-4 py-2.5"
        >
          {isExecuting ? <RotateCw className="h-4 w-4 animate-spin" /> : 'Send Request'}
        </Button>
      </div>

      {explorerResponse && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#0F172B]">Response JSON</span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded font-bold bg-[#ECFDF5] text-[#059669]">
                HTTP {explorerResponse.http_status} OK
              </span>
              <span className="text-[#64748B]">{explorerResponse.latency_ms}ms</span>
            </div>
          </div>
          <pre className="p-4 rounded-xl bg-[#0F172B] text-[#34D399] font-mono text-[11px] overflow-x-auto max-h-96">
            {JSON.stringify(explorerResponse.response_json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
