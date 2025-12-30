/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PLAN_CREDITS, getPlanById, type Plan } from '@/constants/plans';
import { logger } from '@/lib/logger';

interface SubscriptionState {
  currentPlan: string | null;
  planName: string | null;
  credits: number;
  totalCredits: number;
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial' | 'free' | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  autoRenewal: boolean;
  loading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  deductCredit: () => Promise<boolean>;
  getCreditPercentage: () => number;
  isLowCredits: () => boolean;
  isCriticalCredits: () => boolean;
  isOutOfCredits: () => boolean;
  getCurrentPlan: () => Plan | undefined;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

// Get initial credits from localStorage to prevent flash of 0
const getInitialState = (): SubscriptionState => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      const credits = typeof user.credits === 'number' ? user.credits :
                      typeof user.credits === 'string' ? parseInt(user.credits, 10) : 0;
      const planCode = user.planCode || user.subscription_plan || user.plan || 'aarambh_free';
      return {
        currentPlan: planCode,
        planName: user.plan || null,
        credits: isNaN(credits) ? 0 : credits,
        totalCredits: PLAN_CREDITS[planCode] || credits || 3,
        subscriptionStatus: null,
        subscriptionId: null,
        currentPeriodEnd: null,
        autoRenewal: false,
        loading: true,
        error: null,
      };
    }
  } catch (error) {
    // Failed to parse user data from localStorage - return default state
    logger.warn('Failed to parse user data in SubscriptionContext:', error);
  }
  return {
    currentPlan: null,
    planName: null,
    credits: 0,
    totalCredits: 0,
    subscriptionStatus: null,
    subscriptionId: null,
    currentPeriodEnd: null,
    autoRenewal: false,
    loading: true,
    error: null,
  };
};

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>(getInitialState);

  const fetchSubscription = useCallback(async () => {
    // Check if user is authenticated
    const userStr = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');

    if (!userStr) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const user = JSON.parse(userStr);
      const userEmail = user.email;

      if (!userEmail) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Try to fetch from API - CRITICAL: Always fetch fresh, no caching
      try {
        // Add cache-busting timestamp to prevent stale data
        const cacheBuster = Date.now();

        // Create AbortController for timeout handling (5 second timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`https://api.aivedha.ai/api/subscription/current?userId=${encodeURIComponent(userEmail)}&_t=${cacheBuster}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          cache: 'no-store', // Force no caching via fetch option (cache-busting done via _t param)
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const subscription = data.subscription || data;

          // Use API response directly - no hardcoded mappings
          const planCode = subscription.subscription_plan || subscription.planCode || 'aarambh_free';

          // Get credits from API response
          const creditsValue = typeof subscription.credits === 'object'
            ? subscription.credits.available
            : (subscription.credits ?? user.credits ?? 0);

          const totalCredits = PLAN_CREDITS[planCode] || creditsValue || 3;

          // Use status from API directly
          const status = subscription.status?.toLowerCase() || 'free';
          const normalizedStatus = (['active', 'live'].includes(status) ? 'active' :
            ['cancelled', 'non_renewing'].includes(status) ? 'cancelled' :
            status === 'expired' ? 'expired' :
            status === 'trial' ? 'trial' : 'free') as 'active' | 'cancelled' | 'expired' | 'trial' | 'free';

          setState({
            currentPlan: planCode,
            planName: getPlanById(planCode.replace(/_monthly|_yearly|_usd/g, ''))?.name || subscription.plan || null,
            credits: creditsValue,
            totalCredits,
            subscriptionStatus: normalizedStatus,
            subscriptionId: subscription.subscription_id || subscription.subscriptionId || null,
            currentPeriodEnd: subscription.currentPeriodEnd || subscription.current_period_end || subscription.expires_at || null,
            autoRenewal: subscription.autoRenewal ?? subscription.auto_renew ?? false,
            loading: false,
            error: null,
          });
          return;
        }
      } catch {
        // Silently fallback to localStorage - API may be unavailable
      }

      // Fallback to localStorage data - use values directly from storage
      const planCode = user.planCode || user.subscription_plan || 'aarambh_free';
      const credits = typeof user.credits === 'number' ? user.credits : 0;
      const totalCredits = PLAN_CREDITS[planCode] || credits || 3;

      setState({
        currentPlan: planCode,
        planName: getPlanById(planCode.replace(/_monthly|_yearly|_usd/g, ''))?.name || user.plan || null,
        credits,
        totalCredits,
        subscriptionStatus: planCode === 'aarambh_free' ? 'free' : 'active',
        subscriptionId: null,
        currentPeriodEnd: null,
        autoRenewal: planCode !== 'aarambh_free',
        loading: false,
        error: null,
      });
    } catch {
      // Silently handle errors - use default free plan
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null, // Don't show error to user for expected fallback
      }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Listen for storage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser') {
        fetchSubscription();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchSubscription]);

  const deductCredit = async (): Promise<boolean> => {
    if (state.credits <= 0) return false;

    // Optimistic update
    setState((prev) => ({ ...prev, credits: prev.credits - 1 }));

    // Update localStorage
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.credits = state.credits - 1;
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    } catch {
      // Silent catch - localStorage update is optional
    }

    return true;
  };

  const getCreditPercentage = (): number => {
    if (state.totalCredits <= 0) return 0;
    return Math.round((state.credits / state.totalCredits) * 100);
  };

  const isLowCredits = (): boolean => {
    const percentage = getCreditPercentage();
    return percentage <= 20 && percentage > 10;
  };

  const isCriticalCredits = (): boolean => {
    const percentage = getCreditPercentage();
    return percentage <= 10 && state.credits > 0;
  };

  const isOutOfCredits = (): boolean => {
    return state.credits <= 0;
  };

  const getCurrentPlan = (): Plan | undefined => {
    if (!state.currentPlan) return undefined;
    const planId = state.currentPlan.replace(/_monthly|_yearly|_usd/g, '');
    return getPlanById(planId);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        refreshSubscription: fetchSubscription,
        deductCredit,
        getCreditPercentage,
        isLowCredits,
        isCriticalCredits,
        isOutOfCredits,
        getCurrentPlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
