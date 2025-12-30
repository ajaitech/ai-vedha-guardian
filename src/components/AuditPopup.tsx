import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
  Download,
  Mail,
  ExternalLink,
  Eye,
  ScanLine,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Server,
  Globe,
  Key,
  FileSearch,
  Code,
  Database,
  Cpu,
  Sparkles,
  Zap,
  XCircle,
  LucideIcon
} from "lucide-react";
import AivedhaAPI, { AuditItemStatus } from "@/lib/api";

// Professional stage messages with poetic descriptions
const STAGE_MESSAGES: { [key: string]: { title: string; subtitle: string; icon: LucideIcon; poeticLine: string } } = {
  'INITIALIZING': {
    title: 'Awakening the Guardian',
    subtitle: 'Preparing security analysis framework...',
    icon: Zap,
    poeticLine: 'From digital slumber, the sentinel rises to protect.'
  },
  'DNS_ANALYSIS': {
    title: 'Tracing Digital Footprints',
    subtitle: 'Analyzing DNS records and domain security...',
    icon: Globe,
    poeticLine: 'Every domain tells a story; we read between the lines.'
  },
  'SSL_ANALYSIS': {
    title: 'Examining the Cryptographic Shield',
    subtitle: 'Deep analysis of SSL/TLS configuration...',
    icon: Lock,
    poeticLine: 'Trust is built on layers of encryption, each one matters.'
  },
  'HTTP_ANALYSIS': {
    title: 'Intercepting the Conversation',
    subtitle: 'Analyzing HTTP responses and protocols...',
    icon: Server,
    poeticLine: 'In the whisper of packets, secrets reveal themselves.'
  },
  'HEADERS_ANALYSIS': {
    title: 'Reading the Security Manifest',
    subtitle: 'Evaluating security headers configuration...',
    icon: FileSearch,
    poeticLine: 'Headers speak volumes about a site\'s defenses.'
  },
  'CONTENT_ANALYSIS': {
    title: 'Scanning the Digital Canvas',
    subtitle: 'Analyzing page content for vulnerabilities...',
    icon: Eye,
    poeticLine: 'Within the code lies the truth of security.'
  },
  'TECHNOLOGY_DETECTION': {
    title: 'Identifying the Arsenal',
    subtitle: 'Fingerprinting technologies and frameworks...',
    icon: Cpu,
    poeticLine: 'Knowing your tools is the first step to mastery.'
  },
  'SENSITIVE_FILES': {
    title: 'Searching Hidden Corridors',
    subtitle: 'Checking for exposed sensitive files...',
    icon: Database,
    poeticLine: 'What lies hidden can become the greatest threat.'
  },
  'FORM_ANALYSIS': {
    title: 'Testing the Gates',
    subtitle: 'Analyzing form security and input validation...',
    icon: Key,
    poeticLine: 'Entry points are where vigilance must be strongest.'
  },
  'JAVASCRIPT_ANALYSIS': {
    title: 'Decoding the Logic',
    subtitle: 'Scanning JavaScript for vulnerabilities...',
    icon: Code,
    poeticLine: 'In every script, a story of security unfolds.'
  },
  'API_ANALYSIS': {
    title: 'Mapping the Pathways',
    subtitle: 'Discovering and analyzing API endpoints...',
    icon: Layers,
    poeticLine: 'APIs are the bridges—we ensure they are fortified.'
  },
  'COOKIE_ANALYSIS': {
    title: 'Inspecting the Memory',
    subtitle: 'Analyzing cookie security settings...',
    icon: Database,
    poeticLine: 'Cookies remember; we ensure they remember safely.'
  },
  'ROBOTS_ANALYSIS': {
    title: 'Reading the Rulebook',
    subtitle: 'Checking robots.txt and sitemap...',
    icon: FileText,
    poeticLine: 'Even the rules we set can reveal our vulnerabilities.'
  },
  'WAF_DETECTION': {
    title: 'Detecting the Fortress Walls',
    subtitle: 'Identifying Web Application Firewall protection...',
    icon: Shield,
    poeticLine: 'The first line of defense often determines the battle\'s outcome.'
  },
  'CORS_ANALYSIS': {
    title: 'Examining Cross-Origin Policies',
    subtitle: 'Analyzing CORS security configuration...',
    icon: Globe,
    poeticLine: 'Trust boundaries define where safety ends and risk begins.'
  },
  'CLOUD_SECURITY': {
    title: 'Scanning the Cloud Perimeter',
    subtitle: 'Checking for cloud misconfigurations...',
    icon: Server,
    poeticLine: 'In the cloud, visibility is the key to security.'
  },
  'SUBDOMAIN_ENUMERATION': {
    title: 'Mapping the Digital Estate',
    subtitle: 'Enumerating subdomains for takeover risks...',
    icon: Globe,
    poeticLine: 'Every subdomain is a door; we check every lock.'
  },
  'VULNERABILITY_AGGREGATION': {
    title: 'Assembling the Intelligence',
    subtitle: 'Aggregating all vulnerability findings...',
    icon: Sparkles,
    poeticLine: 'From scattered clues, a complete picture emerges.'
  },
  'AI_ANALYSIS': {
    title: 'Consulting the Oracle',
    subtitle: 'AI-powered deep analysis in progress...',
    icon: Cpu,
    poeticLine: 'Where human eyes falter, artificial wisdom prevails.'
  },
  'REPORT_GENERATION': {
    title: 'Crafting the Chronicle',
    subtitle: 'Generating comprehensive security report...',
    icon: FileText,
    poeticLine: 'Knowledge documented is knowledge preserved.'
  },
  'COMPLETED': {
    title: 'Mission Accomplished',
    subtitle: 'Security audit completed successfully',
    icon: Award,
    poeticLine: 'Another fortress strengthened, another guardian\'s duty fulfilled.'
  }
};

