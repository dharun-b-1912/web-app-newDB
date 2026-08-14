import React, { useState, useEffect } from 'react';
import { TlDashboardView } from './subviews/TlDashboardView';
import { TlMyTeamView } from './subviews/TlMyTeamView';
import { TlAttendanceView } from './subviews/TlAttendanceView';
import { TlLeaveView } from './subviews/TlLeaveView';
import { TlApprovalsView } from './subviews/TlApprovalsView';
import { TlTeamTasksView } from './subviews/TlTeamTasksView';
import { TlPerformanceView } from './subviews/TlPerformanceView';
import { TlTrainingView } from './subviews/TlTrainingView';
import { TlCommunicationView } from './subviews/TlCommunicationView';
import { TlReportsView } from './subviews/TlReportsView';

import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Award,
  GraduationCap,
  Megaphone,
  BarChart3,
} from 'lucide-react';

interface TlMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'tl' || route === 'supervisor') return 'dashboard';
  const clean = route.replace(/^tl-/, '');
  if (clean === 'my-team' || clean === 'team') return 'my-team';
  if (clean === 'attendance') return 'attendance';
  if (clean === 'leave') return 'leave';
  if (clean === 'approvals') return 'approvals';
  if (clean === 'tasks' || clean === 'team-tasks') return 'tasks';
  if (clean === 'performance') return 'performance';
  if (clean === 'training') return 'training';
  if (clean === 'communication') return 'communication';
  if (clean === 'reports') return 'reports';
  return 'dashboard';
};

export const TlMasterModule: React.FC<TlMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedTeam, setSelectedTeam] = useState('Frontend & UI Engineering Team (24 Members)');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'TL Dashboard', icon: LayoutDashboard },
    { id: 'my-team', label: 'My Team', icon: Users },
    { id: 'attendance', label: 'Team Attendance', icon: Clock },
    { id: 'leave', label: 'Team Leave', icon: Calendar },
    { id: 'approvals', label: 'Approval Center', icon: CheckCircle2 },
    { id: 'tasks', label: 'Team Tasks', icon: Plus },
    { id: 'performance', label: 'Performance', icon: Award },
    { id: 'training', label: 'Team Training', icon: GraduationCap },
    { id: 'communication', label: 'Communication', icon: Megaphone },
    { id: 'reports', label: 'Team Reports', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Team Selector & Scope Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Active Team Scope:</span>
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="p-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50/80 cursor-pointer"
          >
            <option value="Frontend & UI Engineering Team (24 Members)">Frontend & UI Engineering Team (24 Members)</option>
            <option value="DevOps & Cloud Infrastructure Team (12 Members)">DevOps & Cloud Infrastructure Team (12 Members)</option>
          </select>
        </div>

        <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
          Scope Isolated: Team ID team-eng-01
        </div>
      </div>



      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <TlDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'my-team' && <TlMyTeamView />}
        {activeTab === 'attendance' && <TlAttendanceView />}
        {activeTab === 'leave' && <TlLeaveView />}
        {activeTab === 'approvals' && <TlApprovalsView />}
        {activeTab === 'tasks' && <TlTeamTasksView />}
        {activeTab === 'performance' && <TlPerformanceView />}
        {activeTab === 'training' && <TlTrainingView />}
        {activeTab === 'communication' && <TlCommunicationView />}
        {activeTab === 'reports' && <TlReportsView />}
      </div>
    </div>
  );
};
