/**
 * AiVedha Guardian - Unified Audit Types
 * Version: 5.0.0
 *
 * SINGLE SOURCE OF TRUTH for all audit-related types
 * Used by: UI components, API client, Lambda functions, DynamoDB schema
 *
 * IMPORTANT: When modifying these types, ensure consistency across:
 * - src/lib/api.ts
 * - aws-lambda/security-crawler/security-audit-crawler.py
 * - aws-lambda/audit-status/lambda_function.py
 * - aws-lambda/report-generator/lambda_function.py
 */

// =============================================================================
// API VERSION - Auto-incremented on deployment
// =============================================================================
export const API_VERSION = '2.5.1';
export const BUILD_TIMESTAMP = '2025-12-28T11:06:07.575Z'; // Replaced at build time

// =============================================================================
// REGION TYPES
// =============================================================================
export type ScanRegion = 'us-east-1' | 'ap-south-1';

export interface RegionConfig {
  region: ScanRegion;
  regionName: string; // 'USA' | 'India'
  staticIP: string;
  apiEndpoint: string;
}

export const REGION_CONFIGS: Record<ScanRegion, RegionConfig> = {
  'us-east-1': {
    region: 'us-east-1',
    regionName: 'USA',
    staticIP: '44.206.201.117',
    apiEndpoint: 'https://api.aivedha.ai/api',
  },
  'ap-south-1': {
    region: 'ap-south-1',
    regionName: 'India',
    staticIP: '13.203.153.119',
    apiEndpoint: 'https://api-india.aivedha.ai/api',
  },
};

// =============================================================================
// AUDIT REQUEST TYPES (Frontend -> Lambda)
// =============================================================================
export interface AuditRequestParams {
  // Required
  url: string;
  userId: string;
  // Optional
  userEmail?: string;
  userName?: string;
  scanRegion?: ScanRegion;
  preferredRegion?: ScanRegion;
  scanDepth?: 'standard' | 'deep' | 'comprehensive';
  augmentationMode?: 'parallel-augment' | 'orchestrated-augment' | 'legacy-only';
  auditMetadata?: AuditMetadata;
}

export interface AuditMetadata {
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
}

// =============================================================================
// AUDIT RESPONSE TYPES (Lambda -> Frontend)
// Field names use BOTH camelCase and snake_case for compatibility
// =============================================================================
export interface AuditResponseBase {
  // Core fields - ALWAYS present
  report_id: string;
  reportId?: string; // Alias
  status: AuditStatus;
  success?: boolean;
  message?: string;
  error?: string;
  url?: string;
  created_at?: string;

  // Region routing (v5.0.0) - ALWAYS present
  scan_region?: ScanRegion;
  scanRegion?: ScanRegion; // Alias
  region_name?: string;
  regionName?: string; // Alias
  static_ip?: string;
  staticIP?: string; // Alias

  // Progress tracking
  progress_percent?: number;
  progressPercent?: number; // Alias
  current_stage?: string;
  currentStage?: string; // Alias
  stage_description?: string;
  stageDescription?: string; // Alias

  // API version
  api_version?: string;
  apiVersion?: string;
}

export interface AuditResponseCompleted extends AuditResponseBase {
  status: 'completed';

  // Security scoring
  security_score: number;
  securityScore?: number;
  grade: string;

  // Vulnerability counts
  vulnerabilities_count: number;
  vulnerabilitiesCount?: number;
  critical_issues: number;
  high_issues?: number;
  medium_issues: number;
  low_issues: number;
  info_issues?: number;

  // SSL/TLS
  ssl_status: string;
  ssl_grade?: string;
  ssl_valid?: boolean;
  ssl_info?: SSLInfo;

  // Security headers
  headers_score: number;
  security_headers?: SecurityHeaders;

  // DNS Security
  dns_security?: DNSSecurity;

  // Detailed findings
  vulnerabilities: Vulnerability[];

  // Sensitive files
  sensitive_files?: SensitiveFile[];
  sensitive_files_found?: number;

  // Content analysis
  content_analysis?: ContentAnalysis;

  // Certificate & Report
  certificate_number?: string;
  pdf_report_url?: string;

  // Technology detection
  technology_stack?: string[];

  // Advanced security
  waf_detection?: WAFDetection;
  cors_analysis?: CORSAnalysis;
  cloud_security?: CloudSecurity;
  subdomain_enumeration?: SubdomainEnumeration;
}

export interface AuditResponseProcessing extends AuditResponseBase {
  status: 'processing' | 'pending' | 'queued';
  estimated_time_seconds?: number;
  current_item?: number;
  total_items?: number;
  audit_items?: AuditItemStatus[];
}

export interface AuditResponseFailed extends AuditResponseBase {
  status: 'failed' | 'error' | 'timed_out';
  error: string;
  credit_refunded?: boolean;
}

