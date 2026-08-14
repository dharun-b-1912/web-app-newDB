import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { AdminUser, UserInvitation } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Users, Mail, Plus, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const UserManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'users' | 'invitations'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);

  useEffect(() => {
    setUsers(adminApi.getUsers());
    setInvitations(adminApi.getInvitations());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>User Provisioning & Lifecycle Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">User account provisioning, email invitations, session management, MFA status, and periodic access reviews</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<Mail className="w-4 h-4" />} onClick={() => showToast('Send User Invitation modal opened')}>
            Send Invitation
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Provision User Wizard opened')}>
            Provision User
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
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
                <th className="p-4 font-mono">Last Login</th>
                <th className="p-4 text-center">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{u.user_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">
                    {u.name}
                    <span className="block text-[11px] text-gray-400 font-normal">{u.email}</span>
                  </td>
                  <td className="p-4 text-gray-700 font-bold">{u.employee_id}</td>
                  <td className="p-4 font-sans text-gray-800 font-medium">{u.department_name}</td>
                  <td className="p-4 font-sans"><Badge variant="emerald">{u.role_name}</Badge></td>
                  <td className="p-4 text-center font-sans">{u.mfa_enabled ? <Badge variant="emerald">MFA Active</Badge> : <Badge variant="amber">MFA Off</Badge>}</td>
                  <td className="p-4 text-gray-600">{u.last_login}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invitations' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Target Email</th>
                <th className="p-4">Employee Name</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Target Company</th>
                <th className="p-4 font-mono">Expiration Date</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {invitations.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{inv.email}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{inv.employee_name}</td>
                  <td className="p-4 font-sans"><Badge variant="emerald">{inv.role_name}</Badge></td>
                  <td className="p-4 font-sans text-gray-800">{inv.company_name}</td>
                  <td className="p-4 text-gray-600">{inv.expiration_date}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="amber">{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
