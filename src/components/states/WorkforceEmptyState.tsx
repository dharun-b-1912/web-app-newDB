// src/components/states/WorkforceEmptyState.tsx
// ============================================================
// Joy PeopleHR Enterprise — Workforce Actionable Empty State
// Replaces blank screens with clear welcome guidance and quick action shortcuts.
// ============================================================

import React from 'react';
import { Button } from '../ui/Button';
import { 
  Users, 
  Building2, 
  Clock, 
  Calendar, 
  CreditCard, 
  Sparkles, 
  Plus, 
  FolderPlus, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export type WorkforceEmptyType = 'employees' | 'departments' | 'attendance' | 'leave' | 'payroll' | 'roles';

export interface WorkforceEmptyStateProps {
  type: WorkforceEmptyType;
  companyName?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  className?: string;
}

const CONFIG_MAP: Record<
  WorkforceEmptyType,
  {
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel?: string;
  }
> = {
  employees: {
    icon: Users,
    title: "Let's Add Your First Employee",
    description:
      'Your organization directory is ready. Add employees individually with our guided wizard or import your existing workforce via Excel / CSV.',
    primaryLabel: 'Add First Employee',
    secondaryLabel: 'Import Employee CSV',
  },
  departments: {
    icon: Building2,
    title: 'No Departments Created Yet',
    description:
      'Organize your company structure into operational teams (e.g. Engineering, Sales, Human Resources, Finance).',
    primaryLabel: 'Create Department',
  },
  attendance: {
    icon: Clock,
    title: 'No Attendance Punches Recorded Today',
    description:
      'Connect biometric devices, sync mobile check-ins, or record attendance punches manually for your workforce.',
    primaryLabel: 'Record Manual Check-in',
    secondaryLabel: 'Sync Biometrics',
  },
  leave: {
    icon: Calendar,
    title: 'No Active Leave Applications',
    description:
      'Employees have not submitted any time-off requests. Configure company holiday calendars and annual leave quotas.',
    primaryLabel: 'Configure Leave Policies',
  },
  payroll: {
    icon: CreditCard,
    title: 'Ready for Your First Payroll Run',
    description:
      'Calculate monthly salary components, statutory PF / ESI deductions, and generate payslips for all active staff.',
    primaryLabel: 'Initiate Payroll Run',
  },
  roles: {
    icon: ShieldCheck,
    title: 'Default System Roles Active',
    description:
      'Standard enterprise security roles are active. Create custom roles with tailored permission policies for specialized staff.',
    primaryLabel: 'Create Custom Role',
  },
};

export const WorkforceEmptyState: React.FC<WorkforceEmptyStateProps> = ({
  type,
  companyName = 'Your Organization',
  onPrimaryAction,
  onSecondaryAction,
  className = '',
}) => {
  const config = CONFIG_MAP[type] || CONFIG_MAP.employees;
  const Icon = config.icon;

  return (
    <div className={`p-8 sm:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs max-w-2xl mx-auto my-6 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#07563D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
        <Icon className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 mb-2 inline-block">
        {companyName} Workspace
      </span>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
        {config.title}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        {config.description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button
          size="md"
          onClick={onPrimaryAction}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {config.primaryLabel}
        </Button>

        {config.secondaryLabel && onSecondaryAction && (
          <Button
            size="md"
            variant="outline"
            onClick={onSecondaryAction}
          >
            {config.secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
