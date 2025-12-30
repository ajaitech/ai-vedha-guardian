import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrency, PRICE_DATA } from "@/contexts/CurrencyContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
    HelpCircle, Shield, CreditCard, Download, Award, Globe, Lock, Users,
    MessageCircle, Zap, FileText, Clock, Search, ChevronDown,
    ChevronRight, Sparkles, CheckCircle2, ArrowRight, Mail, BookOpen,
    Server, Code2, Receipt, Settings, AlertCircle, ExternalLink, Key, GitBranch
} from "lucide-react";

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
};

// Safe text parser that converts **bold** to React elements
const parseAnswerText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            parts.push(<br key={`br-${lineIndex}`} />);
        }

        // Parse **bold** syntax safely
        const boldPattern = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        let partIndex = 0;

        while ((match = boldPattern.exec(line)) !== null) {
            // Add text before the bold
            if (match.index > lastIndex) {
                parts.push(line.substring(lastIndex, match.index));
            }
            // Add bold text
            parts.push(<strong key={`${lineIndex}-${partIndex++}`} className="font-semibold text-foreground">{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < line.length) {
            parts.push(line.substring(lastIndex));
        }
    });

    return parts;
};

// Accordion Item Component with smooth animations
const FAQAccordionItem = ({
    question,
    answer,
    isOpen,
    onToggle,
    index
}: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
    index: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group"
    >
        <div
            className={`
        border rounded-2xl transition-all duration-300 overflow-hidden
        ${isOpen
                    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/5'
                    : 'border-border/50 bg-card/30 hover:border-primary/20 hover:bg-card/50'
                }
      `}
        >
            <button
                onClick={onToggle}
                className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left"
            >
                <span className={`font-medium transition-colors duration-200 ${isOpen ? 'text-primary' : 'text-foreground group-hover:text-primary/80'}`}>
                    {question}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={`flex-shrink-0 mt-0.5 ${isOpen ? 'text-primary' : 'text-muted-foreground'}`}
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-5 pb-5 text-muted-foreground leading-relaxed border-t border-border/30 pt-4 text-justify">
                            {parseAnswerText(answer)}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </motion.div>
);

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Dynamic currency based on user location
    const { currency, formatPrice } = useCurrency();

    // Dynamic price text helpers - USD only globally
    const getUnderPriceText = () => 'Under $1/audit';
    const getStartingPriceText = () => 'Plans from $25/mo';

    // Auto-focus search input on page load
    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 500); // Slight delay for animations to complete
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        // Handle hash navigation (e.g., /faq#cicd-integration)
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const validCategories = faqCategories.map(c => c.id);
            if (validCategories.includes(hash)) {
                setActiveCategory(hash);
                // Open first question in the category
                setTimeout(() => {
                    setOpenItems(new Set([`${hash}-0`]));
                }, 100);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const faqCategories = [
        {
            id: "getting-started",
            title: "Getting Started",
            icon: Zap,
            color: "from-emerald-500 to-teal-500",
            questions: [
                {
                    question: "What is AiVedha Guard?",
                    answer: "AiVedha Guard is an enterprise-grade AI-powered cybersecurity audit platform developed by AiVibe Software Services Private Limited. Our scanner performs 21 comprehensive security modules covering DNS security, SSL/TLS deep analysis, OWASP Top 10 vulnerability detection, security headers, technology fingerprinting with CVE correlation, sensitive file exposure, form security, JavaScript library vulnerability detection, API security, cookie analysis, XSS detection, SQL injection, CORS analysis, cloud security, CSRF protection, open redirect detection, clickjacking, subdomain takeover, sensitive data detection, and information disclosure. Powered by Google Gemini AI, we provide intelligent remediation with copy-paste ready code fixes. The platform generates professional PDF reports with security scores, letter grades, and verified certificates for websites meeting security criteria."
                },
                {
                    question: "How do I get started with my first security audit?",
                    answer: "Starting is straightforward: Sign in using Google or GitHub authentication – your account is created automatically with trial credits. From your dashboard, navigate to 'New Audit', enter the website URL you wish to scan, complete the security verification, and click 'Start Audit'. Results are typically ready within 2-5 minutes. Your dashboard will display real-time progress and notify you upon completion."
                },
                {
                    question: "What authentication options are available?",
                    answer: "We support Google Sign-In and GitHub Sign-In, both utilizing OAuth 2.0 for secure authentication. Your credentials are never stored on our servers – authentication is handled entirely by your chosen provider. GitHub users can also access AiVedha Guard through GitHub Marketplace for integrated billing and seamless account management."
                },
                {
                    question: "Is my website data secure during audits?",
                    answer: "Security is our foundation. We only analyze publicly accessible content – we never access private areas, databases, or internal systems. All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption. Audit results are stored securely on AWS infrastructure (SOC 2 certified) and are accessible only to your account. We do not share, sell, or use your website data for any purpose beyond generating your security report."
                },
                {
                    question: "Do I need technical expertise to use AiVedha Guard?",
                    answer: "No technical background is required. Our reports are designed for clarity across all skill levels. Each finding includes plain-language explanations, severity ratings (Critical, High, Medium, Low), and step-by-step remediation guidance. For complex vulnerabilities, we provide contextual resources and documentation links. Technical teams can access detailed findings in the full report."
                }
            ]
        },
        {
            id: "security-audits",
            title: "Security Audits",
            icon: Shield,
            color: "from-blue-500 to-indigo-500",
            questions: [
                {
                    question: "What vulnerabilities does AiVedha Guard detect?",
                    answer: "Our enterprise-grade scanner performs 21 comprehensive security modules: (1) DNS Security Analysis - DNSSEC, SPF/DKIM/DMARC validation; (2) Deep SSL/TLS Analysis - certificate chain validation, protocol versions, cipher strength; (3) HTTP Response Analysis - redirects, response codes, server fingerprinting; (4) Security Headers - HSTS, CSP, X-Frame-Options, X-Content-Type, Referrer-Policy, Permissions-Policy; (5) Content Security Analysis - sensitive data exposure detection; (6) Technology Fingerprinting - CMS detection with CVE correlation; (7) Sensitive File Exposure - checks 80+ paths; (8) Form Security - CSRF protection, input validation; (9) JavaScript Security - vulnerable library detection; (10) API Security - Swagger/OpenAPI, GraphQL discovery; (11) Cookie Security - Secure, HttpOnly, SameSite checks; (12) XSS Detection - Cross-site scripting vulnerabilities; (13) SQL Injection Detection - Database injection flaws; (14) CORS Analysis - Cross-origin policy misconfigurations; (15) Cloud Security - AWS, Azure, GCP misconfiguration detection; (16) CSRF Detection - Cross-site request forgery checks; (17) Open Redirect Detection - URL redirection vulnerabilities; (18) Clickjacking Detection - Frame embedding attacks; (19) Subdomain Takeover - Dangling DNS detection; (20) Sensitive Data Detection - Exposed credentials and secrets; (21) AI-Powered Analysis - Gemini AI vulnerability assessment."
                },
                {
                    question: "How accurate are your security scans?",
                    answer: "Our platform combines 21 specialized detection modules with Gemini AI for intelligent analysis. We achieve industry-leading accuracy for configuration vulnerabilities (SSL/TLS, security headers, sensitive files) and technology fingerprinting with CVE correlation. For every HIGH and CRITICAL vulnerability detected, our Gemini AI generates copy-paste ready remediation code specific to your technology stack. The AI analyzes your findings contextually and provides targeted fix recommendations, not generic advice. Our detection engines are continuously updated with latest vulnerability signatures and library version databases."
                },
                {
                    question: "How long does a security audit take?",
                    answer: "Most audits complete within 2-5 minutes. Duration factors include website size, server response times, site architecture complexity, and current platform load. Real-time progress updates are displayed throughout the scan. Larger websites or those with complex structures may require up to 10 minutes for thorough analysis. If a scan exceeds 15 minutes, it may indicate connectivity issues with the target website."
                },
                {
                    question: "Can you scan any website?",
                    answer: "We can scan any publicly accessible website with a valid domain. Limitations apply to: password-protected or authenticated pages, internal networks and localhost addresses, websites with aggressive bot protection or rate limiting, sites blocking requests from cloud infrastructure IPs, and non-standard domains. The target website must respond within 30 seconds for successful completion. Geographic restrictions or firewall rules may also affect accessibility."
                },
                {
                    question: "What happens if my audit fails or shows errors?",
                    answer: "If an audit fails due to our platform issues, your credit remains available for retry. If failure results from website-specific conditions (site blocking requests, connection timeouts, DNS failures, invalid SSL preventing connection), the credit is consumed as the scan was attempted. Common website-side issues include aggressive rate limiting, geographic restrictions, maintenance mode, or SSL certificate errors. Error messages provide specific guidance for resolution."
                },
                {
                    question: "How is the security score calculated?",
                    answer: "Our 10-point security rating evaluates three core areas: SSL/TLS Configuration (up to 2 points) covers certificate validity, protocol versions, and cipher strength. Security Headers (up to 3 points) assesses implementation of HSTS, CSP, X-Frame-Options, and related headers. Vulnerability Assessment (up to 5 points) applies severity-based deductions: Critical findings (-2), High (-1.5), Medium (-1), Low (-0.5). Scores of 8+ indicate strong security posture, 5-7 suggest improvements needed, below 5 requires prompt attention. Certificates are issued for scores of 7 or higher."
                }
            ]
        },
        {
            id: "credits-pricing",
            title: "Credits & Pricing",
            icon: CreditCard,
            color: "from-violet-500 to-purple-500",
            questions: [
                {
                    question: "How does the credit system work?",
                    answer: "Each security audit consumes 1 credit upon completion. Our subscription plans are named after Sanskrit terms reflecting their purpose: Aarambh (आरम्भ - The Beginning) provides 3 free trial credits for new users (auto-resets every 3 months). Raksha (रक्षा - Protection) offers 10 monthly credits at $25/month. Suraksha (सुरक्षा - Complete Security) includes 30 monthly credits at $50/month. Vajra (वज्र - Indestructible) provides 100 monthly credits at $150/month. Chakra (चक्र - Divine Disc) delivers 500 monthly credits at $300/month. All paid plans include full PDF reports, security certificates, and subscription management."
                },
                {
                    question: "Do credits expire?",
                    answer: "Credit validity depends on your plan type: Monthly subscription credits refresh each billing cycle and do not carry over to subsequent periods. One-time credit pack purchases are valid for 12 months from purchase date. Trial credits (Aarambh plan) are valid for 90 days from account creation. Enterprise customers with custom arrangements may have different terms. We recommend utilizing credits within their validity period as expired credits cannot be recovered."
                },
                {
                    question: "What payment methods are accepted?",
                    answer: "Payments are processed securely through PayPal with PCI DSS compliance. We accept major credit cards (Visa, Mastercard, American Express), debit cards, and PayPal balance. All payments are in USD for global consistency. Your payment details are handled directly by PayPal's secure payment gateway – we never store card information on our servers."
                },
                {
                    question: "What is your refund policy?",
                    answer: "All purchases are final. We maintain a no-refund policy covering all scenarios including unused credits, service concerns, technical issues, credit expiration, and subscription cancellations. This policy enables us to maintain competitive pricing and invest in platform improvements. We strongly encourage utilizing the free Aarambh trial to evaluate our platform thoroughly before purchasing any paid plan. Please review our Terms of Service for complete details."
                },
                {
                    question: "How do I manage or cancel my subscription?",
                    answer: "Subscription management is available through your Dashboard under 'Subscription'. From there, you can view your current plan, manage billing through PayPal, or initiate cancellation. Cancellations take effect at the end of your current billing period – you retain full access and remaining credits until then. Please note that cancellations are final; resubscription requires selecting a new plan from our Pricing page. No partial refunds or prorated adjustments are provided."
                },
                {
                    question: "Are discounts available for annual billing?",
                    answer: "Yes, annual billing provides approximately 10% savings compared to monthly payments. Select yearly billing during checkout to apply this discount automatically. We also offer credit top-up packs (5, 10, 25, 50, or 100 credits) for one-time purchases without subscription commitment. For organizations requiring custom solutions, high-volume pricing, or API access, please contact our enterprise team at enterprise@aivedha.ai to discuss tailored arrangements."
                }
            ]
        },
        {
            id: "reports-certificates",
            title: "Reports & Certificates",
            icon: Download,
            color: "from-amber-500 to-orange-500",
            questions: [
                {
                    question: "What's included in the security report?",
                    answer: "Each comprehensive PDF report includes: Executive Summary with security score (1-10), letter grade (A+ to F), and vulnerability counts by severity (Critical/High/Medium/Low/Info); DNS Security Analysis with DNSSEC, SPF/DKIM/DMARC validation results; Deep SSL/TLS Analysis with certificate chain, protocol versions, cipher strength grades; Security Headers Assessment with implementation status for HSTS, CSP, X-Frame-Options, and 6+ headers; Technology Stack Detection showing CMS, frameworks, and libraries with CVE status; Vulnerability Findings with OWASP Top 10 mapping; AI-Powered Remediation with Gemini-generated copy-paste code fixes for each issue; Sensitive File Exposure results; Cookie and Form Security analysis; and Scan Metadata. Reports feature professional formatting suitable for compliance audits, executive presentations, and developer implementation."
                },
                {
                    question: "How do I access and download PDF reports?",
                    answer: "PDF reports are generated automatically upon audit completion and accessible from your Dashboard. Navigate to Audits, select the completed scan, and click 'Download Report'. Reports feature professional formatting suitable for stakeholder presentations, compliance documentation, or client deliverables. All reports include your audit details and are available for download for 2 years from the audit date. We recommend downloading copies for your records."
                },
                {
                    question: "What is the Security Certificate?",
                    answer: "Websites achieving a security score of 7.0 or higher receive a verification certificate containing: unique certificate identifier (publicly verifiable), audit date and 90-day validity period, security score achieved, audited website URL, and QR code for instant verification. Certificates demonstrate security commitment and can be displayed on your website, included in proposals, or shared with clients. Certificate verification is available to anyone via our public verification page."
                },
                {
                    question: "How can others verify a security certificate?",
                    answer: "Certificate verification is publicly accessible at aivedha.ai/verify. Enter the certificate number or scan the QR code to view: authenticity confirmation, original audit date, security score at audit time, audited website URL, and current validity status. This allows your clients, partners, or visitors to independently confirm your security credentials. Expired or invalid certificates display appropriate status messages."
                },
                {
                    question: "How long are audit records retained?",
                    answer: "Audit reports and certificates are retained for 2 years from the audit date. During this period, you can access reports through your dashboard, download PDF copies, share verification links, and compare historical results. After 2 years, records are archived and no longer accessible. Certificates remain verifiable through their validity period (90 days from issue). We recommend maintaining your own copies of important security documentation."
                }
            ]
        },
        {
            id: "account-support",
            title: "Account & Support",
            icon: Users,
            color: "from-rose-500 to-pink-500",
            questions: [
                {
                    question: "How is my account created?",
                    answer: "Account creation is automatic upon first authentication: Click 'Get Started' or 'Login', select Google or GitHub sign-in, authorize AiVedha Guard to access your basic profile (email and display name), and your account is instantly created with trial credits. No manual registration, email verification, or password setup required. Your authentication provider handles security, and you can sign in using the same method thereafter."
                },
                {
                    question: "How do I request account deletion?",
                    answer: "Account deletion requests can be submitted at aivedha.ai/account-deletion. Confirm your registered email address and submit the request. Account deletion is permanent and irreversible – all data including audit history, reports, certificates, credits, and subscription records will be permanently removed. Data is retained for 90 days following the request for legal compliance purposes before final deletion. This action cannot be undone."
                },
                {
                    question: "How do I contact support?",
                    answer: "Support is available via email at support@aivedha.ai. Please include your account email and relevant audit or transaction IDs when contacting us. Our team responds within 48 working hours. For common questions, this FAQ and our documentation cover most topics. Note that support inquiries are handled during business hours and response times may vary based on inquiry complexity and current volume."
                },
                {
                    question: "I'm not receiving emails from AiVedha Guard",
                    answer: "If emails aren't arriving: Verify your registered email address in your profile settings. Check spam, junk, or promotions folders – add support@aivedha.ai to your contacts. Corporate email systems may filter automated messages – consider using a personal email for notifications. Some email providers have aggressive filtering that may delay delivery. Note that email notifications are informational; all platform features remain accessible through direct login."
                },
                {
                    question: "Can I change my account email address?",
                    answer: "Your account email is linked to your authentication provider (Google or GitHub). To use a different email: Update it within your Google or GitHub account settings, then sign in again to AiVedha Guard. Alternatively, you may create a new account using a different authentication method. Note that account data including credits, audit history, and subscriptions do not transfer between accounts."
                }
            ]
        },
        {
            id: "technical",
            title: "Technical Details",
            icon: Server,
            color: "from-cyan-500 to-blue-500",
            questions: [
                {
                    question: "What technology powers AiVedha Guard?",
                    answer: "Our platform runs on enterprise AWS infrastructure in US-East-1: Lambda functions for serverless auto-scaling (Python 3.11), DynamoDB for low-latency data storage, S3 for encrypted PDF report storage with presigned URLs, SES for transactional emails, and CloudFront CDN for global delivery. Security analysis uses: 21 specialized scan modules with concurrent execution; Beautiful Soup for HTML parsing; dnspython for DNS security analysis; ssl/socket for deep TLS inspection; ReportLab for professional PDF generation; and Google Gemini AI (2.5 Pro) for intelligent vulnerability analysis and remediation code generation. The scanner includes vulnerability databases for 7+ JS libraries (jQuery, Angular, Bootstrap, Lodash, Moment, Vue, React) with CVE correlation and 80+ sensitive path checks."
                },
                {
                    question: "Will audits affect my website's performance?",
                    answer: "Our scans are designed to be lightweight and non-intrusive: We make minimal HTTP requests (typically 10-50 per scan), implement rate limiting to prevent server strain, respect robots.txt directives, complete within minutes to minimize load duration, and use standard browser identification. Most websites experience no perceptible impact. If you operate high-traffic infrastructure with strict monitoring, you may notice scan requests in your logs – these are read-only and pose no risk to your systems."
                },
                {
                    question: "How are single-page applications (SPAs) handled?",
                    answer: "We analyze the initial server response and static resources comprehensively. For JavaScript-heavy SPAs (React, Vue, Angular, etc.): Server-side configuration, SSL/TLS, and security headers are fully evaluated. Client-side rendered content receives limited analysis since dynamic content requires browser execution. API endpoints referenced in accessible source code are noted for review. For comprehensive SPA security testing, we recommend supplementing with browser-based or authenticated testing tools that can execute JavaScript."
                },
                {
                    question: "Is API access available for automation?",
                    answer: "API access for programmatic scanning is available to Enterprise customers. This enables: scheduled recurring audits, CI/CD pipeline integration (Jenkins, GitHub Actions, GitLab CI), automated security gates before deployment, and webhook notifications for completed scans. For API documentation, rate limits, and integration support, contact enterprise@aivedha.ai with your requirements."
                },
                {
                    question: "What geographic regions are supported?",
                    answer: "AiVedha Guard serves customers globally from AWS infrastructure in US-East-1 (Virginia). Websites hosted anywhere worldwide can be scanned, subject to: accessibility from US-based IP addresses, no geographic blocking affecting our scan infrastructure, and reasonable response times (under 30 seconds). Some regions with internet restrictions or websites with country-specific access controls may experience connectivity limitations."
                }
            ]
        },
        {
            id: "github",
            title: "GitHub Integration",
            icon: ExternalLink,
            color: "from-gray-600 to-gray-800",
            questions: [
                {
                    question: "How does GitHub authentication work?",
                    answer: "GitHub Sign-In uses industry-standard OAuth 2.0: Click 'Continue with GitHub', authorize AiVedha Guard on GitHub's secure page, and you're authenticated. We request minimal permissions: read your email address and public profile information. We never access your repositories, code, commits, organizations, or any private data. Authentication tokens are securely managed. You can revoke access anytime from GitHub Settings > Applications > Authorized OAuth Apps."
                },
                {
                    question: "Is AiVedha Guard available on GitHub Marketplace?",
                    answer: "Yes, AiVedha Guard is listed on GitHub Marketplace for convenient access and billing. Marketplace benefits include: subscription management through your existing GitHub billing, seamless account linking with your GitHub identity, and centralized app management. Search 'AiVedha Guard' on GitHub Marketplace or access our listing directly. Marketplace subscriptions follow the same pricing as direct subscriptions."
                },
                {
                    question: "What permissions does the GitHub integration request?",
                    answer: "We request only essential permissions for authentication: 'user:email' to identify your account, and 'read:user' to access your public profile (name, avatar). We explicitly do NOT request: repository access (read or write), organization access, commit or code access, issue or project access, or any write permissions. Your code and development work remain completely private and inaccessible to our platform."
                },
                {
                    question: "How do I disconnect my GitHub account from AiVedha Guard?",
                    answer: "To revoke GitHub access: Navigate to GitHub.com > Settings > Applications > Authorized OAuth Apps, locate 'AiVedha Guard', and click 'Revoke'. This removes our access to your GitHub profile immediately. Note: This doesn't delete your AiVedha Guard account – if you've used Google authentication with the same email, that access remains. To fully delete your account, submit a deletion request separately."
                },
                {
                    question: "Can I use both Google and GitHub to access my account?",
                    answer: "Account identity is based on your email address. If your Google and GitHub accounts share the same email, both authentication methods access the same AiVedha Guard account with shared credits and history. If they use different emails, they create separate accounts. We recommend using consistent authentication to avoid confusion. Credits and subscriptions are tied to the email address, not the authentication provider."
                }
            ]
        },
        {
            id: "cicd-integration",
            title: "CI/CD & API Keys",
            icon: GitBranch,
            color: "from-green-500 to-emerald-600",
            questions: [
                {
                    question: "How do I set up automated security audits with GitHub Actions?",
                    answer: "**Step 1: Generate an API Key**\nNavigate to your Profile page and scroll to 'API Keys for CI/CD Integration'. Click 'Create New Key', provide a name (e.g., 'GitHub Deploy'), select validity period (90 days recommended), and save the key securely - it's shown only once!\n\n**Step 2: Add Secret to GitHub**\nGo to your repository Settings > Secrets and variables > Actions. Click 'New repository secret', name it 'AIVEDHA_API_KEY', and paste your API key.\n\n**Step 3: Create Workflow File**\nCreate .github/workflows/security-audit.yml with the following content:\n• name: Security Audit\n• on: [push]\n• jobs: audit: runs-on: ubuntu-latest\n• steps: uses actions/checkout@v4\n• Run curl -X POST https://api.aivedha.ai/api/audit/start\n\n**Step 4: Commit and Push**\nEvery deployment will now trigger an automated security audit!"
                },
                {
                    question: "How do I create and manage API keys?",
                    answer: "**Creating a Key:**\n• Click 'Create New Key' in Profile > API Keys\n• Enter a descriptive name (e.g., 'GitHub Actions')\n• Select validity period (7, 14, 30, 60, or 90 days)\n• Click 'Create'\n\n**IMPORTANT:** The full API key is displayed only once - copy it immediately and store securely.\n\n**Viewing Keys:**\nYour dashboard shows all keys with status (Active, Expired, Revoked), creation date, expiry date, and usage count. Only the key prefix is shown for security.\n\n**Revoking Keys:**\nClick 'Revoke' on any key to immediately disable it. Revoked keys cannot be restored.\n\n**Limits:**\n• Maximum 5 active keys per user\n• Paid plan required for API key creation"
                },
                {
                    question: "What if I run out of credits during CI/CD automation?",
                    answer: "**When Credits Are Exhausted:**\n• The API returns a clear error message indicating insufficient credits\n• Your deployment pipeline continues - we never fail your builds\n• An email notification is sent to your registered email\n• The audit is skipped (not queued) for that deployment\n\n**Resolution Options:**\n• Purchase additional credits or upgrade your plan\n• Credit packs available: 5, 10, 25, 50, or 100 credits\n\n**Pro Tips:**\n• Set up credit threshold alerts in your dashboard\n• Consider Chakra plan ($300/month) for unlimited audits if you deploy frequently"
                },
                {
                    question: "What permissions do API keys have?",
                    answer: "**Keys CAN:**\n• Start security audits (1 credit per audit)\n• Retrieve audit status and results\n• Download PDF reports for completed audits\n• Access certificate verification\n\n**Keys CANNOT:**\n• Access your account settings or profile\n• View or modify billing information\n• Manage subscriptions or payments\n• Access other users' data\n• Create or manage other API keys\n\n**Security Features:**\n• Each key is cryptographically bound to your user account\n• Keys are hashed before storage - we cannot retrieve your original key\n• All API calls are logged for audit trail\n• Keys auto-expire based on selected validity period"
                },
                {
                    question: "How should I securely store and use API keys?",
                    answer: "**DO:**\n• Store keys in GitHub Secrets, Vercel Environment Variables, or your CI/CD platform's secret management\n• Rotate keys regularly (every 30-90 days)\n• Use the shortest validity period that meets your needs\n• Revoke old keys immediately when creating new ones\n• Monitor usage in your dashboard for anomalies\n\n**DON'T:**\n• Commit keys to version control (even private repos)\n• Share keys across multiple projects or teams\n• Store keys in plain text files or code comments\n• Use keys in client-side code (browser/mobile)\n• Share screenshots showing your keys\n\n**If Compromised:**\n• Immediately revoke the key from your Profile page\n• Create a new key with a different name\n• Update all systems using the old key\n• Review audit logs for unauthorized usage"
                },
                {
                    question: "Can I use API keys with other CI/CD platforms?",
                    answer: "**Yes! API keys work with any CI/CD platform that can make HTTP requests.**\n\n**Platform Examples:**\n• **GitHub Actions:** Store key in repository secrets\n• **GitLab CI:** Add key to CI/CD Variables (masked)\n• **Jenkins:** Store in credentials manager, use withCredentials\n• **CircleCI:** Add to project environment variables\n• **Vercel:** Add to project environment variables\n• **Netlify:** Add to build environment variables\n• **Azure DevOps:** Store in pipeline variables (secret)\n• **AWS CodePipeline:** Store in Secrets Manager\n\n**Universal Pattern:**\nStore the key securely, then make a POST request to:\nhttps://api.aivedha.ai/api/audit/start\nWith header: 'X-API-Key: YOUR_KEY'"
                }
            ]
        },
        {
            id: "compliance-legal",
            title: "Compliance & Legal",
            icon: FileText,
            color: "from-slate-500 to-zinc-600",
            questions: [
                {
                    question: "Is website security scanning legal?",
                    answer: "AiVedha Guard performs passive security analysis of publicly accessible websites, which is generally permissible. However: You should only scan websites you own or have explicit authorization to test. Certain jurisdictions have specific regulations regarding security testing. Our Terms of Service require you to confirm authorization before scanning. We do not perform active exploitation or penetration testing. You are responsible for ensuring compliance with applicable laws and obtaining necessary permissions."
                },
                {
                    question: "How does AiVedha Guard support compliance requirements?",
                    answer: "Our reports align with various compliance frameworks: OWASP Top 10 – direct vulnerability mapping to current OWASP categories; PCI DSS – SSL/TLS and security header assessments relevant to cardholder data protection; GDPR – documentation supporting security measure requirements; SOC 2 – evidence of regular security testing practices; ISO 27001 – vulnerability assessment documentation for information security management. Reports can serve as supporting evidence for compliance audits and due diligence documentation."
                },
                {
                    question: "How is customer data protected?",
                    answer: "We implement comprehensive data protection measures: Encryption in transit (TLS 1.2+) and at rest (AES-256); Data storage on SOC 2 certified AWS infrastructure; Access controls limiting data visibility to authorized personnel; Regular security assessments of our own systems; No sharing or selling of customer data; Defined retention policies with secure deletion; Geographic data residency in AWS US regions. Complete details are available in our Privacy Policy."
                },
                {
                    question: "Where are the Terms of Service and Privacy Policy?",
                    answer: "Our legal documents are available at: Terms of Service (aivedha.ai/terms) – covering usage requirements, payment terms, limitations, and disclaimers; Privacy Policy (aivedha.ai/privacy) – detailing data collection, processing, storage, and protection practices; Account Deletion (aivedha.ai/account-deletion) – for GDPR/CCPA data deletion requests. We recommend reviewing these documents before using our platform or making purchases. By using AiVedha Guard, you agree to these terms."
                }
            ]
        }
    ];

    // Filter questions based on search and category
    const filteredCategories = useMemo(() => {
        let filtered = faqCategories;

        if (activeCategory !== "all") {
            filtered = filtered.filter(cat => cat.id === activeCategory);
        }

        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            filtered = filtered.map(category => ({
                ...category,
                questions: category.questions.filter(
                    q => q.question.toLowerCase().includes(query) ||
                        q.answer.toLowerCase().includes(query)
                )
            })).filter(category => category.questions.length > 0);
        }

        return filtered;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchQuery, activeCategory]);

    const totalQuestions = faqCategories.reduce((acc, cat) => acc + cat.questions.length, 0);
    const filteredQuestionsCount = filteredCategories.reduce((acc, cat) => acc + cat.questions.length, 0);

    return (
        <Layout>
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <section className="relative pt-12 pb-16 overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                    <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

                    <div className="container mx-auto px-4 max-w-6xl relative">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                            className="text-center"
                        >
                            {/* Icon with glow effect */}
                            <motion.div variants={scaleIn} className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                                    <div className="relative bg-gradient-to-br from-primary to-violet-600 p-5 rounded-2xl shadow-lg shadow-primary/20">
                                        <HelpCircle className="h-12 w-12 text-white" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                variants={fadeInUp}
                                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 font-orbitron"
                            >
                                Your Questions,{" "}
                                <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                                    Our Answers
                                </span>
                            </motion.h1>

                            <motion.p
                                variants={fadeInUp}
                                className="text-xl text-primary font-medium mb-2"
                            >
                                "Transparency is the foundation of trust."
                            </motion.p>

                            <motion.p
                                variants={fadeInUp}
                                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
                            >
                                Everything you need to know about protecting your platforms with 21 security modules,
                                AI-powered fixes, and audits that cost less than a dollar.
                            </motion.p>

                            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-3 mb-8">
                                <Badge variant="secondary">{getUnderPriceText()}</Badge>
                                <Badge variant="secondary">21 Security Modules</Badge>
                                <Badge variant="secondary">Gemini AI Fixes</Badge>
                                <Badge variant="secondary">Continuous Monitoring</Badge>
                            </motion.div>

                            {/* Search Bar */}
                            <motion.div variants={fadeInUp} className="max-w-xl mx-auto">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                                    <div className="relative flex items-center">
                                        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search FAQs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-12 pr-4 h-14 rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm text-lg focus:border-primary/50 focus:ring-primary/20"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {searchQuery && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-muted-foreground mt-3"
                                    >
                                        Found {filteredQuestionsCount} result{filteredQuestionsCount !== 1 ? 's' : ''} for "{searchQuery}"
                                    </motion.p>
                                )}
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Quick Stats */}
                <section className="py-8 border-y border-border/30 bg-card/30 backdrop-blur-sm">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="grid grid-cols-2 md:grid-cols-4 gap-6"
                        >
                            {[
                                { icon: Shield, value: "178+", label: "Security Checks", color: "text-blue-500" },
                                { icon: Clock, value: "2-5 min", label: "Average Scan", color: "text-emerald-500" },
                                { icon: Globe, value: "Global", label: "Coverage", color: "text-violet-500" },
                                { icon: Award, value: "OWASP", label: "Compliant", color: "text-amber-500" },
                            ].map((stat, index) => (
                                <motion.div
                                    key={index}
                                    variants={fadeInUp}
                                    className="text-center group"
                                >
                                    <div className={`inline-flex p-3 rounded-xl bg-card border border-border/50 mb-3 group-hover:border-primary/30 transition-colors ${stat.color}`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                    <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Category Tabs */}
                <section className="py-8 sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-b border-border/30">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => setActiveCategory("all")}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeCategory === "all"
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                                    }`}
                            >
                                All Topics ({totalQuestions})
                            </button>
                            {faqCategories.map((category) => {
                                const IconComponent = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setActiveCategory(category.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeCategory === category.id
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                                            }`}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="hidden sm:inline">{category.title}</span>
                                        <span className="sm:hidden">{category.title.split(' ')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* FAQ Content */}
                <section className="py-12">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <AnimatePresence mode="wait">
                            {filteredCategories.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="text-center py-16"
                                >
                                    <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
                                    <p className="text-muted-foreground mb-6">
                                        Try adjusting your search terms or browse all categories
                                    </p>
                                    <button onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} className="btn-secondary px-6 py-2 rounded-xl">
                                        Clear Filters
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={activeCategory + searchQuery}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-10"
                                >
                                    {filteredCategories.map((category, categoryIndex) => {
                                        const IconComponent = category.icon;
                                        return (
                                            <motion.div
                                                key={category.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: categoryIndex * 0.1 }}
                                            >
                                                {/* Category Header */}
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${category.color} shadow-lg`}>
                                                        <IconComponent className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                                                        <p className="text-sm text-muted-foreground">{category.questions.length} questions</p>
                                                    </div>
                                                </div>

                                                {/* Questions */}
                                                <div className="space-y-3">
                                                    {category.questions.map((faq, faqIndex) => (
                                                        <FAQAccordionItem
                                                            key={`${category.id}-${faqIndex}`}
                                                            question={faq.question}
                                                            answer={faq.answer}
                                                            isOpen={openItems.has(`${category.id}-${faqIndex}`)}
                                                            onToggle={() => toggleItem(`${category.id}-${faqIndex}`)}
                                                            index={faqIndex}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* Quick Links Grid */}
                <section className="py-12 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="text-center mb-10"
                        >
                            <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                                Quick Access
                            </motion.h2>
                            <motion.p variants={fadeInUp} className="text-muted-foreground">
                                Jump directly to what you need
                            </motion.p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        >
                            {[
                                { icon: CreditCard, title: "View Pricing", desc: getStartingPriceText(), href: "/pricing", color: "from-violet-500 to-purple-500" },
                                { icon: Shield, title: "Start Audit", desc: "Scan your website", href: "/security-audit", color: "from-blue-500 to-indigo-500" },
                                { icon: BookOpen, title: "Documentation", desc: "Detailed guides", href: "/docs", color: "from-emerald-500 to-teal-500" },
                                { icon: Receipt, title: "My Dashboard", desc: "View your audits", href: "/dashboard", color: "from-amber-500 to-orange-500" },
                            ].map((link, index) => (
                                <motion.div key={index} variants={fadeInUp}>
                                    <Link to={link.href}>
                                        <Card className="group h-full rounded-2xl border border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                                            <CardContent className="p-6 text-center">
                                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${link.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                                    <link.icon className="h-6 w-6 text-white" />
                                                </div>
                                                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{link.title}</h3>
                                                <p className="text-sm text-muted-foreground">{link.desc}</p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Contact Support CTA */}
                <section className="py-16">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-primary/10 via-violet-500/10 to-primary/10">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                <CardContent className="relative p-8 md:p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", delay: 0.2 }}
                                        className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 mb-6 shadow-lg shadow-primary/20"
                                    >
                                        <MessageCircle className="h-8 w-8 text-white" />
                                    </motion.div>

                                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                                        We're Here to Help
                                    </h3>
                                    <p className="text-primary font-medium mb-2">
                                        "Your security is our mission. Your trust is our reward."
                                    </p>
                                    <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                                        Questions about protecting your platform, stakeholder transparency, or continuous monitoring?
                                        We're here within 48 hours—because security shouldn't wait.
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                                        <Link to="/support">
                                            <button className="px-6 py-3 border-2 border-primary bg-gradient-to-r from-primary to-violet-600 text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary shadow-lg shadow-primary/20 gap-2 transition-all duration-300 rounded-lg">
                                                <MessageCircle className="h-5 w-5" />
                                                Submit Support Request
                                                <ArrowRight className="h-4 w-4" />
                                            </button>
                                        </Link>
                                        <a href="mailto:support@aivedha.ai">
                                            <Button variant="outline" className="gap-2 px-6 py-3">
                                                <Mail className="h-5 w-5" />
                                                support@aivedha.ai
                                            </Button>
                                        </a>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary" />
                                            48-hour response time
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-primary" />
                                            Email support
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            Business hours
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>

                {/* Legal Links Footer */}
                <section className="py-8 border-t border-border/30">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                            <Link to="/terms" className="hover:text-primary transition-colors flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                Terms of Service
                            </Link>
                            <span>•</span>
                            <Link to="/privacy" className="hover:text-primary transition-colors flex items-center gap-1">
                                <Lock className="h-4 w-4" />
                                Privacy Policy
                            </Link>
                            <span>•</span>
                            <Link to="/account-deletion" className="hover:text-primary transition-colors flex items-center gap-1">
                                <Settings className="h-4 w-4" />
                                Account Deletion
                            </Link>
                            <span>•</span>
                            <a href="https://github.com/marketplace/aivedha-guard" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                                <ExternalLink className="h-4 w-4" />
                                GitHub Marketplace
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </section>
            </div>

            {/* CSS for gradient animation */}
            <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
        </Layout>
    );
}