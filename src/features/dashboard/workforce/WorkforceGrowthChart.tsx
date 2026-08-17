import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

export interface WorkforceHistoricalMonth {
  month: string;
  opening: number;
  hires: number;
  exits: number;
  closing: number;
}

interface Props {
  data: WorkforceHistoricalMonth[];
}

export const WorkforceGrowthChart: React.FC<Props> = ({ data }) => {
  const [range, setRange] = useState<'3M' | '6M' | '12M' | 'YTD'>('12M');

  const visibleData = React.useMemo(() => {
    if (range === '3M') return data.slice(-3);
    if (range === '6M') return data.slice(-6);
    if (range === 'YTD') return data.slice(-8); // 8 months of 2026
    return data;
  }, [data, range]);

  return (
    <Card className="p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Workforce Growth & Headcount Trajectory
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live Baseline
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Reconciliation of opening workforce, monthly new hires, separations, and closing headcount.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
          {(['3M', '6M', '12M', 'YTD'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 font-bold rounded-lg transition-all ${
                range === r
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#07563D" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#07563D" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as WorkforceHistoricalMonth;
                  return (
                    <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl border border-gray-800 space-y-1 min-w-[170px]">
                      <p className="font-extrabold text-emerald-400 border-b border-gray-800 pb-1">
                        {label} Headcount
                      </p>
                      <div className="flex justify-between text-gray-300">
                        <span>Opening:</span>
                        <span className="font-bold text-white">{d.opening}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>+ New Hires:</span>
                        <span className="font-bold">+{d.hires}</span>
                      </div>
                      <div className="flex justify-between text-rose-400">
                        <span>- Exits:</span>
                        <span className="font-bold">-{d.exits}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-800 pt-1 font-black text-white">
                        <span>Closing Total:</span>
                        <span className="text-emerald-300">{d.closing}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="hires" name="New Hires" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="exits" name="Exits" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Area
              type="monotone"
              dataKey="closing"
              name="Closing Headcount"
              stroke="#07563D"
              strokeWidth={3}
              fill="url(#growthGrad)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
