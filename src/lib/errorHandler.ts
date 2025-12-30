/**
 * AiVedha Guardian - Professional Error Handler
 * Centralized error handling with user-friendly messages
 *
 * Features:
 * - Error classification and categorization
 * - User-friendly error messages
 * - Error logging and tracking
 * - Recovery suggestions
 */

import { logger } from './logger';
import { APP_CONFIG } from '@/config';

// Error categories
export type ErrorCategory =
  | 'NETWORK'
  | 'API'
  | 'AUTH'
  | 'VALIDATION'
  | 'PAYMENT'
  | 'SUBSCRIPTION'
  | 'AUDIT'
  | 'RATE_LIMIT'
  | 'UNKNOWN';

// Error severity levels
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Structured error interface
export interface AppError {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  suggestion: string;
  retryable: boolean;
  originalError?: Error | unknown;
  context?: Record<string, unknown>;
}

// Error code definitions
const ERROR_DEFINITIONS: Record<string, Omit<AppError, 'originalError' | 'context'>> = {
  // Network Errors
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    category: 'NETWORK',
    severity: 'MEDIUM',
    message: 'No internet connection',
    userMessage: 'You appear to be offline',
    suggestion: 'Please check your internet connection and try again',
    retryable: true,
  },
  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    category: 'NETWORK',
    severity: 'MEDIUM',
    message: 'Request timeout',
    userMessage: 'The request took too long',
    suggestion: 'Please try again. If the problem persists, the server may be busy.',
    retryable: true,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    category: 'NETWORK',
    severity: 'MEDIUM',
    message: 'Network request failed',
    userMessage: 'Unable to connect to the server',
    suggestion: 'Please check your connection and try again',
    retryable: true,
  },

  // API Errors
  API_ERROR: {
    code: 'API_ERROR',
    category: 'API',
    severity: 'MEDIUM',
    message: 'API request failed',
    userMessage: 'Something went wrong',
    suggestion: 'Please try again. If the problem persists, contact support.',
    retryable: true,
  },
  API_SERVER_ERROR: {
    code: 'API_SERVER_ERROR',
    category: 'API',
    severity: 'HIGH',
    message: 'Server error',
    userMessage: 'Our servers are experiencing issues',
    suggestion: 'Please try again in a few minutes',
    retryable: true,
  },
  API_BAD_REQUEST: {
    code: 'API_BAD_REQUEST',
    category: 'API',
    severity: 'LOW',
    message: 'Invalid request',
    userMessage: 'The request was invalid',
    suggestion: 'Please check your input and try again',
    retryable: false,
  },
  API_NOT_FOUND: {
    code: 'API_NOT_FOUND',
    category: 'API',
    severity: 'LOW',
    message: 'Resource not found',
    userMessage: 'The requested resource was not found',
    suggestion: 'The item may have been removed or the URL is incorrect',
    retryable: false,
  },

  // Auth Errors
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    category: 'AUTH',
    severity: 'LOW',
    message: 'Authentication required',
    userMessage: 'Please sign in to continue',
    suggestion: 'Sign in with your Google or GitHub account',
    retryable: false,
  },
  AUTH_EXPIRED: {
    code: 'AUTH_EXPIRED',
    category: 'AUTH',
    severity: 'LOW',
    message: 'Session expired',
    userMessage: 'Your session has expired',
    suggestion: 'Please sign in again to continue',
    retryable: false,
  },
  AUTH_INVALID: {
    code: 'AUTH_INVALID',
    category: 'AUTH',
    severity: 'MEDIUM',
    message: 'Invalid authentication',
    userMessage: 'Your credentials are invalid',
    suggestion: 'Please sign in again',
    retryable: false,
  },

  // Payment Errors
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    category: 'PAYMENT',
    severity: 'MEDIUM',
    message: 'Payment failed',
    userMessage: 'Your payment could not be processed',
    suggestion: 'Please check your payment details and try again',
    retryable: true,
  },
  PAYMENT_CANCELLED: {
    code: 'PAYMENT_CANCELLED',
    category: 'PAYMENT',
    severity: 'LOW',
    message: 'Payment cancelled',
    userMessage: 'Payment was cancelled',
    suggestion: 'You can try again when ready',
    retryable: true,
  },
  PAYMENT_DECLINED: {
    code: 'PAYMENT_DECLINED',
    category: 'PAYMENT',
    severity: 'MEDIUM',
    message: 'Payment declined',
    userMessage: 'Your payment was declined',
    suggestion: 'Please try a different payment method',
    retryable: true,
  },

  // Subscription Errors
  SUBSCRIPTION_REQUIRED: {
    code: 'SUBSCRIPTION_REQUIRED',
    category: 'SUBSCRIPTION',
    severity: 'LOW',
    message: 'Subscription required',
    userMessage: 'This feature requires an active subscription',
    suggestion: 'Upgrade to a paid plan to access this feature',
    retryable: false,
  },
  SUBSCRIPTION_EXPIRED: {
    code: 'SUBSCRIPTION_EXPIRED',
    category: 'SUBSCRIPTION',
    severity: 'LOW',
    message: 'Subscription expired',
    userMessage: 'Your subscription has expired',
    suggestion: 'Renew your subscription to continue using this feature',
    retryable: false,
  },
  CREDITS_EXHAUSTED: {
    code: 'CREDITS_EXHAUSTED',
    category: 'SUBSCRIPTION',
    severity: 'LOW',
    message: 'No credits remaining',
    userMessage: 'You have used all your audit credits',
    suggestion: 'Purchase more credits or wait for your monthly reset',
    retryable: false,
  },

  // Audit Errors
  AUDIT_FAILED: {
    code: 'AUDIT_FAILED',
    category: 'AUDIT',
    severity: 'MEDIUM',
    message: 'Audit failed',
    userMessage: 'The security audit could not be completed',
    suggestion: 'The target site may be blocking our scanner. Try whitelisting our IP.',
    retryable: true,
  },
  AUDIT_TIMEOUT: {
    code: 'AUDIT_TIMEOUT',
    category: 'AUDIT',
    severity: 'MEDIUM',
    message: 'Audit timeout',
    userMessage: 'The audit took too long to complete',
    suggestion: 'The site may be slow or unresponsive. Try again later.',
    retryable: true,
  },
  AUDIT_BLOCKED: {
    code: 'AUDIT_BLOCKED',
    category: 'AUDIT',
    severity: 'MEDIUM',
    message: 'Audit blocked',
    userMessage: 'The target site blocked our scanner',
    suggestion: 'Whitelist our static IP in your firewall/WAF',
    retryable: true,
  },
  AUDIT_INVALID_URL: {
    code: 'AUDIT_INVALID_URL',
    category: 'AUDIT',
    severity: 'LOW',
    message: 'Invalid URL',
    userMessage: 'The URL you entered is invalid',
    suggestion: 'Please enter a valid website URL (e.g., https://example.com)',
    retryable: false,
  },

  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    category: 'RATE_LIMIT',
    severity: 'LOW',
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests',
    suggestion: 'Please wait a moment before trying again',
    retryable: true,
  },

  // Unknown Error
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    category: 'UNKNOWN',
    severity: 'MEDIUM',
    message: 'Unknown error',
    userMessage: 'Something unexpected happened',
    suggestion: 'Please try again. If the problem persists, contact ${APP_CONFIG.SUPPORT_EMAIL}',
    retryable: true,
  },
};

