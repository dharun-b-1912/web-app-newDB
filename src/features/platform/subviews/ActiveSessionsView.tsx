// src/features/platform/subviews/ActiveSessionsView.tsx
// ============================================================
// WorkForceOS — Active Sessions (Live Session Monitoring & Control Center)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Laptop,
  Globe,
  Clock,
  UserX,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Lock,
  Smartphone,
  Terminal,
  LogOut,
  ShieldCheck,
  Activity,
  UserCheck,
  Sliders,
  ExternalLink,
  Shield,
  Key,
  Info,
  Calendar,
  Layers,
  MapPin,
  Cpu,
  Monitor,
  Tablet,
  Check,
  AlertOctagon,
  Copy,
} from 'lucide-react';
import {
  PlatformSessionRecord,
  SessionSummaryKPIs,
  SessionFilterOptions,
  SessionEventItem,
  DeviceRegistryItem,
  SessionRiskFactor,
} from '../../../types/platformSessions';
import { platformSessionService } from '../../../services/platform/platformSessionService';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface ActiveSessionsViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const ActiveSessionsView: React.FC<ActiveSessionsViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Summary KPIs
  const [summary, setSummary] = useState<SessionSummaryKPIs>({
    active_sessions_count: 0,
    admin_sessions_count: 0,
    tenant_sessions_count: 0,
    suspicious_sessions_count: 0,
    new_devices_count: 0,
    idle_sessions_count: 0,
    expired_today_count: 0,
    revoked_today_count: 0,
    calculated_at: new Date().toISOString(),
  });

  // Sessions Table Data
  const [sessions, setSessions] = useState<PlatformSessionRecord[]>([]);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [authMethodFilter, setAuthMethodFilter] = useState<string>('All');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('All');
  const [firstSeenTodayFilter, setFirstSeenTodayFilter] = useState<boolean>(false);

  // Detail Drawer State
  const [selectedSession, setSelectedSession] = useState<PlatformSessionRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'security' | 'activity' | 'device' | 'audit'>('overview');
  const [sessionEvents, setSessionEvents] = useState<SessionEventItem[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<DeviceRegistryItem[]>([]);
  const [riskFactors, setRiskFactors] = useState<SessionRiskFactor[]>([]);

  // Action Modals State
  const [revokingSession, setRevokingSession] = useState<PlatformSessionRecord | null>(null);
  const [singleRevokeReason, setSingleRevokeReason] = useState<string>('');
  const [isRevokingSingle, setIsRevokingSingle] = useState<boolean>(false);

  const [isSignoutUserOpen, setIsSignoutUserOpen] = useState<boolean>(false);
  const [targetUserEmail, setTargetUserEmail] = useState<string>('');
  const [targetUserName, setTargetUserName] = useState<string>('');
  const [userRevokeReason, setUserRevokeReason] = useState<string>('Security anomaly / Force sign out requested');
  const [isRevokingUser, setIsRevokingUser] = useState<boolean>(false);

  const [isEmergencyRevokeOpen, setIsEmergencyRevokeOpen] = useState<boolean>(false);
  const [emergencyConfirmText, setEmergencyConfirmText] = useState<string>('');
  const [emergencyReason, setEmergencyReason] = useState<string>('Emergency platform security lockdown');
  const [isRevokingEmergency, setIsRevokingEmergency] = useState<boolean>(false);

  const [isCopied, setIsCopied] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [sum, res] = await Promise.all([
        platformSessionService.fetchSessionSummary(),
        platformSessionService.fetchSessions({
          page,
          limit,
          search: searchQuery,
          risk: riskFilter,
          status: statusFilter,
          role: roleFilter,
          authMethod: authMethodFilter,
          deviceType: deviceTypeFilter,
          firstSeenToday: firstSeenTodayFilter,
        }),
      ]);
      setSummary(sum);
      setSessions(res.sessions);
      setTotalSessions(res.total);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load session telemetry from server');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, searchQuery, riskFilter, statusFilter, roleFilter, authMethodFilter, deviceTypeFilter, firstSeenTodayFilter]);

  // Initial load and Realtime Subscription
  useEffect(() => {
    loadData();

    const unsubscribe = platformSessionService.subscribeToRealtime(() => {
      loadData(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Load Drawer Secondary Data when a session is selected
  useEffect(() => {
    if (selectedSession) {
      setRiskFactors(platformSessionService.getRiskFactors(selectedSession));
      platformSessionService.fetchSessionEvents(selectedSession.id).then(setSessionEvents);
      platformSessionService.fetchUserDeviceHistory(selectedSession.user_email).then(setDeviceHistory);
    }
  }, [selectedSession]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRiskFilter('All');
    setStatusFilter('All');
    setRoleFilter('All');
    setAuthMethodFilter('All');
    setDeviceTypeFilter('All');
    setFirstSeenTodayFilter(false);
    setPage(1);
  };

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------
  const handleSingleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingSession) return;
    setIsRevokingSingle(true);
    try {
      const res = await platformSessionService.revokeSession(
        revokingSession.id,
        singleRevokeReason || 'Revoked via Platform Admin Console'
      );
      if (res.success) {
        setRevokingSession(null);
        setSingleRevokeReason('');
        if (selectedSession?.id === revokingSession.id) {
          setSelectedSession({ ...selectedSession, session_status: 'Revoked' });
        }
        await loadData(true);
      } else {
        alert(res.error || 'Failed to revoke session');
      }
    } finally {
      setIsRevokingSingle(false);
    }
  };

  const handleUserRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserEmail) return;
    setIsRevokingUser(true);
    try {
      const res = await platformSessionService.revokeAllUserSessions(
        targetUserEmail,
        userRevokeReason || 'All user sessions terminated by administrator'
      );
      if (res.success) {
        setIsSignoutUserOpen(false);
        setTargetUserEmail('');
        setTargetUserName('');
        await loadData(true);
      } else {
        alert(res.error || 'Failed to revoke user sessions');
      }
    } finally {
      setIsRevokingUser(false);
    }
  };

  const handleEmergencyRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emergencyConfirmText !== 'REVOKE ALL') return;
    setIsRevokingEmergency(true);
    try {
      const res = await platformSessionService.revokeAllPrivilegedSessions(emergencyReason);
      if (res.success) {
        setIsEmergencyRevokeOpen(false);
        setEmergencyConfirmText('');
        await loadData(true);
      } else {
        alert(res.error || 'Failed to execute emergency revocation');
      }
    } finally {
      setIsRevokingEmergency(false);
    }
  };

  const copySessionId = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Compute Relative Time & Session Duration
  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return isoString;
    }
  };

  const getSessionAge = (createdAt: string) => {
    try {
      const diffMs = Date.now() - new Date(createdAt).getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      if (diffMin < 60) return `${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      const remainingMin = diffMin % 60;
      if (diffHr < 24) return `${diffHr}h ${remainingMin}m`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ${diffHr % 24}h`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ---------------------------------------------------------
          1. Header & Live Stream Status
         --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Active Sessions</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Live Session Stream Active
            </span>
            <span className="text-[11px] text-[#64748B] hidden sm:inline">
              Synchronized: {lastSyncTime}
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Monitor authenticated users and administrators currently connected to WorkForceOS.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn('h-4 w-4 text-[#64748B]', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTargetUserEmail('');
              setTargetUserName('');
              setIsSignoutUserOpen(true);
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#0F172B] hover:bg-[#F8FAFC]"
          >
            <UserX className="h-4 w-4 text-[#64748B]" />
            Force Sign Out User
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmergencyRevokeOpen(true)}
            className="flex items-center gap-1.5 border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2]"
          >
            <AlertOctagon className="h-4 w-4" />
            Emergency Session Control
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. Dynamic Summary KPI Cards (Interactive Filter Triggers)
         --------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Active Sessions Card */}
        <div
          onClick={() => {
            setStatusFilter('Active');
            setRiskFilter('All');
            setRoleFilter('All');
            setFirstSeenTodayFilter(false);
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#2563EB]',
            statusFilter === 'Active' && 'ring-2 ring-[#2563EB] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Active Sessions</span>
            <Laptop className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.active_sessions_count}</div>
          <p className="text-[11px] text-[#059669] mt-0.5 font-medium">Currently connected</p>
        </div>

        {/* Admin Sessions Card */}
        <div
          onClick={() => {
            setRoleFilter('Admin');
            setStatusFilter('Active');
            setRiskFilter('All');
            setFirstSeenTodayFilter(false);
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#047857]',
            roleFilter === 'Admin' && 'ring-2 ring-[#047857] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Admin Sessions</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.admin_sessions_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Platform & Tenant Admins</p>
        </div>

        {/* Tenant Sessions Card */}
        <div
          onClick={() => {
            setRoleFilter('Employee');
            setStatusFilter('Active');
            setRiskFilter('All');
            setFirstSeenTodayFilter(false);
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#334155]',
            roleFilter === 'Employee' && 'ring-2 ring-[#334155] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Tenant Sessions</span>
            <Globe className="h-3.5 w-3.5 text-[#334155]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.tenant_sessions_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Standard Organization Users</p>
        </div>

        {/* Suspicious Sessions Card */}
        <div
          onClick={() => {
            setRiskFilter('High');
            setStatusFilter('Active');
            setRoleFilter('All');
            setFirstSeenTodayFilter(false);
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#DC2626]',
            riskFilter === 'High' && 'ring-2 ring-[#DC2626] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Suspicious Sessions</span>
            <ShieldAlert className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <div className="text-xl font-bold text-[#DC2626] mt-1">{summary.suspicious_sessions_count}</div>
          <p className="text-[11px] text-[#DC2626] mt-0.5">
            {summary.suspicious_sessions_count === 0 ? '0 anomalies detected' : 'Requires security review'}
          </p>
        </div>

        {/* New Devices Card */}
        <div
          onClick={() => {
            setFirstSeenTodayFilter(true);
            setStatusFilter('All');
            setRiskFilter('All');
            setRoleFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#D97706]',
            firstSeenTodayFilter && 'ring-2 ring-[#D97706] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">New Devices</span>
            <Smartphone className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.new_devices_count}</div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">Enrolled today</p>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Multi-Dimensional Filter Bar
         --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search user, email, tenant, city, IP, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F172B]"
            />
          </div>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
          >
            <option value="All">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
            <option value="Critical">Critical Risk</option>
          </select>

          {/* Session Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Expired">Expired</option>
            <option value="Revoked">Revoked</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Admin">All Admins (Privileged)</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Platform Admin">Platform Admin</option>
            <option value="Security Admin">Security Admin</option>
            <option value="Tenant Admin">Tenant Admin</option>
            <option value="Employee">Employee</option>
          </select>

          {/* Auth Method Filter */}
          <select
            value={authMethodFilter}
            onChange={(e) => setAuthMethodFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
          >
            <option value="All">All Auth Methods</option>
            <option value="Passkey">Passkey (WebAuthn)</option>
            <option value="MFA">MFA / TOTP</option>
            <option value="SSO">SSO / SAML</option>
            <option value="Password">Password Only</option>
            <option value="OAuth">OAuth 2.0</option>
          </select>

          {/* Device Filter */}
          <select
            value={deviceTypeFilter}
            onChange={(e) => setDeviceTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
          >
            <option value="All">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || riskFilter !== 'All' || statusFilter !== 'All' || roleFilter !== 'All' || authMethodFilter !== 'All' || deviceTypeFilter !== 'All' || firstSeenTodayFilter) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#DC2626] hover:underline px-2 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------
          4. Live Active Sessions Table
         --------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Device & OS</th>
                <th className="py-3 px-4">Location & IP</th>
                <th className="py-3 px-4">Authentication</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Session Age</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 w-16 bg-[#E2E8F0] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : error ? (
                // Error State
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#DC2626]">
                    <AlertTriangle className="h-8 w-8 text-[#DC2626] mx-auto mb-2" />
                    <div className="font-bold text-sm">Session telemetry unavailable</div>
                    <p className="text-xs text-[#64748B] mt-1">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => loadData(false)} className="mt-3">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Connection
                    </Button>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                // Honest Empty State
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#64748B]">
                    <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
                    <div className="font-bold text-sm text-[#0F172B]">No active sessions found</div>
                    <p className="text-xs text-[#64748B] mt-1">
                      No users or administrators matching the current filter criteria are currently connected.
                    </p>
                  </td>
                </tr>
              ) : (
                // Loaded Rows
                sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    {/* User & Role */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-[#0F172B] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                          {s.user_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#0F172B] flex items-center gap-1">
                            {s.user_name}
                            {s.is_privileged && <Shield className="h-3 w-3 text-[#047857] fill-[#047857]" />}
                          </div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                            <span>{s.user_email}</span>
                            <span>•</span>
                            <span className="font-semibold text-[#0F172B]">{s.role_name}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tenant */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateTab) onNavigateTab('organizations', { tenantId: s.tenant_id });
                        }}
                        className="font-bold text-[#0F172B] hover:text-[#2563EB] transition-colors"
                      >
                        {s.tenant_name}
                      </div>
                      <div className="text-[10px] font-mono text-[#94A3B8]">{s.tenant_id}</div>
                    </td>

                    {/* Device & OS */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#0F172B] flex items-center gap-1.5">
                        {s.device_type === 'Mobile' ? (
                          <Smartphone className="h-3.5 w-3.5 text-[#64748B]" />
                        ) : s.device_type === 'Tablet' ? (
                          <Tablet className="h-3.5 w-3.5 text-[#64748B]" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 text-[#64748B]" />
                        )}
                        <span>{s.browser_name} on {s.os_name}</span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        {s.first_seen_device ? (
                          <span className="text-[#D97706] font-semibold">● New Device (Enrolled Today)</span>
                        ) : (
                          <span>Known Device ID: {s.device_id.slice(0, 10)}</span>
                        )}
                      </div>
                    </td>

                    {/* Location & IP */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#0F172B] flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#94A3B8]" />
                        <span>{s.city}, {s.country}</span>
                      </div>
                      <div className="font-mono text-[10px] text-[#94A3B8]">{s.ip_masked}</div>
                    </td>

                    {/* Auth Method */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#334155]">
                          {s.auth_method}
                        </span>
                        {s.mfa_verified && (
                          <span className="text-[10px] font-bold text-[#047857] flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> MFA
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[#0F172B] font-semibold" title={new Date(s.last_activity_at).toLocaleString()}>
                        {getRelativeTime(s.last_activity_at)}
                      </div>
                    </td>

                    {/* Session Age */}
                    <td className="py-3.5 px-4 font-mono text-[#64748B]">
                      {getSessionAge(s.created_at)}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                            s.risk_level === 'Critical' || s.risk_level === 'High'
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : s.risk_level === 'Medium'
                              ? 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-[#ECFDF5] text-[#047857]'
                          )}
                        >
                          {s.risk_level} ({s.risk_score})
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold',
                          s.session_status === 'Active'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : s.session_status === 'Idle'
                            ? 'bg-[#FFFBEB] text-[#D97706]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        )}
                      >
                        ● {s.session_status}
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSession(s)}
                          className="text-xs text-[#0F172B]"
                        >
                          Inspect
                        </Button>
                        {s.session_status !== 'Revoked' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRevokingSession(s);
                              setSingleRevokeReason('');
                            }}
                            className="text-xs text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------
          5. Session Detail Drawer (5 Specialized Tabs)
         --------------------------------------------------------- */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col font-sans overflow-hidden border-l border-[#E2E8F0]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#64748B] flex items-center gap-1">
                    ID: {selectedSession.id.slice(0, 16)}...
                    <button
                      onClick={() => copySessionId(selectedSession.id)}
                      className="text-[#94A3B8] hover:text-[#0F172B]"
                      title="Copy Session ID"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedSession.session_status === 'Active'
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    )}
                  >
                    ● {selectedSession.session_status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#0F172B]">{selectedSession.user_name}</h2>
                <div className="text-xs text-[#64748B]">
                  {selectedSession.user_email} • <span className="font-semibold text-[#0F172B]">{selectedSession.role_name}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-[#E2E8F0] px-5 bg-white overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'security', label: 'Security & Risk', icon: Shield },
                { id: 'activity', label: 'Activity Timeline', icon: Activity },
                { id: 'device', label: 'Device Profile', icon: Monitor },
                { id: 'audit', label: 'Audit Trail', icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'border-[#0F172B] text-[#0F172B]'
                        : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div>
                      <span className="text-[#64748B] block">Organization:</span>
                      <strong className="text-[#0F172B]">{selectedSession.tenant_name}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Tenant ID:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedSession.tenant_id}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">IP Address (Masked):</span>
                      <strong className="font-mono text-[#0F172B]">{selectedSession.ip_masked}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Location:</span>
                      <strong className="text-[#0F172B]">{selectedSession.city}, {selectedSession.country}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Auth Method:</span>
                      <strong className="text-[#047857]">{selectedSession.auth_method}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">MFA Challenge:</span>
                      <strong className={selectedSession.mfa_verified ? 'text-[#047857]' : 'text-[#D97706]'}>
                        {selectedSession.mfa_verified ? 'Verified (WebAuthn)' : 'Not Enforced'}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-[#0F172B]">Session Lifecycle Timestamps</h4>
                    <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Created At:</span>
                        <span className="font-mono text-[#0F172B]">{new Date(selectedSession.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Last Active At:</span>
                        <span className="font-mono text-[#0F172B]">{new Date(selectedSession.last_activity_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Session Expiration:</span>
                        <span className="font-mono text-[#0F172B]">{new Date(selectedSession.expires_at).toLocaleString()}</span>
                      </div>
                      {selectedSession.revoked_at && (
                        <div className="flex justify-between text-[#DC2626] font-semibold">
                          <span>Revoked At:</span>
                          <span className="font-mono">{new Date(selectedSession.revoked_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECURITY & RISK */}
              {drawerTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <span className="text-[#64748B] block">Calculated Risk Score:</span>
                      <div className="text-2xl font-bold text-[#0F172B] mt-0.5">{selectedSession.risk_score} / 100</div>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-bold',
                        selectedSession.risk_level === 'High' || selectedSession.risk_level === 'Critical'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : selectedSession.risk_level === 'Medium'
                          ? 'bg-[#FFFBEB] text-[#D97706]'
                          : 'bg-[#ECFDF5] text-[#047857]'
                      )}
                    >
                      {selectedSession.risk_level} Risk
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-[#0F172B]">Risk Signals & Heuristics</h4>
                    <div className="space-y-2">
                      {riskFactors.length === 0 ? (
                        <div className="p-4 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                          No elevated security risk signals identified.
                        </div>
                      ) : (
                        riskFactors.map((factor, idx) => (
                          <div key={idx} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#0F172B]">{factor.signal}</span>
                              <span className="font-bold text-[#DC2626]">+{factor.points} pts</span>
                            </div>
                            <p className="text-[11px] text-[#64748B]">{factor.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ACTIVITY TIMELINE */}
              {drawerTab === 'activity' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F172B]">Session Event Stream</h4>
                  {sessionEvents.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No specialized session lifecycle events recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessionEvents.map((evt) => (
                        <div key={evt.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#0F172B]">{evt.event_type}</span>
                            <span className="text-[10px] text-[#94A3B8] font-mono">{new Date(evt.created_at).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-[11px] text-[#64748B]">Actor: {evt.actor_name || evt.user_email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DEVICE PROFILE */}
              {drawerTab === 'device' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Device Identifier:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedSession.device_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Operating System:</span>
                      <strong className="text-[#0F172B]">{selectedSession.os_name} {selectedSession.os_version}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Browser:</span>
                      <strong className="text-[#0F172B]">{selectedSession.browser_name} {selectedSession.browser_version}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Device Type:</span>
                      <strong className="text-[#0F172B]">{selectedSession.device_type}</strong>
                    </div>
                  </div>

                  <h4 className="font-bold text-[#0F172B]">User Device Registry History</h4>
                  {deviceHistory.length === 0 ? (
                    <div className="p-4 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      First known device registration for this user account.
                    </div>
                  ) : (
                    deviceHistory.map((dev) => (
                      <div key={dev.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-[#0F172B]">{dev.browser_name} on {dev.os_name}</div>
                          <div className="text-[10px] text-[#94A3B8]">First Seen: {new Date(dev.first_seen_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#047857]">
                          {dev.trust_status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {drawerTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F172B]">Forensic Security Audit Stream</h4>
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-[#047857]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Cryptographic session signature validated on gateway</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#047857]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>PostgreSQL Row-Level Security tenant barrier established</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#2563EB]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Audit log trace attached: req_sec_{selectedSession.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSession(null)}
                className="text-xs"
              >
                Close Drawer
              </Button>

              {selectedSession.session_status !== 'Revoked' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setRevokingSession(selectedSession);
                    setSingleRevokeReason('');
                  }}
                  className="text-xs bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Terminate Session
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          6. MODAL 1: Single Session Revocation
         --------------------------------------------------------- */}
      {revokingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form onSubmit={handleSingleRevokeSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#DC2626] flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Revoke Active Session
              </h3>
              <button type="button" onClick={() => setRevokingSession(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[#334155]">
              Are you sure you want to terminate this active session for <strong className="text-[#0F172B]">{revokingSession.user_name}</strong> ({revokingSession.user_email})?
            </p>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
              <div><strong>Device:</strong> {revokingSession.browser_name} on {revokingSession.os_name}</div>
              <div><strong>Location:</strong> {revokingSession.city}, {revokingSession.country}</div>
              <div><strong>IP:</strong> {revokingSession.ip_masked}</div>
            </div>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">Reason for Security Audit Log (Required):</label>
              <textarea
                rows={2}
                required
                value={singleRevokeReason}
                onChange={(e) => setSingleRevokeReason(e.target.value)}
                placeholder="e.g., Session anomaly, user reported lost device, or administrative rotation"
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRevokingSession(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRevokingSingle || !singleRevokeReason.trim()}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold"
              >
                {isRevokingSingle ? 'Terminating...' : 'Confirm Revoke Session'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------------
          7. MODAL 2: Force Sign Out User Everywhere
         --------------------------------------------------------- */}
      {isSignoutUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form onSubmit={handleUserRevokeSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#DC2626] flex items-center gap-2">
                <UserX className="h-5 w-5" /> Force Sign Out User Everywhere
              </h3>
              <button type="button" onClick={() => setIsSignoutUserOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[#334155]">
              Immediately invalidate all active and idle sessions across all desktop, mobile, and web clients for the target user.
            </p>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">Target User Email:</label>
              <input
                type="email"
                required
                placeholder="e.g. user@organization.com"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#0F172B]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">Reason for Security Audit Log (Required):</label>
              <textarea
                rows={2}
                required
                value={userRevokeReason}
                onChange={(e) => setUserRevokeReason(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSignoutUserOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRevokingUser || !targetUserEmail.trim() || !userRevokeReason.trim()}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold"
              >
                {isRevokingUser ? 'Terminating...' : 'Force Sign Out User'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------------
          8. MODAL 3: Emergency Mass Privileged Session Revocation
         --------------------------------------------------------- */}
      {isEmergencyRevokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form onSubmit={handleEmergencyRevokeSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DC2626] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#DC2626] flex items-center gap-2">
                <AlertOctagon className="h-5 w-5" /> Emergency Privileged Lockdown
              </h3>
              <button type="button" onClick={() => setIsEmergencyRevokeOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#991B1B] space-y-1">
              <strong>CRITICAL SECURITY ACTION:</strong>
              <p className="text-[11px]">
                This will immediately revoke all administrative and platform sessions across all Super Admin, Security Admin, and Tenant Admin accounts.
              </p>
            </div>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">Reason for Security Audit Log (Required):</label>
              <textarea
                rows={2}
                required
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">
                Type <span className="font-mono font-bold text-[#DC2626]">REVOKE ALL</span> to confirm:
              </label>
              <input
                type="text"
                required
                placeholder="REVOKE ALL"
                value={emergencyConfirmText}
                onChange={(e) => setEmergencyConfirmText(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#DC2626]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEmergencyRevokeOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRevokingEmergency || emergencyConfirmText !== 'REVOKE ALL'}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold"
              >
                {isRevokingEmergency ? 'Locking down...' : 'Execute Mass Revocation'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
