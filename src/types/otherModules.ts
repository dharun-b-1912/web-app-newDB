// 1. Travel & Expense
export interface TravelRequest {
  id: string;
  request_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  manager_name: string;
  purpose: string;
  travel_type: 'Domestic' | 'International' | 'ClientVisit' | 'BusinessMeeting' | 'Conference' | 'Training';
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  estimated_cost: number;
  advance_requested: number;
  status: 'Draft' | 'Submitted' | 'ManagerApproved' | 'FinanceApproved' | 'Rejected' | 'Completed';
  created_at: string;
}

export interface ExpenseClaim {
  id: string;
  claim_code: string;
  travel_request_id?: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  expense_date: string;
  category: 'Airfare' | 'Hotel' | 'Meals' | 'Taxi' | 'Fuel' | 'Internet' | 'ClientEntertainment' | 'Other';
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  receipt_attached: boolean;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Reimbursed' | 'Rejected';
  reimbursement_date?: string;
}

// 2. POSH (Confidential Domain)
export interface POSHCase {
  id: string;
  case_reference: string;
  complainant_code: string; // Anonymous ID for protection
  respondent_name: string;
  incident_date: string;
  complaint_category: 'QuidProQuo' | 'HostileWorkEnvironment' | 'VerbalHarassment' | 'WrittenHarassment';
  status: 'Received' | 'UnderReview' | 'Investigation' | 'Hearing' | 'Resolved' | 'Closed';
  presiding_officer_name: string;
  investigation_deadline: string;
  created_at: string;
}

export interface POSHCommitteeMember {
  id: string;
  name: string;
  role: 'PresidingOfficer' | 'InternalMember' | 'ExternalMember' | 'Secretary';
  department_name: string;
  conflict_declared: boolean;
  status: 'Active' | 'Inactive';
}

// 3. Grievance & Discipline
export interface GrievanceRecord {
  id: string;
  grievance_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  category: 'WorkplaceEnvironment' | 'ManagerFeedback' | 'ShiftRoster' | 'PayrollConcern' | 'PolicyDiscrepancy';
  subject: string;
  description: string;
  filing_date: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_hr_name: string;
  status: 'Submitted' | 'Acknowledged' | 'UnderReview' | 'InInvestigation' | 'Resolved' | 'Closed';
}

export interface DisciplinaryCase {
  id: string;
  case_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  violation_category: 'AttendanceAbsence' | 'ConductMisbehavior' | 'PolicyViolation' | 'SecurityBreach';
  incident_date: string;
  action_recommended: 'Counselling' | 'WrittenWarning' | 'Suspension' | 'ShowCauseNotice';
  status: 'Open' | 'UnderInvestigation' | 'ActionTaken' | 'Closed';
}

// 4. Employee Engagement
export interface SurveyRecord {
  id: string;
  title: string;
  description: string;
  target_audience: string;
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  response_count: number;
  total_targeted: number;
  participation_rate: number; // %
  enps_score: number; // e.g. +68
  status: 'Active' | 'Draft' | 'Closed';
}

export interface RecognitionRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  given_by_name: string;
  recognition_type: 'PeerShoutout' | 'ManagerAward' | 'StarPerformer' | 'InnovationMilestone';
  message: string;
  badge_name: string;
  created_at: string;
}

// 5. HR Helpdesk
export interface HelpdeskTicket {
  id: string;
  ticket_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  category: 'Payroll' | 'Attendance' | 'Leave' | 'Benefits' | 'Documents' | 'IT_HR';
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  channel: 'Portal' | 'Email' | 'WhatsApp' | 'SMS';
  assigned_agent_name: string;
  sla_status: 'OnTrack' | 'AtRisk' | 'Breached' | 'Resolved';
  status: 'New' | 'Open' | 'InProgress' | 'WaitingOnEmployee' | 'Resolved' | 'Closed';
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  views_count: number;
  helpful_count: number;
  status: 'Published' | 'Draft';
}

// 6. Communication Hub
export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  priority: 'Normal' | 'High' | 'Urgent';
  published_date: string;
  expiry_date: string;
  author_name: string;
  acknowledgement_required: boolean;
  acknowledged_count: number;
  total_recipients: number;
  status: 'Published' | 'Draft' | 'Expired';
}

export interface CommunicationMessageLog {
  id: string;
  message_code: string;
  recipient_name: string;
  channel: 'InApp' | 'Email' | 'SMS' | 'WhatsApp';
  subject: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Failed';
  timestamp: string;
}
