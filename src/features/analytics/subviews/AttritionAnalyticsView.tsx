import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { TrendingUp, Users } from 'lucide-react';

export const AttritionAnalyticsView: React.FC = () => {
  const tenureBands = [
    { band: '0 - 3 Months (Onboarding Probation)', exits: 2, pct: '11.1%', reason: 'Role mismatch' },
    { band: '3 - 6 Months (Early Career)', exits: 3, pct: '16.7%', reason: 'Higher compensation offer' },
    { band: '6 - 12 Months (Mid Tenure)', exits: 4, pct: '22.2%', reason: 'Career growth opportunities' },
    { band: '1 - 2 Years (Core Tenure)', exits: 6, pct: '33.3%', reason: 'Higher studies / Relocation' },
    { band: '2 - 5 Years (Senior Tenure)', exits: 2, pct: '11.1%', reason: 'Relocation' },
    { band: '5+ Years (Veteran Tenure)', exits: 1, pct: '5.6%', reason: 'Entrepreneurship' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#07563D]" />
            <span>Attrition & Employee Exit Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Annual attrition rate (4.2%), voluntary vs involuntary exits, tenure band analysis and exit cause categorization</p>
        </div>
        <Badge variant="emerald">Formula: Exits / Average Headcount * 100</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Voluntary vs Involuntary Exits</h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans font-bold text-gray-700 block">Voluntary Resignations</span>
              <span className="text-2xl font-black text-gray-900">14 Exits</span>
              <span className="text-[11px] text-gray-500 font-sans block mt-1">77.8% of Total Exits</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans font-bold text-gray-700 block">Involuntary Terminations</span>
              <span className="text-2xl font-black text-rose-700">4 Exits</span>
              <span className="text-[11px] text-rose-600 font-sans block mt-1">22.2% (PIP / Non-performance)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Tenure Band Attrition Matrix</h3>
          <div className="space-y-2 text-xs font-mono">
            {tenureBands.map((t, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                <span className="font-sans font-bold text-gray-800">{t.band}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">{t.exits} Exits</span>
                  <Badge variant="emerald">{t.pct}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
