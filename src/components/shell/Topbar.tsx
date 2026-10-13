import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Shield, Globe, Terminal, ShieldCheck, ArrowRightLeft, Building2 } from 'lucide-react';
import { CompanySelector } from './CompanySelector';
import { VendorCompanyConnectionSelector } from './VendorCompanyConnectionSelector';
import { UserMenu } from './UserMenu';
import { NotificationsCenter } from './NotificationsCenter';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { AppDiagnosticsModal } from '../common/AppDiagnosticsModal';
import { CompanyLocationEditModal } from './CompanyLocationEditModal';
import { appLogger } from '../../lib/appLogger';

export interface TopbarProps {
  onOpenSearch: () => void;
  onOpenAiAssistant?: () => void;
  currentNav?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSearch, onOpenAiAssistant, currentNav }) => {
  const { activeCompany } = useTenant();
  const { primaryRole, roleProfile } = usePermission();
  const { user } = useAuth();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Active client site state for vendor portal
  const [activeVendorSite, setActiveVendorSite] = useState<string>(() => {
    try {
      return localStorage.getItem('workforce_vendor_active_site') || 'Chennai Manufacturing Plant (CHE-01)';
    } catch {
      return 'Chennai Manufacturing Plant (CHE-01)';
    }
  });

  useEffect(() => {
    const handleClientChange = (e: any) => {
      if (e.detail?.siteName) {
        setActiveVendorSite(e.detail.siteName);
      }
    };
    window.addEventListener('vendor:client_changed', handleClientChange);
    return () => window.removeEventListener('vendor:client_changed', handleClientChange);
  }, []);

  const isSuperAdmin = primaryRole === 'Super Admin';

  const isVendorPortal =
    primaryRole === 'Vendor Admin' ||
    (primaryRole as string) === 'Vendor Partner' ||
    (user as any)?.role === 'Vendor Admin' ||
    (user as any)?.userType === 'VENDOR' ||
    Boolean((user as any)?.vendor_id) ||
    (currentNav && currentNav.startsWith('vendor')) ||
    (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/vendor') ||
      window.location.pathname.includes('vendor-storage') ||
      window.location.pathname.includes('vendor-settlement') ||
      window.location.pathname.includes('vendor-portal')
    ));

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
        ) : isVendorPortal ? (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Dedicated Vendor Organization Identity & Connected Client Selector */}
            <VendorCompanyConnectionSelector />

            {/* Assigned Deployed Site Pill */}
            <div
              title="Assigned Client Deployment Location for Contracted Workforce"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs font-semibold text-[#07563D] whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Site: {activeVendorSite}</span>
            </div>

            {/* Vendor Scope Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-slate-900 text-white border-slate-700 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>Vendor Portal · External Partner</span>
            </div>
          </div>
        ) : (
          <>
            <CompanySelector />
            
            {activeCompany && (
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                title="Click to view or edit company live GPS location"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50/80 rounded-xl border border-gray-200/60 hover:border-emerald-300 text-xs font-semibold text-gray-700 hover:text-[#07563D] whitespace-nowrap shrink-0 transition-colors cursor-pointer group"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700 group-hover:scale-110 transition-transform shrink-0" />
                <span>{activeCompany.city || 'Coimbatore'}, {activeCompany.country || 'India'}</span>
              </button>
            )}

            {/* Role & Scope Indicator Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-emerald-50 text-[#07563D] border-emerald-200/60">
              <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span>{`${primaryRole} (${roleProfile.defaultScope})`}</span>
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
                : isVendorPortal
                ? 'Search purchase orders, workforce roster, invoices, compliance vault (Ctrl + K)...'
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
            <span>{isSuperAdmin ? 'Joy PeopleHR Copilot' : isVendorPortal ? 'Vendor Desk' : 'HR Assistant'}</span>
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

      {/* Company GPS Location Modal */}
      {activeCompany && (
        <CompanyLocationEditModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          company={activeCompany}
        />
      )}
    </header>
  );
};
