import { motion } from "framer-motion";
import {
  Shield, Lock, Globe, Server, FileWarning, Code,
  Database, Cookie, Search, Cloud, AlertTriangle,
  Network, Bug, Eye, Zap, Key, Fingerprint,
  ShieldCheck, Cpu, Award, ChevronRight, CheckCircle2,
  FileCode, Bot, Scan, Radio, Link2, Layers, CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

interface SecurityCheck {
  name: string;
  description: string;
}

interface SecurityModule {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  checkCount: number;
  checks: SecurityCheck[];
}

const securityModules: SecurityModule[] = [
  {
    id: 1,
    title: "SSL/TLS Analysis",
    description: "Comprehensive SSL certificate and TLS protocol security assessment to ensure encrypted communications.",
    icon: Lock,
    color: "text-green-500",
    bgGradient: "from-green-500/20 to-emerald-500/20",
    checkCount: 12,
    checks: [
      { name: "Certificate Validity", description: "Verify certificate expiration and validity period" },
      { name: "Certificate Chain", description: "Validate complete certificate chain integrity" },
      { name: "Protocol Version", description: "Check TLS 1.2/1.3 support and deprecated protocols" },
      { name: "Cipher Suites", description: "Analyze cipher strength and weak cipher detection" },
      { name: "Key Exchange", description: "Verify secure key exchange algorithms" },
      { name: "Certificate Authority", description: "Validate trusted CA and certificate transparency" },
      { name: "HSTS Preload", description: "Check HTTP Strict Transport Security preload status" },
      { name: "Mixed Content", description: "Detect insecure HTTP resources on HTTPS pages" },
      { name: "Certificate Pinning", description: "Check for public key pinning implementation" },
      { name: "OCSP Stapling", description: "Verify Online Certificate Status Protocol stapling" },
      { name: "Forward Secrecy", description: "Ensure perfect forward secrecy support" },
      { name: "Heartbleed Check", description: "Test for Heartbleed vulnerability" }
    ]
  },
  {
    id: 2,
    title: "Security Headers",
    description: "Analysis of 10 critical HTTP security headers that protect against common web vulnerabilities.",
    icon: Shield,
    color: "text-blue-500",
    bgGradient: "from-blue-500/20 to-indigo-500/20",
    checkCount: 10,
    checks: [
      { name: "Strict-Transport-Security", description: "Enforce HTTPS connections" },
      { name: "Content-Security-Policy", description: "Prevent XSS and injection attacks" },
      { name: "X-Frame-Options", description: "Protect against clickjacking" },
      { name: "X-Content-Type-Options", description: "Prevent MIME type sniffing" },
      { name: "X-XSS-Protection", description: "Enable browser XSS filtering" },
      { name: "Referrer-Policy", description: "Control referrer information leakage" },
      { name: "Permissions-Policy", description: "Control browser feature access" },
      { name: "Cache-Control", description: "Prevent sensitive data caching" },
      { name: "X-Permitted-Cross-Domain-Policies", description: "Control cross-domain policies" },
      { name: "Clear-Site-Data", description: "Clear browsing data on logout" }
    ]
  },
  {
    id: 3,
    title: "DNS Security",
    description: "Complete DNS security audit including email authentication and domain protection mechanisms.",
    icon: Globe,
    color: "text-purple-500",
    bgGradient: "from-purple-500/20 to-violet-500/20",
    checkCount: 8,
    checks: [
      { name: "SPF Record", description: "Sender Policy Framework for email authentication" },
      { name: "DMARC Policy", description: "Domain-based Message Authentication reporting" },
      { name: "DKIM Signature", description: "DomainKeys Identified Mail verification" },
      { name: "DNSSEC Validation", description: "DNS Security Extensions implementation" },
      { name: "CAA Records", description: "Certificate Authority Authorization" },
      { name: "MX Record Security", description: "Mail exchange configuration analysis" },
      { name: "DNS Zone Transfer", description: "Check for unauthorized zone transfers" },
      { name: "Subdomain Enumeration", description: "Discover and audit subdomains" }
    ]
  },
  {
    id: 4,
    title: "Cookie Security",
    description: "Audit session management and cookie security attributes to prevent session hijacking.",
    icon: Cookie,
    color: "text-amber-500",
    bgGradient: "from-amber-500/20 to-orange-500/20",
    checkCount: 8,
    checks: [
      { name: "Secure Flag", description: "Ensure cookies transmitted over HTTPS only" },
      { name: "HttpOnly Flag", description: "Prevent JavaScript access to cookies" },
      { name: "SameSite Attribute", description: "Protect against CSRF via cookies" },
      { name: "Cookie Expiration", description: "Validate appropriate session timeouts" },
      { name: "Session ID Strength", description: "Analyze session token randomness" },
      { name: "Cookie Prefix", description: "Check __Secure- and __Host- prefixes" },
      { name: "Third-Party Cookies", description: "Identify cross-site tracking cookies" },
      { name: "Cookie Scope", description: "Verify domain and path restrictions" }
    ]
  },
  {
    id: 5,
    title: "Form Security",
    description: "Comprehensive form analysis for input validation, CSRF protection, and secure submission.",
    icon: FileCode,
    color: "text-cyan-500",
    bgGradient: "from-cyan-500/20 to-teal-500/20",
    checkCount: 10,
    checks: [
      { name: "CSRF Tokens", description: "Verify anti-forgery token implementation" },
      { name: "Input Validation", description: "Check client and server-side validation" },
      { name: "Autocomplete Settings", description: "Sensitive field autocomplete disabled" },
      { name: "Password Fields", description: "Secure password input handling" },
      { name: "Form Action URLs", description: "Validate secure form submission endpoints" },
      { name: "Hidden Field Analysis", description: "Check for sensitive data in hidden fields" },
      { name: "File Upload Security", description: "Validate file upload restrictions" },
      { name: "Rate Limiting", description: "Check for form submission rate limiting" },
      { name: "CAPTCHA Implementation", description: "Verify bot protection mechanisms" },
      { name: "Input Encoding", description: "Check for proper character encoding" }
    ]
  },
  {
    id: 6,
    title: "JavaScript Security",
    description: "Analyze JavaScript code for vulnerabilities, unsafe practices, and third-party risks.",
    icon: Code,
    color: "text-yellow-500",
    bgGradient: "from-yellow-500/20 to-lime-500/20",
    checkCount: 12,
    checks: [
      { name: "eval() Usage", description: "Detect dangerous eval function calls" },
      { name: "innerHTML Assignment", description: "Find DOM-based XSS vulnerabilities" },
      { name: "document.write", description: "Identify insecure document manipulation" },
      { name: "External Scripts", description: "Audit third-party JavaScript sources" },
      { name: "SRI Integrity", description: "Verify Subresource Integrity hashes" },
      { name: "localStorage Security", description: "Check for sensitive data in storage" },
      { name: "PostMessage Handlers", description: "Analyze cross-origin messaging" },
      { name: "Prototype Pollution", description: "Detect prototype manipulation risks" },
      { name: "Dependency Analysis", description: "Check for known vulnerable libraries" },
      { name: "Source Map Exposure", description: "Detect exposed source maps" },
      { name: "Console Logging", description: "Find sensitive data in console logs" },
      { name: "JSONP Callbacks", description: "Analyze JSONP security risks" }
    ]
  },
  {
    id: 7,
    title: "Sensitive File Scanning",
    description: "80+ file probes to discover exposed configuration files, backups, secrets, and sensitive documents on your server.",
    icon: FileWarning,
    color: "text-red-500",
    bgGradient: "from-red-500/20 to-rose-500/20",
    checkCount: 80,
    checks: [
      { name: "Environment Files", description: ".env, .env.local, .env.production, .env.development" },
      { name: "Git Exposure", description: ".git/config, .git/HEAD, .gitignore, .gitattributes" },
      { name: "Version Control", description: ".svn/entries, .hg/hgrc, .bzr/README" },
      { name: "Backup Files", description: ".bak, .old, .backup, .save, ~, .copy files" },
      { name: "Config Files", description: "wp-config.php, config.php, settings.php, config.json" },
      { name: "Debug & Logs", description: "debug.log, error.log, access.log, app.log" },
      { name: "Database Files", description: ".sql, .dump, .db, database.sqlite, db.json" },
      { name: "Private Keys", description: "id_rsa, id_dsa, .pem, .key, server.key files" },
      { name: "Admin Panels", description: "/admin, /administrator, /wp-admin, /cpanel" },
      { name: "Server Info", description: "phpinfo.php, info.php, test.php, server-status" },
      { name: "Package Managers", description: "composer.json, package.json, yarn.lock, Gemfile" },
      { name: "CI/CD Files", description: ".travis.yml, .gitlab-ci.yml, Jenkinsfile, .circleci" },
      { name: "Docker Files", description: "Dockerfile, docker-compose.yml, .dockerenv" },
      { name: "IDE & Editor", description: ".idea/, .vscode/, .sublime-project, .project" },
      { name: "Cloud Configs", description: "aws.json, firebase.json, .gcloud, azure.json" },
      { name: "API Documentation", description: "swagger.json, openapi.yaml, api-docs/" },
      { name: "Secrets & Tokens", description: ".htpasswd, credentials.json, secrets.yaml" },
      { name: "Archive Files", description: "backup.zip, backup.tar.gz, site.rar, dump.7z" },
      { name: "Build Artifacts", description: "dist/, build/, node_modules/, vendor/" },
      { name: "CMS Specific", description: "wp-config.php.bak, configuration.php, local.xml" }
    ]
  },
  {
    id: 8,
    title: "API Security",
    description: "Comprehensive API endpoint security testing including authentication and rate limiting.",
    icon: Server,
    color: "text-indigo-500",
    bgGradient: "from-indigo-500/20 to-blue-500/20",
    checkCount: 10,
    checks: [
      { name: "Authentication Methods", description: "Verify secure API authentication" },
      { name: "Authorization Checks", description: "Test access control enforcement" },
      { name: "Rate Limiting", description: "Check API rate limit implementation" },
      { name: "Input Validation", description: "Test API input sanitization" },
      { name: "Error Handling", description: "Analyze API error message security" },
      { name: "CORS Configuration", description: "Verify cross-origin API policies" },
      { name: "API Versioning", description: "Check for deprecated API versions" },
      { name: "Sensitive Data Exposure", description: "Detect PII in API responses" },
      { name: "GraphQL Security", description: "Test GraphQL-specific vulnerabilities" },
      { name: "REST Security", description: "Analyze RESTful API security practices" }
    ]
  },
  {
    id: 9,
    title: "CMS Fingerprinting",
    description: "Identify content management systems and their versions to check for known vulnerabilities.",
    icon: Fingerprint,
    color: "text-pink-500",
    bgGradient: "from-pink-500/20 to-rose-500/20",
    checkCount: 8,
    checks: [
      { name: "CMS Detection", description: "Identify WordPress, Drupal, Joomla, etc." },
      { name: "Version Detection", description: "Determine exact CMS version" },
      { name: "Plugin Enumeration", description: "List installed plugins/extensions" },
      { name: "Theme Detection", description: "Identify themes and templates" },
      { name: "Known CVEs", description: "Check for known vulnerabilities" },
      { name: "Default Files", description: "Find default installation files" },
      { name: "Admin Endpoints", description: "Discover CMS admin interfaces" },
      { name: "Update Status", description: "Check if CMS is up to date" }
    ]
  },
  {
    id: 10,
    title: "WAF Detection",
    description: "Detect Web Application Firewall presence and analyze its configuration effectiveness.",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bgGradient: "from-emerald-500/20 to-green-500/20",
    checkCount: 6,
    checks: [
      { name: "WAF Presence", description: "Detect if WAF is deployed" },
      { name: "WAF Vendor", description: "Identify WAF provider (Cloudflare, AWS, etc.)" },
      { name: "Rule Analysis", description: "Test WAF rule effectiveness" },
      { name: "Bypass Testing", description: "Check for common WAF bypasses" },
      { name: "Rate Limiting", description: "Verify WAF rate limit rules" },
      { name: "Bot Protection", description: "Test bot detection capabilities" }
    ]
  },
  {
    id: 11,
    title: "CORS Analysis",
    description: "Validate Cross-Origin Resource Sharing policies to prevent unauthorized data access.",
    icon: Link2,
    color: "text-sky-500",
    bgGradient: "from-sky-500/20 to-blue-500/20",
    checkCount: 7,
    checks: [
      { name: "Allow-Origin Header", description: "Check Access-Control-Allow-Origin" },
      { name: "Credentials Support", description: "Verify credentials handling policy" },
      { name: "Allowed Methods", description: "Review permitted HTTP methods" },
      { name: "Allowed Headers", description: "Check custom header permissions" },
      { name: "Preflight Caching", description: "Analyze preflight cache duration" },
      { name: "Wildcard Usage", description: "Detect insecure wildcard origins" },
      { name: "Null Origin", description: "Check for null origin vulnerabilities" }
    ]
  },
  {
    id: 12,
    title: "Cloud Security",
    description: "Analyze cloud infrastructure security including S3 buckets, Azure blobs, and GCP storage.",
    icon: Cloud,
    color: "text-blue-400",
    bgGradient: "from-blue-400/20 to-cyan-400/20",
    checkCount: 9,
    checks: [
      { name: "S3 Bucket Permissions", description: "Check AWS S3 bucket access" },
      { name: "Azure Blob Security", description: "Analyze Azure storage permissions" },
      { name: "GCP Storage", description: "Check Google Cloud storage settings" },
      { name: "Public Access", description: "Detect publicly accessible resources" },
      { name: "Bucket Enumeration", description: "Discover related storage buckets" },
      { name: "IAM Misconfigurations", description: "Check for overly permissive IAM" },
      { name: "CloudFront/CDN", description: "Analyze CDN security settings" },
      { name: "Serverless Functions", description: "Check Lambda/Functions exposure" },
      { name: "Container Security", description: "Analyze container registry access" }
    ]
  },
  {
    id: 13,
    title: "XSS Detection",
    description: "Comprehensive Cross-Site Scripting vulnerability detection across all injection points.",
    icon: Bug,
    color: "text-orange-500",
    bgGradient: "from-orange-500/20 to-amber-500/20",
    checkCount: 8,
    checks: [
      { name: "Reflected XSS", description: "Test for reflected XSS in parameters" },
      { name: "Stored XSS", description: "Detect persistent XSS vulnerabilities" },
      { name: "DOM-based XSS", description: "Find client-side XSS vulnerabilities" },
      { name: "Input Reflection", description: "Analyze input echo behavior" },
      { name: "Encoding Bypass", description: "Test encoding bypass techniques" },
      { name: "Context Analysis", description: "Check HTML/JS/URL context escaping" },
      { name: "Template Injection", description: "Detect template engine XSS" },
      { name: "SVG/XML XSS", description: "Test for XSS in XML formats" }
    ]
  },
  {
    id: 14,
    title: "SQL Injection Detection",
    description: "Detect SQL injection vulnerabilities in database queries and API endpoints.",
    icon: Database,
    color: "text-violet-500",
    bgGradient: "from-violet-500/20 to-purple-500/20",
    checkCount: 8,
    checks: [
      { name: "Error-based SQLi", description: "Detect SQL errors in responses" },
      { name: "Boolean-based Blind", description: "Test boolean-based blind SQLi" },
      { name: "Time-based Blind", description: "Detect time-based SQL injection" },
      { name: "Union-based SQLi", description: "Test UNION query injection" },
      { name: "Stacked Queries", description: "Check for stacked query support" },
      { name: "Second-order SQLi", description: "Detect stored SQL injection" },
      { name: "NoSQL Injection", description: "Test MongoDB/NoSQL injection" },
      { name: "ORM Bypass", description: "Check for ORM layer bypasses" }
    ]
  },
  {
    id: 15,
    title: "CSRF Detection",
    description: "Identify Cross-Site Request Forgery vulnerabilities in state-changing operations.",
    icon: Zap,
    color: "text-yellow-600",
    bgGradient: "from-yellow-600/20 to-amber-600/20",
    checkCount: 6,
    checks: [
      { name: "Token Presence", description: "Check for CSRF token implementation" },
      { name: "Token Validation", description: "Test CSRF token verification" },
      { name: "SameSite Cookies", description: "Verify SameSite attribute protection" },
      { name: "Referer Validation", description: "Check referer header validation" },
      { name: "State-changing GET", description: "Detect unsafe GET requests" },
      { name: "Custom Headers", description: "Test custom header requirements" }
    ]
  },
  {
    id: 16,
    title: "Open Redirect Detection",
    description: "Find unvalidated redirect vulnerabilities that could enable phishing attacks.",
    icon: AlertTriangle,
    color: "text-red-400",
    bgGradient: "from-red-400/20 to-orange-400/20",
    checkCount: 5,
    checks: [
      { name: "Parameter Analysis", description: "Test redirect parameters" },
      { name: "URL Validation", description: "Check redirect URL validation" },
      { name: "Protocol Bypass", description: "Test protocol-based bypasses" },
      { name: "Encoding Bypass", description: "Check URL encoding bypasses" },
      { name: "Header Injection", description: "Test Location header injection" }
    ]
  },
  {
    id: 17,
    title: "Clickjacking Detection",
    description: "Test for UI redressing attacks that trick users into clicking hidden elements.",
    icon: Layers,
    color: "text-slate-500",
    bgGradient: "from-slate-500/20 to-gray-500/20",
    checkCount: 5,
    checks: [
      { name: "X-Frame-Options", description: "Check frame protection header" },
      { name: "CSP frame-ancestors", description: "Verify CSP frame directive" },
      { name: "Frame Busting", description: "Test JavaScript frame busting" },
      { name: "Double Framing", description: "Check for double frame bypass" },
      { name: "UI Security", description: "Analyze UI protection measures" }
    ]
  },
  {
    id: 18,
    title: "Subdomain Takeover",
    description: "Detect vulnerable subdomains that could be hijacked due to dangling DNS records.",
    icon: Network,
    color: "text-teal-500",
    bgGradient: "from-teal-500/20 to-cyan-500/20",
    checkCount: 6,
    checks: [
      { name: "DNS Enumeration", description: "Discover all subdomains" },
      { name: "CNAME Analysis", description: "Check CNAME record targets" },
      { name: "Service Detection", description: "Identify hosting services" },
      { name: "Takeover Check", description: "Test for takeover vulnerability" },
      { name: "NS Record Analysis", description: "Check nameserver configuration" },
      { name: "Dangling Records", description: "Find orphaned DNS records" }
    ]
  },
  {
    id: 19,
    title: "Sensitive Data Detection",
    description: "Scan for exposed PII, credentials, and other sensitive data in responses.",
    icon: Eye,
    color: "text-rose-500",
    bgGradient: "from-rose-500/20 to-pink-500/20",
    checkCount: 10,
    checks: [
      { name: "Email Addresses", description: "Detect exposed email addresses" },
      { name: "Phone Numbers", description: "Find exposed phone numbers" },
      { name: "Credit Cards", description: "Detect credit card patterns" },
      { name: "SSN/Tax IDs", description: "Find government ID patterns" },
      { name: "API Keys", description: "Detect exposed API credentials" },
      { name: "AWS Credentials", description: "Find AWS access keys" },
      { name: "Private Keys", description: "Detect cryptographic keys" },
      { name: "Internal IPs", description: "Find internal IP disclosure" },
      { name: "Database Strings", description: "Detect connection strings" },
      { name: "JWT Tokens", description: "Find exposed JWT tokens" }
    ]
  },
  {
    id: 20,
    title: "Information Disclosure",
    description: "Identify server information leakage through headers, errors, and metadata.",
    icon: Radio,
    color: "text-fuchsia-500",
    bgGradient: "from-fuchsia-500/20 to-purple-500/20",
    checkCount: 9,
    checks: [
      { name: "Server Header", description: "Check server software disclosure" },
      { name: "X-Powered-By", description: "Detect framework disclosure" },
      { name: "Error Messages", description: "Analyze verbose error output" },
      { name: "Stack Traces", description: "Find exposed stack traces" },
      { name: "Debug Information", description: "Detect debug mode leakage" },
      { name: "Version Numbers", description: "Find software version exposure" },
      { name: "Path Disclosure", description: "Detect file path leakage" },
      { name: "HTML Comments", description: "Analyze HTML comment content" },
      { name: "Metadata Leakage", description: "Check document metadata" }
    ]
  },
  {
    id: 21,
    title: "AI-Powered Analysis",
    description: "Advanced AI analysis using Google Gemini for comprehensive vulnerability assessment and remediation.",
    icon: Bot,
    color: "text-gradient",
    bgGradient: "from-violet-500/20 via-purple-500/20 to-pink-500/20",
    checkCount: 6,
    checks: [
      { name: "Vulnerability Analysis", description: "AI-powered vulnerability assessment" },
      { name: "Risk Scoring", description: "Intelligent risk prioritization" },
      { name: "Fix Recommendations", description: "Detailed remediation guidance" },
      { name: "Compliance Mapping", description: "Map to PCI-DSS, HIPAA, GDPR, SOC 2" },
      { name: "Attack Chain Analysis", description: "Identify exploitation paths" },
      { name: "Executive Summary", description: "AI-generated security overview" }
    ]
  }
];

// Calculate total checks
const totalChecks = securityModules.reduce((sum, module) => sum + module.checkCount, 0);

// Animated illustration component for each module
const ModuleAnimation = ({ module, isReversed }: { module: SecurityModule; isReversed: boolean }) => {
  const Icon = module.icon;

  return (
    <div className={`relative w-full h-80 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${module.bgGradient}`}>
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-2 h-2 rounded-full ${module.color.replace('text-', 'bg-')}`}
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Orbiting elements */}
      <motion.div
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className={`w-48 h-48 rounded-full border-2 border-dashed ${module.color.replace('text-', 'border-')}/30`} />
      </motion.div>

      <motion.div
        className="absolute"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <div className={`w-36 h-36 rounded-full border ${module.color.replace('text-', 'border-')}/20`} />
      </motion.div>

      {/* Central icon with pulse */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className={`p-6 rounded-2xl bg-background/80 backdrop-blur-sm shadow-2xl ${module.color.replace('text-', 'shadow-')}/20`}>
          <Icon className={`w-16 h-16 ${module.color}`} />
        </div>
      </motion.div>

      {/* Scanning line effect */}
      <motion.div
        className={`absolute left-0 right-0 h-0.5 ${module.color.replace('text-', 'bg-')}/50`}
        animate={{
          top: ["0%", "100%", "0%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Check count badge */}
      <motion.div
        className="absolute bottom-4 right-4"
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className={`px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border ${module.color.replace('text-', 'border-')}/30`}>
          <span className={`text-2xl font-bold ${module.color}`}>{module.checkCount}</span>
          <span className="text-muted-foreground text-sm ml-1">checks</span>
        </div>
      </motion.div>

      {/* Connection dots */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className={`absolute w-3 h-3 rounded-full ${module.color.replace('text-', 'bg-')}`}
          style={{
            left: isReversed ? `${15 + i * 10}%` : `${65 + i * 10}%`,
            top: `${40 + i * 10}%`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Module content component
const ModuleContent = ({ module }: { module: SecurityModule }) => {
  const Icon = module.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${module.bgGradient} shrink-0`}>
          <Icon className={`w-8 h-8 ${module.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-muted-foreground">Module {module.id}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${module.color} ${module.bgGradient.replace('/20', '/30')} bg-gradient-to-r`}>
              {module.checkCount} Security Checks
            </span>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">{module.title}</h3>
          <p className="text-muted-foreground">{module.description}</p>
        </div>
      </div>

      {/* Check list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {module.checks.map((check, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${module.color}`} />
            <div>
              <div className="text-sm font-medium text-foreground">{check.name}</div>
              <div className="text-xs text-muted-foreground">{check.description}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SecurityModules = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Comprehensive Security</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              21 Security Modules
            </h1>

            <p className="text-xl text-muted-foreground mb-8">
              Our AI-powered security audit platform performs{" "}
              <span className="text-primary font-bold">{totalChecks}+ security checks</span>{" "}
              across 21 specialized modules to ensure your website is protected against modern threats.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary">21</div>
                <div className="text-sm text-muted-foreground">Security Modules</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-green-500">{totalChecks}+</div>
                <div className="text-sm text-muted-foreground">Security Checks</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-purple-500">OWASP</div>
                <div className="text-sm text-muted-foreground">Top 10 Coverage</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-amber-500">AI</div>
                <div className="text-sm text-muted-foreground">Powered Analysis</div>
              </motion.div>
            </div>

            <Link to="/security-audit">
              <button className="px-6 py-3 border-2 border-primary bg-gradient-to-r from-primary to-purple-600 text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary rounded-lg inline-flex items-center transition-all duration-300">
                Start Free Security Audit
                <ChevronRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="space-y-24">
            {securityModules.map((module, index) => {
              const isReversed = index % 2 === 1;

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className={`grid grid-cols-1 lg:grid-cols-5 gap-8 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
                >
                  {/* Content - 60% */}
                  <div className={`lg:col-span-3 ${isReversed ? 'lg:order-2' : 'lg:order-1'}`}>
                    <ModuleContent module={module} />
                  </div>

                  {/* Animation - 40% */}
                  <div className={`lg:col-span-2 ${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                    <ModuleAnimation module={module} isReversed={isReversed} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compliance & Trust Section */}
      <section className="py-16 bg-background border-y border-border/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Industry Compliance & Standards
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our security audits align with globally recognized security frameworks and compliance requirements
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: "OWASP Top 10", year: "2021", icon: Shield, color: "text-blue-500" },
              { name: "PCI-DSS", year: "v4.0", icon: CreditCard, color: "text-green-500" },
              { name: "GDPR", year: "EU", icon: Lock, color: "text-purple-500" },
              { name: "ISO 27001", year: "", icon: Award, color: "text-amber-500" },
              { name: "SOC 2", year: "", icon: ShieldCheck, color: "text-cyan-500" },
              { name: "HIPAA", year: "", icon: FileWarning, color: "text-red-500" },
            ].map((standard, idx) => (
              <motion.div
                key={standard.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all hover:scale-105"
              >
                <standard.icon className={`w-10 h-10 ${standard.color} mb-3`} />
                <span className="font-semibold text-sm">{standard.name}</span>
                {standard.year && (
                  <span className="text-xs text-muted-foreground">{standard.year}</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-6 mt-12 pt-8 border-t border-border/50"
          >
            {[
              { label: "Enterprise-Grade", sublabel: "Security" },
              { label: "AI-Powered", sublabel: "Analysis" },
              { label: "Real-Time", sublabel: "Detection" },
              { label: "PDF Reports", sublabel: "Included" },
              { label: "24/7", sublabel: "Monitoring Ready" },
            ].map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{badge.label}</span>
                <span className="text-xs text-muted-foreground">{badge.sublabel}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Award className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Secure Your Website?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get a comprehensive security audit with all {totalChecks}+ checks across our 21 security modules.
              AI-powered analysis with detailed remediation guidance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/security-audit">
                <button className="px-6 py-3 border-2 border-primary bg-gradient-to-r from-primary to-purple-600 text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary rounded-lg inline-flex items-center transition-all duration-300">
                  <Scan className="mr-2 w-5 h-5" />
                  Start Security Audit
                </button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="px-6 py-3">
                  View Pricing
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default SecurityModules;
