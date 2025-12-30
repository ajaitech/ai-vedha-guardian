// API configuration and utilities for AiVedha Guard
// See src/types/audit.types.ts for the unified type definitions (single source of truth)
import { logger } from './logger';
import {
  ScanRegion,
  detectUserRegion,
  selectOptimalRegion,
  getRegionEndpoint,
  getRegionStaticIP,
  REGIONS,
} from './regionRouter';
import { API_KEY_CONFIG } from '../config';
import {
  API_VERSION,
  BUILD_TIMESTAMP,
  type AuditRequestParams,
  type AuditResponseBase,
  type AuditResponseCompleted,
  type AuditResponseProcessing,
  type AuditResponseFailed,
  type AuditItemStatus as UnifiedAuditItemStatus,
  type Vulnerability,
  normalizeResponse,
} from '../types/audit.types';

// Re-export for consumers
export { API_VERSION, BUILD_TIMESTAMP };

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'https://api.aivedha.ai/api';
const ABSOLUTE_PROD_API_BASE = 'https://api.aivedha.ai/api';
// S3 bucket URL is no longer exposed - all downloads go through API presigned URLs

// ============================================================================
// AUDIT REQUEST/RESPONSE TYPES (v4.0.0 with backward compatibility)
// ============================================================================

export interface AuditRequest {
  url: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  auditMetadata?: {
    userLocation?: {
      latitude: number;
      longitude: number;
      city?: string;
      country?: string;
    };
    locationPermissionStatus?: string;
    browserInfo?: {
      userAgent: string;
      language: string;
      platform: string;
    };
    timezone?: string;
    timestamp?: string;
    consentAccepted?: boolean;
    recaptchaVerified?: boolean;
  };
  augmentationMode?: 'parallel-augment' | 'orchestrated-augment' | 'legacy-only';
  scanDepth?: 'standard' | 'deep' | 'comprehensive';
  // Region routing - optional, will be auto-detected if not provided
  scanRegion?: ScanRegion;
  preferredRegion?: ScanRegion;
}

export interface AttackChainStep {
  step: number;
  action: string;
  severity: string;
  findingId?: string;
}

export interface AttackChain {
  chainId: string;
  name: string;
  exploitabilityScore: number;
  steps: AttackChainStep[];
  impact: string;
  remediationPriority: number;
}

export interface AuditVulnerability {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
  owasp_category?: string;
  cwe_id?: string;
  cvss_score?: number;
  cve_id?: string;
  ai_fix_steps?: string;
  ai_enhanced?: boolean;
  ai_analysis?: string;
  url?: string;
  affected_url?: string;
  affected_urls?: string[];
  evidence?: string;
  impact?: string;
  fix_code?: string;
  confidence?: number;
  dedupeFingerprint?: string;
  aggregation_count?: number;
  affectedUrls?: string[];
}

// Per-item audit status from Lambda (v6.0.0)
export interface AuditItemStatus {
  id: number;
  name: string;
  status: 'pending' | 'scanning' | 'success' | 'failed';
  issues: number;
  error?: string; // Error reason if status is 'failed'
}

export interface AuditResponse {
  // Core fields (backward compatible)
  report_id: string;
  reportId?: string; // Alias for backward compatibility
  status: string;
  success?: boolean; // Indicates if the request was successful
  message?: string;
  error?: string;

  // URL and timestamps
  url?: string;
  created_at?: string;

  // Security scoring
  security_score: number;
  securityScore?: number; // Alias
  grade?: string;

  // Vulnerability counts
  vulnerabilities_count: number;
  vulnerabilitiesCount?: number; // Alias
  critical_issues: number;
  high_issues?: number;
  medium_issues: number;
  low_issues: number;
  info_issues?: number;

  // SSL/TLS
  ssl_status: string;
  ssl_grade?: string;
  ssl_valid?: boolean;
  ssl_info?: Record<string, unknown>;

  // Security headers
  headers_score: number;
  security_headers?: Record<string, unknown>;

  // DNS Security
  dns_security?: Record<string, unknown>;

  // Detailed findings
  vulnerabilities: AuditVulnerability[];

  // Sensitive files
  sensitive_files?: string[];
  sensitive_files_found?: number;

  // Content analysis
  content_analysis?: Record<string, unknown>;

  // Certificate & Report
  certificate_number?: string;
  pdf_report_url?: string;

  // Credit tracking
  credit_used?: boolean;
  credits_remaining?: number;

  // Scan metadata
  scan_version?: string;
  scanVersion?: string;
  scan_depth?: string;

  // v4.0.0 Augmentation fields
  attackChains?: AttackChain[];
  totalFindingsUnique?: number;
  aggregationStats?: {
    totalRaw: number;
    totalUnique: number;
    duplicatesRemoved: number;
  };
  augmentationMode?: string;

  // Real-time progress tracking - Lambda returns these fields
  progressPercent?: number;
  progress?: number; // Alias for progressPercent
  percentage?: number; // Lambda field: percentage
  overall_progress?: number; // Lambda field: overall_progress
  currentStage?: string;
  phase?: string; // Lambda field: current phase name
  stageDescription?: string;
  current_activity?: string; // Lambda field: current activity description
  updatedAt?: string;
  findings_count?: number; // Lambda field: real-time issues found
  findingsCount?: number; // camelCase alias
  progressDetails?: {
    currentVulnerability?: number;
    totalVulnerabilities?: number;
  };
  etaSeconds?: number;

  // Per-item tracking (NEW: v6.0.0)
  current_item?: number; // Current audit item number (1-41)
  total_items?: number; // Total audit items (41)
  audit_items?: AuditItemStatus[]; // Per-item status with issues

  // Technology detection
  technology_stack?: string[];

  // Scan timestamp (alias for created_at)
  scan_timestamp?: string;

  // Security analysis results (from Lambda)
  waf_detection?: {
    detected: boolean;
    provider?: string;
    confidence?: number;
    evidence?: string[];
  };

  cors_analysis?: {
    enabled: boolean;
    allow_origin?: string;
    allow_credentials?: boolean;
    allow_methods?: string[];
    allow_headers?: string[];
    issues?: string[];
  };

  cloud_security?: {
    provider?: string;
    services_detected?: string[];
    misconfigurations?: string[];
    exposed_resources?: string[];
  };

  subdomain_enumeration?: {
    subdomains?: string[];
    total_found?: number;
    vulnerable?: string[];
    takeover_risk?: string[];
  };

  // API response property aliases (snake_case from Lambda)
  progress_percent?: number;
  current_stage?: string;
  stage_description?: string;
  vulnerability_count?: number;

  // Region routing fields (v5.0.0)
  scanRegion?: ScanRegion; // Region where scan was performed
  staticIP?: string; // Static IP used for scanning
  regionName?: string; // Human-readable region name (USA/India)
  usedFallbackRegion?: boolean; // True if fallback region was used
  attemptedRegions?: ScanRegion[]; // Regions attempted (for diagnostics)
}

