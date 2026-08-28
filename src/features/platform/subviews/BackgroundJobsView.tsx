// src/features/platform/subviews/BackgroundJobsView.tsx
// ============================================================
// Joy PeopleHR — Background Jobs & Distributed Worker Fleet Control Console
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Server,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Cpu,
  HardDrive,
  Calendar,
  X,
  ChevronRight,
  TrendingUp,
  Sliders,
  Terminal,
  ShieldAlert,
  Zap,
  Radio,
  FileCode,
  ArrowUpRight,
  ChevronDown,
  Check,
  Copy,
  Info,
  StopCircle,
} from 'lucide-react';
import {
  JobExecution,
  JobQueue,
  WorkerInstance,
  ScheduledCronJob,
  BackgroundJobsMetrics,
  JobStatus,
  QueueName,
} from '../../../types/backgroundJobs';
import { platformBackgroundJobsService } from '../../../services/platform/platformBackgroundJobsService';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { cn } from '../../../lib/utils';

export interface BackgroundJobsViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const BackgroundJobsView: React.FC<BackgroundJobsViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queueFilter, setQueueFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Real Data Sources
  const [metrics, setMetrics] = useState<BackgroundJobsMetrics>(() => platformBackgroundJobsService.getMetrics());
  const [queues, setQueues] = useState<JobQueue[]>([]);
  const [jobs, setJobs] = useState<JobExecution[]>([]);
  const [workers, setWorkers] = useState<WorkerInstance[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledCronJob[]>([]);

  // Selected Job for Detail Drawer
  const [selectedJob, setSelectedJob] = useState<JobExecution | null>(null);
  const [drawerSubTab, setDrawerSubTab] = useState<'overview' | 'payload' | 'attempts' | 'logs'>('overview');

  // Enqueue Job Modal
  const [isEnqueueModalOpen, setIsEnqueueModalOpen] = useState(false);
  const [enqueueForm, setEnqueueForm] = useState({
    task_name: '',
    queue: 'default' as QueueName,
    tenant_name: 'ABC Manufacturing',
    tenant_id: 'org-acme-01',
    priority: 'Normal' as const,
    max_attempts: 3,
    payloadJson: '{\n  "batch_size": 250,\n  "mode": "sync"\n}',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [met, qList, jobList, wrkList, cronList] = await Promise.all([
        platformBackgroundJobsService.fetchMetrics(),
        platformBackgroundJobsService.fetchQueues(),
        platformBackgroundJobsService.fetchJobs(),
        platformBackgroundJobsService.fetchWorkers(),
        platformBackgroundJobsService.fetchScheduledJobs(),
      ]);

      setMetrics(met);
      setQueues(qList);
      setJobs(jobList);
      setWorkers(wrkList);
      setScheduledJobs(cronList);
      setLastSyncTime(new Date().toLocaleTimeString());

      if (selectedJob) {
        const fresh = jobList.find((j) => j.id === selectedJob.id || j.job_number === selectedJob.job_number);
        if (fresh) setSelectedJob(fresh);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load background jobs data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedJob]);

  // Initial Load & Realtime Subscription
  useEffect(() => {
    loadData();

    const unsubscribe = platformBackgroundJobsService.subscribeToRealtime(() => {
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

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (activeTab === 'failed' && j.status !== 'Failed' && j.status !== 'Dead Letter') return false;
      if (activeTab === 'active' && j.status !== 'Running' && j.status !== 'Queued' && j.status !== 'Retrying') return false;

      const matchQueue = queueFilter === 'All' || j.queue === queueFilter;
      const matchStatus = statusFilter === 'All' || j.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || j.priority === priorityFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        j.job_number.toLowerCase().includes(q) ||
        j.task_name.toLowerCase().includes(q) ||
        (j.tenant_name && j.tenant_name.toLowerCase().includes(q)) ||
        (j.worker_name && j.worker_name.toLowerCase().includes(q));

      return matchQueue && matchStatus && matchPriority && matchSearch;
    });
  }, [jobs, activeTab, queueFilter, statusFilter, priorityFilter, searchQuery]);

  // Handlers
  const handleEnqueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let payload = {};
    try {
      if (enqueueForm.payloadJson.trim()) {
        payload = JSON.parse(enqueueForm.payloadJson);
      }
    } catch {
      alert('Invalid JSON in Input Payload');
      return;
    }

    const res = await platformBackgroundJobsService.enqueueJob({
      task_name: enqueueForm.task_name,
      queue: enqueueForm.queue,
      tenant_name: enqueueForm.tenant_name,
      tenant_id: enqueueForm.tenant_id,
      priority: enqueueForm.priority,
      max_attempts: enqueueForm.max_attempts,
      input_payload: payload,
    });

    if (res.success) {
      setIsEnqueueModalOpen(false);
      setEnqueueForm({
        task_name: '',
        queue: 'default',
        tenant_name: 'ABC Manufacturing',
        tenant_id: 'org-acme-01',
        priority: 'Normal',
        max_attempts: 3,
        payloadJson: '{\n  "batch_size": 250,\n  "mode": "sync"\n}',
      });
      await loadData(true);
    } else {
      alert(res.error || 'Failed to enqueue job');
    }
  };

  const handleRetryJob = async (job: JobExecution) => {
    const res = await platformBackgroundJobsService.retryJob(job.id);
    if (res.success) {
      await loadData(true);
    } else {
      alert(res.error || 'Failed to retry job');
    }
  };

  const handleCancelJob = async (job: JobExecution) => {
    const res = await platformBackgroundJobsService.cancelJob(job.id);
    if (res.success) {
      await loadData(true);
    } else {
      alert(res.error || 'Failed to cancel job');
    }
  };

  const handleToggleCron = async (cronId: string, currentEnabled: boolean) => {
    const success = await platformBackgroundJobsService.toggleCronSchedule(cronId, !currentEnabled);
    if (success) {
      await loadData(true);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ---------------------------------------------------------
          1. Header & Live Engine Status
         --------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Background Jobs & Worker Fleet</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border',
                metrics.engine_status === 'Healthy'
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full animate-pulse',
                  metrics.engine_status === 'Healthy' ? 'bg-[#10B981]' : 'bg-[#D97706]'
                )}
              />
              ● Worker Fleet Engine {metrics.engine_status}
            </span>
            <span className="text-[11px] text-[#64748B] hidden sm:inline">
              Synchronized: {lastSyncTime}
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Distributed task orchestration, asynchronous queues, worker telemetry, failure recovery, and scheduled cron jobs.
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
            variant="primary"
            size="sm"
            onClick={() => setIsEnqueueModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#0F172B] hover:bg-[#1E293B] text-white shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Enqueue Job
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------
          2. Dynamic Top Operational KPI Cards
         --------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Queue Depth */}
        <div
          onClick={() => {
            setActiveTab('overview');
            setStatusFilter('Queued');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#2563EB]',
            statusFilter === 'Queued' && 'ring-2 ring-[#2563EB] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Queue Depth</span>
            <Layers className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172B] mt-1">{metrics.total_waiting_queue_depth}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Waiting in buffer</p>
        </div>

        {/* Running Jobs */}
        <div
          onClick={() => {
            setActiveTab('active');
            setStatusFilter('Running');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#047857]',
            statusFilter === 'Running' && 'ring-2 ring-[#047857] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Running</span>
            <Activity className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <div className="text-xl font-bold text-[#047857] mt-1">{metrics.running_jobs_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Active worker threads</p>
        </div>

        {/* Failed Jobs */}
        <div
          onClick={() => {
            setActiveTab('failed');
            setStatusFilter('Failed');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#DC2626]',
            activeTab === 'failed' && 'ring-2 ring-[#DC2626] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Failed & DLQ</span>
            <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
          </div>
          <div className="text-xl font-bold text-[#DC2626] mt-1 flex items-baseline gap-2">
            <span>{metrics.failed_jobs_count}</span>
            {metrics.dead_letter_count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#DC2626] font-bold">
                {metrics.dead_letter_count} Dead Letter
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Requires retry or inspection</p>
        </div>

        {/* Retries */}
        <div
          onClick={() => {
            setActiveTab('active');
            setStatusFilter('Retrying');
          }}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#D97706]',
            statusFilter === 'Retrying' && 'ring-2 ring-[#D97706] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Retry Queue</span>
            <RotateCcw className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <div className="text-xl font-bold text-[#D97706] mt-1">{metrics.retrying_jobs_count}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Backoff retry pending</p>
        </div>

        {/* Worker Fleet */}
        <div
          onClick={() => setActiveTab('workers')}
          className={cn(
            'p-3.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm cursor-pointer transition-all hover:border-[#7C3AED]',
            activeTab === 'workers' && 'ring-2 ring-[#7C3AED] border-transparent'
          )}
        >
          <div className="text-xs text-[#64748B] flex justify-between items-center">
            <span className="font-semibold">Worker Fleet</span>
            <Cpu className="h-3.5 w-3.5 text-[#7C3AED]" />
          </div>
          <div className="text-xl font-bold text-[#7C3AED] mt-1 flex items-baseline gap-1.5">
            <span>{metrics.healthy_workers_count} / {metrics.total_workers_count}</span>
            <span className="text-[10px] text-[#059669] font-semibold">Nodes Healthy</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">~{metrics.processing_throughput_per_min} jobs/min</p>
        </div>
      </div>

      {/* ---------------------------------------------------------
          3. Sub-Navigation Tabs
         --------------------------------------------------------- */}
      <div className="flex border-b border-[#E2E8F0] gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'All Jobs', count: jobs.length, icon: Layers },
          { id: 'queues', label: 'Queues & Latency', count: queues.length, icon: Radio },
          { id: 'active', label: 'Active Jobs', count: metrics.running_jobs_count + metrics.total_waiting_queue_depth, icon: Play },
          { id: 'failed', label: 'Failed & Dead Letter', count: metrics.failed_jobs_count + metrics.dead_letter_count, icon: AlertTriangle },
          { id: 'workers', label: 'Worker Nodes', count: workers.length, icon: Server },
          { id: 'cron', label: 'Scheduled Cron Jobs', count: scheduledJobs.length, icon: Calendar },
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
                  ? 'border-[#0F172B] text-[#0F172B]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-[#0F172B] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
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
          4. TAB CONTENT: ALL JOBS / ACTIVE / FAILED
         --------------------------------------------------------- */}
      {(activeTab === 'overview' || activeTab === 'active' || activeTab === 'failed') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search Job #, task name, tenant, worker node..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F172B]"
                />
              </div>

              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Queues</option>
                {queues.map((q) => (
                  <option key={q.id} value={q.name}>
                    {q.name} ({q.depth})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="Running">Running</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Retrying">Retrying</option>
                <option value="Dead Letter">Dead Letter</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
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

          {/* Jobs Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Job # & Task</th>
                    <th className="py-3 px-4">Queue</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Worker Node</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-4"><div className="h-4 w-48 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-20 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-24 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-14 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-16 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4"><div className="h-4 w-12 bg-[#E2E8F0] rounded" /></td>
                        <td className="py-4 px-4 text-right"><div className="h-6 w-20 bg-[#E2E8F0] rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#DC2626]">
                        <AlertTriangle className="h-8 w-8 text-[#DC2626] mx-auto mb-2" />
                        <div className="font-bold text-sm">Unable to load background jobs</div>
                        <p className="text-xs text-[#64748B] mt-1">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => loadData(false)} className="mt-3">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                        </Button>
                      </td>
                    </tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#64748B]">
                        <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
                        <div className="font-bold text-sm text-[#0F172B]">No background jobs found</div>
                        <p className="text-xs text-[#64748B] mt-1">
                          No asynchronous jobs match your current filter parameters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr
                        key={j.id}
                        onClick={() => setSelectedJob(j)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        {/* Job # & Task */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-mono font-bold text-[#0F172B]">{j.job_number}</div>
                          <div className="text-[#475569] font-medium truncate mt-0.5">{j.task_name}</div>
                        </td>

                        {/* Queue */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#F1F5F9] text-[#334155]">
                            {j.queue}
                          </span>
                        </td>

                        {/* Tenant */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0F172B]">{j.tenant_name || 'Global Platform'}</div>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              j.priority === 'Critical'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : j.priority === 'High'
                                ? 'bg-[#FFFBEB] text-[#D97706]'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            )}
                          >
                            {j.priority}
                          </span>
                        </td>

                        {/* Worker Node */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#2563EB]">
                          {j.worker_name || 'Unassigned'}
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                          {j.duration_sec ? `${j.duration_sec}s` : j.status === 'Running' ? 'Active' : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                              j.status === 'Completed'
                                ? 'bg-[#ECFDF5] text-[#047857]'
                                : j.status === 'Running'
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : j.status === 'Failed' || j.status === 'Dead Letter'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : j.status === 'Retrying'
                                ? 'bg-[#FFFBEB] text-[#D97706]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            )}
                          >
                            ● {j.status}
                          </span>
                        </td>

                        {/* Attempts */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#475569]">
                          {j.attempt_count} / {j.max_attempts}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {j.status === 'Failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryJob(j)}
                                className="text-xs h-7 text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" /> Retry
                              </Button>
                            )}
                            {j.status === 'Running' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelJob(j)}
                                className="text-xs h-7 text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEE2E2]"
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedJob(j)}
                              className="text-xs h-7 text-[#0F172B]"
                            >
                              Inspect <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
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

      {/* ---------------------------------------------------------
          5. TAB CONTENT: QUEUES & LATENCY
         --------------------------------------------------------- */}
      {activeTab === 'queues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((q) => (
            <div key={q.id} className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#0F172B]">
                  {q.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                    q.status === 'Healthy' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFFBEB] text-[#D97706]'
                  )}
                >
                  ● {q.status}
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#0F172B]">{q.display_name}</h4>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] text-center">
                <div className="p-2 bg-[#F8FAFC] rounded-lg">
                  <div className="text-[10px] text-[#64748B]">Depth</div>
                  <div className="text-base font-bold text-[#0F172B]">{q.depth}</div>
                </div>
                <div className="p-2 bg-[#F8FAFC] rounded-lg">
                  <div className="text-[10px] text-[#64748B]">Running</div>
                  <div className="text-base font-bold text-[#2563EB]">{q.running_count}</div>
                </div>
                <div className="p-2 bg-[#F8FAFC] rounded-lg">
                  <div className="text-[10px] text-[#64748B]">Success</div>
                  <div className="text-base font-bold text-[#047857]">{q.success_rate_pct}%</div>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-[#64748B] pt-1">
                <span>Throughput: ~{q.throughput_per_min} / min</span>
                <span>Concurrency: {q.concurrency_limit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------
          6. TAB CONTENT: WORKER FLEET NODES
         --------------------------------------------------------- */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((w) => (
            <div key={w.id} className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-[#7C3AED]" />
                  <span className="font-bold text-xs text-[#0F172B]">{w.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857]">
                  {w.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#64748B]">
                <div className="flex justify-between">
                  <span>Host:</span>
                  <strong className="font-mono text-[#0F172B]">{w.host}</strong>
                </div>
                <div className="flex justify-between">
                  <span>CPU Usage:</span>
                  <strong className="text-[#0F172B]">{w.cpu_usage_pct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>RAM:</span>
                  <strong className="text-[#0F172B]">{w.memory_usage_mb} MB / {w.memory_limit_mb} MB</strong>
                </div>
                <div className="flex justify-between">
                  <span>Concurrency:</span>
                  <strong className="text-[#0F172B]">{w.concurrency} threads</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0]">
                <div className="text-[10px] font-semibold text-[#64748B] mb-1">Assigned Queues:</div>
                <div className="flex flex-wrap gap-1">
                  {w.assigned_queues.map((q) => (
                    <span key={q} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------
          7. TAB CONTENT: SCHEDULED CRON JOBS
         --------------------------------------------------------- */}
      {activeTab === 'cron' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-[#0F172B]">Scheduled Recurring Cron Tasks</h3>
            <span className="text-xs text-[#64748B]">Automated cron orchestrator running on platform nodes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                  <th className="py-2.5 px-3">Job Name & Task</th>
                  <th className="py-2.5 px-3">Queue</th>
                  <th className="py-2.5 px-3">Cron Expression</th>
                  <th className="py-2.5 px-3">Schedule</th>
                  <th className="py-2.5 px-3">Next Execution</th>
                  <th className="py-2.5 px-3">Owner</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {scheduledJobs.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0F172B]">{c.name}</div>
                      <div className="font-mono text-[10px] text-[#64748B]">{c.task}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#F1F5F9] text-[#334155]">
                        {c.queue}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#2563EB]">{c.cron_expression}</td>
                    <td className="py-3 px-3 text-[#334155]">{c.schedule_description}</td>
                    <td className="py-3 px-3 font-mono text-[#047857]">
                      {new Date(c.next_run_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-[#64748B]">{c.owner}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleCron(c.id, c.enabled)}
                        className={cn(
                          'text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors',
                          c.enabled ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                        )}
                      >
                        {c.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          8. JOB DETAIL DRAWER
         --------------------------------------------------------- */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col font-sans overflow-hidden border-l border-[#E2E8F0]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0F172B]">{selectedJob.job_number}</span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedJob.status === 'Completed'
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : selectedJob.status === 'Failed'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#EFF6FF] text-[#2563EB]'
                    )}
                  >
                    ● {selectedJob.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] font-mono font-bold text-[#334155]">
                    Queue: {selectedJob.queue}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#0F172B]">{selectedJob.task_name}</h2>
                <div className="text-xs text-[#64748B]">
                  Tenant: {selectedJob.tenant_name || 'Global Platform'} • Trace ID: {selectedJob.trace_id}
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-[#E2E8F0] px-4 bg-white">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'payload', label: 'Payload & Output', icon: FileCode },
                { id: 'attempts', label: `Attempts (${selectedJob.attempts.length})`, icon: Activity },
                { id: 'logs', label: `Logs (${selectedJob.logs.length})`, icon: Terminal },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = drawerSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerSubTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer',
                      isActive ? 'border-[#0F172B] text-[#0F172B]' : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {drawerSubTab === 'overview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div>
                      <span className="text-[#64748B] block">Job Number:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedJob.job_number}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Queue:</span>
                      <strong className="font-mono text-[#0F172B]">{selectedJob.queue}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Environment:</span>
                      <strong className="text-[#0F172B]">{selectedJob.environment}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Worker Node:</span>
                      <strong className="font-mono text-[#2563EB]">{selectedJob.worker_name || 'Pending'}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Attempts:</span>
                      <strong className="text-[#0F172B]">{selectedJob.attempt_count} / {selectedJob.max_attempts}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Retry Strategy:</span>
                      <strong className="text-[#0F172B]">{selectedJob.retry_strategy}</strong>
                    </div>
                  </div>

                  {selectedJob.error_message && (
                    <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#991B1B] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-[#DC2626]" /> Error {selectedJob.error_code || 'EXEC_FAIL'}
                      </div>
                      <div className="font-mono text-[11px]">{selectedJob.error_message}</div>
                    </div>
                  )}
                </div>
              )}

              {drawerSubTab === 'payload' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-[#0F172B] mb-1">Input Payload</h4>
                    <pre className="p-3 bg-[#0F172B] text-[#38BDF8] rounded-xl font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedJob.input_payload, null, 2)}
                    </pre>
                  </div>
                  {selectedJob.output_result && (
                    <div>
                      <h4 className="font-bold text-[#0F172B] mb-1">Execution Output</h4>
                      <pre className="p-3 bg-[#0F172B] text-[#4ADE80] rounded-xl font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(selectedJob.output_result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {drawerSubTab === 'attempts' && (
                <div className="space-y-2">
                  {selectedJob.attempts.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B] bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      No recorded execution attempts for this job.
                    </div>
                  ) : (
                    selectedJob.attempts.map((att) => (
                      <div key={att.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#0F172B]">Attempt #{att.attempt_number}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">{att.duration_ms} ms</span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">Worker: {att.worker_host}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerSubTab === 'logs' && (
                <div className="space-y-1 font-mono text-[11px] bg-[#0F172B] text-[#E2E8F0] p-3 rounded-xl max-h-96 overflow-y-auto">
                  {selectedJob.logs.length === 0 ? (
                    <div className="text-[#64748B]">No logs recorded for this job.</div>
                  ) : (
                    selectedJob.logs.map((l) => (
                      <div key={l.id} className="flex gap-2">
                        <span className="text-[#64748B]">{new Date(l.created_at).toLocaleTimeString()}</span>
                        <span
                          className={cn(
                            'font-bold',
                            l.level === 'INFO'
                              ? 'text-[#38BDF8]'
                              : l.level === 'WARN'
                              ? 'text-[#FBBF24]'
                              : 'text-[#F87171]'
                          )}
                        >
                          [{l.level}]
                        </span>
                        <span>{l.message}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              {selectedJob.status === 'Failed' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRetryJob(selectedJob)}
                  className="bg-[#047857] hover:bg-[#065F46] text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry Job
                </Button>
              ) : selectedJob.status === 'Running' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelJob(selectedJob)}
                  className="text-[#DC2626] border-[#FCA5A5]"
                >
                  Cancel Execution
                </Button>
              ) : <div />}

              <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          9. ENQUEUE JOB MODAL
         --------------------------------------------------------- */}
      {isEnqueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172B]">Enqueue Asynchronous Job</h3>
              <button onClick={() => setIsEnqueueModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172B]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEnqueueSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WhatsApp Shift Broadcast Batch #9921"
                  value={enqueueForm.task_name}
                  onChange={(e) => setEnqueueForm({ ...enqueueForm, task_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Queue *</label>
                  <select
                    value={enqueueForm.queue}
                    onChange={(e) => setEnqueueForm({ ...enqueueForm, queue: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.name}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Priority *</label>
                  <select
                    value={enqueueForm.priority}
                    onChange={(e) => setEnqueueForm({ ...enqueueForm, priority: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Tenant Scope</label>
                <input
                  type="text"
                  value={enqueueForm.tenant_name}
                  onChange={(e) => setEnqueueForm({ ...enqueueForm, tenant_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Payload JSON</label>
                <textarea
                  rows={4}
                  value={enqueueForm.payloadJson}
                  onChange={(e) => setEnqueueForm({ ...enqueueForm, payloadJson: e.target.value })}
                  className="w-full p-2.5 font-mono text-[11px] bg-[#0F172B] text-[#38BDF8] rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsEnqueueModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#0F172B] hover:bg-[#1E293B] text-white">
                  Enqueue onto Fleet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
