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
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-emerald-300" />
              <span>Daily Workforce Control</span>
              <span>•</span>
              <span>Operations Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Attendance, Shifts, Leave & Approvals
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Live operational command for real-time presence radar, shift rostering, leave ledgers, approval escalation chains, and biometric IoT terminals.
            </p>
          </div>
        </div>

        {/* Primary Workspace Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'attendance'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance & Presence</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'shifts'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Time & Shifts</span>
          </button>

          <button
            onClick={() => setActiveTab('leave')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'leave'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Leave Management</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'approvals'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Requests & Approvals</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'devices'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Cpu className="w-4 h-4" />
            <span>Biometric Terminals & IoT</span>
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
        {activeTab === 'devices' && (
          <AttendanceModuleMaster initialTab="biometric" />
        )}
      </div>
    </div>
  );
};
