// src/features/attendance/components/DeviceDiagnosticDetailsModal.tsx
// ============================================================================
// WorkForceOS — Biometric Terminal Power & Network Health Diagnostic Console
// Diagnoses No Power, LAN / Internet Disconnection, Port Closure & Hardware Crashes
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HelpCircle,
  Cpu,
  PowerOff,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  DeviceHealthDiagnostic,
} from '../../../services/attendance/biometricGatewayService';
import { cn } from '../../../lib/utils';

interface DeviceDiagnosticDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice | null;
  onDiagnosticUpdated: () => void;
}

export const DeviceDiagnosticDetailsModal: React.FC<DeviceDiagnosticDetailsModalProps> = ({
  isOpen,
  onClose,
  device,
  onDiagnosticUpdated,
}) => {
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [forcedState, setForcedState] = useState<string>('DEFAULT');

  if (!isOpen || !device) return null;

  const diag: DeviceHealthDiagnostic = device.diagnostic || {
    status: device.status === 'No Power' ? 'NO_POWER' : device.status === 'No Network' ? 'NO_NETWORK' : device.status === 'Port Closed' ? 'PORT_CLOSED' : 'ONLINE',
    power_status: device.status === 'No Power' ? 'NO_POWER_DETECTED' : 'POWERED_ON',
    lan_status: device.status === 'No Network' ? 'UNREACHABLE' : 'CONNECTED',
    port_status: device.status === 'Port Closed' ? 'PORT_CLOSED' : device.status === 'No Power' ? 'TIMEOUT' : 'PORT_OPEN',
    internet_status: device.status === 'No Network' || device.status === 'No Power' ? 'DISCONNECTED' : 'CONNECTED',
    latency_ms: device.status === 'Online' ? 14 : 0,
    troubleshooting_steps:
      device.status === 'No Power'
        ? [
            'Verify DC 12V / 3A power adapter is securely plugged in and wall outlet is active.',
            'Check device LCD screen / power LED indicator on the front panel.',
            'If using PoE (Power over Ethernet), ensure PoE switch port delivery is enabled (802.3af/at).',
            'Inspect the DC power barrel jack or terminal wiring for loose contacts.',
          ]
        : device.status === 'No Network'
        ? [
            'Verify RJ-45 Ethernet network cable is firmly clicked into the terminal back-plate.',
            `Ensure device IP ${device.ip_address} belongs to the same LAN subnet as the Gateway Agent.`,
            'Check local network switch link lights and VLAN isolation rules.',
            'If configured via Wi-Fi, verify Wi-Fi signal strength and SSID credentials on terminal.',
          ]
        : [],
    last_checked_at: new Date().toISOString(),
  };

  const handleRunDiagnostic = (stateOverride?: any) => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const state = stateOverride || (forcedState !== 'DEFAULT' ? forcedState : undefined);
        const res = biometricGatewayService.runDeviceHealthDiagnostic(device.id, state);
        showToast(
          res.status === 'ONLINE'
            ? `Device health check passed (${res.latency_ms}ms latency).`
            : `Hardware diagnostic detected ${res.status.replace(/_/g, ' ')}!`,
          res.status === 'ONLINE' ? 'default' : 'error'
        );
        onDiagnosticUpdated();
      } catch (err: any) {
        showToast(err.message || 'Diagnostic failed', 'error');
      } finally {
        setIsRunning(false);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs',
                diag.status === 'ONLINE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : diag.status === 'NO_POWER'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              )}
            >
              {diag.status === 'ONLINE' ? (
                <Activity className="w-5 h-5" />
              ) : diag.status === 'NO_POWER' ? (
                <PowerOff className="w-5 h-5" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{device.device_name}</h3>
                <Badge
                  variant={
                    diag.status === 'ONLINE'
                      ? 'emerald'
                      : diag.status === 'NO_POWER'
                      ? 'rose'
                      : 'amber'
                  }
                  className="text-[10px]"
                >
                  {diag.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 font-mono">
                IP: {device.ip_address}:{device.port} • SN: {device.serial_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Pipeline Steps */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Status Alert Banner */}
          {diag.status === 'NO_POWER' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
              <PowerOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">No Power / Device Powered Off</h4>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                  The terminal hardware is completely unreachable (100% packet loss, ping timeout). The device may be disconnected from AC power, the power supply unit failed, or the PoE switch port is disabled.
                </p>
              </div>
            </div>
          )}

          {diag.status === 'NO_NETWORK' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">LAN Disconnected / No Subnet Route</h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  The terminal has power, but cannot communicate on the local area network. The Ethernet cable may be unplugged, or the IP address <span className="font-mono font-bold">{device.ip_address}</span> is on an isolated VLAN.
                </p>
              </div>
            </div>
          )}

          {diag.status === 'PORT_CLOSED' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">TCP Port {device.port} Refused</h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  The IP address responds to ping, but the biometric TCP listener on port {device.port} is closed. The terminal service may need a restart or firewall rules must allow port {device.port}.
                </p>
              </div>
            </div>
          )}

          {diag.status === 'ONLINE' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold">Hardware Online & Fully Operational</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Power supply active, local TCP socket handshake responsive with <span className="font-bold">{diag.latency_ms}ms latency</span>, and real-time punch stream connected.
                </p>
              </div>
            </div>
          )}

          {/* 4-Tier Inspection Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5" /> 1. Power Supply
                </span>
                {diag.power_status === 'POWERED_ON' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="font-bold text-gray-900 text-xs font-mono">
                {diag.power_status === 'POWERED_ON' ? '12V DC Active' : 'No Power Detected'}
              </div>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" /> 2. LAN Connectivity
                </span>
                {diag.lan_status === 'CONNECTED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="font-bold text-gray-900 text-xs font-mono">
                {diag.lan_status === 'CONNECTED' ? 'Subnet Reachable' : 'Unreachable (EHOSTUNREACH)'}
              </div>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> 3. TCP Port {device.port}
                </span>
                {diag.port_status === 'PORT_OPEN' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="font-bold text-gray-900 text-xs font-mono">
                {diag.port_status === 'PORT_OPEN' ? 'Port Open (ACK 1000)' : diag.port_status === 'TIMEOUT' ? 'Socket Timeout' : 'Port Closed (ECONNREFUSED)'}
              </div>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 4. Cloud Sync Tunnel
                </span>
                {diag.internet_status === 'CONNECTED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="font-bold text-gray-900 text-xs font-mono">
                {diag.internet_status === 'CONNECTED' ? 'WSS TLS Stream Ready' : 'Sync Paused (Offline)'}
              </div>
            </div>
          </div>

          {/* Troubleshooting Checklist */}
          {diag.troubleshooting_steps.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Recommended Troubleshooting Steps for IT / Plant Supervisors:
              </div>
              <ul className="space-y-1.5 text-[11px] text-gray-600 pl-5 list-disc">
                {diag.troubleshooting_steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diagnostic Simulation & Live Probe Bar */}
          <div className="p-4 border border-dashed border-gray-300 rounded-2xl bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-800">Simulate Hardware State for Testing:</div>
              <span className="text-[10px] text-gray-400 font-mono">Simulates network fault / power cut</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={forcedState}
                onChange={e => setForcedState(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden"
              >
                <option value="DEFAULT">Live Hardware Probe (Default)</option>
                <option value="ONLINE">Force State: Online & Healthy</option>
                <option value="NO_POWER">Force State: No Power (Powered Off)</option>
                <option value="NO_NETWORK">Force State: LAN / No Internet Disconnect</option>
                <option value="PORT_CLOSED">Force State: TCP Port 4370 Closed</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRunDiagnostic()}
                disabled={isRunning}
                className="text-xs rounded-xl bg-[#07563D] hover:bg-[#0b7a57] text-white"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isRunning && 'animate-spin')} />
                Run Diagnostic
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 text-xs text-gray-500">
          <div>
            Last Probed: <span className="font-mono text-gray-700">{new Date(diag.last_checked_at).toLocaleTimeString()}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
