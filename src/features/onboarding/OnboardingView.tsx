import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import {
  EmployeeOnboarding,
  OnboardingTask,
  OnboardingSummaryMetrics,
  OnboardingStatus,
  OnboardingTaskRole,
  OnboardingTaskPriority,
  Asset,
} from '../../types';
import { onboardingService } from '../../services/onboardingService';
import { hrEventBus } from '../../services/hrEventBus';
import { api } from '../../services/api';
import { EmployeeCreateWizardModal } from '../people/EmployeeCreateWizardModal';
import {
  UserPlus,
  CheckSquare,
  FileCheck,
  ShieldCheck,
  Laptop,
  Users,
  Clock,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  Calendar,
  Lock,
  Sparkles,
  History,
  FileText,
  Briefcase,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  Layers,
  RotateCcw,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'ALL', label: 'All Stages' },
  { id: 'INITIATED', label: 'Initiated' },
  { id: 'DOCUMENT_COLLECTION', label: 'Documents' },
  { id: 'HR_VERIFICATION', label: 'HR Verification' },
  { id: 'MANAGER_REVIEW', label: 'Manager Review' },
  { id: 'IT_SETUP', label: 'IT Setup' },
  { id: 'PAYROLL_SETUP', label: 'Payroll' },
  { id: 'FINAL_REVIEW', label: 'Final Review' },
  { id: 'READY_TO_ACTIVATE', label: 'Ready to Activate' },
  { id: 'COMPLETED', label: 'Completed' },
];

