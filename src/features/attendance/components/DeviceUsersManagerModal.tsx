// src/features/attendance/components/DeviceUsersManagerModal.tsx
// ============================================================================
// Joy PeopleHR — Complete Biometric Machine User Management Console
// Real TCP User Fetch → LAN Agent → Cloud → DB → Web App with Machine Details
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [mappingFilter, setMappingFilter] = useState<'ALL' | 'MAPPED' | 'UNMAPPED'>('ALL');
  const [activeView, setActiveView] = useState<'users' | 'history' | 'changes'>('users');
  const [syncHistory, setSyncHistory] = useState<DeviceUserSyncHistory[]>([]);

  // Selection for Bulk Mapping
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Sync Progress & Summary State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<any | null>(null);

  // Machine User Detail Drawer State
  const [selectedUserDetail, setSelectedUserDetail] = useState<BiometricDeviceUser | null>(null);
  const [userDetailHistory, setUserDetailHistory] = useState<BiometricDeviceUserHistory[]>([]);

  // Mapping Modal 2.0 State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedUserForMapping, setSelectedUserForMapping] = useState<BiometricDeviceUser | null>(null);
  const [isBulkMapModalOpen, setIsBulkMapModalOpen] = useState(false);

  // Unmap Confirmation Modal State
  const [isUnmapConfirmOpen, setIsUnmapConfirmOpen] = useState(false);
  const [userToUnmap, setUserToUnmap] = useState<BiometricDeviceUser | null>(null);

  // Remote Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPropagating, setIsPropagating] = useState(false);

  useEffect(() => {
    if (isOpen && device) {
      loadUsers();
      loadEmployees();
      loadHistory();
    }
  }, [isOpen, device, currentPage, searchQuery, mappingFilter]);

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
        loadUsers();
        loadHistory();
      }
    });

    // Realtime Mapping & device updates without page refresh
    const unsubMapCreated = hrEventBus.subscribe('biometric.mapping.created', () => {
      loadUsers();
    });

    const unsubMapRemoved = hrEventBus.subscribe('biometric.mapping.removed', () => {
      loadUsers();
    });

    const unsubBioUpdated = hrEventBus.subscribe('biometric.updated', () => {
      loadUsers();
    });

    const handleWindowUpdate = () => loadUsers();
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
  }, [isOpen, device]);

  const loadEmployees = async () => {
    try {
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadUsers = () => {
    if (!device) return;
    const res = biometricGatewayService.getDeviceUsers(device.id, {
      page: currentPage,
      pageSize,
      search: searchQuery,
      mappingStatus: mappingFilter,
    });
    setUsers(res.users);
    setTotalUsers(res.total);
  };

  const loadHistory = () => {
    if (!device) return;
    const hist = biometricGatewayService.getDeviceSyncHistory(device.id);
    setSyncHistory(hist);
  };

  const handleOpenUserDetail = (u: BiometricDeviceUser) => {
    if (!device) return;
    setSelectedUserDetail(u);
    const hist = biometricGatewayService.getDeviceUserHistory(device.id, u.device_user_id);
    setUserDetailHistory(hist);
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
      loadUsers();
      if (selectedUserDetail && selectedUserDetail.device_user_id === user.device_user_id) {
        const refreshed = biometricGatewayService.getDeviceUsers(device.id).users.find(x => x.device_user_id === user.device_user_id);
        if (refreshed) setSelectedUserDetail(refreshed);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unmap user', 'error');
    }
  };

  const handlePropagateAllMappings = async () => {
    setIsPropagating(true);
    try {
      const res = await biometricGatewayService.propagateMappingsAcrossDevices();
      showToast(`✓ Propagated employee mappings across ${res.deviceCount} hardware terminal(s)!`);
      loadUsers();
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
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;
  const capabilities = biometricGatewayService.getDeviceCapabilities(device.id);

  // Compute live summary statistics from store
  const allCurrentUsers = biometricGatewayService.getDeviceUsers(device.id, { pageSize: 5000 }).users;
  const mappedCount = allCurrentUsers.filter(u => u.is_mapped).length;
  const unmappedCount = allCurrentUsers.filter(u => !u.is_mapped).length;
  const disabledCount = allCurrentUsers.filter(u => !u.enabled).length;
  const missingCount = allCurrentUsers.filter(u => u.sync_status === 'NOT_PRESENT_ON_DEVICE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
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

        {/* Real-time Sync Progress Tracker */}
        {isSyncing && syncProgress && (
          <div className="p-4 bg-blue-50/80 border-b border-blue-200/80 flex items-center justify-between gap-4 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-700 animate-spin shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950">{syncProgress.status}:</span>
                  <span className="text-xs text-blue-800">{syncProgress.message}</span>
                </div>
                <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                  Job ID: {syncProgress.commandId} • Async LAN socket stream active. Do not close.
                </div>
              </div>
            </div>
            {syncProgress.receivedCount !== undefined && (
              <Badge variant="blue" className="text-xs font-mono font-bold">
                {syncProgress.receivedCount} Machine Users Received
              </Badge>
            )}
          </div>
        )}

        {/* Sync Summary Banner */}
        {lastSyncSummary && (
          <div className="p-4 bg-emerald-50/90 border-b border-emerald-200 flex items-center justify-between gap-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-950">User Synchronization Complete: </span>
                <span className="text-emerald-800">
                  {lastSyncSummary.fetched} fetched, {lastSyncSummary.new} new, {lastSyncSummary.updated} updated, {lastSyncSummary.unchanged} unchanged, {lastSyncSummary.unmapped} unmapped in {lastSyncSummary.durationSec}s.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('changes')}
                className="text-[11px] text-emerald-800 underline font-bold"
              >
                View Changes
              </button>
              <button
                onClick={() => setLastSyncSummary(null)}
                className="text-[11px] text-gray-500 hover:text-gray-700 font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY STATS METRIC CARDS */}
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 grid grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-gray-400 font-medium text-[11px]">Total Machine Users</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{allCurrentUsers.length}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-emerald-600 font-medium text-[11px]">Mapped to Employees</div>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">{mappedCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-amber-600 font-medium text-[11px]">Unmapped</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5">{unmappedCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-gray-500 font-medium text-[11px]">Disabled / Inactive</div>
            <div className="text-lg font-bold text-gray-700 mt-0.5">{disabledCount}</div>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-rose-600 font-medium text-[11px]">Missing on Device</div>
            <div className="text-lg font-bold text-rose-700 mt-0.5">{missingCount}</div>
          </div>
        </div>

        {/* VIEW 1: ENROLLED USERS DIRECTORY */}
        {activeView === 'users' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Machine ID, Name, Employee..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center rounded-xl bg-white border border-gray-200 p-0.5 text-xs">
                  <button
                    onClick={() => {
                      setMappingFilter('ALL');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition',
                      mappingFilter === 'ALL' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    All ({totalUsers})
                  </button>
                  <button
                    onClick={() => {
                      setMappingFilter('MAPPED');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition',
                      mappingFilter === 'MAPPED' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    Mapped ({mappedCount})
                  </button>
                  <button
                    onClick={() => {
                      setMappingFilter('UNMAPPED');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition',
                      mappingFilter === 'UNMAPPED' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    Unmapped ({unmappedCount})
                  </button>
                </div>
              </div>

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

                {selectedUserIds.size === 0 && unmappedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unmapped = users.filter(u => !u.is_mapped);
                      setSelectedUserIds(new Set(unmapped.map(u => u.device_user_id)));
                      setIsBulkMapModalOpen(true);
                    }}
                    className="text-xs font-bold border-blue-200 text-blue-800 hover:bg-blue-50 rounded-xl"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Bulk Map Unmapped ({unmappedCount})
                  </Button>
                )}

                <span className="text-gray-500 ml-2">
                  Showing <span className="font-bold text-gray-900">{users.length}</span> of <span className="font-bold text-gray-900">{totalUsers}</span> users
                </span>
              </div>
            </div>

            {/* User Records Table */}
            <div className="flex-1 overflow-y-auto p-5">
              {users.length === 0 ? (
                <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">No synchronized users yet</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    The terminal is online. Click the button below to initiate raw TCP user extraction via the LAN Gateway Agent.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs rounded-xl"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isSyncing && 'animate-spin')} />
                    Fetch Users From Device
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
                        <TableHead>Machine User ID</TableHead>
                        <TableHead>UID</TableHead>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Joy PeopleHR Mapping</TableHead>
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
                        const rawCard = u.card_number && u.card_number !== 'null' && u.card_number !== 'undefined' ? u.card_number : (u as any).credentials?.card?.uid;
                        const activeCard = rawCard ? String(rawCard).trim() : null;

                        const fpCount = Number(u.fingerprint_count || (u as any).credentials?.fingerprint?.count || 0);
                        const isFpEnrolled = fpCount > 0 || (u as any).credentials?.fingerprint?.status === 'ENROLLED';

                        const faceCred = (u as any).credentials?.face;
                        const isFaceEnrolled = Boolean(u.face_enrolled || (u as any).has_face_enrolled || faceCred?.status === 'ENROLLED');
                        const isFaceUnknown = !isFaceEnrolled && (faceCred?.status === 'UNKNOWN' || u.face_enrolled === null || u.face_enrolled === undefined);

                        return (
                          <TableRow key={u.device_user_id} className={cn('hover:bg-gray-50/50', isSelected && 'bg-blue-50/20')}>
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
                            <TableCell>
                              <div className="font-mono text-xs font-bold text-gray-900">
                                #{u.device_user_id}
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.device_user_uid ? (
                                <Badge variant="gray" className="text-[10px] font-mono">
                                  UID: {u.device_user_uid}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-mono">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-gray-900">
                              {u.name}
                            </TableCell>
                            <TableCell>
                              {u.is_mapped && u.mapped_employee_name ? (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <div>
                                    <div className="font-bold text-gray-900">{u.mapped_employee_name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">
                                      {u.mapped_employee_code} • {u.mapped_department || 'Engineering'}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Unmapped</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.privilege === 'ADMIN' || u.privilege === 'SUPERADMIN' ? 'purple' : 'gray'} className="text-[10px]">
                                {u.privilege}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={u.sync_status === 'NOT_PRESENT_ON_DEVICE' ? 'rose' : u.enabled ? 'emerald' : 'gray'}
                                className="text-[10px]"
                              >
                                {u.sync_status === 'NOT_PRESENT_ON_DEVICE' ? 'Missing' : u.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-800">
                              {activeCard ? (
                                <Badge variant="blue" size="sm" title="Verified from: Device Query" className="text-[10px] gap-1 font-semibold bg-blue-50 text-blue-800 border-blue-200 font-mono">
                                  🪪 #{activeCard}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No Card</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isFpEnrolled ? (
                                <Badge variant="emerald" size="sm" title="Verified from: Device Query" className="text-[10px] gap-1 font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                                  <Fingerprint className="w-3 h-3 text-[#07563D]" /> {fpCount || 1} Enrolled
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No FP</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isFaceEnrolled ? (
                                <Badge variant="emerald" size="sm" title="Verified from: Live Device Event" className="text-[10px] gap-1 font-semibold bg-emerald-50 text-emerald-800 border-emerald-300">
                                  <ScanFace className="w-3 h-3 text-[#07563D]" /> 1 Face Enrolled
                                </Badge>
                              ) : isFaceUnknown ? (
                                <Badge variant="gray" size="sm" title="Face template metadata is not verifiable over TCP SDK on Visible Light firmware without live event" className="text-[10px] text-gray-500 bg-gray-100 border-gray-200">
                                  Unknown
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-gray-400">No Face</span>
                              )}
                            </TableCell>
                            <TableCell className="text-[11px] text-gray-500">
                              <div>Group {u.group_id || '1'}</div>
                              <div className="text-[9px] text-gray-400">{u.timezone || 'Asia/Kolkata'}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenUserDetail(u)}
                                  title="View Machine User Details"
                                  className="p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {u.is_mapped ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUserForMapping(u);
                                        setIsMapModalOpen(true);
                                      }}
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
                                    onClick={() => {
                                      setSelectedUserForMapping(u);
                                      setIsMapModalOpen(true);
                                    }}
                                    className="text-[11px] h-7 px-2.5 rounded-lg border-blue-300 text-blue-800 bg-blue-50/50 hover:bg-blue-100 font-semibold"
                                  >
                                    <Link className="w-3 h-3 mr-1" /> Map Employee
                                  </Button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                <div>Page {currentPage} of {totalPages}</div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="text-xs rounded-xl"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="text-xs rounded-xl"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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

        {/* VIEW 3: LAST SYNC CHANGES BREAKDOWN */}
        {activeView === 'changes' && lastSyncSummary && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Last User Synchronization Breakdown</h4>
                <p className="text-xs text-gray-500">Changes detected between previous snapshot and physical terminal</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveView('users')} className="text-xs rounded-xl">
                Back to Directory
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="font-bold text-emerald-950 text-sm">New Machine Users</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">+{lastSyncSummary.new}</div>
                <p className="text-[11px] text-emerald-600 mt-1">Added to directory snapshot</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="font-bold text-blue-950 text-sm">Updated Attributes</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{lastSyncSummary.updated}</div>
                <p className="text-[11px] text-blue-600 mt-1">Names, cards, or biometrics modified</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                <div className="font-bold text-gray-950 text-sm">Unchanged Records</div>
                <div className="text-2xl font-bold text-gray-700 mt-1">{lastSyncSummary.unchanged}</div>
                <p className="text-[11px] text-gray-500 mt-1">Identical to local database</p>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="font-bold text-rose-950 text-sm">Missing on Device</div>
                <div className="text-2xl font-bold text-rose-700 mt-1">{lastSyncSummary.removed || 0}</div>
                <p className="text-[11px] text-rose-600 mt-1">Preserved for historical attendance</p>
              </div>
            </div>
          </div>
        )}

        {/* Machine User Details Drawer */}
        {selectedUserDetail && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-mono font-bold text-sm">
                  #{selectedUserDetail.device_user_id}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{selectedUserDetail.name}</h4>
                  <p className="text-xs text-gray-500">
                    Terminal: {device.device_name} ({device.ip_address}:{device.port})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 text-xs">
              {/* Card 1: Machine Identity */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Machine Identity
                </div>
                <div><span className="text-gray-500">User ID / PIN:</span> <span className="font-mono font-bold">#{selectedUserDetail.device_user_id}</span></div>
                <div><span className="text-gray-500">Machine UID:</span> <span className="font-mono">{selectedUserDetail.device_user_uid || 'Not reported'}</span></div>
                <div><span className="text-gray-500">Machine Name:</span> <span className="font-semibold">{selectedUserDetail.name}</span></div>
                <div><span className="text-gray-500">Privilege:</span> <span className="font-semibold">{selectedUserDetail.privilege}</span></div>
              </div>

              {/* Card 2: Credentials & Access */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-600" /> Credentials & Access
                </div>
                <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{selectedUserDetail.enabled ? 'Enabled' : 'Disabled'}</span></div>
                <div><span className="text-gray-500">Card Number:</span> <span className="font-mono">{selectedUserDetail.card_number || 'None'}</span></div>
                <div><span className="text-gray-500">Password Set:</span> <span className="font-semibold">{selectedUserDetail.password_configured ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-500">Group / TZ:</span> <span>Group {selectedUserDetail.group_id || '1'} ({selectedUserDetail.timezone || 'Asia/Kolkata'})</span></div>
              </div>

              {/* Card 3: Biometrics Evidence */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-600" /> Biometrics & Evidence
                </div>
                <div>
                  <span className="text-gray-500">Fingerprint:</span>{' '}
                  <span className="font-semibold">
                    {selectedUserDetail.fingerprint_count && selectedUserDetail.fingerprint_count > 0
                      ? `${selectedUserDetail.fingerprint_count} Enrolled (Device Query)`
                      : 'No Fingerprints'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Face:</span>{' '}
                  <span className="font-semibold">
                    {selectedUserDetail.face_enrolled
                      ? 'Enrolled (Verified Live Event)'
                      : (selectedUserDetail as any).credentials?.face?.status === 'UNKNOWN' || selectedUserDetail.face_enrolled === null
                      ? 'Unknown (Requires on-device registration / live punch)'
                      : 'No Face'}
                  </span>
                </div>
                <div><span className="text-gray-500">Palm:</span> <span className="text-gray-400">Not supported by model</span></div>
                <div><span className="text-gray-500">Iris:</span> <span className="text-gray-400">Not supported by model</span></div>
              </div>

              {/* Card 4: Joy PeopleHR Employee Mapping */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Joy PeopleHR Mapping
                </div>
                {selectedUserDetail.is_mapped ? (
                  <>
                    <div><span className="text-gray-500">Employee:</span> <span className="font-bold text-gray-900">{selectedUserDetail.mapped_employee_name}</span></div>
                    <div><span className="text-gray-500">Employee ID:</span> <span className="font-mono">{selectedUserDetail.mapped_employee_code}</span></div>
                    <div><span className="text-gray-500">Department:</span> <span>{selectedUserDetail.mapped_department || 'Engineering'}</span></div>
                    <div><span className="text-gray-500">Mapped By:</span> <span className="text-gray-600">{selectedUserDetail.mapped_by || 'Admin'}</span></div>
                  </>
                ) : (
                  <div className="text-amber-700 py-2">
                    <div className="font-bold">Not linked to employee</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUserForMapping(selectedUserDetail);
                        setIsMapModalOpen(true);
                      }}
                      className="mt-2 text-xs rounded-lg border-blue-300 text-blue-700"
                    >
                      <Link className="w-3 h-3 mr-1" /> Map Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Audit History of Changes for this Machine User */}
            {userDetailHistory.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 text-xs">
                <div className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-gray-500" /> Machine Audit Trail
                </div>
                <div className="space-y-1">
                  {userDetailHistory.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-gray-50 last:border-0">
                      <span className="font-mono text-gray-400">{new Date(h.recorded_at).toLocaleTimeString()}</span>
                      <Badge variant="gray" className="text-[10px]">{h.change_type}</Badge>
                      <span className="text-gray-700">{h.new_value || h.old_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAP EMPLOYEE MODAL 2.0 (AI suggestions, scoped search, cross-branch warnings & punch reprocessing) */}
        {isMapModalOpen && selectedUserForMapping && (
          <MapEmployeeModal
            isOpen={isMapModalOpen}
            onClose={() => {
              setIsMapModalOpen(false);
              setSelectedUserForMapping(null);
            }}
            device={device}
            machineUser={selectedUserForMapping}
            employees={employees}
            onMappingSuccess={() => {
              loadUsers();
              if (selectedUserDetail && selectedUserDetail.device_user_id === selectedUserForMapping.device_user_id) {
                const refreshed = biometricGatewayService.getDeviceUsers(device.id).users.find(x => x.device_user_id === selectedUserForMapping.device_user_id);
                if (refreshed) setSelectedUserDetail(refreshed);
              }
            }}
          />
        )}

        {/* BULK MAP MODAL (Multi-user match review & high confidence approval) */}
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
              loadUsers();
              setSelectedUserIds(new Set());
            }}
          />
        )}

        {/* UNMAP CONFIRMATION MODAL */}
        {isUnmapConfirmOpen && userToUnmap && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
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

        {/* REMOTE BIOMETRIC ENROLLMENT MODAL 2.0 (Employee-first, PIN collision check & real sensor progression) */}
        {isEnrollModalOpen && (
          <RemoteBiometricEnrollmentModal
            isOpen={isEnrollModalOpen}
            onClose={() => setIsEnrollModalOpen(false)}
            device={device}
            employees={employees}
            onEnrollmentSuccess={() => {
              loadUsers();
            }}
          />
        )}

        {/* Footer with Device Capabilities Checklist */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 text-xs text-gray-500">
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
