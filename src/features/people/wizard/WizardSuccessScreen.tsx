// src/features/people/wizard/WizardSuccessScreen.tsx
// ============================================================================
// WorkForceOS — Employee Creation Success with Auth Provisioning Badge
// ============================================================================

import React, { useState } from 'react';
import { CheckCircle2, User, ArrowRight, Sparkles, Phone, ShieldCheck, KeyRound, RefreshCw, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Employee } from '../../../types';
import { employeeAuthService } from '../../../services/auth/employeeAuthService';
import { useToast } from '../../../components/ui/Toast';

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
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const phone = employee.profile?.phone || '+91 98401 22334';
  const authStatus = employeeAuthService.getEmployeeAuthStatus(employee.id, employee.organization_id);

  const handleResendActivation = async () => {
    setIsResending(true);
    try {
      await employeeAuthService.provisionEmployeeAuth({
        tenantId: employee.organization_id || 'org-joy-01',
        employeeId: employee.id,
        phone: phone,
        email: employee.work_email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: employee.designation_title || 'Employee',
        sendSms: true,
      });
      showToast(`Activation SMS instructions dispatched to ${phone}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch activation instructions.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-5 max-w-lg mx-auto">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center shadow-lg ring-8 ring-emerald-50">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Record Created & Provisioned
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Employee Created Successfully!
        </h2>
        <p className="text-xs text-gray-500 max-w-sm">
          The master employee record and authentication identity are now active across WorkForceOS.
        </p>
      </div>

      {/* Employee Confirmation Card */}
      <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left flex items-center gap-4">
        <Avatar
          name={`${employee.first_name} ${employee.last_name}`}
          src={employee.avatar_url || employee.profile?.personal_email}
          size="lg"
          className="w-14 h-14 rounded-2xl ring-2 ring-emerald-600 shadow-sm flex-shrink-0"
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

      {/* Authentication Provisioning Status Card */}
      <div className="w-full p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span className="text-xs font-extrabold text-gray-900">Login Authentication Identity</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            {authStatus?.activation_status || 'INVITED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Login Identifier</span>
            <span className="font-mono font-bold text-gray-900 flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#07563D]" />
              {phone}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Authentication Policy</span>
            <span className="font-bold text-gray-800 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-[#07563D]" />
              Phone + OTP / Password
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-gray-500">
            SMS activation invite dispatched to employee.
          </span>
          <button
            type="button"
            disabled={isResending}
            onClick={handleResendActivation}
            className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            {isResending ? 'Sending...' : 'Resend SMS'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-1">
        <Button
          size="md"
          variant="secondary"
          onClick={() => onOpenProfile(employee)}
          className="w-full sm:w-1/2 text-xs font-bold bg-white text-gray-800 border-gray-200 justify-center"
        >
          <User className="w-4 h-4 mr-1.5" />
          View Profile & Security
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
