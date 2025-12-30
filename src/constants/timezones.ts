/**
 * Timezone to country code mappings for phone number country code detection
 * Extracted from Purchase.tsx for better code organization
 */

export const TIMEZONE_TO_COUNTRY_CODE: Record<string, string> = {
  // India
  'Asia/Kolkata': '+91',
  'Asia/Calcutta': '+91',

  // United States
  'America/New_York': '+1',
  'America/Los_Angeles': '+1',
  'America/Chicago': '+1',
  'America/Denver': '+1',
  'America/Phoenix': '+1',
  'America/Anchorage': '+1',
  'America/Honolulu': '+1',

  // United Kingdom
  'Europe/London': '+44',

  // Europe
  'Europe/Paris': '+33',    // France
  'Europe/Berlin': '+49',   // Germany
  'Europe/Madrid': '+34',   // Spain
  'Europe/Rome': '+39',     // Italy
  'Europe/Amsterdam': '+31', // Netherlands
  'Europe/Brussels': '+32',  // Belgium
  'Europe/Stockholm': '+46', // Sweden
  'Europe/Oslo': '+47',      // Norway
  'Europe/Copenhagen': '+45', // Denmark
  'Europe/Zurich': '+41',    // Switzerland
  'Europe/Vienna': '+43',    // Austria
  'Europe/Athens': '+30',    // Greece
  'Europe/Warsaw': '+48',    // Poland
  'Europe/Moscow': '+7',     // Russia

  // Middle East
  'Asia/Dubai': '+971',      // UAE
  'Asia/Riyadh': '+966',     // Saudi Arabia
  'Asia/Kuwait': '+965',     // Kuwait
  'Asia/Bahrain': '+973',    // Bahrain
  'Asia/Qatar': '+974',      // Qatar
  'Asia/Jerusalem': '+972',  // Israel

  // Asia Pacific
  'Asia/Singapore': '+65',
  'Asia/Tokyo': '+81',       // Japan
  'Asia/Seoul': '+82',       // South Korea
  'Asia/Shanghai': '+86',    // China
  'Asia/Hong_Kong': '+852',
  'Asia/Bangkok': '+66',     // Thailand
  'Asia/Jakarta': '+62',     // Indonesia
  'Asia/Manila': '+63',      // Philippines
  'Asia/Kuala_Lumpur': '+60', // Malaysia
  'Asia/Taipei': '+886',     // Taiwan

  // Australia / Oceania
  'Australia/Sydney': '+61',
  'Australia/Melbourne': '+61',
  'Australia/Brisbane': '+61',
  'Australia/Perth': '+61',
  'Pacific/Auckland': '+64',  // New Zealand

  // Americas
  'America/Sao_Paulo': '+55',    // Brazil
  'America/Buenos_Aires': '+54', // Argentina
  'America/Mexico_City': '+52',  // Mexico
  'America/Lima': '+51',         // Peru
  'America/Bogota': '+57',       // Colombia
  'America/Santiago': '+56',     // Chile
  'America/Toronto': '+1',       // Canada
  'America/Vancouver': '+1',

  // Africa
  'Africa/Johannesburg': '+27',  // South Africa
  'Africa/Cairo': '+20',         // Egypt
  'Africa/Lagos': '+234',        // Nigeria
  'Africa/Nairobi': '+254',      // Kenya
};

/**
 * Default country code fallback (USD/International)
 */
export const DEFAULT_COUNTRY_CODE = '+1';

/**
 * Detect country code from user's timezone
 */
export function detectCountryCodeFromTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Direct match
    if (TIMEZONE_TO_COUNTRY_CODE[timezone]) {
      return TIMEZONE_TO_COUNTRY_CODE[timezone];
    }

    // Fuzzy match by city/region
    for (const [tz, code] of Object.entries(TIMEZONE_TO_COUNTRY_CODE)) {
      if (timezone.includes(tz.split('/')[1]) || timezone === tz) {
        return code;
      }
    }

    // Default to US for USD
    return DEFAULT_COUNTRY_CODE;
  } catch {
    return DEFAULT_COUNTRY_CODE;
  }
}
