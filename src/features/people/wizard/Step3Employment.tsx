import React, { useState, useEffect, useMemo } from 'react';
import { Department, Designation, Branch, Location, EmploymentType, WorkMode, EmployeeStatus, EmploymentSource, Vendor } from '../../../types';
import { payrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';
import { payrollApi } from '../../../services/payrollApi';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { ClientMasterService } from '../../../services/clientBilling/clientMasterService';
import { ClientMaster, ClientContract } from '../../../types/clientBilling';
import {
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  Shield,
  Users,
  DollarSign,
  Clock,
  ShieldCheck,
  Calculator,
  Sparkles,
  TrendingUp,
  Plus,
  Check,
  X,
  Building,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export interface Step3FormData {
  // Employment
  doj: string;
  confirmation_date?: string;
  employment_type: EmploymentType;
  employment_source: EmploymentSource;
  vendor_id?: string;
  vendor_name?: string;
  vendor_code?: string;
  vendor_employee_code?: string;
  vendor_contract_id?: string;
  vendor_contract_number?: string;
  vendor_start_date?: string;
  vendor_end_date?: string;
  client_company_id?: string;
  client_company_name?: string;
  site_id?: string;
  site_name?: string;
  status: EmployeeStatus;
  department_id: string;
  designation_id: string;
  designation_title?: string;
  branch_id: string;
  location_id: string;
  work_mode: WorkMode;
  job_level: string;
  grade: string;
  probation_months: number;
  notice_period_days: number;

  // Work Assignment
  shift_id?: string;
  shift_name?: string;
  attendance_policy_id?: string;
  leave_policy_id?: string;
  leave_policy_name?: string;
  work_location_name?: string;

  // Compensation & CTC
  compensation_basis?: 'CTC_INCLUSIVE' | 'GROSS_BASED';
  salary_structure_code?: string;
  salary_structure_name?: string;
  annual_ctc?: number;
  monthly_ctc?: number;
  currency?: string;
  pay_frequency?: string;
  payroll_group_id?: string;
  salary_effective_from?: string;
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  pt_applicable?: boolean;
}

const EMPLOYMENT_SOURCES: { id: EmploymentSource; label: string; desc: string }[] = [
  { id: 'DIRECT', label: 'Direct Employee', desc: 'On company payroll' },
  { id: 'CONTRACT', label: 'Direct Contract', desc: 'Fixed term agreement' },
  { id: 'INTERN', label: 'Intern / Trainee', desc: 'Stipend training' },
  { id: 'TEMPORARY', label: 'Temporary Staff', desc: 'Project specific' },
  { id: 'CONSULTANT', label: 'Consultant', desc: 'Retainer services' },
  { id: 'VENDOR', label: 'Vendor Workforce', desc: 'Outsourced partner staff' },
];

const SALARY_STRUCTURES = [
  {
    code: 'CORP_STD_01',
    name: 'Corporate Standard CTC Structure',
    description: '50% Basic, 40% HRA, Special Allowance, EPF & ESIC statutory basket',
  },
  {
    code: 'EXEC_TECH_01',
    name: 'Executive & Tech Lead Package',
    description: 'Higher flexi-allowance, executive conveyance/medical allowance and tax optimization',
  },
  {
    code: 'INTERN_STIPEND_01',
    name: 'Fixed Stipend Package',
    description: 'Fixed consolidated monthly stipend without statutory deductions',
  },
];

const SHIFT_OPTIONS = [
  { id: 'shift-general-01', name: 'General Shift (09:30 AM – 06:30 PM)', timings: '09:30 - 18:30' },
  { id: 'shift-morning-02', name: 'Morning Operations (06:00 AM – 02:30 PM)', timings: '06:00 - 14:30' },
  { id: 'shift-evening-03', name: 'Evening Shift (02:00 PM – 10:30 PM)', timings: '14:00 - 22:30' },
  { id: 'shift-night-04', name: 'Night / Offshore Shift (10:00 PM – 06:30 AM)', timings: '22:00 - 06:30' },
];

const ATTENDANCE_POLICIES = [
  { id: 'pol-standard-office', name: 'Standard Office Policy (15 Min Grace, Biometric)' },
  { id: 'pol-flexi-eng', name: 'Flexible Core Hours (Engineering / Tech)' },
  { id: 'pol-plant-operations', name: 'Shift Roaster & Strict Turnstile Lock' },
];

const LEAVE_POLICIES = [
  { id: 'leave-pol-std-2026', name: 'Standard Employee Policy (18 Paid Leaves, 12 Sick/Casual)' },
  { id: 'leave-pol-exec-2026', name: 'Executive Flexi Leave (24 Paid Leaves, Unlimited Sick)' },
  { id: 'leave-pol-intern-2026', name: 'Intern Leave Policy (1.25 Leaves / Month)' },
];

const PAYROLL_GROUPS = [
  { id: 'pg-monthly-main', name: 'Monthly Main Payroll (Cycle: 1st – Last Day)' },
  { id: 'pg-exec-mgmt', name: 'Executive & Management Payroll' },
  { id: 'pg-field-staff', name: 'Weekly / Bi-Weekly Field Staff' },
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
  departments = [],
  designations = [],
  branches = [],
  locations = [],
}) => {
  const [isCustomDesig, setIsCustomDesig] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customGrade, setCustomGrade] = useState('L3 - Mid Level');
  const [isSavingDesig, setIsSavingDesig] = useState(false);

  // Database-Driven Vendor & Contract States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(false);
  const [clients, setClients] = useState<ClientMaster[]>([]);
  const [allContracts, setAllContracts] = useState<ClientContract[]>([]);

  useEffect(() => {
    setIsLoadingVendors(true);
    api.getVendors().then((vList) => {
      setVendors(vList || []);
    }).catch(() => {
      setVendors(api.getVendorsSync());
    }).finally(() => {
      setIsLoadingVendors(false);
    });

    ClientMasterService.getClientsAsync().then((cliList) => {
      setClients(cliList || []);
      const cntList = cliList.flatMap((c) => ClientMasterService.getContracts(c.id));
      setAllContracts(cntList || []);
    }).catch(() => { });
  }, []);

  const filteredContracts = useMemo(() => {
    if (!formData.client_company_id) return allContracts;
    return allContracts.filter((c) => c.client_id === formData.client_company_id);
  }, [allContracts, formData.client_company_id]);

  const handleSourcingChange = (srcId: EmploymentSource) => {
    if (srcId === 'VENDOR') {
      const defaultVendor = vendors[0];
      onChange({
        employment_source: srcId,
        vendor_id: formData.vendor_id || defaultVendor?.id || '',
        vendor_name: formData.vendor_name || defaultVendor?.legal_name || defaultVendor?.trade_name || '',
        vendor_code: formData.vendor_code || defaultVendor?.vendor_code || '',
      });
    } else {
      onChange({
        employment_source: srcId,
        vendor_id: '',
        vendor_name: '',
        vendor_code: '',
        vendor_employee_code: '',
        vendor_contract_id: '',
        vendor_contract_number: '',
        vendor_start_date: '',
        vendor_end_date: '',
        client_company_id: '',
        client_company_name: '',
        site_id: '',
        site_name: '',
      });
    }
  };

  const handleVendorChange = (vendorId: string) => {
    const match = vendors.find((v) => v.id === vendorId);
    if (match) {
      onChange({
        vendor_id: match.id,
        vendor_name: match.legal_name || match.trade_name || 'Vendor Organization',
        vendor_code: match.vendor_code || match.id,
        vendor_contract_id: '',
        vendor_contract_number: '',
        client_company_id: '',
        client_company_name: '',
        site_id: '',
        site_name: '',
      });
    } else {
      onChange({
        vendor_id: '',
        vendor_name: '',
        vendor_code: '',
        vendor_employee_code: '',
        vendor_contract_id: '',
        vendor_contract_number: '',
        client_company_id: '',
        client_company_name: '',
        site_id: '',
        site_name: '',
      });
    }
  };

  const handleClientChange = (clientId: string) => {
    const match = clients.find((c) => c.id === clientId);
    onChange({
      client_company_id: clientId,
      client_company_name: match?.legal_name || match?.display_name || '',
      vendor_contract_id: '',
      vendor_contract_number: '',
    });
  };

  const handleContractChange = (contractId: string) => {
    const match = allContracts.find((c) => c.id === contractId);
    onChange({
      vendor_contract_id: contractId,
      vendor_contract_number: match?.contract_number || '',
    });
  };

  const handleSiteChange = (siteId: string) => {
    const matchLoc = locations.find((l) => l.id === siteId);
    const matchBranch = branches.find((b) => b.id === siteId);
    const siteName = matchLoc?.name || matchBranch?.name || siteId;
    onChange({
      site_id: siteId,
      site_name: siteName,
      location_id: siteId,
      work_location_name: siteName,
    });
  };

  const annualCtc = formData.annual_ctc || 1200000;
  const monthlyCtc = formData.monthly_ctc || Math.round(annualCtc / 12);
  const salaryStructureCode = formData.salary_structure_code || 'CORP_STD_01';

  const [statutoryConfig, setStatutoryConfig] = useState(() => payrollApi.getStatutoryConfig());

  useEffect(() => {
    // Refresh configuration on mount and subscribe to real-time statutory rule changes
    payrollApi.fetchStatutoryConfigFromDb().then((cfg) => {
      if (cfg) setStatutoryConfig(cfg);
    }).catch(() => {
      setStatutoryConfig(payrollApi.getStatutoryConfig());
    });

    const handleStatutoryUpdated = (e: any) => {
      if (e?.config) {
        setStatutoryConfig(e.config);
      } else {
        setStatutoryConfig(payrollApi.getStatutoryConfig());
      }
    };
    hrEventBus.on('payroll.statutory_updated', handleStatutoryUpdated);
    return () => {
      hrEventBus.off('payroll.statutory_updated', handleStatutoryUpdated);
    };
  }, []);

  // Live Deterministic Calculation via Centralized Payroll Engine (Synced with Payroll Statutory Settings)
  const liveCalculation = useMemo(() => {
    return payrollCalculationEngine.calculateCtcBreakdown({
      annualCtc,
      monthlyCtc,
      structureCode: salaryStructureCode,
      compensationBasis: formData.compensation_basis || 'CTC_INCLUSIVE',
      pfApplicable: formData.pf_applicable !== false,
      esiApplicable: formData.esi_applicable !== false,
      ptApplicable: formData.pt_applicable !== false,
      statutoryConfig,
    });
  }, [annualCtc, monthlyCtc, salaryStructureCode, formData.compensation_basis, formData.pf_applicable, formData.esi_applicable, formData.pt_applicable, statutoryConfig]);

  const handleAnnualCtcChange = (value: number) => {
    const validAnnual = Math.max(0, value);
    const derivedMonthly = Math.round(validAnnual / 12);
    onChange({
      annual_ctc: validAnnual,
      monthly_ctc: derivedMonthly,
    });
  };

  const handleMonthlyCtcChange = (value: number) => {
    const validMonthly = Math.max(0, value);
    const derivedAnnual = validMonthly * 12;
    onChange({
      monthly_ctc: validMonthly,
      annual_ctc: derivedAnnual,
    });
  };

  return (
    <div className="space-y-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: EMPLOYMENT TERMS & SOURCING                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <Briefcase className="w-4 h-4 text-[#07563D]" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            1. Employment &amp; Organizational Mapping
          </h3>
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
                  onClick={() => handleSourcingChange(src.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${selected
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

        {/* CONDITIONAL VENDOR WORKFORCE ASSIGNMENT SECTION */}
        {formData.employment_source === 'VENDOR' && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-amber-50/80 border border-amber-200/90 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                    Workforce Ownership &amp; Vendor Assignment
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Select the approved vendor partner, mapped client company, contract assignment, and deployment site.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Outsourced Workforce
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* 1. Vendor Organization Dropdown (Database-Driven) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Vendor Organization <span className="text-rose-500">*</span>
                </label>
                {isLoadingVendors ? (
                  <div className="p-2.5 text-xs text-amber-700 bg-white border border-amber-200 rounded-xl flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading vendors from database...</span>
                  </div>
                ) : (
                  <select
                    value={formData.vendor_id || ''}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none font-bold text-gray-900 shadow-2xs"
                  >
                    <option value="">-- Select Vendor Organization --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.legal_name || v.trade_name || 'Vendor'} ({v.vendor_code || v.id.slice(0, 8)})
                      </option>
                    ))}
                  </select>
                )}
                {formData.vendor_name && (
                  <p className="text-[10px] text-amber-800 font-medium mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Selected Vendor:</span>
                    <span className="font-bold">{formData.vendor_name}</span>
                  </p>
                )}
              </div>

              {/* 2. Vendor Worker Code */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Vendor Employee / Badge Reference <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. APEX-SEC-089"
                  value={formData.vendor_employee_code || ''}
                  onChange={(e) => onChange({ vendor_employee_code: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none font-mono font-medium text-gray-900 shadow-2xs"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Internal employee code issued by the vendor organization
                </p>
              </div>

              {/* 3. Client Company Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Assigned Client Company <span className="text-gray-400 font-normal">(Governing Contract)</span>
                </label>
                <select
                  value={formData.client_company_id || ''}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none font-semibold text-gray-900 shadow-2xs"
                >
                  <option value="">-- Select Client Company --</option>
                  {clients.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.legal_name || cli.display_name} ({cli.client_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Vendor Contract / Commercial Assignment */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Contract / Commercial Assignment
                </label>
                <select
                  value={formData.vendor_contract_id || ''}
                  onChange={(e) => handleContractChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none font-semibold text-gray-900 shadow-2xs"
                >
                  <option value="">-- Select Active Contract --</option>
                  {filteredContracts.map((cnt) => (
                    <option key={cnt.id} value={cnt.id}>
                      {cnt.contract_number} — {cnt.contract_name} ({cnt.service_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Assigned Deployment Site / Facility */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Assigned Deployment Site / Client Work Facility
                </label>
                <select
                  value={formData.site_id || formData.location_id || ''}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none font-semibold text-gray-900 shadow-2xs"
                >
                  <option value="">-- Select Assigned Site / Facility --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} · {loc.city || 'Facility'} ({loc.type || 'Operational Site'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Joining Date, Confirmation, Employment Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
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
              Confirmation Date
            </label>
            <input
              type="date"
              value={formData.confirmation_date || ''}
              onChange={(e) => onChange({ confirmation_date: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
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

        {/* Department & Designation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Designation / Official Job Title <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomDesig(!isCustomDesig)}
                className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCustomDesig ? '← Select Existing' : '+ Add New / Type Custom'}
              </button>
            </div>

            {isCustomDesig ? (
              <div className="space-y-2 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl animate-in fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter designation title (e.g. Flutter Developer, Site Supervisor)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
                  />
                  <select
                    value={customGrade}
                    onChange={(e) => setCustomGrade(e.target.value)}
                    className="w-36 px-2 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none font-semibold text-gray-800"
                  >
                    <option value="L1 - Entry Level">L1 - Entry</option>
                    <option value="L2 - Associate">L2 - Associate</option>
                    <option value="L3 - Mid Level">L3 - Mid Level</option>
                    <option value="L4 - Senior">L4 - Senior</option>
                    <option value="L5 - Lead / Specialist">L5 - Lead</option>
                    <option value="L6 - Manager">L6 - Manager</option>
                    <option value="L7 - Director">L7 - Director</option>
                    <option value="L8 - Executive">L8 - Executive</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-800 font-medium">
                    Will be saved into organization catalog & assigned immediately
                  </span>
                  <button
                    type="button"
                    disabled={isSavingDesig || !customTitle.trim()}
                    onClick={async () => {
                      if (!customTitle.trim()) return;
                      setIsSavingDesig(true);
                      try {
                        const created = await api.createDesignation({
                          title: customTitle.trim(),
                          code: 'DESG-' + customTitle.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5),
                          company_id: 'comp-joy-01',
                          grade: customGrade,
                        });
                        onChange({
                          designation_id: created.id,
                          designation_title: created.title,
                          grade: customGrade,
                        });
                        setIsCustomDesig(false);
                        setCustomTitle('');
                      } catch (err) {
                        console.warn('Failed to create designation:', err);
                      } finally {
                        setIsSavingDesig(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#07563D] hover:bg-[#054430] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Save & Assign
                  </button>
                </div>
              </div>
            ) : (
              <select
                required
                value={formData.designation_id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__ADD_NEW__') {
                    setIsCustomDesig(true);
                  } else {
                    const match = designations.find((d) => d.id === val);
                    onChange({
                      designation_id: val,
                      designation_title: match?.title || val,
                      grade: match?.grade || formData.grade,
                    });
                  }
                }}
                className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
              >
                <option value="">-- Select Official Designation --</option>
                {designations.map((desig) => (
                  <option key={desig.id} value={desig.id}>
                    {desig.title} ({desig.grade || 'Grade'})
                  </option>
                ))}
                <option value="__ADD_NEW__" className="font-bold text-[#07563D]">
                  ➕ + Add New Custom Designation...
                </option>
              </select>
            )}
          </div>
        </div>

        {/* Probation & Notice Period */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Career Band / Level</label>
            <input
              type="text"
              placeholder="e.g. L-3 / Specialist"
              value={formData.job_level}
              onChange={(e) => onChange({ job_level: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Internal Grade</label>
            <input
              type="text"
              placeholder="e.g. G3"
              value={formData.grade}
              onChange={(e) => onChange({ grade: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Probation (Months)</label>
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
            <label className="block text-xs font-bold text-gray-700 mb-1">Notice Period (Days)</label>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: WORK ASSIGNMENT (Location, Shift & Policies)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <Clock className="w-4 h-4 text-[#07563D]" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            2. Work Location, Shift & Attendance Assignment
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Work Location <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.location_id || ''}
              onChange={(e) => onChange({ location_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="">-- Select Work Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city || 'TN'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Primary Office Branch
            </label>
            <select
              value={formData.branch_id || ''}
              onChange={(e) => onChange({ branch_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="">-- Select Branch --</option>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Assigned Shift <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.shift_id || 'shift-general-01'}
              onChange={(e) => {
                const s = SHIFT_OPTIONS.find((opt) => opt.id === e.target.value);
                onChange({ shift_id: e.target.value, shift_name: s?.name });
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
            >
              {SHIFT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Attendance Policy <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.attendance_policy_id || 'pol-standard-office'}
              onChange={(e) => onChange({ attendance_policy_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
            >
              {ATTENDANCE_POLICIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Leave Entitlement Policy <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.leave_policy_id || 'leave-pol-std-2026'}
              onChange={(e) => {
                const pol = LEAVE_POLICIES.find((lp) => lp.id === e.target.value);
                onChange({ leave_policy_id: e.target.value, leave_policy_name: pol?.name });
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
            >
              {LEAVE_POLICIES.map((lp) => (
                <option key={lp.id} value={lp.id}>
                  {lp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: COMPENSATION & CTC STRUCTURE                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#07563D]" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              3. Compensation & CTC Configuration
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-[#07563D] px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Live Engine Sync
          </span>
        </div>

        {/* Compensation Basis Selector Cards */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            Compensation Basis & Calculation Architecture <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ compensation_basis: 'CTC_INCLUSIVE' })}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${(formData.compensation_basis || 'CTC_INCLUSIVE') === 'CTC_INCLUSIVE'
                  ? 'border-[#07563D] bg-emerald-50/50 shadow-xs ring-1 ring-[#07563D]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">CTC Inclusive (Cost-to-Company Based)</span>
                {(formData.compensation_basis || 'CTC_INCLUSIVE') === 'CTC_INCLUSIVE' && (
                  <span className="text-[10px] font-bold bg-[#07563D] text-white px-2 py-0.5 rounded-md">Active</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Gross pay is derived by subtracting employer statutory contributions (EPF, ESIC, Gratuity, LWF). Guaranteed invariant: Net ≤ Gross ≤ CTC.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChange({ compensation_basis: 'GROSS_BASED' })}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${formData.compensation_basis === 'GROSS_BASED'
                  ? 'border-[#07563D] bg-emerald-50/50 shadow-xs ring-1 ring-[#07563D]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">Gross Salary Based (Additive CTC)</span>
                {formData.compensation_basis === 'GROSS_BASED' && (
                  <span className="text-[10px] font-bold bg-[#07563D] text-white px-2 py-0.5 rounded-md">Active</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Gross monthly pay is fixed. Employer statutory contributions are added on top of Gross to determine total monthly CTC.
              </p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Salary Structure Master <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.salary_structure_code || 'CORP_STD_01'}
              onChange={(e) => {
                const s = SALARY_STRUCTURES.find((st) => st.code === e.target.value);
                onChange({ salary_structure_code: e.target.value, salary_structure_name: s?.name });
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              {SALARY_STRUCTURES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Payroll Processing Group <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.payroll_group_id || 'pg-monthly-main'}
              onChange={(e) => onChange({ payroll_group_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              {PAYROLL_GROUPS.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Salary Effective From <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={formData.salary_effective_from || formData.doj || new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange({ salary_effective_from: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            />
          </div>
        </div>

        {/* CTC Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1">
              Annual Cost to Company (CTC) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">₹</span>
              <input
                type="number"
                min={0}
                step={5000}
                value={annualCtc}
                onChange={(e) => handleAnnualCtcChange(parseFloat(e.target.value) || 0)}
                placeholder="1200000"
                className="w-full pl-8 pr-3 py-2.5 text-sm font-black text-gray-900 bg-white border border-gray-300 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/20 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Total annualized company financial commitment.</p>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-900 mb-1">
              Monthly CTC (Calculated: Annual / 12)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">₹</span>
              <input
                type="number"
                min={0}
                value={monthlyCtc}
                onChange={(e) => handleMonthlyCtcChange(parseFloat(e.target.value) || 0)}
                placeholder="100000"
                className="w-full pl-8 pr-3 py-2.5 text-sm font-black text-gray-900 bg-white border border-gray-300 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-[#07563D]/20 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Monthly wage budget before statutory split.</p>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* LIVE SALARY & STATUTORY BREAKDOWN PREVIEW CARD                */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-[#07563D] text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-300" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                    PAYROLL CALCULATION PREVIEW
                  </h4>
                  <span className="text-[9px] font-bold bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/60">
                    FY 2026–27 Organization Rules
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100">
                  Calculated using this organization's active payroll and statutory rules ({formData.compensation_basis === 'GROSS_BASED' ? 'Gross-Salary Based' : 'CTC Inclusive Model'})
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Estimated Net Monthly Take-Home</p>
              <p className="text-xl font-black text-white">
                ₹{liveCalculation.netMonthlyPay.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-emerald-200"> / month</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-700/50">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-300">Monthly Gross</p>
              <p className="text-sm font-black text-white">₹{liveCalculation.monthlyGrossEarnings.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-300">Employee Deductions</p>
              <p className="text-sm font-black text-rose-300">-₹{liveCalculation.totalEmployeeDeductions.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-300">Employer Contributions</p>
              <p className="text-sm font-black text-amber-200">₹{liveCalculation.totalEmployerContributions.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-300">Annual Net Take-Home</p>
              <p className="text-sm font-black text-white">₹{liveCalculation.annualNetPay.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Component Mini Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="space-y-1.5 bg-emerald-800/40 p-3 rounded-xl border border-emerald-700/40">
              <p className="text-[11px] font-black text-emerald-200 uppercase tracking-wider mb-2">Monthly Gross Earnings</p>
              <div className="flex justify-between text-emerald-100">
                <span>Basic Salary (50%):</span>
                <span className="font-bold text-white">₹{liveCalculation.basic.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>House Rent Allowance (40%):</span>
                <span className="font-bold text-white">₹{liveCalculation.hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Special Allowance (Residual):</span>
                <span className="font-bold text-white">₹{liveCalculation.specialAllowance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-100">
                <span>Conveyance & Medical Basket:</span>
                <span className="font-bold text-white">₹{(liveCalculation.conveyance + liveCalculation.medical).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-1.5 bg-emerald-800/40 p-3 rounded-xl border border-emerald-700/40">
              <p className="text-[11px] font-black text-rose-200 uppercase tracking-wider mb-2">Statutory & Tax Withholdings</p>
              <div className="flex justify-between text-emerald-100">
                <span>Employee EPF ({statutoryConfig.pf_employee_percent ?? 12}%):</span>
                <span className="font-bold text-rose-200">-₹{liveCalculation.epfEmployee.toLocaleString('en-IN')}</span>
              </div>
              {liveCalculation.esicEmployee > 0 && (
                <div className="flex justify-between text-emerald-100">
                  <span>Employee ESIC ({statutoryConfig.esi_employee_percent ?? 0.75}%):</span>
                  <span className="font-bold text-rose-200">-₹{liveCalculation.esicEmployee.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-100">
                <span>Professional Tax (PT):</span>
                <span className="font-bold text-rose-200">-₹{liveCalculation.professionalTax.toLocaleString('en-IN')}</span>
              </div>
              {liveCalculation.lwfEmployee > 0 && (
                <div className="flex justify-between text-emerald-100">
                  <span>Labour Welfare Fund (LWF):</span>
                  <span className="font-bold text-rose-200">-₹{liveCalculation.lwfEmployee.toLocaleString('en-IN')}</span>
                </div>
              )}
              {liveCalculation.estimatedTdsMonthly > 0 && (
                <div className="flex justify-between text-emerald-100">
                  <span>Estimated Monthly TDS:</span>
                  <span className="font-bold text-rose-200">-₹{liveCalculation.estimatedTdsMonthly.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-amber-200 pt-1 border-t border-emerald-700/50">
                <span>Employer EPF/ESIC/LWF Contribution:</span>
                <span className="font-bold">₹{liveCalculation.totalEmployerContributions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
