// src/features/platform/components/tenants/CustomerPeopleTab.tsx
// ============================================================
// WorkForceOS — Customer Staff, Admins & Supabase Auth Invitations Tab
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
  Send,
  Copy,
  Clock,
  ExternalLink,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import {
  platformAuthInvitationService,
  OrganizationInvitation,
  UserRole,
} from '../../../../services/platform/platformAuthInvitationService';
import { AcceptInviteModal } from './AcceptInviteModal';
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
  role: UserRole;
  status: 'Active' | 'Invited' | 'Suspended';
  department: string;
  lastActive: string;
}

export const CustomerPeopleTab: React.FC<CustomerPeopleTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invitations'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInviteForAccept, setSelectedInviteForAccept] = useState<OrganizationInvitation | null>(null);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'HR Admin' as UserRole,
    department: 'People Operations',
    sendSupabaseEmail: true,
  });

  // Active Users Directory
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

  // Invitations State
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>(() =>
    platformAuthInvitationService.getInvitations(org.id)
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;

    try {
      const newInvite = await platformAuthInvitationService.inviteUser({
        organizationId: org.id,
        organizationName: org.legal_name,
        email: inviteForm.email,
        fullName: inviteForm.name,
        phone: inviteForm.phone,
        role: inviteForm.role,
        department: inviteForm.department,
        sendSupabaseEmail: inviteForm.sendSupabaseEmail,
      });

      setInvitations(platformAuthInvitationService.getInvitations(org.id));
      setShowInviteModal(false);
      setInviteForm({
        name: '',
        email: '',
        phone: '',
        role: 'HR Admin',
        department: 'People Operations',
        sendSupabaseEmail: true,
      });
      showToast(`Supabase invite dispatched to ${newInvite.email} (${newInvite.role})`, 'success');
      setActiveSubTab('invitations');
    } catch (err: any) {
      showToast(err.message || 'Invitation failed', 'error');
    }
  };

  const handleCopyInviteLink = (invite: OrganizationInvitation) => {
    navigator.clipboard.writeText(invite.invite_url);
    showToast(`Copied Supabase onboarding link for ${invite.email}`, 'success');
  };

  const handleResendInvite = async (invId: string) => {
    try {
      await platformAuthInvitationService.resendInvitation(invId);
      setInvitations(platformAuthInvitationService.getInvitations(org.id));
      showToast('Invitation resent with refreshed 7-day token.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Resend failed', 'error');
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      await platformAuthInvitationService.revokeInvitation(invId);
      setInvitations(platformAuthInvitationService.getInvitations(org.id));
      showToast('Invitation revoked.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Revoke failed', 'error');
    }
  };

  const handleCompleteAuthPreview = (inv: OrganizationInvitation) => {
    // Convert invite to active user
    const newUser: CustomerUserItem = {
      id: `u-${Date.now().toString().slice(-4)}`,
      name: inv.full_name,
      email: inv.email,
      phone: inv.phone || '+91 98765 00000',
      role: inv.role,
      status: 'Active',
      department: inv.department,
      lastActive: 'Just now',
    };
    setUsers([newUser, ...users]);
    setInvitations(platformAuthInvitationService.getInvitations(org.id));
    setSelectedInviteForAccept(null);
    setActiveSubTab('members');
    showToast(`Account for ${inv.full_name} (${inv.role}) is now Active!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. TOP SUMMARY TILES
         ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Members</span>
          <div className="text-xl font-bold text-gray-900">{users.length + pendingInvitations.length} staff</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Users</span>
          <div className="text-xl font-bold text-[#047857]">{users.filter((u) => u.status === 'Active').length} active</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending Invites</span>
          <div className="text-xl font-bold text-amber-600">{pendingInvitations.length} pending</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Allocated Seats</span>
          <div className="text-xl font-bold text-gray-900 font-mono">{org.seat_limit} seats</div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. DIRECTORY CONTROLS & SUB-TABS
         ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('members')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer',
                activeSubTab === 'members'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Active Members ({users.length})
            </button>
            <button
              onClick={() => setActiveSubTab('invitations')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5',
                activeSubTab === 'invitations'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>Pending Invitations</span>
              {pendingInvitations.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab === 'members' && (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-[#047857]"
                />
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> + Invite User / Admin
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------
            3. ACTIVE MEMBERS TABLE
           ---------------------------------------------------- */}
        {activeSubTab === 'members' && (
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857]">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">{u.lastActive}</td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => showToast(`Password reset link dispatched to ${u.email}`, 'success')}
                        title="Dispatch password reset"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------------------------------------------
            4. PENDING INVITATIONS TABLE (SUPABASE AUTH)
           ---------------------------------------------------- */}
        {activeSubTab === 'invitations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Invited Admin / User</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Invited By</th>
                  <th className="py-3 px-4">Expires In</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {pendingInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      No pending invitations. Click <strong>+ Invite User / Admin</strong> to invite company staff.
                    </td>
                  </tr>
                ) : (
                  pendingInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-gray-900">{inv.full_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{inv.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{inv.department}</td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">{inv.invited_by}</td>
                      <td className="py-3.5 px-4 text-amber-700 font-bold flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>6 days</span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1.5">
                        {/* Copy Link */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteLink(inv)}
                          title="Copy Supabase Invitation Link"
                          className="h-7 px-2 text-[11px] font-bold"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy Link
                        </Button>

                        {/* Test Accept & Onboard */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedInviteForAccept(inv)}
                          className="h-7 px-2 text-[11px] bg-[#047857] hover:bg-[#036246] text-white font-bold"
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> Test Onboarding
                        </Button>

                        {/* Resend */}
                        <button
                          onClick={() => handleResendInvite(inv.id)}
                          title="Resend Invite"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Revoke */}
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          title="Revoke Invitation"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          INVITE USER / ADMIN MODAL (SUPABASE AUTH INTEGRATED)
         ---------------------------------------------------- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleInviteSubmit} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
            <div>
              <h3 className="text-base font-bold text-gray-900">Invite User to {org.legal_name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Dispatches a dedicated Supabase Auth magic invite link with role permissions.</p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Krishnan"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
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
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43219"
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold text-xs"
                >
                  <option value="Organization Owner">Organization Owner</option>
                  <option value="Organization Admin">Organization Admin</option>
                  <option value="HR Admin">HR Admin</option>
                  <option value="Payroll Admin">Payroll Admin</option>
                  <option value="Attendance Admin">Attendance Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. People Operations"
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 cursor-pointer">
              <input
                type="checkbox"
                checked={inviteForm.sendSupabaseEmail}
                onChange={(e) => setInviteForm({ ...inviteForm, sendSupabaseEmail: e.target.checked })}
                className="text-[#047857] rounded"
              />
              <span className="text-gray-800 font-medium">Send Supabase Auth Magic Invite Email immediately</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                Send Invitation
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------
          TEST ACCEPT INVITATION / ONBOARDING MODAL
         ---------------------------------------------------- */}
      {selectedInviteForAccept && (
        <AcceptInviteModal
          isOpen={true}
          invitation={selectedInviteForAccept}
          onClose={() => setSelectedInviteForAccept(null)}
          onCompleteAuth={() => handleCompleteAuthPreview(selectedInviteForAccept)}
        />
      )}
    </div>
  );
};
