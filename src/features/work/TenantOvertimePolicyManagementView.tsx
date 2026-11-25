// src/features/work/TenantOvertimePolicyManagementView.tsx
// ============================================================================
// JOY PeopleHR — Tenant Overtime Policy Management & Organization Settings View
// Configure Modes A/B/C/D, Approval Workflows, & Hierarchical Multi-Tier Policies
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useTenant } from '../../hooks/useTenant';
import {
  ShieldCheck,
  Sliders,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Building2,
  Save,
  RotateCcw,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  tenantOvertimeEngineService,
} from '../../services/attendance/tenantOvertimeEngineService';
import {
  TenantOtMode,
  OtApprovalWorkflow,
  OtPolicyScopeLevel,
  OtRoundingRule,
  OrganizationOtSettings,
  TenantOtPolicyRule,
} from '../../types/tenantOvertime';

const MODE_DESCRIPTIONS: Record<TenantOtMode, { title: string; badge: string; color: string; desc: string }> = {
  POLICY_BASED: {
    title: 'Mode A — Policy-Based Overtime',
    badge: 'Mode A: Active Policy',
    color: 'emerald',
    desc: 'When an applicable policy exists, OT is calculated automatically using approved thresholds, breaks, and multipliers. If no policy matches, falls back safely to HR-verification queue.',
  },
  HR_VERIFIED: {
    title: 'Mode B — HR-Verified Overtime',
    badge: 'Mode B: HR Review',
    color: 'amber',
    desc: 'Calculates daily potential OT from verified attendance and shift schedules, marking records POLICY_NOT_CONFIGURED & PENDING_HR_REVIEW. No payroll amount is guessed without HR verification.',
  },
  TRACKING_ONLY: {
    title: 'Mode C — OT Tracking Only',
    badge: 'Mode C: Intelligence Only',
    color: 'blue',
    desc: 'Accurately tracks and logs overtime working hours across workforce, but does not generate payroll compensation or statutory payable amounts.',
  },
  DISABLED: {
    title: 'Mode D — Overtime Disabled',
    badge: 'Mode D: Disabled',
    color: 'gray',
    desc: 'Overtime generation is completely suspended. Normal attendance and roster scheduling remain untouched. Historical records are strictly preserved.',
  },
};

