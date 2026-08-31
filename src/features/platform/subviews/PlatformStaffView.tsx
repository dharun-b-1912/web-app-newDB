// src/features/platform/subviews/PlatformStaffView.tsx
// ============================================================
// Joy PeopleHR — Platform Admin Assistant & Delegated IAM Console
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Lock,
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  X,
  Laptop,
  Check,
  Copy,
  Sliders,
  Layers,
  ArrowRight,
  AlertOctagon,
  FileText,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  Briefcase,
  Eye,
  Info,
  Calendar,
  Activity,
  User,
  Key,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import {
  platformStaffService,
  PlatformStaffRecord,
  PlatformRoleRecord,
  StaffStatus,
  RiskLevel,
  StaffDirectoryKPIs,
  AdminActivityRecord,
} from '../../../services/platform/platformStaffService';
import { platformIamService, PlatformAdminAccessInfo } from '../../../services/platform/platformIamService';
import { platformProfileService } from '../../../services/platform/platformProfileService';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export const PlatformStaffView: React.FC = () => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'roles' | 'matrix' | 'activity'>('directory');
  const [staffList, setStaffList] = useState<PlatformStaffRecord[]>([]);
  const [rolesList, setRolesList] = useState<PlatformRoleRecord[]>([]);
  const [kpis, setKpis] = useState<StaffDirectoryKPIs | null>(null);
  const [activities, setActivities] = useState<AdminActivityRecord[]>([]);
  const [staffActivities, setStaffActivities] = useState<AdminActivityRecord[]>([]);
  const [iamAccess, setIamAccess] = useState<PlatformAdminAccessInfo | null>(null);

  // Loading & Error States (Requirement 53)
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Forensic Activity Search Filters (Requirement 57: Who, What, To Whom, When)
  const [activityFilterWho, setActivityFilterWho] = useState('');
  const [activityFilterWhat, setActivityFilterWhat] = useState('ALL');
  const [activityFilterToWhom, setActivityFilterToWhom] = useState('');
  const [activityFilterWhen, setActivityFilterWhen] = useState<'24h' | '7d' | '30d' | 'all'>('all');

  // Selected Staff for Detail Drawer
  const [selectedStaff, setSelectedStaff] = useState<PlatformStaffRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'permissions' | 'sessions' | 'activity'>('overview');

  // Create Staff Wizard State (4 Steps)
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [createFormData, setCreateFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    staff_code: '',
    role_key: 'SUPPORT_ADMIN',
    mfa_enforced: true,
    account_expiry_date: '',
    tenant_scope_type: 'ALL',
    module_restrictions: [] as string[],
  });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [createdStaffResult, setCreatedStaffResult] = useState<PlatformStaffRecord | null>(null);

  // Role Change Modal State
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<PlatformStaffRecord | null>(null);
  const [targetNewRoleKey, setTargetNewRoleKey] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [isSubmittingRoleChange, setIsSubmittingRoleChange] = useState(false);

  // Status Change (Suspend / Disable) Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<PlatformStaffRecord | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<StaffStatus>('Suspended');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isSubmittingStatusChange, setIsSubmittingStatusChange] = useState(false);

  // Activity Detail Drawer State
  const [selectedActivity, setSelectedActivity] = useState<AdminActivityRecord | null>(null);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [staffRes, rolesRes, kpiRes, actRes, iamRes, prof] = await Promise.all([
        platformStaffService.getStaffDirectory({
          search: searchQuery,
          role: selectedRoleFilter,
          status: selectedStatusFilter,
        }),
        platformStaffService.getRoles(),
        platformStaffService.getStaffKpis(),
        platformStaffService.searchAdministrativeActivity({
          who: activityFilterWho,
          what: activityFilterWhat,
          to_whom: activityFilterToWhom,
          time_range: activityFilterWhen,
        }),
        platformIamService.getCurrentAdminAccess(),
        platformProfileService.getProfile(),
      ]);

      let finalStaff = staffRes.staff;
      // If staff list is empty, ensure the root Super Admin from profile exists
      if (finalStaff.length === 0 && prof) {
        const rootAdmin: PlatformStaffRecord = {
          id: prof.id || 'stf-root-01',
          email: prof.email || 'superadmin@joypeoplehr.com',
          first_name: prof.first_name || 'Arun',
          last_name: prof.last_name || 'Kumar',
          name: prof.display_name || 'Platform Super Admin',
          staff_code: 'STF-ROOT01',
          job_title: prof.job_title || 'Chief Platform Architect & Super Admin',
          department: prof.department || 'Executive & Infrastructure',
          phone: prof.phone || '',
          avatar_url: prof.avatar_url || '',
          role_key: 'SUPER_ADMIN',
          role_display_name: 'Super Admin',
          status: 'Active',
          mfa_enforced: true,
          mfa_enabled: true,
          is_root_superadmin: true,
          account_start_date: prof.created_at || new Date().toISOString(),
          active_sessions_count: 1,
          risk_level: 'CRITICAL',
          permissions_count: 34,
          last_login_at: 'Just now',
          created_at: prof.created_at || new Date().toISOString(),
        };
        finalStaff = [rootAdmin];
      }

      setStaffList(finalStaff);
      setRolesList(rolesRes);
      setKpis({
        total_staff: finalStaff.length,
        active_staff: finalStaff.filter((s) => s.status === 'Active').length,
        pending_invitations: finalStaff.filter((s) => s.status === 'Invitation Pending').length,
        suspended_staff: finalStaff.filter((s) => s.status === 'Suspended' || s.status === 'Disabled').length,
        mfa_protected: finalStaff.filter((s) => s.mfa_enabled).length,
        high_risk_staff: finalStaff.filter((s) => s.role_key === 'SUPER_ADMIN' || s.role_key === 'PLATFORM_ADMIN').length,
      });
      setActivities(actRes);
      setIamAccess(iamRes);
    } catch (err: any) {
      console.error('[PlatformStaffView] Failed to load staff data:', err);
      setLoadError(err.message || 'Unable to load platform staff directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRoleFilter, selectedStatusFilter, activityFilterWhat, activityFilterWhen]);

  // Load Individual Staff Activities on selection
  useEffect(() => {
    if (selectedStaff) {
      platformStaffService.getStaffActivity(selectedStaff.email).then((acts) => {
        setStaffActivities(acts);
      });
    }
  }, [selectedStaff]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleForensicSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // --- Handlers: Create Staff Wizard ---
  const handleNextStep = () => {
    if (wizardStep === 1) {
      if (!createFormData.first_name.trim() || !createFormData.last_name.trim() || !createFormData.email.trim()) {
        showToast('Please provide First Name, Last Name, and Work Email.', 'error');
        return;
      }
      if (!createFormData.email.includes('@')) {
        showToast('Please enter a valid work email address.', 'error');
        return;
      }
    }
    setWizardStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev));
  };

  const handlePrevStep = () => {
    setWizardStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleFinishCreateStaff = async () => {
    setIsCreatingStaff(true);
    try {
      const created = await platformStaffService.createStaff({
        first_name: createFormData.first_name,
        last_name: createFormData.last_name,
        display_name: createFormData.display_name,
        email: createFormData.email,
        phone: createFormData.phone,
        job_title: createFormData.job_title || 'Platform Support Assistant',
        department: createFormData.department || 'Customer Operations',
        staff_code: createFormData.staff_code,
        role_key: createFormData.role_key,
        mfa_enforced: createFormData.mfa_enforced,
        account_expiry_date: createFormData.account_expiry_date || undefined,
        scopes:
          createFormData.module_restrictions.length > 0
            ? [{ scope_type: 'MODULE_RESTRICTION', scope_value: createFormData.module_restrictions.join(', ') }]
            : [],
      });

      setCreatedStaffResult(created);
      showToast(`Invitation successfully sent to ${created.email}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create platform staff.', 'error');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleCloseWizard = () => {
    setIsCreateWizardOpen(false);
    setWizardStep(1);
    setCreatedStaffResult(null);
    setCreateFormData({
      first_name: '',
      last_name: '',
      display_name: '',
      email: '',
      phone: '',
      job_title: '',
      department: '',
      staff_code: '',
      role_key: 'SUPPORT_ADMIN',
      mfa_enforced: true,
      account_expiry_date: '',
      tenant_scope_type: 'ALL',
      module_restrictions: [],
    });
  };

  // --- Handlers: Change Role ---
  const handleOpenChangeRole = (staff: PlatformStaffRecord) => {
    setRoleChangeTarget(staff);
    setTargetNewRoleKey(staff.role_key);
    setRoleChangeReason('');
    setIsChangeRoleModalOpen(true);
  };

  const handleSubmitRoleChange = async () => {
    if (!roleChangeTarget) return;
    if (!roleChangeReason.trim()) {
      showToast('A business justification reason is required for role modification.', 'error');
      return;
    }
    setIsSubmittingRoleChange(true);
    try {
      await platformStaffService.updateStaffRole(roleChangeTarget.id, targetNewRoleKey, roleChangeReason);
      showToast(`Updated role for ${roleChangeTarget.name} to ${targetNewRoleKey}`, 'success');
      setIsChangeRoleModalOpen(false);
      loadData();
      if (selectedStaff && selectedStaff.id === roleChangeTarget.id) {
        setSelectedStaff((prev) => (prev ? { ...prev, role_key: targetNewRoleKey } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Role change failed.', 'error');
    } finally {
      setIsSubmittingRoleChange(false);
    }
  };

  // --- Handlers: Status Change ---
  const handleOpenStatusChange = (staff: PlatformStaffRecord, newStatus: StaffStatus) => {
    setStatusTarget(staff);
    setTargetNewStatus(newStatus);
    setStatusChangeReason('');
    setIsStatusModalOpen(true);
  };

  const handleSubmitStatusChange = async () => {
    if (!statusTarget) return;
    if (!statusChangeReason.trim()) {
      showToast('A justification reason is required to change administrator status.', 'error');
      return;
    }
    setIsSubmittingStatusChange(true);
    try {
      await platformStaffService.updateStaffStatus(statusTarget.id, targetNewStatus, statusChangeReason);
      showToast(`Account status for ${statusTarget.name} updated to ${targetNewStatus}`, 'success');
      setIsStatusModalOpen(false);
      loadData();
      if (selectedStaff && selectedStaff.id === statusTarget.id) {
        setSelectedStaff((prev) => (prev ? { ...prev, status: targetNewStatus } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Status change failed.', 'error');
    } finally {
      setIsSubmittingStatusChange(false);
    }
  };

  // --- Handlers: Revoke Sessions ---
  const handleRevokeStaffSessions = async (staff: PlatformStaffRecord) => {
    if (!confirm(`Are you sure you want to terminate all active sessions for ${staff.name}? They will be immediately logged out.`)) {
      return;
    }
    try {
      await platformStaffService.revokeStaffSessions(staff.id, 'Administrative immediate session invalidation');
      showToast(`All active sessions terminated for ${staff.name}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke sessions.', 'error');
    }
  };

  // --- Handlers: Delete Staff Member ---
  const handleDeleteStaff = async (staff: PlatformStaffRecord) => {
    if (staff.is_root_superadmin || staff.role_key === 'SUPER_ADMIN') {
      showToast('Root Super Admin accounts cannot be deleted.', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete platform staff account for ${staff.name} (${staff.email})?`)) {
      return;
    }
    try {
      await platformStaffService.deleteStaff(staff.id);
      showToast(`Platform staff member ${staff.name} deleted successfully.`, 'success');
      if (selectedStaff?.id === staff.id) {
        setIsDetailDrawerOpen(false);
        setSelectedStaff(null);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete staff member.', 'error');
    }
  };

  // --- Handlers: Resend Email Invitation via Resend SMTP Gateway ---
  const [isResendingInvite, setIsResendingInvite] = useState<string | null>(null);
  const handleResendInvitation = async (staff: PlatformStaffRecord) => {
    setIsResendingInvite(staff.id);
    try {
      const res = await platformStaffService.resendStaffInvitation(staff.id);
      showToast(res.message, res.success ? 'success' : 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to resend invitation email.', 'error');
    } finally {
      setIsResendingInvite(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Standard Platform Breadcrumb & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
            <span className="hover:text-[#047857] transition cursor-pointer">Platform Admin</span>
            <span>/</span>
            <span className="font-bold text-gray-800">Platform Staff & Delegated IAM</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#047857]" />
              Platform Staff & Delegated IAM
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RBAC Control Plane Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage administrative personnel, assign constrained roles, enforce MFA policies, and monitor immutable security activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateWizardOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite Platform Staff
          </button>
        </div>
      </div>

      {/* 2. Top KPIs Metric Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Staff</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_staff}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Active Admins</span>
            <p className="text-2xl font-bold text-[#047857] mt-1">{kpis.active_staff}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Pending Invites</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.pending_invitations}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Suspended</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{kpis.suspended_staff}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">MFA Protected</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{kpis.mfa_protected}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200/90 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Root Authority</span>
            <p className="text-2xl font-bold text-purple-700 mt-1">1</p>
          </div>
        </div>
      )}

      {/* Error Boundary Banner (Requirement 53) */}
      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Error:</strong> {loadError}
            </span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeSubTab === 'directory'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Staff Directory & Delegated Accounts
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeSubTab === 'roles'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          Platform Roles & Hierarchy
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeSubTab === 'matrix'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          17-Domain Permission Matrix
        </button>

        <button
          onClick={() => setActiveSubTab('activity')}
          className={cn(
            'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
            activeSubTab === 'activity'
              ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <History className="w-3.5 h-3.5" />
          Forensic Activity Ledger
        </button>
      </div>

      {/* 4. Sub-Tab Content: STAFF DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff by name, email, staff code, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Role:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Roles</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="PLATFORM_ADMIN">Platform Admin</option>
                  <option value="OPERATIONS_ADMIN">Operations Admin</option>
                  <option value="SECURITY_ADMIN">Security Admin</option>
                  <option value="SUPPORT_ADMIN">Support Admin</option>
                  <option value="READ_ONLY_ADMIN">Read-Only Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                <span className="text-gray-500 font-medium">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Invitation Pending">Invitation Pending</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center space-y-3 shadow-xs">
              <RefreshCw className="w-7 h-7 text-[#047857] animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Loading platform staff directory...</p>
            </div>
          )}

          {/* Staff Table */}
          {!isLoading && staffList.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Staff Administrator</th>
                      <th className="py-3 px-4">Staff ID</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">MFA Policy</th>
                      <th className="py-3 px-4">Active Sessions</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {staffList.map((staff) => (
                      <tr
                        key={staff.id}
                        className="hover:bg-emerald-50/30 transition group cursor-pointer"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setIsDetailDrawerOpen(true);
                        }}
                      >
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#047857] to-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                {staff.name}
                                {staff.is_root_superadmin && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                    ROOT
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500">{staff.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Staff Code */}
                        <td className="py-3 px-4 font-mono text-gray-700 font-medium">
                          {staff.staff_code}
                        </td>

                        {/* Role & Risk */}
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-md text-[11px] font-bold border',
                              staff.role_key === 'SUPER_ADMIN'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : staff.role_key === 'PLATFORM_ADMIN'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : staff.role_key === 'SECURITY_ADMIN'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            )}
                          >
                            {staff.role_display_name}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                              staff.status === 'Active'
                                ? 'bg-emerald-50 text-[#047857] border border-emerald-200'
                                : staff.status === 'Invitation Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                staff.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : staff.status === 'Invitation Pending'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              )}
                            />
                            {staff.status}
                          </span>
                        </td>

                        {/* MFA */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck
                              className={cn('w-3.5 h-3.5', staff.mfa_enabled ? 'text-[#047857]' : 'text-amber-500')}
                            />
                            <span className="text-[11px] text-gray-700">
                              {staff.mfa_enabled ? 'Enforced & Active' : 'Enforced (Pending)'}
                            </span>
                          </div>
                        </td>

                        {/* Active Sessions */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800">
                            {staff.active_sessions_count} session{staff.active_sessions_count !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Last Login */}
                        <td className="py-3 px-4 text-gray-500">{staff.last_login_at}</td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenChangeRole(staff)}
                              title="Modify Role & Permissions"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-[#047857] transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleResendInvitation(staff)}
                              disabled={isResendingInvite === staff.id}
                              title="Resend Invitation Email (Resend SMTP Gateway)"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-[#047857] transition disabled:opacity-50 cursor-pointer"
                            >
                              {isResendingInvite === staff.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#047857]" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {staff.status === 'Active' ? (
                              <button
                                onClick={() => handleOpenStatusChange(staff, 'Suspended')}
                                title="Suspend Administrator"
                                disabled={staff.is_root_superadmin}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-600 hover:text-rose-600 transition disabled:opacity-30 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenStatusChange(staff, 'Active')}
                                title="Reinstate Administrator"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-600 hover:text-[#047857] transition cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!staff.is_root_superadmin && staff.role_key !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => handleDeleteStaff(staff)}
                                title="Delete Staff Account"
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-600 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedStaff(staff);
                                setIsDetailDrawerOpen(true);
                              }}
                              title="View Full Identity & Access Details"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
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
        </div>
      )}

      {/* 5. Sub-Tab Content: ROLES & HIERARCHY */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesList.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        role.risk_level === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : role.risk_level === 'HIGH'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-[#047857] border border-emerald-200'
                      )}
                    >
                      Risk: {role.risk_level}
                    </span>
                    <span className="text-xs font-bold text-gray-500">Level {role.hierarchy_level}/5</span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    {role.display_name}
                    {role.is_system_role && <span className="text-[10px] font-normal text-gray-400">(System Role)</span>}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">{role.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#047857]">
                    {role.permissions_count} Permissions Granted
                  </span>
                  <span className="text-gray-400 font-medium">
                    {role.role_key === 'SUPER_ADMIN' ? 'Full Authority' : 'Restricted Scope'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Sub-Tab Content: 17-DOMAIN PERMISSION MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Platform Control Plane 17-Domain Permission Matrix
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Granular access breakdown mapping actions (View, Create, Update, Delete, Export, Manage) across all platform subsystems.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Module / Domain</th>
                  <th className="py-2.5 px-3 text-center">View</th>
                  <th className="py-2.5 px-3 text-center">Create</th>
                  <th className="py-2.5 px-3 text-center">Update</th>
                  <th className="py-2.5 px-3 text-center">Delete / Suspend</th>
                  <th className="py-2.5 px-3 text-center">Export</th>
                  <th className="py-2.5 px-3 text-center">Root Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {[
                  { name: 'Organizations & Tenants', view: true, create: true, update: true, del: true, export: true, manage: true },
                  { name: 'Subscriptions & Billing', view: true, create: false, update: true, del: false, export: true, manage: true },
                  { name: 'Security Center & TLS', view: true, create: false, update: true, del: true, export: true, manage: true },
                  { name: 'Active Sessions & Revocation', view: true, create: false, update: false, del: true, export: false, manage: true },
                  { name: 'SHA-256 Audit Ledger', view: true, create: false, update: false, del: false, export: true, manage: false },
                  { name: 'Support & Case Escalations', view: true, create: true, update: true, del: true, export: true, manage: true },
                  { name: 'Background Workers & Fleet', view: true, create: false, update: true, del: true, export: false, manage: true },
                  { name: 'Webhooks & Event Mesh', view: true, create: true, update: true, del: true, export: true, manage: true },
                  { name: 'API Connectors & Integrations', view: true, create: true, update: true, del: true, export: true, manage: true },
                  { name: 'Platform IAM & Staff Hierarchy', view: true, create: true, update: true, del: true, export: true, manage: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-bold text-gray-800">{row.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      {row.view ? <Check className="w-4 h-4 text-[#047857] mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.create ? <Check className="w-4 h-4 text-[#047857] mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.update ? <Check className="w-4 h-4 text-[#047857] mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.del ? <Check className="w-4 h-4 text-[#047857] mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.export ? <Check className="w-4 h-4 text-[#047857] mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.manage ? <Check className="w-4 h-4 text-indigo-600 mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Sub-Tab Content: FORENSIC ADMINISTRATIVE ACTIVITY (Requirement 50 & 57) */}
      {activeSubTab === 'activity' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Forensic Administrative Activity Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Audits who performed what action, on whom, when, from which IP, and with what specific before/after state diff.
            </p>
          </div>

          {/* Forensic Search Filters (Who, What, To Whom, When) */}
          <form onSubmit={handleForensicSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Who (Actor Name / Admin)</label>
              <input
                type="text"
                placeholder="e.g. Platform Admin"
                value={activityFilterWho}
                onChange={(e) => setActivityFilterWho(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">What (Action Code)</label>
              <select
                value={activityFilterWhat}
                onChange={(e) => setActivityFilterWhat(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-900 font-medium"
              >
                <option value="ALL">All Actions</option>
                <option value="STAFF_CREATED">STAFF_CREATED</option>
                <option value="STAFF_ROLE_CHANGED">STAFF_ROLE_CHANGED</option>
                <option value="STAFF_SUSPENDED">STAFF_SUSPENDED</option>
                <option value="STAFF_REACTIVATED">STAFF_REACTIVATED</option>
                <option value="STAFF_ALL_SESSIONS_REVOKED">STAFF_ALL_SESSIONS_REVOKED</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">To Whom (Target User / Email)</label>
              <input
                type="text"
                placeholder="e.g. priya.sharma@workforceos.com"
                value={activityFilterToWhom}
                onChange={(e) => setActivityFilterToWhom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">When (Time Window)</label>
              <select
                value={activityFilterWhen}
                onChange={(e) => setActivityFilterWhen(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-900 font-medium"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </form>

          {/* Activity List */}
          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No audit activity matches your search criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => setSelectedActivity(act)}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 hover:border-[#047857]/40 hover:bg-emerald-50/20 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-xs">{act.actor_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-[#047857] font-bold border border-emerald-200">
                        {act.actor_role}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="font-mono font-bold text-gray-800 text-xs">{act.action}</span>
                      {act.target_name && (
                        <span className="text-xs text-gray-500">
                          on <strong className="text-gray-800">{act.target_name}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      Reason: {act.reason || 'Standard operational task'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span className="font-mono text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {act.ip_address}
                    </span>
                    <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                      {act.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. MODAL: CREATE PLATFORM STAFF WIZARD (4 Steps) */}
      {isCreateWizardOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#047857]" />
                  Create Platform Staff & Delegated Administrator
                </h3>
                <p className="text-xs text-gray-500">
                  Step {wizardStep} of 4:{' '}
                  {wizardStep === 1
                    ? 'Administrator Identity'
                    : wizardStep === 2
                    ? 'Security & Expiration'
                    : wizardStep === 3
                    ? 'Role & Scope Constraints'
                    : 'Review & Confirm'}
                </p>
              </div>
              <button
                onClick={handleCloseWizard}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full bg-gray-100 h-1.5">
              <div
                className="bg-[#047857] h-1.5 transition-all duration-300"
                style={{ width: `${createdStaffResult ? 100 : (wizardStep / 4) * 100}%` }}
              />
            </div>

            {createdStaffResult ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#047857] flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Platform Staff Invitation Dispatched!</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    An official high-security onboarding email with invitation tokens was sent to{' '}
                    <strong className="text-gray-900">{createdStaffResult.email}</strong> via Resend SMTP Gateway.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Staff ID:</span>
                    <span className="font-mono font-bold text-gray-900">{createdStaffResult.staff_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Assigned Role:</span>
                    <span className="font-bold text-[#047857]">{createdStaffResult.role_display_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Delivery Gateway:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#047857]" />
                      Resend SMTP (Production)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Status:</span>
                    <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Invitation Pending
                    </span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleCloseWizard}
                    className="w-full py-2.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Done & Return to Staff Directory
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Vikram"
                        value={createFormData.first_name}
                        onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sethi"
                        value={createFormData.last_name}
                        onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      placeholder="vikram.sethi@workforceos.com"
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Customer Support Specialist"
                        value={createFormData.job_title}
                        onChange={(e) => setCreateFormData({ ...createFormData, job_title: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Tier-2 Operations"
                        value={createFormData.department}
                        onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-[#047857] font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      Mandatory Multi-Factor Authentication (MFA)
                    </div>
                    <p className="text-xs text-gray-600">
                      All platform staff accounts are required by security governance policy to enroll a TOTP authenticator app upon first sign-in.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Account Expiration Date (Optional for Contractors / Vendors)
                    </label>
                    <input
                      type="date"
                      value={createFormData.account_expiry_date}
                      onChange={(e) => setCreateFormData({ ...createFormData, account_expiry_date: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700">
                    Select Constrained Platform Role
                  </label>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { key: 'SUPPORT_ADMIN', name: 'Support Admin', desc: 'Customer cases & telemetry. Restricted from Billing & Master IAM.', risk: 'LOW', perms: 8 },
                      { key: 'OPERATIONS_ADMIN', name: 'Operations Admin', desc: 'Tenant health, worker queues, and webhook mesh.', risk: 'MEDIUM', perms: 18 },
                      { key: 'SECURITY_ADMIN', name: 'Security Admin', desc: 'Security Center posture, session invalidation, and forensic audit.', risk: 'HIGH', perms: 12 },
                      { key: 'PLATFORM_ADMIN', name: 'Platform Admin', desc: 'Broad tenant and subscription operations (excludes root keys).', risk: 'HIGH', perms: 28 },
                      { key: 'READ_ONLY_ADMIN', name: 'Read-Only Admin', desc: 'View permitted platform dashboards without mutation permissions.', risk: 'LOW', perms: 10 },
                    ].map((r) => (
                      <label
                        key={r.key}
                        onClick={() => setCreateFormData({ ...createFormData, role_key: r.key })}
                        className={cn(
                          'p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition',
                          createFormData.role_key === r.key
                            ? 'border-[#047857] bg-emerald-50/40 shadow-xs'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="role"
                            checked={createFormData.role_key === r.key}
                            onChange={() => setCreateFormData({ ...createFormData, role_key: r.key })}
                            className="text-[#047857] focus:ring-[#047857]"
                          />
                          <div>
                            <span className="font-bold text-xs text-gray-900 flex items-center gap-2">
                              {r.name}
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                  r.risk === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-[#047857] border border-emerald-200'
                                )}
                              >
                                {r.risk} RISK
                              </span>
                            </span>
                            <p className="text-[11px] text-gray-500 mt-0.5">{r.desc}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#047857]">{r.perms} perms</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Administrator Name:</span>
                      <span className="text-xs font-bold text-gray-900">
                        {createFormData.first_name} {createFormData.last_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Work Email:</span>
                      <span className="text-xs font-mono font-bold text-gray-900">{createFormData.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Assigned Role:</span>
                      <span className="text-xs font-bold text-[#047857]">{createFormData.role_key}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">MFA Policy:</span>
                      <span className="text-xs font-bold text-[#047857]">Enforced & Required</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      The user will be created in <strong>Invitation Pending</strong> state. They will receive a cryptographic invitation token and must enroll in TOTP MFA before platform privileges are activated.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              {wizardStep > 1 ? (
                <button
                  onClick={handlePrevStep}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 4 ? (
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#047857] text-white hover:bg-[#065f46] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinishCreateStaff}
                  disabled={isCreatingStaff}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#047857] text-white hover:bg-[#065f46] transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingStaff ? 'Provisioning Staff...' : 'Create & Send Invitation'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
      )}

      {/* 9. MODAL: CHANGE ROLE */}
      {isChangeRoleModalOpen && roleChangeTarget && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#047857]" />
                Modify Role for {roleChangeTarget.name}
              </h3>
              <button onClick={() => setIsChangeRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1.5 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Current Role:</span>
                <span className="font-bold text-gray-900">{roleChangeTarget.role_key}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">New Role</label>
              <select
                value={targetNewRoleKey}
                onChange={(e) => setTargetNewRoleKey(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 font-medium"
              >
                <option value="SUPER_ADMIN">Super Admin (Root Authority)</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
                <option value="OPERATIONS_ADMIN">Operations Admin</option>
                <option value="SECURITY_ADMIN">Security Admin</option>
                <option value="SUPPORT_ADMIN">Support Admin</option>
                <option value="READ_ONLY_ADMIN">Read-Only Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Business Justification Reason *
              </label>
              <textarea
                rows={3}
                placeholder="Reason required for compliance audit..."
                value={roleChangeReason}
                onChange={(e) => setRoleChangeReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsChangeRoleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRoleChange}
                disabled={isSubmittingRoleChange}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#047857] text-white hover:bg-[#065f46] disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRoleChange ? 'Updating...' : 'Confirm Role Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: STATUS CHANGE (SUSPEND / DISABLE) */}
      {isStatusModalOpen && statusTarget && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Change Status to {targetNewStatus}
              </h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
              <p className="font-bold">Action consequences:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Blocks all future login and authentication attempts.</li>
                <li>Immediately invalidates and terminates all active device sessions.</li>
                <li>Preserves historical audit log references without data loss.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Justification Reason *
              </label>
              <textarea
                rows={3}
                placeholder="State the security or organizational reason..."
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitStatusChange}
                disabled={isSubmittingStatusChange}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingStatusChange ? 'Applying...' : `Confirm ${targetNewStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. DETAIL DRAWER FOR SELECTED STAFF (with Requirement 49 Timeline) */}
      {isDetailDrawerOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full border-l border-gray-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6 animate-slideLeft">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#047857] to-emerald-500 text-white font-bold flex items-center justify-center text-base shadow-xs">
                    {selectedStaff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      {selectedStaff.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] font-bold border border-emerald-200">
                        {selectedStaff.status}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">{selectedStaff.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Tabs in Drawer */}
              <div className="flex gap-2 border-b border-gray-100 pb-1 flex-wrap">
                <button
                  onClick={() => setDetailTab('overview')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer',
                    detailTab === 'overview' ? 'bg-emerald-50 text-[#047857]' : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  Identity & Details
                </button>
                <button
                  onClick={() => setDetailTab('permissions')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer',
                    detailTab === 'permissions' ? 'bg-emerald-50 text-[#047857]' : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  Why Access Granted?
                </button>
                <button
                  onClick={() => setDetailTab('sessions')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer',
                    detailTab === 'sessions' ? 'bg-emerald-50 text-[#047857]' : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  Active Sessions ({selectedStaff.active_sessions_count})
                </button>
                <button
                  onClick={() => setDetailTab('activity')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer',
                    detailTab === 'activity' ? 'bg-emerald-50 text-[#047857]' : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  Activity Timeline
                </button>
              </div>

              {/* Drawer Content */}
              {detailTab === 'overview' && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Staff Code:</span>
                      <span className="font-mono font-bold text-gray-900">{selectedStaff.staff_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Job Title:</span>
                      <span className="font-bold text-gray-900">{selectedStaff.job_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Department:</span>
                      <span className="font-bold text-gray-900">{selectedStaff.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Assigned Role:</span>
                      <span className="font-bold text-[#047857]">{selectedStaff.role_display_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">MFA Policy:</span>
                      <span className="font-bold text-[#047857]">Enforced (TOTP)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Account Validity:</span>
                      <span className="text-gray-800 font-medium">
                        {selectedStaff.account_expiry_date
                          ? `Expires on ${new Date(selectedStaff.account_expiry_date).toLocaleDateString()}`
                          : 'Permanent Staff Account'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'permissions' && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1">
                    <span className="font-bold text-[#047857]">Access Attribution Hierarchy:</span>
                    <p className="text-gray-700">
                      User: <strong>{selectedStaff.name}</strong> → Role: <strong>{selectedStaff.role_display_name}</strong> →{' '}
                      {selectedStaff.permissions_count} Allowed Operations.
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-2 border border-gray-100">
                    <span className="font-bold text-gray-800">Granted Capabilities:</span>
                    <ul className="space-y-1 text-gray-600 list-disc pl-4 text-[11px]">
                      {selectedStaff.role_key === 'SUPER_ADMIN' ? (
                        <>
                          <li>Full Root Platform Super Admin Authority</li>
                          <li>Master API Key Generation & Rotation</li>
                          <li>IAM Staff & Delegated Role Provisioning</li>
                          <li>TLS Cipher & Firewall Policy Management</li>
                        </>
                      ) : (
                        <>
                          <li>Customer Case & Escalation Management</li>
                          <li>Tenant Health & Telemetry Inspection</li>
                          <li>Standard Operational Runbook Execution</li>
                          <li>Restricted from Billing Infrastructure & Master IAM</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {detailTab === 'sessions' && (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Active Device Session</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-[#047857] font-bold border border-emerald-200">
                        LIVE
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Chrome on Windows (103.21.144.92) - Active now</p>
                    <button
                      onClick={() => handleRevokeStaffSessions(selectedStaff)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Terminate Active Session
                    </button>
                  </div>
                </div>
              )}

              {/* Requirement 49: Activity Timeline */}
              {detailTab === 'activity' && (
                <div className="space-y-3">
                  {staffActivities.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No recent security activity logged for this account.</p>
                  ) : (
                    <div className="space-y-3">
                      {staffActivities.map((act) => (
                        <div key={act.id} className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-900 font-mono">{act.action}</span>
                            <span className="text-[10px] text-gray-500">{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] text-gray-600">{act.reason || 'Normal operation'}</p>
                          <div className="text-[10px] font-mono text-gray-400 flex justify-between pt-1 border-t border-gray-200">
                            <span>IP: {act.ip_address}</span>
                            <span>Req: {act.request_id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleOpenChangeRole(selectedStaff);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-[#047857] hover:bg-emerald-100 transition cursor-pointer"
              >
                Change Role
              </button>
              <button
                onClick={() => handleResendInvitation(selectedStaff)}
                disabled={isResendingInvite === selectedStaff.id}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Resend official onboarding invitation email via Resend SMTP"
              >
                {isResendingInvite === selectedStaff.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Resend Invite
              </button>
              {selectedStaff.status === 'Active' ? (
                <button
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenStatusChange(selectedStaff, 'Suspended');
                  }}
                  disabled={selectedStaff.is_root_superadmin}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition disabled:opacity-30 cursor-pointer"
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleOpenStatusChange(selectedStaff, 'Active');
                  }}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-[#047857] hover:bg-emerald-100 transition cursor-pointer"
                >
                  Activate
                </button>
              )}
              {!selectedStaff.is_root_superadmin && selectedStaff.role_key !== 'SUPER_ADMIN' && (
                <button
                  onClick={() => handleDeleteStaff(selectedStaff)}
                  className="py-2 px-3 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  title="Delete Account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
