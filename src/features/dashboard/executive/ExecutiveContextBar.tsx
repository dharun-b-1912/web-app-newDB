import React from 'react';
import { Breadcrumb } from '../../../components/shell/Breadcrumb';
import { Button } from '../../../components/ui/Button';
import {
  TrendingUp,
  Download,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Company } from '../../../types';

interface Props {
  activeCompany: Company | null;
  lastUpdatedText: string;
  isRefreshing: boolean;
  isRealtimeConnected: boolean;
  selectedPeriod: string;
  comparisonMode: string;
  onPeriodChange: (period: string) => void;
  onComparisonChange: (comp: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export const ExecutiveContextBar: React.FC<Props> = ({
  activeCompany,
  lastUpdatedText,
  isRefreshing,
  isRealtimeConnected,
  selectedPeriod,
  comparisonMode,
  onPeriodChange,
  onComparisonChange,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Live Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: 'Platform' },
            { label: 'HR Strategy' },
            { label: 'Executive HR Overview' },
          ]}
        />

        <div className="flex items-center gap-2 text-xs text-gray-500 self-end sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
            {isRealtimeConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Executive Data
              </span>
            ) : (
              <span className="text-gray-500">Cached Data</span>
            )}
            <span className="text-gray-300">|</span>
            <span>{lastUpdatedText}</span>
          </span>

          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 px-2 text-gray-500 hover:text-gray-900"
            title="Refresh strategic calculations"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#07563D]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Strategic Leadership Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black text-purple-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Executive Leadership Console
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Executive HR Overview
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-700">{activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
            <span className="text-gray-300">•</span>
            <span>Strategic workforce health, people cost, growth and organizational risk.</span>
          </p>
        </div>

        {/* Strategic Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
            >
              <option value="this_month">This Month (Aug 2026)</option>
              <option value="prev_month">Previous Month (Jul 2026)</option>
              <option value="qtd">Quarter to Date (Q3 2026)</option>
              <option value="prev_quarter">Previous Quarter (Q2 2026)</option>
              <option value="ytd">Year to Date (2026)</option>
              <option value="prev_year">Full Year (2025)</option>
            </select>
          </div>

          {/* Comparison Baseline */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
            <Layers className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
            <select
              value={comparisonMode}
              onChange={(e) => onComparisonChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
            >
              <option value="prev_period">vs Previous Period</option>
              <option value="prev_year">vs Previous Year</option>
              <option value="budget">vs Approved Headcount Cap</option>
            </select>
          </div>

          <Button
            size="md"
            variant="secondary"
            onClick={onExport}
            className="text-xs font-bold bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Export Executive Report
          </Button>
        </div>
      </div>
    </div>
  );
};
