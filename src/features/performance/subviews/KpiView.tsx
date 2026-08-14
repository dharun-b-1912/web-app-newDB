import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { KPI } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { BarChart3, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface KpiViewProps {
  initialSubTab?: string;
}

export const KpiView: React.FC<KpiViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'library');
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    setKpis(performanceApi.getKPIs());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#07563D]" />
            <span>Key Performance Indicators (KPI) Library & Tracking</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Role-based quantitative metrics with minimum, expected, and stretch targets
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create KPI modal opened')}>
          Define New KPI
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">KPI Code & Name</th>
              <th className="p-4">Department & Role</th>
              <th className="p-4 text-center">Min Target</th>
              <th className="p-4 text-center">Expected Target</th>
              <th className="p-4 text-center">Stretch Target</th>
              <th className="p-4 text-center">Actual Achievement</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {kpis.map(kpi => (
              <tr key={kpi.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-extrabold text-gray-900">
                  {kpi.name}
                  <span className="block text-[10px] font-mono text-gray-400 font-normal">{kpi.code}</span>
                </td>
                <td className="p-4 font-bold text-gray-700">{kpi.department_name} • {kpi.role_name}</td>
                <td className="p-4 text-center font-mono text-gray-500">{kpi.min_target}</td>
                <td className="p-4 text-center font-mono font-bold text-gray-800">{kpi.expected_target}</td>
                <td className="p-4 text-center font-mono font-bold text-emerald-800">{kpi.stretch_target}</td>
                <td className="p-4 text-center font-mono font-black text-[#07563D]">{kpi.actual_achievement}%</td>
                <td className="p-4 text-center"><Badge variant="emerald">{kpi.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