export interface CertificateData {
  report_id: string;
  url: string;
  asset?: string;
  user_name: string;
  user_email: string;
  organization_name?: string;
  customer_name?: string;
  security_score: number;
  grade?: string;
  critical_issues: number;
  high_issues?: number;
  medium_issues: number;
  low_issues?: number;
  info_issues?: number;
  vulnerabilities_count?: number;
  seo_score: number;
  scan_date: string;
  document_number: string;
  pdf_location: string;
  ssl_grade?: string;
  ssl_issuer?: string;
  ssl_expiry?: string;
}

class AivedhaAPI {
  private static async makeRequest(endpoint: string, options: RequestInit = {}, timeoutMs = 15000, region: ScanRegion = 'us-east-1') {
    const url = `${this.getBaseUrl()}${endpoint}`;

    // Get API key for the target region
    const apiKey = API_KEY_CONFIG.getKey(region);

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'x-api-key': apiKey }),
        ...options.headers,
      },
      ...options,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...defaultOptions, signal: controller.signal });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        if (isJson) {
          try {
            const errJson = await response.json();
            if (errJson?.message) errorMessage = `${errorMessage} - ${errJson.message}`;
          } catch (parseError) {
            // Failed to parse error response JSON - use default error message
            logger.warn('Failed to parse error response JSON:', parseError);
          }
        }
        throw new Error(errorMessage);
      }

      return isJson ? response.json() : response.text();
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.name === 'AbortError') {
        throw new Error('Network timeout: The server took too long to respond.');
      }
      throw new Error(`Network error: ${error?.message || 'Unable to reach API'}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Start a security audit with smart region routing
   * v5.0.0: Dual-region support (USA + India) with automatic fallback
   *
   * Region selection priority:
   * 1. User's preferred region (if provided)
   * 2. Target URL's region (based on TLD like .in, .my, .sg)
   * 3. User's detected region (based on timezone)
   * 4. Default to USA (us-east-1)
   */
  static async startAudit(request: AuditRequest): Promise<AuditResponse> {
    // Detect user's region based on timezone
    const userRegion = detectUserRegion();

    // Select optimal region for the target URL
    const selectedRegion = selectOptimalRegion(
      request.url,
      userRegion,
      request.preferredRegion
    );

    // Try primary region first
    try {
      const response = await this.startAuditInRegion(request, selectedRegion);
      return response;
    } catch (primaryError) {
      // Primary region failed - try fallback region
      const fallbackRegion: ScanRegion = selectedRegion === 'us-east-1' ? 'ap-south-1' : 'us-east-1';

      logger.warn('Primary region failed, trying fallback', {
        primaryRegion: selectedRegion,
        fallbackRegion,
        error: primaryError instanceof Error ? primaryError.message : 'Unknown error',
      });

      try {
        const response = await this.startAuditInRegion(request, fallbackRegion);
        // Mark response to indicate fallback was used
        return {
          ...response,
          usedFallbackRegion: true,
          attemptedRegions: [selectedRegion, fallbackRegion],
        };
      } catch (fallbackError) {
        // Both regions failed - throw comprehensive error
        logger.error('Both regions failed for audit', {
          primaryRegion: selectedRegion,
          fallbackRegion,
          primaryError: primaryError instanceof Error ? primaryError.message : 'Unknown',
          fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown',
        });

        throw new Error(
          `Unable to start security audit from any region. ` +
          `The target site may be blocking our scanning servers. ` +
          `Attempted regions: ${selectedRegion} and ${fallbackRegion}. ` +
          `Please whitelist our IP addresses for full scanning.`
        );
      }
    }
  }

  /**
   * Start audit in a specific region
   * Internal method used by startAudit for region-specific requests
   */
  private static async startAuditInRegion(
    request: AuditRequest,
    region: ScanRegion
  ): Promise<AuditResponse> {
    const regionEndpoint = getRegionEndpoint(region);
    const staticIP = getRegionStaticIP(region);
    const regionName = REGIONS[region].regionName;

    logger.info(`Starting audit in ${regionName} region`, {
      region,
      endpoint: regionEndpoint,
      targetUrl: request.url,
    });

    const payload = {
      url: request.url,
      userId: request.userId,
      userEmail: request.userEmail,
      userName: request.userName,
      auditMetadata: request.auditMetadata,
      augmentationMode: request.augmentationMode,
      scanDepth: request.scanDepth || 'standard',
      scanRegion: region,
      staticIP: staticIP,
    };

    // Make request to region-specific endpoint
    const fullUrl = `${regionEndpoint}/audit/start`;

    // Get API key for the target region
    const apiKey = API_KEY_CONFIG.getKey(region);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-api-key': apiKey }),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Region ${region} returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      // Ensure region info is included in response
      return {
        ...data,
        scanRegion: region,
        staticIP: staticIP,
        regionName: regionName,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request to ${regionName} region timed out after 3 minutes`);
      }
      throw error;
    }
  }

  /**
   * Get audit status by report ID
   * Returns progress percentage and current stage for UI updates
   * Uses a longer timeout (30s) since status checks can take time during heavy processing
   */
  static async getAuditStatus(reportId: string): Promise<AuditResponse> {
    return this.makeRequest(`/audit/status/${reportId}`, {}, 30000);
  }

  /**
   * Poll audit status until completion or timeout
   * Includes retry logic for transient network failures
   * @param reportId - The report ID to poll
   * @param onProgress - Callback for progress updates (progress, stage, stageDescription, issuesFound, auditItems)
   * @param maxWaitMs - Maximum wait time (default 1 hour - no artificial limits)
   * @returns Final audit response
   */
  static async pollAuditStatus(
    reportId: string,
    onProgress?: (
      progress: number,
      stage: string,
      stageDescription?: string,
      issuesFound?: number,
      auditItems?: AuditItemStatus[],
      currentItem?: number
    ) => void,
    maxWaitMs: number = 3600000
  ): Promise<AuditResponse> {
    const startTime = Date.now();
    const pollIntervalMs = 2000; // Poll every 2 seconds for responsive UI
    const maxRetries = 3; // Max retries for transient failures
    let consecutiveErrors = 0;
    let lastError: Error | null = null;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.getAuditStatus(reportId);

        // Reset error counter on successful request
        consecutiveErrors = 0;
        lastError = null;

        // Report progress if callback provided - include stageDescription and issue count for better UI feedback
        // Lambda returns: percentage, overall_progress, phase, findings_count, audit_items, current_item
        const progressValue = status.progressPercent ?? status.percentage ?? status.overall_progress ?? status.progress;
        if (onProgress && progressValue !== undefined) {
          const stage = status.currentStage || status.phase || status.status || 'processing';
          const stageDesc = status.stageDescription || status.current_activity || status.message || '';
          // Lambda returns findings_count in progress, vulnerability_count in results
          const issuesFound = status.findings_count || status.findingsCount ||
                              status.vulnerabilities_count || status.vulnerabilitiesCount ||
                              status.vulnerability_count || 0;
          // Per-item tracking (NEW: v6.0.0)
          const auditItems = status.audit_items;
          const currentItem = status.current_item;
          onProgress(progressValue, stage, stageDesc, issuesFound, auditItems, currentItem);
        }

        // Check if audit is complete or timed out
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'timed_out') {
          return status;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        consecutiveErrors++;
        lastError = error as Error;

        logger.warn(`Polling error (attempt ${consecutiveErrors}/${maxRetries}):`, error);

        // If we've exceeded max retries, throw the error
        if (consecutiveErrors >= maxRetries) {
          throw new Error(`Network connection lost after ${maxRetries} retries. Please check your internet connection and try again. Last error: ${lastError?.message || 'Unknown error'}`);
        }

        // Wait with exponential backoff before retry (2s, 4s, 8s)
        const backoffMs = pollIntervalMs * Math.pow(2, consecutiveErrors - 1);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error('Audit polling timeout exceeded');
  }

  /**
   * Get attack chains for an audit (v4.0.0 feature)
   */
  static async getAttackChains(reportId: string): Promise<AttackChain[]> {
    const status = await this.getAuditStatus(reportId);
    return status.attackChains || [];
  }

  static async getCertificate(certificateNumber: string): Promise<CertificateData> {
    return this.makeRequest(`/certificate/${certificateNumber}`);
  }

  static async downloadReport(reportId: string): Promise<void> {
    const url = `${this.getBaseUrl()}/download/${reportId}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Download API error:', errorText);
        throw new Error('Unable to download report. Please try again later.');
      }

      const data = await response.json();

      if (!data.success || !data.downloadUrl) {
        throw new Error(data.error || 'Report download is temporarily unavailable.');
      }

      // Download the PDF from the presigned URL (secure - no bucket paths exposed)
      await this.downloadPdfFromUrl(data.downloadUrl, data.filename);
    } catch (error) {
      logger.error('Download report error:', error);
      // Re-throw with user-friendly message (no technical details)
      throw new Error('Unable to download report. Please try again or contact support.');
    }
  }

  /**
   * Verify reCAPTCHA token
   */
  static async verifyRecaptcha(token: string): Promise<{ success: boolean; error?: string }> {
    return this.makeRequest('/recaptcha/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Download PDF from a presigned URL
   * Opens in new tab to avoid CORS/CSP restrictions
   * SECURITY: Never construct S3 URLs in frontend - always use API presigned URLs
   */
  static async downloadPdfFromUrl(pdfUrl: string, filename?: string): Promise<void> {
    // Validate that we have a proper URL
    if (!pdfUrl || (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://'))) {
      throw new Error('Invalid download URL. Please try again.');
    }

    // For presigned S3 URLs, open directly in new tab
    // This avoids CORS/CSP restrictions and lets browser handle the download
    const isPresignedUrl = pdfUrl.includes('X-Amz-Signature') ||
                           pdfUrl.includes('.s3.') ||
                           pdfUrl.includes('s3.amazonaws.com');

    if (isPresignedUrl) {
      window.open(pdfUrl, '_blank');
      return;
    }

    // For other URLs, try blob download
    try {
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*'
        }
      });

      if (!response.ok) {
        throw new Error('Download failed. Please try again.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `AiVedha_Security_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('PDF download error:', error);
      // Fallback: open in new tab
      window.open(pdfUrl, '_blank');
    }
  }

  static async validateCoupon(code: string): Promise<{ valid: boolean; discount: number }> {
    return this.makeRequest('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  static async processPayment(paymentData: Record<string, unknown>): Promise<{ success: boolean; redirectUrl?: string }> {
    return this.makeRequest('/payment/process', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  static async authenticateUser(email: string, password: string): Promise<{ success: boolean; token?: string; user?: { email: string; fullName?: string; plan?: string; credits?: number } }> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async registerUser(userData: { email: string; password: string; fullName?: string; defaultCredits?: number; plan?: string; isNewUser?: boolean }): Promise<{ success: boolean; token?: string; error?: string; user?: { email: string; fullName?: string; plan?: string; credits?: number } }> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Register startup with special benefits
  static async registerStartup(startupData: {
    email: string;
    founderName: string;
    startupName: string;
    website?: string;
    pitch?: string;
    stage?: string;
    couponCode: string;
  }): Promise<{ success: boolean; message?: string; couponCode?: string; credits?: number }> {
    return this.makeRequest('/startup/register', {
      method: 'POST',
      body: JSON.stringify({
        ...startupData,
        plan: 'aarambh',
        defaultCredits: 3,
        source: 'startup_program'
      }),
    });
  }

  // Activate subscription after payment
  static async activateSubscription(subscriptionData: {
    email: string;
    fullName: string;
    plan: string;
    credits: number | string;
    amount: number;
    currency: string;
    paymentMethod: string;
    timestamp: string;
    hostedpageId?: string;
    subscriptionId?: string;
  }): Promise<{ success: boolean; message?: string; already_activated?: boolean; user?: { email: string; fullName?: string; plan?: string; credits?: number | string; subscriptionId?: string; subscription_id?: string } }> {
    return this.makeRequest('/subscription/activate', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  }

  // DEPRECATED: Use getUserDashboardData() instead - this method causes 404
  // API Gateway expects query param, not path param
  static async getUserDashboard(userId: string): Promise<{ user?: { credits?: number; plan?: string; totalAudits?: number }; audits?: Array<{ report_id: string; url: string; created_at: string; status: string; security_score?: number }> }> {
    // Redirect to correct method with query param
    return this.makeRequest(`/user/dashboard?userId=${encodeURIComponent(userId)}`);
  }

  // Fetch user credits from backend
  static async getUserCredits(userId: string): Promise<{ credits: number | string; plan?: string }> {
    return this.makeRequest(`/user/credits?userId=${encodeURIComponent(userId)}`);
  }

  // Subscription Management
  static async getCurrentSubscription(userId: string): Promise<{
    planCode: string;
    planName: string;
    status: string;
    credits: { available: number; total: number };
    currentPeriodEnd?: string;
    autoRenewal: boolean;
    subscriptionId?: string;
  }> {
    return this.makeRequest(`/subscription/current?userId=${encodeURIComponent(userId)}`);
  }

  // Fetch available plans and addons
  static async getAvailablePlans(): Promise<{
    success: boolean;
    plans: Array<{
      planCode: string;
      name: string;
      description: string;
      price: number;
      interval: number;
      intervalUnit: string;
      trialPeriod: number;
      setupFee: number;
      status: string;
      customFields: Array<{ label: string; value: string }>;
    }>;
    addons: Array<{
      addonCode: string;
      name: string;
      description: string;
      price: number;
      type: string;
      unitName: string;
      status: string;
    }>;
  }> {
    return this.makeRequest('/subscription/plans');
  }

  static async createCheckoutSession(data: {
    planCode: string;
    currency?: 'USD';
    billingCycle: 'monthly' | 'yearly';
    couponCode?: string;
    email: string;
    fullName: string;
    phone?: string;
    addons?: string[];
    whiteLabelConfig?: { brandName: string; domain: string };
    // Transaction tracking parameters
    clientTransactionId?: string;
    userAgent?: string;
    timezone?: string;
    sessionId?: string;
    source?: string;
  }): Promise<{ hostedPageUrl: string; hostedPageId: string; transactionId?: string }> {
    // Always use USD globally via PayPal
    const requestData = {
      ...data,
      currency: 'USD',
    };
    return this.makeRequest('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }, 60000); // 60 second timeout for PayPal checkout
  }

  // Get customer onboarding page URL
  static async getCustomerOnboardingPage(data: {
    email: string;
    fullName: string;
  }): Promise<{
    hostedPageUrl: string;
    hostedPageId: string;
    success?: boolean;
    useInternalForm?: boolean;
    customerId?: string;
    user?: { credits?: number; email?: string };
  }> {
    return this.makeRequest('/customer/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Purchase credit pack via PayPal
   *
   * CRITICAL: DO NOT CHANGE THIS ENDPOINT!
   * ========================================
   * Correct endpoint: /paypal/credits -> paypal-handler Lambda (creates PayPal order, returns hostedPageUrl)
   * WRONG endpoint:   /credits/purchase -> subscription-manager Lambda (returns redirect URL, NOT PayPal checkout)
   *
   * Bug fixed on 2025-12-23: Was calling /credits/purchase which does NOT create PayPal order.
   * The /paypal/credits endpoint in paypal-handler Lambda actually calls PayPal API to create order.
   */
  static async purchaseCredits(data: {
    packId: string;
    currency?: 'USD';
    email: string;
    fullName: string;
    phone?: string;
    couponCode?: string;
    clientTransactionId?: string;
    userAgent?: string;
    timezone?: string;
    sessionId?: string;
    source?: string;
  }): Promise<{
    hostedPageUrl?: string;
    hostedPageId?: string;
    transactionId?: string;
    free_order?: boolean;
    credits_added?: boolean;
    credits?: number;
    message?: string;
  }> {
    const requestData = {
      pack: data.packId,
      userId: data.email,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone,
      couponCode: data.couponCode,
      clientTransactionId: data.clientTransactionId,
      userAgent: data.userAgent,
      timezone: data.timezone,
      sessionId: data.sessionId,
      source: data.source,
    };
    // CORRECT ENDPOINT - DO NOT CHANGE
    return this.makeRequest('/paypal/credits', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }, 60000); // 60 second timeout for PayPal checkout
  }

  static async cancelSubscription(subscriptionId: string, cancelAtEnd: boolean = true): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId, cancelAtEnd }),
    });
  }

  static async updatePaymentMethod(subscriptionId: string): Promise<{ hostedPageUrl: string }> {
    return this.makeRequest('/subscription/update-payment', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    });
  }

  static async getInvoices(userId: string): Promise<{
    success: boolean;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      date: string;
      amount: number;
      currency: string;
      status: string;
      pdfUrl?: string;
    }>;
  }> {
    return this.makeRequest(`/subscription/invoices?userId=${encodeURIComponent(userId)}`);
  }

  // Get subscription portal URL
  static async getSubscriptionPortalUrl(userId: string): Promise<{
    success: boolean;
    portalUrl?: string;
    error?: string;
  }> {
    return this.makeRequest('/subscription/portal-token', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Update user profile - accepts partial updates for any profile fields
  static async updateUserProfile(userId: string, profile: {
    fullName?: string;
    email?: string;
    phone?: string;
    category?: string;
    orgName?: string;
    gstin?: string;
    pan?: string;
    address?: {
      street?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      pinCode?: string;
    };
    employment?: {
      jobTitle?: string;
      company?: string;
      industry?: string;
    };
    organization?: {
      name?: string;
      size?: string;
      website?: string;
    };
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.makeRequest('/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'update_profile', userId, ...profile }),
    });
  }

  // Get user subscription status
  static async getSubscriptionStatus(userId: string): Promise<{
    success: boolean;
    subscription?: {
      subscription_id: string;
      plan: string;
      subscription_plan: string;
      status: string;
      activated_at: string;
      expires_at: string;
      amount: number;
      currency: string;
      next_billing_date: string;
      payment_method: string;
      auto_renew: boolean;
    };
    error?: string;
  }> {
    return this.makeRequest(`/subscription/status?userId=${encodeURIComponent(userId)}`);
  }

  // Sync subscription with billing provider
  static async syncSubscription(userId: string, subscriptionId?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.makeRequest('/subscription/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, subscriptionId }),
    });
  }

  static async validateCouponWithPlan(code: string, planId?: string, currency?: string): Promise<{
    valid: boolean;
    discount: number;
    type: 'percentage' | 'flat';
    message?: string;
  }> {
    return this.makeRequest('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, planId, currency }),
    });
  }

  // Register or update user from Google OAuth
  // NOTE: This endpoint does NOT require x-api-key header - it uses OAuth token
  static async registerGoogleUser(userData: {
    email: string;
    fullName: string;
    googleId: string;
    picture?: string;
    identityId?: string;
    defaultCredits?: number;
    isNewUser?: boolean;
  }): Promise<{ success: boolean; credits?: number; plan?: string; isNewUser?: boolean }> {
    // Direct fetch without x-api-key header (Google auth uses OAuth, not API key)
    const url = `${this.getBaseUrl()}/auth/google`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NOTE: No x-api-key header - this endpoint uses OAuth token authentication
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Google authentication failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error) errorMessage = errorJson.error;
        if (errorJson?.message) errorMessage = errorJson.message;
      } catch (parseError) {
        // Failed to parse Google auth error response JSON - use default error message
        logger.warn('Failed to parse Google auth error response JSON:', parseError);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static async checkConnectivity(): Promise<{ tests: { name: string; status: 'pass' | 'fail'; detail: string }[] }> {
    const tests: { name: string; status: 'pass' | 'fail'; detail: string }[] = [];

    const base = this.getBaseUrl();

    const capture = async (
      name: string,
      url: string,
      init: RequestInit
    ) => {
      try {
        const res = await fetch(url, init);
        const wanted = [
          'server',
          'date',
          'access-control-allow-origin',
          'access-control-allow-credentials',
          'content-type',
        ];
        const headersObj: Record<string, string | null> = {};
        wanted.forEach((h) => {
          const v = res.headers.get(h);
          if (v) headersObj[h] = v;
        });
        let bodySnippet = '';
        try {
          const text = await res.text();
          if (text) bodySnippet = text.slice(0, 300).replace(/\s+/g, ' ').trim();
        } catch (readError) {
          // Failed to read response body for diagnostics - non-critical
          logger.warn('Failed to read response body for connectivity test:', readError);
        }
        const parts = [`HTTP ${res.status} ${res.statusText}`];
        if (Object.keys(headersObj).length) parts.push(`headers: ${JSON.stringify(headersObj)}`);
        if (!res.ok && bodySnippet) parts.push(`body: ${bodySnippet}`);
        const detail = parts.join(' | ');

        const pass =
          res.ok ||
          (name.toLowerCase().includes('invalid credentials') && (res.status === 400 || res.status === 401));
        tests.push({ name, status: pass ? 'pass' : 'fail', detail });
      } catch (e: unknown) {
        const error = e as Error;
        tests.push({ name, status: 'fail', detail: error?.message || 'Network error' });
      }
    };

    // 1) Basic reachability (relative base)
    await capture('Health endpoint', `${base}/health`, { method: 'GET' });

    // 2) Absolute production reachability (bypasses dev proxy)
    await capture('Health endpoint (absolute prod)', `${ABSOLUTE_PROD_API_BASE}/health`, { method: 'GET' });

    // 3) CORS preflight simulation to login
    await capture('CORS preflight (/auth/login)', `${base}/auth/login`, {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' },
    });

    // 4) POST invalid credentials (should be 400/401)
    await capture('Login endpoint (invalid credentials)', `${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid@example.com', password: 'wrong' }),
    });

    return { tests };
  }

  static setBaseUrlOverride(url: string) {
    try {
      if (url) localStorage.setItem('API_BASE_OVERRIDE', url);
    } catch (error) {
      // Failed to set API base URL override in localStorage - non-critical
      logger.warn('Failed to set API base URL override:', error);
    }
  }

  static clearBaseUrlOverride() {
    try {
      localStorage.removeItem('API_BASE_OVERRIDE');
    } catch (error) {
      // Failed to clear API base URL override from localStorage - non-critical
      logger.warn('Failed to clear API base URL override:', error);
    }
  }

  static getBaseUrl(): string {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramVal = params.get('apiBase');
      if (paramVal) {
        try {
          localStorage.setItem('API_BASE_OVERRIDE', paramVal);
        } catch (storageError) {
          // Failed to persist API base URL override to localStorage - non-critical
          logger.warn('Failed to persist API base URL override:', storageError);
        }
        return paramVal;
      }
      const stored = localStorage.getItem('API_BASE_OVERRIDE');
      if (stored) return stored;
    } catch (error) {
      // Failed to get API base URL override - use default
      logger.warn('Failed to get API base URL override:', error);
    }
    return API_BASE_URL;
  }

  // ============================================================================
  // ADDON APIs
  // ============================================================================

  // White Label Certificate Addon - routes to /addons/purchase with addonType
  static async configureWhiteLabel(data: {
    userId: string;
    brandName: string;
    domain: string;
  }): Promise<{ success: boolean; config?: { brandName: string; domain: string; expiresAt?: string }; error?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'whitelabel',
        action: 'configure',
        userId: data.userId,
        brandName: data.brandName,
        domain: data.domain,
      }),
    });
  }

  static async getWhiteLabelConfig(userId: string): Promise<{ config: { brandName: string; domain: string; status: string; addonActive?: boolean; expiresAt?: string } | null }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'whitelabel',
        action: 'get_config',
        userId: userId,
      }),
    });
  }

  static async validateWhiteLabelAddon(userId: string): Promise<{ hasAddon: boolean; expiresAt?: string; reason?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'whitelabel',
        action: 'validate_addon',
        userId: userId,
      }),
    });
  }

  static async deleteWhiteLabelConfig(userId: string): Promise<{ success: boolean }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'whitelabel',
        action: 'delete_config',
        userId: userId,
      }),
    });
  }

  // Alias for saveWhiteLabelConfig - same as configureWhiteLabel
  static async saveWhiteLabelConfig(data: {
    userId: string;
    brandName: string;
    domain: string;
  }): Promise<{ success: boolean; config?: { brandName: string; domain: string; expiresAt?: string }; error?: string }> {
    return this.configureWhiteLabel(data);
  }

  // Scheduled Audits Addon - routes to /addons/purchase with addonType
  static async createSchedule(data: {
    userId: string;
    url: string;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    startDate: string;
    startTime: string;
    endDate?: string;
    endTime?: string;
  }): Promise<{ success: boolean; schedule?: { scheduleId: string; url: string; frequency: string; status: string; nextRun?: string }; error?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'create',
        userId: data.userId,
        url: data.url,
        frequency: data.frequency,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
      }),
    });
  }

  static async updateSchedule(data: {
    scheduleId: string;
    userId: string;
    url?: string;
    frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  }): Promise<{ success: boolean; schedule?: { scheduleId: string; url: string; frequency: string; status: string; nextRun?: string }; error?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'update',
        scheduleId: data.scheduleId,
        userId: data.userId,
        url: data.url,
        frequency: data.frequency,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
      }),
    });
  }

  static async deleteSchedule(scheduleId: string, userId: string): Promise<{ success: boolean }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'delete',
        scheduleId: scheduleId,
        userId: userId,
      }),
    });
  }

  static async toggleSchedule(scheduleId: string, userId: string): Promise<{ success: boolean; status?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'toggle',
        scheduleId: scheduleId,
        userId: userId,
      }),
    });
  }

  static async listSchedules(userId: string): Promise<{ schedules: Array<{ scheduleId: string; url: string; frequency: string; status: string; nextRun?: string; startDate?: string; endDate?: string }> }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'list',
        userId: userId,
      }),
    });
  }

  static async validateSchedulerAddon(userId: string): Promise<{ hasAddon: boolean; expiresAt?: string; maxSchedulers?: number }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'scheduler',
        action: 'validate_addon',
        userId: userId,
      }),
    });
  }

  // Credits Pack Addon - routes to /addons/purchase with addonType
  static async addCredits(data: {
    userId: string;
    credits: number;
    addonCode: string;
    transactionId?: string;
  }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'credits',
        action: 'add_credits',
        userId: data.userId,
        credits: data.credits,
        addonCode: data.addonCode,
        transactionId: data.transactionId,
      }),
    });
  }

  static async getCreditHistory(userId: string): Promise<{ history: Array<{ transactionId: string; creditsAdded: number; addonCode: string; timestamp: string }> }> {
    return this.makeRequest('/addons/purchase', {
      method: 'POST',
      body: JSON.stringify({
        addonType: 'credits',
        action: 'get_history',
        userId: userId,
      }),
    });
  }

  // Transaction History - comprehensive payment and credit transactions
  static async getTransactionHistory(userId: string): Promise<{
    success: boolean;
    transactions: Array<{
      transaction_id: string;
      type: 'subscription' | 'credits' | 'addon' | 'audit' | 'refund';
      status: 'completed' | 'pending' | 'failed' | 'refunded';
      amount?: number;
      currency?: string;
      credits?: number;
      description: string;
      plan?: string;
      created_at: string;
      details?: Record<string, unknown>;
    }>;
  }> {
    return this.makeRequest(`/paypal/transactions?userId=${encodeURIComponent(userId)}`);
  }

  // User Addons
  static async getUserAddons(userId: string): Promise<{
    addons: Array<{
      addon_code: string;
      name: string;
      status: string;
      expires_at?: string;
    }>;
  }> {
    return this.makeRequest(`/user/addons?userId=${encodeURIComponent(userId)}`);
  }

  // ============================================================================
  // SUPPORT APIs
  // ============================================================================

  static async checkExistingTicket(email: string): Promise<{
    hasActiveTicket: boolean;
    ticket?: {
      ticketId: string;
      subject: string;
      status: string;
      priority: string;
      createdAt: string;
    };
    tickets?: Array<{
      ticketId: string;
      subject: string;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt?: string;
    }>;
  }> {
    return this.makeRequest(`/support/check-ticket?email=${encodeURIComponent(email)}`);
  }

  static async createSupportTicket(data: {
    ticketId: string;
    name: string;
    email: string;
    subject: string;
    priority: string;
    description: string;
    userId?: string | null;
  }): Promise<{ success: boolean; message?: string }> {
    return this.makeRequest('/support/create-ticket', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // USER PROFILE APIs
  // ============================================================================

  static async getUserProfile(userId: string): Promise<{
    fullName?: string;
    phone?: string;
    plan?: string;
    credits?: number;
    joinDate?: string;
    subscription?: {
      status: string;
      renewalDate?: string;
      autoRenew: boolean;
      subscriptionId?: string;
    };
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    employment?: {
      jobTitle?: string;
      company?: string;
      industry?: string;
    };
    organization?: {
      name?: string;
      size?: string;
      website?: string;
    };
  }> {
    return this.makeRequest(`/user/profile?userId=${encodeURIComponent(userId)}`);
  }

  static async setAutoRenew(subscriptionId: string, autoRenew: boolean): Promise<{ success: boolean }> {
    return this.makeRequest('/subscription/auto-renew', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId, autoRenew }),
    });
  }

  static async checkDeletionEligibility(userId: string): Promise<{
    success: boolean;
    canDelete: boolean;
    hasActivePaidPlan: boolean;
    subscriptionPlan: string;
    subscriptionStatus: string;
    planEndDate: string | null;
    credits: number;
    requiresConfirmation: boolean;
    warningMessage: string | null;
  }> {
    return this.makeRequest('/subscription/account/check-deletion', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  static async deleteAccount(
    email: string,
    confirmEmail: string,
    options?: { reason?: string; confirmedPaidDeletion?: boolean }
  ): Promise<{
    success: boolean;
    message?: string;
    retentionNotice?: string;
    retentionExpiryDate?: string;
    error?: string;
    requiresConfirmation?: boolean;
    hasActivePaidPlan?: boolean;
    subscriptionPlan?: string;
    planEndDate?: string;
    warningMessage?: string;
  }> {
    return this.makeRequest('/subscription/account/delete', {
      method: 'POST',
      body: JSON.stringify({
        userId: email,
        email,
        confirmEmail,
        reason: options?.reason || 'User requested deletion',
        confirmedPaidDeletion: options?.confirmedPaidDeletion || false,
      }),
    });
  }

  static async getUserDashboardData(userId: string): Promise<{
    user?: {
      credits?: number;
      totalAudits?: number;
      plan?: string;
      onboardingRequired?: boolean;
    };
    audits?: Array<{
      report_id: string;
      url: string;
      created_at: string;
      status: string;
      security_score?: number;
      vulnerabilities_count?: number;
      critical_count?: number;
      medium_count?: number;
      low_count?: number;
      ssl_valid?: boolean;
      headers_score?: number;
      pdf_url?: string;
      pdf_report_url?: string;
      pdfUrl?: string;
    }>;
  }> {
    return this.makeRequest(`/user/dashboard?userId=${encodeURIComponent(userId)}`);
  }

  static async completeOnboarding(data: {
    email: string;
    fullName?: string;
    credits?: number;
    plan?: string;
  }): Promise<{ success: boolean; user?: { credits?: number; plan?: string } }> {
    return this.makeRequest('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // AUTH APIs
  // ============================================================================

  /**
   * Authenticate with GitHub OAuth
   * NOTE: This endpoint does NOT require x-api-key header - it uses OAuth code exchange
   */
  static async authenticateGitHub(code: string, redirectUri: string): Promise<{
    email: string;
    fullName: string;
    githubId: string;
    avatar: string;
    credits?: number;
    plan?: string;
    isNewUser?: boolean;
    token?: string;
  }> {
    // Direct fetch without x-api-key header (GitHub auth uses OAuth, not API key)
    const url = `${this.getBaseUrl()}/auth/github`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NOTE: No x-api-key header - this endpoint uses OAuth code exchange
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub authentication failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error) errorMessage = errorJson.error;
        if (errorJson?.message) errorMessage = errorJson.message;
      } catch (parseError) {
        // Failed to parse GitHub auth error response JSON - use default error message
        logger.warn('Failed to parse GitHub auth error response JSON:', parseError);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // ============================================================================
  // EMAIL APIs
  // ============================================================================

  /**
   * Send login notification email
   */
  static async sendLoginNotification(data: {
    email: string;
    fullName: string;
    loginMethod: string;
    loginTime: string;
    deviceInfo?: string;
    loginLocation?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.makeRequest('/email', {
      method: 'POST',
      body: JSON.stringify({
        type: 'login_alert',  // Fixed: was 'login_notification'
        email: data.email,    // Fixed: was 'to'
        data: {
          userName: data.fullName,  // Fixed: was 'fullName'
          loginTime: data.loginTime,
          ipAddress: 'Browser session',
          deviceInfo: data.deviceInfo || navigator.userAgent || 'Unknown Device',
          loginLocation: data.loginLocation || 'Unknown'
        }
      }),
    });
  }

  /**
   * Send audit completion email to user
   * Triggered after security audit is completed
   */
  static async sendAuditCompletionEmail(data: {
    email: string;
    fullName: string;
    auditUrl: string;
    securityScore: number;
    criticalIssues: number;
    mediumIssues: number;
    lowIssues: number;
    reportId: string;
    certificateNumber?: string;
    pdfUrl?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.makeRequest('/email', {
      method: 'POST',
      body: JSON.stringify({
        type: 'audit_completion',  // Fixed: was 'template'
        email: data.email,         // Fixed: was 'to'
        data: {
          userName: data.fullName, // Fixed: was 'fullName'
          auditUrl: data.auditUrl,
          securityScore: data.securityScore,
          criticalIssues: data.criticalIssues,
          mediumIssues: data.mediumIssues,
          lowIssues: data.lowIssues,
          reportId: data.reportId,
          certificateNumber: data.certificateNumber,
          pdfUrl: data.pdfUrl,
          dashboardUrl: 'https://aivedha.ai/dashboard',
          certificateUrl: data.certificateNumber ? `https://aivedha.ai/certificate/${data.certificateNumber}` : undefined,
        },
      }),
    });
  }

  // ============================================================================
  // BLOG APIs
  // ============================================================================

  /**
   * Get all blog posts (with optional filters)
   */
  static async getBlogs(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    blogs: Array<{
      blogId: string;
      slug: string;
      title: string;
      subtitle: string;
      excerpt: string;
      coverImage: string;
      category: string;
      tags: string[];
      author: {
        name: string;
        role: string;
        avatar: string;
        country: string;
        countryFlag: string;
      };
      publishedAt: string;
      readTime: number;
      rating: number;
      ratingCount: number;
      views: number;
      commentCount: number;
      featured?: boolean;
    }>;
    total: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    return this.makeRequest(`/blogs${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single blog post by slug
   */
  static async getBlogBySlug(slug: string): Promise<{
    blog: {
      blogId: string;
      slug: string;
      title: string;
      subtitle: string;
      excerpt: string;
      content: Array<{
        type: string;
        content: string;
        items?: string[];
        language?: string;
        variant?: string;
        stats?: Array<{ label: string; value: string; trend?: string }>;
      }>;
      coverImage: string;
      category: string;
      tags: string[];
      author: {
        name: string;
        role: string;
        avatar: string;
        company?: string;
        country: string;
        countryFlag: string;
      };
      publishedAt: string;
      readTime: number;
      rating: number;
      ratingCount: number;
      views: number;
      comments: Array<{
        id: string;
        author: {
          name: string;
          role: string;
          avatar: string;
          country: string;
          countryFlag: string;
        };
        content: string;
        timestamp: string;
        likes: number;
        replies?: Array<{
          id: string;
          author: {
            name: string;
            role: string;
            avatar: string;
            country: string;
            countryFlag: string;
          };
          content: string;
          timestamp: string;
          likes: number;
        }>;
      }>;
      featured?: boolean;
    };
    relatedBlogs: Array<{
      blogId: string;
      slug: string;
      title: string;
      coverImage: string;
      category: string;
      readTime: number;
      rating: number;
    }>;
  }> {
    return this.makeRequest(`/blogs/${encodeURIComponent(slug)}`);
  }

  /**
   * Submit a comment on a blog post
   */
  static async submitBlogComment(data: {
    blogId: string;
    name: string;
    email?: string;
    content: string;
    parentCommentId?: string;
  }): Promise<{
    success: boolean;
    comment?: {
      id: string;
      content: string;
      timestamp: string;
    };
    error?: string;
  }> {
    return this.makeRequest('/blogs/comment', {
      method: 'POST',
      body: JSON.stringify({
        blogId: data.blogId,
        name: data.name,
        email: data.email,
        content: data.content,
        parentCommentId: data.parentCommentId,
      }),
    });
  }

  /**
   * Rate a blog post
   */
  static async rateBlog(data: {
    blogId: string;
    rating: number;
    userId?: string;
  }): Promise<{
    success: boolean;
    newRating?: number;
    newRatingCount?: number;
    error?: string;
  }> {
    return this.makeRequest('/blogs/rate', {
      method: 'POST',
      body: JSON.stringify({
        blogId: data.blogId,
        rating: data.rating,
        userId: data.userId,
      }),
    });
  }

  /**
   * Like a blog comment
   */
  static async likeBlogComment(data: {
    commentId: string;
    blogId: string;
  }): Promise<{
    success: boolean;
    newLikeCount?: number;
    error?: string;
  }> {
    return this.makeRequest('/blogs/comment/like', {
      method: 'POST',
      body: JSON.stringify({
        commentId: data.commentId,
        blogId: data.blogId,
      }),
    });
  }

  /**
   * Track blog view
   */
  static async trackBlogView(blogId: string): Promise<{
    success: boolean;
    newViewCount?: number;
  }> {
    return this.makeRequest('/blogs/view', {
      method: 'POST',
      body: JSON.stringify({ blogId: blogId }),
    });
  }

  /**
   * Get blog categories
   */
  static async getBlogCategories(): Promise<{
    categories: Array<{
      id: string;
      name: string;
      count: number;
    }>;
  }> {
    return this.makeRequest('/blogs/categories');
  }

  // ============================================================================
  // BILLING API - Dynamic Plans, Coupons, Addons
  // ============================================================================

  /**
   * Get all active plans (public endpoint)
   */
  static async getPublicPlans(): Promise<{
    success: boolean;
    plans: Array<{
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
    }>;
  }> {
    return this.makeRequest('/billing/plans/public');
  }

  /**
   * Get all active addons (public endpoint)
   */
  static async getPublicAddons(): Promise<{
    success: boolean;
    addons: Array<{
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
    }>;
  }> {
    return this.makeRequest('/billing/addons/public');
  }

  /**
   * Validate a coupon code via billing API (dynamic billing)
   */
  static async validateBillingCoupon(couponCode: string): Promise<{
    success: boolean;
    valid: boolean;
    coupon?: {
      coupon_code: string;
      discount_type: string;
      discount_value: number;
      name: string;
      applicable_plans: string[];
    };
    error?: string;
    message?: string;
  }> {
    return this.makeRequest('/billing/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ couponCode: couponCode }),
    });
  }

  // ============================================================================
  // CERTIFICATE VERIFICATION & BADGE APIs
  // ============================================================================

  /**
   * Verify a security certificate by certificate number
   * Used by public verification page (/verify/:certificateNumber)
   */
  static async verifyCertificate(certificateNumber: string): Promise<{
    valid: boolean;
    certificate_number: string;
    domain: string;
    organization_name?: string;
    security_score: number;
    grade: string;
    ssl_status: string;
    ssl_grade?: string;
    ssl_issuer?: string;
    ssl_expiry?: string;
    scan_date: string;
    vulnerabilities_found: number;
    critical_issues: number;
    medium_issues: number;
    low_issues: number;
    status: 'active' | 'expired' | 'revoked';
    report_id?: string;
    error?: string;
  }> {
    return this.makeRequest(`/verify/${encodeURIComponent(certificateNumber)}`);
  }

  /**
   * Get badge image URL for a certificate
   * Returns the URL to the badge image (redirects to S3)
   */
  static getBadgeImageUrl(
    certificateNumber: string,
    variant: 'full' | 'compact' | 'minimal' = 'full',
    theme: 'dark' | 'light' = 'dark'
  ): string {
    return `${ABSOLUTE_PROD_API_BASE}/badge/${encodeURIComponent(certificateNumber)}?variant=${variant}&theme=${theme}`;
  }

  /**
   * Get badge metadata (JSON response with image URL)
   */
  static async getBadgeInfo(
    certificateNumber: string,
    variant: 'full' | 'compact' | 'minimal' = 'full',
    theme: 'dark' | 'light' = 'dark'
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    variant: string;
    theme: string;
    error?: string;
  }> {
    return this.makeRequest(
      `/badge/${encodeURIComponent(certificateNumber)}?variant=${variant}&theme=${theme}&preview=true`
    );
  }

  // ============================================================================
  // API KEY MANAGEMENT (CI/CD Integration)
  // ============================================================================

  /**
   * Create a new API key for CI/CD integration
   * Requires active paid subscription
   */
  static async createApiKey(data: {
    userId: string;
    name: string;
    reason: string;
    validityDays: number;
  }): Promise<{
    success: boolean;
    api_key?: string;
    api_key_id?: string;
    name?: string;
    expires_at?: string;
    warning?: string;
    usage?: {
      header: string;
      example: string;
    };
    error?: string;
  }> {
    return this.makeRequest('/api-keys/create', {
      method: 'POST',
      body: JSON.stringify({
        userId: data.userId,
        name: data.name,
        reason: data.reason,
        validityDays: data.validityDays,
      }),
    });
  }

  /**
   * List all API keys for a user
   */
  static async listApiKeys(userId: string): Promise<{
    success: boolean;
    api_keys: Array<{
      api_key_id: string;
      name: string;
      key_prefix: string;
      reason: string;
      status: 'active' | 'revoked' | 'expired' | 'disabled';
      validity_days: number;
      created_at: string;
      expires_at: string;
      last_used_at?: string;
      usage_count: number;
      permissions: string[];
    }>;
    max_keys: number;
    active_count: number;
    error?: string;
  }> {
    return this.makeRequest(`/api-keys/list?userId=${encodeURIComponent(userId)}`);
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(userId: string, apiKeyId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.makeRequest('/api-keys/revoke', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        apiKeyId: apiKeyId,
      }),
    });
  }

  /**
   * Validate an API key
   */
  static async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    name?: string;
    expires_at?: string;
    permissions?: string[];
    error?: string;
  }> {
    return this.makeRequest('/api-keys/validate', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
    });
  }

  // ============================================================================
  // URL VALIDATION
  // ============================================================================

  /**
   * Validate a URL before audit - checks for error pages (404, 500, etc.)
   */
  static async validateUrl(url: string, source: 'ui' | 'scheduler' | 'github' = 'ui', userId?: string): Promise<{
    success: boolean;
    valid: boolean;
    url?: string;
    validation?: {
      accessible: boolean;
      status_code: number | null;
      status_text: string | null;
      is_error_page: boolean;
      error_type: string | null;
      error_message: string | null;
      response_time_ms: number | null;
      ssl_valid: boolean | null;
      content_type: string | null;
      server: string | null;
      redirect_url: string | null;
    };
    recommendation?: 'proceed' | 'warn' | 'block';
    can_proceed?: boolean;
    message?: string;
    notification_sent?: boolean;
    error?: string;
  }> {
    return this.makeRequest('/url-validator/validate', {
      method: 'POST',
      body: JSON.stringify({
        url,
        source,
        userId,
        sendNotification: source !== 'ui',
      }),
    });
  }

  /**
   * Get embed code for security badge
   */
  static async getBadgeEmbedCode(reportId: string): Promise<{
    success: boolean;
    embed_codes?: {
      iframe: string;
      script: string;
      badge_url: string;
      certificate_url: string;
    };
    error?: string;
  }> {
    return this.makeRequest(`/embed-code/${encodeURIComponent(reportId)}`);
  }

  /**
   * Generate secure PDF download link
   */
  static async getPdfDownloadLink(reportId: string, userId: string): Promise<{
    success: boolean;
    download_url?: string;
    expires_in?: number;
    error?: string;
  }> {
    return this.makeRequest(`/pdf/${encodeURIComponent(reportId)}/download-link`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // ============================================================================
  // REFERRAL APIs
  // ============================================================================

  /**
   * Generate or retrieve referral code for user
   */
  static async generateReferralCode(email: string): Promise<{
    success: boolean;
    referral_code: string;
    unique_code: string;
    is_common_code: boolean;
    can_earn_bonus: boolean;
    is_paid_plan: boolean;
    user_plan: string;
    unique_code_used: boolean;
    error?: string;
  }> {
    return this.makeRequest('/referral/generate', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validate a referral code
   */
  static async validateReferralCode(referralCode: string): Promise<{
    valid: boolean;
    is_used?: boolean;
    is_common_code?: boolean;
    message?: string;
    error?: string;
  }> {
    return this.makeRequest('/referral/validate', {
      method: 'POST',
      body: JSON.stringify({ referralCode: referralCode }),
    });
  }

  /**
   * Activate referral when new user signs up
   */
  static async activateReferral(data: {
    referralCode: string;
    newUserEmail: string;
    senderEmail?: string; // Required for common code
  }): Promise<{
    success: boolean;
    newUserCreditsAdded: number;
    ownerCreditsAdded: number;
    ownerBonusEligible: boolean;
    isCommonCode: boolean;
    message?: string;
    error?: string;
  }> {
    return this.makeRequest('/referral/activate', {
      method: 'POST',
      body: JSON.stringify({
        referralCode: data.referralCode,
        newUserEmail: data.newUserEmail,
        senderEmail: data.senderEmail,
      }),
    });
  }

  /**
   * Get referral statistics for a user
   */
  static async getReferralStats(email: string): Promise<{
    success: boolean;
    active_code: string;
    unique_code: string;
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
    error?: string;
  }> {
    return this.makeRequest('/referral/stats', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Get share content for referral
   */
  static async getReferralShareContent(data: {
    referral_code: string;
    user_name?: string;
    owner_email?: string;
  }): Promise<{
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
    error?: string;
  }> {
    return this.makeRequest('/referral/share-content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // NEWSLETTER APIs
  // ============================================================================

  /**
   * Subscribe to newsletter
   */
  static async subscribeNewsletter(email: string, source?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.makeRequest('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email, source: source || 'website' }),
    });
  }
}

export default AivedhaAPI;