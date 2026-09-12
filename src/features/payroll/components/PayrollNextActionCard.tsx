import React from 'react';
import {
  Play,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  CreditCard,
  FileSpreadsheet,
  FileCheck,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { PayrollRun } from '../../../types/payroll';
import { PayrollReadinessReport } from '../../../services/payroll/payrollEligibilityService';

interface PayrollNextActionCardProps {
  activeRun?: PayrollRun | null;
  readiness?: PayrollReadinessReport | null;
  employeeCount: number;
  periodName: string;
  onNavigateTab?: (tabKey: string) => void;
  onOpenAutoModal?: () => void;
  className?: string;
}

export const PayrollNextActionCard: React.FC<PayrollNextActionCardProps> = ({
  activeRun,
  readiness,
  employeeCount,
  periodName,
  onNavigateTab,
  onOpenAutoModal,
  className,
}) => {
  const blockerCount = readiness?.blockerCount || 0;
  const isBlocked = blockerCount > 0;

  // Determine the next action step based on authoritative payroll run status
  const runStatus = (activeRun?.status || '').toUpperCase();
  const isLocked = !!activeRun?.is_locked || runStatus === 'LOCKED';
  const isPaid = runStatus === 'PAID' || runStatus === 'COMPLETED';
  const isApproved = runStatus === 'APPROVED';
  const isCalculated =
    runStatus === 'CALCULATED' ||
    runStatus === 'PREVIEWREADY' ||
    runStatus === 'FINALIZED' ||
    (activeRun && (activeRun.total_gross || 0) > 0);

  // Configuration for each state
  let badgeText = 'NEXT ACTION';
  let badgeVariant: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' = 'emerald';
  let title = 'Payroll is ready for calculation.';
  let description = `${employeeCount} employees verified • Attendance & OT verified • Statutory inputs reconciled.`;
  let primaryActionText = 'Calculate Payroll';
  let primaryActionTarget = 'processing';
  let PrimaryIcon = Play;
  let secondaryActionText: string | null = '1-Click Auto Run';
  let secondaryActionOnClick = onOpenAutoModal;

  if (isBlocked) {
    badgeText = 'ACTION REQUIRED';
    badgeVariant = 'rose';
    title = `${blockerCount} issue${blockerCount > 1 ? 's' : ''} blocking payroll.`;
    description = 'Salary structure or critical employee details must be resolved before proceeding.';
    primaryActionText = 'Resolve Issues';
    primaryActionTarget = 'salary';
    PrimaryIcon = AlertTriangle;
    secondaryActionText = 'Review Readiness';
    secondaryActionOnClick = () => onNavigateTab && onNavigateTab('dashboard');
  } else if (isPaid) {
    badgeText = 'CYCLE COMPLETE';
    badgeVariant = 'emerald';
    title = 'Payroll disbursements and reports published.';
    description = `All payouts executed for ${periodName}. Digital payslips and statutory registers ready.`;
    primaryActionText = 'View Reports & ECR';
    primaryActionTarget = 'reports';
    PrimaryIcon = FileSpreadsheet;
    secondaryActionText = 'Digital Payslips';
    secondaryActionOnClick = () => onNavigateTab && onNavigateTab('documents');
  } else if (isLocked) {
    badgeText = 'PAYMENT PENDING';
    badgeVariant = 'blue';
    title = 'Payroll locked. Ready for bank disbursement.';
    description = 'Salary register finalized and immutable. Generate NEFT/RTGS batch file or execute payout.';
    primaryActionText = 'Process Bank Payout';
    primaryActionTarget = 'disbursement';
    PrimaryIcon = CreditCard;
    secondaryActionText = 'Review Reports';
    secondaryActionOnClick = () => onNavigateTab && onNavigateTab('reports');
  } else if (isApproved) {
    badgeText = 'READY TO LOCK';
    badgeVariant = 'purple';
    title = 'Payroll approved by management.';
    description = 'Calculations verified and signed off. Lock period to generate official bank files.';
    primaryActionText = 'Lock Payroll';
    primaryActionTarget = 'processing';
    PrimaryIcon = Lock;
    secondaryActionText = 'Review Pay Register';
    secondaryActionOnClick = () => onNavigateTab && onNavigateTab('processing');
  } else if (isCalculated) {
    badgeText = 'REVIEW REQUIRED';
    badgeVariant = 'amber';
    title = 'Payroll calculation completed.';
    description = `${employeeCount} staff calculated • Review gross earnings, statutory deductions, and net payouts.`;
    primaryActionText = 'Review & Approve';
    primaryActionTarget = 'processing';
    PrimaryIcon = FileCheck;
    secondaryActionText = 'Recalculate';
    secondaryActionOnClick = () => onNavigateTab && onNavigateTab('processing');
  }

  const badgeClasses = {
    emerald: 'bg-emerald-100 text-[#07563D] border-emerald-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    rose: 'bg-rose-100 text-rose-800 border-rose-200',
    blue: 'bg-blue-100 text-blue-900 border-blue-200',
    purple: 'bg-purple-100 text-purple-900 border-purple-200',
  };

  return (
    <div
      className={cn(
        'bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all',
        isBlocked && 'border-rose-200 bg-rose-50/20',
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border font-mono',
              badgeClasses[badgeVariant]
            )}
          >
            {badgeText}
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Cycle: <strong className="text-gray-900">{periodName}</strong>
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>

        <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Primary Dominant Action CTA */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {secondaryActionText && secondaryActionOnClick && (
          <Button
            size="sm"
            variant="outline"
            onClick={secondaryActionOnClick}
            className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border-gray-200 cursor-pointer h-10 px-3.5"
          >
            {secondaryActionText === '1-Click Auto Run' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
                <span>{secondaryActionText}</span>
              </>
            ) : (
              secondaryActionText
            )}
          </Button>
        )}

        <Button
          size="sm"
          variant="primary"
          onClick={() => onNavigateTab && onNavigateTab(primaryActionTarget)}
          className={cn(
            'text-white font-bold text-xs sm:text-sm px-5 h-10 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2 cursor-pointer',
            isBlocked
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-[#07563D] hover:bg-[#064e37]'
          )}
        >
          <PrimaryIcon className="w-4 h-4 fill-white" />
          <span>{primaryActionText}</span>
          <ArrowRight className="w-4 h-4 ml-0.5" />
        </Button>
      </div>
    </div>
  );
};
