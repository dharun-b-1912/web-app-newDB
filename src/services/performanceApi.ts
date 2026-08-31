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

// Performance Store Data (Initialized empty for multi-tenant database)
const initialGoals: Goal[] = [];
const initialOKRs: OKR_Objective[] = [];
const initialKPIs: KPI[] = [];
const initialKRAs: KRA[] = [];
const initialCycles: ReviewCycle[] = [];
const initialRatings: PerformanceRating[] = [];

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
