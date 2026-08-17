// src/features/platform/subviews/TenantsView.tsx
// ============================================================
// WorkForceOS — Organizations & Tenants Control Center
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
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface TenantsViewProps {
  initialTenantId?: string;
  initialPreset?: string;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  initialTenantId,
  initialPreset,
  onNavigateTab,
}) => {
  // State
  const [queryParams, setQueryParams] = useState<OrgQueryParams>({
    search: '',
    status: initialPreset || 'all',
    plan: 'all',
    page: 1,
    page_size: 25,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(initialTenantId || null);
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

  // Modals
  const [isProvisionWizardOpen, setIsProvisionWizardOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncState, setSyncState] = useState<{ isSyncing: boolean; result: any | null }>({
    isSyncing: false,
    result: null,
  });
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<OrganizationRecord>>({});
  const [newNoteText, setNewNoteText] = useState('');

  // Impersonation
  const [impersonateModal, setImpersonateModal] = useState<{
    isOpen: boolean;
    org: OrganizationRecord | null;
    reason: string;
    mode: 'read-only' | 'full-support';
    duration: string;
  }>({
    isOpen: false,
    org: null,
    reason: '',
    mode: 'read-only',
    duration: '15 minutes',
  });
  const [activeImpersonation, setActiveImpersonation] = useState<{
    org: OrganizationRecord;
    mode: string;
    expiresIn: string;
  } | null>(null);

  // Suspension & Reactivation
  const [suspendModal, setSuspendModal] = useState<{
    isOpen: boolean;
    org: OrganizationRecord | null;
    reason: string;
    notifyAdmin: boolean;
  }>({
    isOpen: false,
    org: null,
    reason: '',
    notifyAdmin: true,
  });

  // Provisioning Wizard Steps (5 Steps)
  const [provisionStep, setProvisionStep] = useState(1);
  const [provisionProgress, setProvisionProgress] = useState<{
    isRunning: boolean;
    stepsDone: number;
    completed: boolean;
  }>({ isRunning: false, stepsDone: 0, completed: false });
  const [provisionForm, setProvisionForm] = useState({
    legal_name: '',
    display_name: '',
    domain: '',
    industry: 'Software & IT Services',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Chennai',
    timezone: 'Asia/Kolkata (IST)',
    currency: 'INR (₹)',
    gstin: '33AAACA1234F1Z8',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    plan: 'Enterprise',
    billing_cycle: 'Annual',
    seat_limit: 100,
    is_trial: false,
    enabled_features: ['Core HR', 'Attendance', 'Leave', 'Payroll', 'WhatsApp', 'Biometric'],
  });

  // Fetch paginated organizations
  const data = useMemo(() => {
    return platformTenantService.getOrganizations(queryParams);
  }, [queryParams]);

  const portfolioCounts = useMemo(() => {
    return platformTenantService.getPortfolioCounts();
  }, [data]);

  // Selected Organization
  const selectedOrg = useMemo(() => {
    if (!selectedOrgId) return null;
    return platformTenantService.getOrganizationById(selectedOrgId);
  }, [selectedOrgId, data]);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('org-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync Action
  const handleRunSync = async () => {
    setSyncState({ isSyncing: true, result: null });
    setIsSyncModalOpen(true);
    const res = await platformTenantService.syncOrganizations();
    setSyncState({ isSyncing: false, result: res });
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Organization', 'Org ID', 'Domain', 'Plan', 'Lifecycle', 'Billing Status', 'Health Score', 'Employees', 'Seat Limit', 'Usage %', 'MRR', 'Renewal Date', 'Owner', 'Created Date'],
      ...data.items.map((o) => [
        `"${o.legal_name}"`,
        o.id,
        o.domain,
        o.plan,
        o.lifecycle_state,
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
    link.setAttribute('download', `WorkForceOS_Organizations_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start Impersonation
  const handleStartImpersonation = () => {
    if (!impersonateModal.org || !impersonateModal.reason.trim()) {
      alert('Operational reason is required to start an impersonation session.');
      return;
    }
    setActiveImpersonation({
      org: impersonateModal.org,
      mode: impersonateModal.mode,
      expiresIn: impersonateModal.duration === '15 minutes' ? '14:59' : '29:59',
    });
    setImpersonateModal({ isOpen: false, org: null, reason: '', mode: 'read-only', duration: '15 minutes' });
  };

  // Suspend
  const handleSuspendConfirm = async () => {
    if (!suspendModal.org || !suspendModal.reason.trim()) {
      alert('Suspension reason is mandatory.');
      return;
    }
    await platformTenantService.suspendOrganization(suspendModal.org.id, suspendModal.reason, suspendModal.notifyAdmin);
    setSuspendModal({ isOpen: false, org: null, reason: '', notifyAdmin: true });
    setQueryParams({ ...queryParams });
    alert(`Organization ${suspendModal.org.legal_name} has been placed on administrative suspension.`);
  };

  // Reactivate
  const handleReactivateConfirm = async (org: OrganizationRecord) => {
    const reason = prompt('Please enter reason for account reactivation:', 'Customer invoice settled & security review complete');
    if (!reason) return;
    await platformTenantService.reactivateOrganization(org.id, reason);
    setQueryParams({ ...queryParams });
    alert(`Organization ${org.legal_name} has been reactivated.`);
  };

  // Provisioning Wizard Submit & Progress
  const handleExecuteProvision = async () => {
    setProvisionProgress({ isRunning: true, stepsDone: 0, completed: false });
    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 200));
      setProvisionProgress((prev) => ({ ...prev, stepsDone: i }));
    }
    const created = await platformTenantService.provisionOrganization(provisionForm);
    setProvisionProgress({ isRunning: false, stepsDone: 6, completed: true });
    setTimeout(() => {
      setIsProvisionWizardOpen(false);
      setProvisionStep(1);
      setProvisionProgress({ isRunning: false, stepsDone: 0, completed: false });
      setSelectedOrgId(created.id);
      setQueryParams({ ...queryParams });
    }, 600);
  };

  // ----------------------------------------------------------------
  // WORKSPACE VIEW (WHEN AN ORGANIZATION IS OPENED)
  // ----------------------------------------------------------------
  if (selectedOrg) {
    return (
      <div className="space-y-6 pb-16 font-sans">
        {/* Impersonation Banner */}
        {activeImpersonation && (
          <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] text-[#92400E] px-4 py-3 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-[#D97706] animate-pulse" />
              <div>
                <span className="font-bold text-xs uppercase tracking-wider">
                  Impersonation Active:
                </span>{' '}
                <strong className="text-sm text-[#78350F]">{activeImpersonation.org.legal_name}</strong>{' '}
                <span className="text-xs">({activeImpersonation.mode === 'read-only' ? 'Read-Only Diagnostic' : 'Support Admin Access'})</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-[#FDE68A]">
                Expires in: {activeImpersonation.expiresIn}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveImpersonation(null)}
                className="bg-[#78350F] text-white border-transparent hover:bg-[#5E2B0C] text-xs font-bold"
              >
                Exit Impersonation
              </Button>
            </div>
          </div>
        )}

        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOrgId(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#047857] hover:text-[#036246] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Organizations</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B]">
              Tenant ID: <strong className="font-mono text-[#0F172B]">{selectedOrg.id}</strong>
            </span>
          </div>
        </div>

        {/* Organization Workspace Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#047857] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                {selectedOrg.legal_name.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">{selectedOrg.legal_name}</h1>
                  <span
                    className={cn(
                      'text-[10px] px-3 py-1 rounded-full font-bold inline-flex items-center gap-1',
                      selectedOrg.health_grade === 'Healthy'
                        ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                        : selectedOrg.health_grade === 'Watch'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                        : selectedOrg.health_grade === 'At Risk'
                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                    )}
                  >
                    ● {selectedOrg.health_grade} ({selectedOrg.health_score}/100)
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#F1F5F9] text-[#334155] border">
                    {selectedOrg.plan} Plan
                  </span>

                  <span className="font-mono font-bold text-xs text-[#047857] bg-[#ECFDF5] px-2.5 py-0.5 rounded-lg border border-[#A7F3D0]">
                    {selectedOrg.mrr_formatted} MRR
                  </span>

                  {selectedOrg.is_watchlisted && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                      <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" /> Watchlisted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-[#64748B] mt-1.5 flex-wrap">
                  <span>Domain: <strong className="text-[#0F172B]">{selectedOrg.domain}</strong></span>
                  <span>•</span>
                  <span>Industry: <strong>{selectedOrg.industry}</strong></span>
                  <span>•</span>
                  <span>Location: <strong>{selectedOrg.city}, {selectedOrg.country}</strong></span>
                  <span>•</span>
                  <span>Owner: <strong>{selectedOrg.account_owner_name} ({selectedOrg.account_owner_team})</strong></span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImpersonateModal({
                    isOpen: true,
                    org: selectedOrg,
                    reason: '',
                    mode: 'read-only',
                    duration: '15 minutes',
                  });
                }}
                className="bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A] text-xs font-bold"
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1 text-[#D97706]" /> Impersonate
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditFormData(selectedOrg);
                  setIsEditOrgModalOpen(true);
                }}
                className="text-xs font-semibold border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                Edit Organization
              </Button>

              {selectedOrg.status === 'Suspended' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleReactivateConfirm(selectedOrg)}
                  className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendModal({ isOpen: true, org: selectedOrg, reason: '', notifyAdmin: true })}
                  className="text-xs font-semibold text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
                >
                  <Lock className="h-3.5 w-3.5 mr-1" /> Suspend
                </Button>
              )}
            </div>
          </div>

          {/* Top 6 Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Health Score</span>
              <strong className="text-xl font-bold text-[#0F172B] block mt-0.5">
                {selectedOrg.health_score} <span className="text-xs font-normal text-[#64748B]">/ 100</span>
              </strong>
              <span className={cn('text-[10px] font-semibold flex items-center gap-0.5', selectedOrg.health_trend >= 0 ? 'text-[#047857]' : 'text-[#DC2626]')}>
                {selectedOrg.health_trend >= 0 ? `↑ ${selectedOrg.health_trend} pts` : `↓ ${Math.abs(selectedOrg.health_trend)} pts`}
              </span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Active Employees</span>
              <strong className="text-xl font-bold text-[#0F172B] block mt-0.5">
                {selectedOrg.active_employees} <span className="text-xs font-normal text-[#64748B]">/ {selectedOrg.seat_limit}</span>
              </strong>
              <span className="text-[10px] text-[#64748B] font-semibold">{selectedOrg.seat_utilization_pct}% capacity</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Usage Rate</span>
              <strong className="text-xl font-bold text-[#047857] block mt-0.5">{selectedOrg.seat_utilization_pct}%</strong>
              <span className="text-[10px] text-[#047857] font-semibold">Seat allocation</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Monthly Revenue</span>
              <strong className="text-xl font-bold text-[#0F172B] font-mono block mt-0.5">{selectedOrg.mrr_formatted}</strong>
              <span className="text-[10px] text-[#64748B] font-semibold">{selectedOrg.billing_cycle} cycle</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Last Activity</span>
              <strong className="text-sm font-bold text-[#0F172B] block mt-1 line-clamp-1">{selectedOrg.last_activity_time}</strong>
              <span className="text-[10px] text-[#64748B] font-mono">{selectedOrg.last_activity_timestamp}</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Next Renewal</span>
              <strong className="text-sm font-bold text-[#0F172B] font-mono block mt-1">{selectedOrg.renewal_date}</strong>
              <span className="text-[10px] text-[#047857] font-semibold">{selectedOrg.auto_renew ? '● Auto-Renew ON' : '○ Manual'}</span>
            </div>
          </div>
        </div>

        {/* 10 Workspace Tabs */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="border-b border-[#E2E8F0] px-6 bg-[#F8FAFC] overflow-x-auto">
            <div className="flex items-center gap-6 min-w-max">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'people', label: 'People & Admins', icon: Users },
                { id: 'subscription', label: 'Subscription', icon: Package },
                { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
                { id: 'usage', label: 'Usage & Quotas', icon: Activity },
                { id: 'health', label: 'Tenant Health', icon: HeartPulse },
                { id: 'support', label: 'Support Cases', icon: Headphones },
                { id: 'security', label: 'Security & Auth', icon: ShieldCheck },
                { id: 'activity', label: 'Activity Log', icon: Clock },
                { id: 'integrations', label: 'Integrations', icon: Zap },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={cn(
                      'py-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer',
                      isActive
                        ? 'border-[#047857] text-[#047857]'
                        : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 text-xs">
                {/* Account Health Warning if needed */}
                {selectedOrg.health_score < 60 && (
                  <div className="p-4 bg-[#FEF2F2] rounded-2xl border border-[#FCA5A5] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
                      <div>
                        <strong className="text-sm font-bold text-[#991B1B]">Customer Requires Retention Attention</strong>
                        <p className="text-[11px] text-[#991B1B] mt-0.5">
                          Primary Risk: <strong>{selectedOrg.primary_risk}</strong>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-tenant-health', { presetFilter: selectedOrg.legal_name })}
                      className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold"
                    >
                      <Play className="h-3 w-3 mr-1" /> Open Retention Playbook
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Company Profile Card */}
                  <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-sm text-[#0F172B]">Company Profile</h3>
                      <button
                        onClick={() => {
                          setEditFormData(selectedOrg);
                          setIsEditOrgModalOpen(true);
                        }}
                        className="text-xs font-semibold text-[#047857] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] text-[#64748B]">
                      <div>Legal Name: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.legal_name}</strong></div>
                      <div>Domain: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.domain}</strong></div>
                      <div>Industry: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.industry}</strong></div>
                      <div>GSTIN / Tax ID: <strong className="text-[#0F172B] font-mono block mt-0.5">{selectedOrg.gstin || 'Not provided'}</strong></div>
                      <div>Address: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.city}, {selectedOrg.state}, {selectedOrg.country}</strong></div>
                      <div>Timezone: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.timezone}</strong></div>
                    </div>

                    <div className="pt-2 border-t">
                      <span className="font-bold text-[#64748B] block text-[10px] uppercase">Primary Administrator</span>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="h-8 w-8 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center font-bold">
                          {selectedOrg.primary_admin_name.charAt(0)}
                        </div>
                        <div>
                          <strong className="text-[#0F172B] text-xs">{selectedOrg.primary_admin_name}</strong>
                          <div className="text-[10px] text-[#64748B] font-mono">{selectedOrg.primary_admin_email} • {selectedOrg.primary_admin_phone}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commercial & Usage Summary */}
                  <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-sm text-[#0F172B]">Commercial & Entitlement Summary</h3>
                      <button
                        onClick={() => onNavigateTab?.('platform-subscriptions', { presetFilter: selectedOrg.legal_name })}
                        className="text-xs font-semibold text-[#047857] hover:underline"
                      >
                        Manage Subscription
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] text-[#64748B]">
                      <div>Plan Tier: <strong className="text-[#047857] block mt-0.5">{selectedOrg.plan}</strong></div>
                      <div>Contract Price: <strong className="text-[#0F172B] font-mono block mt-0.5">{selectedOrg.mrr_formatted} / mo</strong></div>
                      <div>Billing Status: <strong className="text-[#0F172B] block mt-0.5">{selectedOrg.billing_status}</strong></div>
                      <div>Renewal Date: <strong className="text-[#0F172B] font-mono block mt-0.5">{selectedOrg.renewal_date}</strong></div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Headcount Utilization:</span>
                        <strong>{selectedOrg.active_employees} / {selectedOrg.seat_limit} ({selectedOrg.seat_utilization_pct}%)</strong>
                      </div>
                      <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#047857] rounded-full" style={{ width: `${selectedOrg.seat_utilization_pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links Row */}
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <span className="font-bold text-xs text-[#0F172B] block mb-3">Quick Navigation Shortcuts</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-subscriptions', { presetFilter: selectedOrg.legal_name })}
                      className="text-xs text-[#047857] bg-white border-[#A7F3D0] hover:bg-[#ECFDF5]"
                    >
                      <Package className="h-3.5 w-3.5 mr-1" /> Open Subscription
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-billing', { presetFilter: selectedOrg.legal_name })}
                      className="text-xs text-[#2563EB] bg-white border-[#BFDBFE] hover:bg-[#EFF6FF]"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Open Billing & Invoices
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-usage', { tenantId: selectedOrg.id })}
                      className="text-xs text-[#7C3AED] bg-white border-[#E9D5FF] hover:bg-[#FAF5FF]"
                    >
                      <Activity className="h-3.5 w-3.5 mr-1" /> Open Usage & Metering
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-tenant-health', { presetFilter: selectedOrg.legal_name })}
                      className="text-xs text-[#D97706] bg-white border-[#FDE68A] hover:bg-[#FEF3C7]"
                    >
                      <HeartPulse className="h-3.5 w-3.5 mr-1" /> Open Tenant Health
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-support', { tenantId: selectedOrg.id })}
                      className="text-xs text-[#334155] bg-white border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                      <Headphones className="h-3.5 w-3.5 mr-1" /> Open Support Cases
                    </Button>
                  </div>
                </div>

                {/* Internal Notes Section */}
                <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-3">
                  <h3 className="font-bold text-sm text-[#0F172B]">Internal Super Admin Notes</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an internal note regarding this customer account..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        if (!newNoteText.trim()) return;
                        await platformTenantService.addInternalNote(selectedOrg.id, newNoteText, 'WorkForce Super Admin');
                        setNewNoteText('');
                        setQueryParams({ ...queryParams });
                      }}
                      className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
                    >
                      Add Note
                    </Button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedOrg.internal_notes.map((note) => (
                      <div key={note.id} className="p-3 bg-[#F8FAFC] rounded-xl border text-xs space-y-1">
                        <div className="flex justify-between text-[#64748B] text-[10px]">
                          <strong>{note.author}</strong>
                          <span>{note.created_at}</span>
                        </div>
                        <p className="text-[#334155]">{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PEOPLE */}
            {activeTab === 'people' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border text-center">
                    <span className="text-[#64748B]">Total Employees</span>
                    <strong className="text-xl block mt-1">{selectedOrg.people_summary.total_employees}</strong>
                  </div>
                  <div className="p-4 bg-[#ECFDF5] rounded-2xl border border-[#A7F3D0] text-center">
                    <span className="text-[#047857]">Active Users</span>
                    <strong className="text-xl block mt-1 text-[#047857]">{selectedOrg.people_summary.active_employees}</strong>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border text-center">
                    <span className="text-[#64748B]">Admins</span>
                    <strong className="text-xl block mt-1">{selectedOrg.people_summary.admins_count}</strong>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border text-center">
                    <span className="text-[#64748B]">Managers</span>
                    <strong className="text-xl block mt-1">{selectedOrg.people_summary.managers_count}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SUBSCRIPTION */}
            {activeTab === 'subscription' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Plan:</span>
                    <strong className="text-[#047857]">{selectedOrg.plan}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">MRR:</span>
                    <strong className="font-mono">{selectedOrg.mrr_formatted}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Seats:</span>
                    <strong>{selectedOrg.seat_limit} Seats</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Renewal:</span>
                    <strong className="font-mono">{selectedOrg.renewal_date}</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateTab?.('platform-subscriptions', { presetFilter: selectedOrg.legal_name })}
                  className="bg-[#047857] hover:bg-[#036246] text-white"
                >
                  <Package className="h-3.5 w-3.5 mr-1" /> Open Full Subscription Workspace
                </Button>
              </div>
            )}

            {/* TAB 4: BILLING */}
            {activeTab === 'billing' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Billing Status:</span>
                    <strong className={cn(selectedOrg.billing_status === 'Paid' ? 'text-[#047857]' : 'text-[#DC2626]')}>
                      {selectedOrg.billing_status}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">GSTIN:</span>
                    <strong className="font-mono">{selectedOrg.gstin}</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateTab?.('platform-billing', { presetFilter: selectedOrg.legal_name })}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Open Invoices & Financial Ledger
                </Button>
              </div>
            )}

            {/* TAB 5: USAGE */}
            {activeTab === 'usage' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Storage:</span>
                    <strong>{selectedOrg.storage_used_gb} GB / {selectedOrg.storage_quota_gb} GB</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">API Calls:</span>
                    <strong className="font-mono">{selectedOrg.api_calls_this_month.toLocaleString()} calls</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateTab?.('platform-usage', { tenantId: selectedOrg.id })}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                >
                  <Activity className="h-3.5 w-3.5 mr-1" /> Open Usage & Metering Console
                </Button>
              </div>
            )}

            {/* TAB 6: HEALTH */}
            {activeTab === 'health' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border text-center">
                    <span className="text-[#64748B]">Engagement</span>
                    <strong className="text-base block mt-0.5">{selectedOrg.engagement_score} / 25</strong>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border text-center">
                    <span className="text-[#64748B]">Usage</span>
                    <strong className="text-base block mt-0.5">{selectedOrg.usage_score} / 25</strong>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border text-center">
                    <span className="text-[#64748B]">Billing</span>
                    <strong className="text-base block mt-0.5">{selectedOrg.billing_score} / 25</strong>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] rounded-xl border text-center">
                    <span className="text-[#64748B]">Support</span>
                    <strong className="text-base block mt-0.5">{selectedOrg.support_score} / 25</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateTab?.('platform-tenant-health', { presetFilter: selectedOrg.legal_name })}
                  className="bg-[#047857] hover:bg-[#036246] text-white"
                >
                  <HeartPulse className="h-3.5 w-3.5 mr-1" /> Open Tenant Health & Churn Risk Console
                </Button>
              </div>
            )}

            {/* TAB 7: SUPPORT */}
            {activeTab === 'support' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Open Tickets:</span>
                    <strong>{selectedOrg.support_summary.open_tickets}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">CSAT Score:</span>
                    <strong className="text-[#047857]">{selectedOrg.support_summary.csat_score} / 5.0</strong>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigateTab?.('platform-support', { tenantId: selectedOrg.id })}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  <Headphones className="h-3.5 w-3.5 mr-1" /> Open Support Center
                </Button>
              </div>
            )}

            {/* TAB 8: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Active Sessions:</span>
                    <strong>{selectedOrg.security_summary.active_sessions_count} sessions</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">MFA Adoption:</span>
                    <strong className="text-[#047857]">{selectedOrg.security_summary.mfa_adoption_pct}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-xs text-[#0F172B]">Recent Organization Events</h4>
                <div className="space-y-2">
                  {selectedOrg.activity_log.map((act) => (
                    <div key={act.id} className="p-3 bg-[#F8FAFC] rounded-xl border flex items-center justify-between">
                      <div>
                        <strong className="text-[#0F172B]">{act.event}</strong>
                        <div className="text-[10px] text-[#64748B] mt-0.5">{act.actor} • {act.source}</div>
                      </div>
                      <span className="text-[10px] font-mono text-[#64748B]">{act.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 10: INTEGRATIONS */}
            {activeTab === 'integrations' && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-xs text-[#0F172B]">Active Connected Connectors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedOrg.integrations.map((intg) => (
                    <div key={intg.id} className="p-4 rounded-xl border bg-[#F8FAFC] space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-bold text-[#0F172B]">{intg.name}</strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          ● {intg.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">{intg.metric_summary} (Last event: {intg.last_event})</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // DIRECTORY VIEW (ORGANIZATIONS TABLE & LIST)
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs font-semibold text-[#047857] flex items-center gap-1.5 mb-1">
            <span>Platform Admin</span>
            <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
            <span>Organizations</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Organizations & Tenants</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] border">
              {portfolioCounts.total} total
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-0.5">
            Manage customer organizations, tenant lifecycle, subscriptions, usage, health and administrative access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunSync}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className="h-4 w-4 text-[#64748B]" />
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setProvisionStep(1);
              setIsProvisionWizardOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            + Provision Organization
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Interactive Filtering) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: 'all', label: 'TOTAL', count: portfolioCounts.total, color: 'text-[#0F172B]', icon: Building2 },
          { id: 'active', label: 'ACTIVE', count: portfolioCounts.active, color: 'text-[#047857]', icon: CheckCircle2 },
          { id: 'trial', label: 'TRIAL', count: portfolioCounts.trial, color: 'text-[#2563EB]', icon: Clock },
          { id: 'at-risk', label: 'AT RISK', count: portfolioCounts.at_risk, color: 'text-[#D97706]', icon: AlertTriangle },
          { id: 'suspended', label: 'SUSPENDED', count: portfolioCounts.suspended, color: 'text-[#DC2626]', icon: Lock },
        ].map((card) => {
          const Icon = card.icon;
          const isSelected = queryParams.status === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setQueryParams({ ...queryParams, status: card.id, page: 1 })}
              className={cn(
                'p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs hover:border-[#047857]',
                isSelected ? 'ring-2 ring-[#047857] border-transparent' : 'border-[#E2E8F0]'
              )}
            >
              <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
                <span>{card.label}</span>
                <Icon className={cn('h-3.5 w-3.5', card.color)} />
              </div>
              <strong className={cn('text-2xl font-bold block mt-1', card.color)}>{card.count}</strong>
            </div>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                id="org-search-input"
                type="text"
                placeholder="Search organizations, tenant ID, domain... (Ctrl + K)"
                value={queryParams.search || ''}
                onChange={(e) => setQueryParams({ ...queryParams, search: e.target.value, page: 1 })}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'trial', label: 'Trial' },
                { id: 'onboarding', label: 'Onboarding' },
                { id: 'at-risk', label: 'At Risk' },
                { id: 'suspended', label: 'Suspended' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setQueryParams({ ...queryParams, status: p.id, page: 1 })}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    queryParams.status === p.id
                      ? 'bg-[#047857] text-white border-[#047857] shadow-xs'
                      : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={queryParams.plan || 'all'}
              onChange={(e) => setQueryParams({ ...queryParams, plan: e.target.value, page: 1 })}
              className="px-3 py-1.5 border rounded-xl bg-white text-xs font-semibold text-[#334155]"
            >
              <option value="all">All Plans</option>
              <option value="Starter">Starter Plan</option>
              <option value="Professional">Professional</option>
              <option value="Business">Business Tier</option>
              <option value="Enterprise">Enterprise Tier</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Desktop Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Employees / Seats</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">MRR</th>
                <th className="py-3 px-4">Lifecycle & Billing</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {data.items.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id)}
                  className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#ECFDF5] text-[#047857] flex items-center justify-center font-bold text-xs">
                        {org.legal_name.charAt(0)}
                      </div>
                      <div>
                        <div className="hover:text-[#047857] hover:underline font-bold text-sm text-[#0F172B]">
                          {org.legal_name}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono font-normal">
                          {org.id} • {org.domain}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <strong
                        className={cn(
                          'text-sm font-bold',
                          org.health_score >= 80 ? 'text-[#047857]' : org.health_score >= 60 ? 'text-[#2563EB]' : 'text-[#DC2626]'
                        )}
                      >
                        {org.health_score} <span className="text-[10px] text-[#64748B] font-normal">/ 100</span>
                      </strong>
                      <span className={cn('text-[10px] font-semibold', org.health_trend >= 0 ? 'text-[#047857]' : 'text-[#DC2626]')}>
                        {org.health_trend >= 0 ? `↑ ${org.health_trend}` : `↓ ${Math.abs(org.health_trend)}`}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-[9px] px-2 py-0.2 rounded-full font-bold inline-block mt-0.5',
                        org.health_grade === 'Healthy'
                          ? 'bg-[#ECFDF5] text-[#047857]'
                          : org.health_grade === 'Watch'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'bg-[#FEF2F2] text-[#DC2626]'
                      )}
                    >
                      ● {org.health_grade}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#F1F5F9] text-[#334155]">
                      {org.plan}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div>
                      <strong className="text-[#0F172B]">{org.active_employees}</strong> / {org.seat_limit}
                    </div>
                    <span className="text-[10px] text-[#64748B]">{org.seat_utilization_pct}% capacity</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="w-24 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mb-1">
                      <div className="h-full bg-[#047857] rounded-full" style={{ width: `${org.seat_utilization_pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#64748B]">{org.storage_used_gb} GB used</span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                    {org.mrr_formatted}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-xs text-[#0F172B]">● {org.lifecycle_state}</div>
                    <div className="text-[10px] text-[#64748B]">Billing: {org.billing_status}</div>
                  </td>

                  <td className="py-3.5 px-4 text-[#64748B]">
                    {org.last_activity_time}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrgId(org.id);
                      }}
                      className="text-xs text-[#047857] border-[#CBD5E1] hover:bg-[#ECFDF5]"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing <strong>1–{data.items.length}</strong> of <strong>{data.total}</strong> organizations
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="text-xs">
              Previous
            </Button>
            <span className="px-2 font-bold text-[#0F172B]">Page 1 of {data.total_pages}</span>
            <Button variant="outline" size="sm" disabled className="text-xs">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------
          5. PROVISION ORGANIZATION WIZARD MODAL (5 STEPS)
         ---------------------------------------------------------------- */}
      {isProvisionWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-5 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#047857] uppercase">Provisioning Wizard</span>
                <h3 className="text-base font-bold text-[#0F172B]">Provision Customer Organization (Step {provisionStep} of 5)</h3>
              </div>
              <button onClick={() => setIsProvisionWizardOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div className="flex items-center gap-2 border-b pb-3">
              {['Organization', 'Primary Admin', 'Subscription', 'Features', 'Review'].map((label, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 text-center py-1.5 rounded-lg font-bold text-[11px]',
                    provisionStep === idx + 1
                      ? 'bg-[#047857] text-white'
                      : provisionStep > idx + 1
                      ? 'bg-[#ECFDF5] text-[#047857]'
                      : 'bg-[#F1F5F9] text-[#94A3B8]'
                  )}
                >
                  {idx + 1}. {label}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* STEP 1: ORGANIZATION */}
              {provisionStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Global Technologies Pvt Ltd"
                      value={provisionForm.legal_name}
                      onChange={(e) => setProvisionForm({ ...provisionForm, legal_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Primary Domain *</label>
                    <input
                      type="text"
                      placeholder="e.g. apextech.io"
                      value={provisionForm.domain}
                      onChange={(e) => setProvisionForm({ ...provisionForm, domain: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold block mb-1">Industry</label>
                      <input
                        type="text"
                        value={provisionForm.industry}
                        onChange={(e) => setProvisionForm({ ...provisionForm, industry: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">City</label>
                      <input
                        type="text"
                        value={provisionForm.city}
                        onChange={(e) => setProvisionForm({ ...provisionForm, city: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PRIMARY ADMIN */}
              {provisionStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Primary Admin Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={provisionForm.admin_name}
                      onChange={(e) => setProvisionForm({ ...provisionForm, admin_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Admin Email Address *</label>
                    <input
                      type="email"
                      placeholder="admin@apextech.io"
                      value={provisionForm.admin_email}
                      onChange={(e) => setProvisionForm({ ...provisionForm, admin_email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: SUBSCRIPTION */}
              {provisionStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block mb-1">Plan Tier</label>
                    <select
                      value={provisionForm.plan}
                      onChange={(e) => setProvisionForm({ ...provisionForm, plan: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                    >
                      <option value="Starter">Starter Tier (50 seats)</option>
                      <option value="Professional">Professional Tier (100 seats)</option>
                      <option value="Business">Business Tier (300 seats)</option>
                      <option value="Enterprise">Enterprise Tier (Dedicated Cluster)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Seat Limit</label>
                    <input
                      type="number"
                      value={provisionForm.seat_limit}
                      onChange={(e) => setProvisionForm({ ...provisionForm, seat_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: FEATURES */}
              {provisionStep === 4 && (
                <div className="space-y-2">
                  <span className="font-semibold block">Select Enabled Module Entitlements</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['Core HR', 'Attendance', 'Leave', 'Payroll', 'Recruitment', 'LMS', 'Expenses', 'WhatsApp', 'Biometric Push'].map((f) => (
                      <label key={f} className="flex items-center gap-2 p-2.5 border rounded-xl bg-[#F8FAFC]">
                        <input type="checkbox" defaultChecked className="accent-[#047857]" />
                        <span className="font-semibold text-xs">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & EXECUTE */}
              {provisionStep === 5 && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2 text-xs">
                    <div>Organization: <strong className="text-[#0F172B]">{provisionForm.legal_name || 'Apex Technologies'}</strong></div>
                    <div>Domain: <strong className="text-[#0F172B]">{provisionForm.domain || 'apextech.io'}</strong></div>
                    <div>Admin: <strong className="text-[#0F172B]">{provisionForm.admin_name} ({provisionForm.admin_email})</strong></div>
                    <div>Plan: <strong className="text-[#047857]">{provisionForm.plan} ({provisionForm.seat_limit} Seats)</strong></div>
                  </div>

                  {provisionProgress.isRunning && (
                    <div className="p-4 bg-[#ECFDF5] rounded-2xl border border-[#A7F3D0] space-y-2">
                      <div className="flex justify-between font-bold text-[#047857]">
                        <span>Provisioning Tenant...</span>
                        <span>{Math.round((provisionProgress.stepsDone / 6) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#A7F3D0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#047857] rounded-full transition-all" style={{ width: `${(provisionProgress.stepsDone / 6) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={provisionStep === 1 || provisionProgress.isRunning}
                onClick={() => setProvisionStep(provisionStep - 1)}
              >
                Previous
              </Button>

              {provisionStep < 5 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setProvisionStep(provisionStep + 1)}
                  className="bg-[#047857] hover:bg-[#036246] text-white"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={provisionProgress.isRunning}
                  onClick={handleExecuteProvision}
                  className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
                >
                  {provisionProgress.isRunning ? 'Provisioning...' : 'Provision Organization'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          6. SYNC MODAL
         ---------------------------------------------------------------- */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#0F172B]">Organization Telemetry Synchronization</h3>
              <button onClick={() => setIsSyncModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {syncState.isSyncing ? (
              <div className="p-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#047857] animate-spin mx-auto" />
                <p className="font-semibold text-[#0F172B]">Synchronizing organizations across cloud clusters...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] space-y-1.5 text-xs">
                  <div className="font-bold text-[#047857]">Synchronization Complete</div>
                  <div className="text-[#065F46]">Processed: <strong>{syncState.result?.processed}</strong> organizations</div>
                  <div className="text-[#065F46]">Updated: <strong>{syncState.result?.updated}</strong></div>
                  <div className="text-[#065F46]">Created: <strong>{syncState.result?.created}</strong></div>
                  <div className="text-[#065F46]">Unchanged: <strong>{syncState.result?.unchanged}</strong></div>
                  <div className="text-[#065F46]">Errors: <strong>{syncState.result?.errors}</strong></div>
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={() => setIsSyncModalOpen(false)} className="bg-[#047857] text-white">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          7. IMPERSONATION MODAL
         ---------------------------------------------------------------- */}
      {impersonateModal.isOpen && impersonateModal.org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#D97706]" />
                <h3 className="text-base font-bold text-[#0F172B]">Impersonate Tenant</h3>
              </div>
              <button onClick={() => setImpersonateModal({ isOpen: false, org: null, reason: '', mode: 'read-only', duration: '15 minutes' })}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#64748B]">
              You are about to access <strong>{impersonateModal.org.legal_name}</strong> as an administrative user. This action is logged in the security audit trail.
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Access Mode</label>
                <select
                  value={impersonateModal.mode}
                  onChange={(e) => setImpersonateModal({ ...impersonateModal, mode: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  <option value="read-only">Read-Only Diagnostic</option>
                  <option value="full-support">Full Support Administrative</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Impersonation *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Diagnosing ZK-Teco biometric push sync latency..."
                  value={impersonateModal.reason}
                  onChange={(e) => setImpersonateModal({ ...impersonateModal, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setImpersonateModal({ isOpen: false, org: null, reason: '', mode: 'read-only', duration: '15 minutes' })}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleStartImpersonation} className="bg-[#D97706] hover:bg-[#B45309] text-white">
                Start Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          8. SUSPEND MODAL
         ---------------------------------------------------------------- */}
      {suspendModal.isOpen && suspendModal.org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#DC2626]" />
                <h3 className="text-base font-bold text-[#0F172B]">Suspend Organization</h3>
              </div>
              <button onClick={() => setSuspendModal({ isOpen: false, org: null, reason: '', notifyAdmin: true })}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] text-[#991B1B]">
              <strong>Impact:</strong> All tenant employees and administrators will instantly lose platform login access.
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Suspension Reason *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Multiple payment defaults and prolonged admin inactivity..."
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={suspendModal.notifyAdmin}
                  onChange={(e) => setSuspendModal({ ...suspendModal, notifyAdmin: e.target.checked })}
                  className="accent-[#DC2626]"
                />
                <span>Notify tenant super admin via email</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setSuspendModal({ isOpen: false, org: null, reason: '', notifyAdmin: true })}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSuspendConfirm} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                Suspend Organization
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
