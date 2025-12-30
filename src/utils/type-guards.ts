/**
 * Type Guards and Type Utilities
 * Reusable type checking functions to replace unsafe `as any` assertions
 */

/**
 * Check if an error is an AbortError
 */
export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

/**
 * Interface for errors with a message property
 */
export interface ErrorWithMessage {
  message?: string;
  error?: string;
}

/**
 * Type guard to check if error has a message property
 */
export const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return typeof error === 'object' && error !== null && ('message' in error || 'error' in error);
};

/**
 * Safely extract error message from unknown error
 */
export const getErrorMessage = (error: unknown): string => {
  if (isErrorWithMessage(error)) {
    return error.message || error.error || 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An error occurred';
};

/**
 * Interface for objects with a name property
 */
export interface HasName {
  name: string;
}

/**
 * Type guard to check if value has a name property
 */
export const hasName = (value: unknown): value is HasName => {
  return typeof value === 'object' && value !== null && 'name' in value && typeof (value as any).name === 'string';
};

/**
 * Interface for objects with a status property
 */
export interface HasStatus {
  status?: number | string;
}

/**
 * Type guard to check if value has a status property
 */
export const hasStatus = (value: unknown): value is HasStatus => {
  return typeof value === 'object' && value !== null && 'status' in value;
};

/**
 * Safely get property from unknown object
 */
export const getProperty = <T = unknown>(obj: unknown, key: string): T | undefined => {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    return (obj as Record<string, unknown>)[key] as T;
  }
  return undefined;
};
