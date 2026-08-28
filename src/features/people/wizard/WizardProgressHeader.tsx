import React from 'react';
import { Check, Clock, Save } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface WizardStepInfo {
  number: number;
  title: string;
  shortLabel: string;
  subtitle: string;
}

export const WIZARD_STEPS: WizardStepInfo[] = [
  { number: 1, title: 'Employee Identity', shortLabel: 'Identity', subtitle: 'Basic profile & photo' },
  { number: 2, title: 'Personal & Contact', shortLabel: 'Contact', subtitle: 'Addresses & phones' },
  { number: 3, title: 'Employment Details', shortLabel: 'Employment', subtitle: 'Role, dept & terms' },
  { number: 4, title: 'Organization & Reporting', shortLabel: 'Reporting', subtitle: 'Managers & hierarchy' },
  { number: 5, title: 'Emergency & Family', shortLabel: 'Emergency', subtitle: 'Contacts & dependents' },
  { number: 6, title: 'Photo & Documents', shortLabel: 'Documents', subtitle: 'Verification files' },
  { number: 7, title: 'Review & Create', shortLabel: 'Review', subtitle: 'Final verification' },
];

interface Props {
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
  draftLastSavedText: string;
  isSavingDraft: boolean;
  onSaveDraft: () => void;
}

export const WizardProgressHeader: React.FC<Props> = ({
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center justify-between min-w-[700px] gap-2">
        {WIZARD_STEPS.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onStepClick(step.number)}
              className={`flex-1 flex items-center gap-2 py-2 px-3 rounded-xl transition-all text-left cursor-pointer border ${
                isCurrent
                  ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                  : isCompleted
                  ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                  : 'bg-gray-50/60 border-transparent text-gray-400 opacity-60'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.number}
              </div>

              <div className="min-w-0">
                <span
                  className={`block text-xs font-black truncate ${
                    isCurrent ? 'text-[#07563D]' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.shortLabel}
                </span>
                <span className="block text-[10px] text-gray-400 truncate">
                  {step.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
