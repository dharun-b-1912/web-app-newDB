import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { PIPPlan } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const PipView: React.FC = () => {
  const { showToast } = useToast();
  const [pips, setPips] = useState<PIPPlan[]>([]);

  useEffect(() => {
    setPips(performanceApi.getPIPs());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Performance Improvement Plan (PIP) Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Structured 30-90 day performance recovery plans with weekly check-in logging</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Initiate PIP plan modal opened')}>
          Initiate New PIP
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pips.map(pip => (
          <div key={pip.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  {pip.pip_code} • Review: {pip.review_frequency}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{pip.employee_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{pip.department_name} • Manager: {pip.manager_name}</p>
              </div>
              <Badge variant="amber">{pip.status}</Badge>
            </div>

            <div className="space-y-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <div>
                <span className="font-bold text-rose-800 block text-[10px] uppercase">Identified Performance Gap:</span>
                <p className="text-gray-800 font-semibold mt-0.5">{pip.performance_issues}</p>
              </div>
              <div>
                <span className="font-bold text-[#07563D] block text-[10px] uppercase">Expected Outcomes:</span>
                <p className="text-gray-800 font-semibold mt-0.5">{pip.expected_improvements}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 font-mono">
              <span>Check-ins Completed: <strong>{pip.checkins_completed}</strong></span>
              <span>Period: <strong>{pip.start_date} to {pip.end_date}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
