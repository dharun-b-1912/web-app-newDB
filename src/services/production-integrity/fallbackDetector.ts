// ============================================================
// Joy PeopleHR — Fallback Expression Detector
// ============================================================
// Evaluates fallback usage (?? and ||) to distinguish between
// safe configuration defaults and dangerous fallback business datasets.
// ============================================================

export type FallbackClassification = 'SAFE_DEFAULT' | 'REVIEW_REQUIRED' | 'CRITICAL_FAKE_FALLBACK';

export interface FallbackAuditEntry {
  expression: string;
  context: string;
  classification: FallbackClassification;
  explanation: string;
}

export class FallbackDetector {
  public static evaluateFallback(expression: string, context: string): FallbackAuditEntry {
    const exprLower = expression.toLowerCase();

    // Dangerous patterns: falling back to mock or demo datasets
    if (
      exprLower.includes('mock') ||
      exprLower.includes('demo') ||
      exprLower.includes('dummy') ||
      exprLower.includes('sample') ||
      exprLower.includes('fake')
    ) {
      return {
        expression,
        context,
        classification: 'CRITICAL_FAKE_FALLBACK',
        explanation: 'CRITICAL: Expression falls back to fake/mock dataset when primary API fails.',
      };
    }

    // Dangerous pattern: defaulting to 0 for unknown metrics without verification
    if (exprLower.endsWith('?? 0') || exprLower.endsWith('|| 0')) {
      if (context.toLowerCase().includes('rate') || context.toLowerCase().includes('kpi')) {
        return {
          expression,
          context,
          classification: 'REVIEW_REQUIRED',
          explanation: 'REVIEW: Converting unknown metric to 0 may mask API unavailability.',
        };
      }
    }

    // Safe patterns: configuration and pagination defaults
    if (
      exprLower.includes('page') ||
      exprLower.includes('limit') ||
      exprLower.includes('timeout') ||
      exprLower.includes('pagesize') ||
      exprLower.includes('title')
    ) {
      return {
        expression,
        context,
        classification: 'SAFE_DEFAULT',
        explanation: 'SAFE: Standard UI configuration or pagination default.',
      };
    }

    return {
      expression,
      context,
      classification: 'SAFE_DEFAULT',
      explanation: 'SAFE: Non-business structural default.',
    };
  }
}
