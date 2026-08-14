import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { ReviewCycle } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { RefreshCw, Plus, Calendar, CheckCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const ReviewCyclesView: React.FC = () => {
  const { showToast } = useToast();
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);

  useEffect(() => {
    setCycles(performanceApi.getReviewCycles());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#07563D]" />
            <span>Performance Review Cycles & Assessment Forms</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage annual, quarterly, probation, and 360° feedback appraisal cycles</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Launch Review Cycle wizard')}>
          Launch New Cycle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cycles.map(cyc => (
          <div key={cyc.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {cyc.cycle_type} • {cyc.period}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{cyc.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Template: {cyc.template_name}</p>
              </div>
              <Badge variant="emerald">{cyc.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-gray-50 border border-gray-100 font-mono">
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Self Review Deadline</span>
                <span className="font-bold text-gray-800">{cyc.self_review_deadline}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Manager Deadline</span>
                <span className="font-bold text-gray-800">{cyc.manager_review_deadline}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>Completion Status</span>
                <span className="font-mono text-[#07563D]">{cyc.completed_count} / {cyc.eligible_employees_count} ({Math.round((cyc.completed_count / cyc.eligible_employees_count) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#07563D]" style={{ width: `${Math.round((cyc.completed_count / cyc.eligible_employees_count) * 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
