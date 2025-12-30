/**
 * Retry Utility with Exponential Backoff
 * Provides configurable retry logic for API calls and async operations
 */

import { logger } from "./logger";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff
 * @param attempt - Current attempt number (0-indexed)
 * @param options - Retry options
 */
const calculateDelay = (attempt: number, options: Required<RetryOptions>): number => {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelayMs);
};

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.shouldRetry(error)) {
        logger.warn('Retry aborted: shouldRetry returned false', { error });
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt === opts.maxAttempts - 1) {
        break;
      }

      const delay = calculateDelay(attempt, opts);
      logger.info(`Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      opts.onRetry(attempt + 1, error);
      await sleep(delay);
    }
  }

  logger.error('All retry attempts failed', { lastError });
  throw lastError;
}

/**
 * Determine if an error is retryable (network errors, 5xx, timeouts)
 * @param error - The error to check
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 5xx server errors and 429 rate limiting
    return status >= 500 || status === 429;
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Create a retry function with preset options
 * @param options - Default retry options
 */
export function createRetryFn(options: RetryOptions = {}) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, options);
}
