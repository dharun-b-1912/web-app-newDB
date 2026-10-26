import React, { useState, useEffect } from 'react';
import { LmsDashboardView } from './subviews/LmsDashboardView';
import { CoursesView } from './subviews/CoursesView';
import { TrainingProgramsView } from './subviews/TrainingProgramsView';
import { TrainingCalendarView } from './subviews/TrainingCalendarView';
import { EnrollmentView } from './subviews/EnrollmentView';
import { TrainersView } from './subviews/TrainersView';
import { AssessmentsView } from './subviews/AssessmentsView';
import { CertificationsView } from './subviews/CertificationsView';
import { MandatoryTrainingView } from './subviews/MandatoryTrainingView';
import { SkillDevelopmentView } from './subviews/SkillDevelopmentView';
import { TrainingFeedbackView } from './subviews/TrainingFeedbackView';
import { LmsReportsView } from './subviews/LmsReportsView';
import { LmsSettingsView } from './subviews/LmsSettingsView';

import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  UserCheck,
  Users,
  Award,
  ShieldCheck,
  GitFork,
  MessageSquare,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { lmsRealtimeService } from '../../services/lms/lmsRealtimeService';

interface LmsMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  const clean = (route || '').replace(/^lms-/, '');
  if (clean === 'courses' || clean === 'my-courses' || clean === 'course-library') return 'courses';
  return 'dashboard';
};

export const LmsMasterModule: React.FC<LmsMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [liveCompliance, setLiveCompliance] = useState<string>('Live Tracking');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  useEffect(() => {
    lmsRealtimeService.getDashboardMetrics().then((m) => {
      setLiveCompliance(m.mandatoryCompliance);
    }).catch(() => {});
  }, [activeTab]);

  const tabs = [
    { id: 'dashboard', label: 'Learning Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses & Player', icon: BookOpen },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Joy PeopleHR — HR & Payroll SaaS</span>
            <span>•</span>
            <span>Training & LMS Engine v4.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Training & LMS Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Centralized employee learning, YouTube course player, MCQ assessments & pass/fail grading, anti-skip enforcement, and real-time employee compliance tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Mandatory Compliance</span>
            <span className="text-sm font-black font-mono">{liveCompliance} Compliant</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-[#07563D] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/60'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <LmsDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'courses' && <CoursesView />}
      </div>
    </div>
  );
};
