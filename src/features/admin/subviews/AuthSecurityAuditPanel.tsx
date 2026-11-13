import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Unlock,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';
import { multiMethodAuthService } from '../../../services/auth/multiMethodAuthService';
import type { AuthSecurityAuditSummary } from '../../../types/multiMethodAuth';

export const AuthSecurityAuditPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const organizationId = user?.organization_id || null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AuthSecurityAuditSummary | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await multiMethodAuthService.listSecurityAudit(organizationId, 80);
      if (res.ok && res.summary) {
        setSummary(res.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const handleUnlockAccount = async (lockoutId: string, authUserId: string | null) => {
    setUnlockingId(lockoutId);
    try {
      const res = await multiMethodAuthService.hrAssistedRecovery({
        organizationId,
        recoveryAction: 'unlock',
        lockoutId,
        targetAuthUserId: authUserId || undefined,
      });
      if (!res.ok) {
        showToast(res.message || 'Failed to unlock account.', 'error');
        return;
      }
      showToast(res.message || 'Account unlocked successfully.', 'success');
      await loadAudit();
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#07563D]" />
            <span>Authentication Security Audit &amp; Lockout Center</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Live login telemetry across Employee ID, Mobile Password, Mobile OTP, and Email methods.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAudit}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !summary ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#07563D]" />
          <span>Loading authentication audit metrics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
              <p className="text-[11px] font-bold text-emerald-800 uppercase">Successful Logins</p>
              <p className="text-xl font-black text-emerald-950 mt-1">
                {summary?.totalSuccess ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200/70">
              <p className="text-[11px] font-bold text-red-800 uppercase">Failed Attempts</p>
              <p className="text-xl font-black text-red-950 mt-1">
                {summary?.totalFailed ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
              <p className="text-[11px] font-bold text-amber-800 uppercase">Policy Blocked</p>
              <p className="text-xl font-black text-amber-950 mt-1">
                {summary?.totalBlocked ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70">
              <p className="text-[11px] font-bold text-blue-800 uppercase">SMS OTPs Dispatched</p>
              <p className="text-xl font-black text-blue-950 mt-1">
                {summary?.otpSentCount ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-100 border border-gray-200">
              <p className="text-[11px] font-bold text-gray-700 uppercase">Active Lockouts</p>
              <p className="text-xl font-black text-gray-900 mt-1">
                {summary?.activeLockoutsCount ?? 0}
              </p>
            </div>
          </div>

          {/* Locked Accounts with HR-Assisted Unlock */}
          {(summary?.lockedAccounts || []).length > 0 && (
            <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-2.5">
              <h4 className="text-xs font-black text-red-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Currently Locked Employee Accounts ({summary?.lockedAccounts.length})</span>
              </h4>
              <div className="space-y-2">
                {summary?.lockedAccounts.map((lk) => (
                  <div
                    key={lk.id}
                    className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-red-100"
                  >
                    <div className="text-xs">
                      <p className="font-bold text-gray-900">
                        Account ID: {lk.auth_user_id || lk.identifier_key}
                      </p>
                      <p className="text-gray-500">
                        {lk.failed_attempts} failed attempts · Locked until{' '}
                        {lk.locked_until ? new Date(lk.locked_until).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={unlockingId === lk.id}
                      onClick={() => handleUnlockAccount(lk.id, lk.auth_user_id)}
                      className="px-3 py-1.5 rounded-lg bg-[#07563D] text-white text-xs font-bold hover:bg-[#05402D] flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {unlockingId === lk.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                      <span>HR Unlock</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Auth Audit Log Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Timestamp</th>
                    <th className="px-3.5 py-2.5">Method</th>
                    <th className="px-3.5 py-2.5">Event</th>
                    <th className="px-3.5 py-2.5">Identifier / Emp</th>
                    <th className="px-3.5 py-2.5">Platform</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(summary?.logs || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        No authentication audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    summary?.logs.slice(0, 30).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/70">
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                          {log.login_method}
                        </td>
                        <td className="px-3.5 py-2.5 text-gray-700">
                          {log.event_type}
                          {log.failure_reason ? ` (${log.failure_reason})` : ''}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-gray-600">
                          {log.employee_code || log.masked_identifier || '—'}
                        </td>
                        <td className="px-3.5 py-2.5 uppercase text-[10px] font-bold text-gray-500">
                          {log.device_platform || 'web'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : log.status === 'blocked'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {log.status === 'success' ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <AlertOctagon className="w-2.5 h-2.5" />
                            )}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
