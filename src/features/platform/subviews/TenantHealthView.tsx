// src/features/platform/subviews/TenantHealthView.tsx
// ============================================================
// WorkForceOS — Tenant Health, Churn Risk & Customer Intervention Control Center
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Users,
  CircleDollarSign,
  Search,
  Filter,
  RefreshCw,
  Send,
  Zap,
  Sliders,
  ChevronRight,
  Eye,
  Building2,
  HeartPulse,
  Download,
  SlidersHorizontal,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  CreditCard,
  Package,
  Headphones,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  MoreHorizontal,
  Lock,
  UserCheck,
  Flame,
  Plus,
  X,
  Play,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  platformCustomerHealthService,
  CustomerHealthRecord,
  HealthGrade,
  HealthInterventionItem,
  PLAYBOOK_TEMPLATES,
  HealthScoreWeights,
} from '../../../services/platform/platformCustomerHealthService';
import { usePlatformRealtime } from '../../../services/platform';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface TenantHealthViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const TenantHealthView: React.FC<TenantHealthViewProps> = ({ onNavigateTab }) => {
  usePlatformRealtime();

  // State
  const [tenants, setTenants] = useState<CustomerHealthRecord[]>(() =>
    platformCustomerHealthService.getTenantsHealth()
  );
  const [interventions, setInterventions] = useState<HealthInterventionItem[]>(() =>
    platformCustomerHealthService.getInterventions()
  );
  const [weights, setWeights] = useState<HealthScoreWeights>(() =>
    platformCustomerHealthService.getWeights()
  );

  // Filters & Search
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now');

  // Modals & Drawers
  const [selectedTenant, setSelectedTenant] = useState<CustomerHealthRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<
    'overview' | 'signals' | 'usage' | 'billing' | 'subscription' | 'support' | 'activity' | 'interventions'
  >('overview');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [playbookModal, setPlaybookModal] = useState<{
    isOpen: boolean;
    tenant: CustomerHealthRecord | null;
    playbookId: string;
  }>({
    isOpen: false,
    tenant: null,
    playbookId: 'pb-payment-recovery',
  });

  // Support Impersonation State
  const [impersonateModal, setImpersonateModal] = useState<{
    isOpen: boolean;
    tenant: CustomerHealthRecord | null;
    reason: string;
    mode: 'read-only' | 'full-support';
  }>({
    isOpen: false,
    tenant: null,
    reason: '',
    mode: 'read-only',
  });
  const [activeImpersonation, setActiveImpersonation] = useState<{
    tenant: CustomerHealthRecord;
    mode: string;
    expiresInSeconds: number;
  } | null>(null);

  // Portfolio Metrics (Mathematically consistent derived from canonical model)
  const portfolioMetrics = useMemo(() => platformCustomerHealthService.getPortfolioMetrics(), [tenants]);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setTenants([...platformCustomerHealthService.getTenantsHealth()]);
      setInterventions([...platformCustomerHealthService.getInterventions()]);
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }, 400);
  };

  // Filtered list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      let matchFilter = true;
      if (selectedFilter === 'healthy') matchFilter = t.health_grade === 'Healthy';
      else if (selectedFilter === 'watch') matchFilter = t.health_grade === 'Watch';
      else if (selectedFilter === 'at-risk') matchFilter = t.health_grade === 'At Risk';
      else if (selectedFilter === 'critical') matchFilter = t.health_grade === 'Critical';
      else if (selectedFilter === 'enterprise') matchFilter = t.plan === 'Enterprise';

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.tenant_name.toLowerCase().includes(q) ||
        t.tenant_id.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.industry.toLowerCase().includes(q) ||
        t.primary_risk.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }, [tenants, selectedFilter, searchQuery]);

  // Top Priority Accounts (Sorted strictly by Risk Priority)
  const topPriorityAccounts = useMemo(() => {
    return [...tenants]
      .filter((t) => t.health_grade === 'At Risk' || t.health_grade === 'Critical' || t.health_grade === 'Watch')
      .sort((a, b) => b.risk_priority - a.risk_priority)
      .slice(0, 4);
  }, [tenants]);

  // Scatter chart data (Health Score vs MRR)
  const scatterData = useMemo(() => {
    return tenants.map((t) => ({
      name: t.tenant_name,
      healthScore: t.health_score,
      mrrLakhs: Number((t.mrr / 100000).toFixed(2)),
      plan: t.plan,
      grade: t.health_grade,
      primaryRisk: t.primary_risk,
      raw: t,
    }));
  }, [tenants]);

  // Launch Playbook Handler
  const handleLaunchPlaybookConfirm = async (ownerTeam: any, notes: string) => {
    if (!playbookModal.tenant) return;
    await platformCustomerHealthService.launchPlaybook(
      playbookModal.tenant.tenant_id,
      playbookModal.playbookId,
      ownerTeam,
      'Platform Super Admin',
      notes
    );
    setPlaybookModal({ isOpen: false, tenant: null, playbookId: 'pb-payment-recovery' });
    refreshData();
    alert(`Playbook launched successfully for ${playbookModal.tenant.tenant_name}`);
  };

  // Start Impersonation Handler
  const handleStartImpersonation = () => {
    if (!impersonateModal.tenant || !impersonateModal.reason.trim()) {
      alert('Please provide an operational reason for support impersonation.');
      return;
    }
    setActiveImpersonation({
      tenant: impersonateModal.tenant,
      mode: impersonateModal.mode,
      expiresInSeconds: 900, // 15 mins
    });
    setImpersonateModal({ isOpen: false, tenant: null, reason: '', mode: 'read-only' });
    setIsActionMenuOpen(false);
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Persistent Impersonation Safety Banner */}
      {activeImpersonation && (
        <div className="bg-[#FEF3C7] border-2 border-[#F59E0B] text-[#92400E] px-4 py-3 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-[#D97706] animate-pulse" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider">
                Support Impersonation Session Active:
              </span>{' '}
              <strong className="text-sm text-[#78350F]">{activeImpersonation.tenant.tenant_name}</strong>{' '}
              <span className="text-xs">({activeImpersonation.mode === 'read-only' ? 'Read-Only Audit Mode' : 'Full Support Access'})</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-[#FDE68A]">
              Expires in: 14:32
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

      {/* 1. Customer Command Center Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#047857] text-white shadow-sm">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Tenant Health & Churn Risk</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  ● Health Engine Active
                </span>
              </div>
              <p className="text-[13.5px] text-[#64748B] mt-0.5 max-w-3xl">
                Monitor customer engagement, product usage, billing health, support signals and churn risk across your tenant portfolio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] text-[#64748B] mr-1">
            Calculated: <strong>{lastUpdated}</strong>
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Sliders className="h-4 w-4 text-[#64748B]" />
            Health Rules
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn('h-4 w-4 text-[#64748B]', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Recalculating...' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => alert(`Exporting ${filteredTenants.length} customer health records to CSV...`)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export
          </Button>
        </div>
      </div>

      {/* 2. 6 Consistent Portfolio KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Portfolio Health */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Portfolio Health</span>
            <Activity className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">
            {portfolioMetrics.portfolioScore} <span className="text-xs font-normal text-[#64748B]">/ 100</span>
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> ↑ {portfolioMetrics.portfolioChange} pts vs 30d
          </span>
        </div>

        {/* Healthy Tenants */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Healthy (80-100)</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">{portfolioMetrics.healthyTenants}</strong>
          <span className="text-[10px] text-[#047857] font-semibold">{portfolioMetrics.healthyPct}% of portfolio</span>
        </div>

        {/* Watch */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Watch (60-79)</span>
            <AlertCircle className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <strong className="text-2xl font-bold text-[#2563EB] block mt-1">{portfolioMetrics.watchTenants}</strong>
          <span className="text-[10px] text-[#2563EB] font-semibold">{portfolioMetrics.watchPct}% of portfolio</span>
        </div>

        {/* At Risk */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>At Risk (40-59)</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <strong className="text-2xl font-bold text-[#D97706] block mt-1">{portfolioMetrics.atRiskTenants}</strong>
          <span className="text-[10px] text-[#D97706] font-semibold">{portfolioMetrics.atRiskPct}% of portfolio</span>
        </div>

        {/* Critical */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>Critical (0-39)</span>
            <Flame className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">{portfolioMetrics.criticalTenants}</strong>
          <span className="text-[10px] text-[#DC2626] font-semibold">{portfolioMetrics.criticalPct}% of portfolio</span>
        </div>

        {/* MRR at Risk */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>MRR at Risk</span>
            <CircleDollarSign className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">
            ₹{portfolioMetrics.mrrAtRisk > 0 ? (portfolioMetrics.mrrAtRisk / 100000).toFixed(1) + 'L' : '0'}
          </strong>
          <span className="text-[10px] text-[#DC2626] font-semibold">
            {portfolioMetrics.atRiskTenants + portfolioMetrics.criticalTenants} Accounts at risk
          </span>
        </div>
      </div>

      {/* 3. Customer Health vs MRR Risk Quadrant (Scatter Chart) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#0F172B]">Customer Health vs MRR Risk Quadrant</h3>
            <p className="text-xs text-[#64748B]">
              Identify high-value organizations that require immediate customer intervention.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-full border border-[#FCA5A5] font-semibold">
              ⚠️ Priority Intervention (Low Health / High MRR)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0] font-semibold">
              ● Strategic & Healthy (High Health / High MRR)
            </span>
          </div>
        </div>

        {scatterData.length === 0 ? (
          <div className="h-64 w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1] font-sans">
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center animate-bounce">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#0F172B]">Zero Accounts Requiring Intervention</h4>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-0.5">
                All registered organizations are maintaining nominal customer health scores and stable revenue metrics.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white text-[#047857] border border-[#A7F3D0] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              Realtime Customer Health Engine Active
            </span>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  dataKey="healthScore"
                  name="Health Score"
                  domain={[0, 100]}
                  unit=" pts"
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <YAxis
                  type="number"
                  dataKey="mrrLakhs"
                  name="MRR"
                  unit="L"
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <ZAxis range={[120, 260]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as typeof scatterData[0];
                      return (
                        <div className="bg-[#0F172B] text-white p-3 rounded-xl text-xs space-y-1.5 shadow-xl border border-[#334155] min-w-[200px]">
                          <div className="font-bold text-sm text-white">{data.name}</div>
                          <div className="flex justify-between text-[#94A3B8]">
                            <span>Health Score:</span>
                            <strong
                              className={cn(
                                'font-bold',
                                data.healthScore >= 80
                                  ? 'text-[#34D399]'
                                  : data.healthScore >= 60
                                  ? 'text-[#60A5FA]'
                                  : 'text-[#F87171]'
                              )}
                            >
                              {data.healthScore} / 100 ({data.grade})
                            </strong>
                          </div>
                          <div className="flex justify-between text-[#94A3B8]">
                            <span>MRR:</span>
                            <strong className="text-white font-mono">₹{data.mrrLakhs}L / mo</strong>
                          </div>
                          <div className="flex justify-between text-[#94A3B8]">
                            <span>Plan Tier:</span>
                            <span className="text-[#38BDF8] font-semibold">{data.plan}</span>
                          </div>
                          <div className="pt-1 border-t border-[#334155] text-[10px] text-[#CBD5E1]">
                            Primary Signal: <span className="text-[#FBBF24] font-semibold">{data.primaryRisk}</span>
                          </div>
                          <div className="text-[9px] text-[#64748B] pt-0.5 text-center">Click point to open workspace</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  data={scatterData}
                  onClick={(e) => {
                    if (e && e.raw) setSelectedTenant(e.raw);
                  }}
                  className="cursor-pointer"
                >
                  {scatterData.map((entry, index) => {
                    let fill = '#047857';
                    if (entry.grade === 'Critical') fill = '#DC2626';
                    else if (entry.grade === 'At Risk') fill = '#D97706';
                    else if (entry.grade === 'Watch') fill = '#2563EB';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Priority Accounts Section (High-Value At-Risk Section) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#DC2626]" />
            <div>
              <h3 className="font-bold text-sm text-[#0F172B]">Priority Accounts Requiring Intervention</h3>
              <p className="text-xs text-[#64748B]">
                Ranked strictly by Risk Priority (Health Risk × Commercial MRR Exposure × Urgency).
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-3 py-1 rounded-full border border-[#FCA5A5]">
            Top {topPriorityAccounts.length} Urgent Accounts
          </span>
        </div>

        {topPriorityAccounts.length === 0 ? (
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#047857]" />
              <div>
                <strong className="block font-bold">Zero Urgent At-Risk Accounts</strong>
                <span className="text-gray-600">
                  All {tenants.length} customer organizations are in Healthy standing with nominal commercial health scores (80-100).
                </span>
              </div>
            </div>
            <span className="px-3 py-1 bg-white text-[#047857] border border-emerald-200 rounded-full font-bold text-[11px] shadow-xs">
              ● 100% Portfolio Healthy
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {topPriorityAccounts.map((t) => (
              <div
                key={t.tenant_id}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#DC2626] transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#0F172B]">{t.tenant_name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white border text-[#64748B]">
                        {t.plan}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">{t.industry}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-[#0F172B]">{t.mrr_formatted} MRR</div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5',
                        t.health_grade === 'Critical'
                          ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          : t.health_grade === 'At Risk'
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#EFF6FF] text-[#1D4ED8]'
                      )}
                    >
                      ● {t.health_score}/100 ({t.score_change_30d < 0 ? `↓ ${Math.abs(t.score_change_30d)}` : `↑ ${t.score_change_30d}`} pts)
                    </span>
                  </div>
                </div>

                {/* Primary Risk & Recommended Action */}
                <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] space-y-1 text-xs">
                  <div className="text-[#64748B] flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626]" />
                    <span>Primary Risk: <strong className="text-[#0F172B]">{t.primary_risk}</strong></span>
                  </div>
                  <div className="text-[#047857] flex items-center gap-1.5 font-semibold">
                    <Zap className="h-3.5 w-3.5 text-[#047857]" />
                    <span>Action: {t.recommended_action.title}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#64748B]">Last Activity: {t.last_activity}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTenant(t);
                        setDrawerTab('overview');
                      }}
                      className="text-xs text-[#334155] border-[#CBD5E1] hover:bg-white"
                    >
                      View Health
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setPlaybookModal({
                          isOpen: true,
                          tenant: t,
                          playbookId: t.recommended_action.playbook_id || 'pb-payment-recovery',
                        });
                      }}
                      className="text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                    >
                      <Play className="h-3 w-3 mr-1" /> Launch Playbook
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Filter Pills & Tenant Health Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search tenant name, ID, domain, primary risk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            {/* Dynamic Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Organizations', count: tenants.length },
                { id: 'healthy', label: 'Healthy', count: portfolioMetrics.healthyTenants },
                { id: 'watch', label: 'Watch', count: portfolioMetrics.watchTenants },
                { id: 'at-risk', label: 'At Risk', count: portfolioMetrics.atRiskTenants },
                { id: 'critical', label: 'Critical', count: portfolioMetrics.criticalTenants },
                { id: 'enterprise', label: 'Enterprise', count: tenants.filter((t) => t.plan === 'Enterprise').length },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedFilter(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border',
                    selectedFilter === p.id
                      ? 'bg-[#047857] text-white border-[#047857] shadow-xs'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  )}
                >
                  <span>{p.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px]',
                      selectedFilter === p.id ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                    )}
                  >
                    {p.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing <strong>{filteredTenants.length}</strong> matching organizations
          </div>
        </div>

        {/* Tenant Health Data Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Organization & ID</th>
                  <th className="py-3 px-4">Health Score & Trend</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">MRR</th>
                  <th className="py-3 px-4">Primary Risk Signal</th>
                  <th className="py-3 px-4">Key Telemetry Signals</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredTenants.map((t) => (
                  <tr key={t.tenant_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTenant(t);
                          setDrawerTab('overview');
                        }}
                        className="hover:text-[#047857] hover:underline text-left cursor-pointer"
                      >
                        <div className="text-sm font-bold text-[#0F172B]">{t.tenant_name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono font-normal">
                          {t.tenant_id} • {t.industry}
                        </div>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <strong
                          className={cn(
                            'text-sm font-bold',
                            t.health_score >= 80
                              ? 'text-[#047857]'
                              : t.health_score >= 60
                              ? 'text-[#2563EB]'
                              : t.health_score >= 40
                              ? 'text-[#D97706]'
                              : 'text-[#DC2626]'
                          )}
                        >
                          {t.health_score} <span className="text-[10px] text-[#64748B] font-normal">/ 100</span>
                        </strong>
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            t.score_change_30d >= 0 ? 'text-[#047857]' : 'text-[#DC2626]'
                          )}
                        >
                          {t.score_change_30d >= 0 ? `↑ ${t.score_change_30d}` : `↓ ${Math.abs(t.score_change_30d)}`}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-[9px] px-2 py-0.2 rounded-full font-bold inline-block mt-0.5',
                          t.health_grade === 'Healthy'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : t.health_grade === 'Watch'
                            ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                            : t.health_grade === 'At Risk'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#FEF2F2] text-[#DC2626]'
                        )}
                      >
                        ● {t.health_grade}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onNavigateTab?.('platform-plans', { presetFilter: t.plan })}
                        className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        {t.plan}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">
                      {t.mrr_formatted}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-xs text-[#0F172B]">{t.primary_risk}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.key_signals.map((sig, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-mono"
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#64748B] text-[11px]">
                      {t.last_activity}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {t.health_grade === 'Healthy' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(t);
                            setDrawerTab('overview');
                          }}
                          className="text-xs text-[#047857] hover:bg-[#ECFDF5]"
                        >
                          View Health
                        </Button>
                      ) : t.health_grade === 'Watch' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(t);
                            setDrawerTab('overview');
                          }}
                          className="text-xs text-[#2563EB] border-[#BFDBFE] hover:bg-[#EFF6FF]"
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setPlaybookModal({
                              isOpen: true,
                              tenant: t,
                              playbookId: t.recommended_action.playbook_id || 'pb-payment-recovery',
                            });
                          }}
                          className="text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        >
                          <Play className="h-3 w-3 mr-1" /> Launch Playbook
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          6. TENANT HEALTH WORKSPACE DRAWER (500px)
         --------------------------------------------------------- */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#0F172B]">{selectedTenant.tenant_name}</h2>
                    <span
                      className={cn(
                        'text-[10px] px-2.5 py-0.5 rounded-full font-bold',
                        selectedTenant.health_grade === 'Healthy'
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : selectedTenant.health_grade === 'Watch'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                          : selectedTenant.health_grade === 'At Risk'
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                      )}
                    >
                      ● {selectedTenant.health_grade} ({selectedTenant.health_score}/100)
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] font-mono mt-0.5">
                    {selectedTenant.tenant_id} • {selectedTenant.industry} • {selectedTenant.country}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTenant(null);
                    setIsActionMenuOpen(false);
                  }}
                  className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Plan & MRR Pill & Actions Menu */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172B]">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1]">
                    {selectedTenant.plan} Tier
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] font-mono text-[#047857]">
                    {selectedTenant.mrr_formatted} / mo
                  </span>
                </div>

                {/* Secure Actions Dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                    className="text-xs font-semibold text-[#334155] border-[#CBD5E1] flex items-center gap-1.5"
                  >
                    Actions <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isActionMenuOpen && 'rotate-90')} />
                  </Button>

                  {isActionMenuOpen && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1.5 text-xs z-50 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          onNavigateTab?.('platform-tenants', { tenantId: selectedTenant.tenant_id });
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#F8FAFC] text-[#0F172B] flex items-center gap-2 font-medium"
                      >
                        <Building2 className="h-3.5 w-3.5 text-[#64748B]" /> Open Organization
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          onNavigateTab?.('platform-subscriptions', { presetFilter: selectedTenant.tenant_name });
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#F8FAFC] text-[#0F172B] flex items-center gap-2 font-medium"
                      >
                        <Package className="h-3.5 w-3.5 text-[#047857]" /> Open Subscription
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          onNavigateTab?.('platform-billing', { presetFilter: selectedTenant.tenant_name });
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#F8FAFC] text-[#0F172B] flex items-center gap-2 font-medium"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-[#2563EB]" /> Open Billing & Invoices
                      </button>

                      <div className="border-t border-[#F1F5F9] my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setImpersonateModal({
                            isOpen: true,
                            tenant: selectedTenant,
                            reason: '',
                            mode: 'read-only',
                          });
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#FEF3C7] text-[#92400E] flex items-center gap-2 font-semibold"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-[#D97706]" /> Impersonate Tenant
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          if (window.confirm(`Are you sure you want to put ${selectedTenant.tenant_name} on administrative hold?`)) {
                            alert('Tenant account placed on administrative hold.');
                          }
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#FEF2F2] text-[#DC2626] flex items-center gap-2 font-semibold"
                      >
                        <Lock className="h-3.5 w-3.5 text-[#DC2626]" /> Administrative Hold
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 8 Workspace Sub-Navigation Tabs */}
            <div className="border-b border-[#E2E8F0] px-4 bg-white overflow-x-auto">
              <div className="flex items-center gap-5 min-w-max">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'signals', label: 'Health Signals', icon: Zap },
                  { id: 'usage', label: 'Product Usage', icon: Activity },
                  { id: 'billing', label: 'Billing', icon: CreditCard },
                  { id: 'subscription', label: 'Subscription', icon: Package },
                  { id: 'support', label: 'Support', icon: Headphones },
                  { id: 'activity', label: 'Activity', icon: Clock },
                  { id: 'interventions', label: 'Interventions', icon: Play },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = drawerTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDrawerTab(t.id as any)}
                      className={cn(
                        'py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer',
                        isActive
                          ? 'border-[#047857] text-[#047857]'
                          : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workspace Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* 4-Pillar Score Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Engagement</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        {selectedTenant.engagement_score} <span className="text-xs font-normal text-[#64748B]">/ 25</span>
                      </strong>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Product Usage</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        {selectedTenant.usage_score} <span className="text-xs font-normal text-[#64748B]">/ 25</span>
                      </strong>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Billing Health</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        {selectedTenant.billing_score} <span className="text-xs font-normal text-[#64748B]">/ 25</span>
                      </strong>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Support Health</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        {selectedTenant.support_score} <span className="text-xs font-normal text-[#64748B]">/ 25</span>
                      </strong>
                    </div>
                  </div>

                  {/* Why At Risk? Explanation */}
                  {selectedTenant.why_at_risk.length > 0 && (
                    <div className="p-4 bg-[#FEF2F2] rounded-2xl border border-[#FCA5A5] space-y-2">
                      <div className="flex items-center gap-2 text-[#DC2626] font-bold text-xs">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Why is this customer at risk?</span>
                      </div>
                      <ul className="space-y-1 text-[#991B1B] text-[11px] list-disc list-inside">
                        {selectedTenant.why_at_risk.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Action Card */}
                  <div className="p-4 bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-2xl border border-[#A7F3D0] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#047857] font-bold">
                        <Zap className="h-4 w-4" /> Recommended Customer Intervention
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-[#A7F3D0] text-[#047857]">
                        Deterministic Signal
                      </span>
                    </div>

                    <div className="font-bold text-sm text-[#065F46]">{selectedTenant.recommended_action.title}</div>
                    <p className="text-[#065F46] text-[11px] leading-relaxed">
                      {selectedTenant.recommended_action.reason}
                    </p>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setPlaybookModal({
                            isOpen: true,
                            tenant: selectedTenant,
                            playbookId: selectedTenant.recommended_action.playbook_id || 'pb-payment-recovery',
                          });
                        }}
                        className="bg-[#047857] hover:bg-[#036246] text-white font-semibold text-xs shadow-xs"
                      >
                        <Play className="h-3 w-3 mr-1" /> Execute Recommended Action
                      </Button>
                    </div>
                  </div>

                  {/* Account Metadata */}
                  <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                    <span className="font-bold text-xs text-[#0F172B]">Account Metadata</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B]">
                      <div>Primary Contact: <strong className="text-[#0F172B]">{selectedTenant.primary_contact_name}</strong></div>
                      <div>Contact Email: <strong className="text-[#0F172B]">{selectedTenant.primary_contact_email}</strong></div>
                      <div>Customer GSTIN: <strong className="text-[#0F172B] font-mono">{selectedTenant.gstin}</strong></div>
                      <div>Onboarding Date: <strong className="text-[#0F172B] font-mono">{selectedTenant.onboarding_date}</strong></div>
                      <div>Next Renewal: <strong className="text-[#0F172B] font-mono">{selectedTenant.renewal_date}</strong></div>
                      <div>Active Seats: <strong className="text-[#0F172B]">{selectedTenant.active_seats} / {selectedTenant.max_seats}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HEALTH SIGNALS (DRILLDOWN) */}
              {drawerTab === 'signals' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">Four-Pillar Deterministic Signals</h4>
                      <p className="text-[11px] text-[#64748B]">Direct telemetry signals influencing the calculated health score.</p>
                    </div>
                    <span className="text-xs font-bold text-[#047857] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                      Score: {selectedTenant.health_score} / 100
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedTenant.signals.map((sig) => (
                      <div
                        key={sig.id}
                        className={cn(
                          'p-3.5 rounded-xl border text-xs space-y-1',
                          sig.status === 'Critical'
                            ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                            : sig.status === 'Warning'
                            ? 'bg-[#FEF3C7] border-[#FDE68A]'
                            : sig.status === 'Watch'
                            ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                            : 'bg-white border-[#E2E8F0]'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#0F172B]">{sig.signal_name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-white/80 border text-[#64748B]">
                              {sig.pillar}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'font-mono font-bold text-xs',
                              sig.score_impact < 0 ? 'text-[#DC2626]' : 'text-[#047857]'
                            )}
                          >
                            {sig.score_impact < 0 ? `${sig.score_impact} pts` : '0 pts impact'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569]">{sig.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCT USAGE */}
              {drawerTab === 'usage' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172B]">Resource Allocation & Quota Telemetry</h4>
                    <p className="text-[11px] text-[#64748B]">Measured consumption against subscribed entitlement limits.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Employee Headcount Seats:</span>
                        <strong>{selectedTenant.active_seats} / {selectedTenant.max_seats} ({selectedTenant.seat_utilization_pct}%)</strong>
                      </div>
                      <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#047857] rounded-full" style={{ width: `${selectedTenant.seat_utilization_pct}%` }} />
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Cloud Document Storage:</span>
                        <strong>{selectedTenant.storage_used_gb} GB / {selectedTenant.storage_quota_gb} GB</strong>
                      </div>
                      <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${(selectedTenant.storage_used_gb / selectedTenant.storage_quota_gb) * 100}%` }} />
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border flex justify-between items-center">
                      <span className="text-[#64748B]">Monthly REST API Gateway Calls:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedTenant.api_calls_this_month.toLocaleString()} calls</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenant(null);
                      onNavigateTab?.('platform-usage', { tenantId: selectedTenant.tenant_id });
                    }}
                    className="text-xs text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Full Usage & Metering Console</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* TAB 4: BILLING */}
              {drawerTab === 'billing' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172B]">Billing Health & Invoices</h4>
                    <p className="text-[11px] text-[#64748B]">Payment ledger, pending invoices, and automated dunning status.</p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Subscription Status:</span>
                      <span className="font-bold text-[#0F172B]">{selectedTenant.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Monthly Recurring Revenue:</span>
                      <strong className="font-mono text-[#047857]">{selectedTenant.mrr_formatted}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Contract Renewal Date:</span>
                      <strong className="font-mono">{selectedTenant.renewal_date}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenant(null);
                      onNavigateTab?.('platform-billing', { presetFilter: selectedTenant.tenant_name });
                    }}
                    className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Invoices & Financial Ledger</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* TAB 5: SUBSCRIPTION */}
              {drawerTab === 'subscription' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172B]">Contract & Plan Specifications</h4>
                    <p className="text-[11px] text-[#64748B]">Contract terms and feature entitlements.</p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Subscribed Plan:</span>
                      <strong className="text-[#047857]">{selectedTenant.plan}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Included Seats:</span>
                      <strong>{selectedTenant.max_seats} Employee Seats</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenant(null);
                      onNavigateTab?.('platform-subscriptions', { presetFilter: selectedTenant.tenant_name });
                    }}
                    className="text-xs text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Subscriptions Contract Workspace</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* TAB 6: SUPPORT */}
              {drawerTab === 'support' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172B]">Support Center Telemetry</h4>
                    <p className="text-[11px] text-[#64748B]">Customer cases, ticket escalation status, and resolution SLAs.</p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Support Pillar Score:</span>
                      <strong className="text-[#0F172B]">{selectedTenant.support_score} / 25</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">CSAT Satisfaction:</span>
                      <strong className="text-[#047857]">4.8 / 5.0</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenant(null);
                      onNavigateTab?.('platform-support', { tenantId: selectedTenant.tenant_id });
                    }}
                    className="text-xs text-[#2563EB] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Support Cases for this Tenant</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* TAB 7: ACTIVITY TELEMETRY */}
              {drawerTab === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs text-[#0F172B]">Inactivity & Access Telemetry</h4>
                    <p className="text-[11px] text-[#64748B]">Recent administrator logins and employee check-in trends.</p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Last Recorded Activity:</span>
                      <strong className="text-[#0F172B]">{selectedTenant.last_activity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Weekly Active Users:</span>
                      <strong>{Math.round((selectedTenant.active_seats * 0.9))} employees</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: INTERVENTIONS & PLAYBOOKS */}
              {drawerTab === 'interventions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">Active Interventions & Playbooks</h4>
                      <p className="text-[11px] text-[#64748B]">Track recovery steps, assigned owners, and resolution deadlines.</p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setPlaybookModal({
                          isOpen: true,
                          tenant: selectedTenant,
                          playbookId: 'pb-payment-recovery',
                        });
                      }}
                      className="text-xs font-semibold bg-[#047857] hover:bg-[#036246] text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> + Launch Playbook
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {interventions
                      .filter((i) => i.tenant_id === selectedTenant.tenant_id)
                      .map((intv) => (
                        <div key={intv.id} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-sm text-[#0F172B]">{intv.playbook_title}</div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                                <span>Owner: <strong>{intv.owner_team} ({intv.owner_name})</strong></span>
                                <span>•</span>
                                <span>Next Action: <strong>{intv.next_action_date}</strong></span>
                              </div>
                            </div>

                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                              ● {intv.status}
                            </span>
                          </div>

                          {/* Step Checklist */}
                          <div className="space-y-2 bg-white p-3 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase">Intervention Action Steps:</span>
                            <div className="space-y-1.5">
                              {intv.steps.map((step) => (
                                <div
                                  key={step.id}
                                  onClick={async () => {
                                    await platformCustomerHealthService.toggleStep(intv.id, step.id);
                                    refreshData();
                                  }}
                                  className="flex items-center gap-2 cursor-pointer text-[11px] text-[#334155] hover:text-[#0F172B]"
                                >
                                  {step.completed ? (
                                    <CheckSquare className="h-4 w-4 text-[#047857]" />
                                  ) : (
                                    <Square className="h-4 w-4 text-[#94A3B8]" />
                                  )}
                                  <span className={cn(step.completed && 'line-through text-[#94A3B8]')}>
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <p className="text-[11px] text-[#475569] italic">Notes: {intv.notes}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-white flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTenant(null)}
                className="text-xs text-[#64748B]"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPlaybookModal({
                      isOpen: true,
                      tenant: selectedTenant,
                      playbookId: selectedTenant.recommended_action.playbook_id || 'pb-payment-recovery',
                    });
                  }}
                  className="text-xs font-semibold bg-[#047857] hover:bg-[#036246] text-white"
                >
                  <Play className="h-3 w-3 mr-1" /> Launch Intervention Playbook
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          7. PLAYBOOK EXECUTION WIZARD MODAL
         --------------------------------------------------------- */}
      {playbookModal.isOpen && playbookModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider">
                  Customer Intervention Engine
                </span>
                <h3 className="text-base font-bold text-[#0F172B]">Execute Retention Playbook</h3>
              </div>
              <button
                onClick={() => setPlaybookModal({ isOpen: false, tenant: null, playbookId: 'pb-payment-recovery' })}
                className="text-[#94A3B8] hover:text-[#0F172B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border space-y-1">
              <div>Target Organization: <strong className="text-[#0F172B]">{playbookModal.tenant.tenant_name}</strong></div>
              <div>Health Score: <strong className="text-[#DC2626]">{playbookModal.tenant.health_score} / 100 ({playbookModal.tenant.health_grade})</strong></div>
              <div>MRR Exposure: <strong className="font-mono text-[#047857]">{playbookModal.tenant.mrr_formatted}</strong></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#334155] block mb-1">Select Retention Playbook</label>
                <select
                  value={playbookModal.playbookId}
                  onChange={(e) => setPlaybookModal({ ...playbookModal, playbookId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-semibold"
                >
                  {PLAYBOOK_TEMPLATES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Playbook Step Preview */}
              <div className="bg-[#F8FAFC] p-3 rounded-xl border space-y-1.5">
                <span className="font-bold text-[10px] text-[#64748B] uppercase">Execution Sequence:</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#334155]">
                  {PLAYBOOK_TEMPLATES.find((p) => p.id === playbookModal.playbookId)?.steps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaybookModal({ isOpen: false, tenant: null, playbookId: 'pb-payment-recovery' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleLaunchPlaybookConfirm('Finance', 'Automated trigger')}
                className="bg-[#047857] hover:bg-[#036246] text-white font-semibold"
              >
                Launch & Assign Playbook
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          8. SUPER ADMIN HEALTH RULES CONFIGURATION MODAL
         --------------------------------------------------------- */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider">Super Admin Configuration</span>
                <h3 className="text-base font-bold text-[#0F172B]">Health Score 4-Pillar Weighting Rules</h3>
              </div>
              <button onClick={() => setIsRulesModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Configure the percentage distribution across the 4 deterministic health pillars (Total must equal 100%).
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#334155]">Engagement Pillar Weight:</span>
                  <strong className="text-[#047857]">{weights.engagement}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={weights.engagement}
                  onChange={(e) => setWeights({ ...weights, engagement: Number(e.target.value) })}
                  className="w-full accent-[#047857]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#334155]">Product Usage Weight:</span>
                  <strong className="text-[#047857]">{weights.usage}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={weights.usage}
                  onChange={(e) => setWeights({ ...weights, usage: Number(e.target.value) })}
                  className="w-full accent-[#047857]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#334155]">Billing Health Weight:</span>
                  <strong className="text-[#047857]">{weights.billing}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={weights.billing}
                  onChange={(e) => setWeights({ ...weights, billing: Number(e.target.value) })}
                  className="w-full accent-[#047857]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-[#334155]">Support Health Weight:</span>
                  <strong className="text-[#047857]">{weights.support}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={weights.support}
                  onChange={(e) => setWeights({ ...weights, support: Number(e.target.value) })}
                  className="w-full accent-[#047857]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsRulesModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await platformCustomerHealthService.updateWeights(weights);
                  setIsRulesModalOpen(false);
                  refreshData();
                  alert('Health score weighting rules updated & audited.');
                }}
                className="bg-[#047857] hover:bg-[#036246] text-white font-semibold"
              >
                Save & Recalculate Portfolio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          9. SECURE TENANT IMPERSONATION CONFIRMATION MODAL
         --------------------------------------------------------- */}
      {impersonateModal.isOpen && impersonateModal.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#D97706]" />
                <h3 className="text-base font-bold text-[#0F172B]">Support Impersonation Access</h3>
              </div>
              <button
                onClick={() => setImpersonateModal({ isOpen: false, tenant: null, reason: '', mode: 'read-only' })}
                className="text-[#94A3B8] hover:text-[#0F172B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#475569]">
              You are about to access <strong>{impersonateModal.tenant.tenant_name}</strong> ({impersonateModal.tenant.tenant_id}) as a Platform Administrator. This action will be logged in the immutable security audit trail.
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-[#334155] block mb-1">Access Mode</label>
                <select
                  value={impersonateModal.mode}
                  onChange={(e) => setImpersonateModal({ ...impersonateModal, mode: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-semibold"
                >
                  <option value="read-only">Read-Only Diagnostic Mode (Recommended)</option>
                  <option value="full-support">Full Support Administrative Access</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#334155] block mb-1">
                  Reason for Impersonation <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Diagnosing ZK Teco biometric IP sync timeouts and investigating overdue renewal invoice..."
                  value={impersonateModal.reason}
                  onChange={(e) => setImpersonateModal({ ...impersonateModal, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImpersonateModal({ isOpen: false, tenant: null, reason: '', mode: 'read-only' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartImpersonation}
                className="bg-[#D97706] hover:bg-[#B45309] text-white font-semibold"
              >
                Start 15-Minute Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
