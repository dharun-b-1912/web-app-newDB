import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Shield, Globe, Terminal, ShieldCheck, ArrowRightLeft, Building2, Server } from 'lucide-react';
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
import { getAppEnvironment } from '../../utils/environment';

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

  // Runtime Environment Resolution
  const envInfo = getAppEnvironment();

  const isPlatformAdminRole = [
    'Super Admin',
    'Platform Admin',
    'Assistant Admin',
    'Billing Admin',
    'Security Officer',
  ].includes(primaryRole);

  const isPlatformControlPlane =
    isPlatformAdminRole ||
    Boolean((user as any)?.is_platform_admin) ||
    Boolean(currentNav && currentNav.startsWith('platform')) ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/platform'));

  // Adaptive Account Type & Context Resolver
  const getAccountContext = () => {
    if (isPlatformControlPlane) {
      const pRole = (user as any)?.platform_role
        ? String((user as any).platform_role).replace(/_/g, ' ')
        : (primaryRole === 'Super Admin' ? 'Platform Super Admin' : primaryRole);

      return {
        type: 'PLATFORM' as const,
        badgeLabel: pRole,
        searchPlaceholder: 'Search organizations, subscriptions, invoices, audit events (Ctrl + K)...',
        copilotLabel: 'Joy PeopleHR Copilot',
      };
    }

    if (isVendorPortal) {
      return {
        type: 'VENDOR' as const,
        badgeLabel: 'Vendor Partner · External',
        searchPlaceholder: 'Search purchase orders, workforce roster, compliance vault (Ctrl + K)...',
        copilotLabel: 'Vendor Desk Copilot',
      };
    }

    // Tenant / Organization Workspace - Adaptive by Account Role
    let badgeLabel = `${primaryRole} (${roleProfile?.defaultScope || 'Company'})`;
    let searchPlaceholder = 'Search employees, departments, reports...';
    let copilotLabel = 'HR Copilot';

    switch (primaryRole as string) {
      case 'Company Admin':
      case 'Organization Admin':
        badgeLabel = 'Organization Admin · Tenant HQ';
        searchPlaceholder = 'Search employees, company settings, policies (Ctrl + K)...';
        copilotLabel = 'Admin Copilot';
        break;
      case 'HR Head':
      case 'HR Admin':
        badgeLabel = 'People Operations · HR Desk';
        searchPlaceholder = 'Search employees, leave requests, attendance (Ctrl + K)...';
        copilotLabel = 'HR Copilot';
        break;
      case 'Payroll Admin':
      case 'Finance':
        badgeLabel = 'Payroll & Compliance';
        searchPlaceholder = 'Search payroll runs, tax sheets, payslips (Ctrl + K)...';
        copilotLabel = 'Payroll Copilot';
        break;
      case 'Compliance Admin':
        badgeLabel = 'Statutory & Compliance';
        searchPlaceholder = 'Search compliance audit, PF/ESI, safety logs (Ctrl + K)...';
        copilotLabel = 'Compliance Copilot';
        break;
      case 'Recruiter':
        badgeLabel = 'Talent Acquisition Desk';
        searchPlaceholder = 'Search candidates, job requisitions, interviews (Ctrl + K)...';
        copilotLabel = 'Recruiter Copilot';
        break;
      case 'Manager':
      case 'Team Lead':
        badgeLabel = `${primaryRole} · Team Scope`;
        searchPlaceholder = 'Search team members, approvals, shifts (Ctrl + K)...';
        copilotLabel = 'Manager Copilot';
        break;
      case 'Employee':
        badgeLabel = 'Employee Self-Service (ESS)';
        searchPlaceholder = 'Search payslips, leaves, requests, directory (Ctrl + K)...';
        copilotLabel = 'My Assistant';
        break;
    }

    return {
      type: 'TENANT' as const,
      badgeLabel,
      searchPlaceholder,
      copilotLabel,
    };
  };

  const accountContext = getAccountContext();

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 gap-2 sm:gap-3">
      {/* Left Area: Adaptive by Account Type */}
      <div className="flex items-center gap-2 shrink-0">
        {accountContext.type === 'PLATFORM' ? (
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary Platform Control Plane Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#07563D] text-white rounded-xl font-bold text-xs shadow-xs shrink-0">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Platform Control Plane</span>
            </div>

            {/* Platform Role Pill (shown on wide 2xl screens to preserve search bar room) */}
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-xl border border-slate-700 text-xs font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{accountContext.badgeLabel}</span>
            </div>
          </div>
        ) : accountContext.type === 'VENDOR' ? (
          <div className="flex items-center gap-2 shrink-0">
            {/* Dedicated Vendor Organization Identity & Connected Client Selector */}
            <VendorCompanyConnectionSelector />

            {/* Assigned Deployed Site Pill */}
            <div
              title="Assigned Client Deployment Location for Contracted Workforce"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs font-semibold text-[#07563D] whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Site: {activeVendorSite}</span>
            </div>

            {/* Vendor Scope Badge */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-slate-900 text-white border-slate-700 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{accountContext.badgeLabel}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <CompanySelector />

            {activeCompany && (
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                title="Click to view or edit company live GPS location"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50/80 rounded-xl border border-gray-200/60 hover:border-emerald-300 text-xs font-semibold text-gray-700 hover:text-[#07563D] whitespace-nowrap shrink-0 transition-colors cursor-pointer group"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700 group-hover:scale-110 transition-transform shrink-0" />
                <span>{activeCompany.city || 'Coimbatore'}, {activeCompany.country || 'India'}</span>
              </button>
            )}

            {/* Adaptive Role & Account Scope Indicator Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-emerald-50 text-[#07563D] border-emerald-200/60">
              <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span>{accountContext.badgeLabel}</span>
            </div>
          </div>
        )}

        {/* Unified Adaptive Environment Badge (Combines Environment + Port/Region cleanly) */}
        <div
          title={envInfo.serverTooltip}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold shrink-0 transition-all shadow-2xs cursor-default ${envInfo.envBadgeClass}`}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${envInfo.dotColorClass}`} />
          <span className="font-extrabold uppercase tracking-wide">{envInfo.envBadgeLabel}</span>
          <span className="hidden sm:inline text-[10px] font-semibold opacity-85 border-l border-current/25 pl-1.5 font-mono">
            {envInfo.isLocalDev ? (envInfo.port ? `:${envInfo.port}` : ':3000') : 'ap-south-1'}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar (Protected minimum width so it never squishes) */}
      <div className="flex-1 min-w-[180px] max-w-md mx-2 sm:mx-3 hidden sm:block">
        <button
          onClick={onOpenSearch}
          className="w-full bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs text-gray-400 transition-colors cursor-pointer group shrink-0"
        >
          <span className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
            <span className="truncate whitespace-nowrap text-xs text-gray-400 group-hover:text-gray-600 font-medium text-left block">
              {accountContext.searchPlaceholder}
            </span>
          </span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-gray-400 bg-white rounded-md border border-gray-200 shadow-2xs shrink-0 font-mono">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Area: Search (mobile), AI Assistant, Diagnostics, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Search trigger for mobile viewport */}
        <button
          onClick={onOpenSearch}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors sm:hidden cursor-pointer shrink-0"
          title="Search (Ctrl + K)"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* AI Assistant Quick Trigger */}
        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title={accountContext.copilotLabel}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden xl:inline">{accountContext.copilotLabel}</span>
            <span className="xl:hidden">Copilot</span>
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
