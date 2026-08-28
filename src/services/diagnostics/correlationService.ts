// ============================================================
// Joy PeopleHR — Correlation Service
// ============================================================
// Generates and manages standard end-to-end trace correlation IDs
// Format: WF-YYYYMMDD-HHMMSS-XXXXXX (e.g. WF-20260825-181122-7F82A1)
// ============================================================

export class CorrelationService {
  private static currentCorrelationId: string | null = null;

  /**
   * Generates a new unique correlation ID
   */
  public static generate(prefix: string = 'WF'): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const mins = pad(now.getMinutes());
    const secs = pad(now.getSeconds());
    
    const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
    return `${prefix}-${year}${month}${day}-${hours}${mins}${secs}-${hex}`;
  }

  /**
   * Set active correlation ID in context
   */
  public static set(id: string): void {
    this.currentCorrelationId = id;
  }

  /**
   * Get active correlation ID or generate a new one
   */
  public static get(): string {
    if (!this.currentCorrelationId) {
      this.currentCorrelationId = this.generate();
    }
    return this.currentCorrelationId;
  }

  /**
   * Clear active correlation ID
   */
  public static clear(): void {
    this.currentCorrelationId = null;
  }

  /**
   * Run an asynchronous operation with a dedicated correlation scope
   */
  public static async runWithScope<T>(action: (correlationId: string) => Promise<T>, customId?: string): Promise<T> {
    const prevId = this.currentCorrelationId;
    const cid = customId || this.generate();
    this.currentCorrelationId = cid;
    try {
      return await action(cid);
    } finally {
      this.currentCorrelationId = prevId;
    }
  }
}

export const correlationService = CorrelationService;
