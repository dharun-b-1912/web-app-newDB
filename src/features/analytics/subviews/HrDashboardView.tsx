import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Users, UserCheck, Clock, ShieldAlert, Award, FileSpreadsheet } from 'lucide-react';

export const HrDashboardView: React.FC = () => {
  const hrKpis = [
    { label: 'Total Employees', val: '428', sub: 'Active: 416' },
    { label: 'Probation Employees', val: '32', sub: 'Evaluation Pending' },
    { label: 'Notice Period', val: '8', sub: 'Exit Handover Active' },
    { label: 'On Leave Today', val: '14', sub: 'Approved Absence' },
    { label: 'WFH Today', val: '45', sub: 'Hybrid Roster' },
    { label: 'Open HR Tickets', val: '14', sub: '98.4% SLA On Track' },
  ];

  const departmentHeadcount = [
    { dept: 'Engineering & DevOps', count: 185, pct: '43.2%', growth: '+12%' },
    { dept: 'Product & Design', count: 72, pct: '16.8%', growth: '+8%' },
    { dept: 'Quality Assurance', count: 54, pct: '12.6%', growth: '+4%' },
    { dept: 'Sales & Marketing', count: 68, pct: '15.9%', growth: '+15%' },
    { dept: 'HR & Administration', count: 49, pct: '11.5%', growth: '+2%' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>Operational HR Executive Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time headcount status, probation evaluations, active notice periods, and department breakdowns</p>
        </div>
        <Badge variant="emerald">Operational Domain Active</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {hrKpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
            <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-1">{kpi.val}</span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Department Headcount & Growth Matrix</h3>
          <Badge variant="emerald">Q3 2026 Headcount</Badge>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Department</th>
              <th className="p-4 font-mono">Headcount</th>
              <th className="p-4 font-mono">% Share</th>
              <th className="p-4 font-mono">YoY Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {departmentHeadcount.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">{row.dept}</td>
                <td className="p-4 text-gray-800 font-bold">{row.count} Employees</td>
                <td className="p-4 text-gray-600">{row.pct}</td>
                <td className="p-4 text-emerald-700 font-bold">{row.growth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
