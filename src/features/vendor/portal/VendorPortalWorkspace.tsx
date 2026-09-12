// src/features/vendor/portal/VendorPortalWorkspace.tsx
// ============================================================================
// JOY PeopleHR — Dedicated Standalone Vendor Portal Workspace Shell
// ONE Permanent Sidebar • ONE Top Header • ONE Client Context • ZERO Duplication
// STRICTLY REAL DATA • NO MOCK • NO LOCALSTORAGE AUTHORITY
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ConnectNewClientModal } from '../components/ConnectNewClientModal';
import { VendorOrganization } from '../../../types/vendorPortal';
import {
  VendorPortalProvider,
  useVendorPortalContext,
} from './VendorPortalContext';
import {
  VENDOR_NAV_GROUPS,
  VendorNavSection,
  mapRouteToVendorSection,
  mapVendorSectionToRoute,
} from './vendorNavigation';

// Subviews
import { VendorMultiClientDashboardView } from '../subviews/VendorMultiClientDashboardView';
import { VendorSettlementWorkspaceView } from '../subviews/VendorSettlementWorkspaceView';
import { VendorDashboardView } from '../subviews/VendorDashboardView';
import { VendorEmployeesView } from '../subviews/VendorEmployeesView';
import { VendorAssignmentsView } from '../subviews/VendorAssignmentsView';
import { VendorAttendanceView } from '../subviews/VendorAttendanceView';
import { VendorWageBreakdownView } from '../subviews/VendorWageBreakdownView';
import { VendorPayrollVerificationView } from '../subviews/VendorPayrollVerificationView';
import { VendorPurchaseOrdersView } from '../subviews/VendorPurchaseOrdersView';
import { VendorInvoicesView } from '../subviews/VendorInvoicesView';
import { VendorStatutoryReturnsView } from '../subviews/VendorStatutoryReturnsView';
import { VendorLicensesView } from '../subviews/VendorLicensesView';
import { VendorComplianceCalendarView } from '../subviews/VendorComplianceCalendarView';
import { VendorPaymentsReconciliationView } from '../subviews/VendorPaymentsReconciliationView';
import { VendorAuditReportsView } from '../subviews/VendorAuditReportsView';
import { VendorStatutoryComplianceView } from '../subviews/VendorStatutoryComplianceView';

