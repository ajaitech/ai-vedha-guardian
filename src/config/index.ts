/**
 * Centralized Application Configuration
 *
 * This module provides a single source of truth for all frontend configuration.
 * Values are sourced from Vite environment variables (VITE_* prefix, embedded at build time).
 *
 * SECURITY: All sensitive credentials MUST be provided via environment variables.
 * No hardcoded fallbacks for production credentials.
 *
 * IMPORTANT: Only public, frontend-safe values should be here.
 * Secrets must remain server-side only.
 */

// Validate required environment variables
function requireEnv(key: string, envValue: string | undefined): string {
  if (!envValue) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please ensure ${key} is set in your .env file or build environment.\n` +
      `See .env.example for required variables.`
    );
  }
  return envValue;
}

// OAuth Configuration - Public client IDs (safe for frontend)
export const OAUTH_CONFIG = {
  // Google OAuth - used for Google Sign-In button
  // REQUIRED: Must be provided via VITE_GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_ID: requireEnv('VITE_GOOGLE_CLIENT_ID', import.meta.env.VITE_GOOGLE_CLIENT_ID),

  // GitHub OAuth - used for GitHub Sign-In authorization URL
  // REQUIRED: Must be provided via VITE_GITHUB_CLIENT_ID
  GITHUB_CLIENT_ID: requireEnv('VITE_GITHUB_CLIENT_ID', import.meta.env.VITE_GITHUB_CLIENT_ID),

  // OAuth redirect URIs
  // REQUIRED: Must be provided via VITE_GITHUB_REDIRECT_URI
  // GitHub redirects to /dashboard with ?code=xxx, Dashboard.tsx handles the callback
  GITHUB_REDIRECT_URI: requireEnv('VITE_GITHUB_REDIRECT_URI', import.meta.env.VITE_GITHUB_REDIRECT_URI),
};

// PayPal Billing Configuration
export const PAYPAL_CONFIG = {
  // PayPal Client ID (public, safe for frontend)
  // REQUIRED: Must be provided via VITE_PAYPAL_CLIENT_ID
  CLIENT_ID: requireEnv('VITE_PAYPAL_CLIENT_ID', import.meta.env.VITE_PAYPAL_CLIENT_ID),

  // Currency (PayPal uses USD globally)
  CURRENCY: 'USD',

  // PayPal Plan IDs mapping (Aarambh is FREE - no PayPal plan)
  PLAN_IDS: {
    // Monthly Plans (Paid only)
    'raksha_monthly': 'P-9DE80034NW8103644NFDMXMI',
    'suraksha_monthly': 'P-9B208585UV344253JNFDMXNA',
    'vajra_monthly': 'P-9FM13449DU368353XNFDMXNY',
    'chakra_monthly': 'P-97P76054M44105114NFDMXOI',
    // Yearly Plans (Paid only)
    'raksha_yearly': 'P-91V72263GL6122913NFDMXMY',
    'suraksha_yearly': 'P-3NA45044HW267203SNFDMXNI',
    'vajra_yearly': 'P-33C53817PE4737058NFDMXOA',
    'chakra_yearly': 'P-99U671102N720504TNFDMXOQ',
  } as Record<string, string>,

  // Add-on Plan IDs
  ADDON_IDS: {
    'scheduler': 'P-32U60387JT1483533NFDMXPA',
    'whitelabel': 'P-7PJ67808RA6591613NFDMXPI',
    'api_access': 'P-10P90334X6470204UNFDMXPQ',
  } as Record<string, string>,

  // Get PayPal plan ID for a plan
  getPlanId(planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): string {
    const key = `${planId}_${billingCycle}`;
    return this.PLAN_IDS[key] || this.PLAN_IDS['aarambh_monthly'];
  },

  // Get subscription management URL (PayPal portal)
  getManageSubscriptionUrl(): string {
    return 'https://www.paypal.com/myaccount/autopay';
  }
};


// reCAPTCHA Configuration
export const RECAPTCHA_CONFIG = {
  // reCAPTCHA Enterprise Site Key (public, safe for frontend)
  // REQUIRED: Must be provided via VITE_RECAPTCHA_SITE_KEY
  SITE_KEY: requireEnv('VITE_RECAPTCHA_SITE_KEY', import.meta.env.VITE_RECAPTCHA_SITE_KEY),
};

// API Key Configuration (for API Gateway authentication)
export const API_KEY_CONFIG = {
  // API keys are injected at build time from GitHub Secrets
  // Source: AWS Secrets Manager (us-east-1) -> GitHub Secrets -> Build
  // REQUIRED: Must be provided via VITE_AIVEDHA_API_KEY_US and VITE_AIVEDHA_API_KEY_INDIA
  US: requireEnv('VITE_AIVEDHA_API_KEY_US', import.meta.env.VITE_AIVEDHA_API_KEY_US),
  INDIA: requireEnv('VITE_AIVEDHA_API_KEY_INDIA', import.meta.env.VITE_AIVEDHA_API_KEY_INDIA),

  // Get API key for a region
  getKey(region: 'us-east-1' | 'ap-south-1'): string {
    return region === 'ap-south-1' ? this.INDIA : this.US;
  },

  // Check if API keys are configured
  isConfigured(): boolean {
    return Boolean(this.US && this.INDIA);
  }
};

// Application Configuration
export const APP_CONFIG = {
  // Base URLs
  BASE_URL: import.meta.env.VITE_APP_BASE_URL || 'https://aivedha.ai',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? 'https://api.aivedha.ai/api' : '/api'),

  // URL helpers
  getVerifyUrl(certificateNumber: string): string {
    return `${this.BASE_URL}/verify/${certificateNumber}`;
  },
  getCertificateUrl(certificateNumber: string): string {
    return `${this.BASE_URL}/certificate/${certificateNumber}`;
  },
  getDashboardUrl(): string {
    return `${this.BASE_URL}/dashboard`;
  },

  // Free credits for new users
  FREE_CREDITS: 3,

  // Email addresses
  SUPPORT_EMAIL: 'support@aivedha.ai',
  SECURITY_EMAIL: 'security@aivedha.ai',
  LEGAL_EMAIL: 'legal@aivedha.ai',
  PRIVACY_EMAIL: 'privacy@aivedha.ai',
  ENTERPRISE_EMAIL: 'enterprise@aivedha.ai',
  STARTUPS_EMAIL: 'startups@aivedha.ai',
  NOREPLY_EMAIL: 'noreply@aivedha.ai',

  // Feature flags (can be overridden via env vars)
  FEATURES: {
    ENABLE_GITHUB_LOGIN: import.meta.env.VITE_ENABLE_GITHUB_LOGIN !== 'false',
    ENABLE_GOOGLE_LOGIN: import.meta.env.VITE_ENABLE_GOOGLE_LOGIN !== 'false',
    ENABLE_SCHEDULED_AUDITS: import.meta.env.VITE_ENABLE_SCHEDULED_AUDITS !== 'false',
    ENABLE_WHITE_LABEL: import.meta.env.VITE_ENABLE_WHITE_LABEL !== 'false',
  }
};

// Branding - DO NOT CHANGE without explicit authorization
export const BRANDING = {
  APP_NAME: 'AiVedha Guard',
  AI_ENGINE: 'AI Gemini 3.0',
  TAGLINE: 'AI-Powered Security Audit Platform',

  // Default plan for new users
  DEFAULT_PLAN: 'Aarambh',

  // Feature descriptions (used in UI)
  getAIPoweredDescription(): string {
    return `${this.AI_ENGINE} powered analysis`;
  }
};

// Export individual configs for convenience
export default {
  oauth: OAUTH_CONFIG,
  paypal: PAYPAL_CONFIG,
  recaptcha: RECAPTCHA_CONFIG,
  app: APP_CONFIG,
  branding: BRANDING
};
