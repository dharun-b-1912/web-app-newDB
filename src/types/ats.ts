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
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  updated_at?: string;
}

export interface Requisition {
  id: string; // e.g. REQ-2026-001
  company_id: string;
  company_name: string;
  business_unit?: string;
  department_id: string;
  department_name: string;
  location_id: string;
  location_name: string;
  hiring_manager_id: string;
  hiring_manager_name: string;
  recruiter_id: string;
  recruiter_name: string;
  job_title: string;
  designation_id: string;
  designation_title: string;
  job_level: string; // e.g. L4, L5, Senior, Staff
  employment_type: string; // Full Time, Contract, etc.
  number_of_positions: number;
  positions_filled: number;
  requisition_type: RequisitionType;
  replacement_employee_id?: string;
  replacement_employee_name?: string;
  reason_for_hiring: string;
  priority: RequisitionPriority;
  expected_joining_date: string;
  budget: number;
  min_salary: number;
  max_salary: number;
  currency: string; // USD, INR, EUR, etc.
  required_skills: string[];
  preferred_skills: string[];
  education: string;
  job_description: string;
  responsibilities: string[];
  qualifications: string[];
  approval_workflow: ApprovalStep[];
  status: RequisitionStatus;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export type WorkMode = 'Office' | 'Hybrid' | 'Remote' | 'Field' | 'Flexible';

export type PublishingDestination =
  | 'WorkForceOS Job Portal'
  | 'College Portal'
  | 'External Job Boards'
  | 'Employee Referral'
  | 'Recruitment Vendor'
  | 'Direct Application Link';

export type PublishingStatus = 'Not Published' | 'Publishing' | 'Published' | 'Paused' | 'Expired' | 'Failed' | 'Removed';

export interface JobPublication {
  destination: PublishingDestination;
  status: PublishingStatus;
  external_job_id?: string;
  published_at?: string;
  sync_error?: string;
  last_synced?: string;
}

export interface JobOpening {
  id: string; // e.g. JOB-2026-101
  requisition_id: string;
  job_title: string;
  designation_id: string;
  department_id: string;
  company_id: string;
  location_name: string;
  work_mode: WorkMode;
  employment_type: string;
  job_level: string;
  number_of_openings: number;
  positions_filled: number;
  hiring_manager_id: string;
  hiring_manager_name: string;
  recruiter_id: string;
  recruiter_name: string;
  
  // Job Description Sections
  summary: string;
  about_company: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  education: string;
  certifications: string[];
  experience_years: string; // e.g. "3-5 years"
  benefits: string[];
  working_hours: string;
  min_salary: number;
  max_salary: number;
  currency: string;
  application_instructions: string;
  
