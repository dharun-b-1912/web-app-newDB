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
import { Users, Mail, Plus, ShieldCheck, Trash2, Send, Search, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const UserManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'users' | 'invitations'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('Employee');
  const [inviteDept, setInviteDept] = useState<string>('Engineering');

  const refreshData = () => {
    setUsers(adminApi.getUsers());
    setInvitations(adminApi.getInvitations());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      showToast('Please enter full name and email address', 'error');
      return;
    }

    adminApi.sendInvitation({
      email: inviteEmail.trim(),
      employee_name: inviteName.trim(),
      role_name: inviteRole,
      company_name: 'Joy Corporate Solutions Pvt Ltd',
      expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    });

    showToast(`Invitation sent successfully to ${inviteEmail}`, 'success');
    setInviteEmail('');
    setInviteName('');
    setIsInviteModalOpen(false);
    refreshData();
  };

  const handleCancelInvitation = (id: string, email: string) => {
    adminApi.cancelInvitation(id);
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
                  <td className="p-4 text-center"><Badge variant="emerald">{user.status}</Badge></td>
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
                    <td className="p-4 font-mono text-gray-500 text-[11px]">{new Date(inv.created_at).toLocaleDateString()}</td>
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

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Send Staff Invitation & Role Provisioning"
        size="md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-900">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Anand Viswanathan"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-900">Work Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. anand@joypeople.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Assigned Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              >
                <option value="Employee">Employee (Self-Service)</option>
                <option value="Manager">Reporting Manager</option>
                <option value="HR Admin">HR Administrator</option>
                <option value="HR Head">HR Head / Manager</option>
                <option value="Payroll Admin">Payroll Officer</option>
                <option value="Company Admin">Company Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-900">Department</label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              >
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
                <option value="Operations">Operations</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="bg-[#07563D] hover:bg-[#053e2c] text-white"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Activation Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
