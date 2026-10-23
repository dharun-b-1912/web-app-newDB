import React from 'react';
import { LayoutDashboard, LineChart, BarChart3 } from 'lucide-react';

export type DashboardTabId = 'dashboard' | 'workforce-overview' | 'executive-overview';

interface DashboardNavigationTabsProps {
  activeTab: DashboardTabId;
  onNavigate?: (route: string) => void;
  pendingApprovalsCount?: number;
}

export const DashboardNavigationTabs: React.FC<DashboardNavigationTabsProps> = ({
  activeTab,
  onNavigate,
  pendingApprovalsCount = 0,
}) => {
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'HR Dashboard',
      description: 'Daily Operations & Attention',
      icon: LayoutDashboard,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'workforce-overview' as const,
      label: 'Workforce Overview',
      description: 'Demographics & Capacity',
      icon: LineChart,
    },
    {
      id: 'executive-overview' as const,
      label: 'Executive HR Overview',
      description: 'C-Suite Strategy & Risks',
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 shadow-sm">
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate?.(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-[#07563D] text-white shadow-md shadow-emerald-950/15'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-gray-400'}`} />
              <div className="text-left">
                <span className="block leading-tight font-black">{tab.label}</span>
                <span
                  className={`block text-[10px] font-normal leading-tight hidden md:block ${
                    isActive ? 'text-emerald-100/90' : 'text-gray-400'
                  }`}
                >
                  {tab.description}
                </span>
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-black rounded-full ${
                    isActive
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 pr-3 text-[11px] text-gray-400 font-medium">
        <span>Dashboard Suite</span>
        <span className="text-gray-300">•</span>
        <span className="text-emerald-700 font-bold capitalize">
          {activeTab.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
};
