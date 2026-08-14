import React from 'react';
import { Search, MapPin, Sparkles, Shield } from 'lucide-react';
import { CompanySelector } from './CompanySelector';
import { UserMenu } from './UserMenu';
import { NotificationsCenter } from './NotificationsCenter';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';

export interface TopbarProps {
  onOpenSearch: () => void;
  onOpenAiAssistant?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSearch, onOpenAiAssistant }) => {
  const { activeCompany } = useTenant();
  const { primaryRole, roleProfile } = usePermission();

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left Area: Company Switcher & Location Badge */}
      <div className="flex items-center gap-2.5 shrink-0">
        <CompanySelector />
        
        {activeCompany && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-200/60 text-xs font-semibold text-gray-600 whitespace-nowrap shrink-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{activeCompany.city}, {activeCompany.country}</span>
          </div>
        )}

        {/* Role & Scope Indicator Badge */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-[#07563D] rounded-xl border border-emerald-200/60 text-xs font-bold whitespace-nowrap shrink-0">
          <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>{primaryRole} ({roleProfile.defaultScope})</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-3 min-w-0 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-gray-400 transition-colors cursor-pointer shrink-0"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate whitespace-nowrap text-xs text-gray-400 font-medium">Search employees, departments, reports...</span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-white rounded-md border border-gray-200 shadow-2xs shrink-0 ml-2">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Area: Search (mobile), AI Assistant, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search trigger for mobile viewport */}
        <button
          onClick={onOpenSearch}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors md:hidden cursor-pointer shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* AI Assistant Quick Trigger */}
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>HR Assistant</span>
          </button>
        )}

        {/* Unified Approvals & Notifications */}
        <NotificationsCenter />

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
