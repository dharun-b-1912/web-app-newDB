import React from 'react';
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
} from 'lucide-react';
import { Department, Designation } from '../../../types';

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
    'Not selected';

  const desigTitle =
    designations.find((d) => d.id === formData.designation_id)?.title ||
    formData.designation_title ||
    'Not selected';

  const isIdentityComplete = Boolean(formData.first_name && formData.last_name && formData.work_email && formData.employee_code && formData.phone);
  const isEmploymentComplete = Boolean(formData.doj && formData.department_id && formData.designation_id);
  const isEmergencyComplete = Boolean(formData.emergency_name && formData.emergency_phone);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Review & Confirm Employee Profile
        </h3>
        <p className="text-xs text-gray-500">
          Verify all information before officially creating the employee master record.
        </p>
      </div>

      {/* Profile Header Card */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={`${formData.first_name} ${formData.last_name}`}
            src={formData.photo_url}
            size="lg"
            className="w-16 h-16 rounded-2xl ring-2 ring-emerald-500 shadow-md flex-shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 truncate">
                {formData.first_name} {formData.middle_name ? `${formData.middle_name} ` : ''}{formData.last_name}
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800">
                {formData.employee_code}
              </span>
            </div>
            <p className="text-xs text-gray-600 font-semibold">
              {desigTitle} · <span className="text-[#07563D]">{deptName}</span>
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

      {/* Sections Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Employment Profile */}
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
            {formData.employment_source === 'VENDOR' && formData.vendor_employee_code && (
              <div className="flex justify-between">
                <span className="text-gray-500">Vendor Employee Code:</span>
                <span className="font-mono font-bold text-gray-800">{formData.vendor_employee_code}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Date of Joining:</span>
              <span className="font-bold text-gray-900">{formData.doj}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Employment Type:</span>
              <span className="font-bold text-gray-900">{formData.employment_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Initial Status:</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                {formData.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Work Mode:</span>
              <span className="font-bold text-gray-900">{formData.work_mode}</span>
            </div>
          </div>
        </div>

        {/* 2. Organization & Reporting */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <Network className="w-4 h-4 text-blue-600" />
              Reporting Hierarchy
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
              <span className="font-bold text-gray-900">{formData.reporting_manager_name || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Team Lead:</span>
              <span className="font-bold text-gray-900">{formData.team_lead_name || 'Direct to Manager'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cost Center:</span>
              <span className="font-bold text-gray-900">{formData.cost_center || 'General'}</span>
            </div>
          </div>
        </div>

        {/* 3. Contact & Address */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <MapPin className="w-4 h-4 text-teal-600" />
              Contact & Address
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-[11px] font-bold text-gray-500 hover:text-[#07563D] flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Personal Email:</span>
              <span className="font-semibold text-gray-900">{formData.personal_email || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current City:</span>
              <span className="font-bold text-gray-900">{formData.current_city}, {formData.current_state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nationality:</span>
              <span className="font-semibold text-gray-900">{formData.nationality}</span>
            </div>
          </div>
        </div>

        {/* 4. Emergency & Documents */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Emergency & Documents
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
              <span className="text-gray-500">Emergency Contact:</span>
              <span className="font-bold text-gray-900">
                {formData.emergency_name ? `${formData.emergency_name} (${formData.emergency_relation})` : 'Not provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Emergency Phone:</span>
              <span className="font-bold text-gray-900">{formData.emergency_phone || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Uploaded Documents:</span>
              <span className="font-bold text-emerald-800">
                {(formData.documents || []).length} Document(s) attached
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Checklist */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <span className={`flex items-center gap-1 ${isIdentityComplete ? 'text-emerald-700' : 'text-rose-600'}`}>
            {isIdentityComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4" />}
            Identity details
          </span>
          <span className={`flex items-center gap-1 ${isEmploymentComplete ? 'text-emerald-700' : 'text-rose-600'}`}>
            {isEmploymentComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4" />}
            Employment & Department
          </span>
          <span className={`flex items-center gap-1 ${isEmergencyComplete ? 'text-emerald-700' : 'text-amber-600'}`}>
            {isEmergencyComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4" />}
            Emergency contact
          </span>
        </div>

        <span className="text-gray-400 text-[11px]">
          Ready for system provisioning
        </span>
      </div>
    </div>
  );
};
