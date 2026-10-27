// src/features/organization/WorkforceWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Workforce Workspace
// Unified Workspace: [ People ] [ Organization ] [ Locations ] [ Resources ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  MapPin,
  Package,
  FileText,
  UserPlus,
  Sparkles,
  Layers,
  Award,
  ContactRound,
  Network,
  FolderArchive,
} from 'lucide-react';
import { PeopleView } from '../people/PeopleView';
import { OrganizationView } from './OrganizationView';
import { DepartmentsAndTeamsView } from './DepartmentsAndTeamsView';
import { DesignationView } from './DesignationView';
import { LocationView } from './LocationView';
import { AssetsView } from './AssetsView';
import { DocumentManagementView } from '../documents/DocumentManagementView';
import { OnboardingView } from '../onboarding/OnboardingView';
import { OffboardingView } from '../offboarding/OffboardingView';
import { cn } from '../../lib/utils';

export type WorkforceTab = 'people' | 'organization' | 'locations' | 'resources';

interface WorkforceWorkspaceProps {
  initialTab?: WorkforceTab;
  initialSubTab?: string;
  onNavigate?: (route: string) => void;
}

export const WorkforceWorkspace: React.FC<WorkforceWorkspaceProps> = ({
  initialTab = 'people',
  initialSubTab,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<WorkforceTab>(initialTab);
  const [peopleSubTab, setPeopleSubTab] = useState<'directory' | 'onboarding' | 'offboarding'>(
    initialSubTab === 'onboarding' || initialSubTab === 'offboarding' ? initialSubTab : 'directory'
  );
  const [orgSubTab, setOrgSubTab] = useState<'entities' | 'departments' | 'designations'>(
    initialSubTab === 'departments' || initialSubTab === 'designations' ? initialSubTab : 'entities'
  );
  const [resourceSubTab, setResourceSubTab] = useState<'assets' | 'documents'>(
    initialSubTab === 'documents' ? 'documents' : 'assets'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialSubTab === 'documents' || initialSubTab === 'assets') {
      setResourceSubTab(initialSubTab);
    }
    if (initialSubTab === 'onboarding' || initialSubTab === 'offboarding' || initialSubTab === 'directory') {
      setPeopleSubTab(initialSubTab);
    }
    if (initialSubTab === 'departments' || initialSubTab === 'designations' || initialSubTab === 'entities') {
      setOrgSubTab(initialSubTab);
    }
  }, [initialTab, initialSubTab]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Compact Executive Header & Navigation */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#07563D] text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-[#07563D]" />
            <span>Enterprise Workforce Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            Workforce, Organization & Resources
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Unified directory across legal entities, department hierarchies, designation grades, geofences, and assets.
          </p>
        </div>

        {/* Primary Workspace Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
          <button
            onClick={() => setActiveTab('people')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'people'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People & Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('organization')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'organization'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organization & Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'locations'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations & Geofences</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'resources'
                ? 'bg-[#07563D] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Resources & Assets</span>
          </button>
        </div>
      </div>

      {/* 1. PEOPLE WORKSPACE */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setPeopleSubTab('directory')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                peopleSubTab === 'directory' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Employee Directory & 360°</span>
            </button>
            <button
              onClick={() => setPeopleSubTab('onboarding')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                peopleSubTab === 'onboarding' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboarding Pipeline</span>
            </button>
            <button
              onClick={() => setPeopleSubTab('offboarding')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                peopleSubTab === 'offboarding' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <span>Offboarding & Exits</span>
            </button>
          </div>

          <div>
            {peopleSubTab === 'directory' && <PeopleView />}
            {peopleSubTab === 'onboarding' && <OnboardingView />}
            {peopleSubTab === 'offboarding' && <OffboardingView />}
          </div>
        </div>
      )}

      {/* 2. ORGANIZATION WORKSPACE */}
      {activeTab === 'organization' && (
        <div className="space-y-4">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setOrgSubTab('entities')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                orgSubTab === 'entities' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Legal Entities & Hierarchy</span>
            </button>
            <button
              onClick={() => setOrgSubTab('departments')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                orgSubTab === 'departments' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Departments & Teams</span>
            </button>
            <button
              onClick={() => setOrgSubTab('designations')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                orgSubTab === 'designations' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Designation & Job Bands</span>
            </button>
          </div>

          <div>
            {orgSubTab === 'entities' && <OrganizationView />}
            {orgSubTab === 'departments' && <DepartmentsAndTeamsView />}
            {orgSubTab === 'designations' && <DesignationView />}
          </div>
        </div>
      )}

      {/* 3. LOCATIONS WORKSPACE */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <LocationView />
        </div>
      )}

      {/* 4. RESOURCES WORKSPACE */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setResourceSubTab('assets')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                resourceSubTab === 'assets' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Company Asset Master</span>
            </button>
            <button
              onClick={() => setResourceSubTab('documents')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                resourceSubTab === 'documents' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Enterprise Documents & Policies</span>
            </button>
          </div>

          <div>
            {resourceSubTab === 'assets' && <AssetsView />}
            {resourceSubTab === 'documents' && <DocumentManagementView />}
          </div>
        </div>
      )}
    </div>
  );
};
