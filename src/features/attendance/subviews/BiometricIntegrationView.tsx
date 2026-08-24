// src/features/attendance/subviews/BiometricIntegrationView.tsx
// ============================================================================
// WorkForceOS — Enterprise Biometric Management Console (UX/UI 2.0)
// Spacing, Clean Hierarchy, Guided Wizards, Dedicated Device Workspaces & Infrastructure
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  ArrowRight,
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
  getActiveOrgId,
} from '../../../services/attendance/biometricCommandService';
import { BiometricSetupWizardModal } from '../components/BiometricSetupWizardModal';
import { DeviceUsersManagerModal } from '../components/DeviceUsersManagerModal';
import { DeviceDiagnosticDetailsModal } from '../components/DeviceDiagnosticDetailsModal';
import { RemoteBiometricEnrollmentModal } from '../components/RemoteBiometricEnrollmentModal';
import { BiometricDeviceWorkspace } from '../components/BiometricDeviceWorkspace';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

export interface BiometricIntegrationViewProps {
  currentTab?: string;
  onNavigateSubPath?: (subPath: string) => void;
}

export const BiometricIntegrationView: React.FC<BiometricIntegrationViewProps> = ({
  currentTab = 'biometric',
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();
  
  // Primary State
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [punches, setPunches] = useState<RawBiometricPunch[]>([]);
  const [commands, setCommands] = useState<BiometricDeviceCommand[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<BiometricDiagnosticLog[]>([]);

  // Navigation & Workspace State
  const [selectedWorkspaceDevice, setSelectedWorkspaceDevice] = useState<BiometricDevice | null>(null);
  const [infraSubTab, setInfraSubTab] = useState<'gateways' | 'punches' | 'commands' | 'diagnostics'>(() => {
    if (currentTab === 'device-logs') return 'punches';
    if (currentTab === 'device-sync') return 'commands';
    if (currentTab === 'punch-mapping') return 'diagnostics';
    return 'gateways';
  });

  useEffect(() => {
    if (currentTab === 'device-logs') setInfraSubTab('punches');
    else if (currentTab === 'device-sync') setInfraSubTab('commands');
    else if (currentTab === 'punch-mapping') setInfraSubTab('diagnostics');
    else if (currentTab === 'biometric' || currentTab === 'biometric-devices' || currentTab === 'device-enrollment') setInfraSubTab('gateways');
  }, [currentTab]);

  // Search & Filter State
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [openDropdownDeviceId, setOpenDropdownDeviceId] = useState<string | null>(null);

  // Modals
  const [isAddDeviceWizardOpen, setIsAddDeviceWizardOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isStressTestModalOpen, setIsStressTestModalOpen] = useState(false);
  const [isDeviceUsersModalOpen, setIsDeviceUsersModalOpen] = useState(false);
  const [selectedDeviceForUsers, setSelectedDeviceForUsers] = useState<BiometricDevice | null>(null);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [selectedDeviceForDiagnostic, setSelectedDeviceForDiagnostic] = useState<BiometricDevice | null>(null);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'device' | 'agent' | 'command' | 'all_commands' | 'all_logs';
    id?: string;
    name?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Log Filters
  const [logCategoryFilter, setLogCategoryFilter] = useState('ALL');
  const [logSeverityFilter, setLogSeverityFilter] = useState('ALL');

  // Pairing State
  const [pairingBranch, setPairingBranch] = useState('Bengaluru Tech Park Campus');
  const [generatedPairingData, setGeneratedPairingData] = useState<{ pairingKey: string; oneLinerScript: string } | null>(null);

  // Stress Test State
  const [stressCount, setStressCount] = useState(500);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressResult, setStressResult] = useState<{
    totalSent: number;
    processed: number;
    deduplicated: number;
    elapsedMs: number;
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    try {
      await biometricGatewayService.syncLocalAgentStatus();
      setAgents(biometricGatewayService.getGatewayAgents());
      setDevices(biometricGatewayService.getBiometricDevices());
      setPunches(biometricGatewayService.getRawPunches(50));
      setCommands(biometricCommandService.getCommands());
      setDiagnosticLogs(biometricGatewayService.getDiagnosticLogs());
    } catch (err) {
      console.error('[BiometricIntegrationView] Error loading data:', err);
    }
  };

  const scheduleUpdate = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadData();
    }, 50);
  };

  const isPollingRef = useRef(false);

  useEffect(() => {
    loadData();

    // 1. Subscribe to hrEventBus real-time events
    const unsubBiometric = hrEventBus.subscribe('biometric.*', () => scheduleUpdate());
    const unsubDevice = hrEventBus.subscribe('device.*', () => scheduleUpdate());
    const unsubAttendance = hrEventBus.subscribe('attendance.*', () => scheduleUpdate());

    // 2. Subscribe to window custom events and cross-tab storage events
    const handleCustomUpdate = () => scheduleUpdate();
    window.addEventListener('biometric:updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    const runPulse = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await biometricGatewayService.syncLocalAgentStatus();
        const currentAgents = biometricGatewayService.getGatewayAgents();
        setAgents(currentAgents);

        const currentDevs = biometricGatewayService.getBiometricDevices();
        for (const d of currentDevs) {
          if (d.ip_address) {
            try {
              const probe = await biometricGatewayService.probeSingleDevice(d.ip_address, d.port);
              d.status = probe.success ? 'Online' : 'Offline';
            } catch (_) {}
          }
        }
        setDevices(currentDevs);
      } catch (_) {} finally {
        isPollingRef.current = false;
      }
    };

    const interval = setInterval(runPulse, 6000);
    return () => {
      clearInterval(interval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubBiometric();
      unsubDevice();
      unsubAttendance();
      window.removeEventListener('biometric:updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  // Multi-Device Master Synchronizer
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleSyncAllDevices = async () => {
    setIsSyncingAll(true);
    try {
      const res = await biometricGatewayService.syncAllDevices();
      if (res.successfulDevices > 0) {
        showToast(`✓ Synchronized ${res.successfulDevices}/${res.totalDevices} terminal(s) & ${res.totalSyncedUsers} employee profiles effortlessly!`);
      } else if (res.totalDevices === 0) {
        showToast('No biometric devices registered yet. Click + Add Device to connect your terminal.');
      } else {
        showToast('Multi-device sync completed with warnings. Check device connectivity.', 'error');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Quick Socket Test
  const handleTestSocket = async (device: BiometricDevice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTestingDeviceId(device.id);
    try {
      const res = await biometricGatewayService.testDeviceConnection(device.id);
      if (res.success) {
        showToast(`✓ Socket Online: ${device.device_name} responded in ${res.latencyMs || 4}ms`);
      } else {
        showToast(`Socket test failed: ${res.message}`, 'error');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Probe error', 'error');
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Sync Users
  const handleSyncUsers = async (device: BiometricDevice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await biometricGatewayService.syncEmployeesToTerminal(device.id);
      if (res.syncedCount !== undefined) {
        showToast(`✓ ${res.message}`);
        loadData();
      } else {
        showToast(`Sync error: ${res.message}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    }
  };

  // Pairing Generator
  const handleGeneratePairing = () => {
    const res = biometricGatewayService.generatePairingKey(pairingBranch);
    setGeneratedPairingData(res);
  };

  const handleCopyScript = () => {
    if (generatedPairingData?.oneLinerScript) {
      navigator.clipboard.writeText(generatedPairingData.oneLinerScript);
      showToast('Agent one-liner pairing script copied to clipboard!');
    }
  };

  // Confirm Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      if (deleteConfirmTarget.type === 'device' && deleteConfirmTarget.id) {
        await biometricGatewayService.deleteDevice(deleteConfirmTarget.id);
        showToast(`Hardware terminal "${deleteConfirmTarget.name}" deleted successfully.`);
        if (selectedWorkspaceDevice?.id === deleteConfirmTarget.id) {
          setSelectedWorkspaceDevice(null);
        }
      } else if (deleteConfirmTarget.type === 'agent' && deleteConfirmTarget.id) {
        await biometricGatewayService.deleteAgent(deleteConfirmTarget.id);
        showToast(`LAN Gateway Agent "${deleteConfirmTarget.name}" deleted.`);
      } else if (deleteConfirmTarget.type === 'command' && deleteConfirmTarget.id) {
        biometricCommandService.deleteCommand(deleteConfirmTarget.id);
        showToast('Command record deleted.');
      } else if (deleteConfirmTarget.type === 'all_commands') {
        biometricCommandService.clearCommands();
        showToast('Command audit history cleared.');
      } else if (deleteConfirmTarget.type === 'all_logs') {
        await biometricGatewayService.clearDiagnosticLogs();
        showToast('Diagnostic & crash logs cleared.');
      }
      setDeleteConfirmTarget(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Deletion failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Stress Test Execution
  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    setStressResult(null);
    try {
      const res = await biometricGatewayService.simulateHighConcurrencyTaps(stressCount);
      setStressResult(res);
      showToast(`Stress test complete! ${res.processed} punches written in ${res.elapsedMs}ms.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Stress test failed', 'error');
    } finally {
      setIsStressTesting(false);
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const matchesSearch =
      d.device_name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      d.model.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      d.serial_number.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      d.branch.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      d.ip_address.includes(deviceSearchQuery);

    if (deviceStatusFilter === 'ONLINE') return matchesSearch && d.status === 'Online';
    if (deviceStatusFilter === 'OFFLINE') return matchesSearch && d.status !== 'Online';
    return matchesSearch;
  });

  // Calculate High-Value KPIs
  const onlineDevicesCount = devices.filter(d => d.status === 'Online').length;
  const offlineDevicesCount = devices.filter(d => d.status !== 'Online').length;
  const onlineAgentsCount = agents.filter(a => a.status === 'ONLINE').length;
  const totalPunchesToday = punches.length;
  
  // Calculate unmapped users across all devices
  let totalUnmappedUsers = 0;
  for (const d of devices) {
    const devUsers = biometricGatewayService.getDeviceUsers(d.id).users;
    totalUnmappedUsers += devUsers.filter(u => !u.is_mapped).length;
  }

  // IF A DEVICE IS OPENED, SHOW DEDICATED DEVICE WORKSPACE VIEW
  if (selectedWorkspaceDevice) {
    return (
      <BiometricDeviceWorkspace
        device={selectedWorkspaceDevice}
        onBack={() => {
          setSelectedWorkspaceDevice(null);
          loadData();
        }}
        onDeviceUpdated={() => loadData()}
      />
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* 1. FOCUSED TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Attendance & Time</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">Biometric Devices</span>
            <Badge variant="gray" size="sm" className="text-[10px] font-mono text-gray-600 ml-1">
              Tenant: {getActiveOrgId()}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Biometric Devices</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage biometric terminals, LAN gateways and real-time attendance connectivity.
          </p>
        </div>

        {/* Primary Dominant CTA + Secondary Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={handleSyncAllDevices}
            disabled={isSyncingAll}
            className="gap-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100 h-10 px-4 shadow-2xs"
          >
            <RefreshCw className={cn("w-4 h-4 text-[#07563D]", isSyncingAll && "animate-spin")} />
            {isSyncingAll ? 'Syncing All Terminals...' : 'Sync All Devices'}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => {
              handleGeneratePairing();
              setIsPairingModalOpen(true);
            }}
            className="gap-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50/80 border-gray-200 hover:bg-gray-100 h-10 px-4"
          >
            <Server className="w-4 h-4 text-gray-600" />
            Pair LAN Gateway
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddDeviceWizardOpen(true)}
            className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-11 px-5"
          >
            <Plus className="w-4 h-4" />
            + Add Device
          </Button>
        </div>
      </div>

      {/* CHANNEL SUB-NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 overflow-x-auto scrollbar-none text-xs">
        <button
          onClick={() => {
            if (onNavigateSubPath) onNavigateSubPath('biometric');
            setInfraSubTab('gateways');
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            (!currentTab || currentTab === 'biometric' || currentTab === 'biometric-devices')
              ? "bg-[#07563D] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          <Cpu className="w-4 h-4" />
          Biometric Devices ({devices.length})
        </button>

        <button
          onClick={() => {
            if (onNavigateSubPath) onNavigateSubPath('device-enrollment');
            if (devices[0]) {
              setSelectedDeviceForUsers(devices[0]);
              setIsDeviceUsersModalOpen(true);
            } else {
              showToast('Please add a device first to manage enrollments.');
            }
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            currentTab === 'device-enrollment'
              ? "bg-[#07563D] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          <Users className="w-4 h-4" />
          Device Enrollment & Users
        </button>

        <button
          onClick={() => {
            if (onNavigateSubPath) onNavigateSubPath('device-sync');
            setInfraSubTab('commands');
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            currentTab === 'device-sync'
              ? "bg-[#07563D] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Device Sync & Health
        </button>

        <button
          onClick={() => {
            if (onNavigateSubPath) onNavigateSubPath('punch-mapping');
            setIsStressTestModalOpen(true);
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            currentTab === 'punch-mapping'
              ? "bg-[#07563D] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          <Activity className="w-4 h-4" />
          Punch Mapping & Benchmark
        </button>

        <button
          onClick={() => {
            if (onNavigateSubPath) onNavigateSubPath('device-logs');
            setInfraSubTab('punches');
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            currentTab === 'device-logs'
              ? "bg-[#07563D] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          <Radio className="w-4 h-4" />
          Device Logs & Live Feed ({punches.length})
        </button>
      </div>

      {/* 2. OVERVIEW KPIS (MAX 5 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Connected Devices */}
        <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Connected Devices</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{devices.length}</p>
              <p className={cn("text-xs font-semibold mt-1 flex items-center gap-1", devices.length === 0 ? "text-gray-500" : onlineDevicesCount === devices.length ? "text-emerald-700" : "text-amber-700")}>
                {devices.length > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", onlineDevicesCount === devices.length ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />}
                {devices.length === 0 ? 'None Registered' : onlineDevicesCount === devices.length ? 'All Online' : `${onlineDevicesCount}/${devices.length} Online`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#07563D]" />
            </div>
          </div>
        </Card>

        {/* KPI 2: Punches Today */}
        <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Punches Today</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalPunchesToday}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                {totalPunchesToday === 0 ? 'Awaiting punch events' : 'Real-time telemetry'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Radio className={cn("w-5 h-5 text-blue-700", totalPunchesToday > 0 && "animate-pulse")} />
            </div>
          </div>
        </Card>

        {/* KPI 3: Devices With Issues */}
        <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Devices With Issues</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{offlineDevicesCount}</p>
              <p className={cn("text-xs font-semibold mt-1", offlineDevicesCount === 0 ? "text-emerald-700" : "text-rose-700")}>
                {devices.length === 0 ? 'No issues' : offlineDevicesCount === 0 ? 'All Healthy' : `${offlineDevicesCount} Offline`}
              </p>
            </div>
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", offlineDevicesCount === 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              <ShieldCheck className={cn("w-5 h-5", offlineDevicesCount === 0 ? "text-[#07563D]" : "text-rose-600")} />
            </div>
          </div>
        </Card>

        {/* KPI 4: Unmapped Users */}
        <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unmapped Users</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{totalUnmappedUsers}</p>
              <p className={cn("text-xs font-semibold mt-1", totalUnmappedUsers === 0 ? "text-emerald-700" : "text-amber-700")}>
                {totalUnmappedUsers === 0 ? 'All Mapped' : 'Needs attention'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
          </div>
        </Card>

        {/* KPI 5: LAN Gateways */}
        <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">LAN Gateways</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{onlineAgentsCount} / {agents.length}</p>
              <p className={cn("text-xs font-semibold mt-1", agents.length === 0 ? "text-gray-500" : "text-emerald-700")}>
                {agents.length === 0 ? 'No Gateways Active' : 'Zero-Port Forwarding'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Server className="w-5 h-5 text-purple-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. DEVICE HEALTH & ATTENTION BANNER */}
      {devices.length === 0 ? (
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">No Biometric Hardware Connected</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Register a biometric terminal or pair an on-premises LAN Gateway daemon on your office network to stream live attendance punches.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleGeneratePairing();
                setIsPairingModalOpen(true);
              }}
              className="text-xs font-bold rounded-xl border-blue-300 text-blue-900 bg-white hover:bg-blue-100"
            >
              Pair LAN Gateway
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddDeviceWizardOpen(true)}
              className="text-xs font-bold rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white"
            >
              + Add Device
            </Button>
          </div>
        </div>
      ) : offlineDevicesCount === 0 && totalUnmappedUsers === 0 ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#07563D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">✓ All biometric devices are operational</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {devices.length} terminal(s) connected • {onlineAgentsCount}/{agents.length} gateways online • {totalPunchesToday} punches received today.
              </p>
            </div>
          </div>
          <Badge variant="emerald" size="sm" className="font-mono text-[10px] hidden sm:flex">
            100% Operational
          </Badge>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">⚠ Attention Required</p>
              <p className="text-[11px] text-gray-700 mt-0.5">
                {totalUnmappedUsers > 0 && `${totalUnmappedUsers} machine user(s) need employee mapping. `}
                {offlineDevicesCount > 0 && `${offlineDevicesCount} hardware terminal is offline.`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (devices[0]) {
                setSelectedWorkspaceDevice(devices[0]);
              }
            }}
            className="text-xs font-bold rounded-xl border-amber-300 text-amber-900 bg-white hover:bg-amber-100 shrink-0"
          >
            Review Issues
          </Button>
        </div>
      )}

      {/* 4. CONNECTED DEVICES SECTION */}
      <Card className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Connected Devices</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Biometric terminals currently registered to your organization.
            </p>
          </div>

          {/* Search, Filter & Refresh Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search devices, locations, serials..."
                value={deviceSearchQuery}
                onChange={e => setDeviceSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D] w-56 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {(['ALL', 'ONLINE', 'OFFLINE'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDeviceStatusFilter(f)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                    deviceStatusFilter === f ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {f === 'ALL' ? 'All' : f === 'ONLINE' ? `Online (${onlineDevicesCount})` : `Offline (${offlineDevicesCount})`}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-1 text-xs rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Clean Device Cards / Table List */}
        <div className="space-y-3 pt-2">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl p-6">
              <Cpu className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-900">No biometric devices found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Connect your first biometric terminal to start receiving real-time attendance punches.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddDeviceWizardOpen(true)}
                  className="gap-1.5 rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Add Device
                </Button>
              </div>
            </div>
          ) : (
            filteredDevices.map(d => {
              const devUsers = biometricGatewayService.getDeviceUsers(d.id).users;
              const devPunches = punches.filter(p => p.device_id === d.id);
              const lastPunchTime = devPunches[0] ? new Date(devPunches[0].punch_time).toLocaleTimeString() : 'No punches today';
              const isTestingThis = testingDeviceId === d.id;

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedWorkspaceDevice(d)}
                  className="group p-5 rounded-2xl border border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 bg-white transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                >
                  {/* Left: Device Hierarchy */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Cpu className="w-6 h-6 text-[#07563D]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-gray-900 group-hover:text-[#07563D] transition-colors">
                          {d.device_name}
                        </h3>
                        <Badge
                          variant={d.status === 'Online' ? 'emerald' : 'rose'}
                          size="sm"
                          className="gap-1 font-mono text-[10px]"
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", d.status === 'Online' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                          {d.status === 'Online' ? '● Online (4ms)' : '● Offline'}
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-600 font-medium">
                        {d.location_description || 'Main Entrance'} • <span className="text-gray-500">{d.branch}</span>
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap pt-0.5">
                        <span className="font-semibold text-gray-700">
                          {devUsers.length} enrolled users
                        </span>
                        <span>•</span>
                        <span>Last punch: <strong className="text-gray-700">{lastPunchTime}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-gray-500">{d.ip_address}:{d.port}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Clean Action Buttons (Open + Context Dropdown) */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWorkspaceDevice(d)}
                      className="gap-1 text-xs font-bold rounded-xl border-emerald-200 text-[#07563D] bg-emerald-50/60 hover:bg-emerald-100 px-4 h-9"
                    >
                      Open Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </Button>

                    {/* Secondary Dropdown Menu */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenDropdownDeviceId(openDropdownDeviceId === d.id ? null : d.id)}
                        className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 h-9 w-9 p-0 flex items-center justify-center"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {openDropdownDeviceId === d.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 text-xs font-medium space-y-0.5">
                          <button
                            onClick={() => {
                              setOpenDropdownDeviceId(null);
                              handleTestSocket(d);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 hover:text-[#07563D] flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5", isTestingThis && "animate-spin text-[#07563D]")} />
                            Test Socket Connection
                          </button>

                          <button
                            onClick={() => {
                              setOpenDropdownDeviceId(null);
                              setSelectedDeviceForUsers(d);
                              setIsDeviceUsersModalOpen(true);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            Manage Enrolled Users
                          </button>

                          <button
                            onClick={() => {
                              setOpenDropdownDeviceId(null);
                              handleSyncUsers(d);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                            Sync Users From Device
                          </button>

                          <button
                            onClick={() => {
                              setOpenDropdownDeviceId(null);
                              setSelectedDeviceForDiagnostic(d);
                              setIsDiagnosticModalOpen(true);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Bug className="w-3.5 h-3.5 text-amber-600" />
                            View Diagnostic Telemetry
                          </button>

                          <div className="border-t border-gray-100 my-1" />

                          <button
                            onClick={() => {
                              setOpenDropdownDeviceId(null);
                              setDeleteConfirmTarget({ type: 'device', id: d.id, name: d.device_name });
                            }}
                            className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Terminal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 5. ADVANCED INFRASTRUCTURE SECTION */}
      <Card className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight">Advanced Infrastructure & Gateway Management</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tunnel daemons, high-frequency punch queues, commands bus and crash logs for IT administrators.
            </p>
          </div>

          {/* Infrastructure Sub-Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'gateways', label: `Gateways (${agents.length})`, icon: Server },
              { id: 'punches', label: `Live Punches (${punches.length})`, icon: Radio },
              { id: 'commands', label: `Commands (${commands.length})`, icon: Terminal },
              { id: 'diagnostics', label: `Diagnostics (${diagnosticLogs.length})`, icon: HardDrive },
            ].map(t => {
              const Icon = t.icon;
              const isActive = infraSubTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setInfraSubTab(t.id as any)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    isActive ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#07563D]" : "text-gray-400")} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUBTAB: GATEWAYS */}
        {infraSubTab === 'gateways' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Active On-Premises LAN Gateways ({agents.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleGeneratePairing();
                  setIsPairingModalOpen(true);
                }}
                className="text-xs font-bold gap-1 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Pair Another Gateway
              </Button>
            </div>

            {agents.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/40">
                <Server className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-gray-900">No on-premises LAN gateways paired</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 max-w-sm mx-auto">
                  Pair a local gateway daemon on your office network to stream live biometric events and manage ZKTeco / Mantra terminals.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleGeneratePairing();
                    setIsPairingModalOpen(true);
                  }}
                  className="mt-3 gap-1 text-xs font-bold text-emerald-800 bg-white border-emerald-300 hover:bg-emerald-50 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Pair Gateway
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map(ag => (
                  <div key={ag.id} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-gray-900">{ag.agent_name}</h4>
                          <p className="text-[11px] text-gray-500">{ag.branch_name}</p>
                        </div>
                      </div>
                      <Badge variant={ag.status === 'ONLINE' ? 'emerald' : 'rose'} size="sm" className="text-[10px]">
                        ● {ag.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/60">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Local Endpoint</span>
                        <span className="font-mono text-gray-800">{ag.local_ip}:11108</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Last Heartbeat</span>
                        <span className="font-mono text-gray-800">{new Date(ag.last_heartbeat).toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Connected Terminals</span>
                        <span className="font-bold text-gray-800">{devices.length} hardware units</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Daemon Driver</span>
                        <span className="font-bold text-emerald-800">node-zklib + TCP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB: LIVE PUNCHES */}
        {infraSubTab === 'punches' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Global Realtime Ingestion Stream ({punches.length} punches)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/75">
                    <TableHead className="text-xs font-bold">Punch Time</TableHead>
                    <TableHead className="text-xs font-bold">Employee</TableHead>
                    <TableHead className="text-xs font-bold">Terminal</TableHead>
                    <TableHead className="text-xs font-bold">Direction</TableHead>
                    <TableHead className="text-xs font-bold">Verification Mode</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {punches.slice(0, 15).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-gray-900 font-bold">
                        {new Date(p.punch_time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900">
                        {p.employee_name || `User PIN #${p.biometric_pin}`}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{p.device_name || 'Terminal'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.punch_direction === 'IN' ? 'emerald' : 'blue'}
                          size="sm"
                          className="text-[10px] font-bold"
                        >
                          {p.punch_direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{p.verification_mode}</TableCell>
                      <TableCell>
                        <Badge variant="emerald" size="sm" className="text-[10px]">
                          {p.processed_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* SUBTAB: REMOTE COMMANDS */}
        {infraSubTab === 'commands' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Command Bus Queue ({commands.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmTarget({ type: 'all_commands', name: 'All Commands' })}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl"
              >
                Clear History
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/75">
                    <TableHead className="text-xs font-bold">Created</TableHead>
                    <TableHead className="text-xs font-bold">Target Device</TableHead>
                    <TableHead className="text-xs font-bold">Command</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500 text-xs">
                        No commands dispatched yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    commands.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-gray-900">{c.device_name || c.device_id}</TableCell>
                        <TableCell className="font-mono font-bold text-xs text-gray-800">{c.command_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={c.status === 'SUCCESS' ? 'emerald' : c.status === 'FAILED' ? 'rose' : 'blue'}
                            size="sm"
                            className="text-[10px]"
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 font-mono text-[11px]">
                          {c.response_payload?.message || JSON.stringify(c.response_payload || {})}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* SUBTAB: DIAGNOSTICS & STRESS TESTER */}
        {infraSubTab === 'diagnostics' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Crash & Diagnostic Logs ({diagnosticLogs.length})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStressTestModalOpen(true)}
                  className="text-xs font-bold gap-1 rounded-xl border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
                >
                  <Zap className="w-3.5 h-3.5" /> Concurrency Stress Tester
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmTarget({ type: 'all_logs', name: 'All Diagnostic Logs' })}
                  className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl"
                >
                  Clear Logs
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/75">
                    <TableHead className="text-xs font-bold">Timestamp</TableHead>
                    <TableHead className="text-xs font-bold">Severity</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnosticLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500 text-xs">
                        No error logs or crashes reported. System is healthy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    diagnosticLogs.slice(0, 15).map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {new Date(l.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={l.severity === 'CRASH' || l.severity === 'ERROR' ? 'rose' : l.severity === 'WARN' ? 'amber' : 'emerald'}
                            size="sm"
                            className="text-[10px]"
                          >
                            {l.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-700">{l.category}</TableCell>
                        <TableCell className="text-xs text-gray-800 font-mono text-[11px]">{l.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Card>

      {/* MODAL: 5-STEP ADD DEVICE GUIDED WIZARD */}
      <BiometricSetupWizardModal
        isOpen={isAddDeviceWizardOpen}
        onClose={() => setIsAddDeviceWizardOpen(false)}
        onSetupCompleted={() => loadData()}
        onOpenDevice={dev => {
          setIsAddDeviceWizardOpen(false);
          setSelectedWorkspaceDevice(dev);
        }}
      />

      {/* MODAL: PAIR LAN GATEWAY */}
      <Modal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        title="Pair On-Premises LAN Gateway"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs text-gray-500">
              Run this lightweight daemon inside your office or factory network to bridge biometric terminals to WorkForceOS.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">PowerShell / Bash One-Liner Script</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyScript}
                className="gap-1.5 text-xs font-bold rounded-xl border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50"
              >
                <Copy className="w-3.5 h-3.5 text-[#07563D]" /> Copy Script
              </Button>
            </div>
            <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap">
              {generatedPairingData?.oneLinerScript || 'Generating token...'}
            </pre>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => setIsPairingModalOpen(false)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl px-6"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: STRESS TESTER */}
      <Modal
        isOpen={isStressTestModalOpen}
        onClose={() => setIsStressTestModalOpen(false)}
        title="Factory Concurrency Stress Tester"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Simulate thousands of simultaneous employee punch events hitting the edge deduplication queue.
          </p>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Simulated Punches Count</label>
            <input
              type="number"
              value={stressCount}
              onChange={e => setStressCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-mono font-bold"
            />
          </div>

          {stressResult && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-1">
              <p className="font-bold text-purple-900">Stress Test Summary:</p>
              <p className="text-purple-800">Total Generated: <strong>{stressResult.totalSent}</strong> punches</p>
              <p className="text-purple-800">Deduplicated & Filtered: <strong>{stressResult.deduplicated}</strong></p>
              <p className="text-purple-800">Ingested Time: <strong>{stressResult.elapsedMs}ms</strong></p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsStressTestModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleRunStressTest}
              disabled={isStressTesting}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isStressTesting ? 'Simulating...' : 'Run Simulation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: DEVICE USERS */}
      {selectedDeviceForUsers && (
        <DeviceUsersManagerModal
          isOpen={isDeviceUsersModalOpen}
          device={selectedDeviceForUsers}
          onClose={() => {
            setIsDeviceUsersModalOpen(false);
            setSelectedDeviceForUsers(null);
            loadData();
          }}
        />
      )}

      {/* MODAL: DIAGNOSTIC DETAILS */}
      {selectedDeviceForDiagnostic && (
        <DeviceDiagnosticDetailsModal
          isOpen={isDiagnosticModalOpen}
          device={selectedDeviceForDiagnostic}
          onClose={() => {
            setIsDiagnosticModalOpen(false);
            setSelectedDeviceForDiagnostic(null);
          }}
        />
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmTarget && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmTarget(null)}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Are you sure you want to delete <strong className="text-gray-900">{deleteConfirmTarget.name}</strong>? This action will permanently clean up database records and cache.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmTarget(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
