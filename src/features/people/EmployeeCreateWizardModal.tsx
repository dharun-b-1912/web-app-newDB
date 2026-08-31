import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import {
  Employee,
  Department,
  Designation,
  Branch,
  Location,
  EmploymentType,
  EmploymentSource,
  WorkMode,
  EmployeeStatus,
} from '../../types';
import { api } from '../../services/api';
import { onboardingService } from '../../services/onboardingService';
import { hrEventBus } from '../../services/hrEventBus';
import { payrollApi } from '../../services/payrollApi';

// Wizard Subcomponents
import { WizardProgressHeader, WIZARD_STEPS } from './wizard/WizardProgressHeader';
import { Step1Identity, Step1FormData } from './wizard/Step1Identity';
import { Step2Contact, Step2FormData } from './wizard/Step2Contact';
import { Step3Employment, Step3FormData } from './wizard/Step3Employment';
import { Step4Organization, Step4FormData } from './wizard/Step4Organization';
import { Step5Emergency, Step5FormData, FamilyMemberItem } from './wizard/Step5Emergency';
import { Step6Documents, Step6FormData, UploadedDocumentItem } from './wizard/Step6Documents';
import { Step7Review } from './wizard/Step7Review';
import { WizardSuccessScreen } from './wizard/WizardSuccessScreen';
import { ArrowLeft, ArrowRight, CheckCircle2, Save, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (emp: Employee) => void;
  onUpdated?: (emp: Employee) => void;
  employeeToEdit?: Employee | null;
}

const STORAGE_KEY_DRAFT = 'workforce_employee_wizard_draft_v2';

