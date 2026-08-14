import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Users, PieChart } from 'lucide-react';

export const WorkforceAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>Workforce Demographics & Headcount Movement Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Headcount movement equation, age bands, gender ratios, experience distributions and tenure demographics</p>
        </div>
        <Badge variant="emerald">Opening + Joiners - Exits = Closing</Badge>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900">Q3 Headcount Movement Reconciliation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center font-mono">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-sans font-bold text-gray-400 uppercase block">Opening Headcount</span>
            <span className="text-xl font-black text-gray-900">402</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-sans font-bold text-emerald-700 uppercase block">+ New Hires</span>
            <span className="text-xl font-black text-emerald-800">+32</span>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-[10px] font-sans font-bold text-blue-700 uppercase block">+ Internal Transfers</span>
            <span className="text-xl font-black text-blue-800">+4</span>
          </div>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
            <span className="text-[10px] font-sans font-bold text-rose-700 uppercase block">- Total Exits</span>
            <span className="text-xl font-black text-rose-800">-10</span>
          </div>
          <div className="p-4 rounded-xl bg-emerald-700 text-white shadow-2xs">
            <span className="text-[10px] font-sans font-bold text-emerald-200 uppercase block">= Closing Headcount</span>
            <span className="text-xl font-black">428</span>
          </div>
        </div>
      </div>
    </div>
  );
};
