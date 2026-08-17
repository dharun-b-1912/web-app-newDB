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
  onCreated: (emp: Employee) => void;
}

const STORAGE_KEY_DRAFT = 'workforce_employee_wizard_draft_v1';

export const EmployeeCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const { activeCompany, organization } = useTenant();
  const { user } = useAuth();

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
    employee_code: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
    first_name: '',
    middle_name: '',
    last_name: '',
    preferred_name: '',
    work_email: '',
    personal_email: '',
    phone: '',
    dob: '',
    gender: 'Male',

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

    // Step 3: Employment
    doj: new Date().toISOString().split('T')[0],
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

    // Step 4: Organization
    reporting_manager_id: '',
    reporting_manager_name: '',
    team_lead_id: '',
    team_lead_name: '',
    hr_owner_id: '',
    business_unit: 'Enterprise Software',
    cost_center: 'CC-ENG-101',

    // Step 5: Emergency
    emergency_name: '',
    emergency_relation: 'Spouse',
    emergency_phone: '',
    emergency_alt_phone: '',
    emergency_email: '',
    emergency_address: '',
    family_members: [] as FamilyMemberItem[],

    // Step 6: Documents
    documents: [] as UploadedDocumentItem[],
  });

  const [formData, setFormData] = useState(getInitialFormData);

  // Load Master Data & Restore Draft
  useEffect(() => {
    if (!isOpen) return;

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

      // Restore saved draft if available
      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY_DRAFT);
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (parsed && parsed.first_name) {
            setFormData((prev) => ({ ...prev, ...parsed }));
            setDraftLastSavedText('Draft restored');
          }
        }
      } catch (err) {
        console.warn('Failed to load employee draft:', err);
      }
    });
  }, [isOpen, activeCompany?.id]);

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
      if (!formData.employee_code.trim()) {
        showToast('Please specify an Employee ID code.', 'error');
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
    } else if (currentStep === 4) {
      if (!formData.reporting_manager_id) {
        showToast('Please assign a Primary Reporting Manager.', 'error');
        return false;
      }
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

  // Final Employee Creation
  const handleCreateEmployee = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);

    try {
      const selectedDept = departments.find((d) => d.id === formData.department_id);
      const selectedDesig = designations.find((d) => d.id === formData.designation_id);
      const selectedBranch = branches.find((b) => b.id === formData.branch_id);

      const payload: Partial<Employee> = {
        organization_id: organization?.id || 'org-joy-01',
        company_id: activeCompany?.id || 'comp-joy-01',
        company_name: activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd',
        branch_id: formData.branch_id || branches[0]?.id,
        branch_name: selectedBranch?.name || 'Headquarters',
        department_id: formData.department_id,
        department_name: selectedDept?.name || 'Engineering',
        designation_id: formData.designation_id,
        designation_title: selectedDesig?.title || 'Software Engineer',
        employee_code: formData.employee_code,
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim(),
        last_name: formData.last_name.trim(),
        display_name: formData.preferred_name || `${formData.first_name} ${formData.last_name}`.trim(),
        work_email: formData.work_email.trim(),
        avatar_url: formData.photo_url || '',
        status: formData.status,
        employment_type: formData.employment_type,
        employment_source: formData.employment_source || 'DIRECT',
        vendor_id: formData.vendor_id || undefined,
        vendor_name: formData.vendor_name || undefined,
        vendor_employee_code: formData.vendor_employee_code || undefined,
        profile: {
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          last_name: formData.last_name,
          display_name: formData.preferred_name,
          personal_email: formData.personal_email,
          phone: formData.phone,
          alternate_phone: formData.alternate_phone,
          date_of_birth: formData.dob,
          gender: formData.gender,
          marital_status: formData.marital_status,
          nationality: formData.nationality,
          blood_group: formData.blood_group,
          preferred_language: formData.preferred_language,
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
          same_as_permanent: formData.same_as_permanent,
          emergency_contacts: [
            {
              name: formData.emergency_name,
              relationship: formData.emergency_relation,
              phone: formData.emergency_phone,
              alt_phone: formData.emergency_alt_phone,
              email: formData.emergency_email,
              is_primary: true,
              priority: 1,
            },
          ],
          family_members: formData.family_members.map((f) => ({
            name: f.name,
            relationship: f.relationship,
            phone: f.phone,
            is_dependent: f.is_dependent,
            is_nominee: false,
          })),
        },
        employment: {
          doj: formData.doj,
          employment_type: formData.employment_type,
          employment_source: formData.employment_source || 'DIRECT',
          vendor_id: formData.vendor_id || undefined,
          vendor_name: formData.vendor_name || undefined,
          vendor_employee_code: formData.vendor_employee_code || undefined,
          vendor_contract_id: formData.vendor_contract_id || undefined,
          vendor_start_date: formData.vendor_start_date || undefined,
          vendor_end_date: formData.vendor_end_date || undefined,
          work_mode: formData.work_mode,
          job_level: formData.job_level,
          grade: formData.grade,
          cost_center_code: formData.cost_center,
          reporting_manager_id: formData.reporting_manager_id,
          reporting_manager_name: formData.reporting_manager_name,
          team_lead_id: formData.team_lead_id,
          team_lead_name: formData.team_lead_name,
          probation_period_months: formData.probation_months,
          notice_period_days: formData.notice_period_days,
        },
      };

      const newEmployee = await api.createEmployee(payload);

      // Auto-create Onboarding Workflow Transactionally
      try {
        await onboardingService.createOnboarding({
          employee_id: newEmployee.id,
          organization_id: newEmployee.organization_id,
          legal_entity_id: newEmployee.company_id,
          vendor_id: newEmployee.vendor_id,
          employment_source: (newEmployee.employment_source === 'VENDOR' ? 'VENDOR' : 'DIRECT'),
          joining_date: formData.doj || new Date().toISOString().split('T')[0],
        });
      } catch (onbErr) {
        console.warn('[EmployeeCreateWizardModal] Auto-spawn onboarding failed:', onbErr);
      }

      // Clean up saved draft
      localStorage.removeItem(STORAGE_KEY_DRAFT);

      // Emit global realtime event for dashboard & people directory
      window.dispatchEvent(new CustomEvent('employee:created', { detail: newEmployee }));

      setCreatedEmployee(newEmployee);
      onCreated(newEmployee);
      showToast(`Employee ${newEmployee.first_name} ${newEmployee.last_name} created & onboarding initiated!`, 'success');
    } catch (err: any) {
      console.error('Failed to create employee:', err);
      showToast(err.message || 'We could not create this employee. Please verify required fields and try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndAddAnother = () => {
    setCreatedEmployee(null);
    setCurrentStep(1);
    setFormData(getInitialFormData());
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="4xl"
    >
      <div className="p-6 space-y-6">
        {createdEmployee ? (
          <WizardSuccessScreen
            employee={createdEmployee}
            onOpenProfile={() => {
              onClose();
            }}
            onStartOnboarding={() => {
              onClose();
            }}
            onAddAnother={handleResetAndAddAnother}
          />
        ) : (
          <>
            {/* Header & Step Stepper */}
            <WizardProgressHeader
              currentStep={currentStep}
              onStepClick={(s) => {
                if (s < currentStep) setCurrentStep(s);
              }}
              draftLastSavedText={draftLastSavedText}
              isSavingDraft={isSavingDraft}
              onSaveDraft={handleSaveDraft}
            />

            {/* Current Step Body */}
            <div className="min-h-[380px] py-2">
              {currentStep === 1 && (
                <Step1Identity
                  formData={formData}
                  onChange={updateFormData}
                  existingEmployees={existingEmployees}
                />
              )}

              {currentStep === 2 && (
                <Step2Contact
                  formData={formData}
                  onChange={updateFormData}
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
                  onJumpToStep={(s) => setCurrentStep(s)}
                />
              )}
            </div>

            {/* Sticky Bottom Action Navigation Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    size="md"
                    variant="secondary"
                    onClick={handleBack}
                    className="text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="md"
                    variant="ghost"
                    onClick={onClose}
                    className="text-xs font-bold text-gray-400 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentStep < 7 ? (
                  <Button
                    type="button"
                    size="md"
                    variant="primary"
                    onClick={handleNext}
                    className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-sm px-5"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="md"
                    variant="primary"
                    disabled={isSubmitting}
                    onClick={handleCreateEmployee}
                    className="text-xs font-black bg-[#07563D] hover:bg-[#064e37] text-white shadow-md px-6 py-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Creating Employee...' : 'Create Employee'}
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
