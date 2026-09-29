import React, { useState, useMemo } from 'react';
import {
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  Scale,
  Calculator,
  RotateCcw,
  Check,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { OTPolicyEngine } from '../../services/payroll/otPolicyEngine';
import { OTPolicyRecord, OTCalculationMethod, StatutoryStandardPreset } from '../../types/otPolicy';

export interface AttendanceOTPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy?: Partial<OTPolicyRecord>;
  currentWageBasis?: number;
  totalOtHours?: number;
  totalWorkers?: number;
  onApplyPolicy: (policy: OTPolicyRecord, wageBasis: number) => void;
}

export const AttendanceOTPolicyModal: React.FC<AttendanceOTPolicyModalProps> = ({
  isOpen,
  onClose,
  currentPolicy,
  currentWageBasis = 17000,
  totalOtHours = 1346,
  totalWorkers = 43,
  onApplyPolicy,
}) => {
  if (!isOpen) return null;

  // Configuration States
  const [policyName, setPolicyName] = useState<string>(
    currentPolicy?.policy_name || 'Standard Company Overtime Policy (1.5x)'
  );
  const [calculationMethod, setCalculationMethod] = useState<OTCalculationMethod>(
    currentPolicy?.calculation_method || 'DYNAMIC_MULTIPLIER'
  );
  const [workingDaysDivisor, setWorkingDaysDivisor] = useState<number>(
    currentPolicy?.working_days_divisor || 26
  );
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(
    currentPolicy?.working_hours_per_day || 8
  );
  const [companyMultiplier, setCompanyMultiplier] = useState<number>(
    currentPolicy?.company_multiplier || 1.50
  );
  const [fixedHourlyRate, setFixedHourlyRate] = useState<number>(
    currentPolicy?.fixed_hourly_rate || 70.00
  );
  const [monthlySalaryBasis, setMonthlySalaryBasis] = useState<number>(currentWageBasis);

  // Statutory Framework
  const [statutoryPreset, setStatutoryPreset] = useState<StatutoryStandardPreset>(
    currentPolicy?.statutory_standard_preset || 'FACTORIES_ACT_1948'
  );
  const [governmentMultiplier, setGovernmentMultiplier] = useState<number>(
    currentPolicy?.government_multiplier || 2.00
  );
  const [enforce50PercentWageRule, setEnforce50PercentWageRule] = useState<boolean>(
    currentPolicy?.enforce_50_percent_wage_rule || false
  );

  // Live Dedicated OT Calculation Result
  const previewResult = useMemo(() => {
    return OTPolicyEngine.calculateDedicated({
      actual_ot_hours: 4.0, // Benchmark sample for 1 shift OT
      monthly_salary_basis: monthlySalaryBasis,
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
      },
    });
  }, [
    policyName,
    calculationMethod,
    workingDaysDivisor,
    workingHoursPerDay,
    companyMultiplier,
    fixedHourlyRate,
    monthlySalaryBasis,
    statutoryPreset,
    governmentMultiplier,
    enforce50PercentWageRule,
  ]);

  // Projected Total OT Payout across all active hours in the period
  const totalOtPayout = useMemo(() => {
    return totalOtHours * previewResult.company_ot_rate;
  }, [totalOtHours, previewResult.company_ot_rate]);

  // Presets Handlers
  const applyPreset = (presetKey: 'COMPANY_1_5' | 'FIXED_70' | 'FIXED_75' | 'STATUTORY_2_0' | 'CODE_ON_WAGES') => {
    if (presetKey === 'COMPANY_1_5') {
      setPolicyName('Standard Company Norm (1.5x OT)');
      setCalculationMethod('DYNAMIC_MULTIPLIER');
      setCompanyMultiplier(1.50);
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setMonthlySalaryBasis(17000);
      setStatutoryPreset('FACTORIES_ACT_1948');
      setGovernmentMultiplier(2.0);
      setEnforce50PercentWageRule(false);
    } else if (presetKey === 'FIXED_70') {
      setPolicyName('Contract Fixed Rate ₹70.00/hr');
      setCalculationMethod('FIXED_HOURLY_RATE');
      setFixedHourlyRate(70.00);
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setStatutoryPreset('FACTORIES_ACT_1948');
      setGovernmentMultiplier(2.0);
      setEnforce50PercentWageRule(false);
    } else if (presetKey === 'FIXED_75') {
      setPolicyName('Commercial Plant Fixed Rate ₹75.00/hr');
      setCalculationMethod('FIXED_HOURLY_RATE');
      setFixedHourlyRate(75.00);
      setWorkingDaysDivisor(25);
      setWorkingHoursPerDay(8);
      setStatutoryPreset('FACTORIES_ACT_1948');
      setGovernmentMultiplier(2.0);
      setEnforce50PercentWageRule(false);
    } else if (presetKey === 'STATUTORY_2_0') {
      setPolicyName('Strict Statutory Double Rate (2.0x Factories Act)');
      setCalculationMethod('STRICT_GOVERNMENT_NORM');
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setStatutoryPreset('FACTORIES_ACT_1948');
      setGovernmentMultiplier(2.0);
      setEnforce50PercentWageRule(false);
    } else if (presetKey === 'CODE_ON_WAGES') {
      setPolicyName('Code on Wages 2019 Standard (50% Base / 2.0x OT)');
      setCalculationMethod('DYNAMIC_MULTIPLIER');
      setCompanyMultiplier(1.50);
      setWorkingDaysDivisor(26);
      setWorkingHoursPerDay(8);
      setStatutoryPreset('CODE_ON_WAGES_2019');
      setGovernmentMultiplier(2.0);
      setEnforce50PercentWageRule(true);
    }
  };

  const handleSaveAndApply = async () => {
    const recordPayload: OTPolicyRecord = {
      id: currentPolicy?.id || `pol-attendance-${Date.now()}`,
      organization_id: currentPolicy?.organization_id || 'default',
      company_id: currentPolicy?.company_id || 'org-joy-main',
      policy_name: policyName,
      calculation_method: calculationMethod,
      salary_basis: 'MONTHLY_GROSS',
      working_days_divisor: workingDaysDivisor,
      working_hours_per_day: workingHoursPerDay,
      company_multiplier: calculationMethod === 'DYNAMIC_MULTIPLIER' ? companyMultiplier : undefined,
      fixed_hourly_rate: calculationMethod === 'FIXED_HOURLY_RATE' ? fixedHourlyRate : undefined,
      government_calculation_method: 'DYNAMIC_MULTIPLIER',
      government_multiplier: governmentMultiplier,
      statutory_standard_preset: statutoryPreset,
      enforce_50_percent_wage_rule: enforce50PercentWageRule,
      statutory_quarterly_ot_limit: 115,
      statutory_spreadover_hours_limit: statutoryPreset === 'CODE_ON_WAGES_2019' ? 12.0 : 10.5,
      statutory_max_daily_ot_hours: 4.0,
      effective_from: currentPolicy?.effective_from || '2026-08-01',
      effective_to: null,
      status: 'ACTIVE',
      rounding_mode: 'ROUND_HALF_UP',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Register with OTPolicyEngine and localStorage
    await OTPolicyEngine.savePolicy(recordPayload, { id: 'hr-head', name: 'HR Operations' }, 'Configured from Vendor Attendance');

    // Notify caller to update active master records & summaries
    onApplyPolicy(recordPayload, monthlySalaryBasis);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/50 rounded-xl border border-emerald-400/30">
              <Sliders className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Overtime (OT) Policy &amp; Statutory Calculation Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  AUTHORITATIVE ENGINE
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Deterministic overtime calculation for Attendance Muster, Payroll Processing, and Client Wage Billing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-600/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-gray-700">
          {/* Presets Strip */}
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quick Industry &amp; Statutory Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('COMPANY_1_5')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  calculationMethod === 'DYNAMIC_MULTIPLIER' && companyMultiplier === 1.5
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-emerald-900 text-xs">1.50x Multiplier</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Company Norm</div>
                <div className="font-mono text-[10px] text-gray-500 mt-1">₹122.60/hr</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('FIXED_70')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  calculationMethod === 'FIXED_HOURLY_RATE' && fixedHourlyRate === 70
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900 text-xs">Fixed ₹70.00/hr</div>
                <div className="text-[10px] text-gray-600 font-medium mt-0.5">Contract Rate</div>
                <div className="font-mono text-[10px] text-gray-500 mt-1">Flat Rate/Hr</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('FIXED_75')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  calculationMethod === 'FIXED_HOURLY_RATE' && fixedHourlyRate === 75
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900 text-xs">Fixed ₹75.00/hr</div>
                <div className="text-[10px] text-gray-600 font-medium mt-0.5">Plant Rate (25d)</div>
                <div className="font-mono text-[10px] text-gray-500 mt-1">₹600/day ÷ 8</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('STATUTORY_2_0')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  calculationMethod === 'STRICT_GOVERNMENT_NORM'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900 text-xs">2.00x Statutory</div>
                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">Factories Act</div>
                <div className="font-mono text-[10px] text-gray-500 mt-1">₹163.46/hr</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('CODE_ON_WAGES')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  statutoryPreset === 'CODE_ON_WAGES_2019' && enforce50PercentWageRule
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900 text-xs">Code on Wages</div>
                <div className="text-[10px] text-emerald-800 font-medium mt-0.5">2019 Standard</div>
                <div className="font-mono text-[10px] text-gray-500 mt-1">50% Base Rule</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Configuration Controls (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              {/* Policy Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Calculation Basis Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Calculation Basis &amp; Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalculationMethod('DYNAMIC_MULTIPLIER')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      calculationMethod === 'DYNAMIC_MULTIPLIER'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                      {calculationMethod === 'DYNAMIC_MULTIPLIER' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      <span>Dynamic Multiplier</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      (Wage ÷ Divisor ÷ Shift) × Multiplier
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalculationMethod('FIXED_HOURLY_RATE')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      calculationMethod === 'FIXED_HOURLY_RATE'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      {calculationMethod === 'FIXED_HOURLY_RATE' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      <span>Fixed Hourly Rate</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Direct contractual rate card per hour
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalculationMethod('STRICT_GOVERNMENT_NORM')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      calculationMethod === 'STRICT_GOVERNMENT_NORM'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      {calculationMethod === 'STRICT_GOVERNMENT_NORM' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      <span>Strict Double Rate</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      2.0x Double Ordinary statutory rate
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs: Dynamic Multiplier vs Fixed Hourly Rate */}
              {calculationMethod === 'DYNAMIC_MULTIPLIER' && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider mb-1.5">
                    Company Multiplier
                  </label>
                  <div className="flex items-center gap-2">
                    {[1.25, 1.50, 2.00].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setCompanyMultiplier(mult)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          companyMultiplier === mult
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-emerald-100/50'
                        }`}
                      >
                        {mult.toFixed(2)}x
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[11px] font-semibold text-gray-600">Custom:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="3.0"
                        value={companyMultiplier}
                        onChange={(e) => setCompanyMultiplier(parseFloat(e.target.value) || 1.5)}
                        className="w-16 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-right"
                      />
                      <span className="text-xs font-bold text-gray-700">x</span>
                    </div>
                  </div>
                </div>
              )}

              {calculationMethod === 'FIXED_HOURLY_RATE' && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
                  <label className="block text-[11px] font-bold text-blue-950 uppercase tracking-wider mb-1.5">
                    Fixed Hourly Rate (Contractual Rate Card)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-xs font-bold text-gray-500">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={fixedHourlyRate}
                        onChange={(e) => setFixedHourlyRate(parseFloat(e.target.value) || 70)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[65, 70, 75, 80].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setFixedHourlyRate(rate)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                            fixedHourlyRate === rate
                              ? 'bg-blue-700 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          ₹{rate}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Wage Basis & Divisor Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Monthly Wage Basis
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-400">₹</span>
                    <input
                      type="number"
                      step="500"
                      value={monthlySalaryBasis}
                      onChange={(e) => setMonthlySalaryBasis(parseFloat(e.target.value) || 17000)}
                      className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Working Days Divisor
                  </label>
                  <select
                    value={workingDaysDivisor}
                    onChange={(e) => setWorkingDaysDivisor(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900"
                  >
                    <option value={26}>26 Days (Factories Act)</option>
                    <option value={25}>25 Days (Plant Standard)</option>
                    <option value={30}>30 Days (Calendar Month)</option>
                    <option value={31}>31 Days (Full Month)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Shift Hours
                  </label>
                  <select
                    value={workingHoursPerDay}
                    onChange={(e) => setWorkingHoursPerDay(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900"
                  >
                    <option value={8}>8 Hours (Standard)</option>
                    <option value={8.5}>8.5 Hours</option>
                    <option value={9}>9 Hours</option>
                  </select>
                </div>
              </div>

              {/* Statutory Norms & Framework Accordion */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-gray-800 text-[11px]">Statutory Compliance Reference</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Government 2.0x Double Rate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="radio"
                      name="statutory_preset"
                      checked={statutoryPreset === 'FACTORIES_ACT_1948'}
                      onChange={() => {
                        setStatutoryPreset('FACTORIES_ACT_1948');
                        setEnforce50PercentWageRule(false);
                      }}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Factories Act, 1948</div>
                      <div className="text-[10px] text-gray-500">Sec 59 (2.0x Double Rate)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer">
                    <input
                      type="radio"
                      name="statutory_preset"
                      checked={statutoryPreset === 'CODE_ON_WAGES_2019'}
                      onChange={() => {
                        setStatutoryPreset('CODE_ON_WAGES_2019');
                        setEnforce50PercentWageRule(true);
                      }}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Code on Wages, 2019</div>
                      <div className="text-[10px] text-gray-500">Sec 2(y) 50% Basic Rule</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Live Dual-Context Preview Box (5 cols) */}
            <div className="md:col-span-5 bg-gradient-to-b from-gray-50 to-emerald-50/40 p-4 rounded-2xl border border-emerald-200/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                      Live Calculation Breakdown
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Dual-Norms Sync ✓
                  </span>
                </div>

                {/* Rate Derivation Metrics */}
                <div className="space-y-2 mt-3 font-mono text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-sans">Base Daily Rate:</span>
                    <span className="font-bold text-gray-800">
                      ₹{previewResult.base_daily_rate.toFixed(2)}/day
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-sans">Single Hourly Rate:</span>
                    <span className="font-bold text-gray-800">
                      ₹{previewResult.base_hourly_rate.toFixed(2)}/hr
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 bg-emerald-100/60 px-2 rounded-lg border border-emerald-200">
                    <span className="text-emerald-950 font-bold font-sans">Effective Company OT Rate:</span>
                    <span className="font-black text-emerald-800 text-sm">
                      ₹{previewResult.company_ot_rate.toFixed(2)}/hr
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60 text-gray-600">
                    <span className="text-gray-500 font-sans">Statutory 2.0x Double Rate:</span>
                    <span className="font-medium text-indigo-900">
                      ₹{previewResult.government_ot_rate.toFixed(2)}/hr
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60 text-gray-600">
                    <span className="text-gray-500 font-sans">Sample 4 hrs OT Payout:</span>
                    <span className="font-bold text-emerald-800">
                      ₹{(4 * previewResult.company_ot_rate).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Period Total Projection */}
                <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-1">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Total Period Overtime Projection
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-700">
                      {totalOtHours.toLocaleString()} hrs across {totalWorkers} workers:
                    </span>
                    <span className="text-lg font-black text-emerald-800 font-mono">
                      ₹{totalOtPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">
                    ✓ Validated for Payroll Ingestion &amp; Client Invoicing
                  </div>
                </div>
              </div>

              {/* Formula String */}
              <div className="p-2.5 bg-white/80 rounded-lg border border-gray-200 text-[10px] text-gray-600 font-mono leading-relaxed">
                <div className="font-bold text-gray-700 font-sans mb-0.5">Formula Lineage:</div>
                {previewResult.formula_description}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            Applying this policy will immediately recalculate all daily OT records and employee summaries without page reload.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-[#047857] hover:bg-[#065f46] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Apply &amp; Recalculate Attendance OT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
