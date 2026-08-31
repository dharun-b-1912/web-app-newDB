import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TenantProvider } from './hooks/useTenant';
import { ToastProvider } from './components/ui/Toast';
import { AuthPage } from './features/auth/AuthPage';
import { SuperAdminLoginPage } from './features/auth/SuperAdminLoginPage';
import { AppShell } from './components/shell/AppShell';
import { DashboardView } from './features/dashboard/DashboardView';
import { WorkforceOverviewView } from './features/dashboard/WorkforceOverviewView';
import { ExecutiveOverviewView } from './features/dashboard/ExecutiveOverviewView';
import { PeopleView } from './features/people/PeopleView';
import { OrganizationView } from './features/organization/OrganizationView';
import { DepartmentView } from './features/organization/DepartmentView';
import { DesignationView } from './features/organization/DesignationView';
import { LocationView } from './features/organization/LocationView';
import { VendorsView } from './features/organization/VendorsView';
import { RbacView } from './features/rbac/RbacView';
import { MyWorkspaceView } from './features/workspace/MyWorkspaceView';
import { RecruitmentView } from './features/talent/RecruitmentView';
import { ComplianceView } from './features/compliance/ComplianceView';
import { DocumentManagementView } from './features/documents/DocumentManagementView';
import { OnboardingView } from './features/onboarding/OnboardingView';
import { OffboardingView } from './features/offboarding/OffboardingView';
import { AiAssistantDrawer } from './features/assistant/AiAssistantDrawer';

import { RouteGuard } from './components/auth/RouteGuard';
import { getPrimaryRole, canViewModule } from './lib/rbac/permissionEngine';

import { AssetsView } from './features/organization/AssetsView';
import { TalentManagementView } from './features/talent/TalentManagementView';
import { EmployeeRelationsView } from './features/compliance/EmployeeRelationsView';
import { HrServicesView } from './features/workspace/HrServicesView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { AutomationView } from './features/automation/AutomationView';
import { AdministrationView } from './features/admin/AdministrationView';

