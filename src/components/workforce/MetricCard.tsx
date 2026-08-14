import React from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-[10px] border border-[#E7EAF0] p-5 shadow-[0_1px_2px_rgba(15,23,43,0.04)] flex flex-col justify-between space-y-3 transition-all duration-150',
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : '',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#62748E] font-sans">
          {label}
        </span>
        {icon && (
          <div className="p-2 rounded-full bg-[#F9FAFB] text-[#62748E] border border-[#E7EAF0]">
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="text-[30px] font-bold text-[#0F172B] font-sans leading-[1.1] tracking-tight">
          {value}
        </div>
      </div>

      {(trend || subValue) && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E7EAF0]/60 font-sans">
          {trend ? (
            <div className="flex items-center gap-1.5 font-sans">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[13px] font-bold',
                  trend.isPositive ?? trend.direction === 'up'
                    ? 'text-[#15845B]'
                    : trend.direction === 'down'
                    ? 'text-[#D94B4B]'
                    : 'text-[#62748E]'
                )}
              >
                {trend.direction === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {trend.direction === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                {trend.value}
              </span>
              {trend.label && <span className="text-[12.5px] text-[#90A1B9]">{trend.label}</span>}
            </div>
          ) : (
            <div />
          )}

          {subValue && (
            <span className="text-[12.5px] text-[#90A1B9] font-normal text-right">
              {subValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
