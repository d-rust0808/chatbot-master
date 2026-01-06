/**
 * Circuit Breaker Pattern
 * 
 * WHY: Prevent cascading failures
 * - Open circuit khi có quá nhiều failures
 * - Half-open để test recovery
 * - Closed khi hoạt động bình thường
 */

import { logger } from '../infrastructure/logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Số failures trước khi open
  resetTimeoutMs?: number; // Thời gian chờ trước khi thử half-open
  monitoringWindowMs?: number; // Time window để đếm failures
}

/**
 * Circuit Breaker States
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit Breaker Implementation
 * WHY: Prevent calling failing services repeatedly
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {}
  ) {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000, // 1 minute
      monitoringWindowMs = 60000, // 1 minute
    } = options;

    this.options = {
      failureThreshold,
      resetTimeoutMs,
      monitoringWindowMs,
    };
  }

  /**
   * Execute function với circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    this.updateState();

    if (this.state === 'open') {
      throw new Error(
        `Circuit breaker ${this.name} is OPEN. Too many failures. Retry after ${new Date(this.nextAttemptTime).toISOString()}`
      );
    }

    try {
      const result = await fn();

      // Success - reset failures nếu đang half-open
      if (this.state === 'half-open') {
        this.reset();
        logger.info(`Circuit breaker ${this.name} recovered, closing circuit`);
      } else {
        // Reset failure count trong monitoring window
        this.resetFailuresIfExpired();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Update circuit state dựa trên time và failures
   */
  private updateState(): void {
    const now = Date.now();

    if (this.state === 'open') {
      // Check if reset timeout has passed
      if (now >= this.nextAttemptTime) {
        this.state = 'half-open';
        logger.info(`Circuit breaker ${this.name} entering HALF-OPEN state`);
      }
    } else if (this.state === 'half-open') {
      // Stay in half-open until success or failure
      // State will be updated in execute()
    } else {
      // Closed state - check if should open
      if (this.failures >= this.options.failureThreshold!) {
        this.state = 'open';
        this.nextAttemptTime = now + this.options.resetTimeoutMs!;
        logger.warn(`Circuit breaker ${this.name} OPENED due to ${this.failures} failures`);
      }
    }
  }

  /**
   * Record failure
   */
  private recordFailure(): void {
    const now = Date.now();

    // Reset failures nếu đã hết monitoring window
    if (now - this.lastFailureTime > this.options.monitoringWindowMs!) {
      this.failures = 0;
    }

    this.failures++;
    this.lastFailureTime = now;

    logger.debug(`Circuit breaker ${this.name} failure recorded`, {
      failures: this.failures,
      threshold: this.options.failureThreshold,
      state: this.state,
    });
  }

  /**
   * Reset circuit breaker
   */
  private reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }

  /**
   * Reset failures nếu đã hết monitoring window
   */
  private resetFailuresIfExpired(): void {
    const now = Date.now();
    if (now - this.lastFailureTime > this.options.monitoringWindowMs!) {
      this.failures = 0;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      failureThreshold: this.options.failureThreshold,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime) : null,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  manualReset(): void {
    this.reset();
    logger.info(`Circuit breaker ${this.name} manually reset`);
  }
}

/**
 * Circuit Breaker Manager
 * WHY: Manage multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.manualReset());
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