export const OnboardingView: React.FC = () => {
  const { showToast } = useToast();
  const [onboardings, setOnboardings] = useState<EmployeeOnboarding[]>([]);
  const [metrics, setMetrics] = useState<OnboardingSummaryMetrics>({
    active_onboardings: 0,
    pending_hr_verification: 0,
    pending_employee_tasks: 0,
    pending_manager_tasks: 0,
    pending_it_tasks: 0,
    joining_this_month: 0,
    overdue_tasks: 0,
    ready_to_activate: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<string>('ALL_ONBOARDINGS');
  const [activeStage, setActiveStage] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Onboarding Detail Drawer
  const [selectedOnboarding, setSelectedOnboarding] = useState<EmployeeOnboarding | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('tasks');
  const [onboardingAuditLogs, setOnboardingAuditLogs] = useState<any[]>([]);

  // Asset list for IT allocation
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Modals
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRejectDocModalOpen, setIsRejectDocModalOpen] = useState(false);
  const [rejectDocId, setRejectDocId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTaskId, setOverrideTaskId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Load Real Onboarding Data & Metrics
  const loadData = async () => {
    const [list, m, assets] = await Promise.all([
      onboardingService.getOnboardings(),
      onboardingService.getMetrics(),
      api.getAssets().catch(() => []),
    ]);
    setOnboardings(list);
    setMetrics(m);
    setAvailableAssets(assets.filter((a) => a.status === 'Available'));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to Realtime Onboarding Events
  useEffect(() => {
    const unsub = hrEventBus.subscribe('onboarding.*', () => {
      loadData();
      if (selectedOnboarding) {
        onboardingService.getOnboardingById(selectedOnboarding.id).then((refreshed) => {
          if (refreshed) setSelectedOnboarding(refreshed);
        });
      }
    });
    return () => unsub();
  }, [selectedOnboarding?.id]);

  const handleInspectOnboarding = async (onb: EmployeeOnboarding) => {
    setSelectedOnboarding(onb);
    const logs = await onboardingService.getAuditLogs(onb.id);
    setOnboardingAuditLogs(logs);
    setIsDrawerOpen(true);
  };

  // Task Actions
  const handleCompleteTask = async (taskId: string) => {
    const res = await onboardingService.completeTask(taskId);
    if (!res.success) {
      showToast(res.error || 'Failed to complete task', 'error');
      return;
    }
    showToast('Task completed successfully!', 'success');
    loadData();
    if (selectedOnboarding) {
      const refreshed = await onboardingService.getOnboardingById(selectedOnboarding.id);
      if (refreshed) setSelectedOnboarding(refreshed);
    }
  };

  const handleDocumentVerify = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    if (!selectedOnboarding) return;
    if (status === 'REJECTED') {
      setRejectDocId(docId);
      setIsRejectDocModalOpen(true);
      return;
    }
    await onboardingService.verifyDocument(selectedOnboarding.id, docId, 'VERIFIED');
    showToast('Document verified successfully!', 'success');
    loadData();
  };

  const handleConfirmRejectDoc = async () => {
    if (!selectedOnboarding || !rejectReason.trim()) return;
    await onboardingService.verifyDocument(selectedOnboarding.id, rejectDocId, 'REJECTED', rejectReason);
    showToast('Document rejected and replacement task generated', 'warning');
    setIsRejectDocModalOpen(false);
    setRejectReason('');
    loadData();
  };

  const handleManagerApprove = async () => {
    if (!selectedOnboarding) return;
    const mgrTask = selectedOnboarding.tasks?.find((t) => t.assigned_to_role === 'MANAGER');
    if (mgrTask) {
      await onboardingService.completeTask(mgrTask.id, 'Manager Anand Viswanathan');
      showToast('Reporting manager confirmed joining readiness!', 'success');
      loadData();
    }
  };

  const handleAssignAsset = async () => {
    if (!selectedOnboarding || !selectedAssetId) return;
    await onboardingService.assignAsset(selectedOnboarding.id, selectedAssetId);
    showToast('Hardware asset assigned and IT task completed!', 'success');
    setSelectedAssetId('');
    loadData();
  };

  const handleConfirmOverride = async () => {
    if (!selectedOnboarding || !overrideReason.trim()) return;
    await onboardingService.overrideTask(selectedOnboarding.id, overrideTaskId, overrideReason);
    showToast('Task requirement overridden by HR Head', 'warning');
    setIsOverrideModalOpen(false);
    setOverrideReason('');
    loadData();
  };

  const handleActivateEmployee = async () => {
    if (!selectedOnboarding) return;
    const res = await onboardingService.activateEmployee(selectedOnboarding.id);
    if (!res.success) {
      showToast(res.error || 'Failed to activate employee', 'error');
      return;
    }
    showToast(`Employee ${selectedOnboarding.employee?.first_name} activated successfully!`, 'success');
    setIsDrawerOpen(false);
    loadData();
  };

  // Filtered List
  const filteredOnboardings = onboardings.filter((o) => {
    const q = search.toLowerCase().trim();
    const empName = (o.employee?.first_name || '') + ' ' + (o.employee?.last_name || '');
    const matchesSearch =
      !q ||
      empName.toLowerCase().includes(q) ||
      (o.employee?.employee_code && o.employee.employee_code.toLowerCase().includes(q)) ||
      (o.employee?.work_email && o.employee.work_email.toLowerCase().includes(q)) ||
      (o.vendor_name && o.vendor_name.toLowerCase().includes(q)) ||
      (o.employee?.department_name && o.employee.department_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSource = sourceFilter === 'ALL' || o.employment_source === sourceFilter;
    const matchesStage = activeStage === 'ALL' || o.status === activeStage;

    // Segment filters
    let matchesSegment = true;
    if (activeSegment === 'NEW_JOINERS_MONTH') {
      matchesSegment = o.joining_date.startsWith(new Date().toISOString().slice(0, 7));
    } else if (activeSegment === 'OVERDUE') {
      matchesSegment = (o.overdue_tasks_count || 0) > 0;
    } else if (activeSegment === 'BLOCKED') {
      matchesSegment = (o.blocked_tasks_count || 0) > 0;
    } else if (activeSegment === 'HR_VERIFICATION') {
      matchesSegment = o.tasks?.some((t) => t.assigned_to_role === 'HR' && t.status !== 'COMPLETED') ?? false;
    } else if (activeSegment === 'MANAGER_ACTION') {
      matchesSegment = o.tasks?.some((t) => t.assigned_to_role === 'MANAGER' && t.status !== 'COMPLETED') ?? false;
    } else if (activeSegment === 'IT_ACTION') {
      matchesSegment = o.tasks?.some((t) => t.assigned_to_role === 'IT' && t.status !== 'COMPLETED') ?? false;
    } else if (activeSegment === 'PAYROLL_ACTION') {
      matchesSegment = o.tasks?.some((t) => t.assigned_to_role === 'PAYROLL' && t.status !== 'COMPLETED') ?? false;
    } else if (activeSegment === 'READY_TO_ACTIVATE') {
      matchesSegment = o.status === 'READY_TO_ACTIVATE' || (o.total_tasks_count === o.completed_tasks_count && o.status !== 'COMPLETED');
    } else if (activeSegment === 'VENDOR_WORKFORCE') {
      matchesSegment = o.employment_source === 'VENDOR';
    } else if (activeSegment === 'DIRECT_EMPLOYEES') {
      matchesSegment = o.employment_source === 'DIRECT';
    }

    return matchesSearch && matchesStatus && matchesSource && matchesStage && matchesSegment;
  });

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb items={[{ label: 'People & Core HR' }, { label: 'Onboarding Engine 2.0' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Onboarding Engine</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track new joiners, document verification, manager readiness, IT asset provisioning, and employee activation.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateWizardOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="font-bold shadow-sm"
        >
          Initiate Onboarding
        </Button>
      </div>

      {/* 8 Live SQL-Driven KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active</div>
          <div className="text-xl font-black text-gray-900">{metrics.active_onboardings}</div>
          <div className="text-[10px] text-gray-400">In Progress</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">HR Tasks</div>
          <div className="text-xl font-black text-[#07563D]">{metrics.pending_hr_verification}</div>
          <div className="text-[10px] text-emerald-800">Verification</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Employee</div>
          <div className="text-xl font-black text-blue-700">{metrics.pending_employee_tasks}</div>
          <div className="text-[10px] text-blue-800">Docs & Profile</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Manager</div>
          <div className="text-xl font-black text-amber-700">{metrics.pending_manager_tasks}</div>
          <div className="text-[10px] text-amber-800">Readiness</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">IT / Assets</div>
          <div className="text-xl font-black text-indigo-700">{metrics.pending_it_tasks}</div>
          <div className="text-[10px] text-indigo-800">Workstation</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">This Month</div>
          <div className="text-xl font-black text-purple-700">{metrics.joining_this_month}</div>
          <div className="text-[10px] text-purple-800">New Joiners</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Overdue</div>
          <div className="text-xl font-black text-rose-700">{metrics.overdue_tasks}</div>
          <div className="text-[10px] text-rose-800">Action Required</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Ready</div>
          <div className="text-xl font-black text-teal-700">{metrics.ready_to_activate}</div>
          <div className="text-[10px] text-teal-800">To Activate</div>
        </div>
      </div>

      {/* Stage Pipeline Interactive Filter Strip */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 shrink-0">Stage:</span>
        {PIPELINE_STAGES.map((stg) => {
          const isSelected = activeStage === stg.id;
          return (
            <button
              key={stg.id}
              onClick={() => setActiveStage(stg.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#07563D] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {stg.label}
            </button>
          );
        })}
      </div>

      {/* Segment Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL_ONBOARDINGS', label: 'All Onboardings' },
          { id: 'NEW_JOINERS_MONTH', label: 'Joining This Month' },
          { id: 'OVERDUE', label: 'Overdue Tasks' },
          { id: 'BLOCKED', label: 'Blocked' },
          { id: 'HR_VERIFICATION', label: 'HR Action' },
          { id: 'MANAGER_ACTION', label: 'Manager Action' },
          { id: 'IT_ACTION', label: 'IT Action' },
          { id: 'PAYROLL_ACTION', label: 'Payroll Action' },
          { id: 'READY_TO_ACTIVATE', label: 'Ready to Activate' },
          { id: 'DIRECT_EMPLOYEES', label: 'Direct Employees' },
          { id: 'VENDOR_WORKFORCE', label: 'Vendor Workforce' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSegment === tab.id
                ? 'bg-emerald-950 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name, employee code, work email, vendor, department..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-medium"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Sourcing Models</option>
              <option value="DIRECT">Direct Employees</option>
              <option value="VENDOR">Vendor / Manpower</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setActiveSegment('ALL_ONBOARDINGS');
                setActiveStage('ALL');
                setSourceFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-gray-500 font-bold"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Onboarding Master Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold">Candidate / Employee</TableHead>
              <TableHead className="font-bold">Sourcing</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Manager</TableHead>
              <TableHead className="font-bold">Joining Date</TableHead>
              <TableHead className="font-bold">Progress</TableHead>
              <TableHead className="font-bold">Current Stage & Blocker</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOnboardings.length > 0 ? (
              filteredOnboardings.map((onb) => {
                const isVendor = onb.employment_source === 'VENDOR';
                return (
                  <TableRow key={onb.id} className="hover:bg-emerald-50/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#07563D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {onb.employee?.first_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">
                            {onb.employee?.first_name} {onb.employee?.last_name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            {onb.employee?.employee_code || 'EMP-TEMP'} • {onb.employee?.designation_title || 'New Joiner'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isVendor ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Users className="w-3 h-3" /> VENDOR · {onb.vendor_name || 'Agency'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Building2 className="w-3 h-3" /> DIRECT
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-gray-700 font-medium">
                      {onb.employee?.department_name || 'Operations'}
                    </TableCell>

                    <TableCell className="text-xs text-gray-900 font-bold">
                      {onb.employee?.employment?.reporting_manager_name || 'Dharun Joy'}
                    </TableCell>

                    <TableCell className="text-xs text-gray-700 font-medium">
                      {onb.joining_date}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1 w-28">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-600">
                          <span>{onb.completed_tasks_count} / {onb.total_tasks_count}</span>
                          <span>{onb.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#07563D] h-1.5 rounded-full transition-all"
                            style={{ width: `${onb.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-bold text-gray-900 leading-tight">{onb.current_stage}</div>
                      {onb.blocked_tasks_count ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Blocked
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Badge variant="emerald" className="text-xs font-bold">
                        {onb.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleInspectOnboarding(onb)}
                        className="text-xs font-bold"
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-xs text-gray-400">
                  <div className="space-y-2">
                    <UserPlus className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-600">Nothing to onboard yet</p>
                    <p className="text-gray-400">Initiate onboarding from Employee Management or add a new candidate.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 7-Tab Onboarding Detail Inspector Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedOnboarding ? `${selectedOnboarding.employee?.first_name} ${selectedOnboarding.employee?.last_name} — Onboarding` : 'Onboarding Details'}
        size="lg"
      >
        {selectedOnboarding && (
          <div className="space-y-5">
            {/* Candidate Header Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-emerald-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">{selectedOnboarding.employee?.first_name} {selectedOnboarding.employee?.last_name}</h3>
                  <p className="text-xs text-emerald-200">
                    {selectedOnboarding.employee?.designation_title} • {selectedOnboarding.employee?.department_name}
                  </p>
                </div>
                <Badge variant="emerald" className="bg-emerald-400 text-emerald-950 font-black">
                  {selectedOnboarding.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200">
                <span>Joining: <strong className="text-white">{selectedOnboarding.joining_date}</strong></span>
                <span>Manager: <strong className="text-white">{selectedOnboarding.employee?.employment?.reporting_manager_name || 'Dharun Joy'}</strong></span>
                <span>Progress: <strong className="text-white">{selectedOnboarding.completed_tasks_count} / {selectedOnboarding.total_tasks_count} ({selectedOnboarding.progress_percentage}%)</strong></span>
              </div>
            </div>

            {/* 7 Dedicated Tabs */}
            <Tabs
              tabs={[
                { id: 'tasks', label: `Tasks (${selectedOnboarding.tasks?.length || 0})`, icon: <CheckSquare className="w-4 h-4" /> },
                { id: 'documents', label: 'Documents & E-Sign', icon: <FileCheck className="w-4 h-4" /> },
                { id: 'manager', label: 'Manager Review', icon: <Users className="w-4 h-4" /> },
                { id: 'it_assets', label: 'IT & Assets', icon: <Laptop className="w-4 h-4" /> },
                { id: 'attendance_payroll', label: 'Attendance & Payroll', icon: <CreditCard className="w-4 h-4" /> },
                { id: 'readiness', label: 'Readiness & Activate', icon: <ShieldCheck className="w-4 h-4" /> },
                { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
              ]}
              activeTab={activeDrawerTab}
              onChange={setActiveDrawerTab}
            />

            {/* Tab 1: Task Board */}
            {activeDrawerTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Assigned Onboarding Tasks
                  </h4>
                </div>

                <div className="space-y-2">
                  {selectedOnboarding.tasks?.map((task) => {
                    const isCompleted = task.status === 'COMPLETED';
                    const isBlocked = task.status === 'BLOCKED';

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border space-y-2 text-xs transition-all ${
                          isCompleted
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : isBlocked
                            ? 'bg-rose-50/30 border-rose-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{task.title}</span>
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                                {task.assigned_to_role}
                              </span>
                              <Badge variant={isCompleted ? 'emerald' : isBlocked ? 'rose' : 'gray'}>
                                {task.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-gray-500">{task.description}</p>
                          </div>

                          {!isCompleted && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleCompleteTask(task.id)}
                                className="text-xs font-bold"
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setOverrideTaskId(task.id);
                                  setIsOverrideModalOpen(true);
                                }}
                                className="text-[11px] text-amber-700 hover:bg-amber-50"
                              >
                                Override
                              </Button>
                            </div>
                          )}
                        </div>

                        {task.dependency_task_title && !isCompleted && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-900">
                            <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Prerequisite: <strong>{task.dependency_task_title}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Documents */}
            {activeDrawerTab === 'documents' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Statutory Documents</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { name: 'Government ID (PAN / Aadhaar)', file: 'Rajesh_PAN_Card.pdf', status: 'VERIFIED' },
                      { name: 'Educational Degree Certificate', file: 'Rajesh_Degree_BTech.pdf', status: 'VERIFIED' },
                      { name: 'Relieving & Experience Letter', file: 'Previous_Relieving_Letter.pdf', status: 'PENDING' },
                    ].map((doc, i) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#07563D]" />
                          <div>
                            <div className="font-bold text-gray-900">{doc.name}</div>
                            <div className="text-[11px] text-gray-400">{doc.file}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.status === 'VERIFIED' ? 'emerald' : 'amber'}>{doc.status}</Badge>
                          {doc.status !== 'VERIFIED' && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleDocumentVerify(`doc-${i}`, 'VERIFIED')}
                                className="text-xs"
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDocumentVerify(`doc-${i}`, 'REJECTED')}
                                className="text-xs text-rose-600 hover:bg-rose-50"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 3: Manager Review */}
            {activeDrawerTab === 'manager' && (
              <Card className="p-4 space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Manager Joining Readiness</h4>
                <p className="text-xs text-gray-600">
                  Assigned Manager: <strong>{selectedOnboarding.employee?.employment?.reporting_manager_name || 'Anand Viswanathan'}</strong>
                </p>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">Confirm Seating & Project Scope</span>
                    <Button size="sm" variant="primary" onClick={handleManagerApprove}>
                      Confirm Readiness
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Tab 4: IT & Assets */}
            {activeDrawerTab === 'it_assets' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">IT Hardware & Asset Allocation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Available Hardware Asset</label>
                      <select
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                      >
                        <option value="">-- Choose Asset from Inventory --</option>
                        {availableAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.asset_tag || a.serial_number}) - {a.type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="primary"
                      disabled={!selectedAssetId}
                      onClick={handleAssignAsset}
                      className="font-bold text-xs"
                    >
                      Assign Asset
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 5: Attendance & Payroll */}
            {activeDrawerTab === 'attendance_payroll' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-2 text-xs">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Attendance & Shift Policy</h4>
                  <p className="text-gray-600">Configured Policy: <strong>General Day Shift (09:00 - 18:00) · Coimbatore Campus</strong></p>
                </Card>

                <Card className="p-4 space-y-2 text-xs">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Statutory Payroll Breakdown</h4>
                  <p className="text-gray-600">CTC Structure: <strong>Standard Executive Band · PF & ESI Registered</strong></p>
                </Card>
              </div>
            )}

            {/* Tab 6: Readiness & Activation */}
            {activeDrawerTab === 'readiness' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Readiness Checklist Audit</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Identity & Statutory Documents', done: true },
                      { label: 'Emergency Contact & Bank Details', done: true },
                      { label: 'Information Security & POSH Policy Acceptance', done: true },
                      { label: 'Manager Reporting Confirmation', done: selectedOnboarding.tasks?.find((t) => t.assigned_to_role === 'MANAGER')?.status === 'COMPLETED' },
                      { label: 'IT Workstation & Credentials Provisioning', done: selectedOnboarding.tasks?.find((t) => t.assigned_to_role === 'IT')?.status === 'COMPLETED' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
                        <span className="font-semibold text-gray-800">{item.label}</span>
                        {item.done ? (
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Incomplete
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleActivateEmployee}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      className="font-bold shadow-sm"
                    >
                      Activate Employee to ACTIVE
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 7: Audit */}
            {activeDrawerTab === 'audit' && (
              <div className="space-y-2 text-xs">
                {onboardingAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
                    <div className="flex items-center justify-between text-gray-900 font-bold">
                      <span>{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{log.created_at.split('T')[0]}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Performed by: {log.actor_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Rejection Modal */}
      <Modal isOpen={isRejectDocModalOpen} onClose={() => setIsRejectDocModalOpen(false)} title="Reject Document">
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">Specify why this document is rejected so the employee can upload a valid replacement.</p>
          <textarea
            rows={3}
            required
            placeholder="e.g. Relieving letter stamp is blurry. Please provide clear signed copy."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsRejectDocModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmRejectDoc} className="bg-rose-600 hover:bg-rose-700">Confirm Rejection</Button>
          </div>
        </div>
      </Modal>

      {/* HR Head Override Modal */}
      <Modal isOpen={isOverrideModalOpen} onClose={() => setIsOverrideModalOpen(false)} title="HR Head Requirement Override">
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">Provide an explicit executive justification for bypassing this requirement.</p>
          <textarea
            rows={3}
            required
            placeholder="e.g. Laptop delivery delayed in transit; temporary loaner issued by IT Lead."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsOverrideModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmOverride} className="font-bold">Record Override & Continue</Button>
          </div>
        </div>
      </Modal>

      {/* Employee Creation Wizard Modal */}
      <EmployeeCreateWizardModal
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onCreated={() => {
          loadData();
        }}
      />
    </div>
  );
};