export const TenantOvertimePolicyManagementView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const activeOrgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';
  const orgName = organization?.name || 'Active Organization';

  // Org Settings State
  const [settings, setSettings] = useState<OrganizationOtSettings>(() =>
    tenantOvertimeEngineService.getOrgSettings(activeOrgId)
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Policy List State
  const [policies, setPolicies] = useState<TenantOtPolicyRule[]>(() =>
    tenantOvertimeEngineService.getPolicies(activeOrgId)
  );

  // Policy Modal / Form State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formScopeLevel, setFormScopeLevel] = useState<OtPolicyScopeLevel>('ORG_DEFAULT');
  const [formScopeTargetId, setFormScopeTargetId] = useState('');
  const [formScopeTargetName, setFormScopeTargetName] = useState('');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [formEffectiveTo, setFormEffectiveTo] = useState('');
  const [formDailyThreshold, setFormDailyThreshold] = useState(480);
  const [formWeeklyThreshold, setFormWeeklyThreshold] = useState(2400);
  const [formMinOtThreshold, setFormMinOtThreshold] = useState(30);
  const [formMaxOtDay, setFormMaxOtDay] = useState(240);
  const [formMaxOtWeek, setFormMaxOtWeek] = useState(960);
  const [formMonthlyStatutoryCap, setFormMonthlyStatutoryCap] = useState(50);
  const [formDayBreak, setFormDayBreak] = useState(30);
  const [formNightBreak, setFormNightBreak] = useState(0);
  const [formBreakDeductAfter, setFormBreakDeductAfter] = useState(240);
  const [formRoundingRule, setFormRoundingRule] = useState<OtRoundingRule>('NEAREST_15_MIN');
  const [formPreShift, setFormPreShift] = useState(true);
  const [formPostShift, setFormPostShift] = useState(true);
  const [formRegularMultiplier, setFormRegularMultiplier] = useState(1.5);
  const [formWeekendMultiplier, setFormWeekendMultiplier] = useState(2.0);
  const [formHolidayMultiplier, setFormHolidayMultiplier] = useState(2.0);
  const [formNightMultiplier, setFormNightMultiplier] = useState(1.25);
  const [formNightStart, setFormNightStart] = useState('22:00');
  const [formNightEnd, setFormNightEnd] = useState('06:00');
  const [formPayrollIntegration, setFormPayrollIntegration] = useState(true);

  const refreshData = () => {
    setSettings(tenantOvertimeEngineService.getOrgSettings(activeOrgId));
    setPolicies(tenantOvertimeEngineService.getPolicies(activeOrgId));
  };

  useEffect(() => {
    refreshData();
  }, [activeOrgId]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await tenantOvertimeEngineService.saveOrgSettings(activeOrgId, settings);
      showToast('✓ Organization overtime configuration saved successfully.');
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openCreateModal = () => {
    setEditingPolicyId(null);
    setFormName(`${orgName} Default Overtime Policy`);
    setFormScopeLevel('ORG_DEFAULT');
    setFormScopeTargetId('');
    setFormScopeTargetName('');
    setFormEffectiveFrom(new Date().toISOString().split('T')[0]);
    setFormEffectiveTo('');
    setFormDailyThreshold(480);
    setFormWeeklyThreshold(2400);
    setFormMinOtThreshold(30);
    setFormMaxOtDay(240);
    setFormMaxOtWeek(960);
    setFormMonthlyStatutoryCap(50);
    setFormDayBreak(30);
    setFormNightBreak(0);
    setFormBreakDeductAfter(240);
    setFormRoundingRule('NEAREST_15_MIN');
    setFormPreShift(true);
    setFormPostShift(true);
    setFormRegularMultiplier(1.5);
    setFormWeekendMultiplier(2.0);
    setFormHolidayMultiplier(2.0);
    setFormNightMultiplier(1.25);
    setFormNightStart('22:00');
    setFormNightEnd('06:00');
    setFormPayrollIntegration(true);
    setIsPolicyModalOpen(true);
  };

  const openEditModal = (p: TenantOtPolicyRule) => {
    setEditingPolicyId(p.id);
    setFormName(p.policyName);
    setFormScopeLevel(p.scopeLevel);
    setFormScopeTargetId(p.scopeTargetId || '');
    setFormScopeTargetName(p.scopeTargetName || '');
    setFormEffectiveFrom(p.effectiveFrom);
    setFormEffectiveTo(p.effectiveTo || '');
    setFormDailyThreshold(p.dailyOtThresholdMinutes);
    setFormWeeklyThreshold(p.weeklyOtThresholdMinutes);
    setFormMinOtThreshold(p.minOtThresholdMinutes);
    setFormMaxOtDay(p.maxOtMinutesPerDay);
    setFormMaxOtWeek(p.maxOtMinutesPerWeek);
    setFormMonthlyStatutoryCap(p.monthlyStatutoryOtCapHours);
    setFormDayBreak(p.dayShiftBreakMinutes);
    setFormNightBreak(p.nightShiftBreakMinutes);
    setFormBreakDeductAfter(p.breakDeductionAfterMinutes);
    setFormRoundingRule(p.roundingRule);
    setFormPreShift(p.preShiftOtEnabled);
    setFormPostShift(p.postShiftOtEnabled);
    setFormRegularMultiplier(p.regularMultiplier);
    setFormWeekendMultiplier(p.weekendMultiplier);
    setFormHolidayMultiplier(p.holidayMultiplier);
    setFormNightMultiplier(p.nightMultiplier);
    setFormNightStart(p.nightWindowStart);
    setFormNightEnd(p.nightWindowEnd);
    setFormPayrollIntegration(p.payrollIntegrationEnabled);
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter a policy name.', 'error');
      return;
    }

    try {
      await tenantOvertimeEngineService.savePolicyRule(activeOrgId, {
        id: editingPolicyId || undefined,
        policyName: formName.trim(),
        policyVersion: 1,
        scopeLevel: formScopeLevel,
        scopeTargetId: formScopeTargetId.trim() || undefined,
        scopeTargetName: formScopeTargetName.trim() || undefined,
        isActive: true,
        effectiveFrom: formEffectiveFrom,
        effectiveTo: formEffectiveTo.trim() || null,
        dailyOtThresholdMinutes: formDailyThreshold,
        weeklyOtThresholdMinutes: formWeeklyThreshold,
        minOtThresholdMinutes: formMinOtThreshold,
        maxOtMinutesPerDay: formMaxOtDay,
        maxOtMinutesPerWeek: formMaxOtWeek,
        monthlyStatutoryOtCapHours: formMonthlyStatutoryCap,
        dayShiftBreakMinutes: formDayBreak,
        nightShiftBreakMinutes: formNightBreak,
        breakDeductionAfterMinutes: formBreakDeductAfter,
        roundingRule: formRoundingRule,
        preShiftOtEnabled: formPreShift,
        postShiftOtEnabled: formPostShift,
        holidayOtRule: 'OT_ONLY',
        weeklyOffOtRule: 'OT_ONLY',
        regularMultiplier: formRegularMultiplier,
        weekendMultiplier: formWeekendMultiplier,
        holidayMultiplier: formHolidayMultiplier,
        nightMultiplier: formNightMultiplier,
        nightWindowStart: formNightStart,
        nightWindowEnd: formNightEnd,
        applicableDepartments: [],
        applicableDesignations: [],
        applicableEmployeeGroups: [],
        applicableShifts: [],
        payrollIntegrationEnabled: formPayrollIntegration,
      });

      showToast(`✓ Overtime policy "${formName}" saved successfully.`);
      setIsPolicyModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save policy', 'error');
    }
  };

  const handleDeletePolicy = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete policy "${name}"?`)) {
      await tenantOvertimeEngineService.deletePolicyRule(activeOrgId, id);
      showToast(`Policy "${name}" deleted.`);
      refreshData();
    }
  };

  const currentModeInfo = MODE_DESCRIPTIONS[settings.otMode] || MODE_DESCRIPTIONS.POLICY_BASED;

  return (
    <div className="space-y-6">
      {/* Active Organization Context Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#07563D]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{orgName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black bg-${currentModeInfo.color}-50 text-${currentModeInfo.color}-700 border border-${currentModeInfo.color}-200`}>
                {currentModeInfo.badge}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tenant-scoped configuration. Rules created here apply strictly to {orgName} and never bleed across customer tenants.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Add Policy Rule
          </Button>
        </div>
      </div>

      {/* 1. Master Organization Settings Card */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              1. Organization Overtime Master Controls
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select calculation mode, approval hierarchy, and security controls for {orgName}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSaveSettings}
            isLoading={isSavingSettings}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Org Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode Selector */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-2">
            <label className="block text-xs font-bold text-gray-700">OT Calculation Mode</label>
            <select
              value={settings.otMode}
              onChange={(e) => setSettings({ ...settings, otMode: e.target.value as TenantOtMode })}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white"
            >
              <option value="POLICY_BASED">Mode A: Policy-Based OT</option>
              <option value="HR_VERIFIED">Mode B: HR-Verified OT (Fallback)</option>
              <option value="TRACKING_ONLY">Mode C: OT Tracking Only</option>
              <option value="DISABLED">Mode D: OT Disabled</option>
            </select>
            <p className="text-[11px] text-gray-500">{currentModeInfo.desc}</p>
          </div>

          {/* Approval Workflow */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-2">
            <label className="block text-xs font-bold text-gray-700">Approval Workflow</label>
            <select
              value={settings.approvalWorkflow}
              onChange={(e) => setSettings({ ...settings, approvalWorkflow: e.target.value as OtApprovalWorkflow })}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 bg-white"
            >
              <option value="HR_ONLY">HR-Only Approval</option>
              <option value="MANAGER_THEN_HR">Manager → HR Approval</option>
              <option value="DEPT_HEAD_THEN_HR">Dept Head → HR Approval</option>
              <option value="SINGLE_APPROVER">Single Authorized Approver</option>
            </select>
            <p className="text-[11px] text-gray-500">
              Deterministic workflow path enforced before records are released for payroll.
            </p>
          </div>

          {/* Self-Approval Security */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-3">
            <label className="block text-xs font-bold text-gray-700">Security &amp; Permissions</label>
            <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
              <span>Allow Self-Approval</span>
              <input
                type="checkbox"
                checked={settings.allowSelfApproval}
                onChange={(e) => setSettings({ ...settings, allowSelfApproval: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
              <span>Allow Individual Exceptions</span>
              <input
                type="checkbox"
                checked={settings.allowEmployeeExceptions}
                onChange={(e) => setSettings({ ...settings, allowEmployeeExceptions: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>

          {/* Payroll Integration */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-3">
            <label className="block text-xs font-bold text-gray-700">Payroll Integration</label>
            <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
              <span>Sync with Payroll Engine</span>
              <input
                type="checkbox"
                checked={settings.payrollIntegrationEnabled}
                onChange={(e) => setSettings({ ...settings, payrollIntegrationEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
              <span>Overtime Engine Enabled</span>
              <input
                type="checkbox"
                checked={settings.otEnabled}
                onChange={(e) => setSettings({ ...settings, otEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* 2. Hierarchical Policy Rules List */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              2. Active Overtime Policy Hierarchy ({policies.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Deterministic precedence: Employee Exception (5) &gt; Shift (4) &gt; Employee Group (3) &gt; Department (2) &gt; Org Default (1)
            </p>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-800">No Custom OT Policies Configured</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              {settings.otMode === 'POLICY_BASED'
                ? 'Because no policy is configured, Mode A is safely falling back to Mode B (HR-Verification Queue) for all employees without guessing rates.'
                : 'Configure policy rules to apply deterministic thresholds and break deductions per department, shift, or organization.'}
            </p>
            <Button size="sm" variant="primary" className="mt-4" onClick={openCreateModal}>
              Create First Policy
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((pol) => {
              const scopeColors: Record<OtPolicyScopeLevel, string> = {
                EMPLOYEE_EXCEPTION: 'purple',
                SHIFT: 'indigo',
                EMPLOYEE_GROUP: 'blue',
                DEPARTMENT: 'teal',
                ORG_DEFAULT: 'emerald',
              };
              const col = scopeColors[pol.scopeLevel] || 'gray';

              return (
                <div
                  key={pol.id}
                  className="p-5 rounded-2xl border border-gray-200/90 bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-${col}-50 text-${col}-700 border border-${col}-200`}>
                          {pol.scopeLevel.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">v{pol.policyVersion}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">{pol.policyName}</h4>
                      {pol.scopeTargetName && (
                        <p className="text-xs text-gray-500 mt-0.5">Target: {pol.scopeTargetName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(pol)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Edit policy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(pol.id, pol.policyName)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 text-gray-600">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Min Threshold</span>
                      <span className="font-bold text-gray-800">{pol.minOtThresholdMinutes} mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Daily Cap</span>
                      <span className="font-bold text-gray-800">{pol.maxOtMinutesPerDay / 60} hrs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Day / Night Break</span>
                      <span className="font-bold text-gray-800">{pol.dayShiftBreakMinutes}m / {pol.nightShiftBreakMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Rounding</span>
                      <span className="font-bold text-gray-800">{pol.roundingRule.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Regular Multiplier</span>
                      <span className="font-bold text-gray-800">{pol.regularMultiplier}x</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Effective From</span>
                      <span className="font-bold text-gray-800">{pol.effectiveFrom}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingPolicyId ? 'Edit Overtime Policy Rule' : 'Create New Overtime Policy Rule'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scoped to {orgName}. Evaluated deterministically in hierarchy.
                </p>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Policy Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                    placeholder="e.g. Manufacturing Plant 1 General Overtime Policy"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Scope Hierarchy Level</label>
                  <select
                    value={formScopeLevel}
                    onChange={(e) => setFormScopeLevel(e.target.value as OtPolicyScopeLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  >
                    <option value="ORG_DEFAULT">1. Organization Default Policy</option>
                    <option value="DEPARTMENT">2. Department-Specific Policy</option>
                    <option value="EMPLOYEE_GROUP">3. Employee-Group Policy</option>
                    <option value="SHIFT">4. Shift-Specific Policy</option>
                    <option value="EMPLOYEE_EXCEPTION">5. Employee-Specific Exception</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Scope Target Identifier (Optional)</label>
                  <input
                    type="text"
                    value={formScopeTargetName}
                    onChange={(e) => {
                      setFormScopeTargetName(e.target.value);
                      setFormScopeTargetId(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                    placeholder="e.g. Production Line B or Shift A"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Effective From Date</label>
                  <input
                    type="date"
                    required
                    value={formEffectiveFrom}
                    onChange={(e) => setFormEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Effective To Date (Optional)</label>
                  <input
                    type="date"
                    value={formEffectiveTo}
                    onChange={(e) => setFormEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Min OT Threshold (Minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formMinOtThreshold}
                    onChange={(e) => setFormMinOtThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Max Daily OT (Minutes)</label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={formMaxOtDay}
                    onChange={(e) => setFormMaxOtDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Day Shift Break Deduction (Min)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formDayBreak}
                    onChange={(e) => setFormDayBreak(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Night Shift Break Deduction (Min)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formNightBreak}
                    onChange={(e) => setFormNightBreak(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">OT Rounding Rule</label>
                  <select
                    value={formRoundingRule}
                    onChange={(e) => setFormRoundingRule(e.target.value as OtRoundingRule)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  >
                    <option value="EXACT">Exact (Unrounded)</option>
                    <option value="NEAREST_15_MIN">Nearest 15 Minutes</option>
                    <option value="NEAREST_30_MIN">Nearest 30 Minutes</option>
                    <option value="ROUND_DOWN">Round Down (30 Min Block)</option>
                    <option value="ROUND_UP">Round Up (15 Min Block)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Regular Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formRegularMultiplier}
                    onChange={(e) => setFormRegularMultiplier(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" type="button" onClick={() => setIsPolicyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
