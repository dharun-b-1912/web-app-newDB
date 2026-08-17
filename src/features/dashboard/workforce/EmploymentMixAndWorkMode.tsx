import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Briefcase, Laptop, Building, Globe, MapPin } from 'lucide-react';

export interface MixDistributionItem {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface Props {
  employmentMix: MixDistributionItem[];
  workModes: MixDistributionItem[];
  onSelectType: (type: string) => void;
  onSelectWorkMode: (mode: string) => void;
}

export const EmploymentMixAndWorkMode: React.FC<Props> = ({
  employmentMix,
  workModes,
  onSelectType,
  onSelectWorkMode,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Employment Mix */}
      <Card className="lg:col-span-6 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Employment Contract Mix
            </h3>
            <p className="text-xs text-gray-500">
              Permanent staff, contractors, interns, and retainer consultants.
            </p>
          </div>
          <Briefcase className="w-4 h-4 text-[#07563D]" />
        </div>

        <div className="space-y-3">
          {employmentMix.map((item) => (
            <div
              key={item.label}
              onClick={() => onSelectType(item.label)}
              className="p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">{item.label}</span>
                <span className="font-black text-gray-900">
                  {item.count} <span className="text-[10px] text-gray-400 font-normal">({item.pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Work Mode Policy */}
      <Card className="lg:col-span-6 p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Work Mode Distribution
            </h3>
            <p className="text-xs text-gray-500">
              Office-bound, hybrid agile, remote distributed, and field staff.
            </p>
          </div>
          <Laptop className="w-4 h-4 text-blue-600" />
        </div>

        <div className="space-y-3">
          {workModes.map((item) => (
            <div
              key={item.label}
              onClick={() => onSelectWorkMode(item.label)}
              className="p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">{item.label}</span>
                <span className="font-black text-gray-900">
                  {item.count} <span className="text-[10px] text-gray-400 font-normal">({item.pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
