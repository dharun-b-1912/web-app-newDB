// ============================================================
// Joy PeopleHR — Joy Platform Ops: Live Observability & Diagnostics
// ============================================================
// Comprehensive internal command center for live multi-tenant errors,
// distributed trace explorer, ERR-XXXXX reference inspector, and chaos simulator.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  Clock,
  Building2,
  Database,
  HardDrive,
  User,
  Zap,
  CheckCircle2,
  Copy,
  SlidersHorizontal,
  ChevronRight,
  Terminal,
  Bug,
  Radio,
  Share2,
} from 'lucide-react';
import {
  ObservabilityLogger,
  StructuredTelemetryEntry,
  LogStream,
  LogLevel,
} from '../../../services/observability/observabilityLogger';
import {
  ErrorGroupingEngine,
  SerializableErrorGroup,
  IssueStatus,
} from '../../../services/observability/errorGroupingEngine';
import {
  ErrorReferenceService,
  RecordedErrorReference,
} from '../../../services/observability/errorReferenceService';
import { TelemetryIngestionBridge } from '../../../services/observability/telemetryIngestionBridge';
import { ChaosSimulator } from '../../../services/observability/chaosSimulator';
import { DailyReportGenerator } from '../../../services/observability/dailyReportGenerator';
import { Button } from '../../../components/ui/Button';

