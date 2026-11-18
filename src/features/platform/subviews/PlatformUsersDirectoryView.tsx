// src/features/platform/subviews/PlatformUsersDirectoryView.tsx
// ============================================================================
// Joy PeopleHR — Global Cross-Tenant User Management & Access Directory
// Master Super Admin Control Plane View for Users Across All Tenants
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  KeyRound,
  MoreVertical,
  Mail,
  Phone,
  Copy,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';
import {
  platformUserManagementService,
  PlatformUserRecord,
} from '../../../services/platform/platformUserManagementService';
import { platformTenantService } from '../../../services/platform/platformTenantService';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';

export interface PlatformUsersDirectoryViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PlatformUsersDirectoryView: React.FC<PlatformUsersDirectoryViewProps> = ({
  onNavigateTab,
}) => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Organizations list for dropdown
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[]>([]);

  // Action modals
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<PlatformUserRecord | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load organizations for filter
  useEffect(() => {
    platformTenantService.fetchLiveFromSupabase().then((orgs) => {
      setOrgOptions(
        orgs.map((o) => ({
          id: o.id || o.tenant_id,
          name: o.display_name || o.legal_name,
        }))
      );
    });
  }, []);

  // Fetch users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await platformUserManagementService.getPlatformUsers({
        search: search.trim() || undefined,
        organization_id: selectedOrg !== 'all' ? selectedOrg : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        page,
        page_size: pageSize,
      });
      setUsers(res.users);
      setTotalUsers(res.total);
    } catch (err: any) {
      showToast({
        title: 'Failed to load user directory',
        description: err.message || 'Unknown network error',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, selectedOrg, selectedRole, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Password reset
  const handlePasswordReset = async (user: PlatformUserRecord) => {
    if (!confirm(`Dispatch password reset instructions to ${user.email}?`)) return;
    try {
      await platformUserManagementService.triggerPasswordReset(user.email);
      showToast({
        title: 'Password Reset Dispatched',
        description: `Instructions sent to ${user.email}`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Password Reset Failed',
        description: err.message,
        type: 'error',
      });
    }
  };

  // Status transition submit
  const handleStatusSubmit = async () => {
    if (!selectedUserForStatus) return;
    if (!statusReason.trim() || statusReason.trim().length < 5) {
      showToast({
        title: 'Reason Required',
        description: 'Please provide at least 5 characters explaining this action for audit compliance.',
        type: 'error',
      });
      return;
    }

    const targetStatus = selectedUserForStatus.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsSubmittingStatus(true);
    try {
      await platformUserManagementService.updateUserStatus(
        selectedUserForStatus.user_id,
        targetStatus,
        statusReason.trim()
      );
      showToast({
        title: 'User Status Updated',
        description: `User account is now ${targetStatus}.`,
        type: 'success',
      });
      setSelectedUserForStatus(null);
      setStatusReason('');
      loadUsers();
    } catch (err: any) {
      showToast({
        title: 'Action Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Computed summary metrics
  const activeCount = useMemo(() => users.filter((u) => u.status === 'ACTIVE').length, [users]);
  const suspendedCount = useMemo(() => users.filter((u) => u.status === 'SUSPENDED').length, [users]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Global SaaS User Directory
              </h1>
              <p className="text-sm text-slate-500">
                Cross-tenant user administration, authorization roles, and security session controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SaaS Users</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all registered tenants</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users (Page)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Verified & Accessible</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suspended Users</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{suspendedCount}</div>
          <div className="text-[11px] text-rose-700 font-medium mt-0.5">Access locked by admin</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tenants</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{orgOptions.length}</div>
          <div className="text-[11px] text-indigo-700 font-medium mt-0.5">Multi-tenant partitions</div>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by full name, email, or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Tenant Filter */}
        <select
          value={selectedOrg}
          onChange={(e) => {
            setSelectedOrg(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">🏢 All Organizations ({orgOptions.length})</option>
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={(e) => {
            setSelectedRole(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">🛡️ All Roles</option>
          <option value="OWNER">Organization Owner</option>
          <option value="HR_ADMIN">HR Administrator</option>
          <option value="PAYROLL_ADMIN">Payroll Administrator</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">⚡ All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Tenant Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading platform users...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span className="font-medium text-slate-600 block">No users found</span>
                    <span className="text-xs text-slate-400">Try adjusting your search criteria or tenant filters.</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            u.full_name?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {u.employee_code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                                {u.employee_code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <span>{u.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.email, `email-${u.user_id}`)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Copy email"
                            >
                              {copiedId === `email-${u.user_id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Organization */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{u.organization_name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 truncate block max-w-[160px]">
                        {u.organization_id}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        <Shield className="w-3 h-3" />
                        <span>{u.role_code}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>{u.status}</span>
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePasswordReset(u)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Trigger Password Reset"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForStatus(u);
                            setStatusReason('');
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            u.status === 'ACTIVE'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.status === 'ACTIVE' ? 'Suspend User Access' : 'Reactivate User Access'}
                        >
                          {u.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalUsers > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * pageSize, totalUsers)}</span> of{' '}
              <span className="font-semibold">{totalUsers}</span> users
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <span className="px-2 font-mono font-medium">{page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalUsers}
                className="h-7 px-2 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Status Transition Confirmation Modal with Mandatory Reason */}
      {selectedUserForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedUserForStatus.status === 'ACTIVE'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
              >
                {selectedUserForStatus.status === 'ACTIVE' ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedUserForStatus.status === 'ACTIVE' ? 'Suspend User Access' : 'Reactivate User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedUserForStatus.full_name} ({selectedUserForStatus.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedUserForStatus.status === 'ACTIVE'
                ? 'Suspending this user will immediately revoke their ability to sign in to their organization portal. This action is recorded in the platform audit ledger.'
                : 'Reactivating this user will restore their authorization and permissions in their tenant organization.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Action Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Specify the operational or security justification (min 5 chars)..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForStatus(null)}
                disabled={isSubmittingStatus}
              >
                Cancel
              </Button>
              <Button
                variant={selectedUserForStatus.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleStatusSubmit}
                disabled={isSubmittingStatus || statusReason.trim().length < 5}
              >
                {isSubmittingStatus ? 'Updating...' : 'Confirm & Audit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