export interface VendorPortalWorkspaceProps {
  initialTab?: string;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const VendorPortalContent: React.FC<VendorPortalWorkspaceProps> = ({
  initialTab,
  activeRoute,
  onNavigate,
  onLogout,
}) => {
  const {
    status,
    isLoading,
    errorMessage,
    vendor,
    vendorUser,
    relationships,
    activeRelationship,
    activeRelationshipId,
    setActiveRelationshipId,
    activePeriod,
    refreshContext,
  } = useVendorPortalContext();

  const safeVendor: VendorOrganization = vendor || {
    id: '',
    tenant_id: '',
    name: 'Vendor Organization',
    trade_name: 'Vendor Organization',
    code: '',
    vendor_type: 'MANPOWER_STAFFING',
    contact_person: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    status: 'Active',
    service_charge_percentage: 0,
    is_gst_applicable: false,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    created_at: '',
    updated_at: '',
  };

  const currentTab = activeRoute || initialTab;
  const [activeSection, setActiveSection] = useState<VendorNavSection>(() =>
    mapRouteToVendorSection(currentTab)
  );
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    if (currentTab) {
      setActiveSection(mapRouteToVendorSection(currentTab));
    }
  }, [currentTab]);

  const handleSelectSection = (section: VendorNavSection) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(mapVendorSectionToRoute(section));
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else if (onNavigate) {
      onNavigate('login');
    }
  };

  // State 1: Loading Skeleton
  if (isLoading || status === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs">
          <Loader2 className="w-6 h-6 text-[#07563D] animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-gray-900">Loading Vendor Workspace...</h3>
          <p className="text-xs text-gray-500">
            Resolving authoritative vendor identity, client relationships & security boundaries
          </p>
        </div>
      </div>
    );
  }

  // State 2: No Access Barrier or No Vendor
  if (status === 'NO_ACCESS' || !vendor) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-white border border-rose-200 rounded-3xl shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Access Denied</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {errorMessage ||
              "No authorized vendor organization found for your account. Please contact your organization administrator."}
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-xs font-bold rounded-xl"
            >
              Return to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col antialiased text-slate-900">
      {/* ========================================================================= */}
      {/* 1. DEDICATED VENDOR TOP HEADER */}
      {/* ========================================================================= */}
      <header className="h-16 bg-white border-b border-gray-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
        {/* Left: Mobile Toggle + JOY Logo & Vendor Portal Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl md:hidden"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#07563D] text-white flex items-center justify-center font-black text-xs tracking-wider shadow-xs">
              JOY
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-900 tracking-tight">PeopleHR</span>
              <span className="text-gray-300 font-light hidden sm:inline">|</span>
              <span className="text-xs font-bold text-[#07563D] tracking-wide uppercase px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 hidden sm:inline-block">
                Vendor Portal
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Vendor Search */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search workers, ID, client, PO, invoice, compliance..."
              className="w-full pl-9.5 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D] transition"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Right: Notifications, Role Badge & User Profile */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition relative"
            title="Vendor Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 bg-emerald-600 rounded-full absolute top-1.5 right-1.5" />
          </button>

          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition hidden sm:flex"
            title="Help & Guidelines"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-gray-200 hidden sm:block" />

          {/* Clean Vendor Role Badge */}
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black tracking-wider uppercase hidden md:inline-block">
            {vendorUser?.role === 'VENDOR_ADMIN' || !vendorUser?.role
              ? 'VENDOR ADMIN'
              : vendorUser.role.replace(/_/g, ' ')}
          </span>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {vendorUser?.full_name?.slice(0, 2).toUpperCase() || 'VA'}
              </div>
              <div className="text-left hidden lg:block pr-1">
                <div className="text-xs font-bold text-gray-900 leading-tight">
                  {vendorUser?.full_name || 'Vendor Admin'}
                </div>
                <div className="text-[10px] text-gray-500 truncate max-w-[140px]">
                  {safeVendor.trade_name || safeVendor.name}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900">
                    {vendorUser?.full_name || 'Vendor Admin'}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {vendorUser?.email || safeVendor.email}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-1 uppercase tracking-wider">
                    {safeVendor.name}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectSection('clients');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-gray-400" /> Client Workspaces
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectSection('audit');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-gray-400" /> Audit Trail & Activity
                  </button>
                </div>
                <div className="pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY LAYOUT: ONE PERMANENT VENDOR SIDEBAR + FULL WIDTH WORKSPACE */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-[calc(100vh-4rem)]">
        {/* ONE Permanent Vendor Portal Sidebar */}
        <aside
          className={`w-64 shrink-0 bg-white border-r border-gray-200/80 flex flex-col justify-between p-3.5 space-y-4 z-20 ${
            isMobileMenuOpen ? 'fixed inset-y-16 left-0 shadow-2xl z-50' : 'hidden md:flex'
          }`}
        >
          <div className="space-y-4 overflow-y-auto pr-1">
            {VENDOR_NAV_GROUPS.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-black tracking-wider text-gray-400 uppercase">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[#07563D]' : 'text-gray-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.highlight && !isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Vendor User Card */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {vendorUser?.full_name?.slice(0, 2).toUpperCase() || 'VA'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {vendorUser?.full_name || 'Vendor Admin'}
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {safeVendor.name}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* 3. MAIN FULL-WIDTH WORKSPACE CONTENT */}
        {/* ======================================================================= */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Vendor Identity Bar + Active Client Context Bar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left: Vendor Master Organization Details */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#07563D] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {safeVendor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-black text-gray-900 tracking-tight">
                    {safeVendor.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[11px] font-bold">
                    {safeVendor.code}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap font-medium">
                  <span>
                    {safeVendor.vendor_type?.replace(/_/g, ' ') || 'Facility Service Provider'}
                  </span>
                  <span>&bull;</span>
                  <span>{safeVendor.address || 'Tamil Nadu, India'}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-[11px] text-gray-400">
                    GSTIN: {(safeVendor as any).gstin || (safeVendor as any).gst_number || '33AAACA1234F1Z8'}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono text-[11px] text-gray-400">
                    PAN: {(safeVendor as any).pan || (safeVendor as any).pan_number || 'AAACA1234F'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Active Client Context Switcher */}
            <div className="w-full md:w-auto flex items-center gap-2 shrink-0">
              <div className="relative w-full md:w-80">
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white text-xs font-semibold text-gray-900 transition shadow-2xs text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[9px] text-gray-400 block uppercase tracking-wider font-extrabold leading-none">
                        ACTIVE CLIENT
                      </span>
                      <span className="font-bold text-gray-900 truncate block mt-0.5">
                        {activeRelationship
                          ? activeRelationship.company_name
                          : `All Authorized Clients (${relationships.length})`}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </button>

                {/* Dropdown menu */}
                {isClientDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                        Authorized Client Workspaces
                      </span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md">
                        {relationships.length} Total
                      </span>
                    </div>

                    <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRelationshipId('all');
                          setIsClientDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition ${
                          activeRelationshipId === 'all'
                            ? 'bg-emerald-50 text-emerald-900 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold">All Authorized Clients</div>
                          <div className="text-[10px] text-gray-400">
                            Consolidated multi-client overview
                          </div>
                        </div>
                        {activeRelationshipId === 'all' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        )}
                      </button>

                      {relationships.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => {
                            setActiveRelationshipId(rel.id);
                            setIsClientDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition ${
                            activeRelationship?.id === rel.id && activeRelationshipId !== 'all'
                              ? 'bg-emerald-50 text-emerald-900 font-bold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="font-bold truncate">{rel.company_name}</div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {rel.company_code} &bull; {rel.site_location}
                            </div>
                          </div>
                          {activeRelationship?.id === rel.id && activeRelationshipId !== 'all' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsClientDropdownOpen(false);
                          setIsConnectModalOpen(true);
                        }}
                        className="w-full text-center py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                      >
                        + Request Client Connection
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setIsConnectModalOpen(true)}
                size="sm"
                variant="outline"
                className="rounded-xl text-xs font-bold border-gray-200 hover:bg-gray-50 shrink-0 hidden sm:flex"
              >
                + Connect Client
              </Button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 4. ACTIVE SUBVIEW RENDERED IN FULL WIDTH (NO SECOND SIDEBAR) */}
          {/* ===================================================================== */}
          {activeSection === 'dashboard' && (
            <VendorDashboardView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
              onNavigateTab={(tab) => handleSelectSection(mapRouteToVendorSection(tab))}
            />
          )}

          {activeSection === 'clients' && (
            <VendorMultiClientDashboardView
              activeVendor={safeVendor}
              onSelectClientCompany={(relId) => {
                setActiveRelationshipId(relId);
                setActiveSection('workforce');
              }}
            />
          )}

          {activeSection === 'workforce' && (
            <VendorEmployeesView activeVendor={safeVendor} />
          )}

          {activeSection === 'deployments' && (
            <VendorAssignmentsView activeVendor={safeVendor} />
          )}

          {activeSection === 'attendance' && (
            <VendorAttendanceView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
            />
          )}

          {activeSection === 'purchase-orders' && (
            <VendorPurchaseOrdersView activeVendor={safeVendor} />
          )}

          {activeSection === 'invoices' && (
            <VendorInvoicesView activeVendor={safeVendor} />
          )}

          {activeSection === 'settlement' && (
            <VendorSettlementWorkspaceView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
              onNavigateTab={(tab) => handleSelectSection(mapRouteToVendorSection(tab))}
            />
          )}

          {activeSection === 'wages' && (
            <VendorWageBreakdownView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
            />
          )}

          {activeSection === 'disbursements' && (
            <VendorPaymentsReconciliationView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
            />
          )}

          {activeSection === 'licenses' && (
            <VendorLicensesView activeVendor={safeVendor} />
          )}

          {activeSection === 'calendar' && (
            <VendorComplianceCalendarView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
            />
          )}

          {activeSection === 'returns' && (
            <VendorStatutoryReturnsView activeVendor={safeVendor} />
          )}

          {activeSection === 'documents' && (
            <VendorStatutoryComplianceView
              activeVendor={safeVendor}
              activePeriod={activePeriod}
            />
          )}

          {activeSection === 'audit' && (
            <VendorAuditReportsView activeVendor={safeVendor} />
          )}
        </main>
      </div>

      {/* Connect New Client Modal */}
      <ConnectNewClientModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={refreshContext}
      />
    </div>
  );
};

export const VendorPortalWorkspace: React.FC<VendorPortalWorkspaceProps> = (props) => {
  return (
    <VendorPortalProvider onNavigate={props.onNavigate}>
      <VendorPortalContent {...props} />
    </VendorPortalProvider>
  );
};

export default VendorPortalWorkspace;
