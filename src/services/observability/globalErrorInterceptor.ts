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

      try {
        const isChunkError =
          event.message?.includes('Loading chunk') ||
          event.message?.includes('Failed to fetch dynamically imported module');

        const isNetworkError =
          event.message?.includes('ERR_NETWORK_CHANGED') ||
          event.message?.includes('NetworkError') ||
          event.message?.includes('Failed to fetch') ||
          event.message?.includes('ERR_INTERNET_DISCONNECTED');

        // Gracefully handle transient network change without polluting error telemetry
        if (isNetworkError) {
          console.warn('[GlobalErrorInterceptor] Transient network fluctuation detected:', event.message);
          return;
        }

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
      } catch (handlerErr) {
        // Fallback console log if telemetry recorder itself fails
        console.error('[GlobalErrorInterceptor] Handler error:', handlerErr);
      }
    });

    // 2. Unhandled Promise Rejections (e.g. Supabase, fetch timeouts, throttled connections)
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason;
        const reasonStr = String(reason?.message || reason || '');

        const isNetworkRejection =
          reasonStr.includes('ERR_NETWORK_CHANGED') ||
          reasonStr.includes('Failed to fetch') ||
          reasonStr.includes('NetworkError') ||
          reasonStr.includes('ERR_INTERNET_DISCONNECTED') ||
          reasonStr.includes('The user aborted a request');

        if (isNetworkRejection) {
          console.warn('[GlobalErrorInterceptor] Handled transient network rejection gracefully:', reasonStr);
          event.preventDefault(); // Prevent browser console uncaught error flooding
          return;
        }

        const errorObj = reason instanceof Error ? reason : new Error(String(reason));

        ErrorReferenceService.recordError(
          errorObj,
          'ASYNC_PROMISE',
          'Unhandled Async Promise Rejection',
          { rawReason: typeof reason === 'object' ? JSON.stringify(reason) : String(reason) }
        );
      } catch (handlerErr) {
        console.error('[GlobalErrorInterceptor] Unhandled rejection handler error:', handlerErr);
      }
    });

    // 3. Online/Offline Network Mesh Listeners
    window.addEventListener('online', () => {
      console.log('[GlobalErrorInterceptor] SaaS Network Mesh: Connection restored. System online.');
    });

    window.addEventListener('offline', () => {
      console.warn('[GlobalErrorInterceptor] SaaS Network Mesh: Connection lost. Switched to offline resilience mode.');
    });

    ObservabilityLogger.app('INTERCEPTOR_INIT', 'Global error and rejection interceptor active', {
      timestamp: new Date().toISOString(),
    });
  }
}
