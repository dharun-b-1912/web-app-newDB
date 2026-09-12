import React from 'react';
import { Check, ChevronRight, Play, AlertCircle, Circle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { PayrollStageKey } from './PayrollContextBar';

export interface StepperStep {
  key: PayrollStageKey;
  label: string;
  tabTarget: string;
  number: number;
}

const STAGES: StepperStep[] = [
  { key: 'prepare', label: 'Prepare', tabTarget: 'dashboard', number: 1 },
  { key: 'validate', label: 'Check', tabTarget: 'dashboard', number: 2 },
  { key: 'calculate', label: 'Calculate', tabTarget: 'processing', number: 3 },
  { key: 'review', label: 'Review', tabTarget: 'processing', number: 4 },
  { key: 'approve', label: 'Approve', tabTarget: 'processing', number: 5 },
  { key: 'lock', label: 'Lock', tabTarget: 'processing', number: 6 },
  { key: 'disburse', label: 'Pay', tabTarget: 'disbursement', number: 7 },
  { key: 'publish', label: 'Publish', tabTarget: 'documents', number: 8 },
  { key: 'report', label: 'Report', tabTarget: 'reports', number: 9 },
];

interface PayrollWorkflowStepperProps {
  currentStage: PayrollStageKey;
  onNavigateTab?: (tabKey: string) => void;
  className?: string;
}

export const PayrollWorkflowStepper: React.FC<PayrollWorkflowStepperProps> = ({
  currentStage = 'calculate',
  onNavigateTab,
  className,
}) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const activeIdx = currentIndex >= 0 ? currentIndex : 2; // default to calculate

  return (
    <div
      className={cn(
        'w-full bg-white rounded-2xl border border-gray-200/90 shadow-2xs px-4 py-2.5 flex items-center overflow-x-auto no-scrollbar scrollbar-none scroll-smooth select-none',
        className
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      onWheel={(e) => {
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY * 0.9;
        }
      }}
    >
      <div className="flex items-center gap-1.5 min-w-max mx-auto lg:mx-0 w-full justify-between">
        {STAGES.map((s, idx) => {
          const isCompleted = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const isUpcoming = idx > activeIdx;

          return (
            <React.Fragment key={s.key}>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab(s.tabTarget)}
                className={cn(
                  'group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none shrink-0',
                  isCurrent &&
                    'bg-[#07563D] text-white shadow-xs font-bold scale-[1.02]',
                  isCompleted &&
                    'bg-emerald-50 text-[#07563D] hover:bg-emerald-100/90 border border-emerald-200/60 font-medium',
                  isUpcoming &&
                    'text-gray-400 hover:text-gray-700 hover:bg-gray-100/70 border border-transparent'
                )}
                title={`Stage ${s.number}: ${s.label}`}
              >
                {/* Step icon / indicator */}
                <span
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono font-bold',
                    isCurrent && 'bg-white text-[#07563D]',
                    isCompleted && 'bg-emerald-200 text-[#07563D]',
                    isUpcoming && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : isCurrent ? (
                    <Play className="w-2 h-2 fill-[#07563D] ml-0.5" />
                  ) : (
                    <span>{s.number}</span>
                  )}
                </span>

                <span className="truncate">{s.label}</span>
              </button>

              {idx < STAGES.length - 1 && (
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    idx < activeIdx ? 'text-emerald-400' : 'text-gray-300'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
