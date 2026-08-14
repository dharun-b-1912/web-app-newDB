import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { PerformanceRating } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Star, Grid, CheckCircle2, Lock } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const RatingsView: React.FC = () => {
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<PerformanceRating[]>([]);

  useEffect(() => {
    setRatings(performanceApi.getRatings());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-[#07563D]" />
            <span>Calibrated Ratings & 9-Box Talent Matrix</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Audit-proof performance scores, calibration adjustments, and finalized appraisal ratings</p>
        </div>

        <Button size="sm" leftIcon={<Lock className="w-4 h-4" />} onClick={() => showToast('Finalized & locked Q3 appraisal ratings')}>
          Finalize & Lock Ratings
        </Button>
      </div>

      {/* Ratings Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Employee Final Ratings Register ({ratings.length})</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Reporting Manager</th>
              <th className="p-4 text-center">Calculated Score</th>
              <th className="p-4 text-center">Proposed Rating</th>
              <th className="p-4 text-center">Final Calibrated Rating</th>
              <th className="p-4">Rating Label</th>
              <th className="p-4">9-Box Position</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {ratings.map(rat => (
              <tr key={rat.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-extrabold text-gray-900">
                  {rat.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{rat.department_name}</span>
                </td>
                <td className="p-4 font-bold text-gray-700">{rat.manager_name}</td>
                <td className="p-4 text-center font-mono font-bold text-gray-600">{rat.calculated_score} / 5.0</td>
                <td className="p-4 text-center font-mono font-bold text-gray-800">{rat.proposed_rating}</td>
                <td className="p-4 text-center font-mono font-black text-[#07563D] text-sm">{rat.final_rating}</td>
                <td className="p-4 font-bold text-emerald-800">{rat.rating_label}</td>
                <td className="p-4 text-gray-700 font-semibold">{rat.grid_9box_position}</td>
                <td className="p-4 text-center"><Badge variant="emerald">Finalized</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
