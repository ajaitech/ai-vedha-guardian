/**
 * Subscription Management Constants
 */

// API Key validity period options (in days)
export const VALIDITY_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 12, label: '12 days' },
  { value: 15, label: '15 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days (max)' },
];

// API Key input constraints
export const API_KEY_NAME_MAX_LENGTH = 50;
export const API_KEY_REASON_MAX_LENGTH = 200;

// Rate limiting for API key creation (milliseconds)
export const API_KEY_CREATE_COOLDOWN_MS = 5000; // 5 seconds between creations

// Auto-hide duration for sensitive data display
export const SENSITIVE_DATA_DISPLAY_MS = 60000; // 1 minute

// Toast/notification durations
export const COPY_TOAST_DURATION_MS = 3000;
export const CLIPBOARD_FEEDBACK_DURATION_MS = 2000; // Duration to show "Copied!" feedback

// Navigation delay durations
export const PAYMENT_SUCCESS_REDIRECT_DELAY_MS = 2000; // Delay before redirecting after payment processing
export const AUTH_ERROR_REDIRECT_DELAY_MS = 3000; // Delay before redirecting after auth errors
