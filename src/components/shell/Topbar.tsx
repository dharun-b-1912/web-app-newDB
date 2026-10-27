import React, { useState, useEffect } from 'react';
import { Search, MapPin, Shield, Globe, ShieldCheck, ArrowRightLeft, Building2, Server } from 'lucide-react';
import { CompanySelector } from './CompanySelector';
import { VendorCompanyConnectionSelector } from './VendorCompanyConnectionSelector';
import { UserMenu } from './UserMenu';
import { NotificationsCenter } from './NotificationsCenter';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../hooks/useAuth';
import { CompanyLocationEditModal } from './CompanyLocationEditModal';
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
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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
        shortBadgeLabel: 'Platform Admin',
        searchPlaceholder: 'Search platform & accounts...',
        copilotLabel: 'Joy PeopleHR Copilot',
      };
    }

    if (isVendorPortal) {
      return {
        type: 'VENDOR' as const,
        badgeLabel: 'Vendor Partner · External',
        shortBadgeLabel: 'Vendor Partner',
        searchPlaceholder: 'Search orders & workforce...',
        copilotLabel: 'Vendor Desk Copilot',
      };
    }

    // Tenant / Organization Workspace - Adaptive by Account Role
    let badgeLabel: string = `${primaryRole} (${roleProfile?.defaultScope || 'Company'})`;
    let shortBadgeLabel: string = String(primaryRole);
    let searchPlaceholder = 'Search employees...';
    let copilotLabel = 'HR Copilot';

    switch (primaryRole as string) {
      case 'Company Admin':
      case 'Organization Admin':
        badgeLabel = 'Organization Admin · Tenant HQ';
        shortBadgeLabel = 'Admin HQ';
        searchPlaceholder = 'Search company & settings...';
        copilotLabel = 'Admin Copilot';
        break;
      case 'HR Head':
      case 'HR Admin':
        badgeLabel = 'People Operations · HR Desk';
        shortBadgeLabel = 'HR Desk';
        searchPlaceholder = 'Search employees & records...';
        copilotLabel = 'HR Copilot';
        break;
      case 'Payroll Admin':
      case 'Finance':
        badgeLabel = 'Payroll & Compliance';
        shortBadgeLabel = 'Payroll';
        searchPlaceholder = 'Search payroll & payslips...';
        copilotLabel = 'Payroll Copilot';
        break;
      case 'Compliance Admin':
        badgeLabel = 'Statutory & Compliance';
        shortBadgeLabel = 'Compliance';
        searchPlaceholder = 'Search compliance & audits...';
        copilotLabel = 'Compliance Copilot';
        break;
      case 'Recruiter':
        badgeLabel = 'Talent Acquisition Desk';
        shortBadgeLabel = 'Recruiting';
        searchPlaceholder = 'Search candidates & jobs...';
        copilotLabel = 'Recruiter Copilot';
        break;
      case 'Manager':
      case 'Team Lead':
        badgeLabel = `${primaryRole} · Team Scope`;
        shortBadgeLabel = primaryRole;
        searchPlaceholder = 'Search team & approvals...';
        copilotLabel = 'Manager Copilot';
        break;
      case 'Employee':
        badgeLabel = 'Employee Self-Service (ESS)';
        shortBadgeLabel = 'My ESS';
        searchPlaceholder = 'Search leaves & payslips...';
        copilotLabel = 'My Assistant';
        break;
    }

    return {
      type: 'TENANT' as const,
      badgeLabel,
      shortBadgeLabel,
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
            <div className="flex items-center gap-1.5 px-3 h-10 bg-[#07563D] text-white rounded-xl font-bold text-xs shadow-xs shrink-0">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Platform Control Plane</span>
            </div>

            {/* Platform Role Pill */}
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 h-10 bg-slate-900 text-white rounded-xl border border-slate-700 text-xs font-bold shrink-0">
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
              className="hidden lg:flex items-center gap-1.5 px-3 h-10 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs font-semibold text-[#07563D] whitespace-nowrap shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate max-w-[180px]">Site: {activeVendorSite}</span>
            </div>

            {/* Vendor Scope Badge */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-slate-900 text-white border-slate-700 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>{accountContext.badgeLabel}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 shrink-0">
            <CompanySelector onOpenLocationEdit={() => setIsLocationModalOpen(true)} />

            {/* Adaptive Role & Account Scope Indicator Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 h-10 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 bg-emerald-50/80 text-[#07563D] border-emerald-200/70 shadow-2xs">
              <Shield className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span className="hidden 2xl:inline">{accountContext.badgeLabel}</span>
              <span className="2xl:hidden">{accountContext.shortBadgeLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Global Search Bar (Protected minimum width so it never squishes) */}
      <div className="flex-1 min-w-[200px] max-w-lg mx-2 sm:mx-4 hidden sm:block">
        <button
          onClick={onOpenSearch}
          className="w-full h-10 bg-gray-50/90 hover:bg-gray-100/90 border border-gray-200/90 rounded-xl px-3.5 flex items-center justify-between text-xs text-gray-400 transition-colors cursor-pointer group shrink-0"
        >
          <span className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <Search className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors shrink-0" />
            <span className="truncate whitespace-nowrap text-xs text-gray-500 group-hover:text-gray-800 font-medium text-left block">
              {accountContext.searchPlaceholder}
            </span>
          </span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-white rounded-md border border-gray-200 shadow-2xs shrink-0 font-mono">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Area: Search (mobile), Environment badge, AI Assistant, Diagnostics, Notifications, User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Unified Adaptive Environment Badge */}
        <div
          title={envInfo.serverTooltip}
          className={`hidden md:flex items-center gap-1 px-2 h-7.5 rounded-lg border text-[10.5px] font-bold shrink-0 transition-all shadow-2xs cursor-default ${envInfo.envBadgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${envInfo.dotColorClass}`} />
          <span className="font-extrabold uppercase tracking-wide">
            {envInfo.isLocalDev ? 'DEV' : envInfo.envBadgeLabel}
          </span>
          <span className="hidden xl:inline text-[9.5px] font-semibold opacity-85 border-l border-current/25 pl-1 font-mono">
            {envInfo.isLocalDev ? (envInfo.port ? `:${envInfo.port}` : ':3000') : 'ap-south-1'}
          </span>
        </div>
        {/* Search trigger for mobile viewport */}
        <button
          onClick={onOpenSearch}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors sm:hidden cursor-pointer shrink-0"
          title="Search (Ctrl + K)"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Unified Approvals & Notifications */}
        <NotificationsCenter />

        {/* User Account Menu */}
        <UserMenu />
      </div>

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
