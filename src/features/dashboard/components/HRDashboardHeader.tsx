import React from 'react';
import { Breadcrumb } from '../../../components/shell/Breadcrumb';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  UserPlus,
  FileCheck,
  RotateCw,
  Building2,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Company, User } from '../../../types';

interface Props {
  user: User | null;
  activeCompany: Company | null;
  pendingApprovalsCount: number;
  lastUpdatedText: string;
  isRefreshing: boolean;
  isRealtimeConnected: boolean;
  onRefresh: () => void;
  onAddEmployee: () => void;
  onOpenApprovals: () => void;
}

export const HRDashboardHeader: React.FC<Props> = ({
  user,
  activeCompany,
  pendingApprovalsCount,
  lastUpdatedText,
  isRefreshing,
  isRealtimeConnected,
  onRefresh,
  onAddEmployee,
  onOpenApprovals,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || 'Hari priya';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[{ label: 'Home' }, { label: 'HR Dashboard' }]} />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200">
            {isRealtimeConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500">
                <WifiOff className="w-3 h-3 text-gray-400" />
                Offline Cache
              </span>
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
            title="Refresh dashboard data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#07563D]' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#07563D] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            {getGreeting()}, {displayName}
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            Here's what needs your attention today across workforce operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="md"
            variant="secondary"
            onClick={onOpenApprovals}
            className="relative font-bold text-xs shadow-sm bg-white hover:bg-gray-50 border-gray-200"
          >
            <FileCheck className="w-4 h-4 mr-2 text-[#07563D]" />
            Approvals
            {pendingApprovalsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[11px] font-black rounded-full bg-amber-500 text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </Button>

          <Button
            size="md"
            variant="primary"
            onClick={onAddEmployee}
            className="font-bold text-xs shadow-sm bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>
    </div>
  );
};
