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
} from 'lucide-react';
import {
  attendanceRosterService,
} from '../../../services/attendance/attendanceRosterService';
import { AttendancePolicy, PolicyImpactAnalysis } from '../../../types/shiftRoster';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export const AttendancePolicyConfigView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<AttendancePolicy | null>(null);

  // Stepper Create/Edit Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Wizard Form Fields
  const [pCode, setPCode] = useState('ATT-CORP-002');
  const [pName, setPName] = useState('Operations & Manufacturing Policy');
  const [pType, setPType] = useState<AttendancePolicy['policy_type']>('GENERAL');
  const [pDesc, setPDesc] = useState('Standard operational attendance policy for manufacturing shift lines.');
  const [pEffectiveFrom, setPEffectiveFrom] = useState('2026-09-01');
  const [pScopeType, setPScopeType] = useState<'ORGANIZATION' | 'DEPARTMENT' | 'LOCATION' | 'SHIFT'>('ORGANIZATION');
  const [pScopeIds, setPScopeIds] = useState<string[]>([]);
  const [pGraceIn, setPGraceIn] = useState(15);
  const [pLateThreshold, setPLateThreshold] = useState(30);
  const [pGraceOut, setPGraceOut] = useState(10);
  const [pMissingPunchPenalty, setPMissingPunchPenalty] = useState<'REGULARIZATION_REQUIRED' | 'MARK_HALF_DAY' | 'MARK_ABSENT'>('REGULARIZATION_REQUIRED');
  const [pRegDays, setPRegDays] = useState(3);
  const [pMaxBackdatedDays, setPMaxBackdatedDays] = useState(30);
  const [pApproverRole, setPApproverRole] = useState('Reporting Manager');
  const [pEscalationHours, setPEscalationHours] = useState(24);
  const [pLateCountTrigger, setPLateCountTrigger] = useState(3);
  const [pDeductionDays, setPDeductionDays] = useState(0.5);

  // Version Publishing Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newEffectiveDate, setNewEffectiveDate] = useState('2026-09-01');
  const [changeReason, setChangeReason] = useState('Quarterly policy threshold revision');
  const [impactAnalysis, setImpactAnalysis] = useState<PolicyImpactAnalysis | null>(null);

  // Simulator Drawer State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simPolicy, setSimPolicy] = useState<AttendancePolicy | null>(null);
  const [simSchedIn, setSimSchedIn] = useState('09:00');
  const [simSchedOut, setSimSchedOut] = useState('18:00');
  const [simActIn, setSimActIn] = useState('09:24');
  const [simActOut, setSimActOut] = useState('17:42');
  const [simResult, setSimResult] = useState<any>(null);

  // Audit History Drawer State
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  const loadPolicies = () => {
    const list = attendanceRosterService.getPolicies();
    setPolicies(list);
    if (list.length > 0 && !selectedPolicy) {
      setSelectedPolicy(list[0]);
    }
  };

  useEffect(() => {
    loadPolicies();
    const unsub = hrEventBus.subscribe('*', () => loadPolicies());
    return () => unsub();
  }, []);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      if (activeTab === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (activeTab === 'DRAFT' && p.status !== 'DRAFT') return false;
      if (activeTab === 'ARCHIVED' && (p.status !== 'ARCHIVED' && p.status !== 'EXPIRED')) return false;

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
  }, [policies, activeTab, searchQuery]);

  const handleOpenCreateWizard = () => {
    setPCode(`ATT-GEN-${Math.floor(100 + Math.random() * 900)}`);
    setPName('Custom Business Unit Attendance Policy');
    setPType('GENERAL');
    setPDesc('Configured attendance tolerances, grace windows, and manager approval escalations.');
    setPEffectiveFrom(new Date().toISOString().split('T')[0]);
    setPScopeType('ORGANIZATION');
    setPGraceIn(15);
    setPLateThreshold(30);
    setPGraceOut(10);
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleSaveWizardPolicy = (asDraft: boolean) => {
    const newPolicy: Omit<AttendancePolicy, 'id' | 'version' | 'created_at' | 'updated_at'> = {
      tenant_id: 'org-joy-01',
      policy_code: pCode,
      policy_name: pName,
      policy_type: pType,
      description: pDesc,
      status: asDraft ? 'DRAFT' : 'ACTIVE',
      effective_from: pEffectiveFrom,
      general_rules: {
        full_day_hours: 8,
        half_day_hours: 4,
        absent_threshold_hours: 4,
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
        mode: 'FIXED',
        default_break_minutes: 60,
        auto_deduct: true,
      },
      overtime_rules: {
        enabled: true,
        min_threshold_minutes: 30,
        weekday_rate: 1.5,
        weekly_off_rate: 2.0,
        holiday_rate: 2.0,
        max_daily_minutes: 240,
        requires_approval: true,
      },
      late_deduction_rules: {
        late_count_trigger: pLateCountTrigger,
        deduction_amount_days: pDeductionDays,
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
        cutoff_hour: 6,
      },
      applies_to: {
        type: pScopeType,
        ids: pScopeIds,
      },
    };

    const saved = attendanceRosterService.createPolicy(newPolicy, user?.name || 'HR Administrator');
    showToast(`✓ Attendance Policy ${saved.policy_code} saved successfully as ${saved.status}!`);
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

  const handleOpenSimulator = (pol: AttendancePolicy) => {
    setSimPolicy(pol);
    const result = attendanceRosterService.simulatePolicyCalculation(pol, {
      scheduled_in: simSchedIn,
      scheduled_out: simSchedOut,
      actual_in: simActIn,
      actual_out: simActOut,
    });
    setSimResult(result);
    setIsSimulatorOpen(true);
  };

  const handleRunSimulation = () => {
    if (!simPolicy) return;
    const result = attendanceRosterService.simulatePolicyCalculation(simPolicy, {
      scheduled_in: simSchedIn,
      scheduled_out: simSchedOut,
      actual_in: simActIn,
      actual_out: simActOut,
    });
    setSimResult(result);
  };

  const handleOpenPublishNewVersion = (pol: AttendancePolicy) => {
    setSelectedPolicy(pol);
    const impact = attendanceRosterService.calculatePolicyImpact(pol.id, {});
    setImpactAnalysis(impact);
    setNewEffectiveDate('2026-09-01');
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
      {/* 1. Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#07563D]/10 text-[#07563D]">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Attendance Policies</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
              Production Rule Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure versioned attendance rules, grace tolerances, approval workflows, and payroll consequences.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (policies.length > 0) handleOpenSimulator(policies[0]);
            }}
            className="text-xs font-bold text-gray-700"
          >
            <Play className="w-3.5 h-3.5 mr-1 text-[#07563D]" />
            Rule Simulator
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateWizard}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Attendance Policy
          </Button>
        </div>
      </div>

      {/* 2. Filter & Status Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex-wrap text-xs">
        <div className="flex items-center gap-1.5 font-bold">
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
            Active ({policies.filter(p => p.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'DRAFT' ? "bg-amber-700 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100")}
          >
            Drafts ({policies.filter(p => p.status === 'DRAFT').length})
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={cn("px-3 py-1.5 rounded-xl transition-all", activeTab === 'ARCHIVED' ? "bg-gray-700 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            Archived ({policies.filter(p => p.status === 'ARCHIVED' || p.status === 'EXPIRED').length})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search policy name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          />
        </div>
      </div>

      {/* 3. Master Policy Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Policy Code & Name</th>
                <th className="p-3">Scope</th>
                <th className="p-3">Version</th>
                <th className="p-3">Effective Date</th>
                <th className="p-3">Grace & Timing Rules</th>
                <th className="p-3">Approval SLA</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-800">No attendance policies found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Click "Create Attendance Policy" to configure your organization's time rules.</p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map(pol => (
                  <tr key={pol.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{pol.policy_name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">{pol.policy_code}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {pol.applies_to?.type || 'Company Wide'}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#07563D]">v{pol.version}</td>
                    <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{pol.effective_from}</td>
                    <td className="p-3 text-gray-700">
                      <div className="font-semibold text-gray-900">{pol.check_in_rules.grace_minutes}m Late Grace • {pol.check_out_rules.early_checkout_grace_minutes}m Early Grace</div>
                      <div className="text-[10px] text-gray-400">{pol.late_deduction_rules.late_count_trigger} Lates = {pol.late_deduction_rules.deduction_amount_days}d LOP</div>
                    </td>
                    <td className="p-3 text-gray-600">
                      <div>{pol.approval_workflow?.levels[0]?.role || 'Reporting Manager'}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{pol.approval_workflow?.levels[0]?.sla_hours || 24}h SLA Escalation</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {pol.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Active
                        </span>
                      ) : pol.status === 'DRAFT' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                          Draft
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-200 text-gray-700 rounded">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenSimulator(pol)}
                          className="text-[#07563D] hover:bg-emerald-50 border-emerald-200"
                          title="Simulate rule outcome"
                        >
                          <Play className="w-3 h-3 mr-0.5" /> Simulate
                        </Button>

                        {pol.status === 'ACTIVE' && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenPublishNewVersion(pol)}
                            className="text-purple-700 hover:bg-purple-50 border-purple-200"
                            title="Create new version with effective dating"
                          >
                            <Edit2 className="w-3 h-3 mr-0.5" /> Version
                          </Button>
                        )}

                        {pol.status === 'DRAFT' && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleActivate(pol)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white"
                          >
                            Activate
                          </Button>
                        )}

                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleDuplicate(pol)}
                          title="Clone to new Draft"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>

                        {pol.status === 'ACTIVE' && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleArchive(pol)}
                            className="text-gray-500 hover:bg-gray-100"
                            title="Archive policy"
                          >
                            <Archive className="w-3 h-3" />
                          </Button>
                        )}

                        {pol.status === 'DRAFT' && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleDelete(pol)}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. 6-STEP POLICY BUILDER WIZARD MODAL */}
      {isWizardOpen && (
        <Modal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          title="Create New Attendance Policy Wizard"
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Step Indicator Bar */}
            <div className="grid grid-cols-6 gap-1 bg-gray-100 p-1.5 rounded-xl text-center text-[10px] font-bold text-gray-500">
              <span className={cn("py-1 rounded-lg", wizardStep === 1 ? "bg-white text-gray-900 shadow-xs" : "")}>1. Basics</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 2 ? "bg-white text-gray-900 shadow-xs" : "")}>2. Scope</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 3 ? "bg-white text-gray-900 shadow-xs" : "")}>3. Rules</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 4 ? "bg-white text-gray-900 shadow-xs" : "")}>4. Regularization</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 5 ? "bg-white text-gray-900 shadow-xs" : "")}>5. Approvals</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 6 ? "bg-white text-gray-900 shadow-xs" : "")}>6. Review</span>
            </div>

            {/* STEP 1: BASICS */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Policy Code *</label>
                    <input
                      type="text"
                      value={pCode}
                      onChange={e => setPCode(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Policy Name *</label>
                    <input
                      type="text"
                      value={pName}
                      onChange={e => setPName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Policy Type</label>
                    <select
                      value={pType}
                      onChange={e => setPType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="GENERAL">General Organization Policy</option>
                      <option value="FACTORY_PLANT">Manufacturing & Plant Line</option>
                      <option value="LATE_ARRIVAL">Late Arrival & Punctuality</option>
                      <option value="EARLY_DEPARTURE">Early Departure Tolerance</option>
                      <option value="OVERTIME">Overtime & Extended Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Effective From *</label>
                    <input
                      type="date"
                      value={pEffectiveFrom}
                      onChange={e => setPEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={pDesc}
                    onChange={e => setPDesc(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: SCOPE ASSIGNMENT */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Applicable Scope Hierarchy</label>
                  <select
                    value={pScopeType}
                    onChange={e => setPScopeType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="ORGANIZATION">Entire Organization (All Employees)</option>
                    <option value="DEPARTMENT">Specific Department</option>
                    <option value="LOCATION">Branch / Plant Location</option>
                    <option value="SHIFT">Specific Shift Template</option>
                  </select>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-900">Live Scope Evaluation</div>
                    <div className="text-emerald-700 text-[11px]">Calculated from active Employee Master directory</div>
                  </div>
                  <span className="text-lg font-black text-emerald-900">28 Employees</span>
                </div>
              </div>
            )}

            {/* STEP 3: TIMING & GRACE RULES */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Check-in Late Grace (Minutes)</label>
                    <input
                      type="number"
                      value={pGraceIn}
                      onChange={e => setPGraceIn(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Late Threshold (Minutes)</label>
                    <input
                      type="number"
                      value={pLateThreshold}
                      onChange={e => setPLateThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Early Checkout Grace (Minutes)</label>
                    <input
                      type="number"
                      value={pGraceOut}
                      onChange={e => setPGraceOut(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Missing Punch Default Action</label>
                    <select
                      value={pMissingPunchPenalty}
                      onChange={e => setPMissingPunchPenalty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="REGULARIZATION_REQUIRED">Route to Regularization Desk</option>
                      <option value="MARK_HALF_DAY">Mark Half Day Automatically</option>
                      <option value="MARK_ABSENT">Mark Absent</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REGULARIZATION RULES */}
            {wizardStep === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Submission Window (Days)</label>
                    <input
                      type="number"
                      value={pRegDays}
                      onChange={e => setPRegDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Max Backdated Days</label>
                    <input
                      type="number"
                      value={pMaxBackdatedDays}
                      onChange={e => setPMaxBackdatedDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: APPROVAL WORKFLOW & ESCALATION */}
            {wizardStep === 5 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">1st Level Approver</label>
                    <select
                      value={pApproverRole}
                      onChange={e => setPApproverRole(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="Reporting Manager">Employee's Reporting Manager</option>
                      <option value="Department Head">Department Head</option>
                      <option value="HR Administrator">HR Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Escalation SLA (Hours)</label>
                    <input
                      type="number"
                      value={pEscalationHours}
                      onChange={e => setPEscalationHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & VALIDATION */}
            {wizardStep === 6 && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-900">Policy Summary Pre-Activation Check</div>
                <div className="space-y-1 text-gray-600">
                  <div>• Name: <span className="font-semibold text-gray-900">{pName} ({pCode})</span></div>
                  <div>• Effective: <span className="font-semibold text-gray-900">{pEffectiveFrom}</span></div>
                  <div>• Check-In Grace: <span className="font-semibold text-gray-900">{pGraceIn} mins</span></div>
                  <div>• Early Checkout Grace: <span className="font-semibold text-gray-900">{pGraceOut} mins</span></div>
                  <div>• Approver SLA: <span className="font-semibold text-gray-900">{pApproverRole} ({pEscalationHours}h SLA)</span></div>
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as any)}
                disabled={wizardStep === 1}
              >
                Back
              </Button>

              <div className="flex items-center gap-2">
                {wizardStep < 6 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setWizardStep(prev => Math.min(6, prev + 1) as any)}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                  >
                    Next
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveWizardPolicy(true)}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveWizardPolicy(false)}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                    >
                      Activate Policy
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. INTERACTIVE RULE SIMULATOR DRAWER / MODAL */}
      {isSimulatorOpen && simPolicy && (
        <Modal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          title={`Rule Simulator: ${simPolicy.policy_name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-900">Active Rule Profile: {simPolicy.policy_code} (v{simPolicy.version})</span>
              <p className="text-emerald-700 mt-0.5">
                Grace: {simPolicy.check_in_rules.grace_minutes}m IN, {simPolicy.check_out_rules.early_checkout_grace_minutes}m OUT • Deduction: {simPolicy.late_deduction_rules.deduction_amount_days}d
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Scheduled IN</label>
                <input
                  type="time"
                  value={simSchedIn}
                  onChange={e => setSimSchedIn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Actual Check-In</label>
                <input
                  type="time"
                  value={simActIn}
                  onChange={e => setSimActIn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Scheduled OUT</label>
                <input
                  type="time"
                  value={simSchedOut}
                  onChange={e => setSimSchedOut(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Actual Check-Out</label>
                <input
                  type="time"
                  value={simActOut}
                  onChange={e => setSimActOut(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <Button size="sm" variant="primary" onClick={handleRunSimulation} className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
              Run Sandbox Calculation
            </Button>

            {simResult && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="font-bold text-gray-900">Simulation Outcome:</div>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  <div>Check-In Result: <span className="font-bold text-gray-900">{simResult.check_in_status}</span></div>
                  <div>Late Minutes: <span className="font-bold text-rose-700">{simResult.late_minutes}m</span></div>
                  <div>Early Out: <span className="font-bold text-amber-700">{simResult.early_minutes}m</span></div>
                  <div>Regularization: <span className="font-bold text-purple-700">{simResult.regularization_required ? 'Required' : 'None'}</span></div>
                </div>
                <div className="text-gray-600 pt-1 border-t border-gray-200/60">
                  Payroll Consequence: <span className="font-semibold text-gray-900">{simResult.payroll_consequence}</span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 6. PUBLISH NEW VERSION MODAL */}
      {isPublishModalOpen && selectedPolicy && (
        <Modal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          title={`Publish Version ${selectedPolicy.version + 1} of ${selectedPolicy.policy_code}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="font-bold text-purple-900">Immutable Versioning Pre-check</span>
              <p className="text-purple-700 mt-1">
                Version {selectedPolicy.version} will remain permanently active for attendance before {newEffectiveDate}. Version {selectedPolicy.version + 1} will take effect from {newEffectiveDate}.
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Effective Date *</label>
              <input
                type="date"
                value={newEffectiveDate}
                onChange={e => setNewEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason for Revision *</label>
              <input
                type="text"
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
            </div>

            {impactAnalysis && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                <span className="font-bold text-gray-900">Impact Analysis:</span>
                <div className="mt-1">{impactAnalysis.affected_employees_count} active employees affected across {impactAnalysis.affected_departments_count} departments.</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmPublishNewVersion} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Publish & Activate Version {selectedPolicy.version + 1}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
