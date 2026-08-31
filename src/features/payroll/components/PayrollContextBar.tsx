import React from 'react';
import { Building2, MapPin, Users2, Calendar, ChevronRight, CheckCircle2, AlertTriangle, ShieldCheck, Play, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export type PayrollStageKey =
  | 'prepare'
  | 'validate'
  | 'calculate'
  | 'review'
  | 'approve'
  | 'lock'
  | 'disburse'
  | 'publish'
  | 'report';

export interface PayrollLifecycleStep {
  key: PayrollStageKey;
  label: string;
  tabTarget: string;
  status: 'completed' | 'current' | 'pending' | 'warning';
}

interface PayrollContextBarProps {
  organizationName?: string;
  unitLocation?: string;
  payrollGroup?: string;
  period?: string;
  employeeCount?: number;
  currentStage?: PayrollStageKey;
  onNavigateTab?: (tabKey: string) => void;
  onPeriodChange?: (period: string) => void;
  onGroupChange?: (group: string) => void;
  onUnitChange?: (unit: string) => void;
}

export const PayrollContextBar: React.FC<PayrollContextBarProps> = ({
  organizationName = 'Joy Corporate Solutions Pvt Ltd',
  unitLocation = 'All Locations (HQ)',
  payrollGroup = 'Workforce & Staff',
  period = 'August 2026',
  employeeCount,
  currentStage = 'calculate',
  onNavigateTab,
  onPeriodChange,
  onGroupChange,
  onUnitChange,
}) => {
  const steps: PayrollLifecycleStep[] = [
    { key: 'prepare', label: '1. Prepare', tabTarget: 'dashboard', status: 'completed' },
    { key: 'validate', label: '2. Check', tabTarget: 'dashboard', status: 'completed' },
    { key: 'calculate', label: '3. Calculate', tabTarget: 'processing', status: currentStage === 'calculate' ? 'current' : 'completed' },
    { key: 'review', label: '4. Review', tabTarget: 'processing', status: currentStage === 'review' ? 'current' : currentStage === 'calculate' ? 'pending' : 'completed' },
    { key: 'approve', label: '5. Approve', tabTarget: 'processing', status: currentStage === 'approve' ? 'current' : 'pending' },
    { key: 'lock', label: '6. Lock', tabTarget: 'processing', status: currentStage === 'lock' ? 'current' : 'pending' },
    { key: 'disburse', label: '7. Pay', tabTarget: 'disbursement', status: currentStage === 'disburse' ? 'current' : 'pending' },
    { key: 'publish', label: '8. Publish', tabTarget: 'documents', status: currentStage === 'publish' ? 'current' : 'pending' },
    { key: 'report', label: '9. Report', tabTarget: 'reports', status: currentStage === 'report' ? 'current' : 'pending' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
      {/* Top Universal Payroll Context Strip */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Multi-Tenant Entity Hierarchy Path */}
        <div className="flex items-center gap-2 flex-wrap font-medium">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>{organizationName}</span>
          </div>
          <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />

          <div className="flex items-center gap-1 text-gray-200">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{unitLocation}</span>
          </div>
          <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />

          <div className="flex items-center gap-1 text-gray-200 font-semibold">
            <Users2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{payrollGroup}</span>
            {employeeCount !== undefined && (
              <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.2 rounded font-mono">
                {employeeCount} Staff
              </span>
            )}
          </div>
        </div>

        {/* Global Persistent Period Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded-xl border border-gray-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400 text-[11px] font-medium">Active Cycle:</span>
            <select
              value={period}
              onChange={e => onPeriodChange && onPeriodChange(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="August 2026" className="bg-gray-900 text-white">August 2026 (Active Run)</option>
              <option value="July 2026" className="bg-gray-900 text-white">July 2026 (Locked)</option>
              <option value="June 2026" className="bg-gray-900 text-white">June 2026 (Locked)</option>
            </select>
          </div>

          <Badge variant="emerald" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Live OS v2.0
          </Badge>
        </div>
      </div>

      {/* Guided 9-Stage Lifecycle Stepper Ribbon with Smooth Hidden Scroll */}
      <div
        className="px-4 py-3 bg-gray-50/70 border-b border-gray-200/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY * 0.9;
          }
        }}
      >
        <div className="flex items-center gap-1 min-w-max">
          {steps.map((s, idx) => {
            const isCurrent = s.status === 'current';
            const isCompleted = s.status === 'completed';
            const isPending = s.status === 'pending';

            return (
              <React.Fragment key={s.key}>
                <button
                  onClick={() => onNavigateTab && onNavigateTab(s.tabTarget)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none shrink-0",
                    isCurrent && "bg-[#07563D] text-white shadow-xs",
                    isCompleted && "bg-emerald-50 text-[#07563D] hover:bg-emerald-100/80 border border-emerald-200/60",
                    isPending && "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {isCurrent && <Play className="w-3 h-3 fill-white text-white shrink-0" />}
                  {isPending && <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
                  <span>{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Quick Context Action Helper */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-gray-200 shrink-0">
          <span className="text-[11px] text-gray-500 font-medium">Next Recommended:</span>
          <Button
            size="xs"
            variant="primary"
            onClick={() => onNavigateTab && onNavigateTab('processing')}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-[11px] cursor-pointer shadow-2xs"
          >
            Calculate Payroll <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
