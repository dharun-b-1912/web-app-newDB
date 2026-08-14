import React, { useState } from 'react';
import { HelpCircle, AlertTriangle, ShieldCheck, Clock, CheckCircle, Key } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';
import { SupportAccessRequest } from '../../../types/platformAdmin';

export const SupportCenterView: React.FC = () => {
  const [supportRequests, setSupportRequests] = useState<SupportAccessRequest[]>(() =>
    platformAdminApi.getSupportRequests()
  );
  const [activeSupportSession, setActiveSupportSession] = useState<string | null>(null);

  const handleStartSession = (req: SupportAccessRequest) => {
    setActiveSupportSession(req.tenant_name);
  };

  return (
    <div className="space-y-6">
      {/* Support Impersonation Banner when active */}
      {activeSupportSession && (
        <div className="bg-amber-500 text-slate-900 p-4 rounded-2xl font-bold flex items-center justify-between shadow-lg border border-amber-600 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-sm uppercase tracking-wider font-black">⚠ SUPPORT ACCESS SESSION ACTIVE</div>
              <div className="text-xs font-normal">
                You are currently viewing <span className="font-extrabold">{activeSupportSession}</span> under time-limited support access. All actions are audited.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveSupportSession(null)}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            End Support Session
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">Tenant Support & Controlled Access</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Audited, time-limited support access requests for customer issue resolution without unrestricted impersonation.
        </p>
      </div>

      {/* Support Access Requests */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900">Support Access Requests</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Request ID & Tenant</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Reason / Issue</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {supportRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    <div>{req.tenant_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{req.id}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-800 font-semibold">{req.requested_by}</td>
                  <td className="py-3 px-4 text-gray-600">{req.reason}</td>
                  <td className="py-3 px-4 font-mono text-gray-700">{req.duration_minutes} Minutes</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleStartSession(req)}
                      className="px-3 py-1 bg-[#07563D] hover:bg-[#064733] text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                    >
                      Start Support Session
                    </button>
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
