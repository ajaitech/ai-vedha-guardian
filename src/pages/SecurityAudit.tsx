import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { AuditPopup } from "@/components/AuditPopup";
import LegalConsentDialog from "@/components/LegalConsentDialog";
import { ZooZooCharacters } from "@/components/ZooZooCharacters";
import { UrlValidationWarningDialog } from "@/components/UrlValidationWarningDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SessionContext";
import AivedhaAPI, { AuditItemStatus } from "@/lib/api";
import { logger } from "@/lib/logger";
import { RECAPTCHA_CONFIG } from "@/config";
import { SECURITY_SLOGANS } from "@/constants/securitySlogans";
import { generateMathChallenge } from "@/utils/manualVerification";
import { trackAuditStarted, trackAuditCompleted, trackAuditFailed } from "@/lib/analytics";
import { getErrorMessage } from "@/utils/type-guards";

// Declare grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}
import {
  Shield,
  Globe,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Lock,
  Search,
  Download,
  Clock,
  LogIn,
  CreditCard,
  Award,
  XCircle,
  ExternalLink,
  FileText,
  ScanLine,
  Eye,
  Radar,
  FileSearch,
  Key,
  Coins,
  ArrowRight,
  Sparkles,
  Loader2,
  GitBranch,
  BookOpen,
  ChevronDown
} from "lucide-react";

interface AuditResult {
  report_id: string;
  security_score: number;
  vulnerabilities_count: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  info_issues?: number;
  ssl_status: string;
  ssl_grade?: string;
  headers_score: number;
  vulnerabilities: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    owasp_category?: string;
    cwe_id?: string;
    ai_fix_steps?: string;
    ai_enhanced?: boolean;
    url?: string;
    affected_url?: string;
    cvss_score?: number;
  }>;
  certificate_number?: string;
  pdf_report_url?: string;
}

interface UserData {
  email: string;
  fullName?: string;
  name?: string;
  credits?: number | string;
  plan?: string;
  identityId?: string;
}

function SecurityAuditContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use subscription context for real-time credit sync
  const { credits: contextCredits, loading: subscriptionLoading, refreshSubscription, deductCredit, currentPlan, subscriptionStatus } = useSubscription();

  // Use session context for session refresh during audit
  const { refreshSession, isAuthenticated: sessionAuthenticated } = useSession();

  // No-credit dialog state
  const [showNoCreditDialog, setShowNoCreditDialog] = useState(false);

  const [protocol, setProtocol] = useState<'https://' | 'http://'>('https://');
  const [urlDomain, setUrlDomain] = useState(() => {
    const urlParam = searchParams.get('url') || '';
    // Strip protocol if present
    if (urlParam.startsWith('https://')) {
      return urlParam.slice(8);
    } else if (urlParam.startsWith('http://')) {
      return urlParam.slice(7);
    }
    return urlParam;
  });
  // Full URL = protocol + domain (trimmed to prevent whitespace issues)
  const url = (protocol + urlDomain).trim();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [issuesFound, setIssuesFound] = useState(0);
  const [auditItems, setAuditItems] = useState<AuditItemStatus[] | undefined>(undefined);
  const [currentAuditItem, setCurrentAuditItem] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Elapsed time tracking for background audit option
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(900); // Default 15 minutes (900 seconds)
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const etaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Region routing info (v5.0.0)
  const [scanRegion, setScanRegion] = useState<string | undefined>();
  const [regionName, setRegionName] = useState<string | undefined>();
  const [staticIP, setStaticIP] = useState<string | undefined>();

  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const [showUrlWarning, setShowUrlWarning] = useState(false);
  const [urlValidationResult, setUrlValidationResult] = useState<{
    status_code: number | null;
    status_text: string | null;
    is_error_page: boolean;
    error_type: string | null;
    error_message: string | null;
    response_time_ms: number | null;
    ssl_valid: boolean | null;
    server: string | null;
  } | null>(null);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [validationStep, setValidationStep] = useState<'idle' | 'recaptcha' | 'checking_url' | 'checking_ssl' | 'checking_server' | 'complete'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; city?: string; country?: string } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const validationAbortControllerRef = useRef<AbortController | null>(null);

  // Manual verification fallback state
  const [showManualVerification, setShowManualVerification] = useState(false);
  const [manualVerificationChallenge, setManualVerificationChallenge] = useState<{ num1: number; num2: number; answer: number } | null>(null);
  const [manualVerificationInput, setManualVerificationInput] = useState('');
  const [manualVerificationError, setManualVerificationError] = useState('');
  const [pendingRecaptchaToken, setPendingRecaptchaToken] = useState<string | null>(null);

  // Track elapsed time and ETA countdown during scanning + refresh session to prevent logout
  useEffect(() => {
    if (isScanning) {
      setElapsedSeconds(0);
      setEtaSeconds(900); // Reset to 15 minutes on new scan

      // Elapsed time counter (counts up)
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

      // ETA countdown timer (counts down, stops at 0)
      etaTimerRef.current = setInterval(() => {
        setEtaSeconds(prev => Math.max(0, prev - 1));
      }, 1000);

      // CRITICAL: Refresh session every 5 minutes during audit to prevent logout
      // User is actively watching audit progress, so session should stay alive
      const sessionRefreshInterval = setInterval(() => {
        refreshSession();
      }, 5 * 60 * 1000); // Every 5 minutes

      // Immediately refresh session when scan starts
      refreshSession();

      return () => {
        clearInterval(sessionRefreshInterval);
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
        if (etaTimerRef.current) {
          clearInterval(etaTimerRef.current);
          etaTimerRef.current = null;
        }
      };
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      if (etaTimerRef.current) {
        clearInterval(etaTimerRef.current);
        etaTimerRef.current = null;
      }
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      if (etaTimerRef.current) {
        clearInterval(etaTimerRef.current);
      }
    };
  }, [isScanning, refreshSession]);

  // Cleanup validation abort controller on unmount
  useEffect(() => {
    return () => {
      if (validationAbortControllerRef.current) {
        validationAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Update ETA based on progress (more accurate estimation)
  useEffect(() => {
    if (isScanning && scanProgress > 0) {
      // Calculate remaining time based on progress
      // If we're at X% after Y seconds, estimate total time and remaining
      const progressRate = scanProgress / Math.max(elapsedSeconds, 1); // % per second
      if (progressRate > 0) {
        const estimatedRemaining = Math.ceil((100 - scanProgress) / progressRate);
        // Don't increase ETA, only decrease (cap at current ETA or 15 mins)
        setEtaSeconds(prev => Math.min(prev, Math.max(30, estimatedRemaining)));
      }
    }
  }, [isScanning, scanProgress, elapsedSeconds]);

  // Format ETA for display
  const formatEtaDisplay = (seconds: number): string => {
    if (seconds <= 0) return 'Finishing up...';
    if (seconds < 60) return `${seconds}s remaining`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 15) return '~15 min remaining';
    return secs > 0 ? `${mins}m ${secs}s remaining` : `${mins} min remaining`;
  };

  // Clear any stale audit-related session/cache data
  const clearAuditCache = useCallback(() => {
    // Clear any in-progress audit markers
    sessionStorage.removeItem('audit_in_progress');
    sessionStorage.removeItem('current_audit_report_id');
    // Reset component state
    setCurrentReportId(null);
    setScanProgress(0);
    setScanStatus('');
    setElapsedSeconds(0);
    setIssuesFound(0);
    setAuditItems(undefined);
    setCurrentAuditItem(0);
  }, []);

  // Handle running audit in background
  const handleRunInBackground = useCallback(() => {
    if (currentReportId) {
      // Close the popup and show a toast
      setShowPopup(false);
      setIsScanning(false);
      setScanProgress(0);

      toast({
        title: "Audit Running in Background",
        description: "You can check the results from your Dashboard once the audit completes. We'll also send you an email notification."
      });

      // Store background audit info in sessionStorage for Dashboard to pick up
      // CRITICAL: Pass EXACT values to maintain consistency and user trust
      // The progress shown here MUST match what Dashboard displays
      const backgroundAudit = {
        reportId: currentReportId,
        url: url,
        status: 'In Progress',
        // Use exact progress value - this maintains consistency across views
        progressPercent: scanProgress,
        currentStage: 'processing',
        // Use exact status text from the scan - never override with generic text
        stageDescription: scanStatus,
        createdAt: new Date().toISOString(),
        // Pass ETA for consistent time estimates
        etaSeconds: etaSeconds,
        // Pass elapsed time for accurate tracking
        elapsedSeconds: elapsedSeconds
      };
      sessionStorage.setItem('background_audit', JSON.stringify(backgroundAudit));

      // Navigate to dashboard with state
      navigate('/dashboard', {
        state: { backgroundAudit: backgroundAudit }
      });
    }
  }, [currentReportId, url, scanProgress, scanStatus, navigate, toast, etaSeconds, elapsedSeconds]);

  // Request location permission on mount for logged-in users
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    let cleanup: (() => void) | null = null;

    if (isAuthenticated && 'geolocation' in navigator) {
      // Check permission status if available
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          permissionStatus = result;
          setLocationPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
          if (result.state === 'granted') {
            requestLocation();
          }
          // Listen for permission changes
          const handleChange = () => {
            setLocationPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
            if (result.state === 'granted') {
              requestLocation();
            }
          };
          result.addEventListener('change', handleChange);
          cleanup = () => result.removeEventListener('change', handleChange);
        });
      } else {
        // Permissions API not available, try to get location directly
        requestLocation();
      }
    } else if (!('geolocation' in navigator)) {
      setLocationPermissionStatus('unavailable');
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [isAuthenticated]);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationPermissionStatus('granted');
      },
      (error) => {
        logger.log('Location access denied or unavailable:', error.message);
        setLocationPermissionStatus('denied');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  // Rotate slogans during scanning
  useEffect(() => {
    if (isScanning) {
      const sloganCount = SECURITY_SLOGANS.length;
      const interval = setInterval(() => {
        setSloganIndex((prev) => (prev + 1) % sloganCount);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  // Add beforeunload warning during audit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isScanning) {
        e.preventDefault();
        e.returnValue = 'Security audit is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isScanning]);

  // Load reCAPTCHA Enterprise script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_CONFIG.SITE_KEY}`;
    script.async = true;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(`script[src*="recaptcha/enterprise.js"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Cleanup on unmount - clear any stale audit state
  useEffect(() => {
    return () => {
      // Clear any in-progress markers on unmount
      sessionStorage.removeItem('audit_in_progress');
      sessionStorage.removeItem('current_audit_report_id');
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    let mounted = true;

    const checkAuth = () => {
      try {
        window.scrollTo(0, 0);

        // Check auth inline to avoid dependency issues
        const userStr = localStorage.getItem("currentUser");
        if (userStr) {
          try {
            const user = JSON.parse(userStr) as UserData;
            if (mounted) {
              setIsAuthenticated(true);
              setCurrentUser(user);
            }
          } catch {
            if (mounted) setIsAuthenticated(false);
          }
        } else {
          if (mounted) setIsAuthenticated(false);
        }
      } catch (error) {
        logger.error('Auth check error:', error);
        if (mounted) setIsAuthenticated(false);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    // Run auth check
    checkAuth();

    // Safety timeout - ensure loading state clears even if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        logger.warn('Auth check timed out, clearing loading state');
        setCheckingAuth(false);
      }
    }, 3000); // 3 second safety timeout

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Auto-focus URL input when page loads and auth is checked
  useEffect(() => {
    if (!checkingAuth && isAuthenticated && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [checkingAuth, isAuthenticated]);

  // Execute reCAPTCHA Enterprise verification
  const executeRecaptcha = useCallback(async (): Promise<string | null> => {
    if (!recaptchaLoaded || !window.grecaptcha?.enterprise) {
      toast({
        variant: "destructive",
        title: "Verification Error",
        description: "Human verification is loading. Please try again in a moment."
      });
      return null;
    }

    try {
      return new Promise((resolve) => {
        window.grecaptcha.enterprise.ready(async () => {
          try {
            const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_CONFIG.SITE_KEY, {
              action: 'SECURITY_AUDIT'
            });
            resolve(token);
          } catch (error) {
            logger.error('reCAPTCHA execute error:', error);
            resolve(null);
          }
        });
      });
    } catch (error) {
      logger.error('reCAPTCHA error:', error);
      return null;
    }
  }, [recaptchaLoaded, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign in to perform security audits."
      });
      navigate('/login');
      return;
    }

    // CRITICAL FIX: Wait for subscription data to load before checking credits
    if (subscriptionLoading) {
      // Refresh subscription data and wait for it
      await refreshSubscription();
      // Small delay to ensure state update propagates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // =====================================================
    // CREDIT VALIDATION - SINGLE CHECK AT START ONLY
    // This is the ONLY place where credits are checked.
    // Once validated, the audit will complete even if
    // credits go to 0 or negative during the process.
    // =====================================================
    if (!subscriptionLoading && typeof contextCredits === 'number' && contextCredits < 1) {
      // Show no-credit dialog with 3 options instead of navigating away
      setShowNoCreditDialog(true);
      return;
    }

    // =====================================================
    // CREDIT DEDUCTION - IMMEDIATELY AFTER VALIDATION
    // Deduct credit NOW, before any other operations.
    // This ensures credit is used even if audit fails later.
    // =====================================================
    const deductResult = await deductCredit();
    if (!deductResult) {
      // Rare edge case: credit check passed but deduction failed
      // This shouldn't happen normally, but handle gracefully
      logger.warn('Credit deduction failed after validation - proceeding anyway');
    }

    // Request location if not yet granted (prompt user)
    if (locationPermissionStatus === 'prompt' && 'geolocation' in navigator) {
      requestLocation();
    }

    // Show legal consent dialog before proceeding
    setShowLegalConsent(true);
  };

  const handleLegalConsentAccept = async () => {
    setShowLegalConsent(false);

    // Abort any ongoing validation
    if (validationAbortControllerRef.current) {
      validationAbortControllerRef.current.abort();
    }

    // Create new abort controller for this validation
    validationAbortControllerRef.current = new AbortController();
    const signal = validationAbortControllerRef.current.signal;

    // Start validation process with progress tracking
    setIsValidatingUrl(true);
    setValidationStep('recaptcha');
    setValidationMessage('Verifying you are human...');

    try {
      // Execute reCAPTCHA Enterprise verification
      const recaptchaToken = await executeRecaptcha();
      if (!recaptchaToken) {
        setIsValidatingUrl(false);
        setValidationStep('idle');
        setValidationMessage('');
        toast({
          variant: "destructive",
          title: "Human Verification Failed",
          description: "Unable to verify you're human. Please refresh and try again."
        });
        return;
      }

      // Check if aborted
      if (signal.aborted) {
        logger.log('URL validation aborted');
        return;
      }

      // Step 2: Check URL accessibility
      setValidationStep('checking_url');
      setValidationMessage('Checking URL accessibility...');
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for UX

      // Check if aborted
      if (signal.aborted) {
        logger.log('URL validation aborted');
        return;
      }

      // Quick URL validation - simplified for performance
      setValidationStep('checking_server');
      setValidationMessage('Verifying server is reachable...');

      const validationResponse = await AivedhaAPI.validateUrl(url, 'ui', currentUser?.email);

      // Step 3: Check SSL (if validation returned SSL info)
      if (validationResponse.validation?.ssl_valid !== undefined) {
        setValidationStep('checking_ssl');
        setValidationMessage('Checking SSL certificate...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setValidationStep('complete');
      setValidationMessage('Validation complete! Starting audit...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsValidatingUrl(false);
      setValidationStep('idle');
      setValidationMessage('');

      if (!validationResponse.valid && validationResponse.validation?.is_error_page) {
        // URL returned an error page - show warning dialog with clear message
        setUrlValidationResult(validationResponse.validation);
        setShowUrlWarning(true);
        return; // Wait for user decision
      }

      setValidationStep('complete');
      setValidationMessage('Validation complete! Starting audit...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setIsValidatingUrl(false);
      setValidationStep('idle');
      setValidationMessage('');

      // Validation passed or skipped - proceed with audit
      await proceedWithAudit(recaptchaToken);
    } catch (error: unknown) {
      // Check if validation was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        logger.log('URL validation was cancelled');
        setIsValidatingUrl(false);
        setValidationStep('idle');
        setValidationMessage('');
        return;
      }

      // Validation failed - provide user-friendly message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.warn('URL validation failed, proceeding with audit:', errorMessage);

      setValidationStep('complete');
      setValidationMessage('Proceeding to audit...');
      await new Promise(resolve => setTimeout(resolve, 200));

      setIsValidatingUrl(false);
      setValidationStep('idle');
      setValidationMessage('');

      // Proceed with audit despite validation failure
      await proceedWithAudit(recaptchaToken);
    }
  };

  // Handler for when user decides to proceed despite URL warning
  const handleUrlWarningProceed = async () => {
    setShowUrlWarning(false);
    setUrlValidationResult(null);

    // Re-execute reCAPTCHA since time may have passed
    const recaptchaToken = await executeRecaptcha();
    if (!recaptchaToken) {
      toast({
        variant: "destructive",
        title: "Human Verification Failed",
        description: "Unable to verify you're human. Please refresh and try again."
      });
      return;
    }

    await proceedWithAudit(recaptchaToken);
  };

  // Handler for when user cancels due to URL warning
  const handleUrlWarningCancel = () => {
    setShowUrlWarning(false);
    setUrlValidationResult(null);
    toast({
      title: "Audit Cancelled",
      description: "The security audit was cancelled. Please verify the URL is correct and try again."
    });
  };

  // Generate manual verification challenge using utility
  const generateManualChallenge = useCallback(() => {
    return generateMathChallenge();
  }, []);

  // State to trigger bypass verification
  const [triggerBypassVerification, setTriggerBypassVerification] = useState(false);

  // Handle manual verification submission
  const handleManualVerificationSubmit = useCallback(() => {
    if (!manualVerificationChallenge) return;

    const userAnswer = parseInt(manualVerificationInput, 10);
    if (userAnswer === manualVerificationChallenge.answer) {
      // Manual verification passed - trigger bypass verification
      setShowManualVerification(false);
      setManualVerificationError('');
      setManualVerificationInput('');
      setTriggerBypassVerification(true);
    } else {
      setManualVerificationError('Incorrect answer. Please try again.');
      // Generate new challenge
      setManualVerificationChallenge(generateManualChallenge());
      setManualVerificationInput('');
    }
  }, [manualVerificationChallenge, manualVerificationInput, generateManualChallenge]);

  // Effect to trigger bypass verification after manual check passes
  useEffect(() => {
    if (triggerBypassVerification && pendingRecaptchaToken) {
      setTriggerBypassVerification(false);
      proceedWithAuditBypassVerification(pendingRecaptchaToken);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerBypassVerification, pendingRecaptchaToken]);

  // Proceed with audit bypassing automated verification (after manual check passed)
  const proceedWithAuditBypassVerification = async (recaptchaToken: string) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus("Manual verification passed. Starting audit...");
    setShowResults(false);
    setAuditResult(null);
    setShowPopup(true);

    try {
      // Skip reCAPTCHA verification since manual check passed
      setScanProgress(5);

      // Start the audit - this will deduct credits on the backend
      setScanStatus("Connecting to security scanner...");
      setScanProgress(10);

      // Collect audit metadata for logging
      const auditMetadata = {
        userLocation: userLocation,
        locationPermissionStatus: locationPermissionStatus,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || 'unknown',
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
        consentAccepted: true,
        recaptchaVerified: false, // Manually verified
        manuallyVerified: true,
      };

      const startResponse = await AivedhaAPI.startAudit({
        url: url,
        userId: currentUser?.email || 'anonymous',
        userEmail: currentUser?.email || '',
        userName: currentUser?.fullName || currentUser?.name || '',
        auditMetadata: { ...auditMetadata, userLocation: auditMetadata.userLocation || undefined },
      });

      // Track audit started in analytics
      trackAuditStarted(url);

      if (!startResponse.success || !startResponse.report_id) {
        throw new Error(startResponse.error || 'Failed to start audit');
      }

      setCurrentReportId(startResponse.report_id);

      // Extract and set region info from response (v5.0.0)
      if (startResponse.scanRegion) {
        setScanRegion(startResponse.scanRegion);
        setRegionName(startResponse.regionName || (startResponse.scanRegion === 'ap-south-1' ? 'India' : 'USA'));
        setStaticIP(startResponse.staticIP);
      }

      // NOTE: Credit already deducted at handleSubmit (button click)
      // Just refresh to show updated balance
      refreshSubscription();

      setScanProgress(15);
      setScanStatus("Audit initiated...");

      // Poll for audit completion
      let finalResponse = startResponse;
      if (startResponse.status === 'processing') {
        setScanStatus("Security scan in progress...");
        let maxProgress = 15;

        finalResponse = await AivedhaAPI.pollAuditStatus(
          startResponse.report_id,
          (progress, stage, stageDescription, vulnCount, items, currentItem) => {
            if (vulnCount !== undefined && vulnCount > 0) {
              setIssuesFound(vulnCount);
            }
            if (progress > maxProgress) {
              maxProgress = progress;
            }
            setScanProgress(Math.min(95, maxProgress));
            setScanStatus(stageDescription || `${stage}...`);
            // Per-item tracking from Lambda (v6.0.0)
            if (items) {
              setAuditItems(items);
            }
            if (currentItem !== undefined) {
              setCurrentAuditItem(currentItem);
            }
          },
          3600000
        );

        if (finalResponse.status === 'failed') {
          throw new Error(finalResponse.message || 'Security audit failed');
        }
      }

      setScanProgress(100);
      setScanStatus("Audit complete!");
      await new Promise(resolve => setTimeout(resolve, 300));

      // Navigate to results
      setIsScanning(false);
      setShowPopup(false);

      navigate('/audit-results', {
        state: {
          auditResult: finalResponse,
          url: url
        }
      });

    } catch (error: unknown) {
      setIsScanning(false);
      setScanProgress(0);
      toast({
        variant: "destructive",
        title: "Audit Failed",
        description: getErrorMessage(error) || "Failed to complete security audit. Please try again."
      });
    }
  };

  // Proceed with the actual audit
  const proceedWithAudit = async (recaptchaToken: string) => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus("Verifying human...");
    setShowResults(false);
    setAuditResult(null);
    setShowPopup(true);

    try {
      // Verify reCAPTCHA token with backend
      setScanProgress(5);
      const verifyResult = await AivedhaAPI.verifyRecaptcha(recaptchaToken);

      if (!verifyResult.success) {
        // Show manual verification fallback instead of failing
        setIsScanning(false);
        setShowPopup(false);
        setPendingRecaptchaToken(recaptchaToken);
        setManualVerificationChallenge(generateManualChallenge());
        setManualVerificationInput('');
        setManualVerificationError('');
        setShowManualVerification(true);

        toast({
          title: "Additional Verification Required",
          description: "Please complete the simple challenge below to verify you're human.",
        });
        return;
      }

      // Start the audit - this will deduct credits on the backend
      setScanStatus("Connecting to security scanner...");
      setScanProgress(10);

      // Collect audit metadata for logging
      const auditMetadata = {
        userLocation: userLocation,
        locationPermissionStatus: locationPermissionStatus,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || 'unknown',
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
        consentAccepted: true,
        recaptchaVerified: true,
      };

      const startResponse = await AivedhaAPI.startAudit({
        url: url,
        userId: currentUser?.email || 'anonymous',
        userEmail: currentUser?.email || '',
        userName: currentUser?.fullName || currentUser?.name || '',
        auditMetadata: { ...auditMetadata, userLocation: auditMetadata.userLocation || undefined },
      });

      // Track audit started in analytics
      trackAuditStarted(url);

      // Validate response - add null safety checks
      if (!startResponse || (!startResponse.report_id && !startResponse.reportId)) {
        throw new Error(startResponse?.error || startResponse?.message || 'Failed to start audit - no report ID received');
      }

      // Handle both snake_case and camelCase field names
      const reportId = startResponse.report_id || startResponse.reportId || '';
      setCurrentReportId(reportId || null); // Store report ID for background audit option

      // Extract and set region info from response (v5.0.0)
      if (startResponse.scanRegion) {
        setScanRegion(startResponse.scanRegion);
        setRegionName(startResponse.regionName || (startResponse.scanRegion === 'ap-south-1' ? 'India' : 'USA'));
        setStaticIP(startResponse.staticIP);
      }

      let finalResponse = startResponse;

      // Check if the audit is running asynchronously (status='processing')
      // If so, poll for completion. Otherwise use the immediate response.
      if (startResponse.status === 'processing') {
        // Audit is running in background - poll for results
        setScanStatus("Security scan in progress...");
        setScanProgress(15);

        // Poll for audit completion with real-time progress updates
        // NOTE: No frontend timeout - backend handles timing and graceful completion
        // User can choose to run in background after 60 seconds
        let lastProgress = 15;
        let maxProgress = 15; // Start at 15% (matches initial display) - never go backwards
        let stuckCount = 0;

        finalResponse = await AivedhaAPI.pollAuditStatus(
          reportId || '',
          (progress, stage, stageDescription, vulnCount, items, currentItem) => {
            // Update issues found count
            if (vulnCount !== undefined && vulnCount > 0) {
              setIssuesFound(vulnCount);
            }
            // CRITICAL: Ensure progress NEVER decreases (monotonically increasing)
            // This prevents confusing UX where progress bar jumps backwards
            if (progress < maxProgress) {
              progress = maxProgress;
            } else {
              maxProgress = progress;
            }

            // Detect if progress is stuck
            if (progress === lastProgress) {
              stuckCount++;
              // If stuck for more than 15 polls (30 seconds), simulate slight progress
              if (stuckCount > 15 && progress < 90) {
                progress = Math.min(90, progress + 1);
                maxProgress = progress;
              }
            } else {
              stuckCount = 0;
              lastProgress = progress;
            }

            // Update UI with real progress from backend (direct percentage, no remapping)
            setScanProgress(Math.min(95, progress));

            // Per-item tracking from Lambda (v6.0.0)
            if (items) {
              setAuditItems(items);
            }
            if (currentItem !== undefined) {
              setCurrentAuditItem(currentItem);
            }

            // Use stageDescription from backend directly if available
            // This provides accurate real-time status from the actual scan process
            if (stageDescription) {
              setScanStatus(stageDescription);
            } else {
              // Fallback mapping for backwards compatibility
              const statusMessages: Record<string, string> = {
                'processing': 'Analyzing website security...',
                'initialization': 'Initializing security scan...',
                'validating_target': 'Validating target URL...',
                'dns_resolution': 'Analyzing DNS security...',
                'ssl_analysis': 'Analyzing SSL/TLS configuration...',
                'crawling': 'Discovering pages & endpoints...',
                'header_analysis': 'Evaluating security headers...',
                'cookie_analysis': 'Auditing cookie security...',
                'form_analysis': 'Scanning form security...',
                'javascript_analysis': 'Analyzing JavaScript...',
                'sensitive_files': 'Scanning for sensitive files...',
                'api_discovery': 'Discovering API endpoints...',
                'vulnerability_detection': 'Running vulnerability checks...',
                'ai_analysis': 'AI analyzing all findings...',
                'completed': 'Audit complete!',
                'failed': 'Audit failed'
              };
              setScanStatus(statusMessages[stage] || `${stage}...`);
            }
          },
          3600000 // 1 hour max wait - no artificial limits on comprehensive security audits
        );

        if (finalResponse.status === 'failed') {
          throw new Error(finalResponse.message || 'Security audit failed');
        }
      } else {
        // Synchronous response - show quick progress animation
        const progressSteps = [
          { progress: 20, status: "Analyzing SSL/TLS configuration...", delay: 200 },
          { progress: 40, status: "Checking security headers...", delay: 200 },
          { progress: 60, status: "Scanning for vulnerabilities...", delay: 200 },
          { progress: 80, status: "Assessing OWASP compliance...", delay: 200 },
          { progress: 95, status: "Generating security report...", delay: 200 },
        ];

        for (const step of progressSteps) {
          setScanProgress(step.progress);
          setScanStatus(step.status);
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
      }

      // Final progress
      setScanProgress(100);
      setScanStatus("Audit complete!");
      await new Promise(resolve => setTimeout(resolve, 300));

      // Refresh subscription context to sync credits from backend
      if (finalResponse.credit_used || startResponse.status === 'processing') {
        await refreshSubscription();
      }

      // Pass the COMPLETE API response to AuditResults - ALL fields matter
      const result = {
        // Core identifiers
        report_id: finalResponse.report_id || reportId,
        url: finalResponse.url || url,
        status: finalResponse.status,
        created_at: finalResponse.created_at,
        scan_timestamp: finalResponse.created_at || new Date().toISOString(),

        // Security scores
        security_score: finalResponse.security_score || 0,
        grade: finalResponse.grade || 'F',

        // Issue counts - ALL severity levels
        vulnerabilities_count: finalResponse.vulnerabilities_count || 0,
        critical_issues: finalResponse.critical_issues || 0,
        high_issues: finalResponse.high_issues || 0,
        medium_issues: finalResponse.medium_issues || 0,
        low_issues: finalResponse.low_issues || 0,
        info_issues: finalResponse.info_issues || 0,

        // SSL/TLS Analysis
        ssl_status: finalResponse.ssl_status || 'Unknown',
        ssl_grade: finalResponse.ssl_grade,
        ssl_valid: finalResponse.ssl_valid,
        ssl_info: finalResponse.ssl_info,

        // Security Headers
        headers_score: finalResponse.headers_score || 0,
        security_headers: finalResponse.security_headers,

        // DNS Security
        dns_security: finalResponse.dns_security,

        // Technology Detection
        technology_stack: finalResponse.technology_stack,

        // Sensitive Files
        sensitive_files: finalResponse.sensitive_files,
        sensitive_files_found: finalResponse.sensitive_files_found,

        // Content Analysis
        content_analysis: finalResponse.content_analysis,

        // Vulnerabilities with AI recommendations
        vulnerabilities: finalResponse.vulnerabilities || [],

        // Report & Certificate
        certificate_number: finalResponse.certificate_number,
        pdf_report_url: finalResponse.pdf_report_url,

        // Scan metadata
        scan_version: finalResponse.scan_version,
        scan_depth: finalResponse.scan_depth,

        // Augmentation data (if available)
        attackChains: finalResponse.attackChains,
        aggregationStats: finalResponse.aggregationStats,
        augmentationMode: finalResponse.augmentationMode,

        // Credits
        credit_used: finalResponse.credit_used,
        credits_remaining: finalResponse.credits_remaining
      };

      setIsScanning(false);
      setShowPopup(false);

      // Send audit completion email notification
      if (currentUser?.email) {
        try {
          await AivedhaAPI.sendAuditCompletionEmail({
            email: currentUser.email,
            fullName: currentUser.fullName || currentUser.name || 'User',
            auditUrl: url,
            securityScore: result.security_score,
            criticalIssues: result.critical_issues,
            mediumIssues: result.medium_issues,
            lowIssues: result.low_issues,
            reportId: result.report_id || '',
            certificateNumber: result.certificate_number,
            pdfUrl: result.pdf_report_url,
          });
          logger.log('Audit completion email sent successfully');
        } catch (emailError) {
          // Don't block the user experience if email fails
          logger.error('Failed to send audit completion email:', emailError);
        }
      }

      // Track audit completion in analytics
      trackAuditCompleted({
        reportId: result.reportId || result.report_id || '',
        url: url,
        score: result.score,
        grade: result.grade,
        vulnerabilitiesFound: result.vulnerabilities?.length || 0,
      });

      toast({
        title: "Audit Complete",
        description: `Security audit for ${url} completed successfully.`
      });

      // Navigate to results page with audit data
      navigate('/audit-results', {
        state: {
          auditResult: result,
          url: url
        }
      });

    } catch (error: unknown) {
      setIsScanning(false);
      setScanProgress(0);
      setShowPopup(false);

      // Extract error message safely
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Provide comprehensive user-friendly error messages
      let errorTitle = "Audit Failed";
      let errorDescription = "An unexpected error occurred. Please try again.";

      // Credit-related errors
      if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('insufficient')) {
        errorTitle = "Insufficient Credits";
        errorDescription = "You don't have enough credits to run an audit. Please upgrade your plan or purchase additional credits.";
      }
      // Verification errors
      else if (errorMsg.toLowerCase().includes('human verification') || errorMsg.toLowerCase().includes('verification failed') || errorMsg.toLowerCase().includes('recaptcha')) {
        errorTitle = "Verification Failed";
        errorDescription = "Human verification failed. Please refresh the page and try again. If the issue persists, try disabling your VPN or ad blocker.";
      }
      // Network/connection errors
      else if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch') || errorMsg.toLowerCase().includes('connection') || errorMsg.toLowerCase().includes('timeout')) {
        errorTitle = "Connection Error";
        errorDescription = "Unable to connect to the audit service. Please check your internet connection and try again.";
      }
      // URL-related errors
      else if (errorMsg.toLowerCase().includes('url') || errorMsg.toLowerCase().includes('unreachable') || errorMsg.toLowerCase().includes('dns')) {
        errorTitle = "URL Not Accessible";
        errorDescription = "The website could not be reached. Please verify the URL is correct and the website is online.";
      }
      // SSL/TLS errors
      else if (errorMsg.toLowerCase().includes('ssl') || errorMsg.toLowerCase().includes('certificate') || errorMsg.toLowerCase().includes('tls')) {
        errorTitle = "SSL Certificate Issue";
        errorDescription = "There was a problem with the website's SSL certificate. The audit may still work - please try again.";
      }
      // Server errors
      else if (errorMsg.toLowerCase().includes('500') || errorMsg.toLowerCase().includes('server error') || errorMsg.toLowerCase().includes('internal')) {
        errorTitle = "Server Error";
        errorDescription = "Our servers are experiencing issues. Please try again in a few moments.";
      }
      // Rate limiting
      else if (errorMsg.toLowerCase().includes('rate') || errorMsg.toLowerCase().includes('too many') || errorMsg.toLowerCase().includes('429')) {
        errorTitle = "Too Many Requests";
        errorDescription = "You've made too many requests. Please wait a minute before trying again.";
      }
      // Authentication errors
      else if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('401') || errorMsg.toLowerCase().includes('auth')) {
        errorTitle = "Session Expired";
        errorDescription = "Your session has expired. Please refresh the page and sign in again.";
      }
      // Audit-specific failures
      else if (errorMsg.toLowerCase().includes('failed') || errorMsg.toLowerCase().includes('error')) {
        errorTitle = "Audit Failed";
        errorDescription = errorMsg.length > 150 ? "The security audit encountered an error. Please try again." : errorMsg;
      }
      // Default: show the actual error if it's short and helpful
      else if (errorMsg.length < 100 && errorMsg.length > 0) {
        errorDescription = errorMsg;
      }

      // Track audit failure in analytics
      trackAuditFailed(url, errorMsg);

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDescription
      });

      // Log the full error for debugging (only in dev mode)
      logger.error('Audit error:', error);
    }
  };

  const validateUrl = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
    } catch {
      return false;
    }
  };

  const isValidUrl = urlDomain ? validateUrl(url) : true;

  // Handle URL input change with auto-protocol detection
  const handleUrlChange = (value: string) => {
    // Trim whitespace to prevent "URL can't contain control characters" error
    const trimmedValue = value.trim();

    // Check if user pasted a full URL with protocol
    if (trimmedValue.startsWith('https://')) {
      setProtocol('https://');
      setUrlDomain(trimmedValue.slice(8).trim());
    } else if (trimmedValue.startsWith('http://')) {
      setProtocol('http://');
      setUrlDomain(trimmedValue.slice(7).trim());
    } else {
      // Remove any accidental protocol prefix and whitespace
      const cleanValue = trimmedValue.replace(/^(https?:\/\/)+/i, '').trim();
      setUrlDomain(cleanValue);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    if (score >= 4) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return "bg-green-500/10 border-green-500/20";
    if (score >= 6) return "bg-yellow-500/10 border-yellow-500/20";
    if (score >= 4) return "bg-orange-500/10 border-orange-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'HIGH': return "bg-red-500/10 text-red-500 border-red-500/20";
      case 'MEDIUM': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case 'LOW': return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // Loading state
  if (checkingAuth) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
            <p className="text-xs text-muted-foreground/50 mt-2">v2.7.0</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-8 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="rounded-3xl border-2 border-yellow-500/30 shadow-elegant">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LogIn className="h-8 w-8 text-yellow-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Login Required
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Please sign in to perform security audits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-500/10 border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription>
                    Security audits require authentication to track your credits and save reports to your account.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Link to="/login" className="block">
                    <Button variant="invertPrimary" className="h-12 rounded-xl">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Continue
                    </Button>
                  </Link>

                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-primary hover:underline">
                      Create one for free
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const handleNewAudit = () => {
    setShowPopup(false);
    setShowResults(false);
    setAuditResult(null);
    setUrlDomain("");
    setProtocol('https://');
  };

  const handleClosePopup = () => {
    if (!isScanning) {
      setShowPopup(false);
      if (auditResult) {
        navigate('/dashboard');
      }
    } else {
      // User is force-closing during scan - clean up
      clearAuditCache();
      setIsScanning(false);
      setShowPopup(false);
    }
  };

  return (
    <Layout>
      {/* Legal Consent Dialog */}
      <LegalConsentDialog
        isOpen={showLegalConsent}
        onClose={() => setShowLegalConsent(false)}
        onAccept={handleLegalConsentAccept}
        url={url}
      />

      {/* URL Validation Warning Dialog */}
      <UrlValidationWarningDialog
        open={showUrlWarning}
        onOpenChange={setShowUrlWarning}
        url={url}
        validationResult={urlValidationResult}
        onProceed={handleUrlWarningProceed}
        onCancel={handleUrlWarningCancel}
      />

      {/* URL Validation Progress Overlay */}
      {isValidatingUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-2 border-primary/30 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <CardContent className="pt-8 pb-6 px-6">
              {/* Animated icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center animate-pulse">
                    {validationStep === 'recaptcha' && (
                      <Shield className="w-10 h-10 text-primary animate-bounce" />
                    )}
                    {validationStep === 'checking_url' && (
                      <Globe className="w-10 h-10 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} />
                    )}
                    {validationStep === 'checking_server' && (
                      <Radar className="w-10 h-10 text-cyan-500 animate-ping" style={{ animationDuration: '1.5s' }} />
                    )}
                    {validationStep === 'checking_ssl' && (
                      <Lock className="w-10 h-10 text-green-500 animate-pulse" />
                    )}
                    {validationStep === 'complete' && (
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    )}
                  </div>
                  {/* Rotating ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" style={{ animationDuration: '1s' }} />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-center text-foreground mb-2">
                Preparing Security Audit
              </h3>

              {/* URL being validated */}
              <div className="bg-muted/50 rounded-lg px-4 py-2 mb-4">
                <p className="text-sm text-muted-foreground text-center truncate font-mono">{url}</p>
              </div>

              {/* Current step message */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">{validationMessage}</span>
              </div>

              {/* Progress steps */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    validationStep === 'recaptcha' ? 'bg-primary text-primary-foreground animate-pulse' :
                    ['checking_url', 'checking_server', 'checking_ssl', 'complete'].includes(validationStep) ? 'bg-green-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {['checking_url', 'checking_server', 'checking_ssl', 'complete'].includes(validationStep) ? '✓' : '1'}
                  </div>
                  <span className="text-sm text-foreground">Human verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    validationStep === 'checking_url' || validationStep === 'checking_server' ? 'bg-primary text-primary-foreground animate-pulse' :
                    ['checking_ssl', 'complete'].includes(validationStep) ? 'bg-green-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {['checking_ssl', 'complete'].includes(validationStep) ? '✓' : '2'}
                  </div>
                  <span className="text-sm text-foreground">URL & server validation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    validationStep === 'checking_ssl' ? 'bg-primary text-primary-foreground animate-pulse' :
                    validationStep === 'complete' ? 'bg-green-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {validationStep === 'complete' ? '✓' : '3'}
                  </div>
                  <span className="text-sm text-foreground">SSL certificate check</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    validationStep === 'complete' ? 'bg-green-500 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {validationStep === 'complete' ? '✓' : '4'}
                  </div>
                  <span className="text-sm text-foreground">Start security audit</span>
                </div>
              </div>

              {/* Info message */}
              <p className="text-xs text-center text-muted-foreground mt-6">
                Audit will start automatically after validation completes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Credit Dialog - Smart purchase options */}
      <Dialog open={showNoCreditDialog} onOpenChange={setShowNoCreditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
            <DialogTitle className="text-xl font-bold">No Credits Available</DialogTitle>
            <DialogDescription className="text-center">
              You need at least 1 credit to run a security audit.
              <br />
              <span className="text-primary font-medium">Choose an option below to continue:</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Option 1: Quick Buy - Show for paid users who aren't on free plan */}
            {currentPlan && !currentPlan.includes('free') && (
              <Button
                onClick={() => {
                  setShowNoCreditDialog(false);
                  navigate('/purchase?type=credits&pack=credits-25&quantity=1&currency=USD');
                }}
                className="h-auto py-4 border-2 border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:bg-transparent hover:from-transparent hover:to-transparent hover:text-amber-500 hover:border-amber-500 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Quick Buy 25 Credits</div>
                    <div className="text-sm opacity-90">$25 USD - Instant activation</div>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </div>
              </Button>
            )}

            {/* Option 1 Alt: For free users - Upgrade plan */}
            {(!currentPlan || currentPlan.includes('free')) && (
              <Button
                onClick={() => {
                  setShowNoCreditDialog(false);
                  navigate('/pricing');
                }}
                className="h-auto py-4 border-2 border-purple-500 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:bg-transparent hover:from-transparent hover:to-transparent hover:text-purple-500 hover:border-purple-500 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Upgrade Your Plan</div>
                    <div className="text-sm opacity-90">Starting at $25/month</div>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </div>
              </Button>
            )}

            {/* Option 2: Compare purchase options */}
            <Button
              variant="outline"
              onClick={() => {
                setShowNoCreditDialog(false);
                navigate('/pricing');
              }}
              className="h-auto py-4 border-2 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">Compare All Options</div>
                  <div className="text-sm text-muted-foreground">View plans & credit packs</div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </div>
            </Button>

            {/* Option 3: Stay here */}
            <Button
              variant="ghost"
              onClick={() => setShowNoCreditDialog(false)}
              className="h-auto py-3 text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Not now, I'll stay here</span>
              </div>
            </Button>
          </div>

          <DialogFooter className="text-center text-xs text-muted-foreground pt-2 border-t">
            Your entered URL is saved - you can continue after purchasing.
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Verification Dialog - Fallback when reCAPTCHA fails */}
      {showManualVerification && manualVerificationChallenge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-2 border-primary/30 shadow-2xl">
            <CardHeader className="text-center space-y-2 pb-2">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Quick Human Check</CardTitle>
              <CardDescription>
                Please solve this simple math problem to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Math Challenge */}
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-foreground">
                  {manualVerificationChallenge.num1} + {manualVerificationChallenge.num2} = ?
                </div>
                <Input
                  type="number"
                  value={manualVerificationInput}
                  onChange={(e) => setManualVerificationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualVerificationSubmit()}
                  placeholder="Enter your answer"
                  className="text-center text-2xl font-bold h-14"
                  autoFocus
                />
                {manualVerificationError && (
                  <p className="text-sm text-destructive">{manualVerificationError}</p>
                )}
              </div>

              {/* buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManualVerification(false);
                    setManualVerificationChallenge(null);
                    setPendingRecaptchaToken(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualVerificationSubmit}
                  className="bg-primary hover:bg-primary/90"
                  disabled={!manualVerificationInput.trim()}
                >
                  Verify & Continue
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-center text-muted-foreground">
                This helps us verify you're a real person. If you're having trouble, try disabling VPN or refreshing the page.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Popup */}
      <AuditPopup
        isOpen={showPopup}
        onClose={handleClosePopup}
        isScanning={isScanning}
        scanProgress={scanProgress}
        scanStatus={scanStatus}
        url={url}
        auditResult={auditResult}
        sloganIndex={sloganIndex}
        securitySlogans={SECURITY_SLOGANS}
        onNewAudit={handleNewAudit}
        onRunInBackground={handleRunInBackground}
        reportId={currentReportId || undefined}
        elapsedSeconds={elapsedSeconds}
        issuesFound={issuesFound}
        auditItems={auditItems}
        currentAuditItem={currentAuditItem}
        scanRegion={scanRegion}
        regionName={regionName}
        staticIP={staticIP}
        isPaidUser={subscriptionStatus === 'active' || contextCredits > 0}
      />

      <div className="min-h-screen bg-background pt-4 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Brand and Lock/Key Icons */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {/* Dark Key Icon */}
              <Key className="h-8 w-8 text-gray-700 dark:text-gray-300" />

              {/* Dark Lock Icon */}
              <Lock className="h-10 w-10 text-gray-800 dark:text-gray-200" />

              {/* Brand Name */}
              <div className="flex flex-col items-start ml-2">
                <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent font-orbitron">
                  AiVedha
                </span>
                <span className="text-lg font-bold tracking-widest text-muted-foreground font-orbitron">
                  GUARD
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-orbitron">Security Audit</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your website URL to perform a comprehensive security analysis.
              We'll scan for vulnerabilities, security misconfigurations, and provide actionable recommendations.
            </p>

            {/* ZooZoo Characters - Animated mascots */}
            <div className="mt-6">
              <ZooZooCharacters />
            </div>
          </div>

          {/* Audit Form - Clean UI */}
          <div className="mb-8 max-w-2xl mx-auto">
            <Card className="border-border/50 shadow-elegant rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-primary" />
                <span>Start Security Scan</span>
              </CardTitle>
              <CardDescription>
                Enter a valid URL to begin your security audit. Each scan uses 1 credit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium text-foreground flex items-center gap-1">
                    Website URL
                    <span className="relative group">
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs bg-foreground text-background rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
                        Enter full URL with http:// or https://
                      </span>
                    </span>
                  </Label>
                  {/* URL Input with Protocol Selector and Audit button - Same Row */}
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1 flex items-center">
                      {/* Protocol Selector Dropdown */}
                      <div className="absolute left-0 h-full z-10" style={{ width: '95px' }}>
                        <select
                          value={protocol}
                          onChange={(e) => setProtocol(e.target.value as 'https://' | 'http://')}
                          className="h-full w-full pl-3 pr-6 bg-muted/70 hover:bg-muted border-r border-border rounded-l-2xl text-sm font-semibold text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                          disabled={isScanning}
                        >
                          <option value="https://">https://</option>
                          <option value="http://">http://</option>
                        </select>
                        {/* Dropdown Arrow */}
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <Input
                        ref={urlInputRef}
                        id="url"
                        type="text"
                        value={urlDomain}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="example.com"
                        className={`pl-[105px] rounded-2xl h-12 text-base ${!isValidUrl ? 'border-destructive focus:border-destructive' : ''}`}
                        disabled={isScanning}
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-audit-now h-12 px-6 flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl"
                      disabled={isScanning || isValidatingUrl || !url || !isValidUrl || !recaptchaLoaded || (typeof contextCredits === 'number' && contextCredits < 1)}
                    >
                      {isValidatingUrl ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                          <span className="hidden sm:inline">Validating...</span>
                        </>
                      ) : isScanning ? (
                        <>
                          <Zap className="h-5 w-5 animate-spin flex-shrink-0" />
                          <span className="hidden sm:inline">Scanning...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 flex-shrink-0" />
                          <span className="hidden sm:inline font-semibold">AUDIT NOW</span>
                        </>
                      )}
                    </button>
                  </div>
                  {!isValidUrl && url && (
                    <p className="text-sm text-destructive">Please enter a valid URL (e.g., https://example.com)</p>
                  )}
                </div>

                <Alert className="border-primary/20 bg-primary/5 rounded-2xl">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Cost:</strong> 1 credit will be deducted for this audit.
                    You have <strong className="text-primary">{contextCredits}</strong> credits remaining.
                  </AlertDescription>
                </Alert>

                {/* Human Verification Notice - reCAPTCHA Enterprise runs invisibly */}
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  <span>Protected by reCAPTCHA Enterprise</span>
                </div>

                {typeof contextCredits === 'number' && contextCredits < 1 && (
                  <div className="text-center">
                    <Link to="/purchase">
                      <Button variant="outline">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Purchase Credits
                      </Button>
                    </Link>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
          </div>

          {/* GitHub CI/CD Automation CTA */}
          <div className="mb-8 max-w-2xl mx-auto">
            <Card className="border-border/50 shadow-elegant rounded-3xl bg-gradient-to-br from-gray-900/5 to-gray-800/5 dark:from-gray-800/20 dark:to-gray-900/30 overflow-hidden relative group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-6 relative">
                <div className="flex items-start gap-5">
                  {/* Animated Git Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <GitBranch className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                      Automate with GitHub Actions
                      <Badge variant="secondary" className="text-xs font-normal">CI/CD</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Run security audits automatically after every deployment. Zero manual effort, continuous protection for your applications.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Link to="/faq#cicd-integration">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-2 border-gray-700 dark:border-gray-500 hover:bg-gray-800 hover:text-white hover:border-gray-800 dark:hover:bg-gray-700 dark:hover:border-gray-600 transition-all duration-300 gap-2"
                        >
                          <BookOpen className="w-4 h-4" />
                          Setup Guide
                        </Button>
                      </Link>
                      <Link to="/profile#api-keys">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground gap-2"
                        >
                          <Key className="w-4 h-4" />
                          Create API Key
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Bottom decorative element */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </CardContent>
            </Card>
          </div>

          {/* Scanning indicator - shows live progress with stage details */}
          {isScanning && !showPopup && (
            <Card className="mb-8 border-border/50 rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-6 text-center">
                {/* Estimated Audit Timer - Stylish animated countdown */}
                <div className="mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 animate-pulse rounded-2xl" />
                  <div className="relative p-4 border border-primary/30 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 max-w-sm mx-auto shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    {/* Label */}
                    <p className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2 text-center">
                      Estimated Audit Timer
                    </p>

                    {/* Timer Display */}
                    <div className="flex items-center justify-center gap-1">
                      {/* Minutes */}
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-lg" />
                          <span className="relative text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            {Math.floor(etaSeconds / 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">min</span>
                      </div>

                      {/* Separator */}
                      <span className="text-3xl font-bold text-cyan-400 animate-pulse mx-1 -mt-4">:</span>

                      {/* Seconds */}
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-lg" />
                          <span className="relative text-4xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            {(etaSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">sec</span>
                      </div>
                    </div>

                    {/* Animated progress line at bottom */}
                    <div className="mt-3 h-0.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${(etaSeconds / 900) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Shield className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                  <div className="absolute -top-1 -right-1 left-0 right-0 mx-auto w-fit">
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                      {Math.round(scanProgress)}%
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{scanStatus || 'Security scan in progress...'}</h3>

                {/* Progress bar with percentage labels */}
                <div className="max-w-md mx-auto mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(scanProgress)}% complete</span>
                  </div>
                  <Progress value={scanProgress} className="h-3" />
                </div>

                {/* Issues Found Counter - Prominent display */}
                {issuesFound > 0 && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {issuesFound} {issuesFound === 1 ? 'Issue' : 'Issues'} Found
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI is analyzing each issue for detailed recommendations
                    </p>
                  </div>
                )}

                {/* Time stats */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Elapsed: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">AI Analysis Active</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3 italic">
                  "{SECURITY_SLOGANS[sloganIndex].text}"
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Did you know? {SECURITY_SLOGANS[sloganIndex].fact}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results Summary Card - Quick view, detailed results in popup */}
          {showResults && auditResult && !showPopup && (
            <Card className={`border-border/50 rounded-3xl ${getScoreBackground(auditResult.security_score)}`}>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="h-10 w-10 text-primary" />
                    <span className={`text-5xl font-bold ${getScoreColor(auditResult.security_score)}`}>
                      {auditResult.security_score.toFixed(1)}/10
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {auditResult.security_score >= 8 ? "Excellent security posture!" :
                     auditResult.security_score >= 6 ? "Good security with room for improvement." :
                     auditResult.security_score >= 4 ? "Moderate security - improvements recommended." :
                     "Critical security issues detected. Immediate action required."}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center pt-4">
                    <Button onClick={() => setShowPopup(true)} className="border-2 border-primary bg-primary text-primary-foreground hover:bg-background hover:text-primary hover:border-primary transition-all duration-300">
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Report
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Always use downloadReport API for fresh presigned URL (security)
                          await AivedhaAPI.downloadReport(auditResult.report_id);
                        } catch {
                          toast({
                            variant: "destructive",
                            title: "Download Failed",
                            description: "Unable to download PDF report. Please try again."
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="outline" onClick={handleNewAudit}>
                      <Search className="h-4 w-4 mr-2" />
                      New Audit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}

/**
 * SecurityAudit - Main export wrapped with ErrorBoundary
 * Provides graceful error handling for the entire security audit page
 */
export default function SecurityAudit() {
  return (
    <ErrorBoundary pageName="Security Audit">
      <SecurityAuditContent />
    </ErrorBoundary>
  );
}
