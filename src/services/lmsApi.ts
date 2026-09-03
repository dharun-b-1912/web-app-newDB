import {
  Course,
  TrainingProgram,
  TrainingSession,
  Enrollment,
  Trainer,
  Assessment,
  QuestionBankItem,
  AssessmentAttempt,
  Certification,
  EmployeeCertification,
  MandatoryTrainingAssignment,
  SkillItem,
  EmployeeSkillGap,
  LearningPath,
  TrainingFeedback,
} from '../types/lms';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { getActiveOrgId } from './attendance/biometricCommandService';

let _coursesCache: { data: Course[]; timestamp: number } | null = null;
let _coursesInFlight: Promise<Course[]> | null = null;
let _enrollmentsCache: { data: Enrollment[]; timestamp: number } | null = null;
let _enrollmentsInFlight: Promise<Enrollment[]> | null = null;

const STORAGE_KEYS = {
  COURSES: 'workforce_lms_courses_v1',
  PROGRAMS: 'workforce_lms_programs_v1',
  SESSIONS: 'workforce_lms_sessions_v1',
  ENROLLMENTS: 'workforce_lms_enrollments_v1',
  TRAINERS: 'workforce_lms_trainers_v1',
  ASSESSMENTS: 'workforce_lms_assessments_v1',
  QUESTIONS: 'workforce_lms_questions_v1',
  ATTEMPTS: 'workforce_lms_attempts_v1',
  CERTIFICATIONS: 'workforce_lms_certifications_v1',
  EMP_CERTS: 'workforce_lms_emp_certs_v1',
  MANDATORY: 'workforce_lms_mandatory_v1',
  SKILLS: 'workforce_lms_skills_v1',
  SKILL_GAPS: 'workforce_lms_skill_gaps_v1',
  PATHS: 'workforce_lms_paths_v1',
  FEEDBACK: 'workforce_lms_feedback_v1',
};

// Seed Courses
const initialCourses: Course[] = [
  {
    id: 'course-101',
    code: 'CRS-POSH-2026',
    name: 'POSH & Prevention of Sexual Harassment Policy 2026',
    description: 'Mandatory annual workplace conduct and compliance certification for all enterprise employees.',
    category: 'POSH',
    subcategory: 'Compliance',
    skill_names: ['Workplace Ethics', 'POSH Compliance'],
    difficulty_level: 'Beginner',
    course_type: 'Online',
    delivery_method: 'SelfPaced',
    duration_hours: 2,
    training_hours: 2,
    language: 'English',
    trainer_name: 'Aditi Deshmukh (POSH Chair)',
    prerequisites: [],
    assessment_required: true,
    certification_available: true,
    validity_months: 12,
    cost: 0,
    max_participants: 1000,
    status: 'Published',
    is_mandatory: true,
    modules: [
      {
        id: 'mod-1',
        course_id: 'course-101',
        title: 'Module 1: POSH Act Overview & Committee Guidelines',
        description: 'Understanding legal frameworks and reporting channels',
        order: 1,
        duration_hours: 1,
        lessons: [
          { id: 'les-1', module_id: 'mod-1', title: 'Lesson 1: Introduction to POSH Act 2013', description: 'Legal definitions and scope', type: 'Video', duration_minutes: 20, is_required: true, order: 1, status: 'Completed' },
          { id: 'les-2', module_id: 'mod-1', title: 'Lesson 2: Internal Committee Complaint Procedures', description: 'Step-by-step grievance resolution', type: 'PDF', duration_minutes: 25, is_required: true, order: 2, status: 'InProgress' },
        ],
      },
    ],
    created_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'course-102',
    code: 'CRS-SEC-2026',
    name: 'Information Security & Data Protection / GDPR Masterclass',
    description: 'Cybersecurity hygiene, phishing awareness, and data privacy compliance for remote and office staff.',
    category: 'Security',
    subcategory: 'IT Security',
    skill_names: ['Cybersecurity', 'GDPR Privacy'],
    difficulty_level: 'Intermediate',
    course_type: 'Online',
    delivery_method: 'SelfPaced',
    duration_hours: 4,
    training_hours: 4,
    language: 'English',
    trainer_name: 'Vikramaditya Rao (DevOps Lead)',
    prerequisites: [],
    assessment_required: true,
    certification_available: true,
    validity_months: 12,
    cost: 0,
    max_participants: 500,
    status: 'Published',
    is_mandatory: true,
    modules: [],
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'course-103',
    code: 'CRS-ARCH-2026',
    name: 'Microservices Architecture on Cloud Run & GCP Kubernetes',
    description: 'Advanced cloud-native microservices architecture, Docker hardening, and zero-downtime deployment pipelines.',
    category: 'Technical',
    subcategory: 'Cloud Engineering',
    skill_names: ['Google Cloud Platform', 'Kubernetes', 'Docker'],
    difficulty_level: 'Advanced',
    course_type: 'InstructorLed',
    delivery_method: 'VirtualClassroom',
    duration_hours: 16,
    training_hours: 16,
    language: 'English',
    trainer_name: 'Rajesh Kumar (Staff Architect)',
    prerequisites: ['Basic Docker & GCP'],
    assessment_required: true,
    certification_available: true,
    validity_months: 24,
    cost: 15000,
    max_participants: 50,
    status: 'Published',
    is_mandatory: false,
    modules: [],
    created_at: '2026-03-15T10:00:00Z',
  },
];

