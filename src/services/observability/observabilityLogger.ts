// ============================================================
// Joy PeopleHR — Multi-Stream Observability Logger
// ============================================================
// Supports 10 specialized log streams and 5 standard log levels:
// DEBUG, INFO, WARN, ERROR, FATAL
// Redacts all sensitive PII and attaches multi-tenant trace context.
// ============================================================

import { PiiScrubber } from './piiScrubber';
import { TraceManager, TraceContext } from './traceManager';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type LogStream =
  | 'APPLICATION'
  | 'ERROR_CRASH'
  | 'SECURITY'
  | 'AUDIT'
  | 'PERFORMANCE'
  | 'API'
  | 'DATABASE'
  | 'BACKGROUND_JOB'
  | 'INTEGRATION'
  | 'BUSINESS_EVENT';

export interface StructuredTelemetryEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  stream: LogStream;
  action: string;
  module: string;
  message: string;
  referenceId?: string;
  traceContext: TraceContext;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
  fingerprint?: string;
}

const MAX_LOG_BUFFER_SIZE = 1000;

export class ObservabilityLogger {
  private static buffer: StructuredTelemetryEntry[] = [];
  private static listeners: Set<(entry: StructuredTelemetryEntry) => void> = new Set();
  private static isDev = Boolean(
    typeof window !== 'undefined' && (import.meta as any).env?.DEV
  );

