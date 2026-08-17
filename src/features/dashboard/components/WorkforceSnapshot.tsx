import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Users,
  ShieldCheck,
  Hourglass,
  FileWarning,
  Briefcase,
  GraduationCap,
  UserMinus,
  ArrowRight,
} from 'lucide-react';

export interface WorkforceSnapshotData {
  totalEmployees: number;
  activeEmployees: number;
  probationCount: number;
  noticePeriodCount: number;
  contractCount: number;
  internsCount: number;
  exitedCount: number;
}

interface Props {
  data: WorkforceSnapshotData;
  onViewWorkforce: () => void;
}

export const WorkforceSnapshot: React.FC<Props> = ({ data, onViewWorkforce }) => {
  const metrics = [
    { label: 'Active Regular', count: data.activeEmployees, desc: 'Permanent confirmed', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Probationary', count: data.probationCount, desc: 'Under review period', icon: Hourglass, color: 'text-blue-700 bg-blue-50' },
    { label: 'Notice Period', count: data.noticePeriodCount, desc: 'Serving exit notice', icon: FileWarning, color: 'text-amber-700 bg-amber-50' },
    { label: 'Contract Staff', count: data.contractCount, desc: 'Fixed-term contract', icon: Briefcase, color: 'text-purple-700 bg-purple-50' },
    { label: 'Interns / Trainees', count: data.internsCount, desc: 'Stipend internship', icon: GraduationCap, color: 'text-teal-700 bg-teal-50' },
    { label: 'Exited Alumni', count: data.exitedCount, desc: 'Separated records', icon: UserMinus, color: 'text-gray-700 bg-gray-50' },
  ];

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Workforce Snapshot
          </h2>
          <p className="text-xs text-gray-500">Employment lifecycle and contract status segmentation</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-gray-900">
            {data.totalEmployees}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-400">
            Total Headcount
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-600 truncate">{m.label}</span>
                <div className={`w-6 h-6 rounded-md ${m.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black text-gray-900 block">{m.count}</span>
                <span className="text-[10px] text-gray-400 block truncate">{m.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <Button
          size="sm"
          variant="secondary"
          onClick={onViewWorkforce}
          className="w-full text-xs font-bold text-gray-700 hover:text-gray-900 justify-center"
        >
          View Full People Directory
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
};
