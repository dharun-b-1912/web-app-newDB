// src/features/attendance/components/DeviceUsersManagerModal.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Biometric User & Machine Directory Console
// High-Scale 500+ Employee Directory • True Supabase Scoping • LAN TCP Gateway
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Fingerprint,
  ScanFace,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Link,
  Unlink,
  ShieldCheck,
  Search,
  Radio,
  Zap,
  Power,
  Sparkles,
  History,
  Clock,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Layers,
  Globe,
  Lock,
  UserCheck,
  UserX,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  UploadCloud,
  Send,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
  BiometricDeviceUserHistory,
  DeviceUserSyncHistory,
  SyncProgressEvent,
} from '../../../services/attendance/biometricGatewayService';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';
import { MapEmployeeModal } from './MapEmployeeModal';
import { BulkMapModal } from './BulkMapModal';
import { RemoteBiometricEnrollmentModal } from './RemoteBiometricEnrollmentModal';
import { DeviceUserDetailDrawer } from './DeviceUserDetailDrawer';
import { DeviceUserMappingDrawer } from './DeviceUserMappingDrawer';
import { UserAttendanceHistoryDrawer } from './UserAttendanceHistoryDrawer';

interface DeviceUsersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice | null;
}

export const DeviceUsersManagerModal: React.FC<DeviceUsersManagerModalProps> = ({
  isOpen,
  onClose,
  device,
}) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<BiometricDeviceUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mappingFilter, setMappingFilter] = useState<'ALL' | 'MAPPED' | 'UNMAPPED' | 'MISSING_FROM_DEVICE'>('ALL');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | 'FACE' | 'FINGERPRINT' | 'CARD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [sortBy, setSortBy] = useState<'device_user_id' | 'name' | 'employee' | 'last_synced'>('device_user_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalDeviceUsers: 0,
    mappedCount: 0,
    unmappedCount: 0,
    disabledCount: 0,
    missingFromDeviceCount: 0,
    conflictCount: 0,
    totalCompanyEmployees: 0,
  });

  const [activeView, setActiveView] = useState<'users' | 'history' | 'changes'>('users');
  const [syncHistory, setSyncHistory] = useState<DeviceUserSyncHistory[]>([]);

  // Selection for Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Sync Progress & Summary State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<any | null>(null);

  // Drawers & Modals State
  const [detailUser, setDetailUser] = useState<BiometricDeviceUser | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [mappingUser, setMappingUser] = useState<BiometricDeviceUser | null>(null);
  const [isMappingDrawerOpen, setIsMappingDrawerOpen] = useState(false);

  const [historyUser, setHistoryUser] = useState<BiometricDeviceUser | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const [isBulkMapModalOpen, setIsBulkMapModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPropagating, setIsPropagating] = useState(false);

  // Unmap Confirmation
  const [isUnmapConfirmOpen, setIsUnmapConfirmOpen] = useState(false);
  const [userToUnmap, setUserToUnmap] = useState<BiometricDeviceUser | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Directory Users
  const loadEnterpriseUsers = useCallback(async () => {
    if (!device) return;
    setIsLoading(true);
    try {
      const res = await biometricGatewayService.getEnterpriseDirectoryUsers({
        deviceId: device.id,
        page: currentPage,
        pageSize,
        searchQuery: debouncedSearch,
        mappingFilter,
        modalityFilter,
        statusFilter,
        sortBy,
        sortDirection,
      });

      setUsers(res.users);
      setTotalUsers(res.total);
      setTotalPages(res.totalPages);
      setMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to load enterprise directory users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [device, currentPage, pageSize, debouncedSearch, mappingFilter, modalityFilter, statusFilter, sortBy, sortDirection]);

  useEffect(() => {
    if (isOpen && device) {
      loadEnterpriseUsers();
      loadEmployees();
      loadHistory();
    }
  }, [isOpen, device, loadEnterpriseUsers]);

  // Realtime Sync & Mapping Event Listeners
  useEffect(() => {
    if (!isOpen || !device) return;

    const unsubStarted = hrEventBus.subscribe('device.user_sync.started', (evt: any) => {
      if (evt.deviceId === device.id) {
        setIsSyncing(true);
        setSyncProgress({
          commandId: evt.commandId,
          deviceId: evt.deviceId,
          status: 'QUEUED',
          message: evt.message,
        });
      }
    });

    const unsubProgress = hrEventBus.subscribe('device.user_sync.progress', (evt: any) => {
      if (evt.deviceId === device.id) {
        setIsSyncing(true);
        setSyncProgress(evt);
      }
    });

    const unsubCompleted = hrEventBus.subscribe('device.user_sync.completed', (evt: any) => {
      if (evt.deviceId === device.id) {
        setIsSyncing(false);
        setSyncProgress(evt);
        if (evt.summary) {
          setLastSyncSummary(evt.summary);
        }
        showToast(evt.message, evt.status === 'COMPLETED' ? 'default' : 'error');
        loadEnterpriseUsers();
        loadHistory();
      }
    });

    const unsubMapCreated = hrEventBus.subscribe('biometric.mapping.created', () => {
      loadEnterpriseUsers();
    });

    const unsubMapRemoved = hrEventBus.subscribe('biometric.mapping.removed', () => {
      loadEnterpriseUsers();
    });

    const unsubBioUpdated = hrEventBus.subscribe('biometric.updated', () => {
      loadEnterpriseUsers();
    });

    const handleWindowUpdate = () => loadEnterpriseUsers();
    window.addEventListener('biometric:updated', handleWindowUpdate);

    // Initial and periodic dynamic live fetch from Gateway (every 4 seconds)
    biometricGatewayService.syncLiveUsersFromGateway(device.id);
    const liveTimer = setInterval(() => {
      biometricGatewayService.syncLiveUsersFromGateway(device.id);
    }, 4000);

    return () => {
      clearInterval(liveTimer);
      unsubStarted();
      unsubProgress();
      unsubCompleted();
      unsubMapCreated();
      unsubMapRemoved();
      unsubBioUpdated();
      window.removeEventListener('biometric:updated', handleWindowUpdate);
    };
  }, [isOpen, device, loadEnterpriseUsers, showToast]);

  const loadEmployees = async () => {
    try {
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadHistory = () => {
    if (!device) return;
    const hist = biometricGatewayService.getDeviceSyncHistory(device.id);
    setSyncHistory(hist);
  };

  const handleOpenUserDetail = (u: BiometricDeviceUser) => {
    setDetailUser(u);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenUserMapping = (u: BiometricDeviceUser) => {
    setMappingUser(u);
    setIsMappingDrawerOpen(true);
  };

  const handleOpenUserHistory = (u: BiometricDeviceUser) => {
    setHistoryUser(u);
    setIsHistoryDrawerOpen(true);
  };

  const handleTriggerSync = async () => {
    if (!device || isSyncing) return;
    try {
      const res = await biometricGatewayService.triggerDeviceUserSync(device.id, 'IT Administrator');
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || 'Failed to start user sync', 'error');
    }
  };

  const handleUnmapUser = async (user: BiometricDeviceUser) => {
    if (!device) return;
    try {
      await biometricGatewayService.unmapDeviceUser(device.id, user.device_user_id);
      showToast(`PIN #${user.device_user_id} unmapped successfully.`);
      loadEnterpriseUsers();
      if (detailUser && detailUser.device_user_id === user.device_user_id) {
        setIsDetailDrawerOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unmap user', 'error');
    }
  };

  const handlePushMissingUserToDevice = async (user: BiometricDeviceUser) => {
    if (!device) return;
    try {
      showToast(`Pushing ${user.name} to ${device.device_name}...`);
      const res = await biometricGatewayService.syncEmployeesToTerminal(device.id);
      showToast(`✓ ${res.message}`);
      loadEnterpriseUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to push user to device', 'error');
    }
  };

  const handlePropagateAllMappings = async () => {
    setIsPropagating(true);
    try {
      const res = await biometricGatewayService.propagateMappingsAcrossDevices();
      showToast(`✓ Propagated employee mappings across ${res.deviceCount} hardware terminal(s)!`);
      loadEnterpriseUsers();
    } catch (err: any) {
      showToast(err.message || 'Propagation failed', 'error');
    } finally {
      setIsPropagating(false);
    }
  };

  const handleExportCsv = () => {
    if (!device) return;
    const csvContent = biometricGatewayService.exportDeviceUsersCsv(device.id);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${device.device_name.toLowerCase().replace(/\s+/g, '_')}_machine_users.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Machine user directory exported to CSV.');
  };

  if (!isOpen || !device) return null;

  const lastSync = biometricGatewayService.getLastSyncForDevice(device.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[94vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#07563D] flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Enrolled Users & Biometric Directory</h3>
                <Badge variant="emerald" className="text-[10px] font-mono">
                  TCP {device.ip_address}:{device.port}
                </Badge>
                {lastSync ? (
                  <span className="text-[10px] text-gray-400 font-mono">
                    Last Synced: {new Date(lastSync.completed_at || lastSync.started_at).toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-mono">Never Synchronized</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {device.device_name} ({device.vendor} {device.model}) • {device.branch} • {device.location_description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={totalUsers === 0}
              className="text-xs rounded-xl border-gray-200"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === 'users' ? 'history' : 'users')}
              className="text-xs rounded-xl border-gray-200"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              {activeView === 'users' ? 'Sync History' : 'View Users'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePropagateAllMappings}
              disabled={isPropagating}
              className="text-xs rounded-xl border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5 text-purple-600', isPropagating && 'animate-spin')} />
              {isPropagating ? 'Syncing...' : 'Sync All Terminals'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="text-xs rounded-xl border-emerald-300 text-[#07563D] hover:bg-emerald-50"
            >
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
              Enroll Biometrics
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSyncing}
              onClick={handleTriggerSync}
              className="text-xs rounded-xl bg-[#07563D] hover:bg-[#0b7a57] text-white shadow-xs"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing...' : 'Refresh From Device'}
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Sync Progress Bar */}
        {isSyncing && syncProgress && (
          <div className="p-3.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-4 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950">{syncProgress.status}:</span>
                  <span className="text-xs text-blue-800">{syncProgress.message}</span>
                </div>
                <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                  Job ID: {syncProgress.commandId} • Async LAN socket stream active.
                </div>
              </div>
            </div>
            {syncProgress.receivedCount !== undefined && (
              <Badge variant="blue" className="text-xs font-mono font-bold">
                {syncProgress.receivedCount} Users Received
              </Badge>
            )}
          </div>
        )}

        {/* 5 COMPACT OPERATIONAL KPI METRIC CARDS */}
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 grid grid-cols-5 gap-3 text-xs">
          <div
            onClick={() => {
              setMappingFilter('ALL');
              setCurrentPage(1);
            }}
            className={cn(
              'p-3 bg-white rounded-2xl border transition cursor-pointer shadow-2xs',
              mappingFilter === 'ALL' ? 'border-[#07563D] ring-2 ring-[#07563D]/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="text-gray-400 font-medium text-[11px]">Total Machine Users</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{metrics.totalDeviceUsers}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
              of {metrics.totalCompanyEmployees} company employees
            </div>
          </div>

          <div
            onClick={() => {
              setMappingFilter('MAPPED');
              setCurrentPage(1);
            }}
            className={cn(
              'p-3 bg-white rounded-2xl border transition cursor-pointer shadow-2xs',
              mappingFilter === 'MAPPED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="text-emerald-600 font-medium text-[11px]">Mapped to Employees</div>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">{metrics.mappedCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5 font-semibold">
              {metrics.totalDeviceUsers > 0 ? Math.round((metrics.mappedCount / metrics.totalDeviceUsers) * 100) : 0}% Coverage
            </div>
          </div>

          <div
            onClick={() => {
              setMappingFilter('UNMAPPED');
              setCurrentPage(1);
            }}
            className={cn(
              'p-3 bg-white rounded-2xl border transition cursor-pointer shadow-2xs',
              mappingFilter === 'UNMAPPED' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="text-amber-600 font-medium text-[11px]">Unmapped Machine PINs</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5">{metrics.unmappedCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5 font-semibold">
              Needs linking
            </div>
          </div>

          <div
            onClick={() => {
              setStatusFilter(statusFilter === 'DISABLED' ? 'ALL' : 'DISABLED');
              setCurrentPage(1);
            }}
            className={cn(
              'p-3 bg-white rounded-2xl border transition cursor-pointer shadow-2xs',
              statusFilter === 'DISABLED' ? 'border-gray-600 ring-2 ring-gray-600/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="text-gray-500 font-medium text-[11px]">Disabled / Inactive</div>
            <div className="text-lg font-bold text-gray-700 mt-0.5">{metrics.disabledCount}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Terminal lock applied</div>
          </div>

          <div
            onClick={() => {
              setMappingFilter('MISSING_FROM_DEVICE');
              setCurrentPage(1);
            }}
            className={cn(
              'p-3 bg-white rounded-2xl border transition cursor-pointer shadow-2xs',
              mappingFilter === 'MISSING_FROM_DEVICE' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="text-rose-600 font-medium text-[11px]">Missing on Device</div>
            <div className="text-lg font-bold text-rose-700 mt-0.5">{metrics.missingFromDeviceCount}</div>
            <div className="text-[10px] text-rose-600 mt-0.5 font-semibold">Employees not enrolled</div>
          </div>
        </div>

        {/* VIEW 1: ENTERPRISE USERS DIRECTORY */}
        {activeView === 'users' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar Filters Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative w-64 md:w-80">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Machine ID, Employee Code, Name, Card #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-[#07563D]"
                  />
                </div>

                {/* Modality Filter */}
                <select
                  value={modalityFilter}
                  onChange={e => {
                    setModalityFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-hidden"
                >
                  <option value="ALL">All Biometrics</option>
                  <option value="FACE">Face Recognition</option>
                  <option value="FINGERPRINT">Fingerprint</option>
                  <option value="CARD">RFID Card</option>
                </select>

                {/* Sort Filter */}
                <select
                  value={`${sortBy}-${sortDirection}`}
                  onChange={e => {
                    const [field, dir] = e.target.value.split('-');
                    setSortBy(field as any);
                    setSortDirection(dir as any);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-hidden"
                >
                  <option value="device_user_id-asc">Sort: PIN (Low to High)</option>
                  <option value="device_user_id-desc">Sort: PIN (High to Low)</option>
                  <option value="name-asc">Sort: Name (A–Z)</option>
                  <option value="employee-asc">Sort: Employee (A–Z)</option>
                  <option value="last_synced-desc">Sort: Last Synced</option>
                </select>
              </div>

              {/* Bulk Actions / Page Size Selector */}
              <div className="flex items-center gap-2 text-xs">
                {selectedUserIds.size > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsBulkMapModalOpen(true)}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl font-bold shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Bulk Map ({selectedUserIds.size} Selected)
                  </Button>
                )}

                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800"
                  >
                    <option value={50}>50 / page</option>
                    <option value={75}>75 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>

                <span className="text-gray-400 mx-1">|</span>

                <span className="text-gray-500">
                  Total <strong className="text-gray-900">{totalUsers}</strong> identities
                </span>
              </div>
            </div>

            {/* Dense High-Performance Records Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-[#07563D] animate-spin mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">Loading biometric directory identities...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">No identities match criteria</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Try adjusting your search query, mapping filter, or click refresh to fetch raw users from the physical terminal.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs rounded-xl"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isSyncing && 'animate-spin')} />
                    Fetch From Device
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 text-[11px] font-bold text-gray-600">
                        <TableHead className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={users.length > 0 && users.every(u => selectedUserIds.has(u.device_user_id))}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedUserIds(new Set(users.map(u => u.device_user_id)));
                              } else {
                                setSelectedUserIds(new Set());
                              }
                            }}
                            className="rounded-sm border-gray-300 text-[#07563D] focus:ring-[#07563D]"
                          />
                        </TableHead>
                        <TableHead>Machine PIN</TableHead>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>JOY PeopleHR Mapping</TableHead>
                        <TableHead>Privilege</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Card</TableHead>
                        <TableHead>Fingerprint</TableHead>
                        <TableHead>Face</TableHead>
                        <TableHead>Group / TZ</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => {
                        const isSelected = selectedUserIds.has(u.device_user_id);
                        const rawCard = u.card_number && u.card_number !== 'null' && u.card_number !== 'undefined'
                          ? u.card_number
                          : (u as any).credentials?.card?.uid;
                        const activeCard = rawCard ? String(rawCard).trim() : null;

                        const fpCount = Number(u.fingerprint_count || (u as any).credentials?.fingerprint?.count || 0);
                        const isFpEnrolled = fpCount > 0 || (u as any).credentials?.fingerprint?.status === 'ENROLLED';

                        const faceCred = (u as any).credentials?.face;
                        const isFaceEnrolled = Boolean(u.face_enrolled || (u as any).has_face_enrolled || faceCred?.status === 'ENROLLED');
                        const isFaceUnknown = !isFaceEnrolled && (faceCred?.status === 'UNKNOWN' || u.face_enrolled === null || u.face_enrolled === undefined);

                        const isMissingVirtual = mappingFilter === 'MISSING_FROM_DEVICE';

                        return (
                          <TableRow
                            key={`${u.device_id}_${u.device_user_id}`}
                            className={cn('hover:bg-gray-50/50 transition', isSelected && 'bg-blue-50/20')}
                          >
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedUserIds);
                                  if (next.has(u.device_user_id)) {
                                    next.delete(u.device_user_id);
                                  } else {
                                    next.add(u.device_user_id);
                                  }
                                  setSelectedUserIds(next);
                                }}
                                className="rounded-sm border-gray-300 text-[#07563D] focus:ring-[#07563D]"
                              />
                            </TableCell>

                            {/* Machine PIN */}
                            <TableCell>
                              <div className="font-mono text-xs font-bold text-gray-900">
                                {u.device_user_id.startsWith('#') ? u.device_user_id : `#${u.device_user_id}`}
                              </div>
                            </TableCell>

                            {/* Machine Name */}
                            <TableCell className="text-xs font-semibold text-gray-900">
                              {u.name}
                            </TableCell>

                            {/* HR Mapping */}
                            <TableCell>
                              {u.is_mapped && u.mapped_employee_name ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <div>
                                    <div className="font-bold text-gray-900">{u.mapped_employee_name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">
                                      {u.mapped_employee_code} • {u.mapped_department || 'General'}
                                    </div>
                                  </div>
                                </div>
                              ) : isMissingVirtual ? (
                                <div className="text-xs">
                                  <div className="font-bold text-rose-700">{u.mapped_employee_name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">{u.mapped_employee_code} • Needs Push</div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Unmapped</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Privilege */}
                            <TableCell>
                              <Badge
                                variant={u.privilege === 'ADMIN' || u.privilege === 'SUPERADMIN' ? 'purple' : 'gray'}
                                className="text-[10px]"
                              >
                                {u.privilege}
                              </Badge>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge
                                variant={isMissingVirtual ? 'rose' : u.enabled !== false ? 'emerald' : 'gray'}
                                className="text-[10px]"
                              >
                                {isMissingVirtual ? 'Missing on Device' : u.enabled !== false ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>

                            {/* Card */}
                            <TableCell className="font-mono text-xs text-gray-800">
                              {activeCard ? (
                                <Badge variant="blue" size="sm" className="text-[10px] gap-1 font-semibold bg-blue-50 text-blue-800 border-blue-200 font-mono">
                                  🪪 #{activeCard}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No Card</span>
                              )}
                            </TableCell>

                            {/* Fingerprint */}
                            <TableCell>
                              {isFpEnrolled ? (
                                <Badge variant="emerald" size="sm" className="text-[10px] gap-1 font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                                  <Fingerprint className="w-3 h-3 text-[#07563D]" /> {fpCount || 1} Enrolled
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No FP</span>
                              )}
                            </TableCell>

                            {/* Face */}
                            <TableCell>
                              {isFaceEnrolled ? (
                                <Badge variant="emerald" size="sm" className="text-[10px] gap-1 font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                                  <ScanFace className="w-3 h-3 text-[#07563D]" /> 1 Face Enrolled
                                </Badge>
                              ) : isFaceUnknown ? (
                                <Badge variant="gray" size="sm" className="text-[10px] text-gray-500 bg-gray-100 border-gray-200">
                                  Unknown
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No Face</span>
                              )}
                            </TableCell>

                            {/* Group / Timezone */}
                            <TableCell className="text-[11px] text-gray-500">
                              <div>Group {u.group_id || '1'}</div>
                              <div className="text-[9px] text-gray-400">{u.timezone || 'Asia/Kolkata'}</div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isMissingVirtual ? (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handlePushMissingUserToDevice(u)}
                                    className="text-[11px] h-7 px-2.5 rounded-lg bg-[#07563D] hover:bg-[#0b7a57] text-white font-semibold gap-1"
                                  >
                                    <UploadCloud className="w-3 h-3" /> Push to Device
                                  </Button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleOpenUserDetail(u)}
                                      title="View Detailed Profile & Biometrics"
                                      className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleOpenUserHistory(u)}
                                      title="Inspect Individual Punch History"
                                      className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                    </button>

                                    {u.is_mapped ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleOpenUserMapping(u)}
                                          className="text-[11px] h-7 px-2 rounded-lg border-gray-200 text-gray-600 hover:text-[#07563D]"
                                        >
                                          <Link className="w-3 h-3 mr-1" /> Re-map
                                        </Button>
                                        <button
                                          onClick={() => {
                                            setUserToUnmap(u);
                                            setIsUnmapConfirmOpen(true);
                                          }}
                                          title="Unmap Employee"
                                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                        >
                                          <Unlink className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenUserMapping(u)}
                                        className="text-[11px] h-7 px-2.5 rounded-lg border-emerald-300 text-[#07563D] bg-emerald-50/50 hover:bg-emerald-100 font-semibold"
                                      >
                                        <Link className="w-3 h-3 mr-1" /> Map Employee
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Server-Side Pagination Footer */}
            <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
              <div>
                Showing <strong className="text-gray-900">{users.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong>–
                <strong className="text-gray-900">{Math.min(currentPage * pageSize, totalUsers)}</strong> of{' '}
                <strong className="text-gray-900">{totalUsers}</strong> identities (Page {currentPage} of {totalPages})
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="text-xs rounded-xl h-8 px-3"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="text-xs rounded-xl h-8 px-3"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SYNC HISTORY AUDIT TRAIL */}
        {activeView === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Device User Synchronization Audit History</h4>
                <p className="text-xs text-gray-500">Immutable record of all user ingestion jobs and batch metrics</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveView('users')} className="text-xs rounded-xl">
                Back to Users
              </Button>
            </div>

            {syncHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No sync jobs executed yet for this device.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 text-[11px] font-bold text-gray-600">
                      <TableHead>Sync ID / Time</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fetched</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Unchanged</TableHead>
                      <TableHead>Removed</TableHead>
                      <TableHead>Unmapped</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncHistory.map(h => (
                      <TableRow key={h.sync_id}>
                        <TableCell>
                          <div className="text-xs font-bold text-gray-900 font-mono">
                            {new Date(h.started_at).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{h.command_id}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-gray-700">{h.requested_by}</TableCell>
                        <TableCell>
                          <Badge variant={h.status === 'COMPLETED' ? 'emerald' : h.status === 'RUNNING' ? 'blue' : 'rose'} className="text-[10px]">
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-gray-900">{h.fetched_count}</TableCell>
                        <TableCell className="font-mono text-xs text-emerald-700 font-bold">+{h.created_count}</TableCell>
                        <TableCell className="font-mono text-xs text-blue-700">{h.updated_count}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{h.unchanged_count}</TableCell>
                        <TableCell className="font-mono text-xs text-rose-700">{h.removed_count || 0}</TableCell>
                        <TableCell className="font-mono text-xs text-amber-700">{h.unmapped_count}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{h.duration_seconds}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* MACHINE USER DETAIL DRAWER */}
        {isDetailDrawerOpen && detailUser && (
          <DeviceUserDetailDrawer
            isOpen={isDetailDrawerOpen}
            onClose={() => {
              setIsDetailDrawerOpen(false);
              setDetailUser(null);
            }}
            user={detailUser}
            device={device}
            onOpenMappingModal={u => {
              setMappingUser(u);
              setIsMappingDrawerOpen(true);
            }}
            onOpenUnmapConfirm={u => {
              setUserToUnmap(u);
              setIsUnmapConfirmOpen(true);
            }}
            onUserUpdated={loadEnterpriseUsers}
          />
        )}

        {/* BIOMETRIC EMPLOYEE MAPPING DRAWER */}
        {isMappingDrawerOpen && mappingUser && (
          <DeviceUserMappingDrawer
            isOpen={isMappingDrawerOpen}
            onClose={() => {
              setIsMappingDrawerOpen(false);
              setMappingUser(null);
            }}
            device={device}
            machineUser={mappingUser}
            employees={employees}
            onMappingSuccess={() => {
              loadEnterpriseUsers();
              if (detailUser && detailUser.device_user_id === mappingUser.device_user_id) {
                const refreshed = users.find(x => x.device_user_id === mappingUser.device_user_id);
                if (refreshed) setDetailUser(refreshed);
              }
            }}
          />
        )}

        {/* INDIVIDUAL ATTENDANCE HISTORY DRAWER */}
        {isHistoryDrawerOpen && historyUser && (
          <UserAttendanceHistoryDrawer
            isOpen={isHistoryDrawerOpen}
            onClose={() => {
              setIsHistoryDrawerOpen(false);
              setHistoryUser(null);
            }}
            user={historyUser}
            device={device}
          />
        )}

        {/* BULK MAP MODAL */}
        {isBulkMapModalOpen && (
          <BulkMapModal
            isOpen={isBulkMapModalOpen}
            onClose={() => {
              setIsBulkMapModalOpen(false);
              setSelectedUserIds(new Set());
            }}
            device={device}
            selectedUsers={
              selectedUserIds.size > 0
                ? users.filter(u => selectedUserIds.has(u.device_user_id))
                : users.filter(u => !u.is_mapped)
            }
            employees={employees}
            onBulkMappingSuccess={() => {
              loadEnterpriseUsers();
              setSelectedUserIds(new Set());
            }}
          />
        )}

        {/* UNMAP CONFIRMATION MODAL */}
        {isUnmapConfirmOpen && userToUnmap && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Unlink className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Unmap Biometric Identity</h4>
                  <p className="text-xs text-gray-500">Remove canonical association for Machine PIN #{userToUnmap.device_user_id}</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Preservation Guarantee
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Unmapping will dissociate future punches from <strong>{userToUnmap.mapped_employee_name || 'the employee'}</strong>. All prior historical attendance records and punches will <strong>NOT</strong> be deleted.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsUnmapConfirmOpen(false);
                    setUserToUnmap(null);
                  }}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    if (userToUnmap) {
                      await handleUnmapUser(userToUnmap);
                      setIsUnmapConfirmOpen(false);
                      setUserToUnmap(null);
                    }
                  }}
                  className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Unlink
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* REMOTE BIOMETRIC ENROLLMENT MODAL */}
        {isEnrollModalOpen && (
          <RemoteBiometricEnrollmentModal
            isOpen={isEnrollModalOpen}
            onClose={() => setIsEnrollModalOpen(false)}
            device={device}
            employees={employees}
            onEnrollmentSuccess={() => {
              loadEnterpriseUsers();
            }}
          />
        )}

        {/* Bottom Capabilities Bar */}
        <div className="p-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 text-xs text-gray-500">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-gray-700">Capabilities:</span>
            <Badge variant="emerald" className="text-[9px]">Card ✓</Badge>
            <Badge variant="emerald" className="text-[9px]">Password Presence ✓</Badge>
            <Badge variant="emerald" className="text-[9px]">Fingerprint Metadata ✓</Badge>
            <Badge variant="emerald" className="text-[9px]">Face Metadata ✓</Badge>
            <Badge variant="emerald" className="text-[9px]">Groups & TZ ✓</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
