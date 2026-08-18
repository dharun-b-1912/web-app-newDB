-- ============================================================================
-- Migration 033: WorkForceOS Recruitment & ATS 2.0 Enterprise Operating System
-- Normalized Database Schema for Requisitions, Approvals, Jobs, Publications,
-- Candidates, Applications, Stage History, Interviews, Scorecards, Offers,
-- Talent Pools, Preboarding, Employee Conversions, and Immutable Audit Logs
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Requisitions Master Table
CREATE TABLE IF NOT EXISTS requisitions (
  id TEXT PRIMARY KEY DEFAULT ('REQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  hiring_manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  recruiter_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  designation_title TEXT,
  job_level TEXT DEFAULT 'L4 - Mid Senior',
  employment_type TEXT DEFAULT 'Full Time',
  number_of_positions INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  requisition_type TEXT DEFAULT 'New Position' CHECK (requisition_type IN ('New Position', 'Replacement', 'Expansion', 'Backfill', 'Contract', 'Internship', 'Urgent Hiring')),
  replacement_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  reason_for_hiring TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  target_joining_date DATE,
  budget NUMERIC(14,2) DEFAULT 0,
  min_salary NUMERIC(14,2) DEFAULT 0,
  max_salary NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  education TEXT,
  job_description TEXT,
  responsibilities TEXT[] DEFAULT '{}',
  qualifications TEXT[] DEFAULT '{}',
  business_justification TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Pending Approval', 'Approved', 'Rejected', 'On Hold', 'Open', 'Closed', 'Cancelled')),
  rejection_reason TEXT,
  rejected_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisitions_org ON requisitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_dept ON requisitions(department_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_manager ON requisitions(hiring_manager_id);

-- 3. Requisition Multi-Tier Approvals Table
CREATE TABLE IF NOT EXISTS requisition_approvals (
  id TEXT PRIMARY KEY DEFAULT ('req-appr-' || gen_random_uuid()::TEXT),
  requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  approver_role TEXT NOT NULL,
  approver_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  approver_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Skipped')),
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_approvals_req ON requisition_approvals(requisition_id);

-- 4. Job Openings Table
CREATE TABLE IF NOT EXISTS job_openings (
  id TEXT PRIMARY KEY DEFAULT ('JOB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_id TEXT REFERENCES requisitions(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  hiring_manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  recruiter_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  job_code TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department_name TEXT,
  location_name TEXT,
  employment_type TEXT DEFAULT 'Full Time',
  work_mode TEXT DEFAULT 'Office' CHECK (work_mode IN ('Office', 'Hybrid', 'Remote', 'Field', 'Flexible')),
  number_of_openings INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  min_salary NUMERIC(14,2) DEFAULT 0,
  max_salary NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER DEFAULT 10,
  job_description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  education TEXT,
  application_deadline DATE,
  public_slug TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'Internal', 'External', 'On Hold', 'Archived', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_openings_org ON job_openings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_openings_req ON job_openings(requisition_id);

-- 5. Job Multi-Channel Publications Table
CREATE TABLE IF NOT EXISTS job_publications (
  id TEXT PRIMARY KEY DEFAULT ('pub-' || gen_random_uuid()::TEXT),
  job_id TEXT NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  destination TEXT NOT NULL CHECK (destination IN ('Career Portal', 'LinkedIn', 'Indeed', 'Naukri', 'Employee Referral', 'Recruitment Vendor', 'Direct Link')),
  status TEXT DEFAULT 'Not Published' CHECK (status IN ('Not Published', 'Publishing', 'Published', 'Paused', 'Expired', 'Failed', 'Removed')),
  external_job_id TEXT,
  published_url TEXT,
  sync_error TEXT,
  published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_publications_job ON job_publications(job_id);

-- 6. Candidates Master Table
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY DEFAULT ('cand-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  current_location TEXT,
  current_company TEXT,
  current_designation TEXT,
  total_experience_years NUMERIC(4,1) DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  education TEXT,
  resume_url TEXT,
  resume_parsed_data JSONB DEFAULT '{}'::JSONB,
  source_type TEXT DEFAULT 'Career Portal' CHECK (source_type IN ('Career Portal', 'Job Board', 'LinkedIn', 'Indeed', 'Naukri', 'Referral', 'Agency', 'Direct Sourcing', 'Campus', 'Internal')),
  source_provider TEXT,
  source_campaign TEXT,
  referral_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  match_score INTEGER DEFAULT 0,
  current_stage TEXT DEFAULT 'New' CHECK (current_stage IN ('New', 'Screening', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Background Verification', 'Preboarding', 'Hired', 'Rejected', 'Withdrawn')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Rejected', 'Withdrawn', 'Hired', 'Archived')),
  rejection_reason TEXT,
  talent_pool_id TEXT,
  converted_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_org ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates(current_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- 7. Candidate Applications Table
CREATE TABLE IF NOT EXISTS candidate_applications (
  id TEXT PRIMARY KEY DEFAULT ('app-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  requisition_id TEXT REFERENCES requisitions(id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'New' CHECK (stage IN ('New', 'Screening', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Offer', 'Background Verification', 'Preboarding', 'Hired', 'Rejected', 'Withdrawn')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  screening_score INTEGER,
  screening_notes TEXT,
  is_primary BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cand_apps_candidate ON candidate_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_apps_job ON candidate_applications(job_id);

-- 8. Candidate Stage History (Immutable State Machine Log)
CREATE TABLE IF NOT EXISTS candidate_stage_history (
  id TEXT PRIMARY KEY DEFAULT ('csh-' || gen_random_uuid()::TEXT),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES candidate_applications(id) ON DELETE SET NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  reason TEXT,
  duration_in_previous_stage_hours INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_cand ON candidate_stage_history(candidate_id);

-- 9. Candidate Notes (Internal Recruiter/Manager Notes)
CREATE TABLE IF NOT EXISTS candidate_notes (
  id TEXT PRIMARY KEY DEFAULT ('cnote-' || gen_random_uuid()::TEXT),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_id TEXT,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cand_notes_cand ON candidate_notes(candidate_id);

-- 10. Interviews Master Table
CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY DEFAULT ('intv-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  round_number INTEGER DEFAULT 1,
  round_name TEXT DEFAULT 'Technical Round 1',
  interview_type TEXT DEFAULT 'Video' CHECK (interview_type IN ('Video', 'Phone', 'In-Person', 'Assessment', 'Panel', 'HR Discussion', 'Leadership')),
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  meeting_link TEXT,
  location_room TEXT,
  status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled', 'No Show')),
  interviewer_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  interviewer_name TEXT,
  overall_feedback TEXT,
  overall_recommendation TEXT CHECK (overall_recommendation IN ('Strong Hire', 'Hire', 'Hold', 'No Hire')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_org ON interviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_interviews_cand ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);

-- 11. Interview Scorecards Table
CREATE TABLE IF NOT EXISTS interview_scorecards (
  id TEXT PRIMARY KEY DEFAULT ('sc-' || gen_random_uuid()::TEXT),
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  interviewer_name TEXT NOT NULL,
  technical_skills_score INTEGER DEFAULT 0 CHECK (technical_skills_score BETWEEN 0 AND 5),
  communication_score INTEGER DEFAULT 0 CHECK (communication_score BETWEEN 0 AND 5),
  problem_solving_score INTEGER DEFAULT 0 CHECK (problem_solving_score BETWEEN 0 AND 5),
  culture_fit_score INTEGER DEFAULT 0 CHECK (culture_fit_score BETWEEN 0 AND 5),
  leadership_score INTEGER DEFAULT 0 CHECK (leadership_score BETWEEN 0 AND 5),
  overall_score NUMERIC(3,1) DEFAULT 0,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('Strong Hire', 'Hire', 'Hold', 'No Hire')),
  strengths TEXT,
  areas_of_concern TEXT,
  feedback_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorecards_interview ON interview_scorecards(interview_id);

-- 12. Offers Master Table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY DEFAULT ('OFR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
  requisition_id TEXT REFERENCES requisitions(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  reporting_manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  joining_date DATE NOT NULL,
  ctc_annual NUMERIC(14,2) NOT NULL,
  base_salary NUMERIC(14,2) NOT NULL,
  variable_pay NUMERIC(14,2) DEFAULT 0,
  bonus NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  probation_months INTEGER DEFAULT 6,
  notice_period_days INTEGER DEFAULT 60,
  offer_expiry_date DATE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired', 'Revoked')),
  document_id TEXT,
  esign_provider TEXT DEFAULT 'WorkForceOS E-Sign',
  esign_envelope_id TEXT,
  esign_status TEXT DEFAULT 'Not Sent',
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_reason TEXT,
  background_check_status TEXT DEFAULT 'Pending' CHECK (background_check_status IN ('Pending', 'Initiated', 'In Progress', 'Passed', 'Flagged', 'Failed')),
  preboarding_status TEXT DEFAULT 'Pending' CHECK (preboarding_status IN ('Pending', 'In Progress', 'Completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_org ON offers(organization_id);
CREATE INDEX IF NOT EXISTS idx_offers_cand ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- 13. Talent Pools Table
CREATE TABLE IF NOT EXISTS talent_pools (
  id TEXT PRIMARY KEY DEFAULT ('pool-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General Talent',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  candidate_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talent_pools_org ON talent_pools(organization_id);

-- 14. Recruitment Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS recruitment_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('rec-audit-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_audit_org ON recruitment_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rec_audit_entity ON recruitment_audit_logs(entity_type, entity_id);
