import React from 'react';
import { Progress } from '../ui/Progress';
import { cn } from '../../lib/utils';

export interface QuotaMeterProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
  customFormatted?: string;
  showPercent?: boolean;
  className?: string;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({
  label,
  current,
  max,
  unit = '',
  customFormatted,
  showPercent = true,
  className,
}) => {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  const variant =
    percentage >= 90 ? 'danger' : percentage >= 75 ? 'warning' : 'default';

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-900 font-bold">
            {customFormatted || `${current.toLocaleString()} / ${max.toLocaleString()} ${unit}`}
          </span>
          {showPercent && (
            <span
              className={cn(
                'px-1.5 py-0.2 rounded font-bold text-[10px]',
                percentage >= 90
                  ? 'bg-red-50 text-red-700'
                  : percentage >= 75
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-800'
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
      </div>
      <Progress value={percentage} variant={variant} className="h-1.5" />
    </div>
  );
};