/**
 * Parse an error and return a structured AppError
 */
export function parseError(error: unknown, context?: Record<string, unknown>): AppError {
  // Handle null/undefined
  if (!error) {
    return { ...ERROR_DEFINITIONS.UNKNOWN_ERROR, context };
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      if (!navigator.onLine) {
        return { ...ERROR_DEFINITIONS.NETWORK_OFFLINE, originalError: error, context };
      }
      return { ...ERROR_DEFINITIONS.NETWORK_ERROR, originalError: error, context };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return { ...ERROR_DEFINITIONS.NETWORK_TIMEOUT, originalError: error, context };
    }

    // Auth errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return { ...ERROR_DEFINITIONS.AUTH_REQUIRED, originalError: error, context };
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return { ...ERROR_DEFINITIONS.AUTH_INVALID, originalError: error, context };
    }

    // Payment errors
    if (message.includes('payment')) {
      if (message.includes('cancel')) {
        return { ...ERROR_DEFINITIONS.PAYMENT_CANCELLED, originalError: error, context };
      }
      if (message.includes('decline')) {
        return { ...ERROR_DEFINITIONS.PAYMENT_DECLINED, originalError: error, context };
      }
      return { ...ERROR_DEFINITIONS.PAYMENT_FAILED, originalError: error, context };
    }

    // Subscription errors
    if (message.includes('subscription') && message.includes('expire')) {
      return { ...ERROR_DEFINITIONS.SUBSCRIPTION_EXPIRED, originalError: error, context };
    }

    if (message.includes('credit') && (message.includes('insufficient') || message.includes('no credit'))) {
      return { ...ERROR_DEFINITIONS.CREDITS_EXHAUSTED, originalError: error, context };
    }

    // Audit errors
    if (message.includes('audit')) {
      if (message.includes('timeout')) {
        return { ...ERROR_DEFINITIONS.AUDIT_TIMEOUT, originalError: error, context };
      }
      if (message.includes('block')) {
        return { ...ERROR_DEFINITIONS.AUDIT_BLOCKED, originalError: error, context };
      }
      return { ...ERROR_DEFINITIONS.AUDIT_FAILED, originalError: error, context };
    }

    // Rate limit
    if (message.includes('rate limit') || message.includes('too many')) {
      return { ...ERROR_DEFINITIONS.RATE_LIMIT_EXCEEDED, originalError: error, context };
    }

    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return { ...ERROR_DEFINITIONS.API_SERVER_ERROR, originalError: error, context };
    }

    // Not found
    if (message.includes('404') || message.includes('not found')) {
      return { ...ERROR_DEFINITIONS.API_NOT_FOUND, originalError: error, context };
    }
  }

  // Handle API response objects
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Check for error code
    if (errorObj.code && typeof errorObj.code === 'string') {
      const errorDef = ERROR_DEFINITIONS[errorObj.code];
      if (errorDef) {
        return { ...errorDef, originalError: error, context };
      }
    }

    // Check for status code
    if (errorObj.statusCode || errorObj.status) {
      const status = (errorObj.statusCode || errorObj.status) as number;
      if (status === 401) {
        return { ...ERROR_DEFINITIONS.AUTH_REQUIRED, originalError: error, context };
      }
      if (status === 403) {
        return { ...ERROR_DEFINITIONS.AUTH_INVALID, originalError: error, context };
      }
      if (status === 404) {
        return { ...ERROR_DEFINITIONS.API_NOT_FOUND, originalError: error, context };
      }
      if (status === 429) {
        return { ...ERROR_DEFINITIONS.RATE_LIMIT_EXCEEDED, originalError: error, context };
      }
      if (status >= 500) {
        return { ...ERROR_DEFINITIONS.API_SERVER_ERROR, originalError: error, context };
      }
    }
  }

  // Default to unknown error
  return { ...ERROR_DEFINITIONS.UNKNOWN_ERROR, originalError: error, context };
}

