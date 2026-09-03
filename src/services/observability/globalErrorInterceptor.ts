// ============================================================
// Joy PeopleHR — Global Runtime Error & Rejection Interceptor
// ============================================================
// Catches unhandled browser errors, promise rejections, chunk failures,
// and maps them into structured telemetry without disrupting end-user UX.
// ============================================================

import { ObservabilityLogger } from './observabilityLogger';
import { ErrorReferenceService } from './errorReferenceService';

export class GlobalErrorInterceptor {
  private static isInitialized = false;

  public static initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Unhandled JavaScript Runtime Errors
    window.addEventListener('error', (event: ErrorEvent) => {
      // Ignore cross-origin script error noise with no message
      if (!event.message && !event.error) return;

      const isChunkError =
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Failed to fetch dynamically imported module');

      const moduleName = isChunkError ? 'CHUNK_LOADER' : 'GLOBAL_RUNTIME';

      ErrorReferenceService.recordError(
        event.error || new Error(event.message),
        moduleName,
        event.message || 'Unhandled Script Runtime Error',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          isChunkError,
        }
      );
    });

    // 2. Unhandled Promise Rejections (e.g. Supabase, fetch timeouts)
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errorObj = reason instanceof Error ? reason : new Error(String(reason));

      ErrorReferenceService.recordError(
        errorObj,
        'ASYNC_PROMISE',
        'Unhandled Async Promise Rejection',
        { rawReason: typeof reason === 'object' ? JSON.stringify(reason) : String(reason) }
      );
    });

    ObservabilityLogger.app('INTERCEPTOR_INIT', 'Global error and rejection interceptor active', {
      timestamp: new Date().toISOString(),
    });
  }
}
