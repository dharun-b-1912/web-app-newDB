import React, { useState, useEffect } from 'react';
import { essApi } from '../../../services/essApi';
import { EssGoalItem } from '../../../types/ess';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, Star, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssPerformanceView: React.FC = () => {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<EssGoalItem[]>([]);

  useEffect(() => {
    setGoals(essApi.getGoals());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" />
            <span>My Performance Goals, OKRs & Self Assessment</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Track individual goals, KPI metrics, KRAs, review cycle self-assessments, and released manager feedback</p>
        </div>

        <Button size="sm" onClick={() => showToast('Self-Assessment Review form opened')}>
          Complete Self Assessment
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">My Active Performance Goals</h3>
        {goals.map(g => (
          <div key={g.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Weight: {g.weight_pct}%
                </span>
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
