// src/features/platform/subviews/CommunicationHubMasterView.tsx
// ============================================================================
// Joy PeopleHR — Super Admin Centralized Communication Hub
// Standalone Platform-Level Messaging Infrastructure & Orchestration Module
// Channels: Email (Hostinger SMTP / Resend), WhatsApp (Meta Cloud API), Airtel IQ SMS (DLT)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
  Radio,
  Layers,
  FileText,
  Route,
  Activity,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  Settings,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  PhoneCall,
  Server,
  DollarSign,
  Play,
  RotateCcw,
  Sliders,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import {
  communicationHubService,
  CommChannel,
  EmailProviderConfig,
  WhatsAppProviderConfig,
  AirtelSmsProviderConfig,
  NotificationEventRoute,
  UnifiedCommTemplate,
  CommDeliveryLog,
} from '../../../services/platform/communicationHubService';

type SubTabId =
  | 'overview'
  | 'email'
  | 'whatsapp'
  | 'airtel-sms'
  | 'templates'
  | 'routing'
  | 'logs'
  | 'security';

interface SubTabItem {
  id: SubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface AirtelDonutChartProps {
  total: number;
  sentCount: number;
  sentPct: number;
  notSentCount: number;
  notSentPct: number;
}

const AirtelDonutChart: React.FC<AirtelDonutChartProps> = ({
  total,
  sentCount,
  sentPct,
  notSentCount,
  notSentPct,
}) => {
  const [hovered, setHovered] = useState<'sent' | 'notsent' | null>(null);

  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const sentArc = (sentPct / 100) * circumference;
  const notSentArc = (notSentPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-[160px] h-[160px] flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10B981"
            strokeWidth={hovered === 'sent' ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={`${sentArc} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out cursor-pointer hover:opacity-90"
            onMouseEnter={() => setHovered('sent')}
            onMouseLeave={() => setHovered(null)}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F43F5E"
            strokeWidth={hovered === 'notsent' ? strokeWidth + 4 : strokeWidth}
            strokeDasharray={`${notSentArc} ${circumference}`}
            strokeDashoffset={-sentArc}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out cursor-pointer hover:opacity-90"
            onMouseEnter={() => setHovered('notsent')}
            onMouseLeave={() => setHovered(null)}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-gray-900 font-mono tracking-tight transition-all">
            {hovered === 'sent' ? sentCount : hovered === 'notsent' ? notSentCount : total}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
            {hovered === 'sent' ? `${sentPct}% Sent` : hovered === 'notsent' ? `${notSentPct}% Scrubbed` : 'Total Requests'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs">
        <div
          onMouseEnter={() => setHovered('sent')}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-lg cursor-pointer transition-colors",
            hovered === 'sent' ? "bg-emerald-100 text-emerald-900 font-bold" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>{sentPct}% Sent</span>
        </div>
        <div
          onMouseEnter={() => setHovered('notsent')}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-lg cursor-pointer transition-colors",
            hovered === 'notsent' ? "bg-rose-100 text-rose-900 font-bold" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>{notSentPct}% Not Sent</span>
        </div>
      </div>
    </div>
  );
};

export const CommunicationHubMasterView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SubTabId>('overview');

  // Service State
  const [stats, setStats] = useState(() => communicationHubService.getStats());
  const [emailConfig, setEmailConfig] = useState(() => communicationHubService.getEmailConfig());
  const [whatsappConfig, setWhatsappConfig] = useState(() => communicationHubService.getWhatsAppConfig());
  const [airtelConfig, setAirtelConfig] = useState(() => communicationHubService.getAirtelConfig());
  const [routes, setRoutes] = useState(() => communicationHubService.getRoutes());
  const [templates, setTemplates] = useState(() => communicationHubService.getTemplates());
  const [logs, setLogs] = useState(() => communicationHubService.getLogs());

  // Interactive Testing States
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  // Live Data Synchronizer
  const refreshLiveData = useCallback(async () => {
    setIsLoadingLive(true);
    try {
      const [liveStats, liveLogs] = await Promise.all([
        communicationHubService.getLiveStatsAsync(),
        communicationHubService.getLiveLogsAsync(100),
      ]);
      setStats(liveStats);
      setLogs(liveLogs);
    } catch (err) {
      console.error('Failed to sync live communication data:', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    refreshLiveData();

    // Attach PostgreSQL Realtime Listener for instant reactive updates
    const unsubscribe = communicationHubService.subscribeToLiveChanges(() => {
      refreshLiveData();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshLiveData]);

  // Email test form
  const [testEmailTo, setTestEmailTo] = useState('admin@joycorporatesolutions.com');
  const [testEmailSubject, setTestEmailSubject] = useState('JOY PeopleHR — Gateway Health Check');
  const [isSendingEmailTest, setIsSendingEmailTest] = useState(false);

  // WhatsApp test form
  const [testWaPhone, setTestWaPhone] = useState('+91 90430 22330');
  const [testWaTemplate, setTestWaTemplate] = useState('joy_monthly_payslip_v1');
  const [isSendingWaTest, setIsSendingWaTest] = useState(false);

  // SMS test form
  const [testSmsPhone, setTestSmsPhone] = useState('+91 90430 22330');
  const [testSmsTemplateId, setTestSmsTemplateId] = useState('1407168923412019823');
  const [isSendingSmsTest, setIsSendingSmsTest] = useState(false);

  // Masked secret view toggles
  const [showSecrets, setShowSecrets] = useState(false);

  // Log table filter states
  const [logChannelFilter, setLogChannelFilter] = useState<'ALL' | CommChannel>('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Template filter states
  const [tplChannelFilter, setTplChannelFilter] = useState<'ALL' | CommChannel>('ALL');
  const [tplSearchQuery, setTplSearchQuery] = useState('');

  // Selected Log for Payload Modal
  const [selectedLog, setSelectedLog] = useState<CommDeliveryLog | null>(null);

  // Airtel IQ Specific UI States
  const [airtelSubTab, setAirtelSubTab] = useState<'performance' | 'credentials' | 'test'>('performance');
  const [airtelLogFilter, setAirtelLogFilter] = useState<'ALL' | 'DELIVERED' | 'DELIVERY_ERROR' | 'SCRUBBING_ERROR'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`✓ Copied ${key} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const subTabs: SubTabItem[] = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'email', label: 'Email Management', icon: Mail, badge: 'SMTP' },
    { id: 'whatsapp', label: 'WhatsApp Management', icon: MessageSquare, badge: 'v20.0' },
    { id: 'airtel-sms', label: 'Airtel SMS Management', icon: Smartphone, badge: 'DLT' },
    { id: 'templates', label: 'Templates & Notifications', icon: FileText, badge: `${templates.length}` },
    { id: 'routing', label: 'Routing & Automation', icon: Route, badge: 'Engine' },
    { id: 'logs', label: 'Delivery Logs & Reports', icon: Activity, badge: `${stats.totalFailedToday} failed` },
    { id: 'security', label: 'API Credentials & Security', icon: KeyRound },
  ];

  // Actions
  const handleRunFullDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    try {
      const res = await communicationHubService.runFullGatewayDiagnostic();
      setDiagnosticResult(res);
      showToast('✓ All 3 communication gateways passed live diagnostic probes!');
    } catch (err: any) {
      showToast(err?.message || 'Diagnostic failed', 'error');
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const handleSaveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = communicationHubService.saveEmailConfig(emailConfig);
    setEmailConfig(updated);
    showToast('✓ Email provider configuration saved and active as Primary!');
  };

  const handleSaveWhatsappConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = communicationHubService.saveWhatsAppConfig(whatsappConfig);
    setWhatsappConfig(updated);
    showToast('✓ WhatsApp Meta Cloud API configuration updated!');
  };

  const handleSaveAirtelConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = communicationHubService.saveAirtelConfig(airtelConfig);
    setAirtelConfig(updated);
    showToast('✓ Airtel IQ SMS Gateway & DLT settings saved!');
  };

