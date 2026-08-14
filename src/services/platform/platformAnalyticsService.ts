// src/services/platform/platformAnalyticsService.ts
// ============================================================
// WorkForceOS — SaaS Business BI & Cohort Analytics Service
// ============================================================

export interface MrrTrendPoint {
  month: string;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  churn_mrr: number;
  net_mrr: number;
}

export interface PlanDistributionPoint {
  name: string;
  count: number;
  revenue: number;
  color: string;
}

export interface CohortRow {
  cohort: string;
  size: number;
  m1: number;
  m2: number;
  m3: number;
  m6: number;
  m12: number;
}

const initialMrrTrends: MrrTrendPoint[] = [
  { month: 'Mar 2026', mrr: 1420000, new_mrr: 180000, expansion_mrr: 45000, churn_mrr: 25000, net_mrr: 200000 },
  { month: 'Apr 2026', mrr: 1510000, new_mrr: 135000, expansion_mrr: 35000, churn_mrr: 18000, net_mrr: 152000 },
  { month: 'May 2026', mrr: 1600000, new_mrr: 150000, expansion_mrr: 50000, churn_mrr: 22000, net_mrr: 178000 },
  { month: 'Jun 2026', mrr: 1690000, new_mrr: 175000, expansion_mrr: 65000, churn_mrr: 30000, net_mrr: 210000 },
  { month: 'Jul 2026', mrr: 1760000, new_mrr: 140000, expansion_mrr: 80000, churn_mrr: 28000, net_mrr: 192000 },
  { month: 'Aug 2026', mrr: 1840000, new_mrr: 195000, expansion_mrr: 95000, churn_mrr: 35000, net_mrr: 255000 },
];

const initialPlanDistribution: PlanDistributionPoint[] = [
  { name: 'Enterprise', count: 18, revenue: 1080000, color: '#07563D' },
  { name: 'Business', count: 64, revenue: 512000, color: '#0A7E5A' },
  { name: 'Professional', count: 142, revenue: 213000, color: '#10B981' },
  { name: 'Starter', count: 204, revenue: 35000, color: '#6EE7B7' },
];

const initialCohorts: CohortRow[] = [
  { cohort: 'Jan 2026', size: 34, m1: 100, m2: 97, m3: 94, m6: 91, m12: 88 },
  { cohort: 'Feb 2026', size: 28, m1: 100, m2: 96, m3: 93, m6: 89, m12: 87 },
  { cohort: 'Mar 2026', size: 42, m1: 100, m2: 98, m3: 95, m6: 92, m12: 90 },
  { cohort: 'Apr 2026', size: 38, m1: 100, m2: 97, m3: 94, m6: 91, m12: 89 },
  { cohort: 'May 2026', size: 45, m1: 100, m2: 98, m3: 96, m6: 93, m12: 91 },
  { cohort: 'Jun 2026', size: 52, m1: 100, m2: 98, m3: 95, m6: 94, m12: 92 },
];

export const platformAnalyticsService = {
  getMrrTrends(): MrrTrendPoint[] {
    return initialMrrTrends;
  },

  getPlanDistribution(): PlanDistributionPoint[] {
    return initialPlanDistribution;
  },

  getCohortRetention(): CohortRow[] {
    return initialCohorts;
  },
};
