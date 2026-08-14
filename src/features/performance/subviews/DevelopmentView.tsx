import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { DevelopmentPlan } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GraduationCap, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const DevelopmentView: React.FC = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);

  useEffect(() => {
    setPlans(performanceApi.getDevelopmentPlans());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#07563D]" />
            <span>Employee Development & Skill Gap Action Plans</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Post-appraisal learning recommendations, mentorship, and career growth tracks</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Development Plan modal opened')}>
          Create Development Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Action: {plan.action_type}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{plan.employee_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Skill Gap: {plan.skill_gap}</p>
              </div>
              <Badge variant="emerald">{plan.status}</Badge>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <span className="font-bold text-gray-700 block">Development Goal:</span>
              <p className="text-gray-900 font-semibold mt-0.5">{plan.development_goal}</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>Completion Progress</span>
                <span className="font-mono text-[#07563D]">{plan.progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#07563D]" style={{ width: `${plan.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