export const ObservabilityLiveView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'issues' | 'live_stream' | 'ref_lookup' | 'daily_report'>('issues');
  const [errorGroups, setErrorGroups] = useState<SerializableErrorGroup[]>([]);
  const [liveEntries, setLiveEntries] = useState<StructuredTelemetryEntry[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SerializableErrorGroup | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [refSearchCode, setRefSearchCode] = useState('');
  const [inspectedRef, setInspectedRef] = useState<RecordedErrorReference | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    setErrorGroups(ErrorGroupingEngine.getSerializableGroups());
    setLiveEntries(ObservabilityLogger.getEntries());

    // Subscribe to real-time streams
    const unsubGroups = ErrorGroupingEngine.subscribe((groups) => {
      setErrorGroups(groups);
    });

    const unsubLogs = ObservabilityLogger.subscribe((entry) => {
      setLiveEntries((prev) => [entry, ...prev.slice(0, 199)]);
    });

    return () => {
      unsubGroups();
      unsubLogs();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleLookupRef = (codeToSearch?: string) => {
    const code = codeToSearch || refSearchCode;
    if (!code) return;
    const result = ErrorReferenceService.getByReferenceId(code);
    if (result) {
      setInspectedRef(result);
      setActiveSubTab('ref_lookup');
    } else {
      showToast(`No recorded diagnostic event found for ${code}`);
    }
  };

  const handleStatusChange = (fingerprint: string, status: IssueStatus) => {
    ErrorGroupingEngine.setStatus(fingerprint, status);
    showToast(`Issue ${status.toLowerCase()}`);
  };

  // Filtered Groups
  const filteredGroups = errorGroups.filter((g) => {
    const matchesQuery =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.affectedTenantsList.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSev = selectedSeverity === 'ALL' || g.severity === selectedSeverity;
    return matchesQuery && matchesSev;
  });

  // Filtered Live Stream
  const filteredLogs = liveEntries.filter((e) => {
    const matchesStream = selectedStream === 'ALL' || e.stream === selectedStream;
    const matchesQuery =
      e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.module.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStream && matchesQuery;
  });

  const dailyReport = DailyReportGenerator.generateReport();

  return (
    <div className="space-y-6 font-sans text-[#0F172B]">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F172B] text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-medium border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Zap className="w-3.5 h-3.5 text-[#34D399]" />
          {toastMessage}
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-linear-to-r from-[#0F172B] via-[#1E293B] to-[#0F172B] text-white rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#047857]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-sm">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Joy Platform Ops — Observability & Diagnostics</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#047857]/40 text-[#34D399] border border-[#047857] rounded-full uppercase tracking-wider">
                Production Fleet v2.4.1
              </span>
            </div>
            <p className="text-xs text-white/70 max-w-2xl">
              Centralized platform observability for all tenants. Trace customer errors by Reference Code, inspect stack trees without data leakage, and monitor system health.
            </p>
          </div>

          {/* Quick Chaos / Synthetic Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ref = ChaosSimulator.triggerP1PayrollException();
                showToast(`Triggered P1 Payroll Error: ${ref}`);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 mr-1 text-[#FBBF24]" /> Sim P1 Payroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                ChaosSimulator.triggerAttendanceAnomaly();
                showToast('Triggered Biometric Punch Anomaly (92% Drop)');
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 mr-1 text-[#F87171]" /> Sim Anomaly
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ref = ChaosSimulator.triggerP0DatabaseCrash();
                showToast(`Triggered P0 DB Outage: ${ref}`);
              }}
              className="bg-[#DC2626]/30 hover:bg-[#DC2626]/50 text-[#FCA5A5] border-[#EF4444]/40 text-xs h-8 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#EF4444]" /> Sim P0 DB Outage
            </Button>
          </div>
        </div>

        {/* Global Key Health Counters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 block">Platform Availability</span>
            <span className="text-lg font-bold text-[#34D399]">99.98%</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 block">Grouped Issues</span>
            <span className="text-lg font-bold text-white">{errorGroups.length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 block">P0 / P1 Active</span>
            <span className="text-lg font-bold text-[#F87171]">
              {errorGroups.filter((g) => (g.severity === 'P0' || g.severity === 'P1') && g.status !== 'RESOLVED').length}
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 block">Avg Response Time</span>
            <span className="text-lg font-bold text-white">45ms</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[11px] text-white/60 block">PII Redaction Engine</span>
            <span className="text-lg font-bold text-[#34D399]">100% Active</span>
          </div>
        </div>
      </div>

      {/* Persistence Engine Status Bar */}
      {(() => {
        const syncMetrics = TelemetryIngestionBridge.getSyncMetrics();
        return (
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#047857]" />
              <span className="font-bold text-[#0F172B]">Dual Telemetry Persistence:</span>
              <span className="text-[#047857] font-semibold">PostgreSQL Ingestion Bridge & Resilient Local Store Active</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#64748B] font-medium">
              <span>Persisted: <strong className="text-[#0F172B]">{syncMetrics.totalPersisted}</strong></span>
              <span>Production: <strong className="text-[#047857]">{syncMetrics.realEventsCount}</strong></span>
              <span>Synthetic Tests: <strong className="text-[#D97706]">{syncMetrics.syntheticCount}</strong></span>
              <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] font-bold border border-[#A7F3D0]">
                {syncMetrics.isDbActive ? '🟢 DB Synced' : '🟡 Offline Queue'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Sub-Navigation & Reference ID Fast-Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('issues')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'issues'
                ? 'bg-white text-[#0F172B] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172B]'
            }`}
          >
            Grouped Issues ({errorGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('live_stream')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'live_stream'
                ? 'bg-white text-[#0F172B] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172B]'
            }`}
          >
            Live Telemetry Stream ({liveEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ref_lookup')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'ref_lookup'
                ? 'bg-white text-[#0F172B] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172B]'
            }`}
          >
            Error Reference Inspector {inspectedRef && `(${inspectedRef.referenceId})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('daily_report')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'daily_report'
                ? 'bg-white text-[#0F172B] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172B]'
            }`}
          >
            Daily Health Report
          </button>
        </div>

        {/* Reference Code Fast Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Enter Reference (e.g. ERR-8F3K2)..."
              value={refSearchCode}
              onChange={(e) => setRefSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupRef()}
              className="pl-8 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-xl text-xs font-mono w-56 focus:outline-hidden focus:ring-2 focus:ring-[#047857]/30"
            />
          </div>
          <Button
            size="sm"
            onClick={() => handleLookupRef()}
            className="bg-[#047857] hover:bg-[#065F46] text-white text-xs h-8 px-3 cursor-pointer"
          >
            Inspect
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: GROUPED ISSUES */}
      {/* ============================================================ */}
      {activeSubTab === 'issues' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search issues by title, module, or tenant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs focus:outline-hidden text-[#0F172B]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#64748B] text-[11px] font-medium">Severity:</span>
              {['ALL', 'P0', 'P1', 'P2', 'P3'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    selectedSeverity === sev
                      ? 'bg-[#0F172B] text-white shadow-xs'
                      : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172B]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Cards Grid */}
          <div className="grid grid-cols-1 gap-3">
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] text-[#64748B] text-xs">
                No active issues match your filters.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group.fingerprint}
                  className="p-4 bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-xs transition-all space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Severity Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            group.severity === 'P0'
                              ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]'
                              : group.severity === 'P1'
                              ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                              : group.severity === 'P2'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                              : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
                          }`}
                        >
                          {group.severity} — {group.severity === 'P0' ? 'CRITICAL' : group.severity === 'P1' ? 'HIGH' : group.severity === 'P2' ? 'MEDIUM' : 'LOW'}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F1F5F9] text-[#334155] rounded-md uppercase font-mono">
                          {group.module}
                        </span>

                        <span className="text-[11px] text-[#64748B] font-mono">
                          Fingerprint: {group.fingerprint}
                        </span>

                        {group.sampleEntry?.referenceId && (
                          <button
                            type="button"
                            onClick={() => handleLookupRef(group.sampleEntry.referenceId)}
                            className="text-[11px] font-mono font-bold text-[#047857] hover:underline cursor-pointer bg-[#ECFDF5] px-1.5 py-0.5 rounded border border-[#A7F3D0]"
                          >
                            Ref: {group.sampleEntry.referenceId}
                          </button>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-[#0F172B] pt-0.5">{group.title}</h3>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(['INVESTIGATING', 'IDENTIFIED', 'RESOLVED'] as IssueStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(group.fingerprint, st)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            group.status === st
                              ? st === 'RESOLVED'
                                ? 'bg-[#047857] text-white'
                                : 'bg-[#0F172B] text-white'
                              : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stack Trace Preview */}
                  {group.stackTracePreview && (
                    <div className="bg-[#0F172B] text-[#E2E8F0] p-2.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-white/5">
                      <pre className="whitespace-pre-wrap">{group.stackTracePreview}</pre>
                    </div>
                  )}

                  {/* Metrics Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#64748B] border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-[#0F172B]">
                        <Flame className="w-3.5 h-3.5 text-[#E11D48]" /> {group.occurrences} events
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#64748B]" /> {group.affectedTenantsCount} company(s) affected:
                        <span className="font-medium text-[#334155]">
                          {group.affectedTenantsList.slice(0, 2).join(', ')}
                          {group.affectedTenantsList.length > 2 && ` +${group.affectedTenantsList.length - 2} more`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#64748B]" /> {group.affectedUsersCount} users
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span>First: {new Date(group.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Last: {new Date(group.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#475569]">
                        {group.releaseVersion}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: LIVE TELEMETRY STREAM (10 STREAMS) */}
      {/* ============================================================ */}
      {activeSubTab === 'live_stream' && (
        <div className="space-y-4">
          {/* Stream Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAFC] p-2 rounded-2xl border border-[#E2E8F0] overflow-x-auto">
            {[
              'ALL',
              'APPLICATION',
              'ERROR_CRASH',
              'SECURITY',
              'AUDIT',
              'PERFORMANCE',
              'API',
              'DATABASE',
              'BACKGROUND_JOB',
              'INTEGRATION',
              'BUSINESS_EVENT',
            ].map((stream) => (
              <button
                key={stream}
                type="button"
                onClick={() => setSelectedStream(stream)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  selectedStream === stream
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'bg-white text-[#64748B] hover:text-[#0F172B] border border-[#E2E8F0]'
                }`}
              >
                {stream}
              </button>
            ))}
          </div>

          {/* Terminal-Style Log Stream */}
          <div className="bg-[#0F172B] text-[#E2E8F0] rounded-3xl p-4 font-mono text-xs shadow-lg border border-white/10 space-y-2 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-white/50">
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#34D399]" />
                Live Ingestion Pipeline — PII Redacted
              </span>
              <span>Showing {filteredLogs.length} events</span>
            </div>

            {filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="py-1.5 border-b border-white/5 hover:bg-white/5 rounded-lg px-2 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-1 text-[11px]"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-white/40 text-[10px]">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[9px] uppercase ${
                      entry.level === 'FATAL' || entry.level === 'ERROR'
                        ? 'bg-[#EF4444] text-white'
                        : entry.level === 'WARN'
                        ? 'bg-[#F59E0B] text-black'
                        : entry.level === 'DEBUG'
                        ? 'bg-[#64748B] text-white'
                        : 'bg-[#10B981] text-white'
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-[#38BDF8] font-semibold">[{entry.stream}]</span>
                  <span className="text-[#A78BFA]">[{entry.module}]</span>
                  <span className="text-white/90 truncate max-w-xl">{entry.message}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-white/50 shrink-0 font-mono">
                  {entry.referenceId && (
                    <span className="text-[#34D399] font-bold bg-white/10 px-1 py-0.5 rounded">
                      {entry.referenceId}
                    </span>
                  )}
                  <span>tenant={entry.traceContext.tenantId}</span>
                  {entry.durationMs !== undefined && <span className="text-[#FBBF24]">{entry.durationMs}ms</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ERROR REFERENCE INSPECTOR (ERR-XXXXX) */}
      {/* ============================================================ */}
      {activeSubTab === 'ref_lookup' && (
        <div className="space-y-4">
          {inspectedRef ? (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl font-mono font-bold bg-[#ECFDF5] text-[#047857] px-3 py-1 rounded-xl border border-[#A7F3D0]">
                      {inspectedRef.referenceId}
                    </span>
                    <h2 className="text-lg font-bold text-[#0F172B]">{inspectedRef.errorMessage}</h2>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Logged at {new Date(inspectedRef.timestamp).toLocaleString()} from URL: <code className="text-[#0F172B]">{inspectedRef.url || '/'}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(inspectedRef, null, 2), inspectedRef.referenceId)}
                    className="border-[#CBD5E1] text-xs h-8 cursor-pointer"
                  >
                    {copiedId === inspectedRef.referenceId ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#047857]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    Copy JSON Diagnostic
                  </Button>
                </div>
              </div>

              {/* Distributed Journey & Context Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block font-medium">Tenant / Company</span>
                  <span className="text-sm font-bold text-[#0F172B]">{inspectedRef.companyId}</span>
                  <span className="text-[10px] text-[#94A3B8] block font-mono mt-0.5">{inspectedRef.tenantId}</span>
                </div>
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block font-medium">Affected User</span>
                  <span className="text-sm font-bold text-[#0F172B]">{inspectedRef.userId}</span>
                </div>
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block font-medium">Module</span>
                  <span className="text-sm font-bold text-[#047857]">{inspectedRef.module}</span>
                </div>
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block font-medium">Distributed Trace ID</span>
                  <span className="text-xs font-mono font-bold text-[#0F172B]">{inspectedRef.traceId}</span>
                </div>
              </div>

              {/* Stack Trace */}
              {inspectedRef.stackTrace && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#047857]" /> Internal Stack Trace (Engineering View Only)
                  </label>
                  <div className="p-4 bg-[#0F172B] text-[#E2E8F0] rounded-2xl font-mono text-xs border border-white/5 overflow-x-auto">
                    <pre className="whitespace-pre-wrap leading-relaxed">{inspectedRef.stackTrace}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] text-xs space-y-3">
              <Search className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <h3 className="font-bold text-sm text-[#0F172B]">No Reference Code Inspected</h3>
              <p className="text-[#64748B] max-w-sm mx-auto">
                Enter a 5-character incident code (e.g. <span className="font-mono font-semibold text-[#047857]">ERR-8F3K2</span>) in the search bar above to look up full stack traces and telemetry.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: DAILY PLATFORM HEALTH REPORT */}
      {/* ============================================================ */}
      {activeSubTab === 'daily_report' && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F172B]">JOY PEOPLEHR — Daily Platform Health Report</h2>
              <p className="text-xs text-[#64748B]">Automated 24-Hour Operations Summary for {dailyReport.reportDate}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const md = DailyReportGenerator.formatMarkdown(dailyReport);
                copyToClipboard(md, 'daily_md');
                showToast('Copied daily markdown health report!');
              }}
              className="border-[#CBD5E1] text-xs h-8 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" /> Copy Markdown Report
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1">
              <span className="text-xs font-semibold text-[#64748B]">Platform Availability</span>
              <p className="text-2xl font-bold text-[#047857]">{dailyReport.platform.availabilityPercentage}%</p>
              <span className="text-[11px] text-[#64748B]">Total Requests: {dailyReport.platform.totalRequests.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1">
              <span className="text-xs font-semibold text-[#64748B]">Global Error Rate</span>
              <p className="text-2xl font-bold text-[#0F172B]">{dailyReport.platform.errorRatePercentage}%</p>
              <span className="text-[11px] text-[#64748B]">{dailyReport.platform.failedRequests} failed requests</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1">
              <span className="text-xs font-semibold text-[#64748B]">Database Latency</span>
              <p className="text-2xl font-bold text-[#0F172B]">{dailyReport.database.avgQueryLatencyMs}ms</p>
              <span className="text-[11px] text-[#64748B]">{dailyReport.database.slowQueriesCount} slow queries (&gt;500ms)</span>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1">
              <span className="text-xs font-semibold text-[#64748B]">Tenant Health Status</span>
              <div className="flex items-center gap-2 text-xs pt-1 font-bold">
                <span className="text-[#047857]">🟢 {dailyReport.tenants.healthyCount}</span>
                <span className="text-[#D97706]">🟡 {dailyReport.tenants.warningCount}</span>
                <span className="text-[#DC2626]">🔴 {dailyReport.tenants.criticalCount}</span>
              </div>
            </div>
          </div>

          {/* Top Issues */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#334155] uppercase tracking-wider">Top Issues in Past 24 Hours</h3>
            <div className="space-y-2">
              {dailyReport.topIssues.map((issue) => (
                <div
                  key={issue.rank}
                  className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0F172B] text-white flex items-center justify-center font-bold text-[10px]">
                      {issue.rank}
                    </span>
                    <span className="font-bold text-[#0F172B]">{issue.title}</span>
                    <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1] text-[#64748B]">
                      {issue.module}
                    </span>
                  </div>
                  <span className="font-semibold text-[#E11D48]">{issue.occurrences} occurrences</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
