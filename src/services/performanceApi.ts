import {
  Goal,
  OKR_Objective,
  KPI,
  KRA,
  ReviewCycle,
  SelfReview,
  ManagerReview,
  Feedback360,
  PerformanceRating,
  DevelopmentPlan,
  PromotionRecommendation,
  PIPPlan,
  CheckinRecord,
} from '../types/performance';

const STORAGE_KEYS = {
  GOALS: 'workforce_perf_goals_v1',
  OKRS: 'workforce_perf_okrs_v1',
  KPIS: 'workforce_perf_kpis_v1',
  KRAS: 'workforce_perf_kras_v1',
  CYCLES: 'workforce_perf_cycles_v1',
  SELF_REVIEWS: 'workforce_perf_self_reviews_v1',
  MGR_REVIEWS: 'workforce_perf_mgr_reviews_v1',
  FEEDBACK360: 'workforce_perf_feedback360_v1',
  RATINGS: 'workforce_perf_ratings_v1',
  DEV_PLANS: 'workforce_perf_dev_plans_v1',
  PROMOTIONS: 'workforce_perf_promotions_v1',
  PIPS: 'workforce_perf_pips_v1',
  CHECKINS: 'workforce_perf_checkins_v1',
};

// Seed Goals
const initialGoals: Goal[] = [
  {
    id: 'goal-01',
    title: 'Migrate Core HR Microservices to Multi-Cloud Cloud Run',
    description: 'Ensure 99.99% uptime and zero-downtime deployment for all enterprise tenants.',
    employee_id: 'emp-101',
    employee_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    team_name: 'Cloud Platform',
    manager_id: 'mgr-01',
    manager_name: 'Anand Viswanathan',
    goal_type: 'Individual',
    start_date: '2026-07-01',
    due_date: '2026-09-30',
    priority: 'High',
    weight: 40,
    progress: 85,
    status: 'OnTrack',
    target_value: 100,
    current_value: 85,
    unit: 'Percentage',
    milestones: [
      { id: 'm1', title: 'Containerization & Dockerfile hardening', due_date: '2026-07-15', weight: 30, progress: 100, status: 'Completed', owner_name: 'Rajesh Kumar' },
      { id: 'm2', title: 'Load testing & Chaos engineering', due_date: '2026-08-15', weight: 40, progress: 90, status: 'InProgress', owner_name: 'Rajesh Kumar' },
    ],
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'goal-02',
    title: 'Automate Statutory Form 16 Generation & Tax Computations',
    description: 'Reduce manual HR tax processing time by 90% via automated batch job generation.',
    employee_id: 'emp-102',
    employee_name: 'Ananya Sen',
    department_name: 'Product & Design',
    team_name: 'HRMS Product',
    manager_id: 'mgr-01',
    manager_name: 'Anand Viswanathan',
    goal_type: 'Department',
    start_date: '2026-07-01',
    due_date: '2026-09-30',
    priority: 'High',
    weight: 35,
    progress: 92,
    status: 'OnTrack',
    target_value: 100,
    current_value: 92,
    unit: 'Percentage',
    milestones: [],
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'goal-03',
    title: 'Kubernetes Cluster Cost Optimization & Infrastructure Savings',
    description: 'Reduce AWS/GCP cloud billing by $40k/quarter via auto-scaling and spot instances.',
    employee_id: 'emp-103',
    employee_name: 'Vikramaditya Rao',
    department_name: 'Engineering',
    team_name: 'DevOps',
    manager_id: 'mgr-01',
    manager_name: 'Anand Viswanathan',
    goal_type: 'Team',
    start_date: '2026-07-01',
    due_date: '2026-09-30',
    priority: 'Medium',
    weight: 30,
    progress: 60,
    status: 'AtRisk',
    target_value: 40000,
    current_value: 24000,
    unit: 'Currency',
    milestones: [],
    created_at: '2026-07-01T10:00:00Z',
  },
];

