// src/services/__tests__/enterpriseResilienceAndRateLimit.test.ts
// ============================================================================
// JOY PeopleHR — Resilience, Error Handling & Rate Limiting Test Suite
// Circuit Breaker Transitions • Sliding Window Rate Limiter • Error Sanitization
// ============================================================================

import { describe, it, expect } from 'vitest';
import { rateLimitService } from '../resilience/rateLimitService';
import { circuitBreakerService } from '../resilience/circuitBreakerService';
import { appErrorHandler, AppException } from '../resilience/errorHandler';

describe('Enterprise Resilience & Rate Limiting Suite', () => {
  it('Gate 1: Rate limiter blocks burst traffic exceeding maximum allowed requests', () => {
    const key = `user_rate_test_${Date.now()}`;

    // DEFAULT_API allows 120 req/min; AUTH_ENDPOINTS allows 10 req/min
    for (let i = 0; i < 10; i++) {
      const res = rateLimitService.checkLimit(key, 'AUTH_ENDPOINTS');
      expect(res.allowed).toBe(true);
    }

    // 11th request must be rejected
    const blockedRes = rateLimitService.checkLimit(key, 'AUTH_ENDPOINTS');
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    expect(() => {
      rateLimitService.assertAllowed(key, 'AUTH_ENDPOINTS');
    }).toThrow(/Rate limit exceeded/);
  });

  it('Gate 2: Circuit breaker transitions to OPEN after consecutive dependency failures', () => {
    const serviceKey = `device_conn_test_${Date.now()}`;

    expect(circuitBreakerService.canExecute(serviceKey)).toBe(true);

    // Record 3 consecutive failures
    circuitBreakerService.recordFailure(serviceKey);
    circuitBreakerService.recordFailure(serviceKey);
    circuitBreakerService.recordFailure(serviceKey);

    const status = circuitBreakerService.getStatus(serviceKey);
    expect(status.state).toBe('OPEN');
    expect(circuitBreakerService.canExecute(serviceKey)).toBe(false);
  });

  it('Gate 3: Error handler sanitizes internal exceptions and attaches Request ID without leaking secrets', () => {
    const internalDbError = new Error('FATAL: password authentication failed for user "postgres" on host 10.0.0.1');

    const sanitized = appErrorHandler.handle(internalDbError, 'Database query failed.', 'req_test_001');

    expect(sanitized.code).toBe('INTERNAL_ERROR');
    expect(sanitized.requestId).toBe('req_test_001');
    expect(sanitized.message).not.toContain('postgres');
    expect(sanitized.message).not.toContain('10.0.0.1');
    expect(sanitized.message).toBe('Database query failed.');
  });

  it('Gate 4: AppException preserves custom error code and sanitized details', () => {
    const appEx = new AppException('DEVICE_OFFLINE', 'The biometric terminal at 192.168.1.201 is offline.', {
      deviceIp: '192.168.1.201',
      devicePort: 4370,
    });

    const sanitized = appErrorHandler.handle(appEx);
    expect(sanitized.code).toBe('DEVICE_OFFLINE');
    expect(sanitized.message).toContain('192.168.1.201 is offline');
    expect(sanitized.details?.devicePort).toBe(4370);
  });
});
