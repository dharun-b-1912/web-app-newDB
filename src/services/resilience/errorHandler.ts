// src/services/resilience/errorHandler.ts
// ============================================================================
// JOY PeopleHR — Controlled Enterprise Error Handler
// Structured Codes • Zero Secret Leakage • Sanitized Client Responses
// ============================================================================

import { generateRequestId } from './requestContext';

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'DEVICE_OFFLINE'
  | 'SYNC_FAILED'
  | 'PROCESSING_FAILED';

export interface SanitizedAppError {
  code: AppErrorCode;
  message: string;
  requestId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export class AppException extends Error {
  public readonly code: AppErrorCode;
  public readonly requestId: string;
  public readonly details?: Record<string, any>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, any>, requestId?: string) {
    super(message);
    this.name = 'AppException';
    this.code = code;
    this.requestId = requestId || generateRequestId('err');
    this.details = details;
  }

  toSanitizedResponse(): SanitizedAppError {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      details: this.details,
    };
  }
}

class AppErrorHandler {
  /**
   * Sanitizes any exception into a safe, client-facing error format.
   * Strips database stack traces, Supabase internal error fragments, and credentials.
   */
  handle(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.', requestId?: string): SanitizedAppError {
    const reqId = requestId || generateRequestId('err');

    if (err instanceof AppException) {
      return err.toSanitizedResponse();
    }

    const rawMessage = err instanceof Error ? err.message : String(err);

    // Classify error type safely
    let code: AppErrorCode = 'INTERNAL_ERROR';
    let safeMessage = fallbackMessage;

    if (rawMessage.includes('[FORBIDDEN]') || rawMessage.toLowerCase().includes('cross-tenant') || rawMessage.toLowerCase().includes('unauthorized')) {
      code = 'FORBIDDEN';
      safeMessage = 'You do not have authorization to access this resource.';
    } else if (rawMessage.includes('rate limit') || rawMessage.includes('429')) {
      code = 'RATE_LIMITED';
      safeMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (rawMessage.includes('timeout') || rawMessage.includes('ETIMEDOUT') || rawMessage.includes('ECONNREFUSED')) {
      code = 'TIMEOUT';
      safeMessage = 'The remote service or device did not respond in time.';
    } else if (rawMessage.includes('conflict') || rawMessage.includes('duplicate') || rawMessage.includes('unique constraint')) {
      code = 'CONFLICT';
      safeMessage = 'A duplicate record or conflicting operation was detected.';
    } else if (rawMessage.includes('not found') || rawMessage.includes('404')) {
      code = 'NOT_FOUND';
      safeMessage = 'The requested resource could not be found.';
    }

    // Log internal error without exposing secrets
    console.error(`[AppErrorHandler][${reqId}] ${code}: ${rawMessage}`);

    return {
      code,
      message: safeMessage,
      requestId: reqId,
      timestamp: new Date().toISOString(),
    };
  }
}

export const appErrorHandler = new AppErrorHandler();
