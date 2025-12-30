import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
  Download,
  Mail,
  ExternalLink,
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Globe,
  Calendar,
  Clock,
  Server,
  Code,
  Eye,
  FileWarning,
  Key,
  Network,
  Wifi,
  Database,
  AlertCircle,
  XCircle,
  Layers,
  Copy,
  Check,
  Zap,
  Target,
  Bug,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  PieChart,
  PartyPopper,
  Sparkles,
  Trophy,
  Star,
  ThumbsUp
} from "lucide-react";
import AivedhaAPI from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { getSeverityColors, getScoreColor, getGradeBadgeClass, getSSLBadgeClass, getRiskBadgeClass } from "@/lib/badge-utils";
import { CLIPBOARD_FEEDBACK_DURATION_MS } from "@/constants/subscription";

// Helper function to format AI markdown text to JSX
const formatAIText = (text: string): JSX.Element => {
  if (!text) return <></>;

  // Split into lines
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeContent = '';

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-2">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm">{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const flushCode = () => {
    if (codeContent) {
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-muted p-3 rounded-lg my-2 overflow-x-auto text-xs">
          <code>{codeContent.trim()}</code>
        </pre>
      );
      codeContent = '';
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      return;
    }

    // Handle headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${index}`} className="font-semibold text-foreground mt-3 mb-1">{trimmed.slice(4)}</h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${index}`} className="font-bold text-foreground mt-4 mb-2">{trimmed.slice(3)}</h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${index}`} className="font-bold text-lg text-foreground mt-4 mb-2">{trimmed.slice(2)}</h2>
      );
      return;
    }

    // Handle numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      flushList();
      elements.push(
        <div key={`num-${index}`} className="flex gap-2 my-1 ml-2">
          <span className="font-semibold text-primary">{numberedMatch[1]}.</span>
          <span className="text-sm">{formatInlineText(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    // Handle bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      currentList.push(trimmed.slice(2));
      return;
    }

    // Regular text
    if (trimmed) {
      flushList();
      elements.push(
        <p key={`p-${index}`} className="text-sm my-1">{formatInlineText(trimmed)}</p>
      );
    }
  });

  flushList();
  flushCode();

  return <div className="space-y-1">{elements}</div>;
};

// Helper to format inline text (bold, code, etc.)
const formatInlineText = (text: string): (string | JSX.Element)[] => {
  const parts: (string | JSX.Element)[] = [];
  const remaining = text;
  let keyIndex = 0;

  // Handle **bold** and `code`
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, render: (m: string) => <strong key={`b-${keyIndex++}`}>{m}</strong> },
    { regex: /`([^`]+)`/g, render: (m: string) => <code key={`c-${keyIndex++}`} className="bg-muted px-1 py-0.5 rounded text-xs">{m}</code> },
  ];

  // Simple approach - replace patterns one by one
  const result = text
    .replace(/\*\*([^*]+)\*\*/g, '<<BOLD:$1>>')
    .replace(/`([^`]+)`/g, '<<CODE:$1>>');

  // Split and reconstruct
  const segments = result.split(/(<<BOLD:[^>]+>>|<<CODE:[^>]+>>)/);

  return segments.map((segment, i) => {
    if (segment.startsWith('<<BOLD:')) {
      const content = segment.slice(7, -2);
      return <strong key={`b-${i}`}>{content}</strong>;
    }
    if (segment.startsWith('<<CODE:')) {
      const content = segment.slice(7, -2);
      return <code key={`c-${i}`} className="bg-muted px-1 py-0.5 rounded text-xs">{content}</code>;
    }
    return segment;
  });
};

// Extended interfaces for rich data
interface SSLInfo {
  valid: boolean;
  grade: string;
  issuer?: string;
  subject?: string;
  expires?: string;
  days_until_expiry?: number;
  protocol?: string;
  cipher_suite?: string;
  key_size?: number;
  certificate_chain?: string[];
  vulnerabilities?: Array<string | { title?: string; severity?: string }>;
}

interface SecurityHeader {
  name: string;
  value?: string;
  present: boolean;
  status: 'good' | 'warning' | 'missing' | 'bad';
  recommendation?: string;
}

interface SecurityHeadersAnalysis {
  score: number;
  headers: SecurityHeader[];
  missing_headers?: string[];
  present_headers?: string[];
}

interface DNSSecurity {
  dnssec_enabled?: boolean;
  spf_record?: string;
  dmarc_record?: string;
  dkim_configured?: boolean;
  mx_records?: string[];
  ns_records?: string[];
  caa_records?: string[];
  issues?: string[];
}

interface SensitiveFile {
  path: string;
  type: string;
  status: number;
  risk: string;
}

interface ContentAnalysis {
  sensitive_data_found?: boolean;
  exposed_emails?: string[];
  exposed_api_keys?: number;
  internal_ips_found?: number;
  comments_with_secrets?: number;
  forms_without_csrf?: number;
}

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
  ai_analysis?: string;
  cvss_score?: number;
  cve_id?: string;
  url?: string;
  affected_url?: string;
  affected_urls?: string[];
  evidence?: string;
  impact?: string;
  fix_code?: string;
  confidence?: number;
  aggregation_count?: number;
}

interface WAFDetection {
  detected: boolean;
  waf_name?: string;
  confidence?: string;
  status?: string;
}

interface CORSAnalysis {
  cors_configured: boolean;
  allow_origin?: string;
  allow_credentials?: boolean;
  status?: string;
}

interface CloudSecurity {
  cloud_resources_found?: string[];
  s3_buckets?: string[];
  azure_blobs?: string[];
  status?: string;
}

interface SubdomainEnumeration {
  hostname?: string;
  subdomains_found?: string[];
  takeover_vulnerable?: Array<{
    subdomain: string;
    cname: string;
    service: string;
  }>;
  status?: string;
}

interface AuditResult {
  report_id: string;
  security_score: number;
  grade: string;
  vulnerabilities_count: number;
  critical_issues: number;
  high_issues?: number;
  medium_issues: number;
  low_issues: number;
  info_issues?: number;
  ssl_status: string;
  ssl_grade?: string;
  ssl_info?: SSLInfo;
  headers_score: number;
  security_headers?: SecurityHeadersAnalysis;
  dns_security?: DNSSecurity;
  technology_stack?: string[];
  sensitive_files?: SensitiveFile[];
  sensitive_files_found?: number;
  content_analysis?: ContentAnalysis;
  waf_detection?: WAFDetection;
  cors_analysis?: CORSAnalysis;
  cloud_security?: CloudSecurity;
  subdomain_enumeration?: SubdomainEnumeration;
  vulnerabilities: Vulnerability[];
  certificate_number?: string;
  pdf_report_url?: string;
  scan_timestamp?: string;
  scan_version?: string;
  scan_depth?: string;
  url?: string;
  // Region routing (v5.0.0)
  scan_region?: string;
  region_name?: string;
  static_ip?: string;
}

// Pagination constants
const VULNERABILITIES_PER_PAGE = 1000; // Show all vulnerabilities by default

