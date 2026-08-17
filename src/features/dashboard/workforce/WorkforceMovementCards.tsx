import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { UserPlus, ArrowRightLeft, UserMinus, ArrowRight } from 'lucide-react';
import { Employee } from '../../../types';

interface Props {
  recentJoiners: Employee[];
  noticeEmployees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onViewAllJoiners: () => void;
  onViewAllExits: () => void;
}

export const WorkforceMovementCards: React.FC<Props> = ({
  recentJoiners,
  noticeEmployees,
  onSelectEmployee,
  onViewAllJoiners,
  onViewAllExits,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. New Joiners */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Recent Joiners ({recentJoiners.length})
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
              Live Cohort
            </span>
          </div>

          <div className="space-y-2.5">
            {recentJoiners.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center italic">
                No new joiners recorded in the current cohort.
              </p>
            ) : (
              recentJoiners.slice(0, 4).map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  className="p-2.5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {emp.designation_title || 'Specialist'} · {emp.department_name || 'Department'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 text-[10px] text-gray-400 font-semibold">
                    <span>{emp.employment?.doj || 'Recent'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={onViewAllJoiners}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View All New Joiners
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>

      {/* 2. Internal Mobility */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-blue-800 uppercase">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Internal Mobility
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Department Transfers
            </span>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs text-gray-400 py-6 text-center italic">
              No internal department transfers or promotions pending approval.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => {}}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View Mobility Register
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>

      {/* 3. Exits & Notice Period */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase">
              <UserMinus className="w-4 h-4 text-rose-600" />
              Exits & Notice ({noticeEmployees.length})
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
              Clearance Pipeline
            </span>
          </div>

          <div className="space-y-2.5">
            {noticeEmployees.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center italic">
                No active exit clearances or notice periods currently.
              </p>
            ) : (
              noticeEmployees.slice(0, 4).map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  className="p-2.5 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/20 transition-all cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={`${emp.first_name} ${emp.last_name}`} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {emp.department_name} · Notice Period
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    Active Notice
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={onViewAllExits}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View Offboarding Desk
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>
    </div>
  );
};
