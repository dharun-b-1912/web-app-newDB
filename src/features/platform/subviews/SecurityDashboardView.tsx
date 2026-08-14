// src/features/platform/subviews/SecurityDashboardView.tsx
// ============================================================
// WorkForceOS — Platform Security & Session Operations Console
// ============================================================

import React, { useState } from 'react';
import { Shield, ShieldAlert, Key, Lock, AlertTriangle, CheckCircle2, Laptop, Globe, Clock, UserX, RefreshCw } from 'lucide-react';
import { platformSecurityService } from '../../../services/platform';
import { SecuritySessionItem } from '../../../types/platformAdmin';
import { PrivilegedActionModal } from '../components/PrivilegedActionModal';

export const SecurityDashboardView: React.FC = () => {
  const [sessions, setSessions] = useState<SecuritySessionItem[]>(() => platformSecurityService.getSessions());
  const [revokeModal, setRevokeModal] = useState<{ isOpen: boolean; session: SecuritySessionItem | null }>({
    isOpen: false,
    session: null,
  });

  const handleRevokeConfirm = async (reason: string) => {
    if (!revokeModal.session) return;
    const updated = await platformSecurityService.revokeSession(revokeModal.session.id, reason);
    setSessions(sessions.map(s => (s.id === revokeModal.session!.id ? updated : s)));
    setRevokeModal({ isOpen: false, session: null });
  };

  return (
    <div className="space-y-6">
      {/* Privileged Revocation Modal */}
      <PrivilegedActionModal
        isOpen={revokeModal.isOpen}
        onClose={() => setRevokeModal({ isOpen: false, session: null })}
        onConfirm={handleRevokeConfirm}
        title="Revoke Active Admin Session"
        actionLabel="Terminate Session"
        targetName={`${revokeModal.session?.user_email} (${revokeModal.session?.device})`}
        severity="High"
        description="Terminating this session will immediately invalidate the active JWT access and refresh tokens. The user will be redirected to the login screen on their next request."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              Security Command Center
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">SOC2 Type II Audit Mode</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Security & Session Telemetry</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor live administrator sessions, track travel risk anomalies, and enforce immediate token revocations.
          </p>
        </div>
      </div>

      {/* Security Posture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">MFA Adoption Rate</div>
          <div className="text-2xl font-black text-[#07563D] mt-2">100% Admin MFA</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">TOTP Authentication Mandatory</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Threat & Travel Anomalies</div>
          <div className="text-2xl font-black text-emerald-700 mt-2">0 Active Threats</div>
          <div className="text-[10px] text-gray-400 mt-1">No IP brute-force lockouts in last 24h</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">JWT Token Encryption</div>
          <div className="text-2xl font-black text-gray-900 mt-2">RS256 4096-bit</div>
          <div className="text-[10px] text-gray-400 mt-1">Key rotation interval: 90 days</div>
        </div>
      </div>

      {/* Live Admin Sessions Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900">Active Administrator Sessions</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">IP Address & Location</th>
                <th className="py-3 px-4">Device & Browser</th>
                <th className="py-3 px-4">Login Time</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {sessions.map(sess => (
                <tr key={sess.id} className="hover:bg-gray-50/60">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900">{sess.user_name}</div>
                    <div className="text-[10px] text-gray-500">{sess.user_email} • {sess.role_name}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-700">{sess.tenant_name}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-800 text-[11px]">
                    <div>{sess.ip_address}</div>
                    <div className="text-[10px] text-gray-400 font-sans">{sess.location || 'India'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 text-[11px]">{sess.device}</td>
                  <td className="py-3.5 px-4 text-gray-500 text-[11px] font-mono">{sess.login_time}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        sess.risk_level === 'Low'
                          ? 'bg-emerald-100 text-[#07563D]'
                          : sess.risk_level === 'Medium'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-red-100 text-red-900'
                      }`}
                    >
                      {sess.risk_level} Risk
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {sess.status === 'Active' ? (
                      <button
                        onClick={() => setRevokeModal({ isOpen: true, session: sess })}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-red-200"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">Revoked</span>
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
