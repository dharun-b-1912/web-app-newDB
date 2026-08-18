// src/features/talent/RecruitmentView.tsx
// ============================================================================
// WorkForceOS — Recruitment & ATS 2.0 Enterprise Operating System Workspace
// 10 Standalone Business Modules with Zero-Mock Data & State Machine Lifecycle
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  FileCheck2,
  Layers,
  Users,
  Calendar,
  Award,
  Share2,
  Folder,
  BarChart3,
  Zap,
  Plug,
} from 'lucide-react';
import { AtsDashboard } from './recruitment/AtsDashboard';
import { RequisitionManager } from './recruitment/RequisitionManager';
import { JobManager } from './recruitment/JobManager';
import { CandidateManager } from './recruitment/CandidateManager';
import { InterviewManager } from './recruitment/InterviewManager';
import { OfferManager } from './recruitment/OfferManager';
import { ReferralsManager } from './recruitment/ReferralsManager';
import { TalentPoolManager } from './recruitment/TalentPoolManager';
import { RecruitmentAnalyticsView } from './recruitment/RecruitmentAnalyticsView';
import { RecruitmentAutomationView } from './recruitment/RecruitmentAutomationView';
import { cn } from '../../lib/utils';

export type AtsTab =
  | 'dashboard'
  | 'requisitions'
  | 'jobs'
  | 'applicants'
  | 'interviews'
  | 'offers'
  | 'referrals'
  | 'talent_pool'
  | 'analytics'
  | 'automation';

interface Props {
  initialTab?: string;
}

export const RecruitmentView: React.FC<Props> = ({ initialTab }) => {
  const mapInitialTab = (tab?: string): AtsTab => {
    if (!tab) return 'dashboard';
    if (tab === 'recruitment-requisitions' || tab === 'requisitions') return 'requisitions';
    if (tab === 'recruitment-jobs' || tab === 'jobs') return 'jobs';
    if (tab === 'recruitment-applicants' || tab === 'candidates' || tab === 'applicants') return 'applicants';
    if (tab === 'recruitment-interviews' || tab === 'interviews') return 'interviews';
    if (tab === 'recruitment-offers' || tab === 'offers') return 'offers';
    if (tab === 'recruitment-referrals' || tab === 'referrals') return 'referrals';
    if (tab === 'recruitment-talent-pool' || tab === 'talent_pool' || tab === 'talent_pools') return 'talent_pool';
    if (tab === 'recruitment-analytics' || tab === 'analytics') return 'analytics';
    if (tab === 'recruitment-automation' || tab === 'automation') return 'automation';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<AtsTab>(mapInitialTab(initialTab));
  const [candidateStageFilter, setCandidateStageFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(mapInitialTab(initialTab));
    }
  }, [initialTab]);

  const tabs: { id: AtsTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Command Center', icon: Briefcase },
    { id: 'requisitions', label: 'Requisitions', icon: FileCheck2 },
    { id: 'jobs', label: 'Job Openings', icon: Layers },
    { id: 'applicants', label: 'Applicants', icon: Users },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'offers', label: 'Offers', icon: Award },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'talent_pool', label: 'Talent Pool', icon: Folder },
    { id: 'analytics', label: 'Recruitment Analytics', icon: BarChart3 },
    { id: 'automation', label: 'Recruitment Automation', icon: Zap },
  ];

  const handleNavigateFromFunnel = (tabId: string, filterPayload?: any) => {
    if ((tabId === 'candidates' || tabId === 'applicants') && filterPayload?.stage) {
      setCandidateStageFilter(filterPayload.stage);
      setActiveTab('applicants');
    } else {
      setCandidateStageFilter(undefined);
      setActiveTab(mapInitialTab(tabId));
    }
  };

  const handleOpenIntegrations = () => {
    window.dispatchEvent(
      new CustomEvent('platform:navigate', {
        detail: { tab: 'integrations' },
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* ATS 2.0 Navigation Bar */}
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setCandidateStageFilter(undefined);
                  setActiveTab(t.id);
                }}
                className={cn(
                  'px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2',
                  isActive
                    ? 'bg-[#07563D] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Integration Hub Deep Link */}
        <button
          onClick={handleOpenIntegrations}
          className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-[#07563D] hover:border-emerald-300 transition flex items-center gap-1.5"
        >
          <Plug className="w-3.5 h-3.5 text-[#07563D]" />
          ATS Integrations Hub
        </button>
      </div>

      {/* Main Tab Content View */}
      <div>
        {activeTab === 'dashboard' && (
          <AtsDashboard
            onNavigateTab={handleNavigateFromFunnel}
            onOpenCreateRequisition={() => setActiveTab('requisitions')}
            onOpenCreateJob={() => setActiveTab('jobs')}
            onOpenAddCandidate={() => setActiveTab('applicants')}
          />
        )}
        {activeTab === 'requisitions' && <RequisitionManager />}
        {activeTab === 'jobs' && <JobManager />}
        {activeTab === 'applicants' && <CandidateManager initialStageFilter={candidateStageFilter} />}
        {activeTab === 'interviews' && <InterviewManager />}
        {activeTab === 'offers' && <OfferManager />}
        {activeTab === 'referrals' && <ReferralsManager />}
        {activeTab === 'talent_pool' && <TalentPoolManager />}
        {activeTab === 'analytics' && <RecruitmentAnalyticsView />}
        {activeTab === 'automation' && <RecruitmentAutomationView />}
      </div>
    </div>
  );
};

export default RecruitmentView;
