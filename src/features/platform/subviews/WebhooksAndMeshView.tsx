// src/features/platform/subviews/WebhooksAndMeshView.tsx
// ============================================================
// WorkForceOS — Webhooks & Event Mesh Control Center
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
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
  Layers,
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
} from 'lucide-react';
import {
  WebhookEnvironment,
  WebhookEndpoint,
  WebhookDelivery,
  DeadLetterEvent,
  EventTypeSchema,
  EventRoute,
  EventConsumer,
  EventMeshMetrics,
  FailureGroup,
  WebhookAuditLog,
  LiveActivityItem,
  WebhookEndpointStatus,
  RealtimeEngineStatus,
} from '../../../types/webhooksMesh';
import { platformWebhooksMeshService } from '../../../services/platform/platformWebhooksMeshService';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Tabs } from '../../../components/ui/Tabs';
import { cn } from '../../../lib/utils';

export const WebhooksAndMeshView: React.FC = () => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [environment, setEnvironment] = useState<WebhookEnvironment>('Production');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('All');
  const [httpCodeFilter, setHttpCodeFilter] = useState<string>('All');
  const [selectedEndpointFilter, setSelectedEndpointFilter] = useState<string>('All');

  // Realtime Connection Status State
  const [realtimeEngineStatus, setRealtimeEngineStatus] = useState<RealtimeEngineStatus>('Realtime Connected');

  // Real-time ticking relative counter
  const [lastCheckedCounter, setLastCheckedCounter] = useState<number>(8);

  // Data Sources
  const [metrics, setMetrics] = useState<EventMeshMetrics>(() => platformWebhooksMeshService.getMetrics());
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(() => platformWebhooksMeshService.getEndpoints());
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(() => platformWebhooksMeshService.getDeliveries());
  const [deadLetters, setDeadLetters] = useState<DeadLetterEvent[]>(() => platformWebhooksMeshService.getDeadLetters());
  const [eventTypes] = useState<EventTypeSchema[]>(() => platformWebhooksMeshService.getEventTypes());
  const [failureGroups] = useState<FailureGroup[]>(() => platformWebhooksMeshService.getFailureGroups());
  const [eventRoutes] = useState<EventRoute[]>(() => platformWebhooksMeshService.getEventRoutes());
  const [eventConsumers] = useState<EventConsumer[]>(() => platformWebhooksMeshService.getEventConsumers());
  const [auditLogs, setAuditLogs] = useState<WebhookAuditLog[]>(() => platformWebhooksMeshService.getAuditLogs());
  const [liveActivity, setLiveActivity] = useState<LiveActivityItem[]>(() => platformWebhooksMeshService.getLiveActivity());

  // Realtime synchronization on mount
  useEffect(() => {
    const unsub = platformWebhooksMeshService.subscribeToRealtime(
      () => {
        refreshData();
      },
      (status) => {
        setRealtimeEngineStatus(status);
      }
    );
    return () => {
      unsub();
    };
  }, []);

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestEventModalOpen, setIsTestEventModalOpen] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [isSecretRotateModalOpen, setIsSecretRotateModalOpen] = useState(false);
  const [selectedEndpointForSecret, setSelectedEndpointForSecret] = useState<WebhookEndpoint | null>(null);

  // Drawers
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [selectedDeadLetter, setSelectedDeadLetter] = useState<DeadLetterEvent | null>(null);
  const [selectedMeshNode, setSelectedMeshNode] = useState<{
    id: string;
    title: string;
    type: string;
    status: string;
    throughput?: string;
    latency?: string;
    details?: any;
  } | null>(null);
  const [selectedEventTypeForSchema, setSelectedEventTypeForSchema] = useState<EventTypeSchema | null>(null);

  // Privileged Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionText: string;
    isDangerous?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionText: 'Confirm',
    onConfirm: () => {},
  });

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mask PII Toggle for Payloads
  const [maskPii, setMaskPii] = useState<boolean>(true);

  // Auto-refresh interval simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setLastCheckedCounter((prev) => (prev > 25 ? 2 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = () => {
    setMetrics(platformWebhooksMeshService.getMetrics());
    setEndpoints([...platformWebhooksMeshService.getEndpoints()]);
    setDeliveries([...platformWebhooksMeshService.getDeliveries()]);
    setDeadLetters([...platformWebhooksMeshService.getDeadLetters()]);
    setAuditLogs([...platformWebhooksMeshService.getAuditLogs()]);
    setLiveActivity([...platformWebhooksMeshService.getLiveActivity()]);
    setLastCheckedCounter(0);
  };

  // Filtered Endpoints by Environment
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((e) => e.environment === environment);
  }, [endpoints, environment]);

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchEnv = d.environment === environment;
      const matchStatus = deliveryStatusFilter === 'All' || d.status === deliveryStatusFilter;
      const matchEndpoint = selectedEndpointFilter === 'All' || d.endpoint_id === selectedEndpointFilter;
      const matchHttp =
        httpCodeFilter === 'All' ||
        (httpCodeFilter === '2xx' && d.http_status >= 200 && d.http_status < 300) ||
        (httpCodeFilter === '4xx' && d.http_status >= 400 && d.http_status < 500) ||
        (httpCodeFilter === '5xx' && d.http_status >= 500);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.id.toLowerCase().includes(q) ||
        d.event_id.toLowerCase().includes(q) ||
        d.event_type.toLowerCase().includes(q) ||
        d.endpoint_name.toLowerCase().includes(q) ||
        d.tenant_name.toLowerCase().includes(q) ||
        d.http_status.toString().includes(q);

      return matchEnv && matchStatus && matchEndpoint && matchHttp && matchSearch;
    });
  }, [deliveries, environment, deliveryStatusFilter, selectedEndpointFilter, httpCodeFilter, searchQuery]);

  // Actions
  const handleToggleEndpoint = async (id: string, currentStatus: WebhookEndpointStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    await platformWebhooksMeshService.toggleEndpointStatus(id, nextStatus);
    refreshData();
  };

  const handleRetrySingleDelivery = async (deliveryId: string) => {
    try {
      await platformWebhooksMeshService.retryDelivery(deliveryId);
      refreshData();
      if (selectedDelivery?.id === deliveryId) {
        const updated = platformWebhooksMeshService.getDeliveryById(deliveryId);
        if (updated) setSelectedDelivery({ ...updated });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkRetryFailures = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Bulk Retry Failed Webhook Deliveries',
      description:
        'This will immediately requeue all failed webhook deliveries in the current environment with exponential backoff. External systems may experience a sudden burst of HTTP requests.',
      actionText: 'Execute Bulk Retry',
      isDangerous: false,
      onConfirm: async () => {
        await platformWebhooksMeshService.bulkRetryFailures();
        refreshData();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRequeueDeadLetter = async (dlqId: string) => {
    await platformWebhooksMeshService.retryDeadLetter(dlqId);
    refreshData();
    if (selectedDeadLetter?.id === dlqId) {
      setSelectedDeadLetter(null);
    }
  };

  const handleDiscardDeadLetter = (dlqId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Discard Dead Letter Event',
      description:
        'Are you sure you want to discard this event from the Dead Letter Queue? This action cannot be undone and will permanently drop the payload from automatic retry workers.',
      actionText: 'Discard Event',
      isDangerous: true,
      onConfirm: async () => {
        await platformWebhooksMeshService.discardDeadLetter(dlqId, 'Manually dropped by Super Admin');
        refreshData();
        if (selectedDeadLetter?.id === dlqId) setSelectedDeadLetter(null);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // -------------------------------------------------------------
  // Render Main Layout
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Webhooks & Event Mesh</h1>
            {/* Environment Indicator Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setEnvironment('Production')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all',
                  environment === 'Production'
                    ? 'bg-[#047857] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172B]'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', environment === 'Production' ? 'bg-white' : 'bg-[#10B981]')} />
                PRODUCTION
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('Staging')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all',
                  environment === 'Staging'
                    ? 'bg-[#D97706] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172B]'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', environment === 'Staging' ? 'bg-white' : 'bg-[#F59E0B]')} />
                STAGING
              </button>
            </div>

            {/* Realtime Engine Status Indicator */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                realtimeEngineStatus === 'Realtime Connected'
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                  : realtimeEngineStatus === 'Realtime Reconnecting'
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  realtimeEngineStatus === 'Realtime Connected'
                    ? 'bg-[#10B981] animate-pulse'
                    : realtimeEngineStatus === 'Realtime Reconnecting'
                    ? 'bg-[#F59E0B] animate-pulse'
                    : 'bg-[#EF4444]'
                )}
              />
              <span>{realtimeEngineStatus}</span>
            </div>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Manage event routing, webhook integrations, delivery health, retries and event infrastructure across the WorkForceOS platform.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Layers className="h-4 w-4 text-[#64748B]" />
            Event Catalog
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestEventModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Play className="h-4 w-4 text-[#047857]" />
            Test Event
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReplayModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RotateCw className="h-4 w-4 text-[#2563EB]" />
            Replay Events
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-sm"
          >
            <Send className="h-4 w-4" />
            + Create Webhook Endpoint
          </Button>
        </div>
      </div>

      {/* 2. Top Operational Status Banner */}
      <div
        className={cn(
          'w-full p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors',
          metrics.mesh_status === 'Operational'
            ? 'bg-[#ECFDF5] border-[#A7F3D0]'
            : metrics.mesh_status === 'Degraded'
            ? 'bg-[#FFFBEB] border-[#FDE68A]'
            : 'bg-[#FEF2F2] border-[#FECACA]'
        )}
      >
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                metrics.mesh_status === 'Operational'
                  ? 'bg-[#10B981]'
                  : metrics.mesh_status === 'Degraded'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2.5 w-2.5 rounded-full',
                metrics.mesh_status === 'Operational'
                  ? 'bg-[#059669]'
                  : metrics.mesh_status === 'Degraded'
                  ? 'bg-[#D97706]'
                  : 'bg-[#DC2626]'
              )}
            />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-bold text-[#0F172B]">
                {metrics.mesh_status === 'Operational'
                  ? 'Event Infrastructure Operational'
                  : metrics.mesh_status === 'Degraded'
                  ? 'Event Delivery Degraded'
                  : 'Event Delivery Incident'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/80 border border-black/5 text-[#475569]">
                {metrics.delivery_success_pct}% delivery success
              </span>
              <span className="text-xs text-[#64748B] flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last checked {lastCheckedCounter}s ago
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">{metrics.mesh_status_message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {metrics.mesh_status !== 'Operational' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('failures')}
              className="bg-white border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7] text-xs font-semibold"
            >
              Review Failures ({metrics.at_risk_endpoints_count} At Risk)
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            className="text-[#475569] hover:bg-black/5 text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 3. Operational KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1 */}
        <div
          onClick={() => setActiveTab('overview')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#94A3B8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Events / Min</span>
            <Activity className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.events_per_min.toLocaleString()}</span>
            <span className="text-[11px] font-semibold text-[#059669] flex items-center">
              <ArrowUpRight className="h-3 w-3" /> {metrics.events_per_min_trend}%
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Throughput rate</p>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => setActiveTab('deliveries')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#94A3B8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Delivery Success</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.delivery_success_pct}%</span>
            <span className="text-[11px] font-semibold text-[#059669] flex items-center">
              <ArrowUpRight className="h-3 w-3" /> {metrics.delivery_success_trend}%
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Last 24 hours</p>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => setActiveTab('failures')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#94A3B8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Failed Deliveries</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#E11D48]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.failed_deliveries_count}</span>
            <span className="text-[11px] font-semibold text-[#059669] flex items-center">
              <ArrowDownRight className="h-3 w-3" /> {Math.abs(metrics.failed_deliveries_trend)}%
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Requires retry</p>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => setActiveTab('overview')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#94A3B8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Pending Queue</span>
            <Database className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.pending_queue_depth.toLocaleString()}</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded font-semibold bg-[#ECFDF5] text-[#059669]">
              ● Healthy
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Buffer depth</p>
        </div>

        {/* KPI 5 */}
        <div
          onClick={() => setActiveTab('endpoints')}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#94A3B8] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Active Endpoints</span>
            <Globe className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{filteredEndpoints.length}</span>
            <span className="text-[11px] text-[#64748B] font-medium">
              {metrics.healthy_endpoints_count} Healthy / {metrics.at_risk_endpoints_count} At Risk
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">{environment} cluster</p>
        </div>

        {/* KPI 6 */}
        <div
          onClick={() => setActiveTab('dlq')}
          className={cn(
            'p-3.5 rounded-xl border shadow-sm transition-all cursor-pointer group',
            metrics.dead_letter_count > 0
              ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#F59E0B]'
              : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
          )}
        >
          <div className="flex items-center justify-between text-xs text-[#92400E] font-medium">
            <span>Dead Letter</span>
            <AlertOctagon className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172B]">{metrics.dead_letter_count}</span>
            <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
              ⚠ Review
            </span>
          </div>
          <p className="text-[11px] text-[#B45309] mt-1">Exhausted retries</p>
        </div>
      </div>

      {/* 4. Navigation Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Mesh', icon: Activity, badge: null },
            { id: 'endpoints', label: 'Webhook Endpoints', icon: Globe, badge: filteredEndpoints.length },
            { id: 'deliveries', label: 'Delivery Logs', icon: Terminal, badge: deliveries.length },
            { id: 'failures', label: 'Failure Center', icon: AlertTriangle, badge: metrics.failed_deliveries_count > 0 ? metrics.failed_deliveries_count : null },
            { id: 'dlq', label: 'Dead Letter Queue', icon: AlertOctagon, badge: metrics.dead_letter_count },
            { id: 'catalog', label: 'Event Catalog & Routes', icon: Layers, badge: eventTypes.length },
            { id: 'replay', label: 'Event Replay', icon: RotateCw, badge: null },
            { id: 'security', label: 'Security & Secrets', icon: ShieldCheck, badge: null },
            { id: 'audit', label: 'Audit Trail', icon: FileCode, badge: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-[#047857] text-[#047857]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172B] hover:border-[#CBD5E1]'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.2 rounded-full font-bold',
                      tab.id === 'failures' || tab.id === 'dlq'
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
          TAB 1: OVERVIEW & EVENT MESH
         --------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Interactive Event Flow Visualizer */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#047857]" />
                  Event Mesh Flow & Routing Architecture
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Click any node to inspect real-time queue depth, latency telemetry, and consumer workers.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md font-mono font-medium bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                Event Mesh Engine: {metrics.engine_name || 'PostgreSQL + Supabase Realtime + Queues'}
              </span>
            </div>

            {/* Visual Node Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative items-stretch">
              {/* Node 1: Producers */}
              <div
                onClick={() =>
                  setSelectedMeshNode({
                    id: 'node-producers',
                    title: 'WorkForceOS Event Sources (Producers)',
                    type: 'Producer Tier',
                    status: 'Operational',
                    throughput: `${metrics.events_per_min.toLocaleString()} events/min`,
                    latency: '4ms ingest',
                    details: [
                      'Core HR & Employee Lifecycle',
                      'Time & Attendance Geofence Engine',
                      'Payroll Calculation Engine',
                      'Platform Billing & Invoicing Engine',
                      'Zero-Trust Security Monitor',
                      'WorkForce Copilot AI Engine',
                    ],
                  })
                }
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#047857] hover:bg-[#F0FDF4] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">1. Producers</span>
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172B] group-hover:text-[#047857]">WorkForceOS Events</h4>
                  <p className="text-xs text-[#64748B] mt-1">{metrics.producers_count || 14} Domain Services</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#334155]">
                  <span>Rate</span>
                  <span className="font-bold text-[#047857]">{metrics.events_per_min.toLocaleString()}/min</span>
                </div>
              </div>

              {/* Node 2: Event Mesh / Bus */}
              <div
                onClick={() =>
                  setSelectedMeshNode({
                    id: 'node-bus',
                    title: 'Event Mesh / Supabase Durable Queues',
                    type: 'PostgreSQL Ingestion Broker',
                    status: 'Operational',
                    throughput: `${(metrics.events_per_min * 1.5 / 1000).toFixed(1)} KB/s ingress`,
                    latency: '8ms replication',
                    details: [
                      'PostgreSQL 15+ Immutable Store',
                      'Transactional Outbox Architecture',
                      'Supabase Realtime Broadcast Pub/Sub',
                      `Current Buffered Queue: ${metrics.pending_queue_depth.toLocaleString()} in flight`,
                      'Durable PGMQ Message Leases',
                    ],
                  })
                }
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">2. Event Bus</span>
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172B] group-hover:text-[#2563EB]">Event Mesh Core</h4>
                  <p className="text-xs text-[#64748B] mt-1">PostgreSQL & Supabase Realtime</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#334155]">
                  <span>Queue Buffer</span>
                  <span className="font-bold text-[#2563EB]">{metrics.pending_queue_depth.toLocaleString()} queued</span>
                </div>
              </div>

              {/* Node 3: Router */}
              <div
                onClick={() =>
                  setSelectedMeshNode({
                    id: 'node-router',
                    title: 'Event Router & Subscription Matcher',
                    type: 'Routing Engine',
                    status: 'Operational',
                    throughput: `${metrics.events_per_min.toLocaleString()} events routed/min`,
                    latency: '6ms evaluation',
                    details: [
                      'JSON Schema Validator (Draft-07)',
                      'Tenant Isolation Barrier',
                      'Environment Safety Gate',
                      'Route Priority QoS Engine',
                    ],
                  })
                }
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#7C3AED] hover:bg-[#F5F3FF] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">3. Router</span>
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172B] group-hover:text-[#7C3AED]">Event Router</h4>
                  <p className="text-xs text-[#64748B] mt-1">Filter & Subscription Match</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#334155]">
                  <span>Active Routes</span>
                  <span className="font-bold text-[#7C3AED]">{metrics.active_routes_count || 6} Routes Active</span>
                </div>
              </div>

              {/* Node 4: Webhook Dispatcher */}
              <div
                onClick={() =>
                  setSelectedMeshNode({
                    id: 'node-dispatcher',
                    title: 'Outbound Webhook Dispatcher & Workers',
                    type: 'Delivery Fleet',
                    status: metrics.at_risk_endpoints_count > 0 ? 'Operational (1 At Risk)' : 'Operational',
                    throughput: `${Math.round(metrics.events_per_min / 2)} deliveries/min`,
                    latency: `${metrics.avg_latency_ms}ms avg HTTP`,
                    details: [
                      'Central Background Jobs Workers',
                      'HMAC-SHA256 Payload Signer',
                      'Exponential Backoff Retry Engine',
                      'Dead Letter Queue Handler',
                      'SSRF IP Range Protection Guard',
                    ],
                  })
                }
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#D97706] hover:bg-[#FFFBEB] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">4. Webhooks</span>
                    <span className={cn('h-2 w-2 rounded-full animate-pulse', metrics.at_risk_endpoints_count > 0 ? 'bg-[#F59E0B]' : 'bg-[#10B981]')} />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172B] group-hover:text-[#D97706]">Webhook Dispatcher</h4>
                  <p className="text-xs text-[#64748B] mt-1">HMAC SHA-256 Outbound</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#334155]">
                  <span>Success Rate</span>
                  <span className="font-bold text-[#059669]">{metrics.delivery_success_pct}%</span>
                </div>
              </div>

              {/* Node 5: External Systems & Consumers */}
              <div
                onClick={() =>
                  setSelectedMeshNode({
                    id: 'node-targets',
                    title: 'External Destinations & Internal Consumers',
                    type: 'Target Consumers',
                    status: 'Operational',
                    details: [
                      'SAP S/4HANA (Acme ERP)',
                      'Slack Enterprise Webhook Bot',
                      'Zenith Biometric Kiosk Gateway',
                      'Internal Payroll Worker Fleet',
                      'Audit Log Archival Mesh Consumer',
                    ],
                  })
                }
                className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#0F172B] hover:bg-[#F1F5F9] transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">5. Targets</span>
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172B]">External & Internal</h4>
                  <p className="text-xs text-[#64748B] mt-1">{filteredEndpoints.length} Endpoints + {eventConsumers.length} Consumers</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#334155]">
                  <span>Active Targets</span>
                  <span className="font-bold text-[#0F172B]">{filteredEndpoints.length + eventConsumers.length} Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Mesh Subsystem Health Cards + Live Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Subsystem Health & Consumer Nodes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Mesh Subsystems */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                    <Server className="h-4 w-4 text-[#64748B]" />
                    Event Mesh Subsystem Health
                  </h3>
                  <span className="text-xs text-[#64748B]">All services monitored in real-time</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Event Bus', status: 'Operational', latency: '4ms', color: 'text-[#059669]' },
                    { label: 'Event Router', status: 'Operational', latency: '8ms', color: 'text-[#059669]' },
                    { label: 'Delivery Workers', status: 'Operational', latency: '284ms', color: 'text-[#059669]' },
                    { label: 'Ingress Queue', status: 'Healthy (1,842 queued)', latency: '12ms', color: 'text-[#059669]' },
                    { label: 'Dead Letter Queue', status: '3 Events (Review)', latency: '—', color: 'text-[#D97706]' },
                    { label: 'Retry Processor', status: 'Operational (Backoff)', latency: '10s-30m', color: 'text-[#059669]' },
                  ].map((sub, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0F172B]">{sub.label}</span>
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            sub.status.includes('Review') ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                          )}
                        />
                      </div>
                      <p className={cn('text-xs font-semibold mt-1', sub.color)}>{sub.status}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Latency: {sub.latency}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Event Consumers */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172B]">Internal Mesh Consumers</h3>
                    <p className="text-xs text-[#64748B]">Background service workers subscribed to core platform events</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('catalog')} className="text-xs text-[#047857]">
                    View Routes <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                        <th className="py-2.5 px-3">Consumer Worker</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Queue Depth</th>
                        <th className="py-2.5 px-3">Processing Rate</th>
                        <th className="py-2.5 px-3">Consumer Lag</th>
                        <th className="py-2.5 px-3">Heartbeat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {eventConsumers.map((csm) => (
                        <tr key={csm.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#0F172B]">{csm.name}</div>
                            <div className="text-[11px] text-[#94A3B8] font-mono">{csm.service_name}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                              {csm.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#334155]">{csm.queue_depth}</td>
                          <td className="py-3 px-3 text-[#334155]">{csm.processing_rate_per_min}/min</td>
                          <td className="py-3 px-3 font-mono text-[#334155]">{csm.lag_ms}ms</td>
                          <td className="py-3 px-3 text-[#64748B]">{csm.last_heartbeat_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Live Activity Stream */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#047857] animate-pulse" />
                    Live Event Stream
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] font-semibold">
                    Realtime
                  </span>
                </div>

                <div className="space-y-3">
                  {liveActivity.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-lg border text-xs transition-all',
                        item.type === 'success'
                          ? 'border-[#E2E8F0] bg-[#F8FAFC]'
                          : item.type === 'warning'
                          ? 'border-[#FDE68A] bg-[#FFFBEB]'
                          : 'border-[#FECACA] bg-[#FEF2F2]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#0F172B]">{item.event_type}</span>
                        <span className="text-[11px] text-[#64748B]">{item.time_ago}</span>
                      </div>
                      <p className="text-[#334155] mt-1">{item.message}</p>
                      {item.endpoint_name && (
                        <div className="mt-1 text-[11px] text-[#64748B] flex items-center gap-1 font-medium">
                          <Globe className="h-3 w-3 text-[#94A3B8]" />
                          {item.endpoint_name} ({item.tenant_name})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('deliveries')}
                  className="w-full text-xs font-semibold text-[#0F172B] border-[#CBD5E1]"
                >
                  View Full Delivery Logs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: WEBHOOK ENDPOINTS DIRECTORY
         --------------------------------------------------------- */}
      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search endpoints by name, URL, tenant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
              >
                + Create Endpoint
              </Button>
            </div>
          </div>

          {/* Endpoints Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Endpoint & URL</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Subscribed Events</th>
                    <th className="py-3 px-4">Health Score</th>
                    <th className="py-3 px-4">Success Rate</th>
                    <th className="py-3 px-4">Latency (Avg / P95)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredEndpoints.map((ep) => (
                    <tr key={ep.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172B]">{ep.name}</div>
                        <div className="text-[11px] font-mono text-[#64748B] max-w-xs truncate mt-0.5">{ep.url}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            {ep.auth_type}
                          </span>
                          {ep.tls_verified && (
                            <span className="text-[10px] font-semibold text-[#059669] flex items-center gap-0.5">
                              <ShieldCheck className="h-3 w-3" /> TLS 1.3
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172B]">{ep.tenant_name}</div>
                        <div className="text-[11px] text-[#94A3B8]">{ep.environment}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-[#0F172B]">{ep.events.length} Events</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate max-w-[160px]">{ep.events.join(', ')}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'text-sm font-bold',
                              ep.health_score >= 90
                                ? 'text-[#059669]'
                                : ep.health_score >= 70
                                ? 'text-[#D97706]'
                                : 'text-[#DC2626]'
                            )}
                          >
                            {ep.health_score} / 100
                          </div>
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {ep.consecutive_failures > 0 ? `${ep.consecutive_failures} fail streak` : '0 failures'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0F172B]">{ep.success_rate}%</div>
                        <div className="text-[11px] text-[#94A3B8]">Last: {ep.last_success_at || 'Never'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[#0F172B] font-medium">{ep.avg_latency_ms}ms</div>
                        <div className="text-[11px] font-mono text-[#94A3B8]">P95: {ep.p95_latency_ms}ms</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
                            ep.status === 'Active'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : ep.status === 'Failing'
                              ? 'bg-[#FEF2F2] text-[#DC2626]'
                              : 'bg-[#FFFBEB] text-[#D97706]'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              ep.status === 'Active'
                                ? 'bg-[#10B981]'
                                : ep.status === 'Failing'
                                ? 'bg-[#EF4444]'
                                : 'bg-[#F59E0B]'
                            )}
                          />
                          {ep.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Send Test Event"
                            onClick={() => {
                              setIsTestEventModalOpen(true);
                            }}
                            className="text-[#64748B] hover:text-[#047857] p-1.5"
                          >
                            <Play className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title={ep.status === 'Active' ? 'Pause Endpoint' : 'Resume Endpoint'}
                            onClick={() => handleToggleEndpoint(ep.id, ep.status)}
                            className="text-[#64748B] hover:text-[#0F172B] p-1.5"
                          >
                            {ep.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-[#059669]" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rotate HMAC Secret"
                            onClick={() => {
                              setSelectedEndpointForSecret(ep);
                              setIsSecretRotateModalOpen(true);
                            }}
                            className="text-[#64748B] hover:text-[#2563EB] p-1.5"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </div>
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
          TAB 3: DELIVERY LOGS
         --------------------------------------------------------- */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Filter by Event ID, Type, Tenant, HTTP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={deliveryStatusFilter}
                onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="Failed">Failed</option>
                <option value="Retrying">Retrying</option>
                <option value="Dead Letter">Dead Letter</option>
              </select>

              {/* HTTP Code Filter */}
              <select
                value={httpCodeFilter}
                onChange={(e) => setHttpCodeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155] focus:outline-none"
              >
                <option value="All">All HTTP Codes</option>
                <option value="2xx">HTTP 2xx (Success)</option>
                <option value="4xx">HTTP 4xx (Client Error)</option>
                <option value="5xx">HTTP 5xx (Server Error)</option>
              </select>

              {/* Endpoint Filter */}
              <select
                value={selectedEndpointFilter}
                onChange={(e) => setSelectedEndpointFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155] focus:outline-none max-w-[200px]"
              >
                <option value="All">All Endpoints</option>
                {filteredEndpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshData} className="text-xs text-[#475569]">
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* Delivery Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Event ID & Type</th>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">HTTP</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Attempt</th>
                    <th className="py-3 px-4">Delivered At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredDeliveries.map((del) => (
                    <tr
                      key={del.id}
                      onClick={() => setSelectedDelivery(del)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#0F172B]">{del.event_id}</div>
                        <div className="text-[11px] font-mono text-[#047857]">{del.event_type}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172B]">{del.endpoint_name}</div>
                        <div className="text-[11px] text-[#94A3B8]">{del.environment}</div>
                      </td>

                      <td className="py-3 px-4 font-medium text-[#334155]">{del.tenant_name}</td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            del.status === 'Delivered'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : del.status === 'Failed'
                              ? 'bg-[#FEF2F2] text-[#DC2626]'
                              : 'bg-[#FFFBEB] text-[#D97706]'
                          )}
                        >
                          {del.status === 'Delivered' && <Check className="h-3 w-3" />}
                          {del.status === 'Failed' && <X className="h-3 w-3" />}
                          {del.status === 'Retrying' && <RotateCw className="h-3 w-3 animate-spin" />}
                          {del.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'font-mono font-bold px-1.5 py-0.5 rounded text-[11px]',
                            del.http_status >= 200 && del.http_status < 300
                              ? 'bg-[#ECFDF5] text-[#059669]'
                              : del.http_status >= 400 && del.http_status < 500
                              ? 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-[#FEF2F2] text-[#DC2626]'
                          )}
                        >
                          {del.http_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#334155]">{del.response_time_ms}ms</td>

                      <td className="py-3 px-4 font-medium text-[#334155]">
                        {del.attempt_count} / {del.max_attempts}
                      </td>

                      <td className="py-3 px-4 text-[#64748B]">
                        {del.delivered_at
                          ? new Date(del.delivered_at).toLocaleTimeString()
                          : del.failed_at
                          ? 'Failed'
                          : 'In progress'}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Inspect Delivery Drawer"
                            onClick={() => setSelectedDelivery(del)}
                            className="text-[#64748B] hover:text-[#0F172B] p-1"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {del.status === 'Failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Retry Delivery"
                              onClick={() => handleRetrySingleDelivery(del.id)}
                              className="text-[#2563EB] hover:text-[#1D4ED8] p-1"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
          TAB 4: FAILURE CENTER
         --------------------------------------------------------- */}
      {activeTab === 'failures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-[#D97706] shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#92400E]">Delivery Failure Center</h3>
                <p className="text-xs text-[#B45309]">
                  Collapses recurring errors into smart groups to rapidly diagnose endpoint timeouts, 5xx server errors, and rate limits.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkRetryFailures}
                className="bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                Retry All Failed Deliveries
              </Button>
            </div>
          </div>

          {/* Grouped Error Cards */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#0F172B]">Aggregated Error Signatures</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {failureGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:border-[#F59E0B] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-[#FEF2F2] text-[#DC2626]">
                        HTTP {group.http_status}
                      </span>
                      <span className="text-xs font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                        {group.count} failures
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#0F172B] mt-3">{group.endpoint_name}</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">Tenant: {group.tenant_name}</p>

                    <div className="mt-4 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                      <div className="text-[#334155] font-semibold">{group.error_type}</div>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2">
                        <span>First: {group.first_seen}</span>
                        <span>Latest: {group.last_seen}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const sample = deliveries.find((d) => d.id === group.sample_delivery_id);
                        if (sample) setSelectedDelivery(sample);
                      }}
                      className="text-xs text-[#047857] p-0 hover:bg-transparent"
                    >
                      Investigate Sample <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkRetryFailures()}
                      className="text-xs border-[#CBD5E1] text-[#334155]"
                    >
                      Retry Group
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 5: DEAD LETTER QUEUE (DLQ)
         --------------------------------------------------------- */}
      {activeTab === 'dlq' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-[#D97706]" />
                Dead Letter Queue (DLQ)
              </h3>
              <p className="text-xs text-[#64748B]">
                Contains events whose maximum retry limit (8/8) has been completely exhausted.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-[#FEF3C7] text-[#92400E] font-bold">
                {deadLetters.filter((d) => d.status === 'Pending Review').length} Pending Review
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Event ID & Type</th>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Reason / Last Error</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {deadLetters.map((dlq) => (
                    <tr key={dlq.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#0F172B]">{dlq.event_id}</div>
                        <div className="text-[11px] font-mono text-[#047857]">{dlq.event_type}</div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#0F172B]">{dlq.endpoint_name}</td>

                      <td className="py-3 px-4 text-[#334155]">{dlq.tenant_name}</td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[#DC2626] font-semibold truncate">{dlq.error_code}</div>
                        <div className="text-[11px] text-[#64748B] truncate">{dlq.last_error}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-[#334155]">
                        {dlq.attempt_count} / {dlq.max_attempts}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            dlq.status === 'Pending Review'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : dlq.status === 'Requeued'
                              ? 'bg-[#ECFDF5] text-[#059669]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          )}
                        >
                          {dlq.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDeadLetter(dlq)}
                            className="text-xs text-[#047857] hover:bg-[#ECFDF5]"
                          >
                            Inspect
                          </Button>
                          {dlq.status === 'Pending Review' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequeueDeadLetter(dlq.id)}
                                className="text-xs border-[#CBD5E1] text-[#2563EB]"
                              >
                                Requeue
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDiscardDeadLetter(dlq.id)}
                                className="text-xs text-[#DC2626] hover:bg-[#FEE2E2]"
                              >
                                Discard
                              </Button>
                            </>
                          )}
                        </div>
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
          TAB 6: EVENT CATALOG & ROUTES
         --------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172B] mb-1">WorkForceOS Event Schema Catalog</h3>
            <p className="text-xs text-[#64748B] mb-4">
              All platform events are strongly typed, versioned, and guaranteed immutable.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventTypes.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventTypeForSchema(evt)}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#047857] hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                        {evt.category}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-[#047857] bg-[#ECFDF5] px-1.5 py-0.2 rounded">
                        {evt.version}
                      </span>
                    </div>

                    <h4 className="text-sm font-mono font-bold text-[#0F172B] mt-2 group-hover:text-[#047857]">
                      {evt.name}
                    </h4>
                    <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{evt.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                    <span>{evt.consumers_count} Internal Consumers</span>
                    <span className="font-semibold text-[#047857]">{evt.subscribers_count} Webhook Subs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Mesh Routes */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172B] mb-1">Internal Event Routing Rules</h3>
            <p className="text-xs text-[#64748B] mb-4">Active pub/sub mappings across internal domain boundaries.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Source Producer</th>
                    <th className="py-2.5 px-3">Destination Service</th>
                    <th className="py-2.5 px-3">Route Key</th>
                    <th className="py-2.5 px-3">Queue & Lag</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {eventRoutes.map((rt) => (
                    <tr key={rt.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F172B]">{rt.event_type}</td>
                      <td className="py-3 px-3 text-[#334155]">{rt.source_service}</td>
                      <td className="py-3 px-3 font-semibold text-[#0F172B]">{rt.destination_name}</td>
                      <td className="py-3 px-3 font-mono text-[#64748B]">{rt.route_key}</td>
                      <td className="py-3 px-3 font-mono text-[#334155]">
                        {rt.queue_name} ({rt.lag_ms}ms lag)
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            rt.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFFBEB] text-[#D97706]'
                          )}
                        >
                          {rt.status}
                        </span>
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
          TAB 7: EVENT REPLAY ENGINE
         --------------------------------------------------------- */}
      {activeTab === 'replay' && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm max-w-3xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
              <RotateCw className="h-5 w-5 text-[#2563EB]" />
              Historical Event Replay Engine
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Replay historical business events through the Event Mesh to synchronize recovering ERP integrations or backfill newly registered endpoints.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Target Webhook Endpoint</label>
              <select className="w-full p-2.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172B]">
                {filteredEndpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name} ({ep.tenant_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Event Type Filter</label>
              <select className="w-full p-2.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#0F172B]">
                <option value="all">All Subscribed Events</option>
                {eventTypes.map((evt) => (
                  <option key={evt.id} value={evt.name}>
                    {evt.name} ({evt.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Replay Time Window</label>
              <div className="grid grid-cols-4 gap-2">
                {['Past 1 Hour', 'Past 6 Hours', 'Past 24 Hours', 'Past 7 Days'].map((win, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={cn(
                      'p-2.5 text-xs rounded-lg border font-semibold transition-all',
                      idx === 2
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                        : 'border-[#CBD5E1] text-[#64748B] hover:border-[#94A3B8]'
                    )}
                  >
                    {win}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="text-xs font-bold text-[#0F172B]">Replay Preview & Impact Estimation</div>
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Matching Historical Events</span>
                <span className="font-bold text-[#0F172B]">~1,008 Events</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Estimated Replay Duration</span>
                <span className="font-bold text-[#0F172B]">~68 Seconds (15 events/sec throttle)</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Queue Historical Event Replay Job',
                  description:
                    'This will queue ~1,008 historical events for dispatch. The recipient endpoint will receive these with standard HMAC signatures and X-WorkForceOS-Replay: true header.',
                  actionText: 'Queue Replay Batch',
                  onConfirm: async () => {
                    await platformWebhooksMeshService.executeReplay({ hours_back: 24 });
                    refreshData();
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                    setActiveTab('deliveries');
                  },
                });
              }}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5"
            >
              Confirm & Queue Replay Job
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 8: SECURITY & SECRETS
         --------------------------------------------------------- */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#047857]" />
              Webhook Security & HMAC-SHA256 Signatures
            </h3>
            <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
              Every outbound webhook from WorkForceOS is signed using a cryptographic HMAC-SHA256 hash computed over the HTTP request body and timestamp header.
            </p>

            <div className="p-4 rounded-xl bg-[#0F172B] text-white font-mono text-xs space-y-2 overflow-x-auto">
              <div className="text-[#94A3B8]">// Standard WorkForceOS Inbound Verification (Node.js / Express)</div>
              <div className="text-[#38BDF8]">
                const crypto = require('crypto');
                <br />
                const signature = req.headers['x-workforceos-signature'];
                <br />
                const timestamp = req.headers['x-workforceos-timestamp'];
                <br />
                const expected = crypto.createHmac('sha256', WEBHOOK_SECRET)
                <br />
                &nbsp;&nbsp;.update(`${'{timestamp}'}.${'{rawBody}'}`)
                <br />
                &nbsp;&nbsp;.digest('hex');
              </div>
            </div>
          </div>

          {/* Active Endpoints Secret Age & Health */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <h3 className="text-sm font-bold text-[#0F172B] mb-3">Endpoint Secret Rotation Status</h3>
            <div className="space-y-3">
              {filteredEndpoints.map((ep) => {
                const isOlderThan180Days = ep.id === 'whk-03';
                return (
                  <div
                    key={ep.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  >
                    <div>
                      <div className="font-bold text-[#0F172B] text-xs">{ep.name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        Secret Key ID: <span className="font-mono">{ep.secret_id}</span> ({ep.secret_masked})
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOlderThan180Days ? (
                        <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Secret age &gt; 180 days
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#059669] font-medium">Rotated recently</span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEndpointForSecret(ep);
                          setIsSecretRotateModalOpen(true);
                        }}
                        className="text-xs text-[#0F172B] border-[#CBD5E1]"
                      >
                        Rotate Secret
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 9: AUDIT TRAIL
         --------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#0F172B]">Privileged Operations Audit Trail</h3>
            <p className="text-xs text-[#64748B]">Immutable operational log of all webhook changes, retries, rotations, and replays.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172B]">{log.actor_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#0F172B]">{log.resource_name || log.resource_id}</td>
                    <td className="py-3 px-4 text-[#64748B]">{log.tenant_name || 'System'}</td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">{log.ip_address}</td>
                    <td className="py-3 px-4 text-[#334155] max-w-sm">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MODALS & DRAWERS
         --------------------------------------------------------- */}

      {/* 1. Create Webhook Endpoint 8-Step Wizard Modal */}
      {isCreateModalOpen && (
        <CreateEndpointWizardModal
          onClose={() => setIsCreateModalOpen(false)}
          eventTypes={eventTypes}
          onCreated={() => {
            setIsCreateModalOpen(false);
            refreshData();
          }}
        />
      )}

      {/* 2. Send Test Event Simulator Modal */}
      {isTestEventModalOpen && (
        <SendTestEventModal
          endpoints={filteredEndpoints}
          eventTypes={eventTypes}
          onClose={() => setIsTestEventModalOpen(false)}
          onDispatched={() => refreshData()}
        />
      )}

      {/* 3. Rotate Secret Modal */}
      {isSecretRotateModalOpen && selectedEndpointForSecret && (
        <RotateSecretModal
          endpoint={selectedEndpointForSecret}
          onClose={() => {
            setIsSecretRotateModalOpen(false);
            setSelectedEndpointForSecret(null);
          }}
          onRotated={() => refreshData()}
        />
      )}

      {/* 4. Delivery Detail Drawer */}
      {selectedDelivery && (
        <DeliveryDetailDrawer
          delivery={selectedDelivery}
          maskPii={maskPii}
          onToggleMaskPii={() => setMaskPii(!maskPii)}
          onClose={() => setSelectedDelivery(null)}
          onRetry={() => handleRetrySingleDelivery(selectedDelivery.id)}
          copiedId={copiedId}
          onCopy={handleCopy}
        />
      )}

      {/* 5. Dead Letter Inspector Drawer */}
      {selectedDeadLetter && (
        <DeadLetterDetailDrawer
          deadLetter={selectedDeadLetter}
          onClose={() => setSelectedDeadLetter(null)}
          onRequeue={() => handleRequeueDeadLetter(selectedDeadLetter.id)}
          onDiscard={() => handleDiscardDeadLetter(selectedDeadLetter.id)}
          copiedId={copiedId}
          onCopy={handleCopy}
        />
      )}

      {/* 6. Event Schema Inspector Drawer */}
      {selectedEventTypeForSchema && (
        <EventSchemaDrawer
          eventType={selectedEventTypeForSchema}
          onClose={() => setSelectedEventTypeForSchema(null)}
          copiedId={copiedId}
          onCopy={handleCopy}
        />
      )}

      {/* 7. Mesh Node Telemetry Drawer */}
      {selectedMeshNode && (
        <MeshNodeDetailDrawer node={selectedMeshNode} onClose={() => setSelectedMeshNode(null)} />
      )}

      {/* 8. Privileged Action Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                  confirmDialog.isDangerous ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#D97706]'
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#0F172B]">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">{confirmDialog.description}</p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDialog.onConfirm}
                className={cn(
                  'text-xs font-semibold text-white',
                  confirmDialog.isDangerous ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#047857] hover:bg-[#036246]'
                )}
              >
                {confirmDialog.actionText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// HELPER SUB-COMPONENTS (Modals & Drawers)
// -------------------------------------------------------------

/**
 * 8-Step Create Webhook Endpoint Wizard
 */
const CreateEndpointWizardModal: React.FC<{
  onClose: () => void;
  eventTypes: EventTypeSchema[];
  onCreated: () => void;
}> = ({ onClose, eventTypes, onCreated }) => {
  const [step, setStep] = useState<number>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    status: number;
    latency: number;
    message: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: 'Acme Enterprise SAP Bridge',
    description: 'Outbound employee & attendance sync',
    tenant_name: 'Acme Technologies',
    environment: 'Production' as WebhookEnvironment,
    url: 'https://api.acme.com/webhooks/workforceos',
    http_method: 'POST' as 'POST' | 'PUT' | 'PATCH',
    timeout_ms: 10000,
    auth_type: 'HMAC-SHA256',
    max_attempts: 8,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 10,
    selectedEvents: ['employee.created', 'employee.updated', 'leave.approved'] as string[],
  });

  const handleTestVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    const res = await platformWebhooksMeshService.verifyEndpointUrl(formData.url);
    setIsVerifying(false);
    setVerificationResult({
      success: res.success,
      status: res.http_status,
      latency: res.latency_ms,
      message: res.message,
    });
  };

  const handleFinalSubmit = async () => {
    await platformWebhooksMeshService.createEndpoint({
      name: formData.name,
      description: formData.description,
      tenant_name: formData.tenant_name,
      environment: formData.environment,
      url: formData.url,
      http_method: formData.http_method,
      timeout_ms: formData.timeout_ms,
      auth_type: formData.auth_type as any,
      max_attempts: formData.max_attempts,
      backoff_strategy: formData.backoff_strategy as any,
      initial_retry_delay_seconds: formData.initial_retry_delay_seconds,
      events: formData.selectedEvents,
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172B]">Create Webhook Endpoint</h3>
            <p className="text-xs text-[#64748B]">Step {step} of 8 — Configure enterprise event delivery target</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-8 gap-1 p-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={cn('h-1.5 rounded-full', s <= step ? 'bg-[#047857]' : 'bg-[#E2E8F0]')}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 1 — Basic Information</h4>
              <div>
                <label className="font-semibold text-[#334155]">Endpoint Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-[#334155]">Tenant Organization</label>
                <input
                  type="text"
                  value={formData.tenant_name}
                  onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-[#334155]">Environment</label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#334155]">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-lg h-20"
                />
              </div>
            </div>
          )}

          {/* Step 2: URL & HTTP */}
          {step === 2 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 2 — Destination URL & Method</h4>
              <div>
                <label className="font-semibold text-[#334155]">Webhook HTTPS URL</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://api.domain.com/webhooks"
                  className="w-full mt-1 p-2 border rounded-lg font-mono"
                />
                <p className="text-[11px] text-[#64748B] mt-1">HTTPS protocol is mandatory for Production endpoints.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#334155]">HTTP Method</label>
                  <select
                    value={formData.http_method}
                    onChange={(e) => setFormData({ ...formData, http_method: e.target.value as any })}
                    className="w-full mt-1 p-2 border rounded-lg bg-white"
                  >
                    <option value="POST">POST (Recommended)</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#334155]">Timeout (Milliseconds)</label>
                  <input
                    type="number"
                    value={formData.timeout_ms}
                    onChange={(e) => setFormData({ ...formData, timeout_ms: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Event Subscriptions */}
          {step === 3 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 3 — Event Subscriptions</h4>
              <p className="text-[#64748B]">Select the platform events this webhook endpoint will listen to:</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                {eventTypes.map((evt) => {
                  const isChecked = formData.selectedEvents.includes(evt.name);
                  return (
                    <label
                      key={evt.id}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                        isChecked ? 'border-[#047857] bg-[#ECFDF5] text-[#047857]' : 'border-[#E2E8F0] text-[#334155]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, selectedEvents: [...formData.selectedEvents, evt.name] });
                          } else {
                            setFormData({
                              ...formData,
                              selectedEvents: formData.selectedEvents.filter((x) => x !== evt.name),
                            });
                          }
                        }}
                      />
                      <div>
                        <div className="font-mono font-bold">{evt.name}</div>
                        <div className="text-[10px] text-[#64748B]">{evt.category}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Authentication */}
          {step === 4 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 4 — Authentication & Security</h4>
              <p className="text-[#64748B]">WorkForceOS signs all payloads using HMAC SHA-256 by default.</p>
              <div>
                <label className="font-semibold text-[#334155]">Authentication Mode</label>
                <select
                  value={formData.auth_type}
                  onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-lg bg-white"
                >
                  <option value="HMAC-SHA256">HMAC-SHA256 Signature (Recommended)</option>
                  <option value="Bearer Token">Bearer Token</option>
                  <option value="API Key">API Key in Header</option>
                  <option value="OAuth2">OAuth2 Client Credentials</option>
                  <option value="None">None (Unauthenticated)</option>
                </select>
              </div>
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="font-bold text-[#0F172B]">HMAC Signature Header:</span>
                <p className="font-mono text-[11px] text-[#047857] mt-1">X-WorkForceOS-Signature: t=...,v1=...</p>
              </div>
            </div>
          )}

          {/* Step 5: Retry Policy */}
          {step === 5 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 5 — Retry & Backoff Policy</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#334155]">Max Retry Attempts</label>
                  <input
                    type="number"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#334155]">Backoff Strategy</label>
                  <select
                    value={formData.backoff_strategy}
                    onChange={(e) => setFormData({ ...formData, backoff_strategy: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-lg bg-white"
                  >
                    <option value="exponential">Exponential Backoff (10s, 30s, 90s...)</option>
                    <option value="linear">Linear Backoff</option>
                    <option value="fixed">Fixed Interval</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B]">Retry triggered on HTTP 408, 429, 500, 502, 503, and 504.</p>
            </div>
          )}

          {/* Step 6: Verification */}
          {step === 6 && (
            <div className="space-y-4">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 6 — Live Endpoint Verification</h4>
              <p className="text-[#64748B]">Send a zero-payload handshake ping to test endpoint connectivity:</p>
              <Button
                variant="outline"
                size="sm"
                disabled={isVerifying}
                onClick={handleTestVerify}
                className="w-full border-[#047857] text-[#047857] hover:bg-[#ECFDF5]"
              >
                {isVerifying ? <RotateCw className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Send Verification Event Ping
              </Button>

              {verificationResult && (
                <div
                  className={cn(
                    'p-4 rounded-xl border space-y-1',
                    verificationResult.success ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-[#FEF2F2] border-[#FECACA]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172B]">
                      {verificationResult.success ? '✓ Endpoint Verified' : '✗ Verification Failed'}
                    </span>
                    <span className="font-mono font-bold text-xs">HTTP {verificationResult.status}</span>
                  </div>
                  <p className="text-xs text-[#475569]">{verificationResult.message}</p>
                  <p className="text-[11px] text-[#64748B]">Response Latency: {verificationResult.latency}ms</p>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Review */}
          {step === 7 && (
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F172B] text-sm">Step 7 — Configuration Review</h4>
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Endpoint:</span>
                  <span className="font-bold">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">URL:</span>
                  <span className="font-mono">{formData.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Subscribed Events:</span>
                  <span className="font-bold text-[#047857]">{formData.selectedEvents.length} events</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Auth:</span>
                  <span>{formData.auth_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Max Retries:</span>
                  <span>{formData.max_attempts} attempts ({formData.backoff_strategy})</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Activate */}
          {step === 8 && (
            <div className="space-y-3 text-center py-4">
              <div className="h-12 w-12 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center mx-auto">
                <Check className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-[#0F172B] text-base">Ready to Activate Endpoint</h4>
              <p className="text-[#64748B] max-w-sm mx-auto">
                The endpoint will be registered in the Event Mesh and immediately receive subscribed production events.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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

          {step < 8 ? (
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
              onClick={handleFinalSubmit}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
            >
              Activate Webhook Endpoint
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Send Test Event Simulator Modal
 */
const SendTestEventModal: React.FC<{
  endpoints: WebhookEndpoint[];
  eventTypes: EventTypeSchema[];
  onClose: () => void;
  onDispatched: () => void;
}> = ({ endpoints, eventTypes, onClose, onDispatched }) => {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(endpoints[0]?.id || '');
  const [selectedEventType, setSelectedEventType] = useState<string>(eventTypes[0]?.name || 'employee.created');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleSend = async () => {
    setIsSending(true);
    setTestResult(null);
    const res = await platformWebhooksMeshService.sendTestEvent({
      endpoint_id: selectedEndpointId,
      event_type: selectedEventType,
    });
    setIsSending(false);
    setTestResult(res);
    onDispatched();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0]">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
              <Play className="h-4 w-4 text-[#047857]" />
              Send Test Webhook Event
            </h3>
            <p className="text-xs text-[#64748B]">
              Dispatches a test event with <code className="text-[#047857]">is_test: true</code> header.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-[#334155]">Select Target Endpoint</label>
            <select
              value={selectedEndpointId}
              onChange={(e) => setSelectedEndpointId(e.target.value)}
              className="w-full mt-1 p-2.5 border rounded-lg bg-white"
            >
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} ({ep.tenant_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#334155]">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full mt-1 p-2.5 border rounded-lg bg-white"
            >
              {eventTypes.map((evt) => (
                <option key={evt.id} value={evt.name}>
                  {evt.name} ({evt.category})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={isSending}
            onClick={handleSend}
            className="w-full bg-[#047857] hover:bg-[#036246] text-white font-semibold py-2.5"
          >
            {isSending ? <RotateCw className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Dispatch Test Event
          </Button>

          {testResult && (
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172B]">Response Status</span>
                <span
                  className={cn(
                    'font-mono font-bold px-2 py-0.5 rounded text-xs',
                    testResult.http_status === 200 ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'
                  )}
                >
                  HTTP {testResult.http_status} ({testResult.latency_ms}ms)
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#64748B] break-all">
                Signature: {testResult.signature.slice(0, 32)}...
              </div>
              <div className="font-mono text-[11px] p-2 bg-[#0F172B] text-white rounded">
                {testResult.response_body}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Rotate Secret Modal
 */
const RotateSecretModal: React.FC<{
  endpoint: WebhookEndpoint;
  onClose: () => void;
  onRotated: () => void;
}> = ({ endpoint, onClose, onRotated }) => {
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [graceHours, setGraceHours] = useState<number>(48);

  const handleRotate = async () => {
    setIsRotating(true);
    const res = await platformWebhooksMeshService.rotateSecret(endpoint.id, graceHours);
    setIsRotating(false);
    setRotatedSecret(res.newSecret);
    onRotated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
            <Key className="h-4 w-4 text-[#2563EB]" />
            Rotate Webhook HMAC Secret
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-[#64748B]">
          Rotating the secret for <span className="font-bold text-[#0F172B]">{endpoint.name}</span>. Both old and new secrets will be accepted during the grace period.
        </p>

        {!rotatedSecret ? (
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-[#334155]">Transition Grace Period</label>
              <select
                value={graceHours}
                onChange={(e) => setGraceHours(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-lg bg-white"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours (Recommended)</option>
                <option value={72}>72 Hours</option>
                <option value={0}>Immediate (No Grace Period)</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={isRotating}
              onClick={handleRotate}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5"
            >
              {isRotating ? <RotateCw className="h-4 w-4 animate-spin mr-1" /> : 'Generate & Rotate Secret'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46]">
              <span className="font-bold">✓ New Secret Generated:</span>
              <p className="text-[11px] mt-0.5">Copy and store this secret now. It will never be displayed again.</p>
            </div>

            <div className="p-3 rounded-lg bg-[#0F172B] text-white font-mono flex items-center justify-between">
              <span className="break-all">{rotatedSecret}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(rotatedSecret)}
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
 * Delivery Detail Drawer (Deep Dive on Request, Payload, Response & Attempt Timeline)
 */
const DeliveryDetailDrawer: React.FC<{
  delivery: WebhookDelivery;
  maskPii: boolean;
  onToggleMaskPii: () => void;
  onClose: () => void;
  onRetry: () => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}> = ({ delivery, maskPii, onToggleMaskPii, onClose, onRetry, copiedId, onCopy }) => {
  const [drawerTab, setDrawerTab] = useState<'summary' | 'request' | 'payload' | 'response' | 'timeline'>('summary');

  // Payload with optional PII masking
  const displayPayload = useMemo(() => {
    if (!maskPii) return delivery.payload;
    const cloned = JSON.parse(JSON.stringify(delivery.payload));
    if (cloned.data?.work_email) cloned.data.work_email = 'pr***@acmecorp.io';
    if (cloned.data?.employee_id) cloned.data.employee_id = 'EMP-****';
    return cloned;
  }, [delivery.payload, maskPii]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0]">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[#0F172B]">{delivery.event_id}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-bold',
                  delivery.status === 'Delivered'
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : delivery.status === 'Failed'
                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                    : 'bg-[#FFFBEB] text-[#D97706]'
                )}
              >
                {delivery.status}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{delivery.event_type} → {delivery.endpoint_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {delivery.status === 'Failed' && (
              <Button variant="primary" size="sm" onClick={onRetry} className="bg-[#2563EB] text-white text-xs">
                <RotateCw className="h-3.5 w-3.5 mr-1" /> Retry Delivery
              </Button>
            )}
            <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E2E8F0] px-4 bg-[#F8FAFC]">
          {[
            { id: 'summary', label: 'Summary' },
            { id: 'request', label: 'Request & Headers' },
            { id: 'payload', label: 'Payload JSON' },
            { id: 'response', label: 'Response Body' },
            { id: 'timeline', label: `Attempts (${delivery.attempts.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setDrawerTab(t.id as any)}
              className={cn(
                'px-3 py-2.5 text-xs font-semibold border-b-2 transition-all',
                drawerTab === t.id ? 'border-[#047857] text-[#047857]' : 'border-transparent text-[#64748B]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {drawerTab === 'summary' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B]">HTTP Response Code:</span>
                  <p className="font-mono font-bold text-sm text-[#0F172B]">{delivery.http_status}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Response Latency:</span>
                  <p className="font-mono font-bold text-sm text-[#0F172B]">{delivery.response_time_ms}ms</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Attempt Count:</span>
                  <p className="font-bold text-[#0F172B]">{delivery.attempt_count} of {delivery.max_attempts}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Environment:</span>
                  <p className="font-bold text-[#0F172B]">{delivery.environment}</p>
                </div>
              </div>

              {delivery.last_error_message && (
                <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]">
                  <span className="font-bold">Last Error:</span>
                  <p className="mt-0.5">{delivery.last_error_message}</p>
                </div>
              )}
            </div>
          )}

          {drawerTab === 'request' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172B]">HTTP Request Headers</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(JSON.stringify(delivery.request_headers, null, 2), 'req-headers')}
                  className="text-xs text-[#047857]"
                >
                  {copiedId === 'req-headers' ? 'Copied!' : 'Copy Headers'}
                </Button>
              </div>
              <pre className="p-3 rounded-lg bg-[#0F172B] text-[#38BDF8] font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(delivery.request_headers, null, 2)}
              </pre>
            </div>
          )}

          {drawerTab === 'payload' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={maskPii} onChange={onToggleMaskPii} />
                  Mask PII Data
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(JSON.stringify(displayPayload, null, 2), 'payload-json')}
                  className="text-xs text-[#047857]"
                >
                  {copiedId === 'payload-json' ? 'Copied!' : 'Copy JSON'}
                </Button>
              </div>
              <pre className="p-3 rounded-lg bg-[#0F172B] text-[#34D399] font-mono text-[11px] overflow-x-auto max-h-96">
                {JSON.stringify(displayPayload, null, 2)}
              </pre>
            </div>
          )}

          {drawerTab === 'response' && (
            <div className="space-y-3">
              <div className="font-bold text-[#0F172B]">Server Response Body</div>
              <pre className="p-3 rounded-lg bg-[#0F172B] text-white font-mono text-[11px] overflow-x-auto">
                {delivery.response_body || 'No response body returned'}
              </pre>
            </div>
          )}

          {drawerTab === 'timeline' && (
            <div className="space-y-4">
              <div className="font-bold text-[#0F172B]">Attempt Timeline</div>
              <div className="relative border-l border-[#CBD5E1] ml-3 space-y-4 pl-4">
                {delivery.attempts.map((att) => (
                  <div key={att.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white',
                        att.http_status === 200 ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                      )}
                    />
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172B]">Attempt {att.attempt_number}</span>
                        <span className="font-mono text-xs text-[#64748B]">HTTP {att.http_status} ({att.response_time_ms}ms)</span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-1">{att.request_timestamp}</div>
                      {att.error_message && <p className="text-[11px] text-[#DC2626] mt-1">{att.error_message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Dead Letter Inspector Drawer
 */
const DeadLetterDetailDrawer: React.FC<{
  deadLetter: DeadLetterEvent;
  onClose: () => void;
  onRequeue: () => void;
  onDiscard: () => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}> = ({ deadLetter, onClose, onRequeue, onDiscard, copiedId, onCopy }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0]">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172B]">Inspect Dead Letter Event</h3>
            <p className="text-xs text-[#DC2626]">{deadLetter.error_code}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] space-y-1">
            <span className="font-bold">Failure Reason:</span>
            <p>{deadLetter.reason}</p>
            <p className="text-[11px] text-[#991B1B]">{deadLetter.last_error}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#0F172B]">Original Event Payload</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(JSON.stringify(deadLetter.payload, null, 2), 'dlq-payload')}
                className="text-xs text-[#047857]"
              >
                {copiedId === 'dlq-payload' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="p-3 rounded-lg bg-[#0F172B] text-[#34D399] font-mono text-[11px] overflow-x-auto max-h-80">
              {JSON.stringify(deadLetter.payload, null, 2)}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onDiscard} className="text-[#DC2626] hover:bg-[#FEE2E2] text-xs">
            Discard Event
          </Button>
          <Button variant="primary" size="sm" onClick={onRequeue} className="bg-[#047857] text-white text-xs">
            Requeue for Immediate Retry
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Event Schema Drawer
 */
const EventSchemaDrawer: React.FC<{
  eventType: EventTypeSchema;
  onClose: () => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}> = ({ eventType, onClose, copiedId, onCopy }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0]">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-mono font-bold text-[#0F172B]">{eventType.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] font-bold">
                {eventType.version}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{eventType.description}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#0F172B]">Sample Payload</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(JSON.stringify(eventType.sample_payload, null, 2), 'schema-sample')}
                className="text-xs text-[#047857]"
              >
                {copiedId === 'schema-sample' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="p-3 rounded-lg bg-[#0F172B] text-[#34D399] font-mono text-[11px] overflow-x-auto">
              {JSON.stringify(eventType.sample_payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mesh Node Inspector Drawer
 */
const MeshNodeDetailDrawer: React.FC<{
  node: any;
  onClose: () => void;
}> = ({ node, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-[#E2E8F0]">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{node.type}</span>
            <h3 className="text-base font-bold text-[#0F172B]">{node.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] flex items-center justify-between">
            <span className="font-bold">Node Status</span>
            <span className="font-semibold">{node.status}</span>
          </div>

          {node.throughput && (
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B]">Throughput:</span>
              <p className="font-bold text-[#0F172B] mt-0.5">{node.throughput}</p>
            </div>
          )}

          {node.details && (
            <div className="space-y-2">
              <span className="font-bold text-[#0F172B]">Subsystems & Services</span>
              <ul className="space-y-1.5 list-disc pl-4 text-[#334155]">
                {node.details.map((d: string, idx: number) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
