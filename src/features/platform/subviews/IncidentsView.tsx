// src/features/platform/subviews/IncidentsView.tsx
// ============================================================
// Joy PeopleHR — Platform Incidents & Operations Command Center
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Activity,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowLeft,
  ChevronRight,
  User,
  Users,
  Eye,
  Sliders,
  Play,
  RotateCcw,
  CheckSquare,
  Square,
  FileText,
  MessageSquare,
  Globe,
  Radio,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Zap,
  Tag,
  Download,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  platformIncidentService,
  PlatformIncidentRecord,
  IncidentSeverity,
  IncidentLifecycleStatus,
  IncidentTimelineEvent,
  RootCauseCategory,
} from '../../../services/platform/platformIncidentService';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface IncidentsViewProps {
  initialIncidentId?: string;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  initialIncidentId,
  onNavigateTab,
}) => {
  // State
  const [incidents, setIncidents] = useState<PlatformIncidentRecord[]>(() =>
    platformIncidentService.getIncidents()
  );
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    initialIncidentId || null
  );

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail Workspace Tab
  const [workspaceTab, setWorkspaceTab] = useState<
    | 'overview'
    | 'timeline'
    | 'investigation'
    | 'mitigation'
    | 'services'
    | 'responders'
    | 'communications'
    | 'postmortem'
  >('overview');

  // Modals
  const [isDeclareModalOpen, setIsDeclareModalOpen] = useState(false);
  const [declareForm, setDeclareForm] = useState({
    title: '',
    description: '',
    severity: 'SEV-3 Moderate' as IncidentSeverity,
    affected_services: ['Biometric Gateway'],
    affected_region: 'India (Pan-India)',
    commander_name: 'Karthik R. (SRE Lead)',
    detection_source: 'Monitoring Alert' as any,
    initial_impact_tenants: 12,
  });

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateVisibility, setUpdateVisibility] = useState<'internal' | 'customer'>('internal');
  const [updateEventType, setUpdateEventType] = useState('Investigation Note');

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveSummary, setResolveSummary] = useState('');
  const [createPostmortemChecked, setCreatePostmortemChecked] = useState(true);

  // Selected Incident Object
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return platformIncidentService.getIncidentById(selectedIncidentId);
  }, [selectedIncidentId, incidents]);

  // Operational Status
  const operationalStatus = useMemo(() => {
    return platformIncidentService.getPlatformOperationalStatus();
  }, [incidents]);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIncidents([...platformIncidentService.getIncidents()]);
      setIsRefreshing(false);
    }, 400);
  };

  // Filtered Incidents List
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Status filter
      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = inc.status !== 'Resolved' && inc.status !== 'Closed';
      else if (statusFilter === 'investigating') matchStatus = inc.status === 'Investigating' || inc.status === 'Declared';
      else if (statusFilter === 'monitoring') matchStatus = inc.status === 'Monitoring';
      else if (statusFilter === 'resolved') matchStatus = inc.status === 'Resolved' || inc.status === 'Closed';
      else if (statusFilter === 'postmortem') matchStatus = inc.postmortem.status === 'Required' || inc.postmortem.status === 'Draft';

      // Severity filter
      let matchSev = true;
      if (severityFilter !== 'all') {
        matchSev = inc.severity.toLowerCase().startsWith(severityFilter.toLowerCase());
      }

      // Service filter
      let matchService = true;
      if (serviceFilter !== 'all') {
        matchService = inc.affected_services.includes(serviceFilter);
      }

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inc.title.toLowerCase().includes(q) ||
        inc.id.toLowerCase().includes(q) ||
        inc.commander_name.toLowerCase().includes(q) ||
        inc.affected_services.some((s) => s.toLowerCase().includes(q)) ||
        inc.description.toLowerCase().includes(q);

      return matchStatus && matchSev && matchService && matchSearch;
    });
  }, [incidents, statusFilter, severityFilter, serviceFilter, searchQuery]);

  // Declaration Submit
  const handleDeclareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declareForm.title.trim() || !declareForm.description.trim()) {
      alert('Please enter incident title and initial description.');
      return;
    }

    const created = await platformIncidentService.declareIncident({
      title: declareForm.title,
      description: declareForm.description,
      severity: declareForm.severity,
      affected_services: declareForm.affected_services,
      affected_region: declareForm.affected_region,
      commander_name: declareForm.commander_name,
      detection_source: declareForm.detection_source,
      initial_impact_tenants: declareForm.initial_impact_tenants,
    });

    setIsDeclareModalOpen(false);
    refreshData();
    setSelectedIncidentId(created.id);
  };

  // Add Update Submit
  const handleAddUpdateSubmit = async () => {
    if (!selectedIncident || !updateMessage.trim()) return;
    await platformIncidentService.addTimelineUpdate(
      selectedIncident.id,
      updateEventType,
      updateMessage,
      updateVisibility
    );
    setUpdateMessage('');
    setIsUpdateModalOpen(false);
    refreshData();
  };

  // Resolve Submit
  const handleResolveSubmit = async () => {
    if (!selectedIncident || !resolveSummary.trim()) {
      alert('Please provide a resolution summary explaining what fixed the incident.');
      return;
    }
    await platformIncidentService.resolveIncident(
      selectedIncident.id,
      resolveSummary,
      createPostmortemChecked
    );
    setIsResolveModalOpen(false);
    setResolveSummary('');
    refreshData();
  };

  // Reopen Submit
  const handleReopen = async () => {
    if (!selectedIncident) return;
    const reason = prompt('Please enter reason for reopening this incident:', 'Secondary regression detected in edge push cluster');
    if (!reason) return;
    await platformIncidentService.reopenIncident(selectedIncident.id, reason);
    refreshData();
  };

  // ----------------------------------------------------------------
  // 1. INCIDENT WORKSPACE VIEW (WHEN AN INCIDENT IS OPENED)
  // ----------------------------------------------------------------
  if (selectedIncident) {
    return (
      <div className="space-y-6 pb-16 font-sans">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedIncidentId(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#047857] hover:text-[#036246] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Platform Incidents</span>
          </button>

          <span className="text-xs text-[#64748B]">
            Incident ID: <strong className="font-mono text-[#0F172B]">{selectedIncident.id}</strong>
          </span>
        </div>

        {/* Active Incident Warning Banner for SEV-1 & SEV-2 */}
        {(selectedIncident.severity.includes('SEV-1') || selectedIncident.severity.includes('SEV-2')) && (
          <div className="bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#991B1B] p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-[#DC2626] animate-pulse" />
              <div>
                <strong className="text-sm font-bold block">
                  MAJOR PLATFORM INCIDENT ACTIVE ({selectedIncident.severity})
                </strong>
                <p className="text-xs text-[#991B1B] mt-0.5">
                  Started at {selectedIncident.started_at} • Duration: {selectedIncident.duration_formatted} • {selectedIncident.affected_tenants_count} tenants potentially affected
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-[#DC2626] border border-[#FCA5A5]">
              Status: {selectedIncident.status}
            </span>
          </div>
        )}

        {/* Incident Command Center Header */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full',
                    selectedIncident.severity.includes('SEV-1')
                      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                      : selectedIncident.severity.includes('SEV-2')
                      ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                      : selectedIncident.severity.includes('SEV-3')
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      : 'bg-[#F1F5F9] text-[#475569]'
                  )}
                >
                  ● {selectedIncident.severity}
                </span>

                <span
                  className={cn(
                    'text-xs font-bold px-3 py-1 rounded-full',
                    selectedIncident.status === 'Resolved' || selectedIncident.status === 'Closed'
                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                      : selectedIncident.status === 'Monitoring'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  )}
                >
                  ● {selectedIncident.status}
                </span>

                <h1 className="text-xl font-bold text-[#0F172B] tracking-tight">{selectedIncident.title}</h1>
              </div>

              <p className="text-xs text-[#64748B] mt-2 max-w-4xl leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpdateModalOpen(true)}
                className="text-xs font-semibold border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-[#047857]" /> Add Update
              </Button>

              {selectedIncident.status !== 'Resolved' && selectedIncident.status !== 'Closed' ? (
                <>
                  {selectedIncident.status !== 'Monitoring' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await platformIncidentService.updateStatus(selectedIncident.id, 'Monitoring', 'Mitigation applied, entering soak monitoring.');
                        refreshData();
                      }}
                      className="text-xs font-semibold text-[#2563EB] border-[#BFDBFE] hover:bg-[#EFF6FF]"
                    >
                      <Radio className="h-3.5 w-3.5 mr-1" /> Enter Monitoring
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsResolveModalOpen(true)}
                    className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Declare Resolved
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopen}
                  className="text-xs font-semibold text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reopen Incident
                </Button>
              )}
            </div>
          </div>

          {/* Top 6 Overview KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Incident Commander</span>
              <strong className="text-xs font-bold text-[#0F172B] block mt-1 line-clamp-1">{selectedIncident.commander_name}</strong>
              <span className="text-[10px] text-[#64748B]">Lead Engineer</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Started / Detected</span>
              <strong className="text-xs font-mono font-bold text-[#0F172B] block mt-1">{selectedIncident.started_at}</strong>
              <span className="text-[10px] text-[#64748B]">Detected: {selectedIncident.detected_at}</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Duration</span>
              <strong className="text-base font-mono font-bold text-[#0F172B] block mt-0.5">{selectedIncident.duration_formatted}</strong>
              <span className="text-[10px] text-[#047857] font-semibold">{selectedIncident.status}</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Affected Tenants</span>
              <strong className="text-base font-bold text-[#DC2626] block mt-0.5">{selectedIncident.affected_tenants_count} Tenants</strong>
              <span className="text-[10px] text-[#64748B]">~{selectedIncident.affected_users_count} users</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Error Rate / Latency</span>
              <strong className="text-base font-mono font-bold text-[#DC2626] block mt-0.5">{selectedIncident.error_rate_pct}%</strong>
              <span className="text-[10px] text-[#64748B]">+{selectedIncident.latency_increase_ms}ms latency</span>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <span className="text-[11px] font-bold text-[#64748B] block">Postmortem</span>
              <strong className="text-xs font-bold text-[#0F172B] block mt-1">{selectedIncident.postmortem.status}</strong>
              <span className="text-[10px] text-[#64748B]">{selectedIncident.postmortem.root_cause_category} root cause</span>
            </div>
          </div>
        </div>

        {/* 8 Workspace Sections / Tabs */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="border-b border-[#E2E8F0] px-6 bg-[#F8FAFC] overflow-x-auto">
            <div className="flex items-center gap-6 min-w-max">
              {[
                { id: 'overview', label: 'Overview & Impact', icon: Eye },
                { id: 'timeline', label: 'Incident Timeline', icon: Clock },
                { id: 'investigation', label: 'Investigation & Traces', icon: Search },
                { id: 'mitigation', label: 'Mitigation & Runbooks', icon: CheckSquare },
                { id: 'services', label: 'Affected Services', icon: Server },
                { id: 'responders', label: 'Responders & Roles', icon: Users },
                { id: 'communications', label: 'Customer Broadcasts', icon: MessageSquare },
                { id: 'postmortem', label: 'Postmortem & Root Cause', icon: FileText },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = workspaceTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWorkspaceTab(t.id as any)}
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
            {/* TAB 1: OVERVIEW & IMPACT */}
            {workspaceTab === 'overview' && (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Scope & Impact Card */}
                  <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-4">
                    <h3 className="font-bold text-sm text-[#0F172B] border-b pb-3">Customer & Region Scope</h3>
                    <div className="grid grid-cols-2 gap-3 text-[11px] text-[#64748B]">
                      <div>Affected Region: <strong className="text-[#0F172B] block mt-0.5">{selectedIncident.affected_region}</strong></div>
                      <div>Detection Source: <strong className="text-[#0F172B] block mt-0.5">{selectedIncident.detection_source}</strong></div>
                      <div>Affected Tenants: <strong className="text-[#DC2626] font-bold block mt-0.5">{selectedIncident.affected_tenants_count} Organizations</strong></div>
                      <div>Estimated Users: <strong className="text-[#0F172B] block mt-0.5">~{selectedIncident.affected_users_count} Employees</strong></div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <span className="font-bold text-[#64748B] block text-[10px] uppercase">Highest-Impact Organizations</span>
                      <div className="space-y-1.5">
                        {selectedIncident.affected_organizations.map((org) => (
                          <div key={org.id} className="p-2.5 bg-[#F8FAFC] rounded-xl border flex items-center justify-between">
                            <div>
                              <strong className="text-[#0F172B]">{org.name}</strong>
                              <span className="text-[10px] text-[#64748B] ml-2">({org.plan})</span>
                              <div className="text-[10px] text-[#475569] mt-0.5">{org.impact_detail}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigateTab?.('platform-tenants', { tenantId: org.id })}
                              className="text-xs text-[#047857] hover:underline"
                            >
                              Open Tenant
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Correlated Deployments & Flags */}
                  <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white space-y-4">
                    <h3 className="font-bold text-sm text-[#0F172B] border-b pb-3">Deployment & Feature Correlation</h3>
                    {selectedIncident.recent_deployment && (
                      <div className="p-3.5 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                        <div className="flex justify-between">
                          <strong className="text-[#0F172B]">{selectedIncident.recent_deployment.service}</strong>
                          <span className="font-mono text-[#2563EB] font-bold">{selectedIncident.recent_deployment.version}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">Deployed: {selectedIncident.recent_deployment.deployed_at}</p>
                        {selectedIncident.recent_deployment.is_rollback_available && (
                          <span className="inline-block text-[10px] text-[#047857] font-semibold">
                            ✓ Rollback target available
                          </span>
                        )}
                      </div>
                    )}

                    {selectedIncident.related_feature_flag && (
                      <div className="p-3.5 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                        <div className="flex justify-between">
                          <strong className="text-[#0F172B]">{selectedIncident.related_feature_flag.flag_name}</strong>
                          <span className="text-[#047857] font-bold">{selectedIncident.related_feature_flag.rollout_pct}% Rollout</span>
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B]">{selectedIncident.related_feature_flag.code}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateTab?.('platform-features', { search: selectedIncident.related_feature_flag?.code })}
                          className="text-xs text-[#047857] border-[#A7F3D0] mt-1"
                        >
                          <Sliders className="h-3.5 w-3.5 mr-1" /> Inspect Feature Flag
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TIMELINE */}
            {workspaceTab === 'timeline' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172B]">Chronological Incident Log</h3>
                    <p className="text-[11px] text-[#64748B]">Immutable operational record of events, mitigations and communications.</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Timeline Event
                  </Button>
                </div>

                <div className="space-y-3 pt-2 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                  {selectedIncident.timeline.map((ev) => (
                    <div key={ev.id} className="relative pl-10">
                      <div className="absolute left-2.5 top-1.5 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-[#047857]" />
                      <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#0F172B]">{ev.event_type}</span>
                            <span className={cn(
                              'text-[10px] px-2 py-0.2 rounded font-bold',
                              ev.visibility === 'customer' ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]' : 'bg-[#F1F5F9] text-[#64748B]'
                            )}>
                              {ev.visibility === 'customer' ? 'Public Customer Notice' : 'Internal Engineering'}
                            </span>
                          </div>
                          <span className="font-mono text-[#64748B] text-[11px]">{ev.timestamp}</span>
                        </div>
                        <p className="text-[#334155] leading-relaxed">{ev.message}</p>
                        <div className="text-[10px] text-[#64748B]">Actor: <strong>{ev.actor}</strong> ({ev.actor_role})</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: INVESTIGATION */}
            {workspaceTab === 'investigation' && (
              <div className="space-y-4 text-xs">
                <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                  <h4 className="font-bold text-sm text-[#0F172B]">Diagnostic Links & Health Telemetry</h4>
                  <p className="text-[#64748B]">Jump into correlated platform modules for telemetry analysis.</p>
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-tenant-health')}
                      className="text-xs bg-white text-[#047857] border-[#A7F3D0]"
                    >
                      <Activity className="h-3.5 w-3.5 mr-1" /> Open Platform Telemetry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab?.('platform-jobs')}
                      className="text-xs bg-white text-[#2563EB] border-[#BFDBFE]"
                    >
                      <Server className="h-3.5 w-3.5 mr-1" /> Open Worker Fleet & Queues
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MITIGATION */}
            {workspaceTab === 'mitigation' && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#0F172B]">Active Mitigation Action Checklist</h4>
                <div className="space-y-2">
                  {selectedIncident.mitigation_tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={async () => {
                        await platformIncidentService.toggleMitigationTask(selectedIncident.id, task.id);
                        refreshData();
                      }}
                      className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-xl border hover:bg-white cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === 'Completed' ? (
                          <CheckSquare className="h-5 w-5 text-[#047857]" />
                        ) : (
                          <Square className="h-5 w-5 text-[#94A3B8]" />
                        )}
                        <span className={cn('text-xs font-medium', task.status === 'Completed' && 'line-through text-[#94A3B8]')}>
                          {task.title}
                        </span>
                      </div>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold',
                        task.status === 'Completed' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF3C7] text-[#92400E]'
                      )}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: SERVICES */}
            {workspaceTab === 'services' && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#0F172B]">Affected Services & Dependency Mesh</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedIncident.affected_services.map((srv) => (
                    <div key={srv} className="p-4 rounded-xl border bg-[#F8FAFC] space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#0F172B]">{srv}</strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FEF3C7] text-[#92400E]">
                          ● Degraded
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">Latency: +{selectedIncident.latency_increase_ms}ms • Errors: {selectedIncident.error_rate_pct}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: RESPONDERS */}
            {workspaceTab === 'responders' && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#0F172B]">Assigned Incident Responders</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedIncident.responders.map((resp) => (
                    <div key={resp.user_id} className="p-4 rounded-xl border bg-[#F8FAFC] space-y-1">
                      <strong className="text-sm text-[#0F172B] block">{resp.name}</strong>
                      <div className="text-[10px] text-[#047857] font-bold">{resp.role}</div>
                      <div className="text-[10px] text-[#64748B]">Assigned at {resp.assigned_at}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: COMMUNICATIONS */}
            {workspaceTab === 'communications' && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#0F172B]">Customer Advisory & Status Page Broadcasts</h4>
                <div className="space-y-2.5">
                  {selectedIncident.communications.map((c) => (
                    <div key={c.id} className="p-4 rounded-xl border bg-[#F8FAFC] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172B]">{c.channel} ({c.audience})</span>
                        <span className="font-mono text-[#64748B] text-[10px]">{c.timestamp}</span>
                      </div>
                      <p className="text-[#334155]">{c.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 8: POSTMORTEM */}
            {workspaceTab === 'postmortem' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172B]">Incident Postmortem & Root Cause Analysis</h4>
                    <span className="text-[10px] font-bold text-[#047857]">Status: {selectedIncident.postmortem.status}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                    <span className="font-bold text-[#64748B] text-[10px] uppercase">Root Cause Category</span>
                    <div className="font-bold text-sm text-[#0F172B]">{selectedIncident.postmortem.root_cause_category}</div>
                    <p className="text-[#334155] leading-relaxed">{selectedIncident.postmortem.root_cause_narrative || 'Under investigation.'}</p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-1.5">
                    <span className="font-bold text-[#64748B] text-[10px] uppercase">Incident Summary & Impact</span>
                    <p className="text-[#334155]">{selectedIncident.postmortem.summary || 'Summary pending publication.'}</p>
                  </div>

                  {/* Action items table */}
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2">
                    <span className="font-bold text-[#64748B] text-[10px] uppercase">Postmortem Action Items</span>
                    <div className="space-y-1.5">
                      {selectedIncident.postmortem.action_items.map((act) => (
                        <div key={act.id} className="p-2.5 bg-white rounded-lg border flex items-center justify-between">
                          <div>
                            <strong className="text-[#0F172B]">{act.title}</strong>
                            <div className="text-[10px] text-[#64748B]">Owner: {act.owner} • Due: {act.due_date}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857]">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 2. DIRECTORY VIEW (INCIDENTS DIRECTORY & SUMMARY)
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs font-semibold text-[#047857] flex items-center gap-1.5 mb-1">
            <span>Platform Admin</span>
            <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
            <span>Platform Incidents & Operations</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Platform Incidents</h1>
            <span
              className={cn(
                'text-xs font-semibold px-3 py-1 rounded-full border',
                operationalStatus.statusTone === 'healthy'
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  : operationalStatus.statusTone === 'warning'
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                  : 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]'
              )}
            >
              {operationalStatus.statusText}
            </span>
          </div>

          <p className="text-[13.5px] text-[#64748B] mt-0.5">
            Detect, coordinate, mitigate and resolve platform-wide service incidents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn('h-4 w-4 text-[#64748B]', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDeclareModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs font-semibold"
          >
            <Flame className="h-4 w-4" />
            Declare Platform Incident
          </Button>
        </div>
      </div>

      {/* Operational Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>ACTIVE INCIDENTS</span>
            <Flame className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{operationalStatus.activeIncidentsCount}</strong>
          <span className="text-[10px] text-[#047857] font-semibold">Live operational state</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>CRITICAL (SEV-1)</span>
            <ShieldAlert className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">{operationalStatus.criticalCount}</strong>
          <span className="text-[10px] text-[#64748B] font-semibold">Platform-wide outages</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>DEGRADED SERVICES</span>
            <Server className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <strong className="text-2xl font-bold text-[#2563EB] block mt-1">{operationalStatus.degradedServicesCount}</strong>
          <span className="text-[10px] text-[#64748B] font-semibold">Biometric, Realtime</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>TENANTS IMPACTED</span>
            <Users className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <strong className="text-2xl font-bold text-[#D97706] block mt-1">{operationalStatus.tenantsImpactedCount}</strong>
          <span className="text-[10px] text-[#64748B] font-semibold">In current incidents</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>MTTR THIS MONTH</span>
            <Clock className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">{operationalStatus.mttrThisMonth}</strong>
          <span className="text-[10px] text-[#047857] font-semibold">Mean Time to Recovery</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>POSTMORTEMS PENDING</span>
            <FileText className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <strong className="text-2xl font-bold text-[#7C3AED] block mt-1">{operationalStatus.postmortemsPending}</strong>
          <span className="text-[10px] text-[#64748B] font-semibold">Reviews in progress</span>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search incidents, ID, service, commander..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Incidents' },
                { id: 'active', label: 'Active' },
                { id: 'monitoring', label: 'Monitoring' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'postmortem', label: 'Postmortem Pending' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStatusFilter(p.id)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    statusFilter === p.id
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
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-xl bg-white text-xs font-semibold text-[#334155]"
            >
              <option value="all">All Severities</option>
              <option value="sev-1">SEV-1 Critical</option>
              <option value="sev-2">SEV-2 Major</option>
              <option value="sev-3">SEV-3 Moderate</option>
              <option value="sev-4">SEV-4 Minor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4">Incident & ID</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Customer Impact</th>
                <th className="py-3 px-4">Affected Services</th>
                <th className="py-3 px-4">Incident Commander</th>
                <th className="py-3 px-4">Started & Duration</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#64748B]">
                    ● No platform incidents matching your active filters.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                      <div className="hover:text-[#047857] hover:underline font-bold text-sm text-[#0F172B]">
                        {inc.title}
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono font-normal mt-0.5">
                        {inc.id} • {inc.detection_source}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block',
                          inc.severity.includes('SEV-1')
                            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                            : inc.severity.includes('SEV-2')
                            ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                            : inc.severity.includes('SEV-3')
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        )}
                      >
                        ● {inc.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block',
                          inc.status === 'Resolved' || inc.status === 'Closed'
                            ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                            : inc.status === 'Monitoring'
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        )}
                      >
                        ● {inc.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-[#0F172B]">{inc.affected_tenants_count} Tenants</strong>
                      <div className="text-[10px] text-[#64748B]">+{inc.latency_increase_ms}ms latency</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {inc.affected_services.map((srv) => (
                          <span
                            key={srv}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[#475569]"
                          >
                            {srv}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#0F172B] font-medium">
                      {inc.commander_name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-[#0F172B]">{inc.started_at}</div>
                      <div className="text-[10px] text-[#047857] font-semibold">{inc.duration_formatted} duration</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncidentId(inc.id);
                        }}
                        className="text-xs text-[#047857] border-[#CBD5E1] hover:bg-[#ECFDF5]"
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

      {/* ----------------------------------------------------------------
          3. DECLARE INCIDENT MODAL / WIZARD
         ---------------------------------------------------------------- */}
      {isDeclareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-[#DC2626]" />
                <h3 className="text-base font-bold text-[#0F172B]">Declare Platform Incident</h3>
              </div>
              <button onClick={() => setIsDeclareModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDeclareSubmit} className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="font-semibold block mb-1 text-[#334155]">Incident Title *</label>
                <input
                  type="text"
                  placeholder="e.g. ZK-Teco Biometric Sync Intermittent Timeout"
                  value={declareForm.title}
                  onChange={(e) => setDeclareForm({ ...declareForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-[#334155]">Severity *</label>
                  <select
                    value={declareForm.severity}
                    onChange={(e) => setDeclareForm({ ...declareForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                  >
                    <option value="SEV-1 Critical">SEV-1 Critical (Platform Outage)</option>
                    <option value="SEV-2 Major">SEV-2 Major (Significant Degradation)</option>
                    <option value="SEV-3 Moderate">SEV-3 Moderate (Service Degraded)</option>
                    <option value="SEV-4 Minor">SEV-4 Minor (Low Impact)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-[#334155]">Detection Source</label>
                  <select
                    value={declareForm.detection_source}
                    onChange={(e) => setDeclareForm({ ...declareForm, detection_source: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="Monitoring Alert">Monitoring Alert</option>
                    <option value="Platform Health">Platform Health</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Engineer Report">Engineer Report</option>
                    <option value="Background Job">Background Job</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#334155]">Incident Commander *</label>
                <input
                  type="text"
                  value={declareForm.commander_name}
                  onChange={(e) => setDeclareForm({ ...declareForm, commander_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[#334155]">Incident Description & Observed Symptoms *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the initial telemetry, error rates, and observed customer symptoms..."
                  value={declareForm.description}
                  onChange={(e) => setDeclareForm({ ...declareForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsDeclareModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold">
                  Declare & Alert Responders
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          4. ADD TIMELINE UPDATE MODAL
         ---------------------------------------------------------------- */}
      {isUpdateModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#0F172B]">Add Incident Update</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Update Type</label>
                <select
                  value={updateEventType}
                  onChange={(e) => setUpdateEventType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                >
                  <option value="Investigation Note">Investigation Note</option>
                  <option value="Mitigation Started">Mitigation Started</option>
                  <option value="Customer Update">Customer Update</option>
                  <option value="Service Recovered">Service Recovered</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Visibility</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="vis"
                      checked={updateVisibility === 'internal'}
                      onChange={() => setUpdateVisibility('internal')}
                      className="accent-[#047857]"
                    />
                    <span>Internal (Engineering Only)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="vis"
                      checked={updateVisibility === 'customer'}
                      onChange={() => setUpdateVisibility('customer')}
                      className="accent-[#047857]"
                    />
                    <span>Customer-Facing (Status Page)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Message Content *</label>
                <textarea
                  rows={3}
                  placeholder="Enter operational update details..."
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAddUpdateSubmit} className="bg-[#047857] text-white">
                Publish to Timeline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          5. RESOLVE INCIDENT MODAL
         ---------------------------------------------------------------- */}
      {isResolveModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#047857]" />
                <h3 className="text-base font-bold text-[#0F172B]">Declare Incident Resolved</h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] text-[#64748B]">
              Resolving <strong>{selectedIncident.id}</strong> ({selectedIncident.title}).
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Resolution Summary *</label>
                <textarea
                  rows={3}
                  placeholder="Explain what action or fix resolved the incident..."
                  value={resolveSummary}
                  onChange={(e) => setResolveSummary(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={createPostmortemChecked}
                  onChange={(e) => setCreatePostmortemChecked(e.target.checked)}
                  className="accent-[#047857]"
                />
                <span>Automatically initiate Postmortem workflow</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleResolveSubmit} className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                Declare Resolved
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
