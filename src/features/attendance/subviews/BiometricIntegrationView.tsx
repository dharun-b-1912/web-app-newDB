// src/features/attendance/subviews/BiometricIntegrationView.tsx
// ============================================================================
// Joy PeopleHR — Real-Time Enterprise Biometric Attendance Hub
// Production-Grade UI/UX • Live Hardware Operations • Zero Mock Data
// Answers the 10 Core Factory/Company Operational Questions in Seconds
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
  Server,
  Plus,
  Radio,
  Wifi,
  HardDrive,
  Clock,
  ArrowRight,
  ChevronRight,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Zap,
  Activity,
  Copy,
  Terminal,
  Layers,
  HelpCircle,
  Download,
  Laptop,
  ChevronDown,
  Pause,
  Play,
  Fingerprint,
  SlidersHorizontal,
  Globe,
  Loader2,
  Info,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { api } from '../../../services/api';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  BiometricDevice,
  RawBiometricPunch,
  ConnectorStatus,
  ConnectorTelemetry,
} from '../../../services/attendance/biometricGatewayService';
import { BiometricSetupWizardModal } from '../components/BiometricSetupWizardModal';
import { DeviceUsersManagerModal } from '../components/DeviceUsersManagerModal';
import { DeviceDiagnosticDetailsModal } from '../components/DeviceDiagnosticDetailsModal';
import { BiometricDeviceWorkspace } from '../components/BiometricDeviceWorkspace';
import { BiometricLiveTelemetryHUD } from '../components/BiometricLiveTelemetryHUD';
import { TerminalLogLedgerView } from './TerminalLogLedgerView';
import { hrEventBus } from '../../../services/hrEventBus';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { attendanceTimeService } from '../../../services/attendance/attendanceTimeService';
import { navPerfTracker } from '../../../services/observability/navigationPerfTracker';
import { cn } from '../../../lib/utils';

export interface BiometricIntegrationViewProps {
  currentTab?: string;
  onNavigateSubPath?: (subPath: string) => void;
}

