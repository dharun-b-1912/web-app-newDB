import React from 'react';
import { cn } from '../../../lib/utils';
import {
  CheckCircle2,
  Clock,
  Lock,
  Play,
  AlertTriangle,
  CreditCard,
  FileCheck,
  Check,
} from 'lucide-react';

export type PayrollStatusType =
  | 'READY'
  | 'READY FOR CALCULATION'
  | 'CALCULATING'
  | 'CALCULATED'
  | 'REVIEW REQUIRED'
  | 'APPROVAL PENDING'
  | 'APPROVED'
  | 'LOCKED'
  | 'PAYMENT PROCESSING'
  | 'PAID'
  | 'PUBLISHED'
  | 'COMPLETED'
  | 'BLOCKED';

interface PayrollStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDot?: boolean;
}

export const PayrollStatusBadge: React.FC<PayrollStatusBadgeProps> = ({
  status,
  size = 'md',
  className,
  showDot = true,
}) => {
  const norm = (status || 'READY').toUpperCase().trim();

  let bg = 'bg-gray-100 text-gray-700 border-gray-200';
  let dotColor = 'bg-gray-400';
  let Icon = Clock;

  if (norm.includes('READY') || norm === 'CALCULATED') {
    bg = 'bg-emerald-50 text-[#07563D] border-emerald-200/80';
    dotColor = 'bg-emerald-600';
    Icon = CheckCircle2;
  } else if (norm.includes('CALCULAT')) {
    bg = 'bg-blue-50 text-blue-700 border-blue-200/80';
    dotColor = 'bg-blue-600';
    Icon = Play;
  } else if (norm.includes('REVIEW') || norm.includes('PENDING')) {
    bg = 'bg-amber-50 text-amber-800 border-amber-200/80';
    dotColor = 'bg-amber-500';
    Icon = Clock;
  } else if (norm.includes('APPROV')) {
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    dotColor = 'bg-emerald-600';
    Icon = FileCheck;
  } else if (norm.includes('LOCK')) {
    bg = 'bg-purple-50 text-purple-800 border-purple-200/80';
    dotColor = 'bg-purple-600';
    Icon = Lock;
  } else if (norm.includes('PAY') || norm.includes('PAID') || norm.includes('DISBURSE')) {
    bg = 'bg-teal-50 text-teal-800 border-teal-200/80';
    dotColor = 'bg-teal-600';
    Icon = CreditCard;
  } else if (norm.includes('PUBLISH') || norm.includes('COMPLETE')) {
    bg = 'bg-emerald-100/70 text-emerald-900 border-emerald-300';
    dotColor = 'bg-emerald-700';
    Icon = Check;
  } else if (norm.includes('BLOCK') || norm.includes('FAIL') || norm.includes('ERROR')) {
    bg = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotColor = 'bg-rose-600';
    Icon = AlertTriangle;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-xs sm:text-sm px-3.5 py-1.5 gap-2 font-black',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono tracking-tight transition-colors select-none',
        bg,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor, norm.includes('READY') && 'animate-pulse')} />
      )}
      <span>{norm}</span>
    </span>
  );
};
