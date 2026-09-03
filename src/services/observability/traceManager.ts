// ============================================================
// Joy PeopleHR — Distributed Trace & Correlation Manager
// ============================================================
// Tracks user workflows from Frontend UI click -> Gateway -> Supabase Service -> DB
// ============================================================

export interface TraceContext {
  traceId: string;
  correlationId: string;
  requestId: string;
  sessionId: string;
  tenantId?: string;
  companyId?: string;
  userId?: string;
  module?: string;
  releaseVersion: string;
  environment: 'development' | 'staging' | 'production';
}

export class TraceManager {
  private static currentTraceId: string = TraceManager.generateId('tr');
  private static currentCorrelationId: string = TraceManager.generateId('corr');
  private static sessionId: string = TraceManager.initSessionId();
  private static activeTenantId?: string;
  private static activeCompanyId?: string;
  private static activeUserId?: string;
  private static activeModule?: string;
  private static releaseVersion: string = 'v2.4.1';
  private static environment: 'development' | 'staging' | 'production' = 
    (import.meta as any).env?.PROD ? 'production' : 'development';

  private static generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private static initSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let id = sessionStorage.getItem('wf_session_id');
      if (!id) {
        id = TraceManager.generateId('sess');
        sessionStorage.setItem('wf_session_id', id);
      }
      return id;
    }
    return TraceManager.generateId('sess');
  }

  /**
   * Set context when tenant or authenticated user changes
   */
  public static setTenantContext(tenantId?: string, companyId?: string, userId?: string) {
    if (tenantId) this.activeTenantId = tenantId;
    if (companyId) this.activeCompanyId = companyId;
    if (userId) this.activeUserId = userId;
  }

  /**
   * Set current active module (e.g. 'PAYROLL', 'ATTENDANCE', 'ONBOARDING')
   */
  public static setModule(moduleName: string) {
    this.activeModule = moduleName;
  }

  /**
   * Create a new Request ID for a specific action/call
   */
  public static newRequestId(): string {
    return this.generateId('req');
  }

  /**
   * Start a new distributed trace for a fresh user journey/transaction
   */
  public static startNewTrace(): string {
    this.currentTraceId = this.generateId('tr');
    this.currentCorrelationId = this.generateId('corr');
    return this.currentTraceId;
  }

  /**
   * Get complete current tracing context
   */
  public static getContext(): TraceContext {
    return {
      traceId: this.currentTraceId,
      correlationId: this.currentCorrelationId,
      requestId: this.newRequestId(),
      sessionId: this.sessionId,
      tenantId: this.activeTenantId || 'tenant_default',
      companyId: this.activeCompanyId || 'company_joy_corp',
      userId: this.activeUserId || 'anon_user',
      module: this.activeModule || 'CORE',
      releaseVersion: this.releaseVersion,
      environment: this.environment,
    };
  }

  public static getTraceId(): string {
    return this.currentTraceId;
  }

  public static getCorrelationId(): string {
    return this.currentCorrelationId;
  }
}
