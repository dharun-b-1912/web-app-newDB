// src/features/platform/components/tenants/CustomerPeopleTab.tsx
// ============================================================
// WorkForceOS — Customer Staff, Admins & Role Management Tab
// ============================================================

import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Plus,
  MoreVertical,
  Mail,
  Smartphone,
  CheckCircle2,
  Lock,
  RotateCcw,
  UserX,
  KeyRound,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerPeopleTabProps {
  organization: OrganizationRecord;
}

interface CustomerUserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Organization Owner' | 'Organization Admin' | 'HR Admin' | 'Payroll Admin' | 'Attendance Admin' | 'Manager' | 'Employee';
  status: 'Active' | 'Invited' | 'Suspended';
  department: string;
  lastActive: string;
}

export const CustomerPeopleTab: React.FC<CustomerPeopleTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'HR Admin' as const,
    department: 'People Operations',
  });

  // Canonical user roster starting with primary admin
  const [users, setUsers] = useState<CustomerUserItem[]>([
    {
      id: 'u-1',
      name: org.primary_admin_name || 'Dharun B',
      email: org.primary_admin_email || 'dharun@joycorporate.com',
      phone: org.primary_admin_phone || '+91 98765 43210',
      role: 'Organization Owner',
      status: 'Active',
      department: 'Executive Operations',
      lastActive: 'Just now',
    },
    {
      id: 'u-2',
      name: 'Priya Sundaram',
      email: 'priya.s@joycorporate.com',
      phone: '+91 98765 43211',
      role: 'Organization Admin',
      status: 'Active',
      department: 'People Operations',
      lastActive: '25 min ago',
    },
    {
      id: 'u-3',
      name: 'Karthik Raja',
      email: 'karthik.r@joycorporate.com',
      phone: '+91 98765 43212',
      role: 'Payroll Admin',
      status: 'Active',
      department: 'Finance & Accounts',
      lastActive: '2 hours ago',
    },
    {
      id: 'u-4',
      name: 'Ananya Sharma',
      email: 'ananya.s@joycorporate.com',
      phone: '+91 98765 43213',
      role: 'Attendance Admin',
      status: 'Active',
      department: 'Plant Operations',
      lastActive: 'Yesterday',
    },
  ]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;

    const newUser: CustomerUserItem = {
      id: `u-${Date.now()}`,
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone || '+91 90000 00000',
      role: inviteForm.role,
      status: 'Invited',
      department: inviteForm.department,
      lastActive: 'Invitation Pending',
    };

    setUsers([newUser, ...users]);
    setShowInviteModal(false);
    showToast(`Invitation sent to ${inviteForm.email} (${inviteForm.role})`, 'success');
  };

  const handleDeactivate = (userId: string, name: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'Suspended' } : u)));
    showToast(`Access suspended for ${name}`, 'info');
  };

  const handleResetAccess = (email: string) => {
    showToast(`Password reset link dispatched to ${email}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. TOP SUMMARY STRIP
         ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Members</span>
          <div className="text-xl font-bold text-gray-900">{org.total_employees} staff</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Users</span>
          <div className="text-xl font-bold text-[#047857]">{org.active_employees} active</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Administrators</span>
          <div className="text-xl font-bold text-purple-700">{users.filter((u) => u.role.includes('Admin') || u.role.includes('Owner')).length} admins</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Allocated Seats</span>
          <div className="text-xl font-bold text-gray-900 font-mono">{org.seat_limit} seats</div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. USER DIRECTORY TABLE & SEARCH
         ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#047857]"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> + Invite User
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-gray-900">{u.name}</div>
                    <span className="text-[11px] text-gray-400 font-mono">{u.id}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-gray-600">
                    <div>{u.email}</div>
                    <span className="text-[10px] text-gray-400 font-sans">{u.phone}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        u.role === 'Organization Owner'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role.includes('Admin')
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      )}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-600">{u.department}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        u.status === 'Active' ? 'bg-emerald-50 text-[#047857]' : u.status === 'Invited' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                      )}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">{u.lastActive}</td>
                  <td className="py-3.5 px-5 text-right space-x-2">
                    <button
                      onClick={() => handleResetAccess(u.email)}
                      title="Dispatch password reset"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    {u.status === 'Active' && u.role !== 'Organization Owner' && (
                      <button
                        onClick={() => handleDeactivate(u.id, u.name)}
                        title="Suspend user access"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------
          INVITE USER MODAL
         ---------------------------------------------------- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleInviteSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
            <h3 className="text-base font-bold text-gray-900">Invite User to {org.legal_name}</h3>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Krishnan"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Work Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@joycorporate.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Assigned Role *</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold"
              >
                <option value="Organization Admin">Organization Admin</option>
                <option value="HR Admin">HR Admin</option>
                <option value="Payroll Admin">Payroll Admin</option>
                <option value="Attendance Admin">Attendance Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                Send Invitation
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
