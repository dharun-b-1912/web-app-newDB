// src/features/platform/subviews/TenantsView.tsx
// ============================================================
// WorkForceOS — Organizations & Customer Workspace Control Center
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Package,
  HeartPulse,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Download,
  Plus,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Lock,
  UserCheck,
  Zap,
  Clock,
  Send,
  Eye,
  SlidersHorizontal,
  Bookmark,
  Check,
  X,
  FileText,
  Briefcase,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowLeft,
  Headphones,
  HardDrive,
  Globe,
  Mail,
  Phone,
  Tag,
  Star,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  platformTenantService,
  OrganizationRecord,
  OrgQueryParams,
  PlanTier,
  OrgStatus,
} from '../../../services/platform/platformTenantService';
import { ProvisionCustomerModal } from '../components/ProvisionCustomerModal';
import { CustomerWorkspaceHeader } from '../components/tenants/CustomerWorkspaceHeader';
import { CustomerOverviewTab } from '../components/tenants/CustomerOverviewTab';
import { CustomerPeopleTab } from '../components/tenants/CustomerPeopleTab';
import { CustomerSubscriptionTab } from '../components/tenants/CustomerSubscriptionTab';
import { CustomerBillingTab } from '../components/tenants/CustomerBillingTab';
import { CustomerUsageTab } from '../components/tenants/CustomerUsageTab';
import { CustomerHealthTab } from '../components/tenants/CustomerHealthTab';
import { CustomerSupportTab } from '../components/tenants/CustomerSupportTab';
import { CustomerSecurityTab } from '../components/tenants/CustomerSecurityTab';
import { CustomerActivityTab } from '../components/tenants/CustomerActivityTab';
import { CustomerIntegrationsTab } from '../components/tenants/CustomerIntegrationsTab';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export const TenantsView: React.FC = () => {
  const { showToast } = useToast();

  // Active Workspace Navigation State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'people'
    | 'subscription'
    | 'billing'
    | 'usage'
    | 'health'
    | 'support'
    | 'security'
    | 'activity'
    | 'integrations'
  >('overview');

  // Search & Filter State
  const [queryParams, setQueryParams] = useState<OrgQueryParams>({
    search: '',
    status: 'all',
    plan: 'all',
    page: 1,
    page_size: 10,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  // Provisioning Modal State
  const [isProvisionWizardOpen, setIsProvisionWizardOpen] = useState(false);

  // Edit Customer Modal State
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editForm, setEditForm] = useState({
    legal_name: '',
    display_name: '',
    domain: '',
    industry: '',
    gstin: '',
    pan: '',
  });

  // Active Impersonation State
  const [activeImpersonation, setActiveImpersonation] = useState<{
    org: OrganizationRecord;
    mode: string;
    expiresIn: string;
  } | null>(null);

  // Data fetching versioning
  const [dataVersion, setDataVersion] = useState(0);
  const data = useMemo(() => {
    return platformTenantService.getOrganizations(queryParams);
  }, [queryParams, dataVersion]);

  const portfolioCounts = useMemo(() => {
    return platformTenantService.getPortfolioCounts();
  }, [dataVersion]);

  const fetchData = () => {
    setDataVersion((v) => v + 1);
  };

  // Selected Organization
  const selectedOrg = useMemo(() => {
    if (!selectedOrgId) return null;
    return platformTenantService.getOrganizationById(selectedOrgId);
  }, [selectedOrgId, dataVersion]);

  // Open Edit Customer Modal with populated values
  const handleOpenEditCustomer = () => {
    if (!selectedOrg) return;
    setEditForm({
      legal_name: selectedOrg.legal_name,
      display_name: selectedOrg.display_name,
      domain: selectedOrg.domain,
      industry: selectedOrg.industry,
      gstin: selectedOrg.gstin || '',
      pan: selectedOrg.pan || '',
    });
    setShowEditCustomerModal(true);
  };

  // Save Edit Customer Profile
  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    await platformTenantService.updateOrganization(selectedOrg.id, {
      legal_name: editForm.legal_name,
      display_name: editForm.display_name,
      domain: editForm.domain,
      industry: editForm.industry,
      gstin: editForm.gstin || undefined,
      pan: editForm.pan || undefined,
    });

    setShowEditCustomerModal(false);
    fetchData();
    showToast(`Updated customer profile for ${editForm.legal_name}`, 'success');
  };

  // Suspend Customer Action
  const handleSuspendCustomer = async (reason: string) => {
    if (!selectedOrg) return;
    await platformTenantService.suspendOrganization(selectedOrg.id, reason, true);
    fetchData();
    showToast(`Customer ${selectedOrg.legal_name} has been suspended.`, 'info');
  };

  // Reactivate Customer Action
  const handleReactivateCustomer = async (reason: string) => {
    if (!selectedOrg) return;
    await platformTenantService.reactivateOrganization(selectedOrg.id, reason);
    fetchData();
    showToast(`Customer ${selectedOrg.legal_name} has been reactivated.`, 'success');
  };

  // Access Customer Account Action
  const handleAccessCustomerAccount = (mode: 'read-only' | 'full-support') => {
    if (!selectedOrg) return;
    setActiveImpersonation({
      org: selectedOrg,
      mode,
      expiresIn: '15:00',
    });
    showToast(`Started diagnostic session for ${selectedOrg.legal_name} (${mode})`, 'info');
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Organization', 'Org ID', 'Domain', 'Plan', 'Status', 'Billing Status', 'Health Score', 'Employees', 'Seat Limit', 'Usage %', 'MRR', 'Renewal Date', 'Owner', 'Created Date'],
      ...data.items.map((o) => [
        `"${o.legal_name}"`,
        o.id,
        o.domain,
        o.plan,
        o.status,
        o.billing_status,
        `${o.health_score}/100`,
        o.active_employees,
        o.seat_limit,
        `${o.seat_utilization_pct}%`,
        o.mrr_formatted,
        o.renewal_date,
        o.account_owner_name,
        o.created_at,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WorkForceOS_Customers_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // WORKSPACE VIEW (WHEN A SPECIFIC CUSTOMER IS OPENED)
  // ============================================================
  if (selectedOrg) {
    return (
      <div className="space-y-6 pb-16 font-sans animate-in fade-in">
        {/* Customer Workspace Header with 6 KPIs & Safety Actions */}
        <CustomerWorkspaceHeader
          organization={selectedOrg}
          onBackToList={() => setSelectedOrgId(null)}
          onEditCustomer={handleOpenEditCustomer}
          onChangePlan={() => setActiveTab('subscription')}
          onSuspendCustomer={handleSuspendCustomer}
          onReactivateCustomer={handleReactivateCustomer}
          onAccessAccount={handleAccessCustomerAccount}
          activeImpersonation={activeImpersonation}
          onExitImpersonation={() => setActiveImpersonation(null)}
        />

        {/* 10 Workspace Tabs Bar */}
        <div className="border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'people', label: 'People & Admins' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'billing', label: 'Billing & Invoices' },
              { id: 'usage', label: 'Usage & Quotas' },
              { id: 'health', label: 'Tenant Health' },
              { id: 'support', label: 'Support Cases' },
              { id: 'security', label: 'Security & Access' },
              { id: 'activity', label: 'Activity' },
              { id: 'integrations', label: 'Integrations' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Display */}
        <div>
          {activeTab === 'overview' && (
            <CustomerOverviewTab
              organization={selectedOrg}
              onNavigateTab={(t) => setActiveTab(t as any)}
              onEditCustomer={handleOpenEditCustomer}
              onChangePlan={() => setActiveTab('subscription')}
            />
          )}

          {activeTab === 'people' && <CustomerPeopleTab organization={selectedOrg} />}

          {activeTab === 'subscription' && (
            <CustomerSubscriptionTab
              organization={selectedOrg}
              onChangePlanSuccess={(newPlan, newMrr) => {
                fetchData();
              }}
            />
          )}

          {activeTab === 'billing' && <CustomerBillingTab organization={selectedOrg} />}

          {activeTab === 'usage' && <CustomerUsageTab organization={selectedOrg} />}

          {activeTab === 'health' && <CustomerHealthTab organization={selectedOrg} />}

          {activeTab === 'support' && <CustomerSupportTab organization={selectedOrg} />}

          {activeTab === 'security' && <CustomerSecurityTab organization={selectedOrg} />}

          {activeTab === 'activity' && <CustomerActivityTab organization={selectedOrg} />}

          {activeTab === 'integrations' && <CustomerIntegrationsTab organization={selectedOrg} />}
        </div>

        {/* Edit Customer Modal */}
        {showEditCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <form onSubmit={handleSaveEditCustomer} className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
              <h3 className="text-base font-bold text-gray-900">Edit Customer Information</h3>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.legal_name}
                  onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Display Name (Short Brand)</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Primary Domain *</label>
                  <input
                    type="text"
                    required
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Industry Vertical</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAACA0000F1Z0"
                    value={editForm.gstin}
                    onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">PAN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. AAACA0000F"
                    value={editForm.pan}
                    onChange={(e) => setEditForm({ ...editForm, pan: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEditCustomerModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // MAIN CUSTOMERS & ORGANIZATIONS DIRECTORY VIEW
  // ============================================================
  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organizations & Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage customer accounts, subscriptions, usage, health and access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" />
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsProvisionWizardOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-xs font-bold text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            + Add Customer
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Clickable Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Customers', count: portfolioCounts.total, filterKey: 'all', color: 'text-gray-900' },
          { label: 'Active', count: portfolioCounts.active, filterKey: 'Active', color: 'text-[#047857]' },
          { label: 'Trial', count: portfolioCounts.trial, filterKey: 'Trial', color: 'text-blue-700' },
          { label: 'Needs Attention', count: portfolioCounts.at_risk, filterKey: 'At Risk', color: 'text-amber-700' },
          { label: 'Suspended', count: portfolioCounts.suspended, filterKey: 'Suspended', color: 'text-rose-700' },
        ].map((kpi) => {
          const isSelected = queryParams.status?.toLowerCase() === kpi.filterKey.toLowerCase();
          return (
            <div
              key={kpi.label}
              onClick={() => setQueryParams({ ...queryParams, status: kpi.filterKey })}
              className={cn(
                'p-4 rounded-2xl border transition cursor-pointer bg-white shadow-xs',
                isSelected ? 'border-[#047857] ring-1 ring-[#047857]' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{kpi.label}</span>
              <div className={cn('text-2xl font-bold font-mono mt-1', kpi.color)}>{kpi.count}</div>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filter Strip */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company name, domain, or admin email..."
            value={queryParams.search}
            onChange={(e) => setQueryParams({ ...queryParams, search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#047857]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={queryParams.plan}
            onChange={(e) => setQueryParams({ ...queryParams, plan: e.target.value, page: 1 })}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
          >
            <option value="all">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Business">Business</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* 4. Customer Directory Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Organization / Customer</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Users / Seats</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">MRR</th>
                <th className="py-3 px-4">Billing</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No matching organizations found.
                  </td>
                </tr>
              ) : (
                data.items.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    className="hover:bg-gray-50/60 transition cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <div className="font-bold text-gray-900 text-sm">{org.legal_name}</div>
                      <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{org.domain}</span>
                        <span>•</span>
                        <span className="text-gray-500 font-sans">{org.id}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                        {org.health_grade} ({org.health_score})
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-[10px]">
                        {org.plan}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-gray-900">
                      {org.active_employees} / {org.seat_limit}
                    </td>

                    <td className="py-4 px-4">
                      <div className="w-20 space-y-1">
                        <div className="text-[10px] font-bold text-gray-600">{org.seat_utilization_pct}%</div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', org.seat_utilization_pct > 85 ? 'bg-amber-500' : 'bg-[#047857]')}
                            style={{ width: `${Math.min(100, org.seat_utilization_pct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-gray-900">
                      {org.mrr_formatted}
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#047857]">
                        {org.billing_status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-gray-500 text-[11px]">
                      {org.last_activity_time}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrgId(org.id);
                        }}
                        className="text-xs font-bold border-gray-200 text-[#047857] hover:bg-emerald-50"
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise Provisioning Modal */}
      <ProvisionCustomerModal
        isOpen={isProvisionWizardOpen}
        onClose={() => setIsProvisionWizardOpen(false)}
        onProvisionSuccess={(newOrgId) => {
          setIsProvisionWizardOpen(false);
          setSelectedOrgId(newOrgId);
          fetchData();
        }}
      />
    </div>
  );
};
