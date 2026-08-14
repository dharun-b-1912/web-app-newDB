import React from 'react';
import { EmployeeStatus } from '../../types';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps {
  status: EmployeeStatus | 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Inactive' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let style = 'bg-gray-100 text-gray-700 border-gray-200';
  let dotColor = 'bg-gray-400';

  switch (status) {
    case 'Active':
    case 'Approved':
      style = 'bg-emerald-50 text-[#07563D] border-emerald-200/80';
      dotColor = 'bg-[#16845B]';
      break;
    case 'Probation':
    case 'Pending':
      style = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotColor = 'bg-amber-500';
      break;
    case 'Notice Period':
    case 'Rejected':
      style = 'bg-rose-50 text-rose-800 border-rose-200/80';
      dotColor = 'bg-rose-500';
      break;
    case 'On Leave':
      style = 'bg-sky-50 text-sky-800 border-sky-200/80';
      dotColor = 'bg-sky-500';
      break;
    case 'Inactive':
      style = 'bg-gray-100 text-gray-600 border-gray-200';
      dotColor = 'bg-gray-400';
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border tracking-tight',
        style,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      {status}
    </span>
  );
};
