import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlTeamMember } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Users, Search, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlMyTeamView: React.FC = () => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<TlTeamMember[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMembers(tlApi.getTeamMembers());
  }, []);

  const filteredMembers = members.filter(
    m => m.name.toLowerCase().includes(search.toLowerCase()) || m.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>My Team Directory & Member Profiles</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Authorized team members list, current work status, active task loads & individual performance metrics</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search team member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50/50"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Employee ID</th>
              <th className="p-4">Name & Email</th>
              <th className="p-4">Designation</th>
              <th className="p-4 font-mono">Location</th>
              <th className="p-4 text-center">Today's Status</th>
              <th className="p-4 font-mono text-center">Active / Overdue Tasks</th>
              <th className="p-4 font-mono text-right">Rating Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {filteredMembers.map(m => (
              <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{m.employee_id}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">
                  {m.name}
                  <span className="block text-[11px] text-gray-400 font-normal">{m.email}</span>
                </td>
                <td className="p-4 font-sans text-gray-800 font-medium">{m.designation}</td>
                <td className="p-4 font-sans text-gray-600">{m.work_location}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{m.today_status}</Badge></td>
                <td className="p-4 text-center text-gray-900 font-bold">
                  {m.active_tasks_count} Active / <span className="text-rose-600">{m.overdue_tasks_count} Overdue</span>
                </td>
                <td className="p-4 text-right font-black text-[#07563D]">{m.performance_score} / 5.0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
