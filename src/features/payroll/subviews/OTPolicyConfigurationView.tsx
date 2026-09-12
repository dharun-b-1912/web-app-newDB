// src/features/payroll/subviews/OTPolicyConfigurationView.tsx
// ============================================================================
// JOY PeopleHR — Dedicated OT Policy Configuration & Calculation Engine UI
// Dynamic Multiplier & Fixed Hourly Rate • Effective Dating • Live Pure Engine Preview
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { OTPolicyEngine } from '../../../services/payroll/otPolicyEngine';
import { OTPolicyRecord, OTCalculationMethod } from '../../../types/otPolicy';
import {
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Save,
  RotateCcw,
  Sparkles,
  History,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const OTPolicyConfigurationView: React.FC = () => {
  const { showToast } = useToast();

  // Active Policy Configuration State
  const [policyName, setPolicyName] = useState('Standard Company Overtime Policy');
  const [calculationMethod, setCalculationMethod] = useState<OTCalculationMethod>('DYNAMIC_MULTIPLIER');
  const [workingDaysDivisor, setWorkingDaysDivisor] = useState<number>(26);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(8);
  const [companyMultiplier, setCompanyMultiplier] = useState<number>(1.50);
  const [fixedHourlyRate, setFixedHourlyRate] = useState<number>(70.00);
  const [governmentMultiplier, setGovernmentMultiplier] = useState<number>(2.00);
  const [effectiveFrom, setEffectiveFrom] = useState('2026-08-01');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [changeReason, setChangeReason] = useState('Operational contract policy standardization');
  const [isSaving, setIsSaving] = useState(false);

  // Live Interactive Preview Input State
  const [previewSalary, setPreviewSalary] = useState<number>(17000);
  const [previewOtHours, setPreviewOtHours] = useState<number>(30);

  // Live Preview Calculation using the EXACT SAME OTPolicyEngine (Zero duplicate math)
  const previewResult = useMemo(() => {
    return OTPolicyEngine.calculateDedicated({
      actual_ot_hours: previewOtHours,
      monthly_salary_basis: previewSalary,
      policy_override: {
        policy_name: policyName,
        calculation_method: calculationMethod,
        working_days_divisor: workingDaysDivisor,
        working_hours_per_day: workingHoursPerDay,
        company_multiplier: calculationMethod === 'DYNAMIC_MULTIPLIER' ? companyMultiplier : undefined,
        fixed_hourly_rate: calculationMethod === 'FIXED_HOURLY_RATE' ? fixedHourlyRate : undefined,
        government_multiplier: governmentMultiplier,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
      },
    });
  }, [
    policyName,
    calculationMethod,
    workingDaysDivisor,
    workingHoursPerDay,
    companyMultiplier,
    fixedHourlyRate,
    governmentMultiplier,
    effectiveFrom,
    effectiveTo,
    previewSalary,
    previewOtHours,
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(() => OTPolicyEngine.getAuditLogs());

  // Save Policy Handler
  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const payload = {
        organization_id: 'default',
        company_id: 'default',
        policy_name: policyName,
        calculation_method: calculationMethod,
        salary_basis: 'MONTHLY_GROSS' as const,
        working_days_divisor: workingDaysDivisor,
        working_hours_per_day: workingHoursPerDay,
        company_multiplier: calculationMethod === 'DYNAMIC_MULTIPLIER' ? companyMultiplier : undefined,
        fixed_hourly_rate: calculationMethod === 'FIXED_HOURLY_RATE' ? fixedHourlyRate : undefined,
        government_calculation_method: 'DYNAMIC_MULTIPLIER' as const,
        government_multiplier: governmentMultiplier,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        status: 'ACTIVE' as const,
      };

      const result = await OTPolicyEngine.savePolicy(
        payload,
        { id: 'usr-hr-admin', name: 'HR Operations Lead' },
        changeReason
      );

      if (result.success) {
        showToast('✓ OT Policy updated and active across payroll calculation engine.');
        setAuditLogs(OTPolicyEngine.getAuditLogs());
      } else {
        showToast(result.errors?.join(' ') || 'Failed to save policy.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving policy', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-200/60">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Overtime (OT) Policy Configuration Engine</h2>
            <Badge variant="success" className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
              Authoritative Engine
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure company-level overtime calculation methods (Dynamic Multipliers or Fixed Contractual Hourly Rates).
            Actual attendance OT hours are strictly preserved, while statutory reporting values are cleanly derived.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setPolicyName('Standard Company Overtime Policy');
              setCalculationMethod('DYNAMIC_MULTIPLIER');
              setCompanyMultiplier(1.5);
              setWorkingDaysDivisor(26);
              setWorkingHoursPerDay(8);
              setGovernmentMultiplier(2.0);
              showToast('Reset configuration to default standards.');
            }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Defaults
          </Button>

          <Button
            onClick={handleSavePolicy}
            disabled={isSaving}
            size="sm"
            className="rounded-xl text-xs font-bold bg-[#07563D] hover:bg-[#064833] text-white shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Saving...' : 'Save & Activate Policy'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Policy Identity & Effective Dating */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                1. Policy Identity & Effective Scope
              </h3>
              <span className="text-[11px] font-semibold text-gray-400">Effective-Dated</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden"
                  placeholder="e.g. Standard Plant Overtime Policy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Effective From</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Effective To <span className="text-gray-400 font-normal">(Leave blank for open-ended)</span>
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  placeholder="Open-ended"
                />
              </div>
            </div>
          </div>

          {/* Calculation Method Selection */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                2. Company OT Calculation Method
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {calculationMethod}
              </Badge>
            </div>

            {/* Radio Mode Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => setCalculationMethod('DYNAMIC_MULTIPLIER')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  calculationMethod === 'DYNAMIC_MULTIPLIER'
                    ? 'border-[#07563D] bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-900">Dynamic Multiplier</span>
                  <input
                    type="radio"
                    checked={calculationMethod === 'DYNAMIC_MULTIPLIER'}
                    onChange={() => setCalculationMethod('DYNAMIC_MULTIPLIER')}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Rate derived from Monthly Salary ÷ Divisor ÷ Shift Hours × Multiplier (e.g. 1.25x, 1.50x, 2.00x).
                </p>
              </div>

              <div
                onClick={() => setCalculationMethod('FIXED_HOURLY_RATE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  calculationMethod === 'FIXED_HOURLY_RATE'
                    ? 'border-[#07563D] bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-900">Fixed Hourly Rate</span>
                  <input
                    type="radio"
                    checked={calculationMethod === 'FIXED_HOURLY_RATE'}
                    onChange={() => setCalculationMethod('FIXED_HOURLY_RATE')}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Fixed agreed contractual rate per overtime hour (e.g. ₹70.00/hr, ₹75.00/hr, or ₹100.00/hr).
                </p>
              </div>
            </div>

            {/* Parameter Inputs Based on Selected Method */}
            {calculationMethod === 'DYNAMIC_MULTIPLIER' ? (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Company OT Multiplier</label>
                    <span className="text-xs font-black font-mono text-emerald-800">{companyMultiplier.toFixed(2)}×</span>
                  </div>
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-2 mb-2">
                    {[1.25, 1.50, 2.00].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCompanyMultiplier(preset)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          companyMultiplier === preset
                            ? 'bg-[#07563D] text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {preset.toFixed(2)}×
                      </button>
                    ))}
                    <span className="text-[11px] text-gray-400 ml-1">or Custom:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="4.0"
                      value={companyMultiplier}
                      onChange={(e) => setCompanyMultiplier(parseFloat(e.target.value) || 1.0)}
                      className="w-20 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-gray-300 text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Working Days Divisor</label>
                    <select
                      value={workingDaysDivisor}
                      onChange={(e) => setWorkingDaysDivisor(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value={26}>26 Days (Factories Act Standard)</option>
                      <option value={25}>25 Days (Plant Standard)</option>
                      <option value={30}>30 Days (Calendar Month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Shift Hours Per Day</label>
                    <select
                      value={workingHoursPerDay}
                      onChange={(e) => setWorkingHoursPerDay(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value={8}>8 Hours (Standard Shift)</option>
                      <option value={9}>9 Hours (Spread-over Shift)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fixed OT Hourly Rate (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={fixedHourlyRate}
                      onChange={(e) => setFixedHourlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full text-sm font-mono font-bold pl-7 pr-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                      placeholder="70.00"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Applied directly to actual attendance overtime hours (Actual OT Hours × ₹{fixedHourlyRate.toFixed(2)}).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Government / Statutory Norms Configuration */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                3. Government / Statutory Calculation Context
              </h3>
              <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                Factories Act Sec. 59
              </Badge>
            </div>

            <p className="text-xs text-gray-500">
              Statutory registers (Form XXVI, Form XXVII) and statutory returns require a separate calculation context.
              The standard statutory overtime multiplier under Section 59 of the Factories Act 1948 is 2.0x normal hourly rate.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Government Method</label>
                <input
                  type="text"
                  disabled
                  value="Dynamic Multiplier (2.0x Statutory)"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Government Multiplier</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={governmentMultiplier}
                    onChange={(e) => setGovernmentMultiplier(parseFloat(e.target.value) || 2.0)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
                  />
                  <span className="text-xs font-bold text-gray-500">×</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason for Change / Audit Trail */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              4. Audit Trail Reason
            </h3>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Annual contract wage revision, union alignment..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-hidden"
            />
          </div>
        </div>

        {/* Right Column: Live Calculation Preview & Audit History (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Interactive Calculation Preview Card */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/30 p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Live Calculation Preview</h3>
                  <p className="text-[10px] text-gray-400">Powered by authoritative OTPolicyEngine</p>
                </div>
              </div>
              <Badge
                variant={previewResult.is_reconciled ? 'success' : 'danger'}
                className="text-[10px] font-bold uppercase"
              >
                {previewResult.is_reconciled ? '✓ Reconciled' : '⚠ Discrepancy'}
              </Badge>
            </div>

            {/* Test Inputs */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/60">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Monthly Salary</label>
                <div className="relative mt-0.5">
                  <span className="absolute left-2 top-1 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    value={previewSalary}
                    onChange={(e) => setPreviewSalary(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold pl-5 pr-2 py-1 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Actual OT Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={previewOtHours}
                  onChange={(e) => setPreviewOtHours(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>

            {/* Breakdown Output */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Base Daily Rate ({workingDaysDivisor}d):</span>
                <span className="font-mono font-semibold text-gray-800">₹{previewResult.base_daily_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Base Hourly Rate ({workingHoursPerDay}h):</span>
                <span className="font-mono font-semibold text-gray-800">₹{previewResult.base_hourly_rate.toFixed(2)}/hr</span>
              </div>

              {/* Company Context */}
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/70 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                  Company Payroll Context (Payslip & Net Pay)
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-800">Company OT Rate:</span>
                  <span className="font-mono font-bold text-emerald-900">₹{previewResult.company_ot_rate.toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-emerald-200/50">
                  <span className="font-bold text-emerald-950">Company OT Amount:</span>
                  <span className="font-mono font-black text-sm text-emerald-950">₹{previewResult.company_ot_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Government Context */}
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                  Government / Statutory Reporting Context
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-800">Govt Statutory Rate ({governmentMultiplier}x):</span>
                  <span className="font-mono font-bold text-blue-900">₹{previewResult.government_ot_rate.toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-800">Govt Equivalent OT Hours:</span>
                  <span className="font-mono font-bold text-blue-900">{previewResult.government_equivalent_ot_hours.toFixed(4)} hrs</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-blue-200/50">
                  <span className="font-bold text-blue-950">Govt Reporting Value:</span>
                  <span className="font-mono font-black text-sm text-blue-950">₹{previewResult.government_reporting_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Reconciliation Status */}
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Reconciliation Variance:</span>
                <span className="font-mono font-bold text-emerald-700">₹{previewResult.reconciliation_difference.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Attendance Authority:</strong> Actual attendance hours ({previewOtHours} hrs) are preserved in all worker records. Government equivalent hours are derived strictly for statutory representation.
              </span>
            </div>
          </div>

          {/* Audit History Log */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <History className="w-4 h-4 text-gray-500" />
              Recent Policy Revisions
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-gray-400">No revisions logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      By {log.actor_name || 'Admin'} • Method: {log.new_values.calculation_method}
                    </p>
                    {log.change_reason && (
                      <p className="text-[10px] text-gray-500 italic">"{log.change_reason}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