// Audit checklist items - matches Lambda security-audit-crawler.py phases EXACTLY (41 items)
const AUDIT_CHECKLIST = [
  // Phase 1: Initialization (0-5%)
  { id: 'init_scanners', name: 'Initializing Scanners', progressThreshold: 2, icon: Zap },
  { id: 'init_patterns', name: 'Loading Vulnerability Patterns', progressThreshold: 3, icon: Database },
  { id: 'init_modules', name: 'Configuring Detection Modules', progressThreshold: 4, icon: Cpu },
  { id: 'init_crawler', name: 'Preparing Crawl Engine', progressThreshold: 5, icon: Eye },

  // Phase 2: Crawling (5-40%)
  { id: 'crawl_discover', name: 'Discovering Web Pages', progressThreshold: 12, icon: Globe },
  { id: 'crawl_links', name: 'Following Links', progressThreshold: 20, icon: Layers },
  { id: 'crawl_forms', name: 'Extracting Forms & Scripts', progressThreshold: 28, icon: Code },
  { id: 'crawl_structure', name: 'Analyzing Page Structure', progressThreshold: 35, icon: FileSearch },
  { id: 'crawl_assets', name: 'Indexing Discovered Assets', progressThreshold: 40, icon: Database },

  // Phase 3: SSL Analysis (40-50%)
  { id: 'ssl_config', name: 'SSL/TLS Configuration', progressThreshold: 42, icon: Lock },
  { id: 'ssl_cert', name: 'Certificate Validity', progressThreshold: 44, icon: Award },
  { id: 'ssl_cipher', name: 'Cipher Suites', progressThreshold: 46, icon: Key },
  { id: 'ssl_chain', name: 'Certificate Chain', progressThreshold: 48, icon: Layers },
  { id: 'ssl_hsts', name: 'HSTS Configuration', progressThreshold: 50, icon: Shield },

  // Phase 4: DNS Analysis (50-55%)
  { id: 'dns_records', name: 'DNS Records', progressThreshold: 51, icon: Globe },
  { id: 'dns_dnssec', name: 'DNSSEC Status', progressThreshold: 52, icon: Shield },
  { id: 'dns_spf', name: 'SPF Configuration', progressThreshold: 53, icon: Mail },
  { id: 'dns_dkim', name: 'DKIM Records', progressThreshold: 54, icon: Key },
  { id: 'dns_dmarc', name: 'DMARC Policy', progressThreshold: 55, icon: Shield },

  // Phase 5: Header Analysis (55-60%)
  { id: 'hdr_security', name: 'Security Headers', progressThreshold: 57, icon: FileSearch },
  { id: 'hdr_csp', name: 'Content-Security-Policy', progressThreshold: 58, icon: Shield },
  { id: 'hdr_xframe', name: 'X-Frame-Options', progressThreshold: 59, icon: Eye },
  { id: 'hdr_cors', name: 'CORS Configuration', progressThreshold: 60, icon: Globe },

  // Phase 6: Vulnerability Detection (60-85%)
  { id: 'vuln_xss', name: 'XSS Vulnerabilities', progressThreshold: 63, icon: AlertTriangle },
  { id: 'vuln_sqli', name: 'SQL Injection', progressThreshold: 66, icon: Database },
  { id: 'vuln_data', name: 'Sensitive Data Exposure', progressThreshold: 69, icon: Eye },
  { id: 'vuln_auth', name: 'Authentication Security', progressThreshold: 72, icon: Key },
  { id: 'vuln_deps', name: 'Vulnerable Dependencies', progressThreshold: 75, icon: Layers },
  { id: 'vuln_ssrf', name: 'SSRF Vulnerabilities', progressThreshold: 77, icon: Server },
  { id: 'vuln_xxe', name: 'XXE Injection', progressThreshold: 79, icon: Code },
  { id: 'vuln_websocket', name: 'WebSocket Security', progressThreshold: 81, icon: Layers },
  { id: 'vuln_jwt', name: 'JWT Implementation', progressThreshold: 83, icon: Key },
  { id: 'vuln_api', name: 'API Endpoints', progressThreshold: 85, icon: Layers },

  // Phase 7: AI Analysis (85-95%)
  { id: 'ai_patterns', name: 'AI Pattern Analysis', progressThreshold: 87, icon: Sparkles },
  { id: 'ai_risk', name: 'Risk Assessment', progressThreshold: 89, icon: AlertTriangle },
  { id: 'ai_chains', name: 'Attack Chain Synthesis', progressThreshold: 92, icon: Cpu },
  { id: 'ai_remediation', name: 'Remediation Recommendations', progressThreshold: 95, icon: CheckCircle },

  // Phase 8: Report Generation (95-100%)
  { id: 'report_compile', name: 'Compiling Results', progressThreshold: 96, icon: FileText },
  { id: 'report_generate', name: 'Generating Report', progressThreshold: 97, icon: FileText },
  { id: 'report_score', name: 'Security Score', progressThreshold: 98, icon: Award },
  { id: 'report_final', name: 'Finalizing Report', progressThreshold: 100, icon: CheckCircle },
];