// Seed Training Programs
const initialPrograms: TrainingProgram[] = [
  {
    id: 'prog-101',
    code: 'PROG-ONB-2026',
    name: 'New Employee Enterprise Onboarding Track',
    description: 'Comprehensive 5-day orientation, security compliance, HR policies, and role setup.',
    department_name: 'All Departments',
    target_audience: 'New Hires',
    program_type: 'Onboarding',
    duration_days: 5,
    course_count: 4,
    total_training_hours: 20,
    capacity: 100,
    cost: 0,
    status: 'Active',
    sessions: [
      { id: 'sess-1', program_id: 'prog-101', title: 'Day 1: Welcome & Company Values Orientation', date: '2026-08-18', start_time: '10:00 AM', end_time: '01:00 PM', location: 'Virtual Auditorium & Conference Hall A', trainer_name: 'Sneha Mukherjee (HR Manager)', capacity: 50, enrolled_count: 42, status: 'Scheduled' },
    ],
    created_at: '2026-01-01T10:00:00Z',
  },
];

// Seed Enrollments
const initialEnrollments: Enrollment[] = [
  { id: 'enr-101', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', course_id: 'course-101', course_name: 'POSH & Prevention of Sexual Harassment Policy 2026', enrollment_date: '2026-08-01', due_date: '2026-08-31', source: 'Mandatory', status: 'Completed', progress_percent: 100, completion_date: '2026-08-05' },
  { id: 'enr-102', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', course_id: 'course-101', course_name: 'POSH & Prevention of Sexual Harassment Policy 2026', enrollment_date: '2026-08-01', due_date: '2026-08-31', source: 'Mandatory', status: 'InProgress', progress_percent: 65 },
  { id: 'enr-103', employee_id: 'emp-103', employee_name: 'Vikramaditya Rao', department_name: 'Engineering', course_id: 'course-103', course_name: 'Microservices Architecture on Cloud Run & GCP Kubernetes', enrollment_date: '2026-08-05', due_date: '2026-09-15', source: 'Self', status: 'Enrolled', progress_percent: 30 },
];

// Seed Trainers
const initialTrainers: Trainer[] = [
  { id: 'trn-101', name: 'Rajesh Kumar', trainer_type: 'Internal', specialization: 'Cloud Architecture & Kubernetes', skills: ['GCP', 'Kubernetes', 'Docker'], email: 'rajesh.kumar@workforceos.com', phone: '+91 98765 43210', rating: 4.9, total_sessions: 14, status: 'Active' },
  { id: 'trn-102', name: 'Dr. Meera Vasudevan', trainer_type: 'External', organization_name: 'LeadExec Academy', specialization: 'Strategic Leadership & Executive Communication', skills: ['Leadership', 'Negotiation', 'People Management'], email: 'meera.vasudevan@leadexec.com', phone: '+91 98111 22233', rating: 4.8, total_sessions: 8, status: 'Active' },
];

// Seed Certifications
const initialEmployeeCerts: EmployeeCertification[] = [
  { id: 'ecert-101', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', certification_id: 'cert-1', certification_name: 'Google Cloud Professional Cloud Architect', provider: 'Google Cloud Platform', certificate_number: 'GCP-CERT-881920', issue_date: '2025-09-10', expiry_date: '2027-09-10', status: 'Active', verified_by_name: 'Anand Viswanathan (HR Head)' },
  { id: 'ecert-102', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', certification_id: 'cert-2', certification_name: 'Certified Scrum Product Owner (CSPO)', provider: 'Scrum Alliance', certificate_number: 'CSPO-77281', issue_date: '2024-09-01', expiry_date: '2026-09-01', status: 'ExpiringSoon', verified_by_name: 'Anand Viswanathan (HR Head)' },
];

// Seed Skill Gaps
const initialSkillGaps: EmployeeSkillGap[] = [
  { id: 'gap-101', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', skill_name: 'Google Cloud Platform', current_level: 'Intermediate', target_level: 'Expert', gap_level: '1 Level Gap', recommended_course_name: 'Microservices Architecture on Cloud Run & GCP Kubernetes', status: 'InTraining' },
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

export const lmsApi = {
  // 1. Courses
  async getCoursesAsync(tenantId = getActiveOrgId()): Promise<Course[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('lms_courses')
          .select('*')
          .or(`tenant_id.eq.${tenantId},organization_id.eq.${tenantId}`);
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: Course[] = data.map((d: any) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            description: d.description || '',
            category: d.category,
            subcategory: d.subcategory,
            skill_names: [],
            difficulty_level: d.difficulty_level,
            course_type: d.course_type,
            delivery_method: d.delivery_method,
            duration_hours: Number(d.duration_hours),
            training_hours: Number(d.training_hours),
            language: d.language,
            trainer_name: d.trainer_name,
            prerequisites: d.prerequisites || [],
            assessment_required: d.assessment_required,
            certification_available: d.certification_available,
            validity_months: d.validity_months,
            cost: Number(d.cost),
            max_participants: d.max_participants,
            status: d.status,
            is_mandatory: d.is_mandatory,
            modules: d.modules || [],
            created_at: d.created_at,
          }));
          setItem(STORAGE_KEYS.COURSES, mapped);
          _coursesCache = { data: mapped, timestamp: Date.now() };
          return mapped;
        }
      } catch (err) {
        console.warn('[lmsApi] getCoursesAsync notice:', err);
      }
    }
    return this.getCourses(tenantId);
  },

  getCourses(tenantId = getActiveOrgId()): Course[] {
    if (_coursesCache?.data && _coursesCache.data.length > 0) {
      return [..._coursesCache.data];
    }
    const list = getItem(STORAGE_KEYS.COURSES, initialCourses);
    if (list.length > 0) {
      _coursesCache = { data: list, timestamp: Date.now() };
    }
    if (isSupabaseEnabled && !_coursesInFlight) {
      _coursesInFlight = this.getCoursesAsync(tenantId).finally(() => {
        _coursesInFlight = null;
      });
    }
    return list;
  },

  saveCourse(course: Partial<Course>, tenantId = getActiveOrgId()): Course {
    const list = this.getCourses(tenantId);
    let updated: Course;
    if (course.id) {
      updated = { ...list.find(c => c.id === course.id)!, ...course } as Course;
      setItem(STORAGE_KEYS.COURSES, list.map(c => (c.id === course.id ? updated : c)));
    } else {
      updated = {
        id: `course-${Date.now()}`,
        code: course.code || `CRS-${Date.now()}`,
        name: course.name || 'New Course',
        description: course.description || '',
        category: course.category || 'Technical',
        subcategory: course.subcategory || 'General',
        skill_names: course.skill_names || [],
        difficulty_level: course.difficulty_level || 'Beginner',
        course_type: course.course_type || 'Online',
        delivery_method: course.delivery_method || 'SelfPaced',
        duration_hours: course.duration_hours || 4,
        training_hours: course.training_hours || 4,
        language: course.language || 'English',
        trainer_name: course.trainer_name || 'Internal Subject Expert',
        prerequisites: course.prerequisites || [],
        assessment_required: course.assessment_required ?? true,
        certification_available: course.certification_available ?? true,
        validity_months: course.validity_months || 12,
        cost: course.cost || 0,
        max_participants: course.max_participants || 100,
        status: course.status || 'Published',
        is_mandatory: course.is_mandatory ?? false,
        modules: course.modules || [],
        created_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.COURSES, [updated, ...list]);
    }

    if (_coursesCache) {
      const idx = _coursesCache.data.findIndex(c => c.id === updated.id);
      if (idx >= 0) _coursesCache.data[idx] = updated;
      else _coursesCache.data.unshift(updated);
    }

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('lms_courses').upsert({
          id: updated.id,
          tenant_id: tenantId,
          organization_id: tenantId,
          code: updated.code,
          name: updated.name,
          description: updated.description,
          category: updated.category,
          subcategory: updated.subcategory,
          difficulty_level: updated.difficulty_level,
          course_type: updated.course_type,
          delivery_method: updated.delivery_method,
          duration_hours: updated.duration_hours,
          training_hours: updated.training_hours,
          language: updated.language,
          trainer_name: updated.trainer_name,
          prerequisites: updated.prerequisites,
          assessment_required: updated.assessment_required,
          certification_available: updated.certification_available,
          validity_months: updated.validity_months,
          cost: updated.cost,
          max_participants: updated.max_participants,
          status: updated.status,
          is_mandatory: updated.is_mandatory,
          modules: updated.modules,
          updated_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[Supabase LMS] upsert course notice:', e));
    }

    return updated;
  },

  // 2. Training Programs
  getPrograms(): TrainingProgram[] {
    return getItem(STORAGE_KEYS.PROGRAMS, initialPrograms);
  },

  // 3. Enrollments
  async getEnrollmentsAsync(tenantId = getActiveOrgId()): Promise<Enrollment[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('lms_enrollments')
          .select('*')
          .or(`tenant_id.eq.${tenantId},organization_id.eq.${tenantId}`);
        if (!error && Array.isArray(data) && data.length > 0) {
          const courses = this.getCourses(tenantId);
          const courseMap = new Map(courses.map(c => [c.id, c.name]));
          const mapped: Enrollment[] = data.map((d: any) => ({
            id: d.id,
            employee_id: d.employee_id,
            employee_name: d.employee_name || 'Employee',
            department_name: d.department_name || 'General',
            course_id: d.course_id,
            course_name: courseMap.get(d.course_id) || d.course_name || 'Course',
            enrollment_date: d.enrolled_at || new Date().toISOString().split('T')[0],
            due_date: d.due_date || new Date().toISOString().split('T')[0],
            source: 'Mandatory',
            status: d.status || 'Enrolled',
            progress_percent: Number(d.progress_percent) || 0,
            completion_date: d.completed_at,
          }));
          setItem(STORAGE_KEYS.ENROLLMENTS, mapped);
          _enrollmentsCache = { data: mapped, timestamp: Date.now() };
          return mapped;
        }
      } catch (err) {
        console.warn('[lmsApi] getEnrollmentsAsync notice:', err);
      }
    }
    return this.getEnrollments(tenantId);
  },

  getEnrollments(tenantId = getActiveOrgId()): Enrollment[] {
    if (_enrollmentsCache?.data && _enrollmentsCache.data.length > 0) {
      return [..._enrollmentsCache.data];
    }
    const list = getItem(STORAGE_KEYS.ENROLLMENTS, initialEnrollments);
    if (list.length > 0) {
      _enrollmentsCache = { data: list, timestamp: Date.now() };
    }
    if (isSupabaseEnabled && !_enrollmentsInFlight) {
      _enrollmentsInFlight = this.getEnrollmentsAsync(tenantId).finally(() => {
        _enrollmentsInFlight = null;
      });
    }
    return list;
  },

  saveEnrollment(enrollment: Partial<Enrollment>, tenantId = getActiveOrgId()): Enrollment {
    const list = this.getEnrollments(tenantId);
    const updated: Enrollment = {
      id: enrollment.id || `enr-${Date.now()}`,
      employee_id: enrollment.employee_id || 'emp-101',
      employee_name: enrollment.employee_name || 'Employee',
      department_name: enrollment.department_name || 'General',
      course_id: enrollment.course_id || '',
      course_name: enrollment.course_name || '',
      program_id: enrollment.program_id,
      enrollment_date: enrollment.enrollment_date || new Date().toISOString().split('T')[0],
      start_date: enrollment.start_date,
      due_date: enrollment.due_date || new Date().toISOString().split('T')[0],
      source: enrollment.source || 'Mandatory',
      status: enrollment.status || 'Enrolled',
      progress_percent: enrollment.progress_percent || 0,
      completion_date: enrollment.completion_date,
    };
    setItem(STORAGE_KEYS.ENROLLMENTS, list.some(e => e.id === updated.id) ? list.map(e => (e.id === updated.id ? updated : e)) : [updated, ...list]);
    if (_enrollmentsCache) {
      const idx = _enrollmentsCache.data.findIndex(e => e.id === updated.id);
      if (idx >= 0) _enrollmentsCache.data[idx] = updated;
      else _enrollmentsCache.data.unshift(updated);
    }

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('lms_enrollments').upsert({
          id: updated.id,
          tenant_id: tenantId,
          organization_id: tenantId,
          course_id: updated.course_id,
          employee_id: updated.employee_id,
          employee_name: updated.employee_name,
          status: updated.status,
          progress_percent: updated.progress_percent,
          enrolled_at: updated.enrollment_date,
          completed_at: updated.completion_date || null,
          updated_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[Supabase LMS] upsert enrollment notice:', e));
    }

    return updated;
  },

  // 4. Trainers
  getTrainers(): Trainer[] {
    return getItem(STORAGE_KEYS.TRAINERS, initialTrainers);
  },

  // 5. Employee Certifications
  getEmployeeCertifications(): EmployeeCertification[] {
    return getItem(STORAGE_KEYS.EMP_CERTS, initialEmployeeCerts);
  },

  // 6. Mandatory Training
  getMandatoryAssignments(): MandatoryTrainingAssignment[] {
    return getItem(STORAGE_KEYS.MANDATORY, [
      { id: 'man-101', course_id: 'course-101', course_name: 'POSH & Prevention of Sexual Harassment Policy 2026', target_group: 'All Enterprise Employees', due_date: '2026-08-31', compliance_percent: 97.2, total_assigned: 428, completed_count: 416, status: 'Compliant' },
      { id: 'man-102', course_id: 'course-102', course_name: 'Information Security & Data Protection / GDPR Masterclass', target_group: 'All Enterprise Employees', due_date: '2026-08-31', compliance_percent: 95.8, total_assigned: 428, completed_count: 410, status: 'Compliant' },
    ]);
  },

  // 7. Skill Gaps & Paths
  getSkillGaps(): EmployeeSkillGap[] {
    return getItem(STORAGE_KEYS.SKILL_GAPS, initialSkillGaps);
  },

  getLearningPaths(): LearningPath[] {
    return getItem(STORAGE_KEYS.PATHS, [
      { id: 'lp-101', path_title: 'Fullstack Microservices Architect Track', description: 'Step-by-step learning path from developer to enterprise cloud architect', target_role: 'Staff Architect', required_skills: ['GCP', 'Kubernetes', 'Microservices', 'System Design'], ordered_course_names: ['POSH Compliance 2026', 'Information Security Masterclass', 'Microservices Architecture on Cloud Run & GCP Kubernetes'], total_duration_hours: 22, certification_issued: 'Certified Cloud Microservices Specialist' },
    ]);
  },

  // Assessment Calculation Engine (Server-Side Rule Safeguard)
  calculateAssessmentResult(scoreObtained: number, totalMarks: number, passingPercent = 80): { percentage: number; isPassed: boolean; scoreSummary: string } {
    const percentage = Number(((scoreObtained / totalMarks) * 100).toFixed(1));
    const isPassed = percentage >= passingPercent;
    const scoreSummary = `Scored ${scoreObtained} / ${totalMarks} (${percentage}%). Required Pass Threshold: ${passingPercent}%.`;
    return { percentage, isPassed, scoreSummary };
  },
};