import { AttendanceModuleMaster } from './features/attendance/AttendanceModuleMaster';
import { WorkOvertimeMasterModule } from './features/work/WorkOvertimeMasterModule';
import { LeaveManagementModule } from './features/leave/LeaveManagementModule';
import { PayrollMasterModule } from './features/payroll/PayrollMasterModule';
import { PerformanceMasterModule } from './features/performance/PerformanceMasterModule';
import { LmsMasterModule } from './features/lms/LmsMasterModule';
import { OtherMasterModule } from './features/other/OtherMasterModule';
import { EmployeeRelationsMasterModule } from './features/er/EmployeeRelationsMasterModule';
import { AnalyticsMasterModule } from './features/analytics/AnalyticsMasterModule';
import { AdminMasterModule } from './features/admin/AdminMasterModule';
import { EssMasterModule } from './features/ess/EssMasterModule';
import { TlMasterModule } from './features/tl/TlMasterModule';
import { PlatformAdminMasterModule } from './features/platform/PlatformAdminMasterModule';
import { VendorMasterModule } from './features/vendor/VendorMasterModule';
import { MyProfileView } from './features/profile/MyProfileView';
import { RealtimeHealthView } from './features/diagnostics/RealtimeHealthView';
import { LegalCenterView } from './features/legal/LegalCenterView';
import { CompanyOnboardingWizard } from './features/onboarding/CompanyOnboardingWizard';
import { SessionExpiryModal } from './components/states/SessionExpiryModal';
import { parseRouteFromUrl, syncUrlWithRoute } from './lib/router/urlRouter';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { realtimeSyncEngine } from './services/realtimeSyncEngine';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

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
    const primaryRole = getPrimaryRole(stored);
    const isPlatformRole = (['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'] as string[]).includes(primaryRole);
    if (isPlatformRole) return 'platform-dashboard';
    if (primaryRole === 'Vendor Admin' || stored?.vendor_id || stored?.email?.toLowerCase().includes('vendor')) {
      return 'vendor-settlement-workspace';
    }
    if (primaryRole === 'Company Admin') {
      return 'executive-overview';
    }
    if (
      primaryRole === 'HR Head' ||
      primaryRole === 'HR Admin' ||
      (stored?.email && stored.email.toLowerCase().includes('hr'))
    ) {
      return 'dashboard';
    }
    if (primaryRole === 'Manager') return 'dashboard';
    if (primaryRole === 'Team Lead') return 'tl-dashboard';
    if (primaryRole === 'Employee') return 'ess-dashboard';
    return 'ess-dashboard';
  };

  // Compute the correct starting route: URL first -> localStorage saved route -> role default
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const urlState = parseRouteFromUrl();
    const stored = user || api.getCurrentUser();
    const primaryRole = getPrimaryRole(stored);
    const isPlatformRole = ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(primaryRole);

    // 0. If vendor role, ensure they are strictly on a vendor route
    if (primaryRole === 'Vendor Admin' || (stored as any)?.vendor_id || stored?.email?.toLowerCase().includes('vendor')) {
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
        r.startsWith('auth')
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
          !sr.startsWith('auth')
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
      } else if (!canViewModule(user, currentRoute)) {
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
    window.location.pathname === '/admin/login' ||
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
            <PlatformAdminMasterModule onNavigate={handleNavigate} initialTab="dashboard" />
          </AppShell>
        </ErrorBoundary>
      );
    }

    return <SuperAdminLoginPage onSwitchToCustomer={() => handleNavigate('dashboard')} />;
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
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'executive-overview':
        return <ExecutiveOverviewView onNavigate={handleNavigate} />;
      case 'workforce-overview':
        return <WorkforceOverviewView onNavigate={handleNavigate} />;
      case 'people':
        return <PeopleView />;
      case 'organization':
        return <OrganizationView />;
      case 'departments':
        return <DepartmentView />;
      case 'designations':
        return <DesignationView />;
      case 'locations':
        return <LocationView />;
      case 'vendors':
      case 'organization-vendors':
        return <VendorsView />;
      case 'assets':
        return <AssetsView />;
      case 'admin':
      case 'administration':
      case 'admin-dashboard':
      case 'admin-users':
      case 'admin-roles':
      case 'admin-permissions':
      case 'admin-workflows':
      case 'admin-approvals':
      case 'admin-notifications':
      case 'admin-audit':
      case 'admin-security':
      case 'admin-api':
      case 'admin-integrations':
      case 'admin-subscription':
      case 'admin-billing':
      case 'admin-settings':
      case 'rbac':
      case 'users':
      case 'permissions':
      case 'admin-policies':
      case 'templates':
      case 'integrations':
      case 'security':
      case 'audit-logs':
        return <AdminMasterModule initialTab={currentRoute} />;
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
      case 'documents':
        return <DocumentManagementView />;
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
      case 'payroll-inputs':
      case 'payable-days':
      case 'lop-desk':
      case 'ot-pay-inputs':
      case 'payroll-freeze':
      case 'calculation-audit':
      case 'attendance-corrections':
      case 'approval-history':
      case 'attendance-activity-logs':
      case 'calendar':
      case 'holidays':
      case 'manual':
      case 'attendance-reports':
        return (
          <AttendanceModuleMaster
            currentSubPath={currentRoute}
            onNavigateSubPath={handleNavigate}
          />
        );
      case 'work-overtime':
      case 'overtime':
      case 'overtime-requests':
      case 'wfh':
      case 'breaks-workhours':
      case 'breaks':
        return <WorkOvertimeMasterModule initialTab={currentRoute} />;
      case 'leave':
      case 'leave-dashboard':
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
      case 'leave-reports':
        return <LeaveManagementModule initialTab={currentRoute} />;
      case 'payroll':
      case 'payroll-dashboard':
      case 'client-billing':
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
      case 'requests':
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
      case 'analytics-reports':
      case 'analytics-settings':
      case 'workforce-analytics':
      case 'attendance-analytics':
      case 'payroll-analytics':
      case 'reports':
        return <AnalyticsMasterModule initialTab={currentRoute} />;
      case 'workflows':
      case 'approvals':
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
      case 'vendor-settlement':
      case 'vendor-settlement-workspace':
      case 'vendor-dashboard':
      case 'vendor-licenses':
      case 'vendor-compliance-calendar':
      case 'vendor-statutory-returns':
      case 'vendor-workforce':
      case 'vendor-employees':
      case 'vendor-assignments':
      case 'vendor-attendance':
      case 'vendor-wages':
      case 'vendor-wage-breakdown':
      case 'vendor-payroll':
      case 'vendor-payroll-verification':
      case 'vendor-payable':
      case 'vendor-purchase-orders':
      case 'vendor-po':
      case 'vendor-invoices':
      case 'vendor-invoice':
      case 'vendor-compliance':
      case 'vendor-statutory':
      case 'vendor-payslips':
      case 'vendor-payments':
      case 'vendor-reconciliation':
      case 'vendor-audit':
      case 'vendor-reports':
      case 'vendor-audit-reports':
        return <VendorMasterModule initialTab={currentRoute} onNavigateSubPath={handleNavigate} />;
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
      case 'settings':
        return <AdminMasterModule initialTab="settings" />;
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
          {renderViewContent()}
        </ErrorBoundary>
      </RouteGuard>

      <AiAssistantDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />

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
