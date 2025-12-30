/**
 * AiVedha Guard - Pricing Hook
 * USD Only - PayPal Global Payments
 */

import { useState, useCallback } from 'react';
import { PLANS, CREDIT_PACKS, getPayPalPlanId, formatCurrency, type Plan } from '@/constants/plans';
import { logger } from '@/lib/logger';

type BillingCycle = 'monthly' | 'yearly';

export function usePricing() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Get price for a plan
  const getPlanPrice = useCallback((plan: Plan): number => {
    const price = plan.price[billingCycle];
    if (couponDiscount > 0) {
      return Math.round(price * (1 - couponDiscount / 100));
    }
    return price;
  }, [billingCycle, couponDiscount]);

  // Get original price (before discount)
  const getOriginalPrice = useCallback((plan: Plan): number => {
    return plan.price[billingCycle];
  }, [billingCycle]);

  // Get yearly savings
  const getYearlySavings = useCallback((plan: Plan): number => {
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyPrice = plan.price.yearly;
    return monthlyTotal - yearlyPrice;
  }, []);

  // Get yearly savings percentage
  const getYearlySavingsPercentage = useCallback((plan: Plan): number => {
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyPrice = plan.price.yearly;
    if (monthlyTotal === 0) return 0;
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  }, []);

  // Get PayPal plan ID for checkout
  const getCheckoutPlanId = useCallback((planId: string): string => {
    return getPayPalPlanId(planId, billingCycle);
  }, [billingCycle]);

  // Format price for display
  const formatPrice = useCallback((amount: number): string => {
    return formatCurrency(amount);
  }, []);

  // Validate coupon
  const validateCoupon = async (code: string, _purchaseType?: 'credits' | 'subscription'): Promise<boolean> => {
    if (!code.trim()) {
      setCouponError(null);
      setCouponDiscount(0);
      setCouponCode('');
      return false;
    }

    setValidatingCoupon(true);
    setCouponError(null);

    try {
      // Call PayPal coupon validation API
      const response = await fetch('https://api.aivedha.ai/api/paypal/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code.toUpperCase() }),
      });

      const data = await response.json();

      if (data.valid) {
        setCouponDiscount(data.discount_percent || 0);
        setCouponCode(code.toUpperCase());
        setValidatingCoupon(false);
        return true;
      } else {
        setCouponError(data.message || 'Invalid coupon code');
        setCouponDiscount(0);
        setValidatingCoupon(false);
        return false;
      }
    } catch (error) {
      logger.error('Failed to validate coupon code:', error);
      setCouponError('Failed to validate coupon');
      setCouponDiscount(0);
      setValidatingCoupon(false);
      return false;
    }
  };

  // Clear coupon
  const clearCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponError(null);
  };

  // Calculate discount amount for a plan
  const getDiscountAmount = useCallback((plan: Plan): number => {
    if (couponDiscount <= 0) return 0;
    const originalPrice = plan.price[billingCycle];
    return Math.round(originalPrice * (couponDiscount / 100));
  }, [billingCycle, couponDiscount]);

  // Get addon price (USD only) - 1:1 ratio for credits, matches prices in src/constants/addons.ts
  // NO DISCOUNTS apply to addons - they use flat 1:1 pricing
  // NOTE: API Access is NOT an addon - it's auto-included with ALL paid plans
  const getAddonPrice = useCallback((addonId: string): number => {
    // Addon prices must match CREDIT_PACKS and RECURRING_ADDONS in addons.ts
    // Credit packs use 1:1 ratio (1 USD = 1 credit)
    const addonPrices: Record<string, number> = {
      // Credit packs (one-time) - 1:1 ratio
      'credits-1': 1,
      'credits-5': 5,
      'credits-10': 10,
      'credits-25': 25,
      'credits-50': 50,
      // Recurring addons (api_access removed - auto-included with paid plans)
      'scheduled_audits': 25,
      'whitelabel_cert': 60,
    };
    return addonPrices[addonId] || 0;
  }, []);

  return {
    // State
    currency: 'USD' as const,
    setCurrency: (_currency?: string) => {}, // No-op since USD only
    billingCycle,
    setBillingCycle,
    couponCode,
    couponDiscount,
    couponType: couponDiscount > 0 ? 'percentage' as const : undefined,
    couponError,
    validatingCoupon,

    // Functions
    getPlanPrice,
    getOriginalPrice,
    getYearlySavings,
    getYearlySavingsPercentage,
    getCheckoutPlanId,
    formatPrice,
    validateCoupon,
    clearCoupon,
    getDiscountAmount,
    getAddonPrice,

    // Data
    plans: PLANS,
    creditPacks: CREDIT_PACKS,
    recurringAddons: [] as Array<{ name: string; code: string; description: string; price: number; popular?: boolean }>,
    isLoadingPlans: false,
    isOverseas: false, // All users use USD now
    profileCurrencyLoaded: true, // Always loaded since USD only
  };
}

export type { BillingCycle };
