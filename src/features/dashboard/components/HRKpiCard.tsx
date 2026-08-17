import React from 'react';
import { Card } from '../../../components/ui/Card';
import { LucideIcon } from 'lucide-react';

export interface HRKpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: {
    text: string;
    variant: 'positive' | 'warning' | 'neutral' | 'info';
  };
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
}

export const HRKpiCard: React.FC<HRKpiCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon: Icon,
  iconBgColor = 'bg-emerald-50',
  iconColor = 'text-[#07563D]',
  onClick,
}) => {
  const getBadgeStyle = (variant: 'positive' | 'warning' | 'neutral' | 'info') => {
    switch (variant) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'neutral':
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card
      onClick={onClick}
      className={`p-4 space-y-2.5 transition-all duration-200 border border-gray-100/90 shadow-sm ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 group' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl ${iconBgColor} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-black text-gray-900 tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${getBadgeStyle(badge.variant)}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-[11px] text-gray-400 font-medium truncate">
          {subtext}
        </p>
      )}
    </Card>
  );
};
