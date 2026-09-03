// src/features/organization/ResourcesWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Resources Workspace
// Consolidated Workspace for: [ Documents & E-Sign ] [ Asset Master ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Package,
  FolderArchive,
  Sparkles,
} from 'lucide-react';
import { DocumentManagementView } from '../documents/DocumentManagementView';
import { AssetsView } from './AssetsView';
import { cn } from '../../lib/utils';

export type ResourcesTab = 'documents' | 'assets';

interface ResourcesWorkspaceProps {
  initialTab?: ResourcesTab;
  onNavigate?: (route: string) => void;
}

export const ResourcesWorkspace: React.FC<ResourcesWorkspaceProps> = ({
  initialTab = 'documents',
}) => {
  const [activeTab, setActiveTab] = useState<ResourcesTab>(initialTab);

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
              <FolderArchive className="w-3.5 h-3.5 text-emerald-300" />
              <span>Enterprise Resources</span>
              <span>•</span>
              <span>Documents & Physical Assets</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Company Resources & Digital Assets
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Centralized repository for corporate policy documents, digital contracts, and company hardware asset inventory.
            </p>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('documents')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'documents'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Documents & E-Sign</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'assets'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Package className="w-4 h-4" />
            <span>Company Asset Master</span>
          </button>
        </div>
      </div>

      {/* Active Resource View */}
      <div className="transition-all duration-200">
        {activeTab === 'documents' && <DocumentManagementView />}
        {activeTab === 'assets' && <AssetsView />}
      </div>
    </div>
  );
};
