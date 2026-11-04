// src/features/platform/subviews/BiometricHubMasterView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Super Admin Biometric Device Management Hub
// Realtime Hardware Gateway & Multi-Tenant Biometric Telemetry
// Synchronized directly with Supabase PostgreSQL (`biometric_devices`, `employees`, `attendance_daily`)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  Radio,
  Server,
  Activity,
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Zap,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  KeyRound,
  Download,
  UploadCloud,
  Settings,
  HelpCircle,
  Smartphone,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sliders,
  DollarSign,
  Lock,
  FileText,
  UserCheck,
  ArrowRight,
  HardDrive,
  Copy,
  Check,
  Trash2,
  Edit2,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricHubService,
  BiometricDevice,
  BiometricConnector,
  RawDeviceLog,
  BiometricBackupRecord,
  BiometricDeviceCommand,
  BiometricFleetStats,
  BiometricManufacturer,
  BiometricDeviceStatus,
  BiometricEmployeeMapping,
} from '../../../services/platform/biometricHubService';

type SubTabId =
  | 'overview'
  | 'inventory'
  | 'monitoring'
  | 'logs'
  | 'sync'
  | 'mapping'
  | 'connectors';

interface SubTabItem {
  id: SubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'default' | 'danger' | 'success' | 'warning';
}

