import React from 'react';
import { adminApi } from '../../../services/adminApi';
import { Badge } from '../../../components/ui/Badge';
import { Lock, Users, KeyRound, Workflow, ShieldCheck, GitFork, Cpu, Activity } from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const users = adminApi.getUsers();
  const sub = adminApi.getSubscription();

  const metrics = [
    { label: 'Active System Users', val: users.length, sub: '0 Suspended Accounts', icon: Users, tab: 'users' },
    { label: 'Configured System Roles', val: '12 Active', sub: '4 Protected Roles', icon: KeyRound, tab: 'roles' },
    { label: 'Active Workflows', val: '8 Rules', sub: '0 Failed Triggers', icon: Workflow, tab: 'workflows' },
    { label: 'Connected Integrations', val: '3 Active', sub: 'Biometric & WhatsApp Active', icon: GitFork, tab: 'integrations' },
    { label: 'Platform Security Posture', val: '100% Compliant', sub: 'MFA Enforced / RLS Active', icon: ShieldCheck, tab: 'security' },
    { label: 'Subscription License', val: `${sub.active_employees} / ${sub.employee_limit}`, sub: 'Enterprise Tier Active', icon: Cpu, tab: 'subscription' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#07563D]" />
            <span>Centralized System Control Plane Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Control plane overview for user access provisioning, RBAC rules, workflows, security, APIs & platform health</p>
        </div>
        <Badge variant="emerald">Enterprise Control Plane Active</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab?.(m.tab)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
                  <Icon className="w-4 h-4" />
                </span>
                <Activity className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{m.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">{m.val}</span>
                <span className="text-[10px] text-emerald-700 font-semibold truncate block mt-0.5">{m.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
