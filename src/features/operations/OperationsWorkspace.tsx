// src/features/operations/OperationsWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Operations Workspace
// Consolidated Workspace: [ Attendance ] [ Time & Shifts ] [ Leave ] [ Approvals ] [ Devices ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CalendarRange,
  CalendarDays,
  CheckSquare,
  Cpu,
  Sparkles,
  Activity,
  Workflow,
} from 'lucide-react';
import { AttendanceModuleMaster } from '../attendance/AttendanceModuleMaster';
import { WorkOvertimeMasterModule } from '../work/WorkOvertimeMasterModule';
import { LeaveManagementModule } from '../leave/LeaveManagementModule';
import { RequestsApprovalsWorkspace } from './RequestsApprovalsWorkspace';
import { cn } from '../../lib/utils';

export type OperationsTab = 'attendance' | 'shifts' | 'leave' | 'approvals' | 'devices';

interface OperationsWorkspaceProps {
  initialTab?: OperationsTab;
  onNavigate?: (route: string) => void;
}

export const OperationsWorkspace: React.FC<OperationsWorkspaceProps> = ({
  initialTab = 'attendance',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<OperationsTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Compact Executive Operations Header & Navigation */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#07563D] text-xs font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-[#07563D]" />
            <span>Daily Workforce Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            Attendance, Shifts, Leave & Approvals
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Unified command for real-time presence radar, shift rostering, leave ledgers, and approval workflows.
          </p>
        </div>

        {/* Primary Workspace Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'attendance'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance & Presence</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'shifts'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Time & Shifts</span>
          </button>

          <button
            onClick={() => setActiveTab('leave')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'leave'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Leave Management</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'approvals'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Requests & Approvals</span>
          </button>
        </div>
      </div>

      {/* Subview Renders */}
      <div className="transition-all duration-200">
        {activeTab === 'attendance' && (
          <AttendanceModuleMaster initialTab="attendance-dashboard" />
        )}
        {activeTab === 'shifts' && (
          <WorkOvertimeMasterModule initialTab="shifts" />
        )}
        {activeTab === 'leave' && (
          <LeaveManagementModule initialTab="leave-dashboard" />
        )}
        {activeTab === 'approvals' && (
          <RequestsApprovalsWorkspace initialTab="inbox" />
        )}
      </div>
    </div>
  );
};
