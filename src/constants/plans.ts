/**
 * AiVedha Guard - Subscription Plans Configuration
 * USD Only - PayPal Global Payments
 * Vedic Security Naming Convention
 */

export interface Plan {
  id: string;
  code: string;
  name: string;
  nameHindi: string;
  meaning: string;
  description: string;
  credits: number;
  price: {
    monthly: number;
    yearly: number;
  };
  pricePerCredit: number;
  features: string[];
  recommended?: boolean;
  enterprise?: boolean;
  targetUser: string;
  color: string;
  icon: string;
  paypalPlanId: {
    monthly: string;
    yearly: string;
  };
}

export const PLANS: Plan[] = [
  {
    id: 'aarambh',
    code: 'aarambh',
    name: 'Aarambh',
    nameHindi: 'आरम्भ',
    meaning: 'The Beginning',
    description: 'Free plan - 3 credits to try all features',
    credits: 3,
    price: {
      monthly: 0,
      yearly: 0,
    },
    pricePerCredit: 0,
    features: ['3 free credits', 'All 21 security modules', 'AI-powered analysis', 'PDF reports', 'Email support'],
    targetUser: 'Free',
    color: '#10B981',
    icon: 'Sparkles',
    paypalPlanId: {
      monthly: '',
      yearly: '',
    },
  },
  {
    id: 'raksha',
    code: 'raksha',
    name: 'Raksha',
    nameHindi: 'रक्षा',
    meaning: 'Protection',
    description: '10 credits/month - Best for getting started',
    credits: 10,
    price: {
      monthly: 10,
      yearly: 108,
    },
    pricePerCredit: 1.00,
    features: ['10 credits/month', 'All 21 security modules', 'AI-powered fixes', 'PDF reports', 'Referral bonus: +2 credits'],
    targetUser: '10 Credits',
    color: '#3B82F6',
    icon: 'Shield',
    paypalPlanId: {
      monthly: 'P-9DE80034NW8103644NFDMXMI',
      yearly: 'P-91V72263GL6122913NFDMXMY',
    },
  },
  {
    id: 'suraksha',
    code: 'suraksha',
    name: 'Suraksha',
    nameHindi: 'सुरक्षा',
    meaning: 'Complete Security',
    description: '50 credits/month - Best value',
    credits: 50,
    price: {
      monthly: 45,
      yearly: 486,
    },
    pricePerCredit: 0.90,
    features: ['50 credits/month', 'All 21 security modules', 'AI-powered fixes', 'PDF reports', 'Referral bonus: +5 credits'],
    recommended: true,
    targetUser: '50 Credits',
    color: '#8B5CF6',
    icon: 'ShieldCheck',
    paypalPlanId: {
      monthly: 'P-9B208585UV344253JNFDMXNA',
      yearly: 'P-3NA45044HW267203SNFDMXNI',
    },
  },
  {
    id: 'vajra',
    code: 'vajra',
    name: 'Vajra',
    nameHindi: 'वज्र',
    meaning: 'Indestructible',
    description: '200 credits/month - For agencies',
    credits: 200,
    price: {
      monthly: 150,
      yearly: 1620,
    },
    pricePerCredit: 0.75,
    features: ['200 credits/month', 'All 21 security modules', 'AI-powered fixes', 'PDF reports', 'Referral bonus: +10 credits', 'Priority support'],
    targetUser: '200 Credits',
    color: '#F59E0B',
    icon: 'Zap',
    paypalPlanId: {
      monthly: 'P-9FM13449DU368353XNFDMXNY',
      yearly: 'P-33C53817PE4737058NFDMXOA',
    },
  },
  {
    id: 'chakra',
    code: 'chakra',
    name: 'Chakra',
    nameHindi: 'चक्र',
    meaning: 'Divine Disc',
    description: '500 credits/month - Enterprise',
    credits: 500,
    price: {
      monthly: 300,
      yearly: 3240,
    },
    pricePerCredit: 0.60,
    features: ['500 credits/month', 'All 21 security modules', 'AI-powered fixes', 'PDF reports', 'Referral bonus: +25 credits', 'Dedicated support', 'API access'],
    enterprise: true,
    targetUser: '500 Credits',
    color: '#EF4444',
    icon: 'Crown',
    paypalPlanId: {
      monthly: 'P-97P76054M44105114NFDMXOI',
      yearly: 'P-99U671102N720504TNFDMXOQ',
    },
  },
];

// PayPal Plan ID Mapping (Aarambh is free - no PayPal plan)
export const PAYPAL_PLAN_IDS = {
  raksha_monthly: 'P-9DE80034NW8103644NFDMXMI',
  raksha_yearly: 'P-91V72263GL6122913NFDMXMY',
  suraksha_monthly: 'P-9B208585UV344253JNFDMXNA',
  suraksha_yearly: 'P-3NA45044HW267203SNFDMXNI',
  vajra_monthly: 'P-9FM13449DU368353XNFDMXNY',
  vajra_yearly: 'P-33C53817PE4737058NFDMXOA',
  chakra_monthly: 'P-97P76054M44105114NFDMXOI',
  chakra_yearly: 'P-99U671102N720504TNFDMXOQ',
} as const;

// Credit allocation per plan
export const PLAN_CREDITS: Record<string, number> = {
  aarambh: 3,
  raksha: 10,
  suraksha: 50,
  vajra: 200,
  chakra: 500,
};

// Get PayPal plan ID based on plan and billing cycle
export function getPayPalPlanId(planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): string {
  // Aarambh is free - no PayPal plan needed
  if (planId === 'aarambh') return '';
  const key = `${planId}_${billingCycle}` as keyof typeof PAYPAL_PLAN_IDS;
  return PAYPAL_PLAN_IDS[key] || PAYPAL_PLAN_IDS['raksha_monthly'];
}

// Get plan by ID
export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

// Get plan by PayPal plan ID
export function getPlanByPayPalId(paypalPlanId: string): Plan | undefined {
  return PLANS.find((p) =>
    p.paypalPlanId.monthly === paypalPlanId || p.paypalPlanId.yearly === paypalPlanId
  );
}

// Get all paid plans (excluding free tier if any)
export function getPaidPlans(): Plan[] {
  return PLANS.filter((p) => p.price.monthly > 0);
}

// Format currency - USD only
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Credit Packs for one-time purchase
export const CREDIT_PACKS = [
  { id: 'credits-5', credits: 5, price: 5, savings: 0 },
  { id: 'credits-10', credits: 10, price: 9, savings: 10 },
  { id: 'credits-25', credits: 25, price: 20, savings: 20 },
  { id: 'credits-50', credits: 50, price: 35, savings: 30 },
  { id: 'credits-100', credits: 100, price: 60, savings: 40 },
];
