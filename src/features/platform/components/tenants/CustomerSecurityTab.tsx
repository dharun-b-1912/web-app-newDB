// src/features/platform/components/tenants/CustomerSecurityTab.tsx
// ============================================================
// Joy PeopleHR — Customer Security, Auth & Session Controls Tab
// ============================================================

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Users,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';

export interface CustomerSecurityTabProps {
  organization: OrganizationRecord;
}

export const CustomerSecurityTab: React.FC<CustomerSecurityTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const handleRevokeSessions = () => {
    setShowRevokeModal(false);
    showToast(`All 14 active user sessions revoked for ${org.legal_name}. Staff must re-authenticate.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">MFA Enforcement</span>
          <div className="text-xl font-bold text-[#047857] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>100% (Enforced)</span>
          </div>
          <span className="text-[11px] text-gray-500">TOTP Authenticator active on all admin roles</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Sessions</span>
          <div className="text-2xl font-bold font-mono text-gray-900">14 Sessions</div>
          <span className="text-[11px] text-gray-500">Across web & mobile apps</span>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Security Incidents (30d)</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">0 Incidents</div>
          <span className="text-[11px] text-gray-500">Zero suspicious login anomalies</span>
        </div>
      </div>

      {/* Session Controls */}
      <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Authentication & Session Enforcement</h3>
            <p className="text-xs text-gray-500 mt-0.5">Emergency session revocation and credential reset tools.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeModal(true)}
            className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke All Active Sessions
          </Button>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span>Session Timeout Quota:</span>
            <strong className="text-gray-900">8 Hours of Inactivity</strong>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span>Single Sign-On (SAML / OIDC):</span>
            <strong className="text-gray-900">Configurable on Business / Enterprise Plan</strong>
          </div>
          <div className="flex justify-between py-1.5">
            <span>Database Encryption:</span>
            <strong className="text-[#047857]">AES-256 (At-Rest) & TLS 1.3 (In-Transit)</strong>
          </div>
        </div>
      </div>

      {/* Platform Support Access History */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Platform Support Access Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">Audited history of temporary support sessions launched by Platform Admins.</p>
          </div>
          <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
            Immutable Audit Trail
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Administrator</th>
                <th className="py-3 px-4">Access Mode</th>
                <th className="py-3 px-4">Reason / Ticket</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              <tr>
                <td className="py-3.5 px-5">
                  <div className="font-bold text-gray-900">Thirumalai R K</div>
                  <span className="text-[10px] text-gray-400">Platform Admin</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                    SUPPORT ACCESS
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="text-gray-900 font-semibold">Investigating biometric hardware push daemon credentials</div>
                  <span className="text-[10px] text-purple-700 font-mono">SUP-10482</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-gray-600">14 minutes</td>
                <td className="py-3.5 px-4 text-gray-500">17 Aug 2026 11:42 IST</td>
                <td className="py-3.5 px-5 text-right font-bold text-emerald-700">Completed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Sessions Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
            <h3 className="text-base font-bold text-gray-900">Revoke All Active Sessions?</h3>
            <p className="text-xs text-gray-600">
              This will immediately terminate all active web and mobile sessions for staff at <strong>{org.legal_name}</strong>. Users must re-enter their credentials and MFA codes to log in.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRevokeModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleRevokeSessions} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Revoke All Sessions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
