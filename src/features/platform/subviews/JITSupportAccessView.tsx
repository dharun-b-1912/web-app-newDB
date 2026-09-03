// ============================================================
// Joy PeopleHR — Just-In-Time (JIT) Support Access Control Center
// ============================================================
// Zero-standing developer access console with audited temporary grant requests.
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Clock, UserCheck, AlertTriangle, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { JITSupportAccessService, JITAccessGrant, JITScope } from '../../../services/observability/jitSupportAccessService';
import { Button } from '../../../components/ui/Button';

export const JITSupportAccessView: React.FC = () => {
  const [grants, setGrants] = useState<JITAccessGrant[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Form State
  const [devEmail, setDevEmail] = useState('developer@joypeoplehr.com');
  const [devName, setDevName] = useState('Arun V. (Backend Lead)');
  const [targetCompany, setTargetCompany] = useState('ABC Facility Services');
  const [targetTenantId, setTargetTenantId] = useState('tenant_abc_services');
  const [scope, setScope] = useState<JITScope>('READ_ONLY_PAYROLL_LOGS');
  const [duration, setDuration] = useState(60);
  const [reason, setReason] = useState('Investigating payroll calculation discrepancy & biometric delay INC-204');
  const [incidentRef, setIncidentRef] = useState('INC-204');

  useEffect(() => {
    setGrants(JITSupportAccessService.getActiveGrants());
    const unsub = JITSupportAccessService.subscribe((list) => {
      setGrants(list);
    });
    return () => unsub();
  }, []);

  const handleCreateGrant = (e: React.FormEvent) => {
    e.preventDefault();
    JITSupportAccessService.requestAccess({
      developerEmail: devEmail,
      developerName: devName,
      targetTenantId,
      targetCompanyName: targetCompany,
      scope,
      reason,
      durationMinutes: duration,
      incidentRef,
    });
    setShowRequestModal(false);
  };

  const handleRevoke = (grantId: string) => {
    JITSupportAccessService.revokeAccess(grantId, 'Platform SuperAdmin');
  };

  return (
    <div className="space-y-6 font-sans text-[#0F172B]">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#047857]" />
            <h2 className="text-lg font-bold text-[#0F172B]">Just-In-Time (JIT) Support Access Engine</h2>
          </div>
          <p className="text-xs text-[#64748B] max-w-xl">
            Enforces zero-standing privileges. Developers must request scoped, time-bound access for tenant investigation. All actions are cryptographically audit-logged.
          </p>
        </div>

        <Button
          onClick={() => setShowRequestModal(true)}
          className="bg-[#047857] hover:bg-[#065F46] text-white text-xs h-9 px-4 cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Request Support Access
        </Button>
      </div>

      {/* Active Grants List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wider">
          Active Support Access Grants ({grants.filter((g) => g.isActive).length})
        </h3>

        {grants.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
            No active support access grants. Zero standing privileges enforced.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {grants.map((g) => (
              <div
                key={g.grantId}
                className={`p-4 bg-white rounded-2xl border transition-all space-y-3 ${
                  g.isActive ? 'border-[#A7F3D0] shadow-xs' : 'border-[#E2E8F0] opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          g.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {g.isActive ? '🟢 ACTIVE GRANT' : '⚪ EXPIRED / REVOKED'}
                      </span>
                      <span className="font-bold text-sm text-[#0F172B]">{g.targetCompanyName}</span>
                      <span className="text-xs text-[#64748B] font-mono">({g.targetTenantId})</span>
                    </div>
                    <p className="text-xs text-[#334155]">
                      <strong>Engineer:</strong> {g.developerName} ({g.developerEmail})
                    </p>
                  </div>

                  {g.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(g.grantId)}
                      className="border-[#FDA4AF] text-[#E11D48] hover:bg-[#FFF1F2] text-xs h-7 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Revoke Now
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl text-xs space-y-1 border border-[#F1F5F9]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Scope: <strong className="text-[#0F172B]">{g.scope}</strong></span>
                    <span className="text-[#64748B]">Incident Ref: <strong className="text-[#047857]">{g.incidentRef}</strong></span>
                  </div>
                  <p className="text-[#64748B]">
                    <strong>Reason:</strong> {g.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                  <span>Granted: {new Date(g.requestedAt).toLocaleTimeString()}</span>
                  <span>Expires: {new Date(g.expiresAt).toLocaleTimeString()}</span>
                  <span>Approved By: {g.approvedBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#047857]" />
                <h3 className="font-bold text-base text-[#0F172B]">Request Just-In-Time Diagnostic Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-[#64748B] hover:text-[#0F172B] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGrant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#334155] mb-1">Developer Name & Email</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    required
                    className="p-2 border border-[#CBD5E1] rounded-xl text-xs"
                  />
                  <input
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    required
                    className="p-2 border border-[#CBD5E1] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Target Tenant / Company</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    required
                    className="p-2 border border-[#CBD5E1] rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value)}
                    required
                    className="p-2 border border-[#CBD5E1] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#334155] mb-1">Permission Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as JITScope)}
                    className="w-full p-2 border border-[#CBD5E1] rounded-xl text-xs bg-white"
                  >
                    <option value="READ_ONLY_PAYROLL_LOGS">Read-Only Payroll Logs</option>
                    <option value="READ_ONLY_ATTENDANCE_LOGS">Read-Only Attendance Logs</option>
                    <option value="READ_ONLY_BIOMETRIC_DIAGNOSTICS">Read-Only Biometric Diagnostics</option>
                    <option value="READ_ONLY_API_TRACES">Read-Only API Traces</option>
                    <option value="FULL_DIAGNOSTIC_ACCESS">Full Diagnostic Access</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1">Duration (Minutes)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full p-2 border border-[#CBD5E1] rounded-xl text-xs bg-white"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (Standard)</option>
                    <option value={120}>120 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Incident Reference ID</label>
                <input
                  type="text"
                  value={incidentRef}
                  onChange={(e) => setIncidentRef(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-xl text-xs font-mono"
                  placeholder="e.g. INC-204"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1">Mandatory Business Justification</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={2}
                  className="w-full p-2 border border-[#CBD5E1] rounded-xl text-xs"
                  placeholder="Why is temporary access required?"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRequestModal(false)}
                  className="border-[#CBD5E1] text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#047857] hover:bg-[#065F46] text-white text-xs h-9 px-4 cursor-pointer"
                >
                  Authorize & Activate Grant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