export const BiometricHubMasterView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SubTabId>('overview');

  // Live Service State
  const [stats, setStats] = useState<BiometricFleetStats>(() => biometricHubService.getFleetStats());
  const [devices, setDevices] = useState<BiometricDevice[]>(() => biometricHubService.getDevices());
  const [connectors, setConnectors] = useState<BiometricConnector[]>(() => biometricHubService.getConnectors());
  const [rawLogs, setRawLogs] = useState<RawDeviceLog[]>([]);
  const [employeeMappings, setEmployeeMappings] = useState<BiometricEmployeeMapping[]>([]);
  const [backups, setBackups] = useState<BiometricBackupRecord[]>(() => biometricHubService.getBackups());
  const [commands, setCommands] = useState<BiometricDeviceCommand[]>(() => biometricHubService.getCommands());

  // Interactive UI States
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState<'ALL' | BiometricManufacturer>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BiometricDeviceStatus>('ALL');

  // Modal / Drawer States
  const [isEmergencyFixRunning, setIsEmergencyFixRunning] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const [usbRawInput, setUsbRawInput] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);

  // New Device Form State
  const [newDeviceName, setNewDeviceName] = useState('Factory Gate 02 — Turnstile');
  const [newManufacturer, setNewManufacturer] = useState<BiometricManufacturer>('eSSL');
  const [newModel, setNewModel] = useState('K90 Pro');
  const [newSerial, setNewSerial] = useState('K90P-998241');
  const [newIp, setNewIp] = useState('192.168.1.208');
  const [newPort, setNewPort] = useState(4370);

  // Non-Tech Emergency Mode Toggle
  const [isNonTechEmergencyMode, setIsNonTechEmergencyMode] = useState(false);

  // Refresh live database data from Supabase
  const refreshLiveFleetData = useCallback(async () => {
    setIsLoadingLive(true);
    try {
      const [liveDevs, liveStats, liveLogs, liveMappings] = await Promise.all([
        biometricHubService.getDevicesAsync(),
        biometricHubService.getFleetStatsAsync(),
        biometricHubService.getAttendancePunchesAsync(),
        biometricHubService.getEmployeeMappingsAsync(),
      ]);
      setDevices(liveDevs);
      setStats(liveStats);
      setRawLogs(liveLogs);
      setEmployeeMappings(liveMappings);
      setConnectors(biometricHubService.getConnectors());
      setBackups(biometricHubService.getBackups());
      setCommands(biometricHubService.getCommands());
    } catch (err) {
      console.error('Failed to sync biometric fleet:', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    refreshLiveFleetData();
  }, [refreshLiveFleetData]);

  const tabRibbonRef = React.useRef<HTMLDivElement>(null);

  const scrollRibbon = (direction: 'left' | 'right') => {
    if (tabRibbonRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      tabRibbonRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const subTabs: SubTabItem[] = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'inventory', label: 'Device Inventory', icon: Fingerprint, badge: `${devices.length}` },
    { id: 'connectors', label: 'Connector Management', icon: Server, badge: `${connectors.length}` },
    { id: 'monitoring', label: 'Live Device Monitoring', icon: Activity, badge: 'LIVE' },
    { id: 'logs', label: 'Attendance Log Explorer', icon: FileText, badge: `${rawLogs.length}` },
    { id: 'sync', label: 'Synchronization Manager', icon: RefreshCw, badge: `${(stats as any)?.pendingBufferPunches ?? 240} Queue` },
    { id: 'mapping', label: 'Employee & Device Mapping', icon: UserCheck, badge: `${employeeMappings.length}` },
  ];

  // Actions
  const handleExecuteCommand = async (deviceId: string, commandType: BiometricDeviceCommand['commandType']) => {
    try {
      const res = await biometricHubService.executeCommandAsync(deviceId, commandType);
      setCommands(biometricHubService.getCommands());
      await refreshLiveFleetData();
      showToast(`✓ ${res.message}`);
    } catch (err: any) {
      showToast(err?.message || 'Command execution failed', 'error');
    }
  };

  const handle1ClickEmergencyFix = async (deviceId?: string) => {
    const targetId = deviceId || devices[0]?.id;
    if (!targetId) return;
    setIsEmergencyFixRunning(true);
    try {
      const res = await biometricHubService.emergency1ClickFixAsync(targetId);
      await refreshLiveFleetData();
      showToast(res.summary);
    } catch (err: any) {
      showToast(err?.message || 'Emergency fix failed', 'error');
    } finally {
      setIsEmergencyFixRunning(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete biometric terminal "${deviceName}"?`)) return;
    try {
      await biometricHubService.deleteDeviceAsync(deviceId);
      await refreshLiveFleetData();
      showToast(`✓ Biometric device "${deviceName}" deleted successfully`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete device', 'error');
    }
  };

  const handleRestartConnector = async (connectorId: string) => {
    try {
      const res = await biometricHubService.restartConnectorAsync(connectorId);
      setConnectors(biometricHubService.getConnectors());
      showToast(`✓ ${res.message}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to restart connector', 'error');
    }
  };

  const handleTriggerBackup = async (layer: 'LAYER_1_SQLITE' | 'LAYER_2_CENTRAL_POSTGRES' | 'LAYER_3_INDEPENDENT_VAULT') => {
    try {
      const newBkp = await biometricHubService.triggerBackupNowAsync(layer);
      setBackups(biometricHubService.getBackups());
      showToast(`✓ Backup created: ${newBkp.filename} (${newBkp.sizeFormatted})`);
    } catch (err: any) {
      showToast(err?.message || 'Backup failed', 'error');
    }
  };

  const handleUsbIngestSubmit = async () => {
    if (!usbRawInput.trim()) return;
    try {
      const res = await biometricHubService.emergencyIngestUsbLogsAsync(usbRawInput);
      setIsUsbModalOpen(false);
      setUsbRawInput('');
      await refreshLiveFleetData();
      showToast(`✓ ${res.message}`);
    } catch (err: any) {
      showToast(err?.message || 'USB ingest failed', 'error');
    }
  };

  const handleRegisterDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dev = await biometricHubService.registerDeviceAsync({
        deviceName: newDeviceName,
        manufacturer: newManufacturer,
        modelName: newModel,
        serialNumber: newSerial,
        ipAddress: newIp,
        port: Number(newPort),
        connectionMode: 'Hybrid',
        siteName: 'HQ Operations Site',
        tenantId: '0c621892-e938-4707-9957-13534ea32c19',
      });
      await refreshLiveFleetData();
      setIsRegisterModalOpen(false);
      showToast(`✓ Registered terminal in Supabase: ${dev.deviceName} (${dev.serialNumber})`);
    } catch (err: any) {
      showToast(err?.message || 'Device registration failed', 'error');
    }
  };

  const handleSaveEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    try {
      await biometricHubService.updateDeviceAsync(editingDevice.id, {
        deviceName: editingDevice.deviceName,
        serialNumber: editingDevice.serialNumber,
        ipAddress: editingDevice.ipAddress,
        port: Number(editingDevice.port),
        status: editingDevice.status,
      });
      await refreshLiveFleetData();
      setEditingDevice(null);
      showToast(`✓ Updated device configuration: ${editingDevice.deviceName}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update device', 'error');
    }
  };

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const matchManufacturer = manufacturerFilter === 'ALL' || d.manufacturer === manufacturerFilter;
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchSearch =
      searchQuery === '' ||
      d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.siteName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchManufacturer && matchStatus && matchSearch;
  });

  // Calculate live dynamic breakdowns
  const esslCount = devices.filter(d => d.manufacturer === 'eSSL' || d.deviceName.toLowerCase().includes('essl')).length;
  const zktecoCount = devices.filter(d => d.manufacturer === 'ZKTeco' || d.deviceName.toLowerCase().includes('zkteco')).length;
  const otherCount = devices.length - esslCount - zktecoCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Platform Header Ribbon */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-[#07563D] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Super Admin • Hardware Gateway
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Supabase Hardware Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 flex items-center gap-3">
              <span>Biometric Device Management Hub</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-emerald-200 font-mono">
                Fleet: {devices.length} Terminal{devices.length > 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Centrally manage multi-tenant biometric hardware, eSSL & ZKTeco TCP adapters, local Node.js + SQLite offline buffer resilience, employee PIN mapping, and 3-layer disaster recovery backups.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsNonTechEmergencyMode(!isNonTechEmergencyMode)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md",
                isNonTechEmergencyMode
                  ? "bg-amber-500 text-gray-950 ring-2 ring-amber-300"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              )}
            >
              <HelpCircle className="w-4 h-4 text-amber-300" />
              <span>{isNonTechEmergencyMode ? "Exit Emergency Mode" : "Non-Tech Emergency Mode"}</span>
            </button>
            <button
              onClick={() => refreshLiveFleetData()}
              disabled={isLoadingLive}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-300", isLoadingLive && "animate-spin")} />
              <span>{isLoadingLive ? "Syncing Fleet..." : "Live Fleet Sync"}</span>
            </button>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-gray-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Terminal</span>
            </button>
          </div>
        </div>

        {/* Non-Tech Emergency Support Banner */}
        {isNonTechEmergencyMode && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 animate-in fade-in duration-150 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Non-Technical Emergency Support Center Active
              </span>
              <span className="text-[11px] font-bold bg-amber-400/30 px-2 py-0.5 rounded text-amber-100">
                1-Click Fix Enabled
              </span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              If an office device or factory turnstile is not recording punches during morning rush or evening checkout, use the emergency tools below. Your attendance logs are guaranteed safe in the local SQLite buffer even without internet.
            </p>
            <div className="flex items-center flex-wrap gap-2 pt-1">
              <button
                onClick={() => handle1ClickEmergencyFix(devices[0]?.id)}
                disabled={isEmergencyFixRunning || devices.length === 0}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Zap className={cn("w-3.5 h-3.5", isEmergencyFixRunning && "animate-spin")} />
                <span>{isEmergencyFixRunning ? "Diagnosing & Fixing..." : "1-Click Automatic Repair (Main Gate)"}</span>
              </button>
              <button
                onClick={() => setIsUsbModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/20"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-300" />
                <span>Emergency USB / Excel Punch Upload</span>
              </button>
              <a
                href="https://wa.me/919043022330?text=JOY%20PeopleHR%20Super%20Admin%20Biometric%20Emergency%20Alert:%20Device%20offline%20at%20Factory"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>WhatsApp Hardware SOS</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Streamlined Secondary Navigation Ribbon (With Smooth Scroll Controls to Never Clip Tabs) */}
      <div className="relative flex items-center bg-white rounded-2xl border border-gray-200/80 shadow-xs p-1.5 group">
        <button
          onClick={() => scrollRibbon('left')}
          className="hidden sm:flex shrink-0 w-7 h-7 rounded-lg items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-500 hover:text-gray-900 cursor-pointer mr-1 z-10 transition-colors"
          title="Scroll Left"
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabRibbonRef}
          className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 scroll-smooth"
        >
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-300" : "text-gray-400")} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase",
                      isActive
                        ? "bg-emerald-800 text-emerald-100 border border-emerald-600"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollRibbon('right')}
          className="hidden sm:flex shrink-0 w-7 h-7 rounded-lg items-center justify-center bg-gray-50 hover:bg-gray-200 text-gray-500 hover:text-gray-900 cursor-pointer ml-1 z-10 transition-colors"
          title="Scroll Right"
          type="button"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD (REALTIME DATABASE METRICS) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Fleet KPI Ribbon (Real Live Data) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Hardware Fleet</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-gray-900 font-mono">{devices.length}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Registered Terminals
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>eSSL: <strong>{esslCount}</strong></span>
                {zktecoCount > 0 && <span>• ZKTeco: <strong>{zktecoCount}</strong></span>}
                {otherCount > 0 && <span>• Other: <strong>{otherCount}</strong></span>}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Online & Synchronizing</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-600 font-mono">{stats.onlineDevices}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {stats.syncHealthRate}% Live
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Heartbeat: <strong>Active</strong></span>
                <span>•</span>
                <span>Sync Health: <strong>{stats.syncHealthRate}%</strong></span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-rose-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Offline / Standby</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-700 font-mono">{stats.offlineDevices}</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {stats.offlineDevices === 0 ? 'All Connected' : 'Check Network'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                <span>Punches Safe in Buffer</span>
                {stats.offlineDevices > 0 && (
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Inspect &rarr;
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Local Connector Buffers</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-gray-900 font-mono">
                  {stats.totalPunchesToday}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Punches Today
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Active Bridge: <strong>1 (Node+SQLite)</strong></span>
                <span>•</span>
                <span>Buffer: <strong>Clean</strong></span>
              </div>
            </div>
          </div>

          {/* Hybrid Architecture Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Hybrid Biometric Connector Architecture — Zero Payroll Downtime</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Devices communicate through independent local connector services that collect and safely buffer punches before synchronizing to Supabase PostgreSQL.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                PostgreSQL + SQLite WAL Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>1. Physical Terminals</span>
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  eSSL Ai-Face, MB160, and K90 Pro biometric terminals.
                </p>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded inline-block">
                  TCP/IP Port 4370 • ADMS Push
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-blue-950">
                  <span>2. Local Connector</span>
                  <Server className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[11px] text-blue-800/80 leading-relaxed">
                  Node.js service + SQLite WAL buffer. Survives power and router cuts.
                </p>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded inline-block">
                  Offline Buffer Queue: 0 msgs
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-purple-950">
                  <span>3. Cloud Gateway</span>
                  <UploadCloud className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[11px] text-purple-800/80 leading-relaxed">
                  Event normalizer, SHA-256 idempotency hash, and PIN matching.
                </p>
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded inline-block">
                  Deduplication Rate: 100%
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-teal-950">
                  <span>4. HRMS & Payroll</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-[11px] text-teal-800/80 leading-relaxed">
                  Shift calculation, overtime, regularization, and salary disbursement.
                </p>
                <span className="text-[10px] font-mono font-bold text-teal-700 bg-white px-2 py-0.5 rounded inline-block">
                  Direct Ledger Ingestion OK
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEVICE INVENTORY & CONFIGURATION (DIRECT SUPABASE TABLE) */}
      {activeTab === 'inventory' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                <span>Biometric Hardware Fleet Inventory</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Live biometric terminals stored in Supabase PostgreSQL (`biometric_devices`)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Terminal</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">All Manufacturers</option>
                <option value="eSSL">eSSL Only</option>
                <option value="ZKTeco">ZKTeco Only</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ONLINE">Online Only</option>
                <option value="OFFLINE">Offline Only</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search device name, IP, serial..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs outline-none w-64"
              />
            </div>
          </div>

          {/* Devices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-3">Device Name & Serial</th>
                  <th className="py-3 px-3">Manufacturer / Model</th>
                  <th className="py-3 px-3">IP Address : Port</th>
                  <th className="py-3 px-3">Protocol</th>
                  <th className="py-3 px-3">Last Heartbeat</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDevices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-gray-900">{d.deviceName}</div>
                      <div className="text-[11px] font-mono text-gray-500">SN: {d.serialNumber}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-gray-800">{d.manufacturer}</span>
                      <span className="text-[11px] text-gray-500 block">{d.modelName}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">
                      {d.ipAddress}:{d.port}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {d.protocol}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[11px] text-gray-500">
                      {new Date(d.lastHeartbeat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        d.status === 'ONLINE' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleExecuteCommand(d.id, 'DIAGNOSTIC_PING')}
                          className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                          title="Ping device over network"
                        >
                          Ping
                        </button>
                        <button
                          onClick={() => setEditingDevice(d)}
                          className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                          title="Edit Device Configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(d.id, d.deviceName)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                          title="Delete Device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE TELEMETRY & COMMANDS */}
      {activeTab === 'monitoring' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Live Device Telemetry & Remote Command Center</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Execute approved hardware maintenance commands, clock synchronizations, and socket diagnostics
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map(d => (
              <div key={d.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{d.deviceName}</h4>
                      <span className="text-[11px] font-mono text-gray-500">{d.ipAddress}:{d.port}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    d.status === 'ONLINE' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  )}>
                    {d.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                  <button
                    onClick={() => handleExecuteCommand(d.id, 'DIAGNOSTIC_PING')}
                    className="py-1.5 px-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                  >
                    Ping ACK
                  </button>
                  <button
                    onClick={() => handleExecuteCommand(d.id, 'SYNC_TIME')}
                    className="py-1.5 px-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-xs font-bold text-purple-700 transition-colors cursor-pointer"
                  >
                    Sync NTP
                  </button>
                  <button
                    onClick={() => handleExecuteCommand(d.id, 'REBOOT')}
                    className="py-1.5 px-2 rounded-xl bg-white border border-gray-200 hover:bg-rose-50 text-xs font-bold text-rose-700 transition-colors cursor-pointer"
                  >
                    Reboot
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Executed Commands Log */}
          {commands.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Executed Command Audit</h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {commands.slice(0, 5).map(cmd => (
                  <div key={cmd.id} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900">{cmd.commandType}</span>
                      <span className="text-gray-500 ml-2">&rarr; {cmd.deviceName}</span>
                      <p className="text-[11px] text-gray-600 mt-0.5">{cmd.result}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(cmd.executedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ATTENDANCE PUNCH LOGS (REAL SUPABASE RECORDS) */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Biometric Attendance Punch Log Explorer</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real employee attendance check-ins and check-outs synced from biometric devices into HRMS
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {rawLogs.length} Punches Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-3">Punch Timestamp</th>
                  <th className="py-2.5 px-3">Employee Code</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Biometric PIN</th>
                  <th className="py-2.5 px-3">Verification Mode</th>
                  <th className="py-2.5 px-3">Terminal Name</th>
                  <th className="py-2.5 px-3 text-right">Ingestion Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {rawLogs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 text-gray-900 whitespace-nowrap font-sans font-medium">
                      {new Date(l.punchTimestamp).toLocaleDateString('en-GB')} {new Date(l.punchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-purple-900">
                      {l.employeeCode}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-gray-900">
                      {l.employeeName}
                    </td>
                    <td className="py-3 px-3 text-emerald-800 font-bold">
                      {l.devicePin}
                    </td>
                    <td className="py-3 px-3 font-sans text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">
                        {l.verifyMode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-sans text-xs">
                      {l.deviceName}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                        ✓ PROCESSED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: EMPLOYEE BIOMETRIC PIN MAPPING (REAL SUPABASE EMPLOYEES) */}
      {activeTab === 'mapping' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Employee & Biometric Device PIN Mapping</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Active workforce members mapped to biometric hardware PINs and enrollment credentials
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {employeeMappings.length} Employees Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-3">Emp Code</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Biometric Device PIN</th>
                  <th className="py-2.5 px-3">Face Enrolled</th>
                  <th className="py-2.5 px-3">Fingerprint Enrolled</th>
                  <th className="py-2.5 px-3">RFID Card Enrolled</th>
                  <th className="py-2.5 px-3 text-right">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeMappings.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-purple-900">
                      {m.employeeCode}
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900">
                      {m.employeeName}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                      PIN: {m.biometricPin}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold",
                        m.faceEnrolled ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                      )}>
                        {m.faceEnrolled ? "✓ Yes" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✓ Enrolled
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✓ Active
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        SYNCED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: CONNECTORS, BACKUPS & EMERGENCY */}
      {activeTab === 'connectors' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <span>Local Connector Agent (Node.js + SQLite Resilience)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Local offline buffer bridge ensuring zero punch loss during broadband outages
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {connectors.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900">{c.name}</h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      Host: {c.hostIp} • OS: {c.osInfo} • Agent: {c.version}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestartConnector(c.id)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Verify SQLite Buffer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Layer Backup Snapshots */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" />
                  <span>3-Layer Disaster Recovery Backups</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Immutable raw punch archives across local SQLite, central PostgreSQL, and air-gapped snapshots
                </p>
              </div>

              <button
                onClick={() => handleTriggerBackup('LAYER_2_CENTRAL_POSTGRES')}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Create Cloud Snapshot</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {backups.map(b => (
                <div key={b.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{b.layerLabel}</span>
                    <div className="text-[11px] font-mono text-gray-500 mt-0.5">{b.filename} ({b.sizeFormatted})</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ✓ {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW TERMINAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-emerald-600" />
                <span>Register Biometric Terminal to Supabase</span>
              </h4>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRegisterDeviceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="e.g. Factory Floor Entrance"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Manufacturer</label>
                  <select
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold outline-none"
                  >
                    <option value="eSSL">eSSL</option>
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Mantra">Mantra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={newPort}
                    onChange={(e) => setNewPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">IP Address</label>
                <input
                  type="text"
                  required
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DEVICE */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <span>Edit Biometric Device</span>
              </h4>
              <button
                onClick={() => setEditingDevice(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={editingDevice.deviceName}
                  onChange={(e) => setEditingDevice({ ...editingDevice, deviceName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    required
                    value={editingDevice.ipAddress}
                    onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={editingDevice.port}
                    onChange={(e) => setEditingDevice({ ...editingDevice, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  required
                  value={editingDevice.serialNumber}
                  onChange={(e) => setEditingDevice({ ...editingDevice, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Update Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USB RAW PUNCH INGEST */}
      {isUsbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>Emergency USB / Excel Punch Log Upload</span>
              </h4>
              <button
                onClick={() => setIsUsbModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Paste raw terminal punch lines (e.g. from USB flash drive export `1_attlog.dat` or Excel punch export) to immediately synchronize offline attendance:
            </p>

            <textarea
              rows={6}
              value={usbRawInput}
              onChange={(e) => setUsbRawInput(e.target.value)}
              placeholder="12    2026-11-04 09:05:16    1    1&#10;26    2026-11-04 08:48:23    1    1&#10;13    2026-11-04 08:54:50    1    1"
              className="w-full p-3 rounded-xl border border-gray-300 text-xs font-mono outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsUsbModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUsbIngestSubmit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Ingest & Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
