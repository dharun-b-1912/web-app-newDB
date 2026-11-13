import React from 'react';
import { Lock } from 'lucide-react';
import { AuthMethodsConfigPanel } from './AuthMethodsConfigPanel';
import { AuthSecurityAuditPanel } from './AuthSecurityAuditPanel';

export const SecurityConfigView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#07563D]" />
            <span>Platform Security Policies &amp; Authentication Governance</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure enabled employee login methods, OTP SMS rules, lockout thresholds, and inspect live sign-in telemetry.
          </p>
        </div>
      </div>

      <AuthMethodsConfigPanel />
      <AuthSecurityAuditPanel />
    </div>
  );
};
