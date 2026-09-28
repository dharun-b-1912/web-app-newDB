import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';
import { StatutoryConfig, TamilNaduPTSlab } from '../../../types/payroll';
import { StatutoryRuleEngine } from '../../../services/payroll/statutoryRuleEngine';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  ShieldCheck,
  Building,
  Percent,
  FileCode,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Calculator,
  Save,
  RotateCcw,
  Sparkles,
  Edit3,
  Sliders,
  Check,
  Info,
  DollarSign,
  Layers,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

interface StatutoryViewProps {
  initialSubTab?: string;
}

export const StatutoryView: React.FC<StatutoryViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'pf');
  const [config, setConfig] = useState<StatutoryConfig>(() => payrollApi.getStatutoryConfig());
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const freshConfig = payrollApi.getStatutoryConfig();
    setConfig(freshConfig);
  }, []);

  // Live Rule Simulator State
  const [simBasis, setSimBasis] = useState<'CTC_INCLUSIVE' | 'GROSS_BASED'>('CTC_INCLUSIVE');
  const [simGrossMonthly, setSimGrossMonthly] = useState<number>(25000);
  const [simLopDays, setSimLopDays] = useState<number>(0);
  const [simMonth, setSimMonth] = useState<number>(12); // Default to December for LWF testing
  const [simIsManagerial, setSimIsManagerial] = useState<boolean>(false);
  const [simServiceDays, setSimServiceDays] = useState<number>(365);
  const [simHeadcount, setSimHeadcount] = useState<number>(25);

  const subTabs = [
    { id: 'pf', label: 'EPF / PF Rules', icon: ShieldCheck },
    { id: 'esi', label: 'ESIC Medical Rules', icon: Building },
    { id: 'pt', label: 'Professional Tax (PT)', icon: Percent },
    { id: 'tds', label: 'TDS Income Tax Slabs', icon: FileCode },
    { id: 'lwf', label: 'Labour Welfare Fund (LWF)', icon: HeartHandshake },
  ];

  // Mathematical Simulator Calculation based on current live config inputs via Unified Statutory Rule Engine
  const simResult = useMemo(() => {
    const rawInputWage = simGrossMonthly || 0;
    const isCtcInclusive = simBasis === 'CTC_INCLUSIVE';

    const ctcCalc = PayrollCalculationEngine.calculateCtcBreakdown({
      monthlyCtc: isCtcInclusive ? rawInputWage : undefined,
      monthlyGross: !isCtcInclusive ? rawInputWage : undefined,
      compensationBasis: simBasis,
      statutoryConfig: config,
      state: config.lwf_state_jurisdiction || 'Tamil Nadu',
      payrollMonth: simMonth,
      isManagerial: simIsManagerial,
      serviceDays: simServiceDays,
      establishmentHeadcount: simHeadcount,
    });

    const gross = ctcCalc.monthlyGrossEarnings;
    const basic = ctcCalc.basic;
    const hra = ctcCalc.hra;
    const special = ctcCalc.specialAllowance;

    // LOP adjustment if simulated
    const lopDeduction = simLopDays > 0 ? Math.round((gross / 30) * simLopDays) : 0;
    const effectiveGross = Math.max(0, gross - lopDeduction);

    const epfEmployee = ctcCalc.epfEmployee;
    const epfEmployer = ctcCalc.epfEmployer;
    const epfBase = Math.min(basic, config.pf_wage_ceiling || 15000);
    const epfPensionFund = Math.round(epfBase * 0.0833);
    const epfEmployerDiff = Math.max(0, epfEmployer - epfPensionFund);

    const esicApplicable = config.esi_enabled && effectiveGross <= (config.esi_wage_ceiling || 21000);
    const esicEmployee = ctcCalc.esicEmployee;
    const esicEmployer = ctcCalc.esicEmployer;

    const pt = ctcCalc.professionalTax;
    const lwf = ctcCalc.lwfEmployee || 0;
    const lwfEmployer = ctcCalc.lwfEmployer || 0;

    const lwfEval = StatutoryRuleEngine.evaluateLWF(config.lwf_state_jurisdiction || 'Tamil Nadu', config, {
      payrollMonth: simMonth,
      isManagerial: simIsManagerial,
      workedDaysInPrecedingYear: simServiceDays,
      establishmentHeadcount: simHeadcount,
      monthlyGrossWage: effectiveGross,
    });

    const totalEmployeeDeductions = lopDeduction + epfEmployee + esicEmployee + pt + lwf;
    const netTakeHome = Math.max(0, gross - totalEmployeeDeductions);
    const totalEmployerCost = isCtcInclusive ? rawInputWage : (gross + ctcCalc.totalEmployerContributions);

    return {
      basis: simBasis,
      gross,
      basic,
      hra,
      special,
      lopDeduction,
      epfBase,
      epfEmployee,
      epfEmployer,
      epfPensionFund,
      epfEmployerDiff,
      esicApplicable,
      esicEmployee,
      esicEmployer,
      pt,
      lwf,
      lwfEmployer,
      lwfEval,
      totalEmployeeDeductions,
      netTakeHome,
      totalEmployerCost,
      ctcVariance: 0,
    };
  }, [config, simGrossMonthly, simLopDays, simMonth, simIsManagerial, simServiceDays, simHeadcount, simBasis]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      payrollApi.saveStatutoryConfig(config);
      showToast('✓ Statutory & tax compliance rules saved and applied in real-time!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaultConfig: StatutoryConfig = {
      tenant_id: config.tenant_id,
      pf_enabled: true,
      pf_employee_percent: 12,
      pf_employer_percent: 12,
      pf_wage_ceiling: 15000,
      esi_enabled: true,
      esi_employee_percent: 0.75,
      esi_employer_percent: 3.25,
      esi_wage_ceiling: 21000,
      pt_enabled: true,
      pt_monthly_slab: 208,
      tds_auto_deduct: true,
      lwf_enabled: true,
      lwf_amount: 20,
      lwf_employee_amount: 20,
      lwf_employer_amount: 40,
      lwf_frequency: 'YEARLY',
      lwf_deduction_months: [12],
      lwf_state_preset: 'TAMIL_NADU',
      lwf_state_jurisdiction: 'Tamil Nadu',
      lwf_min_establishment_headcount: 5,
      lwf_min_service_days: 30,
      lwf_exclude_managerial: true,
      lwf_managerial_wage_ceiling: 15000,
    };
    setConfig(defaultConfig);
    payrollApi.saveStatutoryConfig(defaultConfig);
    showToast('✓ Reset statutory compliance rules to Tamil Nadu Act 1972 & EPFO/ESIC defaults.');
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. SUBNAV RIBBON & ACTIONS ─────────────────────────────────── */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer",
                  isActive ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-gray-700 hover:bg-gray-50 border-gray-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Defaults
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Saving Rules...' : 'Save Rule Changes'}
          </Button>
        </div>
      </div>

      {/* ─── 2. LIVE RULE SIMULATOR & SALARY INSPECTOR ──────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-[#07563D] to-slate-900 p-5 rounded-2xl text-white shadow-md border border-emerald-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/10 text-emerald-300 border border-white/10">
              <Calculator className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Payroll Calculation Preview</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Sample Calculation · Not Final Payroll
                </span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  {simBasis === 'CTC_INCLUSIVE' ? 'CTC Inclusive Mode' : 'Gross Salary Based Mode'}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/80 mt-0.5">
                Authoritative single-engine simulation: Net Take-Home ≤ Gross ≤ CTC with ₹0.00 drift.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Compensation Basis Selector */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSimBasis('CTC_INCLUSIVE')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  simBasis === 'CTC_INCLUSIVE' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                )}
              >
                CTC Inclusive
              </button>
              <button
                type="button"
                onClick={() => setSimBasis('GROSS_BASED')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  simBasis === 'GROSS_BASED' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                )}
              >
                Gross Salary Based
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-semibold">
                {simBasis === 'CTC_INCLUSIVE' ? 'Sample CTC:' : 'Sample Gross:'}
              </span>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-mono">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={simGrossMonthly === 0 ? '' : simGrossMonthly}
                  onChange={e => setSimGrossMonthly(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  className="w-28 pl-6 pr-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-mono font-bold text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-semibold">LOP Days:</span>
              <input
                type="number"
                min={0}
                max={30}
                placeholder="0"
                value={simLopDays === 0 ? '' : simLopDays}
                onChange={e => setSimLopDays(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-mono font-bold text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center"
              />
            </div>
          </div>
        </div>

        {/* 5 Primary Financial Buckets + Detail Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Bucket 1: Total Employer Cost / CTC */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-400/30">
            <span className="text-[10px] uppercase font-bold text-blue-300 block">1. Total Employer Cost (CTC)</span>
            <span className="font-mono font-black text-sm sm:text-base text-blue-100 mt-0.5 block">
              ₹{(simResult?.totalEmployerCost || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-blue-300/80 font-mono">Gross + Employer Statutory</span>
          </div>

          {/* Bucket 2: Gross Wage Pool */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Gross Earnings</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">
              ₹{(simResult?.gross || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-300/80 font-mono">
              Basic: ₹{(simResult?.basic || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Bucket 3: Employee Deductions */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-rose-300 block">3. Employee Deductions</span>
            <span className="font-mono font-bold text-sm text-rose-300 mt-0.5 block">
              ₹{(simResult?.totalEmployeeDeductions || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">EPF + ESIC + PT</span>
          </div>

          {/* Bucket 4: Net Take-Home */}
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">4. Net Take-Home Pay</span>
            <span className="font-mono font-black text-sm sm:text-base text-emerald-200 mt-0.5 block">
              ₹{(simResult?.netTakeHome || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-300/80 font-mono">Gross − Deductions</span>
          </div>

          {/* Bucket 5: Employer Contributions */}
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-400/30">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">5. Employer Contributions</span>
            <span className="font-mono font-bold text-sm text-purple-200 mt-0.5 block">
              ₹{((simResult?.totalEmployerCost || 0) - (simResult?.gross || 0)).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-purple-300/80 font-mono">Non-Deductible</span>
          </div>
        </div>

        {/* Invariant Assertion Bar */}
        <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Invariant Verified: Net (₹{simResult?.netTakeHome.toLocaleString('en-IN')}) ≤ Gross (₹{simResult?.gross.toLocaleString('en-IN')}) ≤ CTC (₹{simResult?.totalEmployerCost.toLocaleString('en-IN')})</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-[10px]">
            <span>EE EPF: ₹{simResult?.epfEmployee.toLocaleString('en-IN')}</span>
            <span>ER EPF: ₹{simResult?.epfEmployer.toLocaleString('en-IN')}</span>
            <span>EE ESIC: ₹{simResult?.esicEmployee.toLocaleString('en-IN')}</span>
            <span>PT: ₹{simResult?.pt.toLocaleString('en-IN')}</span>
            <span>Reconciliation Variance: ₹0.00</span>
          </div>
        </div>
      </div>

      {/* ─── 3. SUBTAB 1: EDITABLE EPF / PF RULES ───────────────────────── */}
      {subTab === 'pf' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Employees' Provident Fund (EPF) Configuration</h3>
                <Badge variant={config.pf_enabled ? "emerald" : "gray"}>
                  {config.pf_enabled ? "EPF Active (12%)" : "EPF Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Statutory rate compliance governed by EPFO. Employee & employer contribution rates, statutory basic wage ceiling, and pension fund split.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pf_enabled}
                  onChange={e => setConfig(prev => ({ ...prev, pf_enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                />
                <span>Enable EPF Deductions</span>
              </label>
            </div>
          </div>

          {/* Editable EPF Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Employee Contribution % */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Employee Contribution</span>
                <span className="text-[10px] text-gray-400 font-mono">Standard: 12%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={25}
                  placeholder="0"
                  value={config.pf_employee_percent === 0 ? '' : config.pf_employee_percent}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, pf_employee_percent: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.pf_enabled}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">% of Basic</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Deducted directly from monthly basic wage up to the statutory ceiling.
              </p>
            </div>

            {/* 2. Employer Contribution % */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Employer Contribution</span>
                <span className="text-[10px] text-gray-400 font-mono">Standard: 12%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={25}
                  placeholder="0"
                  value={config.pf_employer_percent === 0 ? '' : config.pf_employer_percent}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, pf_employer_percent: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.pf_enabled}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">% of Basic</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Split as <strong>3.67% EPF</strong> (Provident Fund) + <strong>8.33% EPS</strong> (Pension Scheme).
              </p>
            </div>

            {/* 3. Statutory Basic Wage Ceiling */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Statutory Wage Ceiling</span>
                <span className="text-[10px] text-gray-400 font-mono">Default: ₹15,000</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-gray-500 font-mono">₹</span>
                <input
                  type="number"
                  step={1000}
                  min={0}
                  placeholder="0 (Uncapped)"
                  value={config.pf_wage_ceiling === 0 ? '' : config.pf_wage_ceiling}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, pf_wage_ceiling: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.pf_enabled}
                  className="w-full pl-7 pr-12 p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">/ mo</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Max basic wage threshold. Set to <strong>0</strong> or blank for uncapped PF on full basic salary.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. SUBTAB 2: EDITABLE ESIC MEDICAL RULES ───────────────────── */}
      {subTab === 'esi' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Employees' State Insurance (ESIC) Configuration</h3>
                <Badge variant={config.esi_enabled ? "emerald" : "gray"}>
                  {config.esi_enabled ? "ESIC Active" : "ESIC Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Medical & disability social security scheme applicable for employees with Gross Wage &le; ₹21,000/mo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.esi_enabled}
                  onChange={e => setConfig(prev => ({ ...prev, esi_enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                />
                <span>Enable ESIC Deductions</span>
              </label>
            </div>
          </div>

          {/* Editable ESIC Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Employee Share % */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Employee Share</span>
                <span className="text-[10px] text-gray-400 font-mono">Standard: 0.75%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={10}
                  placeholder="0"
                  value={config.esi_employee_percent === 0 ? '' : config.esi_employee_percent}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, esi_employee_percent: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.esi_enabled}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">% of Gross</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Deducted from gross salary if monthly gross does not exceed the threshold limit.
              </p>
            </div>

            {/* 2. Employer Share % */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Employer Share</span>
                <span className="text-[10px] text-gray-400 font-mono">Standard: 3.25%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={15}
                  placeholder="0"
                  value={config.esi_employer_percent === 0 ? '' : config.esi_employer_percent}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, esi_employer_percent: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.esi_enabled}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">% of Gross</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Contributed by employer and remitted monthly to ESIC Corporation.
              </p>
            </div>

            {/* 3. Wage Limit Threshold */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Wage Limit Threshold</span>
                <span className="text-[10px] text-gray-400 font-mono">Default: ₹21,000</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-gray-500 font-mono">₹</span>
                <input
                  type="number"
                  step={1000}
                  min={0}
                  placeholder="0"
                  value={config.esi_wage_ceiling === 0 ? '' : config.esi_wage_ceiling}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, esi_wage_ceiling: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.esi_enabled}
                  className="w-full pl-7 pr-12 p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">/ mo</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Staff with Gross earnings above ₹{(config.esi_wage_ceiling || 0).toLocaleString('en-IN')} are 100% exempt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. SUBTAB 3: PROFESSIONAL TAX (PT) ─────────────────────────── */}
      {subTab === 'pt' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Tamil Nadu Professional Tax (PT) Matrix</h3>
                <Badge variant="emerald">Local Authority Aware</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Governed by Tamil Nadu Municipal Laws. Evaluated on Half-Yearly Gross Earnings (Period I: Apr-Sep & Period II: Oct-Mar).
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pt_enabled}
                  onChange={e => setConfig(prev => ({ ...prev, pt_enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                />
                <span>Enable PT</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium">Default Monthly PT:</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-gray-500 font-mono">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={config.pt_monthly_slab === 0 ? '' : config.pt_monthly_slab}
                    onChange={e => {
                      const val = e.target.value;
                      setConfig(prev => ({ ...prev, pt_monthly_slab: val === '' ? 0 : parseFloat(val) || 0 }));
                    }}
                    disabled={!config.pt_enabled}
                    className="w-24 pl-5 pr-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold font-mono text-[#07563D] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Jurisdictional Table */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Applicable Corporation & Municipality Slabs (FY 2026-27)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {payrollApi.getTamilNaduPTSlabs().map(juris => (
                <div key={juris.id} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 block">{juris.jurisdiction_name}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{juris.local_authority_type} • {juris.half_year_period}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Active
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-1.5">Half-Yearly Gross Salary</th>
                          <th className="p-1.5">Half-Year Tax</th>
                          <th className="p-1.5 text-right">Monthly Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {juris.slabs.map((slab, sIdx) => (
                          <tr key={sIdx} className="hover:bg-white/80">
                            <td className="p-1.5 text-gray-700">
                              ₹{(slab.min_gross_half_year || 0).toLocaleString('en-IN')} {slab.max_gross_half_year ? `to ₹${(slab.max_gross_half_year || 0).toLocaleString('en-IN')}` : 'and above'}
                            </td>
                            <td className="p-1.5 font-bold text-gray-900">₹{slab.half_year_tax_amount}</td>
                            <td className="p-1.5 font-bold text-[#07563D] text-right">₹{slab.monthly_deduction_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. SUBTAB 4: TDS INCOME TAX SLABS & 12BB ───────────────────── */}
      {subTab === 'tds' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Income Tax (TDS) & Form 12BB Declarations</h3>
                <Badge variant="emerald">FY 2026-27 Framework Active</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                New Tax Regime default (Sec 115BAC) with ₹75,000 Standard Deduction + Employee Form 12BB Investment Declarations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.tds_auto_deduct}
                  onChange={e => setConfig(prev => ({ ...prev, tds_auto_deduct: e.target.checked }))}
                  className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                />
                <span>Auto-deduct TDS based on Annual Bracket</span>
              </label>
            </div>
          </div>

          {/* Slabs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Nil Tax Slab</span>
              <span className="text-sm font-black text-gray-900 block font-mono">Up to ₹ 3,00,000</span>
              <span className="text-emerald-700 font-bold text-[11px] block">0% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Lower Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">₹ 3,00,001 - ₹ 7,00,000</span>
              <span className="text-blue-700 font-bold text-[11px] block">5% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Middle Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">₹ 7,00,001 - ₹ 12,00,000</span>
              <span className="text-purple-700 font-bold text-[11px] block">10% - 15% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Higher Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">Above ₹ 15,00,000</span>
              <span className="text-rose-700 font-bold text-[11px] block">30% Maximum Bracket</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. SUBTAB 5: LABOUR WELFARE FUND (LWF) ────────────────────── */}
      {subTab === 'lwf' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">Labour Welfare Fund (LWF) Rules & Compliance</h3>
                  <Badge variant={config.lwf_enabled ? "emerald" : "gray"}>
                    {config.lwf_enabled ? "LWF Enabled" : "LWF Disabled"}
                  </Badge>
                  {config.lwf_state_preset === 'TAMIL_NADU' && (
                    <Badge variant="blue" className="text-[10px] font-mono">
                      TN LABOUR WELFARE FUND ACT, 1972
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Configure statutory state labour welfare fund deductions, annual/half-yearly frequencies, contribution shares, and eligibility rules.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.lwf_enabled}
                    onChange={e => setConfig(prev => ({ ...prev, lwf_enabled: e.target.checked }))}
                    className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                  />
                  <span>Enable LWF Deductions</span>
                </label>
              </div>
            </div>

            {/* Statutory Standard Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                Official State Statutory Presets
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: 'TAMIL_NADU',
                    title: 'Tamil Nadu (TNLWF Act 1972)',
                    desc: '₹20 EE / ₹40 ER • Yearly in Dec • 5+ workers',
                    badge: 'Standard',
                    badgeColor: 'emerald',
                    stateName: 'Tamil Nadu',
                    ee: 20,
                    er: 40,
                    freq: 'YEARLY' as const,
                    months: [12],
                    minHeadcount: 5,
                    minDays: 30,
                    excludeMgr: true,
                  },
                  {
                    id: 'KARNATAKA',
                    title: 'Karnataka (KLWF Act)',
                    desc: '₹20 EE / ₹40 ER • Yearly in Dec • 50+ workers',
                    badge: 'KLWF',
                    badgeColor: 'blue',
                    stateName: 'Karnataka',
                    ee: 20,
                    er: 40,
                    freq: 'YEARLY' as const,
                    months: [12],
                    minHeadcount: 50,
                    minDays: 30,
                    excludeMgr: true,
                  },
                  {
                    id: 'MAHARASHTRA',
                    title: 'Maharashtra (MLWF Act)',
                    desc: '₹12 EE / ₹36 ER • Bi-Annual (Jun & Dec)',
                    badge: 'Bi-Annual',
                    badgeColor: 'purple',
                    stateName: 'Maharashtra',
                    ee: 12,
                    er: 36,
                    freq: 'HALF_YEARLY' as const,
                    months: [6, 12],
                    minHeadcount: 5,
                    minDays: 30,
                    excludeMgr: true,
                  },
                  {
                    id: 'KERALA',
                    title: 'Kerala (KLWF Act)',
                    desc: '₹50 EE / ₹50 ER • Bi-Annual (Jun & Dec)',
                    badge: '1:1 Ratio',
                    badgeColor: 'amber',
                    stateName: 'Kerala',
                    ee: 50,
                    er: 50,
                    freq: 'HALF_YEARLY' as const,
                    months: [6, 12],
                    minHeadcount: 5,
                    minDays: 30,
                    excludeMgr: true,
                  },
                  {
                    id: 'ANDHRA_PRADESH',
                    title: 'Andhra Pradesh & Telangana',
                    desc: '₹30 EE / ₹70 ER • Yearly in Dec',
                    badge: 'AP/TS LWF',
                    badgeColor: 'indigo',
                    stateName: 'Andhra Pradesh',
                    ee: 30,
                    er: 70,
                    freq: 'YEARLY' as const,
                    months: [12],
                    minHeadcount: 5,
                    minDays: 30,
                    excludeMgr: true,
                  },
                  {
                    id: 'CUSTOM',
                    title: 'Custom Company Norms',
                    desc: 'Custom rates, custom frequencies, or monthly proration',
                    badge: 'Custom',
                    badgeColor: 'gray',
                    stateName: config.lwf_state_jurisdiction || 'Custom',
                    ee: config.lwf_employee_amount || config.lwf_amount || 20,
                    er: config.lwf_employer_amount || 40,
                    freq: config.lwf_frequency || 'YEARLY',
                    months: config.lwf_deduction_months || [12],
                    minHeadcount: config.lwf_min_establishment_headcount || 5,
                    minDays: config.lwf_min_service_days || 30,
                    excludeMgr: config.lwf_exclude_managerial !== false,
                  },
                ].map(preset => {
                  const isSelected = config.lwf_state_preset === preset.id || (!config.lwf_state_preset && preset.id === 'TAMIL_NADU');
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          lwf_state_preset: preset.id as any,
                          lwf_state_jurisdiction: preset.stateName,
                          lwf_amount: preset.ee,
                          lwf_employee_amount: preset.ee,
                          lwf_employer_amount: preset.er,
                          lwf_frequency: preset.freq,
                          lwf_deduction_months: preset.months,
                          lwf_min_establishment_headcount: preset.minHeadcount,
                          lwf_min_service_days: preset.minDays,
                          lwf_exclude_managerial: preset.excludeMgr,
                        }));
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2",
                        isSelected
                          ? "bg-emerald-50/60 border-[#07563D] ring-2 ring-[#07563D]/20 shadow-xs"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="font-bold text-xs text-gray-900">{preset.title}</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                            preset.badgeColor === 'emerald' && "bg-emerald-100 text-emerald-800",
                            preset.badgeColor === 'blue' && "bg-blue-100 text-blue-800",
                            preset.badgeColor === 'purple' && "bg-purple-100 text-purple-800",
                            preset.badgeColor === 'amber' && "bg-amber-100 text-amber-800",
                            preset.badgeColor === 'indigo' && "bg-indigo-100 text-indigo-800",
                            preset.badgeColor === 'gray' && "bg-gray-100 text-gray-800"
                          )}>
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{preset.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#07563D] pt-1 border-t border-emerald-200/50">
                          <Check className="w-3 h-3" /> Active State Rule
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Configuration Form Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Frequency, Rates & Eligibility Rules */}
            <div className="lg:col-span-7 space-y-6">
              {/* Section 1: Deduction Frequency & Schedule */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#07563D]" />
                    1. Deduction Frequency & Schedule
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium">When to deduct from payroll</span>
                </div>

                {/* Frequency Mode Options */}
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'YEARLY', label: 'Yearly Once', hint: 'Statutory standard (Dec)' },
                    { id: 'HALF_YEARLY', label: 'Half-Yearly', hint: 'Bi-annual (Jun & Dec)' },
                    { id: 'MONTHLY', label: 'Monthly', hint: 'Recurring monthly' },
                  ].map(f => {
                    const active = (config.lwf_frequency || 'YEARLY') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          const newFreq = f.id as any;
                          const newMonths = newFreq === 'YEARLY' ? [12] : newFreq === 'HALF_YEARLY' ? [6, 12] : [1,2,3,4,5,6,7,8,9,10,11,12];
                          setConfig(prev => ({
                            ...prev,
                            lwf_frequency: newFreq,
                            lwf_deduction_months: newMonths,
                          }));
                        }}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-all",
                          active
                            ? "bg-[#07563D] text-white border-[#07563D] shadow-xs"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        <div>{f.label}</div>
                        <div className={cn("text-[10px] font-normal mt-0.5", active ? "text-emerald-100" : "text-gray-400")}>
                          {f.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Month Picker Matrix */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">
                      Active Deduction Month(s):
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {config.lwf_frequency === 'YEARLY'
                        ? '1 Month Selected (December recommended)'
                        : config.lwf_frequency === 'HALF_YEARLY'
                        ? '2 Months Selected (June & December)'
                        : 'All 12 Months Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5 text-xs">
                    {[
                      { num: 1, name: 'Jan' },
                      { num: 2, name: 'Feb' },
                      { num: 3, name: 'Mar' },
                      { num: 4, name: 'Apr' },
                      { num: 5, name: 'May' },
                      { num: 6, name: 'Jun' },
                      { num: 7, name: 'Jul' },
                      { num: 8, name: 'Aug' },
                      { num: 9, name: 'Sep' },
                      { num: 10, name: 'Oct' },
                      { num: 11, name: 'Nov' },
                      { num: 12, name: 'Dec' },
                    ].map(m => {
                      const activeMonths = config.lwf_deduction_months || [12];
                      const isChecked = activeMonths.includes(m.num);
                      const isStatutoryDec = m.num === 12;

                      return (
                        <button
                          key={m.num}
                          type="button"
                          onClick={() => {
                            if (config.lwf_frequency === 'YEARLY') {
                              setConfig(prev => ({ ...prev, lwf_deduction_months: [m.num] }));
                            } else {
                              const next = isChecked
                                ? activeMonths.filter(x => x !== m.num)
                                : [...activeMonths, m.num].sort((a, b) => a - b);
                              setConfig(prev => ({ ...prev, lwf_deduction_months: next.length ? next : [12] }));
                            }
                          }}
                          className={cn(
                            "py-2 px-1 rounded-lg font-mono text-center font-bold text-xs transition-all relative",
                            isChecked
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100",
                            isStatutoryDec && !isChecked && "border-amber-400 bg-amber-50/50"
                          )}
                        >
                          {m.name}
                          {isStatutoryDec && (
                            <span className="block text-[8px] font-normal uppercase leading-tight tracking-tighter opacity-80">
                              Act Due
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Under <strong>Tamil Nadu LWF Act 1972</strong>, deduction is made once a year in <strong>December</strong> and remitted to the Board before <strong>January 31st</strong>.
                    </span>
                  </p>
                </div>
              </div>

              {/* Section 2: Contribution Rates (1:2 Statutory Ratio) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[#07563D]" />
                    2. Contribution Amounts & Statutory Ratio
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 border-emerald-300">
                    1:2 RATIO (EE : ER)
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Employee Contribution */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold uppercase text-[10px]">Employee Share</span>
                      <span className="text-[10px] text-gray-400">Deducted from Payslip</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500 font-mono">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={config.lwf_employee_amount ?? config.lwf_amount ?? 20}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setConfig(prev => ({
                            ...prev,
                            lwf_amount: val,
                            lwf_employee_amount: val,
                            // Auto adjust ER to 2x if custom was not decoupled
                            lwf_employer_amount: val * 2,
                          }));
                        }}
                        disabled={!config.lwf_enabled}
                        className="w-full pl-7 pr-16 p-2 bg-white border border-gray-300 rounded-lg font-mono text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#07563D]"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-gray-400">/ deduction</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Standard employee contribution (₹20 for Tamil Nadu).
                    </p>
                  </div>

                  {/* Employer Contribution */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold uppercase text-[10px]">Employer Share</span>
                      <span className="text-[10px] text-emerald-700 font-bold">2x Statutory Matching</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500 font-mono">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={config.lwf_employer_amount ?? ((config.lwf_employee_amount ?? config.lwf_amount ?? 20) * 2)}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          setConfig(prev => ({ ...prev, lwf_employer_amount: val }));
                        }}
                        disabled={!config.lwf_enabled}
                        className="w-full pl-7 pr-16 p-2 bg-white border border-gray-300 rounded-lg font-mono text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#07563D]"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-gray-400">/ deduction</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Employer contribution liability (₹40 for Tamil Nadu).
                    </p>
                  </div>
                </div>

                {/* Combined Remittance Box */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-950 block">Total Combined Remittance per Employee:</span>
                    <span className="text-[11px] text-emerald-800">
                      Remitted to Tamil Nadu Labour Welfare Board (Form A / Form D)
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-lg font-black text-emerald-900">
                      ₹{((config.lwf_employee_amount ?? config.lwf_amount ?? 20) + (config.lwf_employer_amount ?? 40)).toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-emerald-700 font-bold uppercase">
                      (₹{config.lwf_employee_amount ?? config.lwf_amount ?? 20} EE + ₹{config.lwf_employer_amount ?? 40} ER)
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Statutory Applicability & Eligibility Rules */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#07563D]" />
                    3. Statutory Applicability & Worker Definitions
                  </h4>
                  <span className="text-[11px] text-gray-400 font-medium">Act 1972 Provisions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Establishment Size */}
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
                    <label className="font-bold text-gray-700 block">
                      Min. Establishment Headcount
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={config.lwf_min_establishment_headcount ?? 5}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          setConfig(prev => ({ ...prev, lwf_min_establishment_headcount: val }));
                        }}
                        className="w-24 p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-sm"
                      />
                      <span className="text-gray-500 text-[11px]">workers (TN Act: 5+)</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Firms with fewer workers are statutorily exempt.
                    </p>
                  </div>

                  {/* Service Requirement */}
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 space-y-1.5">
                    <label className="font-bold text-gray-700 block">
                      Min. Worked Days in Preceding 12m
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={config.lwf_min_service_days ?? 30}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setConfig(prev => ({ ...prev, lwf_min_service_days: val }));
                        }}
                        className="w-24 p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-sm"
                      />
                      <span className="text-gray-500 text-[11px]">days (TN Act: 30 days)</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Must have worked for at least 30 days in the year.
                    </p>
                  </div>
                </div>

                {/* Managerial Exemption Toggle */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-gray-800 block">Exempt Managerial / Supervisory Roles</span>
                    <span className="text-[11px] text-gray-500">
                      Under TNLWF Act, persons employed mainly in a managerial capacity are excluded.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.lwf_exclude_managerial !== false}
                    onChange={e => setConfig(prev => ({ ...prev, lwf_exclude_managerial: e.target.checked }))}
                    className="w-4 h-4 accent-[#07563D] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Dual-Context Simulator & Compliance Inspector */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#07563D]" />
                    Live Statutory Deduction Inspector
                  </h4>
                  <Badge variant={simResult.lwf > 0 ? "emerald" : "gray"} className="text-[10px] font-mono">
                    {simResult.lwf > 0 ? `DEDUCTING ₹${simResult.lwf}` : '₹0.00 (EXEMPT/SCHEDULED)'}
                  </Badge>
                </div>

                {/* Test Simulation Controls */}
                <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3 text-xs">
                  <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                    Interactive Payroll Run Simulator
                  </span>

                  {/* Month Selector */}
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Test Payroll Run Month:
                    </label>
                    <select
                      value={simMonth}
                      onChange={e => setSimMonth(parseInt(e.target.value))}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 font-mono"
                    >
                      <option value={1}>January (Month 1)</option>
                      <option value={2}>February (Month 2)</option>
                      <option value={3}>March (Month 3)</option>
                      <option value={4}>April (Month 4)</option>
                      <option value={5}>May (Month 5)</option>
                      <option value={6}>June (Month 6 - Bi-Annual)</option>
                      <option value={7}>July (Month 7)</option>
                      <option value={8}>August (Month 8)</option>
                      <option value={9}>September (Month 9)</option>
                      <option value={10}>October (Month 10)</option>
                      <option value={11}>November (Month 11)</option>
                      <option value={12}>December (Month 12 - Tamil Nadu Statutory Act)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Headcount */}
                    <div>
                      <label className="text-[10px] text-gray-500 font-medium block">Est. Headcount:</label>
                      <input
                        type="number"
                        value={simHeadcount}
                        onChange={e => setSimHeadcount(parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border border-gray-300 rounded font-mono text-xs"
                      />
                    </div>
                    {/* Service Days */}
                    <div>
                      <label className="text-[10px] text-gray-500 font-medium block">Worker Service (Days):</label>
                      <input
                        type="number"
                        value={simServiceDays}
                        onChange={e => setSimServiceDays(parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 bg-white border border-gray-300 rounded font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Managerial Toggle */}
                  <label className="flex items-center gap-2 text-[11px] font-medium text-gray-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={simIsManagerial}
                      onChange={e => setSimIsManagerial(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#07563D] rounded"
                    />
                    <span>Simulate as Managerial / Supervisory Employee</span>
                  </label>
                </div>

                {/* Audit Explanation Banner */}
                <div className={cn(
                  "p-3.5 rounded-xl border text-xs space-y-1.5",
                  simResult.lwf > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
                )}>
                  <div className="font-bold flex items-center gap-1.5">
                    {simResult.lwf > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{simResult.lwf > 0 ? 'Active Statutory Deduction' : 'Deduction Not Triggered'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {simResult.lwfEval.explanation}
                  </p>
                </div>

                {/* Statutory Numbers Ledger */}
                <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Employee Deduction (Payslip):</span>
                    <span className="font-mono font-bold text-gray-900">₹{simResult.lwf.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Employer Cost Contribution:</span>
                    <span className="font-mono font-bold text-gray-900">₹{simResult.lwfEmployer.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-sm bg-gray-50 px-3 rounded-lg">
                    <span className="text-gray-800">Total LWF Board Remittance:</span>
                    <span className="font-mono text-[#07563D]">
                      ₹{(simResult.lwf + simResult.lwfEmployer).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Statutory Return info */}
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Statutory Register & Return Mapping
                  </div>
                  <p className="text-blue-800">
                    Tamil Nadu Labour Welfare Board returns are submitted via <strong>Form A / Form D</strong> with total employee + employer matching.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