/**
 * Log an error with context
 */
export function logError(error: AppError): void {
  const logData = {
    code: error.code,
    category: error.category,
    severity: error.severity,
    message: error.message,
    context: error.context,
    timestamp: new Date().toISOString(),
  };

  // Log based on severity
  switch (error.severity) {
    case 'CRITICAL':
    case 'HIGH':
      logger.error(`[${error.code}] ${error.message}`, logData);
      break;
    case 'MEDIUM':
      logger.warn(`[${error.code}] ${error.message}`, logData);
      break;
    default:
      logger.debug(`[${error.code}] ${error.message}`, logData);
  }
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyError(error: unknown, context?: Record<string, unknown>): {
  title: string;
  description: string;
  suggestion: string;
  retryable: boolean;
} {
  const appError = parseError(error, context);
  logError(appError);

  return {
    title: appError.userMessage,
    description: appError.message,
    suggestion: appError.suggestion,
    retryable: appError.retryable,
  };
}

/**
 * Create an error with a specific code
 */
export function createError(code: keyof typeof ERROR_DEFINITIONS, context?: Record<string, unknown>): AppError {
  const errorDef = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.UNKNOWN_ERROR;
  return { ...errorDef, context };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const appError = parseError(error);
  return appError.retryable;
}

/**
 * Get retry delay for an error (exponential backoff)
 */
export function getRetryDelay(attemptNumber: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
  // Add some jitter
  return delay + Math.random() * 1000;
}
