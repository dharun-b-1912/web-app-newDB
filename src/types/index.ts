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
  industry: string;
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
