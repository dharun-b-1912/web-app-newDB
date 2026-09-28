// src/features/attendance/subviews/AttendanceRulesView.tsx
// ============================================================================
// JOY PeopleHR — Biometric Attendance Rules & Automation Engine UI
// Time-Based Rules • Shift • Grace • Exceptions • Multi-Rules • OT • Simulator
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { api } from '../../../services/api';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import {
  AttendanceRule,
  EmployeeAttendanceException,
  AttendanceRuleExecutionLog,
  RuleSimulationResult,
  RuleCategory,
  RuleScopeType,
} from '../../../types/attendanceRules';
import { useTenant } from '../../../hooks/useTenant';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { attendanceRuleEngineService } from '../../../services/attendance/attendanceRuleEngineService';
import {
  SlidersHorizontal,
  Plus,
  Play,
  History,
  ShieldCheck,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  Activity,
  Zap,
  Calendar,
  Settings,
  X,
  FileCheck,
  Check,
  Scale,
  RefreshCw,
  Terminal,
  FileText,
  Building2,
  Download,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AttendanceRulesViewProps {
  onNavigateSubPath?: (subPath: string) => void;
}

export const AttendanceRulesView: React.FC<AttendanceRulesViewProps> = ({ onNavigateSubPath }) => {
  const { showToast } = useToast();

  let tenantContext: any = null;
  try {
    tenantContext = useTenant();
  } catch (_) {}

  const activeOrgId = tenantContext?.organization?.id || getActiveOrgId();
  const activeOrgName = tenantContext?.organization?.name || 'JOY Corporation';
  const activeLegalEntityName = tenantContext?.activeLegalEntity?.name || tenantContext?.activeCompany?.name || '';

  const [activeTab, setActiveTab] = useState<'rules' | 'exceptions' | 'simulator' | 'priority' | 'templates' | 'logs'>('rules');
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rules, setRules] = useState<AttendanceRule[]>(() => attendanceRuleEngineService.getRules(selectedCategory, undefined, activeOrgId));
  const [exceptions, setExceptions] = useState<EmployeeAttendanceException[]>(() => attendanceRuleEngineService.getEmployeeExceptions(undefined, activeOrgId));
  const [logs, setLogs] = useState<AttendanceRuleExecutionLog[]>(() => attendanceRuleEngineService.getRuleExecutionLogs(50, activeOrgId));
  const [metrics, setMetrics] = useState(() => attendanceRuleEngineService.getMetrics(activeOrgId));
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>(() => attendanceRosterService.getShifts(activeOrgId));

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AttendanceRule | null>(null);

  // Simulation State
  const [simEmployeeId, setSimEmployeeId] = useState('');
  const [simDate, setSimDate] = useState('2026-09-11');
  const [simTime, setSimTime] = useState('08:54:00');
  const [simSource, setSimSource] = useState<'BIOMETRIC' | 'MOBILE' | 'WEB'>('BIOMETRIC');
  const [simMethod, setSimMethod] = useState<'FINGERPRINT' | 'FACE' | 'CARD'>('FINGERPRINT');
  const [simDirection, setSimDirection] = useState<'IN' | 'OUT' | 'AUTO'>('IN');
  const [simulationResult, setSimulationResult] = useState<RuleSimulationResult | null>(null);

  // Builder Form State
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [formRuleName, setFormRuleName] = useState('');
  const [formCategory, setFormCategory] = useState<RuleCategory>('CHECK_IN_OUT');
  const [formScopeType, setFormScopeType] = useState<RuleScopeType>('ORGANIZATION');
  const [formScopeTarget, setFormScopeTarget] = useState('ALL');
  const [formTrigger, setFormTrigger] = useState<'FIRST_PUNCH' | 'ANY_PUNCH' | 'AFTER_SHIFT_END' | 'DURING_SHIFT'>('FIRST_PUNCH');
  const [formGraceMinutes, setFormGraceMinutes] = useState(10);
  const [formOtThreshold, setFormOtThreshold] = useState(30);
  const [formOtRounding, setFormOtRounding] = useState<'EXACT' | '15_MIN' | '30_MIN'>('15_MIN');
  const [formMinGap, setFormMinGap] = useState(5);
  const [formPriority, setFormPriority] = useState(50);
  const [formEffectiveFrom, setFormEffectiveFrom] = useState('2026-01-01');

  // Exception Form State
  const [exEmpId, setExEmpId] = useState('');
  const [exType, setExType] = useState<'GRACE_OVERRIDE' | 'SHIFT_OVERRIDE' | 'OT_THRESHOLD_OVERRIDE'>('GRACE_OVERRIDE');
  const [exTitle, setExTitle] = useState('');
  const [exReason, setExReason] = useState('');
  const [exGraceMinutes, setExGraceMinutes] = useState(20);
  const [exOtThreshold, setExOtThreshold] = useState(15);
  const [exFrom, setExFrom] = useState('2026-09-11');
  const [exTo, setExTo] = useState('2026-09-30');

  const loadData = () => {
    // Phase 1: Immediate in-memory fast path for sub-10ms initial mount
    const r = attendanceRuleEngineService.getRules(selectedCategory, undefined, activeOrgId);
    const m = attendanceRuleEngineService.getMetrics(activeOrgId);
    const ex = attendanceRuleEngineService.getEmployeeExceptions(undefined, activeOrgId);
    setRules(r);
    setMetrics(m);
    setExceptions(ex);

    if (activeTab === 'logs') {
      const l = attendanceRuleEngineService.getRuleExecutionLogs(50, activeOrgId);
      setLogs(l);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('attendance.*', () => loadData());
    const unsubEmp = hrEventBus.subscribe('employee.updated', () => loadData());
    return () => {
      unsub();
      unsubEmp();
    };
  }, [selectedCategory, activeTab, activeOrgId]);

  // Phase 2: Lazy-load heavy employees and shifts only when modals or simulator/exceptions are opened
  useEffect(() => {
    if (isBuilderOpen || isExceptionModalOpen || activeTab === 'simulator' || activeTab === 'exceptions') {
      if (employees.length === 0) {
        api.getEmployees(activeOrgId).then((emps) => {
          if (emps && emps.length > 0) {
            setEmployees(emps);
            if (!simEmployeeId) {
              setSimEmployeeId(emps[0].id);
            }
          }
        }).catch(() => {});
      }
      if (shifts.length === 0) {
        const loadedShifts = attendanceRosterService.getShifts(activeOrgId);
        setShifts(loadedShifts);
      }
    }
    if (activeTab === 'logs') {
      setLogs(attendanceRuleEngineService.getRuleExecutionLogs(50));
    }
  }, [isBuilderOpen, isExceptionModalOpen, activeTab, employees.length, shifts.length]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.rule_name.toLowerCase().includes(q) ||
        r.rule_code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.scope_labels && r.scope_labels.some((l) => l.toLowerCase().includes(q)));
      return matchQuery;
    });
  }, [rules, searchQuery]);

  // Handle Simulation
  const handleRunSimulation = () => {
    const emp = employees.find((e) => e.id === simEmployeeId) || {
      id: simEmployeeId || 'emp-sim',
      display_name: 'Selected Employee',
      employee_code: 'EMP-001',
    };

    const res = attendanceRuleEngineService.simulatePunch(
      {
        employee_id: emp.id,
        employee_name: emp.display_name || emp.name,
        employee_code: emp.employee_code,
        date: simDate,
        punch_time: simTime,
        source: simSource,
        verification_method: simMethod,
        punch_direction: simDirection,
        existing_punches: simDirection === 'OUT' ? [{ time: '09:00:00', direction: 'IN', classification: 'CHECK_IN' }] : [],
      },
      activeOrgId
    );

    setSimulationResult(res);
    showToast(`Simulation complete: Classified as ${res.classification}`);
  };

  // Handle Quick Template Select
  const handleApplyTemplate = (tplKey: string) => {
    if (tplKey === 'PROD_GRACE') {
      attendanceRuleEngineService.createRule(
        {
          rule_name: 'Plant Production 15m Grace Rule',
          rule_code: `RUL-PROD-${Date.now().toString().slice(-4)}`,
          description: 'Auto-extends on-time grace to 15m for all manufacturing workers.',
          category: 'GRACE_LATE',
          status: 'ACTIVE',
          priority: 25,
          scope_type: 'DEPARTMENT',
          scope_ids: ['Operations', 'Production'],
          scope_labels: ['Operations', 'Production'],
          trigger_event: 'FIRST_PUNCH',
          conditions: [],
          actions: [{ id: 'act-1', action_type: 'APPLY_GRACE', parameters: { grace_minutes: 15 } }],
          effective_from: '2026-09-01',
          human_readable_summary: 'When a Production/Operations worker clocks in, apply a 15-minute grace period.',
          covered_employees_count: 142,
          created_by: 'HR Operations',
        },
        activeOrgId
      );
    } else if (tplKey === 'NIGHT_SHIFT') {
      attendanceRuleEngineService.createRule(
        {
          rule_name: 'Overnight Shift 22:00–06:00 Reconciliation Rule',
          rule_code: `RUL-NGT-${Date.now().toString().slice(-4)}`,
          description: 'Binds next-day morning punches to the previous night shift date.',
          category: 'CHECK_IN_OUT',
          status: 'ACTIVE',
          priority: 20,
          scope_type: 'SHIFT',
          scope_ids: ['NGT-22', 'NIGHT'],
          scope_labels: ['Night Shift (22:00 - 06:00)'],
          trigger_event: 'ANY_PUNCH',
          conditions: [],
          actions: [{ id: 'act-1', action_type: 'CLASSIFY_CHECK_OUT', parameters: { early_checkout_grace_minutes: 15 } }],
          effective_from: '2026-09-01',
          human_readable_summary: 'When a night-shift employee punches before 07:00 AM, associate it with the night shift start date.',
          covered_employees_count: 36,
          created_by: 'HR Operations',
        },
        activeOrgId
      );
    } else if (tplKey === 'OT_30M') {
      attendanceRuleEngineService.createRule(
        {
          rule_name: 'Standard 30-Minute Overtime Threshold',
          rule_code: `RUL-OT-${Date.now().toString().slice(-4)}`,
          description: 'Overtime begins after 30 minutes beyond scheduled shift end.',
          category: 'OVERTIME',
          status: 'ACTIVE',
          priority: 50,
          scope_type: 'ORGANIZATION',
          scope_ids: ['ALL'],
          scope_labels: ['Entire Company'],
          trigger_event: 'AFTER_SHIFT_END',
          conditions: [],
          actions: [{ id: 'act-1', action_type: 'CALCULATE_OT', parameters: { ot_threshold_minutes: 30, ot_rounding: '15_MIN' } }],
          effective_from: '2026-01-01',
          human_readable_summary: 'When an employee punches out >30m after scheduled shift end, calculate overtime with 15m intervals.',
          covered_employees_count: 486,
          created_by: 'Payroll Admin',
        },
        activeOrgId
      );
    }

    loadData();
    showToast('Rule template created and activated successfully.');
  };

  // Handle Save Exception
  const handleSaveException = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === exEmpId) || {
      id: exEmpId,
      display_name: 'Dharun B',
      employee_code: 'JCS-017',
    };

    attendanceRuleEngineService.createEmployeeException(
      {
        employee_id: emp.id,
        employee_name: emp.display_name || emp.name,
        employee_code: emp.employee_code,
        department: emp.department_name || 'Operations',
        exception_type: exType,
        title: exTitle || (exType === 'GRACE_OVERRIDE' ? `${exGraceMinutes}m Grace Override` : 'Custom Schedule Override'),
        reason: exReason || 'Temporary project requirement',
        override_values: {
          grace_minutes: exType === 'GRACE_OVERRIDE' ? exGraceMinutes : undefined,
          ot_threshold_minutes: exType === 'OT_THRESHOLD_OVERRIDE' ? exOtThreshold : undefined,
          attendance_mode: 'AUTO',
        },
        effective_from: exFrom,
        effective_to: exTo,
        status: 'ACTIVE',
        requested_by: 'HR Head',
        approved_by: 'Managing Director',
        approved_at: new Date().toISOString(),
      },
      activeOrgId
    );

    setIsExceptionModalOpen(false);
    loadData();
    showToast(`Employee exception created for ${emp.display_name || emp.name}.`);
  };

  // Live Rule Sentence Generator for Wizard
  const liveSummarySentence = useMemo(() => {
    const scopeStr = formScopeType === 'ORGANIZATION' ? 'all company employees' : `employees in ${formScopeTarget}`;
    const triggerStr =
      formTrigger === 'FIRST_PUNCH'
        ? 'record their first biometric/mobile punch'
        : formTrigger === 'AFTER_SHIFT_END'
        ? 'punch out after scheduled shift end'
        : 'punch on any terminal';
    const actionStr =
      formCategory === 'GRACE_LATE'
        ? `apply a ${formGraceMinutes}-minute on-time grace period before marking late`
        : formCategory === 'OVERTIME'
        ? `calculate overtime after ${formOtThreshold} minutes with ${formOtRounding} rounding`
        : `classify as CHECK-IN with ${formGraceMinutes}m grace`;

    return `When ${scopeStr} ${triggerStr}, ${actionStr} (Priority Rank: ${formPriority}).`;
  }, [formScopeType, formScopeTarget, formTrigger, formCategory, formGraceMinutes, formOtThreshold, formOtRounding, formPriority]);

  const handleSaveRule = () => {
    if (!formRuleName) {
      showToast('Please enter a descriptive rule name.');
      return;
    }

    attendanceRuleEngineService.createRule(
      {
        rule_name: formRuleName,
        rule_code: `RUL-${Date.now().toString().slice(-4)}`,
        description: liveSummarySentence,
        category: formCategory,
        status: 'ACTIVE',
        priority: formPriority,
        scope_type: formScopeType,
        scope_ids: [formScopeTarget],
        scope_labels: [formScopeTarget === 'ALL' ? 'Entire Organization' : formScopeTarget],
        trigger_event: formTrigger,
        conditions: [],
        actions: [
          {
            id: 'act-1',
            action_type: formCategory === 'OVERTIME' ? 'CALCULATE_OT' : 'CLASSIFY_CHECK_IN',
            parameters: {
              grace_minutes: formGraceMinutes,
              ot_threshold_minutes: formOtThreshold,
              ot_rounding: formOtRounding,
              min_punch_gap_minutes: formMinGap,
            },
          },
        ],
        effective_from: formEffectiveFrom,
        human_readable_summary: liveSummarySentence,
        covered_employees_count: formScopeType === 'ORGANIZATION' ? 486 : 142,
        created_by: 'HR Operations',
      },
      activeOrgId
    );

    setIsBuilderOpen(false);
    loadData();
    showToast(`Rule "${formRuleName}" saved and activated successfully.`);
  };

  const handleExportBackup = () => {
    const pkg = attendanceRuleEngineService.exportTenantRulesConfig(activeOrgId);
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_rules_${activeOrgId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported attendance rules backup for ${activeOrgName}`);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* 1. HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#07563D]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">ATTENDANCE RULES & AUTOMATION ENGINE</h1>
                <Badge variant="emerald" size="sm">Deterministic v3.0</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically determine check-in, check-out, grace, breaks and overtime from employee schedules and attendance punches.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#07563D] border border-emerald-200">
                  <Building2 className="w-3 h-3" />
                  Organization: {activeOrgName} ({activeOrgId})
                </span>
                {activeLegalEntityName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    Entity: {activeLegalEntityName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportBackup}
            className="text-xs font-bold gap-1.5 rounded-xl h-9"
            title="Export full tenant configuration backup"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> Export Backup
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('simulator')}
            className="text-xs font-bold gap-1.5 rounded-xl h-9"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600" /> Rule Simulator
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('priority')}
            className="text-xs font-bold gap-1.5 rounded-xl h-9"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-600" /> Rule Priority
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('logs')}
            className="text-xs font-bold gap-1.5 rounded-xl h-9"
          >
            <Terminal className="w-3.5 h-3.5 text-gray-600" /> Audit Log
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setBuilderStep(1);
              setFormRuleName('');
              setIsBuilderOpen(true);
            }}
            className="text-xs font-bold gap-1.5 bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Attendance Rule
          </Button>
        </div>
      </div>

      {/* 2. TOP REAL KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ACTIVE RULES</span>
          <p className="text-xl font-black text-gray-900 font-mono">{metrics.active_rules_count}</p>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Live & Enforcing
          </span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EMPLOYEES COVERED</span>
          <p className="text-xl font-black text-gray-900 font-mono">{metrics.employees_covered_count}</p>
          <span className="text-[10px] text-gray-500">{metrics.employees_covered_count > 0 ? 'Active Workforce Scope' : 'No Coverage'}</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EXCEPTIONS</span>
          <p className="text-xl font-black text-indigo-900 font-mono">{metrics.active_exceptions_count}</p>
          <span className="text-[10px] text-indigo-700 font-semibold">Priority Level 1</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TODAY AUTO PROCESSED</span>
          <p className="text-xl font-black text-emerald-900 font-mono">{metrics.today_auto_processed_count.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Sub-10ms Engine</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RULE CONFLICTS</span>
          <p className="text-xl font-black text-gray-900 font-mono">{metrics.rule_conflicts_count}</p>
          <span className={cn("text-[10px] font-semibold flex items-center gap-1", metrics.rule_conflicts_count > 0 ? "text-amber-600" : "text-emerald-700")}>
            {metrics.rule_conflicts_count > 0 ? `${metrics.rule_conflicts_count} Overlaps Flagged` : 'Zero Ambiguity'}
          </span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FAILED CALCULATIONS</span>
          <p className="text-xl font-black text-gray-900 font-mono">{metrics.failed_calculations_count}</p>
          <span className={cn("text-[10px] font-semibold", metrics.failed_calculations_count > 0 ? "text-rose-600" : "text-emerald-700")}>
            {metrics.failed_calculations_count > 0 ? `${metrics.failed_calculations_count} Failures` : 'Healthy Pipeline'}
          </span>
        </Card>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'rules' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#07563D]" /> Active Rules & Library
          <Badge variant="emerald" size="sm" className="ml-1">{rules.length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab('exceptions')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'exceptions' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" /> Employee Exceptions
          <Badge variant="purple" size="sm" className="ml-1">{exceptions.length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'simulator' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Play className="w-3.5 h-3.5 text-emerald-600" /> Rule Simulator
        </button>

        <button
          onClick={() => setActiveTab('priority')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'priority' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Scale className="w-3.5 h-3.5 text-amber-600" /> Rule Priority & Hierarchy
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'templates' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Zap className="w-3.5 h-3.5 text-blue-600" /> Rule Templates
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'logs' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Terminal className="w-3.5 h-3.5 text-gray-600" /> Execution Audit Logs
        </button>
      </div>

      {/* 4. TAB 1: ACTIVE RULES & LIBRARY */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <Card className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500">Category:</span>
                {(['ALL', 'CHECK_IN_OUT', 'GRACE_LATE', 'OVERTIME', 'BREAKS', 'DUPLICATES'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                      selectedCategory === cat ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rules, shifts, departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => (
              <Card
                key={rule.id}
                className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="emerald" size="sm" className="font-mono text-[9px]">
                          P{rule.priority}
                        </Badge>
                        <span className="text-[10px] font-mono text-gray-400">{rule.rule_code}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mt-1">{rule.rule_name}</h3>
                    </div>
                    <Badge variant={rule.status === 'ACTIVE' ? 'emerald' : 'secondary'} size="sm">
                      {rule.status}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80 text-[11px] text-emerald-950 leading-relaxed">
                    <p className="font-medium">{rule.human_readable_summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 pt-1">
                    <div>
                      <span className="font-bold text-gray-400 uppercase">Scope</span>
                      <p className="font-semibold text-gray-800">{rule.scope_labels?.join(', ') || rule.scope_type}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase">Trigger</span>
                      <p className="font-semibold text-gray-800">{rule.trigger_event}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase">Covered</span>
                      <p className="font-semibold text-gray-800">{rule.covered_employees_count || 486} Employees</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase">Version</span>
                      <p className="font-semibold text-gray-800 font-mono">v{rule.rule_version}.0</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400">Effective: {rule.effective_from}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setSimEmployeeId('emp-danya-154');
                        setActiveTab('simulator');
                        handleRunSimulation();
                      }}
                      className="text-[10px] h-7 px-2 font-bold"
                    >
                      <Play className="w-3 h-3 text-emerald-600 mr-1" /> Test
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        attendanceRuleEngineService.updateRule(rule.id, {
                          status: rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        });
                        loadData();
                        showToast(`Rule ${rule.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
                      }}
                      className="text-[10px] h-7 px-2 font-bold"
                    >
                      {rule.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 5. TAB 2: EMPLOYEE EXCEPTIONS */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Individual Employee Attendance Exceptions</h2>
              <p className="text-xs text-gray-500">
                Priority Level 1 rules that specifically override normal shift, grace, or OT policies for assigned staff.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsExceptionModalOpen(true)}
              className="text-xs font-bold gap-1.5 bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl h-9"
            >
              <Plus className="w-4 h-4" /> Add Employee Exception
            </Button>
          </div>

          <Card className="p-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 text-gray-600 text-xs">
                  <TableHead className="pl-4">Employee</TableHead>
                  <TableHead>Exception Type</TableHead>
                  <TableHead>Override Details</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead>Status & Approval</TableHead>
                  <TableHead className="text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                      No active employee exceptions configured. All employees follow organization/department rules.
                    </TableCell>
                  </TableRow>
                ) : (
                  exceptions.map((ex) => (
                    <TableRow key={ex.id} className="text-xs hover:bg-gray-50/80">
                      <TableCell className="pl-4 font-bold text-gray-900">
                        {ex.employee_name}
                        <div className="text-[10px] text-gray-500 font-mono">{ex.employee_code} • {ex.department}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="purple" size="sm">{ex.exception_type.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-gray-800">
                        {ex.override_values.grace_minutes !== undefined && (
                          <span>Grace: <strong>{ex.override_values.grace_minutes}m</strong> (Priority Level 1)</span>
                        )}
                        {ex.override_values.ot_threshold_minutes !== undefined && (
                          <span>OT Threshold: <strong>{ex.override_values.ot_threshold_minutes}m</strong></span>
                        )}
                        {ex.override_values.start_time && (
                          <span>Shift: <strong>{ex.override_values.start_time} - {ex.override_values.end_time}</strong></span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 max-w-xs">{ex.reason}</TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-700">
                        {ex.effective_from} &rarr; {ex.effective_to}
                      </TableCell>
                      <TableCell>
                        <Badge variant="emerald" size="sm">● {ex.status}</Badge>
                        <div className="text-[9px] text-gray-400 mt-0.5">Approved by {ex.approved_by || 'HR Head'}</div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            attendanceRuleEngineService.revokeEmployeeException(ex.id);
                            loadData();
                            showToast('Employee exception revoked.');
                          }}
                          className="text-[10px] h-6 text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 6. TAB 3: RULE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Play className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Attendance Rule Simulator Sandbox</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Select Employee</label>
                  <select
                    value={simEmployeeId}
                    onChange={(e) => setSimEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#07563D]"
                  >
                    {employees.length > 0 ? (
                      employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code} ({emp.employee_code || emp.id} • {emp.department_name || emp.department || 'Operations'})
                        </option>
                      ))
                    ) : (
                      <option value="">No employees found</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Date</label>
                    <input
                      type="date"
                      value={simDate}
                      onChange={(e) => setSimDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Punch Time</label>
                    <input
                      type="time"
                      step="1"
                      value={simTime}
                      onChange={(e) => setSimTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Source</label>
                    <select
                      value={simSource}
                      onChange={(e) => setSimSource(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      <option value="BIOMETRIC">BIOMETRIC (eSSL AiFace)</option>
                      <option value="MOBILE">MOBILE (GPS App)</option>
                      <option value="WEB">WEB (Portal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Method</label>
                    <select
                      value={simMethod}
                      onChange={(e) => setSimMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    >
                      <option value="FINGERPRINT">FINGERPRINT</option>
                      <option value="FACE">FACE RECOGNITION</option>
                      <option value="CARD">RFID CARD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Punch Context</label>
                  <select
                    value={simDirection}
                    onChange={(e) => setSimDirection(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="IN">First Punch of Day (Check-In)</option>
                    <option value="OUT">Departure Punch (Check-Out with prior check-in at 09:00 AM)</option>
                  </select>
                </div>

                <Button
                  onClick={handleRunSimulation}
                  className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold py-2.5 rounded-xl gap-2 mt-2"
                >
                  <Play className="w-4 h-4" /> Run Deterministic Simulation
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            {simulationResult ? (
              <Card className="p-6 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">Simulation Results & Rule Execution Trace</h3>
                      <Badge variant="emerald" size="sm">Deterministic Match</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{simulationResult.simulation_id}</p>
                  </div>

                  <span
                    className={cn(
                      'px-3 py-1 rounded-xl text-xs font-black',
                      simulationResult.classification === 'CHECK_IN'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-blue-100 text-blue-900'
                    )}
                  >
                    {simulationResult.classification}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Resolved Shift</span>
                    <p className="font-bold text-gray-900 mt-0.5">{simulationResult.resolved_shift.shift_code}</p>
                    <span className="text-[10px] text-gray-500 font-mono">{simulationResult.resolved_shift.start_time} - {simulationResult.resolved_shift.end_time}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Grace Evaluation</span>
                    <p className="font-bold text-gray-900 mt-0.5">{simulationResult.grace_status}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">{simulationResult.late_minutes}m Late</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Calculated OT</span>
                    <p className="font-bold text-gray-900 mt-0.5">{simulationResult.overtime_minutes}m</p>
                    <span className="text-[10px] text-indigo-700 font-semibold">15m Rounded</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Selected Rule</span>
                    <p className="font-bold text-gray-900 mt-0.5 truncate">{simulationResult.selected_rule.rule_name}</p>
                    <span className="text-[10px] text-gray-500 font-mono">Priority P{simulationResult.selected_rule.priority}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-gray-600" /> Step-by-Step Rule Execution Trace
                  </h4>
                  <div className="p-4 rounded-2xl bg-gray-900 text-gray-100 font-mono text-xs space-y-1.5">
                    {simulationResult.execution_trace.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">&gt;</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center bg-gray-50/70 rounded-3xl border border-gray-200 text-xs text-gray-500 space-y-2">
                <Play className="w-8 h-8 text-emerald-600 mx-auto opacity-70" />
                <p className="font-bold text-gray-700">Ready to simulate attendance rule resolution</p>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Select an employee and punch timestamp on the left to see exactly which rule fires and how grace/OT is computed.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB 4: RULE PRIORITY & PRECEDENCE */}
      {activeTab === 'priority' && (
        <Card className="p-6 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Deterministic 7-Level Rule Priority Hierarchy</h2>
            <p className="text-xs text-gray-500">
              When evaluating a biometric punch, the engine resolves rules top-down. The highest applicable priority level immediately takes precedence.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { level: 1, title: 'Individual Employee Exception', desc: 'Temporary HR schedule override for a specific staff member (e.g. Dharun B 20m grace). Overrides all lower rules.', tag: 'Highest Authority', color: 'bg-rose-50 border-rose-200 text-rose-950' },
              { level: 2, title: 'Employee Group Rule', desc: 'Rules mapped to tagged employee workforce groups (e.g. Field Engineers, Interns).', tag: 'Group Authority', color: 'bg-indigo-50 border-indigo-200 text-indigo-950' },
              { level: 3, title: 'Department Rule', desc: 'Rules mapped to entire departments (e.g. Operations & Production 15-minute grace).', tag: 'Department Authority', color: 'bg-blue-50 border-blue-200 text-blue-950' },
              { level: 4, title: 'Designation Rule', desc: 'Rules mapped to job titles and roles (e.g. Specialist Doctors, Plant Supervisors).', tag: 'Designation Authority', color: 'bg-amber-50 border-amber-200 text-amber-950' },
              { level: 5, title: 'Site / Branch Rule', desc: 'Rules scoped to physical plant locations and branches (e.g. Coimbatore Plant vs Mumbai HQ).', tag: 'Site Authority', color: 'bg-teal-50 border-teal-200 text-teal-950' },
              { level: 6, title: 'Shift Master Rule', desc: 'Rules bound directly to the rostered shift definition (e.g. Night Shift NGT-22 cross-midnight).', tag: 'Shift Authority', color: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
              { level: 7, title: 'Organization Default Rule', desc: 'Baseline fallback rule for standard office operations (10m grace, 30m OT threshold).', tag: 'Baseline Fallback', color: 'bg-gray-50 border-gray-200 text-gray-950' },
            ].map((p) => (
              <div key={p.level} className={cn('p-4 rounded-2xl border flex items-center justify-between', p.color)}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-white shadow-xs font-black text-xs flex items-center justify-center font-mono">
                    {p.level}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs">{p.title}</h4>
                    <p className="text-[11px] opacity-80 mt-0.5">{p.desc}</p>
                  </div>
                </div>
                <Badge variant="secondary" size="sm" className="font-mono text-[9px] bg-white">
                  {p.tag}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 8. TAB 5: RULE TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pre-Configured Enterprise Attendance Templates</h2>
            <p className="text-xs text-gray-500">
              Instantly create tested and compliant attendance rules with one click.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <Badge variant="emerald" size="sm">Manufacturing / Plant</Badge>
                <h3 className="font-bold text-gray-900 text-sm">Production 15-Minute Grace</h3>
                <p className="text-xs text-gray-600">
                  Extends check-in grace window to 15 minutes for plant and operations workforce.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleApplyTemplate('PROD_GRACE')}
                className="w-full bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl"
              >
                + Activate Template
              </Button>
            </Card>

            <Card className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <Badge variant="purple" size="sm">Cross-Midnight</Badge>
                <h3 className="font-bold text-gray-900 text-sm">Night Shift 22:00–06:00</h3>
                <p className="text-xs text-gray-600">
                  Automatically aligns morning departure punches with previous day night roster.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleApplyTemplate('NIGHT_SHIFT')}
                className="w-full bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl"
              >
                + Activate Template
              </Button>
            </Card>

            <Card className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <Badge variant="blue" size="sm">Statutory Overtime</Badge>
                <h3 className="font-bold text-gray-900 text-sm">30m Threshold + 15m Rounding</h3>
                <p className="text-xs text-gray-600">
                  Calculates OT only after 30 minutes beyond shift end, rounding to 15-minute intervals.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleApplyTemplate('OT_30M')}
                className="w-full bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl"
              >
                + Activate Template
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* 9. TAB 6: AUDIT & LOGS */}
      {activeTab === 'logs' && (
        <Card className="p-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 text-gray-600 text-xs">
                <TableHead className="pl-4">Execution Time</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Matched Rule</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Result Reason</TableHead>
                <TableHead className="text-right pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-400 text-xs">
                    No recent execution logs. Raw biometric events are evaluated on arrival.
                  </TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 20).map((log) => (
                  <TableRow key={log.id} className="text-xs hover:bg-gray-50/80 font-mono">
                    <TableCell className="pl-4 text-gray-500 font-mono text-[11px]">
                      {new Date(log.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-bold text-gray-900 font-sans">
                      {log.employee_name}
                      <span className="text-[10px] text-gray-500 font-mono block">{log.employee_code}</span>
                    </TableCell>
                    <TableCell className="font-sans font-semibold text-gray-800">{log.rule_name}</TableCell>
                    <TableCell><Badge variant="emerald" size="sm">P{log.priority_rank}</Badge></TableCell>
                    <TableCell className="font-bold text-emerald-800">{log.classification}</TableCell>
                    <TableCell className="font-sans text-gray-600 max-w-sm truncate">{log.reason}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="emerald" size="sm">✓ {log.execution_status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 10. VISUAL RULE BUILDER MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-base">CREATE ATTENDANCE RULE</h3>
                <p className="text-xs text-gray-500">Visual Rule Builder & Step-by-Step Wizard</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => setIsBuilderOpen(false)} className="rounded-full w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g., General Day Shift 10-Minute Grace Rule"
                  value={formRuleName}
                  onChange={(e) => setFormRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#07563D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="CHECK_IN_OUT">Check-In / Check-Out</option>
                    <option value="GRACE_LATE">Grace & Late Policy</option>
                    <option value="OVERTIME">Overtime Policy</option>
                    <option value="BREAKS">Break Detection</option>
                    <option value="DUPLICATES">Duplicate Suppression</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Scope</label>
                  <select
                    value={formScopeType}
                    onChange={(e) => setFormScopeType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="ORGANIZATION">Entire Organization (486 Staff)</option>
                    <option value="DEPARTMENT">Department Scoped</option>
                    <option value="SHIFT">Shift Scoped</option>
                  </select>
                </div>
              </div>

              {formCategory === 'GRACE_LATE' || formCategory === 'CHECK_IN_OUT' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      value={formGraceMinutes}
                      onChange={(e) => setFormGraceMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Anti-Bounce Duplicate Gap (Mins)</label>
                    <input
                      type="number"
                      value={formMinGap}
                      onChange={(e) => setFormMinGap(parseInt(e.target.value, 10) || 5)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              ) : formCategory === 'OVERTIME' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">OT Threshold (Minutes after shift)</label>
                    <input
                      type="number"
                      value={formOtThreshold}
                      onChange={(e) => setFormOtThreshold(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">OT Rounding Step</label>
                    <select
                      value={formOtRounding}
                      onChange={(e) => setFormOtRounding(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                    >
                      <option value="EXACT">Exact Minutes</option>
                      <option value="15_MIN">15 Minutes</option>
                      <option value="30_MIN">30 Minutes</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {/* LIVE HUMAN-READABLE SUMMARY */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Human-Readable Rule Summary</span>
                <p className="text-xs text-emerald-950 font-semibold">{liveSummarySentence}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={() => setIsBuilderOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveRule} className="bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl font-bold">
                  Activate Rule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 11. ADD EMPLOYEE EXCEPTION MODAL */}
      {isExceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-900 text-base">Add Employee Exception (Level 1 Priority)</h3>
                <p className="text-xs text-gray-500">Overrides normal department/shift attendance rules</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => setIsExceptionModalOpen(false)} className="rounded-full w-8 h-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveException} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Employee</label>
                <select
                  value={exEmpId}
                  onChange={(e) => setExEmpId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.display_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code} ({emp.employee_code || emp.id} • {emp.department_name || emp.department || 'Operations'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Override Type</label>
                <select
                  value={exType}
                  onChange={(e) => setExType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                >
                  <option value="GRACE_OVERRIDE">Grace Window Override (e.g. 20m grace)</option>
                  <option value="OT_THRESHOLD_OVERRIDE">Overtime Threshold Override (e.g. 15m OT)</option>
                  <option value="SHIFT_OVERRIDE">Shift Timing Override (08:00 - 17:30)</option>
                </select>
              </div>

              {exType === 'GRACE_OVERRIDE' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={exGraceMinutes}
                    onChange={(e) => setExGraceMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    value={exFrom}
                    onChange={(e) => setExFrom(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Effective To</label>
                  <input
                    type="date"
                    value={exTo}
                    onChange={(e) => setExTo(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Exception</label>
                <input
                  type="text"
                  placeholder="e.g., Temporary project transport schedule override"
                  value={exReason}
                  onChange={(e) => setExReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setIsExceptionModalOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl font-bold">
                  Save Exception
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
