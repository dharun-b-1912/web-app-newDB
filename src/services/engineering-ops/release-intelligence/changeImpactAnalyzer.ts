// ============================================================
// Joy PeopleHR — Change Impact Analyzer (Phase 7)
// ============================================================
// Maps code/configuration changes to downstream service dependencies
// and mission-critical business workflows.
// ============================================================

export interface ChangeImpactNode {
  nodeId: string;
  name: string;
  type: 'SERVICE' | 'SUB_PROCESS' | 'BUSINESS_WORKFLOW';
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  blastRadiusScore: number; // 0 - 100
  affectedDownstream: string[];
}

export class ChangeImpactAnalyzer {
  private static impactGraph: Map<string, ChangeImpactNode[]> = new Map([
    [
      'PAYROLL',
      [
        {
          nodeId: 'node_salary_calc',
          name: 'Salary Component Engine',
          type: 'SUB_PROCESS',
          criticality: 'CRITICAL',
          blastRadiusScore: 95,
          affectedDownstream: ['PF Calculation', 'ESI Calculation', 'Professional Tax'],
        },
        {
          nodeId: 'node_pf_calc',
          name: 'Statutory PF & Tax Deduction',
          type: 'SUB_PROCESS',
          criticality: 'CRITICAL',
          blastRadiusScore: 90,
          affectedDownstream: ['Form 16 Generator', 'Challan ECR File'],
        },
        {
          nodeId: 'node_payslip_gen',
          name: 'PDF Payslip Generator',
          type: 'BUSINESS_WORKFLOW',
          criticality: 'HIGH',
          blastRadiusScore: 80,
          affectedDownstream: ['Employee Self-Service Portal', 'Email Delivery'],
        },
        {
          nodeId: 'node_bank_export',
          name: 'Bank Direct Credit Disbursal Export',
          type: 'BUSINESS_WORKFLOW',
          criticality: 'CRITICAL',
          blastRadiusScore: 100,
          affectedDownstream: ['HDFC / ICICI Corporate CMS Gateway'],
        },
      ],
    ],
    [
      'ATTENDANCE',
      [
        {
          nodeId: 'node_punch_ingest',
          name: 'Biometric Punch Ingestion',
          type: 'SUB_PROCESS',
          criticality: 'HIGH',
          blastRadiusScore: 85,
          affectedDownstream: ['Shift Roster Matcher', 'Overtime Calculator'],
        },
        {
          nodeId: 'node_shift_matcher',
          name: 'Shift Roster & Grace Period Matcher',
          type: 'SUB_PROCESS',
          criticality: 'HIGH',
          blastRadiusScore: 80,
          affectedDownstream: ['Loss of Pay (LOP) Days'],
        },
        {
          nodeId: 'node_lop_export',
          name: 'LOP Days to Payroll Integration',
          type: 'BUSINESS_WORKFLOW',
          criticality: 'CRITICAL',
          blastRadiusScore: 95,
          affectedDownstream: ['Monthly Payroll Run'],
        },
      ],
    ],
    [
      'AUTH',
      [
        {
          nodeId: 'node_jwt_rotation',
          name: 'JWT Session Token Rotation',
          type: 'SUB_PROCESS',
          criticality: 'CRITICAL',
          blastRadiusScore: 100,
          affectedDownstream: ['All Mobile & Web Clients'],
        },
      ],
    ],
  ]);

  public static getImpactGraphForService(service: string): ChangeImpactNode[] {
    return this.impactGraph.get(service) || [];
  }

  public static calculateTotalBlastRadius(service: string): number {
    const nodes = this.getImpactGraphForService(service);
    if (nodes.length === 0) return 20;
    const maxScore = Math.max(...nodes.map((n) => n.blastRadiusScore));
    return maxScore;
  }
}
