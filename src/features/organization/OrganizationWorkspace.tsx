// src/features/organization/OrganizationWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Organization Workspace
// Single Workspace for: [ Legal Entities ] [ Departments ] [ Designations ] [ Locations ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  Award,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { OrganizationView } from './OrganizationView';
import { DepartmentsAndTeamsView } from './DepartmentsAndTeamsView';
import { DesignationView } from './DesignationView';
import { LocationView } from './LocationView';
import { cn } from '../../lib/utils';

export type OrganizationTab = 'entities' | 'departments' | 'designations' | 'locations';

interface OrganizationWorkspaceProps {
  initialTab?: OrganizationTab;
  onNavigate?: (route: string) => void;
}

export const OrganizationWorkspace: React.FC<OrganizationWorkspaceProps> = ({
  initialTab = 'entities',
}) => {
  const [activeTab, setActiveTab] = useState<OrganizationTab>(initialTab);

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
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Workforce Architecture</span>
              <span>•</span>
              <span>Organization Master</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Organization Architecture & Hierarchy
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Configure multi-company legal entities, department hierarchies, designation grading bands, and physical operating locations.
            </p>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('entities')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'entities'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Legal Entities & Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'departments'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Departments & Teams</span>
          </button>

          <button
            onClick={() => setActiveTab('designations')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'designations'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Award className="w-4 h-4" />
            <span>Designations & Grades</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'locations'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <MapPin className="w-4 h-4" />
            <span>Operating Locations & Geofences</span>
          </button>
        </div>
      </div>

      {/* Workspace Active Subview */}
      <div className="transition-all duration-200">
        {activeTab === 'entities' && <OrganizationView />}
        {activeTab === 'departments' && <DepartmentsAndTeamsView />}
        {activeTab === 'designations' && <DesignationView />}
        {activeTab === 'locations' && <LocationView />}
      </div>
    </div>
  );
};
