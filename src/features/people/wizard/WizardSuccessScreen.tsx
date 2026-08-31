// src/features/people/wizard/WizardSuccessScreen.tsx
// ============================================================================
// Joy PeopleHR — Employee Creation Success with Auth Provisioning & Resend Email
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  User,
  ArrowRight,
  Sparkles,
  Send,
  Mail,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Employee } from '../../../types';
import { employeeAuthService } from '../../../services/auth/employeeAuthService';
import { resendEmailService } from '../../../services/email/resendEmailService';
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const phone = employee.profile?.phone || '+91 98401 22334';
  const email = employee.work_email || (employee.profile as any)?.personal_email || '';
  const loginId = employee.employee_code || employee.id;
  const activationToken = `${loginId.toLowerCase()}-act-${Math.floor(100000 + Math.random() * 900000)}`;
  const activationLink = `${window.location.origin}/activate?token=${activationToken}&emp=${employee.id}`;

  const handleSendEmailActivation = async () => {
    if (!email) {
      showToast('No email address registered for this employee.', 'error');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await resendEmailService.sendEmployeeActivationEmail({
        to: email,
        employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
        employeeId: employee.employee_code || employee.id,
        loginIdentifier: loginId,
        activationToken: activationToken,
        activationUrl: activationLink,
        organizationName: employee.company_name || 'Joy Corporate Solutions',
        authMethod: 'Employee ID + Password',
        requiresPasswordChange: true,
      });

      if (res.success) {
        showToast(`Activation invitation dispatched via Resend to ${email}`, 'success');
      } else {
        showToast(res.error || 'Failed to dispatch activation email.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error sending email.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSmsActivation = async () => {
    setIsSendingSms(true);
    try {
      await employeeAuthService.provisionEmployeeAuth({
        tenantId: employee.organization_id || 'org-joy-01',
        employeeId: employee.id,
        phone: phone,
        email: email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        role: employee.designation_title || 'Employee',
        sendSms: true,
      });
      showToast(`Activation SMS instructions dispatched to ${phone}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch SMS instructions.', 'error');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopyActivationLink = () => {
    navigator.clipboard.writeText(activationLink);
    setCopiedLink(true);
    showToast('Activation link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-5 max-w-lg mx-auto">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center shadow-lg ring-8 ring-emerald-50">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Record Created & App Access Provisioned
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Employee Created Successfully!
        </h2>
        <p className="text-xs text-gray-500 max-w-sm">
          The master employee identity and isolated authentication credentials are ready.
        </p>
      </div>

      {/* Employee Confirmation Card */}
      <div className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left flex items-center gap-4">
        <Avatar
          name={`${employee.first_name} ${employee.last_name}`}
          src={employee.avatar_url}
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
            {email ? `Email: ${email}` : 'No Corporate Email (Mobile Only)'}
          </p>
        </div>
      </div>

      {/* Employee App Access Provisioning Box */}
      <div className="w-full p-4 rounded-2xl bg-white border-2 border-[#07563D]/20 shadow-xs text-left space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#07563D]" />
            <span className="text-xs font-extrabold text-gray-900">Employee App Access</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Enabled
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Login Identifier</span>
            <span className="font-mono font-bold text-gray-900">
              {loginId}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Activation Status</span>
            <span className="font-bold text-amber-700">
              Pending Activation
            </span>
          </div>
        </div>

        {/* Action Buttons to Send Activation */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {email && (
            <button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendEmailActivation}
              className="flex-1 px-3 py-2 text-xs font-bold text-white bg-[#07563D] hover:bg-[#064e37] rounded-xl flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              {isSendingEmail ? 'Sending...' : 'Send Resend Email'}
            </button>
          )}

          <button
            type="button"
            disabled={isSendingSms}
            onClick={handleSendSmsActivation}
            className="flex-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#07563D]" />
            {isSendingSms ? 'Sending...' : 'Send SMS'}
          </button>

          <button
            type="button"
            onClick={handleCopyActivationLink}
            className="px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-1.5"
            title="Copy one-time activation link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
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
