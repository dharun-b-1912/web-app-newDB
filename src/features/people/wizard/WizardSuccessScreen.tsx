import React from 'react';
import { CheckCircle2, User, UserPlus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Employee } from '../../../types';

interface Props {
  employee: Employee;
  onOpenProfile: (emp: Employee) => void;
  onStartOnboarding: (emp: Employee) => void;
  onAddAnother: () => void;
}

export const WizardSuccessScreen: React.FC<Props> = ({
  employee,
  onOpenProfile,
  onStartOnboarding,
  onAddAnother,
}) => {
  return (
    <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center shadow-lg ring-8 ring-emerald-50">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Record Created
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Employee Created Successfully!
        </h2>
        <p className="text-xs text-gray-500 max-w-sm">
          The employee master record has been saved and is now active across WorkforceOS.
        </p>
      </div>

      {/* Employee Confirmation Card */}
      <div className="w-full p-5 rounded-2xl bg-gray-50 border border-gray-200 text-left flex items-center gap-4">
        <Avatar
          name={`${employee.first_name} ${employee.last_name}`}
          src={employee.avatar_url || employee.profile?.personal_email}
          size="lg"
          className="w-16 h-16 rounded-2xl ring-2 ring-emerald-600 shadow-sm flex-shrink-0"
        />

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-gray-900 truncate">
              {employee.first_name} {employee.last_name}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-800">
              {employee.employee_code}
            </span>
          </div>
          <p className="text-xs font-semibold text-[#07563D] truncate">
            {employee.designation_title || 'Software Engineer'} · {employee.department_name || 'Engineering'}
          </p>
          <p className="text-[11px] text-gray-400 font-medium truncate">
            Joining Date: {employee.employment?.doj || employee.created_at?.slice(0, 10)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          size="md"
          variant="secondary"
          onClick={() => onOpenProfile(employee)}
          className="w-full sm:w-1/2 text-xs font-bold bg-white text-gray-800 border-gray-200 justify-center"
        >
          <User className="w-4 h-4 mr-1.5" />
          View Profile
        </Button>

        <Button
          size="md"
          variant="primary"
          onClick={() => onStartOnboarding(employee)}
          className="w-full sm:w-1/2 text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white justify-center shadow-sm"
        >
          Start Onboarding
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      <div>
        <button
          type="button"
          onClick={onAddAnother}
          className="text-xs font-bold text-[#07563D] hover:underline"
        >
          + Add Another Employee
        </button>
      </div>
    </div>
  );
};
