import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Layers, Briefcase, ArrowUpRight } from 'lucide-react';

export interface DepartmentCapacityRow {
  departmentId: string;
  departmentName: string;
  currentCount: number;
  approvedCap: number;
  utilizationPct: number;
  openings: number;
  status: 'Healthy' | 'Near Capacity' | 'Over Capacity';
}

interface Props {
  capacityRows: DepartmentCapacityRow[];
  onOpenRecruitment: () => void;
}

export const WorkforceCapacityView: React.FC<Props> = ({
  capacityRows,
  onOpenRecruitment,
}) => {
  return (
    <Card className="p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight">
            Workforce Capacity & Headcount Utilization
          </h3>
          <p className="text-xs text-gray-500">
            Current staffing vs approved annual budget limits and active recruitment load.
          </p>
        </div>

        <button
          onClick={onOpenRecruitment}
          className="text-xs font-bold text-[#07563D] hover:underline inline-flex items-center gap-1 self-end sm:self-center"
        >
          View Job Requisitions <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[10px]">
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3 text-center">Headcount / Cap</th>
              <th className="py-2.5 px-3">Utilization Rate</th>
              <th className="py-2.5 px-3 text-center">Open Positions</th>
              <th className="py-2.5 px-3 text-right">Capacity State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {capacityRows.map((row) => {
              const getBadgeVariant = (s: DepartmentCapacityRow['status']) => {
                if (s === 'Over Capacity') return 'danger';
                if (s === 'Near Capacity') return 'amber';
                return 'emerald';
              };

              return (
                <tr key={row.departmentId} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-3 font-bold text-gray-900">
                    {row.departmentName}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="font-black text-gray-900">{row.currentCount}</span>
                    <span className="text-gray-400"> / {row.approvedCap}</span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="space-y-1 max-w-xs">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-gray-500">{row.utilizationPct}% staffed</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.utilizationPct >= 95
                              ? 'bg-rose-500'
                              : row.utilizationPct >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, row.utilizationPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    {row.openings > 0 ? (
                      <span className="text-purple-700 bg-purple-50 font-bold px-2 py-0.5 rounded-full">
                        +{row.openings} hiring
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <Badge variant={getBadgeVariant(row.status)} size="sm">
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
