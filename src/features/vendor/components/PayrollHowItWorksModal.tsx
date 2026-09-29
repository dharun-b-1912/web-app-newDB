// src/features/vendor/components/PayrollHowItWorksModal.tsx
// ============================================================================
// Joy PeopleHR — Interactive "How It Works" 12-Step Architecture Modal
// Provides a transparent educational walkthrough of the end-to-end payroll pipeline
// ============================================================================

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Calculator,
  Users,
  Clock,
  Wallet,
  Receipt,
  Download,
  Info,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface PipelineStep {
  stepNumber: number;
  title: string;
  category: 'INGESTION' | 'POLICY' | 'CALCULATION' | 'STATUTORY' | 'VALIDATION' | 'EXPORT';
  summary: string;
  dataSource: string;
  rulesUsed: string;
  commonErrors: string;
  liveExample: string;
  icon: React.ReactNode;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    stepNumber: 1,
    title: 'Attendance Ingestion & Normalization',
    category: 'INGESTION',
    summary: 'Biometric punches and swipe logs are parsed and deduplicated into a unique (employee_id + date) grain.',
    dataSource: 'Dual Source: IN&OUT punch ledger + biometric gate registers.',
    rulesUsed: 'Multiple daily punches collapse into ONE attendance record with in/out timestamps and regular hours.',
    commonErrors: 'Missed punches, ghost shifts, and duplicate swipe rows.',
    liveExample: '1,251 normalized daily records ingested across 31 cycle days for 44 workers.',
    icon: <Clock size={16} className="text-blue-500" />,
  },
  {
    stepNumber: 2,
    title: 'Attendance Master Dataset',
    category: 'INGESTION',
    summary: 'Canonical single source of truth for all downstream reporting, reconciliation, and payroll processing.',
    dataSource: 'AttendanceMasterService (single authoritative master architecture).',
    rulesUsed: 'Period strictly bounded to 26 Aug 2026 – 25 Sep 2026; zero data drops allowed.',
    commonErrors: 'Different modules calculating their own attendance totals independently.',
    liveExample: 'Immutable master snapshot with SHA-256 integrity hash.',
    icon: <Layers size={16} className="text-indigo-500" />,
  },
  {
    stepNumber: 3,
    title: 'Cross-Source Reconciliation',
    category: 'INGESTION',
    summary: 'Compares Raw Attendance punches against Muster Roll (MR) and Overtime (OT) sheets to classify discrepancies.',
    dataSource: 'IN&OUT Sheet vs MR REPORT (44 rows) vs OT Sheet (31 rows).',
    rulesUsed: 'Classifies discrepancies into SOURCE DATA CONFLICT, POLICY DIFFERENCE, or PRESENT DAY MISMATCH.',
    commonErrors: 'Assuming Muster Roll always matches punches without verifying manager manual overrides.',
    liveExample: '42 matched, 2 verified policy variances, 0 unresolved source conflicts.',
    icon: <ShieldCheck size={16} className="text-emerald-500" />,
  },
  {
    stepNumber: 4,
    title: 'Workforce Eligibility Resolution',
    category: 'POLICY',
    summary: 'Distinguishes Contracted Roster from Active Workforce and Payable Workforce. Never drops workers silently.',
    dataSource: 'Contract Roster + Employee Master + HR Approved Leave register.',
    rulesUsed: 'Contracted (44) = Active (43) + On-Leave (1 - PRAKASH R 22300). On-leave workers are marked NOT_ELIGIBLE, not omitted.',
    commonErrors: 'Dropping on-leave workers from Excel exports, causing headcount discrepancies with HR contracts.',
    liveExample: 'PRAKASH R retained in all 11 sheets with status NOT_ELIGIBLE (Approved Extended Leave).',
    icon: <Users size={16} className="text-purple-500" />,
  },
  {
    stepNumber: 5,
    title: 'Payroll Policy Snapshot Freeze',
    category: 'POLICY',
    summary: 'Captures an immutable snapshot of all wage rules, split ratios, statutory rates, and company templates.',
    dataSource: 'WagePolicyService (versioned policy object e.g. POL-JOY-SEP2026-V2).',
    rulesUsed: 'Freezes Basic 55%, HRA 45%, OT multiplier 1.0x, PF 12%/13%, and ESI 0.75%/3.25%. Future policy edits do not change this run.',
    commonErrors: 'Changing October wage rules causing retroactive changes to approved September payroll numbers.',
    liveExample: 'Snapshot SNAP-POL-JOY-SEP2026-V2 created and locked at run initialization.',
    icon: <Receipt size={16} className="text-amber-500" />,
  },
  {
    stepNumber: 6,
    title: 'Independent Earnings Calculation',
    category: 'CALCULATION',
    summary: 'Calculates every earning component independently with explicit formula lineage and why payload.',
    dataSource: 'Reconciled Payable Days + Configured Daily Rate (Employee Master).',
    rulesUsed: 'Base Wage = D WAGE × PAY DAYS. Basic = Base × 55%. HRA = Base × 45%. Basic + HRA = Wages.',
    commonErrors: 'Hard-coding 55% in code rather than reading the active policy; silently outputting ₹0 for unconfigured rates.',
    liveExample: 'D WAGE ₹605 × 25 days = ₹15,125 Base → Basic ₹8,318.75 + HRA ₹6,806.25 = ₹15,125.00 Wages.',
    icon: <Calculator size={16} className="text-emerald-500" />,
  },
  {
    stepNumber: 7,
    title: 'Manager-Approved Overtime (OT)',
    category: 'CALCULATION',
    summary: 'Computes overtime earnings strictly using verified OT hours and hourly rate derived from daily wage.',
    dataSource: 'Master OT Matrix (1,346 total hours across 31 employees) + OT Policy.',
    rulesUsed: 'OT Hourly Rate = Daily Rate / 8 Working Hours. OT Amount = Approved OT Hours × OT Hourly Rate.',
    commonErrors: 'Using flat overtime rates without checking employee specific grade or statutory minimums.',
    liveExample: '20385 (SAKTHI S): 30 OT hrs × (₹605 / 8 = ₹75.63/hr) = ₹2,268.90.',
    icon: <Clock size={16} className="text-cyan-500" />,
  },
  {
    stepNumber: 8,
    title: 'Statutory Employee Deductions',
    category: 'STATUTORY',
    summary: 'Computes Employee PF, ESI, Professional Tax, and contractual canteen/advance deductions.',
    dataSource: 'Statutory Rules (EPFO, ESIC, State PT Slabs) + Attendance Ingestion.',
    rulesUsed: 'PF = 12% on Basic (capped at ₹15k). ESI = 0.75% on Gross (exempt if Gross > ₹21k). PT = TN Slab table.',
    commonErrors: 'Deducting ESI from employees earning > ₹21,000/month; subtracting employer contributions from employee net pay.',
    liveExample: 'Employee earning Gross ₹17,393.90: PF ₹1,000 + ESI ₹131 + PT ₹0 = ₹1,131 Total Deductions.',
    icon: <Wallet size={16} className="text-red-500" />,
  },
  {
    stepNumber: 9,
    title: 'Employer Statutory On-Costs & Billing',
    category: 'STATUTORY',
    summary: 'Calculates Employer PF (13%), Employer ESI (3.25%), and Vendor Service Charge (8%). Kept strictly separate from net pay.',
    dataSource: 'Statutory rules + Commercial Purchase Order terms.',
    rulesUsed: 'Employer PF = Basic × 13%. Employer ESI = Gross × 3.25%. Service Charge = ((Pay Days × Rate) + OT) × 8%.',
    commonErrors: 'Mixing employer costs into employee deductions, erroneously reducing employee take-home pay.',
    liveExample: 'Bull Plant 1: Regular ₹1,28,725 + OT ₹73,160 + PF 13% ₹8,729.50 + ESI 3.25% ₹3,091.56 + Svc Chg ₹15,990 = Taxable ₹2,29,696.',
    icon: <Receipt size={16} className="text-purple-500" />,
  },
  {
    stepNumber: 10,
    title: 'Net Pay Invariant Evaluation',
    category: 'CALCULATION',
    summary: 'Computes final employee take-home pay: Net Pay = Gross Earnings - Total Employee Deductions.',
    dataSource: 'Independent Earnings Sum - Independent Deductions Sum.',
    rulesUsed: 'Enforces mathematical identity: Gross - Total Deductions = Net Pay. Variance must be strictly < ₹0.05.',
    commonErrors: 'Manual rounding adjustments causing individual pay lines not to sum up to net pay.',
    liveExample: 'Gross ₹17,393.90 - Deductions ₹1,131.00 = Net Pay ₹16,262.90.',
    icon: <CheckCircle2 size={16} className="text-emerald-500" />,
  },
  {
    stepNumber: 11,
    title: 'Pre-Export Mathematical Reconciliation',
    category: 'VALIDATION',
    summary: 'Runs automated cross-checks before unlocking approval or Excel download. Blocks export on errors.',
    dataSource: 'PayrollValidationService verifying all 44 employee rows and payroll aggregates.',
    rulesUsed: 'Verifies Basic + HRA = Wages, Earnings = Gross, Deductions = Total Ded, Sum(Gross) = Run Gross, Count = 44.',
    commonErrors: 'Allowing export of payroll runs containing CALC_ERROR or unverified variances.',
    liveExample: 'All 7 invariants validated green. Pre-export clearance granted.',
    icon: <ShieldCheck size={16} className="text-emerald-600" />,
  },
  {
    stepNumber: 12,
    title: 'Dual-Format Excel Generation',
    category: 'EXPORT',
    summary: 'Produces both the Company-Specific Salary Statement (with formulas & signatures) and Master 11-Sheet Audit Pack.',
    dataSource: 'Normalized datasets + ExcelJS engine with frozen panes, color-coded sections, and Excel SUM formulas.',
    rulesUsed: 'Sheet includes every calculated component, cell formulas for auditability, and signature endorsement blocks.',
    commonErrors: 'Hard-coded values in Excel without formulas, making verification impossible for auditors.',
    liveExample: 'Generates Joy_Manpower_Salary_Statement.xlsx & 11-Sheet Master Payroll Pack.',
    icon: <Download size={16} className="text-blue-600" />,
  },
];

