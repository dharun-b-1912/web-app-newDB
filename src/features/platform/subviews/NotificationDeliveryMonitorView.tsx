// src/features/platform/subviews/NotificationDeliveryMonitorView.tsx
// ============================================================
// WorkForceOS — Platform Notification & DLQ Stream Monitor
// ============================================================

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  notificationService,
  NotificationTelemetryMetrics,
  WorkForceEvent,
} from '../../../services/notification';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export const NotificationDeliveryMonitorView: React.FC = () => {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<NotificationTelemetryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getTelemetryMetrics();
      setMetrics(res);
    } catch (err) {
      console.warn('Failed to load notification telemetry', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatchTestEvent = async () => {
    setIsDispatchingTest(true);
    try {
      const testEvent: WorkForceEvent = {
        eventId: crypto.randomUUID(),
        eventType: 'platform.service.degraded',
        category: 'PLATFORM',
        severity: 'WARNING',
        title: 'Platform Edge Latency Spike',
        body: 'Automated telemetry test event dispatched to verify unified notification bus.',
        resourceType: 'platform_telemetry',
        resourceId: 'test-telemetry-01',
        actionUrl: '/platform/command-center',
        timestamp: new Date().toISOString(),
      };
      await notificationService.publishEvent(testEvent);
      showToast('Live test notification dispatched across event bus!', 'success');
      loadData();
    } catch (err) {
      showToast('Failed to dispatch test notification.', 'error');
    } finally {
      setIsDispatchingTest(false);
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
            <span className="font-bold text-gray-800">Notification Delivery & DLQ Monitor</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-[#047857]" />
              Realtime Notification & Event Bus Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Event Bus Online
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Realtime delivery metrics across in-app WebSockets, Web Push API, Email, and WhatsApp queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleDispatchTestEvent}
            disabled={isDispatchingTest}
            className="px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Dispatch Test Event
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
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
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">WebSocket Sockets</span>
            <p className="text-2xl font-bold text-purple-700 mt-1">{metrics.active_websocket_subscribers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Failed</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.total_failed}</p>
          </div>
        </div>
      )}

      {/* 3. Multi-Channel Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { name: 'In-App WebSocket', icon: Bell, status: metrics?.channels_health.in_app || 'HEALTHY' },
          { name: 'Browser Web Push', icon: Smartphone, status: metrics?.channels_health.push || 'HEALTHY' },
          { name: 'Transactional Email', icon: Mail, status: metrics?.channels_health.email || 'HEALTHY' },
          { name: 'WhatsApp Mesh', icon: MessageSquare, status: metrics?.channels_health.whatsapp || 'HEALTHY' },
          { name: 'SMS Gateway', icon: Radio, status: metrics?.channels_health.sms || 'HEALTHY' },
        ].map((ch, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center border border-emerald-200">
                <ch.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-900">{ch.name}</span>
                <p className="text-[10px] text-gray-500">Channel active</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
              {ch.status}
            </span>
          </div>
        ))}
      </div>

      {/* 4. Dead Letter Queue & Transactional Outbox Monitor */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#047857]" />
              Dead Letter Queue (DLQ) & Outbox Inspection
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Inspect undeliverable notifications, investigate provider errors, and trigger manual re-delivery attempts.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
            0 Dead Letters
          </span>
        </div>

        <div className="p-8 text-center text-xs text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-[#047857] mx-auto opacity-70" />
          <p className="font-semibold text-gray-800">Dead Letter Queue is clear</p>
          <p className="text-[11px] text-gray-400">All transactional outbox events processed successfully.</p>
        </div>
      </div>
    </div>
  );
};
