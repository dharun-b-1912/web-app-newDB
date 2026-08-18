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
  Trash2,
  FileText,
  Bug,
  Users,
  PowerOff,
  WifiOff,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  BiometricDevice,
  RawBiometricPunch,
  BiometricDiagnosticLog,
} from '../../../services/attendance/biometricGatewayService';
import {
  biometricCommandService,
  BiometricDeviceCommand,
} from '../../../services/attendance/biometricCommandService';
import { BiometricSetupWizardModal } from '../components/BiometricSetupWizardModal';
import { DeviceUsersManagerModal } from '../components/DeviceUsersManagerModal';
import { DeviceDiagnosticDetailsModal } from '../components/DeviceDiagnosticDetailsModal';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export const BiometricIntegrationView: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [punches, setPunches] = useState<RawBiometricPunch[]>([]);
  const [commands, setCommands] = useState<BiometricDeviceCommand[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<BiometricDiagnosticLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'terminals' | 'agents' | 'commands' | 'punches' | 'logs'>('terminals');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isStressTestModalOpen, setIsStressTestModalOpen] = useState(false);
  const [isDeviceUsersModalOpen, setIsDeviceUsersModalOpen] = useState(false);
  const [selectedDeviceForUsers, setSelectedDeviceForUsers] = useState<BiometricDevice | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [selectedDeviceForDiagnostic, setSelectedDeviceForDiagnostic] = useState<BiometricDevice | null>(null);

  // Log Filters
  const [logCategoryFilter, setLogCategoryFilter] = useState('ALL');
  const [logSeverityFilter, setLogSeverityFilter] = useState('ALL');

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

  const loadData = async () => {
    await biometricGatewayService.syncLocalAgentStatus();
    setAgents(biometricGatewayService.getGatewayAgents());
    setDevices(biometricGatewayService.getBiometricDevices());
    setPunches(biometricGatewayService.getRawPunches(50));
    setCommands(biometricCommandService.getCommands());
    setDiagnosticLogs(biometricGatewayService.getDiagnosticLogs());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      biometricGatewayService.syncLocalAgentStatus().then(ag => {
        if (ag) setAgents(biometricGatewayService.getGatewayAgents());
      });
    }, 3000);
    const unsub = hrEventBus.subscribe('attendance.punch_received', () => {
      setPunches(biometricGatewayService.getRawPunches(50));
      setDiagnosticLogs(biometricGatewayService.getDiagnosticLogs());
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const handleGeneratePairing = () => {
    const data = biometricGatewayService.generatePairingKey(pairingBranch);
    setGeneratedPairingData(data);
    setAgents(biometricGatewayService.getGatewayAgents());
  };

  const handleDispatchCommand = async (deviceId: string, cmdType: any) => {
    await biometricCommandService.dispatchCommand({
      deviceId,
      commandType: cmdType,
    });
    showToast(`Command ${cmdType} dispatched to hardware terminal.`);
    setTimeout(() => loadData(), 500);
  };

  const handleSimulateCrashLog = () => {
    biometricGatewayService.logDiagnosticEvent({
      category: 'CRASH_ERROR',
      severity: 'CRASH',
      device_id: devices[0]?.id || 'dev-zk-sim',
      device_name: devices[0]?.device_name || 'Main Gate Terminal',
      ip_address: devices[0]?.ip_address || '192.168.1.201',
      port: devices[0]?.port || 4370,
      message: 'TCP Connection Reset by Peer (ECONNRESET): Terminal watchdog triggered unexpected hardware reboot.',
      error_code: 'ERR_SOCKET_CONNECTION_RESET',
      stack_trace: 'Error: ECONNRESET at TCP.onStreamRead (node:internal/stream_base_commons:217:20)\n    at ZkTecoStandaloneProtocol.connect (zktecoStandaloneSdk.ts:88)\n    at EdgeAgentEngine.runDiagnostic (edgeAgentEngine.ts:142)',
    });
    showToast('Diagnostic crash log recorded for hardware inspection.', 'error');
    loadData();
  };

  const handleClearLogs = () => {
    biometricGatewayService.clearDiagnosticLogs();
    setDiagnosticLogs([]);
    showToast('Biometric diagnostic logs cleared.');
  };

  const handleExportLogsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(diagnosticLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `workforce_biometric_diagnostics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Diagnostic logs report exported as JSON.');
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

  const handleDeleteDevice = (devId: string) => {
    biometricGatewayService.deleteDevice(devId);
    loadData();
    showToast('Biometric terminal removed successfully.');
  };

  const handleDeleteAgent = (agentId: string) => {
    biometricGatewayService.deleteAgent(agentId);
    loadData();
    showToast('LAN Gateway Agent removed successfully.');
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
          { id: 'commands', label: 'Remote Commands Bus', icon: Terminal },
          { id: 'punches', label: 'Live Punch Ingestion Stream', icon: Activity },
          { id: 'logs', label: 'Diagnostic & Crash Logs', icon: Bug },
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
          {devices.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No Biometric Terminals Registered</h4>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                Run the local network auto-discovery scan to detect ZKTeco, Mantra, and eSSL hardware or register devices manually.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsWizardOpen(true)}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <Radio className="w-3.5 h-3.5" /> Auto-Discover & Setup Wizard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDeviceModalOpen(true)}
                  className="text-xs rounded-xl border-gray-200"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Terminal
                </Button>
              </div>
            </div>
          ) : (
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
                      {dev.status === 'Online' ? (
                        <button
                          onClick={() => {
                            setSelectedDeviceForDiagnostic(dev);
                            setIsDiagnosticModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online ({dev.diagnostic?.latency_ms || 12}ms)
                        </button>
                      ) : dev.status === 'No Power' ? (
                        <button
                          onClick={() => {
                            setSelectedDeviceForDiagnostic(dev);
                            setIsDiagnosticModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition"
                        >
                          <PowerOff className="w-3 h-3 text-rose-600" />
                          No Power / Offline
                        </button>
                      ) : dev.status === 'No Network' ? (
                        <button
                          onClick={() => {
                            setSelectedDeviceForDiagnostic(dev);
                            setIsDiagnosticModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition"
                        >
                          <WifiOff className="w-3 h-3 text-amber-600" />
                          No LAN / Internet
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDeviceForDiagnostic(dev);
                            setIsDiagnosticModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {dev.status}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeviceForDiagnostic(dev);
                            setIsDiagnosticModalOpen(true);
                          }}
                          className="text-[11px] font-bold rounded-xl border-amber-200 text-amber-900 bg-amber-50/40 hover:bg-amber-100"
                        >
                          <Activity className="w-3 h-3 mr-1 text-amber-600" />
                          Health Check
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeviceForUsers(dev);
                            setIsDeviceUsersModalOpen(true);
                          }}
                          className="text-[11px] font-bold rounded-xl border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Enrolled Users
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(dev.id)}
                          className="text-[11px] font-bold rounded-xl border-gray-200"
                        >
                          Test Socket
                        </Button>
                        <button
                          onClick={() => handleDeleteDevice(dev.id)}
                          title="Remove Device"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 2: LAN Gateway Daemons */}
      {activeSubTab === 'agents' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          {agents.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <Server className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No LAN Gateway Agents Paired</h4>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                Deploy an outbound-only gateway agent on your local network to connect on-premises biometric devices to WorkForceOS Cloud.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setGeneratedPairingData(null);
                  setIsPairingModalOpen(true);
                }}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" /> Pair Your First LAN Agent
              </Button>
            </div>
          ) : (
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
                  <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleDeleteAgent(ag.id)}
                        title="Remove Agent"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 3: Remote Commands Bus */}
      {activeSubTab === 'commands' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          {commands.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <Terminal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No Remote Hardware Commands</h4>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                Dispatch clock synchronization, employee sync, and diagnostic commands to connected biometric machines.
              </p>
              {devices.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDispatchCommand(devices[0].id, 'SYNC_TIME')}
                    className="text-xs rounded-xl"
                  >
                    Sync Device Clock
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDispatchCommand(devices[0].id, 'TEST_CONNECTION')}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs rounded-xl"
                  >
                    Test TCP Socket
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Command ID</TableHead>
                  <TableHead className="font-bold text-gray-700">Hardware Terminal</TableHead>
                  <TableHead className="font-bold text-gray-700">Command Type</TableHead>
                  <TableHead className="font-bold text-gray-700">Status</TableHead>
                  <TableHead className="font-bold text-gray-700">Dispatched At</TableHead>
                  <TableHead className="font-bold text-gray-700">Response / Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map(cmd => (
                  <TableRow key={cmd.id} className="hover:bg-emerald-50/40 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-gray-900">
                      {cmd.id}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-gray-800">
                      {cmd.device_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="gray" className="text-[10px] font-mono">
                        {cmd.command_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cmd.status === 'SUCCESS' ? 'emerald' : cmd.status === 'RUNNING' ? 'amber' : 'rose'}
                        className="text-[10px]"
                      >
                        {cmd.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-700">
                      {new Date(cmd.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 font-mono text-[11px] truncate max-w-[260px]">
                      {cmd.response_payload?.message || JSON.stringify(cmd.response_payload || {})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 4: Live Punch Ingestion Stream */}
      {activeSubTab === 'punches' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          {punches.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">Awaiting Live Biometric Events</h4>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                No raw punches received yet today. Punches will stream here in real-time as employees tap their finger or face.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStressTestModalOpen(true)}
                className="text-xs rounded-xl border-amber-300 text-amber-900"
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" /> Run Punch Test Simulation
              </Button>
            </div>
          ) : (
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
          )}
        </Card>
      )}

      {/* TAB 5: Diagnostic & Crash Logs */}
      {activeSubTab === 'logs' && (
        <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden bg-white">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-gray-700">Category:</span>
                <select
                  value={logCategoryFilter}
                  onChange={e => setLogCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="ALL">All Categories</option>
                  <option value="TCP_SOCKET">TCP Socket / Handshake</option>
                  <option value="PUNCH_INGESTION">Punch Ingestion</option>
                  <option value="DEVICE_COMMAND">Device Commands</option>
                  <option value="AGENT_HEARTBEAT">Agent Heartbeat</option>
                  <option value="CRASH_ERROR">Crash / Hardware Errors</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-gray-700">Severity:</span>
                <select
                  value={logSeverityFilter}
                  onChange={e => setLogSeverityFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                >
                  <option value="ALL">All Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="CRASH">CRASH</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateCrashLog}
                className="text-xs rounded-xl border-rose-200 text-rose-800 hover:bg-rose-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Simulate TCP Socket Crash
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogsJson}
                disabled={diagnosticLogs.length === 0}
                className="text-xs rounded-xl border-gray-200"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={diagnosticLogs.length === 0}
                className="text-xs rounded-xl border-gray-200 text-gray-600 hover:text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear Logs
              </Button>
            </div>
          </div>

          {diagnosticLogs.length === 0 ? (
            <div className="p-12 text-center max-w-md mx-auto">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-900">No Diagnostic Logs Recorded</h4>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                TCP socket handshakes, heartbeat pings, user sync operations, and network timeouts will be logged here in real-time.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateCrashLog}
                className="text-xs rounded-xl border-gray-300"
              >
                Record Test Diagnostic Log
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-gray-700">Timestamp</TableHead>
                  <TableHead className="font-bold text-gray-700">Category & Level</TableHead>
                  <TableHead className="font-bold text-gray-700">Device & Endpoint</TableHead>
                  <TableHead className="font-bold text-gray-700">Log Message</TableHead>
                  <TableHead className="font-bold text-gray-700">Diagnostic Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnosticLogs
                  .filter(l => (logCategoryFilter === 'ALL' || l.category === logCategoryFilter) && (logSeverityFilter === 'ALL' || l.severity === logSeverityFilter))
                  .map(log => (
                    <TableRow key={log.id} className={cn('hover:bg-gray-50/70 transition-colors', log.severity === 'CRASH' && 'bg-rose-50/20')}>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              log.severity === 'CRASH'
                                ? 'rose'
                                : log.severity === 'ERROR'
                                ? 'rose'
                                : log.severity === 'WARN'
                                ? 'amber'
                                : 'emerald'
                            }
                            className="text-[10px]"
                          >
                            {log.severity}
                          </Badge>
                          <span className="text-[10px] text-gray-500 font-mono">{log.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.device_name ? (
                          <div>
                            <div className="text-xs font-bold text-gray-800">{log.device_name}</div>
                            {log.ip_address && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {log.ip_address}:{log.port}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Gateway Core</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-800">
                        {log.message}
                      </TableCell>
                      <TableCell>
                        {log.stack_trace ? (
                          <details className="cursor-pointer text-[10px] text-rose-700 font-mono">
                            <summary className="hover:underline font-bold">View Stack & Error Code ({log.error_code || 'ERROR'})</summary>
                            <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto whitespace-pre-wrap max-w-sm">
                              {log.stack_trace}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Modal: Enrolled Users Manager */}
      <DeviceUsersManagerModal
        isOpen={isDeviceUsersModalOpen}
        onClose={() => {
          setIsDeviceUsersModalOpen(false);
          setSelectedDeviceForUsers(null);
          loadData();
        }}
        device={selectedDeviceForUsers}
      />

      {/* Modal: Power & Network Diagnostic Details */}
      <DeviceDiagnosticDetailsModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => {
          setIsDiagnosticModalOpen(false);
          setSelectedDeviceForDiagnostic(null);
          loadData();
        }}
        device={selectedDeviceForDiagnostic}
        onDiagnosticUpdated={loadData}
      />

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
