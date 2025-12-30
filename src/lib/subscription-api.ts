// AiVedha Guard - Subscription API Client
// Handles all subscription-related API calls

import { logger } from './logger';
import { APP_CONFIG } from '@/config';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

interface RawInvoice {
  invoiceId?: string;
  invoice_id?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  date?: string;
  created_at?: string;
  dueDate?: string;
  due_date?: string;
  amount?: number;
  balance?: number;
  currency?: string;
  status?: string;
  pdfUrl?: string;
  pdf_url?: string;
}

class SubscriptionAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const authToken = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    };
  }

  private getUserId(): string | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.email || user.identityId || null;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeUserId: boolean = true
  ): Promise<T> {
    try {
      // Add userId to endpoint if needed
      let finalEndpoint = endpoint;
      if (includeUserId) {
        const userId = this.getUserId();
        if (userId) {
          const separator = endpoint.includes('?') ? '&' : '?';
          finalEndpoint = `${endpoint}${separator}userId=${encodeURIComponent(userId)}`;
        }
      }

      const response = await fetch(`${this.baseUrl}${finalEndpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...(options.headers || {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: unknown) {
      logger.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================
  // SUBSCRIPTION ENDPOINTS
  // ============================================

  /**
   * Get current user's subscription details
   */
  async getCurrentSubscription(): Promise<{
    planCode: string;
    planName: string;
    subscriptionId?: string;
    subscriptionNumber?: string;
    status: string;
    credits: { available: number; total: number };
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    nextBillingAt?: string;
    autoRenewal: boolean;
    amount?: number;
    currency?: string;
    activeAddons?: Array<{ code: string; name: string; price: number }>;
    isFreePlan: boolean;
  }> {
    const response = await this.request<any>('/subscription/current');
    const subscription = response.subscription || response;

    // Use API response directly - DynamoDB is the source of truth
    const planCode = subscription.subscription_plan || subscription.planCode || 'aarambh_free';
    const creditsValue = typeof subscription.credits === 'object'
      ? subscription.credits.available
      : (subscription.credits ?? 0);
    const totalCredits = subscription.total_credits || creditsValue || 3;

    return {
      planCode,
      planName: subscription.plan_name || subscription.plan || null,
      subscriptionId: subscription.subscription_id || subscription.subscriptionId,
      subscriptionNumber: subscription.subscription_number,
      status: subscription.status || 'free',
      credits: { available: creditsValue, total: totalCredits },
      currentPeriodStart: subscription.currentPeriodStart || subscription.activated_at,
      currentPeriodEnd: subscription.currentPeriodEnd || subscription.expires_at,
      nextBillingAt: subscription.nextBillingAt || subscription.next_billing_date,
      autoRenewal: subscription.autoRenewal ?? subscription.auto_renew ?? false,
      amount: subscription.amount,
      currency: subscription.currency || 'USD',
      activeAddons: subscription.activeAddons || [],
      isFreePlan: planCode === 'aarambh_free' || subscription.status === 'free',
    };
  }

  /**
   * Create checkout session for new subscription
   */
  async createCheckout(data: {
    planCode: string;
    couponCode?: string;
    addons?: Array<{ code: string }>;
  }): Promise<{
    hostedPageId: string;
    hostedPageUrl: string;
    expiresAt?: string;
    planCode: string;
    credits: number;
  }> {
    return this.request('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Confirm subscription after PayPal redirect
   */
  async confirmSubscription(data: {
    subscriptionId: string;
    planCode?: string;
    planName?: string;
    customerEmail?: string;
  }): Promise<{
    success: boolean;
    subscriptionId: string;
    subscriptionNumber: string;
    planCode: string;
    planName: string;
    credits: number;
    status: string;
    currentPeriodEnd?: string;
  }> {
    return this.request('/subscription/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Upgrade/downgrade subscription
   */
  async upgradeSubscription(newPlanCode: string): Promise<{
    hostedPageId: string;
    hostedPageUrl: string;
    newPlanCode: string;
    newCredits: number;
  }> {
    return this.request('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planCode: newPlanCode }),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(cancelAtEnd: boolean = true, reason?: string): Promise<{
    success: boolean;
    message: string;
    effectiveDate: string;
  }> {
    return this.request('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ cancelAtEnd, reason }),
    });
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(): Promise<{
    success: boolean;
    message: string;
    status: string;
  }> {
    return this.request('/subscription/reactivate', {
      method: 'POST',
    });
  }

  /**
   * Update payment method - returns hosted page URL
   */
  async updatePaymentMethod(): Promise<{
    hostedPageId: string;
    hostedPageUrl: string;
  }> {
    return this.request('/subscription/update-payment', {
      method: 'POST',
    });
  }

  // ============================================
  // INVOICE ENDPOINTS
  // ============================================

  /**
   * Get user's invoices
   */
  async getInvoices(): Promise<{
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      date: string;
      dueDate?: string;
      amount: number;
      balance?: number;
      currency: string;
      status: string;
      pdfUrl?: string;
    }>;
  }> {
    try {
      const response = await this.request<any>('/subscription/invoices');
      // Handle both {invoices: [...]} and {success: true, invoices: [...]} formats
      const invoices = response.invoices || [];
      return {
        invoices: invoices.map((inv: RawInvoice) => ({
          invoiceId: inv.invoiceId || inv.invoice_id || '',
          invoiceNumber: inv.invoiceNumber || inv.invoice_number || '',
          date: inv.date || inv.created_at || '',
          dueDate: inv.dueDate || inv.due_date,
          amount: inv.amount || 0,
          balance: inv.balance,
          currency: inv.currency || 'USD',
          status: inv.status || 'unknown',
          pdfUrl: inv.pdfUrl || inv.pdf_url,
        })),
      };
    } catch (error) {
      logger.error('Failed to fetch invoices:', error);
      return { invoices: [] };
    }
  }

  // ============================================
  // COUPON ENDPOINTS
  // ============================================

  /**
   * Validate a coupon code
   */
  async validateCoupon(
    couponCode: string,
    planCode?: string
  ): Promise<{
    valid: boolean;
    code?: string;
    name?: string;
    discount?: number;
    discountType?: 'percentage' | 'flat';
    description?: string;
    error?: string;
  }> {
    return this.request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ couponCode, planCode }),
    });
  }

  // ============================================
  // CREDIT/ADDON ENDPOINTS
  // ============================================

  /**
   * Purchase credit pack
   */
  async purchaseCredits(addonCode: string): Promise<{
    hostedPageId: string;
    hostedPageUrl: string;
    addonCode: string;
    credits: number;
  }> {
    return this.request('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({ addonCode }),
    });
  }

  /**
   * Get available plans
   */
  async getPlans(): Promise<{
    plans: Array<{
      code: string;
      name: string;
      credits: number;
    }>;
  }> {
    return this.request('/plans');
  }

  /**
   * Get available addons
   */
  async getAddons(): Promise<{
    creditPacks: Array<{ code: string; credits: number; type: 'one_time' }>;
    recurringAddons: Array<{ code: string; type: 'recurring' }>;
  }> {
    return this.request('/addons');
  }

  // ============================================
  // PORTAL ENDPOINTS
  // ============================================

  /**
   * Get customer portal SSO token and URL
   */
  async getPortalToken(): Promise<{
    portalUrl: string;
    token?: string;
    expiresAt?: string;
  }> {
    return this.request('/subscription/portal-token', {
      method: 'POST',
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get user's credit balance
   */
  async getCreditBalance(): Promise<{
    available: number;
    total: number;
    planCode: string;
  }> {
    const subscription = await this.getCurrentSubscription();
    return {
      available: subscription.credits.available,
      total: subscription.credits.total,
      planCode: subscription.planCode,
    };
  }

  /**
   * Check if user has credits available
   */
  async hasCredits(): Promise<boolean> {
    try {
      const { available } = await this.getCreditBalance();
      return available > 0;
    } catch {
      return false;
    }
  }

  /**
   * Deduct credit after successful audit (called by audit service)
   */
  async deductCredit(auditId: string): Promise<{
    success: boolean;
    creditsRemaining: number;
  }> {
    return this.request('/credits/deduct', {
      method: 'POST',
      body: JSON.stringify({ auditId }),
    });
  }
}

// Export singleton instance
const SubscriptionAPI = new SubscriptionAPIClient();
export default SubscriptionAPI;

// Export class for custom instances
export { SubscriptionAPIClient };
