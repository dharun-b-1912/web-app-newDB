// ============================================================
// Joy PeopleHR — Trend Detection Engine
// ============================================================
// Tracks consecutive metric sample intervals to compute velocity (rate of change)
// and acceleration (second derivative), identifying rapid failure ramp-ups.
// ============================================================

export type TrendClassification =
  | 'RAPID_ACCELERATION'
  | 'STEADY_INCREASE'
  | 'STABLE'
  | 'DECREASING'
  | 'INSUFFICIENT_DATA';

export interface TrendAnalysisResult {
  moduleId: string;
  metricType: string;
  sampleSeries: number[];
  currentValue: number;
  velocityPctPerInterval: number;
  accelerationRate: number;
  classification: TrendClassification;
  earlyWarningMessage?: string;
  evaluatedAt: string;
}

export class TrendDetectionEngine {
  public static analyzeTrend(
    moduleId: string,
    metricType: string,
    samples: number[]
  ): TrendAnalysisResult {
    const now = new Date().toISOString();

    if (!samples || samples.length < 3) {
      return {
        moduleId,
        metricType,
        sampleSeries: samples || [],
        currentValue: samples && samples.length > 0 ? samples[samples.length - 1] : 0,
        velocityPctPerInterval: 0,
        accelerationRate: 0,
        classification: 'INSUFFICIENT_DATA',
        evaluatedAt: now,
      };
    }

    const n = samples.length;
    const current = samples[n - 1];
    const previous = samples[n - 2];
    const prevPrevious = samples[n - 3];

    // First derivative: velocity (rate of change)
    const velocity = Number((current - previous).toFixed(3));

    // Second derivative: acceleration (rate of change of velocity)
    const prevVelocity = previous - prevPrevious;
    const acceleration = Number((velocity - prevVelocity).toFixed(3));

    let classification: TrendClassification = 'STABLE';
    let earlyWarningMessage: string | undefined;

    if (velocity > 0.2 && acceleration > 0.1) {
      classification = 'RAPID_ACCELERATION';
      earlyWarningMessage = `Rapid failure rate acceleration detected (+${(velocity * 100).toFixed(0)}% velocity, ${acceleration > 0 ? '+' : ''}${acceleration} acc). Current rate is compounding faster than historical norm.`;
    } else if (velocity > 0.05) {
      classification = 'STEADY_INCREASE';
      earlyWarningMessage = `Steady increase observed (+${(velocity * 100).toFixed(1)}% per interval). Monitor for saturation.`;
    } else if (velocity < -0.05) {
      classification = 'DECREASING';
    }

    return {
      moduleId,
      metricType,
      sampleSeries: samples,
      currentValue: current,
      velocityPctPerInterval: velocity,
      accelerationRate: acceleration,
      classification,
      earlyWarningMessage,
      evaluatedAt: now,
    };
  }

  public static getActiveTrendSummaries(): TrendAnalysisResult[] {
    return [
      this.analyzeTrend('PAYROLL', 'ERROR_RATE_PCT', [0.08, 0.12, 0.25, 0.45, 0.85]),
      this.analyzeTrend('ATTENDANCE', 'P95_LATENCY_MS', [120, 135, 180, 290, 410]),
      this.analyzeTrend('AUTH', 'ERROR_RATE_PCT', [0.02, 0.02, 0.03, 0.02, 0.03]),
      this.analyzeTrend('EMPLOYEE_API', 'P95_LATENCY_MS', [85, 88, 86, 89, 92]),
      this.analyzeTrend('VENDOR_GATEWAY', 'ERROR_RATE_PCT', [0.45, 0.60, 0.95, 1.40, 2.10]),
    ];
  }
}
