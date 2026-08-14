import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { Employee, EmploymentType, WorkMode, EmployeeStatus } from '../../types';
import { api } from '../../services/api';
import {
  User,
  MapPin,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Package,
  ShieldCheck,
  GraduationCap,
  Heart,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}

export const EmployeeCreateWizardModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    // Basic
    employee_code: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
    first_name: '',
    middle_name: '',
    last_name: '',
    display_name: '',
    preferred_name: '',
    work_email: '',
    personal_email: '',
    phone: '',
    alternate_phone: '',
    dob: '',
    gender: 'Male',
    marital_status: 'Single',
    nationality: 'Indian',
    blood_group: 'O+',
    preferred_language: 'English',

    // Addresses
    current_line1: '',
    current_line2: '',
    current_city: 'Coimbatore',
    current_state: 'Tamil Nadu',
    current_country: 'India',
    current_postal: '641001',
    same_as_permanent: true,
    perm_line1: '',
    perm_line2: '',
    perm_city: 'Coimbatore',
    perm_state: 'Tamil Nadu',
    perm_country: 'India',
    perm_postal: '641001',

    // Emergency Contacts
    emergency_name: '',
    emergency_relation: 'Spouse / Parent',
    emergency_phone: '',
    emergency_alt_phone: '',

    // Family
    family_name: '',
    family_relation: 'Spouse',
    family_dob: '',
    family_dependent: true,

    // Education
    degree: 'B.Tech Computer Science',
    institution: 'PSG College of Technology',
    edu_start: '2018-08-01',
    edu_end: '2022-05-30',
    edu_grade: '8.8 CGPA',

    // Experience
    prev_company: 'Infosys Limited',
    prev_title: 'Software Engineer',
    prev_start: '2022-06-15',
    prev_end: '2024-07-31',
    prev_reason: 'Career Growth & Scale',

    // Skills
    skills: 'React, TypeScript, Node.js, PostgreSQL, Tailwind CSS',

    // Employment
    doj: new Date().toISOString().split('T')[0],
    employment_type: 'Full Time' as EmploymentType,
    work_mode: 'Hybrid' as WorkMode,
    status: 'Probation' as EmployeeStatus,
    job_level: 'Mid Level',
    grade: 'G4',
    company_id: 'comp-01',
    branch_id: 'br-cbe',
    department_id: 'dept-eng',
    designation_id: 'desig-fe',
    business_unit: 'BU-Software',
    cost_center: 'CC-ENG-101',
    reporting_manager_id: 'emp-001',
    reporting_manager_name: 'Dharun Joy',
    probation_months: 6,

    // Statutory & Bank
    pan: 'ABCDE1234F',
    aadhaar: '1234-5678-9012',
    pf_uan: '100982341234',
    esi_no: '3100234123',
    tax_regime: 'New Regime',
    bank_name: 'HDFC Bank',
    bank_account: '50100293847123',
    ifsc: 'HDFC0001234',

    // Asset
    assigned_asset_serial: 'MAC-M3-90812',
    assigned_asset_name: 'MacBook Pro 16" M3 Max',
  });

  const updateForm = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const steps = [
    { num: 1, label: 'Basic Info', icon: User },
    { num: 2, label: 'Personal & Contact', icon: MapPin },
    { num: 3, label: 'Emergency & Family', icon: Heart },
    { num: 4, label: 'Edu & Experience', icon: GraduationCap },
    { num: 5, label: 'Skills & Tech', icon: Users },
    { num: 6, label: 'Employment & Org', icon: Briefcase },
    { num: 7, label: 'Statutory & Bank', icon: CreditCard },
    { num: 8, label: 'Documents & Assets', icon: Package },
    { num: 9, label: 'Review & Onboard', icon: CheckCircle2 },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveDraft = () => {
    showToast('Employee application draft saved securely.');
  };

  const handleSubmit = async () => {
    try {
      const created = await api.createEmployee({
        employee_code: formData.employee_code,
        first_name: formData.first_name || 'New',
        last_name: formData.last_name || 'Employee',
        work_email: formData.work_email || `${formData.first_name.toLowerCase() || 'emp'}@acme.com`,
        status: formData.status,
        employment_type: formData.employment_type,
        company_id: formData.company_id,
        department_id: formData.department_id,
        designation_id: formData.designation_id,
        branch_id: formData.branch_id,
        profile: {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          personal_email: formData.personal_email,
          phone: formData.phone,
          alternate_phone: formData.alternate_phone,
          date_of_birth: formData.dob,
          gender: formData.gender,
          marital_status: formData.marital_status,
          nationality: formData.nationality,
          blood_group: formData.blood_group,
          emergency_contact_name: formData.emergency_name,
          emergency_contact_phone: formData.emergency_phone,
          current_address: {
            line1: formData.current_line1,
            line2: formData.current_line2,
            city: formData.current_city,
            state: formData.current_state,
            country: formData.current_country,
            postal_code: formData.current_postal,
          },
          permanent_address: {
            line1: formData.same_as_permanent ? formData.current_line1 : formData.perm_line1,
            line2: formData.same_as_permanent ? formData.current_line2 : formData.perm_line2,
            city: formData.same_as_permanent ? formData.current_city : formData.perm_city,
            state: formData.same_as_permanent ? formData.current_state : formData.perm_state,
            country: formData.same_as_permanent ? formData.current_country : formData.perm_country,
            postal_code: formData.same_as_permanent ? formData.current_postal : formData.perm_postal,
          },
          statutory_and_bank: {
            pan_number_masked: formData.pan,
            aadhaar_masked: formData.aadhaar,
            pf_uan: formData.pf_uan,
            esi_number: formData.esi_no,
            tax_regime: formData.tax_regime as any,
            bank_name: formData.bank_name,
            bank_account_masked: formData.bank_account,
            ifsc_code: formData.ifsc,
          },
        },
        employment: {
          doj: formData.doj,
          employment_type: formData.employment_type,
          work_mode: formData.work_mode,
          job_level: formData.job_level,
          grade: formData.grade,
          reporting_manager_id: formData.reporting_manager_id,
          reporting_manager_name: formData.reporting_manager_name,
          probation_period_months: Number(formData.probation_months),
          probation_end_date: new Date(Date.now() + Number(formData.probation_months) * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          history: [
            {
              id: `hist-${Date.now()}`,
              event_type: 'Created',
              changed_by: 'HR Head (Admin)',
              changed_at: new Date().toISOString(),
              reason: 'Onboarded via Core HR Employee Master Wizard',
            },
          ],
        },
      });

      showToast(`Employee ${created.first_name} ${created.last_name} onboarded successfully! (${created.employee_code})`);
      onCreated(created);
      onClose();
    } catch (err: any) {
      showToast('Failed to onboard employee: ' + (err.message || err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Core HR — Employee Master Creation Wizard" size="2xl">
      <div className="space-y-6">
        {/* Step Progress Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar gap-2">
          {steps.map(s => {
            const Icon = s.icon;
            const isDone = s.num < currentStep;
            const isCurrent = s.num === currentStep;

            return (
              <div
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-gray-50 text-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {s.num}. {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP CONTENT SWITCH */}
        <div className="min-h-[360px]">
          {/* STEP 1: BASIC INFO */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 1: Basic Identity & Contact Emails</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Employee ID / Code</label>
                  <Input value={formData.employee_code} onChange={e => updateForm('employee_code', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">First Name *</label>
                  <Input value={formData.first_name} onChange={e => updateForm('first_name', e.target.value)} placeholder="e.g. Anand" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Middle Name</label>
                  <Input value={formData.middle_name} onChange={e => updateForm('middle_name', e.target.value)} placeholder="e.g. Kumar" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Last Name *</label>
                  <Input value={formData.last_name} onChange={e => updateForm('last_name', e.target.value)} placeholder="e.g. Viswanathan" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Work Email *</label>
                  <Input value={formData.work_email} onChange={e => updateForm('work_email', e.target.value)} placeholder="anand.v@acme.com" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Personal Email</label>
                  <Input value={formData.personal_email} onChange={e => updateForm('personal_email', e.target.value)} placeholder="anand.personal@gmail.com" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Mobile Phone *</label>
                  <Input value={formData.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Date of Birth</label>
                  <Input type="date" value={formData.dob} onChange={e => updateForm('dob', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Gender</label>
                  <Select value={formData.gender} onChange={e => updateForm('gender', e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer Not To Say">Prefer Not To Say</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PERSONAL & CONTACT */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 2: Personal Traits & Residential Addresses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Marital Status</label>
                  <Select value={formData.marital_status} onChange={e => updateForm('marital_status', e.target.value)}>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Nationality</label>
                  <Input value={formData.nationality} onChange={e => updateForm('nationality', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Blood Group</label>
                  <Select value={formData.blood_group} onChange={e => updateForm('blood_group', e.target.value)}>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                <span className="text-xs font-bold text-gray-900">Current Address</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input placeholder="Line 1" value={formData.current_line1} onChange={e => updateForm('current_line1', e.target.value)} />
                  <Input placeholder="Line 2" value={formData.current_line2} onChange={e => updateForm('current_line2', e.target.value)} />
                  <Input placeholder="City" value={formData.current_city} onChange={e => updateForm('current_city', e.target.value)} />
                  <Input placeholder="Postal Code" value={formData.current_postal} onChange={e => updateForm('current_postal', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="same_addr"
                  checked={formData.same_as_permanent}
                  onChange={e => updateForm('same_as_permanent', e.target.checked)}
                  className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D]"
                />
                <label htmlFor="same_addr" className="text-xs font-semibold text-gray-700">
                  Permanent address is same as current address
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: EMERGENCY & FAMILY */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 3: Primary Emergency Contacts & Family Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-2">
                  <span className="text-xs font-bold text-red-900">Primary Emergency Contact</span>
                  <Input placeholder="Contact Person Name" value={formData.emergency_name} onChange={e => updateForm('emergency_name', e.target.value)} />
                  <Input placeholder="Relationship (e.g. Spouse, Father)" value={formData.emergency_relation} onChange={e => updateForm('emergency_relation', e.target.value)} />
                  <Input placeholder="Emergency Phone Number" value={formData.emergency_phone} onChange={e => updateForm('emergency_phone', e.target.value)} />
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                  <span className="text-xs font-bold text-[#07563D]">Family Dependent Information</span>
                  <Input placeholder="Dependent Family Member Name" value={formData.family_name} onChange={e => updateForm('family_name', e.target.value)} />
                  <Input placeholder="Relationship (e.g. Spouse / Child)" value={formData.family_relation} onChange={e => updateForm('family_relation', e.target.value)} />
                  <Input type="date" value={formData.family_dob} onChange={e => updateForm('family_dob', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EDUCATION & EXPERIENCE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 4: Educational Qualifications & Previous Work Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-gray-900">Highest Education Qualification</span>
                  <Input placeholder="Degree / Qualification" value={formData.degree} onChange={e => updateForm('degree', e.target.value)} />
                  <Input placeholder="University / Institution" value={formData.institution} onChange={e => updateForm('institution', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={formData.edu_start} onChange={e => updateForm('edu_start', e.target.value)} />
                    <Input type="date" value={formData.edu_end} onChange={e => updateForm('edu_end', e.target.value)} />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-gray-900">Last Employer Details</span>
                  <Input placeholder="Previous Company Name" value={formData.prev_company} onChange={e => updateForm('prev_company', e.target.value)} />
                  <Input placeholder="Job Title / Role" value={formData.prev_title} onChange={e => updateForm('prev_title', e.target.value)} />
                  <Input placeholder="Reason for Leaving" value={formData.prev_reason} onChange={e => updateForm('prev_reason', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SKILLS */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 5: Skill Matrix & Core Competencies</h3>
              <div>
                <label className="text-[11px] font-bold text-gray-600">Key Technical & Soft Skills (comma separated)</label>
                <textarea
                  rows={4}
                  value={formData.skills}
                  onChange={e => updateForm('skills', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
                  placeholder="e.g. React, TypeScript, Node.js, Project Management, Agile SCRUM"
                />
              </div>
            </div>
          )}

          {/* STEP 6: EMPLOYMENT & ORG */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 6: Employment Structure & Organizational Hierarchy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Date of Joining (DOJ) *</label>
                  <Input type="date" value={formData.doj} onChange={e => updateForm('doj', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Employment Type</label>
                  <Select value={formData.employment_type} onChange={e => updateForm('employment_type', e.target.value)}>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Consultant">Consultant</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Work Mode</label>
                  <Select value={formData.work_mode} onChange={e => updateForm('work_mode', e.target.value)}>
                    <option value="Office">Office</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="Field">Field</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Department</label>
                  <Select value={formData.department_id} onChange={e => updateForm('department_id', e.target.value)}>
                    <option value="dept-eng">Engineering & Product</option>
                    <option value="dept-hr">People Operations & HR</option>
                    <option value="dept-fin">Finance & Legal</option>
                    <option value="dept-ops">Operations & Supply Chain</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Designation</label>
                  <Select value={formData.designation_id} onChange={e => updateForm('designation_id', e.target.value)}>
                    <option value="desig-fe">Senior Frontend Architect</option>
                    <option value="desig-be">Principal Backend Lead</option>
                    <option value="desig-hrbp">HR Business Partner</option>
                    <option value="desig-fin">Financial Controller</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Reporting Manager</label>
                  <Input value={formData.reporting_manager_name} onChange={e => updateForm('reporting_manager_name', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: STATUTORY & BANK */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 7: Tax Identifiers, Statutory Registrations & Bank Disclosures</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600">PAN Number</label>
                  <Input value={formData.pan} onChange={e => updateForm('pan', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Aadhaar / National ID</label>
                  <Input value={formData.aadhaar} onChange={e => updateForm('aadhaar', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">PF UAN Number</label>
                  <Input value={formData.pf_uan} onChange={e => updateForm('pf_uan', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Bank Name</label>
                  <Input value={formData.bank_name} onChange={e => updateForm('bank_name', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Bank Account No.</label>
                  <Input value={formData.bank_account} onChange={e => updateForm('bank_account', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600">IFSC / SWIFT Code</label>
                  <Input value={formData.ifsc} onChange={e => updateForm('ifsc', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: DOCUMENTS & ASSETS */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 8: Document Verification & Asset Allocation Pool</h3>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                <span className="text-xs font-bold text-[#07563D]">Hardware Asset Provisioning</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">Asset Title</label>
                    <Input value={formData.assigned_asset_name} onChange={e => updateForm('assigned_asset_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600">Serial Tag</label>
                    <Input value={formData.assigned_asset_serial} onChange={e => updateForm('assigned_asset_serial', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: REVIEW */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Step 9: Final Master Verification & Onboarding Authorization</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Employee Code:</span>
                  <span className="font-bold text-gray-900">{formData.employee_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Full Name:</span>
                  <span className="font-bold text-gray-900">{formData.first_name} {formData.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Work Email:</span>
                  <span className="font-bold text-emerald-800">{formData.work_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Joining Date:</span>
                  <span className="font-bold text-gray-900">{formData.doj}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Department & Manager:</span>
                  <span className="font-bold text-gray-900">{formData.department_id} (Reporting to: {formData.reporting_manager_name})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} leftIcon={<Save className="w-4 h-4" />}>
            Save Draft
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="outline" size="sm" onClick={handlePrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Previous
              </Button>
            )}

            {currentStep < steps.length ? (
              <Button size="sm" onClick={handleNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue Next
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Confirm & Onboard Employee
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
