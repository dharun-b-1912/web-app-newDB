// src/features/platform/subviews/SalesPipelineView.tsx
// ============================================================================
// Joy PeopleHR — Commercial Sales Team, Pipeline & Enterprise Deals Engine
// Manages Authoritative Sales Owners, Reps, Quotas, and Opportunity Funnels
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Globe,
  Award,
  BarChart3,
  Edit2,
  Trash2,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import {
  CommercialSalesOwner,
  CrmOpportunity,
  CrmLead,
  OpportunityStage,
} from '../../../types/saasCommercial';
import { saasCommercialService } from '../../../services/platform/saasCommercialService';
import { platformStaffService } from '../../../services/platform/platformStaffService';
import { cn } from '../../../lib/utils';

export interface SalesPipelineViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SalesPipelineView: React.FC<SalesPipelineViewProps> = ({ onNavigateTab }) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'reps' | 'pipeline' | 'leads' | 'analytics'>('reps');
  const [dataVersion, setDataVersion] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  const refreshData = () => setDataVersion((v) => v + 1);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await saasCommercialService.refreshFromSupabase();
      refreshData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('Live cloud data synchronized successfully.', 'success');
    } catch {
      showToast('Synchronization completed.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync with live backend on mount and when commercial data updates
  useEffect(() => {
    saasCommercialService.refreshFromSupabase().then(() => {
      refreshData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });
    const handleUpdate = () => refreshData();
    window.addEventListener('commercial:data_updated', handleUpdate);
    return () => window.removeEventListener('commercial:data_updated', handleUpdate);
  }, []);

  // Data collections
  const salesOwners = useMemo(() => saasCommercialService.getSalesOwners(), [dataVersion]);
  const opportunities = useMemo(() => saasCommercialService.getOpportunities(), [dataVersion]);
  const leads = useMemo(() => saasCommercialService.getLeads(), [dataVersion]);
  const pipelineMetrics = useMemo(() => saasCommercialService.getSalesPipelineMetrics(), [dataVersion]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Modals
  const [showAddOwnerModal, setShowAddOwnerModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<CommercialSalesOwner | null>(null);
  const [showAddDealModal, setShowAddDealModal] = useState(false);

  // Form states - Add/Edit Owner
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formOwnerPhone, setFormOwnerPhone] = useState('');
  const [formOwnerDesignation, setFormOwnerDesignation] = useState('Commercial Account Executive');
  const [formOwnerTerritory, setFormOwnerTerritory] = useState('India (South)');
  const [formOwnerQuota, setFormOwnerQuota] = useState<number>(10000000); // 1 Cr
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Form states - Add Deal
  const [formDealName, setFormDealName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEstimatedArr, setFormEstimatedArr] = useState<number>(450000);
  const [formStage, setFormStage] = useState<OpportunityStage>('PROPOSAL');
  const [formProbability, setFormProbability] = useState<number>(75);
  const [formCloseDate, setFormCloseDate] = useState<string>('2026-11-30');
  const [formSalesOwnerId, setFormSalesOwnerId] = useState<string>('');

  // Available staff from IAM
  const availableStaff = useMemo(() => {
    try {
      return platformStaffService.getStaffList();
    } catch {
      return [];
    }
  }, []);

  const openAddOwnerModal = () => {
    setEditingOwner(null);
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormOwnerPhone('');
    setFormOwnerDesignation('Commercial Account Executive');
    setFormOwnerTerritory('National / Enterprise Accounts');
    setFormOwnerQuota(10000000);
    setSelectedStaffId('');
    setShowAddOwnerModal(true);
  };

  const openEditOwnerModal = (owner: CommercialSalesOwner) => {
    setEditingOwner(owner);
    setFormOwnerName(owner.name);
    setFormOwnerEmail(owner.email);
    setFormOwnerPhone(owner.phone || '');
    setFormOwnerDesignation(owner.designation);
    setFormOwnerTerritory(owner.territory);
    setFormOwnerQuota(owner.annualQuotaArr);
    setSelectedStaffId(owner.staffId || '');
    setShowAddOwnerModal(true);
  };

  const handleSelectStaffForOwner = (staffId: string) => {
    setSelectedStaffId(staffId);
    const staff = availableStaff.find((s) => s.id === staffId);
    if (staff) {
      setFormOwnerName(staff.name);
      setFormOwnerEmail(staff.email);
      setFormOwnerPhone(staff.phone || '');
      setFormOwnerDesignation(staff.job_title || 'Enterprise Commercial Lead');
    }
  };

  const handleSaveOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOwnerName.trim() || !formOwnerEmail.trim()) {
      showToast('Please provide a name and email for the sales owner.', 'error');
      return;
    }

    const newOwner: CommercialSalesOwner = {
      id: editingOwner?.id || `so-${Date.now()}`,
      staffId: selectedStaffId || undefined,
      name: formOwnerName.trim(),
      email: formOwnerEmail.trim(),
      phone: formOwnerPhone.trim(),
      designation: formOwnerDesignation.trim(),
      territory: formOwnerTerritory.trim(),
      annualQuotaArr: Number(formOwnerQuota) || 10000000,
      closedWonArr: editingOwner?.closedWonArr || 0,
      activeDealsCount: editingOwner?.activeDealsCount || 0,
      totalPipelineValue: editingOwner?.totalPipelineValue || 0,
      winRatePct: editingOwner?.winRatePct || 75,
      status: 'Active',
      createdAt: editingOwner?.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    saasCommercialService.saveSalesOwner(newOwner);
    showToast(
      editingOwner
        ? `Sales Owner ${newOwner.name} updated successfully.`
        : `New Sales Owner ${newOwner.name} registered.`,
      'success'
    );
    setShowAddOwnerModal(false);
    refreshData();
  };

  const handleDeleteOwner = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from active sales owners?`)) {
      saasCommercialService.deleteSalesOwner(id);
      showToast(`Sales owner ${name} removed.`, 'info');
      refreshData();
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompanyName.trim() || !formDealName.trim()) {
      showToast('Please fill out the deal title and client company name.', 'error');
      return;
    }

    const assignedRep = salesOwners.find((so) => so.id === formSalesOwnerId) || salesOwners[0];
    const repName = assignedRep ? `${assignedRep.name} (${assignedRep.designation})` : 'Commercial Desk';
    const newOpp: CrmOpportunity = {
      id: `opp-${Date.now()}`,
      opportunityNumber: `OPP-2026-00${opportunities.length + 35}`,
      dealName: formDealName.trim(),
      companyName: formCompanyName.trim(),
      contactPerson: formContactPerson.trim() || 'Head of Procurement',
      designation: 'Decision Maker',
      email: formEmail.trim() || 'procurement@client.com',
      phone: formPhone.trim() || '+91 98401 00000',
      industry: 'Enterprise Services',
      estimatedEmployees: 250,
      locationsCount: 2,
      legalEntitiesCount: 1,
      estimatedArr: Number(formEstimatedArr) || 450000,
      probability: Number(formProbability) || 70,
      expectedCloseDate: formCloseDate,
      salesOwner: repName,
      stage: formStage,
      capturedRequirements: ['Core HR', 'Attendance', 'Payroll'],
      originType: 'NEW_CUSTOMER',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    saasCommercialService.saveOpportunity(newOpp);
    showToast(`Opportunity "${newOpp.dealName}" created under ${repName}.`, 'success');
    setShowAddDealModal(false);
    refreshData();
  };

  const handleDeleteDeal = async (dealId: string, dealName: string) => {
    if (!window.confirm(`Are you sure you want to delete deal "${dealName}"? This action will remove it permanently from the database.`)) {
      return;
    }
    await saasCommercialService.deleteOpportunity(dealId);
    showToast(`Opportunity "${dealName}" deleted.`, 'info');
    refreshData();
  };

  const handleDeleteLead = async (leadId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete lead for "${companyName}"? This action will remove it permanently from the database.`)) {
      return;
    }
    await saasCommercialService.deleteLead(leadId);
    showToast(`Lead "${companyName}" deleted.`, 'info');
    refreshData();
  };

  // Filtered lists
  const filteredOwners = useMemo(() => {
    return salesOwners.filter((so) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          so.name.toLowerCase().includes(q) ||
          so.email.toLowerCase().includes(q) ||
          so.designation.toLowerCase().includes(q) ||
          so.territory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salesOwners, searchQuery]);

  const filteredDeals = useMemo(() => {
    return opportunities.filter((opp) => {
      if (stageFilter !== 'ALL' && opp.stage !== stageFilter) return false;
      if (ownerFilter !== 'ALL' && !opp.salesOwner?.toLowerCase().includes(ownerFilter.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          opp.dealName.toLowerCase().includes(q) ||
          opp.companyName.toLowerCase().includes(q) ||
          opp.salesOwner?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [opportunities, stageFilter, ownerFilter, searchQuery]);

  const formatLakhs = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 pb-16 font-sans animate-in fade-in">
      {/* ── 1. Top Header & Primary Action Toolbar ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Commercial Sales & Pipeline Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
              ● Live Sales Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Authoritative registry of commercial owners, enterprise quotas, inbound prospect deals, and deal velocity tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            title={`Last synced: ${lastSyncedTime}. Click to fetch latest data directly from Supabase.`}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#047857]", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab?.('platform-quotations')}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-[#047857]" />
            Quotations Desk
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDealModal(true)}
            className="border-[#047857]/40 text-[#047857] hover:bg-emerald-50 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + New Deal
          </Button>

          <Button
            size="sm"
            onClick={openAddOwnerModal}
            className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            + Add Sales Owner
          </Button>
        </div>
      </div>

      {/* ── 2. Top KPI Metric Tiles ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Open Pipeline
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatLakhs(pipelineMetrics.openPipeline)}
          </div>
          <p className="text-[11.5px] text-blue-600 font-medium mt-1">
            Weighted: {formatLakhs(pipelineMetrics.weightedPipeline)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Closed ARR Achieved
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {formatLakhs(pipelineMetrics.closedWonArr)}
          </div>
          <p className="text-[11.5px] text-emerald-700 font-medium mt-1">
            {pipelineMetrics.closedWonCount} Converted Deals
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Win & Conversion Rate
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {pipelineMetrics.conversionRate}%
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">Opportunity to Contract</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Commercial Team
          </span>
          <div className="mt-2 text-2xl font-bold text-purple-700">
            {pipelineMetrics.activeRepsCount} Sales Owners
          </div>
          <p className="text-[11.5px] text-purple-600 font-medium mt-1">
            Lead: {pipelineMetrics.topRepName}
          </p>
        </div>
      </div>

      {/* ── 3. Sub-Navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { id: 'reps', label: 'Commercial Sales Owners & Quotas', icon: Users, badge: salesOwners.length },
          { id: 'pipeline', label: 'Deals & Opportunities Pipeline', icon: Target, badge: opportunities.length },
          { id: 'leads', label: 'Inbound & Outbound Leads', icon: Briefcase, badge: leads.length },
          { id: 'analytics', label: 'Quota Performance & Funnel', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer',
                isActive
                  ? 'bg-emerald-50 text-[#047857] border border-emerald-200 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  isActive ? 'bg-[#047857] text-white' : 'bg-slate-100 text-slate-600'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: SALES OWNERS & REPS ─────────────────────────────────────── */}
      {activeTab === 'reps' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sales owner by name, email, territory, or designation..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong>{filteredOwners.length}</strong> active commercial owners
            </div>
          </div>

          {filteredOwners.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Commercial Sales Owners Registered</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Register enterprise sales representatives or link IAM platform staff to assign annual quotas, track open pipeline, and manage customer acquisition.
              </p>
              <Button onClick={openAddOwnerModal} className="bg-[#047857] hover:bg-[#036246] text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Add Sales Owner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOwners.map((owner) => {
              const quotaAttainedPct = owner.annualQuotaArr > 0
                ? Math.min(100, Math.round((owner.closedWonArr / owner.annualQuotaArr) * 100))
                : 0;

              return (
                <div
                  key={owner.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition space-y-4 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#047857] to-[#036246] text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {owner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{owner.name}</h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {owner.id.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-800 font-medium mt-0.5">
                          {owner.designation}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditOwnerModal(owner)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Quota & Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOwner(owner.id, owner.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove Sales Owner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11.5px] text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{owner.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Territory: <strong className="text-slate-800">{owner.territory}</strong></span>
                    </div>
                  </div>

                  {/* Quota Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Annual ARR Quota</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatLakhs(owner.closedWonArr)} / {formatLakhs(owner.annualQuotaArr)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#047857] h-full rounded-full transition-all"
                        style={{ width: `${quotaAttainedPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10.5px] text-slate-400">
                      <span>Attainment: <strong className="text-emerald-700">{quotaAttainedPct}%</strong></span>
                      <span>Win Rate: <strong className="text-slate-700">{owner.winRatePct}%</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-slate-500">
                      Active Deals: <strong className="text-slate-900">{owner.activeDealsCount}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setOwnerFilter(owner.name);
                        setActiveTab('pipeline');
                      }}
                      className="text-xs font-semibold text-[#047857] hover:underline flex items-center gap-1"
                    >
                      View Assigned Pipeline <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* ── TAB 2: DEALS PIPELINE ──────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deal name, company, or sales owner..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Stages</option>
                <option value="DISCOVERY">Discovery</option>
                <option value="REQUIREMENT">Requirement Captured</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="WON">Closed Won</option>
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Sales Owners</option>
                {salesOwners.map((so) => (
                  <option key={so.id} value={so.name}>
                    {so.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 whitespace-nowrap">Opportunity ID</th>
                    <th className="py-2.5 px-3">Deal & Company</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Assigned Sales Owner</th>
                    <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Estimated ARR</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Probability</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Target Close</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Stage</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Target className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No matching opportunities found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Create a new commercial deal or reset your search filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="text-[#047857]">{deal.opportunityNumber}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[170px] lg:max-w-[210px]" title={deal.dealName}>
                            {deal.dealName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[170px] lg:max-w-[210px]">
                            {deal.companyName} • {deal.contactPerson}
                          </div>
                        </td>

                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 truncate max-w-[140px]" title={deal.salesOwner}>
                            <Users className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                            <span className="truncate">{deal.salesOwner}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatLakhs(deal.estimatedArr)}
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {deal.probability}%
                          </span>
                        </td>

                        <td className="py-2.5 px-2.5 font-mono text-slate-600 whitespace-nowrap text-xs">
                          {deal.expectedCloseDate}
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold border',
                            deal.stage === 'WON'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : deal.stage === 'PROPOSAL'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          )}>
                            ● {deal.stage}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigateTab?.('platform-quotations')}
                              className="text-xs text-[#047857] border-emerald-200 hover:bg-emerald-50 font-semibold py-1 px-2.5"
                            >
                              Open Quote →
                            </Button>
                            <button
                              onClick={() => handleDeleteDeal(deal.id, deal.dealName)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ── TAB 3: INBOUND LEADS ───────────────────────────────────────────── */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 whitespace-nowrap">Lead Code</th>
                    <th className="py-2.5 px-3">Company & Prospect</th>
                    <th className="py-2.5 px-2.5">Source & Industry</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Assigned Sales Owner</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Stage</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No inbound leads recorded</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Inbound prospect inquiries, public demo bookings, and quotation requests will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="text-[#047857]">{lead.leadNumber}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[180px] lg:max-w-[220px]">{lead.companyName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px] lg:max-w-[220px]">
                            {lead.contactPerson} ({lead.designation}) • {lead.email}
                          </div>
                        </td>

                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs truncate max-w-[130px] block">{lead.industry}</span>
                          <div className="text-[9.5px] text-slate-400">Via {lead.source}</div>
                        </td>

                        <td className="py-2.5 px-2.5 whitespace-nowrap font-medium text-slate-800 text-xs">
                          {lead.salesOwner}
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {lead.stage}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => onNavigateTab?.('platform-quotations')}
                              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold py-1 px-2.5"
                            >
                              Create Proposal →
                            </Button>
                            <button
                              onClick={() => handleDeleteLead(lead.id, lead.companyName)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ── TAB 4: QUOTA & FUNNEL ANALYTICS ────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Commercial Sales Rep Leaderboard</span>
              </h3>

              <div className="space-y-3">
                {salesOwners.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center italic">
                    No sales rep performance data recorded yet.
                  </p>
                ) : (
                  salesOwners.map((owner, idx) => (
                    <div key={owner.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-400 text-xs">#{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{owner.name}</div>
                          <div className="text-[10.5px] text-slate-500">{owner.territory}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-xs font-mono text-emerald-700">{formatLakhs(owner.closedWonArr)}</div>
                        <div className="text-[10px] text-slate-400">{owner.winRatePct}% Win Rate</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#047857]" />
                <span>Deal Stage Breakdown</span>
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { stage: 'Proposal Sent', count: opportunities.filter(o => o.stage === 'PROPOSAL').length, color: 'bg-purple-500' },
                  { stage: 'Discovery / Qualification', count: opportunities.filter(o => o.stage === 'DISCOVERY').length, color: 'bg-blue-500' },
                  { stage: 'Requirement Captured', count: opportunities.filter(o => o.stage === 'REQUIREMENT').length, color: 'bg-amber-500' },
                  { stage: 'Closed Won / Converted', count: opportunities.filter(o => o.stage === 'WON').length, color: 'bg-emerald-500' },
                ].map((s) => (
                  <div key={s.stage} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
                      <span className="font-medium text-slate-800">{s.stage}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{s.count} deals</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT SALES OWNER ─────────────────────────────────── */}
      {showAddOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingOwner ? 'Edit Sales Owner Quota' : 'Register Commercial Sales Owner'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assign official sales quota, territory, and link with platform staff IAM credentials.
                </p>
              </div>
              <button onClick={() => setShowAddOwnerModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="p-5 space-y-3.5">
              {/* Optional Staff Link */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Import from Platform Staff IAM (Optional)
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => handleSelectStaffForOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                >
                  <option value="">-- Choose Existing Platform Staff or Enter Custom Below --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.email}) — {staff.job_title || staff.role_display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    placeholder="e.g. Anand K"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    placeholder="anand@joypeoplehr.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formOwnerPhone}
                    onChange={(e) => setFormOwnerPhone(e.target.value)}
                    placeholder="+91 98401 00000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                  <input
                    type="text"
                    value={formOwnerDesignation}
                    onChange={(e) => setFormOwnerDesignation(e.target.value)}
                    placeholder="Enterprise Sales Director"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Territory / Segment</label>
                  <input
                    type="text"
                    value={formOwnerTerritory}
                    onChange={(e) => setFormOwnerTerritory(e.target.value)}
                    placeholder="South Region / Strategic Mid-Market"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Annual ARR Quota (₹)</label>
                  <input
                    type="number"
                    step="50000"
                    value={formOwnerQuota}
                    onChange={(e) => setFormOwnerQuota(Number(e.target.value))}
                    placeholder="10000000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddOwnerModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                  {editingOwner ? 'Update Sales Owner' : 'Save Sales Owner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW DEAL ────────────────────────────────────────── */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Create New Commercial Opportunity</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Track prospective enterprise deal value, close timeline, and assign authoritative sales owner.
                </p>
              </div>
              <button onClick={() => setShowAddDealModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={formDealName}
                  onChange={(e) => setFormDealName(e.target.value)}
                  placeholder="e.g. ABC Tech Park — Multi-Branch Workforce Rollout"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Client Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    placeholder="e.g. Apex Industrial Works"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Rajesh Kumar (HR Head)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estimated Annual ARR (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    value={formEstimatedArr}
                    onChange={(e) => setFormEstimatedArr(Number(e.target.value))}
                    placeholder="450000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:border-[#047857] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Sales Owner *</label>
                  <select
                    value={formSalesOwnerId}
                    onChange={(e) => setFormSalesOwnerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                  >
                    {salesOwners.map((so) => (
                      <option key={so.id} value={so.id}>
                        {so.name} ({so.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Funnel Stage</label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                  >
                    <option value="DISCOVERY">Discovery (Initial)</option>
                    <option value="REQUIREMENT">Requirement Captured</option>
                    <option value="PROPOSAL">Proposal / Quotation</option>
                    <option value="NEGOTIATION">Procurement Negotiation</option>
                    <option value="WON">Closed Won</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formCloseDate}
                    onChange={(e) => setFormCloseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddDealModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                  Create Opportunity
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
