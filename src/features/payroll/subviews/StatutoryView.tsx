import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
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
  const [simGrossMonthly, setSimGrossMonthly] = useState<number>(25000);
  const [simLopDays, setSimLopDays] = useState<number>(0);

  const subTabs = [
    { id: 'pf', label: 'EPF / PF Rules', icon: ShieldCheck },
    { id: 'esi', label: 'ESIC Medical Rules', icon: Building },
    { id: 'pt', label: 'Professional Tax (PT)', icon: Percent },
    { id: 'tds', label: 'TDS Income Tax Slabs', icon: FileCode },
    { id: 'lwf', label: 'Labour Welfare Fund (LWF)', icon: HeartHandshake },
  ];

  // Mathematical Simulator Calculation based on current live config inputs via Unified Statutory Rule Engine
  const simResult = useMemo(() => {
    const gross = simGrossMonthly || 0;
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const special = Math.max(0, gross - basic - hra);

    // LOP
    const lopDeduction = simLopDays > 0 ? Math.round((gross / 30) * simLopDays) : 0;
    const effectiveGross = Math.max(0, gross - lopDeduction);
    const effectiveBasic = Math.max(0, Math.round(effectiveGross * 0.5));

    // EPF via unified engine
    const pfEval = StatutoryRuleEngine.evaluatePF(effectiveBasic, true, true, config);
    const epfEmployee = pfEval.employee_contribution;
    const epfEmployer = pfEval.employer_pf_amount;
    const epfPensionFund = Math.round(pfEval.pf_wage * 0.0833);
    const epfEmployerDiff = Math.max(0, epfEmployer - epfPensionFund);

    // ESIC via unified engine
    const esiEval = StatutoryRuleEngine.evaluateESI(effectiveGross, 0, 'NEW_COVERAGE', config);
    const esicApplicable = esiEval.is_covered;
    const esicEmployee = esiEval.employee_contribution;
    const esicEmployer = esiEval.employer_contribution;

    // PT via unified engine
    const ptEval = StatutoryRuleEngine.evaluateProfessionalTax(effectiveGross, 'Tamil Nadu', config);
    const pt = ptEval.ptAmount;

    // LWF via unified engine
    const lwfEval = StatutoryRuleEngine.evaluateLWF('Tamil Nadu', config);
    const lwf = lwfEval.employeeContribution;
    const lwfEmployer = lwfEval.employerContribution;

    const totalEmployeeDeductions = lopDeduction + epfEmployee + esicEmployee + pt + lwf;
    const netTakeHome = Math.max(0, gross - totalEmployeeDeductions);
    const totalEmployerCost = gross + pfEval.total_employer_pf_cost + esicEmployer + (config.lwf_enabled ? lwfEmployer : 0);

    return {
      basic,
      hra,
      special,
      lopDeduction,
      epfBase: pfEval.pf_wage,
      epfEmployee,
      epfEmployer,
      epfPensionFund,
      epfEmployerDiff,
      esicApplicable,
      esicEmployee,
      esicEmployer,
      pt,
      lwf,
      totalEmployeeDeductions,
      netTakeHome,
      totalEmployerCost,
    };
  }, [config, simGrossMonthly, simLopDays]);

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
      lwf_amount: 10,
    };
    setConfig(defaultConfig);
    payrollApi.saveStatutoryConfig(defaultConfig);
    showToast('✓ Reset statutory compliance rules to EPFO & ESIC statutory defaults.');
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
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Real-Time Statutory Deduction & Payout Simulator</span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Live Flawless Math Engine
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/80 mt-0.5">
                Test any sample employee monthly wage against the active statutory rates and limits in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-semibold">Sample Gross:</span>
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

        {/* Live Calculation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Basic Pay (50%)</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">₹{simResult.basic.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-300/80 font-mono">Base for EPF</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-blue-300 block">Employee EPF ({config.pf_employee_percent || 0}%)</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">
              {config.pf_enabled ? `₹${simResult.epfEmployee.toLocaleString('en-IN')}` : 'Disabled'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Ceiling: ₹{(config.pf_wage_ceiling || 0).toLocaleString('en-IN')}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-purple-300 block">Employer EPF ({config.pf_employer_percent || 0}%)</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">
              {config.pf_enabled ? `₹${simResult.epfEmployer.toLocaleString('en-IN')}` : 'Disabled'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">EPS: ₹{simResult.epfPensionFund}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Employee ESIC ({config.esi_employee_percent || 0}%)</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">
              {simResult.esicApplicable ? `₹${simResult.esicEmployee.toLocaleString('en-IN')}` : '₹0 (Exempt)'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Limit: ≤₹{(config.esi_wage_ceiling || 0).toLocaleString('en-IN')}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-teal-300 block">Prof. Tax (PT)</span>
            <span className="font-mono font-bold text-sm text-white mt-0.5 block">
              {config.pt_enabled ? `₹${simResult.pt}` : '₹0 (Disabled)'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Monthly Deduction</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-rose-300 block">Total Deductions</span>
            <span className="font-mono font-bold text-sm text-rose-300 mt-0.5 block">₹{simResult.totalEmployeeDeductions.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400 font-mono">LOP + EPF + ESI + PT</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Net Take-Home Pay</span>
            <span className="font-mono font-black text-sm sm:text-base text-emerald-200 mt-0.5 block">
              ₹{simResult.netTakeHome.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-300/80 font-mono">100% Guaranteed Non-Negative</span>
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
                              ₹{slab.min_gross_half_year.toLocaleString('en-IN')} {slab.max_gross_half_year ? `to ₹${slab.max_gross_half_year.toLocaleString('en-IN')}` : 'and above'}
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
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Labour Welfare Fund (LWF) Rules</h3>
                <Badge variant={config.lwf_enabled ? "emerald" : "gray"}>
                  {config.lwf_enabled ? "LWF Enabled" : "LWF Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Statutory state labour welfare fund contributions (Tamil Nadu Labour Welfare Board).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Monthly Employee LWF Amount</span>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-gray-500 font-mono">₹</span>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={config.lwf_amount === 0 ? '' : config.lwf_amount}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({ ...prev, lwf_amount: val === '' ? 0 : parseFloat(val) || 0 }));
                  }}
                  disabled={!config.lwf_enabled}
                  className="w-full pl-7 pr-12 p-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-gray-500">/ mo</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Standard employee deduction for state welfare corpus fund.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-2">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Employer Contribution Matching</span>
              <div className="p-2.5 bg-white border border-gray-200 rounded-xl font-mono text-base font-bold text-gray-900">
                ₹ {((config.lwf_amount || 0) * 2)} / mo (2x Matching)
              </div>
              <p className="text-[11px] text-gray-500">
                Employer remits 2:1 ratio for Labour Welfare Fund contribution.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
