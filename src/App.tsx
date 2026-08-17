import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TenantProvider } from './hooks/useTenant';
import { ToastProvider } from './components/ui/Toast';
import { AuthPage } from './features/auth/AuthPage';
import { AppShell } from './components/shell/AppShell';
import { DashboardView } from './features/dashboard/DashboardView';
import { PeopleView } from './features/people/PeopleView';
import { OrganizationView } from './features/organization/OrganizationView';
import { DepartmentView } from './features/organization/DepartmentView';
import { DesignationView } from './features/organization/DesignationView';
import { LocationView } from './features/organization/LocationView';
import { RbacView } from './features/rbac/RbacView';
import { MyWorkspaceView } from './features/workspace/MyWorkspaceView';
import { SettingsView } from './features/settings/SettingsView';
import { RecruitmentView } from './features/talent/RecruitmentView';
import { TimeAndPayView } from './features/time/TimeAndPayView';
import { ComplianceView } from './features/compliance/ComplianceView';
import { DocumentManagementView } from './features/documents/DocumentManagementView';
import { OnboardingView } from './features/onboarding/OnboardingView';
import { OffboardingView } from './features/offboarding/OffboardingView';
import { AiAssistantDrawer } from './features/assistant/AiAssistantDrawer';

import { RouteGuard } from './components/auth/RouteGuard';

import { AssetsView } from './features/organization/AssetsView';
import { TalentManagementView } from './features/talent/TalentManagementView';
import { EmployeeRelationsView } from './features/compliance/EmployeeRelationsView';
import { HrServicesView } from './features/workspace/HrServicesView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { AutomationView } from './features/automation/AutomationView';
import { AdministrationView } from './features/admin/AdministrationView';

import { AttendanceModuleMaster } from './features/attendance/AttendanceModuleMaster';
import { LeaveManagementModule } from './features/leave/LeaveManagementModule';
import { PayrollMasterModule } from './features/payroll/PayrollMasterModule';
import { PerformanceMasterModule } from './features/performance/PerformanceMasterModule';
import { LmsMasterModule } from './features/lms/LmsMasterModule';
import { OtherMasterModule } from './features/other/OtherMasterModule';
import { AnalyticsMasterModule } from './features/analytics/AnalyticsMasterModule';
import { AdminMasterModule } from './features/admin/AdminMasterModule';
import { EssMasterModule } from './features/ess/EssMasterModule';
import { TlMasterModule } from './features/tl/TlMasterModule';
import { PlatformAdminMasterModule } from './features/platform/PlatformAdminMasterModule';
import { parseRouteFromUrl, syncUrlWithRoute } from './lib/router/urlRouter';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Compute the correct starting route URL-FIRST from the browser location
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const urlState = parseRouteFromUrl();
    if (urlState.route && urlState.route !== 'platform-dashboard') {
      return urlState.route;
    }
    const stored = api.getCurrentUser();
    const roleName = stored?.roles?.[0]?.name ?? '';
    if (roleName === 'Super Admin') return urlState.route || 'platform-dashboard';
    if (roleName === 'Team Lead')   return 'tl-dashboard';
    if (roleName === 'Employee')    return 'ess-dashboard';
    return 'dashboard'; // Company Admin, HR Head, Manager
  });
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlState = parseRouteFromUrl();
      if (urlState.route) {
        setCurrentRoute(urlState.route);
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
    setCurrentRoute(route);
    syncUrlWithRoute(route);
  };

  // Auto-redirect on role/persona switch (UserMenu persona switcher).
  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    const previousUserId = prevUserIdRef.current;
    prevUserIdRef.current = user.id;

    // Skip on first mount — initial route already correct from useState above.
    if (previousUserId === undefined) return;

    // Only act when the user actually switched persona.
    if (previousUserId !== user.id) {
      const roleName = user.roles?.[0]?.name ?? '';
      if (roleName === 'Super Admin') {
        setCurrentRoute('platform-dashboard');
      } else if (roleName === 'Team Lead') {
        setCurrentRoute('tl-dashboard');
      } else if (roleName === 'Employee') {
        setCurrentRoute('ess-dashboard');
      } else {
        // Company Admin, HR Head, Manager — land on dashboard,
        // but if already on an HRMS route keep it (no disruptive redirect).
        setCurrentRoute(prev =>
          prev.startsWith('platform') || prev.startsWith('saas-') ||
          prev.startsWith('tl-') || prev.startsWith('ess-')
            ? 'dashboard'
            : prev
        );
      }
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#07563D] text-white flex items-center justify-center font-black text-xl animate-pulse">
          W
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Initializing WorkForceOS Tenant Engine...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderViewContent = () => {
    switch (currentRoute) {
      case 'dashboard':
      case 'workforce-overview':
      case 'executive-overview':
        return <DashboardView onNavigate={setCurrentRoute} />;
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
      case 'policies':
      case 'templates':
      case 'integrations':
      case 'security':
      case 'audit-logs':
        return <AdminMasterModule initialTab={currentRoute} />;
      case 'recruitment':
        return <RecruitmentView />;
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
      case 'regularization':
      case 'overtime':
      case 'biometric':
      case 'gps':
      case 'late-early':
        return (
          <AttendanceModuleMaster
            currentSubPath={currentRoute === 'attendance' ? 'dashboard' : currentRoute}
            onNavigateSubPath={sub => setCurrentRoute(sub)}
          />
        );
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
      case 'shifts':
      case 'time-tracking':
      case 'wfh':
      case 'workforce-planning':
        return <TimeAndPayView />;
      case 'payroll':
      case 'payroll-dashboard':
      case 'payroll-salary':
      case 'payroll-processing':
      case 'payroll-earnings':
      case 'payroll-deductions':
      case 'payroll-statutory':
      case 'payroll-documents':
      case 'payroll-fnf':
      case 'payroll-reports':
      case 'payroll-settings':
        return <PayrollMasterModule initialTab={currentRoute} />;
      case 'other':
      case 'other-dashboard':
      case 'other-travel':
      case 'other-posh':
      case 'other-grievances':
      case 'other-engagement':
      case 'other-helpdesk':
      case 'other-communication':
      case 'travel':
      case 'posh':
      case 'grievances':
      case 'discipline':
      case 'engagement':
      case 'helpdesk':
      case 'communication':
        return <OtherMasterModule initialTab={currentRoute} />;
      case 'compliance':
        return <EmployeeRelationsView initialTab={currentRoute} />;
      case 'requests':
        return <HrServicesView initialTab={currentRoute} />;
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
      case 'recruitment-analytics':
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
      case 'workspace':
      case 'my-workspace':
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
      case 'settings':
        return <AdminMasterModule initialTab="settings" />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      activeRoute={currentRoute}
      onNavigate={handleNavigate}
      onOpenCopilot={() => setIsCopilotOpen(true)}
    >
      <RouteGuard module={currentRoute} onNavigate={setCurrentRoute}>
        {renderViewContent()}
      </RouteGuard>

      <AiAssistantDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
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
