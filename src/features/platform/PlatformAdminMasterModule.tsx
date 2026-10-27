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
import { PlansAndPricingView } from './subviews/PlansAndPricingView';
import { FeatureCatalogueView } from './subviews/FeatureCatalogueView';
import { PricingCalculatorView } from './subviews/PricingCalculatorView';
import { AddonsCatalogueView } from './subviews/AddonsCatalogueView';
import { QuotationsView } from './subviews/QuotationsView';
import { SalesPipelineView } from './subviews/SalesPipelineView';
import { SaaSInvoicesView } from './subviews/SaaSInvoicesView';
import { CommercialClientsView } from './subviews/CommercialClientsView';
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
import { WhatsAppControlCenterView } from './subviews/WhatsAppControlCenterView';
import { PlatformAccountMasterView } from './subviews/PlatformAccountMasterView';
import { PlatformStaffView } from './subviews/PlatformStaffView';
import { NotificationDeliveryMonitorView } from './subviews/NotificationDeliveryMonitorView';
import { ObservabilityLiveView } from './subviews/ObservabilityLiveView';
import { JITSupportAccessView } from './subviews/JITSupportAccessView';
import { JoyEngineeringOpsMaster } from '../engineering/JoyEngineeringOpsMaster';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { usePlatformRealtime } from '../../services/platform';
import { api } from '../../services/api';

import { ModuleRegistryView } from './subviews/ModuleRegistryView';
import { DevelopmentRoadmapView } from './subviews/DevelopmentRoadmapView';
import { LaunchScopeDashboardView } from './subviews/LaunchScopeDashboardView';
import { TenantHealthView } from './subviews/TenantHealthView';
import { AwsCostAnalysisView } from './subviews/AwsCostAnalysisView';
import { PlatformNotFoundView } from './components/PlatformNotFoundView';

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
  onNavigate?: (route: string, params?: any, replace?: boolean) => void;
}

const TAB_TITLES: Record<string, string> = {
  'platform-dashboard': 'Control Center',
  'platform-tenants': 'Tenants & Organizations',
  'platform-clients': 'Clients',
  'platform-tenant-health': 'Tenant Health & Churn Risk',
  'platform-subscriptions': 'Subscriptions',
  'platform-quotations': 'Quotations',
  'platform-invoices': 'Invoices & Billing',
  'platform-payments': 'Payments & Collections',
  'platform-plans': 'Plans & Pricing',
  'platform-pricing-calculator': 'Pricing Calculator',
  'pricing-calculator': 'Pricing Calculator',
  'platform-catalogue': 'Feature Catalogue',
  'platform-feature-catalogue': 'Feature Catalogue',
  'platform-addons': 'Add-ons',
  'platform-billing': 'Invoices & Billing',
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
  'platform-aws-cost-analysis': 'AWS Cloud Cost Analysis & FinOps',
  'aws-cost-analysis': 'AWS Cloud Cost Analysis & FinOps',
};

import { parseRouteFromUrl, syncUrlWithRoute } from '../../lib/router/urlRouter';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

