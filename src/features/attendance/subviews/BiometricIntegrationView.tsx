// src/features/attendance/subviews/BiometricIntegrationView.tsx
// ============================================================================
// WorkForceOS — Enterprise Biometric Management & Zero-Port Forwarding Console
// LAN Gateway Agents, ZKTeco TCP Socket, Mantra RD, Live Punch Stream & Stress Tester
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Server,
  Plus,
  Activity,
  Zap,
  Radio,
  Wifi,
  HardDrive,
  Copy,
  Download,
  Terminal,
  Play,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  BiometricDevice,
  RawBiometricPunch,
} from '../../../services/attendance/biometricGatewayService';
import { BiometricSetupWizardModal } from '../components/BiometricSetupWizardModal';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const BiometricIntegrationView: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [punches, setPunches] = useState<RawBiometricPunch[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'terminals' | 'agents' | 'punches'>('terminals');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isStressTestModalOpen, setIsStressTestModalOpen] = useState(false);

  // Pairing State
  const [pairingBranch, setPairingBranch] = useState('Bengaluru Tech Park Campus');
  const [generatedPairingData, setGeneratedPairingData] = useState<{ pairingKey: string; oneLinerScript: string } | null>(null);

  // Device Form State
  const [devName, setDevName] = useState('');
  const [devVendor, setDevVendor] = useState<'ZKTeco' | 'Mantra' | 'eSSL' | 'Suprema' | 'Matrix COSEC'>('ZKTeco');
  const [devType, setDevType] = useState<'Facial Recognition' | 'Fingerprint' | 'Turnstile Gate' | 'RFID Card'>('Facial Recognition');
  const [devModel, setDevModel] = useState('FaceDepot-7BL');
  const [devSerial, setDevSerial] = useState('');
  const [devIp, setDevIp] = useState('192.168.1.210');
  const [devPort, setDevPort] = useState(4370);
  const [devBranch, setDevBranch] = useState('Bengaluru Tech Park Campus');
  const [devLocation, setDevLocation] = useState('Main Campus Entrance');

  // Stress Test State
  const [stressCount, setStressCount] = useState(500);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressResult, setStressResult] = useState<{
    totalSent: number;
    processed: number;
    deduplicated: number;
    elapsedMs: number;
  } | null>(null);

  const loadData = () => {
    setAgents(biometricGatewayService.getGatewayAgents());
    setDevices(biometricGatewayService.getBiometricDevices());
    setPunches(biometricGatewayService.getRawPunches(50));
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('attendance.punch_received', () => {
      setPunches(biometricGatewayService.getRawPunches(50));
    });
    return () => unsub();
  }, []);

  const handleGeneratePairing = () => {
    const data = biometricGatewayService.generatePairingKey(pairingBranch);
    setGeneratedPairingData(data);
    setAgents(biometricGatewayService.getGatewayAgents());
  };

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devName || !devSerial) return;

    biometricGatewayService.registerDevice({
      device_name: devName,
      vendor: devVendor,
      device_type: devType,
      model: devModel,
      serial_number: devSerial,
      ip_address: devIp,
      port: devPort,
      branch: devBranch,
      location_description: devLocation,
      registered_users_count: 0,
      sync_frequency_mins: 1,
    });

    showToast(`Biometric terminal ${devName} registered successfully!`);
    setIsAddDeviceModalOpen(false);
    loadData();
  };

  const handleTestConnection = (deviceId: string) => {
    const res = biometricGatewayService.testDeviceConnection(deviceId);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    try {
      const res = await biometricGatewayService.simulateHighConcurrencyTaps(stressCount);
      setStressResult(res);
      loadData();
      showToast(`Processed ${res.processed} taps in ${res.elapsedMs}ms (${res.deduplicated} filtered by edge deduplication).`);
    } catch {
      showToast('Error executing stress test', 'error');
    } finally {
      setIsStressTesting(false);
    }
  };

  const totalTerminals = devices.length;
  const onlineAgents = agents.filter(a => a.status === 'ONLINE').length;
  const totalRawPunches = punches.length;
  const deduplicatedCount = punches.filter(p => p.processed_status === 'DEDUPLICATED_IGNORED').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Biometric Devices & On-Premises LAN Gateways</h2>
            <Badge variant="emerald" size="sm" className="text-[10px] gap-1 font-mono">
              <Radio className="w-3 h-3 animate-pulse text-[#07563D]" /> Zero-Port Forwarding Active
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Outbound WSS/TLS tunnel listener, raw TCP socket drivers (ZKTeco port 4370, Mantra 11100), edge deduplication, and sub-second shift engine.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
          >
            <Radio className="w-4 h-4" /> Auto-Discover & Setup Wizard
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStressTestModalOpen(true)}
            className="text-xs gap-1.5 rounded-xl border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            <Zap className="w-4 h-4 text-amber-600" /> Factory Concurrency Tester
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGeneratedPairingData(null);
              setIsPairingModalOpen(true);
            }}
            className="text-xs gap-1.5 rounded-xl border-gray-200 text-gray-700"
          >
            <Terminal className="w-4 h-4 text-[#07563D]" /> Pair LAN Agent
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDeviceModalOpen(true)}
            className="text-xs gap-1.5 rounded-xl border-gray-200 text-gray-700"
          >
            <Plus className="w-4 h-4" /> Add Terminal Manual
          </Button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Active LAN Gateways</span>
            <Server className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-black text-gray-900">{onlineAgents} / {agents.length} Online</div>
          <p className="text-[11px] text-emerald-600 font-semibold">Outbound WSS Persistent Tunnels</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Connected Terminals</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{totalTerminals} Terminals</div>
          <p className="text-[11px] text-gray-400">ZKTeco, Mantra, eSSL, Suprema</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">Events Ingested Today</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{totalRawPunches} Punches</div>
          <p className="text-[11px] text-gray-400">Real-time sub-second cloud sync</p>
        </Card>

        <Card className="p-5 rounded-3xl border-gray-200/80 shadow-2xs space-y-2 bg-white">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase text-gray-500">60s Edge Deduplication</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{deduplicatedCount} Filtered</div>
          <p className="text-[11px] text-gray-400">Zero duplicate cloud traffic</p>
        </Card>
      </div>

      {/* 3. Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2">
        {[
          { id: 'terminals', label: 'Hardware Terminals', icon: Cpu },
          { id: 'agents', label: 'LAN Gateway Daemons', icon: Server },
          { id: 'punches', label: 'Live Punch Ingestion Stream', icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2',
                isActive
                  ? 'bg-[#07563D] text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Configured Hardware Terminals */}
      {activeSubTab === 'terminals' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Terminal & Model</TableHead>
                <TableHead className="font-bold text-gray-700">Vendor & Protocol</TableHead>
                <TableHead className="font-bold text-gray-700">Campus / Branch</TableHead>
                <TableHead className="font-bold text-gray-700">Local IP : Port</TableHead>
                <TableHead className="font-bold text-gray-700">Enrolled Users</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map(dev => (
                <TableRow key={dev.id} className="hover:bg-emerald-50/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{dev.device_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">SN: {dev.serial_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{dev.vendor} • {dev.model}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {dev.port === 4370 ? 'Raw TCP Socket' : 'HTTP REST / WS'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-gray-800">{dev.branch}</div>
                    <div className="text-[10px] text-gray-400">{dev.location_description}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-900 font-bold">
                    {dev.ip_address} : {dev.port}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {dev.registered_users_count} Users
                  </TableCell>
                  <TableCell>
                    <Badge variant={dev.status === 'Online' ? 'emerald' : 'rose'} className="text-[10px] gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {dev.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(dev.id)}
                      className="text-[11px] font-bold rounded-xl border-gray-200"
                    >
                      Test Socket
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 2: LAN Gateway Daemons */}
      {activeSubTab === 'agents' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Gateway Agent Daemon</TableHead>
                <TableHead className="font-bold text-gray-700">Branch Location</TableHead>
                <TableHead className="font-bold text-gray-700">OS Platform</TableHead>
                <TableHead className="font-bold text-gray-700">Network IPs</TableHead>
                <TableHead className="font-bold text-gray-700">Terminals</TableHead>
                <TableHead className="font-bold text-gray-700">Tunnel Status</TableHead>
                <TableHead className="font-bold text-gray-700">Last Heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map(ag => (
                <TableRow key={ag.id} className="hover:bg-emerald-50/40 transition-colors">
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{ag.agent_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">v{ag.version} • {ag.pairing_key}</div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-800">{ag.branch_name}</TableCell>
                  <TableCell className="text-xs text-gray-600">{ag.os_platform}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    <div>LAN: {ag.local_ip}</div>
                    <div className="text-[10px] text-gray-400">WAN: {ag.public_ip}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-gray-900">
                    {ag.connected_devices_count} Terminals
                  </TableCell>
                  <TableCell>
                    <Badge variant={ag.status === 'ONLINE' ? 'emerald' : 'amber'} className="text-[10px]">
                      {ag.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 font-mono">
                    {new Date(ag.last_heartbeat).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 3: Live Punch Ingestion Stream */}
      {activeSubTab === 'punches' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-gray-700">Punch ID & Hash</TableHead>
                <TableHead className="font-bold text-gray-700">Employee & PIN</TableHead>
                <TableHead className="font-bold text-gray-700">Hardware Terminal</TableHead>
                <TableHead className="font-bold text-gray-700">Verification Mode</TableHead>
                <TableHead className="font-bold text-gray-700">Timestamp</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {punches.map(p => (
                <TableRow key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs font-bold text-gray-900">{p.id}</div>
                    <div className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{p.dedup_hash}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{p.employee_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">PIN: {p.biometric_pin}</div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-800">{p.device_name}</TableCell>
                  <TableCell>
                    <Badge variant="blue" className="text-[10px]">
                      {p.verification_mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">
                    {new Date(p.punch_time).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.processed_status === 'PROCESSED' ? 'emerald' : 'gray'}
                      className="text-[10px]"
                    >
                      {p.processed_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal: Agent Pairing Wizard */}
      <Modal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        title="Pair LAN Gateway Agent"
        description="Deploy a lightweight zero-port forwarding agent inside client premise LAN"
      >
        <div className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          {!generatedPairingData ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Campus / Branch *</label>
                <select
                  value={pairingBranch}
                  onChange={e => setPairingBranch(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white font-bold"
                >
                  <option value="Bengaluru Tech Park Campus">Bengaluru Tech Park Campus</option>
                  <option value="Coimbatore Plant & Manufacturing Unit">Coimbatore Plant & Manufacturing Unit</option>
                  <option value="Mumbai Regional Headquarters">Mumbai Regional Headquarters</option>
                </select>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-emerald-900">
                <p className="font-bold">Zero-Port Forwarding & Firewall Traversal:</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  The on-prem daemon runs as a native Windows Service / Linux systemd daemon. It establishes an outbound-only WebSocket (`WSS`) TLS tunnel to WorkForceOS Cloud. No router configuration or public static IPs are needed.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleGeneratePairing}
                className="w-full bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl py-2.5"
              >
                <Zap className="w-4 h-4" /> Generate Pairing Key & One-Liner
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Pairing Activation Key</span>
                <div className="flex items-center justify-between font-mono text-lg font-black text-[#07563D]">
                  <span>{generatedPairingData.pairingKey}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPairingData.pairingKey);
                      showToast('Pairing key copied to clipboard!');
                    }}
                    className="text-xs gap-1 rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">Windows PowerShell One-Liner Installer</label>
                <textarea
                  readOnly
                  rows={3}
                  value={generatedPairingData.oneLinerScript}
                  className="w-full p-3 font-mono text-[11px] rounded-xl border border-gray-200 bg-gray-900 text-emerald-400 select-all"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPairingData.oneLinerScript);
                    showToast('PowerShell command copied!');
                  }}
                  className="text-xs gap-1 rounded-xl w-full"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy One-Liner Command
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Terminal Registration */}
      <Modal
        isOpen={isAddDeviceModalOpen}
        onClose={() => setIsAddDeviceModalOpen(false)}
        title="Register Hardware Biometric Terminal"
        description="Configure ZKTeco, Mantra, or eSSL device sitting on local LAN"
      >
        <form onSubmit={handleRegisterDevice} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Device Name *</label>
            <input
              type="text"
              placeholder="e.g. Factory Floor Gate 2 Ingress"
              value={devName}
              onChange={e => setDevName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hardware Vendor *</label>
              <select
                value={devVendor}
                onChange={e => setDevVendor(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="ZKTeco">ZKTeco (node-zklib)</option>
                <option value="Mantra">Mantra (RD Service)</option>
                <option value="eSSL">eSSL Hardware</option>
                <option value="Suprema">Suprema BioStar</option>
                <option value="Matrix COSEC">Matrix COSEC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Verification Mode</label>
              <select
                value={devType}
                onChange={e => setDevType(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
              >
                <option value="Facial Recognition">Facial Recognition</option>
                <option value="Fingerprint">Fingerprint</option>
                <option value="Turnstile Gate">Turnstile Gate</option>
                <option value="RFID Card">RFID Card</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Local LAN IP Address *</label>
              <input
                type="text"
                placeholder="192.168.1.201"
                value={devIp}
                onChange={e => setDevIp(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">TCP Socket Port *</label>
              <input
                type="number"
                value={devPort}
                onChange={e => setDevPort(Number(e.target.value))}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Device Model</label>
              <input
                type="text"
                value={devModel}
                onChange={e => setDevModel(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Serial Number *</label>
              <input
                type="text"
                placeholder="ZK-99201827"
                value={devSerial}
                onChange={e => setDevSerial(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddDeviceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Register Terminal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Concurrency Stress Tester */}
      <Modal
        isOpen={isStressTestModalOpen}
        onClose={() => setIsStressTestModalOpen(false)}
        title="Factory Concurrency Stress Tester (1,000+ Simultaneous Taps)"
        description="Simulate shift change burst loads to benchmark ingestion speed and edge deduplication"
      >
        <div className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Simulated Punches Burst Count</label>
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setStressCount(cnt)}
                  className={cn(
                    'p-3 rounded-2xl border text-xs font-bold transition text-center',
                    stressCount === cnt
                      ? 'bg-[#07563D] text-white border-[#07563D]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {cnt} Punches
                </button>
              ))}
            </div>
          </div>

          {stressResult && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Benchmark Completed</span>
                <Badge variant="emerald" size="sm" className="text-[10px]">
                  {stressResult.elapsedMs} ms total
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800">
                <div>Processed: <strong>{stressResult.processed} punches</strong></div>
                <div>Deduplicated: <strong>{stressResult.deduplicated} filtered</strong></div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={isStressTesting}
            onClick={handleRunStressTest}
            className="w-full bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl py-3 shadow-xs"
          >
            <Zap className="w-4 h-4" />
            {isStressTesting ? 'Simulating High-Concurrency Burst...' : `Execute ${stressCount} Punches Stress Test`}
          </Button>
        </div>
      </Modal>

      {/* 5-Stage LAN Auto-Discovery & Zero-Config Setup Wizard Modal */}
      <BiometricSetupWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSetupCompleted={() => {
          loadData();
        }}
      />
    </div>
  );
};
