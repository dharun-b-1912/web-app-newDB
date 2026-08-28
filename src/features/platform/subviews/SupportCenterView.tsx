// src/features/platform/subviews/SupportCenterView.tsx
// ============================================================
// Joy PeopleHR — Production Support Center & Case Management Console
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Key,
  Shield,
  RefreshCw,
  Plus,
  Server,
  Play,
  XCircle,
  Activity,
  Layers,
  X,
  Search,
  Filter,
  User,
  Users,
  ChevronRight,
  MessageSquare,
  FileText,
  Lock,
  ExternalLink,
  Send,
  Sparkles,
  Paperclip,
  Check,
  ShieldCheck,
  BarChart3,
  BookOpen,
  History,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sliders,
  Globe,
  Zap,
  Info,
  ChevronDown,
} from 'lucide-react';
import {
  SupportCase,
  SupportMessage,
  SupportAccessRequest,
  KnowledgeArticle,
  CustomerActivityEvent,
  SupportCenterMetrics,
  SupportStatus,
  SupportPriority,
  SupportCategory,
} from '../../../types/supportCenter';
import { platformSupportCenterService } from '../../../services/platform/platformSupportCenterService';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { cn } from '../../../lib/utils';

export interface SupportCenterViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SupportCenterView: React.FC<SupportCenterViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  const [activeTab, setActiveTab] = useState<string>('cases');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Real Data Sources
  const [metrics, setMetrics] = useState<SupportCenterMetrics>(() => platformSupportCenterService.getMetrics());
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [accessRequests, setAccessRequests] = useState<SupportAccessRequest[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [customerActivity, setCustomerActivity] = useState<CustomerActivityEvent[]>([]);

  // Selected Case Detail Workspace
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);

  // Active Impersonation Session Banner State
  const [activeImpersonation, setActiveImpersonation] = useState<{
    tenant_name: string;
    target_user: string;
    expires_at: string;
  } | null>(null);

  // Modals
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // New Case Form
  const [newCaseForm, setNewCaseForm] = useState({
    tenant_id: 'org-acme-01',
    tenant_name: 'ABC Manufacturing',
    tenant_plan: 'Enterprise' as const,
    requester_name: '',
    requester_email: '',
    subject: '',
    description: '',
    category: 'Attendance' as SupportCategory,
    priority: 'Medium' as SupportPriority,
    assignee_name: '',
    team: 'General Support',
  });

  // Reply Form
  const [replyBody, setReplyBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Resolution Form
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionCode, setResolutionCode] = useState('Configuration Adjusted');

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [met, caseList, accReqs, arts, acts] = await Promise.all([
        platformSupportCenterService.fetchMetrics(),
        platformSupportCenterService.fetchCases(),
        platformSupportCenterService.fetchAccessRequests(),
        platformSupportCenterService.fetchKnowledgeArticles(),
        platformSupportCenterService.fetchCustomerActivity(),
      ]);

      setMetrics(met);
      setCases(caseList);
      setAccessRequests(accReqs);
      setArticles(arts);
      setCustomerActivity(acts);
      setLastSyncTime(new Date().toLocaleTimeString());

      // Update selected case if open
      if (selectedCase) {
        const fresh = caseList.find((c) => c.id === selectedCase.id || c.case_number === selectedCase.case_number);
        if (fresh) setSelectedCase(fresh);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load support center data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCase]);

  // Initial Load & Realtime Subscription
  useEffect(() => {
    loadData();

    const unsubscribe = platformSupportCenterService.subscribeToRealtime(() => {
      loadData(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
  };

  // Filtered Cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Tab matching
      if (activeTab === 'my-queue' && c.assignee_name !== 'Super Admin' && c.assignee_name !== 'WorkForce Support') {
        // Return open cases assigned to current platform session user
      }
      if (activeTab === 'sla' && c.sla_status !== 'At Risk' && c.sla_status !== 'Breached' && c.status !== 'Escalated') {
        return false;
      }

      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      const matchCategory = categoryFilter === 'All' || c.category === categoryFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.case_number.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.tenant_name.toLowerCase().includes(q) ||
        c.requester_name.toLowerCase().includes(q) ||
        c.requester_email.toLowerCase().includes(q) ||
        (c.assignee_name && c.assignee_name.toLowerCase().includes(q));

      return matchStatus && matchPriority && matchCategory && matchSearch;
    });
  }, [cases, activeTab, statusFilter, priorityFilter, categoryFilter, searchQuery]);

  // Handle Case Creation
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseForm.subject || !newCaseForm.requester_name || !newCaseForm.requester_email) {
      alert('Please fill all required fields');
      return;
    }

    const res = await platformSupportCenterService.createCase({
      tenant_id: newCaseForm.tenant_id,
      tenant_name: newCaseForm.tenant_name,
      tenant_plan: newCaseForm.tenant_plan,
      requester_name: newCaseForm.requester_name,
      requester_email: newCaseForm.requester_email,
      subject: newCaseForm.subject,
      description: newCaseForm.description,
      category: newCaseForm.category,
      priority: newCaseForm.priority,
      assignee_name: newCaseForm.assignee_name || undefined,
      team: newCaseForm.team,
    });

    if (res.success) {
      setIsNewCaseModalOpen(false);
      setNewCaseForm({
        tenant_id: 'org-acme-01',
        tenant_name: 'ABC Manufacturing',
        tenant_plan: 'Enterprise',
        requester_name: '',
        requester_email: '',
        subject: '',
        description: '',
        category: 'Attendance',
        priority: 'Medium',
        assignee_name: '',
        team: 'General Support',
      });
      await loadData(true);
    } else {
      alert(res.error || 'Failed to create support case');
    }
  };

  // Handle Add Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !replyBody.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await platformSupportCenterService.addMessage({
        case_id: selectedCase.id,
        author_name: 'Platform Support Lead',
        author_role: 'Support Lead',
        type: isInternalNote ? 'internal_note' : 'agent',
        visibility: isInternalNote ? 'internal' : 'customer',
        body: replyBody.trim(),
      });

      if (res.success) {
        setReplyBody('');
        await loadData(true);
      }
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusTransition = async (newStatus: SupportStatus) => {
    if (!selectedCase) return;

    if (newStatus === 'Resolved') {
      setIsResolveModalOpen(true);
      return;
    }

    const res = await platformSupportCenterService.transitionStatus({
      case_id: selectedCase.id,
      new_status: newStatus,
      actor_name: 'Platform Support Lead',
    });

    if (res.success) {
      await loadData(true);
    }
  };

  // Handle Submit Resolution
  const handleConfirmResolution = async () => {
    if (!selectedCase) return;

    const res = await platformSupportCenterService.transitionStatus({
      case_id: selectedCase.id,
      new_status: 'Resolved',
      actor_name: 'Platform Support Lead',
      resolution_code: resolutionCode,
      resolution_summary: resolutionSummary || 'Resolved by Platform Operations Team',
    });

    if (res.success) {
      setIsResolveModalOpen(false);
      setResolutionSummary('');
      await loadData(true);
    }
  };

  // Handle Self-Assign
  const handleAssignToMe = async (caseItem: SupportCase) => {
    const res = await platformSupportCenterService.reassignCase({
      case_id: caseItem.id,
      new_assignee_name: 'Super Admin',
      new_team: 'Tier 2 Engineering Support',
      actor_name: 'Super Admin',
      reason: 'Self-assigned from Support Center console',
    });

    if (res.success) {
      await loadData(true);
    }
  };

  // Handle Access Approval
  const handleApproveAccess = async (reqId: string, tenantName: string, targetUser: string) => {
    const res = await platformSupportCenterService.approveAccessRequest(reqId, 'Super Admin', 30);
    if (res.success) {
      setActiveImpersonation({
        tenant_name: tenantName,
        target_user: targetUser,
        expires_at: '30 mins remaining',
      });
      await loadData(true);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ---------------------------------------------------------
          Active Impersonation / Controlled Access Banner
         --------------------------------------------------------- */}
      {activeImpersonation && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#D97706] flex-shrink-0" />
            <div>
              <strong className="font-bold text-xs uppercase tracking-wider text-[#B45309]">
                Controlled Support Access Active:
              </strong>
              <span className="text-xs ml-1 font-semibold text-[#78350F]">
                {activeImpersonation.tenant_name} (Impersonating {activeImpersonation.target_user})
              </span>
              <span className="text-[11px] text-[#92400E] block sm:inline sm:ml-2">
                • {activeImpersonation.expires_at}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveImpersonation(null)}
              className="border-[#D97706] text-[#78350F] hover:bg-[#FEF3C7] text-xs h-7"
            >
              Exit Access Session
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          1. Header & Operational Status
         --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Support Center</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Support Operations Online
            </span>
            <span className="text-[11px] text-[#64748B] hidden sm:inline">
              Synchronized: {lastSyncTime}
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Manage tenant requests, customer issues, escalations, SLA response, and controlled support access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn('h-4 w-4 text-[#64748B]', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#0F172B] hover:bg-[#F8FAFC]"
          >
            <BarChart3 className="h-4 w-4 text-[#64748B]" />
            Reports
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewCaseModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#007A5A] hover:bg-[#00664B] text-white shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Support Case
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. Top Dynamic KPI Cards
         --------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Open Cases */}
        <div
          onClick={() => {
            setActiveTab('cases');
            setStatusFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#007A5A]',
            activeTab === 'cases' && statusFilter === 'All' && 'ring-2 ring-[#007A5A] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Open Cases</span>
            <LifeBuoy className="h-3.5 w-3.5 text-[#007A5A]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1 flex items-baseline gap-2">
            <span>{metrics.open_cases_count}</span>
            <span className="text-[11px] text-[#059669] font-medium">+{metrics.open_cases_today_delta} today</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Active customer tickets</p>
        </div>

        {/* SLA At Risk */}
        <div
          onClick={() => {
            setActiveTab('sla');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#D97706]',
            activeTab === 'sla' && 'ring-2 ring-[#D97706] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">SLA At Risk</span>
            <Clock className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="text-xl font-bold text-[#D97706] mt-1 flex items-baseline gap-2">
            <span>{metrics.sla_at_risk_count}</span>
            <span className="text-[11px] text-[#DC2626] font-medium">{metrics.sla_critical_count} critical</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Due within 60 mins</p>
        </div>

        {/* Unassigned */}
        <div
          onClick={() => {
            setActiveTab('cases');
            setStatusFilter('All');
            setSearchQuery('');
          }}
          className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#2563EB]"
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Unassigned</span>
            <Users className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1 flex items-baseline gap-2">
            <span>{metrics.unassigned_count}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-bold">Needs triage</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Unassigned in queue</p>
        </div>

        {/* Escalated */}
        <div
          onClick={() => {
            setActiveTab('cases');
            setStatusFilter('Escalated');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#DC2626]',
            statusFilter === 'Escalated' && 'ring-2 ring-[#DC2626] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Escalated</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <div className="text-xl font-bold text-[#DC2626] mt-1 flex items-baseline gap-2">
            <span>{metrics.escalated_count}</span>
            <span className="text-[11px] text-[#64748B] font-medium">{metrics.escalated_platform_count} platform</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Engineering / Ops</p>
        </div>

        {/* Access Requests */}
        <div
          onClick={() => setActiveTab('access')}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#7C3AED]',
            activeTab === 'access' && 'ring-2 ring-[#7C3AED] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Access Requests</span>
            <Key className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <div className="text-xl font-bold text-[#7C3AED] mt-1 flex items-baseline gap-2">
            <span>{metrics.pending_access_requests_count}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EDE9FE] text-[#6D28D9] font-bold">Awaiting approval</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Controlled impersonation</p>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Sub-Navigation Tabs with Real Counts
         --------------------------------------------------------- */}
      <div className="flex border-b border-[#E2E8F0] gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'cases', label: 'Cases', count: cases.length, icon: LifeBuoy },
          { id: 'my-queue', label: 'My Queue', count: cases.filter((c) => c.assignee_name === 'Super Admin').length, icon: User },
          { id: 'sla', label: 'SLA & Escalations', count: metrics.sla_at_risk_count + metrics.escalated_count, icon: AlertTriangle },
          { id: 'access', label: 'Access Requests', count: accessRequests.filter((r) => r.status === 'Pending').length, icon: Key },
          { id: 'knowledge', label: 'Knowledge Base', count: articles.length, icon: BookOpen },
          { id: 'activity', label: 'Customer Activity', icon: Activity },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                isActive
                  ? 'border-[#007A5A] text-[#007A5A]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-[#E6F4EA] text-[#007A5A]' : 'bg-[#F1F5F9] text-[#64748B]'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------
          4. TAB CONTENT: CASES & QUEUE & SLA
         --------------------------------------------------------- */}
      {(activeTab === 'cases' || activeTab === 'my-queue' || activeTab === 'sla') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search case #, tenant, subject, requester, assignee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#007A5A]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Customer">Waiting for Customer</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Attendance">Attendance</option>
                <option value="Payroll">Payroll</option>
                <option value="Biometric">Biometric</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Employee">Employee</option>
                <option value="Billing">Billing</option>
                <option value="API">API & Integration</option>
                <option value="Security">Security</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs text-[#0F172B]"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Cases Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Case & Subject</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">SLA Timer</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-4"><div className="h-4 w-40 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-28 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-16 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-16 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4 text-right"><div className="h-6 w-24 bg-[#E2E8F0] rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#DC2626]">
                        <AlertTriangle className="h-8 w-8 text-[#DC2626] mx-auto mb-2" />
                        <div className="font-bold text-sm">Unable to load support cases</div>
                        <p className="text-xs text-[#64748B] mt-1">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => loadData(false)} className="mt-3">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                        </Button>
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#64748B]">
                        <LifeBuoy className="h-8 w-8 text-[#007A5A] mx-auto mb-2" />
                        <div className="font-bold text-sm text-[#0F172B]">No support cases found</div>
                        <p className="text-xs text-[#64748B] mt-1">
                          Try adjusting your search criteria or create a new support case.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        {/* Case & Subject */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-mono font-bold text-[#007A5A]">{c.case_number}</div>
                          <div className="font-semibold text-[#0F172B] truncate mt-0.5">{c.subject}</div>
                        </td>

                        {/* Tenant */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0F172B]">{c.tenant_name}</div>
                          <div className="text-[10px] text-[#64748B]">{c.tenant_plan} Tier</div>
                        </td>

                        {/* Requester */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0F172B]">{c.requester_name}</div>
                          <div className="text-[10px] text-[#64748B]">{c.requester_email}</div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#334155]">
                          <span className="px-2 py-0.5 rounded bg-[#F1F5F9]">{c.category}</span>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              c.priority === 'Critical'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : c.priority === 'High'
                                ? 'bg-[#FFFBEB] text-[#D97706]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            )}
                          >
                            {c.priority}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="py-3.5 px-4">
                          {c.assignee_name ? (
                            <div className="flex items-center gap-1.5">
                              <span className="h-5 w-5 rounded-full bg-[#E0E7FF] text-[#3730A3] font-bold text-[9px] flex items-center justify-center">
                                {c.assignee_name.charAt(0)}
                              </span>
                              <span className="font-medium text-[#0F172B]">{c.assignee_name}</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignToMe(c);
                              }}
                              className="text-[11px] font-semibold text-[#007A5A] hover:underline"
                            >
                              + Assign to Me
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                              c.status === 'Resolved' || c.status === 'Closed'
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : c.status === 'Escalated'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : c.status === 'In Progress'
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : c.status === 'Waiting for Customer'
                                ? 'bg-[#FFFBEB] text-[#D97706]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            )}
                          >
                            {c.status}
                          </span>
                        </td>

                        {/* SLA Timer */}
                        <td className="py-3.5 px-4">
                          <div
                            className={cn(
                              'flex items-center gap-1 font-mono text-[11px] font-bold',
                              c.sla_status === 'Breached'
                                ? 'text-[#DC2626]'
                                : c.sla_remaining_minutes && c.sla_remaining_minutes <= 60
                                ? 'text-[#D97706]'
                                : 'text-[#059669]'
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {c.sla_status === 'Breached'
                              ? 'SLA Breached'
                              : `${c.sla_remaining_minutes || 45}m remaining`}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCase(c)}
                            className="text-xs text-[#0F172B] hover:bg-[#F8FAFC] h-7"
                          >
                            Open Workspace
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          5. TAB CONTENT: ACCESS REQUESTS
         --------------------------------------------------------- */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#0F172B]">Controlled Tenant Support Access Requests</h3>
              <span className="text-xs text-[#64748B]">All actions are bound to 30-minute auto-expiring tokens</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                    <th className="py-2.5 px-3">Request #</th>
                    <th className="py-2.5 px-3">Tenant Target</th>
                    <th className="py-2.5 px-3">Support Agent</th>
                    <th className="py-2.5 px-3">Target User</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {accessRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#64748B]">
                        No pending access requests at this time.
                      </td>
                    </tr>
                  ) : (
                    accessRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-3 font-mono font-bold text-[#0F172B]">{req.request_number}</td>
                        <td className="py-3 px-3 font-bold text-[#0F172B]">{req.tenant_name}</td>
                        <td className="py-3 px-3">{req.requester_name}</td>
                        <td className="py-3 px-3 font-medium">{req.target_user_name}</td>
                        <td className="py-3 px-3 text-[#64748B] max-w-xs truncate">{req.reason}</td>
                        <td className="py-3 px-3 font-mono">{req.duration_minutes} mins</td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              req.status === 'Active'
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : req.status === 'Pending'
                                ? 'bg-[#EDE9FE] text-[#6D28D9]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            )}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {req.status === 'Pending' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveAccess(req.id, req.tenant_name, req.target_user_name)}
                              className="bg-[#007A5A] hover:bg-[#00664B] text-white text-xs h-7"
                            >
                              Approve & Start
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          6. TAB CONTENT: KNOWLEDGE BASE
         --------------------------------------------------------- */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((art) => (
              <div key={art.id} className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                  {art.category}
                </span>
                <h4 className="font-bold text-sm text-[#0F172B]">{art.title}</h4>
                <p className="text-xs text-[#64748B] line-clamp-3">{art.summary}</p>
                <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-[11px] text-[#94A3B8]">
                  <span>{art.view_count} views</span>
                  <span className="text-[#007A5A] font-semibold cursor-pointer hover:underline">Read Article →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          7. TAB CONTENT: CUSTOMER ACTIVITY & REPORTS
         --------------------------------------------------------- */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#0F172B]">Real-Time Cross-Tenant Telemetry Stream</h3>
          <div className="space-y-2">
            {customerActivity.map((act) => (
              <div key={act.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-[#2563EB]" />
                  <div>
                    <strong className="text-[#0F172B]">{act.tenant_name}: </strong>
                    <span className="text-[#334155]">{act.summary}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#94A3B8]">{act.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#0F172B] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#007A5A]" /> SLA Compliance & Response Benchmark
            </h3>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <div className="text-[11px] text-[#64748B]">SLA Compliance</div>
                <div className="text-xl font-bold text-[#047857]">{metrics.sla_compliance_pct}%</div>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <div className="text-[11px] text-[#64748B]">Avg Response</div>
                <div className="text-xl font-bold text-[#0F172B]">{metrics.avg_first_response_min} min</div>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <div className="text-[11px] text-[#64748B]">Avg Resolution</div>
                <div className="text-xl font-bold text-[#0F172B]">{metrics.avg_resolution_hours} hrs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          8. CASE WORKSPACE DRAWER (Full 3-Column Layout)
         --------------------------------------------------------- */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col font-sans overflow-hidden border-l border-[#E2E8F0]">
            {/* Workspace Header */}
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#007A5A]">{selectedCase.case_number}</span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedCase.priority === 'Critical'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : selectedCase.priority === 'High'
                        ? 'bg-[#FFFBEB] text-[#D97706]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    )}
                  >
                    {selectedCase.priority} Priority
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold">
                    {selectedCase.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#0F172B]">{selectedCase.subject}</h2>
                <div className="text-xs text-[#64748B]">
                  {selectedCase.tenant_name} • Requester: {selectedCase.requester_name} ({selectedCase.requester_email})
                </div>
              </div>

              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Workspace Body: 2-Column Split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Messages Timeline */}
              <div className="flex-1 flex flex-col border-r border-[#E2E8F0] overflow-hidden">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-[#FAFBFD]">
                  {selectedCase.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'p-3.5 rounded-xl border space-y-1.5 max-w-[90%]',
                        m.type === 'internal_note'
                          ? 'bg-[#FFFBEB] border-[#FDE68A] ml-auto text-[#78350F]'
                          : m.type === 'agent'
                          ? 'bg-white border-[#CBD5E1] ml-auto shadow-sm'
                          : m.type === 'system'
                          ? 'bg-[#F1F5F9] border-[#E2E8F0] mx-auto text-center text-[#64748B]'
                          : 'bg-[#F0FDF4] border-[#BBF7D0] mr-auto'
                      )}
                    >
                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <span className="flex items-center gap-1">
                          {m.type === 'internal_note' && <Lock className="h-3 w-3 text-[#D97706]" />}
                          {m.author_name} ({m.author_role})
                        </span>
                        <span className="font-mono text-[#94A3B8]">{new Date(m.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Composer */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(false)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors',
                          !isInternalNote ? 'bg-[#007A5A] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                        )}
                      >
                        Public Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(true)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1',
                          isInternalNote ? 'bg-[#D97706] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                        )}
                      >
                        <Lock className="h-3 w-3" /> Internal Note
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      isInternalNote
                        ? 'Type private note for support & engineering team...'
                        : 'Reply directly to customer requester...'
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#007A5A]"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSendingReply || !replyBody.trim()}
                      className={cn(
                        'text-xs font-semibold',
                        isInternalNote ? 'bg-[#D97706] hover:bg-[#B45309]' : 'bg-[#007A5A] hover:bg-[#00664B]'
                      )}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {isInternalNote ? 'Save Internal Note' : 'Send Reply'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Right Column: Case Controls & Tenant Context */}
              <div className="w-80 p-4 space-y-4 text-xs overflow-y-auto bg-white">
                {/* Actions & Lifecycle */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#0F172B] uppercase tracking-wider text-[10px]">Case Actions</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusTransition('In Progress')}
                      className="text-xs h-8 justify-center"
                    >
                      In Progress
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusTransition('Waiting for Customer')}
                      className="text-xs h-8 justify-center"
                    >
                      Wait Customer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusTransition('Escalated')}
                      className="text-xs h-8 justify-center text-[#DC2626] border-[#FCA5A5]"
                    >
                      Escalate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsResolveModalOpen(true)}
                      className="text-xs h-8 justify-center text-[#047857] border-[#86EFAC]"
                    >
                      Resolve Case
                    </Button>
                  </div>
                </div>

                {/* Tenant & SLA Overview */}
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">SLA Policy:</span>
                    <strong className="text-[#0F172B]">{selectedCase.sla_policy_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Resolution Due:</span>
                    <span className="font-mono text-[#0F172B]">
                      {new Date(selectedCase.resolution_due_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Assignee:</span>
                    <strong className="text-[#0F172B]">{selectedCase.assignee_name || 'Unassigned'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          9. NEW SUPPORT CASE MODAL
         --------------------------------------------------------- */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172B]">Create New Support Case</h3>
              <button onClick={() => setIsNewCaseModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Tenant Organization *</label>
                <input
                  type="text"
                  required
                  value={newCaseForm.tenant_name}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, tenant_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Requester Name *</label>
                  <input
                    type="text"
                    required
                    value={newCaseForm.requester_name}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, requester_name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Requester Email *</label>
                  <input
                    type="email"
                    required
                    value={newCaseForm.requester_email}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, requester_email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Category *</label>
                  <select
                    value={newCaseForm.category}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  >
                    <option value="Attendance">Attendance</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Biometric">Biometric</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Employee">Employee</option>
                    <option value="Billing">Billing</option>
                    <option value="API">API</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Priority *</label>
                  <select
                    value={newCaseForm.priority}
                    onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Subject / Issue Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Missing attendance punches from biometric gateway"
                  value={newCaseForm.subject}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, subject: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  value={newCaseForm.description}
                  onChange={(e) => setNewCaseForm({ ...newCaseForm, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsNewCaseModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#007A5A] hover:bg-[#00664B] text-white">
                  Create Support Case
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          10. RESOLUTION CONFIRMATION MODAL
         --------------------------------------------------------- */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <h3 className="text-base font-bold text-[#0F172B]">Resolve Support Case</h3>
            <p className="text-xs text-[#64748B]">
              Provide a resolution code and summary before marking this case as Resolved.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Resolution Code</label>
                <select
                  value={resolutionCode}
                  onChange={(e) => setResolutionCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                >
                  <option value="Configuration Adjusted">Configuration Adjusted</option>
                  <option value="Bug Fixed">Bug Fixed</option>
                  <option value="User Guidance Provided">User Guidance Provided</option>
                  <option value="Hardware Resynced">Hardware Resynced</option>
                  <option value="Third-Party Resolved">Third-Party Resolved</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Resolution Summary</label>
                <textarea
                  rows={3}
                  placeholder="Explain actions taken to resolve the issue..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <Button variant="outline" size="sm" onClick={() => setIsResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmResolution} className="bg-[#007A5A] text-white">
                Confirm Resolution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