export type AuditResponse = AuditResponseCompleted | AuditResponseProcessing | AuditResponseFailed;

export type AuditStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'error' | 'timed_out';

// =============================================================================
// SUB-TYPES
// =============================================================================
export interface Vulnerability {
  vuln_id?: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
  location?: string;
  evidence?: string;
  cwe_id?: string;
  cvss_score?: number;
  owasp_category?: string;
}

export interface AuditItemStatus {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  issueCount: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface SSLInfo {
  valid: boolean;
  issuer?: string;
  subject?: string;
  expires?: string;
  protocol?: string;
  grade?: string;
  score?: number;
}

export interface SecurityHeaders {
  score: number;
  grade?: string;
  headers?: SecurityHeaderItem[];
  present?: Record<string, unknown>;
  missing?: Record<string, unknown>;
}

export interface SecurityHeaderItem {
  name: string;
  value: string;
  present: boolean;
  status: 'good' | 'warning' | 'bad' | 'missing';
  recommendation?: string;
}

export interface DNSSecurity {
  domain?: string;
  dns_security_score?: number;
  email_security_score?: number;
  spf_record?: string;
  dkim_record?: string;
  dmarc_record?: string;
  dnssec_enabled?: boolean;
}

export interface SensitiveFile {
  path: string;
  type: string;
  severity: string;
  description?: string;
}

export interface ContentAnalysis {
  forms_found?: number;
  external_links?: number;
  inline_scripts?: number;
  iframes_found?: number;
}

export interface WAFDetection {
  detected: boolean;
  provider?: string;
  confidence?: number;
  evidence?: string[];
}

export interface CORSAnalysis {
  enabled: boolean;
  allow_origin?: string;
  allow_credentials?: boolean;
  allow_methods?: string[];
  allow_headers?: string[];
  issues?: string[];
}

export interface CloudSecurity {
  provider?: string;
  services_detected?: string[];
  misconfigurations?: string[];
  exposed_resources?: string[];
}

export interface SubdomainEnumeration {
  subdomains?: string[];
  total_found?: number;
  vulnerable?: string[];
  takeover_risk?: string[];
}

// =============================================================================
// DYNAMODB SCHEMA (for reference)
// Table: aivedha-guardian-audit-reports
// =============================================================================
export interface DynamoDBReportItem {
  // Primary Key
  report_id: string;

  // User info
  user_id: string;
  user_email?: string;
  user_name?: string;

  // Audit target
  url: string;

  // Status
  status: AuditStatus;
  progress_percent?: number;
  current_stage?: string;
  stage_description?: string;

  // Region routing (v5.0.0)
  scan_region: ScanRegion;
  region_name: string;
  static_ip: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Results (JSON stringified)
  scan_results?: string;
  vulnerabilities?: string;

  // Scores
  security_score?: number;
  grade?: string;
  headers_score?: number;

  // Counts
  vulnerabilities_count?: number;
  critical_issues?: number;
  high_issues?: number;
  medium_issues?: number;
  low_issues?: number;
  info_issues?: number;

  // SSL
  ssl_valid?: boolean;
  ssl_grade?: string;
  ssl_info?: string;

  // Output
  certificate_number?: string;
  pdf_report_url?: string;

  // API version that created this record
  api_version?: string;
}

// =============================================================================
// SCHEDULED AUDIT TYPES
// =============================================================================
export interface ScheduledAuditRequest {
  userId: string;
  url: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  scanRegion?: ScanRegion;
}

export interface ScheduledAuditResponse {
  success: boolean;
  schedule?: {
    schedule_id: string;
    url: string;
    frequency: string;
    next_run?: string;
    scan_region?: ScanRegion;
    region_name?: string;
  };
  error?: string;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================
export function isValidScanRegion(value: unknown): value is ScanRegion {
  return value === 'us-east-1' || value === 'ap-south-1';
}

export function normalizeResponse<T extends AuditResponseBase>(response: T): T {
  // Ensure both camelCase and snake_case fields are present
  return {
    ...response,
    reportId: response.report_id || response.reportId,
    report_id: response.report_id || response.reportId || '',
    scanRegion: response.scan_region || response.scanRegion,
    scan_region: response.scan_region || response.scanRegion,
    regionName: response.region_name || response.regionName,
    region_name: response.region_name || response.regionName,
    staticIP: response.static_ip || response.staticIP,
    static_ip: response.static_ip || response.staticIP,
    progressPercent: response.progress_percent || response.progressPercent,
    progress_percent: response.progress_percent || response.progressPercent,
    currentStage: response.current_stage || response.currentStage,
    current_stage: response.current_stage || response.currentStage,
    stageDescription: response.stage_description || response.stageDescription,
    stage_description: response.stage_description || response.stageDescription,
  };
}