export default function AuditResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId: reportIdFromPath } = useParams<{ reportId: string }>();
  const { toast } = useToast();
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vulnerabilities' | 'ssl' | 'headers' | 'dns' | 'waf' | 'cors' | 'cloud' | 'subdomains' | 'tech'>('overview');
  const [visibleVulnCount, setVisibleVulnCount] = useState(VULNERABILITIES_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAuditResult, setFetchedAuditResult] = useState<AuditResult | null>(null);
  // Preserve audit data in state once loaded (prevents loss when location.state clears)
  const [preservedAuditResult, setPreservedAuditResult] = useState<AuditResult | null>(null);

  // Get reportId from URL path params (/audit/results/:reportId) or query params (?reportId=xxx)
  const searchParams = new URLSearchParams(location.search);
  const reportIdFromQuery = searchParams.get('reportId');
  const reportIdFromUrl = reportIdFromPath || reportIdFromQuery;

  // Get data from navigation state OR fetched data OR preserved state
  // Priority: preserved (stable) > state (from navigation) > fetched (from API)
  const stateAuditResult: AuditResult | null = location.state?.auditResult || null;
  const auditResult: AuditResult | null = preservedAuditResult || stateAuditResult || fetchedAuditResult;
  const scannedUrl: string = location.state?.url || auditResult?.url || "";

  // Preserve audit data once loaded (prevents blank page when location.state clears)
  useEffect(() => {
    const dataToPreserve = stateAuditResult || fetchedAuditResult;
    if (dataToPreserve && !preservedAuditResult) {
      setPreservedAuditResult(dataToPreserve);
    }
  }, [stateAuditResult, fetchedAuditResult, preservedAuditResult]);

  // Handle PDF download - always use API for fresh presigned URL (security: never expose S3 URLs)
  const handleDownloadPdf = async () => {
    if (!auditResult) return;

    // Check if PDF is available before attempting download (must be actual PDF, not JSON)
    const hasPdf = auditResult.pdf_report_url && auditResult.pdf_report_url.includes('.pdf');
    if (!hasPdf) {
      toast({
        variant: "destructive",
        title: "PDF Not Available",
        description: "PDF report has not been generated for this audit yet. Please try again in a few minutes or run a new audit."
      });
      return;
    }

    try {
      // Always use downloadReport API to get fresh presigned URL
      // This prevents exposing S3 bucket paths and AWS keys in browser inspect
      await AivedhaAPI.downloadReport(auditResult.report_id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: errorMessage.includes('not available') || errorMessage.includes('not found')
          ? "PDF report is not available for this audit."
          : "Unable to download PDF report. Please try again later."
      });
    }
  };

  // Copy code to clipboard
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), CLIPBOARD_FEEDBACK_DURATION_MS);
  };

  // Fetch audit data if we have reportId but no state data
  useEffect(() => {
    const fetchAuditData = async () => {
      if (preservedAuditResult || stateAuditResult) {
        // Already have data - no need to fetch
        return;
      }

      if (!reportIdFromUrl) {
        // No reportId in URL and no state - redirect to security audit
        navigate('/security-audit', { replace: true });
        return;
      }

      // Fetch audit data using reportId from URL
      setIsLoading(true);
      try {
        const response = await AivedhaAPI.getAuditStatus(reportIdFromUrl);

        if (response.status !== 'completed') {
          // Audit not complete - redirect to security audit page to show progress
          toast({
            title: "Audit In Progress",
            description: "This audit is still running. Redirecting to view progress...",
          });
          navigate(`/security-audit?resume=${reportIdFromUrl}`, { replace: true });
          return;
        }

        // Map API response to AuditResult interface
        const mappedResult: AuditResult = {
          report_id: response.report_id || reportIdFromUrl,
          security_score: response.security_score || 0,
          grade: response.grade || 'N/A',
          vulnerabilities_count: response.vulnerabilities_count || 0,
          critical_issues: response.critical_issues || 0,
          high_issues: response.high_issues || 0,
          medium_issues: response.medium_issues || 0,
          low_issues: response.low_issues || 0,
          info_issues: response.info_issues || 0,
          ssl_status: response.ssl_status || 'Unknown',
          ssl_grade: response.ssl_grade,
          ssl_info: response.ssl_info as SSLInfo | undefined,
          headers_score: response.headers_score || 0,
          security_headers: response.security_headers as SecurityHeadersAnalysis | undefined,
          dns_security: response.dns_security as DNSSecurity | undefined,
          vulnerabilities: (response.vulnerabilities || []).map(v => ({
            type: v.type || 'Unknown',
            severity: v.severity || 'info',
            title: v.title || v.type || 'Issue Found',
            description: v.description || '',
            recommendation: v.recommendation || '',
            owasp_category: v.owasp_category,
            cwe_id: v.cwe_id,
            ai_fix_steps: v.ai_fix_steps,
            ai_enhanced: v.ai_enhanced,
            ai_analysis: v.ai_analysis,
            cvss_score: v.cvss_score,
            cve_id: v.cve_id,
            url: v.url,
            affected_url: v.affected_url,
            affected_urls: v.affected_urls,
            evidence: v.evidence,
            impact: v.impact,
            fix_code: v.fix_code,
            confidence: v.confidence,
            aggregation_count: v.aggregation_count,
          })),
          certificate_number: response.certificate_number,
          pdf_report_url: response.pdf_report_url,
          scan_timestamp: response.scan_timestamp || response.created_at,
          url: response.url,
          // Additional scan data for tabs
          technology_stack: response.technology_stack as string[] | undefined,
          waf_detection: response.waf_detection as WAFDetection | undefined,
          cors_analysis: response.cors_analysis as CORSAnalysis | undefined,
          cloud_security: response.cloud_security as CloudSecurity | undefined,
          subdomain_enumeration: response.subdomain_enumeration as SubdomainEnumeration | undefined,
          sensitive_files: response.sensitive_files as SensitiveFile[] | undefined,
          content_analysis: response.content_analysis as ContentAnalysis | undefined,
        };

        setFetchedAuditResult(mappedResult);
      } catch (error) {
        logger.error('Failed to fetch audit data:', error);
        toast({
          variant: "destructive",
          title: "Failed to Load Report",
          description: "Unable to load audit report. Please try again.",
        });
        navigate('/dashboard', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditData();
  }, [preservedAuditResult, stateAuditResult, reportIdFromUrl, navigate, toast]);

  // Using unified badge utilities from @/lib/badge-utils
  // getScoreColor, getSeverityColors, getGradeBadgeClass, getSSLBadgeClass, getRiskBadgeClass are imported

  const getScoreBg = (score: number) => {
    if (score >= 9) return "from-green-500/20 to-emerald-500/20 border-green-500/30";
    if (score >= 7) return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
    if (score >= 5) return "from-orange-500/20 to-red-500/20 border-orange-500/30";
    return "from-red-500/20 to-rose-500/20 border-red-500/30";
  };

  const getStatusBadge = (score: number) => {
    if (score >= 9) return { label: "SECURE", color: "bg-green-500", icon: ShieldCheck };
    if (score >= 7) return { label: "GOOD", color: "bg-blue-500", icon: Shield };
    if (score >= 5) return { label: "AT RISK", color: "bg-yellow-500", icon: ShieldAlert };
    return { label: "CRITICAL", color: "bg-red-500", icon: AlertCircle };
  };

  // Show loading state when fetching from API
  if (isLoading || (!auditResult && reportIdFromUrl)) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Report...</h2>
            <p className="text-muted-foreground">Fetching your security audit results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!auditResult) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Report Found</h2>
            <p className="text-muted-foreground">Redirecting to security audit page...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const statusBadge = getStatusBadge(auditResult.security_score);
  const StatusIcon = statusBadge.icon;

  // Calculate totals
  const criticalCount = auditResult.critical_issues || 0;
  const highCount = auditResult.high_issues || 0;
  const mediumCount = auditResult.medium_issues || 0;
  const lowCount = auditResult.low_issues || 0;
  const infoCount = auditResult.info_issues || 0;
  const totalIssues = auditResult.vulnerabilities_count || auditResult.vulnerabilities?.length || 0;

  // Tab navigation items
  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'vulnerabilities', label: `Vulnerabilities (${totalIssues})`, icon: Bug },
    { id: 'ssl', label: 'SSL/TLS', icon: Lock },
    { id: 'headers', label: 'Headers', icon: FileText },
    { id: 'dns', label: 'DNS', icon: Network },
    { id: 'waf', label: 'WAF Protection', icon: Shield },
    { id: 'cors', label: 'CORS Policy', icon: Globe },
    { id: 'cloud', label: 'Cloud Security', icon: Server },
    { id: 'subdomains', label: 'Subdomains', icon: Network },
    { id: 'tech', label: 'Technology', icon: Code },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background py-6">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground font-orbitron">
                  Security Audit Report
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Globe className="h-4 w-4" />
                  <span className="truncate max-w-[300px]">{scannedUrl}</span>
                  {auditResult.scan_timestamp && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <Clock className="h-4 w-4" />
                      <span>{new Date(auditResult.scan_timestamp).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Score Card */}
          <Card className={`mb-6 border-2 rounded-3xl overflow-hidden bg-gradient-to-br ${getScoreBg(auditResult.security_score)}`}>
            <CardContent className="p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Score Circle */}
                <div className="flex items-center justify-center lg:justify-start gap-6">
                  <div className="relative">
                    <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm border-4 ${auditResult.security_score >= 7 ? 'border-green-500/50' : auditResult.security_score >= 5 ? 'border-yellow-500/50' : 'border-red-500/50'}`}>
                      <span className={`text-5xl font-bold ${getScoreColor(auditResult.security_score)}`}>
                        {auditResult.security_score.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">out of 10</span>
                    </div>
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1 ${statusBadge.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {statusBadge.label}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className={`text-4xl font-bold ${getGradeBadgeClass(auditResult.grade || 'F')} px-4 py-2 rounded-xl border-2 inline-block mb-2`}>
                      {auditResult.grade || 'F'}
                    </div>
                    <p className="text-muted-foreground text-sm">Security Grade</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-red-500">{criticalCount + highCount}</div>
                    <div className="text-xs text-muted-foreground">Critical/High</div>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-500">{mediumCount}</div>
                    <div className="text-xs text-muted-foreground">Medium</div>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-500">{lowCount + infoCount}</div>
                    <div className="text-xs text-muted-foreground">Low/Info</div>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-foreground">{totalIssues}</div>
                    <div className="text-xs text-muted-foreground">Total Issues</div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-background/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">SSL/TLS</span>
                    </div>
                    <Badge className={getSSLBadgeClass(auditResult.ssl_status)}>
                      {auditResult.ssl_grade || auditResult.ssl_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-background/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      <span className="text-sm">Headers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={auditResult.headers_score} className="w-20 h-2" />
                      <span className="text-sm font-medium">{auditResult.headers_score}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-background/60 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-cyan-500" />
                      <span className="text-sm">Scan Depth</span>
                    </div>
                    <Badge variant="outline">{auditResult.scan_depth || 'Standard'}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Celebration Banner - Shows for high scores or clean results */}
          {(auditResult.security_score >= 8 || (criticalCount === 0 && highCount === 0)) && (
            <Card className="mb-6 rounded-2xl border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 opacity-10">
                  <Sparkles className="w-32 h-32 text-green-500" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                    {auditResult.security_score >= 9 ? (
                      <Trophy className="h-8 w-8 text-green-500" />
                    ) : auditResult.security_score >= 8 ? (
                      <PartyPopper className="h-8 w-8 text-green-500" />
                    ) : (
                      <ShieldCheck className="h-8 w-8 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-green-500 flex items-center gap-2">
                      {auditResult.security_score >= 9 ? (
                        <>
                          <Star className="h-5 w-5 fill-green-500" />
                          Exceptional Security Posture!
                          <Star className="h-5 w-5 fill-green-500" />
                        </>
                      ) : auditResult.security_score >= 8 ? (
                        <>
                          Excellent Security!
                          <Sparkles className="h-5 w-5" />
                        </>
                      ) : criticalCount === 0 && highCount === 0 ? (
                        <>
                          <ThumbsUp className="h-5 w-5" />
                          No Critical Issues Found!
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          Good Security Foundation
                        </>
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {auditResult.security_score >= 9
                        ? "Your website demonstrates industry-leading security practices. Outstanding work!"
                        : auditResult.security_score >= 8
                          ? "Your website has strong security controls in place. Keep up the great work!"
                          : criticalCount === 0 && highCount === 0
                            ? "No critical or high-severity vulnerabilities were detected. Your security baseline is solid."
                            : "Your website shows good security fundamentals. Consider addressing the remaining issues."}
                    </p>
                  </div>
                  {auditResult.security_score >= 8 && (
                    <div className="hidden lg:flex flex-col items-center gap-1">
                      <div className="text-3xl font-bold text-green-500">{auditResult.security_score.toFixed(1)}</div>
                      <div className="text-xs text-green-500/70">Security Score</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Website Properties & Scan Details - Full Width Card */}
          <Card className="mb-6 rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Report ID</p>
                  <p className="font-mono text-sm truncate" title={auditResult.report_id}>{auditResult.report_id.substring(0, 8)}...</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Scan Date</p>
                  <p className="text-sm">{auditResult.scan_timestamp ? new Date(auditResult.scan_timestamp).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Scan Time</p>
                  <p className="text-sm">{auditResult.scan_timestamp ? new Date(auditResult.scan_timestamp).toLocaleTimeString() : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Scan Depth</p>
                  <Badge variant="outline" className="text-xs">{auditResult.scan_depth || 'Standard'}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Scan Version</p>
                  <p className="text-sm">{auditResult.scan_version || 'v3.0'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificate</p>
                  <p className="font-mono text-sm text-primary truncate" title={auditResult.certificate_number}>
                    {auditResult.certificate_number || 'Pending'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation - Responsive wrap */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`rounded-lg text-xs sm:text-sm px-3 py-2 h-auto transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card hover:bg-muted border-border/50'
                  }`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <TabIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vulnerability Distribution Chart */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Vulnerability Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {criticalCount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-purple-500 font-medium">Critical</span>
                          <span>{criticalCount}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div className="progress-bar-dynamic bg-purple-500" style={{ '--progress-width': `${(criticalCount / Math.max(totalIssues, 1)) * 100}%` } as React.CSSProperties}></div>
                        </div>
                      </div>
                    )}
                    {highCount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-500 font-medium">High</span>
                          <span>{highCount}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div className="progress-bar-dynamic bg-red-500" style={{ '--progress-width': `${(highCount / Math.max(totalIssues, 1)) * 100}%` } as React.CSSProperties}></div>
                        </div>
                      </div>
                    )}
                    {mediumCount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-yellow-500 font-medium">Medium</span>
                          <span>{mediumCount}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div className="progress-bar-dynamic bg-yellow-500" style={{ '--progress-width': `${(mediumCount / Math.max(totalIssues, 1)) * 100}%` } as React.CSSProperties}></div>
                        </div>
                      </div>
                    )}
                    {lowCount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-blue-500 font-medium">Low</span>
                          <span>{lowCount}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div className="progress-bar-dynamic bg-blue-500" style={{ '--progress-width': `${(lowCount / Math.max(totalIssues, 1)) * 100}%` } as React.CSSProperties}></div>
                        </div>
                      </div>
                    )}
                    {infoCount > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500 font-medium">Informational</span>
                          <span>{infoCount}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div className="progress-bar-dynamic bg-gray-500" style={{ '--progress-width': `${(infoCount / Math.max(totalIssues, 1)) * 100}%` } as React.CSSProperties}></div>
                        </div>
                      </div>
                    )}
                    {totalIssues === 0 && (
                      <div className="text-center py-8 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 rounded-xl border border-green-500/20">
                        <div className="relative inline-block">
                          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Trophy className="h-10 w-10 text-green-500" />
                          </div>
                          <div className="absolute -top-2 -right-2">
                            <Sparkles className="h-6 w-6 text-yellow-500" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-green-500 flex items-center justify-center gap-2 mb-2">
                          <PartyPopper className="h-5 w-5" />
                          Congratulations!
                          <PartyPopper className="h-5 w-5" />
                        </h3>
                        <p className="text-green-600 font-semibold mb-1">Zero Vulnerabilities Detected!</p>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                          Your website demonstrates excellent security practices. All security checks passed successfully.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Security Overview */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Security Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* SSL Status */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Lock className={`h-5 w-5 ${auditResult.ssl_status === 'Valid' ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                          <p className="font-medium">SSL/TLS Certificate</p>
                          <p className="text-sm text-muted-foreground">{auditResult.ssl_info?.issuer || 'Certificate Details'}</p>
                        </div>
                      </div>
                      {auditResult.ssl_status === 'Valid' ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>

                    {/* Headers Status */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className={`h-5 w-5 ${auditResult.headers_score >= 70 ? 'text-green-500' : auditResult.headers_score >= 40 ? 'text-yellow-500' : 'text-red-500'}`} />
                        <div>
                          <p className="font-medium">Security Headers</p>
                          <p className="text-sm text-muted-foreground">{auditResult.headers_score}% implemented</p>
                        </div>
                      </div>
                      <Progress value={auditResult.headers_score} className="w-24 h-2" />
                    </div>

                    {/* DNS Security */}
                    {auditResult.dns_security && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Network className={`h-5 w-5 ${auditResult.dns_security.dnssec_enabled ? 'text-green-500' : 'text-yellow-500'}`} />
                          <div>
                            <p className="font-medium">DNS Security</p>
                            <p className="text-sm text-muted-foreground">
                              DNSSEC: {auditResult.dns_security.dnssec_enabled ? 'Enabled' : 'Disabled'}
                            </p>
                          </div>
                        </div>
                        {auditResult.dns_security.dnssec_enabled ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        )}
                      </div>
                    )}

                    {/* Sensitive Files */}
                    {(auditResult.sensitive_files_found || 0) > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-3">
                          <FileWarning className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-500">Sensitive Files Exposed</p>
                            <p className="text-sm text-muted-foreground">{auditResult.sensitive_files_found} files found</p>
                          </div>
                        </div>
                        <AlertCircle className="h-6 w-6 text-red-500" />
                      </div>
                    )}

                    {/* Content Analysis Findings */}
                    {auditResult.content_analysis && (
                      <>
                        {(auditResult.content_analysis.exposed_emails?.length || 0) > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-yellow-500" />
                              <div>
                                <p className="font-medium text-yellow-600">Exposed Email Addresses</p>
                                <p className="text-sm text-muted-foreground">{auditResult.content_analysis.exposed_emails?.length} emails found in page source</p>
                              </div>
                            </div>
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                          </div>
                        )}
                        {(auditResult.content_analysis.exposed_api_keys || 0) > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                            <div className="flex items-center gap-3">
                              <Key className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="font-medium text-red-500">Potential API Keys Exposed</p>
                                <p className="text-sm text-muted-foreground">{auditResult.content_analysis.exposed_api_keys} potential keys found</p>
                              </div>
                            </div>
                            <AlertCircle className="h-6 w-6 text-red-500" />
                          </div>
                        )}
                        {(auditResult.content_analysis.forms_without_csrf || 0) > 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                            <div className="flex items-center gap-3">
                              <FileWarning className="h-5 w-5 text-orange-500" />
                              <div>
                                <p className="font-medium text-orange-500">Forms Without CSRF Protection</p>
                                <p className="text-sm text-muted-foreground">{auditResult.content_analysis.forms_without_csrf} forms detected</p>
                              </div>
                            </div>
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* OWASP Top 10 Summary - Always visible */}
              <Card className="rounded-2xl lg:col-span-2 border-2 border-orange-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <ShieldAlert className="h-5 w-5" />
                    OWASP Top 10 (2021) Security Analysis
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Industry-standard web application security risks assessment</p>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // All OWASP Top 10 2021 categories
                    const allOwaspCategories: Record<string, string> = {
                      'A01:2021': 'Broken Access Control',
                      'A02:2021': 'Cryptographic Failures',
                      'A03:2021': 'Injection',
                      'A04:2021': 'Insecure Design',
                      'A05:2021': 'Security Misconfiguration',
                      'A06:2021': 'Vulnerable Components',
                      'A07:2021': 'Authentication Failures',
                      'A08:2021': 'Integrity Failures',
                      'A09:2021': 'Logging Failures',
                      'A10:2021': 'SSRF',
                    };

                    // Calculate found issues per category
                    const foundCategories: Record<string, { count: number; severity: string }> = {};
                    auditResult.vulnerabilities?.forEach(vuln => {
                      if (vuln.owasp_category) {
                        if (!foundCategories[vuln.owasp_category]) {
                          foundCategories[vuln.owasp_category] = { count: 0, severity: vuln.severity };
                        }
                        foundCategories[vuln.owasp_category].count++;
                        const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
                        if (severityOrder.indexOf(vuln.severity) < severityOrder.indexOf(foundCategories[vuln.owasp_category].severity)) {
                          foundCategories[vuln.owasp_category].severity = vuln.severity;
                        }
                      }
                    });

                    const totalIssuesFound = Object.values(foundCategories).reduce((sum, cat) => sum + cat.count, 0);
                    const categoriesWithIssues = Object.keys(foundCategories).length;

                    return (
                      <>
                        {/* Summary Stats */}
                        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-500">{categoriesWithIssues}/10</p>
                            <p className="text-xs text-muted-foreground">Categories Affected</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{totalIssuesFound}</p>
                            <p className="text-xs text-muted-foreground">Total Issues</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-500">{10 - categoriesWithIssues}</p>
                            <p className="text-xs text-muted-foreground">Categories Passed</p>
                          </div>
                        </div>

                        {/* All 10 Categories Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(allOwaspCategories).map(([category, description]) => {
                            const found = foundCategories[category];
                            const hasIssues = found && found.count > 0;

                            const severityColors = hasIssues ? getSeverityColors(found.severity) : null;
                            return (
                              <div key={category} className={`p-3 rounded-lg border flex items-center justify-between ${
                                hasIssues && severityColors
                                  ? `${severityColors.light} ${severityColors.border}`
                                  : 'bg-green-500/5 border-green-500/20'
                              }`}>
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-xs font-bold">{category}</p>
                                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                                </div>
                                {hasIssues && severityColors ? (
                                  <Badge className={`ml-2 text-xs ${severityColors.badgeSolid}`}>
                                    {found.count}
                                  </Badge>
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500 ml-2 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Technology Stack */}
              {auditResult.technology_stack && auditResult.technology_stack.length > 0 && (
                <Card className="rounded-2xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-primary" />
                      Detected Technologies ({auditResult.technology_stack.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                      {auditResult.technology_stack.map((tech, index) => (
                        <Badge key={index} variant="outline" className="px-4 py-2 text-sm rounded-xl break-all">
                          <Server className="h-4 w-4 mr-2 flex-shrink-0" />
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sensitive Files Detail */}
              {auditResult.sensitive_files && auditResult.sensitive_files.length > 0 && (
                <Card className="rounded-2xl lg:col-span-2 border-red-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <FileWarning className="h-5 w-5" />
                      Sensitive Files Detected ({auditResult.sensitive_files.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {auditResult.sensitive_files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            <FileWarning className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-sm break-all">{file.path}</p>
                              <p className="text-xs text-muted-foreground">{file.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">HTTP {file.status}</Badge>
                            <Badge className={getRiskBadgeClass(file.risk)}>
                              {file.risk}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Analysis Detail */}
              {auditResult.content_analysis && auditResult.content_analysis.exposed_emails && auditResult.content_analysis.exposed_emails.length > 0 && (
                <Card className="rounded-2xl lg:col-span-2 border-yellow-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600">
                      <Mail className="h-5 w-5" />
                      Exposed Email Addresses ({auditResult.content_analysis.exposed_emails.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                      {auditResult.content_analysis.exposed_emails.map((email, index) => (
                        <Badge key={index} variant="outline" className="font-mono text-sm break-all">
                          {email}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      These email addresses were found in the page source and may be harvested by spammers.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'vulnerabilities' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-red-500" />
                  Detailed Findings & AI-Powered Remediation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.vulnerabilities && auditResult.vulnerabilities.length > 0 ? (
                  <div className="space-y-4">
                    {auditResult.vulnerabilities.slice(0, visibleVulnCount).map((vuln, index) => {
                      const colors = getSeverityColors(vuln.severity);
                      const isExpanded = expandedVuln === index;
                      return (
                        <div
                          key={index}
                          className={`rounded-2xl border-2 overflow-hidden ${colors.light} ${colors.border}`}
                        >
                          <div
                            className="p-5 cursor-pointer hover:bg-background/50 transition-colors"
                            onClick={() => setExpandedVuln(isExpanded ? null : index)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                  <AlertTriangle className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-foreground text-lg break-words">{vuln.title}</h4>
                                    {vuln.cvss_score && (
                                      <Badge variant="outline" className="text-xs flex-shrink-0">
                                        CVSS: {vuln.cvss_score}
                                      </Badge>
                                    )}
                                    {vuln.cve_id && (
                                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                                        {vuln.cve_id}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={`text-sm text-muted-foreground break-words ${isExpanded ? '' : 'line-clamp-2'}`}>{vuln.description}</p>
                                  {vuln.owasp_category && (
                                    <Badge variant="secondary" className="mt-2 text-xs">
                                      {vuln.owasp_category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <Badge className={`${colors.bg} text-white px-3 py-1`}>
                                  {vuln.severity}
                                </Badge>
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4">
                              {/* Impact Section */}
                              {vuln.impact && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                  <h5 className="font-medium text-red-500 mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Impact
                                  </h5>
                                  <p className="text-foreground">{vuln.impact}</p>
                                </div>
                              )}

                              {/* Evidence Section */}
                              {vuln.evidence && (
                                <div className="p-4 rounded-xl bg-muted">
                                  <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Evidence
                                  </h5>
                                  <pre className="text-sm text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-background p-3 rounded-lg max-h-64 overflow-y-auto">
                                    {vuln.evidence}
                                  </pre>
                                </div>
                              )}

                              {/* Recommendation Section */}
                              {vuln.recommendation && vuln.recommendation.trim() && (
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                                  <h5 className="font-medium text-primary mb-2 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    How to Fix
                                  </h5>
                                  <p className="text-foreground">{vuln.recommendation}</p>
                                </div>
                              )}

                              {/* AI Fix Steps - Properly Formatted */}
                              {vuln.ai_fix_steps && (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                                  <h5 className="font-medium text-purple-500 mb-3 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    AI-Powered Fix Guide
                                  </h5>
                                  <div className="text-foreground max-h-[500px] overflow-y-auto pr-2">
                                    {formatAIText(vuln.ai_fix_steps)}
                                  </div>
                                </div>
                              )}

                              {/* Copy-Paste Code Fix */}
                              {vuln.fix_code && (
                                <div className="p-4 rounded-xl bg-background border">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-foreground flex items-center gap-2">
                                      <Code className="h-4 w-4" />
                                      Code Fix
                                    </h5>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(vuln.fix_code!, index)}
                                    >
                                      {copiedCode === index ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <pre className="text-sm overflow-x-auto bg-muted p-3 rounded-lg max-h-96 overflow-y-auto">
                                    <code>{vuln.fix_code}</code>
                                  </pre>
                                </div>
                              )}

                              {/* Affected URL(s) */}
                              {(vuln.url || vuln.affected_url || (vuln.affected_urls && vuln.affected_urls.length > 0)) && (
                                <div className="text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Globe className="h-4 w-4" />
                                    <span className="font-medium">Affected Location{vuln.affected_urls && vuln.affected_urls.length > 1 ? 's' : ''}:</span>
                                  </div>
                                  {vuln.affected_urls && vuln.affected_urls.length > 0 ? (
                                    <ul className="ml-6 space-y-1 max-h-40 overflow-y-auto">
                                      {vuln.affected_urls.map((url, idx) => (
                                        <li key={idx} className="text-xs break-all">{url}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="ml-6 text-xs break-all">{vuln.url || vuln.affected_url}</span>
                                  )}
                                  {vuln.aggregation_count && vuln.aggregation_count > 1 && (
                                    <div className="ml-6 mt-1 text-xs text-orange-500">
                                      Found {vuln.aggregation_count} instances of this vulnerability
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* CWE ID Badge */}
                              {vuln.cwe_id && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {vuln.cwe_id}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {auditResult.vulnerabilities.length > VULNERABILITIES_PER_PAGE && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Showing {Math.min(visibleVulnCount, auditResult.vulnerabilities.length)} of {auditResult.vulnerabilities.length} vulnerabilities
                        </p>
                        <div className="flex gap-2">
                          {visibleVulnCount < auditResult.vulnerabilities.length && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVisibleVulnCount(prev => Math.min(prev + VULNERABILITIES_PER_PAGE, auditResult.vulnerabilities.length))}
                            >
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Load More
                            </Button>
                          )}
                          {visibleVulnCount > VULNERABILITIES_PER_PAGE && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVisibleVulnCount(VULNERABILITIES_PER_PAGE)}
                            >
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </Button>
                          )}
                          {visibleVulnCount < auditResult.vulnerabilities.length && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setVisibleVulnCount(auditResult.vulnerabilities.length)}
                            >
                              Show All ({auditResult.vulnerabilities.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShieldCheck className="h-20 w-20 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">Congratulations!</h3>
                    <p className="text-muted-foreground">
                      No security vulnerabilities were detected. Your website follows excellent security practices.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'ssl' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-500" />
                  SSL/TLS Certificate Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SSL Status Card */}
                  <div className={`p-6 rounded-2xl ${auditResult.ssl_status === 'Valid' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      {auditResult.ssl_status === 'Valid' ? (
                        <CheckCircle className="h-12 w-12 text-green-500" />
                      ) : (
                        <XCircle className="h-12 w-12 text-red-500" />
                      )}
                      <div>
                        <h3 className="text-xl font-bold">{auditResult.ssl_status}</h3>
                        <p className="text-muted-foreground">Certificate Status</p>
                      </div>
                    </div>
                    <div className={`text-4xl font-bold ${getGradeBadgeClass(auditResult.ssl_grade || 'F')} px-4 py-2 rounded-xl border-2 inline-block`}>
                      {auditResult.ssl_grade || 'N/A'}
                    </div>
                  </div>

                  {/* SSL Details */}
                  <div className="space-y-3">
                    {auditResult.ssl_info?.issuer && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground">Issuer</p>
                        <p className="font-medium">{auditResult.ssl_info.issuer}</p>
                      </div>
                    )}
                    {auditResult.ssl_info?.expires && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p className="font-medium">{auditResult.ssl_info.expires}</p>
                        {auditResult.ssl_info.days_until_expiry !== undefined && (
                          <Badge className={auditResult.ssl_info.days_until_expiry < 30 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}>
                            {auditResult.ssl_info.days_until_expiry} days remaining
                          </Badge>
                        )}
                      </div>
                    )}
                    {auditResult.ssl_info?.protocol && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground">Protocol</p>
                        <p className="font-medium">{auditResult.ssl_info.protocol}</p>
                      </div>
                    )}
                    {auditResult.ssl_info?.key_size && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground">Key Size</p>
                        <p className="font-medium">{auditResult.ssl_info.key_size} bits</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* SSL Vulnerabilities */}
                {auditResult.ssl_info?.vulnerabilities && auditResult.ssl_info.vulnerabilities.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      SSL Vulnerabilities Detected
                    </h4>
                    <div className="space-y-2">
                      {auditResult.ssl_info.vulnerabilities.map((vuln, index) => (
                        <div key={index} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                          <p className="text-foreground">
                            {typeof vuln === 'string' ? vuln : vuln.title || vuln.severity || 'SSL vulnerability detected'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'headers' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    Security Headers Analysis
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{auditResult.headers_score}%</span>
                    <Progress value={auditResult.headers_score} className="w-32 h-3" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {auditResult.security_headers?.headers ? (
                  <div className="space-y-3">
                    {auditResult.security_headers.headers.map((header, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${
                          header.status === 'good' ? 'bg-green-500/10 border-green-500/30' :
                          header.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {header.status === 'good' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : header.status === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">{header.name}</span>
                          </div>
                          <Badge variant={header.present ? "default" : "destructive"}>
                            {header.present ? 'Present' : 'Missing'}
                          </Badge>
                        </div>
                        {header.value && (
                          <code className="text-xs bg-background p-2 rounded block break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {header.value}
                          </code>
                        )}
                        {header.recommendation && (
                          <p className="text-sm text-muted-foreground mt-2">{header.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed header analysis not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'dns' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-cyan-500" />
                  DNS Security Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.dns_security ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* DNSSEC Status */}
                    <div className={`p-6 rounded-2xl ${auditResult.dns_security.dnssec_enabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                      <div className="flex items-center gap-4">
                        {auditResult.dns_security.dnssec_enabled ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-10 w-10 text-yellow-500" />
                        )}
                        <div>
                          <h3 className="font-bold text-lg">DNSSEC</h3>
                          <p className="text-muted-foreground">
                            {auditResult.dns_security.dnssec_enabled ? 'Enabled' : 'Not Enabled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email Security */}
                    <div className="space-y-3">
                      {auditResult.dns_security.spf_record && (
                        <div className="p-3 rounded-xl bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-green-500" />
                            <span className="font-medium">SPF Record</span>
                          </div>
                          <code className="text-xs text-muted-foreground block break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {auditResult.dns_security.spf_record}
                          </code>
                        </div>
                      )}
                      {auditResult.dns_security.dmarc_record && (
                        <div className="p-3 rounded-xl bg-muted/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span className="font-medium">DMARC Record</span>
                          </div>
                          <code className="text-xs text-muted-foreground block break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {auditResult.dns_security.dmarc_record}
                          </code>
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Key className="h-4 w-4" />
                          <span className="font-medium">DKIM</span>
                        </div>
                        <Badge variant={auditResult.dns_security.dkim_configured ? "default" : "destructive"}>
                          {auditResult.dns_security.dkim_configured ? 'Configured' : 'Not Found'}
                        </Badge>
                      </div>
                    </div>

                    {/* DNS Records */}
                    {auditResult.dns_security.mx_records && auditResult.dns_security.mx_records.length > 0 && (
                      <div className="md:col-span-2 p-4 rounded-xl bg-muted/50">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          MX Records
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {auditResult.dns_security.mx_records.map((mx, index) => (
                            <Badge key={index} variant="outline">{mx}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DNS Issues */}
                    {auditResult.dns_security.issues && auditResult.dns_security.issues.length > 0 && (
                      <div className="md:col-span-2">
                        <h4 className="font-medium text-red-500 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          DNS Security Issues
                        </h4>
                        <div className="space-y-2">
                          {auditResult.dns_security.issues.map((issue, index) => (
                            <div key={index} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-foreground">{issue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>DNS security analysis not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WAF Detection Tab */}
          {activeTab === 'waf' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Web Application Firewall (WAF) Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.waf_detection ? (
                  <div className="space-y-6">
                    {/* WAF Status */}
                    <div className={`p-6 rounded-2xl ${auditResult.waf_detection.detected ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                      <div className="flex items-center gap-4">
                        {auditResult.waf_detection.detected ? (
                          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-green-500" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <ShieldAlert className="h-8 w-8 text-yellow-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-xl">
                            {auditResult.waf_detection.detected ? 'WAF Protection Active' : 'No WAF Detected'}
                          </h3>
                          {auditResult.waf_detection.waf_name && (
                            <p className="text-lg text-primary font-medium">{auditResult.waf_detection.waf_name}</p>
                          )}
                          <p className="text-muted-foreground">
                            {auditResult.waf_detection.detected
                              ? 'Your website is protected by a Web Application Firewall, providing defense-in-depth against OWASP Top 10 threats.'
                              : 'Consider implementing a WAF solution for enhanced protection against SQL injection, XSS, and other web attacks.'}
                          </p>
                          {auditResult.waf_detection.confidence && (
                            <Badge className="mt-2" variant="outline">
                              Detection Confidence: {auditResult.waf_detection.confidence}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* WAF Benefits Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/50">
                        <Zap className="h-6 w-6 text-primary mb-2" />
                        <h4 className="font-semibold">Attack Mitigation</h4>
                        <p className="text-sm text-muted-foreground">WAFs filter malicious traffic before it reaches your application</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50">
                        <Shield className="h-6 w-6 text-primary mb-2" />
                        <h4 className="font-semibold">DDoS Protection</h4>
                        <p className="text-sm text-muted-foreground">Many WAFs include rate limiting and DDoS mitigation</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50">
                        <Eye className="h-6 w-6 text-primary mb-2" />
                        <h4 className="font-semibold">Threat Visibility</h4>
                        <p className="text-sm text-muted-foreground">Real-time insights into attack patterns and blocked threats</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>WAF detection analysis not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CORS Analysis Tab */}
          {activeTab === 'cors' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Cross-Origin Resource Sharing (CORS) Policy Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.cors_analysis ? (
                  <div className="space-y-6">
                    {/* CORS Status */}
                    <div className={`p-6 rounded-2xl ${
                      !auditResult.cors_analysis.cors_configured
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : auditResult.cors_analysis.allow_origin === '*'
                          ? 'bg-yellow-500/10 border border-yellow-500/30'
                          : 'bg-green-500/10 border border-green-500/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          !auditResult.cors_analysis.cors_configured
                            ? 'bg-blue-500/20'
                            : auditResult.cors_analysis.allow_origin === '*'
                              ? 'bg-yellow-500/20'
                              : 'bg-green-500/20'
                        }`}>
                          <Globe className={`h-8 w-8 ${
                            !auditResult.cors_analysis.cors_configured
                              ? 'text-blue-500'
                              : auditResult.cors_analysis.allow_origin === '*'
                                ? 'text-yellow-500'
                                : 'text-green-500'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">
                            {!auditResult.cors_analysis.cors_configured
                              ? 'CORS Not Configured'
                              : auditResult.cors_analysis.allow_origin === '*'
                                ? 'Permissive CORS Policy'
                                : 'CORS Policy Configured'}
                          </h3>
                          <p className="text-muted-foreground">
                            {!auditResult.cors_analysis.cors_configured
                              ? 'No CORS headers detected. Cross-origin requests are handled by browser same-origin policy.'
                              : auditResult.cors_analysis.allow_origin === '*'
                                ? 'Wildcard origin (*) allows any website to make requests. Review if this is intentional.'
                                : 'CORS policy is configured to restrict cross-origin access.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CORS Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground mb-1">Access-Control-Allow-Origin</p>
                        <code className="text-foreground font-mono">
                          {auditResult.cors_analysis.allow_origin || 'Not Set'}
                        </code>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/50">
                        <p className="text-sm text-muted-foreground mb-1">Allow Credentials</p>
                        <Badge variant={auditResult.cors_analysis.allow_credentials ? "destructive" : "outline"}>
                          {auditResult.cors_analysis.allow_credentials ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {auditResult.cors_analysis.allow_credentials && auditResult.cors_analysis.allow_origin === '*' && (
                          <p className="text-xs text-red-500 mt-1">⚠️ Credentials with wildcard origin is a security risk</p>
                        )}
                      </div>
                    </div>

                    {/* CORS Best Practices */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold text-primary mb-2">CORS Security Best Practices</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Avoid using wildcard (*) when credentials are enabled</li>
                        <li>• Specify explicit allowed origins instead of reflecting the Origin header</li>
                        <li>• Never allow 'null' as a valid origin</li>
                        <li>• Review exposed headers and methods carefully</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>CORS analysis not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cloud Security Tab */}
          {activeTab === 'cloud' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-500" />
                  Cloud Security & Infrastructure Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.cloud_security ? (
                  <div className="space-y-6">
                    {/* Cloud Resources Status */}
                    <div className={`p-6 rounded-2xl ${
                      (auditResult.cloud_security.s3_buckets?.length || 0) === 0 &&
                      (auditResult.cloud_security.azure_blobs?.length || 0) === 0
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-blue-500/10 border border-blue-500/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          (auditResult.cloud_security.s3_buckets?.length || 0) === 0 &&
                          (auditResult.cloud_security.azure_blobs?.length || 0) === 0
                            ? 'bg-green-500/20'
                            : 'bg-blue-500/20'
                        }`}>
                          <Server className={`h-8 w-8 ${
                            (auditResult.cloud_security.s3_buckets?.length || 0) === 0 &&
                            (auditResult.cloud_security.azure_blobs?.length || 0) === 0
                              ? 'text-green-500'
                              : 'text-blue-500'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">
                            {(auditResult.cloud_security.cloud_resources_found?.length || 0) === 0
                              ? 'No Exposed Cloud Resources'
                              : `${auditResult.cloud_security.cloud_resources_found?.length} Cloud Resources Found`}
                          </h3>
                          <p className="text-muted-foreground">
                            {(auditResult.cloud_security.cloud_resources_found?.length || 0) === 0
                              ? 'No publicly accessible cloud storage buckets or SSRF indicators detected.'
                              : 'Cloud storage references found in your website. Review for proper access controls.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* S3 Buckets */}
                    {auditResult.cloud_security.s3_buckets && auditResult.cloud_security.s3_buckets.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Database className="h-5 w-5 text-orange-500" />
                          AWS S3 Buckets Referenced ({auditResult.cloud_security.s3_buckets.length})
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 -m-2">
                          {auditResult.cloud_security.s3_buckets.map((bucket, index) => (
                            <Badge key={index} variant="outline" className="font-mono break-all">
                              s3://{bucket}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Azure Blobs */}
                    {auditResult.cloud_security.azure_blobs && auditResult.cloud_security.azure_blobs.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-500" />
                          Azure Blob Storage Referenced ({auditResult.cloud_security.azure_blobs.length})
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 -m-2">
                          {auditResult.cloud_security.azure_blobs.map((blob, index) => (
                            <Badge key={index} variant="outline" className="font-mono break-all">
                              {blob}.blob.core.windows.net
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cloud Security Tips */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold text-primary mb-2">Cloud Security Recommendations</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Enable S3 Block Public Access on all buckets</li>
                        <li>• Use IAM policies to restrict bucket access</li>
                        <li>• Enable encryption at rest for sensitive data</li>
                        <li>• Implement IMDSv2 to prevent SSRF attacks</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-500 mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">No exposed cloud resources or misconfigurations detected.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subdomain Enumeration Tab */}
          {activeTab === 'subdomains' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-teal-500" />
                  Subdomain Security & Takeover Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.subdomain_enumeration ? (
                  <div className="space-y-6">
                    {/* Subdomain Status */}
                    <div className={`p-6 rounded-2xl ${
                      (auditResult.subdomain_enumeration.takeover_vulnerable?.length || 0) === 0
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          (auditResult.subdomain_enumeration.takeover_vulnerable?.length || 0) === 0
                            ? 'bg-green-500/20'
                            : 'bg-red-500/20'
                        }`}>
                          {(auditResult.subdomain_enumeration.takeover_vulnerable?.length || 0) === 0 ? (
                            <ShieldCheck className="h-8 w-8 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">
                            {(auditResult.subdomain_enumeration.takeover_vulnerable?.length || 0) === 0
                              ? 'No Subdomain Takeover Risks'
                              : `${auditResult.subdomain_enumeration.takeover_vulnerable?.length} Vulnerable Subdomains`}
                          </h3>
                          <p className="text-muted-foreground">
                            {(auditResult.subdomain_enumeration.takeover_vulnerable?.length || 0) === 0
                              ? 'All enumerated subdomains are properly configured with no dangling DNS records.'
                              : 'Dangling DNS records detected. These subdomains may be vulnerable to takeover attacks.'}
                          </p>
                          {auditResult.subdomain_enumeration.subdomains_found && (
                            <Badge className="mt-2" variant="outline">
                              {auditResult.subdomain_enumeration.subdomains_found.length} subdomains discovered
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vulnerable Subdomains */}
                    {auditResult.subdomain_enumeration.takeover_vulnerable && auditResult.subdomain_enumeration.takeover_vulnerable.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Subdomain Takeover Vulnerabilities
                        </h4>
                        <div className="space-y-3">
                          {auditResult.subdomain_enumeration.takeover_vulnerable.map((item, index) => (
                            <div key={index} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-mono font-medium text-red-500">{item.subdomain}</p>
                                  <p className="text-sm text-muted-foreground">CNAME: {item.cname}</p>
                                </div>
                                <Badge variant="destructive">{item.service}</Badge>
                              </div>
                              <p className="text-sm mt-2">
                                This subdomain points to an unclaimed resource on {item.service}. An attacker could claim it.
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Discovered Subdomains */}
                    {auditResult.subdomain_enumeration.subdomains_found && auditResult.subdomain_enumeration.subdomains_found.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Globe className="h-5 w-5 text-teal-500" />
                          Discovered Subdomains ({auditResult.subdomain_enumeration.subdomains_found.length})
                        </h4>
                        <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto p-2 -m-2">
                          {auditResult.subdomain_enumeration.subdomains_found.map((subdomain, index) => (
                            <Badge key={index} variant="outline" className="font-mono break-all">
                              {subdomain}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subdomain Security Tips */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold text-primary mb-2">Subdomain Security Best Practices</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Remove DNS records for decommissioned services</li>
                        <li>• Regularly audit CNAME records pointing to third-party services</li>
                        <li>• Implement subdomain monitoring for unauthorized changes</li>
                        <li>• Use wildcard certificates cautiously</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="h-10 w-10 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-500 mb-2">Subdomain Analysis Complete</h3>
                    <p className="text-muted-foreground">No subdomain takeover vulnerabilities detected.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'tech' && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-cyan-500" />
                  Technology Stack & Fingerprinting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.technology_stack && auditResult.technology_stack.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {auditResult.technology_stack.map((tech, index) => (
                      <div key={index} className="p-4 rounded-xl bg-muted/50 text-center hover:bg-muted transition-colors">
                        <Server className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium">{tech}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No technologies detected or analysis not available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          {/* Check if PDF is a real PDF file (not JSON) */}
          {(() => {
            const hasPdf = auditResult.pdf_report_url && auditResult.pdf_report_url.includes('.pdf');
            const hasCertificate = auditResult.certificate_number && auditResult.certificate_number.trim().length > 0;
            return (
          <div className="flex flex-wrap gap-4 justify-center mt-8 mb-4">
            <Button
              size="lg"
              className={`border-2 rounded-xl px-8 transition-all duration-300 ${
                hasPdf
                  ? "border-green-500 bg-green-500 text-white hover:bg-background hover:text-green-500 hover:border-green-500"
                  : "border-gray-400 bg-gray-400 text-white cursor-not-allowed opacity-60"
              }`}
              onClick={handleDownloadPdf}
              disabled={!hasPdf}
              title={hasPdf ? "Download PDF Report" : "PDF not yet generated for this audit"}
            >
              <Download className="h-5 w-5 mr-2" />
              {hasPdf ? "Download Full PDF Report" : "PDF Not Available"}
            </Button>
            {hasCertificate && (
              <Link to={`/certificate/${auditResult.certificate_number}`}>
                <Button variant="outline" size="lg" className="rounded-xl">
                  <Award className="h-5 w-5 mr-2" />
                  View Security Certificate
                </Button>
              </Link>
            )}
            <Link to="/security-audit">
              <Button variant="default" size="lg" className="rounded-xl">
                <Search className="h-5 w-5 mr-2" />
                Run New Audit
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg" className="rounded-xl">
                <ExternalLink className="h-5 w-5 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
            );
          })()}

          {/* Security Badge Section */}
          {auditResult.certificate_number && auditResult.security_score >= 5 && (
            <Card className="rounded-2xl mt-8 border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Security Trust Badge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Display this security badge on your website to show visitors that your site has been security audited.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Badge Preview */}
                  <div className="p-6 rounded-xl bg-muted/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                        <div className="text-center">
                          <ShieldCheck className="h-10 w-10 text-white mx-auto mb-1" />
                          <div className="text-white font-bold text-lg">{auditResult.grade}</div>
                        </div>
                      </div>
                      <p className="text-sm font-medium">AiVedha Security Verified</p>
                      <p className="text-xs text-muted-foreground">Grade {auditResult.grade} • Score {auditResult.security_score.toFixed(1)}/10</p>
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">HTML Embed Code</label>
                      <div className="relative">
                        <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto">
{`<a href="https://aivedha.ai/verify/${auditResult.certificate_number}" target="_blank" rel="noopener">
  <img src="https://api.aivedha.ai/api/badge/${auditResult.certificate_number}?variant=full&theme=dark"
       alt="AiVedha Security Verified"
       style="height: 80px;" />
</a>`}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            navigator.clipboard.writeText(`<a href="https://aivedha.ai/verify/${auditResult.certificate_number}" target="_blank" rel="noopener"><img src="https://api.aivedha.ai/api/badge/${auditResult.certificate_number}?variant=full&theme=dark" alt="AiVedha Security Verified" style="height: 80px;" /></a>`);
                            toast({ title: "Copied!", description: "Badge embed code copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">
                        <strong>Verification URL:</strong>{" "}
                        <a href={`https://aivedha.ai/verify/${auditResult.certificate_number}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          https://aivedha.ai/verify/{auditResult.certificate_number}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Info Footer */}
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>Report ID: {auditResult.report_id} • Scan Version: {auditResult.scan_version || '3.0.0'}</p>
            {auditResult.certificate_number && (
              <p>Certificate: {auditResult.certificate_number}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
