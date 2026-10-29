import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Clock,
  Coffee,
  AlertCircle,
  Calendar,
  Layers,
  History,
  Building,
  Check,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Copy,
  Archive,
  Trash2,
  Play,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  X,
  UserCheck,
  Lock,
  FileText,
  DollarSign,
  Zap,
  Users,
  Factory,
  RefreshCw,
  Briefcase,
  MapPin,
  Sparkles,
  PauseCircle,
  Eye,
  HelpCircle,
  ChevronRight,
  Shield,
  Send,
} from 'lucide-react';
import {
  attendanceRosterService,
} from '../../../services/attendance/attendanceRosterService';
import { AttendancePolicy, PolicyImpactAnalysis, PolicyStatus } from '../../../types/shiftRoster';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export const AttendancePolicyConfigView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'SCHEDULED' | 'SUSPENDED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [templateFilter, setTemplateFilter] = useState<string>('ALL');
  const [selectedPolicy, setSelectedPolicy] = useState<AttendancePolicy | null>(null);

  // Quick Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Stepper Create/Edit Modal State (11 Steps)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // 11-Step Form Fields
  // Step 1: Basics & Template
  const [pCode, setPCode] = useState('ATT-CORP-002');
  const [pName, setPName] = useState('Operations & Manufacturing Policy');
  const [pType, setPType] = useState<AttendancePolicy['policy_type']>('FACTORY_PLANT');
  const [pTemplate, setPTemplate] = useState<'CORPORATE' | 'MANUFACTURING' | 'ROTATING' | 'BRANCH_RETAIL'>('MANUFACTURING');
  const [pDesc, setPDesc] = useState('Production and manufacturing attendance rules with 10m grace, punch break deduction, and overtime multipliers.');
  const [pEffectiveFrom, setPEffectiveFrom] = useState('2026-11-01');

  // Step 2: Scope
  const [pScopeType, setPScopeType] = useState<'ORGANIZATION' | 'DEPARTMENTS' | 'LOCATIONS' | 'EMPLOYEE_GROUPS' | 'INDIVIDUALS'>('DEPARTMENTS');
  const [pScopeIds, setPScopeIds] = useState<string[]>(['Production', 'Assembly', 'Quality Control']);

  // Step 3: Work Calendar
  const [calWorkingDays, setCalWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [calWeeklyOff, setCalWeeklyOff] = useState<number[]>([0]);
  const [calAltSaturdays, setCalAltSaturdays] = useState(false);
  const [calHolidays, setCalHolidays] = useState(true);

  // Step 4: Shift Resolution & Precedence
  const [shiftResolutionMode, setShiftResolutionMode] = useState<'FIXED' | 'ROSTER' | 'ADAPTIVE' | 'FLEXIBLE'>('ROSTER');
  const [shiftAllowAdaptive, setShiftAllowAdaptive] = useState(true);
  const [shiftEmergencyOverride, setShiftEmergencyOverride] = useState(true);
  const [shiftConfidenceThreshold, setShiftConfidenceThreshold] = useState(0.85);

  // Step 5: Biometric Punch Rules & Grace
  const [pGraceIn, setPGraceIn] = useState(10);
  const [pLateThreshold, setPLateThreshold] = useState(25);
  const [pGraceOut, setPGraceOut] = useState(10);
  const [pDedupWindow, setPDedupWindow] = useState(5);
  const [pMissingPunchPenalty, setPMissingPunchPenalty] = useState<'REGULARIZATION_REQUIRED' | 'MARK_HALF_DAY' | 'MARK_ABSENT'>('REGULARIZATION_REQUIRED');

  // Step 6: Breaks & Working Duration
  const [fullDayHours, setFullDayHours] = useState(8);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [breakMode, setBreakMode] = useState<'FIXED' | 'PUNCH_BASED' | 'FLEXIBLE'>('PUNCH_BASED');
  const [breakDurationMins, setBreakDurationMins] = useState(45);
  const [breakAutoDeduct, setBreakAutoDeduct] = useState(true);
  const [nightShiftCutoff, setNightShiftCutoff] = useState(6);

  // Step 7: Permission Governance
  const [permEnabled, setPermEnabled] = useState(true);
  const [permMonthlyAllowance, setPermMonthlyAllowance] = useState(120);
  const [permThresholdPolicy, setPermThresholdPolicy] = useState<'POLICY_A_THRESHOLD_CROSSING_DAY' | 'POLICY_B_EXCESS_PERMISSION_DAY' | 'POLICY_C_HR_REVIEW'>('POLICY_A_THRESHOLD_CROSSING_DAY');
  const [permExcessHandling, setPermExcessHandling] = useState<'MARK_EVERY_EXCESS_HALF_DAY' | 'LOG_EXCESS_ONLY' | 'DEDUCT_PAYROLL_HOURS'>('MARK_EVERY_EXCESS_HALF_DAY');
  const [permAutoConsumeLate, setPermAutoConsumeLate] = useState(true);

  // Step 8: Overtime Rules & Approvals
  const [otEnabled, setOtEnabled] = useState(true);
  const [otMinThresholdMins, setOtMinThresholdMins] = useState(30);
  const [otWeekdayRate, setOtWeekdayRate] = useState(1.5);
  const [otWeeklyOffRate, setOtWeeklyOffRate] = useState(2.0);
  const [otHolidayRate, setOtHolidayRate] = useState(2.0);
  const [otMaxDailyMins, setOtMaxDailyMins] = useState(240);
  const [otRequiresApproval, setOtRequiresApproval] = useState(true);

  // Step 9: Exceptions & Regularization
  const [pRegDays, setPRegDays] = useState(3);
  const [pMaxBackdatedDays, setPMaxBackdatedDays] = useState(30);
  const [pApproverRole, setPApproverRole] = useState('Plant Manager');
  const [pEscalationHours, setPEscalationHours] = useState(12);

  // Step 10: Payroll & Notifications
  const [payrollEnabled, setPayrollEnabled] = useState(true);
  const [payrollFreezeDays, setPayrollFreezeDays] = useState(3);
  const [payrollLopRate, setPayrollLopRate] = useState(1.0);
  const [notifyEmployeeThreshold, setNotifyEmployeeThreshold] = useState(true);
  const [notifyManagerEscalation, setNotifyManagerEscalation] = useState(true);

  // Enablement Toggles for 10 Config Sections
  const [sectionSwitches, setSectionSwitches] = useState({
    work_calendar: true,
    shift_rules: true,
    biometric_punch: true,
    grace_late: true,
    breaks_hours: true,
    permissions: true,
    half_day_absence: true,
    overtime: true,
    exceptions_reg: true,
    payroll_notifications: true,
  });

  const toggleSectionSwitch = (key: keyof typeof sectionSwitches) => {
    setSectionSwitches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Version Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newEffectiveDate, setNewEffectiveDate] = useState('2026-11-01');
  const [changeReason, setChangeReason] = useState('Quarterly policy threshold revision');
  const [impactAnalysis, setImpactAnalysis] = useState<PolicyImpactAnalysis | null>(null);

  // Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPolicy, setSimPolicy] = useState<AttendancePolicy | null>(null);
  const [simEmployeeId, setSimEmployeeId] = useState('EMP-MARI-001');
  const [simEmployeeName, setSimEmployeeName] = useState('Dr. Marimuthu (HR Head)');
  const [simDate, setSimDate] = useState('2026-10-29');
  const [simSchedIn, setSimSchedIn] = useState('09:00');
  const [simSchedOut, setSimSchedOut] = useState('18:00');
  const [simActIn, setSimActIn] = useState('09:24');
  const [simActOut, setSimActOut] = useState('17:42');
  const [simApprovedPerm, setSimApprovedPerm] = useState(0);
  const [simPriorConsumed, setSimPriorConsumed] = useState(45);
  const [simIsWeeklyOff, setSimIsWeeklyOff] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simBatchResult, setSimBatchResult] = useState<any>(null);
  const [isSimulatingBatch, setIsSimulatingBatch] = useState(false);

  const loadPolicies = () => {
    try {
      const list = attendanceRosterService.getPolicies();
      setPolicies(list || []);
      if (list && list.length > 0 && !selectedPolicy) {
        setSelectedPolicy(list[0]);
      }
    } catch (err) {
      console.warn('[AttendancePolicyConfigView] error loading policies:', err);
    }
  };

  useEffect(() => {
    loadPolicies();
    const unsub = hrEventBus.subscribe('attendance.policy_updated', () => loadPolicies());
    const unsub2 = hrEventBus.subscribe('policy.created', () => loadPolicies());
    const unsub3 = hrEventBus.subscribe('policy.version_published', () => loadPolicies());
    return () => {
      unsub();
      unsub2();
      unsub3();
    };
  }, []);

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      if (activeTab === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (activeTab === 'DRAFT' && p.status !== 'DRAFT') return false;
      if (activeTab === 'SCHEDULED' && p.status !== 'SCHEDULED') return false;
      if (activeTab === 'SUSPENDED' && p.status !== 'SUSPENDED') return false;
      if (activeTab === 'ARCHIVED' && (p.status !== 'ARCHIVED' && p.status !== 'EXPIRED')) return false;

      if (scopeFilter !== 'ALL' && p.applies_to?.type !== scopeFilter) return false;
      if (templateFilter !== 'ALL' && (p.industry_template || 'CORPORATE') !== templateFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.policy_name.toLowerCase().includes(q) ||
          p.policy_code.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [policies, activeTab, scopeFilter, templateFilter, searchQuery]);

  // Aggregate Metrics
  const activeCount = policies.filter(p => p.status === 'ACTIVE').length;
  const draftCount = policies.filter(p => p.status === 'DRAFT').length;
  const scheduledCount = policies.filter(p => p.status === 'SCHEDULED').length;
  const suspendedCount = policies.filter(p => p.status === 'SUSPENDED').length;
  const totalCoveredEmployees = policies
    .filter(p => p.status === 'ACTIVE')
    .reduce((sum, p) => sum + (p.covered_employees_count || 0), 0);

  // Template Quick Populate
  const applyTemplateDefaults = (templateKey: 'CORPORATE' | 'MANUFACTURING' | 'ROTATING' | 'BRANCH_RETAIL') => {
    setPTemplate(templateKey);
    if (templateKey === 'CORPORATE') {
      setPCode('ATT-CORP-001');
      setPName('Corporate Standard Attendance Policy');
      setPType('GENERAL');
      setPDesc('Standard corporate headquarters policy with 15m grace, 120m monthly permission quota, and 30m overtime threshold.');
      setPScopeType('ORGANIZATION');
      setPScopeIds([]);
      setCalWorkingDays([1, 2, 3, 4, 5]);
      setCalWeeklyOff([0, 6]);
      setCalAltSaturdays(false);
      setShiftResolutionMode('FIXED');
      setShiftAllowAdaptive(false);
      setPGraceIn(15);
      setPLateThreshold(30);
      setPGraceOut(15);
      setBreakMode('FIXED');
      setBreakDurationMins(60);
      setPermEnabled(true);
      setPermMonthlyAllowance(120);
      setPermThresholdPolicy('POLICY_A_THRESHOLD_CROSSING_DAY');
      setPermExcessHandling('MARK_EVERY_EXCESS_HALF_DAY');
      setOtEnabled(true);
      setOtWeekdayRate(1.5);
      setOtWeeklyOffRate(2.0);
      setPApproverRole('Reporting Manager');
      setPEscalationHours(24);
    } else if (templateKey === 'MANUFACTURING') {
      setPCode('ATT-FACTORY-001');
      setPName('Plant & Manufacturing Shift Attendance Policy');
      setPType('FACTORY_PLANT');
      setPDesc('Manufacturing line attendance policy with punch-based breaks, shift handover tolerances, and 1.5x overtime multiplier.');
      setPScopeType('DEPARTMENTS');
      setPScopeIds(['Production', 'Assembly', 'Quality Control', 'Tooling']);
      setCalWorkingDays([1, 2, 3, 4, 5, 6]);
      setCalWeeklyOff([0]);
      setCalAltSaturdays(false);
      setShiftResolutionMode('ROSTER');
      setShiftAllowAdaptive(true);
      setPGraceIn(10);
      setPLateThreshold(20);
      setPGraceOut(10);
      setBreakMode('PUNCH_BASED');
      setBreakDurationMins(45);
      setPermEnabled(true);
      setPermMonthlyAllowance(60);
      setPermThresholdPolicy('POLICY_A_THRESHOLD_CROSSING_DAY');
      setPermExcessHandling('MARK_EVERY_EXCESS_HALF_DAY');
      setOtEnabled(true);
      setOtWeekdayRate(1.5);
      setOtWeeklyOffRate(2.0);
      setPApproverRole('Plant Manager');
      setPEscalationHours(12);
    } else if (templateKey === 'ROTATING') {
      setPCode('ATT-ROTA-001');
      setPName('Rotating Workforce 24/7 Operations Policy');
      setPType('GENERAL');
      setPDesc('Continuous 24/7 industrial operations policy with adaptive shift inference and overnight attendance reconciliation.');
      setPScopeType('EMPLOYEE_GROUPS');
      setPScopeIds(['Shift Line A', 'Shift Line B', 'Night Patrol']);
      setCalWorkingDays([1, 2, 3, 4, 5, 6, 0]);
      setCalWeeklyOff([]);
      setCalAltSaturdays(false);
      setShiftResolutionMode('ADAPTIVE');
      setShiftAllowAdaptive(true);
      setPGraceIn(10);
      setPLateThreshold(15);
      setPGraceOut(10);
      setBreakMode('FIXED');
      setBreakDurationMins(30);
      setPermEnabled(false);
      setOtEnabled(true);
      setOtWeekdayRate(2.0);
      setOtWeeklyOffRate(2.0);
      setPApproverRole('Shift Supervisor');
      setPEscalationHours(8);
    } else if (templateKey === 'BRANCH_RETAIL') {
      setPCode('ATT-RETAIL-001');
      setPName('Multi-Branch Retail & Field Operations Policy');
      setPType('GENERAL');
      setPDesc('Store and retail branch policy with GPS biometric boundary validation and staggered shift schedules.');
      setPScopeType('LOCATIONS');
      setPScopeIds(['Coimbatore Showroom', 'Tirupur Branch', 'Salem Store']);
      setCalWorkingDays([1, 2, 3, 4, 5, 6]);
      setCalWeeklyOff([2]); // Tuesday off
      setCalAltSaturdays(false);
      setShiftResolutionMode('FLEXIBLE');
      setShiftAllowAdaptive(true);
      setPGraceIn(20);
      setPLateThreshold(40);
      setPGraceOut(15);
      setBreakMode('FIXED');
      setBreakDurationMins(60);
      setPermEnabled(true);
      setPermMonthlyAllowance(120);
      setPermThresholdPolicy('POLICY_B_EXCESS_PERMISSION_DAY');
      setPermExcessHandling('LOG_EXCESS_ONLY');
      setOtEnabled(false);
      setPApproverRole('Store Manager');
      setPEscalationHours(24);
    }
  };

  const handleOpenCreateWizard = (templateKey: 'CORPORATE' | 'MANUFACTURING' | 'ROTATING' | 'BRANCH_RETAIL' = 'CORPORATE') => {
    setIsEditingExisting(false);
    setEditingPolicyId(null);
    applyTemplateDefaults(templateKey);
    setPEffectiveFrom(new Date().toISOString().split('T')[0]);
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleOpenEditWizard = (pol: AttendancePolicy) => {
    setIsEditingExisting(true);
    setEditingPolicyId(pol.id);
    setPCode(pol.policy_code);
    setPName(pol.policy_name);
    setPType(pol.policy_type);
    setPTemplate((pol.industry_template as any) || 'CORPORATE');
    setPDesc(pol.description || '');
    setPEffectiveFrom(pol.effective_from);
    setPScopeType(pol.applies_to?.type || 'ORGANIZATION');
    setPScopeIds(pol.applies_to?.ids || []);

    if (pol.work_calendar) {
      setCalWorkingDays(pol.work_calendar.working_days || [1, 2, 3, 4, 5]);
      setCalWeeklyOff(pol.work_calendar.weekly_off || [0]);
      setCalAltSaturdays(pol.work_calendar.alternate_saturdays || false);
      setCalHolidays(pol.work_calendar.holidays_enabled !== false);
    }
    if (pol.shift_resolution) {
      setShiftResolutionMode(pol.shift_resolution.mode || 'FIXED');
      setShiftAllowAdaptive(pol.shift_resolution.allow_adaptive_inference !== false);
      setShiftEmergencyOverride(pol.shift_resolution.emergency_override_precedence !== false);
      setShiftConfidenceThreshold(pol.shift_resolution.confidence_threshold || 0.85);
    }

    setPGraceIn(pol.check_in_rules?.grace_minutes ?? 15);
    setPLateThreshold(pol.check_in_rules?.late_threshold_minutes ?? 30);
    setPGraceOut(pol.check_out_rules?.early_checkout_grace_minutes ?? 10);
    setPDedupWindow(pol.biometric_rules?.deduplication_window_minutes ?? 5);
    setPMissingPunchPenalty((pol.missing_punch_rules?.default_penalty as any) || 'REGULARIZATION_REQUIRED');

    setFullDayHours(pol.general_rules?.full_day_hours ?? 8);
    setHalfDayHours(pol.general_rules?.half_day_hours ?? 4);
    setBreakMode((pol.break_rules?.mode as any) || 'FIXED');
    setBreakDurationMins(pol.break_rules?.default_break_minutes ?? 60);
    setBreakAutoDeduct(pol.break_rules?.auto_deduct !== false);
    setNightShiftCutoff(pol.night_shift_rules?.cutoff_hour ?? 6);

    if (pol.permission_governance) {
      setPermEnabled(pol.permission_governance.enabled !== false);
      setPermMonthlyAllowance(pol.permission_governance.monthly_allowance_minutes ?? 120);
      setPermThresholdPolicy(pol.permission_governance.threshold_policy || 'POLICY_A_THRESHOLD_CROSSING_DAY');
      setPermExcessHandling(pol.permission_governance.excess_handling || 'MARK_EVERY_EXCESS_HALF_DAY');
      setPermAutoConsumeLate(pol.permission_governance.auto_consume_late_arrivals !== false);
    }

    if (pol.overtime_rules) {
      setOtEnabled(pol.overtime_rules.enabled !== false);
      setOtMinThresholdMins(pol.overtime_rules.min_threshold_minutes ?? 30);
      setOtWeekdayRate(pol.overtime_rules.weekday_rate ?? 1.5);
      setOtWeeklyOffRate(pol.overtime_rules.weekly_off_rate ?? 2.0);
      setOtHolidayRate(pol.overtime_rules.holiday_rate ?? 2.0);
      setOtMaxDailyMins(pol.overtime_rules.max_daily_minutes ?? 240);
      setOtRequiresApproval(pol.overtime_rules.requires_approval !== false);
    }

    setPRegDays(pol.regularization_rules?.allowed_within_days ?? 3);
    setPMaxBackdatedDays(pol.regularization_rules?.max_backdated_days ?? 30);
    setPApproverRole(pol.regularization_rules?.approver_role || 'Reporting Manager');
    setPEscalationHours(pol.approval_workflow?.levels?.[0]?.sla_hours || 24);

    if (pol.payroll_integration) {
      setPayrollEnabled(pol.payroll_integration.enabled !== false);
      setPayrollFreezeDays(pol.payroll_integration.auto_freeze_days ?? 3);
      setPayrollLopRate(pol.payroll_integration.lop_conversion_rate ?? 1.0);
    }

    if (pol.section_enablement) {
      setSectionSwitches({
        work_calendar: pol.section_enablement.work_calendar !== false,
        shift_rules: pol.section_enablement.shift_rules !== false,
        biometric_punch: pol.section_enablement.biometric_punch !== false,
        grace_late: pol.section_enablement.grace_late !== false,
        breaks_hours: pol.section_enablement.breaks_hours !== false,
        permissions: pol.section_enablement.permissions !== false,
        half_day_absence: pol.section_enablement.half_day_absence !== false,
        overtime: pol.section_enablement.overtime !== false,
        exceptions_reg: pol.section_enablement.exceptions_reg !== false,
        payroll_notifications: pol.section_enablement.payroll_notifications !== false,
      });
    }

    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleSaveWizardPolicy = (targetStatus: PolicyStatus) => {
    // Validation
    if (halfDayHours >= fullDayHours) {
      showToast('Validation Error: Half-day hours must be strictly less than full-day scheduled hours.', 'error');
      return;
    }
    if (pLateThreshold < pGraceIn) {
      showToast('Validation Error: Late escalation threshold cannot be less than check-in grace period.', 'error');
      return;
    }

    const policyPayload: Omit<AttendancePolicy, 'id' | 'version' | 'created_at' | 'updated_at'> = {
      tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
      policy_code: pCode,
      policy_name: pName,
      policy_type: pType,
      industry_template: pTemplate,
      covered_employees_count: isEditingExisting ? (policies.find(p => p.id === editingPolicyId)?.covered_employees_count || 12) : 10,
      description: pDesc,
      status: targetStatus,
      effective_from: pEffectiveFrom,
      applies_to: {
        type: pScopeType,
        ids: pScopeIds,
      },
      work_calendar: {
        working_days: calWorkingDays,
        weekly_off: calWeeklyOff,
        alternate_saturdays: calAltSaturdays,
        holidays_enabled: calHolidays,
      },
      shift_resolution: {
        mode: shiftResolutionMode,
        allow_adaptive_inference: shiftAllowAdaptive,
        emergency_override_precedence: shiftEmergencyOverride,
        confidence_threshold: shiftConfidenceThreshold,
      },
      biometric_rules: {
        device_ids: ['BIO-01-MAIN', 'BIO-02-GATE', 'BIO-03-PLANT'],
        deduplication_window_minutes: pDedupWindow,
        missing_checkout_action: pMissingPunchPenalty,
      },
      general_rules: {
        full_day_hours: fullDayHours,
        half_day_hours: halfDayHours,
        absent_threshold_hours: halfDayHours,
      },
      check_in_rules: {
        grace_minutes: pGraceIn,
        late_threshold_minutes: pLateThreshold,
        action_after_grace: 'LATE',
        early_check_in_allowed_minutes: 60,
      },
      check_out_rules: {
        early_checkout_grace_minutes: pGraceOut,
        action_before_allowed: 'EARLY_OUT',
      },
      break_rules: {
        mode: breakMode,
        default_break_minutes: breakDurationMins,
        auto_deduct: breakAutoDeduct,
      },
      permission_governance: {
        enabled: permEnabled,
        monthly_allowance_minutes: permMonthlyAllowance,
        threshold_policy: permThresholdPolicy,
        excess_handling: permExcessHandling,
        auto_consume_late_arrivals: permAutoConsumeLate,
      },
      overtime_rules: {
        enabled: otEnabled,
        min_threshold_minutes: otMinThresholdMins,
        weekday_rate: otWeekdayRate,
        weekly_off_rate: otWeeklyOffRate,
        holiday_rate: otHolidayRate,
        max_daily_minutes: otMaxDailyMins,
        requires_approval: otRequiresApproval,
      },
      late_deduction_rules: {
        late_count_trigger: 3,
        deduction_amount_days: 0.5,
        reset_period: 'MONTHLY',
      },
      missing_punch_rules: {
        auto_exception: true,
        default_penalty: pMissingPunchPenalty,
      },
      regularization_rules: {
        allowed_within_days: pRegDays,
        max_backdated_days: pMaxBackdatedDays,
        requires_reason: true,
        requires_attachment: false,
        approver_role: pApproverRole,
      },
      approval_workflow: {
        levels: [
          { stage: 'Stage 1: Direct Approval', role: pApproverRole, sla_hours: pEscalationHours },
          { stage: 'Stage 2: HR Signoff', role: 'HR Administrator', sla_hours: pEscalationHours * 2 },
        ],
        auto_escalate: true,
        reminder_hours: 12,
      },
      night_shift_rules: {
        cutoff_hour: nightShiftCutoff,
      },
      section_enablement: sectionSwitches,
      payroll_integration: {
        enabled: payrollEnabled,
        auto_freeze_days: payrollFreezeDays,
        lop_conversion_rate: payrollLopRate,
        payable_on_regularization: true,
      },
    };

    if (isEditingExisting && editingPolicyId) {
      const existing = policies.find(p => p.id === editingPolicyId);
      if (existing) {
        Object.assign(existing, policyPayload, {
          updated_at: new Date().toISOString(),
          status: targetStatus,
        });
        showToast(`✓ Policy ${existing.policy_code} updated successfully (${targetStatus})!`);
      }
    } else {
      const saved = attendanceRosterService.createPolicy(policyPayload, user?.name || 'HR Administrator');
      showToast(`✓ Attendance Policy ${saved.policy_code} created successfully as ${saved.status}!`);
    }

    setIsWizardOpen(false);
    loadPolicies();
  };

  const handleDuplicate = (pol: AttendancePolicy) => {
    const cloned = attendanceRosterService.duplicatePolicy(
      pol.id,
      `${pol.policy_code}-COPY`,
      `${pol.policy_name} (Cloned Draft)`,
      user?.name || 'HR Administrator'
    );
    showToast(`✓ Cloned ${pol.policy_code} into new Draft policy ${cloned.policy_code}`);
    loadPolicies();
  };

  const handleActivate = (pol: AttendancePolicy) => {
    attendanceRosterService.activatePolicy(pol.id, user?.name || 'HR Administrator');
    showToast(`✓ Policy ${pol.policy_code} is now ACTIVE and effective for attendance evaluations.`);
    loadPolicies();
  };

  const handleSuspend = (pol: AttendancePolicy) => {
    attendanceRosterService.suspendPolicy(pol.id, user?.name || 'HR Administrator');
    showToast(`✓ Policy ${pol.policy_code} has been SUSPENDED. Attendance will fall back to baseline.`);
    loadPolicies();
  };

  const handleArchive = (pol: AttendancePolicy) => {
    attendanceRosterService.archivePolicy(pol.id, user?.name || 'HR Administrator');
    showToast(`✓ Policy ${pol.policy_code} archived.`);
    loadPolicies();
  };

  const handleDelete = (pol: AttendancePolicy) => {
    try {
      attendanceRosterService.deletePolicy(pol.id, user?.name || 'HR Administrator');
      showToast(`✓ Draft policy ${pol.policy_code} deleted.`);
      loadPolicies();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete policy', 'error');
    }
  };

  // Rule Simulator Handler
  const handleOpenSimulator = (pol: AttendancePolicy) => {
    setSimPolicy(pol);
    setSimResult(null);
    setSimBatchResult(null);
    setIsSimulatorOpen(true);
    const res = attendanceRosterService.simulatePolicyCalculation(pol, {
      scheduled_in: simSchedIn,
      scheduled_out: simSchedOut,
      actual_in: simActIn,
      actual_out: simActOut,
      employee_id: simEmployeeId,
      employee_name: simEmployeeName,
      date: simDate,
      approved_permission_minutes: simApprovedPerm,
      prior_monthly_consumed_minutes: simPriorConsumed,
      is_weekly_off_or_holiday: simIsWeeklyOff,
    });
    setSimResult(res);
  };

  const handleRunSimulation = () => {
    if (!simPolicy) return;
    const res = attendanceRosterService.simulatePolicyCalculation(simPolicy, {
      scheduled_in: simSchedIn,
      scheduled_out: simSchedOut,
      actual_in: simActIn,
      actual_out: simActOut,
      employee_id: simEmployeeId,
      employee_name: simEmployeeName,
      date: simDate,
      approved_permission_minutes: simApprovedPerm,
      prior_monthly_consumed_minutes: simPriorConsumed,
      is_weekly_off_or_holiday: simIsWeeklyOff,
    });
    setSimResult(res);
  };

  const handleRunBatchSimulation = () => {
    if (!simPolicy) return;
    setIsSimulatingBatch(true);
    setTimeout(() => {
      const batchRes = attendanceRosterService.simulateWorkforceBatch(simPolicy, 21);
      setSimBatchResult(batchRes);
      setIsSimulatingBatch(false);
      showToast(`✓ Completed pre-flight batch simulation for ${batchRes.total_evaluated} employees.`);
    }, 400);
  };

  const handleOpenPublishNewVersion = (pol: AttendancePolicy) => {
    setSelectedPolicy(pol);
    const impact = attendanceRosterService.calculatePolicyImpact(pol.id, {});
    setImpactAnalysis(impact);
    setNewEffectiveDate('2026-11-01');
    setIsPublishModalOpen(true);
  };

  const handleConfirmPublishNewVersion = () => {
    if (!selectedPolicy) return;
    const published = attendanceRosterService.createNewPolicyVersion(
      selectedPolicy.id,
      {
        ...selectedPolicy,
        effective_from: newEffectiveDate,
        status: 'ACTIVE',
      },
      user?.name || 'HR Administrator',
      changeReason
    );
    showToast(`✓ Published Version ${published.version} of ${published.policy_code} effective from ${published.effective_from}.`);
    setIsPublishModalOpen(false);
    loadPolicies();
  };

  return (
    <div className="space-y-5">
      {/* 1. ENTERPRISE COMMAND HEADER & TELEMETRY */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-[#07563D]/10 text-[#07563D]">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Policies</h1>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/70 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Deterministic Rule Engine
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Multi-branch, plant &amp; rotating attendance governance — biometric punch pairing, 120m permission quota, overtime &amp; auditable payroll consequences.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateModalOpen(true)}
              className="text-xs font-semibold text-gray-700 border-gray-200 bg-gray-50 hover:bg-gray-100"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Industry Templates
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const active = policies.find(p => p.status === 'ACTIVE') || policies[0];
                if (active) handleOpenSimulator(active);
              }}
              className="text-xs font-bold text-gray-700 border-[#07563D]/30 text-[#07563D] hover:bg-emerald-50/70"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Rule Simulator
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateWizard('CORPORATE')}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Attendance Policy
            </Button>
          </div>
        </div>

        {/* 5 Operational KPI Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active Policies
            </div>
            <div className="text-xl font-bold text-emerald-950 mt-1 font-mono">{activeCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Live in production rule engine</div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
            <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Draft &amp; Scheduled
            </div>
            <div className="text-xl font-bold text-amber-950 mt-1 font-mono">{draftCount + scheduledCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">{scheduledCount} scheduled for next cycle</div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100">
            <div className="text-[11px] font-semibold text-blue-800 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Workforce Covered
            </div>
            <div className="text-xl font-bold text-blue-950 mt-1 font-mono">{totalCoveredEmployees}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Assigned to active policies</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Unassigned / Baseline
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">4</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Fallback to General Org rules</div>
          </div>

          <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-100">
            <div className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Awaiting Review
            </div>
            <div className="text-xl font-bold text-rose-950 mt-1 font-mono">7</div>
            <div className="text-[10px] text-rose-700 mt-0.5">Exceptions in manager queue</div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs text-xs">
        {/* Status Lifecycle Pills */}
        <div className="flex items-center gap-1.5 font-bold flex-wrap">
          <button
            onClick={() => setActiveTab('ALL')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'ALL' ? "bg-gray-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            All Policies ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'ACTIVE' ? "bg-emerald-700 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100")}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'DRAFT' ? "bg-amber-700 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100")}
          >
            Drafts ({draftCount})
          </button>
          <button
            onClick={() => setActiveTab('SCHEDULED')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'SCHEDULED' ? "bg-blue-700 text-white shadow-xs" : "bg-blue-50 text-blue-800 hover:bg-blue-100")}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            onClick={() => setActiveTab('SUSPENDED')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'SUSPENDED' ? "bg-rose-700 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100")}
          >
            Suspended ({suspendedCount})
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'ARCHIVED' ? "bg-gray-700 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            Archived
          </button>
        </div>

        {/* Filters and Search Box */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Scopes</option>
            <option value="ORGANIZATION">Organization Wide</option>
            <option value="DEPARTMENTS">Departments</option>
            <option value="LOCATIONS">Branches / Locations</option>
            <option value="EMPLOYEE_GROUPS">Employee Groups</option>
          </select>

          <select
            value={templateFilter}
            onChange={e => setTemplateFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Templates</option>
            <option value="CORPORATE">Corporate Office</option>
            <option value="MANUFACTURING">Plant &amp; Manufacturing</option>
            <option value="ROTATING">Rotating 24/7</option>
            <option value="BRANCH_RETAIL">Branch Retail</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search policy name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* 3. MASTER POLICY TABLE */}
      <Card className="p-5 bg-white rounded-3xl border border-gray-200/90 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3.5">Policy Code &amp; Name</th>
                <th className="p-3.5">Scope &amp; Workforce</th>
                <th className="p-3.5">Version</th>
                <th className="p-3.5">Effective Date</th>
                <th className="p-3.5">Core Attendance Rules</th>
                <th className="p-3.5">Approval SLA</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-800 text-sm">No matching attendance policies found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or click "Create Attendance Policy" to configure a new policy.</p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map(pol => {
                  const templateLabel =
                    pol.industry_template === 'MANUFACTURING' ? 'Manufacturing' :
                    pol.industry_template === 'ROTATING' ? 'Rotating 24/7' :
                    pol.industry_template === 'BRANCH_RETAIL' ? 'Branch Retail' : 'Corporate';

                  return (
                    <tr key={pol.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{pol.policy_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            {templateLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{pol.policy_code}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{pol.description || 'Enterprise attendance rules'}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-gray-800">
                          {pol.applies_to?.type || 'ORGANIZATION'}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium">
                          {pol.covered_employees_count || 12} employees covered
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-[#07563D] whitespace-nowrap">
                        v{pol.version}
                      </td>

                      <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">
                        {pol.effective_from}
                      </td>

                      <td className="p-3.5 text-gray-700">
                        <div className="font-semibold text-gray-900">
                          {(pol.check_in_rules?.grace_minutes ?? 15)}m Grace IN • {(pol.check_out_rules?.early_checkout_grace_minutes ?? 10)}m Grace OUT
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>Quota: {pol.permission_governance?.monthly_allowance_minutes ?? 120}m/mo</span>
                          <span>•</span>
                          <span>OT: {pol.overtime_rules?.weekday_rate ?? 1.5}x</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-600 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{pol.approval_workflow?.levels?.[0]?.role || 'Reporting Manager'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{pol.approval_workflow?.levels?.[0]?.sla_hours || 24}h SLA Escalation</div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {pol.status === 'ACTIVE' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                            Active
                          </span>
                        )}
                        {pol.status === 'DRAFT' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                            Draft
                          </span>
                        )}
                        {pol.status === 'SCHEDULED' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                            Scheduled
                          </span>
                        )}
                        {pol.status === 'SUSPENDED' && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                            Suspended
                          </span>
                        )}
                        {(pol.status === 'ARCHIVED' || pol.status === 'EXPIRED') && (
                          <span className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                            Archived
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenSimulator(pol)}
                            className="text-[#07563D] hover:bg-emerald-50 border-emerald-200 font-bold"
                            title="Run non-mutating deterministic simulation"
                          >
                            <Play className="w-3 h-3 mr-1 fill-current" /> Simulate
                          </Button>

                          {pol.status === 'ACTIVE' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleOpenPublishNewVersion(pol)}
                              className="text-purple-700 hover:bg-purple-50 border-purple-200 font-bold"
                              title="Create immutable new policy version"
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Version
                            </Button>
                          )}

                          {pol.status === 'DRAFT' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleActivate(pol)}
                              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                            >
                              Activate
                            </Button>
                          )}

                          {pol.status === 'ACTIVE' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleSuspend(pol)}
                              className="text-rose-700 hover:bg-rose-50 border-rose-200"
                              title="Safely suspend policy and fall back to org baseline"
                            >
                              <PauseCircle className="w-3 h-3" />
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenEditWizard(pol)}
                            className="text-gray-700 hover:bg-gray-100 border-gray-200"
                            title="Edit or inspect policy rules"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleDuplicate(pol)}
                            className="text-gray-600 hover:bg-gray-100 border-gray-200"
                            title="Clone into new Draft"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>

                          {pol.status === 'DRAFT' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleDelete(pol)}
                              className="text-rose-600 hover:bg-rose-50 border-rose-200"
                              title="Delete draft policy"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}

                          {pol.status !== 'DRAFT' && pol.status !== 'ARCHIVED' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleArchive(pol)}
                              className="text-gray-500 hover:bg-gray-100 border-gray-200"
                              title="Archive policy"
                            >
                              <Archive className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. INDUSTRY TEMPLATES QUICK-PICK MODAL */}
      {isTemplateModalOpen && (
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title="Select Industry Attendance Policy Template"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-600">
              Pick a battle-tested industry template to auto-populate sensible defaults for your workforce. You will be able to review and customize every single rule in the 11-step wizard before activation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Corporate Office */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  handleOpenCreateWizard('CORPORATE');
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-sm">Corporate Standard</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Office</span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-1.5">
                    For HQ and corporate offices. Fixed Mon-Fri 09:00 - 18:00, 15m check-in grace, 120m monthly permission quota, Policy A crossing-day evaluation, and 30m overtime.
                  </p>
                </div>
                <Button size="xs" variant="primary" className="mt-3 bg-[#07563D] text-white w-full">
                  Use Corporate Template →
                </Button>
              </div>

              {/* Manufacturing & Plant */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  handleOpenCreateWizard('MANUFACTURING');
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-sm">Plant &amp; Manufacturing Shifts</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Factory</span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-1.5">
                    For production plants. Punch-based breaks, 10m grace, shift handover windows, night-shift overnight crossing, and 1.5x / 2.0x overtime multipliers.
                  </p>
                </div>
                <Button size="xs" variant="primary" className="mt-3 bg-blue-700 text-white w-full">
                  Use Manufacturing Template →
                </Button>
              </div>

              {/* Rotating Workforce 24/7 */}
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 hover:border-purple-500 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  handleOpenCreateWizard('ROTATING');
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 text-sm">Rotating Workforce 24/7</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">24/7 Lines</span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-1.5">
                    For continuous operations. Adaptive shift inference, emergency manpower override precedence, 8-hour manager escalation SLA, and automated rest day tracking.
                  </p>
                </div>
                <Button size="xs" variant="primary" className="mt-3 bg-purple-700 text-white w-full">
                  Use Rotating Template →
                </Button>
              </div>

              {/* Branch Retail & Field Ops */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 hover:border-amber-500 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  handleOpenCreateWizard('BRANCH_RETAIL');
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-sm">Multi-Branch Retail &amp; Field</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Retail</span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-1.5">
                    For multi-location retail chains. Geofenced punch radius, Tuesday/staggered weekly offs, 20m grace tolerance, and Policy B monthly excess governance.
                  </p>
                </div>
                <Button size="xs" variant="primary" className="mt-3 bg-amber-700 text-white w-full">
                  Use Retail Template →
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. 11-STEP GUIDED POLICY BUILDER WIZARD MODAL */}
      {isWizardOpen && (
        <Modal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          title={isEditingExisting ? `Edit Policy: ${pCode} (${pName})` : "Guided Attendance Policy Wizard"}
          size="xl"
        >
          <div className="space-y-4 text-xs">
            {/* 11 Steps Progress Navigator */}
            <div className="overflow-x-auto pb-1">
              <div className="flex items-center gap-1 min-w-[700px] bg-gray-100/90 p-1.5 rounded-2xl text-[10px] font-bold text-gray-500">
                {[
                  { step: 1, label: '1. Identity' },
                  { step: 2, label: '2. Scope' },
                  { step: 3, label: '3. Calendar' },
                  { step: 4, label: '4. Shift Resolution' },
                  { step: 5, label: '5. Biometrics & Grace' },
                  { step: 6, label: '6. Breaks & Hours' },
                  { step: 7, label: '7. Permission Quota' },
                  { step: 8, label: '8. Overtime' },
                  { step: 9, label: '9. Regularization' },
                  { step: 10, label: '10. Payroll & Alerts' },
                  { step: 11, label: '11. Simulation & Activation' },
                ].map(item => (
                  <button
                    key={item.step}
                    onClick={() => setWizardStep(item.step)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all",
                      wizardStep === item.step
                        ? "bg-white text-gray-900 shadow-xs font-bold border border-gray-200/60"
                        : "hover:bg-gray-200/70 text-gray-600"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 1: IDENTITY & TEMPLATE */}
            {wizardStep === 1 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#07563D]" />
                    Policy Identity &amp; Business Purpose
                  </h3>
                  <span className="text-[11px] text-gray-500">Step 1 of 11</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Policy Code *</label>
                    <input
                      type="text"
                      value={pCode}
                      onChange={e => setPCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold focus:ring-1 focus:ring-[#07563D]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Policy Name *</label>
                    <input
                      type="text"
                      value={pName}
                      onChange={e => setPName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#07563D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Operating Template</label>
                    <select
                      value={pTemplate}
                      onChange={e => applyTemplateDefaults(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#07563D]"
                    >
                      <option value="CORPORATE">Corporate Office Standard</option>
                      <option value="MANUFACTURING">Plant &amp; Manufacturing Line</option>
                      <option value="ROTATING">Rotating 24/7 Operations</option>
                      <option value="BRANCH_RETAIL">Multi-Branch Retail &amp; Field</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Effective From Date *</label>
                    <input
                      type="date"
                      value={pEffectiveFrom}
                      onChange={e => setPEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-[#07563D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Business Description &amp; Operational Intent</label>
                  <textarea
                    rows={2}
                    value={pDesc}
                    onChange={e => setPDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#07563D]"
                    placeholder="Describe which employee groups, shifts, or factory units this policy applies to..."
                  />
                </div>
              </div>
            )}

            {/* STEP 2: WORKFORCE SCOPE & EXCLUSIONS */}
            {wizardStep === 2 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#07563D]" />
                    Workforce Scope &amp; Applicability Precedence
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Scope Filtering</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.shift_rules}
                      onChange={() => toggleSectionSwitch('shift_rules')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!sectionSwitches.shift_rules && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Scope filter disabled:</span> When disabled, this policy acts as the universal organization-wide baseline for all staff members who do not have a specialized department or site policy.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Scope Applicability Level</label>
                    <select
                      value={pScopeType}
                      onChange={e => setPScopeType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="ORGANIZATION">Organization Wide (All active employees)</option>
                      <option value="DEPARTMENTS">Specific Departments</option>
                      <option value="LOCATIONS">Specific Branches / Factory Sites</option>
                      <option value="EMPLOYEE_GROUPS">Employee Group / Shift Cohort</option>
                      <option value="INDIVIDUALS">Specific Employees (Emergency deployment)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Target Units / Selection</label>
                    <input
                      type="text"
                      value={pScopeIds.join(', ')}
                      onChange={e => setPScopeIds(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. Production, Assembly, QA (comma separated)"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 text-gray-600">
                  <span className="font-bold text-gray-900">Precedence Order in Engine:</span> Individual assignment &gt; Approved Department Roster &gt; Branch Location Policy &gt; Organization Default. Conflicting assignments are routed to HR Review Queue without silent overrides.
                </div>
              </div>
            )}

            {/* STEP 3: WORKING CALENDAR */}
            {wizardStep === 3 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#07563D]" />
                    Working Calendar, Weekly Offs &amp; Holidays
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Working Calendar</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.work_calendar}
                      onChange={() => toggleSectionSwitch('work_calendar')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!sectionSwitches.work_calendar && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Calendar rules disabled:</span> Attendance will evaluate against raw roster entries without enforcing scheduled weekly rest or public holidays.
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Scheduled Working Days</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { day: 1, label: 'Mon' },
                      { day: 2, label: 'Tue' },
                      { day: 3, label: 'Wed' },
                      { day: 4, label: 'Thu' },
                      { day: 5, label: 'Fri' },
                      { day: 6, label: 'Sat' },
                      { day: 0, label: 'Sun' },
                    ].map(d => {
                      const isWorking = calWorkingDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => {
                            if (isWorking) {
                              setCalWorkingDays(calWorkingDays.filter(x => x !== d.day));
                              setCalWeeklyOff([...calWeeklyOff, d.day]);
                            } else {
                              setCalWorkingDays([...calWorkingDays, d.day]);
                              setCalWeeklyOff(calWeeklyOff.filter(x => x !== d.day));
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl font-bold transition-all",
                            isWorking ? "bg-[#07563D] text-white shadow-xs" : "bg-gray-200 text-gray-600"
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calAltSaturdays}
                      onChange={e => setCalAltSaturdays(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Alternate Saturdays Off</span>
                      <p className="text-[10px] text-gray-500">2nd and 4th Saturdays marked as Weekly Off</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calHolidays}
                      onChange={e => setCalHolidays(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Recognize Public Holidays</span>
                      <p className="text-[10px] text-gray-500">Work done on gazetted holidays qualifies for holiday overtime</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: SHIFT RESOLUTION & PRECEDENCE */}
            {wizardStep === 4 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#07563D]" />
                    Shift Resolution Hierarchy &amp; Adaptive Inference
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Shift Rotation</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.shift_rules}
                      onChange={() => toggleSectionSwitch('shift_rules')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!sectionSwitches.shift_rules && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Adaptive inference disabled:</span> Shift will be determined strictly by approved employee fixed assignment or published shift roster. Unassigned shifts route to Review Queue.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Primary Resolution Mode</label>
                    <select
                      value={shiftResolutionMode}
                      onChange={e => setShiftResolutionMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="FIXED">Fixed Timetable (All staff follow permanent shift)</option>
                      <option value="ROSTER">Published Roster Schedule (Weekly shift matrix)</option>
                      <option value="ADAPTIVE">Adaptive Punch Inference (Auto-detect from punch pattern)</option>
                      <option value="FLEXIBLE">Flexible Working Hours (Core hours)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Adaptive Confidence Threshold</label>
                    <select
                      value={shiftConfidenceThreshold}
                      onChange={e => setShiftConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="0.70">70% Match (Permissive - matches closest window)</option>
                      <option value="0.85">85% Match (Standard Production - recommended)</option>
                      <option value="0.95">95% Match (Strict - requires both IN and OUT confirmation)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shiftEmergencyOverride}
                      onChange={e => setShiftEmergencyOverride(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Emergency Manpower Override</span>
                      <p className="text-[10px] text-gray-500">Approved temporary shift assignments take precedence over published rosters</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shiftAllowAdaptive}
                      onChange={e => setShiftAllowAdaptive(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Punch Window Guardrail</span>
                      <p className="text-[10px] text-gray-500">Prevent inferring a shift solely from a single isolated punch event</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 5: BIOMETRIC PUNCH RULES & GRACE */}
            {wizardStep === 5 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#07563D]" />
                    Biometric Ingestion, Deduplication &amp; Grace Tolerances
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Grace Rules</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.grace_late}
                      onChange={() => toggleSectionSwitch('grace_late')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!sectionSwitches.grace_late && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Grace rules disabled:</span> Any punch after the scheduled start will be counted as raw lateness, but will not trigger automatic policy late deductions.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Check-In Grace (Minutes)</label>
                    <input
                      type="number"
                      value={pGraceIn}
                      onChange={e => setPGraceIn(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">e.g. 15m allows 09:15 without penalty</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Late Threshold (Minutes)</label>
                    <input
                      type="number"
                      value={pLateThreshold}
                      onChange={e => setPLateThreshold(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Exceeding this triggers quota deduction</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Early Checkout Grace (Minutes)</label>
                    <input
                      type="number"
                      value={pGraceOut}
                      onChange={e => setPGraceOut(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Allow leaving up to 10m before shift close</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Event Deduplication Window</label>
                    <select
                      value={pDedupWindow}
                      onChange={e => setPDedupWindow(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="2">2 minutes (Tight - filters machine double-taps)</option>
                      <option value="5">5 minutes (Recommended - prevents duplicate punch rows)</option>
                      <option value="10">10 minutes (Permissive device debounce)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Missing Check-Out Handling</label>
                    <select
                      value={pMissingPunchPenalty}
                      onChange={e => setPMissingPunchPenalty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="REGULARIZATION_REQUIRED">Create Exception &amp; Require Regularization</option>
                      <option value="MARK_HALF_DAY">Mark as Half Day</option>
                      <option value="MARK_ABSENT">Mark as Absent (Subject to review)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: BREAKS & WORKING DURATION */}
            {wizardStep === 6 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-[#07563D]" />
                    Breaks, Required Work Duration &amp; Overnight Shifts
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Break Rules</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.breaks_hours}
                      onChange={() => toggleSectionSwitch('breaks_hours')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Full Day Required Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={fullDayHours}
                      onChange={e => setFullDayHours(parseFloat(e.target.value) || 8)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Standard Indian Factories: 8.0 hours/day (48h/wk)</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Half Day Minimum Threshold (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={halfDayHours}
                      onChange={e => setHalfDayHours(parseFloat(e.target.value) || 4)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Working less than this is evaluated as Absent</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Break Tracking Mode</label>
                    <select
                      value={breakMode}
                      onChange={e => setBreakMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="FIXED">Fixed Deduction (e.g. 60m Lunch)</option>
                      <option value="PUNCH_BASED">Punch-Based (Actual biometric break punches)</option>
                      <option value="FLEXIBLE">Flexible (Paid breaks up to allowance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Default Break Duration (Mins)</label>
                    <input
                      type="number"
                      value={breakDurationMins}
                      onChange={e => setBreakDurationMins(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Night Shift Cutoff Hour</label>
                    <input
                      type="number"
                      value={nightShiftCutoff}
                      onChange={e => setNightShiftCutoff(parseInt(e.target.value) || 6)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Punches before 06:00 belong to previous day</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: PERMISSION GOVERNANCE */}
            {wizardStep === 7 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                    Monthly Permission Quota &amp; Half-Day Governance
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Permission Quota</span>
                    <input
                      type="checkbox"
                      checked={permEnabled}
                      onChange={e => setPermEnabled(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!permEnabled && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Permission Quota disabled:</span> Employees will not consume from the 120-minute monthly pool, and excess lateness will trigger immediate direct regularization without quota deduction.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Monthly Permission Allowance (Minutes)</label>
                    <input
                      type="number"
                      value={permMonthlyAllowance}
                      onChange={e => setPermMonthlyAllowance(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Standard: 120 minutes (2.0 hours) per employee calendar month</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Threshold Crossing Classification Policy</label>
                    <select
                      value={permThresholdPolicy}
                      onChange={e => setPermThresholdPolicy(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="POLICY_A_THRESHOLD_CROSSING_DAY">Policy A: Mark Half-Day ONLY on Crossing Day (Recommended)</option>
                      <option value="POLICY_B_EXCESS_PERMISSION_DAY">Policy B: Mark Half-Day on Crossing Day &amp; All Subsequent Excess</option>
                      <option value="POLICY_C_HR_REVIEW">Policy C: HR Special Review Queue</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Excess Permission Treatment</label>
                    <select
                      value={permExcessHandling}
                      onChange={e => setPermExcessHandling(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="MARK_EVERY_EXCESS_HALF_DAY">Company Strict (Auto-mark Half-Day / 0.5d LOP)</option>
                      <option value="LOG_EXCESS_ONLY">Standard Policy (Route to Manager Review Queue)</option>
                      <option value="DEDUCT_PAYROLL_HOURS">Convert Excess Minutes Directly to Pro-Rata LOP</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permAutoConsumeLate}
                      onChange={e => setPermAutoConsumeLate(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Auto-Consume Late Arrivals</span>
                      <p className="text-[10px] text-gray-500">Late minutes beyond grace are deducted from permission ledger before penalizing</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 8: OVERTIME RULES & APPROVALS */}
            {wizardStep === 8 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#07563D]" />
                    Overtime Eligibility, Thresholds &amp; Multipliers
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Overtime Engine</span>
                    <input
                      type="checkbox"
                      checked={otEnabled}
                      onChange={e => setOtEnabled(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                {!otEnabled && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="font-bold">Overtime calculation disabled:</span> Raw punch durations will be preserved in attendance history, but payable overtime will not be calculated or transmitted to payroll.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Min Qualifying Threshold (Mins)</label>
                    <input
                      type="number"
                      value={otMinThresholdMins}
                      onChange={e => setOtMinThresholdMins(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">e.g. 30 mins minimum beyond shift</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Weekday Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={otWeekdayRate}
                      onChange={e => setOtWeekdayRate(parseFloat(e.target.value) || 1.5)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Standard: 1.5x basic wage rate</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Weekly Off / Holiday Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      value={otWeeklyOffRate}
                      onChange={e => setOtWeeklyOffRate(parseFloat(e.target.value) || 2.0)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Indian Code on Wages: 2.0x (Double rate)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Max Daily Overtime Cap (Minutes)</label>
                    <input
                      type="number"
                      value={otMaxDailyMins}
                      onChange={e => setOtMaxDailyMins(parseInt(e.target.value) || 240)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">e.g. 240 minutes (4 hours maximum/day)</span>
                  </div>

                  <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={otRequiresApproval}
                      onChange={e => setOtRequiresApproval(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900">Separate Recorded from Payable OT</span>
                      <p className="text-[10px] text-gray-500">Requires supervisor digital signoff before sending OT hours to payroll</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 9: EXCEPTIONS & REGULARIZATION */}
            {wizardStep === 9 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#07563D]" />
                    Exception Routing &amp; Regularization Governance
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Regularization Desk</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.exceptions_reg}
                      onChange={() => toggleSectionSwitch('exceptions_reg')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Regularization Window (Days)</label>
                    <input
                      type="number"
                      value={pRegDays}
                      onChange={e => setPRegDays(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Employee must submit justification within 3 days of event</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Max Historical Backdating (Days)</label>
                    <input
                      type="number"
                      value={pMaxBackdatedDays}
                      onChange={e => setPMaxBackdatedDays(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Cannot regularize records prior to finalized payroll freeze</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">First Approver Role</label>
                    <input
                      type="text"
                      value={pApproverRole}
                      onChange={e => setPApproverRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Approval SLA (Hours)</label>
                    <input
                      type="number"
                      value={pEscalationHours}
                      onChange={e => setPEscalationHours(parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Auto-escalates to HR Head if pending past SLA</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 10: PAYROLL & NOTIFICATIONS */}
            {wizardStep === 10 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#07563D]" />
                    Payroll Integration, Lock Cycles &amp; Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Enable Payroll Lock</span>
                    <input
                      type="checkbox"
                      checked={sectionSwitches.payroll_notifications}
                      onChange={() => toggleSectionSwitch('payroll_notifications')}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Payroll Freeze Offset (Days before month end)</label>
                    <input
                      type="number"
                      value={payrollFreezeDays}
                      onChange={e => setPayrollFreezeDays(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Locks historical punches against retroactive recalculation</span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Half-Day LOP Conversion Rate</label>
                    <input
                      type="number"
                      step="0.5"
                      value={payrollLopRate}
                      onChange={e => setPayrollLopRate(parseFloat(e.target.value) || 0.5)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Days deducted per unexcused half-day (Standard: 0.5d)</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 text-gray-600 space-y-1.5">
                  <span className="font-bold text-gray-900">Notification Dispatch Rules:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyEmployeeThreshold}
                      onChange={e => setNotifyEmployeeThreshold(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <span>Notify employee when 90 minutes of 120m permission quota is reached</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notifyManagerEscalation}
                      onChange={e => setNotifyManagerEscalation(e.target.checked)}
                      className="w-4 h-4 text-[#07563D] rounded"
                    />
                    <span>Notify Plant/Reporting Manager on missing check-out exceptions</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 11: PRE-FLIGHT SIMULATION & ACTIVATION */}
            {wizardStep === 11 && (
              <div className="space-y-3.5 bg-gray-50/50 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                    Pre-Flight Simulation, Audit Review &amp; Activation
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ready for Activation
                  </span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 space-y-2">
                  <div className="font-bold text-gray-900 text-sm">Policy Configuration Summary:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-gray-700 pt-1">
                    <div>• Code: <span className="font-bold text-gray-900 font-mono">{pCode}</span></div>
                    <div>• Template: <span className="font-bold text-gray-900">{pTemplate}</span></div>
                    <div>• Effective Date: <span className="font-bold text-gray-900 font-mono">{pEffectiveFrom}</span></div>
                    <div>• Check-In Grace: <span className="font-bold text-gray-900">{pGraceIn}m</span></div>
                    <div>• Permission Quota: <span className="font-bold text-gray-900">{permMonthlyAllowance}m/mo</span></div>
                    <div>• OT Multiplier: <span className="font-bold text-gray-900">{otWeekdayRate}x</span></div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#07563D] shrink-0" />
                  <div>
                    <span className="font-bold">Zero-Disruption Guarantee:</span> Activating this policy will not silently rewrite finalized payroll or past attendance transactions. It will apply deterministically to new punch events starting {pEffectiveFrom}.
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
                className="text-xs font-semibold"
              >
                Back
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveWizardPolicy('DRAFT')}
                  className="text-xs font-semibold text-gray-700"
                >
                  Save as Draft
                </Button>

                {wizardStep < 11 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setWizardStep(prev => Math.min(11, prev + 1))}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
                  >
                    Next Step ({wizardStep + 1}/11) →
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveWizardPolicy('ACTIVE')}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Activate Attendance Policy
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. INTERACTIVE RULE SIMULATOR SANDBOX DRAWER / MODAL */}
      {isSimulatorOpen && simPolicy && (
        <Modal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          title={`Attendance Rule Simulator: ${simPolicy.policy_name}`}
          size="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header Banner */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-[#07563D] fill-current" />
                  Testing Policy: {simPolicy.policy_name} ({simPolicy.policy_code} v{simPolicy.version})
                </span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Deterministic sandbox evaluation — executes the authoritative 9-step attendance logic without mutating production records or sending notifications.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleRunBatchSimulation}
                  disabled={isSimulatingBatch}
                  className="bg-white border-emerald-300 text-emerald-900 font-bold"
                >
                  <Users className="w-3.5 h-3.5 mr-1 text-[#07563D]" />
                  {isSimulatingBatch ? 'Evaluating...' : 'Batch Workforce Preview'}
                </Button>
              </div>
            </div>

            {/* Quick Test Scenario Presets */}
            <div className="space-y-1.5">
              <span className="font-bold text-gray-700 text-[11px]">Quick Representative Test Scenarios:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('09:00');
                    setSimSchedOut('18:00');
                    setSimActIn('08:55');
                    setSimActOut('18:05');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(0);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-700"
                >
                  1. Punctual (08:55 - 18:05)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('09:00');
                    setSimSchedOut('18:00');
                    setSimActIn('09:12');
                    setSimActOut('18:00');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(20);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-700"
                >
                  2. Late Within Grace (09:12)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('09:00');
                    setSimSchedOut('18:00');
                    setSimActIn('09:35');
                    setSimActOut('18:00');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(45);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-700"
                >
                  3. Late Beyond Grace (09:35)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('06:00');
                    setSimSchedOut('14:00');
                    setSimActIn('05:50');
                    setSimActOut('16:30');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(0);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-700"
                >
                  4. Factory OT (06:00 - 16:30)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('09:00');
                    setSimSchedOut('18:00');
                    setSimActIn('09:00');
                    setSimActOut('');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(0);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-semibold text-gray-700"
                >
                  5. Missing Check-Out
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimSchedIn('09:00');
                    setSimSchedOut('18:00');
                    setSimActIn('09:45');
                    setSimActOut('18:00');
                    setSimApprovedPerm(0);
                    setSimPriorConsumed(110);
                    setSimIsWeeklyOff(false);
                  }}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-semibold"
                >
                  6. Quota Exhaustion (Policy A Half-Day)
                </button>
              </div>
            </div>

            {/* Simulation Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/70">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Scheduled Start</label>
                <input
                  type="time"
                  value={simSchedIn}
                  onChange={e => setSimSchedIn(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Scheduled End</label>
                <input
                  type="time"
                  value={simSchedOut}
                  onChange={e => setSimSchedOut(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Actual First In</label>
                <input
                  type="time"
                  value={simActIn}
                  onChange={e => setSimActIn(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Actual Last Out</label>
                <input
                  type="time"
                  value={simActOut}
                  onChange={e => setSimActOut(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Prior Consumed Quota (Mins)</label>
                <input
                  type="number"
                  value={simPriorConsumed}
                  onChange={e => setSimPriorConsumed(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Approved Permission (Mins)</label>
                <input
                  type="number"
                  value={simApprovedPerm}
                  onChange={e => setSimApprovedPerm(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Date</label>
                <input
                  type="date"
                  value={simDate}
                  onChange={e => setSimDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={simIsWeeklyOff}
                    onChange={e => setSimIsWeeklyOff(e.target.checked)}
                    className="w-4 h-4 text-[#07563D] rounded"
                  />
                  <span>Weekly Off / Holiday</span>
                </label>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={handleRunSimulation}
              className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs py-2 shadow-xs"
            >
              Run Sandbox Simulation Now
            </Button>

            {/* BATCH SIMULATION PREVIEW CARD */}
            {simBatchResult && (
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-700" />
                    Workforce Pre-Flight Simulation ({simBatchResult.total_evaluated} Employees)
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold font-mono">Evaluation Date: {simDate}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Compliant</div>
                    <div className="text-base font-bold text-emerald-700 font-mono">{simBatchResult.compliant_count}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Half-Day</div>
                    <div className="text-base font-bold text-amber-700 font-mono">{simBatchResult.half_day_count}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Absent</div>
                    <div className="text-base font-bold text-rose-700 font-mono">{simBatchResult.absent_count}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Overtime Earners</div>
                    <div className="text-base font-bold text-blue-700 font-mono">{simBatchResult.overtime_eligible_count}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Exceptions</div>
                    <div className="text-base font-bold text-purple-700 font-mono">{simBatchResult.regularization_required_count}</div>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-purple-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Projected LOP</div>
                    <div className="text-base font-bold text-rose-800 font-mono">{simBatchResult.projected_lop_days}d</div>
                  </div>
                </div>
              </div>
            )}

            {/* SINGLE SIMULATION OUTPUT & STEP-BY-STEP TRACE */}
            {simResult && (
              <div className="space-y-3 pt-1">
                {/* Outcome Summary Pill Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-[10px] text-gray-500 font-semibold">Attendance State</div>
                    <div className={cn(
                      "text-sm font-bold font-mono mt-0.5",
                      simResult.attendance_status === 'PRESENT' ? 'text-emerald-700' :
                      simResult.attendance_status === 'HALF_DAY' ? 'text-amber-700' :
                      simResult.attendance_status === 'ABSENT' ? 'text-rose-700' : 'text-purple-700'
                    )}>
                      {simResult.attendance_status}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-[10px] text-gray-500 font-semibold">Net Worked Hours</div>
                    <div className="text-sm font-bold text-gray-900 font-mono mt-0.5">
                      {simResult.worked_net_hours} hrs ({simResult.worked_net_minutes}m)
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-[10px] text-gray-500 font-semibold">Permission Quota</div>
                    <div className="text-sm font-bold text-purple-800 font-mono mt-0.5">
                      {simResult.permission_quota.remaining}m left of 120m
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-[10px] text-gray-500 font-semibold">Payable Overtime</div>
                    <div className="text-sm font-bold text-blue-800 font-mono mt-0.5">
                      {simResult.overtime.payable_minutes} mins ({simResult.overtime.rate_multiplier}x)
                    </div>
                  </div>
                </div>

                {/* 9-Step Calculation Trace */}
                <div className="space-y-2">
                  <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                    <span>Authoritative 9-Step Engine Calculation Trace:</span>
                    <span className="text-[10px] text-gray-500 font-mono">Trace ID: calc-{Date.now().toString().slice(-6)}</span>
                  </div>

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {simResult.execution_trace.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded-xl border border-gray-200/80 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[10px] font-mono">
                              {idx + 1}
                            </span>
                            <span>{tr.step}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 pl-6.5">{tr.details}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                              tr.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              tr.status === 'WARNING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-gray-100 text-gray-700 border border-gray-200'
                            )}
                          >
                            {tr.result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Downstream Payroll & Regularization Consequence */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 space-y-1">
                  <div className="font-bold text-gray-900">Traceable Payroll &amp; Approval Impact:</div>
                  <div className="text-[11px] text-gray-600">{simResult.payroll_consequence}</div>
                  {simResult.regularization_required && (
                    <div className="text-[11px] text-purple-700 font-semibold pt-1 border-t border-gray-200">
                      Exception routed to: {simResult.approver_chain.join(' → ')} (Requires employee justification within 3 days)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 7. PUBLISH NEW VERSION MODAL */}
      {isPublishModalOpen && selectedPolicy && (
        <Modal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          title={`Publish Version ${selectedPolicy.version + 1} of ${selectedPolicy.policy_code}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-950">
              <span className="font-bold">Immutable Policy Revision:</span>
              <p className="text-purple-700 text-[11px] mt-1">
                Version {selectedPolicy.version} will remain permanently active for historical attendance and finalized payroll cycles. Version {selectedPolicy.version + 1} will take effect on {newEffectiveDate}.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Effective Date *</label>
              <input
                type="date"
                value={newEffectiveDate}
                onChange={e => setNewEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Auditable Change Reason *</label>
              <input
                type="text"
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                placeholder="e.g. FY2026 Q4 Grace Period adjustment for plant workers"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>

            {impactAnalysis && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                <span className="font-bold text-gray-900">Pre-Flight Impact Analysis:</span>
                <div className="mt-1 text-gray-600">
                  {impactAnalysis.affected_employees_count} active employees affected across {impactAnalysis.affected_departments_count} departments.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmPublishNewVersion}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
              >
                Publish &amp; Activate Version {selectedPolicy.version + 1}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
