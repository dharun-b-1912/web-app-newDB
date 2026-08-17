export type ScopeLevel = 'org' | 'company' | 'branch' | 'dept' | 'manager' | 'self' | 'Organization' | 'Company' | 'Branch' | 'Department' | 'Self';

export type EmployeeStatus =
  | 'Draft'
  | 'Invited'
  | 'Onboarding'
  | 'Active'
  | 'Probation'
  | 'Confirmed'
  | 'Notice Period'
  | 'Suspended'
  | 'Inactive'
  | 'Terminated'
  | 'Resigned'
  | 'Absconded'
  | 'Retired'
  | 'Exited'
  | 'On Leave';

export type EmploymentSource =
  | 'DIRECT'
  | 'VENDOR'
  | 'MANPOWER_PROVIDER'
  | 'CONTRACT'
  | 'TEMPORARY'
  | 'INTERN'
  | 'CONSULTANT';

export type EmploymentType =
  | 'Full Time'
  | 'Part Time'
  | 'Contract'
  | 'Temporary'
  | 'Intern'
  | 'Apprentice'
  | 'Consultant'
  | 'Freelancer';

export type WorkMode = 'Office' | 'Hybrid' | 'Remote' | 'Field' | 'Flexible';

export interface EmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  is_primary: boolean;
  priority: number;
}

export interface FamilyMember {
  id?: string;
  name: string;
  relationship: string;
  dob?: string;
  occupation?: string;
  phone?: string;
  email?: string;
  is_dependent: boolean;
  is_nominee: boolean;
}

export interface EducationRecord {
  id?: string;
  qualification: string;
  degree: string;
  specialization: string;
  institution: string;
  university: string;
  start_date: string;
  end_date: string;
  grade_or_percentage: string;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
}

export interface ExperienceRecord {
  id?: string;
  company: string;
  job_title: string;
  department?: string;
  location?: string;
  start_date: string;
  end_date: string;
  employment_type: string;
  responsibilities?: string;
  reason_for_leaving?: string;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
}

export interface SkillItem {
  id?: string;
  skill_name: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  years_exp: number;
  last_assessed?: string;
  verification_status: 'Verified' | 'Pending' | 'Self Assessed';
}

