import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { UserCheck, KeyRound, SlidersHorizontal, BookOpen, FileCode, GitFork, Lock, History, Settings, Plus, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const AdministrationView: React.FC<{ initialTab?: string }> = ({ initialTab = 'users' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'ADMINISTRATION' }, { label: 'System Administration & Security' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#07563D]" /> Enterprise Administration, Security & System Controls
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Provision user credentials, configure RBAC permission overrides, manage document templates, integrations, and security audit logs.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('User Provisioning Wizard Opened')}>
          Provision User
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'users', label: 'User Provisioning', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'rbac', label: 'Roles & Matrix', icon: <KeyRound className="w-4 h-4" /> },
          { id: 'permissions', label: 'Field & Scope Rules', icon: <SlidersHorizontal className="w-4 h-4" /> },
          { id: 'policies', label: 'Company Policies', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'templates', label: 'Doc Templates', icon: <FileCode className="w-4 h-4" /> },
          { id: 'integrations', label: 'Integrations', icon: <GitFork className="w-4 h-4" /> },
          { id: 'security', label: 'Security & MFA', icon: <Lock className="w-4 h-4" /> },
          { id: 'audit-logs', label: 'Audit Logs', icon: <History className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Platform Security Posture & Compliance Status</h3>
              <p className="text-xs text-gray-500">Security hardening rules enforced across tenant isolation layers.</p>
            </div>
            <Badge variant="emerald" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" /> ISO 27001 & SOC2 Compliant
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 text-[#07563D] space-y-1">
              <div className="text-xs font-bold uppercase">Row-Level Security (RLS)</div>
              <div className="text-lg font-black">Active Enforced</div>
              <div className="text-[11px]">Strict Multi-Tenant Database Isolation</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 text-blue-900 space-y-1">
              <div className="text-xs font-bold uppercase">Multi-Factor Auth (MFA)</div>
              <div className="text-lg font-black">Enforced All Admins</div>
              <div className="text-[11px]">TOTP Authenticator & Hardware Keys</div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 text-purple-900 space-y-1">
              <div className="text-xs font-bold uppercase">Audit Trail Logging</div>
              <div className="text-lg font-black">100% Immutable</div>
              <div className="text-[11px]">7-Year Legal Retention Policy</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
