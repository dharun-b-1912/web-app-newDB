// src/services/resilience/circuitBreakerService.ts
// ============================================================================
// JOY PeopleHR — Hardware & Remote Dependency Circuit Breaker
// CLOSED • OPEN • HALF-OPEN State Machine • Exponential Backoff & Jitter
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of consecutive failures to trip
  resetTimeoutMs: number;        // Time in OPEN state before attempting HALF-OPEN
  halfOpenSuccessThreshold: number; // Successful probes needed to close
}

export interface CircuitStatus {
  serviceKey: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30 * 1000, // 30 seconds
  halfOpenSuccessThreshold: 2,
};

class CircuitBreakerService {
  private circuits: Map<string, CircuitStatus> = new Map();

  private getCircuit(serviceKey: string): CircuitStatus {
    let circuit = this.circuits.get(serviceKey);
    if (!circuit) {
      circuit = {
        serviceKey,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
      };
      this.circuits.set(serviceKey, circuit);
    }
    return circuit;
  }

  /**
   * Evaluates if execution is permitted through the circuit.
   */
  canExecute(serviceKey: string, config = DEFAULT_CONFIG): boolean {
    const circuit = this.getCircuit(serviceKey);
    const now = Date.now();

    if (circuit.state === 'CLOSED') {
      return true;
    }

    if (circuit.state === 'OPEN') {
      if (circuit.nextAttemptTime && now >= circuit.nextAttemptTime) {
        circuit.state = 'HALF_OPEN';
        circuit.successCount = 0;
        return true;
      }
      return false;
    }

    if (circuit.state === 'HALF_OPEN') {
      return true;
    }

    return true;
  }

  /**
   * Records a successful execution.
   */
  recordSuccess(serviceKey: string, config = DEFAULT_CONFIG): void {
    const circuit = this.getCircuit(serviceKey);
    if (circuit.state === 'HALF_OPEN') {
      circuit.successCount += 1;
      if (circuit.successCount >= config.halfOpenSuccessThreshold) {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        circuit.successCount = 0;
      }
    } else if (circuit.state === 'CLOSED') {
      circuit.failureCount = 0;
    }
  }

  /**
   * Records a failed execution.
   */
  recordFailure(serviceKey: string, config = DEFAULT_CONFIG): void {
    const circuit = this.getCircuit(serviceKey);
    const now = Date.now();

    circuit.failureCount += 1;
    circuit.lastFailureTime = now;

    if (circuit.state === 'CLOSED' && circuit.failureCount >= config.failureThreshold) {
      circuit.state = 'OPEN';
      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 1000);
      circuit.nextAttemptTime = now + config.resetTimeoutMs + jitter;
    } else if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = now + config.resetTimeoutMs * 2;
    }
  }

  getStatus(serviceKey: string): CircuitStatus {
    return { ...this.getCircuit(serviceKey) };
  }
}

export const circuitBreakerService = new CircuitBreakerService();
