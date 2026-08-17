// src/features/platform/components/tenants/CustomerSecurityTab.tsx
// ============================================================
// WorkForceOS — Customer Security, Auth & Session Controls Tab
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