// Get stage info based on progress percentage (16 scan stages + aggregation + AI + report)
const getStageFromProgress = (progress: number): { title: string; subtitle: string; icon: LucideIcon; poeticLine: string } => {
  if (progress < 8) return STAGE_MESSAGES['INITIALIZING'];      // 5%
  if (progress < 14) return STAGE_MESSAGES['DNS_ANALYSIS'];     // 10%
  if (progress < 20) return STAGE_MESSAGES['SSL_ANALYSIS'];     // 16%
  if (progress < 26) return STAGE_MESSAGES['HTTP_ANALYSIS'];    // 22%
  if (progress < 32) return STAGE_MESSAGES['HEADERS_ANALYSIS']; // 28%
  if (progress < 38) return STAGE_MESSAGES['CONTENT_ANALYSIS']; // 34%
  if (progress < 44) return STAGE_MESSAGES['TECHNOLOGY_DETECTION']; // 40%
  if (progress < 48) return STAGE_MESSAGES['SENSITIVE_FILES'];  // 46%
  if (progress < 52) return STAGE_MESSAGES['FORM_ANALYSIS'];    // 50%
  if (progress < 56) return STAGE_MESSAGES['JAVASCRIPT_ANALYSIS']; // 54%
  if (progress < 60) return STAGE_MESSAGES['API_ANALYSIS'];     // 58%
  if (progress < 64) return STAGE_MESSAGES['COOKIE_ANALYSIS'];  // 62%
  if (progress < 68) return STAGE_MESSAGES['ROBOTS_ANALYSIS'];  // 66%
  if (progress < 72) return STAGE_MESSAGES['WAF_DETECTION'];    // 70%
  if (progress < 76) return STAGE_MESSAGES['CORS_ANALYSIS'];    // 74%
  if (progress < 80) return STAGE_MESSAGES['CLOUD_SECURITY'];   // 78%
  if (progress < 85) return STAGE_MESSAGES['SUBDOMAIN_ENUMERATION']; // 82%
  if (progress < 90) return STAGE_MESSAGES['VULNERABILITY_AGGREGATION']; // 88%
  if (progress < 94) return STAGE_MESSAGES['AI_ANALYSIS'];      // 92%
  if (progress < 100) return STAGE_MESSAGES['REPORT_GENERATION']; // 96%
  return STAGE_MESSAGES['COMPLETED'];
};

// Pagination constants
const VULNERABILITIES_PER_PAGE = 5;

interface Vulnerability {
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
}

interface AuditResult {
  report_id: string;
  security_score: number;
  vulnerabilities_count: number;
  critical_issues: number;
  high_issues?: number;  // Optional - may not always be present
  medium_issues: number;
  low_issues: number;
  info_issues?: number;
  ssl_status: string;
  ssl_grade?: string;
  headers_score: number;
  vulnerabilities: Vulnerability[];
  pdf_report_url?: string;
  grade?: string;
}

interface AuditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isScanning: boolean;
  scanProgress: number;
  scanStatus: string;
  url: string;
  auditResult: AuditResult | null;
  sloganIndex: number;
  securitySlogans: { text: string; fact: string }[];
  onNewAudit: () => void;
  onRunInBackground?: () => void;
  reportId?: string;
  elapsedSeconds?: number;
  issuesFound?: number;
  auditItems?: AuditItemStatus[]; // Per-item status from Lambda (v6.0.0)
  currentAuditItem?: number; // Current item being scanned
  // Region routing info (v5.0.0)
  scanRegion?: string; // e.g., 'us-east-1' or 'ap-south-1'
  regionName?: string; // e.g., 'USA' or 'India'
  staticIP?: string; // e.g., '44.206.201.117'
  isPaidUser?: boolean; // Controls IP visibility
}

