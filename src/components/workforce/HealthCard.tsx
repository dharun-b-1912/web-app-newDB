import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { cn } from '../../lib/utils';
import { SubsystemHealthState } from '../../types/platformAdmin';

export interface HealthCardProps {
  name: string;
  category: 'Infrastructure' | 'Core' | 'Communication' | 'Integration';
  status: SubsystemHealthState;
  latencyMs: number;
  errorRate: number;
  uptime: number;
  lastChecked: string;
  onClick?: () => void;
  className?: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  name,
  category,
  status,
  latencyMs,
  errorRate,
  uptime,
  lastChecked,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-[10px] border border-[#E7EAF0] p-4 shadow-[0_1px_2px_rgba(15,23,43,0.04)] flex flex-col justify-between space-y-3 transition-all duration-150',
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : '',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#90A1B9] font-sans">
          {category}
        </span>
        <StatusBadge status={status} size="xs" />
      </div>

      <div>
        <h4 className="text-[15.5px] font-semibold text-[#0F172B] font-sans tracking-tight">
          {name}
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E7EAF0]/60 text-center">
        <div>
          <span className="text-[11.5px] font-medium text-[#90A1B9] block font-sans">
            Latency
          </span>
          <span className="font-mono text-[15px] font-bold text-[#0F172B] tabular-nums block mt-0.5">
            {latencyMs}ms
          </span>
        </div>
        <div>
          <span className="text-[11.5px] font-medium text-[#90A1B9] block font-sans">
            Errors
          </span>
          <span className="font-mono text-[15px] font-bold text-[#0F172B] tabular-nums block mt-0.5">
            {errorRate}%
          </span>
        </div>
        <div>
          <span className="text-[11.5px] font-medium text-[#90A1B9] block font-sans">
            Uptime
          </span>
          <span className="font-mono text-[15px] font-bold text-[#15845B] tabular-nums block mt-0.5">
            {uptime}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-0.5">
        <span className="font-mono text-[12px] text-[#90A1B9]">
          Checked {lastChecked}
        </span>
        <span className="text-[12.5px] font-semibold text-[#047857] hover:underline flex items-center gap-0.5">
          Inspect ›
        </span>
      </div>
    </div>
  );
};
