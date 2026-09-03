// ============================================================
// Joy PeopleHR — SLO Burn Rate Forecaster
// ============================================================
// Computes error budget consumption acceleration, burn multiplier rate,
// and estimated Time to Exhaustion (TTE) in hours before budget depletion.
// ============================================================

export interface SloBurnForecast {
  sloId: string;
  sloName: string;
  targetPercentage: number;
  currentPercentage: number;
  errorBudgetRemainingPercentage: number;
  currentBurnMultiplier: number; // 1x = standard 30-day depletion, 14.4x = 2-day depletion
  hourlyConsumptionRatePct: number;
  estimatedHoursToExhaustion: number | null; // null if stable or 0 burn
  burnSeverity: 'NORMAL' | 'ELEVATED' | 'CRITICAL_DEPLETION';
  forecastSummary: string;
  evaluatedAt: string;
}

export class SloBurnRateForecaster {
  public static calculateBurnForecast(params: {
    sloId: string;
    sloName: string;
    targetPercentage: number;
    currentPercentage: number;
    errorBudgetRemainingPercentage: number;
    currentHourlyErrorRateDelta: number; // rate of change in errors per hour
  }): SloBurnForecast {
    const allowedErrorBudget = 100 - params.targetPercentage; // e.g. 0.1% for 99.9%
    const remainingBudget = (params.errorBudgetRemainingPercentage / 100) * allowedErrorBudget;

    // Standard burn rate over 30 days = allowedBudget / 720 hours
    const normalHourlyBudgetBurn = allowedErrorBudget / 720;
    const actualHourlyBurn = Math.max(0.00001, params.currentHourlyErrorRateDelta);
    const currentBurnMultiplier = Number((actualHourlyBurn / normalHourlyBudgetBurn).toFixed(1));

    let estimatedHoursToExhaustion: number | null = null;
    if (actualHourlyBurn > normalHourlyBudgetBurn) {
      estimatedHoursToExhaustion = Number((remainingBudget / actualHourlyBurn).toFixed(1));
    }

    let burnSeverity: 'NORMAL' | 'ELEVATED' | 'CRITICAL_DEPLETION' = 'NORMAL';
    let forecastSummary = 'Error budget burn rate is healthy. No risk of threshold breach within 30-day rolling window.';

    if (currentBurnMultiplier >= 14.0 || (estimatedHoursToExhaustion !== null && estimatedHoursToExhaustion <= 24)) {
      burnSeverity = 'CRITICAL_DEPLETION';
      forecastSummary = `CRITICAL SLO BURN: Current failure acceleration (${currentBurnMultiplier}x normal burn) will exhaust the 30-day error budget in ${estimatedHoursToExhaustion ?? 12} hours.`;
    } else if (currentBurnMultiplier >= 3.0 || (estimatedHoursToExhaustion !== null && estimatedHoursToExhaustion <= 72)) {
      burnSeverity = 'ELEVATED';
      forecastSummary = `ELEVATED BURN: Consumption rate (${currentBurnMultiplier}x) exceeds normal baseline. Estimated ${estimatedHoursToExhaustion ?? 48} hours remaining before budget exhaustion.`;
    }

    return {
      sloId: params.sloId,
      sloName: params.sloName,
      targetPercentage: params.targetPercentage,
      currentPercentage: params.currentPercentage,
      errorBudgetRemainingPercentage: params.errorBudgetRemainingPercentage,
      currentBurnMultiplier,
      hourlyConsumptionRatePct: Number((actualHourlyBurn * 100).toFixed(4)),
      estimatedHoursToExhaustion,
      burnSeverity,
      forecastSummary,
      evaluatedAt: new Date().toISOString(),
    };
  }

  public static getAllBurnForecasts(): SloBurnForecast[] {
    return [
      this.calculateBurnForecast({
        sloId: 'slo_payroll',
        sloName: 'Payroll Processing Success Rate (99.9%)',
        targetPercentage: 99.9,
        currentPercentage: 99.92,
        errorBudgetRemainingPercentage: 20.0,
        currentHourlyErrorRateDelta: 0.0022, // 22% hourly increase during incident
      }),
      this.calculateBurnForecast({
        sloId: 'slo_attendance',
        sloName: 'Attendance Processing Success Rate (99.5%)',
        targetPercentage: 99.5,
        currentPercentage: 99.72,
        errorBudgetRemainingPercentage: 44.0,
        currentHourlyErrorRateDelta: 0.0008,
      }),
      this.calculateBurnForecast({
        sloId: 'slo_auth',
        sloName: 'Authentication Availability (99.9%)',
        targetPercentage: 99.9,
        currentPercentage: 99.98,
        errorBudgetRemainingPercentage: 80.0,
        currentHourlyErrorRateDelta: 0.0001,
      }),
      this.calculateBurnForecast({
        sloId: 'slo_emp_api',
        sloName: 'Employee Data API Success Rate (99.9%)',
        targetPercentage: 99.9,
        currentPercentage: 99.95,
        errorBudgetRemainingPercentage: 50.0,
        currentHourlyErrorRateDelta: 0.0001,
      }),
    ];
  }
}
