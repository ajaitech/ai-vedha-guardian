import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrency, PRICE_DATA } from "@/contexts/CurrencyContext";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Zap, Lock, CheckCircle, Users, Globe, TrendingUp, Award,
  Target, BarChart3, Key, Settings, Eye, AlertTriangle, FileCheck,
  BookOpen, Bug, Calendar, Cpu, Database, ArrowRight, Play, Star,
  Building2, Briefcase, GraduationCap, ShoppingCart, Heart, Plane,
  ShieldCheck, ShieldX, Server, Wifi, RefreshCw, UserCheck, FileWarning,
  KeyRound, Mail, HardDrive, CloudOff, Fingerprint, ScanLine, Code,
  Terminal, X, Check, ExternalLink, Layers
} from "lucide-react";
import { SecurityBadgeFull } from "@/components/SecurityBadge";
import { CyberShieldHero } from "@/components/CyberShieldHero";
import { LoginPopup } from "@/components/LoginPopup";

// Animation variants with proper easing type
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } }
};

const floatAnimation = {
  y: [-10, 10, -10],
  transition: { duration: 4, repeat: Infinity, ease: [0.4, 0, 0.6, 1] as const }
};

export const Hero = () => {
  // Login popup state
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  // USD only currency formatting
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  // Format price - USD only globally
  const formatPrice = (usd: number) => {
    return formatCurrencyPrice(usd);
  };

  // Get "under $1" text - USD only globally
  const getUnderPriceText = () => {
    return 'under $1';
  };

  // Floating particles for cyber effect
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5
    }))
  );

  // Industry statistics from market research
  const industryStats = [
    { value: "$10.5T", label: "Cybercrime Cost by 2025", icon: TrendingUp, color: "text-red-500" },
    { value: "2,220", label: "Daily Cyber Attacks", icon: AlertTriangle, color: "text-orange-500" },
    { value: "94%", label: "Malware via Email", icon: Bug, color: "text-yellow-500" },
    { value: "287 Days", label: "Avg Breach Detection", icon: Calendar, color: "text-blue-500" }
  ];

  // Platform statistics - 2 key metrics
  const platformStats = [
    { value: "99.9%", label: "Accuracy Rate", trend: "Industry leading" },
    { value: "195+", label: "Countries Served", trend: "Global coverage" }
  ];

  // Industry solutions
  const industries = [
    { name: "E-Commerce", icon: ShoppingCart, description: "Protect customer data & payment systems", audits: "12,000+" },
    { name: "Healthcare", icon: Heart, description: "HIPAA compliant security audits", audits: "5,000+" },
    { name: "Finance", icon: Building2, description: "PCI DSS & SOC2 compliance checks", audits: "8,000+" },
    { name: "Education", icon: GraduationCap, description: "Student data protection audits", audits: "3,500+" },
    { name: "Travel", icon: Plane, description: "Booking & PII security scans", audits: "2,800+" },
    { name: "Enterprise", icon: Briefcase, description: "Custom security assessments", audits: "15,000+" }
  ];

  // Security audit features - Actual features from Lambda v3.0.0
  const auditFeatures = [
    { title: "OWASP Top 10 2021 Scanning", description: "Complete detection of all critical vulnerabilities: injection, broken auth, sensitive data exposure, XXE, broken access control, misconfigurations", icon: Shield },
    { title: "Deep SSL/TLS Analysis", description: "Certificate chain validation, protocol version analysis, cipher strength assessment, and expiry monitoring with grade scoring", icon: Lock },
    { title: "Technology Fingerprinting", description: "Detection of frameworks, libraries, and CMS with CVE correlation for jQuery, Angular, Bootstrap, Lodash, React, Vue vulnerabilities", icon: Cpu },
    { title: "Sensitive Data Exposure", description: "Scans for exposed API keys, AWS credentials, JWT tokens, database URLs, private keys, and passwords in source code", icon: Bug },
    { title: "Security Headers Analysis", description: "Comprehensive check of HSTS, CSP, X-Frame-Options, X-Content-Type, Referrer-Policy, Permissions-Policy headers", icon: FileCheck },
    { title: "AI-Powered Remediation", description: "Gemini AI-powered fix recommendations with copy-paste ready code solutions for every vulnerability found", icon: Eye }
  ];

  // Additional comprehensive scan modules (21 modules total)
  const advancedScanModules = [
    { title: "DNS Security Analysis", description: "DNSSEC validation, SPF/DKIM/DMARC checks, and DNS configuration security assessment", icon: Server },
    { title: "Sensitive File Detection", description: "Checks 80+ critical paths: .git, .env, backup files, config files, admin panels, debug logs, source maps", icon: FileWarning },
    { title: "Form Security Analysis", description: "Input validation checks, CSRF protection verification, autocomplete security, and action URL validation", icon: ScanLine },
    { title: "JavaScript Security", description: "Detection of vulnerable libraries with known CVEs: jQuery XSS, lodash prototype pollution, moment.js ReDoS", icon: Code },
    { title: "API Security Assessment", description: "Swagger/OpenAPI detection, GraphQL endpoint discovery, and API key exposure scanning", icon: Database },
    { title: "Cookie Security", description: "Secure flag, HttpOnly, SameSite attribute checks, and session cookie protection validation", icon: KeyRound }
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Cyber Grid Background */}
      <div className="fixed inset-0 bg-gradient-hero -z-10">
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] hero-grid-pattern" />

        {/* Floating Cyber Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-primary/30 dark:bg-primary/40 particle-position particle-size"
            style={{
              '--particle-left': `${particle.x}%`,
              '--particle-top': `${particle.y}%`,
              '--particle-size': `${particle.size}px`,
            } as React.CSSProperties}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Glowing Orbs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -40, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-40 left-1/4 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, 50, 0],
            y: [0, -40, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Scanning Line Effect */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Cyber Radar Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            className="w-[600px] h-[600px] rounded-full border border-primary/10"
            animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 w-[600px] h-[600px] rounded-full border border-accent/10"
            animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 1.3 }}
          />
          <motion.div
            className="absolute inset-0 w-[600px] h-[600px] rounded-full border border-green-500/10"
            animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 2.6 }}
          />
        </div>

        {/* Animated Binary Rain Effect */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`binary-${i}`}
            className="absolute text-primary/10 font-mono text-xs select-none dynamic-left"
            style={{ '--dynamic-left': `${10 + i * 10}%` } as React.CSSProperties}
            animate={{
              y: ["-10%", "110%"],
              opacity: [0, 0.3, 0.3, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5
            }}
          >
            {Array.from({ length: 8 }, () => Math.random() > 0.5 ? "1" : "0").join("")}
          </motion.div>
        ))}

        {/* Cyber Hex Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] hero-hex-pattern" />
      </div>

      {/* Hero Section */}
      <section className="relative py-12 pt-8 overflow-hidden">
        {/* Login Popup */}
        <LoginPopup
          isOpen={isLoginPopupOpen}
          onClose={() => setIsLoginPopupOpen(false)}
        />

        {/* Enhanced 3D Glass Hero Container */}
        <div className="absolute inset-x-4 top-4 bottom-4 rounded-[2.5rem] overflow-hidden pointer-events-none hero-glass-container"
        >
          {/* Matte glass inner highlights */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/[0.02]" />
        </div>

        {/* Floating Security Icons - Enhanced with glow and rotation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-16 text-primary/30 icon-glow-primary"
            animate={{ y: [-10, 10, -10], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Shield className="w-16 h-16" />
          </motion.div>
          <motion.div
            className="absolute top-32 right-24 text-accent/30 icon-glow-accent"
            animate={{ y: [10, -10, 10], scale: [1, 1.1, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Lock className="w-12 h-12" />
          </motion.div>
          <motion.div
            className="absolute top-60 left-32 text-green-500/30 icon-glow-green"
            animate={{ y: [-5, 15, -5], x: [-5, 5, -5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          >
            <Key className="w-14 h-14" />
          </motion.div>
          <motion.div
            className="absolute bottom-32 right-16 text-yellow-500/30 icon-glow-yellow"
            animate={{ y: [5, -15, 5], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Shield className="w-18 h-18" />
          </motion.div>
          <motion.div
            className="absolute bottom-48 left-24 text-primary/30 icon-glow-primary-strong"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          >
            <Settings className="w-10 h-10" />
          </motion.div>
          <motion.div
            className="absolute top-40 left-1/2 text-accent/25 icon-glow-accent-strong"
            animate={{ y: [-8, 12, -8], scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          >
            <Eye className="w-12 h-12" />
          </motion.div>
          {/* Additional floating icons */}
          <motion.div
            className="absolute top-[40%] right-[10%] text-red-500/25 icon-glow-red"
            animate={{ y: [0, -20, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          >
            <AlertTriangle className="w-10 h-10" />
          </motion.div>
          <motion.div
            className="absolute bottom-[25%] left-[5%] text-cyan-500/30 icon-glow-cyan"
            animate={{ y: [5, -10, 5], x: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          >
            <RefreshCw className="w-8 h-8" />
          </motion.div>
        </div>

        <div className="relative z-10 container mx-auto px-4">
          {/* Centered CyberShield Hero with Text on Both Sides - Desktop Only */}
          {/* 3-Column Layout: Left Text | Center Shield | Right Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="hidden lg:grid lg:grid-cols-3 items-center py-8 gap-4"
          >
            {/* Left Column - Poetic Text (Center-aligned within column) */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="space-y-1">
                <p className="text-lg xl:text-xl font-semibold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Guard what matters.
                </p>
                <p className="text-lg xl:text-xl font-semibold text-primary/90" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Protect what connects.
                </p>
              </div>
            </motion.div>

            {/* Center Column - Shield Animation */}
            <div className="flex justify-center">
              <CyberShieldHero onOpenLoginPopup={() => setIsLoginPopupOpen(true)} />
            </div>

            {/* Right Column - Action Words (Center-aligned within column) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="space-y-1">
                <motion.p
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-lg xl:text-xl font-bold text-foreground/90 tracking-widest"
                >
                  DEFEND
                </motion.p>
                <motion.p
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  className="text-lg xl:text-xl font-bold text-primary tracking-widest"
                >
                  DETECT
                </motion.p>
                <motion.p
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className="text-lg xl:text-xl font-bold text-accent tracking-widest"
                >
                  DELIVER
                </motion.p>
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile: Just the Shield */}
          <div className="lg:hidden flex justify-center py-8">
            <CyberShieldHero onOpenLoginPopup={() => setIsLoginPopupOpen(true)} />
          </div>

          {/* Main Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center py-8">

            {/* Left Column - Hero Text */}
            <motion.div
              className="space-y-8"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <div className="mb-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
                    border: '2px solid transparent',
                    backgroundClip: 'padding-box',
                    boxShadow: '0 0 0 2px rgba(212, 175, 55, 0.6), 0 4px 20px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Gold corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-500/80 rounded-tl" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-500/80 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-500/80 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-500/80 rounded-br" />

                  <Award className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-semibold text-white tracking-wide">
                    Trusted by 50,000+ Businesses Worldwide
                  </span>
                  <Globe className="h-4 w-4 text-yellow-500/80" />
                </div>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight font-orbitron"
              >
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  AI-Powered
                </span>
                <br />
                Cybersecurity Audits
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl"
              >
                <span className="text-primary font-semibold">Enterprise Security. Startup Pricing.</span>
                {" "}Audit any website for {getUnderPriceText()} with 21 advanced security modules.
                AI-powered fixes. Continuous monitoring. Complete transparency.
              </motion.p>

              <motion.p
                variants={fadeInUp}
                className="text-base text-muted-foreground italic max-w-xl"
              >
                "Transparency builds trust. Security builds confidence."
              </motion.p>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 pt-8">
                <div className="flex -space-x-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold border-2 border-background">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">4.9/5 from 2,500+ reviews</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Brand & Stats */}
            <motion.div
              className="space-y-6"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Certificate with Stats on Either Side */}
              <motion.div
                variants={scaleIn}
                className="flex items-center justify-center gap-4"
              >
                {/* Left Stat Card - 99.9% */}
                <motion.div
                  variants={scaleIn}
                  className="relative rounded-xl px-4 py-3 text-center overflow-hidden stats-card-glass"
                >
                  <motion.div
                    className="text-xl font-bold text-primary mb-0.5 relative z-10"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    {platformStats[0].value}
                  </motion.div>
                  <div className="text-[11px] text-foreground font-medium relative z-10">{platformStats[0].label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 relative z-10">{platformStats[0].trend}</div>
                </motion.div>

                {/* Security Certificate Badge */}
                <motion.div
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <SecurityBadgeFull
                    certificateNumber="AVG-2025-001234"
                    securityScore={9.2}
                    domain="aivedha.ai"
                    scanDate="January 2025"
                    sslGrade="A+"
                    theme="dark"
                    demoMode={true}
                  />
                </motion.div>

                {/* Right Stat Card - 195+ */}
                <motion.div
                  variants={scaleIn}
                  className="relative rounded-xl px-4 py-3 text-center overflow-hidden stats-card-glass"
                >
                  <motion.div
                    className="text-xl font-bold text-primary mb-0.5 relative z-10"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    {platformStats[1].value}
                  </motion.div>
                  <div className="text-[11px] text-foreground font-medium relative z-10">{platformStats[1].label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 relative z-10">{platformStats[1].trend}</div>
                </motion.div>
              </motion.div>

              {/* Price Highlight - Clean Text Style - No hover effects */}
              <motion.div variants={fadeInUp} className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <Zap className="h-6 w-6 text-emerald-400" />
                  <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
                    21 Security Modules • Under {formatPrice(1)}/Audit
                  </span>
                </div>
                <motion.p
                  className="text-sm text-muted-foreground italic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  "One credit, one shield. One audit, complete peace of mind."
                </motion.p>
                <motion.p
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Schedule audits • Continuous monitoring • AI-powered remediation
                </motion.p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Global Cybercrime Statistics Section */}
      <section className="py-12 mx-4 my-2 rounded-3xl bg-gradient-to-b from-destructive/5 to-background relative">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-destructive/10 text-destructive border-destructive/20">
              <AlertTriangle className="h-4 w-4 mr-2" />
              2025 Cybersecurity Landscape
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              The Threat is Real. Protection is Essential.
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              With cyberattacks increasing by 38% globally in 2025, businesses cannot afford to ignore security.
              AiVedha Guard provides the proactive defense your organization needs.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {industryStats.map((stat, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ scale: 1.05 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-destructive/50 transition-all duration-300 rounded-2xl h-full">
                  <CardContent className="p-6 text-center">
                    <motion.div
                      className={`w-14 h-14 ${stat.color.replace('text-', 'bg-')}/10 rounded-2xl flex items-center justify-center mx-auto mb-4`}
                      whileHover={{ rotate: 10 }}
                    >
                      <stat.icon className={`h-7 w-7 ${stat.color}`} />
                    </motion.div>
                    <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            className="text-center text-sm text-muted-foreground mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Sources: IBM Security, Cybersecurity Ventures, Verizon DBIR 2025
          </motion.p>
        </div>
      </section>

      {/* Security Features Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Comprehensive Security Audit Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade security scanning powered by advanced AI algorithms.
              Get detailed insights and actionable recommendations in minutes.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {auditFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group rounded-2xl h-full">
                  <CardContent className="p-6">
                    <motion.div
                      className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <feature.icon className="h-7 w-7 text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Advanced Scan Modules Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              <Cpu className="h-4 w-4 mr-2" />
              21 Advanced Scan Modules
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Enterprise-Grade Security Scanner
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our AI-powered scanner performs 21 comprehensive security checks covering every aspect
              of web security, from DNS configuration to cookie protection.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {advancedScanModules.map((module, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group rounded-2xl h-full">
                  <CardContent className="p-6">
                    <motion.div
                      className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <module.icon className="h-7 w-7 text-accent" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{module.title}</h3>
                    <p className="text-muted-foreground text-sm">{module.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* CMS & Framework Detection Badge */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-muted-foreground mb-4">Automatically detects and analyzes</p>
            <div className="flex flex-wrap justify-center gap-3">
              {["WordPress", "Drupal", "Joomla", "Magento", "Shopify", "React", "Vue", "Angular"].map((tech, index) => (
                <Badge key={index} variant="secondary" className="px-4 py-1.5">
                  {tech}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industry Solutions Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Building2 className="h-4 w-4 mr-2" />
              Industry Solutions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Tailored Security for Every Industry
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From e-commerce to healthcare, we provide specialized security audits
              that meet your industry's unique compliance requirements.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {industries.map((industry, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <industry.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {industry.audits} audits
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{industry.name}</h3>
                    <p className="text-sm text-muted-foreground">{industry.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Facts Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Security Audit Key Facts
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understanding the critical importance of regular security audits
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { icon: TrendingUp, title: "43% Increase", desc: "Cyber attacks increased by 43% in recent years, making regular security audits essential for protection", color: "text-destructive", bgColor: "bg-destructive/10" },
              { icon: BarChart3, title: "$4.88M Average", desc: "Average cost of a data breach globally, emphasizing the value of preventive security measures", color: "text-warning", bgColor: "bg-warning/10" },
              { icon: Target, title: "95% Prevention", desc: "Regular security audits can prevent 95% of successful cyber attacks through early detection", color: "text-success", bgColor: "bg-success/10" },
              { icon: Globe, title: "Every 39 Seconds", desc: "A cyber attack occurs every 39 seconds on average, highlighting the need for continuous monitoring", color: "text-primary", bgColor: "bg-primary/10" },
              { icon: Users, title: "68% of Businesses", desc: "68% of business leaders feel their cybersecurity risks are increasing, driving demand for audits", color: "text-accent", bgColor: "bg-accent/10" },
              { icon: Award, title: "277 Days Average", desc: "Average time to identify and contain a data breach, showcasing the importance of proactive audits", color: "text-warning", bgColor: "bg-warning/10" }
            ].map((fact, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-elegant transition-all duration-300 rounded-2xl h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className={`w-10 h-10 ${fact.bgColor} rounded-xl flex items-center justify-center mr-3`}>
                        <fact.icon className={`h-5 w-5 ${fact.color}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{fact.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{fact.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Best Practices Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Essential Security Best Practices
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Proven strategies to protect your digital assets and maintain robust cybersecurity
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {[
                { icon: Shield, title: "Strong Password Policies", desc: "Implement complex passwords with minimum 12 characters, special symbols, and regular rotation schedules", color: "primary" },
                { icon: Lock, title: "Multi-Factor Authentication", desc: "Enable 2FA/MFA on all critical accounts to add an extra layer of security beyond passwords", color: "accent" },
                { icon: Calendar, title: "Regular Security Updates", desc: "Keep all software, operating systems, and security tools updated with the latest patches", color: "success" }
              ].map((practice, index) => (
                <motion.div key={index} variants={fadeInLeft}>
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-elegant transition-all duration-300 rounded-2xl">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <motion.div
                          className={`w-12 h-12 bg-${practice.color}/10 rounded-xl flex items-center justify-center mt-1`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <practice.icon className={`h-6 w-6 text-${practice.color}`} />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">{practice.title}</h3>
                          <p className="text-muted-foreground text-sm">{practice.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Security Shield Infographic */}
            <motion.div
              className="relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
            >
              <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-3xl p-8 border border-border/50 shadow-elegant">
                {/* Central Shield */}
                <div className="relative flex justify-center mb-8">
                  <motion.div
                    className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-2xl"
                    animate={{
                      boxShadow: [
                        "0 0 30px rgba(59, 130, 246, 0.3)",
                        "0 0 60px rgba(59, 130, 246, 0.5)",
                        "0 0 30px rgba(59, 130, 246, 0.3)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <ShieldCheck className="w-16 h-16 text-white" />
                  </motion.div>

                  {/* Orbiting Icons */}
                  <motion.div
                    className="absolute w-48 h-48"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Lock className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Key className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <ScanLine className="w-5 h-5 text-yellow-500" />
                    </div>
                  </motion.div>
                </div>

                {/* Security Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Lock, label: "HTTPS", value: "100%", color: "green" },
                    { icon: RefreshCw, label: "Updates", value: "Auto", color: "blue" },
                    { icon: Fingerprint, label: "2FA", value: "Enabled", color: "purple" },
                    { icon: HardDrive, label: "Backups", value: "Daily", color: "orange" }
                  ].map((metric, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`bg-${metric.color}-500/10 border border-${metric.color}-500/20 rounded-xl p-4 text-center`}
                    >
                      <metric.icon className={`w-6 h-6 text-${metric.color}-500 mx-auto mb-2`} />
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className={`text-sm font-bold text-${metric.color}-500`}>{metric.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Security Score Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Security Score</span>
                    <span className="text-green-500 font-bold">95/100</span>
                  </div>
                  <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: "95%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Dos and Don'ts Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Security Dos and Don'ts
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Critical guidelines to follow and pitfalls to avoid for maximum cybersecurity
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* DOs */}
            <motion.div
              className="space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h3
                variants={fadeInUp}
                className="text-2xl font-bold text-success mb-6 flex items-center justify-center lg:justify-start"
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                Essential DOs
              </motion.h3>
              <div className="space-y-3">
                {[
                  "Use encrypted connections (HTTPS) for all data transmission",
                  "Backup critical data regularly and test recovery procedures",
                  "Monitor network traffic and user activities continuously",
                  "Conduct regular security audits and penetration testing"
                ].map((item, index) => (
                  <motion.div key={index} variants={fadeInUp}>
                    <Card className="bg-success/5 border-success/20 rounded-2xl hover:bg-success/10 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <p className="text-foreground text-sm">{item}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* DON'Ts */}
            <motion.div
              className="space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h3
                variants={fadeInUp}
                className="text-2xl font-bold text-destructive mb-6 flex items-center justify-center lg:justify-start"
              >
                <AlertTriangle className="h-6 w-6 mr-2" />
                Critical DON'Ts
              </motion.h3>
              <div className="space-y-3">
                {[
                  "Never ignore security alerts or postpone critical updates",
                  "Don't use default passwords or store credentials in plain text",
                  "Avoid downloading software from untrusted sources",
                  "Don't grant excessive permissions to users or applications"
                ].map((item, index) => (
                  <motion.div key={index} variants={fadeInUp}>
                    <Card className="bg-destructive/5 border-destructive/20 rounded-2xl hover:bg-destructive/10 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-foreground text-sm">{item}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Developer Security Infographic */}
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-br from-card via-card/95 to-card/90 rounded-3xl p-8 border border-border/50 shadow-elegant overflow-hidden relative">
              {/* Background Decorations */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  className="absolute -top-20 -right-20 w-64 h-64 bg-success/5 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-20 -left-20 w-64 h-64 bg-destructive/5 rounded-full blur-3xl"
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
              </div>

              {/* Header */}
              <div className="text-center mb-8 relative z-10">
                <motion.div
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full px-6 py-3 mb-4"
                  whileHover={{ scale: 1.05 }}
                >
                  <Code className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Developer Security Guide</span>
                  <Terminal className="w-5 h-5 text-accent" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground mb-2">Website Security Checklist for Developers</h3>
                <p className="text-sm text-muted-foreground">Essential practices to protect your applications and users</p>
              </div>

              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6 relative z-10">
                {/* DOs Column */}
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={staggerContainer}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ShieldCheck className="w-6 h-6 text-success" />
                    </motion.div>
                    <h4 className="text-lg font-bold text-success">Security DOs</h4>
                  </div>

                  {[
                    { icon: Lock, text: "Enforce HTTPS everywhere", detail: "TLS 1.3 recommended" },
                    { icon: KeyRound, text: "Use strong password hashing", detail: "bcrypt, Argon2" },
                    { icon: Fingerprint, text: "Implement 2FA/MFA", detail: "TOTP or WebAuthn" },
                    { icon: HardDrive, text: "Automate regular backups", detail: "Test restore procedures" },
                    { icon: RefreshCw, text: "Keep dependencies updated", detail: "Audit with npm/snyk" },
                    { icon: ScanLine, text: "Validate all user input", detail: "Server-side validation" },
                    { icon: Server, text: "Use parameterized queries", detail: "Prevent SQL injection" },
                    { icon: FileCheck, text: "Set security headers", detail: "CSP, HSTS, X-Frame" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      whileHover={{ x: 5, transition: { duration: 0.2 } }}
                      className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-xl p-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center group-hover:bg-success/20 transition-colors">
                        <item.icon className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Check className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* DON'Ts Column */}
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={staggerContainer}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      className="w-12 h-12 bg-destructive/20 rounded-2xl flex items-center justify-center"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <ShieldX className="w-6 h-6 text-destructive" />
                    </motion.div>
                    <h4 className="text-lg font-bold text-destructive">Security DON'Ts</h4>
                  </div>

                  {[
                    { icon: FileWarning, text: "Store passwords in plain text", detail: "Major security breach" },
                    { icon: AlertTriangle, text: "Ignore security warnings", detail: "Patch vulnerabilities ASAP" },
                    { icon: CloudOff, text: "Use outdated software", detail: "Known CVEs exploited" },
                    { icon: UserCheck, text: "Grant excessive permissions", detail: "Principle of least privilege" },
                    { icon: Mail, text: "Trust user input blindly", detail: "XSS & injection attacks" },
                    { icon: Database, text: "Expose sensitive error details", detail: "Use custom error pages" },
                    { icon: Wifi, text: "Skip rate limiting", detail: "Enable DDoS protection" },
                    { icon: Key, text: "Hardcode secrets in code", detail: "Use env variables/vaults" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      whileHover={{ x: 5, transition: { duration: 0.2 } }}
                      className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 bg-destructive/10 rounded-lg flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                        <item.icon className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <X className="w-4 h-4 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Bottom Security Score */}
              <motion.div
                className="mt-8 pt-6 border-t border-border/50 relative z-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Shield className="w-8 h-8 text-white" />
                    </motion.div>
                    <div>
                      <p className="text-sm text-muted-foreground">Following these practices?</p>
                      <p className="text-lg font-bold text-foreground">Your security score improves by <span className="text-success">85%</span></p>
                    </div>
                  </div>
                  <Link to="/security-audit">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <button className="btn-primary px-6 py-3">
                        <ScanLine className="w-4 h-4 mr-2" />
                        Audit Your Website
                      </button>
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 mx-4 my-2 rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
              {getUnderPriceText()} per audit • All features included
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-orbitron">
              Security Shouldn't Be a Luxury
            </h2>
            <p className="text-xl text-primary font-semibold mb-4">
              "In the digital fortress of trust, every vulnerability exposed is a bridge to confidence."
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Join 50,000+ businesses building transparent, trustworthy platforms.
              Schedule continuous monitoring. Get AI-powered fixes. Sleep better.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/security-audit">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button className="btn-glow px-8 py-3">
                    <Shield className="h-5 w-5 mr-2" />
                    Start Free Audit
                  </button>
                </motion.div>
              </Link>
              <Link to="/security-modules">
                <div>
                  <button className="btn-secondary px-8 py-3">
                    <Layers className="h-5 w-5 mr-2" />
                    Explore 21 Security Modules
                  </button>
                </div>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No hidden fees • Cancel anytime • 178+ security checks included
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trusted & Backed By Section */}
      <section className="py-12 mx-4 mb-4 rounded-3xl bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Trusted & Backed By</p>
            <h3 className="text-xl font-semibold text-foreground">Industry Leaders & Government Initiatives</h3>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {/* AWS */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-orange-500/30 transition-all min-w-[120px]"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">AWS</span>
              </div>
              <span className="text-xs text-muted-foreground">Cloud Partner</span>
            </motion.div>

            {/* Google Cloud */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-blue-500/30 transition-all min-w-[120px]"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">GCP</span>
              </div>
              <span className="text-xs text-muted-foreground">AI Platform</span>
            </motion.div>

            {/* NVIDIA Inception */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-green-500/30 transition-all min-w-[120px]"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-400 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xs">NVIDIA</span>
              </div>
              <span className="text-xs text-muted-foreground">Inception Program</span>
            </motion.div>

            {/* PayPal */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-blue-600/30 transition-all min-w-[120px]"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xs">PayPal</span>
              </div>
              <span className="text-xs text-muted-foreground">Payment Partner</span>
            </motion.div>

            {/* Startup India */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-orange-600/30 transition-all min-w-[120px]"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 via-white to-green-600 rounded-xl flex items-center justify-center border border-border/20">
                <span className="text-orange-600 font-bold text-xs">STARTUP</span>
              </div>
              <span className="text-xs text-muted-foreground">Startup India</span>
            </motion.div>

            </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 mx-4 mb-4 rounded-3xl bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <p className="text-base text-foreground font-medium mb-2">
            "Where transparency meets technology, trust is built."
          </p>
          <p className="text-sm text-muted-foreground mb-6">Powering security for stakeholders who demand transparency</p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 mb-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {["21 Security Modules", "Gemini AI Powered", "OWASP Top 10", "CVE Correlation", "Continuous Monitoring"].map((badge, index) => (
              badge === "21 Security Modules" ? (
                <Link key={index} to="/security-modules">
                  <motion.span
                    variants={fadeInUp}
                    className="text-sm font-medium px-4 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/30"
                  >
                    {badge} →
                  </motion.span>
                </Link>
              ) : (
                <motion.span
                  key={index}
                  variants={fadeInUp}
                  className="text-sm font-medium px-4 py-1.5 bg-primary/5 text-primary rounded-full border border-primary/20"
                >
                  {badge}
                </motion.span>
              )
            ))}
          </motion.div>
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Every audit is a step toward transparency. Every fix is a commitment to your users.
            Build platforms your stakeholders trust—one security scan at a time.
          </p>
        </div>
      </section>
    </div>
  );
};
