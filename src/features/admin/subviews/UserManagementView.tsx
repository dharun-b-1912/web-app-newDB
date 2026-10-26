// src/features/admin/subviews/UserManagementView.tsx
// ============================================================
// Joy PeopleHR — User Provisioning & Lifecycle Management
// Real User Management, Invitation Dispatch, Role Assignments & Session Controls
// ============================================================

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { AdminUser, UserInvitation } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Users, Mail, Plus, ShieldCheck, Trash2, Send, Search, CheckCircle2, Pencil, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { api } from '../../../services/api';
import { supabase } from '../../../lib/supabase';

export const UserManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'users' | 'invitations'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [provisionMode, setProvisionMode] = useState<'direct' | 'invite'>('direct');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteName, setInviteName] = useState<string>('');
  const [invitePhone, setInvitePhone] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('HR Head');
  const [inviteDept, setInviteDept] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserDept, setEditUserDept] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<AdminUser['status']>('Active');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserDept(u.department_name);
    setEditUserRole(u.role_name);
    setEditUserStatus(u.status || 'Active');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await adminApi.updateUser(editingUser.id, {
        name: editUserName,
        department_name: editUserDept,
        role_name: editUserRole,
        status: editUserStatus,
      });
      showToast(`User ${editUserName} updated successfully!`, 'success');
      setEditingUser(null);
      await refreshData();
    } catch {
      showToast('Failed to update user', 'error');
    }
  };

  const handleToggleUserStatus = async (u: AdminUser) => {
    const isCurrentlyActive = u.status === 'Active';
    const newStatus: AdminUser['status'] = isCurrentlyActive ? 'Deactivated' : 'Active';
    try {
      await adminApi.updateUser(u.id, { status: newStatus as any });
      showToast(`User ${u.name} set to ${newStatus}`, 'success');
      await refreshData();
    } catch {
      showToast('Failed to update user status', 'error');
    }
  };

  const handleDeleteUserConfirmed = async () => {
    if (!confirmDeleteUser) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteUser(confirmDeleteUser.id);
      showToast(`User ${confirmDeleteUser.name} deleted`, 'success');
      setConfirmDeleteUser(null);
      await refreshData();
    } catch {
      showToast('Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshData = async () => {
    try {
      const liveUsers = await adminApi.getUsersAsync();
      setUsers(liveUsers);
    } catch {
      setUsers(adminApi.getUsers());
    }
    try {
      const liveInvs = await adminApi.getInvitationsAsync();
      setInvitations(liveInvs);
    } catch {
      setInvitations(adminApi.getInvitations());
    }

    try {
      const activeComp = api.getActiveCompany();
      const currentOrgId = activeComp?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
      const liveDepts = await api.getDepartments(activeComp?.id);
      if (liveDepts && liveDepts.length > 0) {
        setDepartments(liveDepts.map(d => ({ id: d.id, name: d.name, code: d.code })));
        if (!inviteDept) setInviteDept(liveDepts[0]?.name || 'Development');
      } else {
        const { data: dbDepts } = await supabase
          .from('departments')
          .select('id, name, code')
          .eq('organization_id', currentOrgId)
          .order('name', { ascending: true });
        if (dbDepts && dbDepts.length > 0) {
          setDepartments(dbDepts);
          if (!inviteDept) setInviteDept(dbDepts[0]?.name || 'Development');
        }
      }
    } catch (err) {
      console.warn('[UserManagementView] Dynamic departments fetch notice:', err);
    }
  };

  useEffect(() => {
    refreshData();
    try {
      realtimeChannelManager.subscribeToTable('user_profiles', () => refreshData());
      realtimeChannelManager.subscribeToTable('user_roles', () => refreshData());
      realtimeChannelManager.subscribeToTable('organization_invitations', () => refreshData());
      realtimeChannelManager.subscribeToTable('departments', () => refreshData());
    } catch (err) {
      console.warn('[UserManagementView] Realtime subscription notice:', err);
    }
  }, []);

  const handleCreateOrInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      showToast('Please enter full name and email address', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (provisionMode === 'direct') {
        const result = await adminApi.provisionUserDirectly({
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
          roleName: inviteRole,
          department: inviteDept,
          phone: invitePhone.trim(),
        });

        if (result.success) {
          showToast(`Account provisioned successfully for ${inviteName}! Temporary password: joypeoplehr`, 'success');
          setInviteEmail('');
          setInviteName('');
          setInvitePhone('');
          setIsInviteModalOpen(false);
          await refreshData();
        } else {
          showToast(result.error || 'Failed to provision user account', 'error');
        }
      } else {
        await adminApi.sendInvitationAsync({
          email: inviteEmail.trim(),
          employee_name: inviteName.trim(),
          role_name: inviteRole,
        });
        showToast(`Invitation dispatched to ${inviteEmail}`, 'success');
        setInviteEmail('');
        setInviteName('');
        setInvitePhone('');
        setIsInviteModalOpen(false);
        await refreshData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing user operation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (id: string, email: string) => {
    await adminApi.cancelInvitationAsync(id);
    showToast(`Invitation for ${email} cancelled`, 'info');
    refreshData();
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>User Provisioning & Lifecycle Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">User account provisioning, email invitations, session management, MFA status, and periodic access reviews</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Mail className="w-4 h-4" />}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Send Invitation
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#053e2c] text-white"
            onClick={() => setIsInviteModalOpen(true)}
          >
            Provision User
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'users' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active Users ({users.length})
          </button>
          <button
            onClick={() => setTab('invitations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'invitations' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pending Invitations ({invitations.length})
          </button>
        </div>

        {tab === 'users' && (
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        )}
      </div>

      {/* Table: Active Users */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">User Code</th>
                <th className="p-4">Name & Email</th>
                <th className="p-4 font-mono">Employee ID</th>
                <th className="p-4">Department</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4 text-center">MFA Status</th>
                <th className="p-4 font-mono">Last Session</th>
                <th className="p-4 text-center">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-mono font-bold text-gray-900">{user.user_code}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{user.name}</div>
                    <div className="text-[11px] text-gray-500">{user.email}</div>
                  </td>
                  <td className="p-4 font-mono text-gray-700">{user.employee_id}</td>
                  <td className="p-4 font-medium text-gray-700">{user.department_name}</td>
                  <td className="p-4">
                    <Badge variant={user.role_name === 'Company Admin' ? 'purple' : user.role_name === 'HR Head' ? 'info' : 'secondary'} size="sm">
                      {user.role_name}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Enforced</span>
                    </span>
                  </td>
                  <td className="p-4 font-mono text-gray-600 text-[11px]">{user.last_login}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={user.status === 'Active' ? 'emerald' : 'gray'}>{user.status}</Badge>
                      <button
                        type="button"
                        title={user.status === 'Active' ? 'Click to Disable Account' : 'Click to Enable Account'}
                        onClick={() => handleToggleUserStatus(user)}
                        className={cn(
                          "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          user.status === 'Active' ? "bg-emerald-600" : "bg-gray-300"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            user.status === 'Active' ? "translate-x-3" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditUser(user)}
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Edit User"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteUser(user)}
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table: Pending Invitations */}
      {tab === 'invitations' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs space-y-2">
              <Mail className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-gray-800">No Pending Invitations</p>
              <p>All invited team members have activated their credentials.</p>
              <Button size="sm" onClick={() => setIsInviteModalOpen(true)} className="mt-2">
                Invite Staff Member
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Invited Email</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Invited By</th>
                  <th className="p-4 font-mono">Date Sent</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {invitations.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{inv.email}</td>
                    <td className="p-4"><Badge variant="secondary" size="sm">{inv.role_name}</Badge></td>
                    <td className="p-4 text-gray-700">{inv.department_name}</td>
                    <td className="p-4 text-gray-500">{inv.invited_by}</td>
                    <td className="p-4 font-mono text-gray-500 text-[11px]">{new Date(inv.created_at || inv.expiration_date).toLocaleDateString()}</td>
                    <td className="p-4 text-center"><Badge variant="warning">{inv.status}</Badge></td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelInvitation(inv.id, inv.email)}
                        className="text-red-600 hover:bg-red-50 text-xs"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create / Provision Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Provision User Account & Role Assignment"
        size="md"
      >
        <form onSubmit={handleCreateOrInviteUser} className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setProvisionMode('direct')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                provisionMode === 'direct'
                  ? 'bg-white text-[#07563D] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Direct Account Creation (Immediate Login)
            </button>
            <button
              type="button"
              onClick={() => setProvisionMode('invite')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                provisionMode === 'invite'
                  ? 'bg-white text-[#07563D] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Send Email Invitation
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-900">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Work Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. priya.sharma@joycorporate.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Assigned Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
              >
                <option value="HR Head">HR Head / Manager (Full HR Access)</option>
                <option value="HR Admin">HR Administrator</option>
                <option value="Company Admin">Company Admin (Legal Entity Lead)</option>
                <option value="Manager">Reporting Manager</option>
                <option value="Employee">Employee (Self-Service)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Department</label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
              >
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="Development">Development</option>
                )}
              </select>
            </div>
          </div>

          {provisionMode === 'direct' ? (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-[11px] text-[#07563D] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                Direct Supabase Auth Provisioning
              </div>
              <p className="text-gray-700">
                A real Supabase Auth user will be provisioned with temporary password <code className="font-mono font-bold text-emerald-800 bg-emerald-100/80 px-1 py-0.5 rounded">joypeoplehr</code>. The user can log in immediately and will be prompted to set a permanent password.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
              An invitation email will be dispatched if email delivery is configured.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="bg-[#07563D] hover:bg-[#053e2c] text-white"
              leftIcon={provisionMode === 'direct' ? <Plus className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            >
              {isSubmitting
                ? 'Provisioning...'
                : provisionMode === 'direct'
                ? 'Provision User Account'
                : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      {editingUser && (
        <Modal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.name}`}
          description={`Update profile attributes and role assignments for ${editingUser.email}`}
        >
          <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Full Name *</label>
              <input
                type="text"
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-900">Assigned Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
                >
                  <option value="Company Admin">Company Admin</option>
                  <option value="HR Head">HR Head</option>
                  <option value="HR Admin">HR Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-900">Department</label>
                <select
                  value={editUserDept}
                  onChange={(e) => setEditUserDept(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
                >
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value={editUserDept || 'Development'}>{editUserDept || 'Development'}</option>
                  )}
                  {editUserDept && !departments.some(d => d.name.toLowerCase() === editUserDept.toLowerCase()) && (
                    <option value={editUserDept}>{editUserDept}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Account Status</label>
              <select
                value={editUserStatus}
                onChange={(e) => setEditUserStatus(e.target.value as AdminUser['status'])}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
              >
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
                <option value="Suspended">Suspended</option>
                <option value="Locked">Locked</option>
                <option value="Invited">Invited</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" className="bg-[#07563D] hover:bg-[#053e2c] text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Delete User Confirmation */}
      {confirmDeleteUser && (
        <Modal
          isOpen={Boolean(confirmDeleteUser)}
          onClose={() => setConfirmDeleteUser(null)}
          title="Delete User Account"
        >
          <div className="space-y-4 p-2">
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Permanent Account Revocation</p>
                <p className="text-rose-700 mt-0.5">
                  Are you sure you want to remove user account for <strong className="text-gray-900">{confirmDeleteUser.name}</strong> ({confirmDeleteUser.email})?
                  This will revoke all authentication tokens and access privileges.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteUserConfirmed}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm & Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
