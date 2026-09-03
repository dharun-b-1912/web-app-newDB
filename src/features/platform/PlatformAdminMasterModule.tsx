import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Layers,
  Sparkles,
  ChevronRight,
  Home,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { PlatformDashboardView } from './subviews/PlatformDashboardView';
import { TenantsView } from './subviews/TenantsView';
import { SubscriptionsView } from './subviews/SubscriptionsView';
import { TierEntitlementsView } from './subviews/TierEntitlementsView';
import { BillingView } from './subviews/BillingView';
import { UsageMeteringView } from './subviews/UsageMeteringView';
import { FeatureFlagsView } from './subviews/FeatureFlagsView';
import { SecurityCenterView } from './subviews/SecurityCenterView';
import { ActiveSessionsView } from './subviews/ActiveSessionsView';
import { AuditLogView } from './subviews/AuditLogView';
import { SupportCenterView } from './subviews/SupportCenterView';
import { BackgroundJobsView } from './subviews/BackgroundJobsView';
import { IncidentsView } from './subviews/IncidentsView';
import { SaasBusinessView } from './subviews/SaasBusinessView';
import { PlatformSettingsView } from './subviews/PlatformSettingsView';
import { WebhooksAndMeshView } from './subviews/WebhooksAndMeshView';
import { IntegrationsControlCenterView } from './subviews/IntegrationsControlCenterView';
import { PlatformAccountMasterView } from './subviews/PlatformAccountMasterView';
import { PlatformStaffView } from './subviews/PlatformStaffView';
import { NotificationDeliveryMonitorView } from './subviews/NotificationDeliveryMonitorView';
import { ObservabilityLiveView } from './subviews/ObservabilityLiveView';
import { JITSupportAccessView } from './subviews/JITSupportAccessView';
import { JoyEngineeringOpsMaster } from '../engineering/JoyEngineeringOpsMaster';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { usePlatformRealtime } from '../../services/platform';
import { api } from '../../services/api';

import { TenantHealthView } from './subviews/TenantHealthView';

export interface NavigationPayload {
  tenantId?: string;
  presetFilter?: string;
  subTab?: 'overview' | 'profile' | 'security' | 'sessions' | 'access' | 'preferences' | 'activity';
  search?: string;
  [key: string]: any;
}

export interface PlatformAdminMasterModuleProps {
  initialTab?: string;
  onNavigateTab?: (tab: string, payload?: NavigationPayload) => void;
}

const TAB_TITLES: Record<string, string> = {
  'platform-dashboard': 'Control Center',
  'platform-tenants': 'Tenants & Organizations',
  'platform-tenant-health': 'Tenant Health & Churn Risk',
  'platform-subscriptions': 'Subscriptions',
  'platform-plans': 'Plans & Entitlements',
  'platform-billing': 'Billing & Invoices',
  'platform-usage': 'Usage & Metering',
  'platform-features': 'Feature Flags',
  'platform-security': 'Security Center',
  'platform-sessions': 'Active Sessions',
  'platform-audit': 'Audit Log',
  'platform-support': 'Support Center & Case Management',
  'platform-jobs': 'Background Jobs & Worker Fleet',
  'platform-incidents': 'Platform Incidents & Operations',
  'platform-webhooks': 'Webhooks & Event Mesh',
  'platform-api': 'API & Integrations',
  'platform-keys': 'API Keys & Secrets',
  'platform-settings': 'Platform System Settings',
  'platform-staff': 'Platform Staff & Delegated IAM',
  'platform-notifications': 'Notification Delivery & DLQ Monitor',
  'platform-account': 'Identity & Account Center',
  'platform-observability': 'Observability & Live Telemetry',
  'platform-jit': 'Just-In-Time Support Access',
  'engineering-ops': 'Joy Engineering Ops v1 (Reality Audit)',
  'saas-revenue': 'Revenue & Growth',
};

import { parseRouteFromUrl, syncUrlWithRoute } from '../../lib/router/urlRouter';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

