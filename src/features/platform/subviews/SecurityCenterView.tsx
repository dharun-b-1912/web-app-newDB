// src/features/platform/subviews/SecurityCenterView.tsx
// ============================================================
// Joy PeopleHR — Platform Security Center (Enterprise Control Console)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Globe,
  Clock,
  UserX,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Sliders,
  FileText,
  Activity,
  Layers,
  ArrowUpRight,
  Zap,
  Radio,
  Server,
  UserCheck,
  Eye,
  TrendingUp,
  Fingerprint,
  Users,
  Building2,
  HardDrive,
  Database,
  Terminal,
  Cpu,
  Download,
  AlertCircle,
  HelpCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  SecurityPosture,
  SecurityAlertItem,
  SecurityRecommendation,
  CredentialInventoryItem,
  SecurityPolicyItem,
  SecurityMetrics,
  SecuritySeverity,
  SecurityAlertStatus,
  ComplianceControlItem,
  ApiSecurityMetric,
  TelemetrySourceItem,
  SecurityScoreCategoryItem,
} from '../../../types/platformSecurity';
import { platformSecurityControlService } from '../../../services/platform/platformSecurityControlService';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { cn } from '../../../lib/utils';

export interface SecurityCenterViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [posture, setPosture] = useState<SecurityPosture>(() => platformSecurityControlService.getPosture());
  const [metrics, setMetrics] = useState<SecurityMetrics>(() => platformSecurityControlService.getMetrics());
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>(() => platformSecurityControlService.getAlerts());
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>(() =>
    platformSecurityControlService.getRecommendations()
  );
  const [credentials, setCredentials] = useState<CredentialInventoryItem[]>(() =>
    platformSecurityControlService.getCredentials()
  );
  const [policies, setPolicies] = useState<SecurityPolicyItem[]>(() => platformSecurityControlService.getPolicies());
  const [complianceControls, setComplianceControls] = useState<ComplianceControlItem[]>(() =>
    platformSecurityControlService.getComplianceControls()
  );
  const [apiMetrics] = useState<ApiSecurityMetric[]>(() => platformSecurityControlService.getApiSecurityMetrics());
  const [telemetrySources] = useState<TelemetrySourceItem[]>(() => platformSecurityControlService.getTelemetrySources());
  const [privilegedAccounts] = useState(() => platformSecurityControlService.getPrivilegedAccounts());

  // Search & Filter States
  const [threatSearch, setThreatSearch] = useState('');
  const [threatSeverityFilter, setThreatSeverityFilter] = useState('All');
  const [threatStatusFilter, setThreatStatusFilter] = useState('All');

  const [credSearch, setCredSearch] = useState('');
  const [credStatusFilter, setCredStatusFilter] = useState('All');
  const [credTypeFilter, setCredTypeFilter] = useState('All');

  const [complianceFrameworkFilter, setComplianceFrameworkFilter] = useState('All');
  const [authTimeRange, setAuthTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Modals & Drawers State
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlertItem | null>(null);
  const [selectedControl, setSelectedControl] = useState<ComplianceControlItem | null>(null);
  const [rotatingCredential, setRotatingCredential] = useState<CredentialInventoryItem | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<SecurityPolicyItem | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isMassRevokeOpen, setIsMassRevokeOpen] = useState(false);
  const [massRevokeReason, setMassRevokeReason] = useState('');
  const [rotationReason, setRotationReason] = useState('');

  // Security Check Runner Simulation State
  const [checkProgress, setCheckProgress] = useState<{ step: number; title: string; done: boolean }[]>([
    { step: 1, title: 'Supabase Authentication & MFA Gates', done: false },
    { step: 2, title: 'Active Session Tokens & Tor Anomaly Scan', done: false },
    { step: 3, title: 'Credential Expiry & TLS Certificate Scanner', done: false },
    { step: 4, title: 'Kong API Gateway & Rate Limit Rules', done: false },
    { step: 5, title: 'Compliance Matrix & RLS Tenant Barriers', done: false },
  ]);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [checkSummary, setCheckSummary] = useState<{
    checks_total: number;
    checks_passed: number;
    checks_warn: number;
    checks_failed: number;
    score: number;
  } | null>(null);

  const refreshData = () => {
    setPosture(platformSecurityControlService.getPosture());
    setMetrics(platformSecurityControlService.getMetrics());
    setAlerts(platformSecurityControlService.getAlerts({
      severity: threatSeverityFilter,
      status: threatStatusFilter,
      search: threatSearch,
    }));
    setCredentials(platformSecurityControlService.getCredentials({
      status: credStatusFilter,
      type: credTypeFilter,
      search: credSearch,
    }));
    setPolicies(platformSecurityControlService.getPolicies());
    setComplianceControls(platformSecurityControlService.getComplianceControls(complianceFrameworkFilter));
    if (selectedAlert) {
      const updated = platformSecurityControlService.getAlerts().find((a) => a.id === selectedAlert.id);
      if (updated) setSelectedAlert(updated);
    }
  };

  // Realtime Supabase Subscription & Initial Load
  React.useEffect(() => {
    // Initial fetch from live database
    Promise.all([
      platformSecurityControlService.fetchAlertsFromDB(),
      platformSecurityControlService.fetchCredentialsFromDB(),
      platformSecurityControlService.fetchPoliciesFromDB(),
    ]).then(() => {
      refreshData();
    });

    // Realtime changes listener
    const unsubscribe = platformSecurityControlService.subscribeToRealtime(() => {
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtered lists
  const filteredAlerts = useMemo(() => {
    return platformSecurityControlService.getAlerts({
      severity: threatSeverityFilter,
      status: threatStatusFilter,
      search: threatSearch,
    });
  }, [threatSeverityFilter, threatStatusFilter, threatSearch, alerts]);

  const filteredCredentials = useMemo(() => {
    return platformSecurityControlService.getCredentials({
      status: credStatusFilter,
      type: credTypeFilter,
      search: credSearch,
    });
  }, [credStatusFilter, credTypeFilter, credSearch, credentials]);

  const filteredComplianceControls = useMemo(() => {
    return platformSecurityControlService.getComplianceControls(complianceFrameworkFilter);
  }, [complianceFrameworkFilter, complianceControls]);

  const scoreBreakdown = useMemo(() => {
    return platformSecurityControlService.getScoreBreakdown();
  }, [posture, alerts, credentials]);

  // Handlers
  const handleRunSecurityCheck = async () => {
    setIsCheckModalOpen(true);
    setIsRunningCheck(true);
    setCheckSummary(null);

    // Progressive check sequence simulation
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 400));
      setCheckProgress((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, done: true } : item))
      );
    }

    const result = await platformSecurityControlService.runSecurityCheck();
    setCheckSummary(result);
    setIsRunningCheck(false);
    refreshData();
  };

  const handleResolveAlert = async (alertId: string) => {
    await platformSecurityControlService.updateAlertStatus(alertId, 'Resolved', 'Resolved via Security Finding Inspector');
    refreshData();
  };

  const handleRotateCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingCredential) return;
    await platformSecurityControlService.rotateCredential(rotatingCredential.id, rotationReason);
    setRotatingCredential(null);
    setRotationReason('');
    refreshData();
  };

  const handleMassRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massRevokeReason) return;
    await platformSecurityControlService.revokeAllPrivilegedSessions(massRevokeReason);
    setIsMassRevokeOpen(false);
    setMassRevokeReason('');
    refreshData();
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    await platformSecurityControlService.updatePolicy(editingPolicy.id, {
      enabled: editingPolicy.enabled,
      config_summary: editingPolicy.config_summary,
    });
    setEditingPolicy(null);
    refreshData();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Security Center</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border',
                posture.status === 'Healthy'
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  : posture.status === 'Degraded'
                  ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                  : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  posture.status === 'Healthy' ? 'bg-[#10B981] animate-pulse' : 'bg-[#EF4444]'
                )}
              />
              ● Security Posture {posture.status}
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Monitor platform security posture, authentication controls, access risks, credentials, policies, API security, and real-time security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('policies')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Sliders className="h-4 w-4 text-[#64748B]" />
            Security Policies
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => platformSecurityControlService.exportAuditLog('CSV')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export Security Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isRunningCheck}
            onClick={handleRunSecurityCheck}
            className="flex items-center gap-1.5 bg-[#0F172B] hover:bg-[#1E293B] text-white shadow-sm"
          >
            <RefreshCw className={cn('h-4 w-4', isRunningCheck && 'animate-spin')} />
            Run Security Check
          </Button>
        </div>
      </div>

      {/* 2. Prominent Security Posture Score & 6 Summary KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Posture Score Hero Card */}
        <div
          onClick={() => setIsBreakdownOpen(true)}
          className="p-5 bg-[#0F172B] text-white rounded-2xl border border-[#334155] shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#475569] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Platform Security Posture</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#10B981]/20 text-[#34D399] border border-[#059669]">
              ● {posture.status}
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">{posture.overall_score}</span>
              <span className="text-xl font-bold text-[#94A3B8]">/ 100</span>
            </div>
            <span className="text-xs text-[#34D399] font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +2 this week
            </span>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#334155] text-xs">
            <div className="flex justify-between text-[#CBD5E1]">
              <span>Authentication Controls</span>
              <strong className="text-white">{posture.categories.authentication}%</strong>
            </div>
            <div className="flex justify-between text-[#CBD5E1]">
              <span>Session Isolation</span>
              <strong className="text-white">{posture.categories.sessions}%</strong>
            </div>
            <div className="flex justify-between text-[#CBD5E1]">
              <span>Credential Health</span>
              <strong className="text-white">{posture.categories.credential_security}%</strong>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#94A3B8] flex items-center justify-between group-hover:text-white transition-colors">
            <span>Click to view full score breakdown</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 6 Top Summary KPI Cards (Span 2 Columns) */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            onClick={() => {
              setActiveTab('threats');
              setThreatSeverityFilter('Critical');
            }}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#DC2626] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>Critical Alerts</span>
              <ShieldAlert className="h-3.5 w-3.5 text-[#DC2626]" />
            </div>
            <div className="text-xl font-bold text-[#0F172B] mt-1">{metrics.critical_alerts_count}</div>
            <p className="text-[11px] text-[#059669] mt-0.5 font-medium">
              {metrics.critical_alerts_count === 0 ? '0 active vulnerabilities' : `${metrics.critical_alerts_count} require immediate action`}
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab('threats');
              setThreatSeverityFilter('High');
            }}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#D97706] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>High Risk Findings</span>
              <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
            </div>
            <div className="text-xl font-bold text-[#D97706] mt-1">{metrics.high_risk_findings_count}</div>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              {metrics.high_risk_findings_count === 0 ? 'No high risk findings' : `${metrics.high_risk_findings_count} findings open`}
            </p>
          </div>

          <div
            onClick={() => (onNavigateTab ? onNavigateTab('platform-sessions') : setActiveTab('access_control'))}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#2563EB] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>Active Sessions</span>
              <Laptop className="h-3.5 w-3.5 text-[#2563EB]" />
            </div>
            <div className="text-xl font-bold text-[#0F172B] mt-1">{metrics.active_sessions_count}</div>
            <p className="text-[11px] text-[#2563EB] mt-0.5">{metrics.admin_sessions_count} admin sessions</p>
          </div>

          <div
            onClick={() => setActiveTab('authentication')}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#047857] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>Failed Logins</span>
              <Lock className="h-3.5 w-3.5 text-[#64748B]" />
            </div>
            <div className="text-xl font-bold text-[#0F172B] mt-1">{metrics.failed_logins_24h_count}</div>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Last 24 hours</p>
          </div>

          <div
            onClick={() => {
              setActiveTab('credentials');
              setCredStatusFilter('Expiring');
            }}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#7C3AED] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>Expiring Credentials</span>
              <Key className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
            <div className="text-xl font-bold text-[#D97706] mt-1">{metrics.expiring_credentials_count}</div>
            <p className="text-[11px] text-[#DC2626] mt-0.5">
              {metrics.expiring_credentials_count === 0 ? 'All credentials healthy' : 'Requires rotation'}
            </p>
          </div>

          <div
            onClick={() => setActiveTab('threats')}
            className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:border-[#DC2626] cursor-pointer transition-all"
          >
            <div className="text-xs text-[#64748B] flex justify-between">
              <span>Suspicious Activity</span>
              <Activity className="h-3.5 w-3.5 text-[#DC2626]" />
            </div>
            <div className="text-xl font-bold text-[#DC2626] mt-1">{metrics.suspicious_activity_count}</div>
            <p className="text-[11px] text-[#DC2626] mt-0.5">
              {metrics.suspicious_activity_count === 0 ? '0 anomalies detected' : 'Requires review'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: ShieldCheck, badge: null },
            { id: 'threats', label: 'Threats & Alerts', icon: ShieldAlert, badge: metrics.high_risk_findings_count },
            { id: 'authentication', label: 'Authentication', icon: Lock, badge: null },
            { id: 'access_control', label: 'Access Control', icon: UserCheck, badge: null },
            { id: 'credentials', label: 'Credentials Inventory', icon: Key, badge: metrics.expiring_credentials_count },
            { id: 'policies', label: 'Security Policies', icon: Sliders, badge: policies.length },
            { id: 'api_security', label: 'API Security', icon: Zap, badge: null },
            { id: 'compliance', label: 'Compliance & Controls', icon: FileText, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'border-[#0F172B] text-[#0F172B]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172B] hover:border-[#CBD5E1]'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#0F172B]' : 'text-[#94A3B8]')} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      tab.id === 'threats'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : isActive
                        ? 'bg-[#0F172B] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: OVERVIEW & ACTIONABLE RECOMMENDATIONS
         --------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Prioritized Security Hardening Recommendations */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#047857]" />
                Prioritized Security Hardening Recommendations
              </h3>
              <span className="text-xs text-[#64748B]">Generated from live platform telemetry</span>
            </div>

            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <div className="p-6 text-center text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B] space-y-1">
                  <div className="font-semibold text-[#047857] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" /> All platform defense layers are operating normally
                  </div>
                  <p className="text-[11px] text-[#64748B]">No open security vulnerabilities or pending credential rotations detected.</p>
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5',
                          rec.severity === 'High'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : rec.severity === 'Medium'
                            ? 'bg-[#FFFBEB] text-[#D97706]'
                            : 'bg-[#ECFDF5] text-[#047857]'
                        )}
                      >
                        {rec.severity === 'High' ? '!' : '✓'}
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172B]">{rec.title}</div>
                        <p className="text-[#64748B] mt-0.5 text-[11px] leading-relaxed">{rec.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (rec.category === 'Credentials') setActiveTab('credentials');
                          else if (rec.category === 'Authentication') setActiveTab('authentication');
                          else if (rec.category === 'Sessions' && onNavigateTab) onNavigateTab('platform-sessions');
                          else setActiveTab('threats');
                        }}
                        className="text-xs text-[#0F172B] border-[#CBD5E1]"
                      >
                        {rec.action_label} <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Telemetry Sources Health Monitor */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#2563EB]" />
                Security Telemetry Sources & Gateway Feeds
              </h3>
              <span className="text-xs text-[#047857] font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" /> 7/8 Feeds Operational
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {telemetrySources.map((source) => (
                <div key={source.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172B] truncate">{source.name}</span>
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.2 rounded font-bold',
                        source.status === 'Operational'
                          ? 'bg-[#ECFDF5] text-[#047857]'
                          : 'bg-[#FFFBEB] text-[#D97706]'
                      )}
                    >
                      {source.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] flex justify-between">
                    <span>{source.provider}</span>
                    <span className="font-mono text-[#94A3B8]">{source.latency_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: THREATS & ALERTS (FINDINGS SYSTEM)
         --------------------------------------------------------- */}
      {activeTab === 'threats' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search alerts by code, type, IP, tenant, or user..."
                value={threatSearch}
                onChange={(e) => setThreatSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F172B]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={threatSeverityFilter}
                onChange={(e) => setThreatSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={threatStatusFilter}
                onChange={(e) => setThreatStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Alert ID & Threat Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Tenant / User</th>
                    <th className="py-3 px-4">IP Address & Location</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Detected At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#64748B]">
                        No security findings matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedAlert(a)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-[#DC2626]">{a.alert_code}</div>
                          <div className="font-bold text-[#0F172B]">{a.type}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              a.severity === 'Critical'
                                ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                                : a.severity === 'High'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : 'bg-[#FFFBEB] text-[#D97706]'
                            )}
                          >
                            {a.severity}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0F172B]">{a.tenant_name || 'Global Platform'}</div>
                          <div className="text-[10px] text-[#64748B]">{a.user_email || '—'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-[#0F172B]">{a.ip_address}</div>
                          <div className="text-[10px] text-[#64748B]">{a.location}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[#0F172B]">{a.risk_score}</span>
                          <span className="text-[10px] text-[#94A3B8]">/100</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                              a.status === 'Resolved'
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : a.status === 'Investigating'
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : 'bg-[#FFFBEB] text-[#D97706]'
                            )}
                          >
                            {a.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">{a.detected_at}</td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAlert(a)}
                            className="text-xs text-[#0F172B]"
                          >
                            Inspect <ChevronRight className="h-3 w-3 ml-1" />
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
          TAB 3: AUTHENTICATION POSTURE & MFA CONTROLS
         --------------------------------------------------------- */}
      {activeTab === 'authentication' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-2">
              <span className="text-xs text-[#64748B] font-semibold">MFA Enforcement Status</span>
              <div className="space-y-1.5 text-xs pt-2 border-t border-[#F1F5F9]">
                <div className="flex justify-between items-center">
                  <span>Platform Super Admins</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857]">
                    ● 100% Enforced
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tenant Administrators</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857]">
                    ● Mandatory
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Standard Employees</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                    ○ Optional
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-2">
              <span className="text-xs text-[#64748B] font-semibold">Enterprise SSO Adoption</span>
              <div className="text-2xl font-bold text-[#0F172B] mt-1">{metrics.sso_connected_tenants_count} Tenants</div>
              <p className="text-[11px] text-[#059669]">SAML 2.0 / Okta / Azure AD / PingIdentity</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-2">
              <span className="text-xs text-[#64748B] font-semibold">FIDO2 / WebAuthn Passkeys</span>
              <div className="text-2xl font-bold text-[#047857] mt-1">Active (Hardware Tokens)</div>
              <p className="text-[11px] text-[#64748B]">Touch ID, Face ID, YubiKey 5 Series enabled</p>
            </div>
          </div>

          {/* Failed Login Anomaly Breakdown */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172B]">Failed Login Telemetry</h3>
                <p className="text-xs text-[#64748B]">Monitored across Supabase GoTrue authentication gateway</p>
              </div>
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg">
                {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setAuthTimeRange(range)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      authTimeRange === range ? 'bg-white text-[#0F172B] shadow-sm' : 'text-[#64748B]'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-[#64748B]">Total Failed Attempts in Selected Period:</span>
                <div className="text-2xl font-bold text-[#0F172B] mt-0.5">
                  {authTimeRange === '1h' ? '3' : authTimeRange === '24h' ? '24' : authTimeRange === '7d' ? '142' : '512'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#059669] font-semibold">● Automated Throttling Active</span>
                <p className="text-[11px] text-[#64748B] mt-0.5">IP rate-limited after 5 consecutive failures</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 4: ACCESS CONTROL & PRIVILEGED ACCOUNTS
         --------------------------------------------------------- */}
      {activeTab === 'access_control' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B]">Privileged Platform Accounts</h3>
              <p className="text-xs text-[#64748B]">Accounts with platform-wide administrative capabilities</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMassRevokeOpen(true)}
              className="text-xs text-[#DC2626] border-[#FECACA] hover:bg-[#FEF2F2]"
            >
              <UserX className="h-3.5 w-3.5 mr-1 text-[#DC2626]" /> Revoke All Privileged Sessions
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">MFA Protection</th>
                  <th className="py-3 px-4">Active Sessions</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {privilegedAccounts.map((admin) => (
                  <tr key={admin.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172B]">{admin.name}</div>
                      <div className="text-[10px] text-[#64748B]">{admin.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F172B]">{admin.role}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#047857]">
                        <Check className="h-3 w-3" /> {admin.mfa_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F172B]">{admin.active_sessions}</td>
                    <td className="py-3.5 px-4 text-[#64748B]">{admin.last_login}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onNavigateTab) onNavigateTab('platform-sessions');
                        }}
                        className="text-xs"
                      >
                        Inspect Sessions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 5: CREDENTIALS INVENTORY
         --------------------------------------------------------- */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search credentials by name, owner, or tenant..."
                value={credSearch}
                onChange={(e) => setCredSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F172B]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={credStatusFilter}
                onChange={(e) => setCredStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>

              <select
                value={credTypeFilter}
                onChange={(e) => setCredTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="TLS Certificate">TLS Certificate</option>
                <option value="API Key">API Key</option>
                <option value="Webhook Secret">Webhook Secret</option>
                <option value="Service Account">Service Account</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Credential Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Tenant / Owner</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Expires At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredCredentials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#64748B]">
                        No credentials registered in inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredCredentials.map((cred) => (
                      <tr key={cred.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3.5 px-4 font-bold text-[#0F172B]">{cred.name}</td>
                        <td className="py-3.5 px-4 font-mono text-[#475569]">{cred.type}</td>
                        <td className="py-3.5 px-4">
                          <div>{cred.tenant_name}</div>
                          <div className="text-[10px] text-[#94A3B8]">{cred.owner}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#0F172B]">
                            {cred.environment}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={cn(cred.days_until_expiry <= 0 ? 'text-[#DC2626] font-bold' : 'text-[#334155]')}>
                            {cred.expires_at} ({cred.days_until_expiry}d)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              cred.status === 'Expired'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : cred.status === 'Expiring'
                                ? 'bg-[#FFFBEB] text-[#D97706]'
                                : 'bg-[#ECFDF5] text-[#047857]'
                            )}
                          >
                            {cred.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRotatingCredential(cred)}
                            className="text-xs text-[#0F172B]"
                          >
                            Rotate Credential
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
          TAB 6: SECURITY POLICIES
         --------------------------------------------------------- */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Security Policy Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Configuration Summary</th>
                    <th className="py-3 px-4">Updated By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {policies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#64748B]">
                        No security policies configured.
                      </td>
                    </tr>
                  ) : (
                    policies.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3.5 px-4 font-bold text-[#0F172B]">{p.name}</td>
                        <td className="py-3.5 px-4 font-mono text-[#64748B]">{p.category}</td>
                        <td className="py-3.5 px-4 text-[#334155] max-w-sm">{p.config_summary}</td>
                        <td className="py-3.5 px-4 text-[#64748B]">{p.updated_by}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              p.enabled ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                            )}
                          >
                            {p.enabled ? '● Enabled' : '○ Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPolicy(p)}
                            className="text-xs text-[#0F172B]"
                          >
                            Configure
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
          TAB 7: API SECURITY & TELEMETRY
         --------------------------------------------------------- */}
      {activeTab === 'api_security' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-xs text-[#64748B] font-semibold">Total API Throughput</span>
              <div className="text-2xl font-bold text-[#0F172B] mt-1">{metrics.api_requests_per_min} req/min</div>
              <p className="text-[11px] text-[#059669] mt-0.5">● Kong Edge Gateway Operational</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-xs text-[#64748B] font-semibold">Global Error Rate (4xx / 5xx)</span>
              <div className="text-2xl font-bold text-[#0F172B] mt-1">{metrics.api_error_rate_pct}%</div>
              <p className="text-[11px] text-[#64748B] mt-0.5">Threshold: &lt; 2.0%</p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-xs text-[#64748B] font-semibold">Rate Limit Shield</span>
              <div className="text-2xl font-bold text-[#047857] mt-1">Active</div>
              <p className="text-[11px] text-[#64748B] mt-0.5">100 req/min default per tenant</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">API Endpoint & Method</th>
                  <th className="py-3 px-4">Throughput</th>
                  <th className="py-3 px-4">Error Rate</th>
                  <th className="py-3 px-4">p95 Latency</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {apiMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748B]">
                      No endpoint telemetry sampled in the current window.
                    </td>
                  </tr>
                ) : (
                  apiMetrics.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#2563EB] mr-2">[{item.method}]</span>
                        <span className="font-mono font-semibold text-[#0F172B]">{item.endpoint}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{item.requests_per_min} /min</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span className={cn(item.error_rate_pct > 5 ? 'text-[#DC2626]' : 'text-[#0F172B]')}>
                          {item.error_rate_pct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#64748B]">{item.p95_latency_ms}ms</td>
                      <td className="py-3.5 px-4 font-mono">{item.rate_limit_violations}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                            item.status === 'Normal' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#DC2626]'
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 8: COMPLIANCE & CONTROLS
         --------------------------------------------------------- */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172B]">Statutory Compliance & Security Controls Matrix</h3>
              <p className="text-xs text-[#64748B]">Aligned with SOC 2 Type II, ISO 27001:2022, GDPR, and DPDP</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={complianceFrameworkFilter}
                onChange={(e) => setComplianceFrameworkFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="All">All Frameworks</option>
                <option value="SOC 2">SOC 2 Type II</option>
                <option value="ISO 27001">ISO 27001</option>
                <option value="DPDP">DPDP Act (India)</option>
                <option value="GDPR">GDPR (EU)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Control Code & Name</th>
                  <th className="py-3 px-4">Framework</th>
                  <th className="py-3 px-4">Requirement Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Verified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredComplianceControls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748B]">
                      No compliance controls registered for the selected framework.
                    </td>
                  </tr>
                ) : (
                  filteredComplianceControls.map((ctrl) => (
                    <tr
                      key={ctrl.id}
                      onClick={() => setSelectedControl(ctrl)}
                      className="hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-[#0F172B]">{ctrl.code}</div>
                        <div className="font-semibold text-[#334155]">{ctrl.name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#0F172B]">
                          {ctrl.framework}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B] max-w-sm">{ctrl.requirement}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full font-bold',
                            ctrl.status === 'Compliant'
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : ctrl.status === 'Partial'
                              ? 'bg-[#FFFBEB] text-[#D97706]'
                              : 'bg-[#FEE2E2] text-[#DC2626]'
                          )}
                        >
                          ● {ctrl.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">{ctrl.last_verified_at}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedControl(ctrl)}
                          className="text-xs text-[#0F172B]"
                        >
                          View Evidence
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          FINDING INSPECTOR DRAWER / MODAL
         --------------------------------------------------------- */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[#DC2626]">{selectedAlert.alert_code}</span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    selectedAlert.severity === 'Critical' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FEE2E2] text-[#DC2626]'
                  )}
                >
                  {selectedAlert.severity} Severity
                </span>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-bold text-sm text-[#0F172B]">{selectedAlert.type}</span>
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B] mt-2 font-medium">
                  <strong>Why was this detected?</strong>
                  <p className="mt-0.5 text-xs">{selectedAlert.detection_reason}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block">Tenant Organization:</span>
                  <strong className="text-[#0F172B]">{selectedAlert.tenant_name || 'Global Platform'}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Target Account:</span>
                  <strong className="text-[#0F172B]">{selectedAlert.user_email || '—'}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Origin IP:</span>
                  <strong className="font-mono text-[#0F172B]">{selectedAlert.ip_address}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Geographic Location:</span>
                  <strong className="text-[#0F172B]">{selectedAlert.location}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAlert(null);
                  if (onNavigateTab) onNavigateTab('platform-audit');
                }}
                className="text-xs"
              >
                View Forensic Audit Trail
              </Button>

              <div className="flex items-center gap-2">
                {selectedAlert.status !== 'Resolved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolveAlert(selectedAlert.id)}
                    className="text-xs bg-[#047857] hover:bg-[#036246] text-white"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Mark Finding Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ROTATE CREDENTIAL MODAL
         --------------------------------------------------------- */}
      {rotatingCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <Key className="h-4 w-4 text-[#7C3AED]" /> Rotate Credential
              </h3>
              <button onClick={() => setRotatingCredential(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
              <div className="font-bold text-[#0F172B]">{rotatingCredential.name}</div>
              <div className="text-[#64748B]">Type: {rotatingCredential.type} | Tenant: {rotatingCredential.tenant_name}</div>
              <div className="text-[11px] text-[#DC2626] font-semibold">
                Current Expiration: {rotatingCredential.expires_at} ({rotatingCredential.days_until_expiry} days remaining)
              </div>
            </div>

            <form onSubmit={handleRotateCredentialSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#0F172B] mb-1">Reason for Rotation / Ticket Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled annual TLS rotation / SEC-10493 remediation"
                  value={rotationReason}
                  onChange={(e) => setRotationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:border-[#0F172B]"
                />
              </div>

              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#047857] text-[11px]">
                ✓ A new secure certificate will be provisioned in KMS Vault and the expiration date extended by 365 days. Zero plaintext secrets are exposed.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <Button type="button" variant="outline" size="sm" onClick={() => setRotatingCredential(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#0F172B] hover:bg-[#1E293B] text-white">
                  Execute Safe Rotation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          SCORE BREAKDOWN MODAL
         --------------------------------------------------------- */}
      {isBreakdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172B]">Platform Security Posture Breakdown</h3>
                <span className="text-xs text-[#64748B]">Score: {posture.overall_score} / 100 ({posture.status})</span>
              </div>
              <button onClick={() => setIsBreakdownOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {scoreBreakdown.map((cat) => (
                <div key={cat.category_key} className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0F172B]">{cat.name}</span>
                      <span className="text-[11px] text-[#64748B] ml-2">(Weight: {cat.weight}%)</span>
                    </div>
                    <span
                      className={cn(
                        'font-bold px-2 py-0.5 rounded text-[11px]',
                        cat.score >= 90 ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFFBEB] text-[#D97706]'
                      )}
                    >
                      {cat.score}%
                    </span>
                  </div>

                  {cat.deductions.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-[#E2E8F0]">
                      {cat.deductions.map((d, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-[#DC2626]">
                          <span>• {d.reason}</span>
                          <span className="font-mono font-bold">{d.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
              <Button variant="outline" size="sm" onClick={() => setIsBreakdownOpen(false)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          RUN SECURITY CHECK MODAL
         --------------------------------------------------------- */}
      {isCheckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172B] flex items-center gap-2">
                <RefreshCw className={cn('h-4 w-4 text-[#2563EB]', isRunningCheck && 'animate-spin')} />
                {isRunningCheck ? 'Executing Security Posture Evaluation...' : 'Security Check Complete'}
              </h3>
              {!isRunningCheck && (
                <button onClick={() => setIsCheckModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {checkProgress.map((item) => (
                <div
                  key={item.step}
                  className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl"
                >
                  <span className="font-semibold text-[#0F172B]">{item.title}</span>
                  {item.done ? (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#ECFDF5] text-[#047857] flex items-center gap-1">
                      <Check className="h-3 w-3" /> Passed
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#EFF6FF] text-[#2563EB] animate-pulse">
                      Running...
                    </span>
                  )}
                </div>
              ))}
            </div>

            {checkSummary && (
              <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#047857] space-y-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" /> All {checkSummary.checks_total} checks executed successfully.
                </div>
                <div className="text-[11px] text-[#065F46] flex gap-4 pt-1">
                  <span>Passed: {checkSummary.checks_passed}</span>
                  <span>Warnings: {checkSummary.checks_warn}</span>
                  <span>Critical: {checkSummary.checks_failed}</span>
                  <span className="font-bold">Calculated Score: {checkSummary.score}/100</span>
                </div>
              </div>
            )}

            {!isRunningCheck && (
              <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCheckModalOpen(false)}
                  className="bg-[#0F172B] hover:bg-[#1E293B] text-white"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MASS PRIVILEGED SESSION REVOCATION MODAL
         --------------------------------------------------------- */}
      {isMassRevokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#DC2626] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" /> Emergency Session Revocation
              </h3>
              <button onClick={() => setIsMassRevokeOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B]">
              <strong>Caution:</strong> This action will immediately terminate all active privileged platform admin sessions across all devices.
            </div>

            <form onSubmit={handleMassRevokeSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#0F172B] mb-1">Reason for Mass Revocation (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suspected privileged token leakage / emergency lockout"
                  value={massRevokeReason}
                  onChange={(e) => setMassRevokeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsMassRevokeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                  Terminate All Sessions
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          COMPLIANCE CONTROL EVIDENCE MODAL
         --------------------------------------------------------- */}
      {selectedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="font-mono font-bold text-sm text-[#0F172B]">{selectedControl.code}</span>
                <h3 className="text-sm font-bold text-[#334155]">{selectedControl.name}</h3>
              </div>
              <button onClick={() => setSelectedControl(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[#64748B] block">Requirement:</span>
                <p className="text-[#0F172B] font-medium">{selectedControl.requirement}</p>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                <span className="text-[#64748B] block">Current Implementation State:</span>
                <p className="text-[#0F172B] font-medium">{selectedControl.current_state}</p>
              </div>

              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl space-y-1 text-[#047857]">
                <span className="font-bold block">Verified Technical Evidence:</span>
                <p className="font-mono text-[11px]">{selectedControl.evidence}</p>
              </div>

              <div className="flex justify-between text-[#64748B] pt-1">
                <span>Responsible Owner: <strong className="text-[#0F172B]">{selectedControl.owner}</strong></span>
                <span>Last Verified: <strong className="text-[#0F172B]">{selectedControl.last_verified_at}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
              <Button variant="outline" size="sm" onClick={() => setSelectedControl(null)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          EDIT POLICY MODAL
         --------------------------------------------------------- */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172B]">Configure Security Policy</h3>
              <button onClick={() => setEditingPolicy(null)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-3">
              <div>
                <label className="block font-semibold text-[#0F172B] mb-1">Policy Name</label>
                <div className="font-bold text-sm text-[#0F172B]">{editingPolicy.name}</div>
                <div className="text-[11px] text-[#64748B]">Category: {editingPolicy.category}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <span className="font-semibold text-[#0F172B]">Policy Enforcement State</span>
                <Switch
                  checked={editingPolicy.enabled}
                  onCheckedChange={(checked) => setEditingPolicy({ ...editingPolicy, enabled: checked })}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172B] mb-1">Configuration Parameters</label>
                <textarea
                  rows={3}
                  value={editingPolicy.config_summary}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, config_summary: e.target.value })}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:border-[#0F172B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPolicy(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#0F172B] hover:bg-[#1E293B] text-white">
                  Save Policy Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
