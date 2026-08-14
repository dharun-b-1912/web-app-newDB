import React from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface AttentionCardProps {
  id: string;
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  category: 'Billing' | 'Usage' | 'Lifecycle' | 'Security' | 'Health';
  tenantName: string;
  title: string;
  description: string;
  recommendedAction: string;
  actionLabel?: string;
  createdAt: string;
  onAction?: () => void;
  className?: string;
}

export const AttentionCard: React.FC<AttentionCardProps> = ({
  severity,
  category,
  tenantName,
  title,
  description,
  recommendedAction,
  actionLabel = 'Resolve',
  createdAt,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-[10px] border border-[#E7EAF0] p-4 shadow-[0_1px_2px_rgba(15,23,43,0.04)] space-y-2.5 transition-all',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={severity} size="xs" />
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F9FAFB] text-[#62748E] border border-[#E7EAF0]">
            {category}
          </span>
        </div>
        <span className="font-mono text-[12px] text-[#90A1B9]">
          {createdAt}
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[13px] font-medium text-[#62748E] block font-sans">
          {tenantName}
        </span>
        <h4 className="text-[15px] font-bold text-[#0F172B] font-sans tracking-tight">
          {title}
        </h4>
        <p className="text-[13px] text-[#62748E] font-normal leading-relaxed font-sans">
          {description}
        </p>
      </div>

      <div className="p-2.5 bg-[#F9FAFB] rounded-[8px] border border-[#E7EAF0] text-xs space-y-1 font-sans">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#90A1B9] block">
          Recommended Action:
        </span>
        <p className="text-[#0F172B] font-medium leading-relaxed">
          {recommendedAction}
        </p>
      </div>

      {onAction && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant={severity === 'High' || severity === 'Critical' ? 'danger' : 'outline'}
            onClick={onAction}
            className="h-8 text-xs px-3 font-semibold"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
