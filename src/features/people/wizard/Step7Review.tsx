import React, { useMemo } from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import {
  Briefcase,
  Network,
  CreditCard,
  Clock,
  DollarSign,
  Edit2,
  CheckCircle2,
  Smartphone,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Department, Designation } from '../../../types';
import { payrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';
import { payrollApi } from '../../../services/payrollApi';

interface Props {
  formData: any;
  departments: Department[];
  designations: Designation[];
  onJumpToStep: (stepNumber: number) => void;
  onUpdateAppAccess?: (fields: {
    enable_app_access?: boolean;
    auth_method?: 'EMPLOYEE_ID_PASSWORD' | 'MOBILE_OTP' | 'EMAIL_PASSWORD';
    require_password_change?: boolean;
    require_device_verification?: boolean;
  }) => void;
}

export const Step7Review: React.FC<Props> = ({
  formData,
  departments,
  designations,
  onJumpToStep,
  onUpdateAppAccess,
}) => {
  const deptName =
    departments.find((d) => d.id === formData.department_id)?.name ||
    formData.department_name ||
    'Engineering';

  const desigTitle =
    designations.find((d) => d.id === formData.designation_id)?.title ||
    formData.designation_title ||
    'Software Engineer';

  const annualCtc = formData.annual_ctc || 1200000;
  const monthlyCtc = formData.monthly_ctc || Math.round(annualCtc / 12);

  const statutoryConfig = useMemo(() => payrollApi.getStatutoryConfig(), []);

  // Live Calculations for Review Summary
  const liveCalculation = useMemo(() => {
    return payrollCalculationEngine.calculateBreakdown({
      annualCtc,
      monthlyCtc,
      structureCode: formData.salary_structure_code || 'CORP_STD_01',
      pfApplicable: formData.pf_applicable !== false,
      esiApplicable: formData.esi_applicable !== false,
      ptApplicable: formData.pt_applicable !== false,
      statutoryConfig,
    });
  }, [annualCtc, monthlyCtc, formData.salary_structure_code, formData.pf_applicable, formData.esi_applicable, formData.pt_applicable, statutoryConfig]);

  const enableAppAccess = formData.enable_app_access !== false;
  const authMethod = formData.auth_method || 'EMPLOYEE_ID_PASSWORD';
  const requirePasswordChange = formData.require_password_change !== false;
  const requireDeviceVerification = formData.require_device_verification !== false;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          360° Comprehensive Onboarding Review & App Access
        </h3>
        <p className="text-xs text-gray-500">
          Review canonical employee identity, compensation structure, statutory details, and configure the Employee App authentication credentials.
        </p>
      </div>

      {/* Profile Master Header Card */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={`${formData.first_name} ${formData.last_name}`}
            src={formData.photo_url}
            size="lg"
            className="w-16 h-16 rounded-2xl ring-2 ring-[#07563D] shadow-md flex-shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 truncate">
                {formData.first_name} {formData.middle_name ? `${formData.middle_name} ` : ''}{formData.last_name}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#07563D] border border-emerald-200">
                {formData.employee_code || 'Auto-Generate (JCS-XXX)'}
              </span>
            </div>
            <p className="text-xs text-gray-600 font-semibold">
              {desigTitle} · <span className="text-[#07563D] font-bold">{deptName}</span>
            </p>
            <p className="text-[11px] text-gray-400 font-medium truncate">
              {formData.work_email || formData.personal_email || 'No email registered (Mobile Auth)'} · {formData.phone}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onJumpToStep(1)}
          className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1 self-end sm:self-center"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit Identity
        </button>
      </div>

      {/* High-Impact Compensation Breakdown Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-[#07563D] text-white shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-300" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                Compensation & Cost to Company (CTC) Master
              </h4>
              <p className="text-[11px] text-emerald-100">
                Structure: {formData.salary_structure_name || 'Corporate Standard CTC Structure (CORP_STD_01)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onJumpToStep(3)}
            className="text-xs font-bold text-emerald-200 hover:text-white flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit CTC
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-700/50">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-300">Annual CTC</p>
            <p className="text-sm font-black text-white">₹{annualCtc.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-300">Monthly Gross</p>
            <p className="text-sm font-black text-white">₹{liveCalculation.monthlyGrossEarnings.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-300">Monthly Deductions</p>
            <p className="text-sm font-black text-rose-300">-₹{liveCalculation.totalEmployeeDeductions.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-300">Net Take-Home Pay</p>
            <p className="text-base font-black text-emerald-200">₹{liveCalculation.netMonthlyPay.toLocaleString('en-IN')} <span className="text-[10px] text-emerald-100 font-normal">/ mo</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-emerald-700/40 text-emerald-100">
          <div>Basic: <strong className="text-white">₹{liveCalculation.basic.toLocaleString('en-IN')}</strong></div>
          <div>HRA: <strong className="text-white">₹{liveCalculation.hra.toLocaleString('en-IN')}</strong></div>
          <div>Special Allowance: <strong className="text-white">₹{liveCalculation.specialAllowance.toLocaleString('en-IN')}</strong></div>
          <div>Employee EPF: <strong className="text-rose-200">₹{liveCalculation.epfEmployee.toLocaleString('en-IN')}</strong></div>
        </div>
      </div>

      {/* DEDICATED STEP 7: EMPLOYEE APP ACCESS & AUTHENTICATION CONFIGURATION */}
      <div className="p-5 rounded-2xl bg-white border-2 border-[#07563D]/20 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#07563D]" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                Employee App Access & Authentication Setup
              </h4>
              <p className="text-[11px] text-gray-500">
                Provision isolated authentication account for mobile attendance, self-service leave, and payslips.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAppAccess}
              onChange={(e) => onUpdateAppAccess?.({ enable_app_access: e.target.checked })}
              className="w-4 h-4 text-[#07563D] rounded border-gray-300 focus:ring-[#07563D]"
            />
            <span className="text-xs font-bold text-gray-800">Enable Employee App Access</span>
          </label>
        </div>

        {enableAppAccess ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Login ID & Binding */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Authentication Login ID
                </label>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="font-mono font-black text-sm text-gray-900">
                    {formData.employee_code || 'JCS-0914'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Automatically Linked
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Independent login identifier scoped strictly to this tenant organization.
                </p>
              </div>

              {/* Authentication Method Selector */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Authentication Method
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="authMethod"
                      value="EMPLOYEE_ID_PASSWORD"
                      checked={authMethod === 'EMPLOYEE_ID_PASSWORD'}
                      onChange={() => onUpdateAppAccess?.({ auth_method: 'EMPLOYEE_ID_PASSWORD' })}
                      className="text-[#07563D] focus:ring-[#07563D]"
                    />
                    Employee ID + Password <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">(Recommended for Factory & Site)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="authMethod"
                      value="MOBILE_OTP"
                      checked={authMethod === 'MOBILE_OTP'}
                      onChange={() => onUpdateAppAccess?.({ auth_method: 'MOBILE_OTP' })}
                      className="text-[#07563D] focus:ring-[#07563D]"
                    />
                    Mobile Number + OTP ({formData.phone || '+91 XXXXX XXXXX'})
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                    <input
                      type="radio"
                      name="authMethod"
                      value="EMAIL_PASSWORD"
                      checked={authMethod === 'EMAIL_PASSWORD'}
                      onChange={() => onUpdateAppAccess?.({ auth_method: 'EMAIL_PASSWORD' })}
                      disabled={!formData.work_email && !formData.personal_email}
                      className="text-[#07563D] focus:ring-[#07563D] disabled:opacity-40"
                    />
                    Email Address + Password {(!formData.work_email && !formData.personal_email) && <span className="text-[10px] text-gray-400 font-normal">(No email registered)</span>}
                  </label>
                </div>
              </div>
            </div>

            {/* Security Compliance Checkboxes */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePasswordChange}
                  onChange={(e) => onUpdateAppAccess?.({ require_password_change: e.target.checked })}
                  className="w-4 h-4 text-[#07563D] rounded border-gray-300 focus:ring-[#07563D]"
                />
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#07563D]" />
                  Require password change on first login (One-time temporary activation)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireDeviceVerification}
                  onChange={(e) => onUpdateAppAccess?.({ require_device_verification: e.target.checked })}
                  className="w-4 h-4 text-[#07563D] rounded border-gray-300 focus:ring-[#07563D]"
                />
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Require hardware device verification / Biometric device binding
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span>App access is disabled. You can manually generate an invitation from the Employee Profile Drawer at any time.</span>
          </div>
        )}
      </div>

      {/* 2-Column Summary Grid for Core Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Employment Terms */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <Briefcase className="w-4 h-4 text-[#07563D]" />
              Employment Terms
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-[11px] font-bold text-gray-500 hover:text-[#07563D] flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Employment Source:</span>
              <span className="font-bold text-gray-900">
                {formData.employment_source === 'VENDOR' ? (
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    VENDOR · {formData.vendor_name || 'Manpower Provider'}
                  </span>
                ) : (
                  <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {formData.employment_source || 'DIRECT'}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date of Joining:</span>
              <span className="font-bold text-gray-900">{formData.doj}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Employment Type:</span>
              <span className="font-bold text-gray-900">{formData.employment_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                {formData.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Probation & Notice:</span>
              <span className="font-bold text-gray-900">{formData.probation_months} mos / {formData.notice_period_days} days</span>
            </div>
          </div>
        </div>

        {/* 2. Work Location & Shift */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <Clock className="w-4 h-4 text-[#07563D]" />
              Work Assignment & Policies
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-[11px] font-bold text-gray-500 hover:text-[#07563D] flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Work Mode:</span>
              <span className="font-bold text-gray-900">{formData.work_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned Shift:</span>
              <span className="font-bold text-gray-900">{formData.shift_name || 'General Shift (09:30 - 18:30)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Attendance Policy:</span>
              <span className="font-bold text-gray-900">{formData.attendance_policy_id || 'Standard Office Policy'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Leave Entitlement:</span>
              <span className="font-bold text-gray-900">{formData.leave_policy_name || 'Standard Full-Time Policy'}</span>
            </div>
          </div>
        </div>

        {/* 3. Reporting Hierarchy */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <Network className="w-4 h-4 text-[#07563D]" />
              Reporting & Hierarchy
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-[11px] font-bold text-gray-500 hover:text-[#07563D] flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Reporting Manager:</span>
              <span className="font-bold text-[#07563D]">
                {formData.reporting_manager_name || 'Not assigned'}
              </span>
            </div>
            {formData.team_lead_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Team Lead:</span>
                <span className="font-bold text-gray-900">{formData.team_lead_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Business Unit:</span>
              <span className="font-bold text-gray-900">{formData.business_unit || 'Enterprise'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cost Center:</span>
              <span className="font-mono font-bold text-gray-800">{formData.cost_center || 'CC-ENG-101'}</span>
            </div>
          </div>
        </div>

        {/* 4. Bank & Statutory Profile */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <CreditCard className="w-4 h-4 text-[#07563D]" />
              Bank & Statutory Profile
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(5)}
              className="text-[11px] font-bold text-gray-500 hover:text-[#07563D] flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Disbursement Bank:</span>
              <span className="font-bold text-gray-900">
                {formData.bank_name ? `${formData.bank_name} (${formData.ifsc || 'IFSC'})` : 'HDFC Bank (Default)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account Number:</span>
              <span className="font-mono font-bold text-gray-900">
                {formData.account_number ? `XXXX-XXXX-${formData.account_number.slice(-4)}` : 'XXXX-XXXX-7890'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PAN / UAN:</span>
              <span className="font-mono font-bold text-gray-900">
                {formData.pan || 'PAN PENDING'} · {formData.uan || 'UAN PENDING'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax Regime / EPF:</span>
              <span className="font-bold text-[#07563D]">
                {formData.tax_regime || 'NEW'} Regime · {formData.pf_applicable !== false ? 'EPF Active' : 'No EPF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Final Verification Notice */}
      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#07563D] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Enterprise Transaction Ready</p>
          <p className="text-emerald-800 text-[11px] mt-0.5">
            Clicking <strong>Complete Onboarding & Activate Employee</strong> will execute a transactional database operation that creates the employee identity, provisions the App Access credentials, links all sub-domain assignments (CTC, Attendance, Leave, Statutory, Bank), and optionally dispatches the Resend email activation invitation.
          </p>
        </div>
      </div>
    </div>
  );
};
