// src/features/people/idcard/v2/components/IdCardIssueStepper.tsx
// ============================================================================
// Stepper Navigation for Mode A: Issue Cards Flow
// ============================================================================

import React from 'react';
import { Check, LayoutTemplate, Users, ShieldCheck, Printer } from 'lucide-react';
import { IssueStep } from '../types';

interface IdCardIssueStepperProps {
  currentStep: IssueStep;
  onStepClick: (step: IssueStep) => void;
  selectedPeopleCount: number;
  warningsCount: number;
}

const STEPS: { key: IssueStep; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'template', label: '1. Choose Template', subLabel: 'Visual layout & orientation', icon: LayoutTemplate },
  { key: 'people', label: '2. Select People', subLabel: 'Target workforce', icon: Users },
  { key: 'review', label: '3. Review & Fix', subLabel: 'Preflight & print audit', icon: ShieldCheck },
  { key: 'generate', label: '4. Generate Cards', subLabel: 'PDF, sheets, or vendor print', icon: Printer },
];

export const IdCardIssueStepper: React.FC<IdCardIssueStepperProps> = ({
  currentStep,
  onStepClick,
  selectedPeopleCount,
  warningsCount,
}) => {
  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-2xs shrink-0">
      <div className="max-w-5xl mx-auto grid grid-cols-4 gap-3 sm:gap-5 items-center">
        {STEPS.map((step, idx) => {
          const isDone = idx < stepIndex;
          const isActive = idx === stepIndex;
          const StepIcon = step.icon;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepClick(step.key)}
              className={`group flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/60 shadow-2xs'
                  : isDone
                  ? 'bg-slate-50 dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isActive
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/15 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : <StepIcon className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs font-extrabold truncate ${
                      isActive
                        ? 'text-emerald-950 dark:text-emerald-200'
                        : isDone
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.key === 'people' && selectedPeopleCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 shrink-0">
                      {selectedPeopleCount}
                    </span>
                  )}
                  {step.key === 'review' && warningsCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 shrink-0">
                      {warningsCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {step.subLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

