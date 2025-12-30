/**
 * Unified Badge Styling Utilities
 * Ensures consistent badge appearance across the application
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'UNKNOWN';

export interface SeverityColors {
  bg: string;           // Solid background (e.g., bg-red-600)
  text: string;         // Text color (e.g., text-red-600)
  light: string;        // Light background (e.g., bg-red-600/10)
  border: string;       // Border color (e.g., border-red-600/30)
  badge: string;        // Combined badge classes for light style
  badgeSolid: string;   // Combined badge classes for solid style
}

/**
 * Get consistent severity colors for badges
 * @param severity - The severity level (case-insensitive)
 * @returns Object with all color variants
 */
export const getSeverityColors = (severity: string | null | undefined): SeverityColors => {
  const level = (severity?.toUpperCase() || 'UNKNOWN') as SeverityLevel;

  switch (level) {
    case 'CRITICAL':
      return {
        bg: 'bg-purple-600',
        text: 'text-purple-600',
        light: 'bg-purple-600/10',
        border: 'border-purple-600/30',
        badge: 'bg-purple-600/10 text-purple-600 border-purple-600/30',
        badgeSolid: 'bg-purple-600 text-white border-purple-600',
      };
    case 'HIGH':
      return {
        bg: 'bg-red-500',
        text: 'text-red-500',
        light: 'bg-red-500/10',
        border: 'border-red-500/30',
        badge: 'bg-red-500/10 text-red-500 border-red-500/30',
        badgeSolid: 'bg-red-500 text-white border-red-500',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-500',
        light: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
        badgeSolid: 'bg-yellow-500 text-white border-yellow-500',
      };
    case 'LOW':
      return {
        bg: 'bg-green-500',
        text: 'text-green-500',
        light: 'bg-green-500/10',
        border: 'border-green-500/30',
        badge: 'bg-green-500/10 text-green-500 border-green-500/30',
        badgeSolid: 'bg-green-500 text-white border-green-500',
      };
    case 'INFO':
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-500',
        light: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
        badgeSolid: 'bg-blue-500 text-white border-blue-500',
      };
    default:
      return {
        bg: 'bg-gray-500',
        text: 'text-gray-500',
        light: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        badge: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
        badgeSolid: 'bg-gray-500 text-white border-gray-500',
      };
  }
};

/**
 * Get severity badge class string (light style)
 * For use with Badge component className prop
 */
export const getSeverityBadgeClass = (severity: string | null | undefined): string => {
  return getSeverityColors(severity).badge;
};

/**
 * Get severity badge class string (solid style)
 * For use with Badge component className prop
 */
export const getSeverityBadgeSolidClass = (severity: string | null | undefined): string => {
  return getSeverityColors(severity).badgeSolid;
};

/**
 * Normalize severity level to consistent casing
 * @param severity - Raw severity string
 * @returns Normalized severity (Critical, High, Medium, Low, Info)
 */
export const normalizeSeverity = (severity: string | null | undefined): string => {
  const level = severity?.toUpperCase() || 'UNKNOWN';
  switch (level) {
    case 'CRITICAL': return 'Critical';
    case 'HIGH': return 'High';
    case 'MEDIUM': return 'Medium';
    case 'LOW': return 'Low';
    case 'INFO': return 'Info';
    default: return severity || 'Unknown';
  }
};

/**
 * Get score-based color classes
 * @param score - Security score (0-10)
 * @returns Color class string
 */
export const getScoreColor = (score: number | null | undefined): string => {
  const s = score ?? 0;
  if (s >= 9) return 'text-green-500';
  if (s >= 7) return 'text-yellow-500';
  if (s >= 5) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Get score-based badge classes
 * @param score - Security score (0-10)
 * @returns Badge class string
 */
export const getScoreBadgeClass = (score: number | null | undefined): string => {
  const s = score ?? 0;
  if (s >= 9) return 'bg-green-500/10 text-green-500 border-green-500/30';
  if (s >= 7) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  if (s >= 5) return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
  return 'bg-red-500/10 text-red-500 border-red-500/30';
};

/**
 * Get grade-based color classes
 * @param grade - Security grade (A+, A, B+, B, C+, C, D, F)
 * @returns Color class string for grade badge
 */
export const getGradeBadgeClass = (grade: string | null | undefined): string => {
  const g = (grade || 'F').toUpperCase();
  if (g.startsWith('A')) return 'text-green-500 bg-green-500/10 border-green-500/30';
  if (g.startsWith('B')) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  if (g.startsWith('C')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
  if (g.startsWith('D')) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
  return 'text-red-500 bg-red-500/10 border-red-500/30';
};

/**
 * Get status badge classes
 * @param status - Audit status (Completed, In Progress, Failed, Timed Out, etc.)
 * @returns Badge class string
 */
export const getStatusBadgeClass = (status: string | null | undefined): string => {
  const s = (status || '').toLowerCase();

  if (s === 'completed' || s === 'success') {
    return 'bg-green-500/10 text-green-500 border-green-500/30';
  }
  if (s === 'in progress' || s === 'running' || s === 'scanning') {
    return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  }
  if (s === 'failed' || s === 'error') {
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  }
  if (s === 'timed out' || s === 'timeout') {
    return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
  }
  if (s === 'pending' || s === 'queued') {
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  }
  return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
};

/**
 * Get SSL status badge classes
 * @param valid - Whether SSL is valid
 * @returns Badge class string
 */
export const getSSLBadgeClass = (valid: boolean | string | null | undefined): string => {
  const isValid = valid === true || valid === 'Valid' || valid === 'valid';
  if (isValid) {
    return 'bg-green-500/10 text-green-500 border-green-500/30';
  }
  return 'bg-red-500/10 text-red-500 border-red-500/30';
};

/**
 * Get risk level badge classes (for sensitive files, etc.)
 * @param risk - Risk level (HIGH, MEDIUM, LOW)
 * @returns Badge class string
 */
export const getRiskBadgeClass = (risk: string | null | undefined): string => {
  const r = (risk || '').toUpperCase();
  if (r === 'HIGH') return 'bg-red-500 text-white';
  if (r === 'MEDIUM') return 'bg-yellow-500 text-white';
  if (r === 'LOW') return 'bg-blue-500 text-white';
  return 'bg-gray-500 text-white';
};
