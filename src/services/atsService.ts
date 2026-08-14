import {
  Requisition,
  JobOpening,
  Candidate,
  CandidateApplication,
  CandidateActivity,
  Interview,
  Offer,
  OfferStatus,
  TalentPool,
  RecruitmentSource,
  CampusDrive,
  EmployeeReferral,
  RecruitmentVendor,
  RecruitmentSettingsState,
  JobPublication,
  PublishingDestination,
} from '../types/ats';
import { api } from './api';
import { Employee } from '../types';

const KEYS = {
  REQUISITIONS: 'workforce_ats_requisitions',
  JOBS: 'workforce_ats_jobs',
  CANDIDATES: 'workforce_ats_candidates',
  APPLICATIONS: 'workforce_ats_applications',
  ACTIVITIES: 'workforce_ats_activities',
  INTERVIEWS: 'workforce_ats_interviews',
  OFFERS: 'workforce_ats_offers',
  TALENT_POOLS: 'workforce_ats_talent_pools',
  SOURCES: 'workforce_ats_sources',
  CAMPUS: 'workforce_ats_campus',
  REFERRALS: 'workforce_ats_referrals',
  VENDORS: 'workforce_ats_vendors',
  SETTINGS: 'workforce_ats_settings',
  AUDIT_LOGS: 'workforce_ats_audit_logs',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

// Initial Mock Seed Data
const initialRequisitions: Requisition[] = [
  {
    id: 'REQ-2026-101',
    company_id: 'comp-01',
    company_name: 'Acme Technologies Pvt Ltd',
    business_unit: 'Core Product Engineering',
    department_id: 'dept-eng',
    department_name: 'Engineering',
    location_id: 'loc-01',
    location_name: 'Coimbatore HQ - Tech Park',
    hiring_manager_id: 'emp-02',
    hiring_manager_name: 'Anand V.',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    job_title: 'Senior Staff Frontend Architect',
    designation_id: 'desig-staffeng',
    designation_title: 'Staff Frontend Architect',
    job_level: 'L6 - Principal',
    employment_type: 'Full Time',
    number_of_positions: 2,
    positions_filled: 1,
    requisition_type: 'Expansion',
    reason_for_hiring: 'Scaling NextGen SaaS portal UI layer and micro-frontends architecture.',
    priority: 'Urgent',
    expected_joining_date: '2026-09-15',
    budget: 3600000,
    min_salary: 2800000,
    max_salary: 3600000,
    currency: 'INR',
    required_skills: ['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'Micro-frontends'],
    preferred_skills: ['GraphQL', 'WebSockets', 'Design Systems', 'Module Federation'],
    education: 'B.E / B.Tech in Computer Science or equivalent',
    job_description: 'Architect and lead our frontend core team building enterprise HRMS capabilities.',
    responsibilities: [
      'Lead frontend architecture across WorkForceOS modules',
      'Optimize web app rendering performance and bundling',
      'Mentoring senior software engineering team',
    ],
    qualifications: ['7+ years experience in frontend engineering', 'Proven experience scaling React applications'],
    approval_workflow: [
      { role: 'Hiring Manager', approver_name: 'Anand V.', status: 'Approved', updated_at: '2026-08-01' },
      { role: 'Department Head', approver_name: 'Karthik N.', status: 'Approved', updated_at: '2026-08-02' },
      { role: 'HR Head', approver_name: 'Arun Kumar', status: 'Approved', updated_at: '2026-08-03' },
    ],
    status: 'Open',
    created_by_name: 'Anand V.',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-03T14:30:00Z',
  },
  {
    id: 'REQ-2026-102',
    company_id: 'comp-01',
    company_name: 'Acme Technologies Pvt Ltd',
    business_unit: 'People & Culture',
    department_id: 'dept-hr',
    department_name: 'People Operations',
    location_id: 'loc-01',
    location_name: 'Coimbatore HQ - Tech Park',
    hiring_manager_id: 'emp-03',
    hiring_manager_name: 'Deepa S.',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    job_title: 'Lead HR Business Partner',
    designation_id: 'desig-hrlead',
    designation_title: 'Lead HRBP',
    job_level: 'L5 - Lead',
    employment_type: 'Full Time',
    number_of_positions: 1,
    positions_filled: 0,
    requisition_type: 'Replacement',
    replacement_employee_name: 'Sonia Mehta',
    reason_for_hiring: 'Replacement for outgoing HRBP taking sabbatical.',
    priority: 'High',
    expected_joining_date: '2026-09-01',
    budget: 1800000,
    min_salary: 1400000,
    max_salary: 1800000,
    currency: 'INR',
    required_skills: ['Talent Strategy', 'Employee Relations', 'HR Analytics', 'POSH Compliance'],
    preferred_skills: ['Workday', 'WorkForceOS', 'Performance Coaching'],
    education: 'MBA in Human Resources Management',
    job_description: 'Partner with business leaders to align HR strategies with business goals.',
    responsibilities: ['Drive talent retention and performance management', 'Manage grievance desk and POSH compliance'],
    qualifications: ['5+ years HRBP experience in IT product company'],
    approval_workflow: [
      { role: 'Hiring Manager', approver_name: 'Deepa S.', status: 'Approved', updated_at: '2026-08-05' },
      { role: 'HR Head', approver_name: 'Arun Kumar', status: 'Approved', updated_at: '2026-08-06' },
    ],
    status: 'Open',
    created_by_name: 'Deepa S.',
    created_at: '2026-08-05T09:00:00Z',
    updated_at: '2026-08-06T11:00:00Z',
  },
  {
    id: 'REQ-2026-103',
    company_id: 'comp-01',
    company_name: 'Acme Technologies Pvt Ltd',
    business_unit: 'Cloud Infrastructure',
    department_id: 'dept-eng',
    department_name: 'Engineering',
    location_id: 'loc-01',
    location_name: 'Coimbatore HQ - Tech Park',
    hiring_manager_id: 'emp-02',
    hiring_manager_name: 'Anand V.',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    job_title: 'DevOps & Security Specialist',
    designation_id: 'desig-devops',
    designation_title: 'DevOps Lead',
    job_level: 'L5',
    employment_type: 'Full Time',
    number_of_positions: 2,
    positions_filled: 0,
    requisition_type: 'New Position',
    reason_for_hiring: 'Expansion of SOC2 and ISO 27001 compliance and Kubernetes automation.',
    priority: 'Medium',
    expected_joining_date: '2026-10-01',
    budget: 2400000,
    min_salary: 1800000,
    max_salary: 2400000,
    currency: 'INR',
    required_skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD Pipelines'],
    preferred_skills: ['SOC2 Audit', 'GCP', 'PostgreSQL Admin'],
    education: 'B.S in Computer Engineering / IT',
    job_description: 'Maintain 99.99% availability and SOC2 security posture across Cloud Run containers.',
    responsibilities: ['Automate CI/CD releases', 'Manage IAM and secret credentials'],
    qualifications: ['4+ years cloud infrastructure experience'],
    approval_workflow: [
      { role: 'Hiring Manager', approver_name: 'Anand V.', status: 'Pending' },
      { role: 'HR Head', approver_name: 'Arun Kumar', status: 'Pending' },
    ],
    status: 'Pending Approval',
    created_by_name: 'Anand V.',
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
];

const initialJobs: JobOpening[] = [
  {
    id: 'JOB-2026-01',
    requisition_id: 'REQ-2026-101',
    job_title: 'Senior Staff Frontend Architect',
    designation_id: 'desig-staffeng',
    department_id: 'dept-eng',
    company_id: 'comp-01',
    location_name: 'Coimbatore HQ - Hybrid',
    work_mode: 'Hybrid',
    employment_type: 'Full Time',
    job_level: 'L6',
    number_of_openings: 2,
    positions_filled: 1,
    hiring_manager_id: 'emp-02',
    hiring_manager_name: 'Anand V.',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    summary: 'We are seeking a visionary Frontend Architect to drive our enterprise web UI platform.',
    about_company: 'Acme Technologies is a leader in modern cloud HR workforce intelligence software.',
    responsibilities: [
      'Design modular high-performance React UI components',
      'Integrate with GraphQL & REST backend services',
      'Enforce strict accessibility, speed, and design system benchmarks',
    ],
    required_skills: ['React 18', 'TypeScript', 'Tailwind CSS', 'State Management'],
    preferred_skills: ['Framer Motion', 'WebSockets', 'Jest/Playwright'],
    education: "Bachelor's Degree in CS/IT",
    certifications: ['AWS Certified Cloud Practitioner'],
    experience_years: '6-10 years',
    benefits: ['Health Insurance for Family', 'Flexible Working Hours', 'Learning Allowance ₹50k/yr', 'Equity Grants'],
    working_hours: '9:30 AM - 6:30 PM (Mon-Fri)',
    min_salary: 2800000,
    max_salary: 3600000,
    currency: 'INR',
    application_instructions: 'Submit your updated resume with links to GitHub or live portfolio projects.',
    publications: [
      { destination: 'WorkForceOS Job Portal', status: 'Published', published_at: '2026-08-04' },
      { destination: 'External Job Boards', status: 'Published', external_job_id: 'LNKD-88219', published_at: '2026-08-04' },
      { destination: 'Employee Referral', status: 'Published', published_at: '2026-08-04' },
      { destination: 'College Portal', status: 'Not Published' },
      { destination: 'Recruitment Vendor', status: 'Published', published_at: '2026-08-05' },
    ],
    status: 'Open',
    created_at: '2026-08-04T10:00:00Z',
    updated_at: '2026-08-04T10:00:00Z',
  },
  {
    id: 'JOB-2026-02',
    requisition_id: 'REQ-2026-102',
    job_title: 'Lead HR Business Partner',
    designation_id: 'desig-hrlead',
    department_id: 'dept-hr',
    company_id: 'comp-01',
    location_name: 'Coimbatore HQ - Onsite',
    work_mode: 'Office',
    employment_type: 'Full Time',
    job_level: 'L5',
    number_of_openings: 1,
    positions_filled: 0,
    hiring_manager_id: 'emp-03',
    hiring_manager_name: 'Deepa S.',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    summary: 'Lead business partnering for Engineering and Sales business units.',
    about_company: 'Acme Technologies is a fast-growing SaaS organization with over 500 team members.',
    responsibilities: ['Employee engagement surveys', 'Performance management cycles', 'Grievance resolution'],
    required_skills: ['HR Operations', 'Employee Engagement', 'Labor Laws', 'Conflict Resolution'],
    preferred_skills: ['WorkForceOS experience', 'SHRM / SPHR Certification'],
    education: 'MBA HR',
    certifications: ['SHRM-CP'],
    experience_years: '5-8 years',
    benefits: ['Comprehensive Medical Cover', 'Commute Subsidy', 'Annual Wellness Stipend'],
    working_hours: '9:00 AM - 6:00 PM',
    min_salary: 1400000,
    max_salary: 1800000,
    currency: 'INR',
    application_instructions: 'Apply via WorkForceOS portal or employee referral.',
    publications: [
      { destination: 'WorkForceOS Job Portal', status: 'Published', published_at: '2026-08-07' },
      { destination: 'Employee Referral', status: 'Published', published_at: '2026-08-07' },
      { destination: 'External Job Boards', status: 'Not Published' },
    ],
    status: 'Open',
    created_at: '2026-08-07T09:00:00Z',
    updated_at: '2026-08-07T09:00:00Z',
  },
];

const initialCandidates: Candidate[] = [
  {
    id: 'CND-801',
    candidate_number: 'CAN-2026-0801',
    first_name: 'Priya',
    last_name: 'Sundaram',
    full_name: 'Priya Sundaram',
    email: 'priya.sundaram@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    current_company: 'InnoTech Solutions',
    current_title: 'Lead Frontend Developer',
    total_experience_years: 8,
    relevant_experience_years: 6,
    expected_salary: 3200000,
    current_salary: 2400000,
    currency: 'INR',
    notice_period_days: 30,
    preferred_location: 'Coimbatore / Remote',
    work_mode_preference: 'Hybrid',
    skills: ['React 18', 'TypeScript', 'Tailwind CSS', 'Redux Toolkit', 'Vite', 'GraphQL'],
    education: 'B.Tech in Information Technology - Anna University (2018)',
    certifications: ['AWS Certified Developer Associate'],
    languages: ['English', 'Tamil', 'Hindi'],
    resume_url: '/documents/priya_sundaram_resume.pdf',
    resume_name: 'Priya_Sundaram_Architect_Resume_2026.pdf',
    portfolio_url: 'https://priyasundaram.dev',
    linkedin_url: 'https://linkedin.com/in/priyasundaram-dev',
    github_url: 'https://github.com/priyasundaram',
    source: 'LinkedIn',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    owner_name: 'Dharun Joy',
    status: 'Interview',
    tags: ['High Potential', 'Immediate Joiner', 'Top 5% Candidate'],
    rating: 4.8,
    created_at: '2026-08-05T11:20:00Z',
    last_activity: 'Interview Scheduled - Technical Round 2 (Today, 2:30 PM)',
  },
  {
    id: 'CND-802',
    candidate_number: 'CAN-2026-0802',
    first_name: 'Vikram',
    last_name: 'Sethi',
    full_name: 'Vikram Sethi',
    email: 'vikram.sethi@example.com',
    phone: '+91 98123 45678',
    location: 'Chennai, India',
    current_company: 'Apex Global HR',
    current_title: 'Senior HR Manager',
    total_experience_years: 6,
    relevant_experience_years: 5,
    expected_salary: 1700000,
    current_salary: 1350000,
    currency: 'INR',
    notice_period_days: 45,
    preferred_location: 'Coimbatore',
    work_mode_preference: 'Office',
    skills: ['HR Strategy', 'Employee Relations', 'POSH', 'Performance Management'],
    education: 'MBA in HR Management - Loyola Institute (2020)',
    certifications: ['SHRM-CP Certified'],
    languages: ['English', 'Tamil'],
    resume_url: '/documents/vikram_sethi_resume.pdf',
    resume_name: 'Vikram_Sethi_HRBP.pdf',
    linkedin_url: 'https://linkedin.com/in/vikram-sethi-hr',
    source: 'Employee Referral',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    owner_name: 'Deepa S.',
    status: 'Selected',
    tags: ['Referred by Deepa', 'Culture Fit'],
    rating: 4.5,
    created_at: '2026-08-08T09:15:00Z',
    last_activity: 'Selected after Final HR Round - Offer Generation In Progress',
  },
  {
    id: 'CND-803',
    candidate_number: 'CAN-2026-0803',
    first_name: 'Arjun',
    last_name: 'Ranganathan',
    full_name: 'Arjun Ranganathan',
    email: 'arjun.rang@example.com',
    phone: '+91 97890 12345',
    location: 'Coimbatore, India',
    current_company: 'CloudScale Tech',
    current_title: 'Senior Staff Architect',
    total_experience_years: 9,
    relevant_experience_years: 8,
    expected_salary: 3500000,
    current_salary: 2700000,
    currency: 'INR',
    notice_period_days: 15,
    preferred_location: 'Coimbatore HQ',
    work_mode_preference: 'Hybrid',
    skills: ['React 18', 'TypeScript', 'Node.js', 'Microservices', 'System Design'],
    education: 'M.S in Computer Science - PSG College of Tech',
    certifications: ['AWS Solutions Architect Professional'],
    languages: ['English', 'Tamil'],
    resume_url: '/documents/arjun_r_resume.pdf',
    resume_name: 'Arjun_Ranganathan_Resume.pdf',
    linkedin_url: 'https://linkedin.com/in/arjun-rang-tech',
    github_url: 'https://github.com/arjunrang',
    source: 'Career Page',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    owner_name: 'Anand V.',
    status: 'Offer Accepted',
    tags: ['Silver Medalist', 'Top Tech Performer'],
    rating: 4.9,
    created_at: '2026-08-02T14:10:00Z',
    last_activity: 'Offer Accepted! Scheduled DOJ: 1 Sep 2026',
  },
  {
    id: 'CND-804',
    candidate_number: 'CAN-2026-0804',
    first_name: 'Meera',
    last_name: 'Krishnan',
    full_name: 'Meera Krishnan',
    email: 'meera.k@example.com',
    phone: '+91 94432 10987',
    location: 'Kochi, India',
    current_company: 'Zeta Software',
    current_title: 'Frontend Developer',
    total_experience_years: 4,
    relevant_experience_years: 3,
    expected_salary: 1800000,
    current_salary: 1200000,
    currency: 'INR',
    notice_period_days: 60,
    preferred_location: 'Coimbatore',
    work_mode_preference: 'Hybrid',
    skills: ['React', 'JavaScript', 'CSS3', 'REST APIs'],
    education: 'B.E CSE',
    certifications: [],
    languages: ['English', 'Malayalam', 'Tamil'],
    resume_url: '/documents/meera_resume.pdf',
    resume_name: 'Meera_Krishnan_CV.pdf',
    source: 'Recruitment Agency',
    recruiter_id: 'emp-01',
    recruiter_name: 'Dharun Joy',
    owner_name: 'Dharun Joy',
    status: 'Screening',
    tags: ['Agency Candidate'],
    rating: 4.2,
    created_at: '2026-08-11T16:00:00Z',
    last_activity: 'Resume Screening Match Score: 84%',
  },
];

const initialApplications: CandidateApplication[] = [
  {
    id: 'APP-2026-401',
    candidate_id: 'CND-801',
    candidate_name: 'Priya Sundaram',
    candidate_email: 'priya.sundaram@example.com',
    candidate_phone: '+91 98765 43210',
    job_id: 'JOB-2026-01',
    job_title: 'Senior Staff Frontend Architect',
    requisition_id: 'REQ-2026-101',
    department_name: 'Engineering',
    company_name: 'Acme Technologies Pvt Ltd',
    source: 'LinkedIn',
    applied_date: '2026-08-05',
    current_stage: 'Interview',
    status: 'Active',
    recruiter_name: 'Dharun Joy',
    hiring_manager_name: 'Anand V.',
    rating: 4.8,
    screening_score: 94,
    screening_details: {
      skill_match: 95,
      experience_match: 90,
      education_match: 100,
      location_match: 90,
      overall: 94,
      matched_skills: ['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'GraphQL'],
      missing_skills: ['Module Federation'],
    },
    interview_score: 4.8,
    notes_count: 3,
  },
  {
    id: 'APP-2026-402',
    candidate_id: 'CND-802',
    candidate_name: 'Vikram Sethi',
    candidate_email: 'vikram.sethi@example.com',
    candidate_phone: '+91 98123 45678',
    job_id: 'JOB-2026-02',
    job_title: 'Lead HR Business Partner',
    requisition_id: 'REQ-2026-102',
    department_name: 'People Operations',
    company_name: 'Acme Technologies Pvt Ltd',
    source: 'Employee Referral',
    applied_date: '2026-08-08',
    current_stage: 'Selected',
    status: 'Active',
    recruiter_name: 'Dharun Joy',
    hiring_manager_name: 'Deepa S.',
    rating: 4.5,
    screening_score: 88,
    screening_details: {
      skill_match: 90,
      experience_match: 85,
      education_match: 90,
      location_match: 85,
      overall: 88,
      matched_skills: ['HR Strategy', 'Employee Relations', 'POSH', 'Performance Management'],
      missing_skills: ['Workday'],
    },
    interview_score: 4.5,
    notes_count: 2,
  },
  {
    id: 'APP-2026-403',
    candidate_id: 'CND-803',
    candidate_name: 'Arjun Ranganathan',
    candidate_email: 'arjun.rang@example.com',
    candidate_phone: '+91 97890 12345',
    job_id: 'JOB-2026-01',
    job_title: 'Senior Staff Frontend Architect',
    requisition_id: 'REQ-2026-101',
    department_name: 'Engineering',
    company_name: 'Acme Technologies Pvt Ltd',
    source: 'Career Page',
    applied_date: '2026-08-02',
    current_stage: 'Offer Accepted',
    status: 'Hired',
    recruiter_name: 'Dharun Joy',
    hiring_manager_name: 'Anand V.',
    rating: 4.9,
    screening_score: 98,
    screening_details: {
      skill_match: 100,
      experience_match: 95,
      education_match: 100,
      location_match: 95,
      overall: 98,
      matched_skills: ['React 18', 'TypeScript', 'Node.js', 'System Design'],
      missing_skills: [],
    },
    interview_score: 4.9,
    offer_id: 'OFF-2026-701',
    notes_count: 5,
  },
  {
    id: 'APP-2026-404',
    candidate_id: 'CND-804',
    candidate_name: 'Meera Krishnan',
    candidate_email: 'meera.k@example.com',
    candidate_phone: '+91 94432 10987',
    job_id: 'JOB-2026-01',
    job_title: 'Senior Staff Frontend Architect',
    requisition_id: 'REQ-2026-101',
    department_name: 'Engineering',
    company_name: 'Acme Technologies Pvt Ltd',
    source: 'Recruitment Agency',
    applied_date: '2026-08-11',
    current_stage: 'Screening',
    status: 'Active',
    recruiter_name: 'Dharun Joy',
    hiring_manager_name: 'Anand V.',
    rating: 4.2,
    screening_score: 82,
    screening_details: {
      skill_match: 80,
      experience_match: 80,
      education_match: 85,
      location_match: 85,
      overall: 82,
      matched_skills: ['React', 'JavaScript', 'REST APIs'],
      missing_skills: ['TypeScript', 'Vite', 'Micro-frontends'],
    },
    notes_count: 1,
  },
];

const initialInterviews: Interview[] = [
  {
    id: 'INT-2026-501',
    candidate_id: 'CND-801',
    candidate_name: 'Priya Sundaram',
    application_id: 'APP-2026-401',
    job_id: 'JOB-2026-01',
    job_title: 'Senior Staff Frontend Architect',
    round_name: 'Technical Round 2 - Live System Coding',
    interview_type: 'Technical Round',
    date: new Date().toISOString().split('T')[0], // Today
    start_time: '14:30',
    end_time: '15:30',
    timezone: 'Asia/Kolkata (IST)',
    interview_mode: 'Video',
    meeting_link: 'https://meet.google.com/xyz-workforce-tech',
    location: 'Google Meet Virtual Room #3',
    panel: [
      { user_id: 'usr-02', name: 'Anand V.', role: 'Hiring Manager / Tech Lead', email: 'anand.v@acme.com', is_required: true, status: 'Confirmed' },
      { user_id: 'usr-05', name: 'Karthik N.', role: 'Senior Principal Engineer', email: 'karthik.n@acme.com', is_required: true, status: 'Confirmed' },
    ],
    recruiter_name: 'Dharun Joy',
    status: 'Scheduled',
    feedback_status: 'Pending',
    feedbacks: [],
  },
  {
    id: 'INT-2026-502',
    candidate_id: 'CND-802',
    candidate_name: 'Vikram Sethi',
    application_id: 'APP-2026-402',
    job_id: 'JOB-2026-02',
    job_title: 'Lead HR Business Partner',
    round_name: 'Final Leadership & Culture Fit Round',
    interview_type: 'HR Round',
    date: '2026-08-10',
    start_time: '11:00',
    end_time: '12:00',
    timezone: 'Asia/Kolkata (IST)',
    interview_mode: 'In Person',
    location: 'Coimbatore HQ - Executive Conference Room B',
    panel: [
      { user_id: 'usr-03', name: 'Deepa S.', role: 'Head of People Operations', email: 'deepa.s@acme.com', is_required: true, status: 'Confirmed' },
      { user_id: 'usr-01', name: 'Arun Kumar', role: 'HR Head / Super Admin', email: 'arun.kumar@acme.com', is_required: true, status: 'Confirmed' },
    ],
    recruiter_name: 'Dharun Joy',
    status: 'Completed',
    feedback_status: 'Completed',
    feedbacks: [
      {
        interviewer_id: 'usr-03',
        interviewer_name: 'Deepa S.',
        technical_knowledge: 4,
        communication: 5,
        problem_solving: 4,
        culture_fit: 5,
        leadership: 4,
        role_specific_skills: 5,
        overall_rating: 4.5,
        recommendation: 'Hire',
        strengths: 'Excellent grasp of conflict management and empathy in POSH cases.',
        weaknesses: 'Needs short familiarization with WorkForceOS software stack.',
        comments: 'Strong candidate, aligns great with our core leadership principles.',
        submitted_at: '2026-08-10T12:30:00Z',
      },
    ],
  },
];

const initialOffers: Offer[] = [
  {
    id: 'OFF-2026-701',
    candidate_id: 'CND-803',
    candidate_name: 'Arjun Ranganathan',
    candidate_email: 'arjun.rang@example.com',
    application_id: 'APP-2026-403',
    job_id: 'JOB-2026-01',
    job_title: 'Senior Staff Frontend Architect',
    designation_id: 'desig-staffeng',
    designation_title: 'Senior Staff Frontend Architect',
    department_id: 'dept-eng',
    department_name: 'Engineering',
    company_id: 'comp-01',
    company_name: 'Acme Technologies Pvt Ltd',
    reporting_manager_id: 'emp-02',
    reporting_manager_name: 'Anand V.',
    location_name: 'Coimbatore HQ - Tech Park',
    joining_date: '2026-09-01',
    offered_joining_date: '2026-09-01',
    employment_type: 'Full Time',
    currency: 'INR',
    ctc: 3400000,
    offered_annual_ctc: 3400000,
    fixed_pay: 2800000,
    variable_pay: 600000,
    joining_bonus: 100000,
    ctc_breakdown: {
      basic_salary: 1700000,
      hra: 680000,
      special_allowance: 420000,
      performance_bonus: 600000,
      joining_bonus: 100000,
      gratuity: 80000,
      employer_pf: 120000,
      total_ctc: 3400000,
    },
    benefits: [
      'Comprehensive Group Health Insurance (₹10 Lakhs)',
      'Provident Fund & Gratuity',
      'Annual Technology Subsidy ₹60,000',
      'Flexible Work from Home Policy',
    ],
    notice_period_days: 15,
    probation_months: 3,
    working_hours: '9:30 AM to 6:30 PM (Mon-Fri)',
    offer_expiry_date: '2026-08-25',
    status: 'Accepted',
    version: 1,
    versions_history: [
      {
        version: 1,
        created_at: '2026-08-06T10:00:00Z',
        created_by: 'Dharun Joy',
        reason: 'Initial Released Offer Letter',
        ctc: 3400000,
        fixed_pay: 2800000,
        variable_pay: 600000,
        joining_date: '2026-09-01',
      },
    ],
    approval_workflow: [
      { role: 'Recruiter', approver_name: 'Dharun Joy', status: 'Approved', updated_at: '2026-08-06' },
      { role: 'HR Head', approver_name: 'Arun Kumar', status: 'Approved', updated_at: '2026-08-06' },
    ],
    created_at: '2026-08-06T10:00:00Z',
    updated_at: '2026-08-07T15:00:00Z',
  },
];

const initialTalentPools: TalentPool[] = [
  {
    id: 'POOL-01',
    name: 'Silver Medalists - Frontend Architects',
    description: 'High-performing interviewed candidate backups for next hiring wave.',
    tags: ['Frontend', 'React', 'Architect', 'Silver Medalist'],
    candidate_ids: ['CND-801'],
    created_at: '2026-08-01',
  },
  {
    id: 'POOL-02',
    name: 'Future HRBP & People Ops Leads',
    description: 'Vetted candidates for prospective HR business partnering expansion.',
    tags: ['HRBP', 'PeopleOps', 'SHRM'],
    candidate_ids: ['CND-802'],
    created_at: '2026-08-02',
  },
];

const initialSources: RecruitmentSource[] = [
  { id: 'SRC-01', name: 'LinkedIn Jobs', category: 'Social Media', applications_count: 142, shortlisted_count: 28, hires_count: 6, total_cost: 120000, cost_per_hire: 20000, conversion_rate: 4.2 },
  { id: 'SRC-02', name: 'Employee Referrals', category: 'Referral', applications_count: 48, shortlisted_count: 18, hires_count: 5, total_cost: 75000, cost_per_hire: 15000, conversion_rate: 10.4 },
  { id: 'SRC-03', name: 'WorkForceOS Career Portal', category: 'Direct', applications_count: 210, shortlisted_count: 32, hires_count: 8, total_cost: 0, cost_per_hire: 0, conversion_rate: 3.8 },
  { id: 'SRC-04', name: 'Campus Placement Drives', category: 'Campus', applications_count: 350, shortlisted_count: 45, hires_count: 12, total_cost: 180000, cost_per_hire: 15000, conversion_rate: 3.4 },
];

const initialCampusDrives: CampusDrive[] = [
  {
    id: 'CAMP-01',
    college_name: 'PSG College of Technology, Coimbatore',
    placement_officer: 'Dr. R. Sundararajan',
    email: 'placement@psgtech.ac.in',
    phone: '+91 422 2572177',
    location: 'Coimbatore, TN',
    drive_date: '2026-09-20',
    jobs_offered: ['Graduate Software Engineer', 'Cloud Operations Trainee'],
    students_registered: 180,
    shortlisted_count: 35,
    offers_made: 12,
    offers_accepted: 10,
    status: 'Upcoming',
  },
  {
    id: 'CAMP-02',
    college_name: 'Coimbatore Institute of Technology (CIT)',
    placement_officer: 'Prof. M. Kanthaswamy',
    email: 'placements@cit.edu.in',
    phone: '+91 422 2574071',
    location: 'Coimbatore, TN',
    drive_date: '2026-10-05',
    jobs_offered: ['Associate UI/UX Engineer', 'QA Automation Analyst'],
    students_registered: 120,
    shortlisted_count: 20,
    offers_made: 6,
    offers_accepted: 5,
    status: 'Upcoming',
  },
];

const initialReferrals: EmployeeReferral[] = [
  {
    id: 'REF-01',
    referrer_employee_id: 'emp-03',
    referrer_employee_name: 'Deepa S. (Head of HR)',
    candidate_name: 'Vikram Sethi',
    candidate_email: 'vikram.sethi@example.com',
    candidate_phone: '+91 98123 45678',
    job_id: 'JOB-2026-02',
    job_title: 'Lead HR Business Partner',
    referred_date: '2026-08-08',
    status: 'Hired',
    reward_amount: 30000,
    payout_status: 'Eligible',
  },
];

const initialVendors: RecruitmentVendor[] = [
  {
    id: 'VEN-01',
    agency_name: 'TalentPro Executive Search Pvt Ltd',
    contact_person: 'Suresh Menon',
    email: 'suresh@talentpro.co.in',
    phone: '+91 98400 11223',
    agreement_end_date: '2027-03-31',
    fee_percentage: 8.5,
    specialization: 'Executive & Staff Engineering Roles',
    candidates_submitted: 14,
    candidates_hired: 2,
    total_payout: 480000,
    status: 'Active',
  },
];

const initialSettings: RecruitmentSettingsState = {
  candidate_number_prefix: 'CAN-2026-',
  requisition_number_prefix: 'REQ-2026-',
  job_number_prefix: 'JOB-2026-',
  application_number_prefix: 'APP-2026-',
  auto_screen_min_score: 80,
  require_hm_offer_approval: true,
  duplicate_check_strictness: 'Strict',
  offer_expiry_days_default: 14,
};

export const atsService = {
  // --- REQUISITIONS ---
  getRequisitions(): Requisition[] {
    return getStorage(KEYS.REQUISITIONS, initialRequisitions);
  },
  getRequisitionById(id: string): Requisition | undefined {
    return this.getRequisitions().find(r => r.id === id);
  },
  createRequisition(data: Omit<Requisition, 'id' | 'status' | 'created_at' | 'updated_at' | 'positions_filled'>): Requisition {
    const list = this.getRequisitions();
    const count = list.length + 101;
    const newReq: Requisition = {
      ...data,
      id: `REQ-2026-${count}`,
      positions_filled: 0,
      status: 'Submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setStorage(KEYS.REQUISITIONS, [newReq, ...list]);
    this.addAuditLog('Requisition Created', `Requisition ${newReq.id} (${newReq.job_title}) submitted for approval`);
    return newReq;
  },
  updateRequisitionStatus(id: string, status: Requisition['status']): Requisition {
    const list = this.getRequisitions();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Requisition not found');
    list[idx].status = status;
    list[idx].updated_at = new Date().toISOString();
    setStorage(KEYS.REQUISITIONS, list);
    this.addAuditLog('Requisition Status Updated', `Requisition ${id} status changed to ${status}`);
    return list[idx];
  },
  approveRequisitionStep(id: string, roleName: string, approverName: string): Requisition {
    const list = this.getRequisitions();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Requisition not found');
    const req = list[idx];
    let allApproved = true;

    req.approval_workflow = req.approval_workflow.map(step => {
      if (step.role === roleName || step.approver_name === approverName) {
        return { ...step, status: 'Approved', updated_at: new Date().toISOString() };
      }
      if (step.status !== 'Approved') allApproved = false;
      return step;
    });

    if (allApproved) {
      req.status = 'Approved';
    }
    req.updated_at = new Date().toISOString();
    setStorage(KEYS.REQUISITIONS, list);
    this.addAuditLog('Requisition Approved', `Requisition ${id} step approved by ${approverName}`);
    return req;
  },

  // --- JOBS ---
  getJobs(): JobOpening[] {
    return getStorage(KEYS.JOBS, initialJobs);
  },
  getJobById(id: string): JobOpening | undefined {
    return this.getJobs().find(j => j.id === id);
  },
  createJobFromRequisition(reqId: string, overrides?: Partial<JobOpening>): JobOpening {
    const req = this.getRequisitionById(reqId);
    if (!req) throw new Error('Requisition not found');
    const jobs = this.getJobs();
    const count = jobs.length + 1;
    const newJob: JobOpening = {
      id: `JOB-2026-0${count}`,
      requisition_id: req.id,
      job_title: req.job_title,
      designation_id: req.designation_id,
      department_id: req.department_id,
      company_id: req.company_id,
      location_name: req.location_name,
      work_mode: 'Hybrid',
      employment_type: req.employment_type,
      job_level: req.job_level,
      number_of_openings: req.number_of_positions,
      positions_filled: 0,
      hiring_manager_id: req.hiring_manager_id,
      hiring_manager_name: req.hiring_manager_name,
      recruiter_id: req.recruiter_id,
      recruiter_name: req.recruiter_name,
      summary: req.job_description,
      about_company: 'Acme Technologies Pvt Ltd',
      responsibilities: req.responsibilities,
      required_skills: req.required_skills,
      preferred_skills: req.preferred_skills,
      education: req.education,
      certifications: [],
      experience_years: '3-6 years',
      benefits: ['Health Cover', 'WFH Allowance', 'Learning Stipend'],
      working_hours: '9:30 AM to 6:30 PM',
      min_salary: req.min_salary,
      max_salary: req.max_salary,
      currency: req.currency,
      application_instructions: 'Apply online with resume and profile link.',
      publications: [
        { destination: 'WorkForceOS Job Portal', status: 'Published', published_at: new Date().toISOString() },
        { destination: 'Employee Referral', status: 'Published', published_at: new Date().toISOString() },
        { destination: 'College Portal', status: 'Not Published' },
        { destination: 'External Job Boards', status: 'Not Published' },
        { destination: 'Recruitment Vendor', status: 'Not Published' },
      ],
      status: 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };

    setStorage(KEYS.JOBS, [newJob, ...jobs]);
    this.addAuditLog('Job Opening Created', `Created Job Opening ${newJob.id} (${newJob.job_title}) from Requisition ${req.id}`);
    return newJob;
  },
  publishJobToDestination(jobId: string, destination: PublishingDestination, status: JobPublication['status']): JobOpening {
    const jobs = this.getJobs();
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx === -1) throw new Error('Job not found');

    const pubIdx = jobs[idx].publications.findIndex(p => p.destination === destination);
    if (pubIdx >= 0) {
      jobs[idx].publications[pubIdx] = {
        destination,
        status,
        published_at: status === 'Published' ? new Date().toISOString() : jobs[idx].publications[pubIdx].published_at,
        external_job_id: status === 'Published' ? `EXT-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      };
    } else {
      jobs[idx].publications.push({
        destination,
        status,
        published_at: status === 'Published' ? new Date().toISOString() : undefined,
        external_job_id: status === 'Published' ? `EXT-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      });
    }

    jobs[idx].updated_at = new Date().toISOString();
    setStorage(KEYS.JOBS, jobs);
    this.addAuditLog('Job Published', `Job ${jobId} published to channel: ${destination}`);
    return jobs[idx];
  },

  // --- CANDIDATES ---
  getCandidates(): Candidate[] {
    return getStorage(KEYS.CANDIDATES, initialCandidates);
  },
  getCandidateById(id: string): Candidate | undefined {
    return this.getCandidates().find(c => c.id === id);
  },
  createCandidate(input: Partial<Candidate>): Candidate {
    const list = this.getCandidates();
    const num = list.length + 805;
    const newCand: Candidate = {
      id: `CND-${num}`,
      candidate_number: `CAN-2026-0${num}`,
      first_name: input.first_name || 'New',
      last_name: input.last_name || 'Candidate',
      full_name: `${input.first_name || 'New'} ${input.last_name || 'Candidate'}`,
      email: input.email || `candidate.${num}@example.com`,
      phone: input.phone || '+91 90000 00000',
      location: input.location || 'Coimbatore, TN',
      current_company: input.current_company || 'Tech Systems',
      current_title: input.current_title || 'Software Developer',
      total_experience_years: input.total_experience_years || 4,
      relevant_experience_years: input.relevant_experience_years || 3,
      expected_salary: input.expected_salary || 2000000,
      currency: input.currency || 'INR',
      notice_period_days: input.notice_period_days || 30,
      skills: input.skills || ['React', 'TypeScript'],
      education: input.education || 'B.E Computer Science',
      certifications: input.certifications || [],
      languages: input.languages || ['English', 'Tamil'],
      resume_url: input.resume_url || '/documents/sample_resume.pdf',
      resume_name: input.resume_name || 'Candidate_Resume.pdf',
      source: input.source || 'Career Page',
      status: 'New',
      tags: input.tags || ['Inbound'],
      rating: input.rating || 4.0,
      created_at: new Date().toISOString(),
      last_activity: 'Candidate Profile Registered in ATS',
    };

    setStorage(KEYS.CANDIDATES, [newCand, ...list]);
    this.addAuditLog('Candidate Registered', `Candidate ${newCand.full_name} (${newCand.id}) added to database`);
    return newCand;
  },
  updateCandidate(id: string, updates: Partial<Candidate>): Candidate {
    const list = this.getCandidates();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Candidate not found');
    list[idx] = {
      ...list[idx],
      ...updates,
      full_name: updates.first_name || updates.last_name ? `${updates.first_name || list[idx].first_name} ${updates.last_name || list[idx].last_name}` : list[idx].full_name,
    };
    setStorage(KEYS.CANDIDATES, list);
    return list[idx];
  },

  // --- APPLICATIONS ---
  getApplications(): CandidateApplication[] {
    return getStorage(KEYS.APPLICATIONS, initialApplications);
  },
  getApplicationsByCandidate(candidateId: string): CandidateApplication[] {
    return this.getApplications().filter(a => a.candidate_id === candidateId);
  },
  createApplication(candidateId: string, jobId: string): CandidateApplication {
    const candidates = this.getCandidates();
    const jobs = this.getJobs();
    const candidate = candidates.find(c => c.id === candidateId);
    const job = jobs.find(j => j.id === jobId);
    if (!candidate || !job) throw new Error('Candidate or Job not found');

    const apps = this.getApplications();
    const num = apps.length + 405;

    // Calculate match score
    const reqSkills = job.required_skills;
    const candSkills = candidate.skills;
    const matched = candSkills.filter(s => reqSkills.some(rs => rs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(rs.toLowerCase())));
    const missing = reqSkills.filter(rs => !candSkills.some(s => s.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(s.toLowerCase())));
    const matchPct = reqSkills.length > 0 ? Math.round((matched.length / reqSkills.length) * 100) : 85;

    const newApp: CandidateApplication = {
      id: `APP-2026-${num}`,
      candidate_id: candidate.id,
      candidate_name: candidate.full_name,
      candidate_email: candidate.email,
      candidate_phone: candidate.phone,
      job_id: job.id,
      job_title: job.job_title,
      requisition_id: job.requisition_id,
      department_name: 'Engineering',
      company_name: 'Acme Technologies Pvt Ltd',
      source: candidate.source,
      applied_date: new Date().toISOString().split('T')[0],
      current_stage: 'Screening',
      status: 'Active',
      recruiter_name: job.recruiter_name,
      hiring_manager_name: job.hiring_manager_name,
      rating: candidate.rating,
      screening_score: Math.max(matchPct, 75),
      screening_details: {
        skill_match: Math.max(matchPct, 75),
        experience_match: 85,
        education_match: 90,
        location_match: 90,
        overall: Math.max(matchPct, 75),
        matched_skills: matched.length > 0 ? matched : candSkills,
        missing_skills: missing,
      },
    };

    setStorage(KEYS.APPLICATIONS, [newApp, ...apps]);
    this.addAuditLog('Application Submitted', `Candidate ${candidate.full_name} applied for Job ${job.job_title}`);
    return newApp;
  },
  updateApplicationStage(applicationId: string, stage: Candidate['status'], reason?: string): CandidateApplication {
    const apps = this.getApplications();
    const idx = apps.findIndex(a => a.id === applicationId);
    if (idx === -1) throw new Error('Application not found');

    // Business Pipeline Validation
    const app = apps[idx];
    if (stage === 'Offer' && app.rating < 3.5) {
      throw new Error('Pipeline Validation Error: Cannot release offer without positive interview evaluation score >= 3.5.');
    }
    if (stage === 'Joined' && app.current_stage !== 'Offer Accepted') {
      throw new Error('Pipeline Validation Error: Candidate must accept the offer before joining and onboarding.');
    }

    app.current_stage = stage;
    if (stage === 'Rejected') {
      app.status = 'Rejected';
      app.rejection_reason = reason || 'Not matching requirements at current round';
    } else if (stage === 'Joined') {
      app.status = 'Hired';
    }

    setStorage(KEYS.APPLICATIONS, apps);

    // Also sync Candidate status
    this.updateCandidate(app.candidate_id, {
      status: stage,
      last_activity: `Moved to ${stage} stage on ${new Date().toLocaleDateString()}`,
    });

    this.addAuditLog('Stage Moved', `Application ${applicationId} moved to stage: ${stage}`);
    return app;
  },

  // --- INTERVIEWS ---
  getInterviews(): Interview[] {
    return getStorage(KEYS.INTERVIEWS, initialInterviews);
  },
  checkInterviewConflict(date: string, startTime: string, endTime: string, panelIds: string[]): string | null {
    const list = this.getInterviews();
    const conflict = list.find(i => {
      if (i.date === date && i.status === 'Scheduled') {
        const panelOverlap = i.panel.some(p => panelIds.includes(p.user_id));
        if (panelOverlap && i.start_time === startTime) {
          return true;
        }
      }
      return false;
    });

    if (conflict) {
      return `Conflict Warning: Interviewer is already booked for another interview (${conflict.candidate_name} - ${conflict.job_title}) at ${startTime}.`;
    }
    return null;
  },
  scheduleInterview(data: Omit<Interview, 'id' | 'status' | 'feedback_status' | 'feedbacks'>): Interview {
    const list = this.getInterviews();
    const num = list.length + 503;

    // Check conflict
    const panelIds = data.panel.map(p => p.user_id);
    const conflict = this.checkInterviewConflict(data.date, data.start_time, data.end_time, panelIds);

    const newInterview: Interview = {
      ...data,
      id: `INT-2026-${num}`,
      status: 'Scheduled',
      feedback_status: 'Pending',
      feedbacks: [],
      conflict_warning: conflict || undefined,
    };

    setStorage(KEYS.INTERVIEWS, [newInterview, ...list]);

    // Update Application stage if in screening
    try {
      this.updateApplicationStage(data.application_id, 'Interview');
    } catch {
      // ignore
    }

    this.addAuditLog('Interview Scheduled', `Scheduled ${data.round_name} for ${data.candidate_name} on ${data.date} at ${data.start_time}`);
    return newInterview;
  },
  submitInterviewFeedback(interviewId: string, feedback: Interview['feedbacks'][0]): Interview {
    const list = this.getInterviews();
    const idx = list.findIndex(i => i.id === interviewId);
    if (idx === -1) throw new Error('Interview not found');

    const intv = list[idx];
    intv.feedbacks.push(feedback);
    intv.feedback_status = 'Completed';
    intv.status = 'Completed';

    setStorage(KEYS.INTERVIEWS, list);

    // Update candidate score
    const avgScore = feedback.overall_rating;
    this.updateCandidate(intv.candidate_id, {
      rating: avgScore,
      status: feedback.recommendation === 'Strong Hire' || feedback.recommendation === 'Hire' ? 'Selected' : 'Interview',
      last_activity: `Interview Feedback Submitted: ${feedback.recommendation} (${feedback.overall_rating}/5.0)`,
    });

    this.addAuditLog('Interview Feedback Submitted', `Feedback submitted for ${intv.candidate_name} by ${feedback.interviewer_name}: ${feedback.recommendation}`);
    return intv;
  },

  // --- OFFERS ---
  getOffers(): Offer[] {
    return getStorage(KEYS.OFFERS, initialOffers);
  },
  createOffer(data: Partial<Offer> & { candidate_name: string; ctc?: number; offered_annual_ctc?: number; joining_date?: string; offered_joining_date?: string }): Offer {
    const list = this.getOffers();
    const num = list.length + 702;
    const ctcValue = data.offered_annual_ctc || data.ctc || 2400000;
    const joiningDateValue = data.offered_joining_date || data.joining_date || '2026-10-01';
    
    const newOffer: Offer = {
      id: `OFF-2026-${num}`,
      candidate_id: data.candidate_id || 'CND-901',
      candidate_name: data.candidate_name,
      candidate_email: data.candidate_email || 'cand@example.com',
      application_id: data.application_id || 'APP-401',
      job_id: data.job_id || 'JOB-2026-101',
      job_title: data.job_title || 'Software Engineer',
      designation_title: data.designation_title || data.job_title || 'Senior Software Engineer',
      department_name: data.department_name || 'Engineering',
      joining_date: joiningDateValue,
      offered_joining_date: joiningDateValue,
      ctc: ctcValue,
      offered_annual_ctc: ctcValue,
      fixed_pay: data.fixed_pay || ctcValue * 0.8,
      variable_pay: data.variable_pay || ctcValue * 0.2,
      joining_bonus: data.joining_bonus || 200000,
      ctc_breakdown: data.ctc_breakdown || {
        basic_salary: ctcValue * 0.5,
        hra: ctcValue * 0.2,
        special_allowance: ctcValue * 0.2,
        joining_bonus: 200000,
        total_ctc: ctcValue,
      },
      status: 'Pending Approval',
      version: 1,
      versions_history: [
        {
          version: 1,
          created_at: new Date().toISOString(),
          created_by: 'Dharun Joy',
          reason: 'Initial Offer Draft',
          ctc: ctcValue,
          fixed_pay: data.fixed_pay || ctcValue * 0.8,
          variable_pay: data.variable_pay || ctcValue * 0.2,
          joining_date: joiningDateValue,
        },
      ],
      approval_workflow: data.approval_workflow || [
        { role: 'Hiring Manager', approver_name: 'Anand V.', status: 'Pending' },
        { role: 'HR Head', approver_name: 'Dharun Joy', status: 'Pending' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStorage(KEYS.OFFERS, [newOffer, ...list]);
    this.addAuditLog('Offer Created', `Offer letter generated for ${data.candidate_name} (CTC: ₹${(ctcValue / 100000).toFixed(2)} Lakhs)`);
    return newOffer;
  },
  updateOfferStatus(offerId: string, status: OfferStatus): Offer {
    const list = this.getOffers();
    const idx = list.findIndex(o => o.id === offerId);
    if (idx === -1) throw new Error('Offer not found');
    list[idx].status = status;
    list[idx].updated_at = new Date().toISOString();
    setStorage(KEYS.OFFERS, list);
    this.addAuditLog('Offer Status Updated', `Offer ${offerId} status changed to ${status}`);
    return list[idx];
  },
  approveOfferStep(offerId: string, roleName: string, approverName: string): Offer {
    const list = this.getOffers();
    const idx = list.findIndex(o => o.id === offerId);
    if (idx === -1) throw new Error('Offer not found');
    const off = list[idx];
    let allApproved = true;

    off.approval_workflow = off.approval_workflow.map(step => {
      if (step.role === roleName || step.approver_name === approverName) {
        return { ...step, status: 'Approved', updated_at: new Date().toISOString() };
      }
      if (step.status !== 'Approved') allApproved = false;
      return step;
    });

    if (allApproved) {
      off.status = 'Approved';
    }
    off.updated_at = new Date().toISOString();
    setStorage(KEYS.OFFERS, list);
    this.addAuditLog('Offer Approved', `Offer ${offerId} approved by ${approverName}`);
    return off;
  },
  respondToOffer(offerId: string, response: 'Accepted' | 'Declined'): Offer {
    const list = this.getOffers();
    const idx = list.findIndex(o => o.id === offerId);
    if (idx === -1) throw new Error('Offer not found');

    const off = list[idx];
    off.status = response;
    off.updated_at = new Date().toISOString();
    setStorage(KEYS.OFFERS, list);

    const nextStage = response === 'Accepted' ? 'Offer Accepted' : 'Withdrawn';
    this.updateApplicationStage(off.application_id, nextStage);

    this.addAuditLog('Offer Response', `Candidate ${off.candidate_name} ${response.toLowerCase()} offer ${offerId}`);
    return off;
  },

  // --- CANDIDATE TO EMPLOYEE CONVERSION ENGINE ---
  async convertCandidateToEmployee(candidateId: string, offerId: string): Promise<{ employee: Employee; onboardingId: string }> {
    const candidate = this.getCandidateById(candidateId);
    const offer = this.getOffers().find(o => o.id === offerId);
    if (!candidate || !offer) throw new Error('Candidate or Offer record missing.');

    // 1. DUPLICATE PROTECTION CHECK
    const existingEmployees = await api.getEmployees();
    const duplicateMatch = existingEmployees.find(
      e =>
        e.work_email.toLowerCase() === candidate.email.toLowerCase() ||
        (e.profile?.phone && candidate.phone && e.profile.phone.replace(/\D/g, '') === candidate.phone.replace(/\D/g, ''))
    );

    if (duplicateMatch) {
      throw new Error(`DUPLICATE EMPLOYEE WARNING: An employee record (${duplicateMatch.first_name} ${duplicateMatch.last_name} - ${duplicateMatch.employee_code}) with email/phone ${candidate.email} already exists in WorkForceOS.`);
    }

    // 2. CREATE CANONICAL EMPLOYEE RECORD
    const newEmp = await api.createEmployee({
      company_id: offer.company_id || 'comp-01',
      company_name: offer.company_name,
      department_id: offer.department_id || 'dept-eng',
      department_name: offer.department_name,
      designation_id: offer.designation_id || 'desig-staffeng',
      designation_title: offer.designation_title,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      work_email: candidate.email,
      avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      status: 'Active',
      employment_type: offer.employment_type === 'Full Time' ? 'Full Time' : 'Contract',
      profile: {
        personal_email: candidate.email,
        phone: candidate.phone,
        address: candidate.location,
      },
      employment: {
        doj: offer.joining_date,
        reporting_manager_name: offer.reporting_manager_name,
        ctc: offer.ctc,
        work_location: offer.location_name,
      },
    });

    // 3. INITIATE ONBOARDING WORKFLOW HANDOFF
    const onboardingId = `ONB-${Date.now().toString(36)}`;
    const onboardingInstances = getStorage<any[]>('workforce_onboarding_instances', []);
    const newOnboarding = {
      id: onboardingId,
      employee_id: newEmp.id,
      employee_name: `${newEmp.first_name} ${newEmp.last_name}`,
      department: newEmp.department_name,
      designation: newEmp.designation_title,
      doj: offer.joining_date,
      status: 'Initiated',
      source: 'Recruitment ATS Conversion',
      completed_steps: 1,
      total_steps: 6,
      created_at: new Date().toISOString(),
    };
    setStorage('workforce_onboarding_instances', [newOnboarding, ...onboardingInstances]);

    // 4. UPDATE CANDIDATE & APPLICATION LIFECYCLE
    this.updateCandidate(candidateId, {
      status: 'Joined',
      last_activity: `Converted to Employee (${newEmp.employee_code}). Onboarding initiated.`,
    });
    this.updateApplicationStage(offer.application_id, 'Joined');

    // 5. UPDATE REQUISITION POSITIONS FILLED
    const jobs = this.getJobs();
    const job = jobs.find(j => j.id === offer.job_id);
    if (job) {
      job.positions_filled += 1;
      setStorage(KEYS.JOBS, jobs);
      const reqs = this.getRequisitions();
      const req = reqs.find(r => r.id === job.requisition_id);
      if (req) {
        req.positions_filled += 1;
        if (req.positions_filled >= req.number_of_positions) {
          req.status = 'Closed';
        }
        setStorage(KEYS.REQUISITIONS, reqs);
      }
    }

    this.addAuditLog('Candidate Converted to Employee', `Candidate ${candidate.full_name} converted to Employee ${newEmp.employee_code}. Onboarding instance ${onboardingId} started.`);

    return { employee: newEmp, onboardingId };
  },

  // --- TALENT POOLS ---
  getTalentPools(): TalentPool[] {
    return getStorage(KEYS.TALENT_POOLS, initialTalentPools);
  },
  createTalentPool(name: string, description: string, tags: string[]): TalentPool {
    const list = this.getTalentPools();
    const newPool: TalentPool = {
      id: `POOL-${list.length + 1}`,
      name,
      description,
      tags,
      candidate_ids: [],
      created_at: new Date().toISOString().split('T')[0],
    };
    setStorage(KEYS.TALENT_POOLS, [newPool, ...list]);
    return newPool;
  },

  // --- SOURCES & CAMPUS & REFERRALS & VENDORS ---
  getSources(): RecruitmentSource[] {
    return getStorage(KEYS.SOURCES, initialSources);
  },
  getCampusDrives(): CampusDrive[] {
    return getStorage(KEYS.CAMPUS, initialCampusDrives);
  },
  getReferrals(): EmployeeReferral[] {
    return getStorage(KEYS.REFERRALS, initialReferrals);
  },
  getVendors(): RecruitmentVendor[] {
    return getStorage(KEYS.VENDORS, initialVendors);
  },

  // --- SETTINGS & AUDIT LOGS ---
  getSettings(): RecruitmentSettingsState {
    return getStorage(KEYS.SETTINGS, initialSettings);
  },
  updateSettings(updates: Partial<RecruitmentSettingsState>): RecruitmentSettingsState {
    const curr = this.getSettings();
    const next = { ...curr, ...updates };
    setStorage(KEYS.SETTINGS, next);
    return next;
  },
  getAuditLogs(): { id: string; action: string; details: string; timestamp: string }[] {
    return getStorage(KEYS.AUDIT_LOGS, [
      { id: 'log-1', action: 'System Initialized', details: 'WorkForceOS ATS Engine Ready', timestamp: 'Just now' },
    ]);
  },
  addAuditLog(action: string, details: string): void {
    const logs = this.getAuditLogs();
    const newEntry = {
      id: `log-${Date.now()}`,
      action,
      details,
      timestamp: new Date().toLocaleTimeString() + ', ' + new Date().toLocaleDateString(),
    };
    setStorage(KEYS.AUDIT_LOGS, [newEntry, ...logs.slice(0, 99)]);
  },
};
