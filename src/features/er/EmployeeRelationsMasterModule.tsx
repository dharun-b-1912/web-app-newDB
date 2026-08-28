import React, { useState, useEffect } from 'react';
import { EngagementSurveysView } from './EngagementSurveysView';
import { GrievanceDeskView } from './GrievanceDeskView';
import { DisciplinaryActionsView } from './DisciplinaryActionsView';
import { PoshCommitteeView } from './PoshCommitteeView';
import { StatutoryComplianceView } from './StatutoryComplianceView';
import { HrCommunicationsView } from './HrCommunicationsView';
import { HelpDeskView } from './HelpDeskView';
import { KnowledgeCentreView } from './KnowledgeCentreView';
import {
  HeartHandshake,
  Inbox,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Megaphone,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmployeeRelationsMasterModuleProps {
  initialTab?: string;
}

type TabKey =
  | 'surveys'
  | 'grievances'
  | 'discipline'
  | 'posh'
  | 'compliance'
  | 'communication'
  | 'helpdesk'
  | 'knowledge';

const resolveTab = (route?: string): TabKey => {
  if (!route) return 'surveys';
  const clean = route.replace(/^(er-|other-|hr-)/, '');
  if (clean === 'engagement' || clean === 'surveys' || clean === 'engagement-surveys') return 'surveys';
  if (clean === 'grievance' || clean === 'grievances' || clean === 'grievance-desk') return 'grievances';
  if (clean === 'discipline' || clean === 'disciplinary' || clean === 'disciplinary-actions') return 'discipline';
  if (clean === 'posh' || clean === 'posh-committee') return 'posh';
  if (clean === 'compliance' || clean === 'statutory-compliance') return 'compliance';
  if (clean === 'communication' || clean === 'communications' || clean === 'hr-communications') return 'communication';
  if (clean === 'helpdesk' || clean === 'help-desk' || clean === 'requests') return 'helpdesk';
  if (clean === 'knowledge' || clean === 'knowledge-centre' || clean === 'kb') return 'knowledge';
  return 'surveys';
};

export const EmployeeRelationsMasterModule: React.FC<EmployeeRelationsMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [initialTab]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; section: string }[] = [
    { key: 'surveys', label: 'Engagement & Surveys', icon: HeartHandshake, section: 'EMPLOYEE RELATIONS' },
    { key: 'grievances', label: 'Grievance Desk', icon: Inbox, section: 'EMPLOYEE RELATIONS' },
    { key: 'discipline', label: 'Disciplinary Actions', icon: Scale, section: 'EMPLOYEE RELATIONS' },
    { key: 'posh', label: 'POSH Committee', icon: ShieldAlert, section: 'EMPLOYEE RELATIONS' },
    { key: 'compliance', label: 'Statutory Compliance', icon: ShieldCheck, section: 'EMPLOYEE RELATIONS' },
    { key: 'communication', label: 'HR Communications', icon: Megaphone, section: 'COMMUNICATION & HELP' },
    { key: 'helpdesk', label: 'Help Desk', icon: HelpCircle, section: 'COMMUNICATION & HELP' },
    { key: 'knowledge', label: 'Knowledge Centre', icon: BookOpen, section: 'COMMUNICATION & HELP' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Module Tab Switcher */}
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

      {/* Subview Container */}
      <div>
        {activeTab === 'surveys' && <EngagementSurveysView />}
        {activeTab === 'grievances' && <GrievanceDeskView />}
        {activeTab === 'discipline' && <DisciplinaryActionsView />}
        {activeTab === 'posh' && <PoshCommitteeView />}
        {activeTab === 'compliance' && <StatutoryComplianceView />}
        {activeTab === 'communication' && <HrCommunicationsView />}
        {activeTab === 'helpdesk' && <HelpDeskView />}
        {activeTab === 'knowledge' && <KnowledgeCentreView onNavigateToHelpdesk={() => setActiveTab('helpdesk')} />}
      </div>
    </div>
  );
};
