import React, { useState, useEffect, useMemo } from 'react';
import { Department, Designation, Branch, Location, EmploymentType, WorkMode, EmployeeStatus, EmploymentSource, Vendor } from '../../../types';
import { payrollCalculationEngine } from '../../../services/payroll/payrollCalculationEngine';
import { payrollApi } from '../../../services/payrollApi';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { ClientMasterService } from '../../../services/clientBilling/clientMasterService';
import { ClientMaster, ClientContract } from '../../../types/clientBilling';
import { organizationStructureService } from '../../../services/organization/organizationStructureService';
import { attendanceRosterService } from '../../../services/attendance/attendanceRosterService';
import { ShiftMaster } from '../../../types/shiftRoster';
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
  department_name?: string;
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
  tds_applicable?: boolean;
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

function formatShiftOptionLabel(s: ShiftMaster): string {
  const formatTime = (t: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr || '00';
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  };

  const name = s.shift_name.replace(/\(.*?\)/g, '').trim();
  const times = `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`;
  return `${name} (${times})`;
}

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
  const [isSavingDesig, setIsSavingDesig] = useState(false);

  // Designation Dropdown States (Live Backend Sourced)
  const [availableDesignations, setAvailableDesignations] = useState<Designation[]>(designations || []);

  // Live Backend Sourced Shifts from Shift Master
  const [availableShifts, setAvailableShifts] = useState<ShiftMaster[]>(() => {
    try {
      const list = attendanceRosterService.getShifts();
      if (list && list.length > 0) return list.filter((s) => s.status !== 'INACTIVE');
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      const list = attendanceRosterService.getShifts();
      if (list && list.length > 0) {
        setAvailableShifts(list.filter((s) => s.status !== 'INACTIVE'));
      }
    } catch (_) {}
  }, []);

  const currentShiftId = useMemo(() => {
    if (!formData.shift_id) {
      return availableShifts[0]?.id || 'shift-general-01';
    }
    // Direct match by ID
    const direct = availableShifts.find((s) => s.id === formData.shift_id);
    if (direct) return direct.id;

    // Match via service getShiftById
    const resolved = attendanceRosterService.getShiftById(formData.shift_id);
    if (resolved && availableShifts.some((s) => s.id === resolved.id)) {
      return resolved.id;
    }

    // Match by code or name
    const byCodeOrName = availableShifts.find(
      (s) =>
        s.shift_code.toLowerCase() === formData.shift_id?.toLowerCase() ||
        (formData.shift_name && s.shift_name.toLowerCase().includes(formData.shift_name.toLowerCase()))
    );
    if (byCodeOrName) return byCodeOrName.id;

    return formData.shift_id;
  }, [formData.shift_id, formData.shift_name, availableShifts]);

  const handleSaveCustomDesig = async (overrideTitle?: string) => {
    const raw = (overrideTitle !== undefined ? overrideTitle : customTitle).trim();
    if (!raw) return;

    // Check if designation already exists in availableDesignations
    const existingMatch = availableDesignations.find((d) => d.title.trim().toLowerCase() === raw.toLowerCase());
    if (existingMatch) {
      onChange({
        designation_id: existingMatch.id,
        designation_title: existingMatch.title,
      });
      setCustomTitle('');
      setIsCustomDesig(false);
      return;
    }

    setIsSavingDesig(true);
    try {
      const activeComp = api.getActiveCompany();
      const compId = activeComp?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeComp.id) ? activeComp.id : '2030277f-a6a1-427f-beaf-4fc677a3bae2';
      const created = await api.createDesignation({
        title: raw,
        code: raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'DESIG',
        company_id: compId,
      });
      if (created) {
        setAvailableDesignations((prev) => {
          const map = new Map<string, Designation>();
          map.set(created.id, created);
          prev.forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
        });
        onChange({
          designation_id: created.id,
          designation_title: created.title,
        });
        setCustomTitle('');
        setIsCustomDesig(false);
      }
    } catch (err) {
      console.warn('Failed to add custom designation:', err);
    } finally {
      setIsSavingDesig(false);
    }
  };

  // Department Dropdown States (Live Backend Sourced)
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>(departments || []);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  useEffect(() => {
    api.getDesignations().then((list) => {
      if (list && list.length > 0) {
        setAvailableDesignations((prev) => {
          const map = new Map<string, Designation>();
          list.forEach((d) => map.set(d.id, d));
          (designations || []).forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          prev.forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
        });
      }
    }).catch(() => {});

    const handleDesigAdded = (e: any) => {
      if (e?.detail) {
        setAvailableDesignations((prev) => {
          const map = new Map<string, Designation>();
          map.set(e.detail.id, e.detail);
          prev.forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
        });
      }
    };
    window.addEventListener('designation:created', handleDesigAdded);
    return () => window.removeEventListener('designation:created', handleDesigAdded);
  }, [designations]);

  // Database-Driven Vendor & Contract States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(false);
  const [clients, setClients] = useState<ClientMaster[]>([]);
  const [allContracts, setAllContracts] = useState<ClientContract[]>([]);

  useEffect(() => {
    // Dynamically fetch and merge all authoritative departments created in the system
    organizationStructureService.getDepartments().then((list) => {
      if (list && list.length > 0) {
        setAvailableDepartments((prev) => {
          const map = new Map<string, Department>();
          list.forEach((d) => map.set(d.id, d));
          (departments || []).forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          prev.forEach((d) => { if (!map.has(d.id)) map.set(d.id, d); });
          return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    }).catch(() => {
      api.getDepartments().then((list) => {
        if (list && list.length > 0) {
          setAvailableDepartments(list.sort((a, b) => a.name.localeCompare(b.name)));
        }
      }).catch(() => {});
    });
  }, [departments]);

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
      esiApplicable: formData.esi_applicable === true,
      ptApplicable: formData.pt_applicable !== false,
      tdsApplicable: formData.tds_applicable !== false,
      statutoryConfig,
    });
  }, [annualCtc, monthlyCtc, salaryStructureCode, formData.compensation_basis, formData.pf_applicable, formData.esi_applicable, formData.pt_applicable, formData.tds_applicable, statutoryConfig]);

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

        {/* Department & Designation (Direct Typing + Datalist Suggestions) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={
                (() => {
                  const currentDeptName = (formData.department_name || '').trim().toLowerCase();
                  if (currentDeptName) {
                    const match = availableDepartments.find((d) => d.name.trim().toLowerCase() === currentDeptName);
                    if (match) return match.id;
                  }
                  if (formData.department_id) {
                    const match = availableDepartments.find((d) => d.id === formData.department_id);
                    if (match) return match.id;
                  }
                  return formData.department_id || '';
                })()
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__ADD_NEW__') {
                  setIsCustomDept(true);
                  return;
                }
                const match = availableDepartments.find((d) => d.id === val);
                onChange({
                  department_id: val,
                  department_name: match ? match.name : '',
                });
                setIsCustomDept(false);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold text-gray-900 cursor-pointer"
            >
              <option value="">-- Select Existing Department --</option>
              {formData.department_name && !availableDepartments.some((d) => d.name.trim().toLowerCase() === formData.department_name?.trim().toLowerCase()) && (
                <option value={formData.department_id || formData.department_name}>
                  {formData.department_name}
                </option>
              )}
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} {dept.code ? `(${dept.code})` : ''}
                </option>
              ))}
              <option value="__ADD_NEW__">+ Add / Type New Department...</option>
            </select>

            {isCustomDept && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <input
                  type="text"
                  placeholder="Enter new department name (e.g. Quality Assurance)"
                  value={customDeptName}
                  onChange={(e) => setCustomDeptName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={isSavingDept || !customDeptName.trim()}
                  onClick={async () => {
                    const trimmed = customDeptName.trim();
                    if (!trimmed) return;
                    setIsSavingDept(true);
                    try {
                      const created = await organizationStructureService.createDepartment({
                        name: trimmed,
                        code: trimmed.slice(0, 4).toUpperCase(),
                        status: 'Active',
                      });
                      if (created) {
                        setAvailableDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                        onChange({
                          department_id: created.id,
                          department_name: created.name,
                        });
                        setCustomDeptName('');
                        setIsCustomDept(false);
                      }
                    } catch (err) {
                      console.warn('Failed to add custom department:', err);
                    } finally {
                      setIsSavingDept(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-[#07563D] text-white rounded-lg hover:bg-[#064e37] disabled:opacity-50 cursor-pointer"
                >
                  {isSavingDept ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDept(false);
                    setCustomDeptName('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Designation / Official Job Title <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={
                (() => {
                  const currentTitle = (formData.designation_title || '').trim().toLowerCase();
                  if (currentTitle) {
                    const match = availableDesignations.find((d) => d.title.trim().toLowerCase() === currentTitle);
                    if (match) return match.id;
                  }
                  if (formData.designation_id) {
                    const match = availableDesignations.find((d) => d.id === formData.designation_id);
                    if (match) return match.id;
                  }
                  return formData.designation_id || '';
                })()
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__add_new__') {
                  setIsCustomDesig(true);
                  return;
                }
                setIsCustomDesig(false);
                setCustomTitle('');
                const matched = availableDesignations.find((d) => d.id === val);
                if (matched) {
                  onChange({
                    designation_id: matched.id,
                    designation_title: matched.title,
                  });
                } else {
                  onChange({ designation_id: val, designation_title: '' });
                }
              }}
              className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="">-- Choose Designation --</option>
              {formData.designation_title && !availableDesignations.some((d) => d.title.trim().toLowerCase() === formData.designation_title?.trim().toLowerCase()) && (
                <option value={formData.designation_id || formData.designation_title}>
                  {formData.designation_title}
                </option>
              )}
              {availableDesignations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.title}
                </option>
              ))}
              <option value="__add_new__" className="text-[#07563D] font-bold">
                + Add / Type New Designation...
              </option>
            </select>

            {isCustomDesig && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <input
                  type="text"
                  placeholder="Enter designation title (e.g. Senior Software Engineer, Operations Specialist)"
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    onChange({ designation_title: e.target.value });
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await handleSaveCustomDesig();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={isSavingDesig || !customTitle.trim()}
                  onClick={() => handleSaveCustomDesig()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-[#07563D] text-white rounded-lg hover:bg-[#064e37] disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                >
                  {isSavingDesig ? 'Adding...' : 'Add Designation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDesig(false);
                    setCustomTitle('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
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
              value={currentShiftId}
              onChange={(e) => {
                const s = availableShifts.find((opt) => opt.id === e.target.value) ||
                  attendanceRosterService.getShiftById(e.target.value);
                onChange({
                  shift_id: e.target.value,
                  shift_name: s?.shift_name || e.target.value,
                });
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium text-gray-900"
            >
              {availableShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatShiftOptionLabel(s)}
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

        {/* Statutory Applicability Quick Toggles */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#07563D]" />
              Statutory Deductions Applicability
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Toggle statutory components for monthly payroll computation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer hover:bg-emerald-50/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.pf_applicable !== false}
                onChange={(e) => onChange({ pf_applicable: e.target.checked })}
                className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">EPF</p>
                <p className="text-[10px] text-gray-500">12% PF Basket</p>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer hover:bg-emerald-50/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.esi_applicable === true}
                onChange={(e) => onChange({ esi_applicable: e.target.checked })}
                className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">ESIC</p>
                <p className="text-[10px] text-gray-500">Medical Cover</p>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer hover:bg-emerald-50/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.pt_applicable !== false}
                onChange={(e) => onChange({ pt_applicable: e.target.checked })}
                className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">Prof. Tax (PT)</p>
                <p className="text-[10px] text-gray-500">State PT Slab</p>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer hover:bg-emerald-50/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.tds_applicable !== false}
                onChange={(e) => onChange({ tds_applicable: e.target.checked })}
                className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">TDS / Tax</p>
                <p className="text-[10px] text-gray-500">Income Tax Deduction</p>
              </div>
            </label>
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
