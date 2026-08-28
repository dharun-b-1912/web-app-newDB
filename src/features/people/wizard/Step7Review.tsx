import React, { useMemo } from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import {
  User,
  MapPin,
  Briefcase,
  Network,
  ShieldAlert,
  FileText,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Clock,
  CreditCard,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Department, Designation } from '../../../types';
import { payrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';

interface Props {
  formData: any;
  departments: Department[];
  designations: Designation[];
  onJumpToStep: (stepNumber: number) => void;
}

export const Step7Review: React.FC<Props> = ({
  formData,
  departments,
  designations,
  onJumpToStep,
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

  // Live Calculations for Review Summary
  const liveCalculation = useMemo(() => {
    return payrollCalculationEngine.calculateBreakdown({
      annualCtc,
      monthlyCtc,
      structureCode: formData.salary_structure_code || 'CORP_STD_01',
      pfApplicable: formData.pf_applicable !== false,
      esiApplicable: formData.esi_applicable !== false,
      ptApplicable: formData.pt_applicable !== false,
    });
  }, [annualCtc, monthlyCtc, formData.salary_structure_code, formData.pf_applicable, formData.esi_applicable, formData.pt_applicable]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          360° Comprehensive Onboarding Review & Activation
        </h3>
        <p className="text-xs text-gray-500">
          Review canonical employee identity, downstream organizational mappings, CTC calculation, statutory profiles, and attendance policies.
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
              {formData.work_email} · {formData.phone}
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

      {/* 2-Column Summary Grid */}
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
            Clicking <strong>Complete Onboarding & Activate Employee</strong> will execute a transactional database operation that creates the employee identity, links all sub-domain assignments (CTC, Attendance, Leave, Statutory, Bank, Performance), provisions the login identity, and emits realtime sync events.
          </p>
        </div>
      </div>
    </div>
  );
};
