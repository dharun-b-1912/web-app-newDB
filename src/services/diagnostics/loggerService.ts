// ============================================================
// Joy PeopleHR — Structured Diagnostic Logger Service
// ============================================================
// Standardized structured logging across Web, Database, Realtime, and Flutter
// Implements PII redaction and ring-buffer event stream for diagnostics
// ============================================================

import { CorrelationService } from './correlationService';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogLayer = 'WEB' | 'DB' | 'REALTIME' | 'FLUTTER' | 'SYNC' | 'AUTH' | 'STORAGE' | 'SYSTEM';

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  layer: LogLayer;
  action: string;
  correlationId: string;
  tenantId?: string;
  organizationId?: string;
  employeeId?: string;
  table?: string;
  operation?: string;
  status?: string;
  rows?: number;
  message?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  error?: any;
}

const MAX_RING_BUFFER = 250;
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'otp',
  'token',
  'access_token',
  'refresh_token',
  'service_role',
  'service_role_key',
  'anon_key',
  'secret',
  'aadhaar',
  'aadhaar_number',
  'pan',
  'pan_number',
  'bank_account_number',
  'account_number',
  'salary',
  'ctc',
  'basic_salary',
]);

export class LoggerService {
  private static buffer: StructuredLogEntry[] = [];
  private static listeners: Set<(entry: StructuredLogEntry) => void> = new Set();
  private static isDebugMode: boolean = true;

  /**
   * Deeply redact sensitive PII fields
   */
  public static redactSensitive(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.redactSensitive(item));

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lower)) {
        sanitized[key] = typeof value === 'string' && value.length > 4 
          ? `***MASKED(${value.slice(-4)})***` 
          : '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.redactSensitive(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Log an entry across console and diagnostic buffer
   */
  public static log(entry: Omit<StructuredLogEntry, 'id' | 'timestamp' | 'correlationId'> & { correlationId?: string }): StructuredLogEntry {
    const correlationId = entry.correlationId || CorrelationService.get();
    const fullEntry: StructuredLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      correlationId,
      metadata: entry.metadata ? this.redactSensitive(entry.metadata) : undefined,
    };

    // Maintain in-memory ring buffer
    this.buffer.push(fullEntry);
    if (this.buffer.length > MAX_RING_BUFFER) {
      this.buffer.shift();
    }

    // Format console output
    this.outputConsole(fullEntry);

    // Notify active diagnostic subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(fullEntry);
      } catch (_) {}
    });

    return fullEntry;
  }

  private static outputConsole(e: StructuredLogEntry): void {
    const tag = `[WF][${e.layer}][${e.action}]`;
    const parts: string[] = [
      tag,
      `correlation=${e.correlationId}`,
    ];

    if (e.tenantId) parts.push(`tenant=${e.tenantId}`);
    if (e.organizationId) parts.push(`org=${e.organizationId}`);
    if (e.employeeId) parts.push(`employee=${e.employeeId}`);
    if (e.table) parts.push(`table=${e.table}`);
    if (e.operation) parts.push(`operation=${e.operation}`);
    if (e.status) parts.push(`status=${e.status}`);
    if (e.rows !== undefined) parts.push(`rows=${e.rows}`);
    if (e.durationMs !== undefined) parts.push(`duration=${e.durationMs}ms`);
    if (e.message) parts.push(`msg="${e.message}"`);

    const formatted = parts.join(' ');

    switch (e.level) {
      case 'CRITICAL':
      case 'ERROR':
        console.error(formatted, e.error || e.metadata || '');
        break;
      case 'WARN':
        console.warn(formatted, e.metadata || '');
        break;
      case 'DEBUG':
        if (this.isDebugMode) console.debug(formatted, e.metadata || '');
        break;
      case 'INFO':
      default:
        console.log(formatted, e.metadata ? e.metadata : '');
        break;
    }
  }

  // --- Convenience Layer Helpers ---

  public static web(action: string, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ level: 'INFO', layer: 'WEB', action, ...data });
  }

  public static db(action: string, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ level: 'INFO', layer: 'DB', action, ...data });
  }

  public static realtime(action: string, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ level: 'INFO', layer: 'REALTIME', action, ...data });
  }

  public static sync(action: string, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ level: 'INFO', layer: 'SYNC', action, ...data });
  }

  public static flutter(action: string, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ level: 'INFO', layer: 'FLUTTER', action, ...data });
  }

  public static error(layer: LogLayer, action: string, error: any, data: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({
      level: 'ERROR',
      layer,
      action,
      error: error?.message || error,
      status: 'FAILED',
      ...data,
    });
  }

  public static getLogs(): StructuredLogEntry[] {
    return [...this.buffer];
  }

  public static clearLogs(): void {
    this.buffer = [];
  }

  public static subscribe(listener: (entry: StructuredLogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const logger = LoggerService;