// Seed OKRs
const initialOKRs: OKR_Objective[] = [
  {
    id: 'okr-01',
    title: 'Achieve SOC-2 Type II Security Certification & Zero Critical Vulnerabilities',
    description: 'Company-wide security compliance initiative across all HRMS repositories.',
    owner_id: 'emp-101',
    owner_name: 'Rajesh Kumar',
    department_name: 'Engineering',
    scope: 'Company',
    period: 'Q3 2026',
    weight: 50,
    progress: 88,
    status: 'OnTrack',
    confidence_score: 'High',
    key_results: [
      { id: 'kr1', objective_id: 'okr-01', title: 'Remediate all High/Critical Dependabot CVEs', owner_name: 'Rajesh Kumar', start_value: 14, target_value: 0, current_value: 0, unit: 'CVEs', due_date: '2026-08-31', progress: 100, weight: 50, status: 'Completed' },
      { id: 'kr2', objective_id: 'okr-01', title: 'Complete Third-Party Penetration Test Audit', owner_name: 'Vikramaditya Rao', start_value: 0, target_value: 100, current_value: 75, unit: '%', due_date: '2026-09-15', progress: 75, weight: 50, status: 'OnTrack' },
    ],
    created_at: '2026-07-01T10:00:00Z',
  },
];

// Seed KPIs
const initialKPIs: KPI[] = [
  { id: 'kpi-01', code: 'CODE_QUALITY', name: 'Code Review Coverage & Test Pass Rate', description: 'Percentage of PRs with unit test coverage > 85%', category: 'Quality', department_name: 'Engineering', role_name: 'Senior Developer', measurement_type: 'Percentage', min_target: 80, expected_target: 90, stretch_target: 98, actual_achievement: 94, weight: 25, frequency: 'Monthly', status: 'Active' },
  { id: 'kpi-02', code: 'SLA_UPTIME', name: 'Production Microservice Uptime SLA', description: 'Service uptime SLA percentage', category: 'Productivity', department_name: 'Engineering', role_name: 'DevOps Lead', measurement_type: 'Percentage', min_target: 99.5, expected_target: 99.9, stretch_target: 99.99, actual_achievement: 99.95, weight: 30, frequency: 'Monthly', status: 'Active' },
];

// Seed KRAs
const initialKRAs: KRA[] = [
  { id: 'kra-01', code: 'DEV_QUALITY', name: 'Software Development & Architectural Excellence', description: 'Code quality, system stability, performance optimization, and technical debt reduction', role_name: 'Senior Developer', department_name: 'Engineering', weight: 40, mapped_kpi_names: ['Code Review Coverage', 'Production Microservice Uptime'] },
  { id: 'kra-02', code: 'TEAM_COLLAB', name: 'Agile Mentorship & Cross-Functional Collaboration', description: 'Sprint velocity contributions, peer code reviews, and mentoring junior engineers', role_name: 'Senior Developer', department_name: 'Engineering', weight: 30, mapped_kpi_names: [] },
];

// Seed Review Cycles
const initialCycles: ReviewCycle[] = [
  {
    id: 'cycle-q3-2026',
    name: 'Q3 2026 Enterprise Performance Review & Appraisal Cycle',
    cycle_type: 'Quarterly',
    period: 'Q3 2026',
    start_date: '2026-08-01',
    end_date: '2026-09-30',
    self_review_deadline: '2026-08-20',
    manager_review_deadline: '2026-08-31',
    calibration_date: '2026-09-10',
    status: 'Open',
    template_name: 'Standard 360° Technical & Leadership Template',
    eligible_employees_count: 428,
    completed_count: 376,
    created_at: '2026-07-25T10:00:00Z',
  },
];

