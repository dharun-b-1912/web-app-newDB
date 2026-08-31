import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Shield, Globe, Terminal } from 'lucide-react';
import { CompanySelector } from './CompanySelector';
import { UserMenu } from './UserMenu';
import { NotificationsCenter } from './NotificationsCenter';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { AppDiagnosticsModal } from '../common/AppDiagnosticsModal';
import { appLogger } from '../../lib/appLogger';

export interface TopbarProps {
  onOpenSearch: () => void;
  onOpenAiAssistant?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSearch, onOpenAiAssistant }) => {
  const { activeCompany } = useTenant();
  const { primaryRole, roleProfile } = usePermission();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const isSuperAdmin = primaryRole === 'Super Admin';

  useEffect(() => {
    const handleLog = () => {
      const logs = appLogger.getRecentLogs();
      const errs = logs.filter((l) => l.level === 'ERROR' || l.level === 'CRASH').length;
      setErrorCount(errs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDiagnosticsOpen((prev) => !prev);
      }
    };

    window.addEventListener('wf-app-log', handleLog);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wf-app-log', handleLog);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left Area */}
      <div className="flex items-center gap-2.5 shrink-0">
        {isSuperAdmin ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#07563D] text-white rounded-xl font-bold text-xs shadow-xs shrink-0">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Platform Control Plane</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-[#07563D] rounded-full border border-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PRODUCTION</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 shrink-0">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>India (ap-south-1)</span>
            </div>
          </div>
        ) : (
          <>
            <CompanySelector />
            
            {activeCompany && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-200/60 text-xs font-semibold text-gray-600 whitespace-nowrap shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{activeCompany.city}, {activeCompany.country}</span>
              </div>
            )}

            {/* Role & Scope Indicator Badge */}
            <div className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 ${
              primaryRole === 'Vendor Admin'
                ? 'bg-indigo-50 text-indigo-900 border-indigo-200/80'
                : 'bg-emerald-50 text-[#07563D] border-emerald-200/60'
            }`}>
              <Shield className={`w-3.5 h-3.5 shrink-0 ${primaryRole === 'Vendor Admin' ? 'text-indigo-600' : 'text-emerald-700'}`} />
              <span>{primaryRole === 'Vendor Admin' ? 'Vendor Operations Admin (Partner)' : `${primaryRole} (${roleProfile.defaultScope})`}</span>
            </div>
          </>
        )}
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-3 min-w-0 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-gray-400 transition-colors cursor-pointer shrink-0"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate whitespace-nowrap text-xs text-gray-400 font-medium">
              {isSuperAdmin
                ? 'Search organizations, invoices, audit events (Ctrl + K)...'
                : 'Search employees, departments, reports...'}
            </span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-white rounded-md border border-gray-200 shadow-2xs shrink-0 ml-2 font-mono">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Area: Search (mobile), AI Assistant, Diagnostics, Notifications, User Menu */}
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
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{isSuperAdmin ? 'Joy PeopleHR Copilot' : 'HR Assistant'}</span>
          </button>
        )}

        {/* Diagnostics & Live Telemetry Trigger */}
        <button
          onClick={() => setIsDiagnosticsOpen(true)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer relative flex items-center justify-center ${
            errorCount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
              : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200 text-gray-600'
          }`}
          title="System Diagnostics & Crash Logs (Ctrl + Shift + D)"
        >
          <Terminal className="w-4 h-4" />
          {errorCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
              {errorCount > 9 ? '9+' : errorCount}
            </span>
          )}
        </button>

        {/* Unified Approvals & Notifications */}
        <NotificationsCenter />

        {/* User Account Menu */}
        <UserMenu />
      </div>

      {/* Diagnostics Modal */}
      <AppDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </header>
  );
};

