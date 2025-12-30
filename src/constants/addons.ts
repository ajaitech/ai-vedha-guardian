/**
 * AiVedha Guard - Addons Configuration
 * USD Only - PayPal Global Payments
 *
 * IMPORTANT: Credit packs use 1:1 ratio (1 USD = 1 credit)
 * No discounts/offers apply to addons
 * Maximum 5 of each addon per single purchase
 */

// Maximum quantity of each addon per purchase
export const MAX_ADDON_QUANTITY = 5;

export interface Addon {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'one_time' | 'recurring';
  credits?: number;
  price: number;
  unit?: string;
  icon: string;
  popular?: boolean;
  paypalPlanId?: string;
  maxQuantity?: number; // Max purchasable at once (default: MAX_ADDON_QUANTITY)
}

// Credit Packs - One-time purchases via PayPal Orders API
// MUST MATCH: Lambda CREDIT_PACKS and plans.ts CREDIT_PACKS
// Discounted pricing: larger packs = better value
export const CREDIT_PACKS: Addon[] = [
  {
    id: 'credits-5',
    code: 'credits-5',
    name: '5 Credits',
    description: '5 audit credits • $5 USD',
    type: 'one_time',
    credits: 5,
    price: 5,
    icon: 'Coins',
    maxQuantity: MAX_ADDON_QUANTITY,
  },
  {
    id: 'credits-10',
    code: 'credits-10',
    name: '10 Credits',
    description: '10 audit credits • $9 USD (10% off)',
    type: 'one_time',
    credits: 10,
    price: 9,
    icon: 'Coins',
    popular: true,
    maxQuantity: MAX_ADDON_QUANTITY,
  },
  {
    id: 'credits-25',
    code: 'credits-25',
    name: '25 Credits',
    description: '25 audit credits • $20 USD (20% off)',
    type: 'one_time',
    credits: 25,
    price: 20,
    icon: 'Coins',
    maxQuantity: MAX_ADDON_QUANTITY,
  },
  {
    id: 'credits-50',
    code: 'credits-50',
    name: '50 Credits',
    description: '50 audit credits • $35 USD (30% off)',
    type: 'one_time',
    credits: 50,
    price: 35,
    icon: 'Coins',
    maxQuantity: MAX_ADDON_QUANTITY,
  },
  {
    id: 'credits-100',
    code: 'credits-100',
    name: '100 Credits',
    description: '100 audit credits • $60 USD (40% off)',
    type: 'one_time',
    credits: 100,
    price: 60,
    icon: 'Coins',
    maxQuantity: MAX_ADDON_QUANTITY,
  },
];

// Feature Addons - Recurring subscriptions via PayPal Subscriptions API
// NOTE: API Access is NOT listed here - it's auto-included with ALL paid plans
// and managed in the backend. Users get API access automatically when subscribing.
export const RECURRING_ADDONS: Addon[] = [
  {
    id: 'scheduled_audits',
    code: 'scheduled_audits',
    name: 'Scheduled Audits',
    description: 'Automate security audits on your schedule',
    type: 'recurring',
    price: 25,
    unit: 'month',
    icon: 'Calendar',
    paypalPlanId: 'P-32U60387JT1483533NFDMXPA',
  },
  {
    id: 'whitelabel_cert',
    code: 'whitelabel_cert',
    name: 'White-Label Reports',
    description: 'Custom branded audit reports with your logo',
    type: 'recurring',
    price: 60,
    unit: 'month',
    icon: 'Award',
    popular: true,
    paypalPlanId: 'P-7PJ67808RA6591613NFDMXPI',
  },
];

// All addons combined
export const ALL_ADDONS: Addon[] = [...CREDIT_PACKS, ...RECURRING_ADDONS];

// Get addon by ID
export function getAddonById(addonId: string): Addon | undefined {
  return ALL_ADDONS.find((a) => a.id === addonId);
}

// Get credit pack by ID
export function getCreditPackById(packId: string): Addon | undefined {
  return CREDIT_PACKS.find((p) => p.id === packId);
}

// Get credit pack by credits amount
export function getCreditPackByCredits(credits: number): Addon | undefined {
  return CREDIT_PACKS.find((p) => p.credits === credits);
}

// Get recurring addon by ID
export function getRecurringAddonById(addonId: string): Addon | undefined {
  return RECURRING_ADDONS.find((a) => a.id === addonId);
}

// Format addon price for display
export function formatAddonPrice(addon: Addon): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(addon.price);

  return addon.type === 'recurring' ? `${formatted}/${addon.unit}` : formatted;
}