export interface AddressInfo {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface StatutoryAndBank {
  pan_number_masked?: string;
  aadhaar_masked?: string;
  ssn_masked?: string;
  pf_uan?: string;
  esi_number?: string;
  tax_regime?: 'Old Regime' | 'New Regime';
  bank_name?: string;
  bank_account_masked?: string;
  ifsc_code?: string;
  swift_code?: string;
}

export interface LifecycleHistoryItem {
  id: string;
  event_type:
    | 'Created'
    | 'Onboarding Started'
    | 'Joined'
    | 'Department Changed'
    | 'Designation Changed'
    | 'Manager Changed'
    | 'Promotion'
    | 'Salary Revision'
    | 'Transfer'
    | 'Document Uploaded'
    | 'Asset Assigned'
    | 'Resignation'
    | 'Offboarding'
    | 'Exited'
    | 'Rehired';
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
  comments?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  industry?: string;
  status?: string;
  plan?: string;
  default_currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  organization_id: string;
  legal_name: string;
  trade_name?: string;
  statutory_registration_no: string;
  tax_id?: string;
  country: string;
  city: string;
  currency?: string;
  timezone?: string;
  address?: string;
  status?: string;
  created_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  timezone: string;
  created_at: string;
}

export interface Location {
  id: string;
  branch_id: string;
  name: string;
  building?: string;
  address: string;
}

export interface Department {
  id: string;
  company_id: string;
  parent_department_id?: string | null;
  name: string;
  code: string;
  cost_center_code?: string;
  head_employee_id?: string | null;
  employee_count?: number;
}

export interface Designation {
  id: string;
  company_id: string;
  title: string;
  code: string;
  grade: string;
}

export interface Permission {
  id: string;
  module: string; // 'people' | 'organization' | 'attendance' | 'leave' | 'payroll' | 'recruitment' | 'rbac' | 'settings'
  action: string; // 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'manage'
  description?: string;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string; // 'Company Admin' | 'HR Head' | 'HR Admin' | 'Payroll Admin' | 'Manager' | 'Employee'
  description: string;
  is_system?: boolean;
  permissions: {
    permission_id: string;
    scope_level: ScopeLevel;
  }[];
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  scope_id?: string | null; // e.g. company_id or branch_id if scoped
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  employee_id?: string | null;
  status: 'Active' | 'Invited' | 'Suspended';
  roles: Role[];
  created_at: string;
}

export interface EmployeeProfile {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  display_name?: string;
  preferred_name?: string;
  personal_email?: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  blood_group?: string;
  preferred_language?: string;
  national_id_masked?: string;
  emergency_contacts?: EmergencyContact[];
  family_members?: FamilyMember[];
  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  skills?: SkillItem[];
  current_address?: AddressInfo;
  permanent_address?: AddressInfo;
  same_as_permanent?: boolean;
  statutory_and_bank?: StatutoryAndBank;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  bank_account_masked?: string;
  bank_name?: string;
}

export interface EmploymentDetails {
  doj: string;
  employment_type?: EmploymentType;
  employment_source?: EmploymentSource;
  vendor_id?: string;
  vendor_name?: string;
  vendor_employee_code?: string;
  vendor_contract_id?: string;
  vendor_start_date?: string;
  vendor_end_date?: string;
  work_mode?: WorkMode;
  job_level?: string;
  grade?: string;
  business_unit_id?: string;
  business_unit_name?: string;
  cost_center_code?: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string;
  secondary_manager_id?: string;
  secondary_manager_name?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  department_head_id?: string;
  hr_owner_id?: string;
  probation_period_months?: number;
  probation_end_date?: string;
  confirmation_date?: string;
  confirmation_status?: 'Pending' | 'Confirmed' | 'Extended';
  notice_period_days?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  retirement_date?: string;
  last_working_date?: string;
  resignation_date?: string;
  work_location?: string;
  shift_name?: string;
  ctc?: number;
  history?: LifecycleHistoryItem[];
}

export interface Employee {
  id: string;
  organization_id: string;
  company_id: string;
  company_name?: string;
  branch_id?: string;
  branch_name?: string;
  department_id: string;
  department_name?: string;
  designation_id: string;
  designation_title?: string;
  user_id?: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name?: string;
  work_email: string;
  avatar_url?: string;
  status: EmployeeStatus;
  employment_type: EmploymentType;
  employment_source?: EmploymentSource;
  vendor_id?: string;
  vendor_name?: string;
  vendor_employee_code?: string;
  profile: EmployeeProfile;
  employment: EmploymentDetails;
  created_at: string;
  updated_at: string;
}

// Additional Core HR Entities
export interface BusinessUnit {
  id: string;
  company_id: string;
  name: string;
  code: string;
  head_employee_id?: string;
  head_employee_name?: string;
  status: 'Active' | 'Inactive';
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  company_id: string;
  department_id?: string;
  budget_annual: number;
  currency: string;
  status: 'Active' | 'Inactive';
}

export interface Asset {
  id: string;
  name: string;
  category?: string;
  type?: string;
  serial?: string;
  serial_number?: string;
  asset_tag?: string;
  assignedTo?: string;
  empCode?: string;
  status: 'Available' | 'Assigned' | 'In Maintenance' | 'Retired';
  value?: string;
}

export interface HRDocument {
  id: string;
  document_type: string;
  category: 'Identity' | 'Address' | 'Education' | 'Experience' | 'Employment' | 'Statutory' | 'Policy' | 'Other';
  employee_id: string;
  employee_name: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size?: string;
  version: number;
  issue_date?: string;
  expiry_date?: string;
  uploaded_at: string;
  uploaded_by: string;
  verification_status: 'Uploaded' | 'Pending Verification' | 'Verified' | 'Rejected' | 'Expired';
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  type: 'Offer Letter' | 'Appointment Letter' | 'Confirmation Letter' | 'Promotion Letter' | 'Transfer Letter' | 'Salary Revision' | 'Relieving Letter' | 'Experience Letter';
  content: string;
  variables: string[];
  updated_at: string;
}

export interface ApprovalItem {
  id: string;
  type: 'Leave' | 'Expense' | 'Attendance' | 'Salary Revision' | 'Requisition';
  title: string;
  requested_by_id: string;
  requested_by_name: string;
  requested_by_avatar?: string;
  department: string;
  details: string;
  date_submitted: string;
  amount_or_duration?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ApprovalRequest {
  id: string;
  type: string;
  title: string;
  requester_name: string;
  department: string;
  description: string;
  created_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface AuditLog {
  id: string;
  actor_name: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface ActivityItem {
  id: string;
  actor_name: string;
  actor_avatar?: string;
  action: string;
  entity: string;
  timestamp: string;
  time_ago: string;
  type: 'employee' | 'leave' | 'payroll' | 'compliance' | 'org';
}

export interface DashboardMetrics {
  total_employees: number;
  employee_growth_pct: number;
  present_today: number;
  present_pct: number;
  on_leave_today: number;
  pending_approvals_count: number;
  open_requisitions: number;
  payroll_status: string;
  next_payroll_date: string;
}

// ============================================================================
// Vendor & Manpower Provider Master 2.0 Types
// ============================================================================

export type VendorType =
  | 'MANPOWER_PROVIDER'
  | 'RECRUITMENT_AGENCY'
  | 'CONTRACTOR'
  | 'IT_SERVICE_PROVIDER'
  | 'FACILITY_SERVICE_PROVIDER'
  | 'CONSULTING'
  | 'OTHER';

export type VendorStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'INACTIVE';

export type VendorContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'TERMINATED';

export type VendorDocumentVerificationStatus =
  | 'UPLOADED'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export type VendorPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'RETURNED'
  | 'CANCELLED';

export type VendorReturnReason =
  | 'INVALID_ACCOUNT'
  | 'BANK_REJECTION'
  | 'ACCOUNT_CLOSED'
  | 'DUPLICATE_PAYMENT'
  | 'COMPLIANCE_HOLD'
  | 'OTHER';

export interface Vendor {
  id: string;
  organization_id: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  vendor_code: string;
  legal_name: string;
  trade_name?: string;
  vendor_type: VendorType;
  status: VendorStatus;
  registration_number?: string;
  tax_id?: string;
  pan?: string;
  gstin?: string;
  logo_url?: string;
  primary_contact_name: string;
  primary_contact_designation?: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  alternate_phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  manpower_license_no?: string;
  manpower_license_expiry?: string;
  max_workforce_capacity?: number;
  authorized_workforce_categories?: string[];
  contract_start_date?: string;
  contract_end_date?: string;
  payment_terms?: string;
  currency?: string;
  payment_method?: string;
  bank_name?: string;
  account_name?: string;
  account_number_masked?: string;
  account_number_encrypted?: string;
  ifsc_code?: string;
  swift_code?: string;
  bank_branch?: string;
  notes?: string;
  deployed_workforce_count?: number;
  active_contracts_count?: number;
  compliance_issues_count?: number;
  pending_payments_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorContract {
  id: string;
  vendor_id: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  renewal_date?: string;
  notice_period_days: number;
  payment_terms: string;
  currency: string;
  status: VendorContractStatus;
  document_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: string;
  document_name: string;
  file_name: string;
  storage_reference?: string;
  file_url?: string;
  uploaded_by?: string;
  uploaded_at: string;
  expiry_date?: string;
  verification_status: VendorDocumentVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface VendorPayment {
  id: string;
  vendor_id: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  invoice_reference: string;
  payment_reference?: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: VendorPaymentStatus;
  bank_reference?: string;
  return_reason?: VendorReturnReason;
  returned_date?: string;
  resolution_notes?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorEmployeeAssignment {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  employee_id: string;
  employee?: Employee;
  legal_entity_id?: string;
  legal_entity_name?: string;
  deployment_role?: string;
  contract_reference?: string;
  start_date: string;
  end_date?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VendorSavedView {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  filters: {
    vendor_type?: string;
    status?: string;
    city?: string;
    legal_entity_id?: string;
    search?: string;
    segment?: string;
  };
  is_default?: boolean;
  created_at: string;
}

export interface VendorAuditLog {
  id: string;
  organization_id: string;
  vendor_id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  old_value?: any;
  new_value?: any;
  created_at: string;
}

// ============================================================================
// Enterprise Onboarding Engine 2.0 Types
// ============================================================================

export type OnboardingEmploymentSource = 'DIRECT' | 'VENDOR';

export type OnboardingStatus =
  | 'DRAFT'
  | 'INITIATED'
  | 'DOCUMENT_COLLECTION'
  | 'HR_VERIFICATION'
  | 'MANAGER_REVIEW'
  | 'IT_SETUP'
  | 'POLICY_ACKNOWLEDGEMENT'
  | 'PAYROLL_SETUP'
  | 'FINAL_REVIEW'
  | 'READY_TO_ACTIVATE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type OnboardingTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export type OnboardingTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OnboardingTaskRole =
  | 'HR'
  | 'HR_HEAD'
  | 'MANAGER'
  | 'TEAM_LEAD'
  | 'IT'
  | 'FINANCE'
  | 'PAYROLL'
  | 'EMPLOYEE'
  | 'COMPANY_ADMIN';

export interface OnboardingTask {
  id: string;
  onboarding_id: string;
  task_type: string;
  title: string;
  description?: string;
  assigned_to_user_id?: string;
  assigned_to_role: OnboardingTaskRole;
  status: OnboardingTaskStatus;
  priority: OnboardingTaskPriority;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  dependency_task_id?: string;
  dependency_task_title?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OnboardingPolicyAck {
  id: string;
  onboarding_id: string;
  employee_id: string;
  policy_id: string;
  policy_name: string;
  policy_version: string;
  acknowledged_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface OnboardingOverride {
  id: string;
  onboarding_id: string;
  task_id?: string;
  approved_by: string;
  reason: string;
  created_at: string;
}

export interface OnboardingAuditLog {
  id: string;
  organization_id: string;
  onboarding_id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface EmployeeOnboarding {
  id: string;
  organization_id: string;
  legal_entity_id?: string;
  employee_id: string;
  employee?: Employee;
  vendor_id?: string;
  vendor_name?: string;
  employment_source: OnboardingEmploymentSource;
  status: OnboardingStatus;
  joining_date: string;
  expected_completion_date?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed & Relational Aggregates
  tasks?: OnboardingTask[];
  total_tasks_count?: number;
  completed_tasks_count?: number;
  blocked_tasks_count?: number;
  overdue_tasks_count?: number;
  progress_percentage?: number;
  current_stage?: string;
  blocking_task_title?: string;
}

export interface OnboardingSummaryMetrics {
  active_onboardings: number;
  pending_hr_verification: number;
  pending_employee_tasks: number;
  pending_manager_tasks: number;
  pending_it_tasks: number;
  joining_this_month: number;
  overdue_tasks: number;
  ready_to_activate: number;
}


