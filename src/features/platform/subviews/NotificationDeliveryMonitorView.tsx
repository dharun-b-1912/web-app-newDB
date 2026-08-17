// src/features/platform/subviews/NotificationDeliveryMonitorView.tsx
// ============================================================
// WorkForceOS — Platform Event Bus & DLQ Command Center
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  Radio,
  RefreshCw,
  ShieldAlert,
  Layers,
  Smartphone,
  Mail,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sliders,
  Activity,
  Zap,
  Play,
  Pause,
  Filter,
  Search,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Code,
  Flame,
  X,
  Trash2,
  Server,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';
import {
  notificationService,
  notificationRealtimeEngine,
  NotificationTelemetryMetrics,
  WorkForceEvent,
  NotificationCategory,
  NotificationSeverity,
} from '../../../services/notification';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

interface OutboxRecord {
  id: string;
  organization_id?: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: any;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';
  attempts: number;
  max_attempts: number;
  available_at: string;
  processed_at?: string;
  last_error?: string;
  created_at: string;
}

export const NotificationDeliveryMonitorView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'stream' | 'dlq' | 'outbox' | 'channels' | 'sandbox'>('stream');
  const [metrics, setMetrics] = useState<NotificationTelemetryMetrics | null>(null);
  const [liveEvents, setLiveEvents] = useState<WorkForceEvent[]>([]);
  const [outboxItems, setOutboxItems] = useState<OutboxRecord[]>([]);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<WorkForceEvent | null>(null);
  const [selectedOutbox, setSelectedOutbox] = useState<OutboxRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sandbox Form State
  const [sandboxEvent, setSandboxEvent] = useState<{
    eventType: string;
    category: NotificationCategory;
    severity: NotificationSeverity;
    title: string;
    body: string;
    resourceType: string;
    resourceId: string;
  }>({
    eventType: 'security.suspicious_login',
    category: 'SECURITY',
    severity: 'WARNING',
    title: 'Suspicious Administrative Login Detected',
    body: 'New sign-in detected from Mumbai, India on Chrome 128 (IP: 103.21.144.92)',
    resourceType: 'platform_security',
    resourceId: 'sec-threat-901',
  });
  const [isDispatching, setIsDispatching] = useState(false);

  // 1. Initial Load & Background Polling
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [metricRes, notifRes] = await Promise.all([
        notificationService.getTelemetryMetrics(),
        notificationService.getNotifications({ limit: 50 }),
      ]);

      setMetrics(metricRes);

      // Populate live events list from database
      const historicalEvents: WorkForceEvent[] = notifRes.items.map((i) => ({
        eventId: i.id,
        eventType: i.eventType,
        category: i.category,
        severity: i.severity,
        title: i.title,
        body: i.body,
        actorName: i.actorName,
        actorAvatar: i.actorAvatar,
        resourceType: i.resourceType,
        resourceId: i.resourceId,
        actionUrl: i.actionUrl,
        timestamp: i.createdAt,
        metadata: i.metadata,
      }));

      setLiveEvents((prev) => {
        if (prev.length === 0) return historicalEvents;
        return prev;
      });

      // Load Outbox Records from Supabase or Local
      if (isSupabaseEnabled) {
        const { data } = await supabase
          .from('notification_outbox')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (data) setOutboxItems(data as OutboxRecord[]);
      }
    } catch (err) {
      console.warn('Failed to load event telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  // 2. Realtime Subscription (New events stream dynamically without reload)
  useEffect(() => {
    const unsubscribe = notificationRealtimeEngine.subscribe((event: WorkForceEvent) => {
      if (!isStreamPaused) {
        setLiveEvents((prev) => [event, ...prev.slice(0, 150)]);
        setMetrics((prev) =>
          prev
            ? {
                ...prev,
                total_created: prev.total_created + 1,
                total_delivered: prev.total_delivered + 1,
              }
            : null
        );
      }
    });

    return () => unsubscribe();
  }, [isStreamPaused]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return liveEvents.filter((ev) => {
      if (categoryFilter !== 'ALL' && ev.category !== categoryFilter) return false;
      if (severityFilter !== 'ALL' && ev.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.eventType.toLowerCase().includes(q) ||
          ev.body.toLowerCase().includes(q) ||
          (ev.resourceType && ev.resourceType.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [liveEvents, categoryFilter, severityFilter, searchQuery]);

  // DLQ Items (Failed or Dead-Letter items)
  const dlqItems = useMemo(() => {
    return outboxItems.filter((i) => i.status === 'DEAD_LETTER' || i.status === 'FAILED');
  }, [outboxItems]);

  // 3. Handlers
  const handleCopyJson = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Event payload copied to clipboard!', 'info');
  };

  const handleDispatchSandboxEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    try {
      const event: WorkForceEvent = {
        eventId: crypto.randomUUID(),
        eventType: sandboxEvent.eventType,
        category: sandboxEvent.category,
        severity: sandboxEvent.severity,
        title: sandboxEvent.title,
        body: sandboxEvent.body,
        resourceType: sandboxEvent.resourceType,
        resourceId: sandboxEvent.resourceId,
        timestamp: new Date().toISOString(),
      };

      await notificationService.publishEvent(event);
      showToast(`Dispatched ${event.eventType} event across realtime mesh!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch event.', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleRetryDlq = async (item: OutboxRecord) => {
    try {
      if (isSupabaseEnabled) {
        await supabase
          .from('notification_outbox')
          .update({
            status: 'PENDING',
            attempts: 0,
            available_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
      setOutboxItems((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, status: 'PENDING', attempts: 0 } : o))
      );
      showToast(`Queued ${item.event_type} for immediate re-delivery.`, 'success');
    } catch {
      showToast('Failed to retry outbox item.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
            <span className="hover:text-[#047857] transition cursor-pointer">Platform Admin</span>
            <span>/</span>
            <span className="font-bold text-gray-800">Event Bus & Dead Letter Queue (DLQ)</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#047857]" />
              Platform Event Bus & DLQ Control Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Mesh Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor streaming platform events, transactional outbox queues, multi-channel deliveries, and DLQ exception buffers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className="px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Event Sandbox
          </button>
        </div>
      </div>

      {/* 2. Top Metrics Summary Grid */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Events</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total_created}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Delivered</span>
            <p className="text-2xl font-bold text-[#047857] mt-1">{metrics.total_delivered}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Avg Latency</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{metrics.avg_delivery_latency_ms}ms</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">DLQ Depth</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.dead_letter_queue_depth}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Active Sockets</span>
            <p className="text-2xl font-bold text-purple-700 mt-1">{metrics.active_websocket_subscribers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Failed</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.total_failed}</p>
          </div>
        </div>
      )}

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('stream')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeTab === 'stream'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Radio className="w-3.5 h-3.5" />
          Live Event Stream
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-[#047857] text-[10px] font-bold">
            {liveEvents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dlq')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeTab === 'dlq'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Dead Letter Queue (DLQ)
          {dlqItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {dlqItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outbox')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeTab === 'outbox'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Database className="w-3.5 h-3.5" />
          Transactional Outbox Ledger
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeTab === 'channels'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Server className="w-3.5 h-3.5" />
          Multi-Channel Health
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeTab === 'sandbox'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Event Sandbox
        </button>
      </div>

      {/* 4. SUBTAB: LIVE EVENT STREAM */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search event stream by type, title, resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="APPROVAL">Approvals</option>
                  <option value="SECURITY">Security</option>
                  <option value="INTEGRATION">Integrations</option>
                  <option value="PLATFORM">Platform</option>
                  <option value="BILLING">Billing</option>
                  <option value="SYSTEM">System</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                <span className="text-gray-500 font-medium">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="ERROR">Error</option>
                  <option value="WARNING">Warning</option>
                  <option value="SUCCESS">Success</option>
                  <option value="INFO">Info</option>
                </select>
              </div>

              <button
                onClick={() => setIsStreamPaused(!isStreamPaused)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer',
                  isStreamPaused
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-[#047857] border-emerald-200'
                )}
              >
                {isStreamPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isStreamPaused ? 'Resume Stream' : 'Pause Stream'}
              </button>
            </div>
          </div>

          {/* Event Stream List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Title & Description</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredEvents.map((ev) => (
                    <tr
                      key={ev.eventId}
                      onClick={() => setSelectedEvent(ev)}
                      className="hover:bg-emerald-50/20 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        {ev.eventType}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {ev.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            ev.severity === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ev.severity === 'ERROR'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : ev.severity === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : ev.severity === 'SUCCESS'
                              ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          )}
                        >
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 truncate">{ev.title}</div>
                        <p className="text-[11px] text-gray-500 truncate">{ev.body}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                        {ev.resourceType ? `${ev.resourceType}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBTAB: DEAD LETTER QUEUE (DLQ) */}
      {activeTab === 'dlq' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Dead Letter Queue (DLQ) Exception Ledger
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Investigate undeliverable transactional messages, analyze provider error payloads, and trigger manual re-delivery.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
              {dlqItems.length} Dead Letters
            </span>
          </div>

          {dlqItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-[#047857] mx-auto opacity-70" />
              <p className="font-bold text-gray-800">Dead Letter Queue is clear</p>
              <p className="text-[11px] text-gray-400">
                All outbox messages and notifications delivered successfully with zero exceptions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dlqItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-800">{item.event_type}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                        Failed ({item.attempts}/{item.max_attempts} attempts)
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium">Last Error: {item.last_error || 'Delivery timeout'}</p>
                    <p className="text-[10px] font-mono text-gray-400">Aggregate: {item.aggregate_type}:{item.aggregate_id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyJson(item.payload, item.id)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" /> Payload
                    </button>
                    <button
                      onClick={() => handleRetryDlq(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#047857] text-white font-bold hover:bg-[#065f46] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. SUBTAB: TRANSACTIONAL OUTBOX */}
      {activeTab === 'outbox' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#047857]" />
              PostgreSQL Transactional Outbox Ledger
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Durable source-of-truth transaction records ensuring guaranteed at-least-once notification delivery.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Aggregate Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Available At</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {outboxItems.map((outbox) => (
                  <tr key={outbox.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{outbox.event_type}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{outbox.aggregate_type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold',
                          outbox.status === 'PROCESSED'
                            ? 'bg-emerald-50 text-[#047857]'
                            : outbox.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {outbox.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">{outbox.attempts}/{outbox.max_attempts}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                      {new Date(outbox.available_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCopyJson(outbox.payload, outbox.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer"
                        title="Copy Payload"
                      >
                        {copiedId === outbox.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SUBTAB: MULTI-CHANNEL HEALTH */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'In-App WebSocket Mesh', icon: Bell, status: 'HEALTHY', latency: '12ms', uptime: '99.99%', protocol: 'WSS / Supabase Realtime' },
              { name: 'Browser Web Push API', icon: Smartphone, status: 'HEALTHY', latency: '45ms', uptime: '99.95%', protocol: 'VAPID / Web Push' },
              { name: 'Transactional Email', icon: Mail, status: 'HEALTHY', latency: '820ms', uptime: '99.98%', protocol: 'SMTP / SES Adapter' },
              { name: 'WhatsApp Notification Mesh', icon: MessageSquare, status: 'HEALTHY', latency: '340ms', uptime: '99.92%', protocol: 'Cloud API v19.0' },
              { name: 'SMS Carrier Gateway', icon: Radio, status: 'HEALTHY', latency: '650ms', uptime: '99.90%', protocol: 'SMPP / Twilio Bridge' },
            ].map((ch, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200">
                    <ch.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
                    {ch.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900">{ch.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{ch.protocol}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-500">Latency: <strong className="text-gray-900">{ch.latency}</strong></span>
                  <span className="text-gray-500">Uptime: <strong className="text-emerald-600">{ch.uptime}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. SUBTAB: EVENT SANDBOX & DISPATCHER */}
      {activeTab === 'sandbox' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#047857]" />
              Interactive Event Bus Sandbox Dispatcher
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Simulate and dispatch synthetic events across the live WorkForceOS event mesh to test real-time notification arrival, outbox persistence, and audio alert chimes.
            </p>
          </div>

          <form onSubmit={handleDispatchSandboxEvent} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Event Category *</label>
                <select
                  value={sandboxEvent.category}
                  onChange={(e) => setSandboxEvent({ ...sandboxEvent, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium"
                >
                  <option value="SECURITY">SECURITY</option>
                  <option value="APPROVAL">APPROVAL</option>
                  <option value="INTEGRATION">INTEGRATION</option>
                  <option value="PLATFORM">PLATFORM</option>
                  <option value="BILLING">BILLING</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Severity Spectrum *</label>
                <select
                  value={sandboxEvent.severity}
                  onChange={(e) => setSandboxEvent({ ...sandboxEvent, severity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-medium"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARNING">WARNING</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Event Type Identifier *</label>
              <input
                type="text"
                value={sandboxEvent.eventType}
                onChange={(e) => setSandboxEvent({ ...sandboxEvent, eventType: e.target.value })}
                placeholder="e.g. security.suspicious_login or leave.request.created"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Notification Title *</label>
              <input
                type="text"
                value={sandboxEvent.title}
                onChange={(e) => setSandboxEvent({ ...sandboxEvent, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Notification Body Description *</label>
              <textarea
                rows={3}
                value={sandboxEvent.body}
                onChange={(e) => setSandboxEvent({ ...sandboxEvent, body: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isDispatching}
              className="w-full py-2.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isDispatching ? 'Broadcasting Event...' : 'Dispatch Live Event Across Mesh'}
            </button>
          </form>
        </div>
      )}

      {/* 9. Event Details Slide-Over Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full border-l border-gray-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6 animate-slideLeft">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
                    {selectedEvent.category}
                  </span>
                  <h3 className="text-base font-bold text-gray-900 mt-1 font-mono">{selectedEvent.eventType}</h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-3 text-xs border border-gray-100">
                <div>
                  <span className="text-gray-500 font-semibold">Title:</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedEvent.title}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Body:</span>
                  <p className="text-gray-700 mt-0.5">{selectedEvent.body}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Resource Attribution:</span>
                  <p className="font-mono text-gray-800 mt-0.5">{selectedEvent.resourceType || 'None'} / {selectedEvent.resourceId || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">Event JSON Payload</span>
                  <button
                    onClick={() => handleCopyJson(selectedEvent, 'drawer')}
                    className="text-xs font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy JSON
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
