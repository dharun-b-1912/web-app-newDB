import React from 'react';
import { Breadcrumb } from '../../../components/shell/Breadcrumb';
import { Button } from '../../../components/ui/Button';
import {
  Users,
  Download,
  RotateCw,
  UserPlus,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Company } from '../../../types';

interface Props {
  activeCompany: Company | null;
  lastUpdatedText: string;
  isRefreshing: boolean;
  isRealtimeConnected: boolean;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onAddEmployee: () => void;
  onViewDirectory: () => void;
}

export const WorkforceOverviewHeader: React.FC<Props> = ({
  activeCompany,
  lastUpdatedText,
  isRefreshing,
  isRealtimeConnected,
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  onExport,
  onAddEmployee,
  onViewDirectory,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Live Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Breadcrumb
          items={[
            { label: 'Platform' },
            { label: 'HR Operations' },
            { label: 'Workforce Overview' },
          ]}
        />

        <div className="flex items-center gap-2 text-xs text-gray-500 self-end sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
            {isRealtimeConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Workforce Data
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
            title="Refresh workforce metrics"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#07563D]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Context Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#07563D] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Live Workforce Map
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Workforce Overview
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <span>{activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
            <span className="text-gray-300">•</span>
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>{activeCompany?.city || 'Coimbatore'}, {activeCompany?.country || 'India'}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="today">Today (Live)</option>
            <option value="this_month">This Month (Aug 2026)</option>
            <option value="last_quarter">Last Quarter (Q2 2026)</option>
            <option value="ytd">Year to Date (2026)</option>
          </select>

          <Button
            size="md"
            variant="secondary"
            onClick={onExport}
            className="text-xs font-bold bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Export CSV
          </Button>

          <Button
            size="md"
            variant="secondary"
            onClick={onViewDirectory}
            className="text-xs font-bold bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-[#07563D]" />
            People Directory
          </Button>

          <Button
            size="md"
            variant="primary"
            onClick={onAddEmployee}
            className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </Button>
        </div>
      </div>
    </div>
  );
};
