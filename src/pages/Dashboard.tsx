import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { ZooZooLoader } from "@/components/ZooZooLoader";
import { CreditWarningBanner } from "@/components/subscription/CreditWarningBanner";
import { OnboardingPopup } from "@/components/OnboardingPopup";
import { FirstTimeAuditPopup } from "@/components/FirstTimeAuditPopup";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { logger } from "@/lib/logger";
import { getSeverityBadgeClass, getScoreBadgeClass, getStatusBadgeClass, normalizeSeverity } from "@/lib/badge-utils";
import { getPlanById, PLAN_CREDITS } from "@/constants/plans";
import { AUDIT_POLL_INTERVAL_MS, TOAST_DURATION_MS, NAVIGATION_DELAY_MS, DIALOG_CLOSE_DELAY_MS, LOADING_DELAY_MS } from "@/constants/dashboard";
import {
  Shield,
  CreditCard,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Eye,
  Plus,
  Clock,
  Zap,
  Target,
  Globe,
  Crown,
  Sparkles,
  LineChart,
  PieChart,
  Lock,
  Unlock,
  Award,
  FileCheck,
  Bug,
  Server,
  Wifi,
  Key,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Bell,
  Settings,
  User,
  Infinity as InfinityIcon,
  Code,
  Timer,
  ExternalLink,
  Bot
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AivedhaAPI from "@/lib/api";
import { CognitoAuth } from "@/lib/cognito";
import { withRetry, isRetryableError } from "@/lib/retry";
import { getAnimatedPlanIcon } from "@/components/AnimatedPlanIcons";
import EmbedCodeDialog from "@/components/EmbedCodeDialog";
import { ReferralSection } from "@/components/ReferralSection";

interface UserData {
  name: string;
  email: string;
  plan: string;
  credits: number | string;
  joinDate: string;
  totalAudits: number;
  lastLogin: string;
}

interface AuditHistoryItem {
  id: number | string;
  url: string;
  date: string;
  status: string;
  score: number | null;
  severity: string | null;
  vulnerabilities: number | null;
  critical: number | null;
  high: number | null;
  medium: number | null;
  low: number | null;
  reportId: string;
  certificateNumber?: string | null; // Certificate number for viewing certificates
  scanTime: string | null;
  ssl: string | null;
  headers: number | null;
  pdfUrl?: string | null;
  // Live progress tracking for in-progress audits
  progressPercent?: number;
  currentStage?: string;
  stageDescription?: string;
  lastChecked?: string; // ISO timestamp of last status check
  staleCount?: number; // Number of checks with no progress change
  // Enhanced progress details for AI analysis
  progressDetails?: {
    currentVulnerability?: number;
    totalVulnerabilities?: number;
  };
  etaSeconds?: number;
  // Region routing info (v5.0.0)
  scanRegion?: string; // e.g., 'us-east-1' or 'ap-south-1'
  regionName?: string; // e.g., 'USA' or 'India'
  staticIP?: string; // IP address used for scanning
}

interface URLComparison {
  url: string;
  firstAudit: { score: number; date: string };
  lastAudit: { score: number; date: string };
  totalAudits: number;
  scoreDiff: number;
  trend: 'improved' | 'declined' | 'same';
}

// API response audit type for dashboard data
interface ApiAuditResponse {
  report_id?: string;
  url?: string;
  status?: string;
  security_score?: number;
  critical_count?: number;
  critical_issues?: number;
  high_count?: number;
  high_issues?: number;
  medium_count?: number;
  medium_issues?: number;
  low_count?: number;
  low_issues?: number;
  scan_time?: string;
  ssl_status?: string;
  headers_score?: number;
  pdf_url?: string;
  pdf_report_url?: string;
  created_at?: string;
  // Progress tracking - support both snake_case (from API) and camelCase (legacy)
  progress_percent?: number;
  progressPercent?: number;
  current_stage?: string;
  currentStage?: string;
  stage_description?: string;
  stageDescription?: string;
  certificate_number?: string;
  // Additional fields
  vulnerabilities_count?: number;
  ssl_grade?: string;
  ssl_valid?: boolean;
  updatedAt?: string;
  updated_at?: string;
  etaSeconds?: number;
  eta_seconds?: number;
}

// GitHub OAuth Configuration - from centralized config
import { OAUTH_CONFIG } from "@/config";
const GITHUB_CLIENT_ID = OAUTH_CONFIG.GITHUB_CLIENT_ID;
const GITHUB_REDIRECT_URI = OAUTH_CONFIG.GITHUB_REDIRECT_URI;

// Send login notification email
const sendLoginNotification = async (email: string, fullName: string, loginMethod: string) => {
  try {
    await AivedhaAPI.sendLoginNotification({
      email,
      fullName,
      loginMethod,
      loginTime: new Date().toLocaleString()
    });
  } catch (error) {
    // Login notification email deferred - non-critical failure
    logger.warn('Failed to send login notification email:', error);
  }
};

// Normalize credits to number (API may return string or number)
const normalizeCredits = (val: unknown): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string' && val !== '') {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Type guard to check if an error is an AbortError
const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

// Type guard to check if error has a message property
interface ErrorWithMessage {
  message?: string;
}

const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showFirstAuditPopup, setShowFirstAuditPopup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use subscription context for credit management - must be called before any conditional returns
  const subscription = useSubscription();
  const currentPlanDetails = useMemo(() => {
    return subscription.currentPlan ? getPlanById(subscription.currentPlan.replace(/_monthly|_yearly|_usd/g, '')) : null;
  }, [subscription.currentPlan]);

  // User state - loaded from localStorage/API
  const [user, setUser] = useState<UserData>({
    name: "",
    email: "",
    plan: "Aarambh",
    credits: 0,
    joinDate: "",
    totalAudits: 0,
    lastLogin: new Date().toISOString()
  });

  // Audit history - fetched from API
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);

  // URL comparisons for repeated audits
  const [urlComparisons, setUrlComparisons] = useState<URLComparison[]>([]);

  // User addons state
  const [userAddons, setUserAddons] = useState<Array<{
    addon_code: string;
    name: string;
    status: string;
    expires_at?: string;
  }>>([]);

  // Embed code dialog state
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedAuditForEmbed, setSelectedAuditForEmbed] = useState<AuditHistoryItem | null>(null);

  // Progress dialog state for viewing in-progress audits
  const [viewingAuditProgress, setViewingAuditProgress] = useState<AuditHistoryItem | null>(null);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && (state === 'github_oauth' || !state)) {
      handleGitHubCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle background audit from SecurityAudit page navigation
  useEffect(() => {
    // Check for background audit from navigation state or sessionStorage
    interface BackgroundAuditState {
      reportId: string;
      url: string;
      createdAt: string;
      progressPercent?: number;
      currentStage?: string;
      stageDescription?: string;
      etaSeconds?: number;
    }
    const navState = location.state as { backgroundAudit?: BackgroundAuditState } | null;
    const backgroundAuditStr = sessionStorage.getItem('background_audit');

    let backgroundAudit: BackgroundAuditState | undefined = navState?.backgroundAudit;
    if (!backgroundAudit && backgroundAuditStr) {
      try {
        backgroundAudit = JSON.parse(backgroundAuditStr);
      } catch (error) {
        // Invalid JSON in session storage
        logger.warn('Failed to parse background audit from session storage:', error);
      }
    }

    if (backgroundAudit && backgroundAudit.reportId) {
      // Clear the sessionStorage entry to prevent duplication on refresh
      sessionStorage.removeItem('background_audit');

      // Capture the verified backgroundAudit value for use in callback
      // This ensures TypeScript knows it's defined inside the closure
      const verifiedAudit = backgroundAudit;

      // Add the background audit to auditHistory if not already present
      setAuditHistory(prev => {
        const exists = prev.some(a => a.reportId === verifiedAudit.reportId);
        if (exists) return prev;

        // CRITICAL: Preserve the EXACT progress values passed from SecurityAudit page
        // Do NOT use default fallbacks that would override actual progress (e.g., 15% -> 5%)
        // This maintains trust and consistency in progress display across the application
        const passedProgress = typeof verifiedAudit.progressPercent === 'number'
          ? verifiedAudit.progressPercent
          : 0;

        const newAudit: AuditHistoryItem = {
          id: verifiedAudit.reportId,
          url: verifiedAudit.url,
          date: new Date(verifiedAudit.createdAt).toISOString().split('T')[0],
          status: 'In Progress',
          score: null,
          severity: null,
          vulnerabilities: null,
          critical: null,
          high: null,
          medium: null,
          low: null,
          reportId: verifiedAudit.reportId,
          scanTime: null,
          ssl: null,
          headers: null,
          // Use exact progress value - never override with arbitrary defaults
          progressPercent: passedProgress,
          currentStage: verifiedAudit.currentStage || 'processing',
          // Use exact stage description from the audit
          stageDescription: verifiedAudit.stageDescription || '',
          etaSeconds: verifiedAudit.etaSeconds || 600
        };

        // Add at the beginning since it's the most recent
        return [newAudit, ...prev];
      });

      // Show a notification that the audit is being tracked
      toast({
        title: "Background Audit Active",
        description: "Your security audit is being tracked. Progress updates will appear automatically."
      });
    }
  }, [location.state, toast]);

  const handleGitHubCallback = async (code: string) => {
    setGithubLoading(true);
    setIsLoading(true);
    try {
      // Exchange code for user data via backend
      const data = await AivedhaAPI.authenticateGitHub(code, GITHUB_REDIRECT_URI);
      const { email, fullName, githubId, avatar, credits, plan, isNewUser, token } = data;

      // Create user session
      const user = {
        email,
        fullName,
        picture: avatar,
        githubId,
        loginMethod: 'github',
        credits: credits ?? 0,
        plan: plan || 'Aarambh'
      };

      // Store auth data
      if (token) localStorage.setItem("authToken", token);
      localStorage.setItem("currentUser", JSON.stringify(user));

      // Track first-time user for onboarding popup - only if not already completed
      const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const onboardingAlreadyDone = storedUser.onboardingCompleted || storedUser.onboardingSkipped;

      if (isNewUser && !onboardingAlreadyDone) {
        localStorage.setItem("showOnboarding", "true");
        localStorage.setItem("onboardingEmail", email);
        localStorage.setItem("onboardingName", fullName || '');
      }

      // Send login security alert for all logins (security best practice)
      sendLoginNotification(email, fullName, 'GitHub');

      // Update component state
      setIsAuthenticated(true);
      setUser({
        name: fullName || email?.split('@')[0] || 'User',
        email: email || '',
        plan: plan || 'Aarambh',
        credits: credits ?? 0,
        joinDate: new Date().toISOString().split('T')[0],
        totalAudits: 0,
        lastLogin: new Date().toISOString()
      });

      toast({
        title: isNewUser ? "Welcome to AiVedha Guard!" : "Welcome back!",
        description: isNewUser
          ? "Your account has been created. You have 3 free credits to start auditing!"
          : `Signed in as ${email}`
      });

      // Short delay to show toast, then reload to ensure all components update
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, LOADING_DELAY_MS);
    } catch (error) {
      logger.error('GitHub authentication failed:', error);
      toast({
        variant: "destructive",
        title: "GitHub Sign-In Failed",
        description: "Unable to authenticate. Please try again."
      });
      setGithubLoading(false);
      setIsLoading(false);
      navigate('/login');
    }
  };

  // Check authentication and load user data
  useEffect(() => {
    const abortController = new AbortController();

    const loadUserData = async () => {
      // Skip auth check if GitHub callback is being processed
      const code = searchParams.get('code');
      if (code) {
        // GitHub callback will handle authentication, but ensure loading state is managed
        return;
      }

      const userStr = localStorage.getItem("currentUser");

      // Check for user data (authToken is optional for social logins)
      if (!userStr) {
        navigate('/login');
        return;
      }

      try {
        const storedUser = JSON.parse(userStr);
        setIsAuthenticated(true);

        // Set user data from localStorage
        setUser({
          name: storedUser.fullName || storedUser.name || storedUser.email?.split('@')[0] || 'User',
          email: storedUser.email || '',
          plan: storedUser.plan || 'Aarambh',
          credits: normalizeCredits(storedUser.credits),
          joinDate: storedUser.joinDate || new Date().toISOString().split('T')[0],
          totalAudits: storedUser.totalAudits || 0,
          lastLogin: new Date().toISOString()
        });

        // Fetch user dashboard data from API - use email as primary identifier
        const userEmail = storedUser.email;
        if (!userEmail) {
          setIsLoading(false);
          return;
        }

        try {
          // Fetch dashboard data with retry logic for network resilience
          const data = await withRetry(
            () => AivedhaAPI.getUserDashboardData(userEmail),
            {
              maxAttempts: 3,
              initialDelayMs: 1000,
              shouldRetry: isRetryableError,
            }
          );
          // Update user with API data - add null safety checks
          if (data && data.user) {
              setUser(prev => ({
                ...prev,
                // Use normalizeCredits to handle string/number from API
                credits: data.user?.credits !== undefined
                  ? normalizeCredits(data.user.credits)
                  : prev.credits,
                totalAudits: data.user?.totalAudits ?? prev.totalAudits,
                plan: data.user?.plan || prev.plan
              }));

              // Update localStorage
              const updatedUser = { ...storedUser, ...data.user };
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));

              // Check if user needs onboarding (new user or onboardingRequired flag)
              // ONLY show if: user hasn't completed/skipped AND backend says required
              const onboardingCompleted = storedUser.onboardingCompleted;
              const onboardingSkipped = storedUser.onboardingSkipped;

              if (data.user.onboardingRequired && !onboardingCompleted && !onboardingSkipped) {
                localStorage.setItem("showOnboarding", "true");
                localStorage.setItem("onboardingEmail", userEmail);
                localStorage.setItem("onboardingName", storedUser.fullName || storedUser.name || '');
                setShowOnboarding(true);
                setIsFirstTimeUser(true);
              }
            }

          // Set audit history from API - add null safety checks
          if (data && data.audits && Array.isArray(data.audits)) {
            const mappedAudits = data.audits.map((audit: ApiAuditResponse, index: number) => {
              // Map backend status to display status
              let displayStatus = 'In Progress';
              if (audit.status === 'completed') {
                displayStatus = 'Completed';
              } else if (audit.status === 'failed' || audit.status === 'error') {
                displayStatus = 'Failed';
              } else if (audit.status === 'timed_out' || audit.status === 'timeout' || audit.status === 'cancelled') {
                displayStatus = 'Timed Out';
              }

              // Generate consistent ID - use report_id or generate one
              const auditId = audit.report_id || `AVG-${Date.now()}-${index}`;

              // Calculate severity based on issue counts (critical > high > medium > low)
              // Dashboard API returns *_count fields, Audit Status API returns *_issues fields
              // Support both for compatibility
              const criticalCount = audit.critical_count ?? audit.critical_issues ?? 0;
              const highCount = audit.high_count ?? audit.high_issues ?? 0;
              const mediumCount = audit.medium_count ?? audit.medium_issues ?? 0;
              const lowCount = audit.low_count ?? audit.low_issues ?? 0;

              let severity: string = 'Low';
              if (criticalCount > 0) severity = 'Critical';
              else if (highCount > 0) severity = 'High';
              else if (mediumCount > 0) severity = 'Medium';

              // Get progress from API response - use defaults based on status
              // Support both camelCase and snake_case for compatibility
              let progressPercent = audit.progressPercent ?? audit.progress_percent ?? 0;
              let currentStage = audit.currentStage || audit.current_stage || '';
              let stageDescription = audit.stageDescription || audit.stage_description || '';

              // Set appropriate defaults based on status
              if (audit.status === 'completed') {
                progressPercent = 100;
                currentStage = 'completed';
                stageDescription = stageDescription || 'Audit completed successfully';
              } else if (audit.status === 'failed' || audit.status === 'error') {
                currentStage = 'failed';
                stageDescription = stageDescription || 'Audit failed';
              } else if (audit.status === 'timed_out' || audit.status === 'timeout' || audit.status === 'cancelled') {
                currentStage = 'timed_out';
                stageDescription = stageDescription || 'Audit timed out';
              } else if (audit.status === 'pending' || audit.status === 'queued') {
                progressPercent = progressPercent || 0;
                currentStage = 'queued';
                stageDescription = stageDescription || 'Audit queued and waiting to start...';
              } else if (audit.status === 'processing' || audit.status === 'in_progress') {
                progressPercent = progressPercent || 5;
                currentStage = 'processing';
                stageDescription = stageDescription || 'Security audit in progress...';
              }

              // Format score to 1 decimal place max (fix 10+ decimal display issue)
              let formattedScore: number | null = null;
              if (audit.security_score !== undefined && audit.security_score !== null) {
                // Round to 1 decimal place
                formattedScore = Math.round(audit.security_score * 10) / 10;
              }

              return {
                id: auditId,
                url: audit.url || '',
                date: audit.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                status: displayStatus,
                // Handle score=0 correctly (0 is a valid score, not null)
                score: formattedScore,
                severity,
                vulnerabilities: audit.vulnerabilities_count ?? 0,
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                low: lowCount,
                reportId: auditId, // Use same ID for consistency
                certificateNumber: audit.certificate_number || null,
                scanTime: null,
                // Use actual SSL grade if available, not just binary A/F
                ssl: audit.ssl_grade || (audit.ssl_valid ? 'A' : 'F'),
                headers: audit.headers_score ?? 0,
                pdfUrl: audit.pdf_report_url && audit.pdf_report_url.includes('.pdf') ? 'available' : null,
                // Progress tracking fields for live updates
                progressPercent,
                currentStage,
                stageDescription,
                lastChecked: audit.updatedAt || audit.updated_at || undefined,
                etaSeconds: audit.etaSeconds || audit.eta_seconds || (audit.status === 'processing' ? Math.max(60, 900 - (progressPercent * 9)) : undefined),
                // Region routing info (v5.0.0)
                scanRegion: audit.scan_region || audit.scanRegion,
                regionName: audit.region_name || audit.regionName || (audit.scan_region === 'ap-south-1' ? 'India' : audit.scan_region === 'us-east-1' ? 'USA' : undefined),
                staticIP: audit.static_ip || audit.staticIP
              };
            });

            // Merge with existing audits (preserve any locally added background audits)
            setAuditHistory(prev => {
              // Get IDs of audits from API
              const apiAuditIds = new Set(mappedAudits.map(a => a.reportId));
              // Keep any local audits (like background audits) that aren't in API response yet
              const localOnlyAudits = prev.filter(a => !apiAuditIds.has(a.reportId));
              // Combine: local-only audits first (most recent), then API audits
              return [...localOnlyAudits, ...mappedAudits];
            });
            // Initial status check will be handled by the polling useEffect
          }
        } catch (apiError: any) {
          // Ignore abort errors (component unmounted)
          if (apiError?.name === 'AbortError') return;

          // Dashboard API fetch failed - log but preserve any local audits (background audits)
          logger.error('Dashboard API error (preserving local audits):', apiError);
          toast({
            variant: "destructive",
            title: "Failed to load audit history",
            description: "Some audit data may be unavailable. Please refresh the page."
          });
          // Don't clear audit history - keep any background audits that were added locally
        }

        setIsLoading(false);
      } catch (error: unknown) {
        // Ignore abort errors (component unmounted)
        if (isAbortError(error)) return;

        logger.error('Dashboard authentication failed:', error);
        setIsLoading(false);
        navigate('/login');
      }
    };

    loadUserData();

    return () => {
      abortController.abort();
    };
  }, [navigate, searchParams, toast]);

  // Check for subscription success (with idempotency to prevent duplicates on reload)
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const subscriptionId = searchParams.get('id');
    const planCode = searchParams.get('plan');

    if (subscriptionStatus === 'success' && subscriptionId) {
      // Idempotency check - prevent duplicate processing on page reload
      const processedKey = `dashboard_subscription_processed_${subscriptionId}`;
      if (sessionStorage.getItem(processedKey)) {
        // Already processed - just clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Mark as processed
      sessionStorage.setItem(processedKey, new Date().toISOString());

      // Get plan details from configuration
      const planDetails = planCode ? getPlanById(planCode.toLowerCase()) : null;
      const planName = planDetails?.name || planCode || 'Premium';
      const planCredits = planDetails?.credits || PLAN_CREDITS[planCode?.toLowerCase() || ''] || 0;

      toast({
        title: "Subscription Activated!",
        description: `Welcome to ${planName}. Your subscription is now active.`,
      });
      setUser(prev => ({ ...prev, plan: planName, credits: planCredits }));

      // Update localStorage
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const storedUser = JSON.parse(userStr);
        storedUser.plan = planName;
        storedUser.credits = planCredits;
        localStorage.setItem('currentUser', JSON.stringify(storedUser));
      }

      // Clear URL params to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, toast]);

  // Memoize in-progress audit IDs to avoid complex dependency expressions
  const inProgressAuditIds = useMemo(() => {
    return auditHistory
      .filter(a => a.status === 'In Progress' || a.status === 'pending' || a.status === 'processing')
      .map(a => a.reportId)
      .join(',');
  }, [auditHistory]);

  // Continuous polling for in-progress audits - get live progress from Lambda
  useEffect(() => {
    // Only poll if there are in-progress audits
    const inProgressAudits = auditHistory.filter(
      a => a.status === 'In Progress' || a.status === 'pending' || a.status === 'processing'
    );

    if (inProgressAudits.length === 0) return;

    const pollInProgressAudits = async () => {
      const results = await Promise.all(
        inProgressAudits.map(async (audit) => {
          try {
            // Poll audit status with retry logic
            const realStatus = await withRetry(
              () => AivedhaAPI.getAuditStatus(audit.reportId),
              {
                maxAttempts: 2,
                initialDelayMs: 500,
                shouldRetry: isRetryableError,
              }
            );
            return {
              reportId: audit.reportId,
              realStatus,
              previousProgress: audit.progressPercent,
              previousStaleCount: audit.staleCount || 0,
              error: null
            };
          } catch (err: unknown) {
            // If 404 - audit record doesn't exist (Lambda never ran or was deleted)
            // If other error - network issue, mark for retry
            const errorMessage = isErrorWithMessage(err) ? err.message : '';
            const errorStatus = errorMessage?.includes('404') ? 'not_found' : 'error';
            return {
              reportId: audit.reportId,
              realStatus: {
                status: errorStatus,
                report_id: audit.reportId,
                security_score: 0,
                vulnerabilities_count: 0,
                critical_issues: 0,
                medium_issues: 0,
                low_issues: 0,
                ssl_status: '',
                headers_score: 0,
                vulnerabilities: []
              } as import('@/lib/api').AuditResponse,
              previousProgress: audit.progressPercent,
              previousStaleCount: audit.staleCount || 0,
              error: err
            };
          }
        })
      );

      setAuditHistory(prev => prev.map(audit => {
        const result = results.find(r => r.reportId === audit.reportId);
        if (!result) return audit;

        const status = result.realStatus.status;
        const progress = result.realStatus.progressPercent ?? result.realStatus.progress ?? 0;
        const stage = result.realStatus.currentStage || '';
        const stageDesc = result.realStatus.stageDescription || result.realStatus.message || '';

        // Check if progress is stuck (same value for multiple checks)
        const isProgressStuck = result.previousProgress !== undefined &&
                                result.previousProgress === progress;
        const newStaleCount = isProgressStuck ? (result.previousStaleCount + 1) : 0;

        // If stale for more than 10 checks (~50 seconds with 5s interval), mark as failed
        const MAX_STALE_CHECKS = 10;

        let newDisplayStatus = audit.status;
        let finalStatus = audit.status;

        // Handle terminal states from backend
        if (status === 'completed') {
          finalStatus = 'Completed';
          // Update with real data
          return {
            ...audit,
            status: finalStatus,
            score: result.realStatus.security_score ?? audit.score,
            vulnerabilities: result.realStatus.vulnerabilities_count ??
                           result.realStatus.vulnerabilities?.length ?? audit.vulnerabilities,
            critical: result.realStatus.critical_issues ?? audit.critical,
            high: result.realStatus.high_issues ?? audit.high,
            medium: result.realStatus.medium_issues ?? audit.medium,
            low: result.realStatus.low_issues ?? audit.low,
            ssl: result.realStatus.ssl_grade || audit.ssl,
            headers: result.realStatus.headers_score ?? audit.headers,
            pdfUrl: result.realStatus.pdf_report_url && result.realStatus.pdf_report_url.includes('.pdf') ? 'available' : audit.pdfUrl,
            progressPercent: 100,
            currentStage: 'completed',
            stageDescription: 'Scan completed successfully',
            staleCount: 0
          };
        } else if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'not_found') {
          finalStatus = 'Failed';
          return {
            ...audit,
            status: finalStatus,
            progressPercent: progress,
            currentStage: 'failed',
            stageDescription: status === 'not_found'
              ? 'Audit record not found - Lambda may have failed to start'
              : 'Audit failed - please try again',
            staleCount: 0
          };
        } else if (status === 'timed_out' || status === 'timeout') {
          finalStatus = 'Timed Out';
          return {
            ...audit,
            status: finalStatus,
            progressPercent: progress,
            currentStage: 'timed_out',
            stageDescription: 'Audit timed out - the scan took too long',
            staleCount: 0
          };
        } else if (status === 'processing' || status === 'pending' || status === 'in_progress') {
          // Check if stuck for too long
          if (newStaleCount >= MAX_STALE_CHECKS) {
            // Mark as failed due to no progress
            logger.warn(`Audit ${audit.reportId} marked as failed - no progress for ${newStaleCount} checks`);
            finalStatus = 'Failed';
            return {
              ...audit,
              status: finalStatus,
              progressPercent: progress,
              currentStage: 'stalled',
              stageDescription: 'Audit appears to be stuck - no progress detected. Please try again.',
              staleCount: 0
            };
          }

          // Still in progress with updates
          newDisplayStatus = 'In Progress';

          // Extract enhanced progress details if available
          const progressDetails = result.realStatus.progressDetails || {};
          const etaSeconds = result.realStatus.etaSeconds || 0;

          // IMPORTANT: Use API stage description if available, otherwise keep existing
          // Never override accurate descriptions with generic fallbacks
          const finalStageDesc = stageDesc ||
            audit.stageDescription ||
            (progress > 0 ? `Security analysis in progress... ${Math.round(progress)}%` : 'Initializing security scan...');

          return {
            ...audit,
            status: newDisplayStatus,
            progressPercent: progress,
            currentStage: stage || audit.currentStage,
            stageDescription: finalStageDesc,
            lastChecked: new Date().toISOString(),
            staleCount: newStaleCount,
            progressDetails,
            etaSeconds
          };
        }

        return audit;
      }));
    };

    // Initial check immediately
    pollInProgressAudits();

    // Then poll every 5 seconds
    const pollInterval = setInterval(pollInProgressAudits, AUDIT_POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressAuditIds]);

  // Keep viewingAuditProgress in sync with auditHistory updates for real-time progress display
  useEffect(() => {
    if (!viewingAuditProgress) return;

    // Find the current audit in the updated history
    const currentAudit = auditHistory.find(a => a.reportId === viewingAuditProgress.reportId);
    if (!currentAudit) return;

    // Check if audit just completed
    if (currentAudit.status === 'Completed' && viewingAuditProgress.status !== 'Completed') {
      // Show completion toast
      toast({
        title: "Audit Complete!",
        description: `Security scan for ${currentAudit.url.replace(/^https?:\/\//, '').split('/')[0]} finished successfully.`,
        duration: TOAST_DURATION_MS
      });

      // Close the progress dialog after a brief delay to show 100%
      setTimeout(() => {
        setViewingAuditProgress(null);
      }, DIALOG_CLOSE_DELAY_MS);

      // Trigger a micro-refresh to get updated data
      handleMicroRefresh();
    } else if (currentAudit.status === 'Failed' || currentAudit.status === 'Timed Out') {
      // Show failure toast
      toast({
        title: "Audit " + currentAudit.status,
        description: currentAudit.stageDescription || `Security scan for ${currentAudit.url.replace(/^https?:\/\//, '').split('/')[0]} ${currentAudit.status.toLowerCase()}.`,
        variant: "destructive",
        duration: TOAST_DURATION_MS
      });

      // Close the progress dialog
      setTimeout(() => {
        setViewingAuditProgress(null);
      }, DIALOG_CLOSE_DELAY_MS);
    } else {
      // Update the viewing audit with latest progress data
      setViewingAuditProgress(currentAudit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditHistory, viewingAuditProgress?.reportId]);

  // Micro refresh function - refreshes data without full page reload
  const handleMicroRefresh = useCallback(async () => {
    if (isRefreshing) return; // Prevent double-refresh

    setIsRefreshing(true);

    try {
      const userStr = localStorage.getItem("currentUser");
      if (!userStr) {
        setIsRefreshing(false);
        return;
      }

      const storedUser = JSON.parse(userStr);
      const userEmail = storedUser.email;

      // Refresh subscription data and dashboard data in parallel with retry logic
      const [subscriptionRefresh, dashboardData] = await Promise.all([
        subscription.refreshSubscription(),
        userEmail ? withRetry(
          () => AivedhaAPI.getUserDashboardData(userEmail),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            shouldRetry: isRetryableError,
          }
        ) : Promise.resolve(null)
      ]);

      if (dashboardData && dashboardData.user) {
        const normalizeCredits = (val: unknown): number => {
          if (typeof val === 'number' && !isNaN(val)) return val;
          if (typeof val === 'string' && val !== '') {
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        setUser(prev => ({
          ...prev,
          credits: dashboardData.user?.credits !== undefined
            ? normalizeCredits(dashboardData.user.credits)
            : prev.credits,
          totalAudits: dashboardData.user?.totalAudits ?? prev.totalAudits,
          plan: dashboardData.user?.plan || prev.plan
        }));

        // Update localStorage
        const updatedUser = { ...storedUser, ...dashboardData.user };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      if (dashboardData && dashboardData.audits && Array.isArray(dashboardData.audits)) {
        const mappedAudits = dashboardData.audits.map((audit: ApiAuditResponse, index: number) => {
          let displayStatus = 'In Progress';
          if (audit.status === 'completed') displayStatus = 'Completed';
          else if (audit.status === 'failed' || audit.status === 'error') displayStatus = 'Failed';
          else if (audit.status === 'timed_out' || audit.status === 'timeout') displayStatus = 'Timed Out';

          const auditId = audit.report_id || `AVG-${Date.now()}-${index}`;
          const criticalCount = audit.critical_count ?? audit.critical_issues ?? 0;
          const highCount = audit.high_count ?? audit.high_issues ?? 0;
          const mediumCount = audit.medium_count ?? audit.medium_issues ?? 0;
          const lowCount = audit.low_count ?? audit.low_issues ?? 0;

          let severity: string = 'Low';
          if (criticalCount > 0) severity = 'Critical';
          else if (highCount > 0) severity = 'High';
          else if (mediumCount > 0) severity = 'Medium';

          let formattedScore: number | null = null;
          if (audit.security_score !== undefined && audit.security_score !== null) {
            formattedScore = Math.round(audit.security_score * 10) / 10;
          }

          return {
            id: auditId,
            url: audit.url || '',
            date: audit.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            status: displayStatus,
            score: formattedScore,
            severity,
            vulnerabilities: audit.vulnerabilities_count ?? 0,
            critical: criticalCount,
            high: highCount,
            medium: mediumCount,
            low: lowCount,
            reportId: auditId,
            certificateNumber: audit.certificate_number || null,
            scanTime: null,
            ssl: audit.ssl_grade || (audit.ssl_valid ? 'A' : 'F'),
            headers: audit.headers_score ?? 0,
            pdfUrl: audit.pdf_report_url && audit.pdf_report_url.includes('.pdf') ? 'available' : null,
            progressPercent: audit.progressPercent ?? audit.progress_percent ?? (audit.status === 'completed' ? 100 : 0),
            currentStage: audit.currentStage || audit.current_stage || '',
            stageDescription: audit.stageDescription || audit.stage_description || '',
          };
        });

        setAuditHistory(prev => {
          const apiAuditIds = new Set(mappedAudits.map((a: AuditHistoryItem) => a.reportId));
          const localOnlyAudits = prev.filter(a => !apiAuditIds.has(a.reportId));
          return [...localOnlyAudits, ...mappedAudits];
        });
      }

      toast({
        title: "Data refreshed",
        description: "Dashboard data has been updated.",
      });
    } catch (error) {
      logger.warn('Micro refresh failed:', error);
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: "Unable to refresh data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, subscription, toast]);

  // Check for first-time user onboarding on page load
  useEffect(() => {
    const shouldShowOnboarding = localStorage.getItem("showOnboarding");
    const userStr = localStorage.getItem("currentUser");

    if (shouldShowOnboarding === "true" && isAuthenticated && userStr) {
      try {
        const storedUser = JSON.parse(userStr);
        // Only show if not already completed or skipped
        if (!storedUser.onboardingCompleted && !storedUser.onboardingSkipped) {
          setShowOnboarding(true);
          setIsFirstTimeUser(true);
        } else {
          // Clean up stale flag
          localStorage.removeItem("showOnboarding");
        }
      } catch (error) {
        // Invalid user data, don't show onboarding
        logger.warn('Failed to parse user data for onboarding check:', error);
        localStorage.removeItem("showOnboarding");
      }
    }
  }, [isAuthenticated]);

  // Check for first-time audit popup (show for users with 0 audits)
  useEffect(() => {
    // Wait for loading to complete and user to be authenticated
    if (isLoading || !isAuthenticated) return;

    // Don't show if onboarding is still showing
    if (showOnboarding) return;

    // Check if popup was already dismissed
    const popupDismissed = localStorage.getItem("firstTimeAuditPopupDismissed");
    if (popupDismissed === "true") return;

    // Show popup if user has 0 audits
    if (user.totalAudits === 0 && auditHistory.length === 0) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowFirstAuditPopup(true);
      }, DIALOG_CLOSE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, showOnboarding, user.totalAudits, auditHistory.length]);

  // Handle first audit popup start
  const handleFirstAuditStart = (url: string) => {
    setShowFirstAuditPopup(false);
    // Navigate to security audit page with the URL pre-filled
    navigate(`/security-audit?url=${encodeURIComponent(url)}`);
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async (formData: { fullName?: string }) => {
    try {
      // Call API to update user profile - DO NOT send credits here
      // Credits are awarded ONLY during initial signup (Login.tsx or Signup.tsx)
      const response = await AivedhaAPI.completeOnboarding({
        ...formData,
        email: user.email,
        plan: 'Aarambh'
        // NOTE: No credits field - credits awarded during signup, not onboarding
      });

      // Get current credits from response (backend returns existing credits)
      const currentCredits = response?.user?.credits ?? user.credits ?? 0;

      // Free plan is automatically assigned - no checkout needed

      // Update local state with credits from server response
      setUser(prev => ({ ...prev, credits: currentCredits }));

      // Update localStorage
      const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      storedUser.credits = currentCredits;
      storedUser.onboardingCompleted = true;
      storedUser.plan = 'Aarambh';
      localStorage.setItem('currentUser', JSON.stringify(storedUser));

      // Clear onboarding flags
      localStorage.removeItem('showOnboarding');
      localStorage.removeItem('onboardingEmail');
      localStorage.removeItem('onboardingName');

      // Show completion message - don't mention credits (already awarded during signup)
      toast({
        title: "Profile Setup Complete",
        description: "Your profile has been set up successfully."
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Setup Error",
        description: "Failed to complete setup. Please try again."
      });
    }

    setShowOnboarding(false);
    setIsFirstTimeUser(false);
  };

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    // Mark as skipped but don't give free credits
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    storedUser.onboardingSkipped = true;
    localStorage.setItem('currentUser', JSON.stringify(storedUser));

    // Clear onboarding flags
    localStorage.removeItem('showOnboarding');
    localStorage.removeItem('onboardingEmail');
    localStorage.removeItem('onboardingName');

    setShowOnboarding(false);
    setIsFirstTimeUser(false);

    toast({
      title: "Setup Skipped",
      description: "You can complete your profile later from settings to receive free credits."
    });
  };

  // Fetch user addons when authenticated
  useEffect(() => {
    const fetchUserAddons = async () => {
      const currentUser = CognitoAuth.getCurrentUser();
      if (!currentUser || !isAuthenticated) return;

      try {
        const userId = currentUser.email || currentUser.identityId || currentUser.id;
        const response = await AivedhaAPI.getUserAddons(userId);
        if (response.addons) {
          setUserAddons(response.addons);
        }
      } catch (error) {
        // Failed to fetch user addons - will use default (non-critical)
        logger.warn('Failed to fetch user addons:', error);
      }
    };

    if (isAuthenticated) {
      fetchUserAddons();
    }
  }, [isAuthenticated]);

  // Calculate URL comparisons when audit history changes
  useEffect(() => {
    if (auditHistory.length === 0) {
      setUrlComparisons([]);
      return;
    }

    // Group audits by URL
    const urlGroups: { [key: string]: AuditHistoryItem[] } = {};
    auditHistory.filter(a => a.status === "Completed" && a.score !== null).forEach(audit => {
      const normalizedUrl = audit.url.toLowerCase().replace(/\/$/, '');
      if (!urlGroups[normalizedUrl]) {
        urlGroups[normalizedUrl] = [];
      }
      urlGroups[normalizedUrl].push(audit);
    });

    // Calculate comparisons for URLs with multiple audits
    const comparisons: URLComparison[] = [];
    Object.entries(urlGroups).forEach(([url, audits]) => {
      if (audits.length >= 1) {
        // Sort by date
        const sorted = [...audits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const scoreDiff = (last.score || 0) - (first.score || 0);

        comparisons.push({
          url,
          firstAudit: { score: first.score || 0, date: first.date },
          lastAudit: { score: last.score || 0, date: last.date },
          totalAudits: audits.length,
          scoreDiff,
          trend: scoreDiff > 0 ? 'improved' : scoreDiff < 0 ? 'declined' : 'same'
        });
      }
    });

    // Sort by most recent last audit
    comparisons.sort((a, b) => new Date(b.lastAudit.date).getTime() - new Date(a.lastAudit.date).getTime());
    setUrlComparisons(comparisons);
  }, [auditHistory]);

  // Quick stats calculations
  const completedAudits = auditHistory.filter(a => a.status === "Completed");
  const avgScore = completedAudits.length > 0
    ? (completedAudits.reduce((sum, a) => sum + (a.score || 0), 0) / completedAudits.length).toFixed(1)
    : 0;
  const totalVulnerabilities = completedAudits.reduce((sum, a) => sum + (a.vulnerabilities || 0), 0);
  const criticalIssues = completedAudits.reduce((sum, a) => sum + (a.critical || 0), 0);
  const highIssues = completedAudits.reduce((sum, a) => sum + (a.high || 0), 0);
  const mediumIssues = completedAudits.reduce((sum, a) => sum + (a.medium || 0), 0);
  const lowIssues = completedAudits.reduce((sum, a) => sum + (a.low || 0), 0);

  // Dynamic threat intelligence from actual audits
  const threatIntel = completedAudits.length > 0 ? [
    { type: "Critical Issues", count: criticalIssues, trend: criticalIssues > 0 ? "up" : "stable", change: criticalIssues, color: "text-red-500" },
    { type: "High Issues", count: highIssues, trend: highIssues > 0 ? "up" : "stable", change: highIssues, color: "text-orange-500" },
    { type: "Medium Issues", count: mediumIssues, trend: mediumIssues > 2 ? "up" : mediumIssues > 0 ? "stable" : "down", change: -mediumIssues, color: "text-yellow-500" },
    { type: "Low Issues", count: lowIssues, trend: "stable", change: 0, color: "text-green-500" },
    { type: "Total Vulnerabilities", count: totalVulnerabilities, trend: totalVulnerabilities > 5 ? "up" : "down", change: -totalVulnerabilities, color: "text-blue-500" }
  ] : [
    { type: "Critical Issues", count: 0, trend: "stable", change: 0, color: "text-red-500" },
    { type: "High Issues", count: 0, trend: "stable", change: 0, color: "text-orange-500" },
    { type: "Medium Issues", count: 0, trend: "stable", change: 0, color: "text-yellow-500" },
    { type: "Low Issues", count: 0, trend: "stable", change: 0, color: "text-green-500" },
    { type: "Total Vulnerabilities", count: 0, trend: "stable", change: 0, color: "text-blue-500" }
  ];

  // Dynamic security score breakdown from actual audits
  const avgSslScore = completedAudits.length > 0
    ? Math.round((completedAudits.filter(a => a.ssl === 'A' || a.ssl === 'A+').length / completedAudits.length) * 100)
    : 0;
  const avgHeadersScore = completedAudits.length > 0
    ? Math.round(completedAudits.reduce((sum, a) => sum + (a.headers || 0), 0) / completedAudits.length)
    : 0;
  const vulnerabilityScore = completedAudits.length > 0
    ? Math.max(0, Math.round(100 - (totalVulnerabilities / completedAudits.length) * 10))
    : 0;
  const overallScore = Math.round(Number(avgScore) * 10);

  const scoreBreakdown = [
    { category: "SSL/TLS", score: avgSslScore, icon: Lock, color: avgSslScore >= 80 ? "text-green-500" : avgSslScore >= 50 ? "text-yellow-500" : "text-red-500" },
    { category: "Headers", score: avgHeadersScore, icon: Server, color: avgHeadersScore >= 80 ? "text-green-500" : avgHeadersScore >= 50 ? "text-yellow-500" : "text-red-500" },
    { category: "Vulnerabilities", score: vulnerabilityScore, icon: Bug, color: vulnerabilityScore >= 80 ? "text-green-500" : vulnerabilityScore >= 50 ? "text-yellow-500" : "text-red-500" },
    { category: "Overall Score", score: overallScore, icon: Award, color: overallScore >= 80 ? "text-green-500" : overallScore >= 50 ? "text-yellow-500" : "text-red-500" }
  ];

  // Score history for trend chart
  const scoreHistory = completedAudits
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map(a => ({ date: a.date, score: a.score || 0 }));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 9) return "text-green-500";
    if (score >= 7) return "text-yellow-500";
    if (score >= 5) return "text-orange-500";
    return "text-red-500";
  };

  // Format score for display - ensures max 1 decimal place
  const formatScore = (score: number | null): string => {
    if (score === null || score === undefined) return '-';
    // Round to 1 decimal place
    const rounded = Math.round(score * 10) / 10;
    // If it's a whole number, show without decimal
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  // Format ETA time for display
  const formatEta = (seconds: number | undefined): string => {
    if (!seconds || seconds <= 0) return '< 1 min';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 15) return '~15 min';
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  };

  // Get active/in-progress audits for prominent display
  // Only show truly active audits - exclude completed, failed, timed_out
  const activeAudits = auditHistory.filter(a => {
    // Exclude terminal states
    const terminalStatuses = ['Completed', 'Failed', 'Timed Out', 'completed', 'failed', 'timed_out', 'error', 'timeout', 'cancelled'];
    const terminalStages = ['completed', 'failed', 'timed_out', 'error'];

    if (terminalStatuses.includes(a.status)) return false;
    if (a.currentStage && terminalStages.includes(a.currentStage)) return false;

    // Only include if actively processing
    return (
      a.status === 'In Progress' || a.status === 'Processing' ||
      a.status === 'processing' || a.status === 'pending' ||
      a.currentStage === 'processing' || a.currentStage === 'queued'
    );
  });

  // Using unified getSeverityBadgeClass from badge-utils

  return (
    <Layout>
      {/* ZooZoo Loader overlay - renders on top with 95% transparent bg, Layout visible behind */}
      {isLoading && <ZooZooLoader message="Loading Dashboard" showTips={true} />}

      {/* Content only renders when data is loaded */}
      {!isLoading && (
        <>
      {/* Onboarding Popup for First-Time Users */}
      <OnboardingPopup
        isOpen={showOnboarding}
        onClose={handleOnboardingSkip}
        onComplete={handleOnboardingComplete}
        userEmail={user.email || localStorage.getItem('onboardingEmail') || ''}
        userName={user.name || localStorage.getItem('onboardingName') || ''}
      />

      {/* First-Time Audit Popup - Show for users with 0 audits */}
      <FirstTimeAuditPopup
        isOpen={showFirstAuditPopup}
        onClose={() => setShowFirstAuditPopup(false)}
        onStartAudit={handleFirstAuditStart}
        userName={user.name}
      />

      {/* Credit Warning Banner */}
      <CreditWarningBanner
        credits={typeof user.credits === 'number' ? user.credits : (subscription.credits || 0)}
        totalCredits={subscription.totalCredits || (currentPlanDetails?.credits || 3)}
        planName={user.plan || subscription.planName || 'Aarambh'}
      />
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground font-orbitron">
                    Welcome back, {user.name.split(' ')[0]}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last login: {new Date(user.lastLogin).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/security-audit")}
                variant="default"
                className="hover:scale-105 hover:-translate-y-1 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Audit
              </Button>
              <Button
                onClick={() => navigate("/purchase")}
                variant="outline"
              >
                <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                Upgrade
              </Button>
            </div>
          </div>

          {/* Active/Running Audits - Compact Cards Grid */}
          {activeAudits.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
                <h3 className="font-bold text-foreground">
                  {activeAudits.length} Active Audit{activeAudits.length > 1 ? 's' : ''}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeAudits.map((audit) => (
                  <Card
                    key={audit.id}
                    className="bg-card/90 border-primary/30 shadow-md overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                    onClick={() => setViewingAuditProgress(audit)}
                  >
                    <CardContent className="p-3">
                      {/* URL with scanner icon */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                        <span className="text-xs font-medium truncate text-foreground" title={audit.url}>
                          {audit.url?.replace(/^https?:\/\//, '').split('/')[0] || 'Scanning...'}
                        </span>
                      </div>

                      {/* Progress bar with percentage */}
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={audit.progressPercent || 0} className="h-1.5 flex-1" />
                        <span className="text-xs font-bold text-primary min-w-[32px] text-right">
                          {Math.round(audit.progressPercent || 0)}%
                        </span>
                      </div>

                      {/* Status text with ETA */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-primary animate-pulse" />
                          <span className="text-[10px] text-primary font-medium truncate max-w-[80px]">
                            {audit.currentStage === 'queued' ? 'Queued' : 'Scanning'}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatEta(audit.etaSeconds)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid - Uniform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Credits Card */}
            <Card className="h-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden relative group cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate("/dashboard/subscription")}>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
              <CardContent className="p-6 relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  {(() => {
                    const planId = currentPlanDetails?.id || user.plan?.toLowerCase().replace(/\s+/g, '') || 'aarambh';
                    const AnimatedPlanIcon = getAnimatedPlanIcon(planId);
                    return <AnimatedPlanIcon size={48} />;
                  })()}
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    {user.plan}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-1">Available Credits</p>
                <p className="text-4xl font-bold text-foreground">
                  {typeof user.credits === 'number' ? user.credits : 0}
                </p>
                <div className="mt-auto pt-3">
                  <Progress
                    value={Math.min(100, ((currentPlanDetails?.credits || 3) - (typeof user.credits === 'number' ? user.credits : 0)) / (currentPlanDetails?.credits || 3) * 100)}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {`${(currentPlanDetails?.credits || 3) - (typeof user.credits === 'number' ? user.credits : 0)} of ${currentPlanDetails?.credits || 3} used`}
                    </p>
                    <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Manage <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Audits Card */}
            <Card className="h-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
              <CardContent className="p-6 relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">+12%</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-1">Total Audits</p>
                <p className="text-4xl font-bold text-foreground">{user.totalAudits}</p>
                <div className="mt-auto pt-3">
                  <Progress value={Math.min(100, user.totalAudits * 10)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {auditHistory.filter(a => a.status === "In Progress").length} in progress
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Score Card */}
            <Card className="h-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5" />
              <CardContent className="p-6 relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <Badge className={`${Number(avgScore) >= 7 ? 'bg-green-500/10 text-green-600 border-green-500/20' : Number(avgScore) >= 5 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                    {Number(avgScore) >= 7 ? 'Good' : Number(avgScore) >= 5 ? 'Average' : 'Needs Work'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-1">Avg Security Score</p>
                <p className={`text-4xl font-bold ${getScoreColor(Number(avgScore))}`}>{avgScore}/10</p>
                <div className="mt-auto pt-3">
                  <Progress value={Number(avgScore) * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {completedAudits.length} completed audits
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues Card */}
            <Card className="h-full bg-card/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5" />
              <CardContent className="p-6 relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <Badge className={criticalIssues > 0 ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"}>
                    {criticalIssues > 0 ? 'Action Required' : 'All Clear'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-1">Critical Issues</p>
                <p className={`text-4xl font-bold ${criticalIssues > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {criticalIssues}
                </p>
                <div className="mt-auto pt-3">
                  <Progress value={Math.max(0, 100 - criticalIssues * 20)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalVulnerabilities} total vulnerabilities found
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Addons Section */}
          {userAddons.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Active Addons
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userAddons.map((addon) => (
                  <Card
                    key={addon.addon_code}
                    className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden relative cursor-pointer hover:border-violet-500/30 transition-colors"
                    onClick={() => {
                      if (addon.addon_code === 'scheduled_audits') navigate('/scheduler');
                      else if (addon.addon_code === 'whitelabel_cert') navigate('/pricing');
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5" />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                          {addon.addon_code === 'scheduled_audits' ? (
                            <Timer className="h-6 w-6 text-violet-500" />
                          ) : addon.addon_code === 'whitelabel_cert' ? (
                            <FileCheck className="h-6 w-6 text-violet-500" />
                          ) : (
                            <Zap className="h-6 w-6 text-violet-500" />
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold text-foreground">{addon.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${
                              addon.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {addon.status === 'active' ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {addon.status}
                                </>
                              )}
                            </Badge>
                            {addon.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                Expires: {new Date(addon.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-card/50 p-1 rounded-2xl shadow-lg">
                <TabsTrigger value="overview" className="text-sm tab-3d data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-sm tab-3d data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LineChart className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-sm tab-3d data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Reports
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Getting Started Guide - Show for new users with 0 audits */}
                {user.totalAudits === 0 && (
                  <div>
                    <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="h-8 w-8 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-2 font-orbitron">Welcome to AiVedha Guard!</h3>
                            <p className="text-muted-foreground mb-4">
                              You're all set to start securing your websites. Here's how to get started:
                            </p>
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                                  <span className="font-medium text-foreground">Enter URL</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Type your website URL in the search bar above</p>
                              </div>
                              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                                  <span className="font-medium text-foreground">Run Audit</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Click Quick Audit and wait for the scan to complete</p>
                              </div>
                              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                                  <span className="font-medium text-foreground">Get Report</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Review findings and download your PDF report</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Recent Audits */}
                  <Card className="lg:col-span-2 bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Recent Security Audits
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMicroRefresh}
                        disabled={isRefreshing}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Refresh dashboard data"
                        aria-label="Refresh dashboard data"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {auditHistory.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-primary/50" />
                          </div>
                          <h4 className="text-lg font-medium text-foreground mb-2">No audits yet</h4>
                          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                            Start your first security audit by entering a URL in the search bar above
                          </p>
                          <Button onClick={() => navigate("/security-audit")} variant="default">
                            <Shield className="h-4 w-4 mr-2" />
                            Start First Audit
                          </Button>
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
                          <AnimatePresence>
                            {auditHistory.map((audit, index) => (
                              <div
                                key={audit.id}
                                className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    audit.status === "Completed"
                                      ? audit.score && audit.score >= 8
                                        ? "bg-green-500/10"
                                        : audit.score && audit.score >= 6
                                          ? "bg-yellow-500/10"
                                          : "bg-red-500/10"
                                      : audit.status === "Failed"
                                        ? "bg-red-500/10"
                                        : audit.status === "Timed Out"
                                          ? "bg-orange-500/10"
                                          : "bg-blue-500/10"
                                  }`}>
                                    {audit.status === "Completed" ? (
                                      <CheckCircle className={`h-5 w-5 ${
                                        audit.score && audit.score >= 8 ? "text-green-500" :
                                        audit.score && audit.score >= 6 ? "text-yellow-500" : "text-red-500"
                                      }`} />
                                    ) : audit.status === "Failed" ? (
                                      <AlertTriangle className="h-5 w-5 text-red-500" />
                                    ) : audit.status === "Timed Out" ? (
                                      <Clock className="h-5 w-5 text-orange-500" />
                                    ) : (
                                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground truncate max-w-[200px]">
                                      {audit.url.replace('https://', '')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {audit.date} • {audit.reportId}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {audit.status === "Completed" ? (
                                    <>
                                      <div className="text-right">
                                        <p className={`text-lg font-bold ${getScoreColor(audit.score)}`}>
                                          {formatScore(audit.score)}/10
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {audit.vulnerabilities} issues
                                        </p>
                                      </div>
                                      <Badge className={getSeverityBadgeClass(audit.severity)}>
                                        {normalizeSeverity(audit.severity)}
                                      </Badge>
                                    </>
                                  ) : audit.status === "Failed" ? (
                                    <>
                                      <Badge variant="destructive">Failed</Badge>
                                    </>
                                  ) : audit.status === "Timed Out" ? (
                                    <>
                                      <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                        Timed Out
                                      </Badge>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                                        {/* Stage description with truncation - Bold Orbitron font */}
                                        <div className="flex items-center gap-1.5">
                                          <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
                                          <span className="truncate max-w-[120px] font-bold font-orbitron text-xs text-primary tracking-wide animate-pulse" title={audit.stageDescription}>
                                            {audit.stageDescription || 'Scanning...'}
                                          </span>
                                        </div>
                                        {/* Progress bar with percentage */}
                                        <div className="flex items-center gap-2">
                                          <Progress value={audit.progressPercent || 0} className="h-2 flex-1" />
                                          <span className="text-xs font-bold text-primary min-w-[32px] text-right">
                                            {Math.round(audit.progressPercent || 0)}%
                                          </span>
                                        </div>
                                        {/* AI analysis details when in ai_analysis stage */}
                                        {audit.currentStage === 'ai_analysis' && audit.progressDetails?.totalVulnerabilities && (
                                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                                            <Bot className="h-2.5 w-2.5" />
                                            <span>
                                              Analyzing {audit.progressDetails.currentVulnerability}/{audit.progressDetails.totalVulnerabilities} issues
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <Badge variant="secondary" className="animate-pulse whitespace-nowrap">
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                        In Progress
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Security Score Breakdown */}
                  <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-primary" />
                        Security Breakdown
                      </CardTitle>
                      <CardDescription>
                        Average scores across all audits
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {scoreBreakdown.map((item, index) => (
                          <div key={item.category}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <item.icon className={`h-4 w-4 ${item.color}`} />
                                <span className="text-sm font-medium">{item.category}</span>
                              </div>
                              <span className={`text-sm font-bold ${item.color}`}>
                                {item.score}%
                              </span>
                            </div>
                            <Progress value={item.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 1: Referral Section + Threat Intelligence */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Referral Section - Compact on mobile */}
                  <ReferralSection
                    userEmail={user.email}
                    userName={user.name}
                  />

                  {/* Threat Intelligence */}
                  <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Threat Intelligence</span>
                        <span className="sm:hidden">Threats</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {threatIntel.map((threat) => (
                          <div
                            key={threat.type}
                            className="p-2 rounded-lg border border-border/50 bg-background/50 text-center"
                          >
                            <span className="text-lg font-bold text-foreground">{threat.count}</span>
                            <p className="text-xs text-muted-foreground truncate">{threat.type}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Security Best Practices + Score Projection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Security Best Practices - Compact */}
                  <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Security Best Practices</span>
                        <span className="sm:hidden">Best Practices</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-xs font-medium truncate">HTTPS</span>
                        </div>
                        <div className="p-2 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-center gap-2">
                          <Server className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="text-xs font-medium truncate">Headers</span>
                        </div>
                        <div className="p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-2">
                          <Key className="h-4 w-4 text-yellow-500 shrink-0" />
                          <span className="text-xs font-medium truncate">Updates</span>
                        </div>
                        <div className="p-2 rounded-lg border border-purple-500/20 bg-purple-500/5 flex items-center gap-2">
                          <Bug className="h-4 w-4 text-purple-500 shrink-0" />
                          <span className="text-xs font-medium truncate">Validation</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Projection - Compact trend chart */}
                  {urlComparisons.length > 0 ? (
                    <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="hidden sm:inline">Score Projection</span>
                          <span className="sm:hidden">Trends</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="max-h-[150px] overflow-y-auto pr-1 space-y-2">
                          {urlComparisons.map((comparison) => (
                            <div key={comparison.url} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50">
                              <span className="text-xs truncate max-w-[120px]">
                                {comparison.url.replace('https://', '').replace('http://', '').split('/')[0]}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${getScoreColor(comparison.lastAudit.score)}`}>
                                  {formatScore(comparison.lastAudit.score)}
                                </span>
                                {comparison.totalAudits > 1 && (
                                  <span className={`text-xs ${comparison.trend === 'improved' ? 'text-green-500' : comparison.trend === 'declined' ? 'text-red-500' : 'text-gray-500'}`}>
                                    {comparison.trend === 'improved' ? '↑' : comparison.trend === 'declined' ? '↓' : '−'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Score Projection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Run audits to see trends
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* URL Score Comparison - Detailed view (hidden on mobile, shown in Audits tab) */}
                {urlComparisons.length > 0 && (
                  <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Score Progression by URL
                      </CardTitle>
                      <CardDescription>
                        Track security improvements across multiple audits of the same website
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
                        {urlComparisons.map((comparison, index) => (
                          <div
                            key={comparison.url}
                            className="p-4 rounded-xl border border-border/50 bg-background/50"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Globe className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-foreground truncate max-w-[300px]">
                                    {comparison.url.replace('https://', '').replace('http://', '')}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {comparison.totalAudits} audit{comparison.totalAudits > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {comparison.totalAudits > 1
                                    ? `First audit: ${comparison.firstAudit.date} • Last audit: ${comparison.lastAudit.date}`
                                    : `Audited on: ${comparison.lastAudit.date}`
                                  }
                                </p>
                              </div>

                              {comparison.totalAudits > 1 ? (
                                <div className="flex items-center gap-6">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">First Score</p>
                                    <p className={`text-xl font-bold ${getScoreColor(comparison.firstAudit.score)}`}>
                                      {formatScore(comparison.firstAudit.score)}/10
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {comparison.trend === 'improved' ? (
                                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 text-green-500">
                                        <ArrowUpRight className="h-4 w-4" />
                                        <span className="text-sm font-medium">+{comparison.scoreDiff.toFixed(1)}</span>
                                      </div>
                                    ) : comparison.trend === 'declined' ? (
                                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-500">
                                        <ArrowDownRight className="h-4 w-4" />
                                        <span className="text-sm font-medium">{comparison.scoreDiff.toFixed(1)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-500/10 text-gray-500">
                                        <span className="text-sm font-medium">No Change</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Last Score</p>
                                    <p className={`text-xl font-bold ${getScoreColor(comparison.lastAudit.score)}`}>
                                      {formatScore(comparison.lastAudit.score)}/10
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Current Score</p>
                                    <p className={`text-xl font-bold ${getScoreColor(comparison.lastAudit.score)}`}>
                                      {formatScore(comparison.lastAudit.score)}/10
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => navigate(`/security-audit?url=${encodeURIComponent(comparison.url)}`)}
                                    className="btn-secondary px-3 py-1.5 text-sm rounded-lg inline-flex items-center whitespace-nowrap"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Re-audit
                                  </button>
                                </div>
                              )}
                            </div>

                            {comparison.totalAudits > 1 && (
                              <div className="mt-3 pt-3 border-t border-border/30">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={
                                    comparison.trend === 'improved'
                                      ? 'text-green-500'
                                      : comparison.trend === 'declined'
                                        ? 'text-red-500'
                                        : 'text-muted-foreground'
                                  }>
                                    {comparison.trend === 'improved'
                                      ? `Great progress! Security improved by ${Math.abs(comparison.scoreDiff).toFixed(1)} points`
                                      : comparison.trend === 'declined'
                                        ? `Security score decreased by ${Math.abs(comparison.scoreDiff).toFixed(1)} points - action recommended`
                                        : 'Security score maintained - keep up the good work!'
                                    }
                                  </span>
                                  <button
                                    className="btn-ghost h-7 text-xs px-2 rounded-lg inline-flex items-center whitespace-nowrap"
                                    onClick={() => navigate(`/security-audit?url=${encodeURIComponent(comparison.url)}`)}
                                  >
                                    Run New Audit
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <div className="grid gap-6">
                  {completedAudits.length === 0 ? (
                    // Empty state for new users
                    <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                      <CardContent className="py-12">
                        <div className="text-center max-w-md mx-auto">
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <BarChart3 className="h-10 w-10 text-primary/50" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-3">Analytics Coming Soon</h3>
                          <p className="text-muted-foreground mb-6">
                            Complete your first security audit to unlock powerful analytics and insights. Track your security progress over time, compare scores, and identify improvement areas.
                          </p>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-xl border border-dashed border-border/50 bg-background/30">
                              <div className="text-2xl font-bold text-muted-foreground/30">--%</div>
                              <div className="text-xs text-muted-foreground/50">SSL Score</div>
                            </div>
                            <div className="p-4 rounded-xl border border-dashed border-border/50 bg-background/30">
                              <div className="text-2xl font-bold text-muted-foreground/30">--%</div>
                              <div className="text-xs text-muted-foreground/50">Headers</div>
                            </div>
                            <div className="p-4 rounded-xl border border-dashed border-border/50 bg-background/30">
                              <div className="text-2xl font-bold text-muted-foreground/30">--/10</div>
                              <div className="text-xs text-muted-foreground/50">Avg Score</div>
                            </div>
                          </div>
                          <Button onClick={() => navigate("/security-audit")} variant="default">
                            <Shield className="h-4 w-4 mr-2" />
                            Start Your First Audit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Bug className="h-5 w-5 text-primary" />
                              Vulnerability Distribution
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-6">
                              {/* Interactive Bar Chart */}
                              <div className="h-48 flex items-end justify-around gap-4 pb-4 border-b border-border/30">
                                {[
                                  { label: "Critical", count: criticalIssues, color: "bg-red-500", hoverColor: "hover:bg-red-400" },
                                  { label: "Medium", count: mediumIssues, color: "bg-yellow-500", hoverColor: "hover:bg-yellow-400" },
                                  { label: "Low", count: lowIssues, color: "bg-green-500", hoverColor: "hover:bg-green-400" }
                                ].map((item) => {
                                  const maxCount = Math.max(criticalIssues, mediumIssues, lowIssues, 1);
                                  const height = Math.max(10, (item.count / maxCount) * 100);
                                  return (
                                    <div
                                      key={item.label}
                                      className="flex flex-col items-center gap-2 flex-1"
                                    >
                                      <span className="text-sm font-bold text-foreground">{item.count}</span>
                                      <div
                                        className={`w-full max-w-16 rounded-t-lg ${item.color} ${item.hoverColor} transition-colors cursor-pointer dynamic-height`}
                                        style={{ '--dynamic-height': `${height}%` } as React.CSSProperties}
                                      />
                                      <span className="text-xs text-muted-foreground">{item.label}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Legend */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    Critical Severity
                                  </span>
                                  <span className="text-red-500 font-bold">{criticalIssues}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    Medium Severity
                                  </span>
                                  <span className="text-yellow-500 font-bold">{mediumIssues}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    Low Severity
                                  </span>
                                  <span className="text-green-500 font-bold">{lowIssues}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Award className="h-5 w-5 text-primary" />
                              Security Metrics
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {[
                                { label: "SSL/TLS Rating", value: `${avgSslScore}%`, color: avgSslScore >= 80 ? "text-green-500" : avgSslScore >= 50 ? "text-yellow-500" : "text-red-500" },
                                { label: "Security Headers", value: `${avgHeadersScore}%`, color: avgHeadersScore >= 80 ? "text-green-500" : avgHeadersScore >= 50 ? "text-yellow-500" : "text-red-500" },
                                { label: "Vulnerability Score", value: `${vulnerabilityScore}%`, color: vulnerabilityScore >= 80 ? "text-green-500" : vulnerabilityScore >= 50 ? "text-yellow-500" : "text-red-500" },
                                { label: "Average Score", value: `${avgScore}/10`, color: Number(avgScore) >= 8 ? "text-green-500" : Number(avgScore) >= 5 ? "text-yellow-500" : "text-red-500" }
                              ].map((metric, index) => (
                                <div
                                  key={metric.label}
                                  className="flex justify-between items-center p-3 rounded-lg bg-background/50"
                                >
                                  <span className="text-muted-foreground">{metric.label}</span>
                                  <span className={`font-bold ${metric.color}`}>{metric.value}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Score Trend Chart */}
                      <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5 text-primary" />
                            Security Score Trend
                          </CardTitle>
                          <CardDescription>
                            Your security posture over time based on {scoreHistory.length} audit{scoreHistory.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {scoreHistory.length >= 2 ? (
                            <div className="h-64 relative">
                              {/* Simple line chart visualization */}
                              <div className="absolute inset-0 flex items-end px-4 pb-8">
                                <div className="flex-1 flex items-end justify-around gap-2 h-full">
                                  {scoreHistory.map((point, index) => {
                                    const height = (point.score / 10) * 100;
                                    const prevScore = index > 0 ? scoreHistory[index - 1].score : point.score;
                                    const isImproved = point.score > prevScore;
                                    const isDeclined = point.score < prevScore;

                                    return (
                                      <div
                                        key={index}
                                        className="flex flex-col items-center gap-1 flex-1"
                                      >
                                        <span className={`text-xs font-bold ${
                                          point.score >= 8 ? 'text-green-500' :
                                          point.score >= 5 ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                          {formatScore(point.score)}
                                        </span>
                                        <div
                                          className={`w-full max-w-8 rounded-t-lg dynamic-height ${
                                            point.score >= 8 ? 'bg-green-500' :
                                            point.score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ '--dynamic-height': `${height}%` } as React.CSSProperties}
                                        />
                                        <span className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                                          {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        {index > 0 && (
                                          <span className={`text-[10px] ${
                                            isImproved ? 'text-green-500' :
                                            isDeclined ? 'text-red-500' : 'text-gray-500'
                                          }`}>
                                            {isImproved ? '↑' : isDeclined ? '↓' : '→'}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Score scale */}
                              <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-muted-foreground">
                                <span>10</span>
                                <span>5</span>
                                <span>0</span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
                              <div className="text-center">
                                <TrendingUp className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                  {scoreHistory.length === 1
                                    ? `Your current score is ${formatScore(scoreHistory[0].score)}/10`
                                    : 'Complete more audits to see your trend'
                                  }
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Run multiple audits to track your security improvements over time
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Trend summary */}
                          {scoreHistory.length >= 2 && (
                            <div className="mt-4 p-4 rounded-xl bg-background/50 border border-border/30">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Overall Trend</p>
                                  {(() => {
                                    const firstScore = scoreHistory[0].score;
                                    const lastScore = scoreHistory[scoreHistory.length - 1].score;
                                    const diff = lastScore - firstScore;
                                    const percentChange = ((diff / Math.max(firstScore, 1)) * 100).toFixed(0);

                                    return (
                                      <p className={`text-lg font-bold ${
                                        diff > 0 ? 'text-green-500' :
                                        diff < 0 ? 'text-red-500' : 'text-gray-500'
                                      }`}>
                                        {diff > 0 ? `+${diff.toFixed(1)} points (↑${percentChange}%)` :
                                         diff < 0 ? `${diff.toFixed(1)} points (↓${Math.abs(Number(percentChange))}%)` :
                                         'No change'}
                                      </p>
                                    );
                                  })()}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Latest Score</p>
                                  <p className={`text-2xl font-bold ${getScoreColor(scoreHistory[scoreHistory.length - 1].score)}`}>
                                    {formatScore(scoreHistory[scoreHistory.length - 1].score)}/10
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports">
                <Card className="bg-card/80 backdrop-blur-md border border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      Generated Reports
                    </CardTitle>
                    <CardDescription>
                      Download and manage your security audit reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditHistory.filter((audit) => audit.status === "Completed").length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <FileCheck className="h-8 w-8 text-primary/50" />
                        </div>
                        <h4 className="text-lg font-medium text-foreground mb-2">No reports yet</h4>
                        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                          Complete your first security audit to generate a detailed PDF report with findings and recommendations.
                        </p>
                        <Button onClick={() => navigate("/security-audit")} variant="default">
                          <Shield className="h-4 w-4 mr-2" />
                          Start Security Audit
                        </Button>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto pr-1 grid gap-4">
                        {auditHistory
                          .filter((audit) => audit.status === "Completed")
                          .map((audit, index) => (
                            <div
                              key={audit.id}
                              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/80 transition-colors gap-4"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <FileCheck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg text-foreground">
                                    {audit.url.replace('https://', '').replace('http://', '').split('/')[0]}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {audit.reportId} • {audit.date}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge className={getSeverityBadgeClass(audit.severity)}>
                                  {normalizeSeverity(audit.severity)} Risk
                                </Badge>
                                <Badge variant="outline" className="font-mono">
                                  SSL: {audit.ssl}
                                </Badge>
                                <Badge className={getScoreBadgeClass(audit.score)}>
                                  Score: {formatScore(audit.score)}/10
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="hover:scale-105 transition-transform hover:bg-blue-500 hover:text-white"
                                  onClick={() => navigate(`/audit-results?reportId=${audit.reportId}`)}
                                  title="View Full Audit Results"
                                  aria-label={`View full audit results for ${audit.url}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                {audit.pdfUrl ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="hover:scale-105 transition-transform hover:bg-primary hover:text-primary-foreground"
                                    onClick={async () => {
                                      try {
                                        // Always use downloadReport to get fresh presigned URL (secure - doesn't expose S3 keys)
                                        await AivedhaAPI.downloadReport(audit.reportId);
                                      } catch (error) {
                                        toast({
                                          variant: "destructive",
                                          title: "Download Failed",
                                          description: "Unable to download PDF report. Please try again later."
                                        });
                                      }
                                    }}
                                    title="Download PDF Report"
                                    aria-label={`Download PDF report for ${audit.url}`}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    PDF
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="opacity-50 cursor-not-allowed"
                                    disabled
                                    title="PDF not yet generated"
                                    aria-label="PDF report not yet generated"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    PDF
                                  </Button>
                                )}
                                {audit.certificateNumber ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="hover:scale-105 transition-transform hover:bg-green-500 hover:text-white"
                                    onClick={() => navigate(`/certificate/${audit.certificateNumber}`)}
                                    title="View Security Certificate"
                                    aria-label={`View security certificate for ${audit.url}`}
                                  >
                                    <Award className="h-4 w-4 mr-2" />
                                    Certificate
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="opacity-50 cursor-not-allowed"
                                    disabled
                                    title="Certificate not yet generated"
                                    aria-label="Certificate not yet generated"
                                  >
                                    <Award className="h-4 w-4 mr-2" />
                                    Certificate
                                  </Button>
                                )}
                                {audit.certificateNumber ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="hover:scale-105 transition-transform hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      setSelectedAuditForEmbed(audit);
                                      setEmbedDialogOpen(true);
                                    }}
                                    title="Get Embed Code for Security Badge"
                                    aria-label={`Get embed code for security badge for ${audit.url}`}
                                  >
                                    <Code className="h-4 w-4 mr-2" />
                                    Badge
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="opacity-50 cursor-not-allowed"
                                    disabled
                                    title="Badge not available - certificate required"
                                    aria-label="Security badge not available - certificate required"
                                  >
                                    <Code className="h-4 w-4 mr-2" />
                                    Badge
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Embed Code Dialog for Security Badge */}
      {selectedAuditForEmbed && (
        <EmbedCodeDialog
          open={embedDialogOpen}
          onOpenChange={(open) => {
            setEmbedDialogOpen(open);
            if (!open) setSelectedAuditForEmbed(null);
          }}
          certificateNumber={selectedAuditForEmbed.certificateNumber || selectedAuditForEmbed.reportId}
          domain={selectedAuditForEmbed.url.replace('https://', '').replace('http://', '').split('/')[0]}
          securityScore={selectedAuditForEmbed.score || 0}
        />
      )}

      {/* Progress Dialog for In-Progress Audits */}
      <Dialog open={!!viewingAuditProgress} onOpenChange={(open) => !open && setViewingAuditProgress(null)}>
        <DialogContent className="sm:max-w-lg z-[70]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingAuditProgress?.status === 'Completed' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Audit Complete
                </>
              ) : viewingAuditProgress?.status === 'Failed' || viewingAuditProgress?.status === 'Timed Out' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Audit {viewingAuditProgress?.status}
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 text-primary animate-pulse" />
                  Live Security Scan
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingAuditProgress?.status === 'Completed'
                ? 'Security scan completed successfully'
                : viewingAuditProgress?.status === 'Failed' || viewingAuditProgress?.status === 'Timed Out'
                ? 'Security scan could not be completed'
                : 'Real-time progress of your security audit'}
            </DialogDescription>
          </DialogHeader>

          {viewingAuditProgress && (
            <div className="space-y-4 py-4">
              {/* URL Display with Globe Icon */}
              <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Target URL</p>
                    <p className="text-sm font-mono font-medium truncate">{viewingAuditProgress.url}</p>
                  </div>
                </div>
              </div>

              {/* Animated Progress Display */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Scan Progress</span>
                  <span className="text-2xl font-bold text-primary">
                    {Math.round(viewingAuditProgress.progressPercent || 0)}%
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={viewingAuditProgress.progressPercent || 0}
                    className="h-4 bg-muted/50"
                  />
                  {viewingAuditProgress.status !== 'Completed' &&
                   viewingAuditProgress.status !== 'Failed' &&
                   viewingAuditProgress.status !== 'Timed Out' && (
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                        style={{
                          width: '100%',
                          animation: 'shimmer 2s infinite',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Current Stage with animated icon */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {viewingAuditProgress.status === 'Completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : viewingAuditProgress.status === 'Failed' || viewingAuditProgress.status === 'Timed Out' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="relative flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Current Stage</p>
                    <p className="text-sm font-medium truncate">
                      {viewingAuditProgress.stageDescription || 'Initializing scan...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ETA Display - only for in-progress */}
              {viewingAuditProgress.status !== 'Completed' &&
               viewingAuditProgress.status !== 'Failed' &&
               viewingAuditProgress.status !== 'Timed Out' &&
               viewingAuditProgress.etaSeconds && viewingAuditProgress.etaSeconds > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>Estimated time remaining: {formatEta(viewingAuditProgress.etaSeconds)}</span>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-center">
                {viewingAuditProgress.status === 'Completed' ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-4 py-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Scan Complete
                  </Badge>
                ) : viewingAuditProgress.status === 'Failed' || viewingAuditProgress.status === 'Timed Out' ? (
                  <Badge variant="destructive" className="px-4 py-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {viewingAuditProgress.status}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30 px-4 py-1">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    AI Scanning in Progress
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setViewingAuditProgress(null)}
                >
                  {viewingAuditProgress.status === 'Completed' ||
                   viewingAuditProgress.status === 'Failed' ||
                   viewingAuditProgress.status === 'Timed Out'
                    ? 'Close'
                    : 'Run in Background'}
                </Button>
                {viewingAuditProgress.status === 'Completed' ? (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      navigate(`/audit-results/${viewingAuditProgress.reportId}`);
                      setViewingAuditProgress(null);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                ) : viewingAuditProgress.status === 'Failed' || viewingAuditProgress.status === 'Timed Out' ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      navigate('/security-audit');
                      setViewingAuditProgress(null);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      navigate(`/security-audit?resume=${viewingAuditProgress.reportId}`);
                      setViewingAuditProgress(null);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </Layout>
  );
}
