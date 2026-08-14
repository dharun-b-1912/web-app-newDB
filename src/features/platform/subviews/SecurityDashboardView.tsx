import React, { useState } from 'react';
import { Lock, Shield, Laptop, AlertOctagon, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';
import { SecuritySessionItem } from '../../../types/platformAdmin';

export const SecurityDashboardView: React.FC = () => {
  const [sessions, setSessions] = useState<SecuritySessionItem[]>(() => platformAdminApi.getSessions());

  const handleRevoke = (id: string) => {
    platformAdminApi.revokeSession(id);
    setSessions(sessions.map(s => (s.id === id ? { ...s, status: 'Revoked' } : s)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">Platform Security & Active Sessions</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Global authentication security, active user sessions, MFA policy enforcement, and audit safeguards.
        </p>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900">Active User Sessions Across Tenants</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">IP Address & Device</th>
                <th className="py-3 px-4">Login Timestamp</th>
                <th className="py-3 px-4">Session Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sessions.map(sess => (
                <tr key={sess.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{sess.user_name}</div>
                    <div className="text-[10px] text-gray-400">{sess.user_email} ({sess.role_name})</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-700">{sess.tenant_name}</td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-gray-900">{sess.ip_address}</div>
                    <div className="text-[10px] text-gray-400">{sess.device}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-600">{sess.login_time}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] rounded-md ${
                        sess.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {sess.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {sess.status === 'Active' && (
                      <button
                        onClick={() => handleRevoke(sess.id)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                      >
                        Force Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
