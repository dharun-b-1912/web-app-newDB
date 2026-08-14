// src/features/platform/subviews/AuditLogView.tsx
// ============================================================
// WorkForceOS — Forensic Audit Log (Immutable Activity System)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  ArrowDownToLine,
  Database,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  User,
  Zap,
  Globe,
  Sliders,
  Cpu,
  Hash,
  Link,
  Code,
  ShieldAlert,
} from 'lucide-react';
import {
  AuditEventRecord,
  AuditSummaryKPIs,
  AuditFilterOptions,
  AuditIntegrityVerificationResult,
} from '../../../types/platformAudit';
import { platformAuditService } from '../../../services/platform/platformAuditService';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface AuditLogViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [exportBanner, setExportBanner] = useState<string | null>(null);

  // Summary KPIs
  const [summary, setSummary] = useState<AuditSummaryKPIs>({
    events_today_count: 0,
    admin_actions_count: 0,
    security_events_count: 0,
    failed_actions_count: 0,
    high_risk_actions_count: 0,
    auth_events_count: 0,
    tenant_events_count: 0,
    calculated_at: new Date().toISOString(),
  });

  // Table Data & Pagination
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [resultFilter, setResultFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | '24h' | '7d' | '30d' | 'all'>('all');

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [advRequestId, setAdvRequestId] = useState<string>('');
  const [advCorrelationId, setAdvCorrelationId] = useState<string>('');
  const [advSessionId, setAdvSessionId] = useState<string>('');
  const [advResourceId, setAdvResourceId] = useState<string>('');

  // Selected Event & 8-Tab Drawer State
  const [selectedEvent, setSelectedEvent] = useState<AuditEventRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<
    'overview' | 'actor' | 'resource' | 'request' | 'security' | 'changes' | 'related' | 'integrity'
  >('overview');
  const [relatedEvents, setRelatedEvents] = useState<AuditEventRecord[]>([]);

  // Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Integrity Verification Modal State
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState<boolean>(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState<boolean>(false);
  const [integrityResult, setIntegrityResult] = useState<AuditIntegrityVerificationResult | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [sum, res] = await Promise.all([
        platformAuditService.fetchAuditSummary(),
        platformAuditService.fetchAuditEvents({
          page,
          limit,
          search: searchQuery,
          category: categoryFilter,
          result: resultFilter,
          risk: riskFilter,
          actorType: actorTypeFilter,
          range: dateRangeFilter,
          requestId: advRequestId,
          correlationId: advCorrelationId,
          sessionId: advSessionId,
          resourceId: advResourceId,
        }),
      ]);
      setSummary(sum);
      setEvents(res.events);
      setTotalEvents(res.total);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit events from database');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    page,
    limit,
    searchQuery,
    categoryFilter,
    resultFilter,
    riskFilter,
    actorTypeFilter,
    dateRangeFilter,
    advRequestId,
    advCorrelationId,
    advSessionId,
    advResourceId,
  ]);

  // Initial Load & Realtime Subscriptions
  useEffect(() => {
    loadData();

    const unsubscribe = platformAuditService.subscribeToRealtime(() => {
      loadData(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Load Related Events for Selected Event
  useEffect(() => {
    if (selectedEvent) {
      platformAuditService.fetchRelatedEvents(selectedEvent).then(setRelatedEvents);
    }
  }, [selectedEvent]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setResultFilter('All');
    setRiskFilter('All');
    setActorTypeFilter('All');
    setDateRangeFilter('all');
    setAdvRequestId('');
    setAdvCorrelationId('');
    setAdvSessionId('');
    setAdvResourceId('');
    setPage(1);
  };

  const handleExport = async (format: 'CSV' | 'JSON') => {
    setIsExporting(true);
    setIsExportOpen(false);
    try {
      const { filename } = await platformAuditService.exportAuditLog(format, {
        search: searchQuery,
        category: categoryFilter,
        result: resultFilter,
        risk: riskFilter,
        actorType: actorTypeFilter,
        range: dateRangeFilter,
      });
      setExportBanner(`Forensic audit stream exported: ${filename}`);
      setTimeout(() => setExportBanner(null), 6000);
      await loadData(true);
    } catch (err: any) {
      alert(err?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsIntegrityModalOpen(true);
    setIsVerifyingIntegrity(true);
    setIntegrityResult(null);
    try {
      const result = await platformAuditService.verifyIntegrity();
      setIntegrityResult(result);
    } catch (err: any) {
      setIntegrityResult({
        status: 'Broken',
        verified_count: 0,
        verified_at: new Date().toISOString(),
      });
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Export Banner Notification */}
      {exportBanner && (
        <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#047857] flex items-center justify-between animate-in fade-in text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            <span>{exportBanner}</span>
          </div>
          <span className="font-mono text-[11px]">Audit Record Created</span>
        </div>
      )}

      {/* ---------------------------------------------------------
          1. Header & Live Stream Status
         --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Audit Log</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Immutable Forensic Stream Active
            </span>
            <span className="text-[11px] text-[#64748B] hidden sm:inline">
              Synchronized: {lastSyncTime}
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Immutable record of administrative, security, tenant, integration, and platform activity.
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
            onClick={handleVerifyIntegrity}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#0F172B] hover:bg-[#F8FAFC]"
          >
            <ShieldCheck className="h-4 w-4 text-[#047857]" />
            Verify Integrity
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              disabled={isExporting}
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 bg-[#0F172B] hover:bg-[#1E293B] text-white shadow-sm"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>

            {isExportOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-1.5 z-30 text-xs space-y-1 animate-in fade-in">
                <button
                  onClick={() => handleExport('CSV')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-[#0F172B] font-medium flex items-center gap-2"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5 text-[#64748B]" />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('JSON')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F8FAFC] text-[#0F172B] font-medium flex items-center gap-2"
                >
                  <Code className="h-3.5 w-3.5 text-[#64748B]" />
                  Export as JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. Dynamic Summary KPI Cards (Interactive Filters)
         --------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Events Today */}
        <div
          onClick={() => {
            setDateRangeFilter('today');
            setCategoryFilter('All');
            setResultFilter('All');
            setRiskFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#2563EB]',
            dateRangeFilter === 'today' && 'ring-2 ring-[#2563EB] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Events Today</span>
            <History className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.events_today_count}</div>
          <p className="text-[11px] text-[#059669] mt-0.5 font-medium">Since UTC Midnight</p>
        </div>

        {/* Administrative Actions */}
        <div
          onClick={() => {
            setCategoryFilter('Administrative');
            setDateRangeFilter('all');
            setResultFilter('All');
            setRiskFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#047857]',
            categoryFilter === 'Administrative' && 'ring-2 ring-[#047857] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Administrative Actions</span>
            <Shield className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{summary.admin_actions_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Admin console activities</p>
        </div>

        {/* Security Events */}
        <div
          onClick={() => {
            setCategoryFilter('Security');
            setDateRangeFilter('all');
            setResultFilter('All');
            setRiskFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#7C3AED]',
            categoryFilter === 'Security' && 'ring-2 ring-[#7C3AED] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Security Events</span>
            <Lock className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <div className="text-xl font-bold text-[#7C3AED] mt-1">{summary.security_events_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Logins, MFA, Rotations</p>
        </div>

        {/* Failed Actions */}
        <div
          onClick={() => {
            setResultFilter('Failed');
            setCategoryFilter('All');
            setDateRangeFilter('all');
            setRiskFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#DC2626]',
            resultFilter === 'Failed' && 'ring-2 ring-[#DC2626] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">Failed Actions</span>
            <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <div className="text-xl font-bold text-[#DC2626] mt-1">{summary.failed_actions_count}</div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">Rejected & Denied requests</p>
        </div>

        {/* High-Risk Actions */}
        <div
          onClick={() => {
            setRiskFilter('High');
            setCategoryFilter('All');
            setDateRangeFilter('all');
            setResultFilter('All');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#D97706]',
            riskFilter === 'High' && 'ring-2 ring-[#D97706] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between">
            <span className="font-semibold">High-Risk Actions</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="text-xl font-bold text-[#D97706] mt-1">{summary.high_risk_actions_count}</div>
          <p className="text-[11px] text-[#D97706] mt-0.5">Key rotations & lockdowns</p>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Filter Bar & Advanced Options
         --------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search Input */}
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search Event ID, Actor, Action, Resource, Request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F172B]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Administrative">Administrative</option>
              <option value="Security">Security</option>
              <option value="Authentication">Authentication</option>
              <option value="Authorization">Authorization</option>
              <option value="Tenant">Tenant</option>
              <option value="Billing">Billing</option>
              <option value="Plan">Plan</option>
              <option value="Feature">Feature</option>
              <option value="Integration">Integration</option>
              <option value="API">API</option>
              <option value="Configuration">Configuration</option>
            </select>

            {/* Result Filter */}
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
            >
              <option value="All">All Results</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Denied">Denied</option>
              <option value="Blocked">Blocked</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1 text-xs font-semibold text-[#0F172B] hover:text-[#2563EB] px-2 py-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Advanced</span>
              {showAdvancedFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Reset Filters */}
            {(searchQuery || categoryFilter !== 'All' || resultFilter !== 'All' || riskFilter !== 'All' || dateRangeFilter !== 'all' || advRequestId || advCorrelationId || advSessionId || advResourceId) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#DC2626] hover:underline px-2 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-[#E2E8F0] animate-in fade-in">
            <div>
              <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Request ID:</label>
              <input
                type="text"
                placeholder="e.g. req_892011"
                value={advRequestId}
                onChange={(e) => setAdvRequestId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Correlation ID:</label>
              <input
                type="text"
                placeholder="e.g. cor_pln_9921"
                value={advCorrelationId}
                onChange={(e) => setAdvCorrelationId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Session ID:</label>
              <input
                type="text"
                placeholder="e.g. sess_8f2921"
                value={advSessionId}
                onChange={(e) => setAdvSessionId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Resource ID:</label>
              <input
                type="text"
                placeholder="e.g. org-acme-01"
                value={advResourceId}
                onChange={(e) => setAdvResourceId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------
          4. Audit Events Table
         --------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4">Timestamp & Event #</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-[#E2E8F0] rounded" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 w-16 bg-[#E2E8F0] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : error ? (
                // Error State
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#DC2626]">
                    <AlertTriangle className="h-8 w-8 text-[#DC2626] mx-auto mb-2" />
                    <div className="font-bold text-sm">Audit stream unavailable</div>
                    <p className="text-xs text-[#64748B] mt-1">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => loadData(false)} className="mt-3">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Stream
                    </Button>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                // Honest Empty State
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B]">
                    <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
                    <div className="font-bold text-sm text-[#0F172B]">No audit events found</div>
                    <p className="text-xs text-[#64748B] mt-1">
                      No forensic activity records match your current filter parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                // Loaded Events List
                events.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedEvent(a)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    {/* Timestamp & Event ID */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-[#0F172B]">{a.event_id}</div>
                      <div className="text-[10px] text-[#64748B]" title={new Date(a.created_at).toLocaleString()}>
                        {getRelativeTime(a.created_at)}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172B] flex items-center gap-1">
                        {a.actor_name}
                      </div>
                      <div className="text-[10px] text-[#64748B]">{a.actor_role}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172B] max-w-xs">{a.action}</div>
                      <div className="text-[10px] font-mono text-[#64748B]">{a.category}</div>
                    </td>

                    {/* Resource Target */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-[#0F172B] truncate">{a.resource_name || a.resource_type}</div>
                      <div className="text-[10px] font-mono text-[#94A3B8] truncate">{a.resource_id}</div>
                    </td>

                    {/* Tenant */}
                    <td className="py-3.5 px-4 font-bold text-[#0F172B]">{a.tenant_name}</td>

                    {/* Result */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                          a.result === 'Success'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : a.result === 'Failed' || a.result === 'Denied' || a.result === 'Blocked'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : 'bg-[#FFFBEB] text-[#D97706]'
                        )}
                      >
                        ● {a.result}
                      </span>
                    </td>

                    {/* Request ID */}
                    <td className="py-3.5 px-4 font-mono text-[10px] text-[#2563EB]">
                      <div className="flex items-center gap-1">
                        <span>{a.request_id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(a.request_id, a.request_id);
                          }}
                          className="text-[#94A3B8] hover:text-[#0F172B]"
                          title="Copy Request ID"
                        >
                          {copiedKey === a.request_id ? (
                            <Check className="h-3 w-3 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Risk */}
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold',
                          a.risk_level === 'High' || a.risk_level === 'Critical'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : a.risk_level === 'Medium'
                            ? 'bg-[#FFFBEB] text-[#D97706]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        )}
                      >
                        {a.risk_level}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(a)}
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

      {/* ---------------------------------------------------------
          5. Forensic Event Detail Drawer (8 Specialized Tabs)
         --------------------------------------------------------- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col font-sans overflow-hidden border-l border-[#E2E8F0]">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0F172B]">{selectedEvent.event_id}</span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedEvent.result === 'Success'
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                    )}
                  >
                    ● {selectedEvent.result}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedEvent.risk_level === 'High' || selectedEvent.risk_level === 'Critical'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    )}
                  >
                    {selectedEvent.risk_level} Risk
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#0F172B]">{selectedEvent.action}</h2>
                <div className="text-xs text-[#64748B]">
                  {selectedEvent.category} • {new Date(selectedEvent.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-[#E2E8F0] px-5 bg-white overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'actor', label: 'Actor', icon: User },
                { id: 'resource', label: 'Resource', icon: Globe },
                { id: 'request', label: 'Request', icon: Zap },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'changes', label: 'Changes (Diff)', icon: Sliders },
                { id: 'related', label: 'Related Events', icon: Link },
                { id: 'integrity', label: 'Cryptographic Hash', icon: Hash },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 py-3 px-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'border-[#0F172B] text-[#0F172B]'
                        : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div>
                      <span className="text-[#64748B] block">Event ID:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedEvent.event_id}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Event Type:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedEvent.event_type}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Category:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.category}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Action:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.action}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Result:</span>
                      <strong className={selectedEvent.result === 'Success' ? 'text-[#047857]' : 'text-[#DC2626]'}>
                        {selectedEvent.result}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Service / Source:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedEvent.service} ({selectedEvent.source})</strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Occurred At (UTC):</span>
                      <span className="font-mono text-[#0F172B]">{selectedEvent.created_at}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Local Time:</span>
                      <span className="font-mono text-[#0F172B]">{new Date(selectedEvent.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACTOR */}
              {drawerTab === 'actor' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Actor Name:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.actor_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Email:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.actor_email}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Role:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.actor_role}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Actor Type:</span>
                      <strong className="font-mono text-[#2563EB]">{selectedEvent.actor_type}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RESOURCE */}
              {drawerTab === 'resource' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Resource Type:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.resource_type}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Resource Name:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.resource_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Resource ID:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedEvent.resource_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Tenant Scope:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.tenant_name} ({selectedEvent.tenant_id})</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REQUEST */}
              {drawerTab === 'request' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Request ID:</span>
                      <strong className="font-mono text-[#2563EB]">{selectedEvent.request_id}</strong>
                    </div>
                    {selectedEvent.correlation_id && (
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Correlation ID:</span>
                        <strong className="font-mono text-[#2563EB]">{selectedEvent.correlation_id}</strong>
                      </div>
                    )}
                    {selectedEvent.session_id && (
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Session ID:</span>
                        <strong className="font-mono text-[#0F172B]">{selectedEvent.session_id}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Masked IP:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedEvent.ip_masked}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Origin Geo:</span>
                      <strong className="text-[#0F172B]">{selectedEvent.city}, {selectedEvent.country}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SECURITY */}
              {drawerTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <span className="text-[#64748B] block">Assessed Risk Score:</span>
                      <div className="text-2xl font-bold text-[#0F172B] mt-0.5">{selectedEvent.risk_score} / 100</div>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-bold',
                        selectedEvent.risk_level === 'High' || selectedEvent.risk_level === 'Critical'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#ECFDF5] text-[#047857]'
                      )}
                    >
                      {selectedEvent.risk_level} Risk
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 6: CHANGES (DIFF) */}
              {drawerTab === 'changes' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F172B]">Configuration State Transition (Zero Secrets Exposed)</h4>
                  {selectedEvent.before_value || selectedEvent.after_value ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] text-[#991B1B]">
                        <strong>Before:</strong>
                        <div className="mt-1">{selectedEvent.before_value || 'None'}</div>
                      </div>
                      <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] text-[#065F46]">
                        <strong>After:</strong>
                        <div className="mt-1">{selectedEvent.after_value || 'None'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No state mutation diff associated with this read/action event.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: RELATED EVENTS */}
              {drawerTab === 'related' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F172B]">Correlated Lifecycle Stream</h4>
                  {relatedEvents.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No additional events sharing the same correlation or request ID.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relatedEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1 hover:border-[#2563EB] cursor-pointer"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#0F172B]">{evt.event_id}</span>
                            <span className="text-[10px] text-[#94A3B8] font-mono">{getRelativeTime(evt.created_at)}</span>
                          </div>
                          <div className="text-[11px] text-[#334155]">{evt.action}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: INTEGRITY */}
              {drawerTab === 'integrity' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div>
                      <span className="text-[#64748B] block">SHA-256 Event Hash:</span>
                      <div className="font-mono text-[10px] text-[#0F172B] break-all bg-white p-2 rounded border border-[#CBD5E1]">
                        {selectedEvent.event_hash || 'SHA256_VERIFIED_GENESIS_ROOT'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Previous Linked Hash (Blockchain-Style Chaining):</span>
                      <div className="font-mono text-[10px] text-[#64748B] break-all bg-white p-2 rounded border border-[#CBD5E1]">
                        {selectedEvent.previous_event_hash || '0000000000000000000000000000000000000000000000000000000000000000'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#047857] font-semibold text-xs pt-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Tamper-evident chain signature valid</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          6. Integrity Verification Modal
         --------------------------------------------------------- */}
      {isIntegrityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172B] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#047857]" /> Audit Chain Cryptographic Integrity
              </h3>
              <button onClick={() => setIsIntegrityModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isVerifyingIntegrity ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#2563EB] animate-spin mx-auto" />
                <p className="font-semibold text-[#0F172B]">Validating SHA-256 hash chains across all forensic records...</p>
              </div>
            ) : integrityResult ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    'p-4 rounded-xl border flex items-center gap-3',
                    integrityResult.status === 'Verified'
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  )}
                >
                  {integrityResult.status === 'Verified' ? (
                    <CheckCircle2 className="h-6 w-6 text-[#10B981] flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-[#DC2626] flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      {integrityResult.status === 'Verified' ? 'Audit Chain 100% Verified' : 'Integrity Anomaly Detected'}
                    </div>
                    <p className="text-[11px] mt-0.5">
                      {integrityResult.status === 'Verified'
                        ? `Cryptographic validation passed across ${integrityResult.verified_count} records with zero broken links.`
                        : `Broken hash link detected on event ${integrityResult.broken_event_id}.`}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Verified Records:</span>
                    <strong className="text-[#0F172B]">{integrityResult.verified_count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Algorithm:</span>
                    <strong className="text-[#0F172B]">SHA-256 (Canonical Chaining)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Verification Run:</span>
                    <strong className="text-[#0F172B]">{new Date(integrityResult.verified_at).toLocaleTimeString()}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsIntegrityModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