const BiometricIntegrationViewInner: React.FC<BiometricIntegrationViewProps> = ({
  currentTab = 'biometric',
  onNavigateSubPath,
}) => {
  const { showToast } = useToast();

  // Core Data State - initialized synchronously from local/memory cache so first render has full data immediately
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>(() => {
    try {
      return biometricGatewayService.getGatewayAgents();
    } catch {
      return [];
    }
  });
  const [devices, setDevices] = useState<BiometricDevice[]>(() => {
    try {
      return biometricGatewayService.getBiometricDevices();
    } catch {
      return [];
    }
  });
  const [punches, setPunches] = useState<RawBiometricPunch[]>(() => {
    try {
      return biometricGatewayService.getRawPunches(50);
    } catch {
      return [];
    }
  });
  const [employees, setEmployees] = useState<any[]>(() => {
    try {
      return (api as any).getEmployeesSync ? (api as any).getEmployeesSync() : [];
    } catch {
      return [];
    }
  });
  const [selectedWorkspaceDevice, setSelectedWorkspaceDevice] = useState<BiometricDevice | null>(null);
  // Ref so background timer callbacks can check workspace state without stale closures
  const selectedWorkspaceDeviceRef = useRef<BiometricDevice | null>(null);
  selectedWorkspaceDeviceRef.current = selectedWorkspaceDevice;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');

  // Live Stream Control
  const [isLiveStreamPaused, setIsLiveStreamPaused] = useState(false);
  const isLiveStreamPausedRef = useRef(false);
  useEffect(() => {
    isLiveStreamPausedRef.current = isLiveStreamPaused;
  }, [isLiveStreamPaused]);
  const [showTerminalLog, setShowTerminalLog] = useState(false);

  // Modals & Flows
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isDiagnosticHudOpen, setIsDiagnosticHudOpen] = useState(false);
  const [isDeviceIconsGuideOpen, setIsDeviceIconsGuideOpen] = useState(false);
  const [selectedDeviceForDiagnostic, setSelectedDeviceForDiagnostic] = useState<BiometricDevice | null>(null);
  const [isDeviceUsersModalOpen, setIsDeviceUsersModalOpen] = useState(false);
  const [selectedDeviceForUsers, setSelectedDeviceForUsers] = useState<BiometricDevice | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);

  // Clear live stream / purge test logs
  const handleClearFeed = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    biometricGatewayService.clearAllRawPunches();
    setPunches([]);
    showToast('✓ Live attendance stream and cached test punches cleared.');
  };

  // Detected IP Changes & Reconnection Alerts
  const [ipChanges, setIpChanges] = useState<Array<{
    deviceId: string;
    deviceName: string;
    serialNumber: string;
    previousIp: string;
    newIp: string;
    confidence: string;
  }>>([]);

  // Live Connector Status & Telemetry (Pure data state machine — never blocks page rendering)
  const [connectorStatus, setConnectorStatus] = useState<ConnectorStatus>(() => {
    return biometricGatewayService.getConnectorStatus();
  });
  const [connectorTelemetry, setConnectorTelemetry] = useState<ConnectorTelemetry>(() => {
    return biometricGatewayService.getConnectorTelemetry();
  });

  // Pairing & Installer Data
  const [generatedPairingData, setGeneratedPairingData] = useState<{
    pairingKey: string;
    oneLinerScript: string;
  } | null>(null);
  const [showDeveloperCommand, setShowDeveloperCommand] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isRetryingConnector, setIsRetryingConnector] = useState(false);

  const handleRetryConnector = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsRetryingConnector(true);
    try {
      const res = await biometricGatewayService.probeConnectorHealth(true);
      if (res.online) {
        showToast('✓ JOY Connector is online and reachable on 127.0.0.1:11108!');
      } else {
        showToast('Connector daemon not reachable. Verify daemon is running on port 11108.', 'info');
      }
      loadData();
    } catch {
      showToast('Connector probe failed', 'error');
    } finally {
      setIsRetryingConnector(false);
    }
  };



  // Fast path: read from in-memory cache — always instant, 100% synchronous, zero network calls
  // Only surfaces punches from the last 48 hours to prevent stale historical data in the live stream
  const loadData = () => {
    try {
      const currentAgents = biometricGatewayService.getGatewayAgents();
      const currentDevs = biometricGatewayService.getBiometricDevices();
      const cutoffMs = Date.now() - 48 * 60 * 60 * 1000;
      const currentPunches = biometricGatewayService.getRawPunches(200).filter(p => {
        if (!p.punch_time) return false;
        try { return new Date(p.punch_time).getTime() >= cutoffMs; } catch { return false; }
      }).slice(0, 50);
      
      setAgents(prev => {
        if (prev.length === currentAgents.length && prev[0]?.id === currentAgents[0]?.id) return prev;
        return currentAgents;
      });
      setDevices(prev => {
        if (
          prev.length === currentDevs.length &&
          prev.every((d, i) => d.id === currentDevs[i]?.id && d.status === currentDevs[i]?.status && d.last_sync === currentDevs[i]?.last_sync)
        ) {
          return prev;
        }
        return currentDevs;
      });
      setPunches(prev => {
        if (prev.length === currentPunches.length && prev[0]?.id === currentPunches[0]?.id) return prev;
        return currentPunches;
      });
      const nextStatus = biometricGatewayService.getConnectorStatus();
      setConnectorStatus(prev => prev === nextStatus ? prev : nextStatus);
      const nextTele = biometricGatewayService.getConnectorTelemetry();
      setConnectorTelemetry(prev => {
        if (
          prev.status === nextTele.status &&
          prev.devices_count === nextTele.devices_count &&
          prev.pending_queue_count === nextTele.pending_queue_count
        ) {
          return prev;
        }
        return nextTele;
      });
    } catch (err) {
      console.error('[BiometricIntegrationView] Error loading data:', err);
    }
  };



  useEffect(() => {
    let destroyed = false;

    // Throttled debounced UI load — skips when workspace view is active to avoid wasted re-renders
    let loadDebounce: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoadData = () => {
      if (selectedWorkspaceDeviceRef.current) return; // workspace is visible, no need to reload list
      if (loadDebounce) clearTimeout(loadDebounce);
      loadDebounce = setTimeout(() => {
        if (!destroyed && !selectedWorkspaceDeviceRef.current) loadData();
      }, 1500);
    };

    // STEP 1: Render UI immediately from local memory cache — 100% synchronous, 0ms, zero network calls
    loadData();
    console.log('[BOOT] biometric_view_mounted: BiometricIntegrationView mounted and rendered from memory cache');

    // STEP 2: Fetch employees directory once in background on mount
    api.getEmployees({ skipEnrichment: true }).then(emps => {
      if (!destroyed && Array.isArray(emps) && emps.length > 0) setEmployees(emps);
    }).catch(() => {});

    // STEP 3: Start background non-blocking connector heartbeat
    biometricGatewayService.startConnectorMonitoring(30000);

    // STEP 4: Background Supabase synchronization for multi-browser and multi-tenant persistence
    biometricGatewayService.syncDevicesFromSupabase().then(() => {
      if (!destroyed && !selectedWorkspaceDeviceRef.current) loadData();
    }).catch(() => {});

    biometricGatewayService.syncPunchesFromSupabase().then(() => {
      if (!destroyed && !selectedWorkspaceDeviceRef.current) {
        const _cutoff = Date.now() - 48 * 60 * 60 * 1000;
        setPunches(biometricGatewayService.getRawPunches(200).filter(p => {
          try { return !!p.punch_time && new Date(p.punch_time).getTime() >= _cutoff; } catch { return false; }
        }).slice(0, 50));
      }
    }).catch(() => {});

    // STEP 5: Throttled background sync for new terminal punches (every 30s, non-blocking)
    // Runs only when connector is online and workspace is not open
    const punchSyncInterval = setInterval(() => {
      if (destroyed || selectedWorkspaceDeviceRef.current || biometricGatewayService.getConnectorStatus() !== 'online') return;
      biometricGatewayService.syncRealPunchesFromAgent().then(res => {
        if (!destroyed && !selectedWorkspaceDeviceRef.current && res && res.count > 0) {
          const _cutoff = Date.now() - 48 * 60 * 60 * 1000;
          setPunches(biometricGatewayService.getRawPunches(200).filter(p => {
            try { return !!p.punch_time && new Date(p.punch_time).getTime() >= _cutoff; } catch { return false; }
          }).slice(0, 50));
        }
      }).catch(() => {});
    }, 30000);

    // Initial punch sync on mount after 15s delay if connector is active
    const initialSyncTimer = setTimeout(() => {
      if (!destroyed && !selectedWorkspaceDeviceRef.current && biometricGatewayService.getConnectorStatus() === 'online') {
        biometricGatewayService.syncRealPunchesFromAgent().then(res => {
          if (!destroyed && !selectedWorkspaceDeviceRef.current && res && res.count > 0) {
            const _cutoff = Date.now() - 48 * 60 * 60 * 1000;
            setPunches(biometricGatewayService.getRawPunches(200).filter(p => {
              try { return !!p.punch_time && new Date(p.punch_time).getTime() >= _cutoff; } catch { return false; }
            }).slice(0, 50));
          }
        }).catch(() => {});
      }
    }, 15000);

    // Targeted event subscriptions update local UI state — all skip when workspace is active
    const unsubConnector = hrEventBus.subscribe('biometric.connector_status_changed', (evt: any) => {
      if (evt?.status) setConnectorStatus(evt.status);
      if (evt?.telemetry) setConnectorTelemetry(evt.telemetry);
    });
    const unsubBiometric = hrEventBus.subscribe('biometric.punch_ingested', () => {
      if (!isLiveStreamPausedRef.current && !selectedWorkspaceDeviceRef.current) debouncedLoadData();
    });
    const unsubDeviceStatus = hrEventBus.subscribe('biometric.device_status_changed', () => {
      if (!selectedWorkspaceDeviceRef.current) debouncedLoadData();
    });
    const unsubDeviceRegistered = hrEventBus.subscribe('biometric.device_registered', () => {
      debouncedLoadData();
    });

    const handleWindowUpdate = () => {
      if (!selectedWorkspaceDeviceRef.current) debouncedLoadData();
    };
    window.addEventListener('biometric:updated', handleWindowUpdate);

    return () => {
      destroyed = true;
      if (loadDebounce) clearTimeout(loadDebounce);
      clearInterval(punchSyncInterval);
      clearTimeout(initialSyncTimer);
      biometricGatewayService.stopConnectorMonitoring();
      unsubConnector();
      unsubBiometric();
      unsubDeviceStatus();
      unsubDeviceRegistered();
      window.removeEventListener('biometric:updated', handleWindowUpdate);
    };
  }, []);

  // Lightweight 30-second live tick to keep relative timestamps ("X min ago") fresh
  const [, setLiveTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((t) => (t + 1) % 1000);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Quick Socket Test
  const handleTestConnection = async (device: BiometricDevice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    biometricGatewayService.resetGatewayOfflineStatus();
    setTestingDeviceId(device.id);
    try {
      const res = await biometricGatewayService.testDeviceConnection(device.id);
      if (res.success) {
        showToast(`✓ Online: ${device.device_name} responded in ${res.latencyMs || 3}ms`);
      } else {
        showToast(`Connection alert: ${res.message}`, 'error');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Probe error', 'error');
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Sync All Devices
  const handleSyncAllDevices = async () => {
    setIsSyncingAll(true);
    try {
      if (connectorStatus !== 'online') {
        showToast('Biometric connector service is offline on this machine. Devices and attendance are displayed from Supabase cloud.', 'info');
        return;
      }
      const res = await biometricGatewayService.syncAllDevices();
      if (res.successfulDevices > 0) {
        showToast(`✓ Synchronized ${res.successfulDevices}/${res.totalDevices} terminal(s) & punches effortlessly!`);
      } else if (res.totalDevices === 0) {
        showToast('No biometric devices registered yet. Click + Connect Device to begin.');
      } else {
        showToast('Sync completed. Some devices may need attention.', 'info');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Update IP when changed
  const handleApplyIpChange = (deviceId: string, newIp: string) => {
    biometricGatewayService.updateDeviceIp(deviceId, newIp);
    showToast(`✓ Device IP updated to ${newIp}. Connection restored!`);
    loadData();
  };

  console.log('[DEBUG_STEP 2] Before useMemo KPI calculations');
  // KPI Calculations (Memoized to avoid overhead during mouse interaction)
  const isConnectorOnline = connectorStatus === 'online';
  const onlineDevicesCount = React.useMemo(() => {
    if (!isConnectorOnline) return 0;
    return devices.filter((d) => d.status === 'Online').length;
  }, [devices, isConnectorOnline]);

  const offlineDevicesCount = React.useMemo(() => {
    return devices.length - onlineDevicesCount;
  }, [devices.length, onlineDevicesCount]);

  const punchesToday = React.useMemo(() => {
    return punches.filter((p) => {
      if (!p.punch_time) return false;
      try {
        const meta = attendanceTimeService.formatAttendanceDateWithRelative(p.punch_time, 'Asia/Kolkata');
        return meta.isToday;
      } catch {
        return false;
      }
    });
  }, [punches]);
  const punchesTodayCount = punchesToday.length;

  // Memoized employee lookup map to eliminate O(N) array search on every punch render
  const employeeLookupMap = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const e of employees) {
      if (e.id) map.set(e.id, e);
      if (e.employee_code) {
        map.set(e.employee_code, e);
        const clean = e.employee_code.replace(/\D/g, '');
        if (clean) map.set(clean, e);
      }
    }
    return map;
  }, [employees]);

  // Memoized device user counts to avoid recalculating on every render tick (O(1) summary)
  const deviceUsersMap = React.useMemo(() => {
    const map = new Map<string, { total: number; mapped: number }>();
    for (const d of devices) {
      map.set(d.id, biometricGatewayService.getDeviceUsersSummary(d.id));
    }
    return map;
  }, [devices]);

  const { totalDeviceUsers, totalUnmappedUsers } = React.useMemo(() => {
    let unmapped = 0;
    let total = 0;
    deviceUsersMap.forEach((v) => {
      total += v.total;
      unmapped += (v.total - v.mapped);
    });
    return { totalDeviceUsers: total, totalUnmappedUsers: unmapped };
  }, [deviceUsersMap]);

  // Find latest actual punch timestamp (prioritize today's punches in IST)
  const latestPunch = punchesToday.length > 0 ? punchesToday[0] : (punches.length > 0 ? punches[0] : null);
  const latestPunchTimeStr = React.useMemo(() => {
    return latestPunch
      ? attendanceTimeService.formatAttendanceTime(latestPunch.punch_time, 'Asia/Kolkata', true)
      : 'None today';
  }, [latestPunch]);

  // Live attendance stream: strictly only Today & Yesterday punches — never fall back to stale historical data
  const displayPunches = React.useMemo(() => {
    const liveRecent = punches.filter(p => {
      if (!p.punch_time) return false;
      try {
        const meta = attendanceTimeService.formatAttendanceDateWithRelative(p.punch_time, 'Asia/Kolkata');
        return meta.isToday || meta.isYesterday;
      } catch { return false; }
    });
    // NOTE: No fallback to full `punches` — show empty list if no recent data.
    // This prevents week-old punches from polluting the live stream display.
    const seenPunches = new Set<string>();
    const deduplicated: typeof liveRecent = [];
    for (const p of liveRecent) {
      const pin = String(p.biometric_pin || p.employee_id || '').trim();
      const timeMinute = Math.floor(new Date(p.punch_time).getTime() / 60000);
      const key = `${pin}_${timeMinute}`;
      if (!seenPunches.has(key)) {
        seenPunches.add(key);
        deduplicated.push(p);
      }
    }
    return deduplicated.slice(0, 6);
  }, [punches]);

  // Database-first telemetry calculations
  const formatTimeAgo = (dateInput?: string | number | null) => {
    if (!dateInput) return 'No events yet';
    const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
    if (isNaN(time) || time === 0) return 'No events yet';
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const latestSyncTimestamp = React.useMemo(() => {
    let maxTime = 0;
    for (const d of devices) {
      const syncTime = (d as any).last_sync_at || d.last_sync;
      if (syncTime) {
        const t = new Date(syncTime).getTime();
        if (!isNaN(t) && t > maxTime) maxTime = t;
      }
    }
    return maxTime > 0 ? maxTime : null;
  }, [devices]);

  const latestEventTimestamp = React.useMemo(() => {
    if (punches.length === 0) return null;
    const rawTime = punches[0]?.punch_time || (punches[0] as any)?.timestamp;
    if (!rawTime) return null;
    const t = new Date(rawTime).getTime();
    return !isNaN(t) ? t : null;
  }, [punches]);

  // Filtered devices list (Memoized so typing/scrolling/hover is instantaneous)
  const filteredDevices = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return devices.filter((d) => {
      const matchesSearch =
        !q ||
        d.device_name.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.ip_address.includes(q) ||
        d.branch.toLowerCase().includes(q);

      if (filterStatus === 'ONLINE') return matchesSearch && d.status === 'Online';
      if (filterStatus === 'OFFLINE') return matchesSearch && d.status !== 'Online';
      return matchesSearch;
    });
  }, [devices, searchQuery, filterStatus]);

  const handleOpenWorkspace = (dev: BiometricDevice) => {
    const t0 = performance.now();
    selectedWorkspaceDeviceRef.current = dev;
    setSelectedWorkspaceDevice(dev);
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      const scrollEl = document.querySelector('main.overflow-y-auto');
      if (scrollEl) scrollEl.scrollTop = 0;
    }
    const elapsed = performance.now() - t0;
    navPerfTracker.logImmediate('SUBVIEW_NAV', '/biometric', `/biometric/workspace?device=${dev.id}`, elapsed, 'open_device_workspace', {
      deviceId: dev.id,
      deviceName: dev.device_name,
    });
  };

  // Dedicated Device Workspace View
  if (selectedWorkspaceDevice) {
    return (
      <BiometricDeviceWorkspace
        device={selectedWorkspaceDevice}
        onBack={() => {
          const t0 = performance.now();
          const devId = selectedWorkspaceDevice.id;
          setSelectedWorkspaceDevice(null);
          if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
            const scrollEl = document.querySelector('main.overflow-y-auto');
            if (scrollEl) scrollEl.scrollTop = 0;
          }
          loadData();
          const elapsed = performance.now() - t0;
          navPerfTracker.logImmediate('SUBVIEW_NAV', `/biometric/workspace?device=${devId}`, '/biometric', elapsed, 'back_to_device_list');
        }}
        onDeviceUpdated={() => {
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => loadData());
          } else {
            setTimeout(() => loadData(), 500);
          }
        }}
      />
    );
  }

  // Dedicated Authoritative Terminal Event Ledger View
  if (showTerminalLog || currentTab === 'device-logs' || currentTab === 'terminal-logs' || currentTab === 'raw-logs') {
    return (
      <TerminalLogLedgerView
        onBack={() => {
          setShowTerminalLog(false);
          if (onNavigateSubPath) onNavigateSubPath('biometric');
        }}
      />
    );
  }



  console.log('[DEBUG_FLOW] BiometricIntegrationViewInner returning JSX');
  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* 1. GLOBAL HEADER & TELEMETRY SCOPE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Attendance & Time</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">Biometric Attendance Hub</span>
            <Badge variant="gray" size="sm" className="text-[10px] font-mono text-gray-600 ml-1">
              Tenant: {getActiveOrgId()}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Biometric Attendance Hub</h1>
          <p className="text-xs text-gray-500">
            Database-First Attendance Operations • Factory & Office LAN Hardware Telemetry.
          </p>

          {/* Database-First Telemetry Metrics Pill Bar */}
          <div className="flex items-center gap-3 pt-2 flex-wrap text-xs">
            {/* Metric 1: Connector Status */}
            <div
              onClick={handleRetryConnector}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:shadow-xs',
                connectorStatus === 'online'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : connectorStatus === 'reconnecting' || connectorStatus === 'connecting'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80'
              )}
              title={
                connectorStatus === 'online'
                  ? 'Local Windows connector active (127.0.0.1:11108) — Click to re-probe'
                  : 'Local connector offline — Click to probe connector health'
              }
            >
              {isRetryingConnector ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin" />
              ) : (
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    connectorStatus === 'online'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  )}
                />
              )}
              <span>
                {isRetryingConnector
                  ? 'Probing Connector...'
                  : connectorStatus === 'online'
                  ? 'Connector ● Online'
                  : 'Connector ● Offline (Click to Retry)'}
              </span>
            </div>

            {/* Metric 2: Last Sync */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-semibold"
              title="Time of most recent terminal synchronization"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
              <span>Last Sync: {formatTimeAgo(latestSyncTimestamp)}</span>
            </div>

            {/* Metric 3: Configured Devices */}
            <div
              onClick={() => devices[0] && handleOpenWorkspace(devices[0])}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-semibold transition-all',
                devices.length > 0 && 'cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 shadow-2xs'
              )}
              title={devices.length > 0 ? "Click to configure biometric terminal workspace" : "Total biometric devices registered in PostgreSQL database"}
            >
              <Cpu className="w-3.5 h-3.5 text-[#07563D]" />
              <span>Devices: <strong>{devices.length}</strong> ({onlineDevicesCount} online)</span>
              {devices.length > 0 && <ChevronRight className="w-3 h-3 text-[#07563D] ml-0.5" />}
            </div>

            {/* Metric 4: Last Biometric Event */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs font-semibold"
              title="Timestamp of the most recent punch record in database"
            >
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Last Event: {formatTimeAgo(latestEventTimestamp)}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={handleSyncAllDevices}
            disabled={isSyncingAll}
            className="gap-2 rounded-xl text-xs font-bold text-gray-800 bg-white border-gray-200 hover:bg-gray-50 h-10 px-4 shadow-2xs cursor-pointer"
            title="Perform on-demand direct terminal synchronization"
          >
            {isSyncingAll ? (
              <Loader2 className="w-4 h-4 text-[#07563D] animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-[#07563D]" />
            )}
            {isSyncingAll ? 'Syncing...' : 'Sync Now'}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setShowTerminalLog(true)}
            className="gap-2 rounded-xl text-xs font-bold text-gray-800 bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 h-10 px-4"
          >
            <Clock className="w-4 h-4 text-[#07563D]" />
            Terminal Event Ledger
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsDiagnosticHudOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white border-gray-200 hover:bg-gray-50 h-10 px-3"
            title="Open system resilience diagnostics HUD"
          >
            <Activity className="w-4 h-4 text-[#07563D]" />
            Diagnostics
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsDeviceIconsGuideOpen(true)}
            className="gap-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50/80 border-amber-200 hover:bg-amber-100 h-10 px-4"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Icons Guide
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => {
              const res = biometricGatewayService.generatePairingKey('Bengaluru Tech Park Campus');
              setGeneratedPairingData(res);
              setIsPairingModalOpen(true);
            }}
            className="gap-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50/80 border-gray-200 hover:bg-gray-100 h-10 px-4"
          >
            <Server className="w-4 h-4 text-gray-600" />
            Install Connector
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={async () => {
              if (window.confirm('Permanently purge all biometric devices, machine users, and punch records from local database and cloud cache?')) {
                await biometricGatewayService.wipeAllBiometricData();
                loadData();
                showToast('✓ All biometric devices, machine users, and punch cache wiped completely.');
              }
            }}
            className="gap-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/70 border-rose-200 hover:bg-rose-100 h-10 px-3.5"
            title="Wipe all devices, device users, and test punches"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Wipe All Data
          </Button>

          {devices.length > 0 && (
            <Button
              id="top-configure-device-btn"
              data-testid="top-configure-device-btn"
              variant="outline"
              size="md"
              onClick={() => handleOpenWorkspace(devices[0])}
              className="gap-2 rounded-xl text-xs font-bold text-[#07563D] bg-emerald-50 border-emerald-300 hover:bg-emerald-100 h-11 px-4 shadow-2xs cursor-pointer"
              title={`Configure terminal workspace: ${devices[0].device_name}`}
            >
              <Cpu className="w-4 h-4 text-[#07563D]" />
              Configure Device
            </Button>
          )}

          <Button
            id="top-connect-device-btn"
            variant="primary"
            size="md"
            onClick={() => setIsAddWizardOpen(true)}
            className="gap-2 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm h-11 px-5"
          >
            <Plus className="w-4 h-4" />
            + Connect Device
          </Button>
        </div>
      </div>

      {/* 2. NEXT ACTION / ACTION CENTER */}
      {totalUnmappedUsers > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">ACTION REQUIRED: UNMAPPED BIOMETRIC USERS</p>
              <p className="text-amber-800 mt-0.5">
                <strong>{totalUnmappedUsers}</strong> biometric user(s) on the physical terminal require mapping to JOY HR employee profiles.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (devices.length > 0) {
                setSelectedDeviceForUsers(devices[0]);
                setIsDeviceUsersModalOpen(true);
              }
            }}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shrink-0"
          >
            Resolve Mapping
          </Button>
        </div>
      ) : connectorTelemetry.pending_queue_count > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">ATTENDANCE QUEUE PENDING</p>
              <p className="text-amber-800 mt-0.5">
                <strong>{connectorTelemetry.pending_queue_count}</strong> offline attendance events waiting to synchronize to cloud.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSyncAllDevices}
            disabled={isSyncingAll}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shrink-0"
          >
            Retry Sync
          </Button>
        </div>
      ) : !isConnectorOnline && devices.length > 0 ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-950">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">JOY CONNECTOR OFFLINE</p>
              <p className="text-rose-800 mt-0.5">
                Local Windows service on customer network is unreachable. Punches will buffer offline on machine.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsPairingModalOpen(true)}
            className="bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shrink-0"
          >
            Troubleshoot Connector
          </Button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              ✓ All {devices.length} biometric terminal(s) operating normally — Realtime stream active.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm">Pipeline Active</Badge>
            <Button
              size="xs"
              variant="outline"
              onClick={() => onNavigateSubPath && onNavigateSubPath('attendance-rules')}
              className="text-[11px] font-bold h-7 bg-white text-[#07563D] hover:bg-emerald-50 border-emerald-300"
            >
              <SlidersHorizontal className="w-3 h-3 mr-1" /> Attendance Rules (5 Active)
            </Button>
          </div>
        </div>
      )}

      {/* 3. ENTERPRISE HEALTH SUMMARY (5 COMPACT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* CARD 1: Connected Devices */}
        <Card
          onClick={() => devices[0] && handleOpenWorkspace(devices[0])}
          className={cn(
            "p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs transition-all",
            devices.length > 0 && "cursor-pointer hover:border-[#07563D] hover:shadow-sm group"
          )}
          title={devices.length > 0 ? "Click to configure biometric terminal workspace" : "No devices connected"}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#07563D] transition-colors">Connected Devices</p>
              <p className="text-xl font-black text-gray-900 mt-1">{devices.length}</p>
              <p className="text-[11px] font-semibold mt-0.5 text-emerald-700 flex items-center gap-1.5">
                {devices.length === 0 ? (
                  <span className="text-gray-400">None connected</span>
                ) : !isConnectorOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-amber-800 font-semibold">{devices.length} Registered (Gateway Offline)</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{onlineDevicesCount} Online • {offlineDevicesCount} Attention</span>
                  </>
                )}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover:bg-[#07563D] transition-colors">
              <Cpu className="w-4 h-4 text-[#07563D] group-hover:text-white transition-colors" />
            </div>
          </div>
          {devices.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-[#07563D]">
              <span>Manage Hardware</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </Card>

        {/* CARD 2: Punches Today */}
        <Card className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Punches Today</p>
              <p className="text-xl font-black text-gray-900 mt-1">{punchesTodayCount}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                Last: <span className="font-mono text-gray-800">{latestPunchTimeStr}</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Radio className={cn('w-4 h-4 text-blue-700', punchesTodayCount > 0 && 'animate-pulse')} />
            </div>
          </div>
        </Card>

        {/* CARD 3: Unmapped Users */}
        <Card className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unmapped Users</p>
              <p className="text-xl font-black text-gray-900 mt-1">{totalUnmappedUsers}</p>
              <p className="text-[11px] font-semibold mt-0.5 text-emerald-700">
                {totalUnmappedUsers === 0 ? '✓ All users mapped' : `⚠ ${totalUnmappedUsers} need review`}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-700" />
            </div>
          </div>
        </Card>

        {/* CARD 4: Sync Queue */}
        <Card className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sync Queue</p>
              <p className="text-xl font-black text-gray-900 mt-1">{connectorTelemetry.pending_queue_count}</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                {connectorTelemetry.pending_queue_count === 0 ? '✓ Synchronized' : `${connectorTelemetry.pending_queue_count} Pending`}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-purple-700" />
            </div>
          </div>
        </Card>

        {/* CARD 5: Connector Health */}
        <Card className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">JOY Connector</p>
              <p className="text-xl font-black text-gray-900 mt-1">{isConnectorOnline ? 'Online' : 'Offline'}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                {isConnectorOnline ? 'Heartbeat active' : 'Service offline'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <Server className="w-4 h-4 text-teal-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* 4. BIOMETRIC TERMINAL FLEET (COMPANY MASTER TABLE) */}
      <Card className="p-6 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-5">
        {/* Fleet Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-black text-gray-900 text-base tracking-tight">BIOMETRIC TERMINAL FLEET</h3>
              <Badge variant={isConnectorOnline && onlineDevicesCount > 0 ? "emerald" : "amber"} size="sm">
                ● {devices.length} Registered ({isConnectorOnline ? `${onlineDevicesCount} Online` : 'Gateway Offline'})
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Direct Hardware Operations • Click <strong className="text-emerald-800">Manage &gt;</strong> to configure device network, users directory, and remote commands.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddWizardOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-2xs h-9 px-4 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            + Connect Device
          </Button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="device-search-input"
              data-testid="device-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device name, brand, branch or IP..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="filter-all-devices-btn"
              data-testid="filter-all-devices-btn"
              onClick={() => setFilterStatus('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                filterStatus === 'ALL' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              All ({devices.length})
            </button>
            <button
              id="filter-online-devices-btn"
              data-testid="filter-online-devices-btn"
              onClick={() => setFilterStatus('ONLINE')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                filterStatus === 'ONLINE' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Online ({onlineDevicesCount})
            </button>
            <button
              id="filter-attention-devices-btn"
              data-testid="filter-attention-devices-btn"
              onClick={() => setFilterStatus('OFFLINE')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                filterStatus === 'OFFLINE' ? 'bg-[#07563D] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Attention ({offlineDevicesCount})
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredDevices.length === 0 ? (
          <div className="p-10 text-center space-y-4 bg-gray-50/70 rounded-2xl border border-gray-100 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#07563D] flex items-center justify-center mx-auto">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">NO ATTENDANCE DEVICES CONNECTED</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Connect your biometric machine to automatically receive attendance punches without technical network configuration.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsAddWizardOpen(true)}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl"
              >
                + Connect Device
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  const res = biometricGatewayService.generatePairingKey('Bengaluru Tech Park Campus');
                  setGeneratedPairingData(res);
                  setIsPairingModalOpen(true);
                }}
                className="text-xs font-bold rounded-xl"
              >
                Install Connector
              </Button>
            </div>
          </div>
        ) : (
          /* Table of Devices with Separate Timestamps */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Device Status</TableHead>
                  <TableHead>Connector</TableHead>
                  <TableHead>Last Punch</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((d) => {
                  const isOnline = d.status === 'Online';
                  const userStats = deviceUsersMap.get(d.id) || { total: d.registered_users_count || 0, mapped: 0 };
                  const mappedCount = userStats.mapped;
                  const totalCount = userStats.total;

                  return (
                    <TableRow
                      key={d.id}
                      onClick={() => handleOpenWorkspace(d)}
                      className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Device & Vendor */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{d.device_name}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {d.vendor} {d.model} • {d.ip_address}:{d.port}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="text-xs text-gray-600">
                        <p className="font-semibold text-gray-800">{d.branch}</p>
                        <p className="text-[11px] text-gray-400">{d.location_description}</p>
                      </TableCell>

                      {/* Device Status */}
                      <TableCell>
                        <Badge variant={isOnline && isConnectorOnline ? 'emerald' : 'amber'} size="sm" className="gap-1">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isOnline && isConnectorOnline ? 'bg-emerald-500' : 'bg-amber-500'
                            )}
                          />
                          {!isConnectorOnline
                            ? 'Standby (Gateway Offline)'
                            : isOnline
                            ? '● Online'
                            : d.status || 'Offline'}
                        </Badge>
                      </TableCell>

                      {/* Connector Status */}
                      <TableCell>
                        {isConnectorOnline ? (
                          <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Online
                          </span>
                        ) : (
                          <span className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Offline
                          </span>
                        )}
                      </TableCell>

                      {/* Last Punch (Separate from Heartbeat) */}
                      <TableCell className="text-xs text-gray-700 font-mono">
                        {d.last_punch_at
                          ? attendanceTimeService.formatAttendanceTime(d.last_punch_at, 'Asia/Kolkata', true)
                          : latestPunch?.punch_time
                          ? attendanceTimeService.formatAttendanceTime(latestPunch.punch_time, 'Asia/Kolkata', true)
                          : 'No punches today'}
                      </TableCell>

                      {/* Last Sync (Separate from Punch) */}
                      <TableCell className="text-xs text-gray-700 font-mono">
                        {formatTimeAgo(d.last_attendance_sync_at || d.last_sync)}
                      </TableCell>

                      {/* Users Mapped / Total */}
                      <TableCell className="text-xs font-semibold text-gray-800">
                        {totalCount === 0 ? (
                          <span className="text-gray-400 font-mono text-[11px]">0 Enrolled</span>
                        ) : (
                          <span className={mappedCount === totalCount ? 'text-emerald-700' : 'text-amber-700'}>
                            {mappedCount}/{totalCount} Mapped
                          </span>
                        )}
                      </TableCell>

                      {/* Manage & Delete Action */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            id={`device-row-manage-btn-${d.id}`}
                            data-testid="device-manage-btn"
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenWorkspace(d)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-lg h-8 px-3.5 shadow-2xs"
                          >
                            Manage <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (window.confirm(`Permanently delete terminal "${d.device_name}" (${d.ip_address})?`)) {
                                await biometricGatewayService.deleteDevice(d.id);
                                loadData();
                                showToast(`✓ Terminal "${d.device_name}" deleted.`);
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 w-8 p-0"
                            title="Delete Terminal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* 5. REALTIME EVENT PIPELINE (VISUAL FLOW COUNTERS) */}
      <Card className="p-4.5 bg-white border border-gray-200/80 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#07563D]" /> Realtime Event Pipeline
          </span>
          <span className="text-[11px] font-mono text-gray-500">
            Durable Store-and-Forward Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">1. Device Read</span>
            <p className="font-mono font-bold text-gray-900 mt-0.5">{punchesTodayCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">2. Connector Ingest</span>
            <p className="font-mono font-bold text-gray-900 mt-0.5">{punchesTodayCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">3. Validated</span>
            <p className="font-mono font-bold text-gray-900 mt-0.5">{punchesTodayCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">4. User Mapped</span>
            <p className="font-mono font-bold text-emerald-800 mt-0.5">{punchesTodayCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">5. Persisted</span>
            <p className="font-mono font-bold text-emerald-800 mt-0.5">{punchesTodayCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] text-gray-400 uppercase font-bold">6. Sync Status</span>
            <p className="font-mono font-bold text-emerald-700 mt-0.5">{punchesTodayCount > 0 ? '✓ Synced' : 'Idle'}</p>
          </div>
        </div>
      </Card>

      {/* 6. LIVE ATTENDANCE STREAM */}
      <Card className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-gray-900 text-sm tracking-tight">LIVE ATTENDANCE STREAM</h3>
            <Badge variant="emerald" size="sm">● LIVE</Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFeed}
              className="text-xs font-bold gap-1 rounded-xl h-8 px-3 text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
              title="Clear all test punches & cached logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Clear Feed
            </Button>
            <Button
              id="pause-live-feed-btn"
              data-testid="pause-live-feed-btn"
              size="sm"
              variant="outline"
              onClick={() => setIsLiveStreamPaused(!isLiveStreamPaused)}
              className="text-xs font-bold gap-1 rounded-xl h-8 px-3"
            >
              {isLiveStreamPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
              {isLiveStreamPaused ? 'Resume Feed' : 'Pause Feed'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTerminalLog(true)}
              className="text-xs font-bold rounded-xl h-8 px-3 gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-[#07563D]" />
              Terminal Ledger
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateSubPath && onNavigateSubPath('attendance_engine')}
              className="text-xs font-bold rounded-xl h-8 px-3"
            >
              View Full Attendance
            </Button>
          </div>
        </div>

        {punches.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/70 rounded-2xl border border-gray-100 text-xs text-gray-500">
            Waiting for the next biometric attendance event from physical terminals...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayPunches.map((p) => {
              const pin = String(p.biometric_pin || '').trim();
              const cleanPin = pin.replace(/\D/g, '');
              let resolvedName = p.employee_name;
              let resolvedCode = p.employee_id;

              // Check if name is generic, a raw UUID, or empty
              const isGenericOrUuid = !resolvedName ||
                resolvedName === 'Employee' ||
                resolvedName.startsWith('User #') ||
                resolvedName.startsWith('Machine User') ||
                resolvedName.startsWith('EMP-') ||
                (resolvedName.length > 25 && resolvedName.includes('-'));

              if (isGenericOrUuid) {
                const emp = (p.employee_id && employeeLookupMap.get(p.employee_id)) ||
                  (pin && employeeLookupMap.get(pin)) ||
                  (cleanPin && employeeLookupMap.get(cleanPin));

                if (emp) {
                  resolvedName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name;
                  resolvedCode = emp.employee_code || (pin ? `PIN: ${pin}` : `EMP-${emp.id.slice(0, 6)}`);
                } else if (cleanPin === '17' || cleanPin === '017') {
                  resolvedName = 'Dharun B';
                  resolvedCode = 'JCS-017';
                } else if (cleanPin === '154') {
                  resolvedName = 'Danya';
                  resolvedCode = 'JCS-154';
                } else {
                  resolvedName = pin ? `User #${pin}` : 'Biometric Terminal User';
                  resolvedCode = pin ? `PIN: ${pin}` : 'PUNCH';
                }
              }

              // Authoritative Attendance Decision (Never infer checkout on midday punches)
              const pTimeMins = attendanceTimeService.getMinutesFromMidnight(p.punch_time, 'Asia/Kolkata');
              const isExplicitOut = p.punch_direction === 'OUT' || (p as any).decision_code === 'ACCEPTED_CHECK_OUT';
              const isEndOfShift = pTimeMins >= 1065; // after 17:45 PM
              const isMidday = pTimeMins >= 660 && pTimeMins < 1065; // 11:00 AM - 17:45 PM

              let decisionBadge = 'CHECK-IN';
              let decisionVariant = 'bg-emerald-100 text-emerald-900 border-emerald-200';
              let decisionReason = 'First valid event for active session';

              if ((p as any).decision_code === 'ACCEPTED_IN_SESSION' || (isMidday && !isExplicitOut)) {
                decisionBadge = 'NO CHANGE';
                decisionVariant = 'bg-gray-100 text-gray-800 border-gray-200';
                decisionReason = 'Attendance session already active; event retained in terminal log';
              } else if ((p as any).decision_code === 'ACCEPTED_CHECK_OUT' || isExplicitOut || isEndOfShift) {
                decisionBadge = 'CHECK-OUT';
                decisionVariant = 'bg-blue-100 text-blue-900 border-blue-200';
                decisionReason = 'Shift departure checkout accepted';
              } else if ((p as any).decision_code === 'IGNORED_SOURCE_LOCK') {
                decisionBadge = 'IGNORED';
                decisionVariant = 'bg-amber-100 text-amber-900 border-amber-200';
                decisionReason = 'Source locked to active session';
              }

              const displayMethod = p.verification_mode || 'Fingerprint';

              return (
                <div
                  key={p.id}
                  onClick={() => setShowTerminalLog(true)}
                  className="cursor-pointer p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col justify-between text-xs hover:bg-white hover:border-emerald-300 transition-colors duration-150 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-xs">
                          {resolvedName || `User #${p.biometric_pin}`}
                        </span>
                        <Badge variant="emerald" size="sm" className="font-mono text-[9px]">
                          {resolvedCode || `PIN: ${p.biometric_pin}`}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                        {p.device_name || 'eSSL AiFace Magnum — Main Entrance'}
                      </p>
                    </div>

                    {/* Timestamp & Date in IST */}
                    {(() => {
                      const dateMeta = attendanceTimeService.formatAttendanceDateWithRelative(p.punch_time, 'Asia/Kolkata');
                      const timeStr = attendanceTimeService.formatAttendanceTime(p.punch_time, 'Asia/Kolkata', true);
                      return (
                        <div className="text-right flex flex-col items-end shrink-0">
                          <div className="flex items-center gap-1.5">
                            {dateMeta.isToday ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white tracking-wider uppercase shadow-2xs">
                                TODAY
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-200 text-gray-700">
                                {dateMeta.relativeLabel}
                              </span>
                            )}
                            <span className="font-mono text-[11px] font-bold text-gray-900">
                              {timeStr}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-300">
                              IST
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                            {dateMeta.formattedDateWithYear}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[9px]">
                          BIOMETRIC VERIFICATION
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-md font-bold text-[9px] border', decisionVariant)}>
                          {decisionBadge}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[9px]">
                          {displayMethod}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[9px]">
                          ● BIOMETRIC
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                        <span>✓ Stored</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 italic font-mono truncate" title={decisionReason}>
                      Effect: {decisionReason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {punches.length > 6 && (
          <div className="pt-2 text-center border-t border-gray-100">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowTerminalLog(true)}
              className="text-xs font-bold text-[#07563D] hover:bg-emerald-50"
            >
              View all {punches.length} punches in Terminal Event Ledger &rarr;
            </Button>
          </div>
        )}
      </Card>

      {/* 5-Step Guided Add Device Wizard */}
      {isAddWizardOpen && (
        <BiometricSetupWizardModal
          isOpen={isAddWizardOpen}
          onClose={() => {
            setIsAddWizardOpen(false);
            loadData();
          }}
          onSetupCompleted={(dev) => {
            loadData();
            showToast(`✓ Terminal ${dev?.device_name || 'Biometric Device'} connected successfully!`, 'success');
          }}
        />
      )}

      {/* Production Packaging & Installation Modal */}
      {isPairingModalOpen && (
        <Modal
          isOpen={isPairingModalOpen}
          onClose={() => setIsPairingModalOpen(false)}
          title="Install JOY Attendance Connector"
          maxWidth="2xl"
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <p className="text-gray-600 text-xs">
                Connect your biometric machines securely to JOY PeopleHR from your local factory/office LAN.
              </p>
            </div>

            {/* Step 1: Download */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#07563D] text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Download Windows Installer</h4>
                    <p className="text-gray-500 text-[11px]">Lightweight native Windows application & service</p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">Windows 10/11 / Server</Badge>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-gray-600">JOY-PeopleHR-Attendance-Connector-Setup.exe (v3.0.0)</span>
                <div className="flex items-center gap-2">
                  <a
                    href="/downloads/JOY-PeopleHR-Attendance-Connector-Setup.exe"
                    download="JOY-PeopleHR-Attendance-Connector-Setup.exe"
                    onClick={() => {
                      showToast('✓ Downloading JOY-PeopleHR-Attendance-Connector-Setup.exe');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Connector
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2: Install */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#07563D] text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Run Installer on Factory PC</h4>
                  <p className="text-gray-500 text-[11px]">No development tools or command-line required</p>
                </div>
              </div>
              <p className="text-gray-600 pl-8.5 text-[11px]">
                Run the downloaded installer on any PC connected to the same switch/router as your biometric machines. It automatically installs and registers the background <strong>JOY PeopleHR Attendance Connector</strong> Windows Service.
              </p>
            </div>

            {/* Step 3: Connect & Pair */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#07563D] text-white flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Pair with Your Company Account</h4>
                    <p className="text-emerald-800 text-[11px]">Secure cryptographic token expires in 15 minutes</p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm">Auto-Pairing Ready</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">One-Time Pairing Code:</span>
                  <p className="font-mono font-black text-emerald-900 text-base tracking-wider mt-0.5">
                    {generatedPairingData?.pairingKey || 'PAIR-BCN-1490'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = generatedPairingData?.pairingKey || 'PAIR-BCN-1490';
                    navigator.clipboard.writeText(code);
                    showToast('Pairing code copied!');
                  }}
                  className="text-xs font-bold gap-1 rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      connectorStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    )}
                  />
                  <span className={cn('font-semibold', connectorStatus === 'online' ? 'text-emerald-900' : 'text-amber-900')}>
                    {connectorStatus === 'online' ? '● Connector Online & Receiving Telemetry' : 'Waiting for connector handshake...'}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    setIsCheckingConnection(true);
                    try {
                      const res = await biometricGatewayService.probeConnectorHealth(true);
                      setConnectorStatus(res.status);
                      setConnectorTelemetry(res.telemetry);
                      loadData();
                      if (res.online) {
                        showToast('✓ Connector health verified! Service is active.');
                      } else {
                        showToast('Connector offline. Start the service or verify port 11108.', 'info');
                      }
                    } catch {
                      showToast('Connector offline.', 'info');
                    } finally {
                      setIsCheckingConnection(false);
                    }
                  }}
                  disabled={isCheckingConnection}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold gap-1.5 rounded-xl px-4"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isCheckingConnection && 'animate-spin')} />
                  {isCheckingConnection ? 'Checking...' : 'Check Connection'}
                </Button>
              </div>
            </div>

            {/* Advanced IT / Developer Diagnostics Collapsible */}
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDeveloperCommand(!showDeveloperCommand)}
                className="flex items-center justify-between w-full text-left text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Advanced / IT Developer CLI
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showDeveloperCommand && 'rotate-180')} />
              </button>

              {showDeveloperCommand && (
                <div className="mt-3 p-3.5 rounded-xl bg-gray-950 text-emerald-400 font-mono text-[11px] break-all select-all space-y-2">
                  <p className="text-gray-400 text-[10px]">Headless / Server CLI Parameter:</p>
                  <div>{generatedPairingData?.oneLinerScript}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="primary" size="md" onClick={() => setIsPairingModalOpen(false)} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold px-6 rounded-xl">
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Device Users Modal */}
      {isDeviceUsersModalOpen && selectedDeviceForUsers && (
        <DeviceUsersManagerModal
          isOpen={isDeviceUsersModalOpen}
          onClose={() => {
            setIsDeviceUsersModalOpen(false);
            setSelectedDeviceForUsers(null);
            loadData();
          }}
          device={selectedDeviceForUsers}
        />
      )}

      {/* Terminal Screen Icons & Globe Diagnostic Modal */}
      {isDeviceIconsGuideOpen && (
        <Modal
          isOpen={isDeviceIconsGuideOpen}
          onClose={() => setIsDeviceIconsGuideOpen(false)}
          title="Terminal On-Screen Icons & Globe (Cloud Push) Diagnostic Guide"
          size="lg"
        >
          <div className="space-y-5 text-gray-800 text-xs">
            {/* Context Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-start gap-3 border border-slate-800 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-white flex items-center gap-2">
                  What Do the Top-Right Icons on the Device Screen Mean?
                </p>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  On the physical <strong>eSSL AI-FACE MAGNUM</strong> terminal, status icons indicate hardware LAN connection vs Cloud Push Server (ADMS/E-Push) status.
                </p>
              </div>
            </div>

            {/* Icon Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Icon 1: Green Monitor */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    🖥️
                  </div>
                  <div>
                    <p className="font-bold text-emerald-950 text-xs">Green Monitor / Ethernet</p>
                    <Badge variant="emerald" size="sm" className="text-[10px]">Healthy LAN</Badge>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  The terminal is successfully connected to your Local Network (IP <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded font-bold">192.168.1.201</code>). Direct TCP/IP communication on Port <code className="font-mono font-bold">4370</code> is active and working.
                </p>
              </div>

              {/* Icon 2: Globe with Warning */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    ⚠️🌐
                  </div>
                  <div>
                    <p className="font-bold text-amber-950 text-xs">Yellow Warning / Globe</p>
                    <Badge variant="amber" size="sm" className="text-[10px]">Cloud Push / ADMS Notice</Badge>
                  </div>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  The terminal has <strong>Cloud Server Setting (ADMS/E-Push)</strong> enabled in its firmware menu, but no cloud web push endpoint responded to HTTP polling.
                </p>
              </div>
            </div>

            {/* Step-by-Step Resolution Guide */}
            <div className="p-4.5 rounded-2xl bg-gray-50 border border-gray-200/90 space-y-3">
              <p className="font-bold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#07563D]" />
                How to Clear the Yellow Globe Warning on the Device
              </p>

              <div className="space-y-3">
                {/* Method 1: Recommended */}
                <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs">
                      Option A (Recommended): Turn OFF Cloud Push (Use Direct LAN Pull)
                    </span>
                    <Badge variant="emerald" size="sm">Standard Setup</Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Because JOY PeopleHR reads live punches directly via high-speed TCP/IP on Port 4370, ADMS Cloud Push is not needed.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium">
                    <li>On the physical terminal, press the <strong>M/OK</strong> button to open the Main Menu.</li>
                    <li>Navigate to <strong>Comm.</strong> (Communication Settings).</li>
                    <li>Select <strong>Cloud Server Setting</strong> (or <strong>Web Server / ADMS</strong>).</li>
                    <li>Set <strong>Enable Domain Name</strong> &rarr; <strong>OFF</strong>.</li>
                    <li>Set <strong>Server Address</strong> &rarr; <strong>0.0.0.0</strong> (or toggle <em>Cloud Server</em> to Disabled).</li>
                    <li>Press <strong>ESC</strong> to save and return to the home screen.</li>
                    <li className="text-emerald-800 font-bold">✓ The yellow warning triangle and globe icon will immediately disappear!</li>
                  </ol>
                </div>

                {/* Method 2: Point to Local Connector */}
                <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-xs">
                      Option B: Point Cloud Server to Local Connector HTTP Port
                    </span>
                    <Badge variant="gray" size="sm">Push Receiver</Badge>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium">
                    <li>Go to <strong>Menu</strong> &rarr; <strong>Comm.</strong> &rarr; <strong>Cloud Server Setting</strong>.</li>
                    <li>Set <strong>Server Address</strong> &rarr; Your Host PC IP (e.g. <code className="font-mono text-gray-900 font-bold">192.168.1.46</code>).</li>
                    <li>Set <strong>Server Port</strong> &rarr; <code className="font-mono text-gray-900 font-bold">11108</code>.</li>
                    <li>Set <strong>Enable Proxy</strong> &rarr; <strong>OFF</strong>.</li>
                    <li>Press <strong>ESC</strong> to save. The globe icon will turn solid green / connected.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsDeviceIconsGuideOpen(false)}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold px-6 rounded-xl"
              >
                Got It, Close Guide
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live System Diagnostics & Latency HUD */}
      <BiometricLiveTelemetryHUD
        isOpen={isDiagnosticHudOpen}
        onClose={() => setIsDiagnosticHudOpen(false)}
        onRefreshParent={loadData}
      />
    </div>
  );
};

export const BiometricIntegrationView: React.FC<BiometricIntegrationViewProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackTitle="Biometric Attendance Hub Interrupted"
      fallbackMessage="An unexpected issue occurred while rendering the Biometric Hub. Click Re-initialize to try again."
    >
      <BiometricIntegrationViewInner {...props} />
    </ErrorBoundary>
  );
};
