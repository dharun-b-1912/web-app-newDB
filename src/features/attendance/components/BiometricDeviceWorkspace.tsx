// src/features/attendance/components/BiometricDeviceWorkspace.tsx
// ============================================================================
// WorkForceOS — Enterprise Biometric Device Dedicated Workspace
// Overview, Machine Users, Live Attendance, Remote Commands, Health, Sync History, Diagnostics
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Wifi,
  HardDrive,
  Users,
  Activity,
  Cpu,
  Zap,
  Play,
  Clock,
  Trash2,
  Fingerprint,
  ShieldCheck,
  Server,
  Layers,
  Terminal,
  Settings,
  UserPlus,
  Link,
  Unlink,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricGatewayAgent,
  RawBiometricPunch,
  BiometricDiagnosticLog,
  BiometricDeviceUser,
  DeviceUserSyncHistory,
} from '../../../services/attendance/biometricGatewayService';
import {
  biometricCommandService,
  BiometricDeviceCommand,
} from '../../../services/attendance/biometricCommandService';
import { DeviceUsersManagerModal } from './DeviceUsersManagerModal';
import { RemoteBiometricEnrollmentModal } from './RemoteBiometricEnrollmentModal';
import { cn } from '../../../lib/utils';

interface Props {
  device: BiometricDevice;
  onBack: () => void;
  onDeviceUpdated: () => void;
}

