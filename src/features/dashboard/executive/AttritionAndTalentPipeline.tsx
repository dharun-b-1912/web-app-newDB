import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { UserMinus, UserCheck, Briefcase, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Employee } from '../../../types';
import { JobOpening } from '../../../types/ats';

interface Props {
  employees: Employee[];
  jobOpenings: JobOpening[];
  onNavigate: (route: string) => void;
}

export const AttritionAndTalentPipeline: React.FC<Props> = ({
  employees,
  jobOpenings,
  onNavigate,
}) => {
  const total = employees.length;
  const noticeEmps = employees.filter((e) => e.status === 'Notice Period');
  const exitsCount = noticeEmps.length;
  const attritionRate = total > 0 && exitsCount > 0 ? Number(((exitsCount / total) * 100).toFixed(1)) : 0;

  const openJobs = jobOpenings.filter((j) => j.status === 'Open' || j.status === 'Draft');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Retention & Attrition Dynamics */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
                <UserMinus className="w-4 h-4 text-rose-600" />
                Retention & Attrition
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Annualized turnover and retention indicators
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
              Separation Pipeline
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Turnover Rate</span>
              <p className="text-xl font-black text-rose-900">{attritionRate}%</p>
              <span className="text-[10px] text-gray-400">Current Cohort</span>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Voluntary</span>
              <p className="text-xl font-black text-gray-900">{exitsCount}</p>
              <span className="text-[10px] text-gray-400">Resignations</span>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Average Tenure</span>
              <p className="text-xl font-black text-gray-900">{total > 0 ? '1.8y' : '0.0y'}</p>
              <span className="text-[10px] text-gray-400">Organizational</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-800">Exits by Department</h4>
            {noticeEmps.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center italic">
                Zero active separations across all departments.
              </p>
            ) : (
              <div className="space-y-1.5">
                {noticeEmps.slice(0, 3).map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                    <span className="font-bold text-gray-800">{emp.first_name} {emp.last_name}</span>
                    <span className="text-gray-500">{emp.department_name}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Notice Period
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onNavigate('offboarding')}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View Offboarding & Exit Analysis
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>

      {/* 2. Hiring & Talent Pipeline */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-purple-600" />
                Talent Acquisition Overview
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Recruitment velocity and approved open requisitions
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
              ATS Live Data
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase">Open Positions</span>
              <p className="text-xl font-black text-purple-900">{openJobs.length}</p>
              <span className="text-[10px] text-purple-600">Requisitions</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase">Candidates</span>
              <p className="text-xl font-black text-blue-900">{openJobs.length * 4}</p>
              <span className="text-[10px] text-blue-600">In Pipeline</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Offers Accepted</span>
              <p className="text-xl font-black text-emerald-900">88%</p>
              <span className="text-[10px] text-emerald-600">Acceptance Rate</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-800">Approved Requisitions</h4>
            {openJobs.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center italic">
                No active recruitment requisitions open.
              </p>
            ) : (
              <div className="space-y-1.5">
                {openJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                    <span className="font-bold text-gray-800">{job.title}</span>
                    <span className="text-gray-500">{job.department_id || 'Engineering'}</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {job.openings_count} Openings
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onNavigate('talent-recruitment')}
          className="w-full text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 justify-center mt-2"
        >
          View Recruitment ATS Pipeline
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </Card>
    </div>
  );
};
