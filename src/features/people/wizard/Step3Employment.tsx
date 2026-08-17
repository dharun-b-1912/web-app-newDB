import React, { useState, useEffect } from 'react';
import { Department, Designation, Branch, Location, EmploymentType, WorkMode, EmployeeStatus, EmploymentSource, Vendor } from '../../../types';
import { vendorService } from '../../../services/vendorService';
import { Briefcase, Building2, Calendar, MapPin, Shield, Users, UserCheck } from 'lucide-react';

export interface Step3FormData {
  doj: string;
  employment_type: EmploymentType;
  employment_source: EmploymentSource;
  vendor_id?: string;
  vendor_name?: string;
  vendor_employee_code?: string;
  vendor_contract_id?: string;
  vendor_start_date?: string;
  vendor_end_date?: string;
  status: EmployeeStatus;
  department_id: string;
  designation_id: string;
  branch_id: string;
  location_id: string;
  work_mode: WorkMode;
  job_level: string;
  grade: string;
  probation_months: number;
  notice_period_days: number;
}

const EMPLOYMENT_SOURCES = [
  { id: 'DIRECT', label: 'Direct Employee', desc: 'On company payroll' },
  { id: 'VENDOR', label: 'Manpower Provider', desc: 'Supplied via Vendor' },
  { id: 'CONTRACT', label: 'Direct Contract', desc: 'Fixed term agreement' },
  { id: 'INTERN', label: 'Intern / Trainee', desc: 'Stipend training' },
  { id: 'TEMPORARY', label: 'Temporary Staff', desc: 'Project specific' },
  { id: 'CONSULTANT', label: 'Consultant', desc: 'Retainer services' },
];

interface Props {
  formData: Step3FormData;
  onChange: (fields: Partial<Step3FormData>) => void;
  departments: Department[];
  designations: Designation[];
  branches: Branch[];
  locations: Location[];
}

export const Step3Employment: React.FC<Props> = ({
  formData,
  onChange,
  departments,
  designations,
  branches,
  locations,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    vendorService.getVendors().then(setVendors);
  }, []);

  const isVendorSource = formData.employment_source === 'VENDOR';

  const handleVendorSelect = (vendorId: string) => {
    const selected = vendors.find((v) => v.id === vendorId);
    onChange({
      vendor_id: vendorId,
      vendor_name: selected?.legal_name || '',
      vendor_contract_id: selected?.contract_start_date ? 'MSA-PRIMARY' : undefined,
      vendor_start_date: formData.doj || new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      {/* Sourcing Model Selector */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-black text-gray-900">Employment Sourcing & Model</h3>
          <p className="text-xs text-gray-500">
            Specify whether this employee is directly hired or deployed through an external vendor.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            Workforce Sourcing Channel <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {EMPLOYMENT_SOURCES.map((src) => {
              const selected = formData.employment_source === src.id;
              return (
                <button
                  type="button"
                  key={src.id}
                  onClick={() => onChange({ employment_source: src.id as EmploymentSource })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-[#07563D] bg-emerald-50/40 shadow-xs ring-1 ring-[#07563D]'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${selected ? 'text-[#07563D]' : 'text-gray-900'}`}>{src.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{src.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vendor Relationship Card (Conditionally Shown for Vendor Employees) */}
        {isVendorSource && (
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                Vendor / Manpower Provider Details
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Authorized Manpower Provider <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.vendor_id || ''}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
                >
                  <option value="">-- Select Manpower Provider --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.legal_name} ({v.vendor_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Vendor's Internal Employee Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC-TN-8821"
                  value={formData.vendor_employee_code || ''}
                  onChange={(e) => onChange({ vendor_employee_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Vendor Deployment Start Date
                </label>
                <input
                  type="date"
                  value={formData.vendor_start_date || ''}
                  onChange={(e) => onChange({ vendor_start_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Vendor Deployment End Date
                </label>
                <input
                  type="date"
                  value={formData.vendor_end_date || ''}
                  onChange={(e) => onChange({ vendor_end_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Joining Date, Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Date of Joining (DOJ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.doj}
              onChange={(e) => onChange({ doj: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Employment Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.employment_type}
              onChange={(e) => onChange({ employment_type: e.target.value as EmploymentType })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold"
            >
              <option value="Full Time">Full Time (Permanent)</option>
              <option value="Contract">Fixed-Term Contract</option>
              <option value="Intern">Intern / Trainee</option>
              <option value="Consultant">Retainer Consultant</option>
              <option value="Part Time">Part Time</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Initial Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => onChange({ status: e.target.value as EmployeeStatus })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold text-emerald-800"
            >
              <option value="Active">Active (Confirmed)</option>
              <option value="Probation">Probationary Period</option>
              <option value="Onboarding">Onboarding (New Hire)</option>
              <option value="Invited">Invited (Pre-Joining)</option>
            </select>
          </div>
        </div>

        {/* Department & Designation (Real Master Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.department_id}
              onChange={(e) => onChange({ department_id: e.target.value })}
              className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="">-- Select Organizational Department --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code || 'DEPT'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Designation / Job Title <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.designation_id}
              onChange={(e) => onChange({ designation_id: e.target.value })}
              className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="">-- Select Official Designation --</option>
              {designations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.title} ({desig.grade || 'Grade'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location, Work Mode, Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Primary Office Branch
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => onChange({ branch_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="">-- Select Branch Location --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Work Mode Policy
            </label>
            <select
              value={formData.work_mode}
              onChange={(e) => onChange({ work_mode: e.target.value as WorkMode })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="Office">On-Site Office</option>
              <option value="Hybrid">Hybrid (Office + Remote)</option>
              <option value="Remote">100% Remote / Distributed</option>
              <option value="Field">Field / Client Site</option>
              <option value="Flexible">Flexible Shifts</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Job Level / Career Band
            </label>
            <input
              type="text"
              placeholder="e.g. L-3 / Specialist"
              value={formData.job_level}
              onChange={(e) => onChange({ job_level: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>

        {/* Probation & Notice Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Probation Period (Months)
            </label>
            <input
              type="number"
              min={0}
              max={24}
              value={formData.probation_months}
              onChange={(e) => onChange({ probation_months: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Notice Period (Days)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              value={formData.notice_period_days}
              onChange={(e) => onChange({ notice_period_days: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
