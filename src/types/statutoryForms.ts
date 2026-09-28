// ============================================================================
// Types: Statutory Forms, Document Intelligence, & Onboarding Rules Engine
// Divya Manpower Resources (P) Ltd.
// ============================================================================

export type StatutoryFormType =
  | 'FORM_11'   // EPFO Declaration Form
  | 'FORM_2'    // EPF & EPS Revised Nomination Form
  | 'FORM_F'    // Gratuity Nomination (Payment of Gratuity Act, 1972)
  | 'FORM_1'    // Payment of Wages Nomination
  | 'FORM_Q'    // Appointment Order (TN Industrial Establishments Rules)
  | 'RESUME';   // Master Employee Resume / Bio-Data Record

export type NominationCategory = 'EPF' | 'EPS' | 'GRATUITY' | 'WAGES';

export interface StatutoryNominee {
  id?: string;
  nomination_type: NominationCategory;
  nominee_name: string;
  relationship: string;
  date_of_birth?: string;
  age: number;
  share_percentage: number;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  is_minor: boolean;
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_address?: string;
}

export interface PfDeclarationData {
  id?: string;
  organization_id: string;
  employee_id: string;
  previous_epf_member: boolean;
  previous_eps_member: boolean;
  previous_uan?: string;
  previous_member_id?: string;
  previous_exit_date?: string;
  scheme_certificate_no?: string;
  ppo_no?: string;
  international_worker: boolean;
  country_of_origin?: string;
  passport_number?: string;
  passport_valid_till?: string;
  pan_number?: string;
  aadhaar_number?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_name?: string;
  is_kyc_verified: boolean;
  declaration_accepted: boolean;
  declaration_date: string;
  employer_declaration_date: string;
  employer_authorized_sign?: string;
}

export interface AppointmentOrderData {
  id?: string;
  organization_id: string;
  establishment_id?: string;
  employee_id: string;
  appointment_order_no: string;
  serial_number?: string;
  designation_title: string;
  department_name: string;
  date_of_joining: string;
  nature_of_work: string;
  basic_wage: number;
  vda_allowance: number;
  hra_allowance: number;
  special_allowance: number;
  other_allowance: number;
  gross_wage: number;
  probation_period_months: number;
  notice_period_days: number;
  employer_sign_name: string;
  employer_sign_designation: string;
  status: 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'ACCEPTED' | 'ARCHIVED';
  acknowledged_at?: string;
}

export interface OnboardingInvitation {
  id: string;
  organization_id: string;
  establishment_id?: string;
  employee_id: string;
  token: string;
  phone?: string;
  email?: string;
  candidate_name: string;
  status: 'PENDING' | 'ACCESSED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'EXPIRED' | 'REVOKED';
  access_count: number;
  last_accessed_at?: string;
  expires_at: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReadinessCheckItem {
  id: string;
  category: 'PERSONAL' | 'ADDRESS' | 'BANKING' | 'STATUTORY_PF' | 'NOMINATIONS' | 'DOCUMENTS' | 'COMPENSATION';
  title: string;
  description: string;
  is_mandatory: boolean;
  is_completed: boolean;
  affected_forms: StatutoryFormType[];
  missing_fields: string[];
  action_required?: string;
}

export interface EmployeeOnboardingReadiness {
  employee_id: string;
  total_rules: number;
  completed_rules: number;
  completion_percentage: number;
  is_ready_for_generation: boolean;
  checklist: ReadinessCheckItem[];
  blockers: string[];
}

export interface OcrExtractedField {
  field_name: string;
  label: string;
  extracted_value: string;
  canonical_value?: string;
  confidence: number; // 0 to 1
  is_match: boolean;
  status: 'MATCHED' | 'DISCREPANCY' | 'CONFIRMATION_REQUIRED';
}

export interface DocumentOcrResult {
  document_type: 'AADHAAR' | 'PAN' | 'BANK_PROOF' | 'UAN_CARD' | 'EDUCATION';
  raw_text?: string;
  fields: OcrExtractedField[];
  overall_confidence: number;
  has_discrepancy: boolean;
  notes?: string;
}
