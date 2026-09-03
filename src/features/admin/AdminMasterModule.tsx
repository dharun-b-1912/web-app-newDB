import React, { useState, useEffect } from 'react';
import { AdminDashboardView } from './subviews/AdminDashboardView';
import { UserManagementView } from './subviews/UserManagementView';
import { RoleManagementView } from './subviews/RoleManagementView';
import { PermissionManagementView } from './subviews/PermissionManagementView';
import { WorkflowBuilderView } from './subviews/WorkflowBuilderView';
import { ApprovalConfigView } from './subviews/ApprovalConfigView';
import { NotificationSettingsView } from './subviews/NotificationSettingsView';
import { AuditLogsView } from './subviews/AuditLogsView';
import { SecurityConfigView } from './subviews/SecurityConfigView';
import { ApiManagementView } from './subviews/ApiManagementView';
import { IntegrationsView } from './subviews/IntegrationsView';
import { SubscriptionView } from './subviews/SubscriptionView';
import { BillingView } from './subviews/BillingView';
import { SystemSettingsView } from './subviews/SystemSettingsView';

import {
  LayoutDashboard,
  Users,
  KeyRound,
  SlidersHorizontal,
  Workflow,
  CheckCircle2,
  Megaphone,
  History,
  Lock,
  Cpu,
  GitFork,
  CreditCard,
  Settings,
} from 'lucide-react';

interface AdminMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'admin' || route === 'administration') return 'dashboard';
  const clean = route.replace(/^admin-/, '');
  if (clean === 'users' || clean === 'provisioning') return 'users';
  if (clean === 'roles' || clean === 'rbac') return 'roles';
  if (clean === 'permissions' || clean === 'simulator') return 'permissions';
  if (clean === 'workflows' || clean === 'builder') return 'workflows';
  if (clean === 'approvals' || clean === 'policies') return 'approvals';
  if (clean === 'notifications' || clean === 'templates') return 'notifications';
  if (clean === 'audit-logs' || clean === 'audit') return 'audit';
  if (clean === 'security' || clean === 'mfa') return 'security';
  if (clean === 'api' || clean === 'keys' || clean === 'webhooks') return 'api';
  if (clean === 'integrations' || clean === 'connected') return 'integrations';
  if (clean === 'subscription' || clean === 'plan') return 'subscription';
  if (clean === 'billing' || clean === 'invoices') return 'billing';
  if (clean === 'settings') return 'settings';
  return 'dashboard';
};

export const AdminMasterModule: React.FC<AdminMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Role Management', icon: KeyRound },
    { id: 'permissions', label: 'Permissions & Scope', icon: SlidersHorizontal },
    { id: 'workflows', label: 'Workflow Builder', icon: Workflow },
    { id: 'approvals', label: 'Approval Config', icon: CheckCircle2 },
    { id: 'notifications', label: 'Notification Settings', icon: Megaphone },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'security', label: 'Security & MFA', icon: Lock },
    { id: 'api', label: 'API & Webhooks', icon: Cpu },
    { id: 'integrations', label: 'Integrations', icon: GitFork },
    { id: 'subscription', label: 'Subscription Plan', icon: Cpu },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Joy PeopleHR</span>
            <span>•</span>
            <span>Company Governance & IAM Control</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Company Administration & Role Authorization</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Authorize HR department personnel, assign operational scopes, and manage access policies across all legal entities.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">System Posture</span>
            <span className="text-sm font-black font-mono">100% Hardened & Audited</span>
          </div>
        </div>
      </div>



      {/* Quick Subview Tabs Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#07563D] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <AdminDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'users' && <UserManagementView />}
        {activeTab === 'roles' && <RoleManagementView />}
        {activeTab === 'permissions' && <PermissionManagementView />}
        {activeTab === 'workflows' && <WorkflowBuilderView />}
        {activeTab === 'approvals' && <ApprovalConfigView />}
        {activeTab === 'notifications' && <NotificationSettingsView />}
        {activeTab === 'audit' && <AuditLogsView />}
        {activeTab === 'security' && <SecurityConfigView />}
        {activeTab === 'api' && <ApiManagementView />}
        {activeTab === 'integrations' && <IntegrationsView />}
        {activeTab === 'subscription' && <SubscriptionView />}
        {activeTab === 'billing' && <BillingView />}
        {activeTab === 'settings' && <SystemSettingsView />}
      </div>
    </div>
  );
};
