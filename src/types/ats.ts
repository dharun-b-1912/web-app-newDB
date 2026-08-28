// src/types/ats.ts
// ============================================================================
// Joy PeopleHR — Recruitment & ATS 2.0 Domain Models
// Enterprise State Machine, Requisitions, Jobs, Candidates, Interviews & Offers
// ============================================================================

export type RequisitionType =
  | 'New Position'
  | 'Replacement'
  | 'Expansion'
  | 'Backfill'
  | 'Temporary'
  | 'Contract'
  | 'Internship'
  | 'Campus Hiring'
  | 'Urgent Hiring';

export type RequisitionStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'On Hold'
  | 'Open'
  | 'Closed'
  | 'Cancelled';

export type RequisitionPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ApprovalStep {
  role: string;
  approver_name: string;
  approver_id?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
  comments?: string;
  updated_at?: string;
}

export interface Requisition {
  id: string; // e.g. REQ-2026-101
  organization_id?: string;
  company_id?: string;
  company_name?: string;
  business_unit?: string;
  department_id?: string;
  department_name?: string;
  location_id?: string;
  location_name?: string;
  hiring_manager_id?: string;
  hiring_manager_name?: string;
  recruiter_id?: string;
  recruiter_name?: string;
  job_title: string;
  designation_id?: string;
  designation_title?: string;
  job_level?: string; // e.g. L4, L5, Senior, Staff
  employment_type?: string; // Full Time, Contract, etc.
  number_of_positions: number;
  positions_filled?: number;
  requisition_type: RequisitionType;
  replacement_employee_id?: string;
  replacement_employee_name?: string;
  reason_for_hiring?: string;
  priority: RequisitionPriority;
  expected_joining_date?: string;
  budget?: number;
  min_salary?: number;
  max_salary?: number;
  currency?: string; // INR, USD, EUR
  required_skills?: string[];
  preferred_skills?: string[];
  education?: string;
  job_description?: string;
  responsibilities?: string[];
  qualifications?: string[];
  business_justification?: string;
  approval_workflow?: ApprovalStep[];
  status: RequisitionStatus;
  rejection_reason?: string;
  rejected_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type WorkMode = 'Office' | 'Hybrid' | 'Remote' | 'Field' | 'Flexible';

export type PublishingDestination =
  | 'Career Portal'
  | 'LinkedIn'
  | 'Indeed'
  | 'Naukri'
  | 'Employee Referral'
  | 'Recruitment Vendor'
  | 'Direct Link';

export type PublishingStatus = 'Not Published' | 'Publishing' | 'Published' | 'Paused' | 'Expired' | 'Failed' | 'Removed';

export interface JobPublication {
  destination: PublishingDestination;
  status: PublishingStatus;
  external_job_id?: string;
  published_url?: string;
  sync_error?: string;
  published_at?: string;
  last_synced?: string;
}

export type JobStatus = 'Draft' | 'Open' | 'Internal' | 'External' | 'On Hold' | 'Archived' | 'Closed';

export interface JobOpening {
  id: string; // e.g. JOB-2026-101
  organization_id?: string;
  requisition_id?: string;
  job_code?: string;
  job_title: string;
  designation_id?: string;
  designation_title?: string;
  department_id?: string;
  department_name?: string;
  company_id?: string;
  location_name?: string;
  work_mode?: WorkMode;
  employment_type?: string;
  job_level?: string;
  number_of_openings: number;
  positions_filled?: number;
  hiring_manager_id?: string;
  hiring_manager_name?: string;
  recruiter_id?: string;
  recruiter_name?: string;
  min_salary?: number;
  max_salary?: number;
  currency?: string;
  experience_min?: number;
  experience_max?: number;
  job_description?: string;
  summary?: string;
  about_company?: string;
  responsibilities?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  education?: string;
  application_deadline?: string;
  publications?: JobPublication[];
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type CandidateStage =
  | 'New'
  | 'Screening'
  | 'Shortlisted'
  | 'Assessment'
  | 'Interview'
  | 'Selected'
  | 'Offer'
  | 'Background Verification'
  | 'Preboarding'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn';

export interface CandidateActivity {
  id: string;
  candidate_id: string;
  type: string;
  title: string;
  description: string;
  actor_name: string;
  created_at: string;
}

export interface CandidateNote {
  id: string;
  candidate_id: string;
  author_name: string;
  author_id?: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

export interface Candidate {
  id: string; // e.g. CAND-001
  organization_id?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  phone?: string;
  current_location?: string;
  current_company?: string;
  current_designation?: string;
  total_experience_years?: number;
  skills: string[];
  education?: string;
  resume_url?: string;
  resume_parsed_data?: Record<string, any>;
  source_type: string;
  source_provider?: string;
  source_campaign?: string;
  referral_employee_id?: string;
  referral_employee_name?: string;
  applied_job_id?: string;
  applied_job_title?: string;
  department_name?: string;
  hiring_manager_name?: string;
  recruiter_name?: string;
  match_score?: number; // 0 - 100
  current_stage: CandidateStage;
  status: 'Active' | 'Rejected' | 'Withdrawn' | 'Hired' | 'Archived';
  rejection_reason?: string;
  talent_pool_id?: string;
  converted_employee_id?: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateApplication {
  id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id: string;
  job_title?: string;
  department_name?: string;
  requisition_id?: string;
  stage: CandidateStage;
  applied_at: string;
  screening_score?: number;
  screening_notes?: string;
  source?: string;
  is_primary?: boolean;
}

export interface Interview {
  id: string;
  organization_id?: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id: string;
  job_title?: string;
  round_number: number;
  round_name: string;
  interview_type: 'Video' | 'Phone' | 'In-Person' | 'Assessment' | 'Panel' | 'HR Discussion' | 'Leadership';
  scheduled_date: string;
  date?: string; // alias
  start_time: string;
  end_time: string;
  time?: string; // alias
  timezone?: string;
  meeting_link?: string;
  location_room?: string;
  interviewer_id?: string;
  interviewer_name?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show';
  overall_feedback?: string;
  overall_recommendation?: 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire';
  completed_at?: string;
  created_at?: string;
}

export interface InterviewScorecard {
  id: string;
  interview_id: string;
  interviewer_id?: string;
  interviewer_name: string;
  technical_skills_score: number; // 1-5
  communication_score: number; // 1-5
  problem_solving_score: number; // 1-5
  culture_fit_score: number; // 1-5
  leadership_score: number; // 1-5
  overall_score: number; // 1.0 - 5.0
  recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire';
  strengths?: string;
  areas_of_concern?: string;
  feedback_notes: string;
  submitted_at: string;
}

export type OfferStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Viewed'
  | 'Accepted'
  | 'Declined'
  | 'Expired'
  | 'Revoked';

export interface OfferCompensationComponent {
  id: string;
  offer_id: string;
  component_name: string;
  component_type: 'Basic' | 'HRA' | 'Special Allowance' | 'Employer PF' | 'Performance Variable' | 'Joining Bonus' | 'Gratuity' | 'Medical Allowance' | 'Other';
  amount_monthly: number;
  amount_annual: number;
  taxable: boolean;
  included_in_ctc: boolean;
  display_order: number;
}

export interface OfferBenefit {
  id: string;
  offer_id: string;
  benefit_title: string;
  benefit_description?: string;
  coverage_amount?: number;
  is_active: boolean;
}

export interface OfferApproval {
  id: string;
  offer_id: string;
  step_order: number;
  approver_role: 'HR Head' | 'Finance Controller' | 'Executive Leadership' | 'Hiring Manager';
  approver_id?: string;
  approver_name: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
  comments?: string;
  decided_at?: string;
}

export interface OfferVersion {
  id: string;
  offer_id: string;
  version_number: number;
  document_title: string;
  rendered_html: string;
  ai_generated: boolean;
  ai_tone?: 'Professional' | 'Warm' | 'Executive' | 'Concise' | 'Formal';
  changes_summary?: string;
  author_name: string;
  created_at: string;
}

export interface OfferTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  body_template: string;
  is_default?: boolean;
}

export interface OfferActivityLog {
  id: string;
  offer_id: string;
  action: string;
  actor_name: string;
  previous_status?: string;
  new_status?: string;
  details?: string;
  created_at: string;
}

export interface Offer {
  id: string; // e.g. OFR-2026-101
  organization_id?: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  job_id: string;
  job_title?: string;
  requisition_id?: string;
  department_id?: string;
  department_name?: string;
  location_name?: string;
  branch_id?: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  employment_type?: string;
  work_mode?: string;
  joining_date: string;
  ctc_annual: number;
  base_salary: number;
  variable_pay?: number;
  bonus?: number;
  currency: string;
  probation_months: number;
  notice_period_days: number;
  offer_expiry_date?: string;
  status: OfferStatus;
  template_id?: string;
  template_name?: string;
  document_id?: string;
  current_version_number?: number;
  rendered_letter_html?: string;
  components?: OfferCompensationComponent[];
  benefits?: OfferBenefit[];
  approvals?: OfferApproval[];
  versions?: OfferVersion[];
  activity_logs?: OfferActivityLog[];
  esign_provider?: string;
  esign_envelope_id?: string;
  esign_status?: string;
  signed_at?: string;
  sent_at?: string;
  accepted_at?: string;
  declined_reason?: string;
  background_check_status?: 'Pending' | 'Initiated' | 'In Progress' | 'Passed' | 'Flagged' | 'Failed';
  preboarding_status?: 'Pending' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

export interface TalentPool {
  id: string;
  organization_id?: string;
  name: string;
  category: string;
  description?: string;
  tags: string[];
  candidate_count: number;
  created_at: string;
}

export interface RecruitmentSettingsState {
  default_currency: string;
  auto_screen_keywords: boolean;
  default_probation_months: number;
  default_notice_period_days: number;
  sla_application_review_days: number;
  sla_screening_days: number;
  sla_interview_feedback_hours: number;
  sla_offer_approval_days: number;
  sla_candidate_response_days: number;
}

export interface AtsOverviewMetrics {
  openPositions: number;
  pendingRequisitions: number;
  activeCandidates: number;
  interviewsToday: number;
  interviewsThisWeek: number;
  pendingFeedbackCount: number;
  offersPending: number;
  offersAccepted: number;
  offersDeclined: number;
  candidatesJoined: number;
  avgTimeToFillDays: number;
  agingPositionsCount: number;
}