export const PlatformAdminMasterModule: React.FC<PlatformAdminMasterModuleProps> = ({
  initialTab = 'platform-dashboard',
  onNavigateTab,
}) => {
  const urlState = parseRouteFromUrl();
  const [activeTab, setActiveTab] = useState(urlState.route || initialTab);
  const [navPayload, setNavPayload] = useState<NavigationPayload | undefined>(() => {
    return {
      tenantId: urlState.params.tenantId || urlState.params.id,
      presetFilter: urlState.params.presetFilter || urlState.params.status || urlState.params.plan,
      subTab: urlState.params.subTab as any,
      search: urlState.params.search,
    };
  });

  const currentTab = initialTab || activeTab;

  const handleSelectTab = (tab: string, payload?: NavigationPayload) => {
    setActiveTab(tab);
    setNavPayload(payload);
    syncUrlWithRoute(tab, payload as any);
    if (onNavigateTab) onNavigateTab(tab, payload);
  };

  // Sync activeTab whenever initialTab prop changes
  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Listen to platform:navigate custom event from UserMenu
  React.useEffect(() => {
    const handleCustomNav = (e: any) => {
      if (e.detail?.tab) {
        handleSelectTab(e.detail.tab, e.detail);
      }
    };
    window.addEventListener('platform:navigate', handleCustomNav);
    return () => window.removeEventListener('platform:navigate', handleCustomNav);
  }, []);

  // Real-time connection badge status
  const { isConnected } = usePlatformRealtime();

  const renderContent = () => {
    switch (currentTab) {
      case 'platform-dashboard':
      case 'platform':
        return <PlatformDashboardView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-tenant-health':
      case 'saas-churn':
        return <TenantHealthView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-tenants':
      case 'platform-organizations':
      case 'platform-provisioning':
        return (
          <TenantsView
            initialTenantId={navPayload?.tenantId}
            initialPreset={navPayload?.presetFilter}
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'saas-revenue':
      case 'platform-revenue':
        return <SaasBusinessView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-subscriptions':
        return (
          <SubscriptionsView
            initialPlanFilter={navPayload?.presetFilter}
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-plans':
      case 'platform-entitlements':
        return (
          <TierEntitlementsView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-billing':
      case 'platform-invoices':
        return <BillingView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-usage':
      case 'platform-metering':
        return (
          <UsageMeteringView
            tenantId={navPayload?.tenantId}
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-features':
      case 'platform-flags':
        return <FeatureFlagsView />;
      case 'platform-security':
        return <SecurityCenterView onNavigateTab={(tab) => handleSelectTab(tab)} />;
      case 'platform-sessions':
        return <ActiveSessionsView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-audit':
        return <AuditLogView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-support':
      case 'platform-cases':
      case 'platform-access-requests':
        return <SupportCenterView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-jobs':
      case 'platform-workers':
      case 'platform-queues':
        return <BackgroundJobsView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-incidents':
      case 'platform-operations':
      case 'platform-exports':
      case 'platform-announcements':
        return <IncidentsView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-webhooks':
        return <WebhooksAndMeshView />;
      case 'platform-api':
      case 'platform-keys':
        return <IntegrationsControlCenterView />;
      case 'platform-settings':
      case 'platform-users':
      case 'platform-marketplace':
        return <PlatformSettingsView />;
      case 'platform-staff':
      case 'platform-roles':
      case 'platform-permissions':
      case 'platform-staff-directory':
      case 'platform-staff-activity':
        return <PlatformStaffView />;
      case 'platform-notifications':
      case 'platform-dlq':
      case 'platform-events':
        return <NotificationDeliveryMonitorView />;
      case 'platform-account':
      case 'platform-profile':
      case 'platform-account-overview':
      case 'platform-account-profile':
      case 'platform-account-security':
      case 'platform-account-sessions':
      case 'platform-account-access':
      case 'platform-account-preferences':
      case 'platform-account-activity':
        return (
          <PlatformAccountMasterView
            initialSubTab={
              navPayload?.subTab ||
              (currentTab === 'platform-account-security'
                ? 'security'
                : currentTab === 'platform-account-sessions'
                  ? 'sessions'
                  : currentTab === 'platform-account-access'
                    ? 'access'
                    : currentTab === 'platform-account-preferences'
                      ? 'preferences'
                      : currentTab === 'platform-account-activity'
                        ? 'activity'
                        : currentTab === 'platform-account-profile' || currentTab === 'platform-profile'
                          ? 'profile'
                          : 'overview')
            }
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-observability':
      case 'platform-telemetry':
      case 'platform-logs':
      case 'platform-errors':
        return <ObservabilityLiveView />;
      case 'platform-jit':
      case 'platform-support-access':
        return <JITSupportAccessView />;
      case 'engineering-ops':
      case 'platform-engineering':
      case 'platform-reality-check':
        return <JoyEngineeringOpsMaster />;
      case 'saas-customers':
      case 'saas-trials':
      case 'saas-renewals':
      case 'saas-coupons':
      case 'saas-partners':
      case 'saas-subscriptions':
        return <SaasBusinessView />;
      default:
        return <PlatformDashboardView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
    }
  };

  return (
    <div className="space-y-4">
      <ImpersonationBanner />

      {/* Realtime Breadcrumb Bar */}
      <div className="flex items-center justify-between px-1 text-[13px] text-[#90A1B9] font-sans">
        <div className="flex items-center gap-1.5 font-medium">
          <button
            type="button"
            onClick={() => handleSelectTab('platform-dashboard')}
            className="flex items-center gap-1 hover:text-[#047857] transition-colors cursor-pointer text-[#90A1B9]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Platform Admin</span>
          </button>
          <span className="text-[#90A1B9]">›</span>
          <span className="font-semibold text-[#0F172B]">
            {TAB_TITLES[currentTab] || currentTab}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(() => {
            const currentUser = api.getCurrentUser();
            const currentRole = currentUser?.roles?.[0]?.name || 'Super Admin';
            return (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                <span>🛡️</span>
                <span>{currentUser?.name || 'Staff'}: <strong>{currentRole}</strong></span>
              </span>
            );
          })()}

          <span className="flex items-center gap-1.5 text-[12px] font-mono text-[#62748E] bg-white border border-[#E7EAF0] px-3 py-1 rounded-full shadow-[0_1px_2px_rgba(15,23,43,0.04)] tracking-[0.02em]">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#15845B] animate-pulse' : 'bg-[#D89A16]'
                }`}
            />
            {isConnected ? 'Realtime Engine Active' : 'Connecting Engine...'}
          </span>
        </div>
      </div>

      {/* Smooth Content View Container */}
      <div className="transition-opacity duration-150 animate-in fade-in">
        <ErrorBoundary fallbackTitle="Platform Control Plane Module Error">
          {renderContent()}
        </ErrorBoundary>
      </div>
    </div>
  );
};
