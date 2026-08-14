import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { GrievanceRecord, DisciplinaryCase } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { MessageSquare, Scale, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const GrievanceDisciplineView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'grievance' | 'discipline'>('grievance');
  const [grievances, setGrievances] = useState<GrievanceRecord[]>([]);
  const [discipline, setDiscipline] = useState<DisciplinaryCase[]>([]);

  useEffect(() => {
    setGrievances(otherModulesApi.getGrievances());
    setDiscipline(otherModulesApi.getDisciplinaryCases());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#07563D]" />
            <span>Grievance Desk & Disciplinary Actions Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Workplace grievance tracking, misconduct investigations, and formal disciplinary show-cause notices</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<Scale className="w-4 h-4" />} onClick={() => showToast('Log Disciplinary Notice modal opened')}>
            Issue Disciplinary Notice
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Log Grievance modal opened')}>
            Log Grievance
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('grievance')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'grievance' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Active Grievances ({grievances.length})
        </button>
        <button
          onClick={() => setTab('discipline')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'discipline' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Disciplinary Cases ({discipline.length})
        </button>
      </div>

      {tab === 'grievance' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">Code</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Category</th>
                <th className="p-4">Subject</th>
                <th className="p-4 font-mono">Filing Date</th>
                <th className="p-4">Assigned HR</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {grievances.map(g => (
                <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{g.grievance_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{g.employee_name}</td>
                  <td className="p-4 font-sans font-bold text-gray-700">{g.category}</td>
                  <td className="p-4 font-sans text-gray-800 font-medium">{g.subject}</td>
                  <td className="p-4 text-gray-600">{g.filing_date}</td>
                  <td className="p-4 font-sans text-gray-700">{g.assigned_hr_name}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{g.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'discipline' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-mono">Case Code</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Violation Category</th>
                <th className="p-4 font-mono">Incident Date</th>
                <th className="p-4">Action Recommended</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {discipline.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{d.case_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{d.employee_name}</td>
                  <td className="p-4 font-sans font-bold text-gray-700">{d.violation_category}</td>
                  <td className="p-4 text-gray-600">{d.incident_date}</td>
                  <td className="p-4 font-sans font-bold text-rose-700">{d.action_recommended}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="amber">{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
