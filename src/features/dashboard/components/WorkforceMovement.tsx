import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import {
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Award,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface WorkforceMovementMetrics {
  newJoiners: number;
  exits: number;
  transfers: number;
  promotions: number;
  netChange: number;
}

interface Props {
  data: {
    today: WorkforceMovementMetrics;
    sevenDays: WorkforceMovementMetrics;
    thirtyDays: WorkforceMovementMetrics;
    ninetyDays: WorkforceMovementMetrics;
  };
}

export const WorkforceMovement: React.FC<Props> = ({ data }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'sevenDays' | 'thirtyDays' | 'ninetyDays'>('thirtyDays');

  const currentMetrics = data[selectedPeriod] || {
    newJoiners: 0,
    exits: 0,
    transfers: 0,
    promotions: 0,
    netChange: 0,
  };

  const periodLabels: Record<typeof selectedPeriod, string> = {
    today: 'Today',
    sevenDays: 'Last 7 Days',
    thirtyDays: 'Last 30 Days',
    ninetyDays: 'Last 90 Days',
  };

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Workforce Movement
          </h2>
          <p className="text-xs text-gray-500">
            Talent acquisition, separations, and internal mobility
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['today', 'sevenDays', 'thirtyDays', 'ninetyDays'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedPeriod === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'sevenDays' ? '7D' : p === 'thirtyDays' ? '30D' : '90D'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* New Joiners */}
        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">New Joiners</span>
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-emerald-950">
            +{currentMetrics.newJoiners}
          </span>
          <span className="text-[10px] text-emerald-700 block font-medium">
            Onboarded in {periodLabels[selectedPeriod]}
          </span>
        </div>

        {/* Exits */}
        <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 space-y-1.5">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold">Exits & Separations</span>
            <UserMinus className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-rose-950">
            -{currentMetrics.exits}
          </span>
          <span className="text-[10px] text-rose-700 block font-medium">
            Settled in {periodLabels[selectedPeriod]}
          </span>
        </div>

        {/* Internal Transfers */}
        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1.5">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold">Dept Transfers</span>
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-blue-950">
            {currentMetrics.transfers}
          </span>
          <span className="text-[10px] text-blue-700 block font-medium">
            Cross-functional moves
          </span>
        </div>

        {/* Promotions */}
        <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 space-y-1.5">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-bold">Promotions</span>
            <Award className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-purple-950">
            {currentMetrics.promotions}
          </span>
          <span className="text-[10px] text-purple-700 block font-medium">
            Designation upgrades
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
        <span className="font-semibold text-gray-700">
          Net Workforce Growth ({periodLabels[selectedPeriod]}):
        </span>
        <span className={`font-black flex items-center gap-1 ${
          currentMetrics.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {currentMetrics.netChange >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-600" />
          )}
          {currentMetrics.netChange > 0 ? `+${currentMetrics.netChange}` : currentMetrics.netChange} Employees
        </span>
      </div>
    </Card>
  );
};
