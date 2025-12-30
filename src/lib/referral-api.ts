/**
 * AiVedha Guardian - Referral API Client
 * Handles all referral-related API calls
 */

import { APP_CONFIG } from '@/config';
import { logger } from './logger';

const API_BASE = APP_CONFIG.API_BASE_URL;

export interface ReferralStats {
  success: boolean;
  active_code: string;
  unique_code: string | null;
  is_common_code_active: boolean;
  total_referrals: number;
  total_bonus_earned: number;
  user_plan: string;
  is_paid_plan: boolean;
  can_earn_bonus: boolean;
  history: Array<{
    used_by: string;
    used_at: string;
    bonus_credited: boolean;
    is_common: boolean;
  }>;
}

export interface ReferralCodeResponse {
  success: boolean;
  referral_code: string;
  unique_code: string;
  is_common_code: boolean;
  can_earn_bonus: boolean;
  is_paid_plan: boolean;
  user_plan: string;
  unique_code_used: boolean;
}

export interface ShareContent {
  success: boolean;
  referral_link: string;
  referral_code: string;
  messages: {
    default: string;
    short: string;
    professional: string;
    whatsapp: string;
    twitter: string;
    linkedin: string;
  };
}

export interface ActivateReferralResponse {
  success: boolean;
  new_user_credits_added: number;
  owner_credits_added: number;
  owner_bonus_eligible: boolean;
  is_common_code: boolean;
  message: string;
  error?: string;
}

export interface ValidateCodeResponse {
  valid: boolean;
  is_used?: boolean;
  is_common_code?: boolean;
  message: string;
  error?: string;
}

class ReferralAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const authToken = localStorage.getItem('authToken');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  }

  /**
   * Generate or get referral code for user
   */
  async generateCode(email: string): Promise<ReferralCodeResponse> {
    return this.request<ReferralCodeResponse>('/referral/generate', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validate a referral code
   */
  async validateCode(code: string): Promise<ValidateCodeResponse> {
    return this.request<ValidateCodeResponse>('/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ referral_code: code }),
    });
  }

  /**
   * Activate referral when new user signs up
   */
  async activateReferral(
    referralCode: string,
    newUserEmail: string,
    senderEmail?: string
  ): Promise<ActivateReferralResponse> {
    return this.request<ActivateReferralResponse>('/referral/activate', {
      method: 'POST',
      body: JSON.stringify({
        referral_code: referralCode,
        new_user_email: newUserEmail,
        sender_email: senderEmail || '',
      }),
    });
  }

  /**
   * Get referral statistics for user
   */
  async getStats(email: string): Promise<ReferralStats> {
    return this.request<ReferralStats>('/referral/stats', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Get share content for referral
   */
  async getShareContent(referralCode: string, userName?: string, ownerEmail?: string): Promise<ShareContent> {
    return this.request<ShareContent>('/referral/share-content', {
      method: 'POST',
      body: JSON.stringify({
        referral_code: referralCode,
        user_name: userName || 'a friend',
        owner_email: ownerEmail || '',
      }),
    });
  }

  /**
   * Share referral using Web Share API
   */
  async shareReferral(referralCode: string, userName?: string, ownerEmail?: string): Promise<boolean> {
    try {
      const content = await this.getShareContent(referralCode, userName, ownerEmail);

      if (navigator.share) {
        await navigator.share({
          title: 'AiVedha Guard - AI Security Audits',
          text: content.messages.default,
          url: content.referral_link,
        });
        return true;
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${content.messages.short}\n\n${content.referral_link}`
        );
        return true;
      }
    } catch (error) {
      logger.error('Share failed:', error);
      return false;
    }
  }

  /**
   * Get referral link
   */
  getReferralLink(code: string, senderEmail?: string): string {
    const baseUrl = 'https://aivedha.ai';
    if (senderEmail) {
      return `${baseUrl}/login?ref=${code}&from=${encodeURIComponent(senderEmail)}`;
    }
    return `${baseUrl}/login?ref=${code}`;
  }
}

export default new ReferralAPI();
