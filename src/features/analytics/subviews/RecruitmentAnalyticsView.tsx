import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Activity, Users, CheckCircle2 } from 'lucide-react';

export const RecruitmentAnalyticsView: React.FC = () => {
  const funnel = [
    { stage: '1. Applications Received', count: 1240, pct: '100%' },
    { stage: '2. Screened & Shortlisted', count: 480, pct: '38.7%' },
    { stage: '3. Technical Interviews', count: 184, pct: '14.8%' },
    { stage: '4. Offers Extended', count: 42, pct: '3.4%' },
    { stage: '5. Offers Accepted & Joined', count: 38, pct: '3.1%' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#07563D]" />
            <span>Recruitment Analytics & Hiring Funnel</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Applicant tracking funnel, conversion rates, time-to-hire (22 Days avg) and requisition velocity</p>
        </div>
        <Badge variant="emerald">14 Open Requisitions</Badge>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900">Recruitment Conversion Funnel</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs font-mono">
              <span className="font-sans font-bold text-gray-900">{f.stage}</span>
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-800">{f.count} Candidates</span>
                <Badge variant="emerald">{f.pct}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
