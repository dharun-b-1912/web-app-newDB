import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { OKR_Objective } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Target, Layers, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface OkrViewProps {
  initialSubTab?: string;
}

export const OkrView: React.FC<OkrViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'company-okrs');
  const [okrs, setOkrs] = useState<OKR_Objective[]>([]);

  useEffect(() => {
    setOkrs(performanceApi.getOKRs());
  }, []);

  const subTabs = [
    { id: 'company-okrs', label: 'Company OKRs', icon: Target },
    { id: 'department-okrs', label: 'Department OKRs', icon: Layers },
    { id: 'team-okrs', label: 'Team OKRs', icon: Layers },
    { id: 'my-okrs', label: 'My OKRs', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Subnav Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('New Objective modal opened')}>
          New Objective & Key Results
        </Button>
      </div>

      {/* OKR Objective Card */}
      <div className="space-y-6">
        {okrs.map(obj => (
          <div key={obj.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {obj.period} • Scope: {obj.scope}
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">{obj.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{obj.description}</p>
              </div>
              <Badge variant="emerald">{obj.status}</Badge>
            </div>

            {/* Key Results Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Key Results ({obj.key_results.length})</span>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
                {obj.key_results.map(kr => (
                  <div key={kr.id} className="p-3 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-gray-900">{kr.title}</span>
                      <span className="block text-[11px] text-gray-400 font-mono">Owner: {kr.owner_name} • Due: {kr.due_date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-800">{kr.current_value} / {kr.target_value} {kr.unit}</span>
                      <Badge variant="emerald">{kr.progress}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
