// src/features/attendance/components/DeviceUsersManagerModal.tsx
// ============================================================================
// WorkForceOS — Enterprise Biometric Hardware User Manager & Sync Console
// Real TCP User Fetch → LAN Agent → Cloud → DB → Web App with Live Progress
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
  DeviceUserSyncHistory,
  SyncProgressEvent,
} from '../../../services/attendance/biometricGatewayService';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

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
  const [activeView, setActiveView] = useState<'users' | 'history'>('users');
  const [syncHistory, setSyncHistory] = useState<DeviceUserSyncHistory[]>([]);

  // Sync Progress & Summary State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressEvent | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<any | null>(null);

  // Mapping Drawer State
  const [selectedUserForMapping, setSelectedUserForMapping] = useState<BiometricDeviceUser | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Remote Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollPin, setEnrollPin] = useState('1005');
  const [enrollEmpId, setEnrollEmpId] = useState('');
  const [enrollFingerIndex, setEnrollFingerIndex] = useState(0);
  const [isTriggeringEnroll, setIsTriggeringEnroll] = useState(false);
  const [enrollFeedback, setEnrollFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && device) {
      loadUsers();
      loadEmployees();
      loadHistory();
    }
  }, [isOpen, device, currentPage, searchQuery, mappingFilter]);

  // Realtime Sync Event Listeners
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

    return () => {
      unsubStarted();
      unsubProgress();
      unsubCompleted();
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

  const handleTriggerSync = async () => {
    if (!device || isSyncing) return;
    try {
      const res = await biometricGatewayService.triggerDeviceUserSync(device.id, 'IT Administrator');
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || 'Failed to start user sync', 'error');
    }
  };

  const handleMapUser = async () => {
    if (!device || !selectedUserForMapping || !selectedEmployeeId) return;
    try {
      await biometricGatewayService.mapDeviceUserToEmployee(
        device.id,
        selectedUserForMapping.device_user_id,
        selectedEmployeeId,
        'IT Administrator'
      );
      showToast(`PIN #${selectedUserForMapping.device_user_id} mapped to employee profile.`);
      setSelectedUserForMapping(null);
      setSelectedEmployeeId('');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to map user', 'error');
    }
  };

  const handleUnmapUser = async (user: BiometricDeviceUser) => {
    if (!device) return;
    try {
      await biometricGatewayService.unmapDeviceUser(device.id, user.device_user_id);
      showToast(`PIN #${user.device_user_id} unmapped successfully.`);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to unmap user', 'error');
    }
  };

  const handleTriggerEnrollment = async () => {
    if (!device || !enrollPin.trim()) return;
    setIsTriggeringEnroll(true);
    setEnrollFeedback(null);

    const emp = employees.find(e => e.id === enrollEmpId);
    const empName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : `User ${enrollPin}`;

    try {
      const res = await biometricGatewayService.triggerRemoteEnrollment(device.id, {
        pin: enrollPin.trim(),
        fingerIndex: Number(enrollFingerIndex),
        userName: empName,
      });

      setEnrollFeedback(res.message);
      showToast(res.message);

      if (enrollEmpId) {
        await biometricGatewayService.mapDeviceUserToEmployee(device.id, enrollPin.trim(), enrollEmpId, 'IT Administrator');
      }

      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger enrollment', 'error');
    } finally {
      setIsTriggeringEnroll(false);
    }
  };

  if (!isOpen || !device) return null;

  const lastSync = biometricGatewayService.getLastSyncForDevice(device.id);
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  // Filter employees for mapping search
  const filteredEmployeesForMapping = employees.filter(e => {
    const term = employeeSearch.toLowerCase().trim();
    if (!term) return true;
    const name = (e.display_name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();
    const code = (e.employee_code || e.employee_id || e.id).toLowerCase();
    return name.includes(term) || code.includes(term);
  });

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
                {lastSync && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    Last Synced: {new Date(lastSync.completed_at || lastSync.started_at).toLocaleTimeString()}
                  </span>
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
              onClick={() => setActiveView(activeView === 'users' ? 'history' : 'users')}
              className="text-xs rounded-xl border-gray-200"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              {activeView === 'users' ? 'Sync History' : 'View Users'}
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
                {syncProgress.receivedCount} Users Received
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
            <button
              onClick={() => setLastSyncSummary(null)}
              className="text-[11px] text-emerald-700 hover:underline font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

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
                    placeholder="Search User ID, name, employee..."
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
                    Mapped
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
                    Unmapped
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Showing <span className="font-bold text-gray-900">{users.length}</span> of <span className="font-bold text-gray-900">{totalUsers}</span> users
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
                        <TableHead>User ID (PIN)</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Privilege</TableHead>
                        <TableHead>Card</TableHead>
                        <TableHead>Fingerprint</TableHead>
                        <TableHead>Face</TableHead>
                        <TableHead>Employee Mapping</TableHead>
                        <TableHead>Sync Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.device_user_id} className="hover:bg-gray-50/50">
                          <TableCell className="font-mono text-xs font-bold text-gray-900">
                            #{u.device_user_id}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-gray-900">
                            {u.display_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.privilege === 'ADMIN' ? 'purple' : 'gray'} className="text-[10px]">
                              {u.privilege}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {u.card_number || '—'}
                          </TableCell>
                          <TableCell>
                            {u.fingerprint_count > 0 ? (
                              <Badge variant="blue" className="text-[10px] gap-1">
                                <Fingerprint className="w-3 h-3" /> {u.fingerprint_count} FP
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.face_enrolled ? (
                              <Badge variant="emerald" className="text-[10px] gap-1">
                                <ScanFace className="w-3 h-3" /> Enrolled
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-gray-400">No Face</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {u.is_mapped && u.mapped_employee_name ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="font-bold text-gray-900">{u.mapped_employee_name}</span>
                                  <span className="text-gray-400 font-mono ml-1.5">({u.mapped_employee_code})</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                <span>Unmapped</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.sync_status === 'SYNCED' ? 'emerald' : u.sync_status === 'NOT_PRESENT_ON_DEVICE' ? 'rose' : 'amber'}
                              className="text-[10px]"
                            >
                              {u.sync_status === 'NOT_PRESENT_ON_DEVICE' ? 'Missing on Terminal' : u.sync_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.is_mapped ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserForMapping(u);
                                      setEmployeeSearch(u.mapped_employee_name || '');
                                      setSelectedEmployeeId(u.mapped_employee_id || '');
                                    }}
                                    className="text-[11px] h-7 px-2 rounded-lg border-gray-200 text-gray-600 hover:text-blue-700"
                                  >
                                    <Link className="w-3 h-3 mr-1" /> Re-map
                                  </Button>
                                  <button
                                    onClick={() => handleUnmapUser(u)}
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
                                    setEmployeeSearch(u.display_name);
                                    setSelectedEmployeeId('');
                                  }}
                                  className="text-[11px] h-7 px-2.5 rounded-lg border-blue-300 text-blue-800 bg-blue-50/50 hover:bg-blue-100 font-semibold"
                                >
                                  <Link className="w-3 h-3 mr-1" /> Map Employee
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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

        {/* Map Employee Search Drawer */}
        {selectedUserForMapping && (
          <div className="p-5 border-t border-gray-200 bg-blue-50/70 space-y-3 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">
                    Link Terminal User #{selectedUserForMapping.device_user_id} ({selectedUserForMapping.display_name})
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Search and associate with an active WorkForceOS employee record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForMapping(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Type employee name or code (e.g. Arun Kumar, EMP-001)..."
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden"
                />
              </div>

              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-72 p-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-hidden font-medium"
              >
                <option value="">-- Select Matching Employee ({filteredEmployeesForMapping.length}) --</option>
                {filteredEmployeesForMapping.map(emp => {
                  const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                  const code = emp.employee_code || emp.employee_id || emp.id;
                  const dept = emp.department_name || emp.department || 'Operations';
                  return (
                    <option key={emp.id} value={emp.id}>
                      {name} ({code}) • {dept}
                    </option>
                  );
                })}
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleMapUser}
                disabled={!selectedEmployeeId}
                className="text-xs rounded-xl bg-blue-700 hover:bg-blue-800 text-white"
              >
                Confirm Link
              </Button>
            </div>
          </div>
        )}

        {/* Remote Biometric Enrollment Modal */}
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Remote Biometric Enrollment</h4>
                    <p className="text-[10px] text-gray-500 font-mono">Terminal {device.ip_address}:{device.port}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Employee to Enroll</label>
                  <select
                    value={enrollEmpId}
                    onChange={e => {
                      setEnrollEmpId(e.target.value);
                      const emp = employees.find(x => x.id === e.target.value);
                      if (emp && emp.employee_code) {
                        setEnrollPin(emp.employee_code.replace(/[^0-9]/g, '') || '1005');
                      }
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-gray-200 bg-white font-medium"
                  >
                    <option value="">-- Choose Employee (Optional) --</option>
                    {employees.map(emp => {
                      const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                      const empCode = emp.employee_code || emp.employee_id || emp.id;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {empName} ({empCode})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Terminal User PIN *</label>
                    <input
                      type="text"
                      value={enrollPin}
                      onChange={e => setEnrollPin(e.target.value)}
                      placeholder="e.g. 1005"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Finger Index *</label>
                    <select
                      value={enrollFingerIndex}
                      onChange={e => setEnrollFingerIndex(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-xl border border-gray-200 bg-white"
                    >
                      <option value={0}>Right Thumb (#0)</option>
                      <option value={1}>Right Index (#1)</option>
                      <option value={2}>Right Middle (#2)</option>
                      <option value={6}>Left Thumb (#6)</option>
                      <option value={7}>Left Index (#7)</option>
                    </select>
                  </div>
                </div>

                {enrollFeedback && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Terminal Sensor Active
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">{enrollFeedback}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)} className="rounded-xl text-xs">
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isTriggeringEnroll || !enrollPin.trim()}
                  onClick={handleTriggerEnrollment}
                  className="rounded-xl text-xs bg-[#07563D] hover:bg-[#0b7a57] text-white"
                >
                  <Zap className={cn('w-3.5 h-3.5 mr-1', isTriggeringEnroll && 'animate-spin')} />
                  {isTriggeringEnroll ? 'Sending CMD_STARTENROLL...' : 'Trigger Sensor on Device'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 text-xs text-gray-500">
          <div>
            Gateway Agent: <span className="font-mono text-gray-700 font-semibold">{device.gateway_agent_id} (Zero-Port Forwarding Active)</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
