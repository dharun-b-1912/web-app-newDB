// src/features/platform/subviews/TenantsView.tsx
// ============================================================
// WorkForceOS — Tenant Management 2.0 (Operations Console)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Shield,
  RefreshCw,
  X,
  ChevronRight,
  Download,
  Key,
  Lock,
  Layers,
  FileText,
  TrendingUp,
} from 'lucide-react';
import {
  platformTenantService,
  platformProvisioningService,
  platformImpersonationService,
} from '../../../services/platform';
import { TenantOrganization, TenantStatus, TenantProvisioningRun } from '../../../types/platformAdmin';
import { TenantDetailDrawer } from '../components/TenantDetailDrawer';
import { PrivilegedActionModal } from '../components/PrivilegedActionModal';

export const TenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<TenantOrganization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedHealth, setSelectedHealth] = useState<string>('ALL');

  // Detail Drawer & Impersonation & Privileged Action States
  const [activeTenant, setActiveTenant] = useState<TenantOrganization | null>(null);
  const [privilegedAction, setPrivilegedAction] = useState<{
    isOpen: boolean;
    tenant: TenantOrganization | null;
    actionType: 'SUSPEND' | 'ACTIVATE' | 'DELETE' | 'IMPERSONATE';
  }>({ isOpen: false, tenant: null, actionType: 'SUSPEND' });

  // 10-Stage Provisioning Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeProvisioningRun, setActiveProvisioningRun] = useState<TenantProvisioningRun | null>(null);
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    owner_name: '',
    owner_email: '',
    industry: 'Software & IT Services',
    city: 'Coimbatore',
    employee_count: 50,
    plan: 'Professional' as TenantOrganization['plan'],
  });

  const loadTenants = async () => {
    const list = await platformTenantService.getTenants();
    setTenants(list);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleStartProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legal_name || !formData.owner_email) return;

    const run = await platformProvisioningService.startProvisioning(formData);
    setActiveProvisioningRun(run);
    await loadTenants();
  };

  const handlePrivilegedConfirm = async (reason: string) => {
    if (!privilegedAction.tenant) return;
    const { tenant, actionType } = privilegedAction;

    if (actionType === 'SUSPEND') {
      await platformTenantService.updateTenantStatus(tenant.id, 'Suspended', reason);
    } else if (actionType === 'ACTIVATE') {
      await platformTenantService.updateTenantStatus(tenant.id, 'Active', reason);
    } else if (actionType === 'IMPERSONATE') {
      await platformImpersonationService.startImpersonation({
        target_tenant_id: tenant.id,
        target_tenant_name: tenant.legal_name,
        reason: reason,
        duration_minutes: 30,
      });
      window.location.reload();
    }

    setPrivilegedAction({ isOpen: false, tenant: null, actionType: 'SUSPEND' });
    await loadTenants();
  };

  const handleExportCSV = () => {
    const headers = ['Tenant ID', 'Legal Name', 'Owner Email', 'Plan', 'Status', 'Employees', 'MRR (INR)', 'Health Score'];
    const rows = filteredTenants.map(t => [
      t.id,
      `"${t.legal_name}"`,
      t.owner_email,
      t.plan,
      t.status,
      t.employee_count,
      t.mrr,
      t.health_score,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workforceos-tenants-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.domain && t.domain.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    const matchesPlan = selectedPlan === 'ALL' || t.plan === selectedPlan;
    const matchesHealth = selectedHealth === 'ALL' || t.health === selectedHealth;

    return matchesSearch && matchesStatus && matchesPlan && matchesHealth;
  });

  return (
    <div className="space-y-6">
      {/* 360 Detail Drawer */}
      <TenantDetailDrawer
        tenant={activeTenant}
        onClose={() => setActiveTenant(null)}
        onStatusChange={async (id, status) => {
          const target = tenants.find(t => t.id === id);
          if (target) {
            setPrivilegedAction({
              isOpen: true,
              tenant: target,
              actionType: status === 'Suspended' ? 'SUSPEND' : 'ACTIVATE',
            });
          }
        }}
        onPlanChange={async (id, plan) => {
          await platformTenantService.changeTenantPlan(id, plan);
          await loadTenants();
          if (activeTenant && activeTenant.id === id) {
            setActiveTenant({ ...activeTenant, plan });
          }
        }}
        onRequestImpersonate={t => {
          setPrivilegedAction({
            isOpen: true,
            tenant: t,
            actionType: 'IMPERSONATE',
          });
        }}
      />

      {/* Privileged Action Confirmation Modal */}
      <PrivilegedActionModal
        isOpen={privilegedAction.isOpen}
        onClose={() => setPrivilegedAction({ isOpen: false, tenant: null, actionType: 'SUSPEND' })}
        onConfirm={handlePrivilegedConfirm}
        title={
          privilegedAction.actionType === 'SUSPEND'
            ? 'Suspend Tenant Account'
            : privilegedAction.actionType === 'ACTIVATE'
            ? 'Activate Tenant Account'
            : 'Initiate Super Admin Impersonation'
        }
        actionLabel={
          privilegedAction.actionType === 'SUSPEND'
            ? 'Confirm Suspension'
            : privilegedAction.actionType === 'ACTIVATE'
            ? 'Confirm Activation'
            : 'Start Impersonation (30m)'
        }
        targetName={privilegedAction.tenant?.legal_name || 'Organization'}
        severity={privilegedAction.actionType === 'SUSPEND' ? 'Critical' : 'High'}
        requiredConfirmationText={privilegedAction.actionType === 'SUSPEND' ? 'SUSPEND' : undefined}
        description={
          privilegedAction.actionType === 'SUSPEND'
            ? 'Suspending this tenant will immediately block all employee logins and pause background sync workers. A mandatory compliance reason is required.'
            : privilegedAction.actionType === 'ACTIVATE'
            ? 'Activating this tenant will re-enable all portal logins and resume subscription services.'
            : 'Starting an impersonation session grants you temporary tenant workspace access. All actions will be attributed to your Super Admin identity and audited.'
        }
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200">
              Tenant Directory
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">
              {filteredTenants.length} of {tenants.length} Organizations
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Tenant & Organization Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Provision, monitor, and manage all multi-tenant customer organizations with granular operational controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-gray-200"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={() => {
              setActiveProvisioningRun(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Provision Organization
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by organization name, tenant ID, admin email, or domain..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/20 outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Business">Business</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          <select
            value={selectedHealth}
            onChange={e => setSelectedHealth(e.target.value)}
            className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Health</option>
            <option value="Healthy">Healthy (75-100)</option>
            <option value="At Risk">At Risk (50-74)</option>
            <option value="Critical">Critical (&lt;50)</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Organization</th>
                <th className="py-3.5 px-4">Plan & MRR</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Headcount</th>
                <th className="py-3.5 px-4">Storage</th>
                <th className="py-3.5 px-4">Health Score</th>
                <th className="py-3.5 px-4">Last Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredTenants.map(t => {
                const isHealthy = t.health === 'Healthy';
                const isAtRisk = t.health === 'At Risk';
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    onClick={() => setActiveTenant(t)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 text-[#07563D] font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#07563D] transition-colors">
                            {t.legal_name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {t.id} • {t.owner_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{t.plan}</div>
                      <div className="text-[10px] text-[#07563D] font-bold font-mono">
                        ₹{(t.mrr / 1000).toFixed(0)}K/mo
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          t.status === 'Active'
                            ? 'bg-emerald-100 text-[#07563D]'
                            : t.status === 'Trial'
                            ? 'bg-blue-100 text-blue-800'
                            : t.status === 'Payment Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{t.employee_count} seats</div>
                      <div className="text-[10px] text-gray-400">{t.active_users_count} active logins</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-700">
                      {t.storage_used_gb} / {t.storage_quota_gb} GB
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-red-500'}`} />
                        <span className="font-bold text-gray-900 font-mono">{t.health_score}</span>
                        <span className={`text-[10px] font-semibold ${isHealthy ? 'text-emerald-700' : isAtRisk ? 'text-amber-700' : 'text-red-700'}`}>
                          ({t.health})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">{t.last_activity}</td>
                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Open Tenant Command Center"
                          onClick={() => setActiveTenant(t)}
                          className="p-1.5 text-gray-400 hover:text-[#07563D] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10-Stage Idempotent Provisioning Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#07563D]">
                  Automated Provisioning State Machine
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">Provision New SaaS Organization</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!activeProvisioningRun ? (
              <form onSubmit={handleStartProvisioning} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Organization Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.legal_name}
                      onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
                      placeholder="e.g. Acme Innovations Pvt Ltd"
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Trade / Display Name</label>
                    <input
                      type="text"
                      value={formData.trade_name}
                      onChange={e => setFormData({ ...formData, trade_name: e.target.value })}
                      placeholder="e.g. Acme Tech"
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Primary Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.owner_name}
                      onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Primary Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.owner_email}
                      onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                      placeholder="e.g. admin@acme.com"
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={e => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Headcount</label>
                    <input
                      type="number"
                      value={formData.employee_count}
                      onChange={e => setFormData({ ...formData, employee_count: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Plan Tier</label>
                    <select
                      value={formData.plan}
                      onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-gray-300 focus:border-[#07563D] outline-hidden font-bold"
                    >
                      <option value="Starter">Starter (₹18K)</option>
                      <option value="Professional">Professional (₹45K)</option>
                      <option value="Business">Business (₹85K)</option>
                      <option value="Enterprise">Enterprise (₹1.8L)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                  Provisioning automatically creates the database RLS partition, primary admin credentials, S3 encrypted vault, system roles, and seeds statutory compliance settings.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 font-bold text-gray-700 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Start 10-Stage Provisioning
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-5 text-xs">
                <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div>
                    <div className="font-bold text-gray-900">{activeProvisioningRun.tenant_name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{activeProvisioningRun.tenant_id}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                    activeProvisioningRun.status === 'READY' ? 'bg-emerald-100 text-[#07563D]' : 'bg-blue-100 text-blue-800 animate-pulse'
                  }`}>
                    {activeProvisioningRun.status}
                  </span>
                </div>

                {/* Progress Stages List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeProvisioningRun.step_details.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                        step.status === 'COMPLETED'
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : step.status === 'RUNNING'
                          ? 'bg-blue-50/50 border-blue-200 text-blue-900 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {step.status === 'COMPLETED' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : step.status === 'RUNNING' ? (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300 text-[10px] flex items-center justify-center font-bold text-gray-400 shrink-0">
                            {idx + 1}
                          </div>
                        )}
                        <span>{step.label}</span>
                      </div>
                      <span className="text-[10px] font-mono">{step.status}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setActiveProvisioningRun(null);
                    }}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold cursor-pointer transition-all"
                  >
                    Close & Return to Directory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
