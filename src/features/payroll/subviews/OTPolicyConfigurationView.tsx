import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { OTPolicyEngine } from '../../../services/payroll/otPolicyEngine';
import { OTPolicyRecord, OTCalculationMethod, StatutoryStandardPreset } from '../../../types/otPolicy';
import { AttendanceMasterService } from '../../../services/vendor/attendanceMasterService';
import { useAuth } from '../../../hooks/useAuth';
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
  ShieldCheck,
  Scale,
  Building2,
  Info,
  Check,
} from 'lucide-react';

export const OTPolicyConfigurationView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const activeOrgId = user?.organization_id || 'default';

  // Active Policy Configuration State
  const [policyName, setPolicyName] = useState('Standard Company Overtime Policy');
  const [calculationMethod, setCalculationMethod] = useState<OTCalculationMethod>('DYNAMIC_MULTIPLIER');
  const [workingDaysDivisor, setWorkingDaysDivisor] = useState<number>(26);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(8);
  const [companyMultiplier, setCompanyMultiplier] = useState<number>(1.50);
  const [fixedHourlyRate, setFixedHourlyRate] = useState<number>(70.00);
  
  // Government / Statutory Context State
  const [statutoryPreset, setStatutoryPreset] = useState<StatutoryStandardPreset>('FACTORIES_ACT_1948');
  const [governmentMultiplier, setGovernmentMultiplier] = useState<number>(2.00);
  const [enforce50PercentWageRule, setEnforce50PercentWageRule] = useState<boolean>(false);
  const [statutoryQuarterlyOtLimit, setStatutoryQuarterlyOtLimit] = useState<number>(115);
  const [statutorySpreadoverLimit, setStatutorySpreadoverLimit] = useState<number>(10.5);

  const [effectiveFrom, setEffectiveFrom] = useState('2026-08-01');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [changeReason, setChangeReason] = useState('Operational contract policy standardization');
  const [isSaving, setIsSaving] = useState(false);

  // Live Interactive Preview Input State
  const [previewSalary, setPreviewSalary] = useState<number>(17000);
  const [previewBasic, setPreviewBasic] = useState<number>(8500); // 50% default
  const [previewOtHours, setPreviewOtHours] = useState<number>(30);

  // Sync basic when salary changes
  const handleSalaryChange = (newSalary: number) => {
    setPreviewSalary(newSalary);
    setPreviewBasic(Math.round(newSalary * 0.5));
  };

  // Preset switch handler
  const handlePresetSelect = (preset: StatutoryStandardPreset) => {
    setStatutoryPreset(preset);
    if (preset === 'FACTORIES_ACT_1948') {
      setGovernmentMultiplier(2.0);
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setStatutoryQuarterlyOtLimit(115);
      setStatutorySpreadoverLimit(10.5);
      setEnforce50PercentWageRule(false);
      showToast('Loaded Factories Act 1948 Standard (2.0x OT, 26d/8h, 115h qtr limit)');
    } else if (preset === 'CODE_ON_WAGES_2019') {
      setGovernmentMultiplier(2.0);
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setStatutoryQuarterlyOtLimit(115);
      setStatutorySpreadoverLimit(12.0);
      setEnforce50PercentWageRule(true);
      showToast('Loaded Code on Wages 2019 Standard (50% Basic Rule, 2.0x OT, 12h Spreadover)');
    }
  };

  // Live Preview Calculation using the EXACT SAME OTPolicyEngine (Zero duplicate math)
  const previewResult = useMemo(() => {
    return OTPolicyEngine.calculateDedicated({
      actual_ot_hours: previewOtHours,
      monthly_salary_basis: previewSalary,
      basic_salary: previewBasic,
      da_amount: 0,
      allowances_amount: Math.max(0, previewSalary - previewBasic),
      organization_id: activeOrgId,
      policy_override: {
        policy_name: policyName,
        calculation_method: calculationMethod,
        working_days_divisor: workingDaysDivisor,
        working_hours_per_day: workingHoursPerDay,
        company_multiplier: calculationMethod === 'DYNAMIC_MULTIPLIER' ? companyMultiplier : undefined,
        fixed_hourly_rate: calculationMethod === 'FIXED_HOURLY_RATE' ? fixedHourlyRate : undefined,
        government_multiplier: governmentMultiplier,
        statutory_standard_preset: statutoryPreset,
        enforce_50_percent_wage_rule: enforce50PercentWageRule,
        statutory_quarterly_ot_limit: statutoryQuarterlyOtLimit,
        statutory_spreadover_hours_limit: statutorySpreadoverLimit,
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
    statutoryPreset,
    governmentMultiplier,
    enforce50PercentWageRule,
    statutoryQuarterlyOtLimit,
    statutorySpreadoverLimit,
    effectiveFrom,
    effectiveTo,
    previewSalary,
    previewBasic,
    previewOtHours,
    activeOrgId,
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(() => OTPolicyEngine.getAuditLogs());

  // Save Policy Handler
  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const payload = {
        organization_id: activeOrgId,
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
        statutory_standard_preset: statutoryPreset,
        enforce_50_percent_wage_rule: enforce50PercentWageRule,
        statutory_quarterly_ot_limit: statutoryQuarterlyOtLimit,
        statutory_spreadover_hours_limit: statutorySpreadoverLimit,
        statutory_max_daily_ot_hours: 4.0,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        status: 'ACTIVE' as const,
      };

      const result = await OTPolicyEngine.savePolicy(
        payload,
        { id: 'usr-hr-admin', name: 'HR Operations Lead' },
        changeReason
      );

      if (result.success && result.policy) {
        OTPolicyEngine.setActivePolicyId(result.policy.id);

        // Dynamically apply this policy across the Attendance Master Dataset
        const curMaster = AttendanceMasterService.getActiveMaster();
        if (curMaster) {
          AttendanceMasterService.applyOtPolicyToMaster(curMaster, result.policy, previewSalary);
        }

        // Broadcast to all open views & tabs (reconciliation table, daily attendance, payroll)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('joy_ot_policy_changed', {
              detail: { policy: result.policy, wageBasis: previewSalary },
            })
          );
        }

        const hourlyDisplay =
          result.policy.calculation_method === 'FIXED_HOURLY_RATE'
            ? `₹${result.policy.fixed_hourly_rate?.toFixed(2)}/hr`
            : `₹${previewResult.company_ot_rate.toFixed(2)}/hr (${result.policy.company_multiplier}x)`;

        showToast(`✓ OT Policy "${result.policy.policy_name}" saved & dynamically activated across all attendance & overtime registers (${hourlyDisplay})!`, 'success');
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
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Overtime (OT) & Statutory Policy Engine</h2>
            <Badge variant="success" className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
              Authoritative Engine
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure company overtime calculation models alongside Indian statutory government norms (<strong>Code on Wages 2019</strong> & <strong>Factories Act 1948</strong>).
            Guarantees strict attendance preservation, dual-context reporting, and exact reconciliation.
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
              setStatutoryPreset('FACTORIES_ACT_1948');
              setGovernmentMultiplier(2.0);
              setEnforce50PercentWageRule(false);
              setStatutoryQuarterlyOtLimit(115);
              setStatutorySpreadoverLimit(10.5);
              showToast('Reset configuration to standard defaults.');
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

          {/* Company Calculation Method Selection */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                2. Overtime Calculation Basis & Norm Selection
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {calculationMethod === 'STRICT_GOVERNMENT_NORM'
                  ? 'STRICT STATUTORY 2.0X'
                  : calculationMethod}
              </Badge>
            </div>

            <p className="text-xs text-gray-500">
              Choose how overtime is computed for worker compensation: direct government statutory compliance or contractual company rules.
            </p>

            {/* 3-Mode Radio Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Strict Government Norms */}
              <div
                onClick={() => setCalculationMethod('STRICT_GOVERNMENT_NORM')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  calculationMethod === 'STRICT_GOVERNMENT_NORM'
                    ? 'border-[#07563D] bg-emerald-50/50 shadow-xs ring-1 ring-[#07563D]/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      Strict Govt Norms
                    </span>
                    <input
                      type="radio"
                      checked={calculationMethod === 'STRICT_GOVERNMENT_NORM'}
                      onChange={() => setCalculationMethod('STRICT_GOVERNMENT_NORM')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200 mb-2">
                    Direct 2.0x Double Rate
                  </Badge>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Strict adherence to Factories Act Sec. 59 & Code on Wages Sec. 14. Overtime is paid at exactly 2.0x double hourly rate directly on payslips.
                  </p>
                </div>
              </div>

              {/* Option 2: Company Dynamic Multiplier */}
              <div
                onClick={() => setCalculationMethod('DYNAMIC_MULTIPLIER')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  calculationMethod === 'DYNAMIC_MULTIPLIER'
                    ? 'border-[#07563D] bg-emerald-50/50 shadow-xs ring-1 ring-[#07563D]/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                      Dynamic Multiplier
                    </span>
                    <input
                      type="radio"
                      checked={calculationMethod === 'DYNAMIC_MULTIPLIER'}
                      onChange={() => setCalculationMethod('DYNAMIC_MULTIPLIER')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 mb-2">
                    Company Multiplier ({companyMultiplier}x)
                  </Badge>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Rate derived from Salary ÷ Divisor ÷ Shift Hours × Multiplier (e.g. 1.25x, 1.50x). Statutory register maps equivalent hours.
                  </p>
                </div>
              </div>

              {/* Option 3: Fixed Contractual Hourly Rate */}
              <div
                onClick={() => setCalculationMethod('FIXED_HOURLY_RATE')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  calculationMethod === 'FIXED_HOURLY_RATE'
                    ? 'border-[#07563D] bg-emerald-50/50 shadow-xs ring-1 ring-[#07563D]/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      Fixed Hourly Rate
                    </span>
                    <input
                      type="radio"
                      checked={calculationMethod === 'FIXED_HOURLY_RATE'}
                      onChange={() => setCalculationMethod('FIXED_HOURLY_RATE')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-800 border-purple-200 mb-2">
                    Contractual (₹{fixedHourlyRate}/hr)
                  </Badge>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Fixed agreed contractual rate per overtime hour (e.g. ₹70/hr or ₹75/hr). Statutory register maps equivalent hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Parameter Inputs Based on Selected Method */}
            {calculationMethod === 'STRICT_GOVERNMENT_NORM' && (
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700" />
                    Strict Statutory Compliance Active
                  </span>
                  <Badge variant="success" className="bg-blue-100 text-blue-800 font-bold text-[10px]">
                    2.0x Double Ordinary Wages
                  </Badge>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Overtime is paid strictly at <strong>double the normal rate of wages (2.0x)</strong> calculated on Basic + DA (or Statutory Wage Base). Both worker payslips and statutory returns (Form XXV, XXVI, XXVII) will use the exact 2.0x rate directly with 100% 1:1 attendance preservation.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Working Days Divisor</label>
                    <select
                      value={workingDaysDivisor}
                      onChange={(e) => setWorkingDaysDivisor(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value={26}>26 Days (Factories Act Standard)</option>
                      <option value={25}>25 Days (Plant Standard)</option>
                      <option value={30}>30 Days (Calendar Month)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Shift Hours Per Day</label>
                    <select
                      value={workingHoursPerDay}
                      onChange={(e) => setWorkingHoursPerDay(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value={8}>8 Hours (Standard Shift)</option>
                      <option value={9}>9 Hours (Spread-over Shift)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {calculationMethod === 'DYNAMIC_MULTIPLIER' && (
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
            )}

            {calculationMethod === 'FIXED_HOURLY_RATE' && (
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

          {/* Government / Statutory Norms & Code on Wages Configuration */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-600" />
                3. Government Statutory Norms & Code on Wages (2019)
              </h3>
              <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200 font-bold">
                {statutoryPreset === 'CODE_ON_WAGES_2019' ? 'Code on Wages 2019' : 'Factories Act Sec. 59'}
              </Badge>
            </div>

            <p className="text-xs text-gray-500">
              Select an authoritative Indian statutory labor compliance framework for statutory registers (Form XXV, XXVI, XXVII) and returns.
            </p>

            {/* Framework Preset Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                onClick={() => handlePresetSelect('FACTORIES_ACT_1948')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  statutoryPreset === 'FACTORIES_ACT_1948'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Factories Act, 1948 Standard
                  </span>
                  {statutoryPreset === 'FACTORIES_ACT_1948' && <Check className="w-4 h-4 text-blue-600 font-bold" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  2.0x Statutory OT rate • 26 Working Days • Standard 8h shift • 115 hrs quarterly ceiling.
                </p>
              </div>

              <div
                onClick={() => handlePresetSelect('CODE_ON_WAGES_2019')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  statutoryPreset === 'CODE_ON_WAGES_2019'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    Code on Wages, 2019 Standard
                  </span>
                  {statutoryPreset === 'CODE_ON_WAGES_2019' && <Check className="w-4 h-4 text-indigo-600 font-bold" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  Sec 2(y) 50% Basic Wage rule • 2.0x Double Rate • 12h Spreadover • Deemed wage addition.
                </p>
              </div>
            </div>

            {/* Code on Wages 50% Rule Switch */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800">Enforce Code on Wages 50% Wage Rule (Sec. 2(y))</span>
                  <Badge variant="outline" className="text-[9px] bg-white text-indigo-700 border-indigo-200 font-semibold">
                    Sec 2(y) Proviso
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-500">
                  Ensures Basic + DA comprise at least 50% of Total Remuneration. Excluded allowances exceeding 50% are automatically treated as deemed wages for statutory registers.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={enforce50PercentWageRule}
                  onChange={(e) => setEnforce50PercentWageRule(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#07563D]"></div>
              </label>
            </div>

            {/* Statutory Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Govt Multiplier</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={governmentMultiplier}
                    onChange={(e) => setGovernmentMultiplier(parseFloat(e.target.value) || 2.0)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-hidden"
                  />
                  <span className="text-xs font-bold text-gray-500">×</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quarterly OT Cap</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="5"
                    min="50"
                    value={statutoryQuarterlyOtLimit}
                    onChange={(e) => setStatutoryQuarterlyOtLimit(parseInt(e.target.value, 10) || 115)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-hidden"
                  />
                  <span className="text-[11px] font-medium text-gray-500">hrs</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Daily Spreadover</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="8"
                    max="14"
                    value={statutorySpreadoverLimit}
                    onChange={(e) => setStatutorySpreadoverLimit(parseFloat(e.target.value) || 10.5)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-hidden"
                  />
                  <span className="text-[11px] font-medium text-gray-500">hrs</span>
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
              placeholder="e.g. Annual contract wage revision, union alignment, Code on Wages compliance..."
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">Live Dual-Context Preview</h3>
                  <p className="text-[10px] text-gray-400">Authoritative OTPolicyEngine & Code on Wages Inspector</p>
                </div>
              </div>
              <Badge
                variant={previewResult.is_reconciled ? 'success' : 'danger'}
                className="text-[10px] font-bold uppercase"
              >
                {previewResult.is_reconciled ? '✓ Reconciled (₹0.00)' : '⚠ Discrepancy'}
              </Badge>
            </div>

            {/* Test Inputs */}
            <div className="grid grid-cols-3 gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200/60">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Monthly Salary</label>
                <div className="relative mt-0.5">
                  <span className="absolute left-1.5 top-1 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    value={previewSalary}
                    onChange={(e) => handleSalaryChange(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold pl-4 pr-1 py-1 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Basic + DA</label>
                <div className="relative mt-0.5">
                  <span className="absolute left-1.5 top-1 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    value={previewBasic}
                    onChange={(e) => setPreviewBasic(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold pl-4 pr-1 py-1 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase">Actual OT Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={previewOtHours}
                  onChange={(e) => setPreviewOtHours(parseFloat(e.target.value) || 0)}
                  className="w-full mt-0.5 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>

            {/* Code on Wages 50% Rule Breakdown Bar */}
            {previewResult.code_on_wages && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-700 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    Code on Wages 50% Rule Status:
                  </span>
                  <Badge
                    variant={previewResult.code_on_wages.is_compliant ? 'success' : 'warning'}
                    className="text-[9px] font-bold"
                  >
                    {previewResult.code_on_wages.is_compliant ? '✓ Compliant (≥50%)' : `⚠ Excess Allowances ₹${previewResult.code_on_wages.excess_excluded_allowances}`}
                  </Badge>
                </div>

                {/* Progress bar visualizer */}
                <div className="w-full bg-amber-100 rounded-full h-2 flex overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2"
                    style={{ width: `${Math.min(100, previewResult.code_on_wages.basic_and_da_percentage)}%` }}
                    title={`Basic + DA: ${previewResult.code_on_wages.basic_and_da_percentage}%`}
                  />
                  <div
                    className="bg-amber-400 h-2"
                    style={{ width: `${Math.max(0, 100 - previewResult.code_on_wages.basic_and_da_percentage)}%` }}
                    title={`Excluded Allowances: ${previewResult.code_on_wages.excluded_allowances_percentage}%`}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>Basic: ₹{previewResult.code_on_wages.basic_and_da_amount} ({previewResult.code_on_wages.basic_and_da_percentage}%)</span>
                  <span>Allowances: ₹{previewResult.code_on_wages.excluded_allowances_amount}</span>
                </div>
              </div>
            )}

            {/* Formula Chain Breakdown Output (Formulas A through E) */}
            <div className="space-y-2.5 text-xs">
              {/* Formula A & B: Base Rate Derivation */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mb-0.5">
                    <span>Formula A: Daily Wage</span>
                    <span className="font-mono text-gray-400">₹{previewSalary} ÷ {workingDaysDivisor}d</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900">
                    ₹{previewResult.formula_a_daily_wage_rate.toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mb-0.5">
                    <span>Formula B: Base Hourly</span>
                    <span className="font-mono text-gray-400">Daily ÷ {workingHoursPerDay}h</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900">
                    ₹{previewResult.formula_b_base_hourly_rate.toFixed(2)}<span className="text-[10px] font-normal text-gray-500">/hr</span>
                  </div>
                </div>
              </div>

              {/* Formula C & D: Company Payroll Context */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Company OT Norm (Contractual Billable)
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-white text-emerald-800 border-emerald-300 font-mono">
                    {calculationMethod === 'STRICT_GOVERNMENT_NORM'
                      ? 'STRICT STATUTORY 2.0X'
                      : calculationMethod === 'DYNAMIC_MULTIPLIER'
                      ? `Formula C: ${companyMultiplier}x MULTIPLIER`
                      : `FIXED RATE (₹${fixedHourlyRate}/hr)`}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-800">Formula C — Company OT Rate:</span>
                  <span className="font-mono font-bold text-emerald-950">
                    ₹{previewResult.formula_c_company_ot_hourly_rate.toFixed(2)}/hr
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-emerald-200/60">
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-950 text-xs">Formula D — Company OT Amount:</span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      ₹{previewResult.formula_c_company_ot_hourly_rate.toFixed(2)} × {previewOtHours} approved hrs
                    </span>
                  </div>
                  <span className="font-mono font-black text-base text-emerald-950">
                    ₹{previewResult.formula_d_company_ot_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Formula E: Government / Statutory Reference Context */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                    Formula E: Statutory Reference Calculation
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-white text-blue-800 border-blue-300 font-mono">
                    {previewResult.statutory_compliance_status === 'VERIFIED_STATUTORY_CALCULATION'
                      ? '✓ Verified Calculation'
                      : 'Configured Reference'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-800">Statutory Reference Rate ({governmentMultiplier}x):</span>
                  <span className="font-mono font-bold text-blue-950">
                    ₹{previewResult.formula_e_statutory_reference_rate.toFixed(2)}/hr
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-800">Statutory Reference OT Amount:</span>
                  <span className="font-mono font-bold text-blue-950">
                    ₹{previewResult.formula_e_statutory_reference_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-blue-200/60">
                  <span className="text-blue-900 font-medium">Govt Equivalent OT Hours:</span>
                  <span className="font-mono font-bold text-blue-950">
                    {previewResult.government_equivalent_ot_hours.toFixed(4)} hrs
                  </span>
                </div>
              </div>

              {/* Compliance & Audit Limits Bar */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                    Statutory Compliance & Caps Audit
                  </span>
                  <span className="text-slate-500 font-normal">
                    {statutoryPreset === 'CODE_ON_WAGES_2019' ? 'Code on Wages 2019' : 'Factories Act 1948'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center justify-between bg-white px-2 py-1 rounded-md border border-slate-200">
                    <span className="text-slate-600">Quarterly OT Cap:</span>
                    <Badge variant={previewResult.compliance_audit.is_quarterly_cap_compliant ? 'success' : 'danger'} className="text-[9px] py-0 px-1 font-mono">
                      {previewOtHours}h / {previewResult.compliance_audit.statutory_quarterly_ot_limit}h max
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-white px-2 py-1 rounded-md border border-slate-200">
                    <span className="text-slate-600">Daily Spread Limit:</span>
                    <Badge variant={previewResult.compliance_audit.is_daily_spread_compliant ? 'success' : 'warning'} className="text-[9px] py-0 px-1 font-mono">
                      {previewResult.compliance_audit.observed_daily_spread_hours}h / {previewResult.compliance_audit.statutory_spreadover_hours_limit}h
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Reconciliation Status */}
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Reconciliation Variance:</span>
                <span className="font-mono font-bold text-emerald-700">₹{previewResult.reconciliation_difference.toFixed(2)} (Exact Match)</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Audit Trace:</strong> Every calculation snapshot preserves policy version (<code>{previewResult.immutable_snapshot.version}</code>),
                effective from <code>{previewResult.immutable_snapshot.effective_from}</code>, wage base (₹{previewSalary}),
                divisor ({workingDaysDivisor}d), hours/day ({workingHoursPerDay}h), multiplier ({companyMultiplier}x), and approved OT ({previewOtHours}h).
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

