import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('border-b border-gray-200 flex gap-6 overflow-x-auto scrollbar-none', className)}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
              isActive
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            )}
          >
            {tab.icon && <span className={isActive ? 'text-[#07563D]' : 'text-gray-400'}>{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-1 text-[11px] px-2 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-emerald-100 text-[#07563D]' : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
