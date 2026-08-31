/**
 * Joy PeopleHR — Enterprise Diagnostics, Crash Telemetry & Structured Logger
 * 
 * Provides detailed, real-time diagnostic reporting across Supabase queries,
 * API operations, state transitions, runtime errors, and fallback recovery paths.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRASH' | 'DB_OP';
export type Subsystem =
  | 'AUTH'
  | 'SUPABASE'
  | 'ORGANIZATION'
  | 'BRANCHES'
  | 'DEPARTMENTS'
  | 'WORKFORCE'
  | 'PAYROLL'
  | 'VENDOR_PORTAL'
  | 'COMPLIANCE'
  | 'ROUTING'
  | 'RUNTIME';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  subsystem: Subsystem;
  message: string;
  cause?: string;
  fallbackUsed?: boolean;
  httpStatus?: number;
  payload?: any;
  errorStack?: string;
  route?: string;
}

const MAX_LOGS_IN_MEMORY = 200;
const memoryLogs: LogEntry[] = [];

// Format helper
const getTimestamp = () => new Date().toISOString();

export const appLogger = {
  /**
   * Log normal informational system events
   */
  info(subsystem: Subsystem, message: string, payload?: any) {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: getTimestamp(),
      level: 'INFO',
      subsystem,
      message,
      payload,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    this.recordLog(entry);

    console.log(
      `%c[${entry.timestamp.split('T')[1].slice(0, 8)}] ℹ️ [${subsystem}] ${message}`,
      'color: #3b82f6; font-weight: bold;',
      payload || ''
    );
  },

  /**
   * Log warnings with root cause and fallback status
   */
  warn(subsystem: Subsystem, message: string, cause?: string, fallbackUsed: boolean = true, payload?: any) {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: getTimestamp(),
      level: 'WARN',
      subsystem,
      message,
      cause,
      fallbackUsed,
      payload,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    this.recordLog(entry);

    console.groupCollapsed(
      `%c[${entry.timestamp.split('T')[1].slice(0, 8)}] ⚠️ [${subsystem}] ${message} ${fallbackUsed ? '(FALLBACK ACTIVATED)' : ''}`,
      'color: #f59e0b; font-weight: bold;'
    );
    if (cause) console.warn('Root Cause / Reason:', cause);
    if (fallbackUsed) console.info('Fallback Status: Local Cache & Resilient State Activated');
    if (payload) console.dir(payload);
    console.groupEnd();
  },

  /**
   * Log database queries and Supabase network transactions
   */
  dbOperation(table: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT', payload?: any, error?: any, status?: number) {
    const isError = !!error || (status && status >= 400);
    const subsystem: Subsystem = table.includes('vendor') ? 'VENDOR_PORTAL' : table.includes('branch') ? 'BRANCHES' : table.includes('dept') ? 'DEPARTMENTS' : 'SUPABASE';
    
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: getTimestamp(),
      level: isError ? 'ERROR' : 'DB_OP',
      subsystem,
      message: `${operation} table "${table}" ${isError ? `FAILED (HTTP ${status || 'ERR'})` : 'SUCCESS'}`,
      httpStatus: status,
      payload,
      cause: error ? (typeof error === 'string' ? error : error.message || JSON.stringify(error)) : undefined,
      fallbackUsed: isError,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    this.recordLog(entry);

    if (isError) {
      console.group(
        `%c[${entry.timestamp.split('T')[1].slice(0, 8)}] ❌ [DB ERROR] ${operation} "${table}" Failed (HTTP ${status || 400})`,
        'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;'
      );
      console.error('Error Details:', error);
      if (payload) console.log('Attempted Payload:', payload);
      console.info('Diagnostics: Check table columns & RLS policy in Supabase migration.');
      console.groupEnd();
    } else {
      console.log(
        `%c[${entry.timestamp.split('T')[1].slice(0, 8)}] 🗄️ [DB OK] ${operation} "${table}"`,
        'color: #10b981; font-weight: bold;',
        payload || ''
      );
    }
  },

  /**
   * Log severe errors and API rejections
   */
  error(subsystem: Subsystem, message: string, error?: any, context?: any) {
    const errorMsg = error ? (typeof error === 'string' ? error : error.message || JSON.stringify(error)) : 'Unknown runtime error';
    const errorStack = error && error.stack ? error.stack : new Error().stack;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: getTimestamp(),
      level: 'ERROR',
      subsystem,
      message,
      cause: errorMsg,
      errorStack,
      payload: context,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    this.recordLog(entry);

    console.group(
      `%c[${entry.timestamp.split('T')[1].slice(0, 8)}] 🔥 [${subsystem}] ${message}`,
      'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;'
    );
    console.error('Root Cause:', errorMsg);
    if (context) console.log('Context / State:', context);
    if (errorStack) console.log('Stack Trace:', errorStack);
    console.groupEnd();
  },

  /**
   * Log critical application crash or unhandled promise rejection
   */
  crash(message: string, error?: any) {
    const errorMsg = error ? (typeof error === 'string' ? error : error.message || JSON.stringify(error)) : 'Critical application crash';
    const errorStack = error && error.stack ? error.stack : new Error().stack;

    const entry: LogEntry = {
      id: `crash-${Date.now()}`,
      timestamp: getTimestamp(),
      level: 'CRASH',
      subsystem: 'RUNTIME',
      message: `CRASH DETECTED: ${message}`,
      cause: errorMsg,
      errorStack,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    };
    this.recordLog(entry);

    console.error(
      `%c🚨 [CRITICAL APPLICATION CRASH] 🚨\nMessage: ${message}\nCause: ${errorMsg}\nStack:\n${errorStack}`,
      'color: white; background: #991b1b; font-size: 13px; font-weight: bold; padding: 6px;'
    );
  },

  recordLog(entry: LogEntry) {
    memoryLogs.unshift(entry);
    if (memoryLogs.length > MAX_LOGS_IN_MEMORY) {
      memoryLogs.pop();
    }
    // Expose in global window for devtools / terminal inspection
    if (typeof window !== 'undefined') {
      (window as any).__APP_LOGS__ = memoryLogs;
      (window as any).__LATEST_LOG__ = entry;
      window.dispatchEvent(new CustomEvent('wf-app-log', { detail: entry }));
    }
  },

  getRecentLogs(): LogEntry[] {
    return [...memoryLogs];
  },

  exportDiagnosticReport(): string {
    const report = {
      generatedAt: getTimestamp(),
      environment: (import.meta as any).env?.MODE || 'production',
      currentRoute: typeof window !== 'undefined' ? window.location.href : '',
      supabaseConnected: true,
      totalLogsRecorded: memoryLogs.length,
      errorsCount: memoryLogs.filter(l => l.level === 'ERROR' || l.level === 'CRASH').length,
      warningsCount: memoryLogs.filter(l => l.level === 'WARN').length,
      logs: memoryLogs,
    };
    return JSON.stringify(report, null, 2);
  },
};

// Global unhandled runtime error capture
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    appLogger.crash(`Uncaught Exception: ${event.message} at ${event.filename}:${event.lineno}`, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    appLogger.crash(`Unhandled Promise Rejection: ${event.reason}`, event.reason);
  });
}
