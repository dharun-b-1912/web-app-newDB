// src/features/admin/AdministrationWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Administration Workspace (Consolidated)
// Workspaces: [ Access Control ] [ Security ] [ Integrations ] [ Audit ] [ Settings ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  PlugZap,
  ScrollText,
  SlidersHorizontal,
  Users,
  Lock,
  Cpu,
  History,
  Settings,
  Sparkles,
} from 'lucide-react';
import { UserManagementView } from './subviews/UserManagementView';
import { RoleManagementView } from './subviews/RoleManagementView';
import { PermissionManagementView } from './subviews/PermissionManagementView';
import { SecurityConfigView } from './subviews/SecurityConfigView';
import { ApiManagementView } from './subviews/ApiManagementView';
import { IntegrationsView } from './subviews/IntegrationsView';
import { AuditLogsView } from './subviews/AuditLogsView';
import { SystemSettingsView } from './subviews/SystemSettingsView';
import { SubscriptionView } from './subviews/SubscriptionView';
import { BillingView } from './subviews/BillingView';
import { NotificationSettingsView } from './subviews/NotificationSettingsView';
import { cn } from '../../lib/utils';

export type AdminWorkspaceTab =
  | 'access'
  | 'security'
  | 'integrations'
  | 'audit'
  | 'settings';

interface AdministrationWorkspaceProps {
  initialTab?: AdminWorkspaceTab;
  initialSubTab?: string;
  onNavigate?: (route: string) => void;
}

export const AdministrationWorkspace: React.FC<AdministrationWorkspaceProps> = ({
  initialTab = 'access',
  initialSubTab,
}) => {
  const [activeTab, setActiveTab] = useState<AdminWorkspaceTab>(initialTab);
  const [accessSubTab, setAccessSubTab] = useState<'users' | 'roles' | 'permissions'>(
    initialSubTab === 'roles' ? 'roles' : initialSubTab === 'permissions' ? 'permissions' : 'users'
  );
  const [integrationsSubTab, setIntegrationsSubTab] = useState<'connected' | 'api'>(
    initialSubTab === 'api' ? 'api' : 'connected'
  );
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'notifications' | 'subscription' | 'billing'>('general');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5 text-emerald-300" />
              <span>Enterprise Control Plane</span>
              <span>•</span>
              <span>System Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Company Administration & Security
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Manage system IAM access control, enterprise security posture, hardware integrations, compliance audit trail, and company settings.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Security Posture</span>
              <span className="text-sm font-black font-mono">100% Hardened</span>
            </div>
          </div>
        </div>

        {/* Primary Workspace Navigation */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('access')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'access'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <KeyRound className="w-4 h-4" />
            <span>Access Control & RBAC</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'security'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Shield className="w-4 h-4" />
            <span>Security & Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'integrations'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <PlugZap className="w-4 h-4" />
            <span>Integrations & APIs</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'audit'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <ScrollText className="w-4 h-4" />
            <span>Audit & Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'settings'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Organization Settings</span>
          </button>
        </div>
      </div>

      {/* 1. ACCESS CONTROL SUBVIEW */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setAccessSubTab('users')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                accessSubTab === 'users' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Provisioning</span>
            </button>
            <button
              onClick={() => setAccessSubTab('roles')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                accessSubTab === 'roles' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Custom Roles</span>
            </button>
            <button
              onClick={() => setAccessSubTab('permissions')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                accessSubTab === 'permissions' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Permissions & Scope Matrix</span>
            </button>
          </div>

          <div>
            {accessSubTab === 'users' && <UserManagementView />}
            {accessSubTab === 'roles' && <RoleManagementView />}
            {accessSubTab === 'permissions' && <PermissionManagementView />}
          </div>
        </div>
      )}

      {/* 2. SECURITY SUBVIEW */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <SecurityConfigView />
        </div>
      )}

      {/* 3. INTEGRATIONS SUBVIEW */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1">
            <button
              onClick={() => setIntegrationsSubTab('connected')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                integrationsSubTab === 'connected' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <PlugZap className="w-3.5 h-3.5" />
              <span>Connected Apps & Biometric Hardware</span>
            </button>
            <button
              onClick={() => setIntegrationsSubTab('api')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2',
                integrationsSubTab === 'api' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>API Keys & Outbound Webhooks</span>
            </button>
          </div>

          <div>
            {integrationsSubTab === 'connected' && <IntegrationsView />}
            {integrationsSubTab === 'api' && <ApiManagementView />}
          </div>
        </div>
      )}

      {/* 4. AUDIT & MONITORING SUBVIEW */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <AuditLogsView />
        </div>
      )}

      {/* 5. SETTINGS SUBVIEW */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSettingsSubTab('general')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                settingsSubTab === 'general' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Organization & Localization
            </button>
            <button
              onClick={() => setSettingsSubTab('notifications')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                settingsSubTab === 'notifications' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Notification Preferences
            </button>
            <button
              onClick={() => setSettingsSubTab('subscription')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                settingsSubTab === 'subscription' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Subscription Plan & Limits
            </button>
            <button
              onClick={() => setSettingsSubTab('billing')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                settingsSubTab === 'billing' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Billing & Invoices
            </button>
          </div>

          <div>
            {settingsSubTab === 'general' && <SystemSettingsView />}
            {settingsSubTab === 'notifications' && <NotificationSettingsView />}
            {settingsSubTab === 'subscription' && <SubscriptionView />}
            {settingsSubTab === 'billing' && <BillingView />}
          </div>
        </div>
      )}
    </div>
  );
};
