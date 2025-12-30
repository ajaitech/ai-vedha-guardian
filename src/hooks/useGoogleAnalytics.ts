/**
 * AiVedha Guard - Google Ads Tracking Hook
 * Latest gtag.js 2025 implementation for Google Ads conversions
 * Debug mode: Add ?gtag_debug=true to URL or set localStorage.setItem('gtag_debug', 'true')
 *
 * @see https://developers.google.com/tag-platform/gtagjs
 * @see https://support.google.com/google-ads/answer/7548399
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '@/lib/logger';

// Declare gtag function type
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    gtag_debug?: boolean;
    trackConversion?: (label: string, value?: number, currency?: string, transactionId?: string) => void;
  }
}

// Google Ads ID (for conversions)
const GA_ADS_ID = 'AW-17775891958';

// Check if debug mode is enabled (supports Tag Assistant _dbg parameter)
const isDebugMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.gtag_debug === true;
};

// Debug logger (only logs when debug mode is explicitly enabled)
const debugLog = (action: string, data: unknown) => {
  if (isDebugMode()) {
    logger.log(`[GTAG] ${action}:`, data);
  }
};

/**
 * Hook to track page views on route changes
 * Sends page_view event to Google Ads for remarketing lists
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      const pageData = {
        page_path: location.pathname + location.search,
        page_title: document.title,
      };

      // Track page view to Google Ads (for remarketing audiences)
      window.gtag('config', GA_ADS_ID, {
        ...pageData,
        'send_page_view': true
      });

      debugLog('Page View', pageData);
    }
  }, [location]);
}

/**
 * Track custom events
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  const eventData = {
    event_category: category,
    event_label: label,
    value: value,
  };

  debugLog(`Event: ${action}`, eventData);

  if (typeof window.gtag === 'function') {
    window.gtag('event', action, eventData);
  }
}

/**
 * Track conversion events (for Google Ads)
 * @see https://support.google.com/google-ads/answer/6331304
 */
export function trackConversion(
  conversionLabel: string,
  value?: number,
  currency: string = 'USD',
  transactionId?: string
) {
  // Use global trackConversion if available (defined in index.html)
  if (typeof window.trackConversion === 'function') {
    window.trackConversion(conversionLabel, value, currency, transactionId);
    debugLog('Conversion (global)', { conversionLabel, value, currency, transactionId });
    return;
  }

  // Fallback to direct gtag call
  if (typeof window.gtag === 'function') {
    const conversionData: Record<string, unknown> = {
      send_to: `${GA_ADS_ID}/${conversionLabel}`,
      value: value || 0,
      currency: currency,
    };

    if (transactionId) {
      conversionData.transaction_id = transactionId;
    }

    window.gtag('event', 'conversion', conversionData);
    debugLog('Conversion', conversionData);
  }
}

/**
 * Track ecommerce purchase
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  currency: string = 'USD',
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>
) {
  const purchaseData = {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items,
  };

  debugLog('Purchase', purchaseData);

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', purchaseData);
  }
}

/**
 * Track subscription signup
 */
export function trackSubscription(
  planName: string,
  planId: string,
  value: number,
  currency: string = 'USD',
  billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
  const subscriptionData = {
    plan_name: planName,
    plan_id: planId,
    billing_cycle: billingCycle,
    value: value,
    currency: currency,
  };

  debugLog('Subscription', subscriptionData);

  if (typeof window.gtag === 'function') {
    // Track as Google Ads conversion
    window.gtag('event', 'conversion', {
      send_to: GA_ADS_ID,
      value: value,
      currency: currency,
    });

    // Track custom subscription event
    window.gtag('event', 'subscription_started', {
      event_category: 'Subscription',
      event_label: planName,
      plan_id: planId,
      billing_cycle: billingCycle,
      value: value,
    });
  }
}

/**
 * Track audit completion
 */
export function trackAuditComplete(
  domain: string,
  score: number,
  grade: string
) {
  const auditData = {
    event_category: 'Security Audit',
    event_label: domain,
    security_score: score,
    security_grade: grade,
  };

  debugLog('Audit Complete', auditData);

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'audit_complete', auditData);
  }
}

/**
 * Enable debug mode programmatically
 */
export function enableGtagDebug() {
  window.gtag_debug = true;
  try {
    localStorage.setItem('gtag_debug', 'true');
  } catch {
    // localStorage not available
  }
  logger.log('[GTAG] Debug mode ENABLED. All gtag events will be logged.');
}

/**
 * Disable debug mode
 */
export function disableGtagDebug() {
  window.gtag_debug = false;
  try {
    localStorage.removeItem('gtag_debug');
  } catch {
    // localStorage not available
  }
  logger.log('[GTAG] Debug mode DISABLED.');
}

/**
 * Get current gtag status
 */
export function getGtagStatus() {
  const status = {
    gtag_available: typeof window.gtag === 'function',
    debug_mode: isDebugMode(),
    ads_id: GA_ADS_ID,
    dataLayer_length: window.dataLayer?.length || 0,
  };
  logger.table(status);
  return status;
}

export default {
  usePageTracking,
  trackEvent,
  trackConversion,
  trackPurchase,
  trackSubscription,
  trackAuditComplete,
  enableGtagDebug,
  disableGtagDebug,
  getGtagStatus,
};
