export type GoalType =
  | 'Individual'
  | 'Team'
  | 'Department'
  | 'Company'
  | 'Strategic'
  | 'Project'
  | 'Development'
  | 'Operational';

export type GoalStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'NotStarted'
  | 'InProgress'
  | 'OnTrack'
  | 'AtRisk'
  | 'OffTrack'
  | 'Completed'
  | 'Overdue'
  | 'Cancelled';

export type MeasurementUnit =
  | 'Percentage'
  | 'Numeric'
  | 'Currency'
  | 'Quantity'
  | 'Milestone'
  | 'Binary';

export type ReviewCycleStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Open'
  | 'SelfReview'
  | 'ManagerReview'
  | 'Feedback360'
  | 'Calibration'
  | 'Finalization'
  | 'Completed'
  | 'Cancelled';

export type PipStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Active'
  | 'OnTrack'
  | 'AtRisk'
  | 'Extended'
  | 'SuccessfullyCompleted'
  | 'Unsuccessful'
  | 'Closed'
  | 'Cancelled';

export interface GoalMilestone {
  id: string;
  title: string;
  due_date: string;
  weight: number;
  progress: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  owner_name: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  team_name: string;
  manager_id: string;
  manager_name: string;
  goal_type: GoalType;
  parent_goal_id?: string;
  parent_goal_title?: string;
  start_date: string;
  due_date: string;
  priority: 'High' | 'Medium' | 'Low';
  weight: number; // e.g., 30 (%)
  progress: number; // 0-100 (%)
  status: GoalStatus;
  target_value: number;
  current_value: number;
  unit: MeasurementUnit;
  milestones: GoalMilestone[];
  notes?: string;
  created_at: string;
}

export interface OKR_KeyResult {
  id: string;
  objective_id: string;
  title: string;
  owner_name: string;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string;
  due_date: string;
  progress: number;
  weight: number;
  status: 'OnTrack' | 'AtRisk' | 'OffTrack' | 'Completed';
}

export interface OKR_Objective {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  owner_name: string;
  department_name: string;
  scope: 'Company' | 'Department' | 'Team' | 'Individual';
  parent_objective_id?: string;
  period: string; // e.g. "Q3 2026"
  weight: number;
  progress: number;
  status: 'OnTrack' | 'AtRisk' | 'OffTrack' | 'Completed';
  confidence_score: 'Low' | 'Medium' | 'High';
  key_results: OKR_KeyResult[];
  created_at: string;
}

export interface KPI {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  department_name: string;
  role_name: string;
  measurement_type: MeasurementUnit;
  min_target: number;
  expected_target: number;
  stretch_target: number;
  actual_achievement: number;
  weight: number;
  frequency: 'Monthly' | 'Quarterly' | 'Annual';
  status: 'Active' | 'Draft';
}

export interface KRA {
  id: string;
  code: string;
  name: string;
  description: string;
  role_name: string;
  department_name: string;
  weight: number;
  mapped_kpi_names: string[];
}

export interface ReviewCycle {
  id: string;
  name: string;
  cycle_type: 'Annual' | 'Quarterly' | 'HalfYearly' | 'Probation' | 'Promotion';
  period: string; // "Q3 2026"
  start_date: string;
  end_date: string;
  self_review_deadline: string;
  manager_review_deadline: string;
  calibration_date: string;
  status: ReviewCycleStatus;
  template_name: string;
  eligible_employees_count: number;
  completed_count: number;
  created_at: string;
}

export interface SelfReview {
  id: string;
  cycle_id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  strengths: string;
  achievements: string;
  challenges: string;
  development_areas: string;
  self_rating: number; // 1.0 to 5.0
  status: 'Draft' | 'Submitted';
  submitted_at?: string;
}

export interface ManagerReview {
  id: string;
  cycle_id: string;
  employee_id: string;
  employee_name: string;
  manager_id: string;
  manager_name: string;
  department_name: string;
  goal_score: number;
  kpi_score: number;
  kra_score: number;
  manager_rating: number; // 1.0 to 5.0
  manager_comments: string;
  promotion_recommended: boolean;
  pip_recommended: boolean;
  status: 'Draft' | 'Submitted';
  submitted_at?: string;
}

export interface Feedback360 {
  id: string;
  cycle_id: string;
  employee_id: string;
  employee_name: string;
  reviewer_id: string;
  reviewer_name: string;
  relationship: 'Manager' | 'Peer' | 'DirectReport' | 'CrossFunctional';
  competency_score: number;
  comments: string;
  is_anonymous: boolean;
  status: 'Pending' | 'Submitted';
}

export interface PerformanceRating {
  id: string;
  cycle_id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  manager_name: string;
  calculated_score: number;
  proposed_rating: number;
  final_rating: number;
  rating_label: 'Exceptional' | 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory';
  grid_9box_position: string; // e.g. "Star Performer (HiPo)"
  calibrated_by_name: string;
  is_finalized: boolean;
}

export interface DevelopmentPlan {
  id: string;
  employee_id: string;
  employee_name: string;
  skill_gap: string;
  development_goal: string;
  action_type: 'Training' | 'Mentorship' | 'Project' | 'Certification';
  target_date: string;
  progress: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
}

export interface PromotionRecommendation {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  current_designation: string;
  proposed_designation: string;
  current_grade: string;
  proposed_grade: string;
  performance_rating: number;
  reason: string;
  effective_date: string;
  recommended_by_name: string;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'CoreHR_Updated';
}

export interface PIPPlan {
  id: string;
  pip_code: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  manager_id: string;
  manager_name: string;
  start_date: string;
  end_date: string;
  performance_issues: string;
  expected_improvements: string;
  review_frequency: 'Weekly' | 'Biweekly';
  checkins_completed: number;
  status: PipStatus;
  outcome?: string;
  created_at: string;
}

export interface CheckinRecord {
  id: string;
  entity_type: 'Goal' | 'OKR' | 'PIP';
  entity_id: string;
  note: string;
  progress_update: number;
  author_name: string;
  created_at: string;
}