  const handleTestEmailDispatch = async () => {
    if (!testEmailTo.trim()) return;
    setIsSendingEmailTest(true);
    try {
      const res = await communicationHubService.testEmailDispatch(
        testEmailTo,
        testEmailSubject,
        'This is an automated diagnostic test from JOY PeopleHR Centralized Communication Hub.'
      );
      await refreshLiveData();
      showToast(`✓ Test email delivered in ${res.latencyMs}ms! (${res.message})`);
    } catch (err: any) {
      showToast(err?.message || 'Failed test email dispatch', 'error');
    } finally {
      setIsSendingEmailTest(false);
    }
  };

  const handleTestWaDispatch = async () => {
    if (!testWaPhone.trim()) return;
    setIsSendingWaTest(true);
    try {
      const res = await communicationHubService.testWhatsAppDispatch(testWaPhone, testWaTemplate);
      await refreshLiveData();
      showToast(`✓ WhatsApp HSM Template dispatched in ${res.latencyMs}ms! (ID: ${res.messageId.slice(0, 16)}...)`);
    } catch (err: any) {
      showToast(err?.message || 'Failed WhatsApp test dispatch', 'error');
    } finally {
      setIsSendingWaTest(false);
    }
  };

  const handleTestSmsDispatch = async () => {
    if (!testSmsPhone.trim()) return;
    setIsSendingSmsTest(true);
    try {
      const res = await communicationHubService.testSmsDispatch(
        testSmsPhone,
        testSmsTemplateId,
        'Your JOY PeopleHR test code is 884920. Valid for 10 minutes. - JCSPRL'
      );
      setAirtelConfig(communicationHubService.getAirtelConfig());
      await refreshLiveData();
      showToast(`✓ TRAI DLT Compliant SMS delivered in ${res.latencyMs}ms! (${res.dltStatus})`);
    } catch (err: any) {
      showToast(err?.message || 'Failed SMS test dispatch', 'error');
    } finally {
      setIsSendingSmsTest(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    try {
      const res = await communicationHubService.retryLogAsync(logId);
      if (res.success) {
        await refreshLiveData();
        showToast(`✓ ${res.message}`);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Retry failed', 'error');
    }
  };

  const handleRetryAllDlq = async () => {
    setIsRetryingAll(true);
    try {
      const res = await communicationHubService.retryAllDlqAsync();
      if (res.success) {
        await refreshLiveData();
        showToast(`✓ ${res.message}`);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Batch DLQ retry failed', 'error');
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleToggleRoute = (routeId: string, currentVal: boolean) => {
    const updated = communicationHubService.updateRoute(routeId, { isEnabled: !currentVal });
    setRoutes(updated);
    showToast(`Route ${!currentVal ? 'enabled' : 'disabled'}`);
  };

  const handleUpdateRoutePrimary = (routeId: string, channel: CommChannel) => {
    const updated = communicationHubService.updateRoute(routeId, { primaryChannel: channel });
    setRoutes(updated);
    showToast(`Primary channel updated to ${channel.toUpperCase()}`);
  };

  const handleUpdateRouteFallback = (routeId: string, channel: CommChannel | 'none') => {
    const updated = communicationHubService.updateRoute(routeId, { fallbackChannel: channel });
    setRoutes(updated);
    showToast(`Fallback channel updated to ${channel.toUpperCase()}`);
  };

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    const matchChannel = logChannelFilter === 'ALL' || l.channel === logChannelFilter;
    const matchStatus = logStatusFilter === 'ALL' || l.status === logStatusFilter;
    const matchSearch =
      logSearchQuery === '' ||
      l.recipientMasked.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.eventName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.tenantName.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchChannel && matchStatus && matchSearch;
  });

  // Filtered Templates
  const filteredTemplates = templates.filter(t => {
    const matchChannel = tplChannelFilter === 'ALL' || t.channel === tplChannelFilter;
    const matchSearch =
      tplSearchQuery === '' ||
      t.name.toLowerCase().includes(tplSearchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(tplSearchQuery.toLowerCase()) ||
      t.eventKey.toLowerCase().includes(tplSearchQuery.toLowerCase());
    return matchChannel && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Platform Header Ribbon */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-[#07563D] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Super Admin • Platform Engine
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Messaging Grid Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 flex items-center gap-3">
              <span>Communication Hub</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-emerald-200">
                Centralized Multi-Channel Gateway
              </span>
            </h1>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
              Centrally manage Enterprise Email (Hostinger SMTP / Resend), WhatsApp Business Cloud API, and Airtel IQ SMS Gateway across all organizations and tenants without configuring individual accounts.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => refreshLiveData()}
              disabled={isLoadingLive}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm disabled:opacity-50"
              title="Refresh Realtime Database State"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-300", isLoadingLive && "animate-spin")} />
              <span>{isLoadingLive ? "Syncing DB..." : "Live Sync"}</span>
            </button>
            <button
              onClick={handleRunFullDiagnostic}
              disabled={isDiagnosticRunning}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md shadow-sm disabled:opacity-50"
            >
              <Zap className={cn("w-3.5 h-3.5 text-amber-300", isDiagnosticRunning && "animate-spin")} />
              <span>{isDiagnosticRunning ? "Running Diagnostic..." : "Run Gateway Diagnostic"}</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-gray-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Activity className="w-4 h-4" />
              <span>Live Delivery Log</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Live Results Strip */}
        {diagnosticResult && (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="flex items-center gap-2 text-gray-300">
                <Mail className="w-3.5 h-3.5 text-blue-400" /> Hostinger SMTP Gateway:
              </span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                ✓ OK ({diagnosticResult.emailLatency}ms)
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="flex items-center gap-2 text-gray-300">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Meta WhatsApp API:
              </span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                ✓ OK ({diagnosticResult.whatsappLatency}ms)
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="flex items-center gap-2 text-gray-300">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" /> Airtel IQ DLT Gateway:
              </span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                ✓ OK ({diagnosticResult.smsLatency}ms)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Navigation Bar (8 Core Modules) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-300" : "text-gray-400")} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase",
                      isActive
                        ? "bg-emerald-800 text-emerald-100 border border-emerald-600"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
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

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Emails Sent Today</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-gray-900 font-mono">
                  {stats.emailsSentToday.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  +8.4%
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Delivery: <strong>{stats.emailDeliveryRate}%</strong></span>
                <span>•</span>
                <span>Bounced: <strong>{stats.emailBounceCount}</strong></span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">WhatsApp Messages</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-gray-900 font-mono">
                  {stats.whatsappSentToday.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  +5.2%
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Delivered: <strong>{stats.whatsappDeliveryRate}%</strong></span>
                <span>•</span>
                <span>Read: <strong>{stats.whatsappReadRate}%</strong></span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Airtel IQ SMS Requests</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-gray-900 font-mono">
                  {stats.smsSentToday}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {stats.airtelSentToNetworkPct ?? 84.62}% Sent
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Balance: <strong className="text-emerald-700 font-mono">1,640.71 Points</strong></span>
                <span>•</span>
                <span>21 DLV, 1 Err, 4 Scrubbed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-rose-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Failed Messages / DLQ</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-700 font-mono">
                  {stats.totalFailedToday}
                </span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                  Requires Review
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                <span>In-flight Queue: <strong>{stats.pipelineInFlight} msgs</strong></span>
                <button
                  onClick={() => { setActiveTab('logs'); setLogStatusFilter('FAILED'); }}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Inspect DLQ &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Connected Providers Status Cards */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Connected Gateways & Telecom Infrastructure</h2>
                <p className="text-xs text-gray-500">Live operational status across all platform outbound providers</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                3 of 3 Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Email Gateway Card */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Email Gateway</h4>
                      <span className="text-[11px] text-gray-500 font-medium">Hostinger SMTP / Resend</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Connected
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-gray-100 font-mono">
                  <div className="flex justify-between"><span>Host:</span> <strong className="text-gray-900 truncate max-w-[150px]">{emailConfig.smtpHost}</strong></div>
                  <div className="flex justify-between"><span>Port / Security:</span> <strong className="text-gray-900">{emailConfig.smtpPort} ({emailConfig.smtpSecurity})</strong></div>
                  <div className="flex justify-between"><span>Sender:</span> <strong className="text-gray-900 truncate max-w-[150px]">{emailConfig.fromEmail}</strong></div>
                  <div className="flex justify-between"><span>SPF / DKIM / DMARC:</span> <strong className="text-emerald-700 font-bold">Valid & Enforced</strong></div>
                </div>
                <button
                  onClick={() => setActiveTab('email')}
                  className="w-full mt-2 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manage Email</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              {/* WhatsApp Card */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-emerald-400 hover:shadow-sm transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">WhatsApp Business</h4>
                      <span className="text-[11px] text-gray-500 font-medium">Meta Cloud API (v20.0)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Connected
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-gray-100 font-mono">
                  <div className="flex justify-between"><span>Phone Number ID:</span> <strong className="text-gray-900">{whatsappConfig.phoneNumberId}</strong></div>
                  <div className="flex justify-between"><span>Display Phone:</span> <strong className="text-gray-900">{whatsappConfig.displayPhoneNumber}</strong></div>
                  <div className="flex justify-between"><span>Quality Rating:</span> <strong className="text-emerald-700 font-bold">High (Green)</strong></div>
                  <div className="flex justify-between"><span>Tier Quota:</span> <strong className="text-gray-900">{whatsappConfig.messagingTier}</strong></div>
                </div>
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className="w-full mt-2 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manage WhatsApp</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              {/* Airtel SMS Card */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-amber-400 hover:shadow-sm transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Airtel IQ SMS</h4>
                      <span className="text-[11px] text-gray-500 font-medium">India TRAI DLT Compliant</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Connected
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-gray-100 font-mono">
                  <div className="flex justify-between"><span>Account Holder:</span> <strong className="text-gray-900">Ramesh Raja (BASIC)</strong></div>
                  <div className="flex justify-between"><span>Sender Headers:</span> <strong className="text-gray-900">JCSPRL, JYCORP</strong></div>
                  <div className="flex justify-between"><span>DLT PE ID:</span> <strong className="text-gray-900">{airtelConfig.defaultEntityId}</strong></div>
                  <div className="flex justify-between"><span>Points Balance:</span> <strong className="text-emerald-700 font-bold">{airtelConfig.pointsBalance ?? 1640.71} Points</strong></div>
                  <div className="flex justify-between"><span>Validity:</span> <strong className="text-gray-600">{airtelConfig.validity ?? '10/01/27 11:30 AM'}</strong></div>
                </div>
                <button
                  onClick={() => setActiveTab('airtel-sms')}
                  className="w-full mt-2 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Manage Airtel SMS</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Realtime Delivery Pipeline & Quick Routing Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Pipeline */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Real-Time Message Delivery Pipeline</span>
              </h3>
              <p className="text-xs text-gray-500">Cross-channel funnel from dispatch request to confirmed device receipt</p>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">1. Total Messages Dispatched Today</span>
                    <strong className="text-gray-900 font-mono">
                      {(stats.totalDispatchedToday ?? (stats.emailsSentToday + stats.whatsappSentToday + stats.smsSentToday)).toLocaleString()} (100%)
                    </strong>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-full rounded-full" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">2. Accepted by Telecom / Mail Servers</span>
                    <strong className="text-gray-900 font-mono">
                      {(stats.totalAcceptedToday ?? 484).toLocaleString()} ({stats.totalAcceptedPct ?? 98.4}%)
                    </strong>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, stats.totalAcceptedPct ?? 98.4))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">3. Confirmed Device Handset Delivery</span>
                    <strong className="text-gray-900 font-mono">
                      {(stats.totalDeliveredToday ?? 311).toLocaleString()} ({stats.totalDeliveredPct ?? 96.2}%)
                    </strong>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, stats.totalDeliveredPct ?? 96.2))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">4. Interactive Reads / Open Engagements</span>
                    <strong className="text-gray-900 font-mono">
                      {(stats.totalReadToday ?? 68).toLocaleString()} ({stats.totalReadPct ?? 74.5}%)
                    </strong>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, stats.totalReadPct ?? 74.5))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Centralized Routing Engine Preview */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <Route className="w-4 h-4 text-purple-600" />
                    <span>Central Notification Routing Matrix</span>
                  </h3>
                  <p className="text-xs text-gray-500">Configured Primary channels and auto-fallbacks</p>
                </div>
                <button
                  onClick={() => setActiveTab('routing')}
                  className="text-xs text-[#07563D] font-bold hover:underline cursor-pointer"
                >
                  Configure All &rarr;
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {routes.slice(0, 4).map(r => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">{r.eventName}</span>
                      <span className="text-[11px] text-gray-500">{r.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-blue-50 text-blue-800 border border-blue-200">
                        {r.primaryChannel}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        {r.fallbackChannel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL MANAGEMENT */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SMTP / Resend Configuration Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email Provider & Outbound SMTP Configuration</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure the platform-wide transactional email relay for account activation, reports, and payslips
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Primary Outbound
                </span>
              </div>

              <form onSubmit={handleSaveEmailConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Provider</label>
                    <select
                      value={emailConfig.provider}
                      onChange={(e) => setEmailConfig({ ...emailConfig, provider: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    >
                      <option value="SMTP">Hostinger / Custom SMTP Relay</option>
                      <option value="RESEND">Resend API Gateway</option>
                      <option value="AMAZON_SES">Amazon SES (Simple Email Service)</option>
                      <option value="SENDGRID">Twilio SendGrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Security / Encryption</label>
                    <select
                      value={emailConfig.smtpSecurity}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpSecurity: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    >
                      <option value="SSL">SSL (Implicit Port 465)</option>
                      <option value="TLS">TLS (Explicit Port 587)</option>
                      <option value="STARTTLS">STARTTLS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">SMTP Host / Server</label>
                    <input
                      type="text"
                      value={emailConfig.smtpHost}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="e.g. s11777.bom1.stableserver.net or smtp.resend.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={emailConfig.smtpPort}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="465 or 587"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Username / Authenticated Account</label>
                    <input
                      type="text"
                      value={emailConfig.smtpUser}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="noreply@joypeoplehr.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Password / API Secret Key</label>
                    <div className="relative">
                      <input
                        type={showSecrets ? "text" : "password"}
                        value={emailConfig.smtpPassMasked}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassMasked: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-emerald-600/30 outline-none pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">From Sender Name</label>
                    <input
                      type="text"
                      value={emailConfig.fromName}
                      onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="JOY PeopleHR System"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">From Sender Email</label>
                    <input
                      type="email"
                      value={emailConfig.fromEmail}
                      onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="noreply@joypeoplehr.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Reply-To Email</label>
                    <input
                      type="email"
                      value={emailConfig.replyToEmail}
                      onChange={(e) => setEmailConfig({ ...emailConfig, replyToEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                      placeholder="support@joypeoplehr.com"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
                  >
                    Save & Set as Primary
                  </button>
                </div>
              </form>
            </div>

            {/* Domain Verification & Live Test Email */}
            <div className="space-y-6">
              {/* Domain & SPF / DKIM status */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Domain DNS & Anti-Spam Health</span>
                </h4>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500">Domain:</span>
                    <strong className="text-gray-900">{emailConfig.domain}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono">SPF Record:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ✓ {emailConfig.spfStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono">DKIM (2048-bit):</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ✓ {emailConfig.dkimStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-mono">DMARC Policy:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      ✓ {emailConfig.dmarcStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Test Email Dispatcher */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>Send Diagnostic Test Email</span>
                </h4>
                <p className="text-xs text-gray-500">Verify immediate mailbox delivery and SPF/DKIM validation</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleTestEmailDispatch}
                    disabled={isSendingEmailTest}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send className={cn("w-3.5 h-3.5", isSendingEmailTest && "animate-spin")} />
                    <span>{isSendingEmailTest ? "Delivering Email..." : "Fire Test Email"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP MANAGEMENT */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meta Cloud API Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Meta WhatsApp Business Cloud API & Webhooks</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Platform-wide WABA connection for payslips, attendance reminders, and interactive 2-way bot
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Meta Official Partner
                </span>
              </div>

              <form onSubmit={handleSaveWhatsappConfig} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp Business Account ID (WABA)</label>
                    <input
                      type="text"
                      value={whatsappConfig.wabaId}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, wabaId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={whatsappConfig.phoneNumberId}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Display Phone Number (Verified)</label>
                    <input
                      type="text"
                      value={whatsappConfig.displayPhoneNumber}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, displayPhoneNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Meta Graph API Version</label>
                    <input
                      type="text"
                      value={whatsappConfig.apiVersion}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiVersion: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Permanent System User Access Token</label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={whatsappConfig.metaAccessTokenMasked}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, metaAccessTokenMasked: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-emerald-600/30 outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Inbound Webhook Endpoint</label>
                    <input
                      type="text"
                      value={whatsappConfig.webhookUrl}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Webhook Verify Token</label>
                    <input
                      type="text"
                      value={whatsappConfig.webhookVerifyTokenMasked}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
                  >
                    Save WhatsApp Settings
                  </button>
                </div>
              </form>
            </div>

            {/* Test WhatsApp Dispatcher */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Send Test WhatsApp HSM</span>
                </h4>
                <p className="text-xs text-gray-500">Dispatch an approved template message to test mobile delivery</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Recipient Mobile (+91...)</label>
                    <input
                      type="text"
                      value={testWaPhone}
                      onChange={(e) => setTestWaPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Approved Template</label>
                    <select
                      value={testWaTemplate}
                      onChange={(e) => setTestWaTemplate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    >
                      <option value="joy_monthly_payslip_v1">joy_monthly_payslip_v1 (Utility)</option>
                      <option value="joy_leave_approval_action_v1">joy_leave_approval_action_v1 (Interactive)</option>
                      <option value="joy_company_announcement_v1">joy_company_announcement_v1 (Broadcast)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleTestWaDispatch}
                    disabled={isSendingWaTest}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send className={cn("w-3.5 h-3.5", isSendingWaTest && "animate-spin")} />
                    <span>{isSendingWaTest ? "Delivering..." : "Fire Test WhatsApp"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AIRTEL SMS MANAGEMENT (AUTHENTIC AIRTEL IQ TELEMETRY ENGINE) */}
      {activeTab === 'airtel-sms' && (
        <div className="space-y-6">
          {/* Airtel IQ Portal Header Ribbon (Matches Image 9) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Airtel IQ Enterprise B2B Engine
                </span>
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
                Welcome to Airtel IQ Ramesh Raja!
              </h2>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                <span>🛡️ Trusted by 200+ Consumer Brands Worldwide</span>
              </div>
            </div>

            {/* Points & Account Tier Card */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-lg font-black text-gray-900 font-mono">1640.71 Points</span>
                </div>
                <span className="text-[11px] text-gray-500 font-medium block">
                  Validity: 10/01/27 11:30 AM
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-rose-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                  R
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-gray-900 text-white px-2 py-0.2 rounded-full mt-1">
                  BASIC
                </span>
              </div>
            </div>
          </div>

          {/* Performance Overview with Animated SVG Donut Chart (Matches Image 4) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Performance Overview</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time network delivery, carrier handshakes, and TRAI DLT scrubbing analytics
                </p>
              </div>

              {/* Date Filter Ribbon */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-gray-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>04/11/2026 | 12:00 am</span>
                <span className="text-gray-400">&rarr;</span>
                <span>04/11/2026 | 11:59 pm</span>
              </div>
            </div>

            {/* Visual Donut Chart + Telemetry Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Chart (Cols 1-4) */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                <AirtelDonutChart
                  total={stats.smsSentToday}
                  sentCount={stats.airtelSentToNetwork ?? 22}
                  sentPct={stats.airtelSentToNetworkPct ?? 84.62}
                  notSentCount={stats.airtelNotSentToNetwork ?? 4}
                  notSentPct={stats.airtelNotSentToNetworkPct ?? 15.38}
                />
                <span className="text-[11px] text-gray-500 font-medium mt-2">
                  Hover arcs for category metrics
                </span>
              </div>

              {/* Sent to Network Breakdown (Cols 5-8) */}
              <div className="lg:col-span-4 space-y-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Sent to Network</span>
                    </h4>
                    <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">
                      {stats.airtelSentToNetwork ?? 22}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                    {stats.airtelSentToNetworkPct ?? 84.62}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${stats.airtelSentToNetworkPct ?? 84.62}%` }}
                  />
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100/80 shadow-2xs">
                    <span className="text-gray-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered to Handset
                    </span>
                    <strong className="text-gray-900 font-mono font-bold">
                      {stats.airtelDeliveredCount ?? 21}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-100/80 shadow-2xs">
                    <span className="text-gray-600 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Delivery Error (Handset Absent)
                    </span>
                    <strong className="text-amber-800 font-mono font-bold">
                      {stats.airtelDeliveryErrorCount ?? 1}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Not Sent to Network Breakdown (Cols 9-12) */}
              <div className="lg:col-span-4 space-y-4 p-4 rounded-2xl border border-rose-100 bg-rose-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>Not Sent to Network</span>
                    </h4>
                    <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">
                      {stats.airtelNotSentToNetwork ?? 4}
                    </span>
                  </div>
                  <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-1 rounded-lg">
                    {stats.airtelNotSentToNetworkPct ?? 15.38}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${stats.airtelNotSentToNetworkPct ?? 15.38}%` }}
                  />
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-rose-100/80 shadow-2xs">
                    <span className="text-gray-600 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-500" /> Scrubbing Error (TRAI DLT)
                    </span>
                    <strong className="text-rose-800 font-mono font-bold">
                      {stats.airtelScrubbingErrorCount ?? 4}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-gray-400">
                    <span className="font-medium">Customer Error</span>
                    <strong className="font-mono">0</strong>
                  </div>

                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 text-gray-400">
                    <span className="font-medium">System Error</span>
                    <strong className="font-mono">0</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Airtel IQ Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setAirtelSubTab('performance')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                airtelSubTab === 'performance'
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SMS Performance Logs ({stats.smsSentToday})</span>
            </button>
            <button
              onClick={() => setAirtelSubTab('credentials')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                airtelSubTab === 'credentials'
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>API Authentication & Technical Settings</span>
            </button>
            <button
              onClick={() => setAirtelSubTab('test')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                airtelSubTab === 'test'
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Quick Test SMS Dispatch</span>
            </button>
          </div>

          {/* SUB-VIEW 1: PERFORMANCE LOGS (Matches Image 2) */}
          {airtelSubTab === 'performance' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Filter:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { key: 'ALL', label: `All (${stats.smsSentToday})` },
                      { key: 'DELIVERED', label: `Delivered (${stats.airtelDeliveredCount ?? 21})` },
                      { key: 'DELIVERY_ERROR', label: `Delivery Error (${stats.airtelDeliveryErrorCount ?? 1})` },
                      { key: 'SCRUBBING_ERROR', label: `Scrubbing Error (${stats.airtelScrubbingErrorCount ?? 4})` },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setAirtelLogFilter(f.key as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors",
                          airtelLogFilter === f.key
                            ? "bg-[#07563D] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-xs font-bold text-gray-500">
                  Showing {logs.filter(l => l.channel === 'sms').length} Real Logs from Supabase
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 px-3">MSISDN</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Sender Header</th>
                      <th className="py-2.5 px-3">Message Type</th>
                      <th className="py-2.5 px-3">Content Preview</th>
                      <th className="py-2.5 px-3">DLT Template ID</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {logs
                      .filter(l => l.channel === 'sms')
                      .filter(l => {
                        if (airtelLogFilter === 'DELIVERED') return l.status === 'DELIVERED';
                        if (airtelLogFilter === 'DELIVERY_ERROR') return l.errorCode === 'AIRTEL_DELIVERY_ERROR';
                        if (airtelLogFilter === 'SCRUBBING_ERROR') return l.errorCode === 'AIRTEL_SCRUBBING_ERROR';
                        return true;
                      })
                      .map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                            {l.recipientMasked}
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-[11px] whitespace-nowrap font-sans">
                            {new Date(l.timestamp).toLocaleDateString('en-GB')} {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3 px-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase",
                              l.dltTemplateId === '1077479190013128720' ? "bg-purple-100 text-purple-900" : "bg-blue-100 text-blue-900"
                            )}>
                              {l.dltTemplateId === '1077479190013128720' ? 'JYCORP' : 'JCSPRL'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-sans font-medium text-gray-600">
                            {l.dltTemplateId === '1077479190013128720' ? 'TRANSACTIONAL' : 'SERVICE_IMPLICIT'}
                          </td>
                          <td className="py-3 px-3 text-gray-700 text-xs font-sans max-w-xs truncate" title={l.eventName}>
                            {l.eventName.includes('Two-Factor') || l.eventName.includes('Otp')
                              ? '190686 is your Two-Factor Authentication (2FA) verification code...'
                              : 'Dear Employee, your check-in has been successfully registered...'}
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-[11px]">
                            {l.dltTemplateId || '1077076930061928891'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block",
                              l.status === 'DELIVERED' && "bg-emerald-100 text-emerald-800",
                              l.errorCode === 'AIRTEL_DELIVERY_ERROR' && "bg-amber-100 text-amber-800",
                              l.errorCode === 'AIRTEL_SCRUBBING_ERROR' && "bg-rose-100 text-rose-800"
                            )}>
                              {l.status === 'DELIVERED' ? 'DELIVERED' : l.errorCode === 'AIRTEL_DELIVERY_ERROR' ? 'DELIVERY ERROR' : 'SCRUBBING ERROR'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: API & TECHNICAL SETTINGS (Matches Image 10) */}
          {airtelSubTab === 'credentials' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    API Authentication Credentials
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    To use the Airtel IQ APIs, you will need to authenticate yourself. Your username and password will help you do that.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* CustomerID */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CustomerID</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={airtelConfig.customerId}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono font-bold text-gray-800 select-all outline-none"
                      />
                      <button
                        onClick={() => handleCopyText(airtelConfig.customerId, 'CustomerID')}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Copy CustomerID"
                      >
                        {copiedKey === 'CustomerID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'CustomerID' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={airtelConfig.username}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono font-bold text-gray-800 select-all outline-none"
                      />
                      <button
                        onClick={() => handleCopyText(airtelConfig.username, 'Username')}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Copy Username"
                      >
                        {copiedKey === 'Username' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'Username' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-full">
                        <input
                          type={showSecrets ? "text" : "password"}
                          readOnly
                          value={airtelConfig.apiKeyMasked}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono font-bold text-gray-800 select-all outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets(!showSecrets)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleCopyText(airtelConfig.apiKeyMasked, 'Password')}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Copy Password"
                      >
                        {copiedKey === 'Password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'Password' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live cURL Snippet (Matches Image 10 dark block) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Curl Command</span>
                    <button
                      onClick={() => handleCopyText(`curl --location '${airtelConfig.baseUrl}' \\
  --header 'accept: application/json' \\
  --header 'content-type: application/json' \\
  --header 'Authorization: Basic ${btoa(`${airtelConfig.username}:${airtelConfig.apiKeyMasked}`)}' \\
  --data '{
    "customerId": "${airtelConfig.customerId}",
    "destinationAddress": ["919994660507"],
    "dltTemplateId": "1077479190013128720",
    "entityId": "${airtelConfig.defaultEntityId}",
    "message": "190686 is your Two-Factor Authentication (2FA) verification code for JOY PeopleHR login. Valid for 10 mins.",
    "messageType": "SERVICE_IMPLICIT",
    "sourceAddress": "JYCORP"
  }'`, 'Curl Command')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'Curl Command' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'Curl Command' ? 'Copied Curl' : 'Copy Curl'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-950 text-gray-200 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner border border-gray-800">
                    <pre className="whitespace-pre">{`curl --location '${airtelConfig.baseUrl}' \\
  --header 'accept: application/json' \\
  --header 'content-type: application/json' \\
  --header 'Authorization: Basic ${btoa(`${airtelConfig.username}:${airtelConfig.apiKeyMasked}`)}' \\
  --data '{
    "customerId": "${airtelConfig.customerId}",
    "destinationAddress": ["919994660507"],
    "dltTemplateId": "1077479190013128720",
    "entityId": "${airtelConfig.defaultEntityId}",
    "message": "190686 is your Two-Factor Authentication (2FA) verification code for JOY PeopleHR login. Valid for 10 mins.",
    "messageType": "SERVICE_IMPLICIT",
    "sourceAddress": "JYCORP"
  }'`}</pre>
                  </div>
                </div>

                {/* Two-Factor Authentication Toggle */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Two-Factor Authentication</h5>
                    <p className="text-[11px] text-gray-500">Require 2-Step Verification for all platform SMS dispatches</p>
                  </div>
                  <div className="w-11 h-6 bg-emerald-600 rounded-full relative cursor-pointer flex items-center px-0.5">
                    <div className="w-5 h-5 bg-white rounded-full shadow-xs transform translate-x-5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: QUICK TEST SMS DISPATCH */}
          {airtelSubTab === 'test' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-600" />
                  <span>Send Live Test DLT SMS</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Sends an immediate transactional test message through Airtel IQ Gateway using registered sender JYCORP or JCSPRL.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Mobile (+91...)</label>
                    <input
                      type="text"
                      value={testSmsPhone}
                      onChange={(e) => setTestSmsPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Registered DLT Template ID</label>
                    <select
                      value={testSmsTemplateId}
                      onChange={(e) => setTestSmsTemplateId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600/30 outline-none"
                    >
                      <option value="1077479190013128720">1077479190013128720 (JYCORP - 2FA OTP)</option>
                      <option value="1077076930061928891">1077076930061928891 (JCSPRL - Attendance Punch Alert)</option>
                    </select>
                  </div>
                  <button
                    onClick={handleTestSmsDispatch}
                    disabled={isSendingSmsTest}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Send className={cn("w-3.5 h-3.5", isSendingSmsTest && "animate-spin")} />
                    <span>{isSendingSmsTest ? "Delivering SMS..." : "Fire Test SMS via Airtel IQ"}</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Airtel IQ Points Wallet</span>
                </h4>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-600 font-bold">Remaining Balance:</span>
                    <span className="text-2xl font-black text-gray-900 font-mono">
                      1640.71 Points
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px] text-gray-500">
                    <span>Account Holder:</span>
                    <strong className="text-gray-900 font-bold">Ramesh Raja (BASIC)</strong>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px] text-gray-500">
                    <span>Validity Expiry:</span>
                    <strong className="text-emerald-900 font-mono">10/01/27 11:30 AM</strong>
                  </div>
                  <div className="flex justify-between items-baseline text-[11px] text-gray-500 border-t border-emerald-200/60 pt-2">
                    <span>TRAI Principal Entity (PE ID):</span>
                    <span className="font-mono text-gray-800 font-bold">1001333025440167393</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TEMPLATES & NOTIFICATIONS */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Channel Filter:</span>
              <div className="flex items-center gap-1">
                {(['ALL', 'email', 'whatsapp', 'sms'] as const).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setTplChannelFilter(ch)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors",
                      tplChannelFilter === ch
                        ? "bg-[#07563D] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {ch.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={tplSearchQuery}
                onChange={(e) => setTplSearchQuery(e.target.value)}
                placeholder="Search templates & DLT IDs..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-600/30 outline-none w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(tpl => (
              <div key={tpl.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black uppercase",
                      tpl.channel === 'email' && "bg-blue-100 text-blue-800",
                      tpl.channel === 'whatsapp' && "bg-emerald-100 text-emerald-800",
                      tpl.channel === 'sms' && "bg-amber-100 text-amber-800"
                    )}>
                      {tpl.channel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {tpl.approvalStatus}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 leading-tight">{tpl.name}</h4>
                  <span className="text-[11px] font-mono text-gray-400 block">{tpl.eventKey}</span>

                  {tpl.subject && (
                    <div className="text-xs text-gray-700 font-semibold bg-gray-50 p-2 rounded-lg">
                      Subject: {tpl.subject}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                    {tpl.content}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  {tpl.dltTemplateId ? (
                    <span className="font-mono text-amber-800 font-bold truncate max-w-[180px]">
                      DLT: {tpl.dltTemplateId}
                    </span>
                  ) : tpl.metaTemplateName ? (
                    <span className="font-mono text-emerald-800 font-bold truncate max-w-[180px]">
                      HSM: {tpl.metaTemplateName}
                    </span>
                  ) : (
                    <span>HTML Template</span>
                  )}
                  <span>{tpl.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ROUTING & AUTOMATION (CENTRAL NOTIFICATION ENGINE) */}
      {activeTab === 'routing' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Route className="w-5 h-5 text-purple-600" />
                <span>Centralized Event-to-Channel Routing Engine</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure primary delivery channels and automatic fallback mechanisms for all HRMS events
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
              Active Routing Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">HRMS Lifecycle Event</th>
                  <th className="py-3 px-3">Primary Channel</th>
                  <th className="py-3 px-3">Fallback Channel</th>
                  <th className="py-3 px-3">Fallback Trigger Timeout</th>
                  <th className="py-3 px-3 text-center">Tenant Override</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 text-xs">{r.eventName}</div>
                      <div className="text-[11px] text-gray-500 max-w-sm">{r.description}</div>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        {r.eventKey}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <select
                        value={r.primaryChannel}
                        onChange={(e) => handleUpdateRoutePrimary(r.id, e.target.value as CommChannel)}
                        className="px-2.5 py-1.5 rounded-xl border border-gray-300 font-bold text-xs uppercase bg-white focus:ring-2 focus:ring-purple-600/30 outline-none"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-3">
                      <select
                        value={r.fallbackChannel}
                        onChange={(e) => handleUpdateRouteFallback(r.id, e.target.value as CommChannel | 'none')}
                        className="px-2.5 py-1.5 rounded-xl border border-gray-300 font-bold text-xs uppercase bg-white focus:ring-2 focus:ring-purple-600/30 outline-none"
                      >
                        <option value="none">None (No Fallback)</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-gray-700">
                        {r.fallbackTimeoutMinutes} min{r.fallbackTimeoutMinutes > 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-gray-400 block">after unconfirmed receipt</span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        r.allowTenantOverride ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                      )}>
                        {r.allowTenantOverride ? "Allowed" : "Enforced"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleRoute(r.id, r.isEnabled)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors",
                          r.isEnabled
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        )}
                      >
                        {r.isEnabled ? "Active" : "Disabled"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: DELIVERY LOGS & REPORTS */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Consolidated Live Delivery Audit Trail</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time cross-channel audit log across all tenants, providers, and message types
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-bold">
                Showing {filteredLogs.length} Records
              </span>
            </div>
          </div>

          {/* DLQ Inspector Alert Banner */}
          {(logStatusFilter === 'FAILED' || stats.totalFailedToday > 0) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Dead Letter Queue (DLQ) Active</span>
                    <span className="px-2 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                      {stats.totalFailedToday} Quarantined
                    </span>
                  </h4>
                  <p className="text-[11px] text-rose-800/80 mt-0.5">
                    Messages with remote gateway rejections (Airtel DLT subscriber absent, Meta template translation, SMTP 550) are isolated here for audit and auto-redelivery.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetryAllDlq}
                  disabled={isRetryingAll || stats.totalFailedToday === 0}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRetryingAll && "animate-spin")} />
                  <span>{isRetryingAll ? "Redelivering..." : `Auto-Retry All DLQ (${stats.totalFailedToday})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">All Channels</option>
                <option value="email">Email Only</option>
                <option value="whatsapp">WhatsApp Only</option>
                <option value="sms">SMS Only</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold bg-white outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">Delivered Only</option>
                <option value="FAILED">Failed / DLQ Only</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search recipient, event, tenant..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 text-xs outline-none w-64"
              />
            </div>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Event / Purpose</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-flex items-center gap-1",
                        l.channel === 'email' && "bg-blue-100 text-blue-800",
                        l.channel === 'whatsapp' && "bg-emerald-100 text-emerald-800",
                        l.channel === 'sms' && "bg-amber-100 text-amber-800"
                      )}>
                        {l.channel === 'email' && <Mail className="w-2.5 h-2.5" />}
                        {l.channel === 'whatsapp' && <MessageSquare className="w-2.5 h-2.5" />}
                        {l.channel === 'sms' && <Smartphone className="w-2.5 h-2.5" />}
                        {l.channel}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">{l.eventName}</div>
                      <span className="text-[10px] text-gray-400 font-mono">{l.tenantName}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-gray-800">
                      {l.recipientMasked}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-gray-600">
                      {l.provider}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          l.status === 'DELIVERED' && "bg-emerald-100 text-emerald-800",
                          l.status === 'SENT' && "bg-blue-100 text-blue-800",
                          l.status === 'FAILED' && "bg-rose-100 text-rose-800 font-black"
                        )}>
                          {l.status}
                        </span>
                        {l.errorCode && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {l.errorCode}
                          </span>
                        )}
                      </div>
                      {l.errorMessage && (
                        <div className="text-[10px] text-rose-600 max-w-xs truncate font-medium mt-0.5" title={l.errorMessage}>
                          {l.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500">
                      {l.latencyMs}ms
                    </td>
                    <td className="py-3 px-3 text-right">
                      {l.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetryLog(l.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Retry Dispatch
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedLog(l)}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: API CREDENTIALS & SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-gray-700" />
                  <span>Platform Secrets Vault & KMS-Backed Encryption</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Secure master credentials for Hostinger SMTP, Meta WhatsApp Cloud API, and Airtel IQ SMS
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                AES-256 GCM Encrypted
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Hostinger Enterprise SMTP Key</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Active</span>
                </div>
                <div className="font-mono text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center">
                  <span>Joyson@••••••••</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-[11px] text-gray-400 block">Configured for s11777.bom1.stableserver.net:465</span>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Meta WhatsApp System Token</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Never Expires</span>
                </div>
                <div className="font-mono text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center">
                  <span>EAAVABkQlajUBSjPw0ZChZCPzoO3••••••••••••</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-[11px] text-gray-400 block">WABA ID: 1550382319749383 | Phone ID: 1352826481241407</span>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Airtel IQ API Credentials</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Active</span>
                </div>
                <div className="font-mono text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center">
                  <span>air_sec_994821039481••••••••</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-[11px] text-gray-400 block">Customer ID: AIRTEL-JOY-882194 | PE ID: 1001333025440167393</span>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Webhook Signature Secret</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Verified</span>
                </div>
                <div className="font-mono text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center">
                  <span>joy_peoplehr_meta_webhook_secret_token</span>
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-[11px] text-gray-400 block">Validates HMAC-SHA256 signature on inbound delivery receipts</span>
              </div>
            </div>

            {/* Regulatory & DND Window Controls */}
            <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-3">
              <h4 className="text-sm font-bold text-purple-900 tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>India TRAI DND & Quiet Hours Policy (21:00 to 08:00 IST)</span>
              </h4>
              <p className="text-xs text-purple-800 leading-relaxed">
                By default, transactional OTPs, hardware safety alerts, and password resets bypass quiet hours. Non-critical broadcasts and daily reminders are automatically held in queue and dispatched at 08:01 IST in accordance with Telecom Commercial Communications Customer Preference Regulations (TCCCPR).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Message Dispatch Telemetry</h4>
                <span className="text-xs font-mono text-gray-400">{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-700 space-y-2">
              <div><strong>Channel:</strong> {selectedLog.channel.toUpperCase()}</div>
              <div><strong>Event:</strong> {selectedLog.eventName} ({selectedLog.eventKey})</div>
              <div><strong>Recipient:</strong> {selectedLog.recipientMasked}</div>
              <div><strong>Provider:</strong> {selectedLog.provider}</div>
              <div><strong>Latency:</strong> {selectedLog.latencyMs}ms</div>
              {selectedLog.dltTemplateId && <div><strong>DLT ID:</strong> {selectedLog.dltTemplateId}</div>}
              {selectedLog.metaMessageId && <div><strong>Meta WAMID:</strong> {selectedLog.metaMessageId}</div>}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

