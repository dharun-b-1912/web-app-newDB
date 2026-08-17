import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Users, UserCheck, CalendarOff, Briefcase, ArrowRight } from 'lucide-react';
import { Employee } from '../../../types';

export interface ManagerHierarchyRow {
  managerId: string;
  managerName: string;
  managerAvatar?: string;
  departmentName: string;
  designationTitle: string;
  teamSize: number;
  presentCount: number;
  leaveCount: number;
  openingsCount: number;
}

interface Props {
  managerRows: ManagerHierarchyRow[];
  onSelectManager: (managerId: string) => void;
}

export const TeamStructureView: React.FC<Props> = ({ managerRows, onSelectManager }) => {
  return (
    <Card className="p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight">
            Team & Supervisor Reporting Structure
          </h3>
          <p className="text-xs text-gray-500">
            Manager span of control, assigned headcount capacity, and team attendance health.
          </p>
        </div>
        <span className="text-xs font-bold text-gray-400">
          {managerRows.length} Active People Managers
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase font-black text-[10px]">
              <th className="py-2.5 px-3">Manager / Supervisor</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3 text-center">Team Span</th>
              <th className="py-2.5 px-3 text-center">Present Today</th>
              <th className="py-2.5 px-3 text-center">On Leave</th>
              <th className="py-2.5 px-3 text-center">Openings</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {managerRows.map((row) => (
              <tr
                key={row.managerId}
                className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                onClick={() => onSelectManager(row.managerId)}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.managerName} src={row.managerAvatar} size="sm" />
                    <div>
                      <p className="font-bold text-gray-900">{row.managerName}</p>
                      <p className="text-[11px] text-gray-500">{row.designationTitle}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3 text-gray-700 font-semibold">
                  {row.departmentName}
                </td>

                <td className="py-3 px-3 text-center">
                  <span className="font-black text-gray-900 text-sm">{row.teamSize}</span>
                  <span className="text-[10px] text-gray-400 block">Members</span>
                </td>

                <td className="py-3 px-3 text-center">
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {row.presentCount}
                  </span>
                </td>

                <td className="py-3 px-3 text-center">
                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                    {row.leaveCount}
                  </span>
                </td>

                <td className="py-3 px-3 text-center">
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    +{row.openingsCount}
                  </span>
                </td>

                <td className="py-3 px-3 text-right">
                  <button className="text-xs font-bold text-[#07563D] hover:underline inline-flex items-center gap-1">
                    View Team <ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
