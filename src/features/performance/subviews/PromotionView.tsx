import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { PromotionRecommendation } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserCheck, Award, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const PromotionView: React.FC = () => {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<PromotionRecommendation[]>([]);

  useEffect(() => {
    setPromotions(performanceApi.getPromotions());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#07563D]" />
            <span>Promotion Recommendations & Approval Workflow</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Appraisal-driven promotion recommendations with handoff to Core HR master data</p>
        </div>

        <Button size="sm" onClick={() => showToast('New promotion recommendation form opened')}>
          Recommend Promotion
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Current Designation</th>
              <th className="p-4">Proposed Designation</th>
              <th className="p-4 text-center">Appraisal Rating</th>
              <th className="p-4">Effective Date</th>
              <th className="p-4">Recommended By</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {promotions.map(prm => (
              <tr key={prm.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-extrabold text-gray-900">
                  {prm.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{prm.department_name}</span>
                </td>
                <td className="p-4 font-bold text-gray-600">{prm.current_designation}</td>
                <td className="p-4 font-extrabold text-[#07563D] flex items-center gap-1">
                  <span>{prm.proposed_designation}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </td>
                <td className="p-4 text-center font-mono font-black text-amber-700">{prm.performance_rating} / 5.0</td>
                <td className="p-4 font-mono text-gray-600">{prm.effective_date}</td>
                <td className="p-4 font-medium text-gray-700">{prm.recommended_by_name}</td>
                <td className="p-4 text-center"><Badge variant="emerald">{prm.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