// Seed Ratings
const initialRatings: PerformanceRating[] = [
  { id: 'rat-101', cycle_id: 'cycle-q3-2026', employee_id: 'emp-101', employee_name: 'Rajesh Kumar', department_name: 'Engineering', manager_name: 'Anand Viswanathan', calculated_score: 4.75, proposed_rating: 4.8, final_rating: 4.8, rating_label: 'Exceptional', grid_9box_position: 'Star Performer (HiPo)', calibrated_by_name: 'Anand Viswanathan (HR Head)', is_finalized: true },
  { id: 'rat-102', cycle_id: 'cycle-q3-2026', employee_id: 'emp-102', employee_name: 'Ananya Sen', department_name: 'Product & Design', manager_name: 'Anand Viswanathan', calculated_score: 4.50, proposed_rating: 4.5, final_rating: 4.5, rating_label: 'Exceeds Expectations', grid_9box_position: 'Star Performer (HiPo)', calibrated_by_name: 'Anand Viswanathan (HR Head)', is_finalized: fontTrue() },
  { id: 'rat-103', cycle_id: 'cycle-q3-2026', employee_id: 'emp-103', employee_name: 'Vikramaditya Rao', department_name: 'Engineering', manager_name: 'Anand Viswanathan', calculated_score: 4.15, proposed_rating: 4.2, final_rating: 4.2, rating_label: 'Exceeds Expectations', grid_9box_position: 'High Impact Player', calibrated_by_name: 'Anand Viswanathan (HR Head)', is_finalized: true },
];

function fontTrue(): boolean { return true; }

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

