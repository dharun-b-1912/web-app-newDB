import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, HelpCircle } from 'lucide-react';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface MonthlyTrendData {
  month: string;
  openingHeadcount: number;
  newJoiners: number;
  exits: number;
  closingHeadcount: number;
}

interface Props {
  trendData: MonthlyTrendData[];
  hasEnoughData: boolean;
}

export const WorkforceTrend: React.FC<Props> = ({ trendData, hasEnoughData }) => {
  const [activeMetric, setActiveMetric] = useState<'closingHeadcount' | 'newJoiners'>('closingHeadcount');

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Workforce Growth Trajectory
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              6-Month Rolling
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Historical headcount baseline, new hires, and turnover reconciliation
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveMetric('closingHeadcount')}
            className={`px-3 py-1 font-bold rounded-lg transition-all ${
              activeMetric === 'closingHeadcount'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Total Headcount
          </button>
          <button
            onClick={() => setActiveMetric('newJoiners')}
            className={`px-3 py-1 font-bold rounded-lg transition-all ${
              activeMetric === 'newJoiners'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Net Additions
          </button>
        </div>
      </div>

      {!hasEnoughData || trendData.length === 0 ? (
        <DashboardEmptyState
          icon={HelpCircle}
          title="Not enough historical data yet"
          description="As employees join and complete cycles over time, 6-month historical trajectory curves will automatically populate here."
        />
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#07563D" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#07563D" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="joinersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload as MonthlyTrendData;
                    return (
                      <div className="bg-gray-900 text-white text-xs p-3 rounded-xl shadow-xl border border-gray-800 space-y-1.5 min-w-[160px]">
                        <p className="font-extrabold text-emerald-400 border-b border-gray-800 pb-1">
                          {label}
                        </p>
                        <div className="space-y-1 text-gray-300">
                          <div className="flex justify-between">
                            <span>Opening:</span>
                            <span className="font-bold text-white">{row.openingHeadcount}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>+ New Hires:</span>
                            <span className="font-bold">{row.newJoiners}</span>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>- Exits:</span>
                            <span className="font-bold">{row.exits}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-800 pt-1 font-black text-white">
                            <span>Closing Total:</span>
                            <span>{row.closingHeadcount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={activeMetric === 'closingHeadcount' ? '#07563D' : '#2563eb'}
                strokeWidth={3}
                fillOpacity={1}
                fill={activeMetric === 'closingHeadcount' ? 'url(#headcountGradient)' : 'url(#joinersGradient)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
