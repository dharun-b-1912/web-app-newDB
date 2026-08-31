export type VendorEmployeeStatus =
  | 'DRAFT'
  | 'PENDING_COMPANY_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXIT_REQUESTED'
  | 'EXIT_APPROVED'
  | 'INACTIVE'
  | 'REJECTED';

export type AssignmentStatus = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export type AttendanceCorrectionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECALCULATED'
  | 'CLOSED';

export type PayrollVerificationStatus =
  | 'ATTENDANCE_OPEN'
  | 'ATTENDANCE_VERIFIED'
  | 'ATTENDANCE_LOCKED'
  | 'PAYROLL_CALCULATED'
  | 'PENDING_VENDOR_REVIEW'
  | 'VENDOR_VERIFIED'
  | 'PENDING_CLIENT_REVIEW'
  | 'CLIENT_APPROVED'
  | 'REJECTED'
  | 'FROZEN'
  | 'PAID';

export type DiscrepancyCategory =
  | 'Attendance'
  | 'LOP'
  | 'Overtime'
  | 'Wage Component'
  | 'Statutory Deduction'
  | 'Other';

export type DiscrepancyStatus = 'OPEN' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'RECALCULATED' | 'CLOSED';

export type POStatus =
  | 'DRAFT'
  | 'INTERNAL_APPROVAL'
  | 'ISSUED'
  | 'VENDOR_ACKNOWLEDGED'
  | 'ACTIVE'
  | 'PARTIALLY_CONSUMED'
  | 'FULLY_CONSUMED'
  | 'CLOSED'
  | 'EXPIRED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VALIDATION'
  | 'COMPANY_REVIEW'
  | 'FINANCE_REVIEW'
  | 'APPROVED'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'RETURNED_FOR_CORRECTION'
  | 'ON_HOLD';

export type ThreeWayMatchStatus = 'MATCHED' | 'PARTIALLY_MATCHED' | 'MISMATCHED' | 'EXCEPTION';

export type PaymentStatus = 'NOT_DUE' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'DISPUTED';

export type DocumentStatus = 'UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

// --- Entities ---

export type VendorOrgType = 'MANPOWER_STAFFING' | 'SECURITY' | 'FACILITY' | 'IT_CONTRACTING' | 'LOGISTICS' | 'OTHER';
export type VendorOrgStatus = 'Active' | 'Under Audit' | 'Suspended' | 'Terminated' | 'Pending Verification';

export type VendorCompanyType =
  | 'Proprietorship'
  | 'Partnership'
  | 'LLP'
  | 'Pvt Ltd'
  | 'Public Ltd'
  | 'Trust'
  | 'Society';

export interface AuthorizedPersonKYC {
  name: string;
  designation: string;
  pan: string;
  aadhaar_masked: string;
  mobile: string;
  email: string;
  authorization_letter_name?: string;
  authorization_letter_url?: string;
  is_verified?: boolean;
}

export interface VendorBankDetails {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc: string;
  cancelled_cheque_name?: string;
  cancelled_cheque_url?: string;
  is_verified?: boolean;
}

export interface VendorAgreementDetails {
  agreement_number: string;
  client_company_id?: string;
  client_company_name: string;
  start_date: string;
  end_date: string;
  contract_value?: number;
  scope_of_work: string;
  work_location: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'RENEWAL_DUE' | 'TERMINATED';
  signed_agreement_name?: string;
  signed_agreement_url?: string;
  work_order_name?: string;
  work_order_url?: string;
  po_document_name?: string;
  po_document_url?: string;
  scope_document_name?: string;
  scope_document_url?: string;
}

export interface VendorOrganization {
  id: string;
  tenant_id: string;
  name: string;
  trade_name?: string;
  code: string;
  vendor_type: VendorOrgType;
  company_type?: VendorCompanyType;
  registration_number?: string;
  contact_person: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  postal_code?: string;
  status: VendorOrgStatus;
  service_charge_percentage: number; // e.g. 8.5%
  is_gst_applicable: boolean;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  bank_details?: VendorBankDetails;
  authorized_person?: AuthorizedPersonKYC;
  agreement_details?: VendorAgreementDetails;
  compliance_score?: number;
  created_at: string;
  updated_at: string;
}

