import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { api } from './services/api';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TenantProvider } from './hooks/useTenant';
import { ToastProvider } from './components/ui/Toast';
import { AuthPage } from './features/auth/AuthPage';
import { AppShell } from './components/shell/AppShell';
import { RouteGuard } from './components/auth/RouteGuard';
import { getPrimaryRole, canViewModule } from './lib/rbac/permissionEngine';
import { SessionExpiryModal } from './components/states/SessionExpiryModal';
import { parseRouteFromUrl, syncUrlWithRoute } from './lib/router/urlRouter';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { realtimeSyncEngine } from './services/realtimeSyncEngine';

// Lazy-loaded views for instant initial page refresh & sub-second loading
const SuperAdminLoginPage = lazy(() => import('./features/auth/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));
const DashboardView = lazy(() => import('./features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const CommandCenterView = lazy(() => import('./features/dashboard/CommandCenterView').then(m => ({ default: m.CommandCenterView })));
const WorkforceOverviewView = lazy(() => import('./features/dashboard/WorkforceOverviewView').then(m => ({ default: m.WorkforceOverviewView })));
const ExecutiveOverviewView = lazy(() => import('./features/dashboard/ExecutiveOverviewView').then(m => ({ default: m.ExecutiveOverviewView })));
const WorkforceWorkspace = lazy(() => import('./features/organization/WorkforceWorkspace').then(m => ({ default: m.WorkforceWorkspace })));
const OrganizationWorkspace = lazy(() => import('./features/organization/OrganizationWorkspace').then(m => ({ default: m.OrganizationWorkspace })));
const OperationsWorkspace = lazy(() => import('./features/operations/OperationsWorkspace').then(m => ({ default: m.OperationsWorkspace })));
const RequestsApprovalsWorkspace = lazy(() => import('./features/operations/RequestsApprovalsWorkspace').then(m => ({ default: m.RequestsApprovalsWorkspace })));
const VendorsView = lazy(() => import('./features/organization/VendorsView').then(m => ({ default: m.VendorsView })));
const Vendor360Workspace = lazy(() => import('./features/vendor/company/Vendor360Workspace').then(m => ({ default: m.Vendor360Workspace })));
const CompanyContractorAttendanceView = lazy(() => import('./features/vendor/company/CompanyContractorAttendanceView').then(m => ({ default: m.CompanyContractorAttendanceView })));
const CompanyThreeWayMatchBillingView = lazy(() => import('./features/vendor/company/CompanyThreeWayMatchBillingView').then(m => ({ default: m.CompanyThreeWayMatchBillingView })));
const CompanyComplianceRiskAuditView = lazy(() => import('./features/vendor/company/CompanyComplianceRiskAuditView').then(m => ({ default: m.CompanyComplianceRiskAuditView })));
const InsightsWorkspace = lazy(() => import('./features/insights/InsightsWorkspace').then(m => ({ default: m.InsightsWorkspace })));
const AdministrationWorkspace = lazy(() => import('./features/admin/AdministrationWorkspace').then(m => ({ default: m.AdministrationWorkspace })));
const RecruitmentView = lazy(() => import('./features/talent/RecruitmentView').then(m => ({ default: m.RecruitmentView })));
const OnboardingView = lazy(() => import('./features/onboarding/OnboardingView').then(m => ({ default: m.OnboardingView })));
const OffboardingView = lazy(() => import('./features/offboarding/OffboardingView').then(m => ({ default: m.OffboardingView })));
const TalentManagementView = lazy(() => import('./features/talent/TalentManagementView').then(m => ({ default: m.TalentManagementView })));
const LmsMasterModule = lazy(() => import('./features/lms/LmsMasterModule').then(m => ({ default: m.LmsMasterModule })));
const PerformanceMasterModule = lazy(() => import('./features/performance/PerformanceMasterModule').then(m => ({ default: m.PerformanceMasterModule })));
const AttendanceModuleMaster = lazy(() => import('./features/attendance/AttendanceModuleMaster').then(m => ({ default: m.AttendanceModuleMaster })));
const WorkOvertimeMasterModule = lazy(() => import('./features/work/WorkOvertimeMasterModule').then(m => ({ default: m.WorkOvertimeMasterModule })));
const LeaveManagementModule = lazy(() => import('./features/leave/LeaveManagementModule').then(m => ({ default: m.LeaveManagementModule })));
const PayrollMasterModule = lazy(() => import('./features/payroll/PayrollMasterModule').then(m => ({ default: m.PayrollMasterModule })));
const OtherMasterModule = lazy(() => import('./features/other/OtherMasterModule').then(m => ({ default: m.OtherMasterModule })));
const EmployeeRelationsMasterModule = lazy(() => import('./features/er/EmployeeRelationsMasterModule').then(m => ({ default: m.EmployeeRelationsMasterModule })));
const AnalyticsMasterModule = lazy(() => import('./features/analytics/AnalyticsMasterModule').then(m => ({ default: m.AnalyticsMasterModule })));
const AdminMasterModule = lazy(() => import('./features/admin/AdminMasterModule').then(m => ({ default: m.AdminMasterModule })));
const EssMasterModule = lazy(() => import('./features/ess/EssMasterModule').then(m => ({ default: m.EssMasterModule })));
const TlMasterModule = lazy(() => import('./features/tl/TlMasterModule').then(m => ({ default: m.TlMasterModule })));
const PlatformAdminMasterModule = lazy(() => import('./features/platform/PlatformAdminMasterModule').then(m => ({ default: m.PlatformAdminMasterModule })));
const VendorPortalWorkspace = lazy(() => import('./features/vendor/portal/VendorPortalWorkspace').then(m => ({ default: m.VendorPortalWorkspace })));
const MyProfileView = lazy(() => import('./features/profile/MyProfileView').then(m => ({ default: m.MyProfileView })));
const RealtimeHealthView = lazy(() => import('./features/diagnostics/RealtimeHealthView').then(m => ({ default: m.RealtimeHealthView })));
const AutomationView = lazy(() => import('./features/automation/AutomationView').then(m => ({ default: m.AutomationView })));
const ComplianceView = lazy(() => import('./features/compliance/ComplianceView').then(m => ({ default: m.ComplianceView })));
const MyWorkspaceView = lazy(() => import('./features/workspace/MyWorkspaceView').then(m => ({ default: m.MyWorkspaceView })));
const LegalCenterView = lazy(() => import('./features/legal/LegalCenterView').then(m => ({ default: m.LegalCenterView })));
const CompanyOnboardingWizard = lazy(() => import('./features/onboarding/CompanyOnboardingWizard').then(m => ({ default: m.CompanyOnboardingWizard })));
const AiAssistantDrawer = lazy(() => import('./features/assistant/AiAssistantDrawer').then(m => ({ default: m.AiAssistantDrawer })));

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

  // Initialize Realtime Sync Engine for live automatic data replication and purge old legacy mock remnants
  useEffect(() => {
    // One-time cleanup of old mock / test datasets from localStorage
    const PURGE_VERSION = 'wf_purge_v3_clean_realtime';
    if (localStorage.getItem('wf_storage_version') !== PURGE_VERSION) {
      const keysToPurge = [
        'workforce_employee_onboardings',
        'workforce_onboarding_tasks',
        'workforce_onboarding_policies',
        'workforce_onboarding_overrides',
        'workforce_vendor_docs',
        'workforce_vendor_payments',
        'workforce_vendor_assignments',
        'workforce_vendor_saved_views',
        'workforce_excel_test_data',
        'workforce_employees',
        'workforce_companies',
        'workforce_departments',
        'workforce_designations',
        'workforce_branches',
        'workforce_locations',
      ];
      keysToPurge.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) { }
      });
      localStorage.setItem('wf_storage_version', PURGE_VERSION);
    }

    realtimeSyncEngine.initialize();
    return () => realtimeSyncEngine.destroy();
  }, []);

  const getDefaultRouteForUser = (targetUser?: any) => {
    const stored = targetUser || user || api.getCurrentUser();
    if (stored?.authContext?.defaultRoute) {
      return stored.authContext.defaultRoute;
    }
    const primaryRole = getPrimaryRole(stored);
    const isPlatformRole = (['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'] as string[]).includes(primaryRole);
    if (isPlatformRole) return 'platform-dashboard';
    if (primaryRole === 'Vendor Admin' || stored?.vendor_id) {
      return 'vendor-settlement-workspace';
    }
    if (primaryRole === 'Company Admin' || primaryRole === 'Organization Admin') {
      return 'executive-overview';
    }
    if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') {
      return 'dashboard';
    }
    if (primaryRole === 'Manager') return 'dashboard';
    if (primaryRole === 'Team Lead') return 'tl-dashboard';
    if (primaryRole === 'Employee') return 'ess-dashboard';
    return 'executive-overview';
  };

  // Compute the correct starting route: URL first -> localStorage saved route -> role default
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const urlState = parseRouteFromUrl();
    const stored = user || api.getCurrentUser();
    const primaryRole = getPrimaryRole(stored);
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);

    // 0. If vendor role, ensure they are strictly on a vendor route
    if (primaryRole === 'Vendor Admin' || (stored as any)?.vendor_id) {
      if (urlState.route && (urlState.route.startsWith('vendor') || urlState.route.includes('vendor'))) {
        return urlState.route;
      }
      return 'vendor-settlement-workspace';
    }

    // 1. If platform role, ensure they are strictly on a platform route
    if (isPlatformRole) {
      if (urlState.route && (urlState.route.startsWith('platform') || urlState.route.startsWith('saas-'))) {
        return urlState.route;
      }
      return 'platform-dashboard';
    }

    // 2. If tenant role, ensure they are not on an auth or platform route
    if (urlState.route) {
      const r = urlState.route.toLowerCase();
      if (
        r.startsWith('platform') ||
        r.startsWith('saas-') ||
        r.includes('accept-invite') ||
        r.includes('reset-password') ||
        r.includes('login') ||
        r.includes('activate') ||
        r.includes('invitation') ||
        r.startsWith('auth') ||
        ((primaryRole === 'Company Admin' || primaryRole === 'HR Head') && (r.startsWith('ess') || r === 'ess-dashboard'))
      ) {
        return getDefaultRouteForUser();
      }
      return urlState.route;
    }

    // 3. Check localStorage saved active route
    try {
      const savedRoute = localStorage.getItem('workforce_active_route');
      if (savedRoute) {
        const sr = savedRoute.toLowerCase();
        if (
          !sr.startsWith('platform') &&
          !sr.startsWith('saas-') &&
          !sr.includes('accept-invite') &&
          !sr.includes('reset-password') &&
          !sr.includes('login') &&
          !sr.includes('activate') &&
          !sr.includes('invitation') &&
          !sr.startsWith('auth') &&
          !((primaryRole === 'Company Admin' || primaryRole === 'HR Head') && (sr.startsWith('ess') || sr === 'ess-dashboard'))
        ) {
          return savedRoute;
        }
      }
    } catch { }

    // 4. Fallback based on role
    return getDefaultRouteForUser();
  });
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Synchronize route changes to URL and localStorage
  useEffect(() => {
    if (currentRoute) {
      syncUrlWithRoute(currentRoute, undefined, true);
      try {
        localStorage.setItem('workforce_active_route', currentRoute);
      } catch { }
    }
  }, [currentRoute]);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const urlState = parseRouteFromUrl();
      const routeToSet = urlState.route || (e.state && e.state.route) || getDefaultRouteForUser();
      if (routeToSet) {
        setCurrentRoute(routeToSet);
        try {
          localStorage.setItem('workforce_active_route', routeToSet);
        } catch { }
      }
    };
    const handlePlatformNav = (e: any) => {
      if (e.detail?.tab) {
        handleNavigate(e.detail.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('platform:navigate', handlePlatformNav);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('platform:navigate', handlePlatformNav);
    };
  }, []);

  const handleNavigate = (route: string) => {
    if (!route) return;
    syncUrlWithRoute(route, undefined, false);
    setCurrentRoute(route);
    try {
      localStorage.setItem('workforce_active_route', route);
    } catch { }
  };

  // Auto-redirect on role/persona switch, context mismatch, or unauthorized module access
  useEffect(() => {
    if (!user) return;
    const roleName = getPrimaryRole(user);
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(roleName);

    if (isPlatformRole) {
      if (!currentRoute.startsWith('platform') && !currentRoute.startsWith('saas-')) {
        setCurrentRoute('platform-dashboard');
        syncUrlWithRoute('platform-dashboard', undefined, true);
      }
    } else {
      if (currentRoute.startsWith('platform') || currentRoute.startsWith('saas-')) {
        const defRoute = getDefaultRouteForUser(user);
        setCurrentRoute(defRoute);
        syncUrlWithRoute(defRoute, undefined, true);
      } else if (
        (roleName === 'Company Admin' && (currentRoute === 'ess-dashboard' || currentRoute.startsWith('ess'))) ||
        (roleName === 'HR Head' && (currentRoute === 'ess-dashboard' || currentRoute.startsWith('ess'))) ||
        !canViewModule(user, currentRoute)
      ) {
        const defRoute = getDefaultRouteForUser(user);
        setCurrentRoute(defRoute);
        syncUrlWithRoute(defRoute, undefined, true);
      }
    }
  }, [user, currentRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#07563D] text-white flex items-center justify-center font-black text-xl animate-pulse">
          W
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Initializing Joy PeopleHR Tenant Engine...
        </div>
      </div>
    );
  }

  const isSuperAdminRoute =
    currentRoute === 'superadmin-login' ||
    window.location.pathname === '/superadmin' ||
    window.location.pathname === '/super-admin' ||
    window.location.pathname === '/platform-login' ||
    window.location.pathname === '/platform/login';

  if (isSuperAdminRoute) {
    const roleName = user?.roles?.[0]?.name ?? '';
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(roleName);

    if (user && isPlatformRole) {
      return (
        <ErrorBoundary>
          <AppShell
            currentRoute="platform-dashboard"
            onNavigate={handleNavigate}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          >
            <Suspense fallback={<div className="flex items-center justify-center p-12 min-h-[400px]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <PlatformAdminMasterModule onNavigate={handleNavigate} initialTab="dashboard" />
            </Suspense>
          </AppShell>
        </ErrorBoundary>
      );
    }

    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-slate-900"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <SuperAdminLoginPage onSwitchToCustomer={() => handleNavigate('dashboard')} />
      </Suspense>
    );
  }


  if (!user) {
    return (
      <AuthPage
        onNavigateToSuperAdmin={() => handleNavigate('superadmin-login')}
        onSuccessRoute={(targetRoute) => handleNavigate(targetRoute)}
      />
    );
  }

  const stored = user || api.getCurrentUser();
  const primaryRole = getPrimaryRole(stored);
  const isVendorUser =
    primaryRole === 'Vendor Admin' ||
    primaryRole?.startsWith('Vendor') ||
    Boolean((stored as any)?.vendor_id);

  // Dedicated Vendor Portal: Standalone shell with ONE sidebar and ONE top header
  if (
    isVendorUser ||
    currentRoute === 'vendor-portal' ||
    currentRoute === 'vendor-workspace' ||
    (currentRoute.startsWith('vendor') &&
      currentRoute !== 'vendors' &&
      currentRoute !== 'vendor-360')
  ) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center p-12 min-h-[400px]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <VendorPortalWorkspace
            initialTab={currentRoute}
            onNavigate={handleNavigate}
            onLogout={logout}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }


  const renderViewContent = () => {
    switch (currentRoute) {
      case 'command-center':
        return <CommandCenterView onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'executive-overview':
        return <CommandCenterView onNavigate={handleNavigate} initialTab="overview" />;
      case 'workforce':
        return <WorkforceWorkspace initialTab="people" onNavigate={handleNavigate} />;
      case 'people':
        return <WorkforceWorkspace initialTab="people" onNavigate={handleNavigate} />;
      case 'organization':
        return <WorkforceWorkspace initialTab="organization" onNavigate={handleNavigate} />;
      case 'departments':
        return <OrganizationWorkspace initialTab="departments" onNavigate={handleNavigate} />;
      case 'designations':
        return <OrganizationWorkspace initialTab="designations" onNavigate={handleNavigate} />;
      case 'locations':
        return <WorkforceWorkspace initialTab="locations" onNavigate={handleNavigate} />;
      case 'resources':
      case 'documents':
      case 'assets':
        return <WorkforceWorkspace initialTab="resources" onNavigate={handleNavigate} />;
      case 'operations':
      case 'operations-workspace':
        return <OperationsWorkspace initialTab="attendance" onNavigate={handleNavigate} />;
      case 'leave':
      case 'leave-dashboard':
        return <OperationsWorkspace initialTab="leave" onNavigate={handleNavigate} />;
      case 'approvals':
      case 'requests':
        return <OperationsWorkspace initialTab="approvals" onNavigate={handleNavigate} />;
      case 'admin-approvals':
        return <RequestsApprovalsWorkspace initialTab="policies" />;
      case 'vendors':
      case 'organization-vendors':
      case 'vendor-assignments':
      case 'vendor-workforce':
      case 'vendor-employees':
        return <VendorsView onNavigate={handleNavigate} />;
      case 'vendor-360':
      case 'vendor-detail':
        return <Vendor360Workspace isOpen={true} onClose={() => handleNavigate('vendors')} />;
      case 'vendor-attendance':
        return <CompanyContractorAttendanceView onNavigate={handleNavigate} />;
      case 'manpower':
      case 'client-billing':
      case 'vendor-settlement-workspace':
      case 'vendor-settlement':
        return <CompanyThreeWayMatchBillingView onNavigate={handleNavigate} />;
      case 'insights':
      case 'workforce-overview':
        return <InsightsWorkspace initialTab="workforce" onNavigate={handleNavigate} />;
      case 'analytics-reports':
        return <InsightsWorkspace initialTab="reports" onNavigate={handleNavigate} />;
      case 'admin':
      case 'administration':
      case 'admin-dashboard':
      case 'admin-access':
      case 'admin-users':
      case 'admin-roles':
      case 'admin-permissions':
      case 'rbac':
      case 'users':
      case 'permissions':
        return <AdministrationWorkspace initialTab="access" onNavigate={handleNavigate} />;
      case 'admin-security':
      case 'security':
        return <AdministrationWorkspace initialTab="security" onNavigate={handleNavigate} />;
      case 'admin-integrations':
      case 'admin-api':
      case 'integrations':
        return <AdministrationWorkspace initialTab="integrations" onNavigate={handleNavigate} />;
      case 'admin-audit':
      case 'audit-logs':
        return <AdministrationWorkspace initialTab="audit" onNavigate={handleNavigate} />;
      case 'admin-settings':
      case 'admin-billing':
      case 'admin-subscription':
      case 'settings':
        return <AdministrationWorkspace initialTab="settings" onNavigate={handleNavigate} />;
      case 'recruitment':
      case 'recruitment-dashboard':
      case 'recruitment-requisitions':
      case 'recruitment-jobs':
      case 'recruitment-applicants':
      case 'recruitment-interviews':
      case 'recruitment-offers':
      case 'recruitment-referrals':
      case 'recruitment-talent-pool':
      case 'recruitment-analytics':
      case 'recruitment-automation':
        return <RecruitmentView initialTab={currentRoute} />;
      case 'onboarding':
        return <OnboardingView />;
      case 'offboarding':
        return <OffboardingView />;
      case 'career-dev':
      case 'compensation':
        return <TalentManagementView initialTab={currentRoute} />;
      case 'lms':
      case 'lms-dashboard':
      case 'lms-courses':
      case 'lms-programs':
      case 'lms-calendar':
      case 'lms-enrollment':
      case 'lms-trainers':
      case 'lms-assessments':
      case 'lms-certifications':
      case 'lms-mandatory':
      case 'lms-skills':
      case 'lms-feedback':
      case 'lms-reports':
      case 'lms-settings':
        return <LmsMasterModule initialTab={currentRoute} />;
      case 'performance':
      case 'performance-dashboard':
      case 'performance-goals':
      case 'performance-okr':
      case 'performance-kpi':
      case 'performance-kra':
      case 'performance-cycles':
      case 'performance-reviews':
      case 'performance-ratings':
      case 'performance-development':
      case 'performance-promotion':
      case 'performance-pip':
      case 'performance-reports':
        return <PerformanceMasterModule initialTab={currentRoute} />;
      case 'attendance':
      case 'attendance-dashboard':
      case 'attendance-employees':
      case 'employee-attendance':
      case 'employees':
      case 'daily':
      case 'history':
      case 'attendance-history':
      case 'ledger':
      case 'regularization':
      case 'exceptions':
      case 'late-early':
      case 'shifts':
      case 'roster':
      case 'shift-calendar':
      case 'policies':
      case 'biometric':
      case 'biometric-devices':
      case 'device-enrollment':
      case 'device-sync':
      case 'punch-mapping':
      case 'device-logs':
      case 'face-attendance':
      case 'face-enrollment':
      case 'face-devices':
      case 'face-logs':
      case 'face-exceptions':
      case 'gps':
      case 'gps-attendance':
      case 'geofences':
      case 'staff-mapping':
      case 'mobile-clocking':
      case 'location-logs':
      case 'location-exceptions':
      case 'mobile-punch':
      case 'geofencing':
      case 'geofence-setup':
      case 'attendance-compliance':
      case 'attendance-rules':
      case 'biometric-rules':
      case 'rules-engine':
      case 'attendance-settings':
      case 'calculation-audit':
      case 'attendance-corrections':
      case 'approval-history':
      case 'attendance-activity-logs':
        return (
          <ErrorBoundary>
            <AttendanceModuleMaster currentSubPath={currentRoute} onNavigateSubPath={handleNavigate} />
          </ErrorBoundary>
        );
      case 'work-overtime':
      case 'overtime':
      case 'overtime-requests':
      case 'wfh':
      case 'breaks-workhours':
      case 'breaks':
        return <WorkOvertimeMasterModule initialTab={currentRoute} />;
      case 'leave-types':
      case 'leave-policies':
      case 'leave-calendar':
      case 'leave-balance':
      case 'leave-requests':
      case 'leave-approval':
      case 'leave-holidays':
      case 'leave-compoff':
      case 'leave-encashment':
      case 'leave-adjustments':
      case 'leave-accrual':
      case 'leave-exceptions':
        return <LeaveManagementModule initialTab={currentRoute} />;
      case 'payroll':
      case 'payroll-dashboard':
      case 'client-invoicing':
      case 'billing-runs':
      case 'billing-rules':
      case 'client-contracts':
      case 'payroll-salary':
      case 'payroll-claims':
      case 'payroll-expenses':
      case 'expense-desk':
      case 'claims':
      case 'payroll-processing':
      case 'payroll-earnings':
      case 'payroll-deductions':
      case 'payroll-statutory':
      case 'payroll-documents':
      case 'payroll-disbursement':
      case 'disbursement':
      case 'bank-disbursement':
      case 'payroll-fnf':
      case 'payroll-reports':
      case 'payroll-settings':
        return <PayrollMasterModule initialTab={currentRoute} />;
      case 'other':
      case 'other-dashboard':
      case 'other-travel':
      case 'travel':
        return <OtherMasterModule initialTab={currentRoute} />;
      case 'other-posh':
      case 'other-grievances':
      case 'other-engagement':
      case 'other-helpdesk':
      case 'other-communication':
      case 'posh':
      case 'posh-committee':
      case 'grievance':
      case 'grievances':
      case 'grievance-desk':
      case 'discipline':
      case 'disciplinary':
      case 'disciplinary-actions':
      case 'engagement':
      case 'surveys':
      case 'engagement-surveys':
      case 'compliance':
      case 'statutory-compliance':
      case 'communication':
      case 'communications':
      case 'hr-communications':
      case 'helpdesk':
      case 'help-desk':
      case 'knowledge':
      case 'knowledge-centre':
        return <EmployeeRelationsMasterModule initialTab={currentRoute} />;
      case 'analytics':
      case 'analytics-overview':
      case 'analytics-hr':
      case 'analytics-ceo':
      case 'analytics-finance':
      case 'analytics-recruitment':
      case 'analytics-attendance':
      case 'analytics-leave':
      case 'analytics-payroll':
      case 'analytics-performance':
      case 'analytics-training':
      case 'analytics-attrition':
      case 'analytics-workforce':
      case 'analytics-employee':
      case 'analytics-org':
      case 'analytics-cost':
      case 'analytics-settings':
      case 'workforce-analytics':
      case 'attendance-analytics':
      case 'payroll-analytics':
      case 'reports':
        return <AnalyticsMasterModule initialTab={currentRoute} />;
      case 'workflows':
      case 'notifications':
      case 'scheduled-jobs':
        return <AutomationView initialTab={currentRoute} />;
      case 'compliance-docs':
        return <ComplianceView />;
      case 'workspace':
      case 'my-workspace':
        return <MyWorkspaceView onNavigate={handleNavigate} />;
      case 'ess':
      case 'ess-dashboard':
      case 'ess-attendance':
      case 'ess-leave':
      case 'ess-payroll':
      case 'ess-requests':
      case 'ess-performance':
      case 'ess-learning':
      case 'ess-documents':
      case 'ess-communication':
      case 'ess-profile':
        return <EssMasterModule initialTab={currentRoute} />;
      case 'tl':
      case 'supervisor':
      case 'tl-dashboard':
      case 'tl-my-team':
      case 'tl-attendance':
      case 'tl-leave':
      case 'tl-approvals':
      case 'tl-tasks':
      case 'tl-performance':
      case 'tl-training':
      case 'tl-communication':
      case 'tl-reports':
        return <TlMasterModule initialTab={currentRoute} />;
      case 'platform':
      case 'platform-dashboard':
      case 'platform-tenants':
      case 'platform-organizations':
      case 'platform-provisioning':
      case 'platform-tenant-health':
      case 'platform-users':
      case 'platform-staff':
      case 'platform-roles':
      case 'platform-subscriptions':
      case 'platform-plans':
      case 'platform-billing':
      case 'platform-usage':
      case 'platform-features':
      case 'platform-flags':
      case 'platform-marketplace':
      case 'platform-api':
      case 'platform-keys':
      case 'platform-webhooks':
      case 'platform-security':
      case 'platform-sessions':
      case 'platform-operations':
      case 'platform-jobs':
      case 'platform-incidents':
      case 'platform-support':
      case 'platform-audit':
      case 'platform-notifications':
      case 'platform-dlq':
      case 'platform-events':
      case 'platform-outbox':
      case 'platform-exports':
      case 'platform-announcements':
      case 'platform-settings':
      case 'platform-account':
      case 'platform-profile':
      case 'platform-account-profile':
      case 'platform-account-security':
      case 'platform-account-sessions':
      case 'platform-account-access':
      case 'platform-account-preferences':
      case 'saas-revenue':
      case 'saas-customers':
      case 'saas-subscriptions':
      case 'saas-churn':
      case 'saas-trials':
      case 'saas-renewals':
      case 'saas-coupons':
      case 'saas-partners':
        return <PlatformAdminMasterModule initialTab={currentRoute} onNavigateTab={handleNavigate} />;
      case 'vendor':
      case 'vendor-portal':
      case 'vendor-dashboard':
      case 'vendor-licenses':
      case 'vendor-compliance-calendar':
      case 'vendor-statutory-returns':
      case 'vendor-compliance':
      case 'vendor-audit':
      case 'vendor-reports':
      case 'vendor-audit-reports':
        return <CompanyComplianceRiskAuditView onNavigate={handleNavigate} />;
      case 'vendor-wages':
      case 'vendor-wage-breakdown':
      case 'vendor-payroll':
      case 'vendor-payroll-verification':
      case 'vendor-payable':
      case 'vendor-purchase-orders':
      case 'vendor-po':
      case 'vendor-invoices':
      case 'vendor-invoice':
      case 'vendor-statutory':
      case 'vendor-payslips':
      case 'vendor-payments':
      case 'vendor-reconciliation':
        return <CompanyThreeWayMatchBillingView onNavigate={handleNavigate} />;
      case 'my-profile':
      case 'profile':
        return <MyProfileView />;
      case 'realtime-health':
      case 'admin-realtime-health':
        return <RealtimeHealthView />;
      case 'company-onboarding':
      case 'tenant-onboarding':
        return <CompanyOnboardingWizard onFinish={() => handleNavigate('dashboard')} onSkip={() => handleNavigate('dashboard')} />;
      case 'legal':
      case 'trust-legal':
      case 'legal-center':
      case 'privacy-policy':
      case 'terms-of-service':
      case 'dpa':
      case 'security-center':
        return <LegalCenterView />;
      default: {
        const stored = api.getCurrentUser();
        const primaryRole = getPrimaryRole(stored);
        const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);
        if (isPlatformRole) {
          return <PlatformAdminMasterModule initialTab="platform-dashboard" onNavigateTab={handleNavigate} />;
        }
        return <DashboardView onNavigate={handleNavigate} />;
      }
    }
  };


  return (
    <AppShell
      activeRoute={currentRoute}
      onNavigate={handleNavigate}
      onOpenCopilot={() => setIsCopilotOpen(true)}
    >
      <RouteGuard module={currentRoute} onNavigate={handleNavigate}>
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-16 min-h-[450px] space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-gray-500">Loading module...</p>
            </div>
          }>
            {renderViewContent()}
          </Suspense>
        </ErrorBoundary>
      </RouteGuard>

      <Suspense fallback={null}>
        <AiAssistantDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
      </Suspense>

      <SessionExpiryModal
        isOpen={isSessionModalOpen}
        isExpired={isSessionExpired}
        secondsRemaining={120}
        onStaySignedIn={() => setIsSessionModalOpen(false)}
        onReLoginSuccess={() => {
          setIsSessionModalOpen(false);
          setIsSessionExpired(false);
        }}
      />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <TenantProvider>
          <AppContent />
        </TenantProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