export const AuditPopup = ({
  isOpen,
  onClose,
  isScanning,
  scanProgress,
  scanStatus,
  url,
  auditResult,
  sloganIndex,
  securitySlogans,
  onNewAudit,
  onRunInBackground,
  reportId,
  elapsedSeconds = 0,
  issuesFound = 0,
  auditItems,
  currentAuditItem = 0,
  scanRegion,
  regionName,
  staticIP,
  isPaidUser = false
}: AuditPopupProps) => {
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [showBackgroundOption, setShowBackgroundOption] = useState(false);
  const [previousStage, setPreviousStage] = useState('');
  const [visibleVulnCount, setVisibleVulnCount] = useState(VULNERABILITIES_PER_PAGE);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());

  // Auto-scroll control: pause when user manually scrolls, resume after 30s idle
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const terminalScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Handle manual scroll detection
  const handleTerminalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollDelta = Math.abs(container.scrollTop - lastScrollTopRef.current);
    lastScrollTopRef.current = container.scrollTop;

    // Only consider it manual scroll if significant movement (> 5px)
    if (scrollDelta > 5) {
      setUserScrolled(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Resume auto-scroll after 30 seconds of idle
      scrollTimeoutRef.current = setTimeout(() => {
        setUserScrolled(false);
      }, 30000); // 30 seconds
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to active item (only when user hasn't manually scrolled)
  useEffect(() => {
    if (!userScrolled && terminalScrollRef.current) {
      const activeItem = terminalScrollRef.current.querySelector('.module-active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [checklistStatus, userScrolled]);

  // Auto-close popup and navigate to results when scan completes
  useEffect(() => {
    if (!isScanning && auditResult && reportId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        onClose();
        // Pass auditResult and url in navigation state for immediate display
        navigate(`/audit/results/${reportId}`, {
          state: { auditResult, url }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isScanning, auditResult, reportId, navigate, onClose, url]);

  // Reset navigation ref when popup closes
  useEffect(() => {
    if (!isOpen) {
      hasNavigatedRef.current = false;
    }
  }, [isOpen]);

  // Get current stage info based on progress
  const currentStage = getStageFromProgress(scanProgress);
  const StageIcon = currentStage.icon;

  // Calculate checklist status - prefer Lambda per-item data, fallback to progress-based
  const checklistStatus = useMemo(() => {
    // If Lambda provides per-item data, use it directly
    if (auditItems && auditItems.length > 0) {
      return AUDIT_CHECKLIST.map((item, index) => {
        const lambdaItem = auditItems[index]; // Items match 1:1 by index
        if (lambdaItem) {
          // Determine status: 'completed', 'failed', 'in_progress', 'pending'
          let itemStatus: string;
          if (lambdaItem.status === 'success') {
            itemStatus = 'completed';
          } else if (lambdaItem.status === 'failed') {
            itemStatus = 'failed';
          } else if (lambdaItem.status === 'scanning') {
            itemStatus = 'in_progress';
          } else {
            itemStatus = 'pending';
          }
          return {
            ...item,
            status: itemStatus,
            // -1 means not executed, 0+ means actual count
            issueCount: lambdaItem.issues >= 0 ? lambdaItem.issues : -1
          };
        }
        // Fallback if Lambda item missing
        return {
          ...item,
          status: scanProgress >= item.progressThreshold
            ? 'completed'
            : scanProgress >= item.progressThreshold - 8
              ? 'in_progress'
              : 'pending',
          issueCount: -1
        };
      });
    }
    // Fallback to progress-based calculation
    return AUDIT_CHECKLIST.map(item => ({
      ...item,
      status: scanProgress >= item.progressThreshold
        ? 'completed'
        : scanProgress >= item.progressThreshold - 8
          ? 'in_progress'
          : 'pending',
      issueCount: -1  // -1 indicates not executed yet
    }));
  }, [scanProgress, auditItems]);

  // Track completed modules for issue distribution
  useEffect(() => {
    if (isScanning) {
      const newCompleted = new Set<string>();
      AUDIT_CHECKLIST.forEach(item => {
        if (scanProgress >= item.progressThreshold) {
          newCompleted.add(item.id);
        }
      });
      setCompletedModules(newCompleted);
    } else {
      setCompletedModules(new Set());
    }
  }, [isScanning, scanProgress]);

  // Track when progress seems stuck and suggest background option
  useEffect(() => {
    if (isScanning && elapsedSeconds > 60) {
      // Show background option after 60 seconds
      setShowBackgroundOption(true);
    }
  }, [isScanning, elapsedSeconds]);

  // Track stage changes for animation
  useEffect(() => {
    if (currentStage.title !== previousStage) {
      setPreviousStage(currentStage.title);
    }
  }, [currentStage.title, previousStage]);

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAttemptClose = () => {
    if (isScanning) {
      setShowCloseWarning(true);
    } else {
      onClose();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-500";
    if (score >= 7) return "text-yellow-500";
    if (score >= 5) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 9) return "from-green-500/20 to-emerald-500/20 border-green-500/30";
    if (score >= 7) return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
    if (score >= 5) return "from-orange-500/20 to-red-500/20 border-orange-500/30";
    return "from-red-500/20 to-rose-500/20 border-red-500/30";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return { bg: "bg-red-600", text: "text-red-600", light: "bg-red-600/10" };
      case 'HIGH': return { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-500/10" };
      case 'MEDIUM': return { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-500/10" };
      case 'LOW': return { bg: "bg-green-500", text: "text-green-500", light: "bg-green-500/10" };
      case 'INFO': return { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-500/10" };
      default: return { bg: "bg-gray-500", text: "text-gray-500", light: "bg-gray-500/10" };
    }
  };

  const getScoreMessage = (score: number) => {
    if (score >= 9) return { text: "Excellent! Your website demonstrates outstanding security practices.", icon: Award, color: "text-green-500" };
    if (score >= 7) return { text: "Good job! Your website has solid security with minor improvements recommended.", icon: CheckCircle, color: "text-yellow-500" };
    if (score >= 5) return { text: "Attention needed. Some security vulnerabilities require your attention.", icon: Info, color: "text-orange-500" };
    return { text: "Critical issues detected. Immediate action is recommended to secure your website.", icon: AlertTriangle, color: "text-red-500" };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Close Warning Dialog */}
      {showCloseWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card p-6 rounded-2xl border border-border/50 shadow-2xl max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Audit in Progress</h3>
                <p className="text-sm text-muted-foreground">Security scan is still running</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6">
              Closing this window will interrupt the security audit. You may lose scan progress and credits may still be deducted.
              Are you sure you want to leave?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCloseWarning(false)}
                className="border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-1"
              >
                Continue Audit
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setShowCloseWarning(false); onClose(); }}
                className="border-2 border-transparent hover:bg-transparent hover:text-destructive hover:border-destructive transition-all duration-300 hover:-translate-y-1"
              >
                Leave Anyway
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleAttemptClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/50 shadow-2xl mx-2 sm:mx-4"
        >
          {/* Header - static, no animations */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10 rounded-b-xl">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-foreground font-orbitron truncate">
                  {isScanning ? "Security Scan in Progress" : "Security Audit Results"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-md">{url}</p>
              </div>
            </div>
            {!isScanning && (
              <button className="btn-ghost p-2 rounded-full" onClick={onClose}>
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)] p-3 sm:p-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {isScanning ? (
              /* Redesigned Layout: Scanner → Progress Bar → Terminal → Slogans */
              <div className="flex flex-col gap-4">
                {/* 1. SCANNER ANIMATION - Clock-style rotating radar */}
                <div className="flex justify-center py-4">
                  <div className="relative w-20 h-20">
                    {/* Outer ring with tick marks */}
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30">
                      {/* Clock tick marks */}
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-0.5 h-2 bg-cyan-500/50"
                          style={{
                            left: '50%',
                            top: '2px',
                            transformOrigin: '50% 38px',
                            transform: `translateX(-50%) rotate(${i * 30}deg)`
                          }}
                        />
                      ))}
                    </div>

                    {/* Inner circle with gradient */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/20" />

                    {/* Rotating radar sweep - clock hand style */}
                    <motion.div
                      className="absolute inset-0 rounded-full overflow-hidden"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      {/* Radar sweep gradient */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0%, rgba(6, 182, 212, 0.4) 15%, transparent 30%)'
                        }}
                      />
                      {/* Clock hand */}
                      <div
                        className="absolute left-1/2 top-1/2 w-0.5 h-8 bg-gradient-to-t from-cyan-500 to-transparent rounded-full"
                        style={{ transformOrigin: 'bottom center', transform: 'translateX(-50%) translateY(-100%)' }}
                      />
                    </motion.div>

                    {/* Center dot */}
                    <motion.div
                      className="absolute left-1/2 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-cyan-500"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />

                    {/* Pulsing outer glow */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                </div>

                {/* 2. COMPACT PROGRESS BAR - With "In Progress" / "Completed" text */}
                <div className="px-4">
                  <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-cyan-500 to-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(scanProgress, 3)}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-y-0 left-0 w-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                        backgroundSize: '200% 100%'
                      }}
                      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white drop-shadow-lg tracking-wide">
                        {scanProgress >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Region Info Display */}
                {scanRegion && (
                  <div className="px-4 mt-2">
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <span>Scanning from:</span>
                        <span className="font-medium text-foreground">
                          {regionName || (scanRegion === 'ap-south-1' ? 'India' : 'USA')}
                        </span>
                      </div>
                      <span className="text-border">|</span>
                      <div className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-primary" />
                        <span>IP:</span>
                        {isPaidUser ? (
                          <span className="font-mono text-foreground">{staticIP || 'N/A'}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="text-xs">Upgrade to view</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TERMINAL - Live Streaming Audit */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-lg max-w-3xl mx-auto w-full">
                  {/* Terminal header - Clean design with Run in Background button */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-red-500"
                      />
                      <span className="text-cyan-400 text-xs font-bold font-mono uppercase tracking-wider">LIVE STREAMING AUDIT</span>
                    </div>
                    {onRunInBackground && (
                      <Button
                        onClick={onRunInBackground}
                        size="sm"
                        variant="ghost"
                        className={`h-7 text-[10px] px-3 rounded-md transition-all duration-300 ${
                          elapsedSeconds > 90
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 hover:scale-105 animate-pulse'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        <Layers className="h-3 w-3 mr-1.5" />
                        Run in Background
                      </Button>
                    )}
                  </div>

                  {/* Terminal content - Numbered streaming module list */}
                  <div className="p-4 font-mono text-xs">
                    {/* Scrollable module list - 6 lines visible, manual scroll pauses auto-scroll for 30s */}
                    <div
                      className="terminal-scroll max-h-[180px] overflow-y-auto pr-2 space-y-1"
                      ref={terminalScrollRef}
                      onScroll={handleTerminalScroll}
                    >
                      {checklistStatus.map((item, index) => {
                        const isActive = item.status === 'in_progress';
                        const isCompleted = item.status === 'completed';
                        const isFailed = item.status === 'failed';
                        const isPending = item.status === 'pending';
                        const ItemIcon = item.icon;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`flex items-center gap-2 py-1 px-2 rounded ${
                              isActive ? 'bg-cyan-500/20 module-active' : isFailed ? 'bg-red-500/10' : ''
                            }`}
                          >
                            {/* Number */}
                            <span className={`w-5 text-right ${
                              isCompleted ? 'text-green-500' : isFailed ? 'text-red-500' : isActive ? 'text-cyan-400' : 'text-gray-600'
                            }`}>
                              {(index + 1).toString().padStart(2, '0')}
                            </span>

                            {/* Module name with dots */}
                            <span className={`flex-1 truncate ${
                              isCompleted ? 'text-gray-400' : isFailed ? 'text-red-400' : isActive ? 'text-cyan-300' : 'text-gray-600'
                            }`}>
                              {item.name}
                            </span>

                            {/* Status indicator */}
                            <span className="w-20 text-right flex items-center justify-end gap-1">
                              {isActive && (
                                <>
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block"
                                  >
                                    ⟳
                                  </motion.span>
                                  <span className="text-cyan-400">SCANNING</span>
                                </>
                              )}
                              {isCompleted && (
                                <>
                                  <span className="text-green-500">✓</span>
                                  <span className="text-green-500">SUCCESS</span>
                                </>
                              )}
                              {isFailed && (
                                <>
                                  <span className="text-red-500">✗</span>
                                  <span className="text-red-500">FAILED</span>
                                </>
                              )}
                              {isPending && (
                                <>
                                  <span className="text-gray-600">○</span>
                                  <span className="text-gray-600">PENDING</span>
                                </>
                              )}
                            </span>

                            {/* Issue count - only show if >= 0 (not -1 which means not executed) */}
                            {item.issueCount >= 0 && (
                              <span className={`font-bold ml-1 ${item.issueCount > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                                {item.issueCount}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Status line */}
                    <div className="flex items-center justify-center gap-4 text-gray-400 text-[11px] border-t border-gray-800 pt-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-500" />
                        <span className="font-mono font-medium">{formatElapsedTime(elapsedSeconds)}</span>
                      </div>
                      <span className="text-gray-600">│</span>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <span className="font-medium">{checklistStatus.filter(s => s.status === 'completed').length} completed</span>
                      </div>
                      <span className="text-gray-600">│</span>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className={`h-3.5 w-3.5 ${issuesFound > 0 ? 'text-amber-500' : 'text-gray-500'}`} />
                        <span className={`font-medium ${issuesFound > 0 ? 'text-amber-400' : 'text-gray-500'}`}>{issuesFound} issues</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. POETIC SLOGANS - Slowly changing at bottom */}
                <motion.div
                  key={sloganIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.8 }}
                  className="text-center py-4 px-6"
                >
                  <p className="text-sm italic text-muted-foreground leading-relaxed">
                    "{securitySlogans[sloganIndex]?.text}"
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {securitySlogans[sloganIndex]?.fact}
                  </p>
                </motion.div>
              </div>
            ) : auditResult ? (
              /* Results Display */
              <div className="space-y-6">
                {/* Score Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${getScoreBg(auditResult.security_score)} border`}
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-background/50 backdrop-blur-sm border-4 ${auditResult.security_score >= 7 ? 'border-green-500/50' : auditResult.security_score >= 5 ? 'border-yellow-500/50' : 'border-red-500/50'}`}>
                          <span className={`text-4xl font-bold ${getScoreColor(auditResult.security_score)}`}>
                            {auditResult.security_score.toFixed(1)}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background flex items-center justify-center border-2 border-primary/30">
                          <span className="text-xs font-medium text-muted-foreground">/10</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">Security Score</h3>
                        <div className={`flex items-center gap-2 ${getScoreMessage(auditResult.security_score).color}`}>
                          {(() => {
                            const Icon = getScoreMessage(auditResult.security_score).icon;
                            return <Icon className="h-5 w-5" />;
                          })()}
                          <span className="text-sm">{getScoreMessage(auditResult.security_score).text}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-sm">
                        Report: {auditResult.report_id.slice(0, 8)}
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-background/50 border border-border/50 text-center"
                  >
                    <Lock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{auditResult.ssl_grade || auditResult.ssl_status}</p>
                    <p className="text-xs text-muted-foreground">SSL Grade</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-background/50 border border-border/50 text-center"
                  >
                    <Shield className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{auditResult.headers_score}%</p>
                    <p className="text-xs text-muted-foreground">Headers Score</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-xl bg-background/50 border border-border/50 text-center"
                  >
                    <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{auditResult.critical_issues}</p>
                    <p className="text-xs text-muted-foreground">Critical Issues</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-xl bg-background/50 border border-border/50 text-center"
                  >
                    <Info className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{auditResult.vulnerabilities_count}</p>
                    <p className="text-xs text-muted-foreground">Total Issues</p>
                  </motion.div>
                </div>

                {/* Vulnerability Bar Chart */}
                {auditResult.vulnerabilities_count > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-6 rounded-xl bg-background/50 border border-border/50"
                  >
                    <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Vulnerability Distribution
                    </h4>
                    <div className="flex items-end gap-4 h-32 justify-center">
                      {auditResult.critical_issues > 0 && (
                        <div
                          className="vuln-chart-bar w-14 bg-red-600 relative group"
                          style={{ '--bar-height': `${Math.min((auditResult.critical_issues / auditResult.vulnerabilities_count) * 100, 100)}%` } as React.CSSProperties}
                          onClick={() => setSelectedVulnerability(auditResult.vulnerabilities.find(v => v.severity === 'CRITICAL') || null)}
                        >
                          <span className="text-white font-bold text-sm">{auditResult.critical_issues}</span>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Critical
                          </div>
                        </div>
                      )}
                      {(auditResult.high_issues ?? 0) > 0 && (
                        <div
                          className="vuln-chart-bar w-14 bg-orange-500 relative group"
                          style={{ '--bar-height': `${Math.min(((auditResult.high_issues ?? 0) / auditResult.vulnerabilities_count) * 100, 100)}%` } as React.CSSProperties}
                          onClick={() => setSelectedVulnerability(auditResult.vulnerabilities.find(v => v.severity === 'HIGH') || null)}
                        >
                          <span className="text-white font-bold text-sm">{auditResult.high_issues ?? 0}</span>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            High
                          </div>
                        </div>
                      )}
                      {auditResult.medium_issues > 0 && (
                        <div
                          className="vuln-chart-bar w-14 bg-yellow-500 relative group"
                          style={{ '--bar-height': `${Math.min((auditResult.medium_issues / auditResult.vulnerabilities_count) * 100, 100)}%` } as React.CSSProperties}
                          onClick={() => setSelectedVulnerability(auditResult.vulnerabilities.find(v => v.severity === 'MEDIUM') || null)}
                        >
                          <span className="text-white font-bold text-sm">{auditResult.medium_issues}</span>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Medium
                          </div>
                        </div>
                      )}
                      {auditResult.low_issues > 0 && (
                        <div
                          className="vuln-chart-bar w-14 bg-green-500 relative group"
                          style={{ '--bar-height': `${Math.min((auditResult.low_issues / auditResult.vulnerabilities_count) * 100, 100)}%` } as React.CSSProperties}
                          onClick={() => setSelectedVulnerability(auditResult.vulnerabilities.find(v => v.severity === 'LOW') || null)}
                        >
                          <span className="text-white font-bold text-sm">{auditResult.low_issues}</span>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Low
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded"></div>
                        <span className="text-xs text-muted-foreground">Critical ({auditResult.critical_issues})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-xs text-muted-foreground">High ({auditResult.high_issues})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span className="text-xs text-muted-foreground">Medium ({auditResult.medium_issues})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-xs text-muted-foreground">Low ({auditResult.low_issues})</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Click on a bar to view vulnerability details and recommendations
                    </p>
                  </motion.div>
                )}

                {/* Vulnerability Details */}
                {auditResult.vulnerabilities && auditResult.vulnerabilities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-3"
                  >
                    <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Detailed Findings & Recommendations
                      {auditResult.vulnerabilities.length > VULNERABILITIES_PER_PAGE && (
                        <span className="text-sm font-normal text-muted-foreground">
                          ({Math.min(visibleVulnCount, auditResult.vulnerabilities.length)} of {auditResult.vulnerabilities.length})
                        </span>
                      )}
                    </h4>
                    {auditResult.vulnerabilities.slice(0, visibleVulnCount).map((vuln, index) => {
                      const colors = getSeverityColor(vuln.severity);
                      const isExpanded = expandedVuln === index;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`rounded-xl border border-border/50 overflow-hidden ${colors.light}`}
                        >
                          <div
                            className="p-4 cursor-pointer hover:bg-background/50 transition-colors"
                            onClick={() => setExpandedVuln(isExpanded ? null : index)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full ${colors.bg} mt-2`}></div>
                                <div>
                                  <h5 className="font-semibold text-foreground">{vuln.title}</h5>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{vuln.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${colors.light} ${colors.text} border-0`}>
                                  {vuln.severity}
                                </Badge>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4 space-y-3"
                              >
                                <div className="p-3 rounded-lg bg-background/80">
                                  <p className="text-sm text-muted-foreground">{vuln.description}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                  <p className="text-sm">
                                    <strong className="text-primary">Recommendation:</strong>{' '}
                                    <span className="text-foreground">{vuln.recommendation}</span>
                                  </p>
                                </div>
                                {vuln.owasp_category && (
                                  <p className="text-xs text-muted-foreground">
                                    OWASP Category: {vuln.owasp_category}
                                  </p>
                                )}
                                {vuln.ai_fix_steps && (
                                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                                    <p className="text-sm font-medium text-accent mb-2">AI-Powered Fix Guide:</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vuln.ai_fix_steps}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {auditResult.vulnerabilities.length > VULNERABILITIES_PER_PAGE && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/30">
                        <div className="flex gap-2 flex-wrap justify-center">
                          {visibleVulnCount < auditResult.vulnerabilities.length && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVisibleVulnCount(prev => Math.min(prev + VULNERABILITIES_PER_PAGE, auditResult.vulnerabilities.length))}
                              className="text-xs"
                            >
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Load More
                            </Button>
                          )}
                          {visibleVulnCount > VULNERABILITIES_PER_PAGE && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVisibleVulnCount(VULNERABILITIES_PER_PAGE)}
                              className="text-xs"
                            >
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show Less
                            </Button>
                          )}
                          {visibleVulnCount < auditResult.vulnerabilities.length && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setVisibleVulnCount(auditResult.vulnerabilities.length)}
                              className="text-xs"
                            >
                              Show All ({auditResult.vulnerabilities.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* No Vulnerabilities - Congratulations (only if score is good) */}
                {auditResult.vulnerabilities_count === 0 &&
                 auditResult.critical_issues === 0 &&
                 auditResult.security_score >= 7 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-xl bg-green-500/10 border border-green-500/30 text-center"
                  >
                    <Award className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-foreground mb-2">Congratulations!</h4>
                    <p className="text-muted-foreground">
                      No security vulnerabilities detected. Your website follows excellent security practices.
                      Keep up the great work!
                    </p>
                  </motion.div>
                )}

                {/* PDF & Email Notice */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
                >
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground">
                        A detailed PDF report with certificate has been sent to your email.
                        You can also download it using the button below.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : null}
          </div>

          {/* Footer Actions */}
          {!isScanning && auditResult && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-background/50 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center">
              <Button
                className="bg-green-500 text-white border-2 border-transparent hover:bg-transparent hover:text-green-500 hover:border-green-500 transition-all duration-300 hover:-translate-y-1"
                onClick={async () => {
                  // Always use downloadReport API for fresh presigned URL (security)
                  try {
                    await AivedhaAPI.downloadReport(auditResult.report_id);
                  } catch {
                    // Silent fail - user can try again from dashboard
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF Report
              </Button>
              <Button
                variant="outline"
                onClick={onNewAudit}
                className="border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-1"
              >
                <Shield className="h-4 w-4 mr-2" />
                New Audit
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:-translate-y-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
