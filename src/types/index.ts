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
  | 'On Leave'
  | 'Archived';

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

export type BranchType = 'HQ' | 'OFFICE' | 'FACTORY' | 'WAREHOUSE' | 'PROJECT_SITE' | 'STORE' | 'HOSPITAL' | 'REMOTE_HUB' | 'OTHER';

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  branch_type?: BranchType;
  country?: string;
  city: string;
  state: string;
  address?: string;
  postal_code?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  status?: 'Active' | 'Inactive' | 'Under Setup';
  head_employee_id?: string | null;
  head_employee_name?: string;
  contact_phone?: string;
  contact_email?: string;
  employee_count?: number;
  department_count?: number;
  created_at: string;
}

export interface Location {
  id: string;
  branch_id: string;
  parent_location_id?: string | null;
  name: string;
  code?: string;
  location_type_code?: string; // 'BUILDING' | 'FLOOR' | 'ZONE' | 'RACK' | 'LINE' | 'ROOM'
  building?: string;
  floor?: string;
  area?: string;
  address: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Department {
  id: string;
  company_id: string;
  branch_id?: string | null;
  parent_department_id?: string | null;
  name: string;
  code: string;
  cost_center_code?: string;
  head_employee_id?: string | null;
  head_employee_name?: string;
  description?: string;
  status?: 'Active' | 'Inactive' | 'Restructuring';
  employee_count?: number;
  team_count?: number;
  open_positions_count?: number;
}

export interface Team {
  id: string;
  organization_id: string;
  company_id?: string;
  department_id: string;
  department_name?: string;
  branch_id?: string;
  branch_name?: string;
  name: string;
  code: string;
  description?: string;
  team_lead_employee_id?: string | null;
  team_lead_name?: string;
  manager_employee_id?: string | null;
  manager_name?: string;
  status: 'Active' | 'Inactive' | 'Restructuring';
  member_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type ReportingRelationshipType =
  | 'DIRECT_MANAGER'
  | 'TEAM_LEAD'
  | 'DEPARTMENT_HEAD'
  | 'FUNCTIONAL_MANAGER'
  | 'DOTTED_LINE_MANAGER'
  | 'PROJECT_MANAGER';

export interface EmployeeReportingRelationship {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  manager_employee_id: string;
  manager_name?: string;
  manager_code?: string;
  relationship_type: ReportingRelationshipType;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;
  changed_by?: string;
  change_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrgChartNode {
  id: string;
  employee_id: string;
  name: string;
  employee_code: string;
  designation: string;
  department_id?: string;
  department_name: string;
  branch_id?: string;
  branch_name?: string;
  company_id?: string;
  company_name?: string;
  avatar_url?: string;
  email: string;
  status: string;
  manager_employee_id?: string | null;
  manager_name?: string;
  relationship_type?: ReportingRelationshipType;
  is_primary?: boolean;
  level: number;
  direct_reports_count: number;
  total_team_count: number;
  subordinates?: OrgChartNode[];
}

export interface OrgChartFilterParams {
  searchQuery?: string;
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  status?: string;
  showPrimaryOnly?: boolean;
}

export interface VendorWorker {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_name?: string;
  worker_code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email?: string;
  phone?: string;
  identity_proof_type?: string;
  identity_proof_number_masked?: string;
  skill_category?: string;
  status: 'ONBOARDING' | 'ACTIVE' | 'DEPLOYED' | 'ON_LEAVE' | 'BENCH' | 'OFFBOARDED' | 'BLACKLISTED';
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_photo_url?: string;
  active_deployments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VendorDeployment {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_name?: string;
  worker_id: string;
  worker_name?: string;
  worker_code?: string;
  company_id?: string;
  company_name?: string;
  branch_id?: string;
  branch_name?: string;
  department_id?: string;
  department_name?: string;
  team_id?: string;
  team_name?: string;
  deployment_role: string;
  supervisor_employee_id?: string;
  supervisor_name?: string;
  start_date: string;
  end_date?: string | null;
  bill_rate?: number;
  bill_unit?: 'HOUR' | 'DAY' | 'MONTH' | 'FIXED';
  currency?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXTENDED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationSummaryMetrics {
  totalLegalEntities: number;
  totalBranches: number;
  totalDepartments: number;
  totalTeams: number;
  totalEmployees: number;
  totalVendors: number;
  totalManpowerProviders: number;
  totalVendorWorkers: number;
  totalActiveDeployments: number;
  complianceExpiringCount: number;
}

export interface OrganizationAuditRecord {
  id: string;
  organization_id: string;
  entity_type: 'LEGAL_ENTITY' | 'BRANCH' | 'LOCATION' | 'DEPARTMENT' | 'TEAM' | 'REPORTING_RELATIONSHIP' | 'VENDOR' | 'VENDOR_WORKER' | 'VENDOR_DEPLOYMENT';
  entity_id: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Designation {
  id: string;
  company_id: string;
  title: string;
  code: string;
  grade?: string;
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
  employee_code?: string;
  phone?: string;
  role?: string;
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
  exit_reason?: string;
  work_location?: string;
  shift_id?: string;
  shift_name?: string;
  attendance_policy_id?: string;
  leave_policy_id?: string;
  leave_policy_name?: string;
  salary_structure_code?: string;
  salary_structure_name?: string;
  salary_effective_from?: string;
  payroll_group_id?: string;
  annual_ctc?: number;
  monthly_ctc?: number;
  ctc?: number;
  history?: LifecycleHistoryItem[];
}

export interface EmployeeBankAccount {
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  account_type?: 'SALARY' | 'SAVINGS' | 'CURRENT';
}

export interface EmployeeStatutory {
  pan?: string;
  pan_number?: string;
  uan?: string;
  uan_number?: string;
  pf_number?: string;
  esi_number?: string;
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  pt_applicable?: boolean;
  tax_regime?: 'NEW' | 'OLD';
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
  avatar_asset_id?: string | null;
  avatar_version?: number;
  status: EmployeeStatus;
  employment_type: EmploymentType;
  employment_source?: EmploymentSource;
  vendor_id?: string;
  vendor_name?: string;
  vendor_employee_code?: string;
  profile: EmployeeProfile;
  employment: EmploymentDetails;
  bank?: EmployeeBankAccount;
  statutory?: EmployeeStatutory;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
  record_version?: number;
  deleted_at?: string | null;
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

// ============================================================================
// Universal Asset, Inventory & Resource Management Engine Types
// ============================================================================

export type AssetClass =
  | 'FIXED_ASSET'
  | 'TRACKED_ASSET'
  | 'INVENTORY_ITEM'
  | 'CONSUMABLE'
  | 'EQUIPMENT'
  | 'MACHINE'
  | 'TOOL'
  | 'VEHICLE'
  | 'DIGITAL_ASSET'
  | 'LICENSE'
  | 'PROPERTY'
  | 'FACILITY_RESOURCE';

export type AssetTrackingMode =
  | 'INDIVIDUAL'
  | 'SERIAL_NUMBER'
  | 'BATCH'
  | 'QUANTITY'
  | 'METER'
  | 'LICENSE'
  | 'LOCATION_ONLY';

export type AssetLifecycleStatus =
  | 'PLANNED'
  | 'ORDERED'
  | 'RECEIVED'
  | 'INSPECTION'
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_USE'
  | 'TRANSFER_PENDING'
  | 'UNDER_MAINTENANCE'
  | 'IN_REPAIR'
  | 'LOST'
  | 'DAMAGED'
  | 'DISPOSE_PENDING'
  | 'DISPOSED'
  | 'RETIRED';

export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL';

export type AssignmentTargetType =
  | 'EMPLOYEE'
  | 'DEPARTMENT'
  | 'BRANCH'
  | 'PROJECT'
  | 'SITE'
  | 'WAREHOUSE'
  | 'VEHICLE'
  | 'VENDOR_WORKER';

export type IndustryProfileCode =
  | 'IT'
  | 'MANUFACTURING'
  | 'FACTORY'
  | 'HEALTHCARE'
  | 'CONSTRUCTION'
  | 'LOGISTICS'
  | 'RETAIL'
  | 'HOSPITALITY'
  | 'MANPOWER'
  | 'CORPORATE';

export interface IndustryProfile {
  code: IndustryProfileCode;
  name: string;
  description: string;
  icon: string;
  recommended_categories: string[];
}

export interface AssetCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface AssetTypeMaster {
  id: string;
  tenant_id: string;
  category_id?: string;
  code: string;
  name: string;
  description?: string;
  asset_class: AssetClass;
  tracking_mode: AssetTrackingMode;
  serial_required: boolean;
  barcode_required?: boolean;
  qr_required: boolean;
  employee_assignable: boolean;
  location_assignable: boolean;
  vendor_assignable: boolean;
  maintenance_enabled: boolean;
  warranty_enabled: boolean;
  depreciation_enabled: boolean;
  meter_tracking_enabled: boolean;
  expiry_enabled?: boolean;
  batch_tracking_enabled?: boolean;
  is_active?: boolean;
}

export interface AssetAttributeDefinition {
  id: string;
  tenant_id: string;
  asset_type_code: string;
  field_code: string;
  field_label: string;
  data_type: 'TEXT' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'BOOLEAN' | 'DROPDOWN' | 'MULTI_SELECT' | 'CURRENCY' | 'MEASUREMENT';
  is_required: boolean;
  options?: string[];
  unit_of_measure?: string;
  display_order?: number;
}

export interface AssetAttributeValue {
  id: string;
  asset_id: string;
  field_code: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
  value_json?: any;
}

export interface UniversalAsset {
  id: string;
  tenant_id: string;
  legal_entity_id?: string;
  branch_id?: string;
  location_id?: string;
  department_id?: string;
  asset_category_code: string;
  asset_type_code: string;
  asset_code: string;
  asset_name: string;
  asset_class: AssetClass;
  tracking_mode: AssetTrackingMode;
  status: AssetLifecycleStatus | any;
  condition: AssetCondition;
  serial_number?: string;
  barcode?: string;
  qr_code?: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  purchase_date?: string;
  purchase_price: number;
  currency: string;
  vendor_id?: string;
  warranty_start?: string;
  warranty_end?: string;
  custodian_id?: string;
  custodian_name?: string;
  employee_id?: string;
  assigned_at?: string;
  book_value?: number;
  depreciation_method?: 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'CUSTOM' | 'NONE';
  useful_life_months?: number;
  salvage_value?: number;
  custom_attributes?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  retired_at?: string;

  // Backwards compatibility mapped fields for legacy UI references
  name?: string;
  category?: string;
  type?: string;
  serial?: string;
  asset_tag?: string;
  assignedTo?: string;
  empCode?: string;
  value?: string;
}

// Backwards-compatible alias for existing references
export type Asset = UniversalAsset;

export interface AssetAssignment {
  id: string;
  asset_id: string;
  target_type: AssignmentTargetType;
  target_id: string;
  target_name: string;
  assigned_by_id: string;
  assigned_by_name: string;
  assigned_at: string;
  expected_return_date?: string;
  actual_return_date?: string;
  condition_at_assign: AssetCondition;
  condition_at_return?: AssetCondition;
  purpose?: string;
  notes?: string;
  status: 'ACTIVE' | 'RETURNED' | 'TRANSFER_REQUESTED' | 'OVERDUE';
}

export interface AssetTransfer {
  id: string;
  asset_id: string;
  source_target_type: string;
  source_target_id: string;
  source_target_name: string;
  destination_target_type: string;
  destination_target_id: string;
  destination_target_name: string;
  status: 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  requested_by: string;
  approved_by?: string;
  dispatch_notes?: string;
  receipt_notes?: string;
  requested_at: string;
  completed_at?: string;
}

export interface LocationNode {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  location_type_code: string;
  parent_location_id?: string;
  address?: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  category_code: string;
  sku: string;
  item_name: string;
  description?: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_damaged: number;
  reorder_level: number;
  max_stock_level?: number;
  unit_cost: number;
  preferred_vendor_id?: string;
  is_low_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'CONSUMPTION' | 'ADJUSTMENT' | 'TRANSFER' | 'DAMAGE' | 'RETURN';
  quantity: number;
  balance_after: number;
  unit_cost?: number;
  reference_id?: string;
  actor_id: string;
  actor_name: string;
  notes?: string;
  created_at: string;
}

export interface AssetMaintenanceRecord {
  id: string;
  asset_id: string;
  asset_name?: string;
  maintenance_type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'CALIBRATION' | 'REPAIR' | 'METER_BASED';
  title: string;
  description?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  scheduled_date: string;
  performed_date?: string;
  technician_name?: string;
  vendor_name?: string;
  cost: number;
  meter_reading_at_service?: number;
  notes?: string;
  created_at: string;
}

export interface AssetAuditLog {
  id: string;
  tenant_id: string;
  asset_id?: string;
  actor_id: string;
  actor_name: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface AssetSummaryMetrics {
  total_assets: number;
  total_valuation: number;
  total_valuation_formatted: string;
  currently_assigned: number;
  available_in_pool: number;
  under_maintenance: number;
  low_stock_items_count: number;
  total_inventory_items: number;
}

// ============================================================================
// Enterprise Document & E-Signature Security Engine 2.0 Types
// ============================================================================

export type DocumentSubjectType =
  | 'employee'
  | 'vendor'
  | 'vendor_worker'
  | 'candidate'
  | 'company'
  | 'legal_entity'
  | 'branch'
  | 'department'
  | 'job_requisition'
  | 'system';

export type DocumentClassification =
  | 'public_internal'
  | 'internal'
  | 'confidential'
  | 'highly_confidential'
  | 'restricted';

export type DocumentStatus =
  | 'active'
  | 'archived'
  | 'pending_deletion'
  | 'legal_hold';

export type DocumentVerificationStatus =
  | 'UPLOADED'
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'REVOKED'
  | 'ARCHIVED';

export type MalwareScanStatus = 'SAFE' | 'SCANNING' | 'REJECTED';

export type EsignRequestStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Sent'
  | 'Viewed'
  | 'Partially Signed'
  | 'Awaiting Signature'
  | 'Completed'
  | 'Rejected'
  | 'Expired'
  | 'Cancelled';

export type EsignParticipantRole = 'SIGNER' | 'APPROVER' | 'WITNESS' | 'CC';
export type EsignParticipantStatus = 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'REJECTED';

export interface DocumentCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
  is_system?: boolean;
}

export interface DocumentTypeMaster {
  id: string;
  tenant_id: string;
  category_id?: string;
  code: string;
  name: string;
  description?: string;
  allowed_subject_types: DocumentSubjectType[];
  allowed_file_types: string[];
  max_size_bytes: number;
  requires_expiry: boolean;
  requires_verification: boolean;
  requires_signature: boolean;
  default_classification: DocumentClassification;
  retention_period_years: number;
  is_active: boolean;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  file_url?: string;
  content_hash: string; // SHA-256
  encryption_algorithm: string;
  encryption_key_id?: string;
  malware_scan_status: MalwareScanStatus;
  malware_scan_details?: Record<string, any>;
  uploaded_by_id: string;
  uploaded_by_name: string;
  change_notes?: string;
  created_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  shared_by_id: string;
  shared_by_name: string;
  shared_with_email: string;
  shared_with_user_id?: string;
  can_view: boolean;
  can_download: boolean;
  can_print: boolean;
  can_verify: boolean;
  access_token_hash: string;
  expires_at: string;
  max_access_count: number;
  access_count: number;
  revoked_at?: string;
  revoked_by?: string;
  created_at: string;
}

export interface StoragePool {
  id: string;
  name: string;
  provider: 'SUPABASE_STORAGE' | 'AWS_S3' | 'GCS' | 'AZURE_BLOB';
  region?: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FULL' | 'MAINTENANCE';
  capacity_bytes: number;
  used_bytes: number;
}

export interface StorageNode {
  id: string;
  tenant_id: string;
  organization_id?: string;
  storage_pool_id?: string;
  name: string;
  status: 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED' | 'MAINTENANCE';
  storage_quota_bytes: number;
  used_bytes: number;
  original_bytes: number;
  compressed_bytes: number;
  document_count: number;
  encryption_policy?: string;
  retention_policy?: string;
}

export interface DocumentRequirement {
  id: string;
  tenant_id: string;
  organization_id?: string;
  employee_id: string;
  document_type: string;
  title: string;
  description?: string;
  required: boolean;
  due_date?: string;
  status: 'REQUIRED' | 'UPLOADING' | 'PROCESSING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  rejection_reason?: string;
  requested_by?: string;
  document_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentLegalHold {
  id: string;
  tenant_id: string;
  document_id: string;
  hold_reference: string;
  reason: string;
  placed_by_id: string;
  placed_by_name: string;
  placed_at: string;
  released_at?: string;
  released_by_id?: string;
  released_by_name?: string;
  release_notes?: string;
}

export interface EsignParticipant {
  id: string;
  esign_request_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: EsignParticipantRole;
  sequence_order: number;
  status: EsignParticipantStatus;
  authentication_method: string;
  signature_hash?: string;
  ip_address?: string;
  user_agent?: string;
  viewed_at?: string;
  signed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface EsignRequest {
  id: string;
  tenant_id: string;
  document_id: string;
  document_version_id?: string;
  title: string;
  message?: string;
  status: EsignRequestStatus;
  signing_mode: 'SEQUENTIAL' | 'PARALLEL';
  expires_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  initiator_id: string;
  initiator_name: string;
  signed_version_id?: string;
  participants?: EsignParticipant[];
  document_title?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentAuditLog {
  id: string;
  tenant_id: string;
  document_id?: string;
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  action:
    | 'VIEW'
    | 'DOWNLOAD'
    | 'UPLOAD'
    | 'UPDATE_METADATA'
    | 'CREATE_VERSION'
    | 'VERIFY'
    | 'REJECT'
    | 'SHARE'
    | 'UNSHARE'
    | 'PRINT'
    | 'SIGN'
    | 'REVOKE'
    | 'ARCHIVE'
    | 'DELETE_REQUEST'
    | 'RESTORE'
    | 'LEGAL_HOLD_APPLIED';
  subject_type?: DocumentSubjectType;
  subject_id?: string;
  ip_hash?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DocumentMaster {
  id: string;
  tenant_id: string;
  legal_entity_id?: string;
  branch_id?: string;
  department_id?: string;
  folder_id?: string;
  subject_type: DocumentSubjectType;
  subject_id: string;
  subject_name?: string;
  document_type_id?: string;
  document_type_code: string;
  category_code: string;
  title: string;
  description?: string;
  classification: DocumentClassification;
  status: DocumentStatus;
  verification_status: DocumentVerificationStatus;
  current_version_id?: string;
  current_version?: DocumentVersion;
  versions?: DocumentVersion[];
  version_count: number;
  issued_at?: string;
  effective_from?: string;
  expires_at?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Convenience mapped properties for backwards compatibility
  document_type?: string;
  category?: string;
  employee_id?: string;
  employee_name?: string;
  file_name?: string;
  file_url?: string;
  storage_path?: string;
  file_size?: string;
  version?: number;
  uploaded_at?: string;
  uploaded_by?: string;
  days_until_expiry?: number;
  urgency_tier?: 'CRITICAL_7_DAYS' | 'WARNING_30_DAYS' | 'UPCOMING_90_DAYS' | 'EXPIRED' | 'HEALTHY';
}

// Backwards-compatible alias for existing UI references
export type HRDocument = DocumentMaster;

export interface DocumentTemplate {
  id: string;
  title: string;
  type: 'Offer Letter' | 'Appointment Letter' | 'Confirmation Letter' | 'Promotion Letter' | 'Transfer Letter' | 'Salary Revision' | 'Relieving Letter' | 'Experience Letter';
  content: string;
  variables: string[];
  updated_at: string;
}

export interface DocumentSummaryMetrics {
  total_documents: number;
  pending_verification: number;
  expiring_in_30_days: number;
  esign_completed: number;
  restricted_documents: number;
  total_storage_bytes: number;
  total_storage_formatted: string;
}

export interface DocumentSecurityStatus {
  private_storage_enabled: boolean;
  tls_transport_protected: boolean;
  kms_envelope_encryption: boolean;
  malware_scanning_active: boolean;
  immutable_audit_logging: boolean;
  realtime_sync_active: boolean;
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
  document_url?: string;
  uploaded_by?: string;
  uploaded_at: string;
  expiry_date?: string;
  verification_status: VendorDocumentVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at?: string;
}

export interface VendorPayment {
  id: string;
  vendor_id: string;
  legal_entity_id?: string;
  legal_entity_name?: string;
  invoice_reference: string;
  invoice_number?: string;
  payment_reference?: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  status: VendorPaymentStatus;
  bank_reference?: string;
  return_reason?: VendorReturnReason;
  return_notes?: string;
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
  employee_name?: string;
  employee?: Employee;
  legal_entity_id?: string;
  legal_entity_name?: string;
  deployment_role?: string;
  designation?: string;
  worker_category?: string;
  client_name?: string;
  work_location?: string;
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

// ============================================================================
// Enterprise Offboarding & Separation Engine 2.0 Types
// ============================================================================

export type SeparationType =
  | 'RESIGNATION'
  | 'TERMINATION'
  | 'LAYOFF'
  | 'CONTRACT_END'
  | 'RETIREMENT'
  | 'ABSCONDING'
  | 'DEATH'
  | 'TRANSFER_OUT'
  | 'OTHER';

export type SeparationReasonCode =
  | 'CAREER_GROWTH'
  | 'COMPENSATION'
  | 'MANAGEMENT'
  | 'WORK_CULTURE'
  | 'RELOCATION'
  | 'HIGHER_EDUCATION'
  | 'PERSONAL'
  | 'HEALTH'
  | 'RETIREMENT'
  | 'CONTRACT_END'
  | 'PERFORMANCE'
  | 'MISCONDUCT'
  | 'BUSINESS_RESTRUCTURING'
  | 'OTHER';

export type SeparationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'HR_REVIEW'
  | 'MANAGER_REVIEW'
  | 'NOTICE_PERIOD'
  | 'CLEARANCE'
  | 'FNF_PROCESSING'
  | 'FINAL_REVIEW'
  | 'READY_TO_EXIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'ON_HOLD';

export type RetentionStatus =
  | 'NOT_APPLICABLE'
  | 'PENDING'
  | 'DISCUSSION_ONGOING'
  | 'RETAINED'
  | 'CONTINUE_EXIT';

export type RehireEligibility =
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'REVIEW_REQUIRED'
  | 'UNKNOWN';

export type ClearanceDepartment =
  | 'MANAGER'
  | 'TEAM_LEAD'
  | 'IT'
  | 'ASSET'
  | 'FINANCE'
  | 'PAYROLL'
  | 'HR'
  | 'ADMIN'
  | 'LEGAL';

export type ClearanceStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CLEARED'
  | 'REJECTED'
  | 'WAIVED';

export type AssetRecoveryStatus =
  | 'PENDING'
  | 'RETURN_SCHEDULED'
  | 'RETURNED'
  | 'DAMAGED'
  | 'MISSING'
  | 'WAIVED';

export type FnFStatus =
  | 'NOT_STARTED'
  | 'INPUTS_PENDING'
  | 'READY_FOR_PAYROLL'
  | 'CALCULATION_IN_PROGRESS'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SETTLED';

export type SeparationTaskCategory =
  | 'KNOWLEDGE_TRANSFER'
  | 'DOCUMENT_HANDOVER'
  | 'PROJECT_HANDOVER'
  | 'CLIENT_HANDOVER'
  | 'RESPONSIBILITIES'
  | 'OTHER';

export type SeparationTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'WAIVED';

export interface SeparationTask {
  id: string;
  separation_id: string;
  task_category: SeparationTaskCategory;
  title: string;
  description?: string;
  handover_owner_id?: string;
  handover_owner_name?: string;
  recipient_id?: string;
  recipient_name?: string;
  status: SeparationTaskStatus;
  due_date?: string;
  completion_notes?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SeparationClearance {
  id: string;
  separation_id: string;
  department: ClearanceDepartment;
  clearance_item: string;
  assigned_to?: string;
  assigned_role: string;
  status: ClearanceStatus;
  due_date?: string;
  comments?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SeparationAssetRecovery {
  id: string;
  separation_id: string;
  asset_id: string;
  asset_name: string;
  serial_number?: string;
  category?: string;
  assigned_date?: string;
  asset_value: number;
  condition: 'EXCELLENT' | 'GOOD' | 'DAMAGED' | 'NEEDS_REPAIR';
  recovery_status: AssetRecoveryStatus;
  returned_date?: string;
  received_by?: string;
  damage_assessment?: string;
  financial_recovery_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExitInterviewRecord {
  id: string;
  separation_id: string;
  employee_id: string;
  interview_date: string;
  conducted_by?: string;
  primary_reason: SeparationReasonCode;
  secondary_reason?: string;
  general_feedback?: string;
  manager_feedback?: string;
  culture_feedback?: string;
  compensation_feedback?: string;
  recommendation?: string;
  rehire_eligible: RehireEligibility;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SeparationFnFReadiness {
  id: string;
  separation_id: string;
  employee_id: string;
  status: FnFStatus;
  worked_days: number;
  lop_days: number;
  leave_encashment_days: number;
  notice_buyout_days: number;
  notice_waiver_days: number;
  asset_recovery_deduction: number;
  outstanding_advances: number;
  expense_claims_payable: number;
  pending_salary_payable: number;
  gratuity_eligible: boolean;
  gratuity_amount: number;
  net_payable_estimated: number;
  payroll_settlement_reference?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SeparationAuditLog {
  id: string;
  organization_id: string;
  separation_id: string;
  employee_id?: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  old_value?: any;
  new_value?: any;
  reason?: string;
  created_at: string;
}

export interface EmployeeSeparation {
  id: string;
  organization_id: string;
  legal_entity_id?: string;
  employee_id: string;
  employee?: Employee;
  vendor_id?: string;
  vendor_name?: string;
  employment_source: 'DIRECT' | 'VENDOR';
  separation_type: SeparationType;
  reason_code: SeparationReasonCode;
  reason_text?: string;
  resignation_date: string;
  proposed_last_working_date?: string;
  notice_period_days: number;
  notice_start_date: string;
  expected_last_working_date: string;
  approved_last_working_date?: string;
  actual_last_working_date?: string;
  status: SeparationStatus;
  initiated_by: string;
  initiated_role: string;
  approved_by?: string;
  comments?: string;
  supporting_document_url?: string;
  retention_status: RetentionStatus;
  retention_notes?: string;
  rehire_eligibility: RehireEligibility;
  rehire_ineligible_reason?: string;
  is_early_release: boolean;
  notice_waiver_days: number;
  notice_buyout_days: number;
  override_reason?: string;
  override_by?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Computed & Aggregated Fields
  tasks?: SeparationTask[];
  clearances?: SeparationClearance[];
  assets?: SeparationAssetRecovery[];
  exit_interview?: ExitInterviewRecord;
  fnf_readiness?: SeparationFnFReadiness;
  total_clearances_count?: number;
  cleared_clearances_count?: number;
  pending_clearances_count?: number;
  rejected_clearances_count?: number;
  overdue_clearances_count?: number;
  total_tasks_count?: number;
  completed_tasks_count?: number;
  total_assets_count?: number;
  returned_assets_count?: number;
  issue_assets_count?: number;
  progress_percentage?: number;
  is_ready_for_exit?: boolean;
  blockers?: string[];
}

export interface SeparationSummaryMetrics {
  active_notice_period: number;
  pending_clearances: number;
  overdue_clearances: number;
  upcoming_exits_week: number;
  upcoming_exits_month: number;
  fnf_pending: number;
  ready_for_exit: number;
  completed_this_month: number;
}

export interface NoticePeriodCalculationResult {
  notice_period_days: number;
  notice_start_date: string;
  expected_last_working_date: string;
  policy_applied: string;
}



