import React, { useState, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Building2,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  Layers,
  HelpCircle,
  AlertTriangle,
  FileCheck,
  Zap,
  DollarSign,
  Plus,
  Trash2,
  Scale,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { SalaryStructure, SalaryComponent } from '../../../types/payroll';
import { payrollApi } from '../../../services/payrollApi';

interface IntelligentSalaryStructureBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onStructureSaved: (structure: SalaryStructure) => void;
  existingStructure?: SalaryStructure | null;
}

export const IntelligentSalaryStructureBuilder: React.FC<IntelligentSalaryStructureBuilderProps> = ({
  isOpen,
  onClose,
  onStructureSaved,
  existingStructure,
}) => {
  const { showToast } = useToast();

  // Wizard Step (1 to 7)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Step 1: Structure Profile
  const [workforceCategory, setWorkforceCategory] = useState<'manufacturing' | 'corporate' | 'contract' | 'daily' | 'custom'>(
    'manufacturing'
  );
  const [structureName, setStructureName] = useState(
    existingStructure?.name || 'Factory Monthly Staff (Industrial Plant)'
  );
  const [structureCode, setStructureCode] = useState(
    existingStructure?.code || `FACTORY_MONTHLY_01`
  );
  const [applicableGrade, setApplicableGrade] = useState(
    existingStructure?.applicable_grade || 'Worker / Grade L1 - L4'
  );
  const [payFrequency, setPayFrequency] = useState<'Monthly' | 'Daily' | 'Hourly'>('Monthly');
  const [location, setLocation] = useState('Coimbatore Plant (Unit I)');
  const [effectiveFrom, setEffectiveFrom] = useState('2026-04-01');

  // Step 2: Pay Basis & Base Amount
  const [payBasisType, setPayBasisType] = useState<'annual_ctc' | 'monthly_gross' | 'daily_wage'>('annual_ctc');
  const [annualCtcInput, setAnnualCtcInput] = useState<number>(
    existingStructure?.base_annual_ctc || 900000
  );
  const [monthlyGrossInput, setMonthlyGrossInput] = useState<number>(75000);

  // Step 3 & 4: Selected Components & Formulas
  const [basicPct, setBasicPct] = useState<number>(50); // 50% of Gross
  const [hraPct, setHraPct] = useState<number>(40); // 40% of Basic
  const [conveyanceMonthly, setConveyanceMonthly] = useState<number>(1600);
  const [foodAllowanceMonthly, setFoodAllowanceMonthly] = useState<number>(1500);
  const [includeFoodAllowance, setIncludeFoodAllowance] = useState<boolean>(true);
  const [includeNightAllowance, setIncludeNightAllowance] = useState<boolean>(true);
  const [includeOtWages, setIncludeOtWages] = useState<boolean>(true);
  const [includeAttendanceBonus, setIncludeAttendanceBonus] = useState<boolean>(true);

  // Statutory Deductions (Separate from earnings!)
  const [includePfEmployee, setIncludePfEmployee] = useState<boolean>(true);
  const [includeEsiEmployee, setIncludeEsiEmployee] = useState<boolean>(true);
  const [includePt, setIncludePt] = useState<boolean>(true);
  const [includeLwf, setIncludeLwf] = useState<boolean>(true);

  // Employer Contributions (Cost to company side)
  const [includePfEmployer, setIncludePfEmployer] = useState<boolean>(true);
  const [includeEsiEmployer, setIncludeEsiEmployer] = useState<boolean>(true);
  const [includeGratuity, setIncludeGratuity] = useState<boolean>(true);

  // Step 6: Employee Applicability
  const [assignedPayrollGroup, setAssignedPayrollGroup] = useState('Factory Workers & Technicians');
  const [assignedDepartment, setAssignedDepartment] = useState('All Plant Operations');

  // Dynamic Live Calculation Engine
  const calculations = useMemo(() => {
    const monthlyCtc = payBasisType === 'annual_ctc' ? Math.round(annualCtcInput / 12) : Math.round(monthlyGrossInput * 1.15);
    const annualCtc = monthlyCtc * 12;

    // 1. Estimate Base Gross Target
    // Employer Contributions: PF (12% of Basic or max ₹1,800), ESI (3.25% if gross <= 21k), Gratuity (~4.81% of basic)
    const estimatedGross = Math.round(monthlyCtc / 1.13);
    const basicMonthly = Math.round((estimatedGross * basicPct) / 100);
    const hraMonthly = Math.round((basicMonthly * hraPct) / 100);
    const convMonthly = conveyanceMonthly;
    const foodMonthly = includeFoodAllowance ? foodAllowanceMonthly : 0;

    // Employer Side Costs
    const erPfMonthly = includePfEmployer ? Math.round(Math.min(basicMonthly * 0.12, 1800)) : 0;
    const erEsiMonthly = includeEsiEmployer && estimatedGross <= 21000 ? Math.round(estimatedGross * 0.0325) : 0;
    const gratuityMonthly = includeGratuity ? Math.round((basicMonthly * 15) / (26 * 12)) : 0;
    const totalEmployerCost = erPfMonthly + erEsiMonthly + gratuityMonthly;

    // Employee Gross Pool = Monthly CTC - Employer Cost
    const finalMonthlyGross = Math.max(0, monthlyCtc - totalEmployerCost);

    // Residual / Balancing Component (Special Allowance)
    const fixedEarningsSum = basicMonthly + hraMonthly + convMonthly + foodMonthly;
    const specialAllowanceBalancing = Math.max(0, finalMonthlyGross - fixedEarningsSum);

    // Employee Side Deductions (PF Employee, ESI Employee, PT, LWF)
    const eePfMonthly = includePfEmployee ? Math.round(Math.min(basicMonthly * 0.12, 1800)) : 0;
    const eeEsiMonthly = includeEsiEmployee && finalMonthlyGross <= 21000 ? Math.round(finalMonthlyGross * 0.0075) : 0;
    const ptMonthly = includePt ? (finalMonthlyGross > 12500 ? 208 : 0) : 0; // Standard TN PT
    const lwfMonthly = includeLwf ? 20 : 0;
    const totalEmployeeDeductions = eePfMonthly + eeEsiMonthly + ptMonthly + lwfMonthly;

    // Net Take Home Pay
    const netTakeHomeMonthly = Math.max(0, finalMonthlyGross - totalEmployeeDeductions);

    return {
      annualCtc,
      monthlyCtc,
      finalMonthlyGross,
      basicMonthly,
      hraMonthly,
      convMonthly,
      foodMonthly,
      specialAllowanceBalancing,
      erPfMonthly,
      erEsiMonthly,
      gratuityMonthly,
      totalEmployerCost,
      eePfMonthly,
      eeEsiMonthly,
      ptMonthly,
      lwfMonthly,
      totalEmployeeDeductions,
      netTakeHomeMonthly,
      isBalanced: true,
    };
  }, [
    payBasisType,
    annualCtcInput,
    monthlyGrossInput,
    basicPct,
    hraPct,
    conveyanceMonthly,
    foodAllowanceMonthly,
    includeFoodAllowance,
    includePfEmployee,
    includeEsiEmployee,
    includePt,
    includeLwf,
    includePfEmployer,
    includeEsiEmployer,
    includeGratuity,
  ]);

  if (!isOpen) return null;

  const handlePublish = () => {
    const newStructure: SalaryStructure = {
      id: existingStructure?.id || `str-${Date.now()}`,
      tenant_id: 'org-joy-01',
      code: structureCode.toUpperCase().trim(),
      name: structureName.trim(),
      description: `${workforceCategory.toUpperCase()} salary structure for ${applicableGrade}`,
      company_id: 'org-joy-01',
      applicable_grade: applicableGrade,
      base_annual_ctc: calculations.annualCtc,
      components: [
        {
          component_id: 'cmp-basic',
          component_code: 'BASIC',
          component_name: 'Basic Wages',
          type: 'Earning',
          calculation_type: 'PercentageOfGross',
          value: basicPct,
          basis: 'Gross',
          is_taxable: true,
          statutory_flags: ['PF', 'ESI', 'PT', 'TDS'],
          display_order: 1,
        },
        {
          component_id: 'cmp-hra',
          component_code: 'HRA',
          component_name: 'House Rent Allowance',
          type: 'Earning',
          calculation_type: 'PercentageOfBasic',
          value: hraPct,
          basis: 'Basic',
          is_taxable: true,
          statutory_flags: ['PT', 'TDS'],
          display_order: 2,
        },
        {
          component_id: 'cmp-conv',
          component_code: 'CONV',
          component_name: 'Conveyance Allowance',
          type: 'Earning',
          calculation_type: 'FixedAmount',
          value: conveyanceMonthly,
          is_taxable: true,
          statutory_flags: ['TDS'],
          display_order: 3,
        },
        {
          component_id: 'cmp-spl',
          component_code: 'SPL_ALLOW',
          component_name: 'Special Allowance (Balancing)',
          type: 'Earning',
          calculation_type: 'FixedAmount',
          value: Math.round(calculations.specialAllowanceBalancing),
          is_taxable: true,
          statutory_flags: ['TDS'],
          display_order: 4,
        },
        {
          component_id: 'cmp-pf-ee',
          component_code: 'PF_EMP',
          component_name: 'Provident Fund (EPF 12%)',
          type: 'Deduction',
          calculation_type: 'PercentageOfBasic',
          value: 12,
          basis: 'Basic',
          statutory_flags: ['PF'],
          display_order: 5,
        },
        {
          component_id: 'cmp-pt',
          component_code: 'PT',
          component_name: 'Professional Tax (TN)',
          type: 'Deduction',
          calculation_type: 'FixedAmount',
          value: 208,
          statutory_flags: ['PT'],
          display_order: 6,
        },
        {
          component_id: 'cmp-pf-er',
          component_code: 'ER_PF',
          component_name: 'Employer EPF (12%)',
          type: 'Employer Contribution',
          calculation_type: 'PercentageOfBasic',
          value: 12,
          basis: 'Basic',
          statutory_flags: ['PF'],
          display_order: 7,
        },
      ],
      status: 'Active',
      version: existingStructure ? (existingStructure.version || 1) + 1 : 1,
      effective_from: effectiveFrom,
      created_at: existingStructure?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    payrollApi.saveSalaryStructure(newStructure);
    onStructureSaved(newStructure);
    showToast(`✓ Published Salary Structure: ${newStructure.name} (${newStructure.code})`);
    onClose();
  };

  const stepsList = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Pay Basis' },
    { num: 3, label: 'Components' },
    { num: 4, label: 'Formulas' },
    { num: 5, label: 'Live Breakdown' },
    { num: 6, label: 'Applicability' },
    { num: 7, label: 'Review & Publish' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header & Wizard Stepper */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#07563D] via-[#096a4b] to-[#0a7352] text-white flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 text-emerald-200">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Intelligent Salary Structure Builder
                </h2>
                <p className="text-xs text-emerald-100/85 mt-0.5">
                  Automated category-based compensation modeling with transparent formula building and live CTC balancing.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pt-2 border-t border-white/15">
            {stepsList.map(step => (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  currentStep === step.num
                    ? "bg-white text-[#07563D] shadow-md"
                    : currentStep > step.num
                    ? "bg-white/20 text-white"
                    : "text-emerald-200/70 hover:bg-white/10"
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                  {currentStep > step.num ? '✓' : step.num}
                </span>
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-gray-700">
          {/* ========================================================================= */}
          {/* STEP 1: STRUCTURE PROFILE */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 1: Tell us about this salary structure</h3>
                <p className="text-xs text-gray-500 mt-1">
                  We will recommend a starting configuration based on your workforce profile. You can customize every component before publishing.
                </p>
              </div>

              {/* Workforce Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'manufacturing', title: 'Factory / Manufacturing', desc: 'Shift staff, Overtime, Attendance bonus, Canteen' },
                  { id: 'corporate', title: 'Corporate / Office Staff', desc: 'Basic, HRA, Special allowance, TDS, Variable CTC' },
                  { id: 'contract', title: 'Contract Labour', desc: 'Daily/Monthly wage, statutory contractor registers' },
                  { id: 'daily', title: 'Daily Wage Workers', desc: 'Daily attendance punch basis, OT multipliers' },
                  { id: 'custom', title: 'Custom Organization Policy', desc: 'Define clean customized formula rules from scratch' },
                ].map(wf => (
                  <div
                    key={wf.id}
                    onClick={() => setWorkforceCategory(wf.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5",
                      workforceCategory === wf.id
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs">{wf.title}</span>
                      {workforceCategory === wf.id && <CheckCircle2 className="w-4 h-4 text-[#07563D]" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{wf.desc}</p>
                  </div>
                ))}
              </div>

              {/* Structure Profile Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-200">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Structure Display Name *</label>
                  <input
                    type="text"
                    value={structureName}
                    onChange={e => setStructureName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Structure Internal Code *</label>
                  <input
                    type="text"
                    value={structureCode}
                    onChange={e => setStructureCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Target Worker Grade / Level</label>
                  <input
                    type="text"
                    value={applicableGrade}
                    onChange={e => setApplicableGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Operating Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COMPENSATION BASIS */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 2: How do you want to define this salary?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Choose whether the starting anchor is an Annual Cost-to-Company (CTC) package, a fixed monthly gross, or a daily wage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'annual_ctc', label: 'Annual CTC (Cost to Company)', desc: 'Package includes employer PF, ESI, Gratuity & Gross salary' },
                  { id: 'monthly_gross', label: 'Monthly Gross Salary', desc: 'Earnings pool before employee deductions (Basic + Allowances)' },
                  { id: 'daily_wage', label: 'Daily Wage Rate', desc: 'Daily rate multiplied by payable attendance days' },
                ].map(b => (
                  <div
                    key={b.id}
                    onClick={() => setPayBasisType(b.id as any)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2",
                      payBasisType === b.id
                        ? "border-[#07563D] bg-emerald-50/50 shadow-xs"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-gray-900 text-xs">{b.label}</div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>

              {/* Amount Inputs with Clear Frequency Units */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                {payBasisType === 'annual_ctc' && (
                  <div className="space-y-3">
                    <label className="block text-gray-900 font-bold">
                      Enter Baseline Annual CTC Package:
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={annualCtcInput}
                          onChange={e => setAnnualCtcInput(Number(e.target.value))}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-black text-gray-900"
                        />
                      </div>
                      <span className="font-bold text-gray-600 font-mono">/ Year</span>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100/60 text-[#07563D] font-bold text-xs">
                      <Zap className="w-4 h-4 text-emerald-700" />
                      <span>Equivalent Monthly CTC Anchor: ₹ {(annualCtcInput / 12).toLocaleString('en-IN')} / month</span>
                    </div>
                  </div>
                )}

                {payBasisType === 'monthly_gross' && (
                  <div className="space-y-3">
                    <label className="block text-gray-900 font-bold">
                      Enter Baseline Monthly Gross Salary:
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={monthlyGrossInput}
                          onChange={e => setMonthlyGrossInput(Number(e.target.value))}
                          className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-mono text-base font-black text-gray-900"
                        />
                      </div>
                      <span className="font-bold text-gray-600 font-mono">/ Month</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: RECOMMENDED COMPONENTS */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 3: Recommended Components for {structureName}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  We pre-selected standard statutory rules and earnings. You can toggle optional components on or off.
                </p>
              </div>

              {/* Earnings Section */}
              <div className="space-y-3">
                <div className="font-black text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Wage & Allowance Components (Earnings)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">Basic Wages (BASIC)</div>
                      <span className="text-[11px] text-gray-500">50% of Gross (Statutory Wage Base)</span>
                    </div>
                    <Badge variant="emerald">Required</Badge>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">House Rent Allowance (HRA)</div>
                      <span className="text-[11px] text-gray-500">40% of Basic (Non-Metro)</span>
                    </div>
                    <Badge variant="emerald">Recommended</Badge>
                  </div>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Food / Canteen Allowance</div>
                      <span className="text-[11px] text-gray-500">Fixed ₹1,500 / month</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeFoodAllowance}
                      onChange={e => setIncludeFoodAllowance(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Night Shift Allowance</div>
                      <span className="text-[11px] text-gray-500">₹150 / shift punch</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeNightAllowance}
                      onChange={e => setIncludeNightAllowance(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Deductions Section (Deduction, NOT earning!) */}
              <div className="space-y-3 pt-2">
                <div className="font-black text-xs text-rose-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Employee-Side Deductions (Subtracted from Gross)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Provident Fund (EPF Employee 12%)</div>
                      <span className="text-[11px] text-gray-500">12% on Basic (Max ₹15,000 ceiling)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePfEmployee}
                      onChange={e => setIncludePfEmployee(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">ESIC Employee (0.75%)</div>
                      <span className="text-[11px] text-gray-500">0.75% of Gross (If Gross &lt;= ₹21,000)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeEsiEmployee}
                      onChange={e => setIncludeEsiEmployee(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Employer Side Cost Section */}
              <div className="space-y-3 pt-2">
                <div className="font-black text-xs text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Employer Contributions (Included in Total CTC Cost)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Employer EPF (12%)</div>
                      <span className="text-[11px] text-gray-500">3.67% EPF + 8.33% EPS</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePfEmployer}
                      onChange={e => setIncludePfEmployer(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Gratuity Provision (4.81%)</div>
                      <span className="text-[11px] text-gray-500">15/26 days per year basis</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeGratuity}
                      onChange={e => setIncludeGratuity(e.target.checked)}
                      className="accent-[#07563D] w-4 h-4 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: FORMULAS & BALANCING COMPONENT */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 4: Visual Formula Configuration</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Adjust calculation percentages and fixed amounts. The balancing component (Special Allowance) will absorb the remaining CTC.
                </p>
              </div>

              <div className="space-y-4">
                {/* Basic Formula */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">Basic Salary</div>
                    <span className="text-[11px] text-gray-500">Suggested: 50% of Gross</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={basicPct}
                      onChange={e => setBasicPct(Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                    />
                    <span className="font-bold">% of Gross</span>
                  </div>
                </div>

                {/* HRA Formula */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">House Rent Allowance (HRA)</div>
                    <span className="text-[11px] text-gray-500">Suggested: 40% (Non-Metro) or 50% (Metro) of Basic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hraPct}
                      onChange={e => setHraPct(Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                    />
                    <span className="font-bold">% of Basic</span>
                  </div>
                </div>

                {/* Conveyance */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">Conveyance Allowance</div>
                    <span className="text-[11px] text-gray-500">Fixed monthly allowance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">₹</span>
                    <input
                      type="number"
                      value={conveyanceMonthly}
                      onChange={e => setConveyanceMonthly(Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-right font-mono font-bold"
                    />
                    <span className="font-bold text-gray-500">/ month</span>
                  </div>
                </div>

                {/* Balancing Component Explainer */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-xs">
                    <Scale className="w-4 h-4 text-[#07563D]" />
                    <span>Special Allowance (Balancing Residual Component)</span>
                    <Badge variant="emerald">Auto-Balanced</Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-mono">
                    ₹ {Math.round(calculations.specialAllowanceBalancing).toLocaleString('en-IN')} = Monthly CTC (₹ {Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}) − Employer Cost (₹ {Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')}) − Fixed Earnings (₹ {Math.round(calculations.basicMonthly + calculations.hraMonthly + calculations.convMonthly + calculations.foodMonthly).toLocaleString('en-IN')})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: LIVE BREAKDOWN */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 5: Live Salary Calculation Breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete transparent reconciliation from Annual CTC down to Gross Earnings and Net Take-Home Pay.
                </p>
              </div>

              {/* 1. Visual Flow Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">1. Monthly CTC</span>
                  <span className="font-mono font-black text-xs text-gray-900 mt-0.5 block">
                    ₹{Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">2. Employer Cost</span>
                  <span className="font-mono font-black text-xs text-amber-900 mt-0.5 block">
                    -₹{Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">3. Monthly Gross</span>
                  <span className="font-mono font-black text-xs text-blue-900 mt-0.5 block">
                    = ₹{Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">4. Deductions</span>
                  <span className="font-mono font-black text-xs text-rose-900 mt-0.5 block">
                    -₹{Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-[#07563D] block">5. Net Take-Home</span>
                  <span className="font-mono font-black text-xs text-[#07563D] mt-0.5 block">
                    = ₹{Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 2. Detailed Breakdown Cards */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200 text-xs">
                {/* CTC Header */}
                <div className="p-3.5 bg-gray-50 flex justify-between items-center font-bold">
                  <span className="text-gray-700">ANNUAL COST TO COMPANY (CTC):</span>
                  <span className="text-sm font-black text-gray-900 font-mono">
                    ₹ {Math.round(calculations.annualCtc).toLocaleString('en-IN')} / year
                    <span className="text-xs font-medium text-gray-500 ml-2">(₹ {Math.round(calculations.monthlyCtc).toLocaleString('en-IN')} / mo)</span>
                  </span>
                </div>

                {/* Section A: Employer Statutory Contributions (CTC to Gross Bridge) */}
                <div className="p-4 bg-amber-50/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900 uppercase tracking-wider block font-mono text-[10px]">
                      A. Employer Statutory Contributions (Deducted from CTC Pool)
                    </span>
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                      Cost to Company Side
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {calculations.erPfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employer Provident Fund (EPF 12%):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.erPfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.erEsiMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employer ESIC Contribution (3.25%):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.erEsiMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.gratuityMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Gratuity Provision (4.81% of Basic):</span>
                        <span className="font-mono font-bold text-amber-900">₹ {Math.round(calculations.gratuityMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-amber-200/60 pt-1.5 font-black text-amber-950">
                      <span>Total Employer Contributions:</span>
                      <span className="font-mono">₹ {Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section B: Employee Monthly Gross Earnings */}
                <div className="p-4 bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 uppercase tracking-wider block font-mono text-[10px]">
                      B. Employee Monthly Gross Earnings Breakdown
                    </span>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                      CTC (₹{Math.round(calculations.monthlyCtc).toLocaleString('en-IN')}) − Employer Cost (₹{Math.round(calculations.totalEmployerCost).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    <div className="flex justify-between">
                      <span>Basic Wages (50%):</span>
                      <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.basicMonthly).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>House Rent Allowance (HRA 40%):</span>
                      <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.hraMonthly).toLocaleString('en-IN')}</span>
                    </div>
                    {calculations.convMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Conveyance Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.convMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.foodMonthly > 0 && (
                      <div className="flex justify-between">
                        <span>Food / Canteen Allowance:</span>
                        <span className="font-mono font-bold text-gray-900">₹ {Math.round(calculations.foodMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#07563D] font-semibold">
                      <span>Special Allowance (Residual Balance):</span>
                      <span className="font-mono font-bold">₹ {Math.round(calculations.specialAllowanceBalancing).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1.5 font-black text-gray-900 text-sm">
                      <span>Total Employee Monthly Gross:</span>
                      <span className="font-mono text-blue-800">₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Employee-Side Statutory Deductions */}
                <div className="p-4 bg-rose-50/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-900 uppercase tracking-wider block font-mono text-[10px]">
                      C. Employee-Side Deductions & Withholdings
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-bold">
                      Employee Pay Deductions
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {calculations.eePfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Provident Fund (EPF 12% of Basic):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.eePfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.eeEsiMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Employee ESIC (0.75% of Gross):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.eeEsiMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.ptMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Professional Tax (Tamil Nadu Slab):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.ptMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {calculations.lwfMonthly > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Labour Welfare Fund (LWF):</span>
                        <span className="font-mono font-bold text-rose-700">-₹ {Math.round(calculations.lwfMonthly).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-rose-200/60 pt-1.5 font-black text-rose-900">
                      <span>Total Employee Deductions:</span>
                      <span className="font-mono text-rose-700">-₹ {Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Section D: Net Take-Home Pay Result */}
                <div className="p-4 bg-emerald-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-black text-sm">
                  <div>
                    <span className="text-[#07563D] uppercase tracking-wide block text-xs font-black">
                      Estimated Net Monthly Take-Home:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-normal font-mono">
                      Gross (₹{Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}) − Deductions (₹{Math.round(calculations.totalEmployeeDeductions).toLocaleString('en-IN')})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#07563D] font-mono text-lg font-black block">
                      ₹ {Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-800">/ mo</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono font-normal">
                      Annual: ₹ {Math.round(calculations.netTakeHomeMonthly * 12).toLocaleString('en-IN')} / yr
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: WHO GETS THIS? */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 6: Employee Applicability</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Specify the target payroll group, department, or grade assigned to this structure.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Target Payroll Group</label>
                  <select
                    value={assignedPayrollGroup}
                    onChange={e => setAssignedPayrollGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Factory Workers & Technicians">Factory Workers & Technicians (56 Staff)</option>
                    <option value="Corporate Monthly Staff">Corporate Monthly Staff (24 Staff)</option>
                    <option value="Contract Labour Workforce">Contract Labour Workforce (40 Workers)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Applicable Department</label>
                  <input
                    type="text"
                    value={assignedDepartment}
                    onChange={e => setAssignedDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium"
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-50 text-blue-900 text-[11px] font-medium leading-relaxed">
                  ⓘ <strong>Priority Rule:</strong> Existing employee assignments will be updated for future cycles. Historical finalized payslips remain locked and unchanged.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: REVIEW & PUBLISH */}
          {/* ========================================================================= */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-gray-900">Step 7: Final Review & Publish</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Please review the structure summary before publishing to active payroll operations.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{structureName}</h4>
                    <span className="text-[11px] text-gray-500 font-mono">{structureCode} • Effective from {effectiveFrom}</span>
                  </div>
                  <Badge variant="emerald">Validation Passed ✓</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">ANNUAL CTC</span>
                    <span className="font-black text-gray-900 font-mono">₹ {Math.round(calculations.annualCtc).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">MONTHLY GROSS</span>
                    <span className="font-black text-gray-900 font-mono">₹ {Math.round(calculations.finalMonthlyGross).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">ESTIMATED NET PAY</span>
                    <span className="font-black text-[#07563D] font-mono">₹ {Math.round(calculations.netTakeHomeMonthly).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <span className="text-gray-400 font-bold block text-[10px]">TARGET WORKFORCE</span>
                    <span className="font-bold text-gray-900">{assignedPayrollGroup}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Strip */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => (prev > 1 ? ((prev - 1) as any) : prev))}
            className="text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setCurrentStep(prev => ((prev + 1) as any))}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handlePublish}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-black text-xs shadow-md"
              >
                <Check className="w-4 h-4 mr-1" /> Publish Structure
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