export const PlatformAdminMasterModule: React.FC<PlatformAdminMasterModuleProps> = ({
  initialTab = 'platform-dashboard',
  onNavigateTab,
  onNavigate,
}) => {
  const { isConnected } = usePlatformRealtime();
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
    if (onNavigate) onNavigate(tab, payload);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    }
  };

  // Sync activeTab whenever initialTab prop changes
  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
      if (typeof window !== 'undefined') {
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = 0;
      }
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

  // Synchronize browser document title with current platform route
  React.useEffect(() => {
    const titles: Record<string, string> = {
      'platform-dashboard': 'Joy PeopleHR — Platform Control Center',
      'platform': 'Joy PeopleHR — Platform Control Center',
      'platform-addons': 'Joy PeopleHR — Add-ons',
      'platform-pricing-calculator': 'Joy PeopleHR — Pricing Calculator',
      'pricing-calculator': 'Joy PeopleHR — Pricing Calculator',
      'platform-plans': 'Joy PeopleHR — Plans & Pricing',
      'platform-quotations': 'Joy PeopleHR — Quotations',
      'quotations': 'Joy PeopleHR — Quotations',
      'platform-subscriptions': 'Joy PeopleHR — Subscriptions',
      'platform-invoices': 'Joy PeopleHR — Invoices',
      'platform-billing': 'Joy PeopleHR — Invoices & Billing',
      'platform-payments': 'Joy PeopleHR — Payments & Collections',
      'platform-features': 'Joy PeopleHR — Feature Flags',
      'platform-catalogue': 'Joy PeopleHR — Feature Catalogue',
      'platform-feature-catalogue': 'Joy PeopleHR — Feature Catalogue',
      'saas-revenue': 'Joy PeopleHR — Revenue & Growth',
      'platform-tenants': 'Joy PeopleHR — Organizations',
      'platform-clients': 'Joy PeopleHR — Clients',
      'platform-usage': 'Joy PeopleHR — Usage & Metering',
    };
    if (titles[currentTab]) {
      document.title = titles[currentTab];
    } else if (TAB_TITLES[currentTab]) {
      document.title = `Joy PeopleHR — ${TAB_TITLES[currentTab]}`;
    }
  }, [currentTab]);

  const getCategoryForTab = (tab: string): string => {
    if (
      tab === 'platform-plans' ||
      tab === 'platform-pricing' ||
      tab === 'platform-addons' ||
      tab === 'saas-addons' ||
      tab === 'platform-pricing-calculator' ||
      tab === 'pricing-calculator' ||
      tab === 'platform-quotations' ||
      tab === 'quotations' ||
      tab === 'saas-quotations' ||
      tab === 'platform-subscriptions' ||
      tab === 'platform-invoices' ||
      tab === 'platform-billing' ||
      tab === 'invoices' ||
      tab === 'saas-invoices' ||
      tab === 'platform-payments' ||
      tab === 'saas-revenue' ||
      tab === 'platform-revenue' ||
      tab === 'platform-sales' ||
      tab === 'saas-sales' ||
      tab === 'sales-pipeline' ||
      tab === 'sales' ||
      tab === 'platform-usage' ||
      tab === 'platform-clients'
    ) {
      return 'SaaS Business';
    }
    if (
      tab === 'platform-catalogue' ||
      tab === 'platform-feature-catalogue' ||
      tab === 'product-catalogue' ||
      tab === 'platform-features' ||
      tab === 'platform-flags' ||
      tab === 'platform-modules' ||
      tab === 'platform-roadmap'
    ) {
      return 'Product';
    }
    if (
      tab === 'platform-security' ||
      tab === 'platform-sessions' ||
      tab === 'platform-audit'
    ) {
      return 'Security';
    }
    return 'Operations';
  };

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
      case 'platform-sales':
      case 'saas-sales':
      case 'sales-pipeline':
      case 'sales':
        return <SalesPipelineView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-subscriptions':
        return (
          <SubscriptionsView
            initialPlanFilter={navPayload?.presetFilter}
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-plans':
      case 'platform-pricing':
      case 'platform-entitlements':
        return (
          <PlansAndPricingView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-pricing-calculator':
      case 'pricing-calculator':
        return (
          <PricingCalculatorView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-catalogue':
      case 'platform-feature-catalogue':
      case 'product-catalogue':
        return (
          <FeatureCatalogueView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-addons':
      case 'saas-addons':
        return (
          <AddonsCatalogueView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-tier-entitlements':
        return (
          <TierEntitlementsView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-clients':
      case 'saas-clients':
      case 'clients':
        return (
          <CommercialClientsView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-quotations':
      case 'quotations':
      case 'saas-quotations':
        return (
          <QuotationsView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
      case 'platform-billing':
      case 'platform-invoices':
      case 'invoices':
      case 'saas-invoices':
        return (
          <SaaSInvoicesView
            onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)}
          />
        );
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
        return <FeatureFlagsView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      case 'platform-modules':
      case 'platform-registry':
      case 'platform-product':
        return <ModuleRegistryView />;
      case 'platform-roadmap':
        return <DevelopmentRoadmapView />;
      case 'platform-launch-scope':
      case 'platform-launch':
        return <LaunchScopeDashboardView />;
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
      case 'platform-whatsapp':
        return <WhatsAppControlCenterView />;
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
      case 'platform-aws-cost-analysis':
      case 'aws-cost-analysis':
        return <AwsCostAnalysisView onNavigateTab={(tab, payload) => handleSelectTab(tab, payload)} />;
      default:
        // Proper 404 View: NEVER silently fall back to Control Center!
        return (
          <PlatformNotFoundView
            attemptedRoute={currentTab}
            onNavigateHome={(route) => handleSelectTab(route)}
          />
        );
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
          <span className="text-[#64748B] font-semibold">{getCategoryForTab(currentTab)}</span>
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