  /**
   * Log an event across specified stream and level
   */
  public static log(
    stream: LogStream,
    level: LogLevel,
    action: string,
    message: string,
    details: {
      module?: string;
      durationMs?: number;
      metadata?: Record<string, any>;
      error?: any;
      referenceId?: string;
      overrideContext?: Partial<TraceContext>;
    } = {}
  ): StructuredTelemetryEntry {
    const context = {
      ...TraceManager.getContext(),
      ...(details.module ? { module: details.module } : {}),
      ...(details.overrideContext || {}),
    };

    let processedError: any = undefined;
    if (details.error) {
      if (details.error instanceof Error) {
        processedError = {
          name: details.error.name,
          message: PiiScrubber.sanitizeString(details.error.message),
          stack: PiiScrubber.sanitizeString(details.error.stack || ''),
          code: (details.error as any).code,
        };
      } else if (typeof details.error === 'object') {
        processedError = PiiScrubber.scrub(details.error);
      } else {
        processedError = { message: String(details.error) };
      }
    }

    const entry: StructuredTelemetryEntry = {
      id: `tel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      stream,
      action,
      module: context.module || 'CORE',
      message: PiiScrubber.sanitizeString(message),
      referenceId: details.referenceId,
      traceContext: context,
      durationMs: details.durationMs,
      metadata: details.metadata ? PiiScrubber.scrub(details.metadata) : undefined,
      error: processedError,
    };

    // Store in ring buffer
    this.buffer.unshift(entry);
    if (this.buffer.length > MAX_LOG_BUFFER_SIZE) {
      this.buffer.pop();
    }

    // Securely persist to Dual Ingestion Bridge (DB + Resilient Local Store)
    import('./telemetryIngestionBridge').then(({ TelemetryIngestionBridge }) => {
      TelemetryIngestionBridge.ingest(entry, (details as any).isSynthetic || false);
    }).catch(() => {});

    // Output to console in development
    if (this.isDev) {
      this.outputConsole(entry);
    }

    // Dispatch to registered platform subscribers (UI, Sentry / Ingestion endpoint)
    this.notifyListeners(entry);

    return entry;
  }

  // --- Convenience Stream Loggers ---

  public static app(action: string, message: string, meta?: Record<string, any>, module?: string) {
    return this.log('APPLICATION', 'INFO', action, message, { metadata: meta, module });
  }

  public static debug(action: string, message: string, meta?: Record<string, any>, module?: string) {
    return this.log('APPLICATION', 'DEBUG', action, message, { metadata: meta, module });
  }

  public static warn(action: string, message: string, meta?: Record<string, any>, module?: string) {
    return this.log('APPLICATION', 'WARN', action, message, { metadata: meta, module });
  }

  public static error(action: string, message: string, error?: any, meta?: Record<string, any>, module?: string) {
    return this.log('ERROR_CRASH', 'ERROR', action, message, { error, metadata: meta, module });
  }

  public static fatal(action: string, message: string, error?: any, meta?: Record<string, any>, module?: string) {
    return this.log('ERROR_CRASH', 'FATAL', action, message, { error, metadata: meta, module });
  }

  public static security(action: string, message: string, level: LogLevel = 'WARN', meta?: Record<string, any>) {
    return this.log('SECURITY', level, action, message, { metadata: meta, module: 'SECURITY' });
  }

  public static audit(action: string, message: string, meta?: Record<string, any>, module?: string) {
    return this.log('AUDIT', 'INFO', action, message, { metadata: meta, module });
  }

  public static api(action: string, message: string, durationMs: number, statusCode: number, meta?: Record<string, any>, module?: string) {
    const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    return this.log('API', level, action, message, {
      durationMs,
      metadata: { statusCode, ...meta },
      module,
    });
  }

  public static database(action: string, message: string, durationMs: number, meta?: Record<string, any>, error?: any) {
    const level: LogLevel = error ? 'ERROR' : durationMs > 500 ? 'WARN' : 'INFO';
    return this.log('DATABASE', level, action, message, { durationMs, metadata: meta, error, module: 'DATABASE' });
  }

  public static backgroundJob(jobName: string, status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING', meta?: Record<string, any>, error?: any) {
    const level: LogLevel = status === 'FAILED' ? 'ERROR' : status === 'RETRYING' ? 'WARN' : 'INFO';
    return this.log('BACKGROUND_JOB', level, jobName, `Job ${jobName} is ${status}`, { metadata: { status, ...meta }, error, module: 'JOBS' });
  }

  public static integration(integrationName: string, status: 'HEALTHY' | 'DELAYED' | 'FAILED', message: string, meta?: Record<string, any>, error?: any) {
    const level: LogLevel = status === 'FAILED' ? 'ERROR' : status === 'DELAYED' ? 'WARN' : 'INFO';
    return this.log('INTEGRATION', level, integrationName, message, { metadata: { integrationStatus: status, ...meta }, error, module: 'INTEGRATIONS' });
  }

  public static businessEvent(eventName: string, message: string, meta?: Record<string, any>, isAnomaly = false) {
    const level: LogLevel = isAnomaly ? 'WARN' : 'INFO';
    return this.log('BUSINESS_EVENT', level, eventName, message, { metadata: { isAnomaly, ...meta }, module: 'BUSINESS_LOGIC' });
  }

  // --- Buffer and Subscription APIs ---

  public static getEntries(): StructuredTelemetryEntry[] {
    return [...this.buffer];
  }

  public static clear(): void {
    this.buffer = [];
  }

  public static subscribe(listener: (entry: StructuredTelemetryEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(entry: StructuredTelemetryEntry) {
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Error notifying telemetry listener:', err);
      }
    });
  }

  private static outputConsole(e: StructuredTelemetryEntry): void {
    const prefix = `[JoyOps][${e.stream}][${e.level}][${e.module}]`;
    const traceInfo = `(trace=${e.traceContext.traceId}, tenant=${e.traceContext.tenantId})`;
    const fullMsg = `${prefix} ${e.action}: ${e.message} ${traceInfo}`;

    if (e.level === 'FATAL' || e.level === 'ERROR') {
      console.error(fullMsg, e.error || e.metadata || '');
    } else if (e.level === 'WARN') {
      console.warn(fullMsg, e.metadata || '');
    } else if (e.level === 'DEBUG') {
      console.debug(fullMsg, e.metadata || '');
    } else {
      console.log(fullMsg, e.metadata || '');
    }
  }
}
