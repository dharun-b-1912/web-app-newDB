import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface PlatformStatusBarProps {
  status: 'Operational' | 'Degraded' | 'Outage' | 'Maintenance';
  activeIncidentsCount: number;
  uptimePercentage: number;
  lastCheckedSeconds: number;
  region: string;
  onViewIncidents?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export const PlatformStatusBar: React.FC<PlatformStatusBarProps> = ({
  status,
  activeIncidentsCount,
  uptimePercentage,
  lastCheckedSeconds,
  region,
  onViewIncidents,
  onRefresh,
  className,
}) => {
  const isHealthy = status === 'Operational';

  return (
    <div
      className={cn(
        'w-full p-4 rounded-[10px] border border-[#E7EAF0] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,43,0.04)]',
        isHealthy ? 'bg-[#ECFDF5]' : 'bg-[#FEF3C7]',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                isHealthy ? 'bg-[#15845B]' : 'bg-[#D89A16]'
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                isHealthy ? 'bg-[#15845B]' : 'bg-[#D89A16]'
              )}
            />
          </span>
          <span className="text-[14.5px] font-semibold text-[#0F172B] font-sans">
            {isHealthy ? 'All Platform Microservices Operational' : 'Partial Service Degradation'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-300 hidden sm:block" />

        <div className="flex items-center gap-4 text-[13px] text-[#62748E] font-sans flex-wrap">
          <span className="flex items-center gap-1">
            <span>Uptime SLA:</span>
            <span className="font-mono font-bold text-[#0F172B] tabular-nums">
              {uptimePercentage}%
            </span>
          </span>

          <span className="flex items-center gap-1">
            <span>Checked:</span>
            <span className="font-mono text-[#0F172B]">
              {lastCheckedSeconds}s ago
            </span>
          </span>

          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#90A1B9]" />
            <span className="font-mono text-[#62748E] text-[12px]">
              {region}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-auto">
        {!isHealthy && (
          <button
            type="button"
            onClick={onViewIncidents}
            className="text-[13px] font-bold text-[#CE9100] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{activeIncidentsCount} Active Incident{activeIncidentsCount > 1 ? 's' : ''}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {onRefresh && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onRefresh}
            title="Refresh Health Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#62748E]" />
          </Button>
        )}
      </div>
    </div>
  );
};
