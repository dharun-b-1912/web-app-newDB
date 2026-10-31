import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  status: string;
  variant?: 'healthy' | 'warning' | 'critical' | 'plan' | 'neutral' | 'auto';
  pulse?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'auto',
  pulse = false,
  size = 'sm',
  className,
}) => {
  const safeStatus = status || 'Unknown';
  const normalized = safeStatus.toString().toLowerCase();

  let resolvedVariant = variant;
  if (resolvedVariant === 'auto') {
    if (
      normalized.includes('healthy') ||
      normalized.includes('operational') ||
      normalized.includes('active') ||
      normalized.includes('confirmed') ||
      normalized.includes('resolved') ||
      normalized.includes('matched') ||
      normalized.includes('paid') ||
      normalized.includes('production') ||
      normalized.includes('good')
    ) {
      resolvedVariant = 'healthy';
    } else if (
      normalized.includes('resigned') ||
      normalized.includes('exited') ||
      normalized.includes('separated')
    ) {
      resolvedVariant = 'resigned' as any;
    } else if (
      normalized.includes('notice') ||
      normalized.includes('at risk') ||
      normalized.includes('trial') ||
      normalized.includes('monitoring') ||
      normalized.includes('warning') ||
      normalized.includes('minor') ||
      normalized.includes('moderate') ||
      normalized.includes('degraded') ||
      normalized.includes('upcoming')
    ) {
      resolvedVariant = 'warning';
    } else if (
      normalized.includes('critical') ||
      normalized.includes('high') ||
      normalized.includes('failed') ||
      normalized.includes('overdue') ||
      normalized.includes('payment pending') ||
      normalized.includes('outage') ||
      normalized.includes('expired') ||
      normalized.includes('refunded') ||
      normalized.includes('terminated') ||
      normalized.includes('suspended') ||
      normalized.includes('disabled')
    ) {
      resolvedVariant = 'critical';
    } else if (
      normalized.includes('enterprise') ||
      normalized.includes('business') ||
      normalized.includes('professional') ||
      normalized.includes('starter')
    ) {
      resolvedVariant = 'plan';
    } else {
      resolvedVariant = 'neutral';
    }
  }

  const styles: Record<string, { wrapper: string; dot: string }> = {
    healthy: {
      wrapper: 'bg-[#ECFDF5] text-[#15845B] border border-[#15845B]/30',
      dot: 'bg-[#15845B]',
    },
    resigned: {
      wrapper: 'bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]/40 font-bold',
      dot: 'bg-[#D97706]',
    },
    warning: {
      wrapper: 'bg-[#FEF3C7] text-[#CE9100] border border-[#D89A16]/30',
      dot: 'bg-[#D89A16]',
    },
    critical: {
      wrapper: 'bg-[#FDF2F2] text-[#D94B4B] border border-[#D94B4B]/30',
      dot: 'bg-[#D94B4B]',
    },
    plan: {
      wrapper: 'bg-[#E9ECF7] text-[#0F172B] border border-transparent font-bold',
      dot: 'hidden',
    },
    neutral: {
      wrapper: 'bg-[#F9FAFB] text-[#62748E] border border-[#E7EAF0]',
      dot: 'bg-[#90A1B9]',
    },
  };
  const activeStyle = styles[resolvedVariant] || styles.neutral;

  const sizeStyles = {
    xs: 'text-[11px] px-2 py-0.5 gap-1.5',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-sans font-semibold rounded-full select-none leading-none tracking-tight whitespace-nowrap',
        activeStyle.wrapper,
        sizeStyles,
        className
      )}
    >
      {activeStyle.dot !== 'hidden' && (
        <span className="relative flex h-1.5 w-1.5 items-center justify-center">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                activeStyle.dot
              )}
            />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', activeStyle.dot)} />
        </span>
      )}
      <span>{safeStatus}</span>
    </span>
  );
};
