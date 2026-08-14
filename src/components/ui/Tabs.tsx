import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs?: TabItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
  children?: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const TabsRoot = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500 border border-slate-200/60',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-white data-[state=checked]:text-[#064E3B] data-[state=checked]:shadow-xs cursor-pointer',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-3 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  children,
  defaultValue,
  value,
  onValueChange,
}) => {
  if (children) {
    return (
      <TabsPrimitive.Root
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
        className={className}
      >
        {children}
      </TabsPrimitive.Root>
    );
  }

  if (!tabs) return null;

  return (
    <div className={cn('border-b border-slate-200 flex gap-6 overflow-x-auto scrollbar-none', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange && onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 py-2.5 px-1 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer select-none',
              isActive
                ? 'border-[#047857] text-[#064E3B]'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            {tab.icon && (
              <span className={isActive ? 'text-[#047857]' : 'text-slate-400'}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  isActive
                    ? 'bg-[#ECFDF5] text-[#064E3B] border border-[#A7F3D0]'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
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
