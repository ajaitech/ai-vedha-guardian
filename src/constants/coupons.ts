// AiVedha Guard - Coupon Configuration
// MUST MATCH: Lambda DISCOUNT_COUPONS in paypal-handler/lambda_function.py
//
// IMPORTANT: Subscription coupons (WELCOME20, ANNUAL30, STARTUP50, FIRST3FREE)
// are handled by PayPal promo codes and NOT shown in frontend UI.
// Only CREDITS20 is displayed in frontend for credit pack purchases.

export interface Coupon {
  code: string;
  discount: number;
  type: 'percentage' | 'flat';
  description: string;
  appliesTo?: 'all' | 'monthly' | 'yearly' | 'credits';
  applicablePlans?: string[];
  maxRedemptions?: number;
  expiryDate?: string;
  minAmount?: number; // USD only
  firstTimeOnly?: boolean;
  trialMonths?: number;
}

// These coupons are configured in Lambda backend and MUST match exactly
export const AVAILABLE_COUPONS: Coupon[] = [
  {
    code: 'WELCOME20',
    discount: 20,
    type: 'percentage',
    description: '20% off your first subscription',
    appliesTo: 'all',
    firstTimeOnly: true
  },
  {
    code: 'ANNUAL30',
    discount: 30,
    type: 'percentage',
    description: '30% off annual subscriptions',
    appliesTo: 'yearly'
  },
  {
    code: 'STARTUP50',
    discount: 50,
    type: 'percentage',
    description: '50% off for verified startups',
    appliesTo: 'all',
    firstTimeOnly: true
  },
  {
    code: 'FIRST3FREE',
    discount: 100,
    type: 'percentage',
    description: 'First 3 months free on monthly plans',
    appliesTo: 'monthly',
    trialMonths: 3,
    firstTimeOnly: true
  },
  {
    code: 'CREDITS20',
    discount: 20,
    type: 'percentage',
    description: '20% off credit pack purchases',
    appliesTo: 'credits'
  },
  {
    code: 'AJNAIDU',
    discount: 100,
    type: 'percentage',
    description: 'Test coupon - 100% off (Admin only)',
    appliesTo: 'all'
  },
];

// Auto-apply coupon rules - match with backend logic
export const AUTO_APPLY_RULES = {
  FIRST_TIME_PAID: 'WELCOME20',
  ANNUAL_BILLING: 'ANNUAL30',
  STARTUP: 'STARTUP50',
  CREDIT_PURCHASE: 'CREDITS20',
};

// Validate coupon locally (for UI preview) - USD only globally
// NOTE: Final validation happens on backend Lambda
export function validateCouponLocally(
  code: string,
  purchaseType?: 'monthly' | 'yearly' | 'credits',
  amount?: number
): { valid: boolean; discount: number; type: 'percentage' | 'flat'; message?: string; trialMonths?: number } {
  const coupon = AVAILABLE_COUPONS.find((c) => c.code === code.toUpperCase());

  if (!coupon) {
    return { valid: false, discount: 0, type: 'percentage', message: 'Invalid coupon code' };
  }

  // Check if coupon applies to this purchase type
  const appliesTo = coupon.appliesTo || 'all';
  if (appliesTo !== 'all' && purchaseType) {
    if (purchaseType === 'credits' && appliesTo !== 'credits') {
      return {
        valid: false,
        discount: 0,
        type: 'percentage',
        message: 'This coupon does not apply to credit purchases'
      };
    }
    if (purchaseType === 'yearly' && appliesTo !== 'yearly' && appliesTo !== 'all') {
      return {
        valid: false,
        discount: 0,
        type: 'percentage',
        message: 'This coupon only applies to monthly subscriptions'
      };
    }
    if (purchaseType === 'monthly' && appliesTo === 'yearly') {
      return {
        valid: false,
        discount: 0,
        type: 'percentage',
        message: 'This coupon only applies to yearly subscriptions'
      };
    }
  }

  // Check minimum amount for flat discounts (USD only)
  if (coupon.type === 'flat' && coupon.minAmount && amount) {
    if (amount < coupon.minAmount) {
      return {
        valid: false,
        discount: 0,
        type: 'flat',
        message: `Minimum order of $${coupon.minAmount} required`
      };
    }
  }

  return {
    valid: true,
    discount: coupon.discount,
    type: coupon.type,
    message: coupon.description,
    trialMonths: coupon.trialMonths
  };
}
