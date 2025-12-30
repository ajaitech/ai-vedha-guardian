/**
 * AiVedha Guardian - Smart Region Routing
 * Determines optimal scan region based on user and target location
 *
 * Regions:
 * - us-east-1 (USA): Static IP 44.206.201.117
 * - ap-south-1 (India): Static IP 13.203.153.119
 */

export type ScanRegion = 'us-east-1' | 'ap-south-1';

export interface RegionInfo {
  region: ScanRegion;
  regionName: string;
  staticIP: string;
  apiEndpoint: string;
}

// Region configuration
export const REGIONS: Record<ScanRegion, RegionInfo> = {
  'us-east-1': {
    region: 'us-east-1',
    regionName: 'USA',
    staticIP: '44.206.201.117',
    apiEndpoint: 'https://api.aivedha.ai/api',
  },
  'ap-south-1': {
    region: 'ap-south-1',
    regionName: 'India',
    staticIP: '13.203.153.119',
    // Edge-optimized custom domain with SSL (configured 2025-12-28)
    apiEndpoint: 'https://api-india.aivedha.ai/api',
  },
};

// Countries mapped to India region (South Asia + nearby)
const INDIA_REGION_COUNTRIES = new Set([
  'IN', // India
  'PK', // Pakistan
  'BD', // Bangladesh
  'LK', // Sri Lanka
  'NP', // Nepal
  'BT', // Bhutan
  'MV', // Maldives
  'MM', // Myanmar
  'TH', // Thailand
  'VN', // Vietnam
  'MY', // Malaysia
  'SG', // Singapore
  'ID', // Indonesia
  'PH', // Philippines
  'AE', // UAE
  'SA', // Saudi Arabia
  'QA', // Qatar
  'KW', // Kuwait
  'BH', // Bahrain
  'OM', // Oman
]);

// Timezone to region mapping
const TIMEZONE_TO_REGION: Record<string, ScanRegion> = {
  // Asia/India timezones -> India region
  'Asia/Kolkata': 'ap-south-1',
  'Asia/Calcutta': 'ap-south-1',
  'Asia/Colombo': 'ap-south-1',
  'Asia/Dhaka': 'ap-south-1',
  'Asia/Kathmandu': 'ap-south-1',
  'Asia/Karachi': 'ap-south-1',
  'Asia/Bangkok': 'ap-south-1',
  'Asia/Singapore': 'ap-south-1',
  'Asia/Kuala_Lumpur': 'ap-south-1',
  'Asia/Jakarta': 'ap-south-1',
  'Asia/Ho_Chi_Minh': 'ap-south-1',
  'Asia/Manila': 'ap-south-1',
  'Asia/Dubai': 'ap-south-1',
  'Asia/Riyadh': 'ap-south-1',
  'Asia/Qatar': 'ap-south-1',
  // All other timezones -> US region (default)
};

/**
 * Detect user's region based on timezone
 */
export function detectUserRegion(): ScanRegion {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_REGION[timezone] || 'us-east-1';
  } catch {
    return 'us-east-1'; // Default to US
  }
}

/**
 * Get region info for a specific region
 */
export function getRegionInfo(region: ScanRegion): RegionInfo {
  return REGIONS[region];
}

/**
 * Determine optimal scan region based on target URL domain
 * Uses TLD and known hosting patterns
 */
export function determineTargetRegion(url: string): ScanRegion {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // India-specific TLDs
    if (hostname.endsWith('.in') || hostname.endsWith('.co.in') ||
        hostname.endsWith('.org.in') || hostname.endsWith('.net.in') ||
        hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in')) {
      return 'ap-south-1';
    }

    // South Asian TLDs
    if (hostname.endsWith('.pk') || hostname.endsWith('.bd') ||
        hostname.endsWith('.lk') || hostname.endsWith('.np')) {
      return 'ap-south-1';
    }

    // Southeast Asian TLDs
    if (hostname.endsWith('.sg') || hostname.endsWith('.my') ||
        hostname.endsWith('.th') || hostname.endsWith('.id') ||
        hostname.endsWith('.ph') || hostname.endsWith('.vn')) {
      return 'ap-south-1';
    }

    // Middle East TLDs
    if (hostname.endsWith('.ae') || hostname.endsWith('.sa') ||
        hostname.endsWith('.qa') || hostname.endsWith('.kw')) {
      return 'ap-south-1';
    }

    // Default to US for all other domains
    return 'us-east-1';
  } catch {
    return 'us-east-1'; // Default to US on parse error
  }
}

/**
 * Smart region selection combining user location and target location
 * Priority: Target region > User region > Default (US)
 */
export function selectOptimalRegion(
  targetUrl: string,
  userRegion?: ScanRegion,
  preferredRegion?: ScanRegion
): ScanRegion {
  // If user explicitly prefers a region, use it
  if (preferredRegion) {
    return preferredRegion;
  }

  // Determine target's region
  const targetRegion = determineTargetRegion(targetUrl);

  // If target is clearly in a specific region, use that
  if (targetRegion === 'ap-south-1') {
    return 'ap-south-1';
  }

  // Otherwise, use user's region if detected
  if (userRegion) {
    return userRegion;
  }

  // Default to US
  return 'us-east-1';
}

/**
 * Get the API endpoint for a specific region
 */
export function getRegionEndpoint(region: ScanRegion): string {
  return REGIONS[region].apiEndpoint;
}

/**
 * Get the static IP for a specific region (for whitelisting)
 */
export function getRegionStaticIP(region: ScanRegion): string {
  return REGIONS[region].staticIP;
}

/**
 * Get all static IPs for whitelisting (both regions)
 */
export function getAllStaticIPs(): string[] {
  return Object.values(REGIONS).map((r) => r.staticIP);
}

/**
 * Format region for display
 */
export function formatRegionDisplay(region: ScanRegion): string {
  const info = REGIONS[region];
  return `${info.regionName} (${region})`;
}

/**
 * Check if a region is healthy (can be used for fallback)
 */
export async function isRegionHealthy(region: ScanRegion): Promise<boolean> {
  try {
    const endpoint = getRegionEndpoint(region);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${endpoint}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Select region with fallback - tries primary, falls back if unhealthy
 */
export async function selectRegionWithFallback(
  targetUrl: string,
  userRegion?: ScanRegion
): Promise<{ region: ScanRegion; isFallback: boolean }> {
  const primaryRegion = selectOptimalRegion(targetUrl, userRegion);

  // Check if primary region is healthy
  const isPrimaryHealthy = await isRegionHealthy(primaryRegion);

  if (isPrimaryHealthy) {
    return { region: primaryRegion, isFallback: false };
  }

  // Fallback to the other region
  const fallbackRegion: ScanRegion =
    primaryRegion === 'us-east-1' ? 'ap-south-1' : 'us-east-1';

  const isFallbackHealthy = await isRegionHealthy(fallbackRegion);

  if (isFallbackHealthy) {
    return { region: fallbackRegion, isFallback: true };
  }

  // Both unhealthy - return primary anyway (let API handle error)
  return { region: primaryRegion, isFallback: false };
}

// Export default region
export const DEFAULT_REGION: ScanRegion = 'us-east-1';
