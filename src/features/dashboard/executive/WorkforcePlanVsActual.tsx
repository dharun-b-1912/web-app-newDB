import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Target, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { DepartmentScorecardItem } from '../../../services/executiveAnalyticsService';

interface Props {
  scorecards: DepartmentScorecardItem[];
  onNavigate: (route: string) => void;
}

export const WorkforcePlanVsActual: React.FC<Props> = ({ scorecards, onNavigate }) => {
  return (
    <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
            <Target className="w-4 h-4 text-indigo-600" />
            Workforce Plan vs Actual Headcount
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Approved staffing limits, actual filled headcount, and recruitment vacancy gap
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onNavigate('talent-recruitment')}
          className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200 self-start sm:self-auto"
        >
          <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
          Review Requisitions
        </Button>
      </div>

      {scorecards.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-xs text-gray-500 font-medium">No approved department plans configured yet.</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigate('organization')}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            Configure Workforce Plan
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="pb-2.5 font-bold">Department</th>
                <th className="pb-2.5 font-bold text-center">Approved Plan</th>
                <th className="pb-2.5 font-bold text-center">Actual Filled</th>
                <th className="pb-2.5 font-bold text-center">Open Vacancies</th>
                <th className="pb-2.5 font-bold text-center">Staffing Gap</th>
                <th className="pb-2.5 font-bold text-right">Capacity Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scorecards.map((row) => {
                const approved = Math.max(row.headcount, row.headcount + row.openPositions);
                const gap = approved - row.headcount;
                const isOverCap = row.capacityPct >= 95;
                const isNearCap = row.capacityPct >= 80 && row.capacityPct < 95;

                return (
                  <tr key={row.departmentId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {row.departmentName}
                    </td>
                    <td className="py-3 font-bold text-gray-700 text-center">{approved}</td>
                    <td className="py-3 font-black text-gray-900 text-center">{row.headcount}</td>
                    <td className="py-3 font-bold text-purple-700 text-center">
                      {row.openPositions > 0 ? `+${row.openPositions}` : '0'}
                    </td>
                    <td className="py-3 text-center">
                      {gap > 0 ? (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                          -{gap} to fill
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Fully Staffed
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOverCap ? 'bg-rose-500' : isNearCap ? 'bg-amber-500' : 'bg-[#07563D]'
                            }`}
                            style={{ width: `${Math.min(100, row.capacityPct)}%` }}
                          />
                        </div>
                        <span className="font-black text-gray-900 text-xs w-8 text-right">
                          {row.capacityPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
