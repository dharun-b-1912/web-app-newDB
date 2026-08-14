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

interface LmsMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'lms') return 'dashboard';
  const clean = route.replace(/^lms-/, '');
  if (clean === 'courses' || clean === 'my-courses' || clean === 'course-library') return 'courses';
  if (clean === 'programs' || clean === 'sessions') return 'programs';
  if (clean === 'calendar') return 'calendar';
  if (clean === 'enrollment' || clean === 'enrollments') return 'enrollment';
  if (clean === 'trainers') return 'trainers';
  if (clean === 'assessments' || clean === 'exams') return 'assessments';
  if (clean === 'certifications' || clean === 'expiry') return 'certifications';
  if (clean === 'mandatory' || clean === 'compliance') return 'mandatory';
  if (clean === 'skills' || clean === 'paths' || clean === 'gaps') return 'skills';
  if (clean === 'feedback') return 'feedback';
  if (clean === 'reports') return 'reports';
  if (clean === 'settings') return 'settings';
  return 'dashboard';
};

export const LmsMasterModule: React.FC<LmsMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Learning Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Courses & Player', icon: BookOpen },
    { id: 'programs', label: 'Training Programs', icon: GraduationCap },
    { id: 'calendar', label: 'Training Calendar', icon: Calendar },
    { id: 'enrollment', label: 'Enrollments', icon: UserCheck },
    { id: 'trainers', label: 'Trainers & Vendors', icon: Users },
    { id: 'assessments', label: 'Assessments & Exams', icon: Award },
    { id: 'certifications', label: 'Certifications & Expiry', icon: Award },
    { id: 'mandatory', label: 'Mandatory Compliance', icon: ShieldCheck },
    { id: 'skills', label: 'Skill Gap & Paths', icon: GitFork },
    { id: 'feedback', label: 'Feedback & Ratings', icon: MessageSquare },
    { id: 'reports', label: 'LMS Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'LMS Settings', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS Enterprise Suite</span>
            <span>•</span>
            <span>Training & LMS Engine v4.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Training & LMS Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Centralized employee learning, course player, cohorts, assessments, digital certificates, POSH/InfoSec compliance, and Performance skill gap integration.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Mandatory Compliance</span>
            <span className="text-sm font-black font-mono">97.2% Compliant</span>
          </div>
        </div>
      </div>



      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <LmsDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'courses' && <CoursesView />}
        {activeTab === 'programs' && <TrainingProgramsView />}
        {activeTab === 'calendar' && <TrainingCalendarView />}
        {activeTab === 'enrollment' && <EnrollmentView />}
        {activeTab === 'trainers' && <TrainersView />}
        {activeTab === 'assessments' && <AssessmentsView />}
        {activeTab === 'certifications' && <CertificationsView />}
        {activeTab === 'mandatory' && <MandatoryTrainingView />}
        {activeTab === 'skills' && <SkillDevelopmentView />}
        {activeTab === 'feedback' && <TrainingFeedbackView />}
        {activeTab === 'reports' && <LmsReportsView />}
        {activeTab === 'settings' && <LmsSettingsView />}
      </div>
    </div>
  );
};
