import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { POSHCase, POSHCommitteeMember } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ShieldAlert, Lock, Users, FileText, Plus, EyeOff } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const PoshView: React.FC = () => {
  const { showToast } = useToast();
  const [cases, setCases] = useState<POSHCase[]>([]);
  const [members, setMembers] = useState<POSHCommitteeMember[]>([]);

  useEffect(() => {
    setCases(otherModulesApi.getPOSHCases());
    setMembers(otherModulesApi.getPOSHCommittee());
  }, []);

  return (
    <div className="space-y-6">
      {/* Confidentiality Warning Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-2 select-text">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black tracking-tight text-white">POSH Governance & ICC Confidential Domain</h2>
          </div>
          <Badge variant="amber">RESTRICTED ACCESS • COMPLIANT WITH POSH ACT 2013</Badge>
        </div>
        <p className="text-xs text-slate-300">
          This portal contains legally confidential records. Complainant identities are masked and protected by Supabase RLS policies. Access is strictly audited.
        </p>
      </div>

      {/* ICC Committee Members Roster */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#07563D]" />
              <span>Internal Complaints Committee (ICC) Roster</span>
            </h3>
            <p className="text-xs text-gray-500">Statutory committee members appointed under POSH Act guidelines</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => showToast('Managing ICC Committee Appointment Order...')}>
            Update Committee
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map(m => (
            <div key={m.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1 text-xs">
              <Badge variant="emerald">{m.role}</Badge>
              <h4 className="text-sm font-bold text-gray-900">{m.name}</h4>
              <p className="text-gray-500">{m.department_name}</p>
              <div className="text-[10px] text-emerald-700 font-semibold pt-1">
                Conflict Check: {m.conflict_declared ? 'Declared' : 'No Conflict Declared'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POSH Confidential Case File Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-gray-500" />
            Confidential Case Ledger ({cases.length})
          </span>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Logging new POSH complaint intake form...')}>
            Log Confidential Complaint
          </Button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Case Reference</th>
              <th className="p-4">Protected Complainant ID</th>
              <th className="p-4">Respondent</th>
              <th className="p-4">Category</th>
              <th className="p-4 font-mono">Incident Date</th>
              <th className="p-4">Presiding Officer</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{c.case_reference}</td>
                <td className="p-4 text-slate-600 font-bold bg-slate-50 rounded">{c.complainant_code}</td>
                <td className="p-4 font-sans font-extrabold text-gray-800">{c.respondent_name}</td>
                <td className="p-4 font-sans font-medium text-gray-700">{c.complaint_category}</td>
                <td className="p-4 text-gray-600">{c.incident_date}</td>
                <td className="p-4 font-sans font-medium text-gray-800">{c.presiding_officer_name}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
