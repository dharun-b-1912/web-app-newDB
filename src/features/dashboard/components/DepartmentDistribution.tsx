import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Building2, ArrowRight } from 'lucide-react';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface DepartmentDistributionItem {
  id?: string;
  name: string;
  count: number;
  color: string;
  percentage: number;
}

interface Props {
  departments: DepartmentDistributionItem[];
  totalEmployees: number;
  onSelectDepartment?: (deptName: string) => void;
  onViewAllDepartments: () => void;
}

export const DepartmentDistribution: React.FC<Props> = ({
  departments,
  totalEmployees,
  onSelectDepartment,
  onViewAllDepartments,
}) => {
  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Department Share
          </h2>
          <p className="text-xs text-gray-500">Active headcount distribution by functional unit</p>
        </div>
        <button
          onClick={onViewAllDepartments}
          className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1"
        >
          View Org Chart
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {departments.length === 0 ? (
        <DashboardEmptyState
          icon={Building2}
          title="No departments configured"
          description="Create organizational departments in the Organization module to view distribution."
        />
      ) : (
        <div className="space-y-4">
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departments}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {departments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DepartmentDistributionItem;
                      return (
                        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-gray-800 space-y-0.5">
                          <p className="font-bold">{data.name}</p>
                          <p className="text-gray-300">
                            {data.count} Employees ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            {departments.slice(0, 5).map((dept) => (
              <div
                key={dept.name}
                onClick={() => onSelectDepartment?.(dept.name)}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="text-gray-700 font-semibold truncate">{dept.name}</span>
                </div>
                <span className="font-black text-gray-900 ml-2 flex-shrink-0">
                  {dept.count}{' '}
                  <span className="text-[10px] text-gray-400 font-medium">
                    ({dept.percentage}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
