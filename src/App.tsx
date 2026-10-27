import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { api } from './services/api';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { authService, DEFAULT_PLATFORM_SUPER_ADMIN } from './services/auth/authService';
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
import { navPerfTracker } from './services/observability/navigationPerfTracker';
import { ShieldAlert } from 'lucide-react';
import { JoySplashScreen } from './components/common/JoySplashScreen';

// Primary workspaces code-split via React.lazy for instant initial page load & 90% bundle reduction
const DashboardView = lazy(() => import('./features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const CommandCenterView = lazy(() => import('./features/dashboard/CommandCenterView').then(m => ({ default: m.CommandCenterView })));
const WorkforceWorkspace = lazy(() => import('./features/organization/WorkforceWorkspace').then(m => ({ default: m.WorkforceWorkspace })));
const OrganizationWorkspace = lazy(() => import('./features/organization/OrganizationWorkspace').then(m => ({ default: m.OrganizationWorkspace })));
const ResourcesWorkspace = lazy(() => import('./features/organization/ResourcesWorkspace').then(m => ({ default: m.ResourcesWorkspace })));
const OperationsWorkspace = lazy(() => import('./features/operations/OperationsWorkspace').then(m => ({ default: m.OperationsWorkspace })));
const AttendanceModuleMaster = lazy(() => import('./features/attendance/AttendanceModuleMaster').then(m => ({ default: m.AttendanceModuleMaster })));
const LeaveManagementModule = lazy(() => import('./features/leave/LeaveManagementModule').then(m => ({ default: m.LeaveManagementModule })));
const PayrollMasterModule = lazy(() => import('./features/payroll/PayrollMasterModule').then(m => ({ default: m.PayrollMasterModule })));

// Secondary & on-demand modules lazy-loaded
const SuperAdminLoginPage = lazy(() => import('./features/auth/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));
const WorkforceOverviewView = lazy(() => import('./features/dashboard/WorkforceOverviewView').then(m => ({ default: m.WorkforceOverviewView })));
const ExecutiveOverviewView = lazy(() => import('./features/dashboard/ExecutiveOverviewView').then(m => ({ default: m.ExecutiveOverviewView })));
const RequestsApprovalsWorkspace = lazy(() => import('./features/operations/RequestsApprovalsWorkspace').then(m => ({ default: m.RequestsApprovalsWorkspace })));
const InsightsWorkspace = lazy(() => import('./features/insights/InsightsWorkspace').then(m => ({ default: m.InsightsWorkspace })));
const AdministrationWorkspace = lazy(() => import('./features/admin/AdministrationWorkspace').then(m => ({ default: m.AdministrationWorkspace })));
const RecruitmentView = lazy(() => import('./features/talent/RecruitmentView').then(m => ({ default: m.RecruitmentView })));
const OnboardingView = lazy(() => import('./features/onboarding/OnboardingView').then(m => ({ default: m.OnboardingView })));
const OffboardingView = lazy(() => import('./features/offboarding/OffboardingView').then(m => ({ default: m.OffboardingView })));
const TalentManagementView = lazy(() => import('./features/talent/TalentManagementView').then(m => ({ default: m.TalentManagementView })));
const LmsMasterModule = lazy(() => import('./features/lms/LmsMasterModule').then(m => ({ default: m.LmsMasterModule })));
const PerformanceMasterModule = lazy(() => import('./features/performance/PerformanceMasterModule').then(m => ({ default: m.PerformanceMasterModule })));
const WorkOvertimeMasterModule = lazy(() => import('./features/work/WorkOvertimeMasterModule').then(m => ({ default: m.WorkOvertimeMasterModule })));
const OtherMasterModule = lazy(() => import('./features/other/OtherMasterModule').then(m => ({ default: m.OtherMasterModule })));
const EmployeeRelationsMasterModule = lazy(() => import('./features/er/EmployeeRelationsMasterModule').then(m => ({ default: m.EmployeeRelationsMasterModule })));
const AnalyticsMasterModule = lazy(() => import('./features/analytics/AnalyticsMasterModule').then(m => ({ default: m.AnalyticsMasterModule })));
const AdminMasterModule = lazy(() => import('./features/admin/AdminMasterModule').then(m => ({ default: m.AdminMasterModule })));
const ClientBillingMasterModule = lazy(() => import('./features/clientBilling/ClientBillingMasterModule').then(m => ({ default: m.ClientBillingMasterModule })));
const EssMasterModule = lazy(() => import('./features/ess/EssMasterModule').then(m => ({ default: m.EssMasterModule })));
const TlMasterModule = lazy(() => import('./features/tl/TlMasterModule').then(m => ({ default: m.TlMasterModule })));
const PlatformAdminMasterModule = lazy(() => import('./features/platform/PlatformAdminMasterModule').then(m => ({ default: m.PlatformAdminMasterModule })));
const MyProfileView = lazy(() => import('./features/profile/MyProfileView').then(m => ({ default: m.MyProfileView })));
const RealtimeHealthView = lazy(() => import('./features/diagnostics/RealtimeHealthView').then(m => ({ default: m.RealtimeHealthView })));
const AutomationView = lazy(() => import('./features/automation/AutomationView').then(m => ({ default: m.AutomationView })));
const ComplianceView = lazy(() => import('./features/compliance/ComplianceView').then(m => ({ default: m.ComplianceView })));
const MyWorkspaceView = lazy(() => import('./features/workspace/MyWorkspaceView').then(m => ({ default: m.MyWorkspaceView })));
const LegalCenterView = lazy(() => import('./features/legal/LegalCenterView').then(m => ({ default: m.LegalCenterView })));
const CompanyOnboardingWizard = lazy(() => import('./features/onboarding/CompanyOnboardingWizard').then(m => ({ default: m.CompanyOnboardingWizard })));
const AiAssistantDrawer = lazy(() => import('./features/assistant/AiAssistantDrawer').then(m => ({ default: m.AiAssistantDrawer })));
const AcceptInvitePage = lazy(() => import('./features/auth/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const VendorPortalWorkspace = lazy(() => import('./features/vendor/VendorPortalWorkspace').then(m => ({ default: m.VendorPortalWorkspace })));
const VendorLoginPage = lazy(() => import('./features/auth/VendorLoginPage').then(m => ({ default: m.VendorLoginPage })));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StorageAdministrationView = lazy(() => import('./features/storage/StorageAdministrationView').then(m => ({ default: m.StorageAdministrationView })));

const AppContent: React.FC = () => {
  const { user, isLoading, logout, login } = useAuth();
  const [isBootSplashFinished, setIsBootSplashFinished] = useState(true);

  // Initialize Realtime Sync Engine for live automatic data replication and purge old legacy mock remnants
  useEffect(() => {
    // One-time cleanup of old mock / test datasets from localStorage
    const PURGE_VERSION = 'wf_purge_v8_strict_zero_seed';
    if (localStorage.getItem('wf_storage_version') !== PURGE_VERSION) {
      const prefixesToPurge = [
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
        'workforce_21_workers',
        'workforceos_attendance_daily_v2',
        'workforceos_attendance_regularizations_v2',
        'workforce_attendance_inputs',
        'workforce_payroll_runs',
        'workforce_payroll_salaries',
        'workforce_payroll_canteen',
        'workforce_payroll_advances',
        'joy_redis_',
        'upstash_redis_',
        'workforce_companies',
        'workforce_departments',
        'workforce_designations',
        'workforce_branches',
        'workforce_locations',
      ];
      try {
        const allKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) allKeys.push(k);
        }
        for (const k of allKeys) {
          if (prefixesToPurge.some((p) => k === p || k.startsWith(p))) {
            localStorage.removeItem(k);
          }
        }
      } catch (_) {}
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
    if (urlState.route === 'accept-invite' || urlState.route === 'reset-password') {
      return urlState.route;
    }

    // Direct platform route requested via URL: ALWAYS respect and preserve it
    const isPlatformUrl = Boolean(
      urlState.route && (urlState.route.startsWith('platform') || urlState.route.startsWith('saas-'))
    );
    if (isPlatformUrl) {
      return urlState.route;
    }

    const stored = user || api.getCurrentUser();
    const primaryRole = getPrimaryRole(stored);
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);

    // 1. If platform role, ensure they are strictly on a platform route
    if (isPlatformRole) {
      if (urlState.route && (urlState.route.startsWith('platform') || urlState.route.startsWith('saas-'))) {
        return urlState.route;
      }
      return 'platform-dashboard';
    }

    // 2. If tenant role, ensure they are not on an auth route
    if (urlState.route) {
      const r = urlState.route.toLowerCase();
      if (
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
  const [renderSafetyTimedOut, setRenderSafetyTimedOut] = useState(false);
  const lastMountedRouteRef = useRef<string | null>(null);

  // Domain Separation & Privacy Guard: Keep joypeoplehr.com as landing page and app.joypeoplehr.com as private app workspace
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = (window.location.hostname || '').toLowerCase();
    const pathname = (window.location.pathname || '/').toLowerCase();

    const isLandingHost = hostname === 'joypeoplehr.com' || hostname === 'www.joypeoplehr.com';
    // If accessing on the public landing page domain joypeoplehr.com
    if (isLandingHost) {
      const appPaths = [
        '/admin', '/people', '/employees', '/attendance', '/payroll',
        '/vendor', '/vendors', '/dashboard', '/workforce', '/workspace',
        '/profile', '/organization', '/departments', '/designations',
        '/locations', '/documents', '/assets', '/onboarding', '/offboarding',
        '/recruitment', '/talent', '/performance', '/lms', '/client-billing',
        '/platform', '/superadmin', '/login', '/ess', '/tl', '/auth'
      ];
      const isAppRoute = appPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (isAppRoute) {
        window.location.replace(`https://app.joypeoplehr.com${window.location.pathname}${window.location.search}${window.location.hash}`);
      } else {
        window.location.replace('/launch.html');
      }
    }
  }, []);

  const isLandingDomain = typeof window !== 'undefined' &&
    (window.location.hostname.toLowerCase() === 'joypeoplehr.com' || window.location.hostname.toLowerCase() === 'www.joypeoplehr.com');

  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderSafetyTimedOut(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log(`[BOOT] router_ready: Router initialized. Current route: /${currentRoute}`);
  }, [currentRoute]);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (lastMountedRouteRef.current !== currentRoute) {
          lastMountedRouteRef.current = currentRoute;
          console.log(`[BOOT] route_mounted: Rendering module view for route /${currentRoute}`);
        }
      } else {
        console.log('[BOOT] auth_ready: Rendering authentication view');
      }
      if (typeof window !== 'undefined') {
        (window as any).__joyBootDismiss?.();
      }
    }
  }, [isLoading, user, currentRoute]);

  // Synchronize route changes to URL and localStorage (strictly skipped on public landing page domain)
  useEffect(() => {
    if (isLandingDomain) return;
    if (currentRoute) {
      syncUrlWithRoute(currentRoute, undefined, true);
      try {
        localStorage.setItem('workforce_active_route', currentRoute);
      } catch { }
    }
  }, [currentRoute, isLandingDomain]);

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
    const handleGenericNav = (e: any) => {
      const targetNav = e.detail?.nav || e.detail?.route || e.detail?.tab;
      if (targetNav) {
        const params: Record<string, string> = {};
        if (e.detail.employeeId) params.employeeId = e.detail.employeeId;
        if (e.detail.code) params.code = e.detail.code;
        if (e.detail.query) params.query = e.detail.query;
        if (e.detail.subTab) params.subTab = e.detail.subTab;
        if (e.detail.search) params.search = e.detail.search;
        handleNavigate(targetNav, Object.keys(params).length > 0 ? params : undefined);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('platform:navigate', handlePlatformNav);
    window.addEventListener('navigate', handleGenericNav);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('platform:navigate', handlePlatformNav);
      window.removeEventListener('navigate', handleGenericNav);
    };
  }, []);

  const handleNavigate = (route: string, params?: Record<string, string>, replace: boolean = false) => {
    if (!route) return;
    if (currentRoute === route && !params) {
      syncUrlWithRoute(route, undefined, true);
      return;
    }
    const t0 = performance.now();
    const prevRoute = currentRoute;
    syncUrlWithRoute(route, params, replace);
    setCurrentRoute(route);
    try {
      localStorage.setItem('workforce_active_route', route);
    } catch { }
    const elapsed = performance.now() - t0;
    navPerfTracker.logImmediate('ROUTE_REDIRECT', `/${prevRoute}`, `/${route}`, elapsed, 'user_sidebar_click');
  };

  // Auto-redirect on role/persona switch, context mismatch, or unauthorized module access
  useEffect(() => {
    if (!user) return;
    const roleName = getPrimaryRole(user);
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(roleName);

    if (isPlatformRole) {
      if (!currentRoute.startsWith('platform') && !currentRoute.startsWith('saas-')) {
        const prevRoute = currentRoute;
        setCurrentRoute('platform-dashboard');
        syncUrlWithRoute('platform-dashboard', undefined, true);
        navPerfTracker.logImmediate('ROUTE_REDIRECT', `/${prevRoute}`, '/platform-dashboard', 0, 'platform_role_guard');
      }
    } else {
      if (currentRoute.startsWith('platform') || currentRoute.startsWith('saas-')) {
        const isLocalhost = typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '0.0.0.0');

        if (isLocalhost) {
          const platUser = authService.getCurrentSessionUser('platform') || DEFAULT_PLATFORM_SUPER_ADMIN;
          if (platUser) {
            authService.saveActiveSession(platUser, 'platform');
            login(platUser);
            return;
          }
        }

        const prevRoute = currentRoute;
        const defRoute = getDefaultRouteForUser(user);
        setCurrentRoute(defRoute);
        syncUrlWithRoute(defRoute, undefined, true);
        navPerfTracker.logImmediate('ROUTE_REDIRECT', `/${prevRoute}`, `/${defRoute}`, 0, 'non_platform_role_guard');
      } else if (
        (roleName === 'Company Admin' && (currentRoute === 'ess-dashboard' || currentRoute.startsWith('ess'))) ||
        (roleName === 'HR Head' && (currentRoute === 'ess-dashboard' || currentRoute.startsWith('ess'))) ||
        !canViewModule(user, currentRoute)
      ) {
        const prevRoute = currentRoute;
        const defRoute = getDefaultRouteForUser(user);
        setCurrentRoute(defRoute);
        syncUrlWithRoute(defRoute, undefined, true);
        navPerfTracker.logImmediate('ROUTE_REDIRECT', `/${prevRoute}`, `/${defRoute}`, 0, 'permission_guard_redirect');
      }
    }
  }, [user, currentRoute]);



  if (isLandingDomain) {
    return (
      <div className="min-h-screen bg-[#F8FCFA] flex items-center justify-center">
        <JoySplashScreen onFinished={() => {}} />
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
            activeRoute="platform-dashboard"
            onNavigate={handleNavigate}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          >
            <Suspense fallback={null}>
              <PlatformAdminMasterModule onNavigateTab={handleNavigate} initialTab="platform-dashboard" />
            </Suspense>
          </AppShell>
        </ErrorBoundary>
      );
    }

    return (
      <Suspense fallback={null}>
        <SuperAdminLoginPage onSwitchToCustomer={() => handleNavigate('dashboard')} />
      </Suspense>
    );
  }


  // Dedicated Accept Invitation & Account Activation
  if (currentRoute === 'accept-invite') {
    return (
      <Suspense fallback={null}>
        <AcceptInvitePage
          onSuccessRoute={(targetRoute) => handleNavigate(targetRoute)}
          onNavigateToLogin={() => handleNavigate('login')}
        />
      </Suspense>
    );
  }

  // Dedicated Password Reset Recovery
  if (currentRoute === 'reset-password') {
    return (
      <Suspense fallback={null}>
        <ResetPasswordPage
          onNavigateToLogin={() => handleNavigate('login')}
        />
      </Suspense>
    );
  }

  // Dedicated External Vendor Login Screen
  const isVendorLoginRoute =
    currentRoute === 'vendor-login' ||
    (typeof window !== 'undefined' && (
      window.location.pathname === '/vendor-login' ||
      window.location.pathname === '/vendor/login'
    ));

  if (isVendorLoginRoute && !user) {
    return (
      <Suspense fallback={null}>
        <VendorLoginPage
          onNavigateToCompanyLogin={() => handleNavigate('login')}
          onSuccessRoute={(targetRoute) => handleNavigate(targetRoute)}
        />
      </Suspense>
    );
  }

  // Account Suspension Barrier (Zero-Trust Enforcement)
  if (user && (user.status === 'Suspended' || String(user.status).toUpperCase() === 'SUSPENDED' || user.account_status === 'SUSPENDED')) {
    return (
      <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Account Suspended</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Joy PeopleHR organization access has been suspended by an administrator.
            Please contact your organization administrator or HR operations for assistance.
          </p>
          <div className="pt-2">
            <button
              onClick={() => logout()}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !renderSafetyTimedOut) {
    return null;
  }

  if (!user) {
    return (
      <AuthPage
        onNavigateToSuperAdmin={() => handleNavigate('superadmin-login')}
        onSuccessRoute={(targetRoute) => handleNavigate(targetRoute)}
      />
    );
  }

  const renderViewContent = () => {
    switch (currentRoute) {
      case 'command-center':
        return <CommandCenterView onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'executive-overview':
        return <ExecutiveOverviewView onNavigate={handleNavigate} />;
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
        return <ResourcesWorkspace initialTab="documents" onNavigate={handleNavigate} />;
      case 'documents':
        return <ResourcesWorkspace initialTab="documents" onNavigate={handleNavigate} />;
      case 'assets':
        return <ResourcesWorkspace initialTab="assets" onNavigate={handleNavigate} />;
      case 'operations':
      case 'operations-workspace':
        return <OperationsWorkspace initialTab="attendance" onNavigate={handleNavigate} />;
      case 'leave':
      case 'leave-dashboard':
      case 'leave-balances':
      case 'leave-ledger':
      case 'leave-balance':
      case 'leave-requests':
      case 'leave-approvals':
      case 'leave-calendar':
      case 'leave-compoff':
      case 'leave-adjustments':
      case 'leave-exceptions':
      case 'leave-types':
      case 'leave-policies':
      case 'leave-accrual':
      case 'leave-holidays':
      case 'leave-encashment':
      case 'leave-reports':
        return <LeaveManagementModule initialTab={currentRoute} />;
      case 'approvals':
      case 'requests':
        return <OperationsWorkspace initialTab="approvals" onNavigate={handleNavigate} />;
      case 'admin-approvals':
        return <RequestsApprovalsWorkspace initialTab="policies" />;
      case 'insights':
        return <InsightsWorkspace initialTab="workforce" onNavigate={handleNavigate} />;
      case 'workforce-overview':
        return <WorkforceOverviewView onNavigate={handleNavigate} />;
      case 'analytics-reports':
        return <InsightsWorkspace initialTab="reports" onNavigate={handleNavigate} />;
      case 'admin':
      case 'administration':
      case 'admin-dashboard':
        return <AdministrationWorkspace initialTab="access" initialSubTab="users" onNavigate={handleNavigate} />;
      case 'admin-access':
      case 'admin-users':
      case 'users':
        return <AdministrationWorkspace initialTab="access" initialSubTab="users" onNavigate={handleNavigate} />;
      case 'admin-roles':
      case 'rbac':
      case 'roles':
        return <AdministrationWorkspace initialTab="access" initialSubTab="roles" onNavigate={handleNavigate} />;
      case 'admin-permissions':
      case 'permissions':
        return <AdministrationWorkspace initialTab="access" initialSubTab="permissions" onNavigate={handleNavigate} />;
      case 'admin-notifications':
      case 'notifications':
      case 'notification-settings':
      case 'notifications-settings':
        return <AdministrationWorkspace initialTab="settings" initialSubTab="notifications" onNavigate={handleNavigate} />;
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
      case 'admin-billing':
        return <AdministrationWorkspace initialTab="settings" initialSubTab="billing" onNavigate={handleNavigate} />;
      case 'admin-subscription':
        return <AdministrationWorkspace initialTab="settings" initialSubTab="subscription" onNavigate={handleNavigate} />;
      case 'admin-settings':
      case 'settings':
        return <AdministrationWorkspace initialTab="settings" initialSubTab="general" onNavigate={handleNavigate} />;
      case 'recruitment':
      case 'talent-recruitment':
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
      case 'attendance/dashboard':
      case 'attendance-employees':
      case 'attendance/employees':
      case 'employee-attendance':
      case 'employees':
      case 'daily':
      case 'manual':
      case 'manual-punch':
      case 'attendance/manual':
      case 'attendance-manual':
      case 'history':
      case 'attendance-history':
      case 'attendance/history':
      case 'ledger':
      case 'attendance/ledger':
      case 'regularization':
      case 'attendance/regularization':
      case 'exceptions':
      case 'attendance/exceptions':
      case 'attendance-reports':
      case 'attendance/reports':
      case 'attendance/mis':
      case 'reports-scope':
      case 'late-early':
      case 'attendance/late-early':
      case 'shifts':
      case 'shifts/master':
      case 'roster':
      case 'shifts/roster':
      case 'shift-calendar':
      case 'shifts/calendar':
      case 'policies':
      case 'shifts/policies':
      case 'biometric':
      case 'biometric/devices':
      case 'biometric-devices':
      case 'device-enrollment':
      case 'device-sync':
      case 'punch-mapping':
      case 'device-logs':
      case 'face-attendance':
      case 'biometric/face':
      case 'face-enrollment':
      case 'face-devices':
      case 'face-logs':
      case 'face-exceptions':
      case 'live-tracking':
      case 'attendance/tracking':
      case 'tracking':
      case 'shift-tracking':
      case 'gps':
      case 'biometric/gps':
      case 'gps-attendance':
      case 'geofences':
      case 'biometric/geofences':
      case 'staff-mapping':
      case 'mobile-clocking':
      case 'location-logs':
      case 'location-exceptions':
      case 'mobile-punch':
      case 'geofencing':
      case 'geofence-setup':
      case 'attendance-compliance':
      case 'attendance-rules':
      case 'biometric/rules':
      case 'biometric-rules':
      case 'rules-engine':
      case 'attendance-settings':
      case 'calculation-audit':
      case 'audit/ledger':
      case 'attendance-corrections':
      case 'audit/corrections':
      case 'approval-history':
      case 'audit/approvals':
      case 'attendance-activity-logs':
      case 'audit/activity':
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
      case 'payroll/dashboard':
      case 'payroll-salary':
      case 'payroll/salary':
      case 'payroll/salary-structures':
      case 'payroll-claims':
      case 'payroll/claims':
      case 'payroll-expenses':
      case 'payroll/expenses':
      case 'expense-desk':
      case 'claims':
      case 'payroll-processing':
      case 'payroll/runs':
      case 'payroll/processing':
      case 'payroll-runs':
      case 'payroll-earnings':
      case 'payroll/earnings':
      case 'payroll-deductions':
      case 'payroll/deductions':
      case 'payroll-statutory':
      case 'payroll/statutory':
      case 'payroll-documents':
      case 'payroll/payslips':
      case 'payroll/documents':
      case 'payroll-disbursement':
      case 'payroll/bank':
      case 'payroll/disbursement':
      case 'disbursement':
      case 'bank-disbursement':
      case 'payroll-fnf':
      case 'payroll/fnf':
      case 'payroll-reports':
      case 'payroll/reports':
      case 'payroll-settings':
      case 'payroll/settings':
        return <PayrollMasterModule initialTab={currentRoute} onNavigateTab={handleNavigate} />;
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
      case 'platform-clients':
      case 'platform-tenant-health':
      case 'platform-users':
      case 'platform-staff':
      case 'platform-roles':
      case 'platform-subscriptions':
      case 'platform-plans':
      case 'platform-pricing':
      case 'platform-entitlements':
      case 'platform-catalogue':
      case 'platform-feature-catalogue':
      case 'product-catalogue':
      case 'platform-quotations':
      case 'quotations':
      case 'saas-quotations':
      case 'platform-invoices':
      case 'saas-invoices':
      case 'platform-payments':
      case 'saas-payments':
      case 'platform-renewals':
      case 'saas-renewals':
      case 'platform-addons':
      case 'saas-addons':
      case 'platform-pricing-calculator':
      case 'pricing-calculator':
      case 'platform-tier-entitlements':
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
      case 'platform-aws-cost-analysis':
      case 'aws-cost-analysis':
        return <PlatformAdminMasterModule initialTab={currentRoute} onNavigateTab={handleNavigate} />;
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
      case 'vendors':
      case 'vendor':
      case 'vendor-hub':
      case 'vendor-portal':
      case 'vendor/portal':
      case 'vendor-dashboard':
      case 'vendor/dashboard':
      case 'vendor-portal-dashboard':
      case 'vendor-portal-pos':
      case 'vendor-portal-invoices':
      case 'vendor-portal-attendance-recon':
      case 'vendor-portal-attendance':
      case 'vendor-portal-workforce':
      case 'vendor-portal-company':
      case 'vendor-portal-compliance':
      case 'vendor-portal-leaderboard':
      case 'vendor-portal-communication':
      case 'vendor-portal-reports':
      case 'vendor-tasks':
      case 'vendor/tasks':
      case 'vendor-directory':
      case 'vendor/directory':
      case 'vendor-onboarding':
      case 'vendor/onboarding':
      case 'vendor-company':
      case 'vendor/company':
      case 'vendor-contracts':
      case 'vendor/contracts':
      case 'vendor-pos':
      case 'vendor/pos':
      case 'vendor-purchase-orders':
      case 'vendor/purchase-orders':
      case 'purchase-orders':
      case 'vendor-employee-onboarding':
      case 'vendor/employee-onboarding':
      case 'vendor-workforce':
      case 'vendor/workforce':
      case 'vendor-attendance':
      case 'vendor/attendance':
      case 'vendor-attendance-recon':
      case 'vendor/attendance-recon':
      case 'vendor-payroll':
      case 'vendor/payroll':
      case 'vendor-compliance':
      case 'vendor/compliance':
      case 'vendor-invoices':
      case 'vendor/invoices':
      case 'invoices':
      case 'vendor-assets':
      case 'vendor/assets':
      case 'vendor-wages':
      case 'vendor/wages':
      case 'vendors/wages':
      case 'vendor-billing':
      case 'vendors/billing':
      case 'wage-engine':
      case 'vendor-portal/wages':
      case 'client-billing':
      case 'client-wage-billing':
      case 'payroll/billing':
      case 'payroll-billing':
      case 'client-invoicing':
      case 'billing-runs':
      case 'billing-rules':
      case 'client-contracts':
      case 'vendor-communication':
      case 'vendor/communication':
      case 'vendor-reports':
      case 'vendor/reports':
      case 'vendor-miss-report':
      case 'vendor/miss-report':
      case 'vendor-leaderboard':
      case 'vendor/leaderboard':
      case 'vendor-audit':
      case 'vendor/audit':
      case 'vendor-storage':
      case 'vendor/storage':
      case 'vendor-vault':
      case 'vendor/vault':
      case 'vendor-documents':
      case 'vendor/documents': {
        const stored = api.getCurrentUser();
        const primaryRole = getPrimaryRole(stored);
        const isVendorUser =
          ['Vendor Admin', 'Vendor Partner', 'Vendor Owner', 'Vendor Operations Manager', 'Vendor HR Executive', 'Vendor Finance Executive', 'Vendor Viewer'].includes(primaryRole) ||
          (stored as any)?.userType === 'VENDOR' ||
          !!(stored as any)?.vendor_id;

        // Security Check: Block vendor users from accessing company-owned onboarding & master directory
        if (isVendorUser && (
          currentRoute === 'vendor-onboarding' ||
          currentRoute === 'vendor/onboarding' ||
          currentRoute === 'vendor-directory' ||
          currentRoute === 'vendor/directory'
        )) {
          return <VendorPortalWorkspace initialTab="vendor-dashboard" viewMode="VENDOR_PORTAL" onNavigate={handleNavigate} />;
        }

        const isExplicitVendorRoute =
          currentRoute === 'vendor-dashboard' ||
          currentRoute === 'vendor/dashboard' ||
          currentRoute === 'vendor-tasks';

        const effectiveViewMode = (isVendorUser || isExplicitVendorRoute) ? 'VENDOR_PORTAL' : 'COMPANY_HR';

        return <VendorPortalWorkspace initialTab={currentRoute} viewMode={effectiveViewMode} onNavigate={handleNavigate} />;
      }
      case 'storage-admin':
      case 'storage':
      case 'storage/vault':
      case 'document-vault':
      case 'vault':
        return <StorageAdministrationView />;
      default: {
        const stored = api.getCurrentUser();
        const primaryRole = getPrimaryRole(stored);
        const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);
        if (isPlatformRole) {
          return <PlatformAdminMasterModule initialTab={currentRoute} onNavigateTab={handleNavigate} />;
        }
        return <DashboardView onNavigate={handleNavigate} />;
      }
    }
  };


  return (
    <ErrorBoundary>
      <AppShell
        activeRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenCopilot={() => setIsCopilotOpen(true)}
      >
        <RouteGuard module={currentRoute} onNavigate={handleNavigate}>
          <ErrorBoundary>
            <Suspense fallback={null}>
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
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <TenantProvider>
            <AppContent />
          </TenantProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
