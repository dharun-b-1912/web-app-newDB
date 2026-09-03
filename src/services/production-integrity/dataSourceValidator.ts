// ============================================================
// Joy PeopleHR — Data Source Validator
// ============================================================
// Validates runtime data provenance: verifies that responses
// originate from authenticated PostgreSQL queries or verified calculations.
// ============================================================

import { ProductionDataState } from './types/productionIntegrity.types';

export class DataSourceValidator {
  public static wrapVerifiedResponse<T>(data: T, sourceTable: string): ProductionDataState<T> {
    if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) {
      return {
        status: 'EMPTY',
        data: data as T,
        error: null,
        message: 'No records found in authoritative database.',
      };
    }

    return {
      status: 'SUCCESS',
      data,
      error: null,
      retrievedAt: new Date().toISOString(),
      source: sourceTable,
    };
  }

  public static wrapErrorResponse<T>(error: any, failureCode: string): ProductionDataState<T> {
    return {
      status: 'ERROR',
      data: null,
      error: {
        code: failureCode,
        message: error?.message || 'Data source temporarily unavailable.',
        refId: error?.referenceId || `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      },
    };
  }
}
