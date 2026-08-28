import {
  TravelRequest,
  ExpenseClaim,
  POSHCase,
  POSHCommitteeMember,
  GrievanceRecord,
  DisciplinaryCase,
  SurveyRecord,
  RecognitionRecord,
  HelpdeskTicket,
  KnowledgeArticle,
  Announcement,
  CommunicationMessageLog,
} from '../types/otherModules';

const STORAGE_KEYS = {
  TRAVEL: 'workforce_ops_travel_v1',
  EXPENSES: 'workforce_ops_expenses_v1',
  POSH_CASES: 'workforce_ops_posh_cases_v1',
  POSH_MEMBERS: 'workforce_ops_posh_members_v1',
  GRIEVANCES: 'workforce_ops_grievances_v1',
  DISCIPLINE: 'workforce_ops_discipline_v1',
  SURVEYS: 'workforce_ops_surveys_v1',
  RECOGNITION: 'workforce_ops_recognition_v1',
  TICKETS: 'workforce_ops_tickets_v1',
  ARTICLES: 'workforce_ops_articles_v1',
  ANNOUNCEMENTS: 'workforce_ops_announcements_v1',
  COMM_LOGS: 'workforce_ops_comm_logs_v1',
};

// Seed Travel
const initialTravel: TravelRequest[] = [
  { id: 'trv-101', request_code: 'TRV-2026-081', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', manager_name: 'Anand Viswanathan', purpose: 'Google Cloud Next Summit & Client Technical Architecture Workshops', travel_type: 'International', origin: 'Chennai (MAA)', destination: 'San Francisco (SFO)', departure_date: '2026-09-01', return_date: '2026-09-10', estimated_cost: 285000, advance_requested: 50000, status: 'FinanceApproved', created_at: '2026-08-01T10:00:00Z' },
  { id: 'trv-102', request_code: 'TRV-2026-088', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', manager_name: 'Anand Viswanathan', purpose: 'Bengaluru Product Launch & Design Sprint Review', travel_type: 'Domestic', origin: 'Chennai (MAA)', destination: 'Bengaluru (BLR)', departure_date: '2026-08-20', return_date: '2026-08-22', estimated_cost: 32000, advance_requested: 10000, status: 'ManagerApproved', created_at: '2026-08-05T10:00:00Z' },
];

// Seed Expenses
const initialExpenses: ExpenseClaim[] = [
  { id: 'exp-101', claim_code: 'EXP-2026-101', travel_request_id: 'trv-102', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', expense_date: '2026-08-21', category: 'Hotel', description: 'The Leela Palace Bengaluru - 2 Nights Stay', amount: 24000, tax_amount: 4320, total_amount: 28320, receipt_attached: true, status: 'Approved', reimbursement_date: '2026-08-25' },
];

// Seed POSH (Confidential Domain)
const initialPOSHCases: POSHCase[] = [
  { id: 'posh-101', case_reference: 'POSH-2026-001', complainant_code: 'COMPLAINANT-PROTECTED-01', respondent_name: 'Suresh Raina', incident_date: '2026-07-15', complaint_category: 'HostileWorkEnvironment', status: 'Resolved', presiding_officer_name: 'Aditi Deshmukh (VP HR & POSH Chair)', investigation_deadline: '2026-08-15', created_at: '2026-07-18T10:00:00Z' },
];

const initialPOSHMembers: POSHCommitteeMember[] = [
  { id: 'pm-1', name: 'Aditi Deshmukh', role: 'PresidingOfficer', department_name: 'Human Resources', conflict_declared: false, status: 'Active' },
  { id: 'pm-2', name: 'Adv. S. Malini', role: 'ExternalMember', department_name: 'High Court Advocate', conflict_declared: false, status: 'Active' },
  { id: 'pm-3', name: 'Ananya Sen', role: 'InternalMember', department_name: 'Product & Design', conflict_declared: false, status: 'Active' },
];

// Seed Grievances & Discipline
const initialGrievances: GrievanceRecord[] = [
  { id: 'grv-101', grievance_code: 'GRV-2026-08', employee_id: 'emp-103', employee_name: 'Vikramaditya Rao', department_name: 'Engineering', category: 'WorkplaceEnvironment', subject: 'Air conditioning malfunction in Tidelfark Module 4', description: 'Temperature in office bays exceeding 28C affecting work productivity', filing_date: '2026-08-08', priority: 'Medium', assigned_hr_name: 'Sneha Mukherjee (HR Manager)', status: 'InInvestigation' },
  { id: 'grv-102', grievance_code: 'GRV-2026-02', employee_id: 'emp-104', employee_name: 'Priya Sharma', department_name: 'Product', category: 'ShiftRoster', subject: 'Shift roster allocation discrepancy for night shifts', description: 'Requesting shift balance correction as per policy guidelines', filing_date: '2026-08-02', priority: 'Low', assigned_hr_name: 'Sneha Mukherjee (HR Manager)', status: 'Resolved' },
];

// Seed Engagement
const initialSurveys: SurveyRecord[] = [
  { id: 'surv-101', title: 'Q3 2026 Enterprise Work-Life & Culture Pulse Survey', description: 'Confidential employee satisfaction, eNPS, and remote work policy feedback', target_audience: 'All Employees', start_date: '2026-08-01', end_date: '2026-08-31', is_anonymous: true, response_count: 403, total_targeted: 428, participation_rate: 94.2, enps_score: 68, status: 'Active' },
];

const initialRecognitions: RecognitionRecord[] = [
  { id: 'rec-101', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', given_by_name: 'Anand Viswanathan (HR Head)', recognition_type: 'StarPerformer', message: 'Outstanding leadership during multi-tenant Cloud Run migration! Exceptional technical dedication.', badge_name: 'Cloud Champion 2026', created_at: '2026-08-10T10:00:00Z' },
];

// Seed Helpdesk
const initialTickets: HelpdeskTicket[] = [
  { id: 'tkt-101', ticket_code: 'TKT-8819', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', category: 'Payroll', subject: 'Form 16 Part B Annexure Tax Proof Clarification', description: 'Requesting updated tax computation sheet for HRA exemption deduction', priority: 'High', channel: 'Portal', assigned_agent_name: 'Vikram Srinivasan (Payroll Manager)', sla_status: 'OnTrack', status: 'InProgress', created_at: '2026-08-11T09:30:00Z' },
  { id: 'tkt-102', ticket_code: 'TKT-8812', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', category: 'Leave', subject: 'Compensatory Off balance credit discrepancy', description: 'Weekend release deployment comp-off credit request', priority: 'Medium', channel: 'Portal', assigned_agent_name: 'Sneha Mukherjee (HR Manager)', sla_status: 'Resolved', status: 'Resolved', created_at: '2026-08-09T14:00:00Z' },
];

// Seed Announcements
const initialAnnouncements: Announcement[] = [
  { id: 'ann-101', title: 'Independence Day Holiday & Q3 Townhall Schedule', content: 'Enterprise office holiday on August 15th. All-Hands Q3 Townhall on August 18th at 4 PM IST.', target_audience: 'All Enterprise Employees', priority: 'High', published_date: '2026-08-10', expiry_date: '2026-08-20', author_name: 'Anand Viswanathan (HR Head)', acknowledgement_required: true, acknowledged_count: 395, total_recipients: 428, status: 'Published' },
];

// Helper storage functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error', err);
  }
}

export const otherModulesApi = {
  // 1. Travel & Expenses
  getTravelRequests(): TravelRequest[] {
    return getItem(STORAGE_KEYS.TRAVEL, initialTravel);
  },
  getExpenseClaims(): ExpenseClaim[] {
    return getItem(STORAGE_KEYS.EXPENSES, initialExpenses);
  },

  // 2. POSH (Confidential Access Rules)
  getPOSHCases(): POSHCase[] {
    return getItem(STORAGE_KEYS.POSH_CASES, initialPOSHCases);
  },
  getPOSHCommittee(): POSHCommitteeMember[] {
    return getItem(STORAGE_KEYS.POSH_MEMBERS, initialPOSHMembers);
  },

  // 3. Grievances & Discipline
  getGrievances(): GrievanceRecord[] {
    return getItem(STORAGE_KEYS.GRIEVANCES, initialGrievances);
  },
  getDisciplinaryCases(): DisciplinaryCase[] {
    return getItem(STORAGE_KEYS.DISCIPLINE, [
      { id: 'disc-101', case_code: 'DISC-2026-04', employee_id: 'emp-99', employee_name: 'Suresh Raina', department_name: 'Sales', violation_category: 'AttendanceAbsence', incident_date: '2026-07-28', action_recommended: 'ShowCauseNotice', status: 'UnderInvestigation' },
    ]);
  },

  // 4. Engagement
  getSurveys(): SurveyRecord[] {
    return getItem(STORAGE_KEYS.SURVEYS, initialSurveys);
  },
  getRecognitions(): RecognitionRecord[] {
    return getItem(STORAGE_KEYS.RECOGNITION, initialRecognitions);
  },

  // 5. Helpdesk & Knowledge Base
  getHelpdeskTickets(): HelpdeskTicket[] {
    return getItem(STORAGE_KEYS.TICKETS, initialTickets);
  },
  getKnowledgeArticles(): KnowledgeArticle[] {
    return getItem(STORAGE_KEYS.ARTICLES, [
      { id: 'kb-101', title: 'How to Download Form 16 Part A & B from Joy PeopleHR', category: 'Payroll & Tax', content: 'Step-by-step guide to generating verified digital Form 16 PDFs...', views_count: 340, helpful_count: 312, status: 'Published' },
      { id: 'kb-102', title: 'Applying for Leave Encashment & Policy Rules', category: 'Leave Management', content: 'Guidelines on eligible earned leave balance encashment...', views_count: 280, helpful_count: 265, status: 'Published' },
    ]);
  },

  // 6. Communication Hub
  getAnnouncements(): Announcement[] {
    return getItem(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
  },
  getCommunicationLogs(): CommunicationMessageLog[] {
    return getItem(STORAGE_KEYS.COMM_LOGS, [
      { id: 'log-101', message_code: 'MSG-88192', recipient_name: 'Rajesh Kumar', channel: 'InApp', subject: 'Travel Request TRV-2026-081 Approved by Finance', status: 'Delivered', timestamp: '2026-08-05 10:15 AM' },
      { id: 'log-102', message_code: 'MSG-88193', recipient_name: 'Ananya Sen', channel: 'Email', subject: 'Townhall Announcement & Holiday Notice', status: 'Sent', timestamp: '2026-08-10 09:00 AM' },
    ]);
  },
};
