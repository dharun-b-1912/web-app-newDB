import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'gray' | 'purple' | 'secondary' | 'outline' | 'danger' | 'neutral' | 'info' | 'success' | 'warning' | 'primary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  key?: React.Key;
  children?: React.ReactNode;
  title?: string;
}

export const Badge = ({ className, variant = 'emerald', size = 'md', children, ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
    primary: 'bg-emerald-50 text-[#07563D] border-emerald-200/80',
    emerald: 'bg-emerald-50 text-[#07563D] border-emerald-200/80',
    success: 'bg-emerald-50 text-[#07563D] border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/80',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/80',
    blue: 'bg-sky-50 text-sky-800 border-sky-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    secondary: 'bg-gray-100 text-gray-700 border-gray-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
    outline: 'bg-white text-gray-700 border-gray-300',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.2 font-medium',
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-xs px-3 py-1 font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border tracking-tight whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