export interface VendorEmployee {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  address: string;
  joining_date: string;
  employment_type: 'Full Time' | 'Contract' | 'Daily Wage' | 'Apprentice';
  worker_category: 'Unskilled' | 'Semi-Skilled' | 'Skilled' | 'Highly Skilled';
  skill_category: string;
  department: string;
  designation: string;
  status: VendorEmployeeStatus;
  uan?: string;
  pf_number?: string;
  esic_number?: string;
  pan?: string;
  aadhaar_masked?: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  current_client_id?: string;
  current_client_name?: string;
  work_location?: string;
  project_name?: string;
  shift_name?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorEmployeeAssignment {
  id: string;
  tenant_id: string;
  vendor_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  client_company_id: string;
  client_company_name: string;
  project_name: string;
  work_location: string;
  designation: string;
  shift_name: string;
  start_date: string;
  end_date?: string;
  daily_rate?: number;
  monthly_rate?: number;
  status: AssignmentStatus;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorDocumentRequest {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  document_type: string;
  description: string;
  due_date: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  status: 'REQUESTED' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  requested_by_name: string;
  requested_at: string;
  submitted_file_name?: string;
  submitted_at?: string;
  verification_remarks?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface PrincipalEmployerFormV {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  certificate_number: string;
  issue_date: string;
  principal_employer_name: string;
  principal_employer_address: string;
  principal_employer_registration_no: string;
  contractor_name: string;
  contractor_address: string;
  nature_of_work: string;
  max_contract_labour_capacity: number;
  duration_from: string;
  duration_to: string;
  site_location: string;
  issued_by_name: string;
  issued_by_designation: string;
  status: 'ISSUED' | 'EXPIRED' | 'REVOKED';
  created_at: string;
}

export interface VendorAttendanceRecord {
  id: string;
  tenant_id: string;
  vendor_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  month: string; // YYYY-MM
  total_working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  lop_days: number;
  ot_hours: number;
  payable_days: number;
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'LOCKED';
  correction_requested?: boolean;
}

export interface VendorAttendanceCorrectionRequest {
  id: string;
  tenant_id: string;
  vendor_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  month: string;
  date?: string;
  original_present_days: number;
  requested_present_days: number;
  original_lop_days: number;
  requested_lop_days: number;
  original_ot_hours: number;
  requested_ot_hours: number;
  reason: string;
  supporting_doc_url?: string;
  supporting_doc_name?: string;
  status: AttendanceCorrectionStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_remarks?: string;
}

export interface EmployeeWageBreakdown {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  client_name: string;
  working_days: number;
  present_days: number;
  lop_days: number;
  payable_days: number;
  ot_hours: number;
  
  // Earnings
  monthly_gross: number;
  basic_wage: number;
  hra: number;
  special_allowance: number;
  food_allowance: number;
  ot_wages: number;
  attendance_bonus: number;
  gross_payable: number;
  
  // Deductions
  employee_pf: number;
  employee_esi: number;
  professional_tax: number;
  lwf: number;
  advance_deduction: number;
  total_deductions: number;
  
  // Net
  net_salary: number;
  
  // Employer Cost
  employer_pf: number;
  employer_esi: number;
  employer_lwf: number;
  total_employer_statutory: number;
}

export interface VendorPayableBreakdown {
  period: string; // YYYY-MM
  vendor_id: string;
  vendor_name: string;
  client_company_id: string;
  client_company_name: string;
  headcount: number;
  
  // Wage Subtotal
  total_gross_wages: number;
  total_ot_wages: number;
  total_allowances_incentives: number;
  wage_subtotal: number;
  
  // Statutory Employer Subtotal
  total_employer_pf: number;
  total_employer_esi: number;
  total_employer_lwf: number;
  statutory_subtotal: number;
  
  // Commercials
  service_charge_percentage: number;
  service_charge_amount: number;
  other_contractual_charges: number;
  commercials_subtotal: number;
  
  // Pre-Tax Total
  total_before_tax: number;
  
  // GST
  gst_percentage: number;
  gst_amount: number;
  gross_payable_value: number;
  
  // Adjustments & Penalties
  previous_recoveries: number;
  penalties: number;
  
  // Final Net Payable
  net_vendor_payable: number;
}

export interface VendorPurchaseOrder {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  client_company_id: string;
  client_company_name: string;
  po_number: string;
  po_date: string;
  service_start_date: string;
  service_end_date: string;
  service_period_label: string;
  contract_value: number;
  consumed_amount: number;
  remaining_balance: number;
  approved_headcount: number;
  billing_model: 'MONTHLY_FIXED' | 'PER_MANDAY' | 'PER_HOUR' | 'COST_PLUS';
  rate_details: string;
  terms_conditions: string;
  status: POStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorInvoice {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  client_company_id: string;
  client_company_name: string;
  po_id: string;
  po_number: string;
  payroll_period: string; // YYYY-MM
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  gstin: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_invoice_amount: number;
  status: InvoiceStatus;
  match_status: ThreeWayMatchStatus;
  variance_amount: number;
  exception_reason?: string;
  attached_invoice_pdf?: string;
  attached_wage_register?: string;
  attached_pf_challan?: string;
  attached_esi_challan?: string;
  submitted_by: string;
  submitted_at: string;
  finance_reviewer?: string;
  reviewed_at?: string;
  payment_reference?: string;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface ThreeWayMatchResult {
  invoice_id: string;
  invoice_number: string;
  po_number: string;
  period: string;
  po_available_balance: number;
  approved_payroll_payable: number;
  vendor_invoice_claimed: number;
  difference_amount: number;
  variance_percentage: number;
  is_po_limit_sufficient: boolean;
  is_payroll_matched: boolean;
  match_status: ThreeWayMatchStatus;
  exception_notes: string[];
}

export interface VendorStatutoryChallan {
  id: string;
  tenant_id: string;
  vendor_id: string;
  period: string; // YYYY-MM
  type: 'PF' | 'ESI' | 'PT' | 'LWF';
  headcount: number;
  wage_base: number;
  employee_share: number;
  employer_share: number;
  admin_charges?: number;
  total_remitted: number;
  trrn_or_challan_no: string;
  payment_date: string;
  bank_ref: string;
  status: 'REMITTED' | 'PENDING' | 'OVERDUE';
  receipt_doc_url?: string;
}

export interface VendorInvoicePayment {
  id: string;
  tenant_id: string;
  vendor_id: string;
  invoice_id: string;
  invoice_number: string;
  po_number: string;
  client_company_name: string;
  invoice_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  payment_status: PaymentStatus;
  payment_date?: string;
  payment_reference?: string;
  bank_transaction_id?: string;
  payment_mode?: 'NEFT' | 'RTGS' | 'ACH' | 'CHEQUE';
  notes?: string;
}

export interface VendorAuditLog {
  id: string;
  tenant_id: string;
  vendor_id: string;
  entity_type: 'EMPLOYEE' | 'ASSIGNMENT' | 'ATTENDANCE' | 'PAYROLL' | 'PO' | 'INVOICE' | 'PAYMENT' | 'COMPLIANCE' | 'LICENSE' | 'RETURN' | 'ONBOARDING';
  entity_id: string;
  action: string;
  previous_value?: string;
  new_value?: string;
  performed_by: string;
  performed_at: string;
  role: string;
  remarks?: string;
}

// ============================================================
// COMPLIANCE INTELLIGENCE & LICENSE LIFECYCLE
// ============================================================

export type VendorLicenseType =
  | 'Contract Labour License'
  | 'Migrant Labour License'
  | 'Factory License'
  | 'PSARA License'
  | 'Shop & Establishment'
  | 'Pollution Control Board'
  | 'Fire Safety NOC'
  | 'Other Statutory License';

export type VendorLicenseStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON' // within 30 days
  | 'CRITICAL'      // within 7 days
  | 'EXPIRED'
  | 'UNDER_RENEWAL';

export interface VendorLicense {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  license_type: VendorLicenseType;
  license_number: string;
  issued_date: string;
  expiry_date: string;
  max_worker_capacity?: number;
  issuing_authority?: string;
  work_location?: string;
  status: VendorLicenseStatus;
  days_until_expiry: number;
  document_name?: string;
  document_url?: string;
  renewal_requested?: boolean;
  renewal_application_number?: string;
  reminders_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// STATUTORY RETURNS & FORM V REGISTRY
// ============================================================

export type StatutoryReturnType =
  | 'Form V (Principal Employer Certificate)'
  | 'Form XXIV (Half-Yearly Return)'
  | 'Form XXV (Annual Return)'
  | 'PF Monthly ECR & Challan'
  | 'ESI Monthly Challan'
  | 'LWF Half-Yearly Return'
  | 'Form VI-A (Notice of Commencement/Completion)'
  | 'Register of Fines / Deductions / Advances';

export type StatutoryReturnStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'OVERDUE';

export interface StatutoryReturn {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  form_type: StatutoryReturnType;
  return_period: string; // e.g. "2026-H1", "2026-08", "2026-Annual"
  due_date: string;
  filing_date?: string;
  acknowledgement_number?: string;
  status: StatutoryReturnStatus;
  document_name?: string;
  document_url?: string;
  remarks?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// COMPLIANCE SCORE & RISK TIERS
// ============================================================

export type ComplianceRiskTier = 'EXCELLENT' | 'GOOD' | 'ATTENTION_REQUIRED' | 'HIGH_RISK';

export interface ComplianceScoreBreakdown {
  vendor_id: string;
  vendor_name: string;
  overall_score: number; // 0 - 100
  risk_tier: ComplianceRiskTier;
  documents_score: number; // weight 20%
  licenses_score: number;  // weight 25%
  payroll_score: number;   // weight 25%
  statutory_score: number; // weight 20%
  returns_score: number;   // weight 10%
  active_issues_count: number;
  expiring_licenses_count: number;
  overdue_tasks_count: number;
  calculated_at: string;
}

// ============================================================
// COMPLIANCE CALENDAR & SMART REMINDERS
// ============================================================

export type CalendarFrequency = 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY' | 'ONE_TIME';

export interface ComplianceCalendarTask {
  id: string;
  tenant_id: string;
  vendor_id: string;
  vendor_name: string;
  title: string;
  category: 'PF' | 'ESI' | 'WAGE_REGISTER' | 'HALF_YEARLY_RETURN' | 'ANNUAL_RETURN' | 'LICENSE_RENEWAL' | 'FORM_V';
  frequency: CalendarFrequency;
  due_date: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'OVERDUE';
  assigned_to_role: 'Vendor Admin' | 'Company HR' | 'Compliance Officer' | 'Finance';
  reminder_days_before: number[]; // e.g. [90, 60, 30, 15, 7, 1]
  last_notified_at?: string;
  created_at: string;
}

export interface OcrExtractionResult {
  detected_document_type: VendorLicenseType | StatutoryReturnType;
  confidence_score: number; // 0 - 100
  extracted_license_number: string;
  extracted_issue_date: string;
  extracted_expiry_date: string;
  extracted_holder_name?: string;
  extracted_issuing_authority?: string;
  raw_text_snippet?: string;
}

// ============================================================
// MULTI-COMPANY VENDOR RELATIONSHIPS & STRICT DATA ISOLATION
// ============================================================

export type VendorCompanyRelationshipStatus =
  | 'ACTIVE'
  | 'PENDING_APPROVAL'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'REJECTED';

export type VendorCompanyApprovalStatus =
  | 'DRAFT'
  | 'CONNECTION_REQUESTED'
  | 'KYC_UNDER_REVIEW'
  | 'AGREEMENT_PENDING'
  | 'COMPANY_APPROVED'
  | 'REJECTED';

export interface VendorCompanyRelationship {
  id: string; // e.g. "rel-apex-joy-01"
  relationship_id: string; // e.g. "REL-001"
  vendor_id: string; // e.g. "vnd-apex-01"
  vendor_name: string;
  company_id: string; // e.g. "comp-joy-01"
  company_name: string; // e.g. "Joy Manufacturing Pvt Ltd"
  company_code: string;
  company_logo?: string;
  site_location: string;
  status: VendorCompanyRelationshipStatus;
  approval_status: VendorCompanyApprovalStatus;
  access_enabled: boolean;
  active_workers_count: number;
  compliance_score: number;
  contract_start_date: string;
  contract_end_date: string;
  sow_number?: string;
  master_po_number?: string;
  primary_hr_contact_name: string;
  primary_hr_contact_email: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface WorkerDeployment {
  id: string; // deployment_id
  worker_id: string;
  vendor_id: string;
  company_id: string;
  relationship_id: string; // Foreign Key to VendorCompanyRelationship
  company_name: string;
  site_name: string;
  department_name: string;
  designation: string;
  start_date: string;
  end_date?: string;
  daily_wage_rate: number;
  overtime_eligible: boolean;
  status: 'ACTIVE' | 'EXIT_REQUESTED' | 'RELEASED' | 'TRANSFERRED';
  gate_pass_valid_till: string;
  created_at: string;
  updated_at: string;
}