export const performanceApi = {
  // 1. Goals
  getGoals(): Goal[] {
    return getItem(STORAGE_KEYS.GOALS, initialGoals);
  },
  saveGoal(goal: Partial<Goal>): Goal {
    const list = this.getGoals();
    let updated: Goal;
    if (goal.id) {
      updated = { ...list.find(g => g.id === goal.id)!, ...goal } as Goal;
      setItem(STORAGE_KEYS.GOALS, list.map(g => (g.id === goal.id ? updated : g)));
    } else {
      updated = {
        id: `goal-${Date.now()}`,
        title: goal.title || 'New Goal',
        description: goal.description || '',
        employee_id: goal.employee_id || 'emp-101',
        employee_name: goal.employee_name || 'Rajesh Kumar',
        department_name: goal.department_name || 'Engineering',
        team_name: goal.team_name || 'Development',
        manager_id: goal.manager_id || 'mgr-01',
        manager_name: goal.manager_name || 'Anand Viswanathan',
        goal_type: goal.goal_type || 'Individual',
        start_date: goal.start_date || '2026-08-01',
        due_date: goal.due_date || '2026-09-30',
        priority: goal.priority || 'Medium',
        weight: goal.weight || 25,
        progress: goal.progress || 0,
        status: goal.status || 'InProgress',
        target_value: goal.target_value || 100,
        current_value: goal.current_value || 0,
        unit: goal.unit || 'Percentage',
        milestones: goal.milestones || [],
        created_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.GOALS, [updated, ...list]);
    }
    return updated;
  },

  // 2. OKRs
  getOKRs(): OKR_Objective[] {
    return getItem(STORAGE_KEYS.OKRS, initialOKRs);
  },
  saveOKR(okr: Partial<OKR_Objective>): OKR_Objective {
    const list = this.getOKRs();
    const updated: OKR_Objective = {
      id: okr.id || `okr-${Date.now()}`,
      title: okr.title || 'New Objective',
      description: okr.description || '',
      owner_id: okr.owner_id || 'emp-101',
      owner_name: okr.owner_name || 'Rajesh Kumar',
      department_name: okr.department_name || 'Engineering',
      scope: okr.scope || 'Company',
      period: okr.period || 'Q3 2026',
      weight: okr.weight || 50,
      progress: okr.progress || 0,
      status: okr.status || 'OnTrack',
      confidence_score: okr.confidence_score || 'High',
      key_results: okr.key_results || [],
      created_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.OKRS, list.some(o => o.id === updated.id) ? list.map(o => (o.id === updated.id ? updated : o)) : [updated, ...list]);
    return updated;
  },

  // 3. KPIs & KRAs
  getKPIs(): KPI[] {
    return getItem(STORAGE_KEYS.KPIS, initialKPIs);
  },
  getKRAs(): KRA[] {
    return getItem(STORAGE_KEYS.KRAS, initialKRAs);
  },

  // 4. Review Cycles & Ratings
  getReviewCycles(): ReviewCycle[] {
    return getItem(STORAGE_KEYS.CYCLES, initialCycles);
  },
  getRatings(): PerformanceRating[] {
    return getItem(STORAGE_KEYS.RATINGS, initialRatings);
  },

  // 5. Development Plans
  getDevelopmentPlans(): DevelopmentPlan[] {
    return getItem(STORAGE_KEYS.DEV_PLANS, [
      {
        id: 'dp-101',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        skill_gap: 'System Architecture for Multi-Region Failover',
        development_goal: 'Complete GCP Professional Cloud Architect Certification',
        action_type: 'Certification',
        target_date: '2026-10-31',
        progress: 75,
        status: 'InProgress',
      },
    ]);
  },

  // 6. Promotion Recommendations
  getPromotions(): PromotionRecommendation[] {
    return getItem(STORAGE_KEYS.PROMOTIONS, [
      {
        id: 'prm-101',
        employee_id: 'emp-101',
        employee_name: 'Rajesh Kumar',
        department_name: 'Engineering',
        current_designation: 'Staff Software Architect',
        proposed_designation: 'Principal Architect & Director of Cloud Eng',
        current_grade: 'Grade L5',
        proposed_grade: 'Grade L6',
        performance_rating: 4.8,
        reason: 'Consistently exceeded expectations in Q1-Q3. Led Cloud Run migration with 99.99% uptime.',
        effective_date: '2026-10-01',
        recommended_by_name: 'Anand Viswanathan (HR Head)',
        status: 'Submitted',
      },
    ]);
  },

  // 7. PIP Plans
  getPIPs(): PIPPlan[] {
    return getItem(STORAGE_KEYS.PIPS, [
      {
        id: 'pip-101',
        pip_code: 'PIP-2026-04',
        employee_id: 'emp-99',
        employee_name: 'Suresh Raina',
        department_name: 'Sales',
        manager_id: 'mgr-01',
        manager_name: 'Anand Viswanathan',
        start_date: '2026-07-01',
        end_date: '2026-08-31',
        performance_issues: 'Missed Q2 sales target by 45%. Low CRM log activity.',
        expected_improvements: 'Achieve minimum 80% quota in Q3. Log 20 prospect calls weekly.',
        review_frequency: 'Weekly',
        checkins_completed: 6,
        status: 'OnTrack',
        created_at: '2026-07-01T10:00:00Z',
      },
    ]);
  },

  // Formula Calculation Engine: Explainable Rating Computation
  calculatePerformanceRating(
    goalScore: number,
    kpiScore: number,
    kraScore: number,
    competencyScore: number,
    feedback360Score: number,
    weights = { goals: 40, kpi: 20, kra: 20, competency: 10, feedback360: 10 }
  ): { finalScore: number; label: string; breakdown: string } {
    const finalScore = Number(
      (
        (goalScore * weights.goals +
          kpiScore * weights.kpi +
          kraScore * weights.kra +
          competencyScore * weights.competency +
          feedback360Score * weights.feedback360) /
        100
      ).toFixed(2)
    );

    let label = 'Meets Expectations';
    if (finalScore >= 4.7) label = 'Exceptional';
    else if (finalScore >= 4.3) label = 'Exceeds Expectations';
    else if (finalScore >= 3.0) label = 'Meets Expectations';
    else if (finalScore >= 2.0) label = 'Needs Improvement';
    else label = 'Unsatisfactory';

    const breakdown = `Goals (${goalScore} × ${weights.goals}%) + KPI (${kpiScore} × ${weights.kpi}%) + KRA (${kraScore} × ${weights.kra}%) + Competency (${competencyScore} × ${weights.competency}%) + 360° (${feedback360Score} × ${weights.feedback360}%) = ${finalScore.toFixed(2)}`;

    return { finalScore, label, breakdown };
  },
};
