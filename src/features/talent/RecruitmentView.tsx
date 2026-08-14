import React, { useState } from 'react';
import { Briefcase, FileCheck, Layers, Share2, Users, FileText, CheckSquare, Star, Calendar, Award } from 'lucide-react';
import { AtsDashboard } from './recruitment/AtsDashboard';
import { RequisitionManager } from './recruitment/RequisitionManager';
import { JobManager } from './recruitment/JobManager';
import { PublishedJobsManager } from './recruitment/PublishedJobsManager';
import { CandidateManager } from './recruitment/CandidateManager';
import { ApplicationsList } from './recruitment/ApplicationsList';
import { ScreeningManager } from './recruitment/ScreeningManager';
import { ShortlistedManager } from './recruitment/ShortlistedManager';
import { InterviewManager } from './recruitment/InterviewManager';
import { OfferManager } from './recruitment/OfferManager';

type AtsTab =
  | 'dashboard'
  | 'requisitions'
  | 'jobs'
  | 'channels'
  | 'candidates'
  | 'applications'
  | 'screening'
  | 'shortlisted'
  | 'interviews'
  | 'offers';

export const RecruitmentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AtsTab>('dashboard');

  const tabs: { id: AtsTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'ATS Overview', icon: Briefcase },
    { id: 'requisitions', label: 'Requisitions', icon: FileCheck },
    { id: 'jobs', label: 'Job Openings', icon: Layers },
    { id: 'channels', label: 'Multi-Publishing', icon: Share2 },
    { id: 'candidates', label: 'Candidate Master', icon: Users },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'screening', label: 'Resume Screen', icon: CheckSquare },
    { id: 'shortlisted', label: 'Shortlisted', icon: Star },
    { id: 'interviews', label: 'Interviews', icon: Calendar },
    { id: 'offers', label: 'Offers & CTC', icon: Award },
  ];

  return (
    <div className="space-y-6">


      {/* Main Tab Content View */}
      <div>
        {activeTab === 'dashboard' && <AtsDashboard />}
        {activeTab === 'requisitions' && <RequisitionManager />}
        {activeTab === 'jobs' && <JobManager />}
        {activeTab === 'channels' && <PublishedJobsManager />}
        {activeTab === 'candidates' && <CandidateManager />}
        {activeTab === 'applications' && <ApplicationsList />}
        {activeTab === 'screening' && <ScreeningManager />}
        {activeTab === 'shortlisted' && <ShortlistedManager />}
        {activeTab === 'interviews' && <InterviewManager />}
        {activeTab === 'offers' && <OfferManager />}
      </div>
    </div>
  );
};

export default RecruitmentView;
