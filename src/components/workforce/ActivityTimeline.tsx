import React from 'react';
import {
  CreditCard,
  Building2,
  Flag,
  Shield,
  Server,
  UserCheck,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ActivityEventItem {
  id: string;
  text: string;
  meta?: string;
  time: string;
  type?: 'billing' | 'payment' | 'tenant' | 'flag' | 'system' | 'security' | string;
}

export interface ActivityTimelineProps {
  events: ActivityEventItem[];
  className?: string;
  maxItems?: number;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  className,
  maxItems,
}) => {
  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  const getIcon = (type?: string) => {
    switch (type) {
      case 'billing':
      case 'payment':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-700" />;
      case 'tenant':
        return <Building2 className="w-3.5 h-3.5 text-blue-700" />;
      case 'flag':
        return <Flag className="w-3.5 h-3.5 text-purple-700" />;
      case 'security':
        return <Shield className="w-3.5 h-3.5 text-rose-700" />;
      case 'system':
        return <Server className="w-3.5 h-3.5 text-amber-700" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-slate-700" />;
    }
  };

  const getIconBg = (type?: string) => {
    switch (type) {
      case 'billing':
      case 'payment':
        return 'bg-emerald-50 border-emerald-200';
      case 'tenant':
        return 'bg-blue-50 border-blue-200';
      case 'flag':
        return 'bg-purple-50 border-purple-200';
      case 'security':
        return 'bg-rose-50 border-rose-200';
      case 'system':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {displayEvents.map((evt, idx) => (
        <div
          key={evt.id || idx}
          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all text-xs"
        >
          <div
            className={cn(
              'p-1.5 rounded-md border shrink-0 mt-0.5',
              getIconBg(evt.type)
            )}
          >
            {getIcon(evt.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 leading-snug">
              {evt.text}
            </p>
            {evt.meta && (
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-mono">
                {evt.meta}
              </p>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0">
            {evt.time}
          </span>
        </div>
      ))}
    </div>
  );
};
