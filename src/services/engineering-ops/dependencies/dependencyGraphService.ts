// ============================================================
// Joy PeopleHR — Dependency Graph Service
// ============================================================
// Maintains directed graph topology of platform services, upstream data stores,
// middleware gateways, and downstream user-facing business applications.
// ============================================================

export interface ServiceNode {
  id: string;
  name: string;
  category: 'INFRASTRUCTURE' | 'CORE_API' | 'BUSINESS_ENGINE' | 'USER_INTERFACE';
  criticalityWeight: number; // 1.0 (standard) to 2.0 (mission critical, e.g. Payroll)
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export interface ServiceEdge {
  id: string;
  sourceServiceId: string;
  targetServiceId: string;
  relationType: 'SYNCHRONOUS_RPC' | 'DATABASE_CONNECTION' | 'ASYNC_QUEUE' | 'GATEWAY_POLL';
  latencyImpact: 'DIRECT' | 'BACKGROUND';
}

export class DependencyGraphService {
  private static nodes: ServiceNode[] = [
    { id: 'db_postgres', name: 'Supabase PostgreSQL Primary', category: 'INFRASTRUCTURE', criticalityWeight: 2.0, status: 'DEGRADED' },
    { id: 'auth_service', name: 'Auth & JWT Session Service', category: 'CORE_API', criticalityWeight: 1.8, status: 'HEALTHY' },
    { id: 'employee_api', name: 'Employee Core Data API', category: 'CORE_API', criticalityWeight: 1.5, status: 'HEALTHY' },
    { id: 'attendance_engine', name: 'Attendance Sync Engine', category: 'BUSINESS_ENGINE', criticalityWeight: 1.6, status: 'DEGRADED' },
    { id: 'payroll_engine', name: 'Payroll Calculation Engine', category: 'BUSINESS_ENGINE', criticalityWeight: 2.0, status: 'DEGRADED' },
    { id: 'zkteco_gateway', name: 'ZKTeco Hardware Gateway', category: 'INFRASTRUCTURE', criticalityWeight: 1.3, status: 'DEGRADED' },
    { id: 'leave_module', name: 'Leave & Holiday Service', category: 'BUSINESS_ENGINE', criticalityWeight: 1.2, status: 'HEALTHY' },
    { id: 'web_cockpit_ui', name: 'Joy Workforce Enterprise UI', category: 'USER_INTERFACE', criticalityWeight: 1.4, status: 'HEALTHY' },
  ];

  private static edges: ServiceEdge[] = [
    { id: 'e1', sourceServiceId: 'db_postgres', targetServiceId: 'auth_service', relationType: 'DATABASE_CONNECTION', latencyImpact: 'DIRECT' },
    { id: 'e2', sourceServiceId: 'db_postgres', targetServiceId: 'employee_api', relationType: 'DATABASE_CONNECTION', latencyImpact: 'DIRECT' },
    { id: 'e3', sourceServiceId: 'db_postgres', targetServiceId: 'attendance_engine', relationType: 'DATABASE_CONNECTION', latencyImpact: 'DIRECT' },
    { id: 'e4', sourceServiceId: 'db_postgres', targetServiceId: 'payroll_engine', relationType: 'DATABASE_CONNECTION', latencyImpact: 'DIRECT' },
    { id: 'e5', sourceServiceId: 'auth_service', targetServiceId: 'employee_api', relationType: 'SYNCHRONOUS_RPC', latencyImpact: 'DIRECT' },
    { id: 'e6', sourceServiceId: 'zkteco_gateway', targetServiceId: 'attendance_engine', relationType: 'GATEWAY_POLL', latencyImpact: 'BACKGROUND' },
    { id: 'e7', sourceServiceId: 'employee_api', targetServiceId: 'payroll_engine', relationType: 'SYNCHRONOUS_RPC', latencyImpact: 'DIRECT' },
    { id: 'e8', sourceServiceId: 'attendance_engine', targetServiceId: 'payroll_engine', relationType: 'SYNCHRONOUS_RPC', latencyImpact: 'DIRECT' },
    { id: 'e9', sourceServiceId: 'employee_api', targetServiceId: 'web_cockpit_ui', relationType: 'SYNCHRONOUS_RPC', latencyImpact: 'DIRECT' },
    { id: 'e10', sourceServiceId: 'payroll_engine', targetServiceId: 'web_cockpit_ui', relationType: 'SYNCHRONOUS_RPC', latencyImpact: 'DIRECT' },
  ];

  public static getTopology(): { nodes: ServiceNode[]; edges: ServiceEdge[] } {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
    };
  }

  public static getUpstreamDependencies(serviceId: string): ServiceNode[] {
    const upstreamIds = this.edges
      .filter((e) => e.targetServiceId === serviceId)
      .map((e) => e.sourceServiceId);
    return this.nodes.filter((n) => upstreamIds.includes(n.id));
  }

  public static getDownstreamImpacted(serviceId: string): ServiceNode[] {
    const downstreamIds = this.edges
      .filter((e) => e.sourceServiceId === serviceId)
      .map((e) => e.targetServiceId);
    return this.nodes.filter((n) => downstreamIds.includes(n.id));
  }
}
