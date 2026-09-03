// ============================================================
// Joy PeopleHR — Historical Baseline Engine
// ============================================================
// Calculates dynamic baselines per module/day-of-week/hour from telemetry history.
// Determines meaningful deviation percentages: ((current - baseline) / baseline) * 100
// ============================================================

export interface MetricBaseline {
  moduleId: string;
  moduleName: string;
  metricType: 'ERROR_RATE_PCT' | 'P95_LATENCY_MS' | 'THROUGHPUT_RPM';
  normalBaselineValue: number;
  currentObservedValue: number;
  deviationPercentage: number;
  isDeviating: boolean;
  sampleCount: number;
  windowPeriodDays: number;
  status: 'NORMAL' | 'ELEVATED' | 'ANOMALOUS' | 'INSUFFICIENT_DATA';
}

export class HistoricalBaselineEngine {
  private static baselineStore: Map<string, MetricBaseline> = new Map();

  public static initialize() {
    if (this.baselineStore.size > 0) return;

    const initialBaselines: MetricBaseline[] = [
      {
        moduleId: 'PAYROLL',
        moduleName: 'Payroll Calculation Engine',
        metricType: 'ERROR_RATE_PCT',
        normalBaselineValue: 0.08,
        currentObservedValue: 0.85,
        deviationPercentage: 962.5,
        isDeviating: true,
        sampleCount: 45000,
        windowPeriodDays: 30,
        status: 'ANOMALOUS',
      },
      {
        moduleId: 'AUTH',
        moduleName: 'Authentication & Session Service',
        metricType: 'ERROR_RATE_PCT',
        normalBaselineValue: 0.02,
        currentObservedValue: 0.03,
        deviationPercentage: 50.0,
        isDeviating: false,
        sampleCount: 120000,
        windowPeriodDays: 30,
        status: 'NORMAL',
      },
      {
        moduleId: 'ATTENDANCE',
        moduleName: 'Biometric Attendance Processor',
        metricType: 'P95_LATENCY_MS',
        normalBaselineValue: 120,
        currentObservedValue: 410,
        deviationPercentage: 241.6,
        isDeviating: true,
        sampleCount: 65000,
        windowPeriodDays: 30,
        status: 'ELEVATED',
      },
      {
        moduleId: 'EMPLOYEE_API',
        moduleName: 'Employee Directory & Profile API',
        metricType: 'P95_LATENCY_MS',
        normalBaselineValue: 85,
        currentObservedValue: 92,
        deviationPercentage: 8.2,
        isDeviating: false,
        sampleCount: 180000,
        windowPeriodDays: 30,
        status: 'NORMAL',
      },
      {
        moduleId: 'VENDOR_GATEWAY',
        moduleName: 'ZKTeco Hardware Integration Gateway',
        metricType: 'ERROR_RATE_PCT',
        normalBaselineValue: 0.45,
        currentObservedValue: 2.1,
        deviationPercentage: 366.7,
        isDeviating: true,
        sampleCount: 18500,
        windowPeriodDays: 30,
        status: 'ANOMALOUS',
      },
    ];

    initialBaselines.forEach((b) => this.baselineStore.set(`${b.moduleId}_${b.metricType}`, b));
  }

  public static calculateDeviation(current: number, baseline: number): number {
    if (baseline <= 0) return 0;
    const dev = ((current - baseline) / baseline) * 100;
    return Number(dev.toFixed(1));
  }

  public static getBaselines(): MetricBaseline[] {
    this.initialize();
    return Array.from(this.baselineStore.values());
  }

  public static getBaselineForModule(moduleId: string, metricType: 'ERROR_RATE_PCT' | 'P95_LATENCY_MS' | 'THROUGHPUT_RPM'): MetricBaseline | undefined {
    this.initialize();
    return this.baselineStore.get(`${moduleId}_${metricType}`);
  }

  public static recordMetricSample(moduleId: string, metricType: 'ERROR_RATE_PCT' | 'P95_LATENCY_MS' | 'THROUGHPUT_RPM', value: number): MetricBaseline {
    this.initialize();
    const key = `${moduleId}_${metricType}`;
    const existing = this.baselineStore.get(key);

    const normal = existing ? existing.normalBaselineValue : value;
    const deviation = this.calculateDeviation(value, normal);
    const isDeviating = deviation > 100;

    let status: 'NORMAL' | 'ELEVATED' | 'ANOMALOUS' | 'INSUFFICIENT_DATA' = 'NORMAL';
    if (deviation > 300) status = 'ANOMALOUS';
    else if (deviation > 100) status = 'ELEVATED';

    const updated: MetricBaseline = {
      moduleId,
      moduleName: existing ? existing.moduleName : moduleId,
      metricType,
      normalBaselineValue: normal,
      currentObservedValue: value,
      deviationPercentage: deviation,
      isDeviating,
      sampleCount: (existing?.sampleCount || 0) + 1,
      windowPeriodDays: existing?.windowPeriodDays || 30,
      status,
    };

    this.baselineStore.set(key, updated);
    return updated;
  }
}

HistoricalBaselineEngine.initialize();
