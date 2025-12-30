/**
 * Validation utilities for form inputs
 */

/**
 * Email validation regex - RFC 5322 compliant (simplified)
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns true if valid (contains only digits, spaces, hyphens, parentheses, and plus)
 */
export function isValidPhone(phone: string): boolean {
  // Allow digits, +, spaces, hyphens, and parentheses
  const phoneRegex = /^[\d+\s()-]+$/;
  return phoneRegex.test(phone) && phone.replace(/[\s()-]/g, '').length >= 6;
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize phone number input - remove invalid characters
 * @param phone - Raw phone input
 * @returns Sanitized phone number
 */
export function sanitizePhoneInput(phone: string): string {
  return phone.replace(/[^\d+\s()-]/g, '');
}

/**
 * Validate string length
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns true if within range, false otherwise
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Validate required field (not empty)
 * @param value - Value to check
 * @returns true if not empty, false otherwise
 */
export function isRequired(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}