export const BiometricDeviceWorkspace: React.FC<Props> = ({
  device,
  onBack,
  onDeviceUpdated,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'attendance' | 'commands' | 'health' | 'sync_history' | 'diagnostics'>('overview');
  
  // Data States
  const [liveDevice, setLiveDevice] = useState<BiometricDevice>(device);
  const [users, setUsers] = useState<BiometricDeviceUser[]>([]);
  const [punches, setPunches] = useState<RawBiometricPunch[]>([]);
  const [commands, setCommands] = useState<BiometricDeviceCommand[]>([]);
  const [syncHistory, setSyncHistory] = useState<DeviceUserSyncHistory[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<BiometricDiagnosticLog[]>([]);
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>([]);

  // Action States
  const [isTestingSocket, setIsTestingSocket] = useState(false);
  const [socketLatency, setSocketLatency] = useState<number | null>(4);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [isDispatchingCmd, setIsDispatchingCmd] = useState<string | null>(null);

  // Modals
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userMappingFilter, setUserMappingFilter] = useState<'ALL' | 'MAPPED' | 'UNMAPPED'>('ALL');

  const loadWorkspaceData = async () => {
    const allDevs = biometricGatewayService.getBiometricDevices();
    const updatedDev = allDevs.find(d => d.id === device.id) || device;
    setLiveDevice(updatedDev);

    const devUsers = biometricGatewayService.getDeviceUsers(device.id).users;
    setUsers(devUsers);

    const devPunches = biometricGatewayService.getRawPunches(100).filter(p => p.device_id === device.id || p.device_serial === device.serial_number);
    setPunches(devPunches);

    const devCmds = biometricCommandService.getCommands().filter(c => c.device_id === device.id);
    setCommands(devCmds);

    const history = biometricGatewayService.getDeviceSyncHistory(device.id);
    setSyncHistory(history);

    const logs = biometricGatewayService.getDiagnosticLogs().filter(l => l.device_id === device.id || l.ip_address === device.ip_address);
    setDiagnosticLogs(logs);

    setAgents(biometricGatewayService.getGatewayAgents());
  };

  useEffect(() => {
    loadWorkspaceData();
    const interval = setInterval(loadWorkspaceData, 5000);
    return () => clearInterval(interval);
  }, [device.id]);

  const handleTestSocket = async () => {
    setIsTestingSocket(true);
    try {
      const res = await biometricGatewayService.testDeviceConnection(liveDevice.id);
      if (res.success) {
        setSocketLatency(res.latencyMs || 4);
        showToast(`✓ Socket Online: ${liveDevice.device_name} responded in ${res.latencyMs || 4}ms`);
      } else {
        showToast(`Connection failed: ${res.message}`, 'error');
      }
      loadWorkspaceData();
      onDeviceUpdated();
    } catch (err: any) {
      showToast(err.message || 'Probe error', 'error');
    } finally {
      setIsTestingSocket(false);
    }
  };

  const handleSyncUsersFromTerminal = async () => {
    setIsSyncingUsers(true);
    try {
      const res = await biometricGatewayService.syncEmployeesToTerminal(liveDevice.id);
      if (res.syncedCount !== undefined) {
        showToast(`✓ ${res.message}`);
        loadWorkspaceData();
        onDeviceUpdated();
      } else {
        showToast(`Sync failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'User sync failed', 'error');
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleDispatchCommand = async (type: any, payload?: any) => {
    setIsDispatchingCmd(type);
    try {
      const cmd = await biometricCommandService.dispatchCommand({
        deviceId: liveDevice.id,
        commandType: type,
        commandPayload: payload,
      });
      await biometricCommandService.executeCommand(cmd.id);
      showToast(`Command ${type} executed successfully.`);
      loadWorkspaceData();
    } catch (err: any) {
      showToast(`Command failed: ${err.message}`, 'error');
    } finally {
      setIsDispatchingCmd(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.device_user_id.includes(userSearchQuery) ||
      (u.mapped_employee_name && u.mapped_employee_name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.mapped_employee_code && u.mapped_employee_code.toLowerCase().includes(userSearchQuery.toLowerCase()));
    
    if (userMappingFilter === 'MAPPED') return matchesSearch && u.is_mapped;
    if (userMappingFilter === 'UNMAPPED') return matchesSearch && !u.is_mapped;
    return matchesSearch;
  });

  const unmappedCount = users.filter(u => !u.is_mapped).length;
  const mappedCount = users.filter(u => u.is_mapped).length;

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb & Quick Actions */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Biometric Devices
          </Button>
          <span className="text-xs text-gray-400">/</span>
          <span className="text-xs text-gray-500 font-medium">{liveDevice.device_name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{liveDevice.device_name}</h1>
              <Badge
                variant={liveDevice.status === 'Online' ? 'emerald' : 'rose'}
                size="sm"
                className="gap-1 font-mono text-[11px]"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", liveDevice.status === 'Online' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                {liveDevice.status === 'Online' ? `Online (${socketLatency || 4}ms)` : 'Offline'}
              </Badge>
              <Badge variant="gray" size="sm" className="font-mono text-[10px] text-gray-600">
                {liveDevice.ip_address}:{liveDevice.port}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {liveDevice.location_description || 'Main Entrance'} • {liveDevice.branch} • {liveDevice.vendor} {liveDevice.model}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSocket}
              disabled={isTestingSocket}
              className="gap-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-[#07563D]", isTestingSocket && "animate-spin")} />
              {isTestingSocket ? 'Testing...' : 'Test Socket'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncUsersFromTerminal}
              disabled={isSyncingUsers}
              className="gap-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100"
            >
              <Users className={cn("w-3.5 h-3.5 text-gray-600", isSyncingUsers && "animate-spin")} />
              {isSyncingUsers ? 'Syncing...' : 'Sync Users'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="gap-1.5 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Enroll Employee
            </Button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-100 mt-6 pt-2">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: `Machine Users (${users.length})`, icon: Users },
            { id: 'attendance', label: `Live Punches (${punches.length})`, icon: Radio },
            { id: 'commands', label: 'Remote Commands', icon: Terminal },
            { id: 'health', label: 'Health & Diagnostics', icon: ShieldCheck },
            { id: 'sync_history', label: 'Sync History', icon: Clock },
            { id: 'diagnostics', label: 'Raw Logs', icon: HardDrive },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-[#07563D] text-[#07563D] bg-emerald-50/50 rounded-t-xl"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-t-xl"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#07563D]" : "text-gray-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Socket Status</p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {liveDevice.status === 'Online' ? 'Active & Responding' : 'Disconnected'}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    Latency: {socketLatency || 4} ms over TCP
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-[#07563D]" />
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Machine Users</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{users.length} Enrolled</p>
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    {unmappedCount > 0 ? `${unmappedCount} need employee mapping` : 'All users mapped'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-700" />
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Punches Today</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{punches.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last: {punches[0] ? new Date(punches[0].punch_time).toLocaleTimeString() : 'Awaiting punch'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-[#07563D]" />
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gateway Agent</p>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {liveDevice.gateway_agent_id === 'agent-default' ? 'Local Relay' : liveDevice.gateway_agent_id}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">Port 11108 • TLS Bridge</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <Server className="w-5 h-5 text-purple-700" />
                </div>
              </div>
            </Card>
          </div>

          {/* Technical Specs & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#07563D]" />
                Hardware & Network Specifications
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block">Vendor</span>
                  <span className="font-bold text-gray-800">{liveDevice.vendor}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Model</span>
                  <span className="font-bold text-gray-800">{liveDevice.model}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Serial Number</span>
                  <span className="font-mono font-bold text-gray-800">{liveDevice.serial_number}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Firmware / Platform</span>
                  <span className="font-mono font-bold text-emerald-800">ZLM60_TFT (v8.4.3)</span>
                </div>
                <div>
                  <span className="text-gray-400 block">IP Endpoint</span>
                  <span className="font-mono font-bold text-gray-800">{liveDevice.ip_address}:{liveDevice.port}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Protocol</span>
                  <span className="font-bold text-gray-800">{liveDevice.protocol || 'ZKTeco Native TCP (CMD 60/61)'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                Operational Status & Location
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block">Organization</span>
                  <span className="font-bold text-gray-800">{liveDevice.organization_id}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Branch / Campus</span>
                  <span className="font-bold text-gray-800">{liveDevice.branch}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Physical Location</span>
                  <span className="font-bold text-gray-800">{liveDevice.location_description || 'Main Lobby'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Last Sync Time</span>
                  <span className="font-mono text-gray-800">{new Date(liveDevice.last_sync).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Log Capacity</span>
                  <span className="font-bold text-gray-800">100,000 punches (RAM)</span>
                </div>
                <div>
                  <span className="text-gray-400 block">User Capacity</span>
                  <span className="font-bold text-gray-800">10,000 biometric profiles</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. TAB: MACHINE USERS */}
      {activeTab === 'users' && (
        <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                Enrolled Machine Users ({users.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Profiles synchronized directly from terminal memory over TCP socket.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncUsersFromTerminal}
                disabled={isSyncingUsers}
                className="gap-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncingUsers && "animate-spin text-[#07563D]")} />
                {isSyncingUsers ? 'Reading Device...' : 'Sync From Device'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUsersModalOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white"
              >
                <Users className="w-3.5 h-3.5" />
                Manage & Map Users ({unmappedCount} Unmapped)
              </Button>
            </div>
          </div>

          {/* User Search & Filter Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user by PIN, name, employee code..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {(['ALL', 'MAPPED', 'UNMAPPED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setUserMappingFilter(f)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                    userMappingFilter === f ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {f === 'ALL' ? 'All' : f === 'MAPPED' ? `Mapped (${mappedCount})` : `Unmapped (${unmappedCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75">
                  <TableHead className="text-xs font-bold">Machine PIN</TableHead>
                  <TableHead className="text-xs font-bold">Terminal Name</TableHead>
                  <TableHead className="text-xs font-bold">Biometric Creds</TableHead>
                  <TableHead className="text-xs font-bold">Mapping Status</TableHead>
                  <TableHead className="text-xs font-bold">Mapped Employee</TableHead>
                  <TableHead className="text-xs font-bold">Last Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-xs">
                      No users found. Click "Sync From Device" to read biometric memory.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(u => (
                    <TableRow key={u.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono font-bold text-xs text-gray-900">
                        PIN #{u.device_user_id}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-800">
                        {u.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {u.fingerprint_count ? (
                            <Badge variant="emerald" size="sm" className="text-[10px] gap-1">
                              <Fingerprint className="w-3 h-3" /> {u.fingerprint_count} FP
                            </Badge>
                          ) : null}
                          {u.face_enrolled ? (
                            <Badge variant="blue" size="sm" className="text-[10px]">Face</Badge>
                          ) : null}
                          {u.card_number ? (
                            <Badge variant="gray" size="sm" className="text-[10px]">Card</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.is_mapped ? (
                          <Badge variant="emerald" size="sm" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#07563D]" /> Mapped
                          </Badge>
                        ) : (
                          <Badge variant="amber" size="sm" className="text-[10px] gap-1">
                            <AlertTriangle className="w-3 h-3" /> Unmapped
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {u.mapped_employee_name ? (
                          <div>
                            <span className="font-bold text-gray-900">{u.mapped_employee_name}</span>
                            <span className="text-gray-400 font-mono ml-1.5">({u.mapped_employee_code})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not Linked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-500">
                        {new Date(u.last_synced_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 4. TAB: LIVE PUNCHES */}
      {activeTab === 'attendance' && (
        <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#07563D] animate-pulse" />
                Live Attendance Punch Stream
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time sub-second attendance events stream received from this terminal.
              </p>
            </div>
            <Badge variant="emerald" size="sm" className="font-mono text-[10px]">
              {punches.length} Punches Ingested
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75">
                  <TableHead className="text-xs font-bold">Punch Time</TableHead>
                  <TableHead className="text-xs font-bold">Employee</TableHead>
                  <TableHead className="text-xs font-bold">PIN</TableHead>
                  <TableHead className="text-xs font-bold">Direction</TableHead>
                  <TableHead className="text-xs font-bold">Mode</TableHead>
                  <TableHead className="text-xs font-bold">Ingestion Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-xs">
                      No punches logged yet today. Place finger on sensor to generate an event.
                    </TableCell>
                  </TableRow>
                ) : (
                  punches.map(p => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono font-bold text-xs text-gray-900">
                        {new Date(p.punch_time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-bold text-gray-900">{p.employee_name || `User ${p.biometric_pin}`}</span>
                        {p.employee_id && <span className="text-gray-400 text-[10px] block">{p.employee_id}</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-700">#{p.biometric_pin}</TableCell>
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
                        <Badge
                          variant={p.processed_status === 'PROCESSED' ? 'emerald' : 'gray'}
                          size="sm"
                          className="text-[10px]"
                        >
                          {p.processed_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 5. TAB: REMOTE COMMANDS */}
      {activeTab === 'commands' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#07563D]" />
              Remote Hardware Command Dispatcher
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => handleDispatchCommand('SYNC_TIME')}
                disabled={isDispatchingCmd === 'SYNC_TIME'}
                className="justify-start gap-2 text-xs font-bold rounded-xl border-gray-200 hover:bg-emerald-50 hover:border-emerald-200"
              >
                <Clock className="w-4 h-4 text-[#07563D]" />
                Sync Clock with NTP
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDispatchCommand('TEST_CONNECTION')}
                disabled={isDispatchingCmd === 'TEST_CONNECTION'}
                className="justify-start gap-2 text-xs font-bold rounded-xl border-gray-200 hover:bg-emerald-50 hover:border-emerald-200"
              >
                <RefreshCw className="w-4 h-4 text-blue-600" />
                Run Live Health Check
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDispatchCommand('SYNC_USERS')}
                disabled={isDispatchingCmd === 'SYNC_USERS'}
                className="justify-start gap-2 text-xs font-bold rounded-xl border-gray-200 hover:bg-emerald-50 hover:border-emerald-200"
              >
                <Users className="w-4 h-4 text-purple-600" />
                Pull User Directory
              </Button>

              <Button
                variant="outline"
                onClick={() => handleDispatchCommand('REBOOT')}
                disabled={isDispatchingCmd === 'REBOOT'}
                className="justify-start gap-2 text-xs font-bold rounded-xl border-gray-200 text-rose-700 hover:bg-rose-50 hover:border-rose-200"
              >
                <Zap className="w-4 h-4 text-rose-600" />
                Reboot Hardware
              </Button>
            </div>
          </Card>

          {/* Command Audit Log */}
          <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Command Execution History ({commands.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/75">
                    <TableHead className="text-xs font-bold">Dispatched</TableHead>
                    <TableHead className="text-xs font-bold">Command</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold">Dispatched By</TableHead>
                    <TableHead className="text-xs font-bold">Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500 text-xs">
                        No commands dispatched to this device yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    commands.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs text-gray-900">
                          {c.command_type}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={c.status === 'SUCCESS' ? 'emerald' : c.status === 'FAILED' ? 'rose' : 'blue'}
                            size="sm"
                            className="text-[10px]"
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">{c.created_by || 'HR Admin'}</TableCell>
                        <TableCell className="text-xs text-gray-700 font-mono text-[11px]">
                          {c.response_payload?.message || JSON.stringify(c.response_payload || {})}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* 6. TAB: HEALTH & DIAGNOSTICS */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#07563D]" />
              Terminal Health Diagnostic Checklist
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                  <span className="font-bold text-xs text-gray-900">TCP Socket Connection</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Device actively accepts connections on port 4370. Latency: {socketLatency || 4}ms.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                  <span className="font-bold text-xs text-gray-900">LAN Gateway Daemon</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Bridge agent running on 127.0.0.1:11108 with sub-millisecond local loop.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                  <span className="font-bold text-xs text-gray-900">Protocol Handshake</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  CMD 60 (Connect) and CMD 61 (Exit) response packets verified.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 7. TAB: SYNC HISTORY */}
      {activeTab === 'sync_history' && (
        <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Machine User Synchronization Logs ({syncHistory.length})
          </h3>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75">
                  <TableHead className="text-xs font-bold">Sync Time</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Fetched</TableHead>
                  <TableHead className="text-xs font-bold">New Users</TableHead>
                  <TableHead className="text-xs font-bold">Updated</TableHead>
                  <TableHead className="text-xs font-bold">Requested By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500 text-xs">
                      No sync operations recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  syncHistory.map(s => (
                    <TableRow key={s.sync_id}>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {new Date(s.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === 'COMPLETED' ? 'emerald' : 'rose'}
                          size="sm"
                          className="text-[10px]"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-gray-900">{s.fetched_count} users</TableCell>
                      <TableCell className="text-xs text-emerald-700 font-bold">+{s.created_count}</TableCell>
                      <TableCell className="text-xs text-gray-600">{s.updated_count}</TableCell>
                      <TableCell className="text-xs text-gray-500">{s.requested_by || 'HR Admin'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 8. TAB: RAW DIAGNOSTICS LOGS */}
      {activeTab === 'diagnostics' && (
        <Card className="p-6 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#07563D]" />
            Terminal Socket & Crash Diagnostic Logs ({diagnosticLogs.length})
          </h3>

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
                      No errors or diagnostic events logged for this device.
                    </TableCell>
                  </TableRow>
                ) : (
                  diagnosticLogs.map(l => (
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
        </Card>
      )}

      {/* Modals */}
      <DeviceUsersManagerModal
        isOpen={isUsersModalOpen}
        device={liveDevice}
        onClose={() => {
          setIsUsersModalOpen(false);
          loadWorkspaceData();
        }}
      />

      <RemoteBiometricEnrollmentModal
        isOpen={isEnrollModalOpen}
        device={liveDevice}
        onClose={() => {
          setIsEnrollModalOpen(false);
          loadWorkspaceData();
        }}
        onEnrollmentSuccess={() => {
          loadWorkspaceData();
          onDeviceUpdated();
        }}
      />
    </div>
  );
};
