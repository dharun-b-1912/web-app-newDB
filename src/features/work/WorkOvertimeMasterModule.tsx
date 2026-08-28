import React, { useState, useEffect } from 'react';
import { OvertimeEngineView } from './OvertimeEngineView';
import { OvertimeRequestsView } from './OvertimeRequestsView';
import { WfhRequestsView } from './WfhRequestsView';
import { BreaksWorkHoursView } from './BreaksWorkHoursView';
import { TrendingUp, Clock, Laptop, Coffee } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WorkOvertimeMasterModuleProps {
  initialTab?: string;
}

type TabKey = 'engine' | 'requests' | 'wfh' | 'breaks';

const resolveTab = (route?: string): TabKey => {
  if (!route || route === 'overtime' || route === 'work-overtime') return 'engine';
  if (route === 'overtime-requests') return 'requests';
  if (route === 'wfh') return 'wfh';
  if (route === 'breaks-workhours' || route === 'breaks') return 'breaks';
  return 'engine';
};

export const WorkOvertimeMasterModule: React.FC<WorkOvertimeMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [initialTab]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'engine', label: 'Overtime Engine', icon: TrendingUp },
    { key: 'requests', label: 'Overtime Requests', icon: Clock },
    { key: 'wfh', label: 'WFH Requests', icon: Laptop },
    { key: 'breaks', label: 'Breaks & Work Hours', icon: Coffee },
  ];

  return (
    <div className="space-y-6">
      {/* Module Navigation Header */}
      <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                  isActive
                    ? 'bg-emerald-50 text-[#07563D] shadow-2xs border border-emerald-200/80'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-[#07563D]' : 'text-gray-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Container */}
      <div>
        {activeTab === 'engine' && <OvertimeEngineView />}
        {activeTab === 'requests' && <OvertimeRequestsView />}
        {activeTab === 'wfh' && <WfhRequestsView />}
        {activeTab === 'breaks' && <BreaksWorkHoursView />}
      </div>
    </div>
  );
};
