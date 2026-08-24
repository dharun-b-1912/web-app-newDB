import React, { useState } from 'react';
import {
  FileText,
  Calculator,
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface PayrollWorkflowStepperProps {
  currentStage?: 1 | 2 | 3 | 4 | 5 | 6;
  onNavigateStage?: (stageKey: string) => void;
  className?: string;
}

export const PayrollWorkflowStepper: React.FC<PayrollWorkflowStepperProps> = ({
  currentStage = 2,
  onNavigateStage,
  className,
}) => {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  const steps = [
    {
      stage: 1,
      id: 'inputs',
      title: '1. Time & LOP Sync',
      subtitle: 'Attendance, Overtime & LOP Inputs',
      actor: 'Attendance Admin',
      status: currentStage > 1 ? 'completed' : currentStage === 1 ? 'active' : 'upcoming',
      targetTab: 'deductions',
    },
    {
      stage: 2,
      id: 'calc',
      title: '2. Math Engine Run',
      subtitle: 'Gross, Statutory & Net Pay Calculation',
      actor: 'HR / Payroll Maker',
      status: currentStage > 2 ? 'completed' : currentStage === 2 ? 'active' : 'upcoming',
      targetTab: 'processing',
    },
    {
      stage: 3,
      id: 'approval',
      title: '3. Executive Signoff',
      subtitle: 'Review & Management Approval',
      actor: 'Finance Head',
      status: currentStage > 3 ? 'completed' : currentStage === 3 ? 'active' : 'upcoming',
      targetTab: 'processing',
    },
    {
      stage: 4,
      id: 'finalize',
      title: '4. Finalize & Lock',
      subtitle: 'Immutable Snapshot & Batch Creation',
      actor: 'HR Administrator',
      status: currentStage > 4 ? 'completed' : currentStage === 4 ? 'active' : 'upcoming',
      targetTab: 'processing',
    },
    {
      stage: 5,
      id: 'disbursement',
      title: '5. Bank Maker-Checker',
      subtitle: 'Maker Submits → Checker Approves → Bank Gateway',
      actor: 'Maker / Checker / Treasury',
      status: currentStage > 5 ? 'completed' : currentStage === 5 ? 'active' : 'upcoming',
      targetTab: 'disbursement',
    },
    {
      stage: 6,
      id: 'reconciliation',
      title: '6. Settlement & Reconcile',
      subtitle: 'Success/Fail Intake, Safe Retry & ₹0 Variance Check',
      actor: 'Finance / Treasury',
      status: currentStage === 6 ? 'active' : currentStage > 6 ? 'completed' : 'upcoming',
      targetTab: 'disbursement',
    },
  ];

  return (
    <div className={cn("bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5", className)}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-[#07563D] border border-emerald-100">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Automated Payroll & Bank Disbursement Lifecycle</span>
              <span className="text-[10px] bg-[#07563D] text-white px-2 py-0.2 rounded-full font-mono">
                Stage {currentStage} of 6
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              Strict enterprise audit trail: Attendance → Mathematical Computation → Executive Signoff → Dual-Control Maker-Checker → Settlement & Reconciliation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExplainerOpen(!isExplainerOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#07563D] hover:text-emerald-800 transition-colors cursor-pointer self-start sm:self-auto py-1 px-2.5 rounded-lg hover:bg-emerald-50"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{isExplainerOpen ? 'Hide Workflow Guide' : 'How does Maker-Checker & Reconciliation work?'}</span>
          {isExplainerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Stepper Pipeline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {steps.map(step => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';

          return (
            <div
              key={step.id}
              onClick={() => onNavigateStage && onNavigateStage(step.targetTab)}
              className={cn(
                "p-3 rounded-xl border transition-all text-left relative overflow-hidden group cursor-pointer select-none",
                isActive
                  ? "bg-gradient-to-b from-emerald-50/80 to-white border-[#07563D] shadow-xs ring-2 ring-[#07563D]/20"
                  : isCompleted
                  ? "bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/60"
                  : "bg-gray-50/50 border-gray-200/70 hover:bg-gray-50 opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 font-mono",
                  isActive
                    ? "bg-[#07563D] text-white"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.stage}
                </span>

                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  isActive
                    ? "bg-emerald-100 text-[#07563D]"
                    : isCompleted
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {isActive ? 'Current' : isCompleted ? 'Passed' : 'Upcoming'}
                </span>
              </div>

              <h4 className="text-xs font-bold text-gray-900 tracking-tight line-clamp-1">{step.title}</h4>
              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{step.subtitle}</p>

              <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                <span className="text-gray-400 font-medium">Actor:</span>
                <span className="font-semibold text-gray-700 truncate max-w-[100px]">{step.actor}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Interactive Workflow & Maker-Checker Guide */}
      {isExplainerOpen && (
        <div className="mt-3 p-4 rounded-xl bg-slate-900 text-white text-xs space-y-3.5 animate-in fade-in duration-150 border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Guide 1: Maker-Checker Dual Control */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <UserCheck className="w-4 h-4" />
                <span>1. Maker-Checker Dual Control</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Prevents unauthorized salary disbursements. The <strong>HR Maker</strong> compiles the batch, but only an authorized <strong>Finance Checker</strong> can grant execution approval. The submitter cannot approve their own batch.
              </p>
            </div>

            {/* Guide 2: Bank Gateway & Settlement */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Building2 className="w-4 h-4" />
                <span>2. Multi-Bank Payout & Formats</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Generates validated bulk disbursement files for <strong>HDFC ENet, ICICI CIB, SBI CINB, Axis iConnect, Kotak Connect & KVB</strong>. Network timeouts place batches into <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300">UNKNOWN / Verification Required</code> rather than duplicating debits.
              </p>
            </div>

            {/* Guide 3: Failed Payment Recovery & Reconciliation */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <RotateCcw className="w-4 h-4" />
                <span>3. Zero-Variance Bank Reconciliation</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                If an employee's account number or IFSC is invalid, only that record is quarantined into the <strong>Failure Recovery Desk</strong>. You can correct their details and retry without touching the 99% successful payments.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
