export type CourseType =
  | 'Internal'
  | 'External'
  | 'Online'
  | 'Classroom'
  | 'Hybrid'
  | 'SelfPaced'
  | 'InstructorLed'
  | 'Workshop'
  | 'Webinar';

export type DeliveryMethod =
  | 'Online'
  | 'Offline'
  | 'Classroom'
  | 'VirtualClassroom'
  | 'Hybrid'
  | 'SelfPaced'
  | 'Workshop'
  | 'Webinar';

export type CourseStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Published'
  | 'Active'
  | 'Inactive'
  | 'Archived';

export type EnrollmentStatus =
  | 'Requested'
  | 'PendingApproval'
  | 'Enrolled'
  | 'NotStarted'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Dropped'
  | 'Expired'
  | 'Cancelled';

export type CertificationStatus =
  | 'Active'
  | 'ExpiringSoon'
  | 'Expired'
  | 'PendingVerification'
  | 'Revoked';

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  type: 'Video' | 'PDF' | 'Presentation' | 'Quiz' | 'Document';
  content_url?: string;
  duration_minutes: number;
  is_required: boolean;
  order: number;
  status: 'NotStarted' | 'InProgress' | 'Completed';
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  duration_hours: number;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string; // Technical, Leadership, POSH, Security, Compliance, HR, Sales, IT
  subcategory: string;
  skill_names: string[];
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  course_type: CourseType;
  delivery_method: DeliveryMethod;
  duration_hours: number;
  training_hours: number;
  language: string;
  trainer_id?: string;
  trainer_name?: string;
  provider_name?: string;
  prerequisites: string[];
  assessment_required: boolean;
  certification_available: boolean;
  validity_months: number;
  cost: number;
  max_participants: number;
  status: CourseStatus;
  is_mandatory: boolean;
  modules: CourseModule[];
  created_at: string;
}

export interface TrainingSession {
  id: string;
  program_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_link?: string;
  trainer_name: string;
  capacity: number;
  enrolled_count: number;
  status: 'Scheduled' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
}

export interface TrainingProgram {
  id: string;
  code: string;
  name: string;
  description: string;
  department_name: string;
  target_audience: string;
  program_type: 'Onboarding' | 'Leadership' | 'Technical' | 'Compliance' | 'Upskilling';
  duration_days: number;
  course_count: number;
  total_training_hours: number;
  capacity: number;
  cost: number;
  status: 'Draft' | 'Active' | 'Completed';
  sessions: TrainingSession[];
  created_at: string;
}

export interface Enrollment {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  course_id: string;
  course_name: string;
  program_id?: string;
  enrollment_date: string;
  start_date?: string;
  due_date: string;
  source: 'Self' | 'Manager' | 'HR' | 'Mandatory' | 'Performance' | 'Onboarding';
  status: EnrollmentStatus;
  progress_percent: number;
  completion_date?: string;
}

export interface Trainer {
  id: string;
  name: string;
  trainer_type: 'Internal' | 'External' | 'Vendor' | 'SubjectMatterExpert';
  organization_name?: string;
  specialization: string;
  skills: string[];
  email: string;
  phone: string;
  rating: number; // 1-5
  total_sessions: number;
  status: 'Active' | 'Inactive';
}

export interface QuestionBankItem {
  id: string;
  assessment_id: string;
  question_text: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_type: 'MultipleChoice' | 'TrueFalse' | 'ShortAnswer';
  options: string[];
  correct_answer: string;
  marks: number;
}

export interface Assessment {
  id: string;
  title: string;
  course_id: string;
  course_name: string;
  assessment_type: 'Quiz' | 'Exam' | 'Assignment' | 'FinalAssessment';
  duration_minutes: number;
  passing_score_percent: number;
  total_questions: number;
  attempts_allowed: number;
  status: 'Published' | 'Draft';
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  employee_id: string;
  employee_name: string;
  attempt_number: number;
  score_obtained: number;
  total_marks: number;
  percentage: number;
  status: 'Pass' | 'Fail';
  submitted_at: string;
}

export interface Certification {
  id: string;
  code: string;
  name: string;
  provider: string;
  category: string;
  validity_months: number;
  renewal_period_months: number;
  assessment_required: boolean;
  course_required: boolean;
  status: 'Active' | 'Draft';
}

export interface EmployeeCertification {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  certification_id: string;
  certification_name: string;
  provider: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  document_url?: string;
  status: CertificationStatus;
  verified_by_name?: string;
}

export interface MandatoryTrainingAssignment {
  id: string;
  course_id: string;
  course_name: string;
  target_group: string; // e.g. "All Employees", "Engineering"
  due_date: string;
  compliance_percent: number;
  total_assigned: number;
  completed_count: number;
  status: 'Compliant' | 'Pending' | 'Overdue';
}

export interface SkillItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  level: 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Expert';
  related_courses: string[];
}

export interface EmployeeSkillGap {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  skill_name: string;
  current_level: string;
  target_level: string;
  gap_level: string;
  recommended_course_name: string;
  status: 'Identified' | 'InTraining' | 'Resolved';
}

export interface LearningPath {
  id: string;
  path_title: string;
  description: string;
  target_role: string;
  required_skills: string[];
  ordered_course_names: string[];
  total_duration_hours: number;
  certification_issued: string;
}

export interface TrainingFeedback {
  id: string;
  course_id: string;
  course_name: string;
  employee_id: string;
  employee_name: string;
  trainer_rating: number;
  content_rating: number;
  relevance_rating: number;
  comments: string;
  submitted_at: string;
}
