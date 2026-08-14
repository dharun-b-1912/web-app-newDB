import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlGoalItem } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, Plus, Star } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlPerformanceView: React.FC = () => {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<TlGoalItem[]>([]);

  useEffect(() => {
    setGoals(tlApi.getTeamGoals());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" />
            <span>Team Performance Goals, KPIs & Skill Reviews</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage team member OKR goals, KPI progress, provide TL feedback, and identify skill development gaps</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Assign Team Member Goal modal opened')}>
          Assign Goal
        </Button>
      </div>

      <div className="space-y-4">
        {goals.map(g => (
          <div key={g.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-gray-700 block font-sans">Team Member: {g.employee_name}</span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{g.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Target: {g.target_metric} • Due: {g.due_date}</p>
              </div>
              <Badge variant="emerald">{g.status}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Progress: {g.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#07563D] h-full" style={{ width: `${g.progress_pct}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
