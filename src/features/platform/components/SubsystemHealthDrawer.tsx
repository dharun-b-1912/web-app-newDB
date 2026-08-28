// src/features/platform/components/SubsystemHealthDrawer.tsx
// ============================================================
// Joy PeopleHR — Subsystem Telemetry & Health Detail Drawer
// ============================================================

import React from 'react';
import { Activity, Server, Clock, AlertTriangle, Shield, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../../../components/ui/Sheet';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { SubsystemTelemetry } from '../../../types/platformAdmin';

export interface SubsystemHealthDrawerProps {
  subsystem: SubsystemTelemetry | null;
  onClose: () => void;
}

export const SubsystemHealthDrawer: React.FC<SubsystemHealthDrawerProps> = ({
  subsystem,
  onClose,
}) => {
  if (!subsystem) return null;

  return (
    <Sheet open={Boolean(subsystem)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="md">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {subsystem.category} Telemetry
            </span>
            <StatusBadge status={subsystem.status} size="xs" />
          </div>
          <SheetTitle>{subsystem.name}</SheetTitle>
          <SheetDescription>{subsystem.description}</SheetDescription>
        </SheetHeader>

        {/* Telemetry Metrics */}
        <SheetBody>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Uptime SLA</span>
              <span className="text-lg font-bold text-[#16845B] font-mono">{subsystem.uptimePct}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">30-day window</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">P95 Latency</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{subsystem.latencyMs}ms</span>
              <span className="text-[10px] text-[#16845B] block mt-0.5">Within SLA</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Error Rate</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{subsystem.errorRatePct}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Last 24h</span>
            </div>
          </div>

          {/* Diagnostic Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Diagnostic Telemetry</h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Service Identifier</span>
                <span className="font-mono font-bold text-slate-900">{subsystem.key}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Last Health Probe</span>
                <span className="font-semibold text-slate-700">{subsystem.lastChecked}</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Health Check Protocol</span>
                <span className="font-mono text-slate-700 text-[11px]">HTTP/2 TLS 1.3 /healthz</span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Redundancy Zone</span>
                <span className="font-semibold text-slate-700">Multi-AZ (ap-south-1a/b)</span>
              </div>
            </div>
          </div>

          {/* Live Probe Log Simulation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Live Synthetic Probes</h4>
            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl space-y-1.5 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span>[PROBE 10:14:02] GET /healthz 200 OK</span>
                <span>{subsystem.latencyMs - 2}ms</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>[PROBE 10:13:02] GET /healthz 200 OK</span>
                <span>{subsystem.latencyMs + 1}ms</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span>[PROBE 10:12:02] TLS Handshake verified (0 error)</span>
                <span>Passed</span>
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Telemetry
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
