import React, { useState } from 'react';
import { PlatformDashboardView } from './subviews/PlatformDashboardView';
import { TenantsView } from './subviews/TenantsView';
import { SubscriptionsView } from './subviews/SubscriptionsView';
import { BillingView } from './subviews/BillingView';
import { UsageMeteringView } from './subviews/UsageMeteringView';
import { FeatureFlagsView } from './subviews/FeatureFlagsView';
import { SecurityDashboardView } from './subviews/SecurityDashboardView';
import { SupportCenterView } from './subviews/SupportCenterView';
import { SaasBusinessView } from './subviews/SaasBusinessView';
import { PlatformSettingsView } from './subviews/PlatformSettingsView';

export interface PlatformAdminMasterModuleProps {
  initialTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const PlatformAdminMasterModule: React.FC<PlatformAdminMasterModuleProps> = ({
  initialTab = 'platform-dashboard',
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const currentTab = initialTab || activeTab;

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    if (onNavigateTab) onNavigateTab(tab);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'platform-dashboard':
      case 'platform':
        return <PlatformDashboardView onNavigateTab={handleSelectTab} />;
      case 'platform-tenants':
      case 'platform-organizations':
      case 'platform-provisioning':
      case 'platform-tenant-health':
        return <TenantsView />;
      case 'platform-subscriptions':
      case 'platform-plans':
        return <SubscriptionsView />;
      case 'platform-billing':
        return <BillingView />;
      case 'platform-usage':
        return <UsageMeteringView />;
      case 'platform-features':
      case 'platform-flags':
        return <FeatureFlagsView />;
      case 'platform-security':
      case 'platform-sessions':
        return <SecurityDashboardView />;
      case 'platform-support':
      case 'platform-audit':
      case 'platform-incidents':
      case 'platform-jobs':
      case 'platform-operations':
      case 'platform-exports':
      case 'platform-announcements':
        return <SupportCenterView />;
      case 'platform-settings':
      case 'platform-api':
      case 'platform-keys':
      case 'platform-webhooks':
      case 'platform-users':
      case 'platform-staff':
      case 'platform-roles':
      case 'platform-marketplace':
        return <PlatformSettingsView />;
      case 'saas-revenue':
      case 'saas-customers':
      case 'saas-churn':
      case 'saas-trials':
      case 'saas-renewals':
      case 'saas-coupons':
      case 'saas-partners':
      case 'saas-subscriptions':
        return <SaasBusinessView />;
      default:
        return <PlatformDashboardView onNavigateTab={handleSelectTab} />;
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
};
