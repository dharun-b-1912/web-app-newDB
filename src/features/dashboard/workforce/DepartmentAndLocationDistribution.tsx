import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Building2, MapPin, ArrowRight, UserCheck, Briefcase } from 'lucide-react';

export interface DepartmentMetricRow {
  id: string;
  name: string;
  count: number;
  pct: number;
  openings: number;
  presentRate: number;
  managerName?: string;
  color: string;
}

export interface LocationMetricRow {
  name: string;
  count: number;
  present: number;
  leave: number;
  absent: number;
  openings: number;
}

interface Props {
  departments: DepartmentMetricRow[];
  locations: LocationMetricRow[];
  totalWorkforce: number;
  onFilterDepartment: (deptId: string) => void;
  onFilterLocation: (locName: string) => void;
}

export const DepartmentAndLocationDistribution: React.FC<Props> = ({
  departments,
  locations,
  totalWorkforce,
  onFilterDepartment,
  onFilterLocation,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Department Distribution */}
      <Card className="lg:col-span-7 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Workforce by Department
            </h3>
            <p className="text-xs text-gray-500">
              Functional division headcounts, open roles, and live attendance rates.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {departments.length} Units
          </span>
        </div>

        <div className="space-y-3">
          {departments.map((dept) => (
            <div
              key={dept.id}
              onClick={() => onFilterDepartment(dept.id)}
              className="p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                  <span className="font-bold text-gray-900 truncate">{dept.name}</span>
                  {dept.managerName && (
                    <span className="text-[10px] text-gray-400 hidden sm:inline truncate">
                      (Head: {dept.managerName})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-gray-500 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-teal-600" />
                    {dept.presentRate}%
                  </span>
                  {dept.openings > 0 && (
                    <span className="text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold text-[10px]">
                      +{dept.openings} open
                    </span>
                  )}
                  <span className="font-black text-gray-900">
                    {dept.count} <span className="text-[10px] text-gray-400 font-normal">({dept.pct}%)</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${dept.pct}%`, backgroundColor: dept.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Location Distribution */}
      <Card className="lg:col-span-5 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Workforce by Location
            </h3>
            <p className="text-xs text-gray-500">
              Campus and remote geographic headcount distribution.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {locations.length} Hubs
          </span>
        </div>

        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.name}
              onClick={() => onFilterLocation(loc.name)}
              className="p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#07563D]" />
                  <span className="font-bold text-gray-900">{loc.name}</span>
                </div>
                <span className="font-black text-gray-900">{loc.count} Staff</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-600 bg-gray-50 p-2 rounded-lg text-center">
                <div>
                  <span className="text-gray-400 block">Present</span>
                  <span className="font-bold text-emerald-700">{loc.present}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Leave</span>
                  <span className="font-bold text-rose-700">{loc.leave}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Absent</span>
                  <span className="font-bold text-red-600">{loc.absent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
