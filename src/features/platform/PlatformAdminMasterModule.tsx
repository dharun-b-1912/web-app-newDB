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
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { usePlatformRealtime } from '../../services/platform';

import { TenantHealthView } from './subviews/TenantHealthView';

export interface NavigationPayload {
  tenantId?: string;
  presetFilter?: string;
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
      case 'platform-staff':
      case 'platform-roles':
      case 'platform-marketplace':
        return <PlatformSettingsView />;
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
          <span className="flex items-center gap-1.5 text-[12px] font-mono text-[#62748E] bg-white border border-[#E7EAF0] px-3 py-1 rounded-full shadow-[0_1px_2px_rgba(15,23,43,0.04)] tracking-[0.02em]">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-[#15845B] animate-pulse' : 'bg-[#D89A16]'
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
