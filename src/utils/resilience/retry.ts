/**
 * Retry Utility
 * 
 * WHY: Reusable retry logic với exponential backoff
 * - Configurable max retries
 * - Exponential backoff
 * - Retry condition checking
 * - Error classification
 */

import { logger } from '../../infrastructure/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: Array<string | RegExp>;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, retryableErrors?: Array<string | RegExp>): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    // Default: retry on network errors, timeouts, rate limits
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502')
    );
  }

  const errorMessage = error.message.toLowerCase();
  return retryableErrors.some((pattern) => {
    if (typeof pattern === 'string') {
      return errorMessage.includes(pattern.toLowerCase());
    }
    return pattern.test(errorMessage);
  });
}

/**
 * Calculate delay với exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelayMs);
}

/**
 * Retry function với exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const shouldRetry = isRetryableError(errorObj, opts.retryableErrors);

      if (!shouldRetry || attempt >= opts.maxRetries) {
        // Don't retry hoặc đã hết retries
        if (attempt >= opts.maxRetries) {
          logger.warn(`Max retries (${opts.maxRetries}) reached`, {
            error: errorObj.message,
            attempts: attempt + 1,
          });
        }
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      // Call onRetry callback
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, errorObj);
      } else {
        logger.warn(`Retrying (attempt ${attempt + 1}/${opts.maxRetries + 1}) after ${delay}ms`, {
          error: errorObj.message,
        });
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