export const EmployeeCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  employeeToEdit,
}) => {
  const { showToast } = useToast();
  const { activeCompany, organization } = useTenant();
  const { user } = useAuth();

  const isEditMode = Boolean(employeeToEdit);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Master Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);

  // Draft Save State
  const [draftLastSavedText, setDraftLastSavedText] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  // Initial Form Data Generator
  const getInitialFormData = () => ({
    // Step 1: Identity
    photo_url: '',
    employee_code: `JCS-${Math.floor(100 + Math.random() * 900)}`,
    first_name: '',
    middle_name: '',
    last_name: '',
    preferred_name: '',
    work_email: '',
    personal_email: '',
    email_type: 'WORK' as 'PERSONAL' | 'WORK' | 'NONE',
    phone: '',
    dob: '',
    gender: 'Male',

    // Step 7: Employee App Access & Login
    enable_app_access: true,
    auth_method: 'EMPLOYEE_ID_PASSWORD' as 'EMPLOYEE_ID_PASSWORD' | 'MOBILE_OTP' | 'EMAIL_PASSWORD',
    require_password_change: true,
    require_device_verification: true,

    // Step 2: Contact
    alternate_phone: '',
    marital_status: 'Single',
    nationality: 'Indian',
    blood_group: 'O+',
    preferred_language: 'English',
    current_line1: '',
    current_line2: '',
    current_city: activeCompany?.city || 'Coimbatore',
    current_state: 'Tamil Nadu',
    current_country: activeCompany?.country || 'India',
    current_postal: '641001',
    same_as_permanent: true,
    perm_line1: '',
    perm_line2: '',
    perm_city: activeCompany?.city || 'Coimbatore',
    perm_state: 'Tamil Nadu',
    perm_country: activeCompany?.country || 'India',
    perm_postal: '641001',

    // Step 3: Employment & Compensation
    doj: new Date().toISOString().split('T')[0],
    confirmation_date: '',
    employment_type: 'Full Time' as EmploymentType,
    employment_source: 'DIRECT' as EmploymentSource,
    vendor_id: '',
    vendor_name: '',
    vendor_employee_code: '',
    vendor_contract_id: '',
    vendor_start_date: '',
    vendor_end_date: '',
    status: 'Active' as EmployeeStatus,
    department_id: '',
    department_name: '',
    designation_id: '',
    designation_title: '',
    branch_id: '',
    location_id: '',
    work_mode: 'Hybrid' as WorkMode,
    job_level: 'Mid Level',
    grade: 'G3',
    probation_months: 6,
    notice_period_days: 60,

    // Work Assignment
    shift_id: 'shift-general-01',
    shift_name: 'General Shift (09:30 AM – 06:30 PM)',
    attendance_policy_id: 'pol-standard-office',
    leave_policy_id: 'leave-pol-std-2026',
    leave_policy_name: 'Standard Full-Time Leave Policy',

    // Compensation & CTC
    salary_structure_code: 'CORP_STD_01',
    salary_structure_name: 'Corporate Standard CTC Structure',
    annual_ctc: 1200000,
    monthly_ctc: 100000,
    currency: 'INR',
    pay_frequency: 'MONTHLY',
    payroll_group_id: 'pg-monthly-main',
    salary_effective_from: new Date().toISOString().split('T')[0],
    pf_applicable: true,
    esi_applicable: false,
    pt_applicable: true,

    // Step 4: Organization & Reporting
    reporting_manager_id: '',
    reporting_manager_name: '',
    team_lead_id: '',
    team_lead_name: '',
    hr_owner_id: '',
    business_unit: 'Enterprise Software',
    cost_center: 'CC-ENG-101',

    // Step 5: Emergency, Bank & Statutory
    emergency_name: '',
    emergency_relation: 'Spouse',
    emergency_phone: '',
    emergency_alt_phone: '',
    emergency_email: '',
    emergency_address: '',
    family_members: [] as FamilyMemberItem[],
    bank_name: 'HDFC Bank',
    account_number: '',
    ifsc: 'HDFC0001234',
    account_holder_name: '',
    account_type: 'SALARY' as 'SALARY' | 'SAVINGS' | 'CURRENT',
    pan: '',
    uan: '',
    pf_number: '',
    esi_number: '',
    tax_regime: 'NEW' as 'NEW' | 'OLD',

    // Step 6: Documents
    documents: [] as UploadedDocumentItem[],
  });

  const getEmployeeFormData = useCallback((emp: Employee | null) => {
    if (!emp) return getInitialFormData();

    const p: any = emp.profile || {};
    const e: any = emp.employment || {};
    const currAddr = typeof p.current_address === 'object' && p.current_address !== null ? (p.current_address as any) : {};
    const permAddr = typeof p.permanent_address === 'object' && p.permanent_address !== null ? (p.permanent_address as any) : {};
    const primaryEmergency = (p.emergency_contacts && p.emergency_contacts[0]) || {};

    return {
      // Step 1: Identity
      photo_url: emp.avatar_url || '',
      employee_code: emp.employee_code || '',
      first_name: emp.first_name || '',
      middle_name: (p as any).middle_name || (emp as any).middle_name || '',
      last_name: emp.last_name || '',
      preferred_name: (p as any).display_name || emp.display_name || '',
      work_email: emp.work_email || '',
      personal_email: p.personal_email || '',
      phone: p.phone || (p as any).primary_mobile || '',
      dob: p.date_of_birth || '',
      gender: p.gender || 'Male',

      // Step 2: Contact
      alternate_phone: p.alternate_phone || '',
      marital_status: p.marital_status || 'Single',
      nationality: p.nationality || 'Indian',
      blood_group: p.blood_group || 'O+',
      preferred_language: p.preferred_language || 'English',
      current_line1: currAddr.line1 || (typeof p.current_address === 'string' ? p.current_address : ''),
      current_line2: currAddr.line2 || '',
      current_city: currAddr.city || activeCompany?.city || 'Coimbatore',
      current_state: currAddr.state || 'Tamil Nadu',
      current_country: currAddr.country || activeCompany?.country || 'India',
      current_postal: currAddr.postal_code || '641001',
      same_as_permanent: !permAddr.line1 || permAddr.line1 === currAddr.line1,
      perm_line1: permAddr.line1 || (typeof p.permanent_address === 'string' ? p.permanent_address : ''),
      perm_line2: permAddr.line2 || '',
      perm_city: permAddr.city || activeCompany?.city || 'Coimbatore',
      perm_state: permAddr.state || 'Tamil Nadu',
      perm_country: permAddr.country || activeCompany?.country || 'India',
      perm_postal: permAddr.postal_code || '641001',

      // Step 3: Employment & Compensation
      doj: e.doj || emp.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      confirmation_date: (e as any).confirmation_date || '',
      employment_type: (emp.employment_type || e.employment_type || 'Full Time') as EmploymentType,
      employment_source: (emp.employment_source || e.employment_source || 'DIRECT') as EmploymentSource,
      vendor_id: emp.vendor_id || e.vendor_id || '',
      vendor_name: emp.vendor_name || e.vendor_name || '',
      vendor_employee_code: emp.vendor_employee_code || e.vendor_employee_code || '',
      vendor_contract_id: e.vendor_contract_id || '',
      vendor_start_date: e.vendor_start_date || '',
      vendor_end_date: e.vendor_end_date || '',
      status: (emp.status || 'Active') as EmployeeStatus,
      department_id: emp.department_id || '',
      department_name: emp.department_name || '',
      designation_id: emp.designation_id || '',
      designation_title: emp.designation_title || '',
      branch_id: emp.branch_id || '',
      location_id: (emp as any).location_id || '',
      work_mode: (e.work_mode || 'Hybrid') as WorkMode,
      job_level: e.job_level || 'Mid Level',
      grade: e.grade || 'G3',
      probation_months: e.probation_period_months || 6,
      notice_period_days: e.notice_period_days || 60,

      // Work Assignment
      shift_id: (e as any).shift_id || 'shift-general-01',
      shift_name: (e as any).shift_name || 'General Shift (09:30 AM – 06:30 PM)',
      attendance_policy_id: (e as any).attendance_policy_id || 'pol-standard-office',
      leave_policy_id: (e as any).leave_policy_id || 'leave-pol-std-2026',
      leave_policy_name: (e as any).leave_policy_name || 'Standard Full-Time Leave Policy',

      // Compensation & CTC
      salary_structure_code: (e as any).salary_structure_code || 'CORP_STD_01',
      salary_structure_name: (e as any).salary_structure_name || 'Corporate Standard CTC Structure',
      annual_ctc: Number(e.ctc || (e as any).annual_ctc || (emp as any).ctc || (emp as any).annual_ctc || (p as any).annual_ctc || 1200000),
      monthly_ctc: Math.round(Number(e.ctc || (e as any).annual_ctc || (emp as any).ctc || (emp as any).annual_ctc || (p as any).annual_ctc || 1200000) / 12),
      currency: (e as any).currency || 'INR',
      pay_frequency: (e as any).pay_frequency || 'MONTHLY',
      payroll_group_id: (e as any).payroll_group_id || 'pg-monthly-main',
      salary_effective_from: (e as any).salary_effective_from || e.doj || new Date().toISOString().split('T')[0],
      pf_applicable: (emp as any).statutory?.pf_applicable !== undefined ? (emp as any).statutory?.pf_applicable : ((e as any).pf_applicable !== false),
      esi_applicable: (emp as any).statutory?.esi_applicable !== undefined ? (emp as any).statutory?.esi_applicable : ((e as any).esi_applicable === true),
      pt_applicable: (emp as any).statutory?.pt_applicable !== undefined ? (emp as any).statutory?.pt_applicable : ((e as any).pt_applicable !== false),

      // Step 4: Organization & Reporting
      reporting_manager_id: e.reporting_manager_id || '',
      reporting_manager_name: e.reporting_manager_name || '',
      team_lead_id: e.team_lead_id || '',
      team_lead_name: e.team_lead_name || '',
      hr_owner_id: (e as any).hr_owner_id || '',
      business_unit: (e as any).business_unit || 'Enterprise Software',
      cost_center: e.cost_center_code || 'CC-ENG-101',

      // Step 5: Emergency, Bank & Statutory
      emergency_name: primaryEmergency.name || '',
      emergency_relation: primaryEmergency.relationship || 'Spouse',
      emergency_phone: primaryEmergency.phone || '',
      emergency_alt_phone: primaryEmergency.alt_phone || '',
      emergency_email: primaryEmergency.email || '',
      emergency_address: '',
      family_members: p.family_members || [],
      bank_name: (emp as any).bank?.bank_name || (p as any)?.bank_account?.bank_name || 'HDFC Bank',
      account_number: (emp as any).bank?.account_number || (p as any)?.bank_account?.account_number || '',
      ifsc: (emp as any).bank?.ifsc || (emp as any).bank?.ifsc_code || (p as any)?.bank_account?.ifsc || 'HDFC0001234',
      account_holder_name: (emp as any).bank?.account_holder_name || (p as any)?.bank_account?.account_holder_name || `${emp.first_name} ${emp.last_name}`.trim(),
      account_type: ((emp as any).bank?.account_type || (p as any)?.bank_account?.account_type || 'SALARY') as 'SALARY' | 'SAVINGS' | 'CURRENT',
      pan: (emp as any).statutory?.pan || (emp as any).statutory?.pan_number || (p as any)?.statutory?.pan || '',
      uan: (emp as any).statutory?.uan || (emp as any).statutory?.uan_number || (p as any)?.statutory?.uan || '',
      pf_number: (emp as any).statutory?.pf_number || (p as any)?.statutory?.pf_number || '',
      esi_number: (emp as any).statutory?.esi_number || (p as any)?.statutory?.esi_number || '',
      tax_regime: ((emp as any).statutory?.tax_regime || (p as any)?.statutory?.tax_regime || 'NEW') as 'NEW' | 'OLD',

      // Step 6: Documents
      documents: (emp as any).documents || [],
    };
  }, [activeCompany?.city]);

  const [formData, setFormData] = useState(() => getEmployeeFormData(employeeToEdit || null));

  // Reset form data when employeeToEdit or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (employeeToEdit) {
        setFormData(getEmployeeFormData(employeeToEdit));
      } else {
        setFormData(getInitialFormData());
      }
      setCurrentStep(1);
      setCreatedEmployee(null);
    }
  }, [isOpen, employeeToEdit, getEmployeeFormData]);

  // Load Master Data & Restore Draft
  useEffect(() => {
    if (!isOpen) return;

    // Listen for dynamically created designations
    const handleDesigCreated = (e: any) => {
      if (e?.detail) {
        setDesignations((prev) => [e.detail, ...prev.filter((d) => d.id !== e.detail.id)]);
      }
    };
    window.addEventListener('designation:created', handleDesigCreated);

    const companyId = activeCompany?.id;
    Promise.all([
      api.getDepartments(companyId).catch(() => []),
      api.getDesignations(companyId).catch(() => []),
      api.getBranches(companyId).catch(() => []),
      api.getLocations().catch(() => []),
      api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
    ]).then(([depts, desigs, brs, locs, emps]) => {
      setDepartments(depts);
      setDesignations(desigs);
      setBranches(brs);
      setLocations(locs);
      setExistingEmployees(emps);

      // Restore saved draft only when creating new employee
      if (!employeeToEdit) {
        try {
          const savedRaw = localStorage.getItem(STORAGE_KEY_DRAFT);
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            if (parsed && parsed.data) {
              setFormData((prev) => ({ ...prev, ...parsed.data }));
              if (parsed.step) setCurrentStep(parsed.step);
              setDraftLastSavedText('Restored unsaved draft');
            }
          }
        } catch (_) { }
      }
    });

    return () => {
      window.removeEventListener('designation:created', handleDesigCreated);
    };
  }, [isOpen, activeCompany?.id, employeeToEdit]);

  const updateFormData = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  // Save Draft Action
  const handleSaveDraft = useCallback(() => {
    setIsSavingDraft(true);
    try {
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(formData));
      setDraftLastSavedText(`Draft saved just now`);
      showToast('Employee draft saved safely.', 'info');
    } catch (err) {
      showToast('Failed to save draft locally.', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  }, [formData, showToast]);

  // Step Validation Logic
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.first_name.trim()) {
        showToast('Please enter the employee First Name.', 'error');
        return false;
      }
      if (!formData.last_name.trim()) {
        showToast('Please enter the employee Last Name.', 'error');
        return false;
      }
      if (!formData.work_email.trim()) {
        showToast('Please enter a valid Work Email.', 'error');
        return false;
      }
      if (!formData.phone.trim()) {
        showToast('Please enter the primary Mobile Number.', 'error');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.doj) {
        showToast('Please select the Date of Joining.', 'error');
        return false;
      }
      if (!formData.department_id) {
        showToast('Please assign an organizational Department.', 'error');
        return false;
      }
      if (!formData.designation_id) {
        showToast('Please assign an official Designation.', 'error');
        return false;
      }
      if (!formData.annual_ctc || formData.annual_ctc <= 0) {
        showToast('Please specify a valid Annual CTC.', 'error');
        return false;
      }
    } else if (currentStep === 4) {
      // Primary Reporting Manager is optional
    } else if (currentStep === 5) {
      if (!formData.emergency_name.trim() || !formData.emergency_phone.trim()) {
        showToast('Please provide a Primary Emergency Contact Name and Phone.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final Master Employee Creation & Finalization
  const handleCreateEmployee = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);

    try {
      const selectedDept = departments.find((d) => d.id === formData.department_id);
      const selectedDesig = designations.find((d) => d.id === formData.designation_id);
      const selectedBranch = branches.find((b) => b.id === formData.branch_id);
      const selectedLocation = locations.find((l) => l.id === formData.location_id);

      const allCompanies = await api.getCompanies();
      const realComp = (activeCompany?.id && allCompanies.find((c) => c.id === activeCompany.id)) || allCompanies[0] || activeCompany;
      const realOrg = organization?.id ? organization : (await api.getOrganization());

      const activeOrgId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || 'org-joy-corporate-solutions-private-') : 'org-joy-corporate-solutions-private-';
      const activeCompanyId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_company_id') || `comp-${activeOrgId.replace('org-', '')}`) : `comp-${activeOrgId.replace('org-', '')}`;

      const payload = {
        tenant_id: realOrg?.id || realComp?.organization_id || activeOrgId,
        organization_id: realOrg?.id || realComp?.organization_id || activeOrgId,
        company_id: realComp?.id || activeCompanyId,
        company_name: realComp?.legal_name || 'Joy Corporate Solutions Pvt Ltd',
        identity: {
          photo_url: formData.photo_url,
          employee_code: formData.employee_code,
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim(),
          last_name: formData.last_name.trim(),
          preferred_name: formData.preferred_name || `${formData.first_name} ${formData.last_name}`.trim(),
          work_email: formData.work_email.trim(),
          phone: formData.phone.trim(),
          dob: formData.dob,
          gender: formData.gender,
        },
        contact: {
          personal_email: formData.personal_email,
          alternate_phone: formData.alternate_phone,
          marital_status: formData.marital_status,
          nationality: formData.nationality,
          blood_group: formData.blood_group,
          preferred_language: formData.preferred_language,
          current_line1: formData.current_line1,
          current_line2: formData.current_line2,
          current_city: formData.current_city,
          current_state: formData.current_state,
          current_country: formData.current_country,
          current_postal: formData.current_postal,
          same_as_permanent: formData.same_as_permanent,
          perm_line1: formData.perm_line1,
          perm_line2: formData.perm_line2,
          perm_city: formData.perm_city,
          perm_state: formData.perm_state,
          perm_country: formData.perm_country,
          perm_postal: formData.perm_postal,
        },
        employment: {
          doj: formData.doj,
          confirmation_date: formData.confirmation_date,
          employment_type: formData.employment_type,
          employment_source: formData.employment_source || 'DIRECT',
          vendor_id: formData.vendor_id || undefined,
          vendor_name: formData.vendor_name || undefined,
          vendor_employee_code: formData.vendor_employee_code || undefined,
          vendor_contract_id: formData.vendor_contract_id || undefined,
          vendor_start_date: formData.vendor_start_date || undefined,
          vendor_end_date: formData.vendor_end_date || undefined,
          status: formData.status,
          department_id: formData.department_id,
          department_name: selectedDept?.name || formData.department_name || 'Engineering',
          designation_id: formData.designation_id,
          designation_title: formData.designation_title || selectedDesig?.title || (formData.designation_id && !formData.designation_id.startsWith('desig-') ? formData.designation_id : null) || 'Staff Specialist',
          branch_id: formData.branch_id || branches[0]?.id,
          branch_name: selectedBranch?.name || 'Headquarters',
          location_id: formData.location_id || locations[0]?.id,
          work_location_name: selectedLocation?.name || 'Joy Corporate Solutions Private Limited (HQ)',
          work_mode: formData.work_mode,
          job_level: formData.job_level,
          grade: formData.grade,
          probation_months: formData.probation_months,
          notice_period_days: formData.notice_period_days,
        },
        work_assignment: {
          shift_id: formData.shift_id || 'shift-general-01',
          shift_name: formData.shift_name || 'General Shift (09:30 AM – 06:30 PM)',
          attendance_policy_id: formData.attendance_policy_id || 'pol-standard-office',
          leave_policy_id: formData.leave_policy_id || 'leave-pol-std-2026',
          leave_policy_name: formData.leave_policy_name || 'Standard Full-Time Leave Policy',
        },
        compensation: {
          salary_structure_code: formData.salary_structure_code || 'CORP_STD_01',
          salary_structure_name: formData.salary_structure_name || 'Corporate Standard CTC Structure',
          annual_ctc: formData.annual_ctc || 1200000,
          monthly_ctc: formData.monthly_ctc || Math.round((formData.annual_ctc || 1200000) / 12),
          currency: formData.currency || 'INR',
          pay_frequency: formData.pay_frequency || 'MONTHLY',
          payroll_group_id: formData.payroll_group_id || 'pg-monthly-main',
          salary_effective_from: formData.salary_effective_from || formData.doj,
        },
        reporting: {
          reporting_manager_id: formData.reporting_manager_id,
          reporting_manager_name: formData.reporting_manager_name,
          team_lead_id: formData.team_lead_id,
          team_lead_name: formData.team_lead_name,
          business_unit: formData.business_unit,
          cost_center: formData.cost_center,
        },
        emergency: {
          emergency_name: formData.emergency_name,
          emergency_relation: formData.emergency_relation,
          emergency_phone: formData.emergency_phone,
          emergency_alt_phone: formData.emergency_alt_phone,
          emergency_email: formData.emergency_email,
          emergency_address: formData.emergency_address,
          family_members: formData.family_members,
        },
        bank: {
          bank_name: formData.bank_name || 'HDFC Bank',
          account_number: formData.account_number || '50100239481923',
          ifsc: formData.ifsc || 'HDFC0001234',
          account_holder_name: formData.account_holder_name || `${formData.first_name} ${formData.last_name}`.trim(),
          account_type: formData.account_type || 'SALARY',
          payment_mode: 'BANK_TRANSFER',
        },
        statutory: {
          pan: formData.pan || 'ABCDE1234F',
          uan: formData.uan || '101234567890',
          pf_number: formData.pf_number,
          esi_number: formData.esi_number,
          pf_applicable: formData.pf_applicable !== false,
          esi_applicable: formData.esi_applicable === true,
          pt_applicable: formData.pt_applicable !== false,
          tax_regime: formData.tax_regime || 'NEW',
        },
        performance: {
          performance_template_id: 'tmpl-corp-annual-2026',
          performance_cycle_id: 'cycle-fy26-27',
          review_frequency: 'ANNUAL',
        },
        documents: formData.documents || [],
        app_access: {
          enable_app_access: formData.enable_app_access !== false,
          auth_method: formData.auth_method || 'EMPLOYEE_ID_PASSWORD',
          login_identifier: formData.employee_code,
          require_password_change: formData.require_password_change !== false,
          require_device_verification: formData.require_device_verification !== false,
        },
      };

      if (isEditMode && employeeToEdit) {
        const updatePayload: Partial<Employee> = {
          organization_id: payload.organization_id,
          company_id: payload.company_id,
          company_name: activeCompany?.legal_name,
          first_name: payload.identity.first_name,
          middle_name: payload.identity.middle_name,
          last_name: payload.identity.last_name,
          display_name: payload.identity.preferred_name || `${payload.identity.first_name} ${payload.identity.last_name}`.trim(),
          work_email: payload.identity.work_email,
          avatar_url: payload.identity.photo_url,
          status: payload.employment.status,
          employment_type: payload.employment.employment_type,
          employment_source: payload.employment.employment_source,
          department_id: payload.employment.department_id,
          department_name: payload.employment.department_name,
          designation_id: payload.employment.designation_id,
          designation_title: payload.employment.designation_title,
          branch_id: payload.employment.branch_id,
          branch_name: payload.employment.branch_name,
          profile: {
            ...payload.contact,
            first_name: payload.identity.first_name,
            middle_name: payload.identity.middle_name,
            last_name: payload.identity.last_name,
            display_name: payload.identity.preferred_name,
            phone: payload.identity.phone,
            date_of_birth: payload.identity.dob,
            gender: payload.identity.gender,
            current_address: {
              line1: payload.contact.current_line1,
              line2: payload.contact.current_line2,
              city: payload.contact.current_city,
              state: payload.contact.current_state,
              country: payload.contact.current_country,
              postal_code: payload.contact.current_postal,
            },
            permanent_address: {
              line1: payload.contact.same_as_permanent ? payload.contact.current_line1 : payload.contact.perm_line1,
              line2: payload.contact.same_as_permanent ? payload.contact.current_line2 : payload.contact.perm_line2,
              city: payload.contact.same_as_permanent ? payload.contact.current_city : payload.contact.perm_city,
              state: payload.contact.same_as_permanent ? payload.contact.current_state : payload.contact.perm_state,
              country: payload.contact.same_as_permanent ? payload.contact.current_country : payload.contact.perm_country,
              postal_code: payload.contact.same_as_permanent ? payload.contact.current_postal : payload.contact.perm_postal,
            },
            emergency_contacts: [
              {
                name: payload.emergency.emergency_name,
                relationship: payload.emergency.emergency_relation,
                phone: payload.emergency.emergency_phone,
                alt_phone: payload.emergency.emergency_alt_phone,
                email: payload.emergency.emergency_email,
                is_primary: true,
                priority: 1,
              },
            ],
            family_members: payload.emergency.family_members,
          },
          employment: {
            doj: payload.employment.doj,
            employment_type: payload.employment.employment_type,
            employment_source: payload.employment.employment_source,
            work_mode: payload.employment.work_mode,
            job_level: payload.employment.job_level,
            grade: payload.employment.grade,
            cost_center_code: payload.reporting.cost_center,
            reporting_manager_id: payload.reporting.reporting_manager_id,
            reporting_manager_name: payload.reporting.reporting_manager_name,
            team_lead_id: payload.reporting.team_lead_id,
            team_lead_name: payload.reporting.team_lead_name,
            probation_period_months: payload.employment.probation_months,
            notice_period_days: payload.employment.notice_period_days,
            ctc: formData.annual_ctc,
            annual_ctc: formData.annual_ctc,
            monthly_ctc: formData.monthly_ctc,
            salary_structure_code: formData.salary_structure_code,
            salary_structure_name: formData.salary_structure_name,
            salary_effective_from: formData.salary_effective_from,
            shift_id: formData.shift_id,
            shift_name: formData.shift_name,
            attendance_policy_id: formData.attendance_policy_id,
            leave_policy_id: formData.leave_policy_id,
            leave_policy_name: formData.leave_policy_name,
            payroll_group_id: formData.payroll_group_id,
            vendor_id: formData.vendor_id,
            vendor_name: formData.vendor_name,
            vendor_employee_code: formData.vendor_employee_code,
          },
          bank: {
            bank_name: formData.bank_name || 'HDFC Bank Ltd',
            account_number: formData.account_number || '',
            ifsc: formData.ifsc || 'HDFC0001234',
            account_holder_name: formData.account_holder_name || `${payload.identity.first_name} ${payload.identity.last_name}`.trim(),
            account_type: formData.account_type || 'SALARY',
          },
          statutory: {
            pan: formData.pan || '',
            uan: formData.uan || '',
            pf_number: formData.pf_number || '',
            esi_number: formData.esi_number || '',
            pf_applicable: formData.pf_applicable !== false,
            esi_applicable: formData.esi_applicable === true,
            pt_applicable: formData.pt_applicable !== false,
            tax_regime: formData.tax_regime || 'NEW',
          },
          updated_at: new Date().toISOString(),
        };

        const updatedResult = await api.updateEmployee(employeeToEdit.id, updatePayload);

        // Real-time synchronization with Payroll Engine
        try {
          const grossMonthly = Math.round((formData.annual_ctc || 0) / 12);
          const basicMonthly = Math.round(grossMonthly * 0.5);
          payrollApi.saveEmployeeSalary({
            id: `sal-${employeeToEdit.id}`,
            tenant_id: payload.organization_id || (typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || 'org-joy-corporate-solutions-private-') : 'org-joy-corporate-solutions-private-'),
            employee_id: employeeToEdit.id,
            employee_code: employeeToEdit.employee_code || payload.identity.employee_code,
            employee_name: payload.identity.preferred_name || `${payload.identity.first_name} ${payload.identity.last_name}`.trim(),
            department_name: payload.employment.department_name || 'General',
            designation: payload.employment.designation_title || 'Staff',
            salary_structure_id: formData.salary_structure_code || 'CORP_STD_01',
            salary_structure_name: formData.salary_structure_name || 'Corporate Standard CTC Structure',
            annual_ctc: formData.annual_ctc || 0,
            gross_monthly: grossMonthly,
            basic_monthly: basicMonthly,
            net_monthly_estimate: Math.max(0, Math.round(grossMonthly * 0.88)),
            payment_mode: 'BankTransfer',
            bank_name: formData.bank_name || 'HDFC Bank Ltd',
            account_number: formData.account_number || '',
            ifsc_code: formData.ifsc || 'HDFC0001234',
            pan_number: formData.pan || '',
            pf_uan: formData.uan || '',
            esic_number: formData.esi_number || '',
            effective_from: formData.salary_effective_from || formData.doj || '2026-04-01',
            status: 'Active',
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[EmployeeWizard] Payroll sync warning:', e);
        }

        // Emit global event
        window.dispatchEvent(new CustomEvent('employee:updated', { detail: updatedResult }));
        hrEventBus.publish('employee.updated', updatedResult);

        if (onUpdated) {
          onUpdated(updatedResult);
        }
        showToast(`Employee ${updatedResult.first_name} ${updatedResult.last_name} (${updatedResult.employee_code}) updated successfully!`, 'success');
        handleResetAndClose();
        return;
      }

      const finalResult = await onboardingService.finalizeOnboarding(payload);

      // Clean up saved draft
      localStorage.removeItem(STORAGE_KEY_DRAFT);

      // Construct complete Employee representation for callbacks
      const constructedEmployee: Employee = {
        id: finalResult.employee_id,
        employee_code: finalResult.employee_code,
        organization_id: payload.organization_id,
        company_id: payload.company_id,
        company_name: activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd',
        first_name: payload.identity.first_name,
        middle_name: payload.identity.middle_name,
        last_name: payload.identity.last_name,
        display_name: payload.identity.preferred_name,
        work_email: payload.identity.work_email,
        avatar_url: payload.identity.photo_url,
        status: payload.employment.status,
        employment_type: payload.employment.employment_type,
        employment_source: payload.employment.employment_source,
        department_id: payload.employment.department_id,
        department_name: payload.employment.department_name,
        designation_id: payload.employment.designation_id,
        designation_title: payload.employment.designation_title,
        branch_id: payload.employment.branch_id,
        branch_name: payload.employment.branch_name,
        profile: {
          ...payload.contact,
          first_name: payload.identity.first_name,
          middle_name: payload.identity.middle_name,
          last_name: payload.identity.last_name,
          display_name: payload.identity.preferred_name,
          phone: payload.identity.phone,
          date_of_birth: payload.identity.dob,
          gender: payload.identity.gender,
          current_address: {
            line1: payload.contact.current_line1,
            line2: payload.contact.current_line2,
            city: payload.contact.current_city,
            state: payload.contact.current_state,
            country: payload.contact.current_country,
            postal_code: payload.contact.current_postal,
          },
          permanent_address: {
            line1: payload.contact.same_as_permanent ? payload.contact.current_line1 : payload.contact.perm_line1,
            line2: payload.contact.same_as_permanent ? payload.contact.current_line2 : payload.contact.perm_line2,
            city: payload.contact.same_as_permanent ? payload.contact.current_city : payload.contact.perm_city,
            state: payload.contact.same_as_permanent ? payload.contact.current_state : payload.contact.perm_state,
            country: payload.contact.same_as_permanent ? payload.contact.current_country : payload.contact.perm_country,
            postal_code: payload.contact.same_as_permanent ? payload.contact.current_postal : payload.contact.perm_postal,
          },
          emergency_contacts: [
            {
              name: payload.emergency.emergency_name,
              relationship: payload.emergency.emergency_relation,
              phone: payload.emergency.emergency_phone,
              alt_phone: payload.emergency.emergency_alt_phone,
              email: payload.emergency.emergency_email,
              is_primary: true,
              priority: 1,
            },
          ],
          family_members: payload.emergency.family_members,
        },
        employment: {
          doj: payload.employment.doj,
          employment_type: payload.employment.employment_type,
          employment_source: payload.employment.employment_source,
          work_mode: payload.employment.work_mode,
          job_level: payload.employment.job_level,
          grade: payload.employment.grade,
          cost_center_code: payload.reporting.cost_center,
          reporting_manager_id: payload.reporting.reporting_manager_id,
          reporting_manager_name: payload.reporting.reporting_manager_name,
          team_lead_id: payload.reporting.team_lead_id,
          team_lead_name: payload.reporting.team_lead_name,
          probation_period_months: payload.employment.probation_months,
          notice_period_days: payload.employment.notice_period_days,
        },
        bank: {
          bank_name: formData.bank_name || 'HDFC Bank Ltd',
          account_number: formData.account_number || '',
          ifsc: formData.ifsc || 'HDFC0001234',
          account_holder_name: formData.account_holder_name || `${payload.identity.first_name} ${payload.identity.last_name}`.trim(),
          account_type: formData.account_type || 'SALARY',
        },
        statutory: {
          pan: formData.pan || '',
          uan: formData.uan || '',
          pf_number: formData.pf_number || '',
          esi_number: formData.esi_number || '',
          tax_regime: formData.tax_regime || 'NEW',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Emit global realtime event for dashboard & people directory
      window.dispatchEvent(new CustomEvent('employee:created', { detail: constructedEmployee }));

      setCreatedEmployee(constructedEmployee);
      if (onCreated) {
        onCreated(constructedEmployee);
      }
      showToast(`Master Employee ${constructedEmployee.first_name} ${constructedEmployee.last_name} (${constructedEmployee.employee_code}) created & all sub-domain assignments linked!`, 'success');
    } catch (err: any) {
      console.error('Failed to save master employee record:', err);
      showToast(err.message || 'We could not complete operation. Please verify required fields and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setFormData(getInitialFormData());
    setCurrentStep(1);
    setCreatedEmployee(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={isEditMode ? 'Edit Employee' : 'Add New Employee'}
      maxWidth="5xl"
      hideHeader={true}
    >
      <div className="flex flex-col h-full max-h-[88vh]">
        {/* Success Screen Overlay when finalized */}
        {createdEmployee ? (
          <div className="p-6">
            <WizardSuccessScreen
              employee={createdEmployee}
              onClose={handleResetAndClose}
            />
          </div>
        ) : (
          <>
            {/* Modal Header & Navigation Bar */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900 tracking-tight">
                    {isEditMode
                      ? `Edit Employee — ${formData.first_name || ''} ${formData.last_name || ''} (${formData.employee_code || ''})`
                      : 'Add New Employee — 7-Step Enterprise Onboarding'}
                  </h2>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#07563D] border border-emerald-200">
                    Step {currentStep} of 7
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isEditMode
                    ? `Update profile, organization hierarchy, compensation and work assignments.`
                    : WIZARD_STEPS[currentStep - 1]?.subtitle || 'Complete required details'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditMode && draftLastSavedText && (
                  <span className="text-[11px] text-gray-400 italic hidden sm:inline">
                    {draftLastSavedText}
                  </span>
                )}
                {!isEditMode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="text-xs h-8 px-3 border-gray-200 font-bold text-gray-700"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Draft
                  </Button>
                )}
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 pt-3 pb-3 bg-gray-50/70 border-b border-gray-100">
              <WizardProgressHeader
                currentStep={currentStep}
                onStepClick={(step) => {
                  if (step < currentStep || validateCurrentStep()) {
                    setCurrentStep(step);
                  }
                }}
              />
            </div>

            {/* Step Body Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
              {currentStep === 1 && (
                <Step1Identity
                  formData={formData}
                  onChange={updateFormData}
                  existingEmployees={existingEmployees}
                  editingEmployeeId={employeeToEdit?.id}
                />
              )}

              {currentStep === 2 && (
                <Step2Contact
                  formData={formData}
                  onChange={updateFormData}
                  activeCompany={activeCompany}
                />
              )}

              {currentStep === 3 && (
                <Step3Employment
                  formData={formData}
                  onChange={updateFormData}
                  departments={departments}
                  designations={designations}
                  branches={branches}
                  locations={locations}
                />
              )}

              {currentStep === 4 && (
                <Step4Organization
                  formData={formData}
                  onChange={updateFormData}
                  employees={existingEmployees}
                  activeCompany={activeCompany}
                  currentEmployeeCode={formData.employee_code}
                />
              )}

              {currentStep === 5 && (
                <Step5Emergency
                  formData={formData}
                  onChange={updateFormData}
                />
              )}

              {currentStep === 6 && (
                <Step6Documents
                  formData={formData}
                  onChange={updateFormData}
                />
              )}

              {currentStep === 7 && (
                <Step7Review
                  formData={formData}
                  departments={departments}
                  designations={designations}
                  onJumpToStep={(step) => setCurrentStep(step)}
                  onUpdateAppAccess={updateFormData}
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between sticky bottom-0 z-20">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
                className="text-xs h-9 px-4 font-bold border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous Step
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < 7 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="text-xs h-9 px-5 font-bold bg-[#07563D] hover:bg-[#054430] text-white shadow-xs"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : isEditMode ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCreateEmployee}
                    disabled={isSubmitting}
                    className="text-xs h-9 px-6 font-black bg-[#07563D] hover:bg-[#054430] text-white shadow-md flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Saving Updates...' : 'Save & Update Employee Profile'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCreateEmployee}
                    disabled={isSubmitting}
                    className="text-xs h-9 px-6 font-black bg-[#07563D] hover:bg-[#054430] text-white shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'Finalizing Master Onboarding...' : 'Complete Onboarding & Activate Employee'}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
