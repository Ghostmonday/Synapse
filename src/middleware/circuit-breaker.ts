/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

import { logError, logInfo, logWarning } from '../shared/logger.js';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Service is failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  timeout: number; // Time in ms before attempting half-open
  resetTimeout: number; // Time in ms before resetting failure count
  monitoringPeriod: number; // Time window for failure counting
}

const defaultOptions: CircuitBreakerOptions = {
  failureThreshold: 5,
  timeout: 60000, // 1 minute
  resetTimeout: 300000, // 5 minutes
  monitoringPeriod: 60000, // 1 minute
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private lastFailureTime: number = 0;
  private failureTimes: number[] = [];
  private options: CircuitBreakerOptions;

  constructor(
    private name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<T>(serviceFn: () => Promise<T>): Promise<T> {
    // Check if we should transition to half-open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Service unavailable.`);
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logInfo(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
    }

    // Clean old failure times
    const now = Date.now();
    this.failureTimes = this.failureTimes.filter(
      (time) => now - time < this.options.monitoringPeriod
    );

    try {
      const result = await serviceFn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.failureTimes = [];

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      // If we get enough successes in half-open, close the circuit
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        logInfo(`Circuit breaker ${this.name} recovered and is now CLOSED`);
      }
    } else {
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failureTimes.push(now);
    this.lastFailureTime = now;
    this.failureCount = this.failureTimes.length;

    if (this.state === CircuitState.HALF_OPEN) {
      // If we fail in half-open, immediately open again
      this.state = CircuitState.OPEN;
      this.nextAttempt = now + this.options.timeout;
      logWarning(`Circuit breaker ${this.name} failed in HALF_OPEN, reopening`);
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = now + this.options.timeout;
      logError(`Circuit breaker ${this.name} opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failureTimes = [];
    this.nextAttempt = Date.now();
    logInfo(`Circuit breaker ${this.name} manually reset`);
  }
}

// Create circuit breakers for different services
export const supabaseCircuitBreaker = new CircuitBreaker('supabase', {
  failureThreshold: 5,
  timeout: 30000, // 30 seconds
});

export const redisCircuitBreaker = new CircuitBreaker('redis', {
  failureThreshold: 3,
  timeout: 10000, // 10 seconds
});

export const s3CircuitBreaker = new CircuitBreaker('s3', {
  failureThreshold: 5,
  timeout: 60000, // 1 minute
});

