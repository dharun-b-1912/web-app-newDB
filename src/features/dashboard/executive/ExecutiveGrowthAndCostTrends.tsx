import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TrendingUp, DollarSign, ArrowUpRight, PlusCircle, Layers } from 'lucide-react';
import { Employee } from '../../../types';

interface Props {
  employees: Employee[];
  onNavigate: (route: string) => void;
}

export const ExecutiveGrowthAndCostTrends: React.FC<Props> = ({ employees, onNavigate }) => {
  const [timeHorizon, setTimeHorizon] = useState<'6M' | '12M' | 'YTD'>('12M');

  // Compute real monthly scale trajectory
  const monthsCount = timeHorizon === '6M' ? 6 : 12;
  const now = new Date();
  const trajectory = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });

    const hires = employees.filter((e) => {
      const doj = e.employment?.doj || e.created_at;
      return doj && doj.startsWith(ym);
    }).length;

    const closing = employees.filter((e) => {
      const doj = e.employment?.doj || e.created_at;
      return doj ? doj.slice(0, 7) <= ym : true;
    }).length;

    const exits = employees.filter((e) => e.status === 'Notice Period' && (e.employment?.doj || '').startsWith(ym)).length;
    const opening = Math.max(0, closing - hires + exits);

    trajectory.push({ month: label, opening, hires, exits, closing });
  }

  const maxClosing = Math.max(...trajectory.map((t) => t.closing), 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Workforce Growth & Scale Trajectory */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Workforce Scale & Growth
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Net headcount trajectory reconciled with Employee Master
            </p>
          </div>

          <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200 text-[11px] font-bold">
            {(['6M', '12M', 'YTD'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeHorizon(mode)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  timeHorizon === mode ? 'bg-white shadow-xs text-gray-900 font-black' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 italic">
            Not enough historical employee records to render scale trajectory.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
              {trajectory.map((item, idx) => {
                const heightPct = Math.max(8, Math.round((item.closing / maxClosing) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    <div className="w-full flex items-end justify-center h-36">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#07563D] to-emerald-500 rounded-t-md transition-all group-hover:opacity-85"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 group-hover:text-gray-900">
                      {item.month}
                    </span>

                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] rounded-lg p-2 shadow-xl pointer-events-none z-20 whitespace-nowrap">
                      <p className="font-bold text-emerald-300">{item.month} Summary</p>
                      <p>Opening: {item.opening}</p>
                      <p className="text-emerald-400">+ New Hires: {item.hires}</p>
                      <p className="text-rose-400">- Exits: {item.exits}</p>
                      <p className="font-bold border-t border-gray-700 mt-1 pt-1">Closing: {item.closing}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
              <span>Opening: <strong className="text-gray-800">{trajectory[0]?.opening || 0}</strong></span>
              <span>Net Hires: <strong className="text-emerald-600">+{trajectory.reduce((acc, t) => acc + t.hires, 0)}</strong></span>
              <span>Current Scale: <strong className="text-gray-900">{employees.length}</strong></span>
            </div>
          </div>
        )}
      </Card>

      {/* 2. People Cost & Payroll Expense Trend */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-teal-600" />
                Workforce Cost Trend
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Monthly gross payroll, employer contributions & statutory benefits
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
              Finance & Compensation
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-gray-50/60 border border-dashed border-gray-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-800">
                Monthly Payroll Cycle Not Finalized
              </p>
              <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                Real workforce compensation and statutory cost metrics will populate dynamically once the current payroll run is locked and approved.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigate('payroll')}
              className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200 mx-auto"
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Configure & Run Payroll
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
          <span>Source: Authoritative Payroll Engine</span>
          <span>Currency: INR (₹)</span>
        </div>
      </Card>
    </div>
  );
};
