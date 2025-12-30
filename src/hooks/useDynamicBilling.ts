/**
 * Dynamic Billing Hook
 * Fetches plans, addons, and validates coupons from the API
 * Falls back to PLANS configuration if API is unavailable
 */

import { useState, useEffect, useCallback } from 'react';
import AivedhaAPI from '@/lib/api';
import { PLANS, CREDIT_PACKS } from '@/constants/plans';

export interface DynamicPlan {
  plan_id: string;
  plan_code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  billing_cycle_count: number;
  credits: number;
  features: string[];
  highlight: boolean;
  popular: boolean;
  display_order: number;
  status: string;
  trial_days: number;
}

export interface DynamicAddon {
  addon_id: string;
  addon_code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_type: string;
  unit: string;
  quantity: number;
  features: string[];
  display_order: number;
  status: string;
}

export interface CouponInfo {
  coupon_code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  name: string;
  applicable_plans: string[];
}

// Generate fallback plans from PLANS configuration (single source of truth)
const FALLBACK_PLANS: DynamicPlan[] = PLANS.map((plan, index) => ({
  plan_id: `static-${plan.id}`,
  plan_code: plan.code,
  name: plan.name,
  description: plan.description,
  price: plan.price.monthly,
  currency: 'USD',
  billing_cycle: 'monthly',
  billing_cycle_count: 1,
  credits: plan.credits,
  features: plan.features,
  highlight: plan.recommended || false,
  popular: plan.id === 'raksha',
  display_order: index + 1,
  status: 'active',
  trial_days: 0
}));

// Generate fallback addons from CREDIT_PACKS configuration
const FALLBACK_ADDONS: DynamicAddon[] = CREDIT_PACKS.map((pack, index) => ({
  addon_id: `static-${pack.id}`,
  addon_code: pack.id,
  name: `${pack.credits} Additional Credits`,
  description: `One-time purchase of ${pack.credits} extra audit credits`,
  price: pack.price,
  currency: 'USD',
  billing_type: 'one_time',
  unit: 'credits',
  quantity: pack.credits,
  features: [`${pack.credits} Security Audits`, 'Never Expire', pack.savings > 0 ? `Save ${pack.savings}%` : ''].filter(Boolean),
  display_order: index + 1,
  status: 'active'
}));

export function useDynamicBilling() {
  const [plans, setPlans] = useState<DynamicPlan[]>(FALLBACK_PLANS);
  const [addons, setAddons] = useState<DynamicAddon[]>(FALLBACK_ADDONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Fetch plans and addons on mount
  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use Promise.allSettled to handle partial failures gracefully
        const [plansResult, addonsResult] = await Promise.allSettled([
          AivedhaAPI.getPublicPlans(),
          AivedhaAPI.getPublicAddons()
        ]);

        // Handle plans response
        const plansResponse = plansResult.status === 'fulfilled' ? plansResult.value : null;
        const addonsResponse = addonsResult.status === 'fulfilled' ? addonsResult.value : null;

        // Silently use fallback data if API is unavailable (no console warnings)

        if (plansResponse?.success && plansResponse.plans?.length > 0) {
          setPlans(plansResponse.plans);
          setIsUsingFallback(false);
        } else {
          setPlans(FALLBACK_PLANS);
          setIsUsingFallback(true);
        }

        if (addonsResponse?.success && addonsResponse.addons?.length > 0) {
          setAddons(addonsResponse.addons);
        } else {
          setAddons(FALLBACK_ADDONS);
        }
      } catch {
        // Silently use fallback data if API fails - this is expected behavior
        setPlans(FALLBACK_PLANS);
        setAddons(FALLBACK_ADDONS);
        setIsUsingFallback(true);
        setError(null); // Don't set error for expected fallback behavior
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // Validate coupon
  const validateCoupon = useCallback(async (couponCode: string): Promise<{
    valid: boolean;
    error?: string;
    coupon?: CouponInfo;
  }> => {
    if (!couponCode.trim()) {
      return { valid: false, error: 'Please enter a coupon code' };
    }

    setValidatingCoupon(true);

    try {
      const response = await AivedhaAPI.validateBillingCoupon(couponCode);

      if (response.success && response.valid && response.coupon) {
        const couponInfo: CouponInfo = {
          coupon_code: response.coupon.coupon_code,
          discount_type: response.coupon.discount_type as 'percentage' | 'fixed',
          discount_value: response.coupon.discount_value,
          name: response.coupon.name,
          applicable_plans: response.coupon.applicable_plans
        };
        setCoupon(couponInfo);
        return { valid: true, coupon: couponInfo };
      }

      return { valid: false, error: response.message || 'Invalid coupon' };
    } catch (err) {
      return { valid: false, error: 'Failed to validate coupon' };
    } finally {
      setValidatingCoupon(false);
    }
  }, []);

  // Clear coupon
  const clearCoupon = useCallback(() => {
    setCoupon(null);
  }, []);

  // Calculate price with coupon
  const calculatePrice = useCallback((
    basePrice: number,
    planCode?: string
  ): number => {
    if (!coupon) return basePrice;

    // Check if coupon applies to this plan
    if (planCode && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(planCode)) {
        return basePrice;
      }
    }

    if (coupon.discount_type === 'percentage') {
      return basePrice * (1 - coupon.discount_value / 100);
    }

    return Math.max(0, basePrice - coupon.discount_value);
  }, [coupon]);

  // Get plan by code
  const getPlanByCode = useCallback((code: string): DynamicPlan | undefined => {
    return plans.find(p => p.plan_code === code);
  }, [plans]);

  // Get addon by code
  const getAddonByCode = useCallback((code: string): DynamicAddon | undefined => {
    return addons.find(a => a.addon_code === code);
  }, [addons]);

  return {
    plans,
    addons,
    loading,
    error,
    isUsingFallback,
    coupon,
    validatingCoupon,
    validateCoupon,
    clearCoupon,
    calculatePrice,
    getPlanByCode,
    getAddonByCode
  };
}

export default useDynamicBilling;
