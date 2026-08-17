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
  draftLastSavedText,
  isSavingDraft,
  onSaveDraft,
}) => {
  return (
    <div className="space-y-4 pb-4 border-b border-gray-100">
      {/* Top Title & Draft Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#07563D] border border-emerald-200">
              Core HR
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Step {currentStep} of {WIZARD_STEPS.length}
            </span>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight mt-1">
            Add New Employee
          </h2>
          <p className="text-xs text-gray-500">
            Create the employee profile and set up their workplace access.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {draftLastSavedText && (
            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-300" />
              {draftLastSavedText}
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="text-xs h-8 text-gray-700 bg-white hover:bg-gray-50 border-gray-200 shadow-xs"
          >
            <Save className={`w-3.5 h-3.5 mr-1.5 ${isSavingDraft ? 'animate-spin' : ''}`} />
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Progressive Step Stepper Navigation */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-center justify-between min-w-[620px] gap-2">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => onStepClick(step.number)}
                className={`flex-1 flex items-center gap-2 py-2 px-2.5 rounded-xl transition-all text-left ${
                  isCurrent
                    ? 'bg-emerald-50/80 border border-emerald-200 shadow-xs'
                    : isCompleted
                    ? 'hover:bg-gray-50 text-gray-700'
                    : 'opacity-50 hover:opacity-80 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-[#07563D] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-500'
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
    </div>
  );
};
