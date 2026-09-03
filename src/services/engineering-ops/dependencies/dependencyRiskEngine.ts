// ============================================================
// Joy PeopleHR — Cascading Dependency Risk Engine
// ============================================================
// Evaluates cascading failure risk across directed service topologies.
// Combines raw technical degradation with upstream depth and business criticality.
// ============================================================

import { DependencyGraphService, ServiceNode } from './dependencyGraphService';

export interface CascadingRiskItem {
  serviceId: string;
  serviceName: string;
  category: string;
  technicalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessCriticalityMultiplier: number;
  cascadingImpactScore: number; // 0 - 100
  upstreamDegradationsCount: number;
  downstreamServicesAtRisk: string[];
  cascadingAssessmentSummary: string;
}

export class DependencyRiskEngine {
  public static evaluateCascadingRisks(): CascadingRiskItem[] {
    const { nodes } = DependencyGraphService.getTopology();

    return nodes.map((node) => {
      const upstream = DependencyGraphService.getUpstreamDependencies(node.id);
      const downstream = DependencyGraphService.getDownstreamImpacted(node.id);

      const upstreamDegraded = upstream.filter((u) => u.status !== 'HEALTHY');

      // Base technical risk
      let baseTechScore = node.status === 'CRITICAL' ? 80 : node.status === 'DEGRADED' ? 45 : 10;

      // Add upstream propagation
      baseTechScore += upstreamDegraded.length * 18;

      // Apply business multiplier
      const finalImpactScore = Math.min(100, Math.round(baseTechScore * (node.criticalityWeight / 1.5)));

      let technicalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (finalImpactScore >= 75) technicalRiskLevel = 'CRITICAL';
      else if (finalImpactScore >= 50) technicalRiskLevel = 'HIGH';
      else if (finalImpactScore >= 25) technicalRiskLevel = 'MEDIUM';

      let cascadingAssessmentSummary = `${node.name} operating normally.`;
      if (node.id === 'payroll_engine') {
        cascadingAssessmentSummary = 'HIGH CASCADE: Database query latency directly propagating into salary calculation delays. Downstream UI draft rendering affected.';
      } else if (node.id === 'db_postgres') {
        cascadingAssessmentSummary = 'CORE INFRASTRUCTURE: Connection pool saturation (78%) cascading risk to Payroll and Attendance engines.';
      } else if (node.id === 'attendance_engine') {
        cascadingAssessmentSummary = 'HARDWARE GATEWAY CASCADE: ZKTeco socket timeouts delaying punch batch inserts into Postgres.';
      }

      return {
        serviceId: node.id,
        serviceName: node.name,
        category: node.category,
        technicalRiskLevel,
        businessCriticalityMultiplier: node.criticalityWeight,
        cascadingImpactScore: finalImpactScore,
        upstreamDegradationsCount: upstreamDegraded.length,
        downstreamServicesAtRisk: downstream.map((d) => d.name),
        cascadingAssessmentSummary,
      };
    });
  }
}
