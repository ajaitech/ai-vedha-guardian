// AiVedha Guard - Universal Features (All Plans)

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const UNIVERSAL_FEATURES: Feature[] = [
  {
    icon: 'Shield',
    title: 'OWASP Top 10 2021',
    description: 'Complete detection: injection, broken auth, XXE, misconfigurations, XSS vectors',
  },
  {
    icon: 'Lock',
    title: 'Deep SSL/TLS Analysis',
    description: 'Certificate chain validation, protocol versions, cipher strength, grade scoring',
  },
  {
    icon: 'FileCheck',
    title: 'Security Headers',
    description: 'HSTS, CSP, X-Frame-Options, X-Content-Type, Referrer-Policy, Permissions-Policy',
  },
  {
    icon: 'BarChart3',
    title: 'Security Score (1-10)',
    description: 'Comprehensive scoring with A+ to F grades, severity-based deductions',
  },
  {
    icon: 'FileText',
    title: 'PDF Audit Report',
    description: 'Professional report with 21-module analysis and AI-powered remediation',
  },
  {
    icon: 'Award',
    title: 'Verified Certificate',
    description: 'QR-verifiable security certificate for scores 7.0+, 90-day validity',
  },
  {
    icon: 'Cpu',
    title: 'Gemini AI Remediation',
    description: 'Copy-paste ready code fixes for HIGH/CRITICAL vulnerabilities',
  },
  {
    icon: 'Globe',
    title: 'Technology Fingerprinting',
    description: 'CMS detection (WordPress, Drupal, Joomla) with CVE correlation',
  },
  {
    icon: 'Gauge',
    title: 'Sensitive File Detection',
    description: '80+ paths: .git, .env, backup files, config files, admin panels',
  },
  {
    icon: 'ShieldOff',
    title: 'DNS Security Analysis',
    description: 'DNSSEC validation, SPF/DKIM/DMARC checks, configuration audit',
  },
];

// Additional advanced features for marketing
export const ADVANCED_FEATURES: Feature[] = [
  {
    icon: 'Code',
    title: 'JavaScript Security',
    description: 'Vulnerable library detection: jQuery XSS, lodash prototype pollution, moment.js ReDoS',
  },
  {
    icon: 'Cookie',
    title: 'Cookie Security',
    description: 'Secure flag, HttpOnly, SameSite attribute checks, session protection',
  },
  {
    icon: 'Api',
    title: 'API Security',
    description: 'Swagger/OpenAPI detection, GraphQL endpoint discovery, key exposure',
  },
  {
    icon: 'Form',
    title: 'Form Security',
    description: 'CSRF protection, input validation, autocomplete security checks',
  },
  {
    icon: 'Key',
    title: 'Credential Detection',
    description: 'Exposed API keys, AWS creds, JWT tokens, database URLs, private keys',
  },
  {
    icon: 'Scan',
    title: '21 Scan Modules',
    description: 'DNS, SSL, Headers, XSS, SQLi, CORS, Cloud, CSRF, Forms, JS, API, Cookies & more',
  },
];

// Marketing taglines for features
export const FEATURE_TAGLINES = {
  main: "Enterprise Security. Startup Pricing.",
  subline: "Audit any website for under a credit. AI-powered. Continuously monitored. Always secure.",
  trust: "Transparency builds trust. Security builds confidence.",
  value: "21 security modules. One credit. Affordable pricing.",
  continuous: "Schedule audits. Continuous monitoring. Peace of mind.",
  ai: "Gemini AI doesn't just find problems—it writes the fixes.",
};

// Dynamic tagline helpers - USD only globally
export const getDynamicTaglines = () => ({
  subline: "Audit any website for under $1. AI-powered. Continuously monitored. Always secure.",
  value: "21 security modules. One credit. Under $1.",
});

// Savings percentages
export const SAVINGS = {
  yearly: 10, // 10% off for yearly plans
  suraksha: 40, // 40% savings vs base rate
  vajra: 70, // 70% savings vs base rate
  chakra: 80, // 80% savings vs base rate
};

// Plan comparison data for pricing page
export const PLAN_COMPARISON = [
  { feature: 'Credits per Month', aarambh: '3 (one-time)', raksha: '10', suraksha: '50', vajra: '200', chakra: '500' },
  { feature: 'Security Scan Modules', aarambh: '12', raksha: '12', suraksha: '12', vajra: '12', chakra: '12' },
  { feature: 'AI-Powered Fixes', aarambh: true, raksha: true, suraksha: true, vajra: true, chakra: true },
  { feature: 'PDF Reports', aarambh: true, raksha: true, suraksha: true, vajra: true, chakra: true },
  { feature: 'Security Certificate', aarambh: true, raksha: true, suraksha: true, vajra: true, chakra: true },
  { feature: 'Referral Bonus', aarambh: false, raksha: '+2 credits', suraksha: '+5 credits', vajra: '+10 credits', chakra: '+25 credits' },
  { feature: 'Price per Credit (USD)', aarambh: 'Free', raksha: '$2.50', suraksha: '$1.00', vajra: '$0.75', chakra: '$0.60' },
  { feature: 'Scheduled Audits', aarambh: false, raksha: false, suraksha: true, vajra: true, chakra: true },
  { feature: 'Priority Support', aarambh: false, raksha: false, suraksha: false, vajra: true, chakra: true },
];
