import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Lock, ShieldCheck, KeyRound, Cpu } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const SecurityConfigView: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#07563D]" />
            <span>Platform Security Policies & MFA Enforcement</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Password complexity, mandatory TOTP MFA for administrators, active session revocation, and CIDR IP whitelisting</p>
        </div>

        <Button size="sm" onClick={() => showToast('Platform security configuration updated')}>
          Save Security Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span>Multi-Factor Authentication (MFA) Policy</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex justify-between items-center">
              <span className="font-bold text-emerald-900">Enforce MFA for Administrators</span>
              <Badge variant="emerald">Mandatory Active</Badge>
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Supported MFA Methods</label>
              <input type="text" defaultValue="TOTP Authenticator Apps (Google Auth, Microsoft Auth), Hardware Keys" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#07563D]" />
            <span>Network Security & CIDR IP Rules</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Allowed Admin Office CIDR Ranges</label>
              <input type="text" defaultValue="106.51.72.0/24 (HQ Chennai Office Subnet)" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
