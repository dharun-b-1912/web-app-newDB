// src/features/platform/components/SubsystemHealthDrawer.tsx
// ============================================================
// WorkForceOS — Subsystem Telemetry & Health Detail Drawer
// ============================================================

import React from 'react';
import { X, Activity, Server, Clock, AlertTriangle, CheckCircle2, Shield, RefreshCw } from 'lucide-react';
import { SubsystemTelemetry } from '../../../types/platformAdmin';

export interface SubsystemHealthDrawerProps {
  subsystem: SubsystemTelemetry | null;
  onClose: () => void;
}

export const SubsystemHealthDrawer: React.FC<SubsystemHealthDrawerProps> = ({ subsystem, onClose }) => {
  if (!subsystem) return null;

  const isOperational = subsystem.status === 'Operational';
  const isDegraded = subsystem.status === 'Degraded';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-950/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-700">
                  {subsystem.category} Telemetry
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isOperational
                      ? 'bg-emerald-100 text-[#07563D]'
                      : isDegraded
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOperational ? 'bg-emerald-600' : isDegraded ? 'bg-amber-600' : 'bg-red-600'}`} />
                  {subsystem.status}
                </span>
              </div>
              <h2 className="text-xl font-black text-gray-900 mt-2">{subsystem.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{subsystem.description}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Uptime SLA</div>
                <div className="text-xl font-black text-emerald-700 mt-1">{subsystem.uptimePct}%</div>
                <div className="text-[10px] text-gray-400 mt-0.5">30-day window</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">P95 Latency</div>
                <div className="text-xl font-black text-gray-900 mt-1">{subsystem.latencyMs}ms</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Within SLA (&lt;150ms)</div>
              </div>
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Error Rate</div>
                <div className="text-xl font-black text-gray-900 mt-1">{subsystem.errorRatePct}%</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Last 24 hours</div>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">Diagnostic Telemetry</h3>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                <div className="p-3 flex items-center justify-between bg-white">
                  <span className="text-gray-500">Service Identifier</span>
                  <span className="font-mono font-bold text-gray-900">{subsystem.key}</span>
                </div>
                <div className="p-3 flex items-center justify-between bg-white">
                  <span className="text-gray-500">Last Health Probe</span>
                  <span className="font-semibold text-gray-700">{subsystem.lastChecked}</span>
                </div>
                <div className="p-3 flex items-center justify-between bg-white">
                  <span className="text-gray-500">Health Check Protocol</span>
                  <span className="font-mono text-gray-700">HTTP/2 TLS 1.3 /healthz</span>
                </div>
                <div className="p-3 flex items-center justify-between bg-white">
                  <span className="text-gray-500">Redundancy Zone</span>
                  <span className="font-semibold text-gray-700">Multi-AZ (ap-south-1a/b)</span>
                </div>
              </div>
            </div>

            {/* Live Probe Log Simulation */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">Live Synthetic Probes</h3>
              <div className="p-3 bg-gray-950 text-emerald-400 font-mono text-[11px] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-gray-400">
                  <span>[PROBE 10:14:02] GET /healthz 200 OK</span>
                  <span>{subsystem.latencyMs - 2}ms</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>[PROBE 10:13:02] GET /healthz 200 OK</span>
                  <span>{subsystem.latencyMs + 1}ms</span>
                </div>
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span>[PROBE 10:12:02] TLS Handshake verified (0 error)</span>
                  <span>Passed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Telemetry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
