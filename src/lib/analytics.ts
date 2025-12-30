/**
 * Analytics Tracking Utility
 * Provides a centralized interface for tracking user events and analytics
 */

import { logger } from "./logger";

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditCompletedEvent {
  reportId: string;
  url: string;
  score?: number;
  grade?: string;
  duration?: number;
  vulnerabilitiesFound?: number;
}

export interface PaymentEvent {
  plan: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  subscriptionId?: string;
}

/**
 * Track a generic analytics event
 * @param event - The event to track
 */
export const trackEvent = (event: AnalyticsEvent): void => {
  try {
    // Log event for debugging
    logger.info('Analytics Event:', event);

    // Send to Google Analytics (gtag) if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.metadata,
      });
    }

    // Can add other analytics providers here (Mixpanel, Segment, etc.)
  } catch (error) {
    logger.error('Analytics tracking error:', error);
  }
};

/**
 * Track audit completion event
 * @param data - Audit completion data
 */
export const trackAuditCompleted = (data: AuditCompletedEvent): void => {
  trackEvent({
    category: 'Security Audit',
    action: 'audit_completed',
    label: data.url,
    value: data.score,
    metadata: {
      reportId: data.reportId,
      grade: data.grade,
      duration: data.duration,
      vulnerabilitiesFound: data.vulnerabilitiesFound,
    },
  });
};

/**
 * Track audit started event
 * @param url - The URL being audited
 */
export const trackAuditStarted = (url: string): void => {
  trackEvent({
    category: 'Security Audit',
    action: 'audit_started',
    label: url,
  });
};

/**
 * Track audit failed event
 * @param url - The URL that failed
 * @param error - Error message
 */
export const trackAuditFailed = (url: string, error?: string): void => {
  trackEvent({
    category: 'Security Audit',
    action: 'audit_failed',
    label: url,
    metadata: { error },
  });
};

/**
 * Track payment event
 * @param data - Payment event data
 */
export const trackPayment = (data: PaymentEvent): void => {
  trackEvent({
    category: 'Payment',
    action: 'payment_completed',
    label: data.plan,
    value: data.amount,
    metadata: {
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      subscriptionId: data.subscriptionId,
    },
  });
};

/**
 * Track subscription event
 * @param action - The subscription action (subscribe, cancel, renew, etc.)
 * @param plan - The plan name
 */
export const trackSubscription = (action: string, plan: string): void => {
  trackEvent({
    category: 'Subscription',
    action,
    label: plan,
  });
};

/**
 * Track page view
 * @param pageName - The name of the page
 * @param path - The page path
 */
export const trackPageView = (pageName: string, path: string): void => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_path: path,
      });
    }
  } catch (error) {
    logger.error('Page view tracking error:', error);
  }
};

/**
 * Track user engagement
 * @param action - The engagement action
 * @param details - Additional details
 */
export const trackEngagement = (action: string, details?: Record<string, unknown>): void => {
  trackEvent({
    category: 'Engagement',
    action,
    metadata: details,
  });
};