export function PayrollHowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = PIPELINE_STEPS[selectedStepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#063f2d] to-[#07563D] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <BookOpen size={20} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">How Payroll & Wage Calculation Works</h3>
              <p className="text-xs text-emerald-100">End-to-end transparent architecture from raw biometrics to client Excel export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Step Timeline Sidebar */}
          <div className="w-full md:w-72 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block mb-2">
              12-Stage Pipeline
            </span>
            {PIPELINE_STEPS.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              return (
                <button
                  key={step.stepNumber}
                  onClick={() => setSelectedStepIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#07563D] text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {step.stepNumber}
                  </span>
                  <span className="truncate flex-1">{step.title}</span>
                  {isSelected && <ChevronRight size={14} className="text-white shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Step Details Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  Stage {currentStep.stepNumber} of 12 · {currentStep.category}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">Joy PeopleHR Engine v2.1</span>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                {currentStep.icon}
                <span>{currentStep.title}</span>
              </h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{currentStep.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Authoritative Data Source</span>
                <p className="font-semibold text-gray-800">{currentStep.dataSource}</p>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Policy & Engine Rules</span>
                <p className="font-semibold text-gray-800">{currentStep.rulesUsed}</p>
              </div>

              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                  <AlertTriangle size={12} /> Common Pitfalls Handled
                </span>
                <p className="text-amber-900 font-medium">{currentStep.commonErrors}</p>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                  <CheckCircle2 size={12} /> Live Working Example
                </span>
                <p className="text-emerald-950 font-bold font-mono text-[11px]">{currentStep.liveExample}</p>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-gray-100">
              <button
                disabled={selectedStepIndex === 0}
                onClick={() => setSelectedStepIndex(i => Math.max(0, i - 1))}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                ← Previous Stage
              </button>
              <button
                disabled={selectedStepIndex === PIPELINE_STEPS.length - 1}
                onClick={() => setSelectedStepIndex(i => Math.min(PIPELINE_STEPS.length - 1, i + 1))}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
              >
                Next Stage →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
