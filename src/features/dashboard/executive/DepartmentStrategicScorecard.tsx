import React from 'react';
import { Card } from '../../../components/ui/Card';
import { LayoutGrid, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DepartmentScorecardItem } from '../../../services/executiveAnalyticsService';

interface Props {
  scorecards: DepartmentScorecardItem[];
  onNavigate: (route: string) => void;
}

export const DepartmentStrategicScorecard: React.FC<Props> = ({ scorecards, onNavigate }) => {
  return (
    <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
            Department Strategic Scorecard
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Multi-dimensional leadership health matrix across business functions
          </p>
        </div>

        <span className="text-[10px] font-bold text-gray-400 self-start sm:self-auto">
          Click row to inspect workforce
        </span>
      </div>

      {scorecards.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 italic">
          No departments configured in the organization.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <th className="pb-2.5 font-bold">Department</th>
                <th className="pb-2.5 font-bold text-center">Headcount</th>
                <th className="pb-2.5 font-bold text-center">Growth</th>
                <th className="pb-2.5 font-bold text-center">Attrition</th>
                <th className="pb-2.5 font-bold text-center">Attendance</th>
                <th className="pb-2.5 font-bold text-center">Openings</th>
                <th className="pb-2.5 font-bold text-center">Capacity</th>
                <th className="pb-2.5 font-bold text-right">Risk Posture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scorecards.map((row) => {
                const isHighRisk = row.riskLevel === 'High Risk';
                const isModerate = row.riskLevel === 'Moderate';

                return (
                  <tr
                    key={row.departmentId}
                    onClick={() => onNavigate('workforce-overview')}
                    className="hover:bg-emerald-50/20 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 font-bold text-gray-900 flex items-center justify-between pr-4">
                      <span>{row.departmentName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100" />
                    </td>
                    <td className="py-3 font-black text-gray-900 text-center">{row.headcount}</td>
                    <td className="py-3 font-bold text-emerald-700 text-center">
                      {row.growthPct > 0 ? `+${row.growthPct}%` : `${row.growthPct}%`}
                    </td>
                    <td className="py-3 font-bold text-rose-700 text-center">{row.attritionPct}%</td>
                    <td className="py-3 font-bold text-blue-700 text-center">{row.attendancePct}%</td>
                    <td className="py-3 font-bold text-purple-700 text-center">
                      {row.openPositions > 0 ? `+${row.openPositions}` : '0'}
                    </td>
                    <td className="py-3 font-black text-gray-900 text-center">{row.capacityPct}%</td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isHighRisk
                            ? 'bg-rose-100 text-rose-800'
                            : isModerate
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isHighRisk ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {row.riskLevel}
                      </span>
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
