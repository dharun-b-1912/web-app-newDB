import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { GraduationCap, Award } from 'lucide-react';

export const TrainingAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#07563D]" />
            <span>Learning, Skill Development & Compliance Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Course completion (91.8%), POSH/InfoSec mandatory compliance (97.2%), assessment pass rate (88.4%)</p>
        </div>
        <Badge variant="emerald">LMS Domain Source Data</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-1">
          <span className="font-bold text-gray-500 block font-sans">Mandatory POSH Compliance</span>
          <span className="text-2xl font-black text-[#07563D]">98.2%</span>
          <span className="text-emerald-700 font-semibold block font-sans">416 Staff Certified</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-1">
          <span className="font-bold text-gray-500 block font-sans">InfoSec ISO 27001 Compliance</span>
          <span className="text-2xl font-black text-[#07563D]">96.5%</span>
          <span className="text-emerald-700 font-semibold block font-sans">408 Staff Certified</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-1">
          <span className="font-bold text-gray-500 block font-sans">GDPR Data Privacy Compliance</span>
          <span className="text-2xl font-black text-[#07563D]">97.0%</span>
          <span className="text-emerald-700 font-semibold block font-sans">410 Staff Certified</span>
        </div>
      </div>
    </div>
  );
};
