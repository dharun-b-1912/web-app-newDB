// src/services/observability/navigationPerfTracker.ts
// ============================================================================
// Joy PeopleHR — High-Precision Navigation & Tab Performance Diagnostics
// Measures, logs, and diagnoses transition latencies across routes & subviews
// ============================================================================

export interface PerfTransitionRecord {
  category: 'ROUTE_REDIRECT' | 'TAB_SWITCH' | 'SUBVIEW_NAV' | 'ASYNC_LOAD';
  from: string;
  to: string;
  durationMs: number;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

class NavigationPerfTracker {
  private activeTimers: Map<string, { start: number; from: string; category: PerfTransitionRecord['category']; reason?: string }> = new Map();
  private history: PerfTransitionRecord[] = [];

  /**
   * Starts timing a route redirect or tab switch
   */
  public startTransition(key: string, from: string, category: PerfTransitionRecord['category'] = 'TAB_SWITCH', reason?: string): void {
    this.activeTimers.set(key, {
      start: performance.now(),
      from: from || 'initial',
      category,
      reason: reason || 'user_click',
    });
  }

  /**
   * Ends timing, calculates elapsed ms, and outputs formatted diagnostic console log
   */
  public endTransition(key: string, to: string, metadata?: Record<string, any>): number {
    const entry = this.activeTimers.get(key);
    const end = performance.now();
    const durationMs = entry ? parseFloat((end - entry.start).toFixed(2)) : 0;
    const from = entry ? entry.from : 'unknown';
    const category = entry ? entry.category : 'TAB_SWITCH';
    const reason = entry?.reason || 'user_action';

    this.activeTimers.delete(key);

    const record: PerfTransitionRecord = {
      category,
      from,
      to,
      durationMs,
      timestamp: new Date().toISOString(),
      reason,
      metadata,
    };

    this.history.push(record);
    if (this.history.length > 50) this.history.shift();

    // Pretty console output with color badges
    const badgeColor = durationMs < 50 ? '#10b981' : durationMs < 200 ? '#f59e0b' : '#ef4444';
    const timeColor = durationMs < 50 ? 'color: #10b981; font-weight: bold;' : durationMs < 200 ? 'color: #f59e0b; font-weight: bold;' : 'color: #ef4444; font-weight: bold;';

    console.log(
      `%c[JOY-PERF]%c [${category}] %c${from} ➔ ${to}%c in %c${durationMs}ms%c | Reason: ${reason}`,
      'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      `background: ${badgeColor}; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;`,
      'color: #0f172a; font-weight: 600;',
      'color: #64748b;',
      timeColor,
      'color: #64748b;',
      metadata ? metadata : ''
    );

    return durationMs;
  }

  /**
   * Instant one-shot logger for immediate transitions
   */
  public logImmediate(category: PerfTransitionRecord['category'], from: string, to: string, durationMs: number, reason: string = 'instant_sync', metadata?: Record<string, any>): void {
    const badgeColor = durationMs < 50 ? '#10b981' : durationMs < 200 ? '#f59e0b' : '#ef4444';
    const timeColor = durationMs < 50 ? 'color: #10b981; font-weight: bold;' : durationMs < 200 ? 'color: #f59e0b; font-weight: bold;' : 'color: #ef4444; font-weight: bold;';

    console.log(
      `%c[JOY-PERF]%c [${category}] %c${from} ➔ ${to}%c in %c${durationMs.toFixed(2)}ms%c | Reason: ${reason}`,
      'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 5px; border-radius: 3px;',
      `background: ${badgeColor}; color: #ffffff; font-weight: bold; padding: 2px 5px; border-radius: 3px;`,
      'color: #0f172a; font-weight: 600;',
      'color: #64748b;',
      timeColor,
      'color: #64748b;',
      metadata ? metadata : ''
    );
  }

  public getRecentHistory(): PerfTransitionRecord[] {
    return [...this.history];
  }
}

export const navPerfTracker = new NavigationPerfTracker();