  publications: JobPublication[];
  status: 'Draft' | 'Open' | 'On Hold' | 'Closed';
  created_at: string;
  updated_at: string;
}

export type CandidateStatus =
  | 'New'
  | 'Screening'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'Offer'
  | 'Offer Accepted'
  | 'Onboarding'
  | 'Joined'
  | 'Rejected'
  | 'Withdrawn'
  | 'On Hold'
  | 'Blacklisted'
  | 'Archived';

export interface Candidate {
  id: string; // e.g. CND-901
  candidate_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  alt_phone?: string;
  location: string;
  current_company?: string;
  current_title?: string;
  total_experience_years: number;
  relevant_experience_years: number;
  expected_salary: number;
  current_salary?: number;
  currency: string;
  notice_period_days: number;
  preferred_location?: string;
  work_mode_preference?: WorkMode;
  skills: string[];
  education: string;
  certifications: string[];
  languages: string[];
  resume_url?: string;
  resume_name?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
  website_url?: string;
  source: string; // Career Page, LinkedIn, Referral, etc.
  recruiter_id?: string;
  recruiter_name?: string;
  owner_name?: string;
  status: CandidateStatus;
  tags: string[];
  rating: number; // 1 to 5 scale
  created_at: string;
  last_activity: string;
}

export interface CandidateActivity {
  id: string;
  candidate_id: string;
  application_id?: string;
  actor_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface CandidateApplication {
  id: string; // e.g. APP-401
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  job_id: string;
  job_title: string;
  requisition_id: string;
  department_name: string;
  company_name: string;
  source: string;
  applied_date: string;
  current_stage: CandidateStatus;
  status: 'Active' | 'Rejected' | 'Withdrawn' | 'Hired';
  recruiter_name: string;
  hiring_manager_name: string;
  rating: number;
  screening_score: number; // 0 - 100%
  screening_details?: {
    skill_match: number;
    experience_match: number;
    education_match: number;
    location_match: number;
    overall: number;
    matched_skills: string[];
    missing_skills: string[];
  };
  interview_score?: number;
  offer_id?: string;
  rejection_reason?: string;
  withdrawal_reason?: string;
  notes_count?: number;
}

export type InterviewType =
  | 'Phone Screening'
  | 'HR Round'
  | 'Technical Round'
  | 'Technical Round 1'
  | 'Technical Round 2'
  | 'Manager Round'
  | 'Panel Interview'
  | 'Behavioral'
  | 'Assessment'
  | 'Final Round'
  | 'CEO Round'
  | string;

export type InterviewRoundType = InterviewType;

export type InterviewMode = 'Video' | 'Phone' | 'In Person' | 'Online Assessment' | 'Hybrid' | 'Online';

export type InterviewStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Rescheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export interface InterviewerPanelMember {
  user_id?: string;
  interviewer_id?: string;
  name?: string;
  interviewer_name?: string;
  role?: string;
  email?: string;
  interviewer_email?: string;
  is_required?: boolean;
  accepted?: boolean;
  status?: 'Confirmed' | 'Pending' | 'Declined';
}

export interface InterviewFeedback {
  interview_id?: string;
  interviewer_id: string;
  interviewer_name: string;
  technical_knowledge?: number; // 1-5
  technical_skills_rating?: number;
  communication?: number; // 1-5
  communication_rating?: number;
  problem_solving?: number; // 1-5
  problem_solving_rating?: number;
  culture_fit?: number; // 1-5
  culture_fit_rating?: number;
  leadership?: number; // 1-5
  role_specific_skills?: number; // 1-5
  overall_rating: number; // 1-5
  recommendation: 'Strong Hire' | 'Hire' | 'Consider' | 'No Hire' | 'Strong No Hire';
  strengths: string;
  weaknesses?: string;
  areas_for_improvement?: string;
  comments?: string;
  detailed_notes?: string;
  submitted_at: string;
}

export interface InterviewScorecard {
  id: string;
  candidate_id: string;
  job_id: string;
  round_name: string;
  criteria_scores: { category: string; score: number; notes: string }[];
}

export interface Interview {
  id: string; // INT-501
  candidate_id: string;
  candidate_name: string;
  candidate_email?: string;
  application_id: string;
  job_id: string;
  job_title: string;
  round_name: string;
  round_type?: string;
  round_number?: number;
  interview_type?: InterviewType;
  date: string; // YYYY-MM-DD
  start_time: string; // e.g. 10:00 AM
  end_time: string; // e.g. 11:00 AM
  timezone: string;
  interview_mode?: InterviewMode;
  mode?: string;
  meeting_link?: string;
  location?: string;
  location_or_link?: string;
  panel?: InterviewerPanelMember[];
  interviewers?: InterviewerPanelMember[];
  recruiter_name?: string;
  status: InterviewStatus;
  feedback_status: 'Pending' | 'Completed';
  feedbacks: InterviewFeedback[];
  conflict_warning?: string;
}

export type OfferStatus =
  | 'Draft'
  | 'Internal Review'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Candidate Viewed'
  | 'Accepted'
  | 'Declined'
  | 'Expired';

export interface OfferVersion {
  version: number;
  created_at: string;
  created_by: string;
  reason: string;
  ctc: number;
  fixed_pay: number;
  variable_pay: number;
  joining_date: string;
}

export interface Offer {
  id: string; // OFF-701
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  application_id: string;
  job_id: string;
  job_title: string;
  designation_id?: string;
  designation_title: string;
  department_id?: string;
  department_name: string;
  company_id?: string;
  company_name?: string;
  reporting_manager_id?: string;
  reporting_manager_name?: string;
  location_name?: string;
  joining_date: string;
  offered_joining_date?: string;
  valid_until?: string;
  employment_type?: string;
  currency?: string;
  ctc: number; // Cost to Company annual
  offered_annual_ctc?: number;
  fixed_pay: number;
  variable_pay: number;
  joining_bonus?: number;
  ctc_breakdown?: {
    basic_salary?: number;
    hra?: number;
    special_allowance?: number;
    performance_bonus?: number;
    joining_bonus?: number;
    gratuity?: number;
    employer_pf?: number;
    total_ctc?: number;
    [key: string]: any;
  };
  benefits?: string[];
  notice_period_days?: number;
  probation_months?: number;
  working_hours?: string;
  offer_expiry_date?: string;
  status: OfferStatus;
  version: number;
  versions_history: OfferVersion[];
  approval_workflow: ApprovalStep[];
  created_at: string;
  updated_at: string;
}

export type OfferLetter = Offer;

export interface TalentPool {
  id: string;
  name: string;
  description: string;
  tags: string[];
  candidate_ids: string[];
  created_at: string;
}

export interface RecruitmentSource {
  id: string;
  name: string;
  category: 'Job Board' | 'Social Media' | 'Direct' | 'Referral' | 'Campus' | 'Agency';
  applications_count: number;
  shortlisted_count: number;
  hires_count: number;
  total_cost: number;
  cost_per_hire: number;
  conversion_rate: number;
}

export interface CampusDrive {
  id: string;
  college_name: string;
  placement_officer: string;
  email: string;
  phone: string;
  location: string;
  drive_date: string;
  jobs_offered: string[];
  students_registered: number;
  shortlisted_count: number;
  offers_made: number;
  offers_accepted: number;
  status: 'Upcoming' | 'In Progress' | 'Completed';
}

export interface EmployeeReferral {
  id: string;
  referrer_employee_id: string;
  referrer_employee_name: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  job_id: string;
  job_title: string;
  referred_date: string;
  status: 'Submitted' | 'Under Review' | 'Interviewing' | 'Hired' | 'Not Selected';
  reward_amount: number;
  payout_status: 'Pending' | 'Eligible' | 'Paid' | 'Ineligible';
}

export interface RecruitmentVendor {
  id: string;
  agency_name: string;
  contact_person: string;
  email: string;
  phone: string;
  agreement_end_date: string;
  fee_percentage: number;
  specialization: string;
  candidates_submitted: number;
  candidates_hired: number;
  total_payout: number;
  status: 'Active' | 'On Hold' | 'Terminated';
}

export interface RecruitmentSettingsState {
  candidate_number_prefix: string;
  requisition_number_prefix: string;
  job_number_prefix: string;
  application_number_prefix: string;
  auto_screen_min_score: number;
  require_hm_offer_approval: boolean;
  duplicate_check_strictness: 'Strict' | 'Moderate' | 'Warning Only';
  offer_expiry_days_default: number;
}
