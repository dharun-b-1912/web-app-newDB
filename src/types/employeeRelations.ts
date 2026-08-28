export type CaseType =
  | 'GRIEVANCE'
  | 'COMPLAINT'
  | 'DISCIPLINARY'
  | 'WORKPLACE_CONCERN'
  | 'POSH'
  | 'POLICY_VIOLATION'
  | 'ATTENDANCE_DISPUTE'
  | 'PAYROLL_DISPUTE'
  | 'WORKPLACE_CONFLICT'
  | 'MANAGER_CONCERN'
  | 'SAFETY_CONCERN'
  | 'ETHICS_CONCERN'
  | 'COMPLIANCE'
  | 'HR_SUPPORT';

export type CaseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'INVESTIGATION'
  | 'ACTION_REQUIRED'
  | 'PENDING_EMPLOYEE'
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'WITHDRAWN'
  | 'CANCELLED';

export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type ConfidentialityLevel = 'NORMAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';

export interface CaseTimelineEvent {
  id: string;
  actor_name: string;
  actor_role: string;
  timestamp: string;
  action: string;
  note?: string;
}

export interface CaseAttachment {
  id: string;
  storage_object_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_private: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

export interface CaseInternalNote {
  id: string;
  author_name: string;
  author_role: string;
  note: string;
  created_at: string;
  visibility: 'INTERNAL' | 'EMPLOYEE_VISIBLE';
}

export interface CaseTask {
  id: string;
  title: string;
  owner_name: string;
  due_date: string;
  priority: PriorityLevel;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SlaConfig {
  acknowledgement_hours: number;
  first_response_hours: number;
  resolution_hours: number;
  consumed_pct: number;
  is_overdue: boolean;
  escalated_to?: string;
}

// ─── Common Case Interface ──────────────────────────────────────────────────
export interface ErCase {
  id: string;
  case_number: string; // e.g. GRV-2026-000184, DIS-2026-000032, POSH-2026-000007, HLP-2026-000045
  tenant_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  work_email: string;
  department: string;
  location: string;
  subject: string;
  description: string;
  case_type: CaseType;
  category: string;
  priority: PriorityLevel;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  status: CaseStatus;
  confidentiality_level: ConfidentialityLevel;
  assigned_to?: string;
  assigned_to_email?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date: string;
  closed_at?: string;
  resolution_notes?: string;
  closure_reason?: string;
  follow_up_date?: string;
  sla: SlaConfig;
  timeline: CaseTimelineEvent[];
  attachments: CaseAttachment[];
  internal_notes: CaseInternalNote[];
  tasks: CaseTask[];
  is_anonymous: boolean;
  linked_entity_type?: 'ATTENDANCE' | 'PAYROLL' | 'LEAVE' | 'DOCUMENT';
  linked_entity_id?: string;
  employee_feedback?: {
    resolved: 'YES' | 'PARTIALLY' | 'NO';
    rating?: number;
    comment?: string;
  };
}

// ─── Engagement & Surveys ───────────────────────────────────────────────────
export type SurveyQuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'RATING'
  | 'LIKERT_SCALE'
  | 'NPS'
  | 'YES_NO'
  | 'TEXT'
  | 'NUMBER';

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: SurveyQuestionType;
  options?: string[];
  is_required: boolean;
}

export interface SurveyActionPlan {
  id: string;
  issue_identified: string;
  action_title: string;
  owner_name: string;
  due_date: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  completion_pct: number;
}

export interface SurveyModel {
  id: string;
  title: string;
  description: string;
  category: 'PULSE' | 'ENGAGEMENT' | 'ONBOARDING' | 'EXIT' | 'MANAGER' | 'TRAINING';
  target_audience: string; // e.g. 'All Employees', 'Engineering', 'Night Shift Line A'
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  min_response_threshold: number;
  status: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'CLOSED' | 'ANALYZED';
  questions: SurveyQuestion[];
  responses_count: number;
  participation_rate_pct: number;
  average_score: number; // 0 - 100
  nps_score?: number;
  action_plans: SurveyActionPlan[];
  created_at: string;
}

// ─── Disciplinary Actions ───────────────────────────────────────────────────
export type DisciplinaryActionType =
  | 'COUNSELLING'
  | 'VERBAL_WARNING'
  | 'WRITTEN_WARNING'
  | 'FINAL_WARNING'
  | 'PIP'
  | 'SUSPENSION'
  | 'TERMINATION_RECOMMENDATION';

export interface ShowCauseNotice {
  notice_number: string;
  issued_at: string;
  issued_by: string;
  charges_details: string;
  response_due_date: string;
  employee_response?: string;
  employee_response_at?: string;
  employee_acknowledged: boolean;
}

export interface DisciplinaryCase extends ErCase {
  policy_violated: string;
  incident_date: string;
  preliminary_review_notes: string;
  show_cause_notice?: ShowCauseNotice;
  hearing_date?: string;
  hearing_panel_members?: string[];
  findings_summary?: string;
  decision_action_type?: DisciplinaryActionType;
  action_effective_from?: string;
  action_effective_to?: string;
  is_legal_hold: boolean;
}

// ─── POSH Committee ─────────────────────────────────────────────────────────
export interface PoshCommitteeMember {
  id: string;
  name: string;
  role: 'PRESIDING_OFFICER' | 'INTERNAL_MEMBER' | 'EXTERNAL_MEMBER' | 'MEMBER_SECRETARY';
  email: string;
  is_external: boolean;
  effective_from: string;
  effective_to: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface PoshHearing {
  id: string;
  hearing_number: number;
  date_time: string;
  location: string;
  attendees_summary: string;
  key_discussions: string;
  signed_minutes_storage_id?: string;
}

export interface PoshCase extends ErCase {
  committee_members_assigned: string[];
  anonymized_complainant_ref: string;
  anonymized_respondent_ref: string;
  incident_date: string;
  hearings: PoshHearing[];
  investigation_report_summary?: string;
  committee_recommendations?: string;
  final_statutory_order?: string;
  compliance_report_filed: boolean;
  statutory_filing_date?: string;
}

// ─── Statutory Compliance ───────────────────────────────────────────────────
export type ComplianceCategory =
  | 'LABOUR_LAWS'
  | 'EMPLOYEE_REGISTERS'
  | 'MANDATORY_NOTICES'
  | 'WORKPLACE_SAFETY'
  | 'SOCIAL_SECURITY'
  | 'PAYROLL_STATUTORY'
  | 'POSH_ANNUAL_REPORT'
  | 'CONTRACTOR_COMPLIANCE';

export type ComplianceFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | 'ONE_TIME';

export interface ComplianceRecord {
  id: string;
  requirement_title: string;
  jurisdiction: string; // e.g. 'Tamil Nadu, India' / 'Central'
  category: ComplianceCategory;
  frequency: ComplianceFrequency;
  due_date: string;
  owner_name: string;
  owner_email: string;
  status: 'DUE_SOON' | 'COMPLIANT' | 'OVERDUE' | 'UNDER_REVIEW' | 'EXEMPT';
  evidence_document_name?: string;
  evidence_storage_id?: string;
  submission_ack_number?: string;
  expiry_date?: string;
  reviewer_name?: string;
  reviewer_comments?: string;
  last_filed_at?: string;
}

// ─── Communication & Help ───────────────────────────────────────────────────
export type CommunicationUrgency = 'NORMAL' | 'IMPORTANT' | 'URGENT' | 'EMERGENCY';

export interface HrCommunication {
  id: string;
  title: string;
  category: 'ANNOUNCEMENT' | 'POLICY_UPDATE' | 'HOLIDAY' | 'PAYROLL' | 'BENEFITS' | 'EMERGENCY' | 'ORG_UPDATE';
  urgency: CommunicationUrgency;
  content: string;
  target_audience: string; // e.g. 'All Employees', 'Corporate HQ', 'Plant A Factory'
  published_by: string;
  published_at: string;
  requires_acknowledgement: boolean;
  version: number;
  stats: {
    target_count: number;
    delivered_count: number;
    read_count: number;
    acknowledged_count: number;
  };
  attachments: CaseAttachment[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'BENEFITS' | 'POLICIES' | 'ONBOARDING' | 'DOCUMENTS' | 'WORKPLACE';
  summary: string;
  content: string;
  author_name: string;
  version: number;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  effective_date: string;
  helpful_votes: number;
  unhelpful_votes: number;
  view_count: number;
  tags: string[];
}

// ─── Legacy Backward Compatibility Types ────────────────────────────────────
export type CommunicationType =
  | 'ANNOUNCEMENT'
  | 'POLICY'
  | 'EVENT'
  | 'NEWSLETTER'
  | 'ALERT'
  | 'EMERGENCY'
  | 'HOLIDAY'
  | 'PAYROLL'
  | 'BENEFITS'
  | 'ORG_UPDATE';

export type CommunicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';

export interface Communication {
  id: string;
  tenant_id: string;
  title: string;
  content?: string;
  body?: string;
  type?: CommunicationType;
  communication_type?: string;
  priority?: string;
  status: CommunicationStatus;
  publish_at?: string;
  published_at?: string;
  expires_at?: string;
  created_at: string;
  attachments?: string[];
  target_audience?: string;
  audience_type?: string;
  target_departments?: string[];
  target_locations?: string[];
  target_designations?: string[];
  requires_acknowledgement?: boolean;
  author_name?: string;
  read_by?: string[];
  acknowledged_by?: string[];
}

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'PENDING_USER'
  | 'ASSIGNED'
  | 'WAITING_FOR_EMPLOYEE'
  | 'ESCALATED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface HelpdeskMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'EMPLOYEE' | 'HR' | 'SYSTEM';
  message: string;
  created_at: string;
  attachments?: string[];
  is_internal?: boolean;
  visibility?: 'INTERNAL' | 'EMPLOYEE_VISIBLE' | 'EMPLOYEE';
}

export interface HelpdeskTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  employee_id: string;
  employee_name: string;
  employee_email?: string;
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  assigned_name?: string;
  sla_due_at?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  messages?: HelpdeskMessage[];
}

export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file' | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'FILE';

export interface ServiceFormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ServiceDefinition {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  name?: string;
  category: string;
  description: string;
  sla_hours: number;
  is_active: boolean;
  enabled?: boolean;
  employee_visible?: boolean;
  requires_attachment?: boolean;
  requires_approval?: boolean;
  icon?: string;
  form_schema?: any;
  workflow_config?: any;
  fields?: ServiceFormField[];
}

export type ServiceRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'PROCESSING'
  | 'ACTION_REQUIRED';

export interface ServiceRequest {
  id: string;
  tenant_id: string;
  request_number: string;
  service_id: string;
  service_title: string;
  employee_id: string;
  employee_name: string;
  status: ServiceRequestStatus;
  form_data: Record<string, any>;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

